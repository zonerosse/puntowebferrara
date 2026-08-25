// _accessibilita.js — 36 controlli WCAG 2.1 AA su una singola pagina.
//
// Stessa forma di _analisi.js: nessuna dipendenza, espressioni regolari
// volutamente semplici, perché il piano gratuito di Cloudflare concede 10
// millisecondi di CPU per invocazione. Niente ricorsione, niente quantificatori
// annidati, tetti espliciti su ogni ciclo.
//
// QUELLO CHE QUI NON SI PUÒ FARE. Tre controlli WCAG richiedono i colori
// calcolati dal browser — contrasto del testo, indicatore di focus, testo su
// immagine di sfondo. Nell'HTML grezzo quei valori non esistono: dipendono dal
// CSS applicato, dall'ereditarietà e dalla cascata. Non è una mancanza di
// questo file, è una impossibilità del terreno. Restano all'estensione, dove
// il browser c'è.
//
// COME SI LEGGE IL RISULTATO. Ogni controllo restituisce una quota da 0 a 1,
// non un superato/fallito: sette immagini senza alt su quarantadue valgono
// 0,83, non zero. È lo stesso modello di esiti[] che usa già verifica.js.

const RE_TAG_APERTO = /<([a-z][a-z0-9]*)\b([^>]*)>/gi;
const RE_COMMENTO = /<!--[\s\S]*?-->/g;
const RE_SCRIPT = /<script[\s\S]*?<\/script>/gi;
const RE_STYLE = /<style[\s\S]*?<\/style>/gi;

// Tetto sugli elementi esaminati per controllo: una pagina con ottomila nodi
// non deve far scadere l'invocazione. Oltre il tetto si campiona.
const TETTO = 600;
const MAX_ESEMPI = 5;

// Le espressioni regolari per gli attributi si compilano una volta sola e si
// riusano. Compilarle a ogni lettura sembrava innocuo, ma su una pagina con
// seicento campi significa migliaia di compilazioni e il budget CPU se ne va
// tutto li'.
const CACHE_VALORE = Object.create(null);
const CACHE_PRESENZA = Object.create(null);

function reValore(nome) {
  return CACHE_VALORE[nome] ||
    (CACHE_VALORE[nome] = new RegExp('\\b' + nome + '\\s*=\\s*["\']([^"\']*)["\']', 'i'));
}
function rePresenza(nome) {
  return CACHE_PRESENZA[nome] ||
    (CACHE_PRESENZA[nome] = new RegExp('\\b' + nome + '\\b(?![\\w-])', 'i'));
}

function attr(tag, nome) {
  const m = tag.match(reValore(nome));
  if (m) return m[1].trim();
  // attributo senza valore, per esempio <img alt> oppure <video autoplay>
  return rePresenza(nome).test(tag) ? '' : null;
}

function haAttr(tag, nome) {
  return rePresenza(nome).test(tag);
}

function testoPulito(s) {
  return (s || '')
    .replace(RE_TAG_APERTO, ' ')
    .replace(/<\/[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

// Raccoglie tutti i tag di apertura di un elemento, con il loro contenuto
// grezzo fino al tag di chiusura corrispondente più vicino. Non gestisce
// l'annidamento dello stesso tag: per <a>, <button>, <label> va bene, perché
// annidarli è già di per sé un errore.
function elementi(html, nome, tetto) {
  const re = new RegExp('<' + nome + '\\b([^>]*)>([\\s\\S]*?)<\\/' + nome + '>', 'gi');
  const fuori = [];
  let m, n = 0;
  while ((m = re.exec(html)) && n < (tetto || TETTO)) {
    fuori.push({ attributi: m[1] || '', dentro: m[2] || '', intero: m[0] });
    n++;
  }
  return fuori;
}

// Tag che si chiudono da soli: basta il tag di apertura.
function vuoti(html, nome, tetto) {
  const re = new RegExp('<' + nome + '\\b([^>]*)>', 'gi');
  const fuori = [];
  let m, n = 0;
  while ((m = re.exec(html)) && n < (tetto || TETTO)) {
    fuori.push({ attributi: m[1] || '', intero: m[0] });
    n++;
  }
  return fuori;
}

// "1 salti di livello" fa capire che il testo e' generato da una macchina.
// Il cliente legge questi messaggi: valgono la riga in piu'.
function frase(n, singolare, plurale) {
  return n + ' ' + (n === 1 ? singolare : plurale);
}

function frammento(s, max) {
  const t = (s || '').replace(/\s+/g, ' ').trim();
  return t.length > (max || 90) ? t.slice(0, (max || 90) - 1) + '…' : t;
}

const TESTI_LINK_GENERICI = [
  'clicca qui', 'clicca', 'qui', 'leggi', 'leggi di piu', 'leggi di più',
  'leggi tutto', 'continua', 'continua a leggere', 'scopri di piu',
  'scopri di più', 'scopri', 'vai', 'vedi', 'vedi altro', 'altro',
  'maggiori informazioni', 'info', 'link', 'apri', 'download', 'scarica',
  'click here', 'read more', 'more', 'learn more', 'here', 'this page',
];

const ALT_SOSPETTI = [
  'immagine', 'foto', 'image', 'photo', 'picture', 'img', 'icona', 'icon',
  'grafica', 'banner', 'spacer', 'placeholder', 'untitled', 'senza titolo',
  'screenshot',
];

const RUOLI_ARIA = ('alert alertdialog application article banner blockquote button caption cell ' +
  'checkbox code columnheader combobox complementary contentinfo definition deletion dialog ' +
  'directory document emphasis feed figure form generic grid gridcell group heading img insertion ' +
  'link list listbox listitem log main marquee math menu menubar menuitem menuitemcheckbox ' +
  'menuitemradio meter navigation none note option paragraph presentation progressbar radio ' +
  'radiogroup region row rowgroup rowheader scrollbar search searchbox separator slider ' +
  'spinbutton status strong subscript superscript switch tab table tablist tabpanel term ' +
  'textbox time timer toolbar tooltip tree treegrid treeitem').split(' ');

const NOMI_PERSONALI = /(^|[-_])(nome|name|cognome|surname|email|mail|telefono|phone|tel|indirizzo|address|citta|city|cap|zip|postal)([-_]|$)/i;

/**
 * @param {string} html   sorgente della pagina, così come arriva dal fetch
 * @param {string} url    indirizzo, solo per i messaggi
 */
export function analizzaAccessibilita(html, url) {
  const problemi = [];
  const segnala = (gravita, messaggio) =>
    problemi.push({ categoria: 'Accessibilità', gravita, messaggio });

  // Il corpo senza script, stili e commenti: il markup che conta davvero.
  const corpo = html.replace(RE_SCRIPT, ' ').replace(RE_STYLE, ' ').replace(RE_COMMENTO, ' ');

  // Scansioni condivise: ogni rilettura dell'HTML costa CPU, e il piano
  // gratuito ne concede 10 millisecondi per invocazione. Si legge una volta
  // sola e si riusa. Prima di questa cache gli input venivano riletti sei
  // volte e gli id tre: su una pagina con seicento campi si sforava.
  const tuttiGliInput = vuoti(corpo, 'input', 400);
  const tuttiGliId = Object.create(null);
  const idDoppi = [];
  {
    const re = /\bid\s*=\s*["']([^"']+)["']/gi;
    let m, n = 0;
    while ((m = re.exec(corpo)) && n < 2000) {
      if (tuttiGliId[m[1]]) { if (idDoppi.indexOf(m[1]) === -1) idDoppi.push(m[1]); }
      else tuttiGliId[m[1]] = true;
      n++;
    }
  }
  const tipoInput = c => (attr(c.attributi, 'type') || 'text').toLowerCase();

  const esiti = {};
  // quota 1 = tutto a posto. n = quanti elementi sbagliati, tot = su quanti.
  const esito = (id, quota, n, tot, esempi) => {
    esiti[id] = { quota: Math.max(0, Math.min(1, quota)), n: n || 0, tot: tot || 0,
                  esempi: (esempi || []).slice(0, MAX_ESEMPI) };
  };
  // Scorciatoia per i controlli che sono davvero sì/no.
  const siNo = (id, ok, esempi) => esito(id, ok ? 1 : 0, ok ? 0 : 1, 1, esempi);
  // Scorciatoia proporzionale, con il caso "non applicabile" gestito come
  // pieno: una pagina senza tabelle non va punita per le tabelle.
  const quotaSu = (id, sbagliati, totale, esempi) => {
    if (!totale) { esiti[id] = { quota: null, n: 0, tot: 0, esempi: [] }; return; }
    esito(id, 1 - sbagliati / totale, sbagliati, totale, esempi);
  };

  /* ===== STRUTTURA ==================================================== */

  const tagHtml = (html.match(/<html\b[^>]*>/i) || [''])[0];
  const lang = attr(tagHtml, 'lang');
  const langOk = !!lang && /^[a-z]{2,3}(-[A-Za-z0-9]{2,8})*$/.test(lang);
  siNo('a11yLang', langOk, langOk ? [] : [lang ? 'lang="' + lang + '"' : 'attributo lang assente']);
  if (!langOk) segnala('alto', 'La pagina non dichiara la lingua: lo screen reader la legge con la pronuncia sbagliata');

  const titolo = testoPulito((html.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [, ''])[1]);
  siNo('a11yTitolo', !!titolo);
  if (!titolo) segnala('alto', 'Il titolo della pagina è assente o vuoto');

  // Tutte le intestazioni, in ordine di comparsa.
  const titoli = [];
  {
    const re = /<h([1-6])\b([^>]*)>([\s\S]*?)<\/h\1>/gi;
    let m, n = 0;
    while ((m = re.exec(corpo)) && n < TETTO) {
      titoli.push({ livello: +m[1], attributi: m[2] || '', testo: testoPulito(m[3]) });
      n++;
    }
  }

  const h1 = titoli.filter(t => t.livello === 1);
  siNo('a11yH1Presente', h1.length >= 1);
  if (!h1.length) segnala('alto', 'Manca l\'intestazione H1: chi naviga per titoli non sa di cosa parla la pagina');

  siNo('a11yH1Unico', h1.length <= 1, h1.slice(1).map(t => frammento(t.testo, 60)));
  if (h1.length > 1) segnala('basso', h1.length + ' intestazioni H1: l\'argomento principale diventa ambiguo');

  {
    const salti = [];
    let prec = 0;
    for (const t of titoli) {
      if (prec && t.livello > prec + 1) salti.push('da H' + prec + ' a H' + t.livello + ': "' + frammento(t.testo, 45) + '"');
      prec = t.livello;
    }
    quotaSu('a11yTitoliOrdinati', salti.length, titoli.length || 0, salti);
    if (salti.length) segnala('medio', frase(salti.length, 'salto di livello', 'salti di livello') + ' fra le intestazioni');
  }

  {
    const vuote = titoli.filter(t => !t.testo && !attr(t.attributi, 'aria-label'));
    quotaSu('a11yTitoliPieni', vuote.length, titoli.length, vuote.map(() => 'intestazione senza testo'));
    if (vuote.length) segnala('medio', frase(vuote.length, 'intestazione senza testo', 'intestazioni senza testo'));
  }

  const haMain = /<main\b/i.test(corpo) || /\brole\s*=\s*["']main["']/i.test(corpo);
  siNo('a11yMain', haMain);
  if (!haMain) segnala('medio', 'Manca la regione <main>: non si può saltare direttamente al contenuto');

  // id duplicati — dalla scansione condivisa fatta all'inizio
  siNo('a11yIdUnici', idDoppi.length === 0, idDoppi.map(i => 'id="' + i + '"'));
  if (idDoppi.length) segnala('medio', frase(idDoppi.length, 'identificatore id usato più volte: rompe', 'identificatori id usati più volte: rompono') + ' il legame fra etichette e campi');

  // link di salto: si guarda solo se esiste una navigazione
  {
    const haNav = /<nav\b/i.test(corpo) || /\brole\s*=\s*["']navigation["']/i.test(corpo);
    if (!haNav) esiti['a11ySalta'] = { quota: null, n: 0, tot: 0, esempi: [] };
    else {
      const primi = elementi(corpo, 'a', 6).slice(0, 5);
      const trovato = primi.some(a => {
        const h = attr(a.attributi, 'href') || '';
        return h.charAt(0) === '#' &&
          /salta|skip|vai al contenuto|contenuto principale|main content/i.test(testoPulito(a.dentro) + ' ' + (attr(a.attributi, 'aria-label') || ''));
      });
      siNo('a11ySalta', trovato);
      if (!trovato) segnala('basso', 'Manca il collegamento per saltare al contenuto: da tastiera si riattraversa il menu a ogni pagina');
    }
  }

  /* ===== TESTI ALTERNATIVI ============================================ */

  const immagini = vuoti(corpo, 'img', 1000);
  {
    const senza = immagini.filter(i =>
      attr(i.attributi, 'alt') === null &&
      !attr(i.attributi, 'aria-label') && !attr(i.attributi, 'aria-labelledby') &&
      !/\baria-hidden\s*=\s*["']true["']/i.test(i.attributi) &&
      !/\brole\s*=\s*["'](presentation|none)["']/i.test(i.attributi));
    quotaSu('a11yImgAlt', senza.length, immagini.length,
      senza.map(i => (attr(i.attributi, 'src') || '').split('/').pop()));
    if (senza.length) segnala('alto', frase(senza.length, 'immagine', 'immagini') + ' su ' + immagini.length + ' senza testo alternativo');
  }
  {
    const conAlt = immagini.filter(i => (attr(i.attributi, 'alt') || '').trim());
    const inutili = conAlt.filter(i => {
      const a = attr(i.attributi, 'alt').trim().toLowerCase();
      if (/\.(jpe?g|png|gif|webp|svg|avif)$/i.test(a)) return true;
      if (a.length < 4) return true;
      return ALT_SOSPETTI.indexOf(a) !== -1;
    });
    quotaSu('a11yAltUtile', inutili.length, conAlt.length,
      inutili.map(i => 'alt="' + attr(i.attributi, 'alt') + '"'));
    if (inutili.length) segnala('medio', frase(inutili.length, 'testo alternativo generico', 'testi alternativi generici') + ' o uguale al nome del file');
  }

  {
    const bottoniImg = tuttiGliInput.filter(i => tipoInput(i) === 'image');
    const senza = bottoniImg.filter(i => !(attr(i.attributi, 'alt') || attr(i.attributi, 'aria-label') || attr(i.attributi, 'title') || '').trim());
    quotaSu('a11yInputImmagine', senza.length, bottoniImg.length, senza.map(() => 'input type=image senza alt'));
    if (senza.length) segnala('alto', frase(senza.length, 'pulsante immagine senza alternativa testuale', 'pulsanti immagine senza alternativa testuale'));
  }

  {
    const aree = vuoti(corpo, 'area', 200).filter(a => haAttr(a.attributi, 'href'));
    const senza = aree.filter(a => !(attr(a.attributi, 'alt') || attr(a.attributi, 'aria-label') || '').trim());
    quotaSu('a11yAreaAlt', senza.length, aree.length, senza.map(() => 'area senza alt'));
    if (senza.length) segnala('medio', frase(senza.length, 'area della mappa immagine senza alternativa', 'aree della mappa immagine senza alternativa'));
  }

  {
    // Un'icona dentro un collegamento o un bottone che ha gia' il suo testo non
    // va nominata: il nome ce l'ha il contenitore, e ripeterlo farebbe
    // annunciare la voce due volte. Si raccolgono quelle icone e si escludono.
    const dentroTesto = Object.create(null);
    for (const nome of ['a', 'button']) {
      for (const c of elementi(corpo, nome, 400)) {
        if (!testoPulito(c.dentro)) continue;
        for (const t of (c.dentro.match(/<svg\b[^>]*>/gi) || [])) {
          dentroTesto[t.replace(/\s+/g, ' ')] = true;
        }
      }
    }

    const svg = elementi(corpo, 'svg', 300);
    const muti = svg.filter(s => {
      if (/\baria-hidden\s*=\s*["']true["']/i.test(s.attributi)) return false;
      if (attr(s.attributi, 'aria-label') || attr(s.attributi, 'aria-labelledby')) return false;
      if (/<title[^>]*>\s*\S/i.test(s.dentro)) return false;
      if (dentroTesto[('<svg' + s.attributi + '>').replace(/\s+/g, ' ')]) return false;
      return true;
    });
    quotaSu('a11ySvg', muti.length, svg.length, muti.map(() => 'svg senza title né aria-label'));
    if (muti.length) segnala('basso', frase(muti.length, 'elemento SVG senza nome accessibile', 'elementi SVG senza nome accessibile') + ' né marcatura decorativa');
  }

  {
    // I video muti restano fuori: i sottotitoli servono a rendere accessibile
    // l'audio, e un video di sfondo senza audio non ha niente da sottotitolare.
    const video = elementi(corpo, 'video', 60).filter(v => !haAttr(v.attributi, 'muted'));
    const senza = video.filter(v => !/<track\b[^>]*kind\s*=\s*["'](captions|subtitles)["']/i.test(v.dentro));
    quotaSu('a11ySottotitoli', senza.length, video.length, senza.map(() => 'video senza traccia di sottotitoli'));
    if (senza.length) segnala('alto', frase(senza.length, 'video senza sottotitoli', 'video senza sottotitoli'));
  }

  {
    const frame = vuoti(corpo, 'iframe', 100);
    const senza = frame.filter(f =>
      !(attr(f.attributi, 'title') || attr(f.attributi, 'aria-label') || '').trim() &&
      !/\baria-hidden\s*=\s*["']true["']/i.test(f.attributi));
    quotaSu('a11yIframeTitolo', senza.length, frame.length,
      senza.map(f => frammento(attr(f.attributi, 'src') || 'iframe in linea', 60)));
    if (senza.length) segnala('medio', frase(senza.length, 'iframe senza titolo', 'iframe senza titolo') + ': vengono annunciati solo come "frame"');
  }

  /* ===== MODULI ======================================================= */

  // id citati dalle label, per il legame etichetta/campo
  const idEtichettati = Object.create(null);
  const etichette = elementi(corpo, 'label', 400);
  for (const l of etichette) {
    const f = attr(l.attributi, 'for');
    if (f && testoPulito(l.dentro)) idEtichettati[f] = true;
  }
  // Campi avvolti dentro una label: <label>Nome <input></label>.
  // Due modi, perche' un input avvolto NON e' obbligato ad avere un id: si
  // raccolgono sia gli id trovati dentro le label, sia i tag interi. Senza il
  // secondo modo, <label>Nome <input name="n"></label> — che e' HTML corretto —
  // veniva segnalato come campo senza etichetta.
  const idAvvolti = Object.create(null);
  const tagAvvolti = Object.create(null);
  for (const l of etichette) {
    if (!testoPulito(l.dentro)) continue;   // label vuota: non etichetta niente
    const re = /\bid\s*=\s*["']([^"']+)["']/gi;
    let m;
    while ((m = re.exec(l.dentro))) idAvvolti[m[1]] = true;
    for (const t of (l.dentro.match(/<(?:input|select|textarea)\b[^>]*>/gi) || [])) {
      tagAvvolti[t.replace(/\s+/g, ' ')] = true;
    }
  }

  const campi = []
    .concat(tuttiGliInput.map(x => ({ ...x, tag: 'input' })))
    .concat(elementi(corpo, 'select', 200).map(x => ({ ...x, tag: 'select' })))
    .concat(elementi(corpo, 'textarea', 200).map(x => ({ ...x, tag: 'textarea' })));

  const campiVeri = campi.filter(c =>
    c.tag !== 'input' || ['hidden', 'submit', 'button', 'reset', 'image'].indexOf(tipoInput(c)) === -1);

  {
    const senza = campiVeri.filter(c => {
      if (attr(c.attributi, 'aria-label') || attr(c.attributi, 'aria-labelledby')) return false;
      if ((attr(c.attributi, 'title') || '').trim()) return false;
      const id = attr(c.attributi, 'id');
      if (id && (idEtichettati[id] || idAvvolti[id])) return false;
      // input avvolto in una label ma senza id
      const suo = (c.intero || ('<' + c.tag + c.attributi + '>')).replace(/\s+/g, ' ');
      if (tagAvvolti[suo]) return false;
      return true;
    });
    quotaSu('a11yCampiEtichettati', senza.length, campiVeri.length, senza.map(c => {
      const ph = attr(c.attributi, 'placeholder');
      return ph ? 'solo placeholder="' + frammento(ph, 30) + '"'
                : (c.tag + ' name="' + (attr(c.attributi, 'name') || '?') + '"');
    }));
    if (senza.length) segnala('alto', frase(senza.length, 'campo del modulo senza etichetta', 'campi del modulo senza etichetta') + ': lo screen reader annuncia solo "casella di testo"');
  }

  {
    // le label con for che non trova nessun id
    const conFor = etichette.filter(l => attr(l.attributi, 'for'));
    const orfane = conFor.filter(l => !tuttiGliId[attr(l.attributi, 'for')]);
    quotaSu('a11yLabelCollegate', orfane.length, conFor.length,
      orfane.map(l => 'for="' + attr(l.attributi, 'for') + '"'));
    if (orfane.length) segnala('medio', frase(orfane.length, 'etichetta punta a un campo che non esiste', 'etichette puntano a campi che non esistono'));
  }

  {
    // gruppi di radio/checkbox: servono fieldset+legend oppure role=group con nome
    const gruppi = Object.create(null);
    for (const c of tuttiGliInput) {
      const t = tipoInput(c);
      if (t !== 'radio' && t !== 'checkbox') continue;
      const n = attr(c.attributi, 'name');
      if (!n) continue;
      gruppi[n] = (gruppi[n] || 0) + 1;
    }
    const nomi = Object.keys(gruppi).filter(n => gruppi[n] > 1);
    const legende = (corpo.match(/<legend[^>]*>\s*\S/gi) || []).length +
                    (corpo.match(/<[^>]+role\s*=\s*["'](group|radiogroup)["'][^>]*aria-label/gi) || []).length;
    const scoperti = Math.max(0, nomi.length - legende);
    quotaSu('a11yGruppiEtichettati', scoperti, nomi.length, nomi.slice(0, MAX_ESEMPI).map(n => 'name="' + n + '"'));
    if (scoperti) segnala('medio', frase(scoperti, 'gruppo di scelte senza intestazione', 'gruppi di scelte senza intestazione') + ' di gruppo (fieldset/legend)');
  }

  {
    const daCompletare = tuttiGliInput.filter(c => {
      if (attr(c.attributi, 'autocomplete')) return false;
      const t = tipoInput(c);
      if (t === 'email' || t === 'tel') return true;
      if (t !== 'text') return false;
      return NOMI_PERSONALI.test((attr(c.attributi, 'name') || '') + ' ' + (attr(c.attributi, 'id') || ''));
    });
    const totCampiTesto = tuttiGliInput.filter(c =>
      ['hidden', 'submit', 'button', 'reset', 'image', 'checkbox', 'radio'].indexOf(tipoInput(c)) === -1).length;
    quotaSu('a11yAutocomplete', daCompletare.length, totCampiTesto,
      daCompletare.map(c => 'name="' + (attr(c.attributi, 'name') || '?') + '"'));
    if (daCompletare.length) segnala('basso', frase(daCompletare.length, 'campo personale senza autocomplete', 'campi personali senza autocomplete') + ': il browser non può compilarli da sé');
  }

  {
    const bottoni = elementi(corpo, 'button', 300);
    const inputBottoni = tuttiGliInput.filter(i =>
      ['submit', 'button', 'reset'].indexOf(tipoInput(i)) !== -1);
    const muti = bottoni.filter(b => {
      if (attr(b.attributi, 'aria-label') || attr(b.attributi, 'aria-labelledby')) return false;
      if (testoPulito(b.dentro)) return false;
      // bottone che contiene solo un'immagine o un'icona con il suo nome
      if (/<img[^>]+alt\s*=\s*["']\s*\S/i.test(b.dentro)) return false;
      if (/<svg[^>]*aria-label\s*=\s*["']\s*\S/i.test(b.dentro)) return false;
      if (/<title[^>]*>\s*\S/i.test(b.dentro)) return false;
      return true;
    }).concat(inputBottoni.filter(i =>
      !(attr(i.attributi, 'value') || attr(i.attributi, 'aria-label') || '').trim()));
    quotaSu('a11yBottoniNominati', muti.length, bottoni.length + inputBottoni.length,
      muti.map(() => 'pulsante senza testo né aria-label'));
    if (muti.length) segnala('alto', frase(muti.length, 'pulsante senza testo accessibile', 'pulsanti senza testo accessibile') + ': si sente "pulsante" e basta');
  }

  /* ===== COLLEGAMENTI ================================================= */

  const link = elementi(corpo, 'a', 800).filter(a => haAttr(a.attributi, 'href'));
  const nomeLink = a => (attr(a.attributi, 'aria-label') || testoPulito(a.dentro) ||
    (a.dentro.match(/<img[^>]+alt\s*=\s*["']([^"']+)["']/i) || [, ''])[1] ||
    attr(a.attributi, 'title') || '').trim();

  {
    const muti = link.filter(a => !nomeLink(a));
    quotaSu('a11yLinkNominati', muti.length, link.length,
      muti.map(a => '→ ' + frammento(attr(a.attributi, 'href'), 50)));
    if (muti.length) segnala('alto', frase(muti.length, 'collegamento senza testo', 'collegamenti senza testo') + ': lo screen reader legge l\'indirizzo carattere per carattere');
  }

  {
    const generici = link.filter(a => {
      const n = nomeLink(a).toLowerCase().replace(/[\s\u00a0>»→.…]+$/g, '').trim();
      return n && TESTI_LINK_GENERICI.indexOf(n) !== -1;
    });
    quotaSu('a11yLinkDescrittivi', generici.length, link.length,
      generici.map(a => '"' + nomeLink(a) + '" → ' + frammento(attr(a.attributi, 'href'), 35)));
    if (generici.length) segnala('medio', frase(generici.length, 'collegamento con testo generico', 'collegamenti con testo generico') + ' tipo "leggi di più"');
  }

  {
    const mappa = Object.create(null);
    for (const a of link) {
      const n = nomeLink(a).toLowerCase();
      if (!n || n.length < 3) continue;
      (mappa[n] = mappa[n] || []).push(attr(a.attributi, 'href'));
    }
    const ambigui = Object.keys(mappa).filter(n => {
      const d = mappa[n];
      return d.length > 1 && new Set(d).size > 1;
    });
    quotaSu('a11yLinkDistinti', ambigui.length, Object.keys(mappa).length,
      ambigui.map(n => '"' + frammento(n, 35) + '" porta a ' + new Set(mappa[n]).size + ' destinazioni'));
    if (ambigui.length) segnala('medio', frase(ambigui.length, 'testo di collegamento ripetuto che porta', 'testi di collegamento ripetuti che portano') + ' a pagine diverse');
  }

  {
    const nuoveSchede = link.filter(a => /\btarget\s*=\s*["']_blank["']/i.test(a.attributi));
    const senzaAvviso = nuoveSchede.filter(a =>
      !/nuova (scheda|finestra)|new (tab|window)|si apre in/i.test(nomeLink(a) + ' ' + (attr(a.attributi, 'title') || '')));
    quotaSu('a11yNuovaScheda', senzaAvviso.length, nuoveSchede.length,
      senzaAvviso.map(a => '"' + frammento(nomeLink(a), 40) + '"'));
    if (senzaAvviso.length) segnala('basso', frase(senzaAvviso.length, 'collegamento apre', 'collegamenti aprono') + ' una nuova scheda senza avvisare');
  }

  {
    const finti = link.filter(a => {
      const h = attr(a.attributi, 'href');
      return h === '#' || h === '' || /^javascript:\s*(void\(0\))?;?$/i.test(h || '');
    });
    quotaSu('a11yLinkVeri', finti.length, link.length,
      finti.map(a => 'href="' + (attr(a.attributi, 'href') || '') + '"'));
    if (finti.length) segnala('medio', frase(finti.length, 'collegamento senza destinazione reale', 'collegamenti senza destinazione reale') + ': se sono azioni, vanno dichiarati pulsanti');
  }

  /* ===== TABELLE ====================================================== */

  {
    const tabelle = elementi(corpo, 'table', 100);
    const dati = tabelle.filter(t =>
      !/\brole\s*=\s*["'](presentation|none)["']/i.test(t.attributi) &&
      (t.dentro.match(/<td\b/gi) || []).length >= 4);
    const senzaTh = dati.filter(t => !/<th\b/i.test(t.dentro));
    quotaSu('a11yTabelleIntestate', senzaTh.length, dati.length,
      senzaTh.map(t => (t.dentro.match(/<tr\b/gi) || []).length + ' righe senza <th>'));
    if (senzaTh.length) segnala('medio', frase(senzaTh.length, 'tabella di dati senza celle di intestazione', 'tabelle di dati senza celle di intestazione'));

    // scope: rilevante solo dove ci sono intestazioni sia di riga che di colonna
    let thTotali = 0, thSenzaScope = 0;
    for (const t of dati) {
      const righeConTh = (t.dentro.match(/<tr\b[^>]*>[\s\S]*?<th\b/gi) || []).length;
      if (righeConTh <= 1) continue;
      const th = t.dentro.match(/<th\b[^>]*>/gi) || [];
      thTotali += th.length;
      thSenzaScope += th.filter(x => !attr(x, 'scope')).length;
    }
    quotaSu('a11yThScope', thSenzaScope, thTotali, thSenzaScope ? [thSenzaScope + ' celle <th> senza scope'] : []);
    if (thSenzaScope) segnala('basso', frase(thSenzaScope, 'intestazione di tabella senza attributo scope', 'intestazioni di tabella senza attributo scope'));
  }

  /* ===== ARIA ========================================================= */

  {
    const conRuolo = corpo.match(/\brole\s*=\s*["']([^"']+)["']/gi) || [];
    const invalidi = conRuolo.filter(r => {
      const v = (r.match(/["']([^"']+)["']/) || [, ''])[1];
      return v.split(/\s+/).filter(Boolean).some(x => RUOLI_ARIA.indexOf(x.toLowerCase()) === -1);
    });
    quotaSu('a11yRuoliValidi', invalidi.length, conRuolo.length, invalidi.slice(0, MAX_ESEMPI));
    if (invalidi.length) segnala('medio', frase(invalidi.length, 'attributo role con valore inesistente', 'attributi role con valori inesistenti') + ': l\'elemento perde anche il ruolo che aveva di suo');
  }

  {
    let totali = 0;
    const rotti = [];
    for (const a of ['aria-labelledby', 'aria-describedby', 'aria-controls', 'aria-owns']) {
      const re = new RegExp('\\b' + a + '\\s*=\\s*["\']([^"\']+)["\']', 'gi');
      let m, n = 0;
      while ((m = re.exec(corpo)) && n < 400) {
        totali++;
        const mancanti = m[1].split(/\s+/).filter(Boolean).filter(id => !tuttiGliId[id]);
        if (mancanti.length) rotti.push(a + ' → ' + mancanti.join(', '));
        n++;
      }
    }
    quotaSu('a11yRiferimentiAria', rotti.length, totali, rotti);
    if (rotti.length) segnala('medio', frase(rotti.length, 'riferimento ARIA punta', 'riferimenti ARIA puntano') + ' a identificatori che non esistono');
  }

  {
    // elementi focalizzabili dentro un contenitore aria-hidden
    const nascosti = corpo.match(/<([a-z]+)\b[^>]*aria-hidden\s*=\s*["']true["'][^>]*>[\s\S]{0,3000}?<\/\1>/gi) || [];
    let dentro = 0;
    for (const blocco of nascosti.slice(0, 60)) {
      const f = blocco.match(/<(?:a\b[^>]*href|button|input|select|textarea|iframe)\b[^>]*>/gi) || [];
      dentro += f.filter(x => attr(x, 'tabindex') !== '-1' && !haAttr(x, 'disabled')).length;
    }
    quotaSu('a11yNascostiCoerenti', dentro, nascosti.length || (dentro ? dentro : 0),
      dentro ? [dentro + ' elementi raggiungibili col Tab dentro un blocco aria-hidden'] : []);
    if (dentro) segnala('medio', frase(dentro, 'elemento riceve il focus pur essendo nascosto', 'elementi ricevono il focus pur essendo nascosti') + ' alle tecnologie assistive');
  }

  /* ===== TASTIERA ===================================================== */

  {
    const conTab = corpo.match(/\btabindex\s*=\s*["'](\d+)["']/gi) || [];
    const positivi = conTab.filter(t => +((t.match(/["'](\d+)["']/) || [, 0])[1]) > 0);
    quotaSu('a11yTabindex', positivi.length, conTab.length, positivi.slice(0, MAX_ESEMPI));
    if (positivi.length) segnala('medio', frase(positivi.length, 'elemento con tabindex positivo: scavalca', 'elementi con tabindex positivo: scavalcano') + ' l\'ordine naturale di tabulazione');
  }

  {
    const cliccabili = corpo.match(/<([a-z]+)\b[^>]*\bonclick\s*=[^>]*>/gi) || [];
    const irraggiungibili = cliccabili.filter(t => {
      const nome = (t.match(/^<([a-z]+)/i) || [, ''])[1].toLowerCase();
      if (['a', 'button', 'input', 'select', 'textarea'].indexOf(nome) !== -1) return false;
      return attr(t, 'tabindex') === null;
    });
    quotaSu('a11yCliccabiliDaTastiera', irraggiungibili.length, cliccabili.length,
      irraggiungibili.map(t => frammento(t, 60)));
    if (irraggiungibili.length) segnala('alto', frase(irraggiungibili.length, 'elemento cliccabile non raggiungibile da tastiera: funziona', 'elementi cliccabili non raggiungibili da tastiera: funzionano') + ' solo col mouse');
  }

  {
    const vp = (html.match(/<meta[^>]+name\s*=\s*["']viewport["'][^>]*>/i) || [''])[0];
    const c = (attr(vp, 'content') || '').toLowerCase();
    const guai = [];
    if (/user-scalable\s*=\s*(no|0)/.test(c)) guai.push('user-scalable=no');
    const mx = c.match(/maximum-scale\s*=\s*([\d.]+)/);
    if (mx && parseFloat(mx[1]) < 2) guai.push('maximum-scale=' + mx[1]);
    siNo('a11yZoom', guai.length === 0, guai);
    if (guai.length) segnala('alto', 'Lo zoom della pagina è disabilitato (' + guai.join(', ') + '): esclude chiunque abbia una vista imperfetta');
  }

  /* ===== MOVIMENTO ==================================================== */

  {
    const mobili = (corpo.match(/<(marquee|blink)\b/gi) || []).length;
    siNo('a11ySenzaMovimento', mobili === 0, mobili ? [mobili + ' elementi marquee o blink'] : []);
    if (mobili) segnala('medio', frase(mobili, 'elemento in movimento automatico', 'elementi in movimento automatico') + ' (marquee/blink): deprecato e vietato dalle linee guida');
  }

  {
    const auto = (corpo.match(/<(audio|video)\b[^>]*\bautoplay\b[^>]*>/gi) || [])
      .filter(t => !haAttr(t, 'muted'));
    siNo('a11ySenzaAutoplay', auto.length === 0, auto.map(t => frammento(t, 50)));
    if (auto.length) segnala('alto', frase(auto.length, 'contenuto audio o video parte', 'contenuti audio o video partono') + ' da soli: coprono la voce dello screen reader');
  }

  /* ===== RIEPILOGO ==================================================== */

  // I controlli con quota null non sono applicabili a questa pagina e non
  // entrano nella media: una pagina senza tabelle non va punita per le tabelle.
  const misurati = Object.keys(esiti).filter(k => esiti[k].quota !== null);
  const somma = misurati.reduce((s, k) => s + esiti[k].quota, 0);
  const voto = misurati.length ? Math.round(somma / misurati.length * 100) : null;

  return {
    url,
    esiti,
    problemi,
    voto,
    controlliMisurati: misurati.length,
    controlliNonApplicabili: Object.keys(esiti).length - misurati.length,
    // Quello che qui non si può misurare, e perché. Serve a dirlo in chiaro
    // nel rapporto invece di far finta che i controlli siano tutti passati.
    fuoriPortata: [
      { id: 'contrasto', nome: 'Contrasto del testo',
        perche: 'Richiede i colori calcolati dal browser: nell\'HTML grezzo non esistono.' },
      { id: 'focus', nome: 'Indicatore di focus',
        perche: 'Dipende dallo stato :focus-visible, che esiste solo a pagina disegnata.' },
      { id: 'testoSuImmagine', nome: 'Testo su immagine di sfondo',
        perche: 'Va valutato visivamente: nessun calcolo automatico lo sostituisce.' },
    ],
  };
}
