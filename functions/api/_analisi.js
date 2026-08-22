// _analisi.js — analisi di una singola pagina.
// Nessuna dipendenza. Espressioni regolari volutamente semplici: il piano
// gratuito di Cloudflare concede 10 millisecondi di CPU per invocazione.

const RE_SCRIPT = /<script[\s\S]*?<\/script>/gi;
const RE_STYLE = /<style[\s\S]*?<\/style>/gi;
const RE_LD = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
const RE_TITLE = /<title[^>]*>([\s\S]*?)<\/title>/i;
const RE_TAG = /<[^>]+>/g;

function meta(html, nome) {
  const a = html.match(new RegExp('<meta[^>]+name=["\']' + nome + '["\'][^>]+content=["\']([^"\']*)["\']', 'i'));
  if (a) return a[1];
  const b = html.match(new RegExp('<meta[^>]+content=["\']([^"\']*)["\'][^>]+name=["\']' + nome + '["\']', 'i'));
  return b ? b[1] : null;
}
function prop(html, p) {
  const m = html.match(new RegExp('<meta[^>]+property=["\']' + p + '["\'][^>]+content=["\']([^"\']*)["\']', 'i'));
  return m ? m[1] : null;
}
function pulisci(s) {
  return s.replace(RE_TAG, ' ')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ').trim();
}
const attr = (tag, nome) => {
  const m = tag.match(new RegExp(nome + '\\s*=\\s*["\']([^"\']*)["\']', 'i'));
  return m ? m[1] : null;
};

export function analizzaPagina(html, url, intestazioni) {
  const H = intestazioni || {};
  const problemi = [];
  const segnala = (categoria, gravita, messaggio) => problemi.push({ categoria, gravita, messaggio });

  const corpo = html.replace(RE_SCRIPT, ' ').replace(RE_STYLE, ' ');
  const visibile = pulisci(corpo);
  const parole = visibile ? visibile.split(' ').length : 0;

  // ------------------------------------------------------------ titoli
  const titoli = [];
  const reH = /<h([1-6])[^>]*>([\s\S]*?)<\/h\1>/gi;
  let m;
  while ((m = reH.exec(corpo)) !== null) {
    titoli.push({ livello: Number(m[1]), testo: pulisci(m[2]) });
    if (titoli.length > 250) break;
  }
  const h1 = titoli.filter(t => t.livello === 1);
  if (!h1.length) segnala('Struttura', 'alto', 'Nessun H1: la pagina non dichiara il proprio argomento');
  else if (h1.length > 1) segnala('Struttura', 'alto', h1.length + ' tag H1 nella stessa pagina: deve essercene uno solo');
  if (h1.length === 1 && h1[0].testo.length > 70)
    segnala('Struttura', 'basso', 'H1 di ' + h1[0].testo.length + ' caratteri: troppo lungo per fare da titolo');

  let prec = 0, salta = false;
  for (const t of titoli) {
    if (prec && t.livello > prec + 1) {
      segnala('Struttura', 'medio', 'Salto di livello: H' + t.livello + ' dopo H' + prec +
        ' \u2014 "' + t.testo.slice(0, 45) + '"');
      salta = true; break;
    }
    prec = t.livello;
  }
  const haH2 = titoli.some(t => t.livello === 2);
  if (parole > 500 && !haH2) segnala('Struttura', 'medio', 'Contenuto lungo senza nessun H2: non c\u2019\u00e8 nulla da estrarre a blocchi');

  // ------------------------------------------------------------ metadati
  const mt = html.match(RE_TITLE);
  const titolo = mt ? pulisci(mt[1]) : '';
  if (!titolo) segnala('Metadati', 'alto', 'Title assente');
  else if (titolo.length > 60) segnala('Metadati', 'basso', 'Title di ' + titolo.length + ' caratteri: Google ne mostra circa 60');
  else if (titolo.length < 15) segnala('Metadati', 'medio', 'Title di ' + titolo.length + ' caratteri: troppo corto per dire di cosa parla la pagina');

  const descr = meta(html, 'description');
  if (!descr) segnala('Metadati', 'medio', 'Meta description assente: Google si inventa lo snippet');
  else if (descr.length > 165) segnala('Metadati', 'basso', 'Description di ' + descr.length + ' caratteri: viene troncata');
  else if (descr.length < 70) segnala('Metadati', 'basso', 'Description di ' + descr.length + ' caratteri: spazio sprecato');

  const og = !!(prop(html, 'og:title') && prop(html, 'og:image') && prop(html, 'og:description'));
  if (!og) segnala('Metadati', 'basso', 'Open Graph incompleto: le condivisioni escono senza anteprima');
  const twitter = !!(meta(html, 'twitter:card') || prop(html, 'og:image'));

  // ------------------------------------------------------------ indicizzazione
  const canonicalTag = html.match(/<link[^>]+rel=["']canonical["'][^>]*>/i);
  const canonicalUrl = canonicalTag ? attr(canonicalTag[0], 'href') : null;
  if (!canonicalTag) segnala('Indicizzazione', 'alto', 'Manca il link canonical: rischio di contenuti duplicati');

  const robots = (meta(html, 'robots') || '').toLowerCase();
  const noindex = /noindex/.test(robots);
  if (noindex) segnala('Indicizzazione', 'basso', 'Pagina esclusa dagli indici con noindex: se \u00e8 voluto va bene cos\u00ec');
  if (/nofollow/.test(robots)) segnala('Indicizzazione', 'medio', 'La pagina blocca il passaggio di autorit\u00e0 con nofollow');

  const hreflang = (html.match(/hreflang=["'][^"']+["']/gi) || []).length;
  const lang = (html.match(/<html[^>]+lang=["']([^"']+)["']/i) || [, null])[1];
  if (!lang) segnala('Indicizzazione', 'medio', 'Manca l\u2019attributo lang: i motori non sanno in che lingua \u00e8 scritta');

  const viewport = /<meta[^>]+name=["']viewport["']/i.test(html);
  if (!viewport) segnala('Mobile', 'alto', 'Manca il meta viewport: su telefono la pagina esce rimpicciolita');
  const charset = /<meta[^>]+charset/i.test(html);

  // ------------------------------------------------------------ dati strutturati
  const tipi = [];
  let blocchi = 0, invalidi = 0;
  const contatti = { via: null, cap: null, coordinate: null, telefono: null };
  let entitaCompleta = null;
  const reLd = new RegExp(RE_LD.source, 'gi');
  while ((m = reLd.exec(html)) !== null) {
    blocchi++;
    let dato;
    try { dato = JSON.parse(m[1]); }
    catch (err) {
      invalidi++;
      segnala('Dati strutturati', 'alto', 'Blocco JSON-LD non valido, quindi ignorato: ' + String(err.message).slice(0, 70));
      continue;
    }
    const lista = Array.isArray(dato) ? dato : (dato['@graph'] || [dato]);
    for (const o of lista) {
      if (!o || typeof o !== 'object') continue;
      const t = o['@type'];
      const tt = Array.isArray(t) ? t : [t];
      for (const n of tt) if (n) tipi.push(String(n));
      const ind = o.address;
      if (ind && typeof ind === 'object') {
        if (ind.streetAddress) contatti.via = String(ind.streetAddress);
        if (ind.postalCode) contatti.cap = String(ind.postalCode);
      }
      if (o.geo && o.geo.latitude != null) contatti.coordinate = o.geo.latitude + ',' + o.geo.longitude;
      if (o.telephone) contatti.telefono = String(o.telephone).replace(/[^\d+]/g, '');
      if (tt.some(x => ['Organization', 'LocalBusiness', 'ProfessionalService', 'Store'].includes(x))) {
        const completa = !!(o.name && (o.telephone || o.email) && o.address && o.url);
        entitaCompleta = entitaCompleta === false ? false : completa;
        if (!completa) segnala('Dati strutturati', 'medio',
          'La scheda dell\u2019attivit\u00e0 \u00e8 incompleta: mancano nome, contatto, indirizzo o sito');
      }
    }
  }
  if (!blocchi) segnala('Dati strutturati', 'alto',
    'Nessun dato strutturato: i motori IA non hanno appigli per capire di chi \u00e8 il sito');
  if (tipi.filter(t => t === 'FAQPage').length > 1)
    segnala('Dati strutturati', 'alto', 'Due o pi\u00f9 blocchi FAQPage sulla stessa pagina: rischiano di essere ignorati entrambi');

  const domande = titoli
    .filter(t => t.livello >= 2 && t.testo.endsWith('?') && t.testo.length > 12)
    .filter(t => !/^(vuoi|hai bisogno|want|do you|m\u00f6chten)/i.test(t.testo));
  if (domande.length >= 3 && !tipi.includes('FAQPage'))
    segnala('FAQ', 'medio', domande.length + ' domande nei titoli senza schema FAQPage: i motori non le riconoscono come domande');

  // ------------------------------------------------------------ immagini
  const immagini = corpo.match(/<img[^>]*>/gi) || [];
  let senzaAlt = 0, senzaMisure = 0, pesanti = 0, pigre = 0;
  for (const tag of immagini) {
    if (!/\salt\s*=/i.test(tag)) senzaAlt++;
    if (!(attr(tag, 'width') && attr(tag, 'height'))) senzaMisure++;
    const src = attr(tag, 'src') || '';
    if (/\.(jpe?g|png)(\?|$)/i.test(src)) pesanti++;
    if (/loading\s*=\s*["']lazy/i.test(tag)) pigre++;
  }
  if (senzaAlt) segnala('Immagini', 'medio', senzaAlt + ' immagini su ' + immagini.length +
    ' senza testo alternativo: invisibili a chi non vede e ai motori');
  if (senzaMisure > 2) segnala('Immagini', 'medio', senzaMisure + ' immagini senza width e height: la pagina "salta" mentre carica');
  if (pesanti > 2) segnala('Immagini', 'basso', pesanti + ' immagini in JPG o PNG: in AVIF o WebP peserebbero circa la met\u00e0');

  // ------------------------------------------------------------ codice e peso
  const scriptEsterni = (html.match(/<script[^>]+src=/gi) || []).length;
  const scriptBloccanti = (html.match(/<script(?![^>]*(?:async|defer))[^>]+src=/gi) || []).length;
  const cssEsterni = (html.match(/<link[^>]+rel=["']stylesheet["']/gi) || []).length;
  if (scriptBloccanti > 3) segnala('Prestazioni', 'medio',
    scriptBloccanti + ' script bloccano il disegno della pagina: basterebbe aggiungere defer');
  if (html.length > 250000) segnala('Prestazioni', 'medio',
    'Pagina da ' + Math.round(html.length / 1024) + ' KB di solo HTML: pesante da scaricare e da leggere');

  // ------------------------------------------------------------ contenuto e link
  if (parole < 150 && !noindex) segnala('Contenuto', 'medio',
    'Solo ' + parole + ' parole: troppo poco perch\u00e9 un motore IA possa citarla');

  const linkTag = corpo.match(/<a\s[^>]*href=["'][^"']+["'][^>]*>/gi) || [];
  let interni = 0, esterni = 0;
  let dominio = '';
  try { dominio = new URL(url).origin; } catch (e) {}
  for (const t of linkTag) {
    const href = attr(t, 'href') || '';
    if (/^https?:\/\//i.test(href)) { if (dominio && href.startsWith(dominio)) interni++; else esterni++; }
    else if (href.startsWith('/')) interni++;
  }
  if (interni < 3 && parole > 300) segnala('Collegamenti', 'basso',
    'Solo ' + interni + ' collegamenti verso altre pagine del sito: la pagina resta isolata');

  // ------------------------------------------------------------ intestazioni HTTP
  const conIntestazioni = Object.keys(H).length > 0;
  const h = k => String(H[k] || '').toLowerCase();
  const https = /^https:/i.test(url);
  const compresso = /gzip|br|zstd|deflate/.test(h('content-encoding'));
  const sicurezza = ['x-content-type-options', 'x-frame-options', 'referrer-policy', 'content-security-policy']
    .filter(k => h(k)).length;
  const hsts = !!h('strict-transport-security');
  if (!https) segnala('Sicurezza', 'alto', 'Pagina non servita in HTTPS: i browser la segnalano come non sicura');
  if (https && conIntestazioni && !hsts) segnala('Sicurezza', 'basso',
    'Manca HSTS: il primo accesso pu\u00f2 ancora passare in chiaro');
  if (conIntestazioni && sicurezza < 3) segnala('Sicurezza', 'medio',
    'Solo ' + sicurezza + ' intestazioni di sicurezza su 4');
  // Nota: la compressione non è verificabile da qui. Cloudflare decomprime la
  // risposta e rimuove l'intestazione content-encoding, quindi risulterebbe
  // sempre assente. Il controllo lo fa Lighthouse, che vede la pagina davvero.

  // ------------------------------------------------------------ esiti
  const flag = {
    h1unico: h1.length === 1,
    titoliOrdinati: !salta,
    haH2: haH2 || parole < 300,
    testoSufficiente: parole >= 300 || noindex,
    domandeCoperte: !(domande.length >= 3 && !tipi.includes('FAQPage')),
    collegata: interni >= 3 || parole <= 300,
    titleOk: !!titolo && titolo.length >= 15 && titolo.length <= 60,
    descrizioneOk: !!descr && descr.length >= 70 && descr.length <= 165,
    openGraph: og,
    twitter: twitter,
    canonical: !!canonicalTag,
    lang: !!lang,
    hreflangOk: hreflang === 0 || hreflang >= 2,
    charset: charset,
    viewport: viewport,
    jsonLd: blocchi > 0,
    jsonLdValido: blocchi > 0 && invalidi === 0,
    schemaEntita: tipi.some(t => ['Organization', 'LocalBusiness', 'ProfessionalService', 'Person', 'Store'].includes(t)),
    entitaCompleta: entitaCompleta !== false,
    schemaSito: tipi.includes('WebSite'),
    schemaContenuto: tipi.some(t => [
      'Article', 'BlogPosting', 'NewsArticle', 'FAQPage', 'QAPage', 'HowTo',
      'Product', 'Recipe', 'Event', 'Service', 'JobPosting',
      'CollectionPage', 'ItemList', 'AboutPage', 'ContactPage', 'ProfilePage', 'WebPage',
    ].includes(t)),
    briciole: tipi.includes('BreadcrumbList'),
    immaginiConAlt: immagini.length === 0 || senzaAlt === 0,
    immaginiConMisure: immagini.length === 0 || senzaMisure <= 2,
    immaginiLeggere: immagini.length === 0 || pesanti <= 2,
    https: https,
    hsts: !conIntestazioni || hsts,
    intestazioniSicurezza: !conIntestazioni || sicurezza >= 3,
    scriptNonBloccanti: scriptBloccanti <= 3,
    pesoPagina: html.length <= 250000,
  };

  return {
    url, titolo, descrizione: descr || '', lang, parole, flag, problemi,
    h1: h1.length, titoliTotali: titoli.length, domande: domande.length,
    immagini: immagini.length, senzaAlt, senzaMisure, pigre,
    linkInterni: interni, linkEsterni: esterni,
    hreflang, canonical: canonicalUrl, noindex,
    blocchiJsonLd: blocchi, jsonLdInvalidi: invalidi,
    tipiSchema: Array.from(new Set(tipi)),
    scriptEsterni, scriptBloccanti, cssEsterni, peso: html.length,
    intestazioniSicurezza: sicurezza, compresso, hsts,
    contatti,
  };
}
