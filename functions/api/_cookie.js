// _cookie.js — riconosce chi ti segue, e se qualcuno ha chiesto il permesso.
//
// Stessa forma di _analisi.js e _accessibilita.js: nessuna dipendenza,
// espressioni regolari semplici, tetti espliciti. Il piano gratuito di
// Cloudflare concede 10 millisecondi di CPU per invocazione.
//
// QUELLO CHE QUI NON SI PUO' FARE, E VA DETTO IN CHIARO.
// I cookie non stanno nell'HTML: nascono quando gli script girano nel
// browser. Da qui si vede CHI E' INSTALLATO — se c'e' la riga che carica
// Google Analytics, Google Analytics c'e', ed e' un fatto verificabile da
// chiunque apra il sorgente. Non si vede QUALI COOKIE SCRIVE, ne' se parta
// prima o dopo il consenso.
//
// Ogni controllo dichiara la propria fonte: 'server' quando la risposta e'
// definitiva, 'browser' quando serve la pagina viva. I secondi tornano con
// esito null e la spiegazione del perche', e si accenderanno con
// l'estensione senza che qui cambi niente.

const RE_COMMENTO = /<!--[\s\S]*?-->/g;

/* =========================================================================
   CHI PUO' ESSERCI DENTRO
   Ogni voce ha le impronte con cui si riconosce: pezzi di indirizzo o di
   codice che compaiono nella pagina quando quel servizio e' installato.
   ========================================================================= */

const SERVIZI = [
  // --- misurazione del traffico ---
  { id: 'ga4', nome: 'Google Analytics', genere: 'misura', ue: false,
    impronte: ['googletagmanager.com/gtag/js', 'google-analytics.com/analytics.js',
               'gtag(\'config\'', 'gtag("config"'] },
  { id: 'gtm', nome: 'Google Tag Manager', genere: 'misura', ue: false,
    impronte: ['googletagmanager.com/gtm.js', 'googletagmanager.com/ns.html'] },
  { id: 'clarity', nome: 'Microsoft Clarity', genere: 'sessione', ue: false,
    impronte: ['clarity.ms/tag'] },
  { id: 'hotjar', nome: 'Hotjar', genere: 'sessione', ue: false,
    impronte: ['static.hotjar.com', 'hj(\'', 'hjid:'] },
  { id: 'mouseflow', nome: 'Mouseflow', genere: 'sessione', ue: false,
    impronte: ['cdn.mouseflow.com'] },
  { id: 'smartlook', nome: 'Smartlook', genere: 'sessione', ue: false,
    impronte: ['web-sdk.smartlook.com'] },
  { id: 'fullstory', nome: 'FullStory', genere: 'sessione', ue: false,
    impronte: ['edge.fullstory.com'] },
  { id: 'yandex', nome: 'Yandex Metrica', genere: 'misura', ue: false,
    impronte: ['mc.yandex.ru/metrika'] },
  { id: 'matomo', nome: 'Matomo', genere: 'misura', ue: true,
    impronte: ['matomo.js', 'piwik.js', '_paq.push'] },
  { id: 'plausible', nome: 'Plausible', genere: 'misura-leggera', ue: true,
    impronte: ['plausible.io/js'] },
  { id: 'fathom', nome: 'Fathom', genere: 'misura-leggera', ue: false,
    impronte: ['cdn.usefathom.com'] },
  { id: 'simpleanalytics', nome: 'Simple Analytics', genere: 'misura-leggera', ue: true,
    impronte: ['scripts.simpleanalyticscdn.com'] },
  { id: 'umami', nome: 'Umami', genere: 'misura-leggera', ue: true,
    impronte: ['umami.is/script.js', 'data-website-id'] },
  { id: 'cfanalytics', nome: 'Cloudflare Web Analytics', genere: 'misura-leggera', ue: false,
    impronte: ['static.cloudflareinsights.com'] },

  // --- pubblicita' e retargeting ---
  { id: 'meta', nome: 'Meta Pixel (Facebook)', genere: 'pubblicita', ue: false,
    impronte: ['connect.facebook.net', 'fbq(\'init', 'fbq("init'] },
  { id: 'googleads', nome: 'Google Ads', genere: 'pubblicita', ue: false,
    impronte: ['googleadservices.com', 'googlesyndication.com'] },
  { id: 'doubleclick', nome: 'Google DoubleClick', genere: 'pubblicita', ue: false,
    impronte: ['doubleclick.net'] },
  { id: 'linkedin', nome: 'LinkedIn Insight', genere: 'pubblicita', ue: false,
    impronte: ['snap.licdn.com'] },
  { id: 'tiktok', nome: 'TikTok Pixel', genere: 'pubblicita', ue: false,
    impronte: ['analytics.tiktok.com'] },
  { id: 'pinterest', nome: 'Pinterest Tag', genere: 'pubblicita', ue: false,
    impronte: ['s.pinimg.com/ct'] },
  { id: 'twitter', nome: 'X / Twitter Pixel', genere: 'pubblicita', ue: false,
    impronte: ['static.ads-twitter.com'] },
  { id: 'bing', nome: 'Microsoft Advertising', genere: 'pubblicita', ue: false,
    impronte: ['bat.bing.com'] },
  { id: 'criteo', nome: 'Criteo', genere: 'pubblicita', ue: false,
    impronte: ['static.criteo.net'] },
  { id: 'taboola', nome: 'Taboola', genere: 'pubblicita', ue: false,
    impronte: ['cdn.taboola.com'] },
  { id: 'outbrain', nome: 'Outbrain', genere: 'pubblicita', ue: false,
    impronte: ['outbrain.com/outbrain.js'] },

  // --- contenuti incorporati che si portano dietro tracciamento ---
  { id: 'youtube', nome: 'Video YouTube', genere: 'incorporato', ue: false,
    impronte: ['youtube.com/embed'] },
  { id: 'youtube-nc', nome: 'Video YouTube (versione senza cookie)',
    genere: 'incorporato-ok', ue: false,
    impronte: ['youtube-nocookie.com/embed'] },
  { id: 'vimeo', nome: 'Video Vimeo', genere: 'incorporato', ue: false,
    impronte: ['player.vimeo.com/video'] },
  { id: 'gmaps', nome: 'Mappe Google', genere: 'incorporato', ue: false,
    impronte: ['google.com/maps/embed', 'maps.googleapis.com/maps/api/js'] },
  { id: 'gfonts', nome: 'Font di Google', genere: 'incorporato', ue: false,
    impronte: ['fonts.googleapis.com', 'fonts.gstatic.com'] },
  { id: 'recaptcha', nome: 'Google reCAPTCHA', genere: 'incorporato', ue: false,
    impronte: ['google.com/recaptcha', 'gstatic.com/recaptcha'] },
  { id: 'turnstile', nome: 'Cloudflare Turnstile', genere: 'incorporato-ok', ue: false,
    impronte: ['challenges.cloudflare.com/turnstile'] },
  { id: 'disqus', nome: 'Disqus', genere: 'incorporato', ue: false,
    impronte: ['disqus.com/embed.js'] },
  { id: 'instagram', nome: 'Riquadro Instagram', genere: 'incorporato', ue: false,
    impronte: ['instagram.com/embed.js'] },
  { id: 'fbwidget', nome: 'Riquadro Facebook', genere: 'incorporato', ue: false,
    impronte: ['facebook.com/plugins/'] },
  { id: 'trustpilot', nome: 'Trustpilot', genere: 'incorporato', ue: true,
    impronte: ['widget.trustpilot.com'] },
  { id: 'calendly', nome: 'Calendly', genere: 'incorporato', ue: false,
    impronte: ['assets.calendly.com'] },
  { id: 'intercom', nome: 'Intercom', genere: 'chat', ue: false,
    impronte: ['widget.intercom.io', 'intercomcdn.com'] },
  { id: 'tawk', nome: 'Tawk.to', genere: 'chat', ue: false,
    impronte: ['embed.tawk.to'] },
  { id: 'crisp', nome: 'Crisp', genere: 'chat', ue: true,
    impronte: ['client.crisp.chat'] },
  { id: 'hubspot', nome: 'HubSpot', genere: 'crm', ue: false,
    impronte: ['js.hs-scripts.com', 'js.hsforms.net'] },
  { id: 'mailchimp', nome: 'Mailchimp', genere: 'crm', ue: false,
    impronte: ['chimpstatic.com', 'list-manage.com'] },
  { id: 'klaviyo', nome: 'Klaviyo', genere: 'crm', ue: false,
    impronte: ['static.klaviyo.com'] },
  { id: 'formspree', nome: 'Formspree', genere: 'moduli', ue: false,
    impronte: ['formspree.io/f/'] },
  { id: 'typeform', nome: 'Typeform', genere: 'moduli', ue: true,
    impronte: ['embed.typeform.com'] },
];

// I generi che, secondo il Garante e la prassi, richiedono il consenso
// PRIMA di partire. Gli altri sono tecnici o comunque meno gravi.
const CHIEDONO_CONSENSO = ['misura', 'sessione', 'pubblicita', 'incorporato',
                           'chat', 'crm'];

/* =========================================================================
   CHI CHIEDE IL PERMESSO
   ========================================================================= */

const PIATTAFORME = [
  { id: 'cookiebot', nome: 'Cookiebot',
    impronte: ['consent.cookiebot.com', 'CookieConsent.'],
    marcatori: ['data-cookieconsent'] },
  { id: 'iubenda', nome: 'iubenda',
    impronte: ['cdn.iubenda.com', '_iub.cs'],
    marcatori: ['_iub_cs_activate', 'class="_iub_cs_activate"'] },
  { id: 'cookieyes', nome: 'CookieYes',
    impronte: ['cdn-cookieyes.com'],
    marcatori: ['data-cookieyes'] },
  { id: 'complianz', nome: 'Complianz',
    impronte: ['complianz', 'cmplz-'],
    marcatori: ['data-category', 'data-service'] },
  { id: 'onetrust', nome: 'OneTrust',
    impronte: ['cdn.cookielaw.org', 'onetrust'],
    marcatori: ['data-ot-ignore', 'class="optanon-category'] },
  { id: 'usercentrics', nome: 'Usercentrics',
    impronte: ['app.usercentrics.eu', 'usercentrics'],
    marcatori: ['data-usercentrics'] },
  { id: 'termly', nome: 'Termly',
    impronte: ['app.termly.io'],
    marcatori: ['data-categories'] },
  { id: 'osano', nome: 'Osano',
    impronte: ['cmp.osano.com'],
    marcatori: ['data-osano'] },
  { id: 'quantcast', nome: 'Quantcast Choice',
    impronte: ['quantcast.mgr.consensu.org', 'cmp.quantcast'],
    marcatori: [] },
  { id: 'cookiescript', nome: 'CookieScript',
    impronte: ['cookie-script.com'],
    marcatori: ['data-cookiescript'] },
  { id: 'borlabs', nome: 'Borlabs Cookie',
    impronte: ['borlabs-cookie'],
    marcatori: ['data-borlabs-cookie'] },
  { id: 'cookiefirst', nome: 'CookieFirst',
    impronte: ['consent.cookiefirst.com'],
    marcatori: ['data-cookiefirst'] },
  { id: 'axeptio', nome: 'Axeptio',
    impronte: ['static.axept.io'],
    marcatori: [] },
  { id: 'didomi', nome: 'Didomi',
    impronte: ['sdk.privacy-center.org', 'didomi'],
    marcatori: ['data-didomi'] },
  { id: 'klaro', nome: 'Klaro',
    impronte: ['klaro.js', 'kiprotect'],
    marcatori: ['data-name=', 'type="text/plain"'] },
  { id: 'cookienotice', nome: 'Cookie Notice',
    impronte: ['cookie-notice'],
    marcatori: [] },
  { id: 'gdprcookie', nome: 'GDPR Cookie Consent',
    impronte: ['cookie-law-info'],
    marcatori: ['data-cli-class'] },
];

// Marcatori generici: script messi in pausa in attesa del consenso, in un
// modo riconoscibile anche senza sapere quale piattaforma li ha marcati.
const MARCATORI_GENERICI = [
  'type="text/plain"', "type='text/plain'",
  'data-cookieconsent', 'data-cookiecategory', 'data-cookie-consent',
  'data-consent', 'data-categories', 'data-cmp',
];



// Il tag che carica un servizio e' sospeso in attesa del consenso?
// Si guarda il tag intorno all'impronta: se porta un marcatore, il sito
// dichiara di bloccarlo, e spesso dice anche in quale categoria.
//
// Questo e' il dato piu' utile che si ricava dal server sul banner: non il
// testo che l'utente legge — quello lo scrive JavaScript e da qui non si
// vede — ma QUALI SERVIZI IL SITO DICHIARA DI SOTTOPORRE AL PERMESSO.
function statoDelTag(corpo, impronta) {
  const i = corpo.toLowerCase().indexOf(impronta.toLowerCase());
  if (i === -1) return { marcato: false, categoria: null };

  // il tag di apertura che contiene l'impronta
  const da = corpo.lastIndexOf('<', i);
  const a = corpo.indexOf('>', i);
  if (da === -1 || a === -1) return { marcato: false, categoria: null };
  const tag = corpo.slice(da, a + 1);

  const marcato = /type\s*=\s*["']text\/plain["']/i.test(tag) ||
    /data-(cookieconsent|cookiecategory|cookie-consent|consent|categories|cmp|cookieyes|usercentrics|borlabs-cookie|cookiescript|cookiefirst|didomi|osano)\b/i.test(tag) ||
    /class\s*=\s*["'][^"']*(_iub_cs_activate|optanon-category|cmplz-)/i.test(tag);

  // la categoria dichiarata, quando c'e'
  let categoria = null;
  const m = tag.match(/data-(?:cookieconsent|cookiecategory|cookie-consent|categories|category)\s*=\s*["']([^"']+)["']/i);
  if (m) categoria = m[1].trim();

  return { marcato, categoria };
}

/* =========================================================================
   IL PUNTEGGIO
   Cento punti che misurano UNA COSA SOLA: quanto e' pulito il sito dal
   punto di vista di chi lo visita. Non e' un voto di conformita' — quella
   dipende da cento cose che uno strumento non vede — ed e' per questo che
   nel rapporto si chiama "igiene del sito" e non "conformita'".

   La regola e' esplicita apposta: chi legge deve poter rifare il conto.

     70  la situazione di partenza (i cinque esiti)
     20  i servizi dichiarati nell'informativa
     10  l'informativa esiste e si raggiunge

   Un sito senza tracciatori e con l'informativa a posto fa 100. Non perche'
   sia "a norma": perche' non c'e' niente da sistemare in quello che si vede.
   ========================================================================= */

const PUNTI_STATO = {
  'non-si-vede': 35,            // non e' un merito: non si e' potuto guardare
  'niente-da-chiedere': 70,     // niente da chiedere, niente da sbagliare
  'probabilmente-a-posto': 62,  // fatto bene, ma il blocco va provato davvero
  'banner-inutile': 48,         // niente di grave: un fastidio inutile
  'nessun-consenso': 18,        // i tracciatori partono e nessuno chiede
  'banner-decorativo': 12,      // peggio: sembra risolto e non lo e'
};

function calcolaPunteggio(stato, trovati, policy, policyLetta) {
  let p = PUNTI_STATO[stato] != null ? PUNTI_STATO[stato] : 30;

  // --- i servizi dichiarati (20) ---
  if (!policyLetta) {
    p += 0;                     // senza informativa non si puo' verificare
  } else if (!trovati.length) {
    p += 20;                    // niente da dichiarare: pieno
  } else {
    const quanti = policy.nonDichiarati.length;
    const quota = 1 - (quanti / trovati.length);
    p += Math.round(20 * Math.max(0, quota));
  }

  // --- l'informativa c'e' e si raggiunge (10) ---
  if (policyLetta) p += 10;

  return Math.max(0, Math.min(100, p));
}



/* =========================================================================
   COSA FA QUEL DOMINIO
   I 45 servizi sopra sono riconosciuti per nome e finiscono nella tabella
   del confronto. Ma restavano decine di domini elencati e basta, con
   scritto "non so cosa siano": un elenco che a chi ha il sito non serve,
   perche' non e' il suo mestiere andarseli a cercare.

   Qui non serve il nome commerciale esatto: basta dire A COSA SERVE, in
   una parola che si capisce. "Rete di distribuzione contenuti" e' gia'
   abbastanza per sapere se preoccuparsi o no.

   L'ordine conta: si prende la prima voce che corrisponde, quindi le
   regole piu' specifiche vanno prima di quelle generiche.
   ========================================================================= */

const COSA_FA = [
  // --- pubblicita' e aste: sono i piu' delicati ---
  [/doubleclick|googlesyndication|googleadservices|googletagservices|adservice\.google/i,
   'pubblicità di Google', 'pubblicita'],
  [/amazon-adsystem|adsystem/i, 'pubblicità di Amazon', 'pubblicita'],
  [/criteo|taboola|outbrain|adform|adnxs|appnexus|rubiconproject|pubmatic|openx|smartadserver|teads|sharethrough|indexww|casalemedia|33across|yieldmo|triplelift|gumgum|sovrn/i,
   'asta pubblicitaria in tempo reale', 'pubblicita'],
  [/adroll|perfectaudience|bing\.com\/bat|bat\.bing/i, 'pubblicità e retargeting', 'pubblicita'],
  [/prebid|amp4ads|adsafeprotected|moatads|doubleverify/i,
   'controllo e misura della pubblicità', 'pubblicita'],

  // --- domini tecnici di gruppi editoriali e piattaforme italiane -------
  // Non sono terze parti sconosciute: sono la CDN del sito stesso, con un
  // nome diverso. Elencarli come "non li conosco" faceva sembrare pieno di
  // misteri un sito che semplicemente serve le immagini da un altro dominio.
  [/repstatic|gelestatic|kataweb|gedidigital|repubblica\.it|lastampa|huffingtonpost\.it/i,
   'dominio tecnico del gruppo editoriale (immagini, script, login)', 'tecnico'],
  [/rcsobjects|rcsmetrics|corriere|gazzetta\.it|iodonna|corriereobjects/i,
   'dominio tecnico del gruppo editoriale', 'tecnico'],
  [/mediaset|mediasetplay|msdn-static|videonews/i,
   'dominio tecnico del gruppo editoriale', 'tecnico'],
  [/staticsky|sky\.it|skytg24/i, 'dominio tecnico del gruppo editoriale', 'tecnico'],
  [/rai\.it|raiplay|rainews/i, 'dominio tecnico del gruppo editoriale', 'tecnico'],
  [/imrworldwide|nielsen/i, 'misura del pubblico (Nielsen)', 'misura'],
  [/geniusmedia|4strokemedia|websystem\.it|shinystat/i,
   'servizio pubblicitario o di statistiche', 'pubblicita'],

  // --- misurazione e comportamento ---
  [/segment\.com|segment\.io/i, 'raccolta e smistamento dei dati di navigazione', 'misura'],
  [/tiqcdn|tealium/i, 'gestore di tag: carica altri strumenti a sua volta', 'misura'],
  [/optimizely|vwo\.com|abtasty|kameleoon|convertexperiments/i,
   'test A/B: mostra versioni diverse della pagina', 'misura'],
  [/mixpanel|amplitude|heap(analytics)?|kissmetrics|posthog/i,
   'analisi del comportamento degli utenti', 'misura'],
  [/newrelic|nr-data|sentry|bugsnag|datadoghq|rollbar|raygun/i,
   'controllo degli errori e delle prestazioni', 'tecnico'],
  [/hotjar|mouseflow|smartlook|fullstory|contentsquare|glassbox|inspectlet|luckyorange/i,
   'registra la sessione: vede dove clicchi e come scorri', 'sessione'],
  [/quantserve|quantcast|comscore|scorecardresearch|nielsen/i,
   'misura del pubblico per il mercato pubblicitario', 'misura'],
  [/chartbeat|parsely|parse\.ly/i, 'statistiche per editori', 'misura'],

  // --- social ---
  [/facebook\.(net|com)|fbcdn/i, 'Facebook', 'social'],
  [/twitter|twimg|x\.com/i, 'X (Twitter)', 'social'],
  [/linkedin|licdn/i, 'LinkedIn', 'social'],
  [/tiktok|tiktokcdn/i, 'TikTok', 'social'],
  [/pinterest|pinimg/i, 'Pinterest', 'social'],
  [/instagram|cdninstagram/i, 'Instagram', 'social'],
  [/youtube|ytimg|googlevideo/i, 'YouTube', 'video'],
  [/vimeo|vimeocdn/i, 'Vimeo', 'video'],

  // --- consenso ---
  [/consensu\.org|cookielaw|cookiebot|iubenda|onetrust|usercentrics|didomi|privacy-center|axept|cookieyes|termly|osano|cookie-script|cookiefirst/i,
   'gestione del consenso ai cookie', 'consenso'],

  // --- chat, moduli, posta ---
  [/intercom|tawk|crisp\.chat|zendesk|zdassets|freshchat|drift\.com|hubspot|hs-scripts|hsforms/i,
   'chat o modulo di contatto', 'contatto'],
  [/mailchimp|list-manage|klaviyo|sendinblue|brevo|activecampaign|mailerlite/i,
   'newsletter e invio email', 'contatto'],
  [/calendly|youcanbook|acuityscheduling|cal\.com/i, 'prenotazione appuntamenti', 'contatto'],

  // --- pagamenti ---
  [/stripe|paypal|braintree|checkout\.com|adyen|klarna|satispay|nexi|sumup/i,
   'pagamenti', 'tecnico'],

  // --- verifiche e sicurezza ---
  [/recaptcha|gstatic\.com\/recaptcha|hcaptcha|challenges\.cloudflare|turnstile/i,
   'verifica anti-robot', 'tecnico'],

  // --- mappe ---
  [/maps\.google|maps\.gstatic|mapbox|openstreetmap|here\.com|tomtom/i,
   'mappe', 'incorporato'],

  // --- font e icone ---
  [/fonts\.(googleapis|gstatic)/i, 'font di Google', 'incorporato'],
  [/use\.typekit|use\.fontawesome|fontawesome|fonts\.net|typography\.com/i,
   'font e icone', 'incorporato'],

  // --- recensioni, prenotazioni, marketplace ---
  [/trustpilot|feedaty|ekomi|yotpo|judge\.me|reviews\.io/i, 'recensioni', 'incorporato'],
  [/booking\.com|tripadvisor|thefork|expedia/i, 'prenotazioni e recensioni', 'incorporato'],

  // --- reti di distribuzione: le piu' innocue, e le piu' frequenti ---
  [/cdnjs|jsdelivr|unpkg|cdn\.jsdelivr|bootstrapcdn|ajax\.googleapis|code\.jquery|polyfill/i,
   'libreria di codice servita da una rete di distribuzione', 'tecnico'],
  [/cloudfront|akamai|fastly|cloudflare(insights)?|azureedge|stackpath|bunny(cdn)?|imgix|cloudinary/i,
   'rete di distribuzione contenuti', 'tecnico'],
  [/wp\.com|wordpress\.com|gravatar|w\.org/i, 'servizi di WordPress', 'tecnico'],
  [/shopify|shopifycdn|myshopify/i, 'servizi di Shopify', 'tecnico'],
  [/wix(static)?|parastorage/i, 'servizi di Wix', 'tecnico'],
  [/squarespace|sqspcdn/i, 'servizi di Squarespace', 'tecnico'],

  // --- google, quello che resta ---
  [/google\.com|google\.it|gstatic|googleapis|googletagmanager|google-analytics/i,
   'servizio di Google', 'misura'],
  [/microsoft|msecnd|azure|clarity\.ms|bing/i, 'servizio Microsoft', 'misura'],
];

// I generi che meritano attenzione nell'informativa, dal piu' delicato.
const PESO_GENERE = {
  pubblicita: 'Serve quasi sempre il consenso, ed è il tipo di servizio su cui si concentrano i controlli.',
  sessione: 'Registra il comportamento del visitatore: serve il consenso.',
  misura: 'Di solito serve il consenso, salvo misurazioni anonime e senza cookie.',
  social: 'Se è un riquadro incorporato serve il consenso; se è solo un collegamento, no.',
  video: 'Serve il consenso, a meno che non sia la versione senza cookie.',
  consenso: 'È il sistema che chiede il permesso: non ne ha bisogno lui stesso.',
  contatto: 'Tratta i dati di chi ti scrive: va nominato nell\'informativa.',
  incorporato: 'Riceve l\'indirizzo IP del visitatore: va nominato nell\'informativa.',
  tecnico: 'Di solito è tecnico e non richiede consenso, ma riceve comunque l\'indirizzo IP.',
};


// Un dominio che somiglia al nome del sito e' quasi sempre il sito stesso
// con un altro cappello: la CDN delle immagini, il sottodominio del login,
// il dominio tecnico del gruppo. Non e' una terza parte da indagare.
//
// Questa e' una REGOLA, non un elenco: funziona anche sui gruppi che non
// conosco, ed e' l'unico modo per non dover inseguire il mondo a mano.
function pareIlSitoStesso(dominio, base) {
  let nome;
  try {
    nome = new URL(base).hostname.replace(/^www\./, '').split('.')[0];
  } catch { return false; }
  if (!nome || nome.length < 4) return false;

  const d = dominio.toLowerCase();
  if (d.includes(nome)) return true;

  // "repubblica" -> "repstatic": la radice breve compare nel dominio
  const radice = nome.slice(0, Math.max(4, Math.ceil(nome.length / 2)));
  if (radice.length >= 4 && d.includes(radice)) return true;

  return false;
}

export function riconosciDominio(dominio) {
  for (const [regola, cosa, genere] of COSA_FA) {
    if (regola.test(dominio)) {
      return { cosa, genere, nota: PESO_GENERE[genere] || null };
    }
  }
  return null;
}

/* =========================================================================
   TUTTI I DOMINI ESTERNI
   Il difetto peggiore della prima versione: se non riconoscevo un servizio,
   facevo finta che non esistesse. Cosi' un sito che contatta trenta domini
   di terze parti risultava "pulito" perche' nessuno era nel mio elenco.

   Adesso i domini si elencano TUTTI. Quelli riconosciuti hanno un nome,
   gli altri restano un indirizzo — ed e' comunque un dato: chi legge vede
   quante terze parti tocca la sua pagina.
   ========================================================================= */

// Da dove si carica davvero qualcosa: script, fogli di stile, riquadri,
// immagini, precaricamenti. Un collegamento <a> NO: portare a un sito non
// vuol dire caricarne il codice.
const RE_RISORSE = /<(script|link|iframe|img|source|embed|object|video|audio)\b([^>]*)>/gi;
const RE_URL_IN_TAG = /\b(?:src|href|data-src|data-href)\s*=\s*["']([^"']+)["']/i;

function dominiEsterni(corpo, base) {
  let mio = null;
  try { mio = new URL(base).hostname.replace(/^www\./, ''); } catch { /* pazienza */ }

  const conta = {};
  let m, letti = 0;
  while ((m = RE_RISORSE.exec(corpo)) && letti < 1200) {
    letti++;
    const attributi = m[2] || '';
    // i fogli di stile contano solo se sono davvero fogli di stile
    if (m[1].toLowerCase() === 'link' &&
        !/rel\s*=\s*["'](?:stylesheet|preload|preconnect|dns-prefetch)/i.test(attributi)) continue;

    const u = (attributi.match(RE_URL_IN_TAG) || [, ''])[1];
    if (!u || u.startsWith('data:') || u.startsWith('#')) continue;

    let host;
    try { host = new URL(u, base).hostname.replace(/^www\./, ''); } catch { continue; }
    if (!host || host === mio) continue;
    // i sottodomini del sito stesso non sono terze parti
    if (mio && host.endsWith('.' + mio)) continue;

    conta[host] = (conta[host] || 0) + 1;
  }
  return conta;
}

/* =========================================================================
   QUANTO SI PUO' VEDERE DA QUI
   Su molti siti moderni la pagina consegnata dal server e' un guscio vuoto:
   il contenuto e i tracciatori li mette JavaScript dopo. In quel caso
   trovare "niente" NON vuol dire che non ci sia niente, e dirlo sarebbe
   peggio che tacere — sarebbe rassicurare a torto.
   ========================================================================= */

function quantoSiVede(html, corpo, domini) {
  // il testo visibile, tolti script e stili
  const testo = corpo
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const quantiScript = (corpo.match(/<script\b/gi) || []).length;
  const pesoScript = (corpo.match(/<script[\s\S]*?<\/script>/gi) || [])
    .join('').length;

  // i segni di un'applicazione che si disegna da sola nel browser
  const impalcatura =
    /<div[^>]+id\s*=\s*["'](root|app|__next|__nuxt|gatsby)["']/i.test(corpo) ||
    /window\.__(NUXT|NEXT|INITIAL_STATE)__/i.test(corpo) ||
    /<script[^>]+src=[^>]*\/(_next|_nuxt|static\/js\/main)\//i.test(corpo);

  const testoScarso = testo.length < 900;

  if (impalcatura && testoScarso) {
    return {
      livello: 'poco',
      perche: 'Questa pagina viene costruita nel browser: il server consegna ' +
        'un guscio quasi vuoto e il contenuto — tracciatori compresi — lo ' +
        'aggiunge JavaScript dopo. Quello che si legge da qui è una parte ' +
        'piccola di quello che il visitatore riceve davvero.',
    };
  }
  if (testoScarso && quantiScript > 6) {
    return {
      livello: 'parziale',
      perche: 'La pagina consegnata dal server contiene poco testo e molti ' +
        'script. È probabile che una parte di quello che carica venga decisa ' +
        'nel browser, e da qui non si veda.',
    };
  }
  if (Object.keys(domini).length > 12) {
    return {
      livello: 'parziale',
      perche: 'La pagina contatta molti domini di terze parti. Alcuni ne ' +
        'caricano altri a loro volta, e quella seconda ondata da qui non si vede.',
    };
  }
  return {
    livello: 'buono',
    perche: 'La pagina consegnata dal server contiene il suo contenuto: ' +
      'quello che si legge da qui è una fotografia attendibile di cosa carica.',
  };
}

/* =========================================================================
   ANALISI
   ========================================================================= */

/**
 * @param {string} html    sorgente della pagina, come arriva dal server
 * @param {string} url     indirizzo, per i messaggi
 * @param {string} policy  testo della privacy/cookie policy, se gia' letta
 */
export function analizzaCookie(html, url, policy) {
  const corpo = html.replace(RE_COMMENTO, ' ');
  const minuscolo = corpo.toLowerCase();

  /* --- 1. chi c'e' dentro --------------------------------------------- */
  const trovati = [];
  for (const s of SERVIZI) {
    for (const impronta of s.impronte) {
      if (minuscolo.includes(impronta.toLowerCase())) {
        const tag = statoDelTag(corpo, impronta);
        trovati.push({ id: s.id, nome: s.nome, genere: s.genere, ue: s.ue,
                       impronta,
                       sospeso: tag.marcato,
                       categoria: tag.categoria,
                       chiedeConsenso: CHIEDONO_CONSENSO.includes(s.genere) });
        break;
      }
    }
  }

  // YouTube senza cookie e YouTube normale si escludono: se c'e' la versione
  // buona, quella normale non va segnalata due volte.
  const soloNoCookie = trovati.some(t => t.id === 'youtube-nc');

  const daConsenso = trovati.filter(t =>
    CHIEDONO_CONSENSO.includes(t.genere) &&
    !(t.id === 'youtube' && soloNoCookie));

  /* --- 1bis. tutti i domini esterni, riconosciuti o no ------------------ */
  const domini = dominiEsterni(corpo, url);
  const noti = new Set();
  for (const t of trovati) {
    for (const d of Object.keys(domini)) {
      if (t.impronta.includes(d) || d.includes(t.impronta.split('/')[0])) noti.add(d);
    }
  }
  const sconosciuti = Object.keys(domini)
    .filter(d => !noti.has(d))
    .sort((a, b) => domini[b] - domini[a])
    .map(d => {
      const r = riconosciDominio(d);
      if (r) {
        return { dominio: d, volte: domini[d], cosa: r.cosa,
                 genere: r.genere, nota: r.nota };
      }
      if (pareIlSitoStesso(d, url)) {
        return { dominio: d, volte: domini[d],
                 cosa: 'dominio tecnico dello stesso sito o del suo gruppo',
                 genere: 'tecnico', nota: PESO_GENERE.tecnico };
      }
      return { dominio: d, volte: domini[d], cosa: null, genere: null, nota: null };
    });

  const visibilita = quantoSiVede(html, corpo, domini);

  /* --- 2. chi chiede il permesso --------------------------------------- */
  const piattaforme = [];
  for (const p of PIATTAFORME) {
    for (const impronta of p.impronte) {
      if (minuscolo.includes(impronta.toLowerCase())) {
        piattaforme.push({ id: p.id, nome: p.nome, marcatori: p.marcatori });
        break;
      }
    }
  }

  /* --- 3. il rapporto fra i due ---------------------------------------- */
  // Gli script messi in pausa si riconoscono: non vengono eseguiti finche'
  // la piattaforma non li riattiva. Ogni piattaforma usa il suo marcatore.
  const attesi = piattaforme.flatMap(p => p.marcatori).concat(MARCATORI_GENERICI);
  const bloccati = attesi.some(m => minuscolo.includes(m.toLowerCase()));

  let stato, spiegazione;
  if (visibilita.livello === 'poco' && !daConsenso.length) {
    // NON si dice "pulito" quando semplicemente non si e' visto abbastanza.
    // E' il difetto piu' grave che uno strumento del genere possa avere:
    // rassicurare chi ha un problema.
    stato = 'non-si-vede';
    spiegazione = visibilita.perche + ' Non trovare tracciatori qui NON vuol ' +
      'dire che non ce ne siano: vuol dire che da questa parte non si vedono.';
  } else if (!daConsenso.length && !piattaforme.length) {
    stato = 'niente-da-chiedere';
    spiegazione = 'Nessun servizio che richieda consenso, e nessuna piattaforma ' +
      'di consenso. È la situazione più semplice: non serve nessun banner, ' +
      'perché non c\'è nulla per cui chiederlo.';
  } else if (!daConsenso.length && piattaforme.length) {
    stato = 'banner-inutile';
    spiegazione = 'C\'è una piattaforma di consenso ma nessun servizio che la ' +
      'richieda. Il banner chiede il permesso per qualcosa che non c\'è: ' +
      'rallenta il sito e infastidisce chi arriva, senza servire a niente.';
  } else if (daConsenso.length && !piattaforme.length) {
    stato = 'nessun-consenso';
    spiegazione = 'Ci sono servizi che richiedono il consenso preventivo, e ' +
      'non c\'è nessuna piattaforma che lo raccolga. Partono al primo ' +
      'caricamento, prima che il visitatore possa dire qualcosa.';
  } else if (bloccati) {
    stato = 'probabilmente-a-posto';
    spiegazione = 'C\'è una piattaforma di consenso e gli script dei servizi ' +
      'risultano configurati per aspettare il permesso prima di partire. È il ' +
      'comportamento corretto. Se il blocco funzioni davvero, però, si vede ' +
      'solo caricando la pagina in un browser.';
  } else {
    stato = 'banner-decorativo';
    spiegazione = 'C\'è una piattaforma di consenso, ma gli script dei servizi ' +
      'NON aspettano il permesso: sembrano partire al primo caricamento. ' +
      'Un banner che non blocca niente non serve a niente — e chi ha il sito ' +
      'di solito crede che il problema sia risolto proprio perché il banner c\'è.';
  }

  /* --- 4. la policy nomina quello che c'e'? ---------------------------- */
  let dichiarati = null, nonDichiarati = null;
  if (policy) {
    const p = policy.toLowerCase();
    dichiarati = [];
    nonDichiarati = [];
    for (const t of trovati) {
      // si cerca il nome del servizio e la sua parola più caratteristica
      const chiavi = [t.nome.toLowerCase()]
        .concat(t.nome.toLowerCase().split(/[\s(),/]+/).filter(x => x.length > 4));
      t.dichiarato = chiavi.some(k => p.includes(k));
      (t.dichiarato ? dichiarati : nonDichiarati).push(t.nome);
    }
  } else {
    for (const t of trovati) t.dichiarato = null;
  }

  const esitoPolicy = policy ? {
    dichiarati,
    nonDichiarati,
    citaTrasferimento: null,   // riempito sotto
  } : null;

  /* --- 5. fuori dall'unione europea ------------------------------------ */
  const extraUE = trovati.filter(t => !t.ue).map(t => t.nome);
  if (esitoPolicy) {
    esitoPolicy.citaTrasferimento =
      /extra[- ]?ue|fuori dall|paesi terzi|stati uniti|united states|clausole contrattuali|standard contractual/i.test(policy);
  }

  const punteggio = calcolaPunteggio(stato, trovati, esitoPolicy, policy != null);

  return {
    url,
    punteggio,
    domini,
    sconosciuti,
    quantiDomini: Object.keys(domini).length,
    visibilita,
    trovati,
    daConsenso: daConsenso.map(t => t.nome),
    piattaforme: piattaforme.map(p => p.nome),
    stato,
    spiegazione,
    scriptSospesi: bloccati,
    policy: esitoPolicy,
    extraUE,

    // Quello che qui non si puo' misurare, e perche'. Si accende con
    // l'estensione: stessi id, stessa struttura, campo esito riempito.
    fuoriPortata: [
      { id: 'cookieScritti', nome: 'I cookie effettivamente scritti',
        esito: null, fonte: 'browser',
        perche: 'I cookie nascono quando gli script girano nel browser. ' +
          'Nell\'HTML consegnato dal server non esistono ancora.' },
      { id: 'primaDelConsenso', nome: 'Se partono prima del consenso',
        esito: null, fonte: 'browser',
        perche: 'È la domanda che conta di più, e per rispondere bisogna ' +
          'caricare la pagina due volte: prima senza toccare niente, poi ' +
          'dopo aver accettato. La differenza è la prova.' },
      { id: 'chiamateDiRete', nome: 'Quali richieste partono davvero',
        esito: null, fonte: 'browser',
        perche: 'Un cookie può anche non essere scritto, ma se la richiesta ' +
          'al servizio parte lo stesso, l\'indirizzo IP è già arrivato.' },
      { id: 'archivioLocale', nome: 'Archiviazione locale del browser',
        esito: null, fonte: 'browser',
        perche: 'Molti tracciatori usano localStorage al posto dei cookie, ' +
          'proprio perché gli strumenti guardano solo i cookie.' },
      { id: 'bannerFunziona', nome: 'Se il banner funziona davvero',
        esito: null, fonte: 'browser',
        perche: 'Se "rifiuta tutto" rifiuta davvero, se la scelta viene ' +
          'ricordata, se si può cambiare idea: si verifica solo usandolo.' },
    ],
  };
}

// Elenco dei servizi riconosciuti, per la pagina: dire cosa si cerca e'
// piu' onesto che dare un numero.
export function serviziRiconosciuti() {
  return SERVIZI.map(s => ({ nome: s.nome, genere: s.genere }));
}

export function piattaformeRiconosciute() {
  return PIATTAFORME.map(p => p.nome);
}
