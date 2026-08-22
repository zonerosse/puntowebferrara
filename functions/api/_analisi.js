// _analisi.js — motore di controllo di una singola pagina.
// Nessuna dipendenza esterna. Le espressioni regolari sono tenute
// volutamente semplici: il piano gratuito di Cloudflare concede
// 10 millisecondi di CPU per invocazione.

const RE_SCRIPT = /<script[\s\S]*?<\/script>/gi;
const RE_STYLE = /<style[\s\S]*?<\/style>/gi;
const RE_LD = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
const RE_TITLE = /<title[^>]*>([\s\S]*?)<\/title>/i;
const RE_TAG = /<[^>]+>/g;

function meta(html, nome) {
  const r = new RegExp('<meta[^>]+name=["\']' + nome + '["\'][^>]+content=["\']([^"\']*)["\']', 'i');
  const m = html.match(r);
  if (m) return m[1];
  const r2 = new RegExp('<meta[^>]+content=["\']([^"\']*)["\'][^>]+name=["\']' + nome + '["\']', 'i');
  const m2 = html.match(r2);
  return m2 ? m2[1] : null;
}

function proprieta(html, prop) {
  const r = new RegExp('<meta[^>]+property=["\']' + prop + '["\'][^>]+content=["\']([^"\']*)["\']', 'i');
  const m = html.match(r);
  return m ? m[1] : null;
}

function pulisci(s) {
  return s.replace(RE_TAG, ' ')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ').trim();
}

const plurale = (n, singolare, plurale_) => n + ' ' + (n === 1 ? singolare : plurale_);

export function analizzaPagina(html, url) {
  const problemi = [];
  const segnala = (categoria, gravita, messaggio) => problemi.push({ categoria, gravita, messaggio });

  const corpo = html.replace(RE_SCRIPT, ' ').replace(RE_STYLE, ' ');
  const visibile = pulisci(corpo);
  const parole = visibile ? visibile.split(' ').length : 0;

  // ---------------------------------------------------------- titoli
  const titoli = [];
  const reH = /<h([1-6])[^>]*>([\s\S]*?)<\/h\1>/gi;
  let m;
  while ((m = reH.exec(corpo)) !== null) {
    titoli.push({ livello: Number(m[1]), testo: pulisci(m[2]) });
    if (titoli.length > 250) break;
  }

  const h1 = titoli.filter(t => t.livello === 1);
  if (h1.length === 0) segnala('Struttura', 'alto', 'Nessun H1 nella pagina');
  else if (h1.length > 1) segnala('Struttura', 'alto', h1.length + ' tag H1 nella stessa pagina: deve essercene uno solo');
  if (h1.length === 1 && h1[0].testo.length > 70)
    segnala('Struttura', 'basso', 'H1 di ' + h1[0].testo.length + ' caratteri');

  let precedente = 0;
  for (const t of titoli) {
    if (precedente && t.livello > precedente + 1) {
      segnala('Struttura', 'medio',
        'Salto di livello: H' + t.livello + ' dopo H' + precedente + ' — "' + t.testo.slice(0, 45) + '"');
      break;
    }
    precedente = t.livello;
  }
  if (parole > 500 && !titoli.some(t => t.livello === 2))
    segnala('Struttura', 'medio', 'Contenuto lungo senza nessun H2');

  // ---------------------------------------------------------- metadati
  const mt = html.match(RE_TITLE);
  const titolo = mt ? pulisci(mt[1]) : '';
  if (!titolo) segnala('Metadati', 'alto', 'Title assente');
  else if (titolo.length > 60) segnala('Metadati', 'basso', 'Title di ' + titolo.length + ' caratteri (oltre 60 viene troncato)');
  else if (titolo.length < 15) segnala('Metadati', 'medio', 'Title di ' + plurale(titolo.length, 'solo carattere', 'caratteri appena'));

  const descrizione = meta(html, 'description');
  if (!descrizione) segnala('Metadati', 'medio', 'Meta description assente');
  else if (descrizione.length > 165) segnala('Metadati', 'basso', 'Description di ' + descrizione.length + ' caratteri (viene troncata)');
  else if (descrizione.length < 70) segnala('Metadati', 'basso', 'Description di ' + plurale(descrizione.length, 'solo carattere', 'caratteri appena'));

  if (!proprieta(html, 'og:title') || !proprieta(html, 'og:image'))
    segnala('Metadati', 'basso', 'Open Graph incompleto: le condivisioni social non mostrano anteprima');

  // ---------------------------------------------------------- indicizzazione
  const canonical = html.match(/<link[^>]+rel=["']canonical["'][^>]*>/i);
  if (!canonical) segnala('Indicizzazione', 'alto', 'Manca il link canonical');

  const robots = meta(html, 'robots') || '';
  const noindex = /noindex/i.test(robots);
  if (noindex) segnala('Indicizzazione', 'basso', 'Pagina esclusa dagli indici (noindex)');

  const hreflang = (html.match(/hreflang=["'][^"']+["']/gi) || []).length;
  const lang = (html.match(/<html[^>]+lang=["']([^"']+)["']/i) || [, null])[1];
  if (!lang) segnala('Indicizzazione', 'medio', 'Manca l\'attributo lang nel tag html');

  // ---------------------------------------------------------- dati strutturati
  const tipi = [];
  let blocchi = 0, invalidi = 0;
  const contatti = { via: null, cap: null, coordinate: null, telefono: null };
  let reLd = new RegExp(RE_LD.source, 'gi');
  while ((m = reLd.exec(html)) !== null) {
    blocchi++;
    let dato;
    try {
      dato = JSON.parse(m[1]);
    } catch (err) {
      invalidi++;
      segnala('Dati strutturati', 'alto', 'Blocco JSON-LD non valido: ' + String(err.message).slice(0, 80));
      continue;
    }
    const elenco = Array.isArray(dato) ? dato : (dato['@graph'] ? dato['@graph'] : [dato]);
    for (const oggetto of elenco) {
      if (!oggetto || typeof oggetto !== 'object') continue;
      const t = oggetto['@type'];
      for (const nome of (Array.isArray(t) ? t : [t])) if (nome) tipi.push(String(nome));
      const ind = oggetto.address;
      if (ind && typeof ind === 'object') {
        if (ind.streetAddress) contatti.via = String(ind.streetAddress);
        if (ind.postalCode) contatti.cap = String(ind.postalCode);
      }
      const geo = oggetto.geo;
      if (geo && typeof geo === 'object' && geo.latitude != null)
        contatti.coordinate = geo.latitude + ',' + geo.longitude;
      if (oggetto.telephone) contatti.telefono = String(oggetto.telephone).replace(/[^\d+]/g, '');
    }
  }

  if (blocchi === 0)
    segnala('Dati strutturati', 'alto', 'Nessun dato strutturato JSON-LD: i motori IA non hanno appigli per riconoscere l\'entità');
  if (tipi.filter(t => t === 'FAQPage').length > 1)
    segnala('Dati strutturati', 'alto', 'Due o più blocchi FAQPage nella stessa pagina: rischiano di essere ignorati entrambi');

  // domande nel testo rimaste fuori dallo schema
  const domande = titoli
    .filter(t => t.livello >= 2 && t.testo.endsWith('?') && t.testo.length > 12)
    .filter(t => !/^(vuoi|hai bisogno|want|do you|möchten)/i.test(t.testo));
  if (domande.length >= 3 && !tipi.includes('FAQPage'))
    segnala('FAQ', 'medio', domande.length + ' domande nei titoli ma nessuno schema FAQPage: i motori IA non le riconoscono come domande');

  // ---------------------------------------------------------- immagini
  const immagini = corpo.match(/<img[^>]*>/gi) || [];
  let senzaAlt = 0;
  for (const tag of immagini) if (!/\salt\s*=/i.test(tag)) senzaAlt++;
  if (senzaAlt) segnala('Immagini', 'medio', plurale(senzaAlt, 'immagine', 'immagini') + ' su ' + immagini.length + ' senza attributo alt');

  // ---------------------------------------------------------- contenuto
  if (parole < 150 && !noindex)
    segnala('Contenuto', 'medio', 'Solo ' + parole + ' parole di testo: troppo poco perché un motore IA possa citarla');

  const link = corpo.match(/<a\s[^>]*href=/gi) || [];

  // Bandierine per il punteggio: ogni voce e' un controllo passato o non passato.
  const og = !!(proprieta(html, 'og:title') && proprieta(html, 'og:image'));
  const flag = {
    h1unico: h1.length === 1,
    titoliOrdinati: !problemi.some(p => p.messaggio.startsWith('Salto di livello')),
    haH2: titoli.some(t => t.livello === 2),
    testoSufficiente: parole >= 300,
    titleOk: !!titolo && titolo.length >= 15 && titolo.length <= 60,
    descrizioneOk: !!descrizione && descrizione.length >= 70 && descrizione.length <= 165,
    openGraph: og,
    canonical: !!canonical,
    lang: !!lang,
    hreflangOk: hreflang === 0 || hreflang >= 2,
    jsonLd: blocchi > 0,
    jsonLdValido: blocchi > 0 && invalidi === 0,
    schemaEntita: tipi.some(t => ['Organization', 'LocalBusiness', 'Person'].includes(t)),
    schemaSito: tipi.includes('WebSite'),
    schemaContenuto: tipi.some(t => [
      'Article', 'BlogPosting', 'NewsArticle', 'FAQPage', 'QAPage', 'HowTo',
      'Product', 'Recipe', 'Event', 'Service', 'JobPosting',
      'CollectionPage', 'ItemList', 'AboutPage', 'ContactPage', 'ProfilePage', 'WebPage',
    ].includes(t)),
    briciole: tipi.includes('BreadcrumbList'),
    domandeCoperte: !(domande.length >= 3 && !tipi.includes('FAQPage')),
    immaginiConAlt: immagini.length === 0 || senzaAlt === 0,
  };

  return {
    url, titolo, descrizione: descrizione || '', lang, parole, flag,
    h1: h1.length, titoliTotali: titoli.length,
    immagini: immagini.length, senzaAlt,
    link: link.length, hreflang, canonical: !!canonical, noindex,
    blocchiJsonLd: blocchi, jsonLdInvalidi: invalidi,
    tipiSchema: Array.from(new Set(tipi)),
    contatti, problemi,
  };
}
