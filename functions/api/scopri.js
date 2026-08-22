// scopri.js — primo passaggio: robots.txt, llms.txt, sitemap ed elenco pagine.
// Una sola invocazione, poche chiamate esterne (limite del piano gratuito: 50).

const UA = 'VerificaSito/1.0 (strumento di analisi SEO e GEO)';
const MAX_SITEMAP = 4;      // quante sitemap figlie seguire
const SCADENZA = 6000;      // nessuna chiamata può durare più di sei secondi
const MAX_URL = 60;         // tetto pubblico: protegge il piano gratuito

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

async function prendi(url, tipo, limite) {
  try {
    const risposta = await fetch(url, {
      headers: { 'User-Agent': UA, 'Accept': tipo || '*/*' },
      redirect: 'follow',
      signal: AbortSignal.timeout(SCADENZA),
      cf: { cacheTtl: 300, cacheEverything: true },
    });
    if (!risposta.ok) {
      if (risposta.body) { try { await risposta.body.cancel(); } catch (e) {} }
      return { ok: false, stato: risposta.status };
    }
    const testo = await corpoLimitato(risposta, limite === undefined ? 120000 : limite);
    return { ok: true, stato: risposta.status, intestazioni: risposta.headers, testo };
  } catch (err) {
    return { ok: false, errore: String(err).slice(0, 120) };
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
const MAX_XML = 300000;

function estraiUrl(xml) {
  const testo = xml.length > MAX_XML ? xml.slice(0, MAX_XML) : xml;
  const fuori = [];
  const re = /<loc>\s*([^<\s]+)\s*<\/loc>/gi;
  let m;
  while ((m = re.exec(testo)) !== null) {
    fuori.push(m[1]);
    if (fuori.length >= MAX_URL) break;
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
    try {
      const r = await fetch(url, {
        headers: { 'User-Agent': UA },
        redirect: seguire ? 'follow' : 'manual',
        signal: AbortSignal.timeout(SCADENZA),
      });
      if (r.body) { try { await r.body.cancel(); } catch (e) {} }
      return r;
    } catch (err) { return null; }
  };

  const gemello = base.hostname.startsWith('www.')
    ? base.origin.replace('://www.', '://')
    : base.origin.replace('://', '://www.');

  const [home, finta, altroSito, robotsGrezzo, llms] = await Promise.all([
    prendi(radice + '/', null, 0),
    soloStato(radice + '/pagina-che-non-esiste-verifica-' + Date.now() + '/', true),
    soloStato(gemello + '/', false),
    prendi(radice + '/robots.txt', 'text/plain', 60000),
    prendi(radice + '/llms.txt', 'text/plain', 40000),
  ]);

  if (!home.ok) return risposta({
    errore: home.errore
      ? 'Il sito non risponde in tempo utile'
      : 'Il sito ha risposto ' + (home.stato || '?'),
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
  const candidate = robots.sitemap.length ? robots.sitemap.slice(0, 3) : [radice + '/sitemap.xml'];
  let pagine = [];
  let sitemapTrovate = 0;
  const daVisitare = [...candidate];
  const viste = new Set();

  while (daVisitare.length && sitemapTrovate < MAX_SITEMAP && pagine.length < MAX_URL) {
    const indirizzoSitemap = daVisitare.shift();
    if (viste.has(indirizzoSitemap)) continue;
    viste.add(indirizzoSitemap);
    const documento = await prendi(indirizzoSitemap, 'application/xml', 300000);
    if (!documento.ok) continue;
    sitemapTrovate++;
    const trovati = estraiUrl(documento.testo);
    if (/<sitemapindex/i.test(documento.testo)) {
      for (const u of trovati) if (daVisitare.length < MAX_SITEMAP) daVisitare.push(u);
    } else {
      for (const u of trovati) if (pagine.length < MAX_URL) pagine.push(u);
    }
  }

  pagine = Array.from(new Set(pagine)).filter(u => u.startsWith(radice));

  const intestazioniHome = {};
  for (const nome of ['content-encoding','strict-transport-security','x-content-type-options',
                      'x-frame-options','referrer-policy','content-security-policy','server']) {
    const v = home.intestazioni && home.intestazioni.get(nome);
    if (v) intestazioniHome[nome] = v;
  }

  return risposta({
    sito: radice,
    quattroZeroQuattro,
    alternativo,
    intestazioniHome,
    robotsPresente: robotsGrezzo.ok,
    robots,
    llmsPresente: llms.ok,
    llmsRighe: llms.ok ? llms.testo.split(/\r?\n/).filter(Boolean).length : 0,
    sitemapTrovate,
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
