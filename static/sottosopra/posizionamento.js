// posizionamento.js — la pagina veloce: solo le posizioni su Google.
//
// Non scansiona niente. Non chiama /api/scopri, /api/pagina, /api/lighthouse.
// Una sola richiesta a /api/posizioni, e il rapporto lo disegna la stessa
// funzione che usa l'analisi completa: sta in posizioni-blocco.js, importata
// da tutte e due. Una copia sola, un posto solo da correggere.

import { bloccoPosizioni, normalizza, abilitaStampaTendine } from './posizioni-blocco.js';

const modulo = document.getElementById('modulo');
const campo = document.getElementById('indirizzo');
const campoParole = document.getElementById('parole');
const campoLuogo = document.getElementById('luogo');
const bottone = document.getElementById('avvia');
const avanzamento = document.getElementById('avanzamento');
const riempimento = document.getElementById('riempimento');
const passo = document.getElementById('passo');
const zonaErrore = document.getElementById('zonaErrore');
const esito = document.getElementById('esito');

abilitaStampaTendine();

function errore(html) {
  zonaErrore.innerHTML = '<div class="errore">' + html + '</div>';
}

// La barra non ha tappe vere da segnare: c'e' una chiamata sola. Avanza a
// tempo per dire che qualcosa sta succedendo, e non finge di sapere quanto
// manca.
let orologio = null;
function avviaAttesa() {
  let quota = 8;
  avanzamento.classList.add('attivo');
  riempimento.style.width = quota + '%';
  passo.textContent = 'Interrogo Google…';
  orologio = setInterval(() => {
    quota = Math.min(92, quota + 4);
    riempimento.style.width = quota + '%';
    if (quota > 55) passo.textContent = 'Ancora un momento: la ricerca locale è la più lenta…';
  }, 700);
}
function fermaAttesa() {
  if (orologio) { clearInterval(orologio); orologio = null; }
  riempimento.style.width = '100%';
  setTimeout(() => avanzamento.classList.remove('attivo'), 250);
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

  const parole = (campoParole.value || '').trim();
  if (!parole) {
    errore('<b>Serve almeno una parola chiave.</b> Scrivi quella con cui un cliente ti ' +
           'cercherebbe: non il nome della tua azienda, su quello sei primo per forza.');
    campoParole.focus();
    return;
  }

  // Il token della verifica anti-abuso, creato dal widget di Turnstile. Senza,
  // l'endpoint rifiuta: meglio dirlo qui che far partire una richiesta persa.
  const campoToken = document.querySelector('input[name="cf-turnstile-response"]');
  const token = campoToken ? campoToken.value : '';
  if (!token) {
    errore('<b>Completa la verifica "sei una persona"</b> qui sopra, poi riprova. ' +
           'Serve perché questo controllo interroga un servizio a pagamento.');
    return;
  }

  const citta = (campoLuogo.value || '').trim();

  bottone.disabled = true;
  avviaAttesa();

  let dati;
  try {
    const risposta = await fetch(
      '/api/posizioni?sito=' + encodeURIComponent(indirizzo) +
      '&parole=' + encodeURIComponent(parole) +
      (citta ? '&citta=' + encodeURIComponent(citta) : ''),
      { headers: { 'X-Turnstile-Token': token } });
    dati = JSON.parse(await risposta.text());
  } catch {
    dati = { disponibile: false, motivo: 'Controllo posizioni non riuscito.' };
  }

  fermaAttesa();
  bottone.disabled = false;

  // Il token vale una volta sola: dopo l'uso il widget va rigenerato, altrimenti
  // la seconda analisi fallisce con "verifica scaduta" e sembra un guasto.
  if (window.turnstile) { try { window.turnstile.reset(); } catch { /* niente */ } }

  esito.innerHTML = bloccoPosizioni(dati);
  esito.classList.add('attivo');
  esito.scrollIntoView({ behavior: 'smooth', block: 'start' });
});
