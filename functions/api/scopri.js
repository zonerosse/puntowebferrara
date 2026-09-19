// scopri.js — primo passaggio: robots.txt, llms.txt, sitemap ed elenco pagine.
// Una sola invocazione, poche chiamate esterne (limite del piano gratuito: 50).

const UA = 'VerificaSitoBot/1.0 (+https://puntowebferrara.com/sottosopra/)';
// Alcune protezioni rifiutano qualunque richiesta il cui User-Agent non sia un
// browser noto. È un filtro grossolano, non un controllo di accesso: il
// consenso lo esprime il robots.txt, che viene sempre rispettato per primo.
// Se il robots permette la scansione e il firewall rifiuta lo stesso, si
// riprova una volta con la stringa di un browser.
const UA_BROWSER = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 '
  + '(KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';
// Un browser manda sempre queste intestazioni. Ometterle fa scattare le regole
// dei firewall anche su siti che non hanno nessuna intenzione di bloccare.
const INTESTAZIONI = {
  'User-Agent': UA,
  'Accept-Language': 'it-IT,it;q=0.9,en;q=0.8',
  'Accept-Encoding': 'gzip, deflate, br',
  'Upgrade-Insecure-Requests': '1',
};
const MAX_SITEMAP = 10;
// Quando il robots.txt non dichiara la sitemap, non basta provare un indirizzo:
// i plugin WordPress la mettono altrove, e leggere la sola home produce un
// punteggio che non descrive il sito.
const SITEMAP_PROBABILI = [
  '/sitemap.xml',
  '/sitemap_index.xml',   // Yoast, Rank Math, All in One SEO
  '/wp-sitemap.xml',      // WordPress dalla 5.5
  '/sitemap-index.xml',
  '/sitemap/sitemap-index.xml',
  '/post-sitemap.xml',
];      // quante sitemap figlie seguire
const SCADENZA = 6000;      // nessuna chiamata può durare più di sei secondi
const MAX_URL = 200;        // tetto di sicurezza: oltre, il sito è troppo grande
const MAX_XML_LETTURA = 900000;

// I crawler dei motori IA, divisi per importanza.
const CRAWLER = [
  ['GPTBot', 'ChatGPT — addestramento e ricerca', 1],
  ['OAI-SearchBot', 'ChatGPT — ricerca', 1],
  ['ChatGPT-User', 'ChatGPT — navigazione su richiesta', 1],
  ['ClaudeBot', 'Claude', 1],
  ['Claude-User', 'Claude — navigazione su richiesta', 1],
  ['PerplexityBot', 'Perplexity', 1],
  ['Google-Extended', 'Google Gemini e AI Overviews', 2],
  ['GoogleOther', 'Google — usi sperimentali', 2],
  ['Applebot-Extended', 'Apple Intelligence', 2],
  ['Amazonbot', 'Amazon', 2],
  ['Bingbot', 'Bing e Copilot', 2],
  ['CCBot', 'Common Crawl', 3],
  ['Bytespider', 'ByteDance', 3],
  ['cohere-ai', 'Cohere', 3],
];

// Legge al massimo "limite" byte del corpo, poi chiude il flusso. Scaricare e
// decodificare un file intero per usarne le prime righe è lo spreco che fa
// sforare i 10 millisecondi di CPU sui siti grandi.
async function corpoLimitato(risposta, limite) {
  if (!risposta.body) return '';
  if (!limite) {
    // Il corpo non serve, ma va comunque chiuso: una risposta lasciata aperta
    // tiene in piedi la connessione e la richiesta non si conclude mai.
    try { await risposta.body.cancel(); } catch (e) { /* già chiuso */ }
    return '';
  }
  const lettore = risposta.body.getReader();
  const pezzi = [];
  let presi = 0;
  try {
    while (presi < limite) {
      const { done, value } = await lettore.read();
      if (done) break;
      pezzi.push(value);
      presi += value.length;
    }
  } finally {
    // cancel() chiude il flusso e libera la connessione anche se il file
    // era più lungo di quanto ci serviva
    try { await lettore.cancel(); } catch (e) { /* già chiuso */ }
  }
  const insieme = new Uint8Array(Math.min(presi, limite));
  let posizione = 0;
  for (const pezzo of pezzi) {
    if (posizione >= insieme.length) break;
    const quanto = Math.min(pezzo.length, insieme.length - posizione);
    insieme.set(pezzo.subarray(0, quanto), posizione);
    posizione += quanto;
  }
  return new TextDecoder('utf-8', { fatal: false }).decode(insieme);
}

async function prendi(url, tipo, limite, secondoGiro) {
  try {
    const risposta = await fetch(url, {
      headers: Object.assign({}, INTESTAZIONI, { 'Accept': tipo || '*/*' }),
      redirect: 'follow',
      signal: AbortSignal.timeout(SCADENZA),
      cf: { cacheTtl: 300, cacheEverything: true },
    });
    if (!risposta.ok) {
      if (risposta.body) { try { await risposta.body.cancel(); } catch (e) {} }
      // Rifiuto tipico dei filtri anti-bot: un secondo tentativo, uno solo.
      if (!secondoGiro && [401, 403, 405, 406, 429].includes(risposta.status)) {
        const ritenta = await fetch(url, {
          headers: Object.assign({}, INTESTAZIONI, {
            'User-Agent': UA_BROWSER,
            'Accept': tipo || 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          }),
          redirect: 'follow',
          signal: AbortSignal.timeout(SCADENZA),
          cf: { cacheTtl: 300, cacheEverything: true },
        }).catch(() => null);
        if (ritenta && ritenta.ok) {
          const testo2 = await corpoLimitato(ritenta, limite === undefined ? 120000 : limite);
          return { ok: true, stato: ritenta.status, intestazioni: ritenta.headers, testo: testo2, ripiego: true };
        }
        if (ritenta) {
          // Rifiuto confermato: si raccolgono le tracce di chi sta bloccando,
          // perché con quelle si capisce se il problema è aggirabile o no.
          const indizi = {};
          for (const nome of ['server', 'cf-mitigated', 'cf-ray', 'x-sucuri-id', 'x-sucuri-block',
                              'x-powered-by', 'x-iinfo', 'x-cdn', 'x-cache', 'via', 'set-cookie']) {
            const v = ritenta.headers.get(nome);
            if (v) indizi[nome] = String(v).slice(0, 120);
          }
          let assaggio = '';
          try { assaggio = (await corpoLimitato(ritenta, 1500)).replace(/\s+/g, ' ').slice(0, 300); }
          catch (e) { try { await ritenta.body.cancel(); } catch (e2) {} }
          return { ok: false, stato: ritenta.status, indizi, assaggio };
        }
      }
      return { ok: false, stato: risposta.status };
    }
    const testo = await corpoLimitato(risposta, limite === undefined ? 120000 : limite);
    return { ok: true, stato: risposta.status, intestazioni: risposta.headers, testo };
  } catch (err) {
    // La scadenza va distinta dagli altri guasti di rete: "non ha risposto in
    // sei secondi" e "il nome non esiste" sono due difetti diversi del sito,
    // e il rapporto deve poterli chiamare col loro nome.
    const scaduta = !!(err && (err.name === 'TimeoutError' || err.name === 'AbortError'));
    return { ok: false, scaduta, errore: String(err).slice(0, 120) };
  }
}

// Legge robots.txt e stabilisce, per ciascun crawler, se la radice è accessibile.
function leggiRobots(testoIntero) {
  const testo = testoIntero.length > 60000 ? testoIntero.slice(0, 60000) : testoIntero;
  const righe = testo.split(/\r?\n/);
  const blocchi = [];
  let corrente = null;
  for (let riga of righe) {
    riga = riga.replace(/#.*$/, '').trim();
    if (!riga) continue;
    const punto = riga.indexOf(':');
    if (punto < 0) continue;
    const campo = riga.slice(0, punto).trim().toLowerCase();
    const valore = riga.slice(punto + 1).trim();
    if (campo === 'user-agent') {
      if (!corrente || corrente.regole.length) { corrente = { agenti: [], regole: [] }; blocchi.push(corrente); }
      corrente.agenti.push(valore.toLowerCase());
    } else if (corrente && (campo === 'allow' || campo === 'disallow')) {
      corrente.regole.push({ tipo: campo, percorso: valore });
    }
  }

  const decidi = (nome) => {
    const n = nome.toLowerCase();
    let blocco = blocchi.find(b => b.agenti.includes(n));
    if (!blocco) blocco = blocchi.find(b => b.agenti.includes('*'));
    if (!blocco) return { ammesso: true, esplicito: false };
    const bloccante = blocco.regole.some(r => r.tipo === 'disallow' && (r.percorso === '/' || r.percorso === ''));
    const vietaTutto = blocco.regole.some(r => r.tipo === 'disallow' && r.percorso === '/');
    return {
      ammesso: !vietaTutto,
      esplicito: blocco.agenti.includes(n),
      nota: bloccante && !vietaTutto ? 'regola vuota' : null,
    };
  };

  const sitemap = [];
  for (const riga of righe) {
    const m = riga.match(/^\s*sitemap\s*:\s*(\S+)/i);
    if (m) sitemap.push(m[1]);
  }

  return {
    crawler: CRAWLER.map(([nome, chi, livello]) => ({ nome, chi, livello, ...decidi(nome) })),
    sitemap,
    userAgentDichiarati: new Set(blocchi.flatMap(b => b.agenti)).size,
  };
}

// Le sitemap dei siti grossi arrivano a decine di megabyte: analizzarle intere
// sfora i 10 millisecondi di CPU del piano gratuito e il Worker viene interrotto.
// Si legge solo la porzione iniziale, che basta e avanza per un campione.
const MAX_XML = 900000;

// Il robots.txt autorizza questo strumento? Si guarda il blocco dedicato al
// nostro nome e, se non c'è, quello generico User-agent: *.
function permessoPerNoi(testo) {
  const righe = (testo || '').slice(0, 60000).split(/\r?\n/);
  let dentro = false, generico = false, vietaNoi = false, vietaTutti = false;
  for (let riga of righe) {
    riga = riga.replace(/#.*$/, '').trim();
    if (!riga) continue;
    const punto = riga.indexOf(':');
    if (punto < 0) continue;
    const campo = riga.slice(0, punto).trim().toLowerCase();
    const valore = riga.slice(punto + 1).trim();
    if (campo === 'user-agent') {
      const v = valore.toLowerCase();
      dentro = v.includes('verificasito');
      generico = v === '*';
    } else if (campo === 'disallow' && valore === '/') {
      if (dentro) vietaNoi = true;
      else if (generico) vietaTutti = true;
    }
  }
  return vietaNoi ? false : !vietaTutti;
}

// Confronto fra host che tratta www.sito.it e sito.it come lo stesso sito.
function stessoSito(host, radice) {
  try {
    const nudo = h => String(h || '').replace(/^www\./i, '').toLowerCase();
    return nudo(host) === nudo(new URL(radice).hostname);
  } catch (e) {
    return false;
  }
}

const RE_LOC = /<(?:[a-z0-9]+:)?loc>\s*(?:<!\[CDATA\[)?\s*([^<\]\s]+)\s*(?:\]\]>)?\s*<\/(?:[a-z0-9]+:)?loc>/i;

// Nell'estensione image: della sitemap ogni <url> contiene anche
// <image:image><image:loc>. Prendere tutti i <loc> del documento faceva
// contare le immagini come pagine: 198 indirizzi dove le pagine erano 138, e
// i sessanta in più venivano poi accusati di "non essere contenuto".
// Per specifica <loc> è il primo figlio di <url>, mentre image:loc e video:loc
// stanno più in basso: dentro ogni blocco vale solo il primo.
function estraiUrl(xml) {
  const testo = xml.length > MAX_XML ? xml.slice(0, MAX_XML) : xml;
  const fuori = [];
  const nome = /<(?:[a-z0-9]+:)?sitemapindex/i.test(testo) ? 'sitemap' : 'url';
  const reBlocco = new RegExp(
    '<(?:[a-z0-9]+:)?' + nome + '\\b[^>]*>([\\s\\S]*?)<\\/(?:[a-z0-9]+:)?' + nome + '\\s*>', 'gi');
  let b;
  while ((b = reBlocco.exec(testo)) !== null) {
    const m = b[1].match(RE_LOC);
    if (!m) continue;
    fuori.push(m[1]);
    if (fuori.length >= MAX_URL) break;
  }
  // File senza blocchi <url> o <sitemap> — per esempio una sitemap in formato
  // RSS: si torna al comportamento di prima, che lì è quello giusto.
  if (!fuori.length) {
    const re = new RegExp(RE_LOC.source, 'gi');
    let m;
    while ((m = re.exec(testo)) !== null) {
      fuori.push(m[1]);
      if (fuori.length >= MAX_URL) break;
    }
  }
  return fuori;
}

const TEMPO_MASSIMO = 20000;

export async function onRequest(context) {
  try {
    // Qualunque cosa succeda, entro venti secondi esce una risposta JSON:
    // meglio un'analisi parziale che una connessione che cade.
    return await Promise.race([
      scopri(context),
      new Promise(risolvi => setTimeout(() => risolvi(risposta({
        errore: 'Questo sito impiega troppo a rispondere: l\u2019analisi è stata interrotta.',
      }, 200)), TEMPO_MASSIMO)),
    ]);
  } catch (err) {
    return risposta({
      errore: 'Analisi interrotta su questo sito: ' + String(err && err.message || err).slice(0, 140),
    }, 200);
  }
}

async function scopri(context) {
  const parametri = new URL(context.request.url).searchParams;
  let indirizzo = (parametri.get('url') || '').trim();
  if (!indirizzo) return risposta({ errore: 'Manca il parametro url' }, 400);
  if (!/^https?:\/\//i.test(indirizzo)) indirizzo = 'https://' + indirizzo;

  let base;
  try { base = new URL(indirizzo); } catch { return risposta({ errore: 'Indirizzo non valido' }, 400); }
  const radice = base.origin;

  // I primi cinque controlli sono indipendenti fra loro: si fanno tutti insieme.
  // In fila, su un sito lento, la somma delle attese superava il tempo massimo
  // concesso alla richiesta e la connessione cadeva prima della risposta.
  const soloStato = async (url, seguire) => {
    const chiama = async (intestazioni) => {
      const r = await fetch(url, {
        headers: intestazioni,
        redirect: seguire ? 'follow' : 'manual',
        signal: AbortSignal.timeout(SCADENZA),
      });
      if (r.body) { try { await r.body.cancel(); } catch (e) {} }
      return r;
    };
    try {
      const r = await chiama(INTESTAZIONI);
      if ([401, 403, 405, 406, 429].includes(r.status))
        return await chiama(Object.assign({}, INTESTAZIONI, { 'User-Agent': UA_BROWSER })).catch(() => r);
      return r;
    } catch (err) { return null; }
  };

  const gemello = base.hostname.startsWith('www.')
    ? base.origin.replace('://www.', '://')
    : base.origin.replace('://', '://www.');

  // Prima di leggere qualsiasi cosa si chiede il permesso: il robots.txt è il
  // luogo in cui un sito dichiara chi può scansionarlo. Va rispettato anche da
  // chi lo sta analizzando.
  const robotsPrima = await prendi(radice + '/robots.txt', 'text/plain', 60000);
  if (robotsPrima.ok) {
    const permesso = permessoPerNoi(robotsPrima.testo);
    if (!permesso) return risposta({
      errore: 'Il robots.txt di questo sito vieta la scansione automatica. Non procedo.',
      vietatoDaRobots: true,
    }, 200);
  }

  const [home, finta, altroSito, robotsGrezzo, llms] = await Promise.all([
    prendi(radice + '/', null, 0),
    soloStato(radice + '/pagina-che-non-esiste-verifica-' + Date.now() + '/', true),
    soloStato(gemello + '/', false),
    Promise.resolve(robotsPrima),
    prendi(radice + '/llms.txt', 'text/plain', 40000),
  ]);

  if (!home.ok) return risposta({
    errore: home.errore
      ? 'Il sito non risponde in tempo utile'
      : 'Il sito ha risposto ' + (home.stato || '?'),
    stato: home.stato || null,
    indizi: home.indizi || null,
    assaggio: home.assaggio || null,
  }, 200);

  const quattroZeroQuattro = finta ? finta.status : null;
  const alternativo = altroSito ? {
    indirizzo: gemello,
    stato: altroSito.status,
    reindirizza: altroSito.status >= 300 && altroSito.status < 400,
    versoDoveDice: altroSito.headers.get('location') || null,
  } : null;

  const robots = robotsGrezzo.ok
    ? leggiRobots(robotsGrezzo.testo)
    : { crawler: CRAWLER.map(([nome, chi, livello]) => ({ nome, chi, livello, ammesso: true, esplicito: false })), sitemap: [], userAgentDichiarati: 0 };

  // 4. sitemap: prima quelle dichiarate in robots, poi il percorso classico
  // Le sitemap dichiarate vengono per prime, ma si provano comunque anche gli
  // indirizzi standard: un robots.txt può dichiarare un file vuoto o obsoleto.
  const candidate = robots.sitemap.slice(0, 6)
    .concat(SITEMAP_PROBABILI.map(x => radice + x)
      .filter(x => !robots.sitemap.includes(x)));
  let pagine = [];
  let sitemapTrovate = 0;
  const daVisitare = [...candidate];
  const viste = new Set();

  const giaViste = new Set();
  const malformati = [];
  // Gli esiti dei tentativi vanno conservati: scartarli con un "continue"
  // silenzioso faceva finire l'analisi con una pagina sola senza poter dire
  // perché. Una sitemap che non risponde non è un intoppo dell'analisi, è un
  // difetto del sito: se non risponde a noi non risponde nemmeno a Googlebot.
  const esitiSitemap = [];
  let tentativi = 0;
  while (daVisitare.length && tentativi < 20 && sitemapTrovate < MAX_SITEMAP && pagine.length < MAX_URL) {
    tentativi++;
    const indirizzoSitemap = daVisitare.shift();
    if (viste.has(indirizzoSitemap)) continue;
    viste.add(indirizzoSitemap);
    const documento = await prendi(indirizzoSitemap, 'application/xml', 900000);
    if (!documento.ok) {
      if (esitiSitemap.length < 12) esitiSitemap.push({
        url: indirizzoSitemap,
        stato: documento.stato || null,
        scaduta: !!documento.scaduta,
      });
      continue;
    }
    sitemapTrovate++;
    const trovati = estraiUrl(documento.testo);
    if (/<sitemapindex/i.test(documento.testo)) {
      // Le figlie hanno la precedenza sui candidati ancora da tentare: in coda
      // rischiavano di non essere mai raggiunte.
      const nuove = trovati.filter(u => !giaViste.has(u));
      for (const u of nuove) giaViste.add(u);
      daVisitare.unshift(...nuove.slice(0, 15));
    } else {
      // Un indirizzo malformato nella sitemap è un difetto del file, non un
      // errore di rete: va scartato qui e contato a parte.
      for (const u of trovati) {
        if (pagine.length >= MAX_URL) break;
        try {
          const url = new URL(u, radice);
          // www.sito.it e sito.it sono lo stesso sito. Confrontare gli host
          // alla lettera scartava OGNI indirizzo dei siti la cui sitemap usa
          // la forma opposta a quella digitata dall'utente: l'analisi finiva
          // con zero pagine e il file veniva accusato di essere scritto male.
          if (/^https?:$/.test(url.protocol) && stessoSito(url.hostname, radice))
            pagine.push(url.href);
          else malformati.push(u);
        } catch (e) { malformati.push(u); }
      }
    }
  }

  pagine = Array.from(new Set(pagine)).filter(u => {
    try { return stessoSito(new URL(u).hostname, radice); } catch (e) { return false; }
  });

  const intestazioniHome = {};
  // age e cf-cache-status dicono se quello che abbiamo letto è la pagina viva
  // o una copia ferma in cache: senza, un rapporto può descrivere un sito che
  // non esiste più da ore e nessuno se ne accorge.
  for (const nome of ['content-encoding','strict-transport-security','x-content-type-options',
                      'x-frame-options','referrer-policy','content-security-policy','server',
                      'age','cf-cache-status','x-cache','date','last-modified']) {
    const v = home.intestazioni && home.intestazioni.get(nome);
    if (v) intestazioniHome[nome] = v;
  }

  return risposta({
    sito: radice,
    malformati: malformati.slice(0, 60),
    ripiegoUA: !!home.ripiego,
    quattroZeroQuattro,
    alternativo,
    intestazioniHome,
    robotsPresente: robotsGrezzo.ok,
    robots,
    llmsPresente: llms.ok,
    llmsRighe: llms.ok ? llms.testo.split(/\r?\n/).filter(Boolean).length : 0,
    sitemapTrovate,
    esitiSitemap,
    pagine,
    totalePagine: pagine.length,
  });
}

function risposta(dati, stato) {
  return new Response(JSON.stringify(dati), {
    status: stato || 200,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}
