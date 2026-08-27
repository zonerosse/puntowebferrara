// cookie-blocco.js — disegna il rapporto. Stesse classi degli altri
// strumenti: il foglio di stile e' quello condiviso, qui non c'e' CSS.
//
// La regola che governa tutti i testi di questa pagina: DIRE COSA SI TROVA,
// MAI COSA COMPORTA. "Il sito carica Meta Pixel e l'informativa non lo
// nomina" e' un fatto verificabile da chiunque. "Il tuo sito non e' a norma"
// e' una consulenza legale che non possiamo dare, e che dipende da cento
// cose che uno strumento non vede.

const ETICHETTA = { alto: 'Da vedere', medio: 'Da sapere', basso: 'Da rifinire' };

export function bloccoCookie(dati) {
  if (!dati || dati.disponibile === false) {
    return '<div class="a11y-testata"><p class="a11y-quante">' +
      T(dati && dati.motivo || 'Analisi non riuscita.') + '</p></div>';
  }

  const rilievi = costruisciRilievi(dati);
  const conta = { alto: 0, medio: 0, basso: 0 };
  rilievi.forEach(r => conta[r.gravita]++);

  let h = '';

  /* --- testata ---------------------------------------------------------- */
  const quanti = dati.daConsenso.length;
  h += '<div class="a11y-testata">' +
    '<div class="a11y-voto ' + fascia(dati.stato) + '">' +
      '<span class="numero">' + quanti + '</span>' +
      '<span class="su">' + (quanti === 1 ? 'servizio' : 'servizi') + '</span>' +
      '<span class="etichetta">richiedono il consenso</span>' +
    '</div>' +
    '<div class="a11y-riepilogo">' +
      '<ul class="a11y-legenda">' +
        voce('g6', dati.piattaforme.length,
             'piattaforma di consenso trovata', 'piattaforme di consenso trovate') +
        (dati.policy
          ? voce('g3', dati.policy.nonDichiarati.length,
                 'non dichiarato nell\'informativa', 'non dichiarati nell\'informativa')
          : '') +
        voce('g9', dati.extraUE.length,
             'fornitore fuori dall\'Unione', 'fornitori fuori dall\'Unione') +
      '</ul>' +
      '<p class="a11y-quante">' + riga(dati) + '</p>' +
    '</div>' +
  '</div>';

  /* --- avvertenza ------------------------------------------------------- */
  h += '<p class="a11y-avvertenza">Questo è un rilievo tecnico, non una ' +
    'valutazione legale. Dice quali servizi il sito carica e cosa dichiara ' +
    'l\'informativa. Se questo comporti un obbligo, e quale, lo dice un ' +
    'legale — non uno strumento automatico.</p>';

  /* --- lo stato, sempre, anche quando e' buono -------------------------- */
  h += '<div class="a11y-elenco">';
  h += '<div class="a11y-voce ' + gravitaStato(dati.stato) + '">' +
    '<div class="a11y-capo">' +
      '<span class="marca">' + ETICHETTA[gravitaStato(dati.stato)] + '</span>' +
      '<span class="nome">' + T(titoloStato(dati.stato)) + '</span>' +
    '</div>' +
    '<p class="a11y-quanti">' + T(dati.spiegazione) + '</p>' +
    (dati.daConsenso.length
      ? tendina('Quali servizi, e cosa se ne fa',
          '<ul class="a11y-esempi">' +
          dati.trovati.map(t => '<li><b>' + T(t.nome) + '</b> — ' +
            '<span class="a11y-dove">' + T(t.impronta) + '</span></li>').join('') +
          '</ul>' + comeSiSistema(dati.stato))
      : '')
  + '</div>';

  /* --- gli altri rilievi ------------------------------------------------ */
  for (const r of rilievi) {
    h += '<div class="a11y-voce ' + r.gravita + '">' +
      '<div class="a11y-capo">' +
        '<span class="marca">' + ETICHETTA[r.gravita] + '</span>' +
        '<span class="nome">' + T(r.titolo) + '</span>' +
      '</div>' +
      '<p class="a11y-quanti">' + T(r.messaggio) + '</p>' +
      tendina('Perché conta e come si sistema', r.dentro) +
    '</div>';
  }
  h += '</div>';

  /* --- quello che qui non si puo' vedere -------------------------------- */
  if (dati.fuoriPortata && dati.fuoriPortata.length) {
    const dentro = '<p>Cinque verifiche dipendono da cosa succede mentre la ' +
      'pagina gira nel browser. Nel codice consegnato dal server non esistono ' +
      'ancora.</p><ul class="a11y-esempi">' +
      dati.fuoriPortata.map(f =>
        '<li><b>' + T(f.nome) + '</b> — ' + T(f.perche) + '</li>').join('') +
      '</ul><p>Per queste serve l\'<a href="/estensione/">estensione per il ' +
      'browser</a>, dove la pagina è viva e i cookie si possono contare.</p>';
    h += tendina('Le cinque cose che questa pagina non può controllare', dentro, true);
  }

  return h;
}

/* --- i rilievi oltre allo stato ------------------------------------------ */

function costruisciRilievi(dati) {
  const out = [];

  // 1. servizi trovati ma non nominati nell'informativa
  if (dati.policy && dati.policy.nonDichiarati.length) {
    const n = dati.policy.nonDichiarati.length;
    out.push({
      gravita: 'alto',
      titolo: n === 1
        ? 'Un servizio non è nominato nella tua informativa'
        : n + ' servizi non sono nominati nella tua informativa',
      messaggio: elenco(dati.policy.nonDichiarati) +
        (n === 1 ? ' è caricato dal sito ma non compare' : ' sono caricati dal sito ma non compaiono') +
        ' nel testo della privacy policy.',
      dentro: '<p>L\'informativa deve dire chi tratta i dati dei visitatori. ' +
        'Un servizio che c\'è ma non è dichiarato è una dichiarazione ' +
        'incompleta — ed è la cosa più facile da verificare per chiunque, ' +
        'perché basta aprire il sorgente della pagina.</p>' +
        '<p><b>Come si sistema.</b> Aggiungi all\'informativa una sezione che ' +
        'elenca i fornitori, cosa trattano e per quale scopo.</p>' +
        '<p><b>Il limite di questo controllo.</b> Cerco il nome del servizio nel ' +
        'testo. Se la tua informativa lo chiama in un altro modo — per esempio ' +
        '"strumenti di analisi del traffico" invece di "Google Analytics" — ' +
        'risulta non dichiarato anche se in sostanza lo è.</p>',
    });
  }

  // 2. fornitori extra-UE non menzionati
  if (dati.extraUE.length && dati.policy && dati.policy.citaTrasferimento === false) {
    out.push({
      gravita: 'medio',
      titolo: dati.extraUE.length + ' fornitori fuori dall\'Unione, e l\'informativa non ne parla',
      messaggio: elenco(dati.extraUE) + '. Nel testo non compare nessun ' +
        'riferimento al trasferimento dei dati fuori dall\'Unione europea.',
      dentro: '<p>Esistono meccanismi che rendono lecito il trasferimento, e la ' +
        'maggior parte dei siti che usano questi servizi ricade in uno di quelli. ' +
        'Ma va dichiarato.</p>' +
        '<p><b>Questo è il punto in cui serve un legale</b>, non uno strumento: ' +
        'quale meccanismo si applichi al tuo caso e come vada scritto non si ' +
        'deduce dal codice.</p>',
    });
  }

  // 3. l'informativa non si trova
  if (!dati.policyLetta) {
    out.push({
      gravita: dati.daConsenso.length ? 'alto' : 'medio',
      titolo: 'Non ho trovato l\'informativa privacy',
      messaggio: 'Fra i collegamenti della pagina non c\'è niente che porti a ' +
        'una privacy o cookie policy sullo stesso sito.',
      dentro: '<p>Può voler dire due cose: che l\'informativa non c\'è, oppure ' +
        'che c\'è ma non è collegata dalla pagina che ho letto.</p>' +
        '<p><b>In entrambi i casi vale la pena sistemarlo.</b> Un\'informativa ' +
        'che esiste ma non si raggiunge è come se non ci fosse, per chi la cerca ' +
        'e per chi controlla. Il posto giusto è il piè di pagina, su tutte le ' +
        'pagine del sito.</p>' +
        '<p>Senza informativa non ho potuto verificare se i servizi trovati ' +
        'siano dichiarati: è il controllo che vale di più, e resta in sospeso.</p>',
    });
  }

  // 4. piu' di una piattaforma di consenso
  if (dati.piattaforme.length > 1) {
    out.push({
      gravita: 'medio',
      titolo: 'Ci sono ' + dati.piattaforme.length + ' piattaforme di consenso insieme',
      messaggio: elenco(dati.piattaforme) + '. Due sistemi che chiedono lo stesso ' +
        'permesso si contendono la stessa scelta.',
      dentro: '<p>Succede quasi sempre per lo stesso motivo: un plugin vecchio è ' +
        'rimasto acceso quando ne è stato installato uno nuovo.</p>' +
        '<p><b>Come si sistema.</b> Decidi quale tenere e disattiva l\'altro. ' +
        'Due banner non raddoppiano la tutela: si annullano, perché la scelta ' +
        'registrata da uno non è quella che l\'altro applica.</p>',
    });
  }

  return out;
}

/* --- utilita' ------------------------------------------------------------ */

function titoloStato(stato) {
  return {
    'niente-da-chiedere': 'Non c\'è niente per cui chiedere il consenso',
    'nessun-consenso': 'Ci sono tracciatori e nessuno chiede il permesso',
    'banner-decorativo': 'Il banner c\'è, ma gli script non risultano sospesi',
    'probabilmente-a-posto': 'Il consenso sembra configurato correttamente',
    'banner-inutile': 'C\'è un banner, ma non c\'è niente da chiedere',
  }[stato] || 'Situazione non riconosciuta';
}

function gravitaStato(stato) {
  return {
    'niente-da-chiedere': 'basso',
    'probabilmente-a-posto': 'basso',
    'banner-inutile': 'medio',
    'nessun-consenso': 'alto',
    'banner-decorativo': 'alto',
  }[stato] || 'medio';
}

function fascia(stato) {
  return (stato === 'niente-da-chiedere' || stato === 'probabilmente-a-posto')
    ? 'alto' : (stato === 'banner-inutile' ? 'medio' : 'basso');
}

function comeSiSistema(stato) {
  if (stato === 'banner-decorativo') {
    return '<p><b>Come si sistema.</b> Nella configurazione della piattaforma, ' +
      'associa ogni script alla sua categoria. Le piattaforme serie non caricano ' +
      'gli script: li mettono in pausa marcandoli, e li riattivano dopo il sì.</p>' +
      '<p><b>Il limite di questo controllo.</b> Da qui si vede che il marcatore ' +
      'manca, non che il blocco non funzioni: alcune piattaforme intercettano gli ' +
      'script in altro modo. La prova definitiva si ha caricando la pagina in un ' +
      'browser.</p>';
  }
  if (stato === 'nessun-consenso') {
    return '<p><b>Come si sistema.</b> Ci sono due strade, e la prima è quella ' +
      'che quasi nessuno considera: <b>togliere quello che non serve</b>. Molti ' +
      'siti caricano strumenti installati anni fa e mai più guardati. Quello che ' +
      'resta davvero necessario si mette dietro un sistema di consenso.</p>';
  }
  if (stato === 'banner-inutile') {
    return '<p><b>Come si sistema.</b> Se non ci sono servizi che richiedono il ' +
      'permesso, il banner si può togliere. Rallenta il caricamento e fa cliccare ' +
      'la gente per niente.</p>';
  }
  return '';
}

function riga(dati) {
  const parti = ['Letta la pagina indicata'];
  if (dati.policyLetta) parti.push('e l\'informativa privacy');
  else parti.push('· informativa non trovata');
  parti.push('· 45 servizi cercati, 17 piattaforme di consenso');
  return parti.join(' ');
}

function voce(colore, n, singolare, plurale) {
  if (!n) return '';
  return '<li><span class="tacca ' + colore + '"></span>' + n + ' ' +
    (n === 1 ? singolare : plurale) + '</li>';
}

function elenco(v) {
  if (!v.length) return '';
  if (v.length === 1) return T(v[0]);
  return v.slice(0, -1).map(T).join(', ') + ' e ' + T(v[v.length - 1]);
}

function tendina(titolo, dentro, aperta) {
  return '<details class="faq"' + (aperta ? '' : '') + '><summary>' +
    T(titolo) + '</summary>' + dentro + '</details>';
}

function T(v) {
  return String(v == null ? '' : v)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
