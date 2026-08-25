// accessibilita-schede.js — cosa dire all'utente per ogni controllo.
//
// Il motore (_accessibilita.js, lato server) misura e basta: sa contare le
// immagini senza alt, non sa spiegare perché contano. Le spiegazioni stanno
// qui, come i quarantotto controlli hanno le loro in controlli.js.
//
// Ogni scheda:
//   gravita   alto | medio | basso — le stesse tre di tutto lo strumento
//   wcag      il criterio, per chi lo vuole verificare
//   perche    scritto per il cliente, non per lo sviluppatore
//   comeSi    cosa fare, con i nomi delle cose
//   messaggio (n, tot, pagineRotte, pagineLette) => una riga di riepilogo
//
// n = elementi sbagliati, tot = elementi esaminati.

const frase = (n, uno, molti) => n + ' ' + (n === 1 ? uno : molti);
const suPagine = (rotte, lette) => rotte >= lette
  ? ' — su tutte le pagine lette'
  : ' — su ' + rotte + ' pagine su ' + lette;

export const SCHEDE = {

  /* ===== STRUTTURA ==================================================== */

  a11yLang: {
    gravita: 'alto', wcag: '3.1.1 A',
    titolo: 'Lingua della pagina non dichiarata',
    perche: 'Lo screen reader sceglie la voce in base alla lingua dichiarata. Senza, legge ' +
      'l\'italiano con la pronuncia inglese: il risultato è incomprensibile.',
    comeSi: 'Aggiungi lang="it" al tag <html>. È una parola sola, ed è nel modello del sito.',
    messaggio: (n, t, r, l) => 'Manca l\'attributo lang' + suPagine(r, l),
  },
  a11yTitolo: {
    gravita: 'alto', wcag: '2.4.2 A',
    titolo: 'Titolo della pagina assente o vuoto',
    perche: 'È la prima cosa annunciata all\'apertura, ed è ciò che distingue una scheda ' +
      'dall\'altra quando ne hai quindici aperte.',
    comeSi: 'Compila <title> con un testo che identifichi la pagina, non solo il nome del sito.',
    messaggio: (n, t, r, l) => 'Titolo assente o vuoto' + suPagine(r, l),
  },
  a11yH1Presente: {
    gravita: 'alto', wcag: '1.3.1 A',
    titolo: 'Manca l\'intestazione principale',
    perche: 'Chi naviga con lo screen reader salta di titolo in titolo. Senza H1 non ha un ' +
      'punto di partenza e deve ascoltare tutto dall\'inizio.',
    comeSi: 'Inserisci un H1 che dica di cosa parla la pagina.',
    messaggio: (n, t, r, l) => 'Nessun H1' + suPagine(r, l),
  },
  a11yH1Unico: {
    gravita: 'basso', wcag: '1.3.1 A',
    titolo: 'Più di un\'intestazione principale',
    perche: 'Due o tre H1 rendono ambiguo quale sia l\'argomento della pagina, per chi ' +
      'ascolta e per chi indicizza.',
    comeSi: 'Tieni un solo H1 e declassa gli altri a H2.',
    messaggio: (n, t, r, l) => 'H1 multipli' + suPagine(r, l),
  },
  a11yTitoliOrdinati: {
    gravita: 'medio', wcag: '1.3.1 A',
    titolo: 'Salti di livello nelle intestazioni',
    perche: 'Passare da H2 a H4 fa perdere il filo a chi naviga per titoli: sembra che manchi ' +
      'una sezione.',
    comeSi: 'Scendi un livello alla volta. Se un titolo ti serve solo più piccolo, cambialo ' +
      'con il CSS, non con il livello.',
    messaggio: (n, t, r, l) => frase(n, 'salto di livello', 'salti di livello') + suPagine(r, l),
  },
  a11yTitoliPieni: {
    gravita: 'medio', wcag: '1.3.1 A',
    titolo: 'Intestazioni senza testo',
    perche: 'Un titolo vuoto viene annunciato come tale e interrompe la navigazione per ' +
      'intestazioni senza dire niente.',
    comeSi: 'Riempilo, o togli il tag se serviva solo a spaziare.',
    messaggio: (n, t, r, l) => frase(n, 'intestazione vuota', 'intestazioni vuote') + suPagine(r, l),
  },
  a11yMain: {
    gravita: 'medio', wcag: '1.3.1 A',
    titolo: 'Manca la regione principale',
    perche: 'Senza <main> non si può saltare al contenuto: chi usa lo screen reader si ' +
      'riascolta tutto il menu a ogni pagina.',
    comeSi: 'Avvolgi il contenuto principale in <main>, uno solo per pagina.',
    messaggio: (n, t, r, l) => 'Nessun elemento <main>' + suPagine(r, l),
  },
  a11yIdUnici: {
    gravita: 'medio', wcag: '4.1.1 A',
    titolo: 'Identificatori duplicati',
    perche: 'Gli id ripetuti rompono il legame fra etichetta e campo: lo screen reader legge ' +
      'l\'etichetta sbagliata, e succede senza che nulla appaia rotto a video.',
    comeSi: 'Rendi ogni id univoco nella pagina.',
    messaggio: (n, t, r, l) => 'id ripetuti' + suPagine(r, l),
  },
  a11ySalta: {
    gravita: 'basso', wcag: '2.4.1 A',
    titolo: 'Manca il collegamento per saltare al contenuto',
    perche: 'Chi naviga da tastiera attraversa tutto il menu prima di arrivare al testo, su ' +
      'ogni singola pagina.',
    comeSi: 'Metti come primo elemento del body un link a #contenuto, visibile quando riceve ' +
      'il focus.',
    messaggio: (n, t, r, l) => 'Nessun link di salto' + suPagine(r, l),
  },

  /* ===== TESTI ALTERNATIVI ============================================ */

  a11yImgAlt: {
    gravita: 'alto', wcag: '1.1.1 A',
    titolo: 'Immagini senza testo alternativo',
    perche: 'Senza alt lo screen reader legge il nome del file. Chi ascolta sente ' +
      '"DSC zero quattro due uno punto jpeg" e non sa cosa c\'è nell\'immagine.',
    comeSi: 'Aggiungi alt con la descrizione. Se l\'immagine è solo decorativa usa alt="" ' +
      'vuoto — non assente: sono due cose diverse.',
    messaggio: (n, t, r, l) => frase(n, 'immagine', 'immagini') + ' su ' + t + suPagine(r, l),
  },
  a11yAltUtile: {
    gravita: 'medio', wcag: '1.1.1 A',
    titolo: 'Testi alternativi generici',
    perche: 'Un alt che dice "immagine" o ripete il nome del file occupa il posto della ' +
      'descrizione senza fornirla. È peggio di niente, perché sembra fatto.',
    comeSi: 'Descrivi cosa si vede e perché è lì.',
    messaggio: (n, t, r, l) => frase(n, 'alt generico', 'alt generici') + suPagine(r, l),
  },
  a11yInputImmagine: {
    gravita: 'alto', wcag: '1.1.1 A',
    titolo: 'Pulsanti immagine senza alternativa',
    perche: 'È un pulsante: senza alt chi non vede non sa cosa succede premendolo.',
    comeSi: 'Aggiungi alt con l\'azione, per esempio alt="Cerca".',
    messaggio: (n, t, r, l) => frase(n, 'pulsante immagine', 'pulsanti immagine') + suPagine(r, l),
  },
  a11yAreaAlt: {
    gravita: 'medio', wcag: '1.1.1 A',
    titolo: 'Aree della mappa immagine senza alternativa',
    perche: 'Ogni area cliccabile è un collegamento, e va nominata come tale.',
    comeSi: 'Aggiungi alt a ogni <area>.',
    messaggio: (n, t, r, l) => frase(n, 'area senza alt', 'aree senza alt') + suPagine(r, l),
  },
  a11ySvg: {
    gravita: 'basso', wcag: '1.1.1 A',
    titolo: 'Icone SVG né nominate né marcate come decorative',
    perche: 'Un SVG senza nome e senza aria-hidden lascia lo screen reader in dubbio: a ' +
      'volte lo annuncia come "immagine" e basta, interrompendo la lettura.',
    comeSi: 'Se è informativo, aggiungi <title> dentro l\'SVG o aria-label. Se è decorativo, ' +
      'aria-hidden="true". La scelta va fatta, non lasciata aperta.',
    messaggio: (n, t, r, l) => frase(n, 'SVG', 'SVG') + ' su ' + t + suPagine(r, l),
  },
  a11ySottotitoli: {
    gravita: 'alto', wcag: '1.2.2 A',
    titolo: 'Video senza sottotitoli',
    perche: 'Senza sottotitoli il video è inaccessibile a chi è sordo, e anche a chiunque lo ' +
      'guardi senza audio — che sul telefono è la maggioranza.',
    comeSi: 'Aggiungi <track kind="captions" srclang="it"> con il file .vtt.',
    messaggio: (n, t, r, l) => frase(n, 'video senza sottotitoli', 'video senza sottotitoli') + suPagine(r, l),
  },
  a11yIframeTitolo: {
    gravita: 'medio', wcag: '4.1.2 A',
    titolo: 'Iframe senza titolo',
    perche: 'Lo screen reader annuncia solo "frame": chi ascolta non sa se dentro c\'è una ' +
      'mappa, un video o una pubblicità.',
    comeSi: 'Aggiungi title="…" all\'iframe, per esempio title="Mappa della sede".',
    messaggio: (n, t, r, l) => frase(n, 'iframe senza titolo', 'iframe senza titolo') + suPagine(r, l),
  },

  /* ===== MODULI ======================================================= */

  a11yCampiEtichettati: {
    gravita: 'alto', wcag: '3.3.2 A',
    titolo: 'Campi del modulo senza etichetta',
    perche: 'Chi usa lo screen reader arriva sul campo e sente "casella di testo". Non sa ' +
      'cosa scriverci. È il difetto che fa abbandonare i moduli.',
    comeSi: 'Collega <label for="id"> al campo, oppure usa aria-label. Il placeholder non ' +
      'basta: sparisce appena si scrive, e molti screen reader non lo leggono.',
    messaggio: (n, t, r, l) => frase(n, 'campo', 'campi') + ' su ' + t + suPagine(r, l),
  },
  a11yLabelCollegate: {
    gravita: 'medio', wcag: '1.3.1 A',
    titolo: 'Etichette che non puntano a nessun campo',
    perche: 'Una label con for sbagliato è identica a una label assente, ma sembra a posto ' +
      'guardando la pagina.',
    comeSi: 'Allinea il for della label all\'id del campo.',
    messaggio: (n, t, r, l) => frase(n, 'etichetta scollegata', 'etichette scollegate') + suPagine(r, l),
  },
  a11yGruppiEtichettati: {
    gravita: 'medio', wcag: '1.3.1 A',
    titolo: 'Gruppi di scelte senza intestazione',
    perche: 'Si sentono le singole opzioni ma non la domanda a cui rispondono: si sceglie ' +
      'alla cieca.',
    comeSi: 'Racchiudi il gruppo in <fieldset> con <legend>, oppure role="group" con aria-label.',
    messaggio: (n, t, r, l) => frase(n, 'gruppo senza intestazione', 'gruppi senza intestazione') + suPagine(r, l),
  },
  a11yAutocomplete: {
    gravita: 'basso', wcag: '1.3.5 AA',
    titolo: 'Campi personali senza autocomplete',
    perche: 'Con autocomplete il browser compila da solo. Per chi ha difficoltà motorie o ' +
      'cognitive è la differenza fra completare il modulo e rinunciare.',
    comeSi: 'Aggiungi autocomplete="email", "tel", "name", "street-address" e simili.',
    messaggio: (n, t, r, l) => frase(n, 'campo', 'campi') + ' senza autocomplete' + suPagine(r, l),
  },
  a11yBottoniNominati: {
    gravita: 'alto', wcag: '4.1.2 A',
    titolo: 'Pulsanti senza testo accessibile',
    perche: 'Il classico pulsante con la sola icona: si vede una X, si sente "pulsante" e ' +
      'basta. Chiude? Cancella? Non si sa.',
    comeSi: 'Aggiungi aria-label al pulsante, per esempio aria-label="Chiudi".',
    messaggio: (n, t, r, l) => frase(n, 'pulsante', 'pulsanti') + ' su ' + t + suPagine(r, l),
  },

  /* ===== COLLEGAMENTI ================================================= */

  a11yLinkNominati: {
    gravita: 'alto', wcag: '2.4.4 A',
    titolo: 'Collegamenti senza testo',
    perche: 'Lo screen reader legge l\'indirizzo carattere per carattere. Provalo una volta ' +
      'e non lo rifai più.',
    comeSi: 'Metti del testo nel collegamento, o un aria-label che dica dove porta.',
    messaggio: (n, t, r, l) => frase(n, 'collegamento', 'collegamenti') + ' su ' + t + suPagine(r, l),
  },
  a11yLinkDescrittivi: {
    gravita: 'medio', wcag: '2.4.4 A',
    titolo: 'Collegamenti con testo generico',
    perche: 'Chi naviga elencando i collegamenti si ritrova venti voci "leggi di più" ' +
      'identiche, senza nessuna indicazione di dove portino. Vale anche per Google.',
    comeSi: 'Scrivi dove porta: "Leggi la scheda della cucciolata" invece di "Leggi di più".',
    messaggio: (n, t, r, l) => frase(n, 'collegamento generico', 'collegamenti generici') + suPagine(r, l),
  },
  a11yLinkDistinti: {
    gravita: 'medio', wcag: '2.4.4 A',
    titolo: 'Collegamenti identici verso pagine diverse',
    perche: 'Due collegamenti con lo stesso nome e destinazioni diverse sono indistinguibili ' +
      'per chi non vede il contesto attorno.',
    comeSi: 'Differenzia i testi, o aggiungi aria-label più specifici.',
    messaggio: (n, t, r, l) => frase(n, 'testo ripetuto', 'testi ripetuti') + suPagine(r, l),
  },
  a11yNuovaScheda: {
    gravita: 'basso', wcag: '3.2.2 A',
    titolo: 'Nuove schede aperte senza avvisare',
    perche: 'Il cambio di contesto non annunciato disorienta, e il tasto indietro smette di ' +
      'funzionare come ci si aspetta.',
    comeSi: 'Aggiungi al testo o all\'aria-label "si apre in una nuova scheda".',
    messaggio: (n, t, r, l) => frase(n, 'collegamento', 'collegamenti') + suPagine(r, l),
  },
  a11yLinkVeri: {
    gravita: 'medio', wcag: '4.1.2 A',
    titolo: 'Collegamenti senza destinazione reale',
    perche: 'Un <a href="#"> viene annunciato come collegamento ma non porta da nessuna ' +
      'parte. Se è un\'azione, va dichiarata come tale.',
    comeSi: 'Usa <button> per le azioni e <a> solo per la navigazione.',
    messaggio: (n, t, r, l) => frase(n, 'collegamento finto', 'collegamenti finti') + suPagine(r, l),
  },

  /* ===== TABELLE ====================================================== */

  a11yTabelleIntestate: {
    gravita: 'medio', wcag: '1.3.1 A',
    titolo: 'Tabelle di dati senza intestazioni',
    perche: 'Senza <th> lo screen reader legge una sequenza di numeri senza dire a quale ' +
      'colonna appartengono. La tabella diventa illeggibile.',
    comeSi: 'Trasforma la prima riga in <th scope="col">.',
    messaggio: (n, t, r, l) => frase(n, 'tabella', 'tabelle') + suPagine(r, l),
  },
  a11yThScope: {
    gravita: 'basso', wcag: '1.3.1 A',
    titolo: 'Intestazioni di tabella senza ambito',
    perche: 'Nelle tabelle con intestazioni sia di riga sia di colonna, senza scope ' +
      'l\'associazione fra cella e intestazione diventa ambigua.',
    comeSi: 'Aggiungi scope="col" o scope="row" a ogni <th>.',
    messaggio: (n, t, r, l) => frase(n, 'intestazione', 'intestazioni') + ' senza scope' + suPagine(r, l),
  },

  /* ===== ARIA ========================================================= */

  a11yRuoliValidi: {
    gravita: 'medio', wcag: '4.1.2 A',
    titolo: 'Attributi role con valori inesistenti',
    perche: 'Un role scritto male non viene ignorato con grazia: l\'elemento perde anche il ' +
      'ruolo che aveva di suo. Un bottone con role sbagliato smette di essere un bottone.',
    comeSi: 'Correggi il valore o rimuovi l\'attributo.',
    messaggio: (n, t, r, l) => frase(n, 'role non valido', 'role non validi') + suPagine(r, l),
  },
  a11yRiferimentiAria: {
    gravita: 'medio', wcag: '4.1.2 A',
    titolo: 'Riferimenti ARIA che puntano nel vuoto',
    perche: 'Un aria-labelledby verso un id inesistente lascia l\'elemento senza nome, ' +
      'esattamente come se l\'attributo non ci fosse.',
    comeSi: 'Verifica che gli id citati esistano davvero nella pagina.',
    messaggio: (n, t, r, l) => frase(n, 'riferimento rotto', 'riferimenti rotti') + suPagine(r, l),
  },
  a11yNascostiCoerenti: {
    gravita: 'medio', wcag: '4.1.2 A',
    titolo: 'Elementi nascosti che ricevono comunque il focus',
    perche: 'Il focus da tastiera finisce su qualcosa che lo screen reader non annuncia: si ' +
      'arriva in un punto cieco e non si capisce dove si è.',
    comeSi: 'Aggiungi tabindex="-1" agli elementi dentro aria-hidden, o toglili dal DOM ' +
      'quando sono nascosti.',
    messaggio: (n, t, r, l) => frase(n, 'elemento', 'elementi') + suPagine(r, l),
  },

  /* ===== TASTIERA ===================================================== */

  a11yTabindex: {
    gravita: 'medio', wcag: '2.4.3 A',
    titolo: 'Ordine di tabulazione forzato',
    perche: 'Un tabindex maggiore di zero scavalca l\'ordine naturale e crea salti ' +
      'imprevedibili nel resto della pagina, anche dove non l\'hai messo.',
    comeSi: 'Usa solo tabindex="0" o "-1", e sistema l\'ordine nel codice.',
    messaggio: (n, t, r, l) => frase(n, 'elemento', 'elementi') + suPagine(r, l),
  },
  a11yCliccabiliDaTastiera: {
    gravita: 'alto', wcag: '2.1.1 A',
    titolo: 'Elementi cliccabili irraggiungibili da tastiera',
    perche: 'Un div con onclick funziona col mouse e basta. Chi naviga da tastiera non ci ' +
      'arriva proprio: per lui quel comando non esiste.',
    comeSi: 'Usa <button>. Se proprio serve un div, aggiungi role="button", tabindex="0" e ' +
      'la gestione di Invio e Spazio.',
    messaggio: (n, t, r, l) => frase(n, 'elemento', 'elementi') + suPagine(r, l),
  },
  a11yZoom: {
    gravita: 'alto', wcag: '1.4.4 AA',
    titolo: 'Zoom della pagina disabilitato',
    perche: 'Impedire l\'ingrandimento su telefono taglia fuori chiunque abbia una vista ' +
      'imperfetta — che dopo i quaranta siamo quasi tutti.',
    comeSi: 'Togli user-scalable=no e maximum-scale dal meta viewport. È una riga sola.',
    messaggio: (n, t, r, l) => 'Zoom bloccato' + suPagine(r, l),
  },

  /* ===== MOVIMENTO ==================================================== */

  a11ySenzaMovimento: {
    gravita: 'medio', wcag: '2.2.2 A',
    titolo: 'Elementi in movimento automatico',
    perche: 'Il movimento che parte da solo e non si ferma rende impossibile leggere a chi ha ' +
      'disturbi dell\'attenzione, e in certi casi provoca malessere.',
    comeSi: 'Rimuovi marquee e blink. Per i caroselli, metti un comando di pausa.',
    messaggio: (n, t, r, l) => 'Elementi marquee o blink' + suPagine(r, l),
  },
  a11ySenzaAutoplay: {
    gravita: 'alto', wcag: '1.4.2 A',
    titolo: 'Audio o video che parte da solo',
    perche: 'L\'audio automatico copre la voce dello screen reader, e chi lo usa non riesce ' +
      'nemmeno a trovare il pulsante per fermarlo.',
    comeSi: 'Togli autoplay, oppure lascialo solo se muto e con comandi visibili.',
    messaggio: (n, t, r, l) => 'Riproduzione automatica attiva' + suPagine(r, l),
  },
};
