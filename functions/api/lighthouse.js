// lighthouse.js — misura reale delle prestazioni tramite PageSpeed Insights.
//
// PageSpeed Insights È Lighthouse, eseguito sui server di Google. Restituisce
// i quattro punteggi (prestazioni, accessibilità, buone pratiche, SEO), le
// metriche Core Web Vitals di laboratorio e, quando il sito ha abbastanza
// traffico, anche i dati reali raccolti dai browser Chrome.
//
// Serve una chiave gratuita: console.cloud.google.com → API e servizi →
// abilita "PageSpeed Insights API" → Credenziali → Crea chiave API.
// La chiave va messa nelle variabili d'ambiente del progetto Cloudflare Pages
// con nome PSI_KEY. Senza chiave l'endpoint risponde "non configurato" e il
// resto dello strumento continua a funzionare.
//
// Quota gratuita: 25.000 chiamate al giorno. Ogni analisi ne usa una o due.

const CAMPI = 'lighthouseResult(categories,audits),loadingExperience(overall_category)';

// Le voci che il report mostra come "cosa rallenta la pagina".
const RIMEDI = {
  'render-blocking-resources': 'Sposta CSS e JavaScript non essenziali fuori dal percorso critico, o aggiungi defer agli script.',
  'modern-image-formats': 'Converti le immagini in AVIF o WebP: pesano circa la metà a parità di qualità.',
  'uses-responsive-images': 'Servi immagini della dimensione in cui vengono mostrate, non più grandi.',
  'unused-javascript': 'Rimuovi il JavaScript che non viene eseguito: spesso sono plugin o librerie non usate.',
  'uses-text-compression': 'Attiva la compressione Brotli o gzip sul server.',
  'server-response-time': 'Il server impiega troppo a rispondere: valuta una cache o un sito statico.',
};

const NOMI = {
  performance: 'Prestazioni',
  accessibility: 'Accessibilità',
  'best-practices': 'Buone pratiche',
  seo: 'SEO di base',
};

export async function onRequest(context) {
  try {
    return await lighthouse(context);
  } catch (err) {
    return risposta({ errore: 'Analisi non riuscita', dettaglio: String(err && err.message || err).slice(0, 140) }, 200);
  }
}

async function lighthouse(context) {
  const chiave = context.env && context.env.PSI_KEY;
  const parametri = new URL(context.request.url).searchParams;
  const indirizzo = (parametri.get('url') || '').trim();
  const dispositivo = parametri.get('mobile') === '0' ? 'desktop' : 'mobile';

  if (!/^https?:\/\//i.test(indirizzo))
    return risposta({ errore: 'Indirizzo non valido' }, 400);

  if (!chiave)
    return risposta({
      disponibile: false,
      motivo: 'Misura delle prestazioni non configurata: manca la chiave PageSpeed Insights.',
    });

  const base = 'https://www.googleapis.com/pagespeedonline/v5/runPagespeed'
    + '?url=' + encodeURIComponent(indirizzo)
    + '&strategy=' + dispositivo
    + '&category=performance&category=accessibility&category=best-practices&category=seo'
    + '&key=' + encodeURIComponent(chiave);

  // Prima con la risposta abbreviata, che pesa molto meno. Se Google non la
  // gradisce, si ripiega sulla risposta intera: meglio lenta che assente.
  async function chiedi(url) {
    const r = await fetch(url, { cf: { cacheTtl: 900, cacheEverything: true } });
    if (r.ok) return { ok: true, dati: await r.json() };
    let messaggio = '';
    try {
      const errore = await r.json();
      messaggio = (errore.error && errore.error.message) || '';
    } catch (e) { /* la risposta non era JSON */ }
    return { ok: false, stato: r.status, messaggio: messaggio.slice(0, 180) };
  }

  let dati;
  try {
    let esito = await chiedi(base + '&fields=' + encodeURIComponent(CAMPI));
    if (!esito.ok) esito = await chiedi(base);
    if (!esito.ok) return risposta({
      disponibile: false,
      motivo: 'Google ha risposto ' + esito.stato + (esito.messaggio ? ': ' + esito.messaggio : ''),
    });
    dati = esito.dati;
  } catch (err) {
    return risposta({ disponibile: false, motivo: 'Misura non riuscita', dettaglio: String(err).slice(0, 120) });
  }

  const lh = dati.lighthouseResult || {};
  const audit = lh.audits || {};
  const val = k => (audit[k] && audit[k].displayValue) || null;
  const punti = k => (audit[k] && typeof audit[k].score === 'number') ? audit[k].score : null;

  const categorie = [];
  for (const [chiaveCat, cat] of Object.entries(lh.categories || {}))
    if (cat && typeof cat.score === 'number')
      categorie.push({ id: chiaveCat, nome: NOMI[chiaveCat] || chiaveCat, punteggio: Math.round(cat.score * 100) });

  const metriche = [
    { id: 'largest-contentful-paint', nome: 'Comparsa del contenuto principale',
      spiegazione: 'Quanto tempo passa prima che il visitatore veda la parte più grossa della pagina. Sotto 2,5 secondi è buono.' },
    { id: 'cumulative-layout-shift', nome: 'Stabilità del disegno',
      spiegazione: 'Quanto la pagina "salta" mentre carica. Sotto 0,1 è buono. Di solito dipende da immagini senza misure dichiarate.' },
    { id: 'total-blocking-time', nome: 'Tempo in cui la pagina non risponde',
      spiegazione: 'Per quanto il browser resta occupato e ignora i clic. Sotto 200 millisecondi è buono.' },
    { id: 'first-contentful-paint', nome: 'Prima comparsa di qualcosa',
      spiegazione: 'Quando appare il primo pezzo di contenuto. Sotto 1,8 secondi è buono.' },
    { id: 'speed-index', nome: 'Velocità percepita',
      spiegazione: 'Quanto in fretta la pagina sembra completa a chi guarda.' },
    { id: 'server-response-time', nome: 'Risposta del server',
      spiegazione: 'Quanto ci mette il server a mandare la prima riga di HTML. Sotto 600 millisecondi è buono.' },
  ].map(x => ({ ...x, valore: val(x.id), esito: punti(x.id) })).filter(x => x.valore);

  const rallentamenti = Object.keys(RIMEDI)
    .filter(k => audit[k] && typeof audit[k].score === 'number' && audit[k].score < 0.9)
    .map(k => ({
      nome: (audit[k].title || k),
      quanto: audit[k].displayValue || '',
      rimedio: RIMEDI[k],
    }));

  const reali = dati.loadingExperience && dati.loadingExperience.overall_category
    ? { giudizio: dati.loadingExperience.overall_category }
    : null;

  return risposta({
    disponibile: true,
    dispositivo,
    categorie,
    metriche,
    rallentamenti,
    datiReali: reali,
  });
}

function risposta(dati, stato) {
  return new Response(JSON.stringify(dati), {
    status: stato || 200,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}
