// posizioni-blocco.js — il disegno del rapporto sulle posizioni.
//
// Stava dentro verifica.js. E' stato estratto quando e' nata la pagina
// /sottosopra/posizionamento/, che mostra lo stesso rapporto senza fare
// l'analisi del sito. Copiarlo avrebbe voluto dire due versioni che nel giro
// di qualche mese divergono: e' gia' successo con le FAQ, scritte a mano
// nell'HTML e nel front matter, che infatti dicevano numeri diversi.
//
// Qui dentro non c'e' niente di specifico a una delle due pagine: prende i
// dati che tornano da /api/posizioni e restituisce HTML.

export const T = s => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function fasciaPosizione(p) {
  if (!p) return 'fuori';
  if (p <= 3) return 'alto';
  if (p <= 10) return 'medio';
  return 'basso';
}

// Normalizza quello che l'utente scrive nel campo: "iltuosito.it" diventa
// "https://iltuosito.it". Serve identica alle due pagine.
export function normalizza(scritto) {
  let v = scritto.trim().replace(/\s+/g, '');
  if (!v) return null;
  v = v.replace(/^https?:\/\//i, m => m.toLowerCase());
  if (!/^https?:\/\//i.test(v)) v = 'https://' + v;
  let u;
  try { u = new URL(v); } catch { return null; }
  if (!u.hostname.includes('.') || u.hostname.endsWith('.')) return null;
  return u.origin;
}

// Una tendina chiusa, su carta, stampa un titolo e basta: il contenuto non
// c'e'. Questi due eventi coprono ogni modo di stampare e rimettono tutto
// com'era dopo.
export function abilitaStampaTendine() {
  let aperte = [];
  window.addEventListener('beforeprint', () => {
    aperte = Array.from(document.querySelectorAll('.strumento details:not([open])'));
    aperte.forEach(d => { d.open = true; });
  });
  window.addEventListener('afterprint', () => {
    aperte.forEach(d => { d.open = false; });
    aperte = [];
  });
}

export function bloccoPosizioni(dati) {
  if (!dati.disponibile)
    return '<h2>Posizioni su Google</h2><p class="posizioni-nota">' +
           T(dati.motivo || 'Controllo non eseguito.') + '</p>';

  const conCitta = !!dati.citta;
  const nomeCitta = conCitta ? dati.citta.split(',')[0] : '';

  // I numeri stanno in chiaro, le spiegazioni dentro le tendine. E' lo stesso
  // elemento usato per i quaranta controlli, quindi non si introduce niente di
  // nuovo: chi vuole solo il numero lo legge, chi vuole capire apre.
  const riga = (nome, sigla, valore) =>
    '<div class="misura"><span class="tipo">' + nome +
    '<span class="sigla">' + sigla + '</span></span>' +
    '<span class="valore">' + valore + '</span></div>';

  const misuraSerp = (esito) => {
    const nome = 'Risultati normali', sigla = 'SERP';
    if (!esito) return riga(nome, sigla, '<span class="fuori">non richiesta</span>');
    if (esito.errore)
      return riga(nome, sigla,
        '<span class="fuori" title="' + T(esito.errore) + '">non riuscita</span>');
    if (esito.oltre)
      return riga(nome, sigla,
        '<span class="fuori">oltre i primi ' + dati.profondita + '</span>');

    const numeroPagina = Math.ceil(esito.posizione / 10);
    const pagina = numeroPagina === 1 ? 'prima pagina' : 'pagina ' + numeroPagina;
    return riga(nome, sigla,
      '<span class="numero ' + fasciaPosizione(esito.posizione) + '">' + esito.posizione +
      '</span><span class="sotto">' + pagina + '</span>');
  };

  const misuraMappe = (esito) => {
    const nome = 'Riquadro mappe', sigla = 'Google Business Profile';
    if (!esito || esito.errore || !esito.mappe)
      return riga(nome, sigla, '<span class="fuori">non rilevato</span>');
    const m = esito.mappe;
    if (!m.presente) return riga(nome, sigla, '<span class="fuori">non compare</span>');

    const quanti = m.totale || m.posizione;
    if (!m.dentro)
      return riga(nome, sigla,
        '<span class="fuori attenzione">' + quanti + ' attivit\u00e0, tu no</span>');
    return riga(nome, sigla,
      '<span class="numero ' + fasciaPosizione(m.posizione) + '">' + m.posizione +
      '</span><span class="sotto">su ' + quanti + '</span>');
  };

  const luogo = (classe, nome, esito) =>
    '<div class="luogo ' + classe + '"><span class="dove">' + T(nome) + '</span>' +
    misuraSerp(esito) + misuraMappe(esito) + '</div>';

  const tendina = (titolo, dentro, avviso) =>
    '<details><summary' + (avviso ? ' class="avviso"' : '') + '>' + titolo + '</summary>' +
    '<div class="dentro">' + dentro + '</div></details>';

  const schede = dati.esiti.map(e => {
    const naz = e.nazionale, loc = e.locale;
    const punti = [naz, loc]
      .filter(x => x && !x.errore && !x.oltre && x.posizione)
      .map(x => x.posizione);
    const migliore = punti.length ? Math.min.apply(null, punti) : null;

    let h = '<div class="scheda-parola ' + fasciaPosizione(migliore) + '">' +
            '<span class="parola">' + T(e.parola) + '</span>' +
            '<div class="luoghi">' + luogo('italia', 'Italia', naz) +
            (conCitta ? luogo('citta', nomeCitta, loc) : '') + '</div>';

    // Il caso piu' utile per un'attivita' locale: il riquadro c'e' e non ti
    // contiene. Il titolo della tendina e' gia' l'informazione, si legge
    // senza aprire.
    if (conCitta && loc && loc.mappe && loc.mappe.presente && !loc.mappe.dentro)
      h += tendina('Il riquadro mappe a ' + T(nomeCitta) + ' c\u2019\u00e8 e tu non ci sei',
        '<p>Quel traffico sta andando alle attivit\u00e0 che compaiono nella cartina, sopra i ' +
        'risultati normali. Su una ricerca locale \u00e8 spesso la fetta pi\u00f9 grossa.</p>' +
        '<p>Si lavora sul <b>Google Business Profile</b>, non sul sito: categoria giusta, ' +
        'indirizzo e orari completi, foto, recensioni.</p>', true);

    // La lettura del confronto fra nazionale e locale, chiusa.
    let lettura = '';
    if (conCitta && naz && loc && !naz.errore && !loc.errore) {
      const n = naz.oltre ? null : naz.posizione;
      const l = loc.oltre ? null : loc.posizione;
      if (n && l && l < n - 2)
        lettura = '<p>Sul territorio vai molto meglio che sulla ricerca nazionale: la tua forza ' +
                  'su questa parola \u00e8 il locale, e va difesa.</p>';
      else if (!n && l)
        lettura = '<p>In Italia non compari, a ' + T(nomeCitta) + ' s\u00ec. La partita ' +
                  'nazionale su questa ricerca non \u00e8 la tua: punta sul territorio.</p>';
      else if (n && !l)
        lettura = '<p>Compari in Italia ma non a ' + T(nomeCitta) + ': su questa ricerca il ' +
                  'locale te lo stanno portando via.</p>';
      else if (n && l && n < l - 2)
        lettura = '<p>Vai meglio a livello nazionale che a ' + T(nomeCitta) + ': strano per ' +
                  'un\u2019attivit\u00e0 locale, e vale la pena capire perch\u00e9.</p>';
    }
    if (lettura) h += tendina('Cosa dicono questi numeri', lettura);

    // Chi c'e' in cima, per ogni localita' e per ognuna delle due gare: i
    // domini vengono dai risultati organici, i nomi dal riquadro mappe. Il
    // dato locale arrivava gia' dall'endpoint e veniva buttato via.
    // Una voce diventa un collegamento solo se l'indirizzo c'e' davvero. Le
    // schede del riquadro mappe spesso non dichiarano un sito: in quel caso
    // resta testo, invece di inventare un indirizzo plausibile.
    // rel="nofollow": senza, ogni rapporto regalerebbe un segnale di fiducia
    // ai concorrenti del sito analizzato.
    const voce = (testo, indirizzo) => {
      if (!indirizzo || !/^https?:\/\//i.test(indirizzo))
        return '<li class="senza-link">' + T(testo) + '</li>';
      return '<li><a href="' + T(indirizzo) + '" target="_blank" rel="nofollow noopener">' +
             T(testo) + '</a></li>';
    };

    const elenco = (capo, voci, classe) =>
      '<p class="capolista"><b>' + capo + '</b></p><ul class="concorrenti' + classe + '">' +
      voci.map(v => voce(v.testo, v.indirizzo)).join('') + '</ul>';

    const gruppi = [];
    for (const [classe, dove, lato] of (conCitta ? [['italia', 'Italia', naz],
                                                    ['citta', nomeCitta, loc]]
                                                 : [['italia', 'Italia', naz]])) {
      if (!lato || lato.errore) continue;
      let dentro = '';
      if (lato.primi && lato.primi.length)
        dentro += elenco('Risultati normali (SERP)',
          lato.primi.map(v => ({ testo: v.dominio, indirizzo: v.indirizzo })), '');
      if (lato.mappe && lato.mappe.presente && lato.mappe.chi && lato.mappe.chi.length)
        dentro += elenco('Riquadro mappe (Google Business Profile)',
          // le versioni precedenti mandavano solo il nome, come stringa
          lato.mappe.chi.map(v => (typeof v === 'string'
            ? { testo: v, indirizzo: null }
            : { testo: v.nome, indirizzo: v.indirizzo })), ' nomi');
      if (dentro)
        gruppi.push('<div class="gruppo ' + classe + '"><p class="luogo-capo">' + T(dove) +
                    '</p>' + dentro + '</div>');
    }

    if (gruppi.length) h += tendina('Chi c\u2019\u00e8 in cima', gruppi.join(''));

    return h + '</div>';
  }).join('');

  const guasti = [];
  for (const e of dati.esiti)
    for (const lato of [e.nazionale, e.locale])
      if (lato && lato.errore && guasti.indexOf(lato.errore) === -1) guasti.push(lato.errore);

  const spiegone = tendina('Perch\u00e9 due numeri per ogni luogo',
    '<p><b>Risultati normali (SERP)</b> \u2014 i collegamenti blu, dieci per pagina. ' +
    'Dipendono dal <b>sito</b>: contenuti, struttura, velocit\u00e0, collegamenti che riceve. ' +
    '\u00c8 quello che misura il resto di questo rapporto.</p>' +
    '<p><b>Riquadro mappe (Google Business Profile)</b> \u2014 il blocco con la cartina sopra i ' +
    'risultati. Non dipende dal sito: lo decide la scheda dell\u2019attivit\u00e0 su Google Maps, ' +
    'cio\u00e8 categoria, indirizzo, orari, recensioni e distanza da chi sta cercando.</p>' +
    '<p>Sono due gare separate, con regole diverse: si pu\u00f2 essere primi nelle mappe e in ' +
    'quarta pagina fra i risultati normali. Se manchi nelle mappe si lavora sul Business ' +
    'Profile; se sei in fondo fra i risultati normali si lavora sul sito.</p>');

  let nota = 'Ricerca su Google' + (conCitta ? ' in Italia e a ' + T(nomeCitta) : ' in Italia') +
             ', primi ' + dati.profondita + ' risultati, da computer fisso. ' +
             'Le posizioni cambiano di giorno in giorno e da persona a persona: ' +
             'vale l\u2019ordine di grandezza, non il numero esatto.';
  if (dati.cittaFallita)
    nota += ' La ricerca locale non \u00e8 andata a buon fine: il fornitore non ha ' +
            'riconosciuto la citt\u00e0, resta valida solo quella nazionale.';

  const spiegazione = guasti.length
    ? '<p class="posizioni-nota guasto"><b>Il fornitore di dati ha risposto:</b> ' +
      guasti.map(g => T(g)).join(' \u00b7 ') + '</p>'
    : '';

  return '<h2>Posizioni su Google</h2><div class="posizioni">' + schede + '</div>' +
         spiegone + spiegazione + '<p class="posizioni-nota">' + nota + '</p>';
}
