// accessibilita.js — i 36 controlli WCAG su una singola pagina.
//
// Stessa forma di pagina.js: prende un indirizzo, scarica l'HTML, lo passa al
// motore e restituisce il risultato. Una pagina per invocazione, cosi' i 10
// millisecondi di CPU del piano gratuito valgono per una pagina sola.
//
// Il rispetto del robots.txt e' gia' stato deciso da /api/scopri, che gira
// prima: se quel file vieta la scansione, il client non arriva nemmeno qui.

import { analizzaAccessibilita } from './_accessibilita.js';

const UA = 'VerificaSitoBot/1.0 (+https://puntowebferrara.com/sottosopra/)';
const UA_BROWSER = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 '
  + '(KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';
const INTESTAZIONI = {
  'User-Agent': UA,
  'Accept-Language': 'it-IT,it;q=0.9,en;q=0.8',
  'Accept-Encoding': 'gzip, deflate, br',
  'Upgrade-Insecure-Requests': '1',
};

const MAX_HTML = 900000; // oltre questa soglia si taglia: non serve tutto

export async function onRequest(context) {
  const parametri = new URL(context.request.url).searchParams;
  const url = (parametri.get('url') || '').trim();

  if (!url || !/^https?:\/\//i.test(url)) {
    return risposta({ url, errore: 'Indirizzo non valido' }, 400);
  }

  let html = null;
  try {
    let r = await fetch(url, { headers: INTESTAZIONI, redirect: 'follow' });
    // Alcune protezioni rifiutano qualunque User-Agent che non sia un browser
    // noto. Il consenso lo esprime il robots.txt, gia' verificato: se il
    // firewall rifiuta lo stesso, si riprova una volta come browser.
    if (!r.ok && (r.status === 403 || r.status === 406 || r.status === 429)) {
      r = await fetch(url, {
        headers: { ...INTESTAZIONI, 'User-Agent': UA_BROWSER },
        redirect: 'follow',
      });
    }
    if (!r.ok) return risposta({ url, errore: 'HTTP ' + r.status }, 200);

    const tipo = r.headers.get('content-type') || '';
    if (tipo && !/text\/html|application\/xhtml/i.test(tipo)) {
      return risposta({ url, errore: 'Non è una pagina HTML' }, 200);
    }

    html = await r.text();
    if (html.length > MAX_HTML) html = html.slice(0, MAX_HTML);
  } catch (e) {
    return risposta({ url, errore: 'rete: ' + (e && e.message ? e.message : 'irraggiungibile') }, 200);
  }

  try {
    return risposta(analizzaAccessibilita(html, url), 200);
  } catch (e) {
    return risposta({ url, errore: 'analisi non riuscita: ' + (e && e.message ? e.message : '') }, 200);
  }
}

function risposta(oggetto, stato) {
  return new Response(JSON.stringify(oggetto), {
    status: stato,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}
