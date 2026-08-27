// cookie.js — scarica la pagina, cerca l'informativa, e passa tutto al motore.
//
// Stessa forma di accessibilita.js: un indirizzo per invocazione, cosi' i 10
// millisecondi di CPU del piano gratuito valgono per un lavoro solo.
//
// PERCHE' BASTA UNA PAGINA. I tracciatori si caricano dal modello del sito:
// se Google Analytics c'e', c'e' su tutte le pagine. Scansionarne duecento
// per trovare le stesse quattro righe sarebbe spreco. Se il cliente sospetta
// che una pagina particolare carichi qualcosa in piu' — un modulo, un video,
// una mappa — puo' indicarne l'indirizzo esatto.
//
// L'INFORMATIVA. Si cerca fra i collegamenti della pagina: il testo serve a
// dire quali servizi trovati NON sono nominati, che e' il controllo che
// nessuno strumento gratuito fa.

import { analizzaCookie } from './_cookie.js';

const UA = 'VerificaSitoBot/1.0 (+https://puntowebferrara.com/sottosopra/)';
const UA_BROWSER = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 '
  + '(KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';
const INTESTAZIONI = {
  'User-Agent': UA,
  'Accept-Language': 'it-IT,it;q=0.9,en;q=0.8',
  'Accept-Encoding': 'gzip, deflate, br',
  'Upgrade-Insecure-Requests': '1',
};

const MAX_HTML = 900000;    // oltre, si taglia: le impronte stanno in testa
const MAX_POLICY = 400000;  // un'informativa piu' lunga di cosi' non esiste

// Come si riconosce il collegamento all'informativa. Prima per indirizzo,
// poi per testo del collegamento, nelle tre lingue che i siti italiani
// servono piu' spesso.
const RE_INDIRIZZO = /(privacy|cookie|informativa|datenschutz|legal)/i;
const RE_TESTO = /(privacy|cookie|informativa|datenschutz|note legali)/i;

export async function onRequest(context) {
  const parametri = new URL(context.request.url).searchParams;
  const url = (parametri.get('url') || '').trim();

  if (!url || /^https?:\/\//i.test(url) === false) {
    return risposta({ url, errore: 'Indirizzo non valido' }, 400);
  }

  /* --- la pagina -------------------------------------------------------- */
  let html = null;
  try {
    html = await scarica(url, MAX_HTML);
  } catch (e) {
    return risposta({
      url,
      disponibile: false,
      motivo: 'Non sono riuscito a leggere la pagina: ' + (e && e.message || 'errore'),
    });
  }
  if (html == null) {
    return risposta({
      url,
      disponibile: false,
      motivo: 'Il sito non ha risposto, o ha rifiutato la lettura.',
    });
  }

  /* --- l'informativa ---------------------------------------------------- */
  // Non e' un errore se non si trova: il rapporto lo dice, e i controlli che
  // dipendono dalla policy restano semplicemente vuoti.
  let policy = null, indirizzoPolicy = null, comeTrovata = null;
  try {
    indirizzoPolicy = trovaPolicy(html, url);
    if (indirizzoPolicy) comeTrovata = 'collegamento nella pagina';

    // Se il piè di pagina lo scrive JavaScript, il collegamento da qui non
    // si vede. Si provano gli indirizzi soliti: costa poco e funziona spesso.
    if (!indirizzoPolicy) {
      const provati = await provaIndirizziSoliti(url);
      if (provati) { indirizzoPolicy = provati; comeTrovata = 'indirizzo consueto'; }
    }

    if (indirizzoPolicy) {
      const grezzo = await scarica(indirizzoPolicy, MAX_POLICY);
      if (grezzo) policy = testoPulito(grezzo);
      else indirizzoPolicy = null;
    }
  } catch {
    // se la policy non si scarica si prosegue senza: meglio mezzo rapporto
    // che nessun rapporto
    policy = null;
  }

  /* --- altre due pagine, scelte fra quelle che caricano cose diverse ---- */
  // Una pagina sola non basta: il modulo di contatto carica reCAPTCHA,
  // l'articolo carica il video, la home nessuno dei due.
  const paginePiu = [];
  try {
    for (const altra of altrePagine(html, url, 2)) {
      const h = await scarica(altra, MAX_HTML);
      if (h) paginePiu.push({ url: altra, html: h });
    }
  } catch { /* se non si riesce, si prosegue con la sola pagina indicata */ }

  const esito = analizzaCookie(html, url, policy);

  // Quello che si trova altrove si aggiunge, senza duplicare.
  esito.altreLette = [];
  for (const p2 of paginePiu) {
    const e2 = analizzaCookie(p2.html, p2.url, policy);
    esito.altreLette.push(p2.url);

    const gia = new Set(esito.trovati.map(t => t.id));
    for (const t of e2.trovati) {
      if (!gia.has(t.id)) {
        t.soloSu = p2.url;          // per dire dove si e' trovato
        esito.trovati.push(t);
      }
    }
    for (const d of Object.keys(e2.domini || {})) {
      esito.domini[d] = (esito.domini[d] || 0) + e2.domini[d];
    }
    for (const p of e2.piattaforme) {
      if (!esito.piattaforme.includes(p)) esito.piattaforme.push(p);
    }
  }
  esito.quantiDomini = Object.keys(esito.domini).length;
  esito.paginelette = 1 + esito.altreLette.length;

  esito.disponibile = true;
  esito.indirizzoPolicy = indirizzoPolicy;
  esito.policyLetta = policy != null;
  esito.comeTrovata = comeTrovata;

  return risposta(esito);
}

/* --- utilita' ------------------------------------------------------------ */

async function scarica(indirizzo, tetto) {
  let r = await fetch(indirizzo, { headers: INTESTAZIONI, redirect: 'follow' });
  // Alcune protezioni rifiutano qualunque User-Agent che non sia un browser
  // noto. Si riprova una volta sola, come fa gia' l'analisi di accessibilita'.
  if (!r.ok && (r.status === 403 || r.status === 406 || r.status === 429)) {
    r = await fetch(indirizzo, {
      headers: { ...INTESTAZIONI, 'User-Agent': UA_BROWSER },
      redirect: 'follow',
    });
  }
  if (!r.ok) return null;

  const tipo = r.headers.get('content-type') || '';
  if (tipo && !/text\/html|application\/xhtml/i.test(tipo)) return null;

  const testo = await r.text();
  return testo.length > tetto ? testo.slice(0, tetto) : testo;
}

// Il collegamento all'informativa, cercato fra quelli della pagina.
function trovaPolicy(html, base) {
  const candidati = [];
  const re = /<a\b([^>]*)>([\s\S]*?)<\/a>/gi;
  let m, letti = 0;
  while ((m = re.exec(html)) && letti < 400) {
    letti++;
    const attributi = m[1] || '';
    const href = (attributi.match(/href\s*=\s*["']([^"']*)["']/i) || [, ''])[1];
    if (!href || href.startsWith('#') || /^(mailto|tel|javascript):/i.test(href)) continue;

    const testo = m[2].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    const perIndirizzo = RE_INDIRIZZO.test(href);
    const perTesto = RE_TESTO.test(testo);
    if (!perIndirizzo && !perTesto) continue;

    let assoluto;
    try {
      assoluto = new URL(href, base).href;
    } catch { continue; }

    // Lo stesso sito, o un suo sottodominio. La prima versione pretendeva
    // l'host identico e scartava privacy.esempio.it, che e' proprio dove
    // molti siti grandi tengono l'informativa.
    try {
      const h = new URL(assoluto).hostname.replace(/^www\./, '');
      const b = new URL(base).hostname.replace(/^www\./, '');
      const radice = b.split('.').slice(-2).join('.');
      if (h !== b && !h.endsWith('.' + radice)) continue;
    } catch { continue; }

    // Chi nomina i cookie e' il candidato migliore, poi la privacy generica.
    const punteggio =
      (/cookie/i.test(href) || /cookie/i.test(testo) ? 3 : 0) +
      (/privacy|informativa|datenschutz/i.test(href) ? 2 : 0) +
      (perTesto ? 1 : 0);
    candidati.push({ assoluto, punteggio });
  }

  if (!candidati.length) return null;
  candidati.sort((a, b) => b.punteggio - a.punteggio);
  return candidati[0].assoluto;
}

// Gli indirizzi che quasi tutti usano. Si provano solo se il collegamento
// non si e' trovato nella pagina, e ci si ferma al primo che risponde.
const SOLITI = [
  '/privacy-policy/', '/privacy/', '/cookie-policy/', '/informativa-privacy/',
  '/privacy-policy', '/privacy', '/note-legali/', '/privacy-cookie-policy/',
];

async function provaIndirizziSoliti(base) {
  for (const via of SOLITI) {
    let indirizzo;
    try { indirizzo = new URL(via, base).href; } catch { continue; }
    try {
      const r = await fetch(indirizzo, { headers: INTESTAZIONI, redirect: 'follow' });
      if (!r.ok) continue;
      const tipo = r.headers.get('content-type') || '';
      if (tipo && !/text\/html/i.test(tipo)) continue;
      const t = await r.text();
      // deve somigliare a un'informativa, non essere una pagina 404 travestita
      if (/dati personali|privacy|trattamento|cookie/i.test(t) && t.length > 1500) {
        return indirizzo;
      }
    } catch { /* si prova il prossimo */ }
  }
  return null;
}

// Quali altre pagine vale la pena leggere. Non tutte: tre in piu' bastano,
// e vanno scelte fra quelle che caricano cose diverse dalla home.
//
// I contatti portano reCAPTCHA e le mappe. Una pagina di contenuto porta i
// video e i riquadri social. Il carrello porta i pixel pubblicitari.
const RE_INTERESSANTI = /(contatt|contact|preventiv|richiedi|prodott|shop|negozio|carrello|checkout|blog|news|articol|chi-siamo|about)/i;

function altrePagine(html, base, quante) {
  const viste = new Set();
  const fuori = [];
  const re = /<a\b[^>]*href\s*=\s*["']([^"']+)["']/gi;
  let m, letti = 0;
  let radice;
  try { radice = new URL(base).hostname.replace(/^www\./, ''); } catch { return []; }

  while ((m = re.exec(html)) && letti < 500 && fuori.length < quante) {
    letti++;
    const href = m[1];
    if (!href || href.startsWith('#') || /^(mailto|tel|javascript):/i.test(href)) continue;
    if (!RE_INTERESSANTI.test(href)) continue;

    let a;
    try { a = new URL(href, base); } catch { continue; }
    if (a.hostname.replace(/^www\./, '') !== radice) continue;
    if (/\.(pdf|jpg|png|zip|xml)$/i.test(a.pathname)) continue;

    const pulito = a.origin + a.pathname;
    if (pulito === base || viste.has(pulito)) continue;
    viste.add(pulito);
    fuori.push(pulito);
  }
  return fuori;
}

// Dall'HTML dell'informativa serve solo il testo: i nomi dei servizi si
// cercano li' dentro, e i tag darebbero falsi riscontri (un collegamento a
// facebook.com nel piede non e' una dichiarazione).
function testoPulito(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ');
}

function risposta(dati, stato) {
  return new Response(JSON.stringify(dati), {
    status: stato || 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}
