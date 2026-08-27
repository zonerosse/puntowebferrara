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
        trovati.push({ id: s.id, nome: s.nome, genere: s.genere, ue: s.ue,
                       impronta });
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
  if (!daConsenso.length && !piattaforme.length) {
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
      'risultano marcati come sospesi in attesa del permesso. È il ' +
      'comportamento corretto. Se il blocco funzioni davvero, però, si vede ' +
      'solo caricando la pagina in un browser.';
  } else {
    stato = 'banner-decorativo';
    spiegazione = 'C\'è una piattaforma di consenso, ma gli script dei servizi ' +
      'NON risultano marcati come sospesi: sembrano caricarsi normalmente. ' +
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
      (chiavi.some(k => p.includes(k)) ? dichiarati : nonDichiarati).push(t.nome);
    }
  }

  /* --- 5. fuori dall'unione europea ------------------------------------ */
  const extraUE = trovati.filter(t => !t.ue).map(t => t.nome);
  const policyCitaTrasferimento = policy
    ? /extra[- ]?ue|fuori dall|paesi terzi|stati uniti|united states|clausole contrattuali|standard contractual/i.test(policy)
    : null;

  return {
    url,
    trovati,
    daConsenso: daConsenso.map(t => t.nome),
    piattaforme: piattaforme.map(p => p.nome),
    stato,
    spiegazione,
    scriptSospesi: bloccati,
    policy: policy ? {
      dichiarati,
      nonDichiarati,
      citaTrasferimento: policyCitaTrasferimento,
    } : null,
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
