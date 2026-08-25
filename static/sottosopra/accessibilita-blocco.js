// accessibilita-blocco.js — il disegno del rapporto sull'accessibilita'.
//
// Stesso impianto del rapporto sulle posizioni: i numeri in chiaro, le
// spiegazioni dentro le tendine, gli stessi elementi <details> usati per i
// quarantotto controlli. Niente di nuovo da imparare per chi ha gia' visto
// l'altra pagina.
//
// Riceve l'esito aggregato di piu' pagine, non di una sola: i difetti di
// accessibilita' quasi sempre stanno nel modello, quindi vanno contati sul
// sito e non sulla singola pagina.

export const T = s => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const percorso = u => { try { return new URL(u).pathname || '/'; } catch { return u; } };

// Le tre gravita' sono quelle che usa gia' il resto dello strumento.
const ORDINE = { alto: 0, medio: 1, basso: 2 };
const ETICHETTA = { alto: 'Bloccante', medio: 'Da sistemare', basso: 'Da rifinire' };

export function fasciaVoto(v) {
  if (v == null) return 'fuori';
  if (v >= 90) return 'alto';
  if (v >= 70) return 'medio';
  return 'basso';
}

/**
 * @param {object} dati
 *   { voto, pagine: [...], esiti: {id:{quota,n,tot,esempi,...}},
 *     problemi: [{gravita,messaggio,dove}], fuoriPortata: [...] }
 */
export function bloccoAccessibilita(dati) {
  if (!dati || !dati.disponibile) {
    return '<h2>Accessibilità</h2><p class="posizioni-nota">' +
           T((dati && dati.motivo) || 'Controllo non eseguito.') + '</p>';
  }

  const tendina = (titolo, dentro, avviso) =>
    '<details><summary' + (avviso ? ' class="avviso"' : '') + '>' + T(titolo) +
    '</summary><div class="dentro">' + dentro + '</div></details>';

  let h = '<h2>Accessibilità</h2>';

  /* --- il voto e la ripartizione --------------------------------------- */

  const conta = { alto: 0, medio: 0, basso: 0 };
  for (const p of dati.problemi) conta[p.gravita] = (conta[p.gravita] || 0) + 1;
  const totali = conta.alto + conta.medio + conta.basso;

  h += '<div class="a11y-testata">' +
    '<div class="a11y-voto ' + fasciaVoto(dati.voto) + '">' +
      '<span class="numero">' + (dati.voto == null ? '—' : dati.voto) + '</span>' +
      '<span class="su">/100</span>' +
      '<span class="etichetta">conformità stimata</span>' +
    '</div>' +
    '<div class="a11y-riepilogo">' +
      barraGravita(conta, dati.controlliSuperati || 0) +
      '<ul class="a11y-legenda">' +
        vociLegenda(conta) +
      '</ul>' +
      '<p class="a11y-quante">' + quantePagine(dati) + ' · ' +
        (dati.controlliMisurati || 0) + ' controlli applicabili su 36</p>' +
    '</div>' +
  '</div>';

  /* --- l'avvertenza, che non e' una formalita' --------------------------- */

  h += '<p class="a11y-avvertenza"><b>Questo è un rilievo, non una ' +
    'certificazione.</b> Un controllo automatico vede quello che è verificabile ' +
    'nel codice: non può dire se un testo alternativo descrive davvero ' +
    'l\'immagine, né se la pagina si capisce. Nessuno strumento, questo compreso, ' +
    'può dichiarare un sito conforme.</p>';

  /* --- i problemi, dal piu' grave -------------------------------------- */

  if (!totali) {
    h += '<p class="a11y-pulito">Nessuno dei 36 controlli ha trovato difetti sulle pagine ' +
         'lette. Restano da verificare a mano le cose che un programma non vede: vedi in fondo.</p>';
  } else {
    const ordinati = dati.problemi.slice().sort((a, b) =>
      (ORDINE[a.gravita] - ORDINE[b.gravita]) || (b.n || 0) - (a.n || 0));

    h += '<div class="a11y-elenco">';
    for (const p of ordinati) {
      const esempi = (p.esempi || []).slice(0, 5);
      const dentro =
        '<p>' + T(p.perche || '') + '</p>' +
        (p.comeSi ? '<p><b>Come si sistema.</b> ' + T(p.comeSi) + '</p>' : '') +
        (esempi.length
          ? '<ul class="a11y-esempi">' +
            esempi.map(e => '<li><code>' + T(e) + '</code></li>').join('') +
            '</ul>'
          : '') +
        (p.dove && p.dove.length
          ? '<p class="a11y-dove">Trovato su: ' +
            p.dove.slice(0, 8).map(u => '<code>' + T(percorso(u)) + '</code>').join(' · ') +
            (p.dove.length > 8 ? ' e altre ' + (p.dove.length - 8) : '') + '</p>'
          : '');

      h += '<div class="a11y-voce ' + p.gravita + '">' +
        '<div class="a11y-capo">' +
          '<span class="marca">' + ETICHETTA[p.gravita] + '</span>' +
          '<span class="nome">' + T(p.titolo || p.messaggio) + '</span>' +
          (p.wcag ? '<span class="rif">WCAG ' + T(p.wcag) + '</span>' : '') +
        '</div>' +
        '<p class="a11y-quanti">' + T(p.messaggio) + '</p>' +
        tendina('Perché conta e come si sistema', dentro) +
      '</div>';
    }
    h += '</div>';
  }

  /* --- quello che qui non si puo' misurare ------------------------------ */

  if (dati.fuoriPortata && dati.fuoriPortata.length) {
    const dentro = '<p>Tre requisiti WCAG dipendono dai colori calcolati dal browser, che ' +
      'nell\'HTML scaricato dal server non esistono: dipendono dal CSS applicato, ' +
      'dall\'ereditarietà e dalla cascata. Non è una mancanza di questo controllo, ' +
      'è una impossibilità del terreno.</p><ul class="a11y-esempi">' +
      dati.fuoriPortata.map(f =>
        '<li><b>' + T(f.nome) + '</b> — ' + T(f.perche) + '</li>').join('') +
      '</ul><p>Per questi serve l\'<a href="/estensione/">estensione per il browser</a>, ' +
      'dove la pagina è già disegnata e i colori si possono leggere davvero.</p>';
    h += tendina('Tre cose che questa pagina non può controllare', dentro, true);
  }

  return h;
}

/* --- pezzi di disegno ---------------------------------------------------- */

// Se il sito ha piu' pagine di quante ne sono state lette, va scritto. Un
// conteggio presentato come completo quando non lo e' fa prendere decisioni
// sbagliate: e' l'errore che rimproveriamo agli altri strumenti.
function quantePagine(dati) {
  const lette = dati.pagine.length;
  const trovate = dati.trovate || lette;
  if (trovate > lette) {
    return 'Lette ' + lette + ' pagine su ' + trovate +
           ' — i conteggi qui sotto riguardano solo quelle lette';
  }
  return 'Lette ' + lette + (lette === 1 ? ' pagina' : ' pagine') + ', tutte quelle trovate';
}

function barraGravita(conta, superati) {
  const peso = { alto: 10, medio: 4, basso: 1 };
  const parti = ['alto', 'medio', 'basso']
    .map(g => ({ g, v: (conta[g] || 0) * peso[g] }))
    .filter(x => x.v > 0);
  const somma = parti.reduce((s, x) => s + x.v, 0);
  const quotaOk = Math.max(12, superati * 2);
  const tot = somma + quotaOk;

  let barra = '<div class="a11y-barra" role="img" aria-label="' +
    (conta.alto || 0) + ' problemi bloccanti, ' + (conta.medio || 0) +
    ' da sistemare, ' + (conta.basso || 0) + ' da rifinire">';
  for (const x of parti) {
    barra += '<span class="p-' + x.g + '" style="width:' +
      (x.v / tot * 100).toFixed(1) + '%"></span>';
  }
  barra += '<span class="p-ok" style="width:' + (quotaOk / tot * 100).toFixed(1) + '%"></span>';
  return barra + '</div>';
}

function vociLegenda(conta) {
  return ['alto', 'medio', 'basso'].map(g =>
    '<li><span class="tacca p-' + g + '"></span>' +
    '<b>' + (conta[g] || 0) + '</b> <span class="q">' +
    (g === 'alto' ? 'bloccanti' : g === 'medio' ? 'da sistemare' : 'da rifinire') +
    '</span></li>').join('');
}
