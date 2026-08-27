// cookie-blocco.js — disegna il rapporto. Stesse classi degli altri
// strumenti: il foglio di stile e' quello condiviso, qui non c'e' CSS.
//
// La regola che governa tutti i testi di questa pagina: DIRE COSA SI TROVA,
// MAI COSA COMPORTA. "Il sito carica Meta Pixel e l'informativa non lo
// nomina" e' un fatto verificabile da chiunque. "Il tuo sito non e' a norma"
// e' una consulenza legale che non possiamo dare, e che dipende da cento
// cose che uno strumento non vede.

const ETICHETTA = { alto: 'Da vedere', medio: 'Da sapere', basso: 'Da rifinire' };

// La ruota del punteggio. Stessa costruzione di quella dell'analisi
// completa: un cerchio di sfondo e un arco proporzionale.
//
// NON si chiama "conformità". Misura quanto è pulito il sito in quello
// che si vede dal codice — che è una cosa diversa dall'essere a norma, e
// la pagina lo ripete in tre punti. Un numero che sembra un voto di
// legalità, su un tema sanzionabile, è una promessa che non possiamo fare.
function ruota(punti) {
  const R = 46, C = 2 * Math.PI * R;
  const q = Math.max(0, Math.min(100, punti)) / 100;
  const liv = punti >= 85 ? 'alto' : punti >= 55 ? 'medio' : 'basso';
  return '<svg class="ck-ruota ' + liv + '" width="128" height="128" viewBox="0 0 128 128" ' +
    'role="img" aria-label="Punteggio: ' + punti + ' su 100">' +
    '<circle cx="64" cy="64" r="' + R + '" fill="none" stroke="var(--linea)" stroke-width="9"/>' +
    (q > 0 ? '<circle cx="64" cy="64" r="' + R + '" fill="none" stroke="currentColor" ' +
      'stroke-width="9" stroke-linecap="round" stroke-dasharray="' +
      (C * q).toFixed(1) + ' ' + C.toFixed(1) + '" transform="rotate(-90 64 64)"/>' : '') +
    '<text x="64" y="70" text-anchor="middle" fill="currentColor" ' +
    'style="font-size:34px;font-weight:700">' + punti + '</text>' +
    '<text x="64" y="88" text-anchor="middle" fill="var(--grafite)" ' +
    'style="font-size:11px;letter-spacing:.08em">SU 100</text></svg>';
}


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
    '<div class="ck-punteggio">' +
      ruota(dati.punteggio) +
      '<span class="etichetta">igiene del sito</span>' +
    '</div>' +
    '<div class="a11y-riepilogo">' +
      '<ul class="a11y-legenda">' +
        (quanti
          ? voce('g2', quanti, 'servizio richiede il consenso',
                 'servizi richiedono il consenso')
          : '<li><span class="tacca g1"></span>nessun servizio richiede il consenso</li>') +
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

  /* --- se non si e' visto abbastanza, si dice PRIMA di tutto ------------ */
  // Un rapporto che dice "pulito" quando semplicemente non ha potuto
  // guardare e' peggio di nessun rapporto: rassicura chi ha un problema.
  if (dati.visibilita && dati.visibilita.livello !== 'buono') {
    h += '<div class="ck-visibilita ' + dati.visibilita.livello + '">' +
      '<b>' + (dati.visibilita.livello === 'poco'
        ? 'Di questo sito si vede poco da qui'
        : 'Di questo sito si vede solo una parte') + '</b>' +
      '<p>' + T(dati.visibilita.perche) + '</p>' +
      // L'avviso da solo lascia la domanda "e quindi cosa devo fare?".
      // Non si puo' rispondere in termini legali, ma la cosa concreta da
      // fare c'e' ed e' sempre la stessa.
      '<p class="ck-quindi"><b>Cosa fare.</b> Apri l\'elenco dei domini qui ' +
      'sotto: per la maggior parte c\'è scritto a cosa servono. Quelli di ' +
      'pubblicità e di misura sono i primi da guardare. Se non li avevi ' +
      'messi tu, chiedi a chi ti ha fatto il sito cosa sono e perché ci ' +
      'sono: è una domanda legittima, e la risposta ti serve per scrivere ' +
      'l\'informativa.</p>' +
    '</div>';
  }

  /* --- il confronto, prima di tutto: e' quello che si vuole vedere ------ */
  h += tabellaConfronto(dati);
  h += elencoDomini(dati);

  /* --- lo stato, sempre, anche quando e' buono -------------------------- */
  h += '<div class="a11y-elenco">';
  h += '<div class="a11y-voce ' + gravitaStato(dati.stato) + '">' +
    '<div class="a11y-capo">' +
      '<span class="marca">' + ETICHETTA[gravitaStato(dati.stato)] + '</span>' +
      '<span class="nome">' + T(titoloStato(dati.stato)) + '</span>' +
    '</div>' +
    '<p class="a11y-quanti">' + T(dati.spiegazione) + '</p>' +
    (comeSiSistema(dati.stato)
      ? tendina('Come si sistema', comeSiSistema(dati.stato))
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
  // Non e' una tendina da nascondere: e' meta' del quadro, e chi legge deve
  // sapere che esiste un pezzo mancante e chi lo colmera'. Il richiamo
  // all'estensione sta qui e non altrove, perche' qui ha un motivo.
  if (dati.fuoriPortata && dati.fuoriPortata.length) {
    h += '<div class="ck-browser">' +
      '<h3>Cinque cose che si vedono solo nel browser' +
        '<span class="ck-arrivo">In arrivo</span></h3>' +
      '<p>Il rapporto qui sopra legge il codice che il server consegna. Ma i ' +
      'cookie non stanno nel codice: nascono quando gli script girano. ' +
      'Queste cinque verifiche, compreso <b>il testo che il banner mostra ' +
      'davvero</b>, si possono fare solo a pagina viva.</p>' +
      '<ul class="a11y-esempi">' +
        dati.fuoriPortata.map(f =>
          '<li><b>' + T(f.nome) + '</b> — ' + T(f.perche) + '</li>').join('') +
      '</ul>' +
      '<p class="ck-quando">Le farà l\'estensione. Oggi esegue i 48 controlli ' +
      'tecnici e di posizionamento; la parte sui cookie sta arrivando.</p>' +
      '<p class="ck-bottone"><a href="/estensione/">Guarda l\'estensione</a></p>' +
    '</div>';
  }

  return h;
}


/* --- la tabella del confronto --------------------------------------------
   E' il cuore del rapporto: una riga per servizio, e per ognuna cosa dice
   il codice, cosa dice il banner, cosa dice l'informativa.

   Le tre colonne rispondono a tre domande diverse, e vanno tenute separate
   perche' un servizio puo' essere dichiarato nell'informativa e non
   bloccato dal banner, o viceversa. Metterle insieme in un giudizio unico
   nasconderebbe proprio il caso interessante.

   IL TESTO DEL BANNER NON SI LEGGE DA QUI: lo scrive JavaScript quando la
   pagina gira. Quello che si legge e' la CATEGORIA con cui il sito marca
   ogni script, che dice quali servizi dichiara di sottoporre al permesso. */
function tabellaConfronto(dati) {
  if (!dati.trovati.length) return '';

  const conPolicy = dati.policyLetta;
  let h = '<div class="ck-tabella"><table>' +
    '<caption>Cosa carica il sito, e cosa ne dicono banner e informativa</caption>' +
    '<thead><tr>' +
      '<th scope="col">Servizio</th>' +
      '<th scope="col">Serve il consenso</th>' +
      '<th scope="col">Aspetta il consenso</th>' +
      '<th scope="col">Nell\'informativa</th>' +
    '</tr></thead><tbody>';

  for (const t of dati.trovati) {
    h += '<tr>' +
      '<td><b>' + T(t.nome) + '</b><span class="ck-impronta">' + T(t.impronta) + '</span></td>' +
      '<td>' + (t.chiedeConsenso ? segno('si', 'Sì') : segno('no', 'No')) + '</td>' +
      // "sospeso" era gergo mio: nessuno direbbe cosi'. Qui la colonna dice
      // cosa fa il servizio, e il valore e' una frase che si legge da sola
      // senza tornare all'intestazione.
      '<td>' + (!t.chiedeConsenso
          ? segno('vuoto', 'non serve')
          : t.sospeso
            ? segno('si', t.categoria ? 'sì · ' + T(t.categoria) : 'sì, aspetta')
            : segno('no', 'no, parte subito')) + '</td>' +
      '<td>' + (!conPolicy
          ? segno('vuoto', 'non letta')
          : t.dichiarato ? segno('si', 'nominato') : segno('no', 'assente')) + '</td>' +
    '</tr>';
  }

  h += '</tbody></table>';

  if (dati.piattaforme.length) {
    h += '<p class="ck-sotto"><b>Piattaforma di consenso:</b> ' +
      elenco(dati.piattaforme) + '.</p>';
  } else {
    h += '<p class="ck-sotto">Nessuna piattaforma di consenso trovata nel codice.</p>';
  }

  h += '<p class="ck-sotto"><b>Cosa vuol dire «aspetta il consenso».</b> Una ' +
    'piattaforma configurata bene non carica gli script: li tiene fermi e li ' +
    'fa partire solo dopo che il visitatore ha accettato. Quando succede, il ' +
    'codice lo dichiara, e spesso dice anche in quale categoria.</p>' +
    '<p class="ck-sotto"><b>Il limite.</b> Da qui si legge cosa il sito ' +
    '<i>dichiara</i>, non il testo che il visitatore vede nel banner né se il ' +
    'blocco funzioni davvero. Quello lo scrive JavaScript quando la pagina ' +
    'gira nel browser.</p>';

  return h + '</div>';
}

function segno(tipo, testo) {
  return '<span class="ck-segno ' + tipo + '">' + T(testo) + '</span>';
}


/* --- tutti i domini esterni ----------------------------------------------
   Il dato che rendeva scarno il rapporto quando mancava: se una pagina
   contatta ventisette domini di terze parti, quello E' il rapporto, anche
   senza sapere cosa sia ognuno.

   I riconosciuti stanno gia' nella tabella sopra. Qui ci sono gli altri:
   non so cosa siano, e lo dico — ma dico che ci sono. */
function elencoDomini(dati) {
  if (!dati.sconosciuti || !dati.sconosciuti.length) return '';

  // Quelli di cui so dire a cosa servono, e i pochi che restano davvero
  // ignoti. Prima diceva "non so cosa siano" per tutti: un elenco che a
  // chi ha il sito non serviva, perche' cercarseli non e' il suo mestiere.
  const spiegati = dati.sconosciuti.filter(d => d.cosa);
  const ignoti = dati.sconosciuti.filter(d => !d.cosa);

  // raggruppo per cosa fanno: e' l'ordine in cui uno se ne preoccupa
  const ordine = ['pubblicita', 'sessione', 'misura', 'social', 'video',
                  'contatto', 'incorporato', 'consenso', 'tecnico'];
  const titoli = {
    pubblicita: 'Pubblicità e profilazione',
    sessione: 'Registrazione del comportamento',
    misura: 'Misura del traffico',
    social: 'Social',
    video: 'Video',
    contatto: 'Contatti e newsletter',
    incorporato: 'Contenuti incorporati',
    consenso: 'Gestione del consenso',
    tecnico: 'Tecnici e di servizio',
  };

  const gruppi = {};
  for (const d of spiegati) (gruppi[d.genere] = gruppi[d.genere] || []).push(d);

  let dentro = '<p>Oltre a quelli riconosciuti per nome, la pagina contatta ' +
    'altri ' + dati.sconosciuti.length + ' domini di terze parti. Per la ' +
    'maggior parte so dirti a cosa servono.</p>';

  for (const g of ordine) {
    if (!gruppi[g]) continue;
    dentro += '<p class="ck-gruppo-dom"><b>' + T(titoli[g]) + '</b>' +
      (gruppi[g][0].nota ? '<span>' + T(gruppi[g][0].nota) + '</span>' : '') +
      '</p><ul class="a11y-esempi">' +
      gruppi[g].map(d =>
        '<li><span class="a11y-dove">' + T(d.dominio) + '</span> — ' +
        T(d.cosa) + (d.volte > 1 ? ' <b>×' + d.volte + '</b>' : '') + '</li>'
      ).join('') + '</ul>';
  }

  if (ignoti.length) {
    dentro += '<p class="ck-gruppo-dom"><b>Questi non li conosco</b>' +
      '<span>Sono ' + ignoti.length + ': pochi, e sono quelli su cui vale la ' +
      'pena chiedere a chi ti ha fatto il sito cosa siano e perché ci sono.' +
      '</span></p><ul class="a11y-esempi">' +
      ignoti.slice(0, 15).map(d =>
        '<li><span class="a11y-dove">' + T(d.dominio) + '</span>' +
        (d.volte > 1 ? ' <b>×' + d.volte + '</b>' : '') + '</li>').join('') +
      (ignoti.length > 15 ? '<li>…e altri ' + (ignoti.length - 15) + '</li>' : '') +
      '</ul>';
  }

  dentro += '<p>Tutti questi, per caricarsi, ricevono almeno l\'indirizzo IP ' +
    'di chi visita il sito. Quelli marcati come da consenso vanno anche ' +
    'sottoposti al permesso prima di partire.</p>';

  return tendina(dati.sconosciuti.length + ' altri domini contattati, e cosa fanno', dentro);
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
        'siano dichiarati: è il controllo che vale di più, e resta senza risposta.</p>',
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
    'banner-decorativo': 'Il banner c\'è, ma i tracciatori partono lo stesso',
    'probabilmente-a-posto': 'Il consenso sembra configurato correttamente',
    'banner-inutile': 'C\'è un banner, ma non c\'è niente da chiedere',
    'non-si-vede': 'Da qui non si vede abbastanza per dire com\'è messo',
  }[stato] || 'Situazione non riconosciuta';
}

function gravitaStato(stato) {
  return {
    'niente-da-chiedere': 'basso',
    'probabilmente-a-posto': 'basso',
    'non-si-vede': 'medio',
    'banner-inutile': 'medio',
    'nessun-consenso': 'alto',
    'banner-decorativo': 'alto',
  }[stato] || 'medio';
}

function fascia(stato) {
  return (stato === 'niente-da-chiedere' || stato === 'probabilmente-a-posto')
    ? 'alto' : (stato === 'banner-inutile' || stato === 'non-si-vede' ? 'medio' : 'basso');
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
  const n = dati.paginelette || 1;
  const parti = [n === 1 ? 'Letta 1 pagina' : 'Lette ' + n + ' pagine'];
  if (dati.quantiDomini) parti.push('· ' + dati.quantiDomini + ' domini esterni contattati');
  if (dati.policyLetta) {
    parti.push('· informativa letta' +
      (dati.comeTrovata === 'indirizzo consueto' ? ' (trovata per tentativi)' : ''));
  } else {
    parti.push('· informativa non trovata');
  }
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
