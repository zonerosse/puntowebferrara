// accessibilita.js — la pagina che verifica l'accessibilita' di un sito.
//
// Stessa sequenza dell'analisi completa: prima /api/scopri, che rispetta il
// robots.txt e restituisce l'elenco delle pagine, poi una chiamata per pagina.
//
// QUANTE PAGINE. Duecento, lo stesso tetto dell'analisi tecnica: cosi' i due
// strumenti si comportano allo stesso modo e non serve ricordarsi che uno
// campiona e l'altro no. Duecento pagine sono 201 invocazioni, e il piano
// gratuito ne concede centomila al giorno.
//
// Quando il tetto scatta, le pagine si prendono a distanza costante lungo
// l'elenco e non le prime cento in fila: le prime di un sito si somigliano
// tutte, e un campione preso da punti diversi descrive meglio l'insieme.

import { bloccoAccessibilita } from './accessibilita-blocco.js';
import { normalizza, abilitaStampaTendine } from './posizioni-blocco.js';
import { SCHEDE } from './accessibilita-schede.js';

const MAX_PAGINE = 200;
const OPERAI = 4;

const $ = id => document.getElementById(id);
const modulo = $('modulo'), campo = $('indirizzo'), bottone = $('avvia');
const avanzamento = $('avanzamento'), riempimento = $('riempimento'), passo = $('passo');
const zonaErrore = $('zonaErrore'), esito = $('esito');

abilitaStampaTendine();

function avanza(fatte, totale, testo) {
  avanzamento.classList.add('attivo');
  riempimento.style.width = Math.round(fatte / Math.max(1, totale) * 100) + '%';
  passo.textContent = testo;
}

function errore(html) {
  zonaErrore.innerHTML = '<div class="errore">' + html + '</div>';
}

// Prese a distanza costante lungo l'elenco, non le prime in fila: le prime
// sono quasi sempre home, chi siamo e contatti, che si somigliano fra loro.
// Su un sito sotto le cento pagine questa funzione le restituisce tutte.
function campiona(pagine, quante) {
  if (pagine.length <= quante) return pagine.slice();
  const passo = pagine.length / quante;
  const fuori = [];
  for (let i = 0; i < quante; i++) fuori.push(pagine[Math.floor(i * passo)]);
  return fuori;
}

modulo.addEventListener('submit', async e => {
  e.preventDefault();
  zonaErrore.innerHTML = '';
  esito.classList.remove('attivo');

  const indirizzo = normalizza(campo.value);
  if (!indirizzo) {
    errore('<b>Non riconosco questo indirizzo.</b> Scrivi il dominio, per esempio ' +
           '<code>iltuosito.it</code>. Il resto lo aggiungo io.');
    campo.focus();
    return;
  }
  campo.value = indirizzo;

  bottone.disabled = true;
  avanza(0, 1, 'Cerco le pagine del sito…');

  // --- 1. scoperta -------------------------------------------------------
  let scoperta;
  try {
    const r = await fetch('/api/scopri?url=' + encodeURIComponent(indirizzo));
    const grezzo = await r.text();
    try { scoperta = JSON.parse(grezzo); }
    catch { throw new Error('il server ha interrotto l\'analisi di questo sito.'); }
    if (scoperta.errore) throw new Error(scoperta.errore);
  } catch (err) {
    const vietato = /robots\.txt/i.test(err.message);
    errore('<b>' + (vietato ? 'Questo sito vieta la scansione.' : 'Non riesco a leggere il sito.') +
      '</b> ' + (vietato
        ? 'Il suo robots.txt dice di non entrare, e lo strumento si ferma: è una scelta ' +
          'del sito e va rispettata anche quando tecnicamente si potrebbe proseguire.'
        : String(err.message)));
    avanzamento.classList.remove('attivo');
    bottone.disabled = false;
    return;
  }

  // --- 2. le pagine da leggere -------------------------------------------
  const tutte = (scoperta.pagine && scoperta.pagine.length)
    ? scoperta.pagine : [scoperta.sito + '/'];
  const pagine = campiona(tutte, MAX_PAGINE);

  const risultati = [];
  let fatte = 0;
  const coda = pagine.slice();

  async function operaio() {
    while (coda.length) {
      const u = coda.shift();
      try {
        const r = await fetch('/api/accessibilita?url=' + encodeURIComponent(u));
        risultati.push(JSON.parse(await r.text()));
      } catch {
        risultati.push({ url: u, errore: 'Pagina non analizzabile' });
      }
      avanza(++fatte, pagine.length,
        'Lette ' + fatte + ' pagine su ' + pagine.length + '…');
    }
  }
  await Promise.all(Array.from({ length: OPERAI }, operaio));

  // --- 3. aggregazione ----------------------------------------------------
  const buone = risultati.filter(r => !r.errore && r.esiti);
  avanzamento.classList.remove('attivo');
  bottone.disabled = false;

  if (!buone.length) {
    errore('<b>Nessuna pagina è stata analizzata.</b> Il sito risponde, ma le pagine ' +
           'trovate non sono leggibili: possono essere protette, oppure costruite ' +
           'interamente con JavaScript. In quel caso serve ' +
           '<a href="/estensione/">l\'estensione per il browser</a>.');
    return;
  }

  esito.innerHTML = bloccoAccessibilita(aggrega(buone, scoperta, tutte.length));
  esito.classList.add('attivo');
  esito.scrollIntoView({ behavior: 'smooth', block: 'start' });
});

/* ------------------------------------------------------------------------
   Aggregazione. Un controllo che fallisce sulla meta' delle pagine e' un
   difetto del modello, e va detto una volta sola con scritto su quante
   pagine ricorre — non una volta per pagina.
   ------------------------------------------------------------------------ */
function aggrega(pagine, scoperta, totaleTrovate) {
  const per = {};   // id -> { n, tot, pagineRotte:[], esempi:[] }

  for (const p of pagine) {
    for (const id of Object.keys(p.esiti)) {
      const e = p.esiti[id];
      if (e.quota == null) continue;              // non applicabile a questa pagina
      const acc = per[id] || (per[id] = { quota: 0, misurate: 0, n: 0, tot: 0,
                                          dove: [], esempi: [] });
      acc.quota += e.quota;
      acc.misurate++;
      acc.n += e.n || 0;
      acc.tot += e.tot || 0;
      if (e.quota < 0.999) {
        acc.dove.push(p.url);
        for (const x of (e.esempi || [])) {
          if (acc.esempi.length < 6 && acc.esempi.indexOf(x) === -1) acc.esempi.push(x);
        }
      }
    }
  }

  const problemi = [];
  let somma = 0, misurati = 0, superati = 0;

  for (const id of Object.keys(per)) {
    const a = per[id];
    const media = a.quota / a.misurate;
    somma += media; misurati++;
    if (media > 0.999) { superati++; continue; }

    const s = SCHEDE[id];
    if (!s) continue;                              // controllo senza scheda: si salta

    problemi.push({
      id,
      gravita: s.gravita,
      titolo: s.titolo,
      wcag: s.wcag,
      perche: s.perche,
      comeSi: s.comeSi,
      n: a.n,
      dove: a.dove,
      esempi: a.esempi,
      messaggio: s.messaggio(a.n, a.tot, a.dove.length, pagine.length),
    });
  }

  return {
    disponibile: true,
    sito: scoperta.sito,
    pagine: pagine.map(p => p.url),
    // Quante ne ha trovate in tutto: se sono piu' di quelle lette, il rapporto
    // deve dirlo. Scrivere "lette 200 pagine" su un sito che ne ha 340 e' il
    // difetto che rimproveriamo agli altri strumenti.
    trovate: totaleTrovate,
    voto: misurati ? Math.round(somma / misurati * 100) : null,
    controlliMisurati: misurati,
    controlliSuperati: superati,
    problemi,
    fuoriPortata: pagine[0].fuoriPortata || [],
  };
}
