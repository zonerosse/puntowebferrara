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
  let policy = null, indirizzoPolicy = null;
  try {
    indirizzoPolicy = trovaPolicy(html, url);
    if (indirizzoPolicy) {
      const grezzo = await scarica(indirizzoPolicy, MAX_POLICY);
      if (grezzo) policy = testoPulito(grezzo);
    }
  } catch {
    // se la policy non si scarica si prosegue senza: meglio mezzo rapporto
    // che nessun rapporto
    policy = null;
  }

  const esito = analizzaCookie(html, url, policy);
  esito.disponibile = true;
  esito.indirizzoPolicy = indirizzoPolicy;
  esito.policyLetta = policy != null;

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

    // Solo sullo stesso sito: l'informativa di un altro dominio non e' la sua.
    try {
      if (new URL(assoluto).hostname !== new URL(base).hostname) continue;
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
