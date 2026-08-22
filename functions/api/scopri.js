// scopri.js — primo passaggio: robots.txt, llms.txt, sitemap ed elenco pagine.
// Una sola invocazione, poche chiamate esterne (limite del piano gratuito: 50).

const UA = 'VerificaSito/1.0 (strumento di analisi SEO e GEO)';
const MAX_SITEMAP = 8;      // quante sitemap figlie seguire
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

async function prendi(url, tipo) {
  try {
    const risposta = await fetch(url, {
      headers: { 'User-Agent': UA, 'Accept': tipo || '*/*' },
      redirect: 'follow',
      cf: { cacheTtl: 300, cacheEverything: true },
    });
    if (!risposta.ok) return { ok: false, stato: risposta.status };
    return { ok: true, stato: risposta.status, intestazioni: risposta.headers, testo: await risposta.text() };
  } catch (err) {
    return { ok: false, errore: String(err).slice(0, 120) };
  }
}

// Legge robots.txt e stabilisce, per ciascun crawler, se la radice è accessibile.
function leggiRobots(testo) {
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

function estraiUrl(xml) {
  const fuori = [];
  const re = /<loc>\s*([^<\s]+)\s*<\/loc>/gi;
  let m;
  while ((m = re.exec(xml)) !== null) fuori.push(m[1]);
  return fuori;
}

export async function onRequest(context) {
  const parametri = new URL(context.request.url).searchParams;
  let indirizzo = (parametri.get('url') || '').trim();
  if (!indirizzo) return risposta({ errore: 'Manca il parametro url' }, 400);
  if (!/^https?:\/\//i.test(indirizzo)) indirizzo = 'https://' + indirizzo;

  let base;
  try { base = new URL(indirizzo); } catch { return risposta({ errore: 'Indirizzo non valido' }, 400); }
  const radice = base.origin;

  // 1. la home deve rispondere
  const home = await prendi(radice + '/');
  if (!home.ok) return risposta({ errore: 'Il sito non risponde (stato ' + (home.stato || '?') + ')' }, 502);

  // 1b. Come si comporta con un indirizzo inesistente (404 finto = pagine fantasma indicizzate)
  let quattroZeroQuattro = null;
  try {
    const finta = await fetch(radice + '/pagina-che-non-esiste-verifica-' + Date.now() + '/', {
      headers: { 'User-Agent': UA }, redirect: 'follow',
    });
    quattroZeroQuattro = finta.status;
  } catch (err) { /* non blocca l'analisi */ }

  // 1c. Coerenza fra indirizzo con e senza www
  let alternativo = null;
  try {
    const altro = base.hostname.startsWith('www.')
      ? base.origin.replace('://www.', '://')
      : base.origin.replace('://', '://www.');
    const r = await fetch(altro + '/', { headers: { 'User-Agent': UA }, redirect: 'manual' });
    alternativo = {
      indirizzo: altro,
      stato: r.status,
      reindirizza: r.status >= 300 && r.status < 400,
      versoDoveDice: r.headers.get('location') || null,
    };
  } catch (err) { /* alcuni domini non hanno il gemello: normale */ }

  // 2. robots.txt
  const robotsGrezzo = await prendi(radice + '/robots.txt');
  const robots = robotsGrezzo.ok
    ? leggiRobots(robotsGrezzo.testo)
    : { crawler: CRAWLER.map(([nome, chi, livello]) => ({ nome, chi, livello, ammesso: true, esplicito: false })), sitemap: [], userAgentDichiarati: 0 };

  // 3. llms.txt
  const llms = await prendi(radice + '/llms.txt');

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
    const documento = await prendi(indirizzoSitemap, 'application/xml');
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
