// pagina.js — analizza una singola pagina.
// Una chiamata esterna sola per invocazione: resta larghissima sui limiti
// del piano gratuito (50 chiamate, 10 ms di CPU).

import { analizzaPagina } from './_analisi.js';

const UA = 'VerificaSito/1.0 (strumento di analisi SEO e GEO)';
const MAX_BYTE = 900000; // oltre questa soglia la pagina viene troncata

export async function onRequest(context) {
  const parametri = new URL(context.request.url).searchParams;
  const indirizzo = (parametri.get('url') || '').trim();
  if (!/^https?:\/\//i.test(indirizzo))
    return risposta({ errore: 'Indirizzo non valido' }, 400);

  const inizio = Date.now();
  let recupero;
  try {
    recupero = await fetch(indirizzo, {
      headers: { 'User-Agent': UA, 'Accept': 'text/html,application/xhtml+xml' },
      redirect: 'follow',
      cf: { cacheTtl: 300, cacheEverything: true },
    });
  } catch (err) {
    return risposta({ url: indirizzo, errore: 'Pagina irraggiungibile', dettaglio: String(err).slice(0, 120) }, 200);
  }

  if (!recupero.ok)
    return risposta({ url: indirizzo, errore: 'Il server ha risposto ' + recupero.status, stato: recupero.status }, 200);

  const tipo = recupero.headers.get('content-type') || '';
  if (!/html/i.test(tipo))
    return risposta({ url: indirizzo, errore: 'Non è una pagina HTML (' + tipo.split(';')[0] + ')' }, 200);

  // Le intestazioni servono ai controlli di sicurezza e compressione.
  const intestazioni = {};
  for (const nome of ['content-encoding','content-type','strict-transport-security',
                      'x-content-type-options','x-frame-options','referrer-policy',
                      'content-security-policy','cache-control','server']) {
    const v = recupero.headers.get(nome);
    if (v) intestazioni[nome] = v;
  }

  let html = await recupero.text();
  const troncata = html.length > MAX_BYTE;
  if (troncata) html = html.slice(0, MAX_BYTE);

  const esito = analizzaPagina(html, recupero.url || indirizzo, intestazioni);
  esito.peso = html.length;
  esito.troncata = troncata;
  esito.millisecondi = Date.now() - inizio;
  esito.stato = recupero.status;
  esito.finale = recupero.url !== indirizzo ? recupero.url : null;

  return risposta(esito);
}

function risposta(dati, stato) {
  return new Response(JSON.stringify(dati), {
    status: stato || 200,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}
