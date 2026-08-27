// cookie.js — la logica della pagina. Chiama /api/cookie e disegna il
// rapporto. Nessun Turnstile: questo strumento non chiama servizi a
// pagamento, quindi non c'e' niente da proteggere.

import { bloccoCookie } from './cookie-blocco.js';
import { normalizza, abilitaStampaTendine } from './posizioni-blocco.js';

const modulo = document.getElementById('modulo');
const campo = document.getElementById('indirizzo');
const pulsante = document.getElementById('avvia');
const esito = document.getElementById('esito');

let inCorso = false;

modulo.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (inCorso) return;

  const indirizzo = normalizza(campo.value);
  if (!indirizzo) {
    mostra('<div class="a11y-testata"><p class="a11y-quante">Scrivi l\'indirizzo ' +
      'del sito, per esempio iltuosito.it</p></div>');
    campo.focus();
    return;
  }

  inCorso = true;
  pulsante.disabled = true;
  pulsante.textContent = 'Sto guardando…';
  mostra('<div class="a11y-testata"><p class="a11y-quante">Scarico la pagina e ' +
    'cerco l\'informativa privacy…</p></div>');

  try {
    const r = await fetch('/api/cookie?url=' + encodeURIComponent(indirizzo));
    const dati = await r.json();
    mostra(bloccoCookie(dati));
  } catch (err) {
    mostra('<div class="a11y-testata"><p class="a11y-quante">Non sono riuscito a ' +
      'completare la verifica. Riprova fra poco.</p></div>');
  } finally {
    inCorso = false;
    pulsante.disabled = false;
    pulsante.textContent = 'Guarda cosa carica';
  }
});

function mostra(html) {
  esito.innerHTML = html;
  esito.classList.add('attivo');
  esito.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// Alla stampa le tendine si aprono da sole, cosi' il rapporto su carta e'
// completo. La funzione e' la stessa degli altri due strumenti: quel
// comportamento sta scritto in un posto solo.
abilitaStampaTendine();
