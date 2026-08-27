// contatto.js — riceve i moduli del sito e manda l'email. Niente altro.
//
// PERCHE' ESISTE. Prima i moduli passavano da Formspree: nome, email,
// telefono e messaggio di chi scriveva finivano sui server di una societa'
// statunitense, che li conservava, prima di arrivare in casella.
//
// Adesso la richiesta arriva qui, questa funzione compone l'email e la
// spedisce con Cloudflare Email Service. NESSUNO LA MEMORIZZA: non c'e'
// database, non c'e' registro, non c'e' un terzo fornitore. Nella privacy
// sparisce un nome.
//
// PERCHE' PASSA DA UN WORKER. Il collegamento nativo alla posta esiste
// per i Worker, non per le Functions di Pages: nel loro pannello non c'e',
// ed e' cosi' da anni. La REST API di Email Service farebbe lo stesso
// lavoro senza intermediari, ma richiede il piano a pagamento.
//
// L'invio verso un indirizzo gia' verificato tramite il collegamento
// nativo e' invece gratuito su tutti i piani. Quindi: questa funzione
// compone il messaggio e lo passa a un Worker minuscolo che lo spedisce.
//
// Il passaggio fra i due NON attraversa internet: e' un Binding di
// servizi, un collegamento interno a Cloudflare. Il Worker non ha rotte
// pubbliche e non e' raggiungibile da fuori.
//
// COSA SERVE PERCHE' FUNZIONI (tutto dal pannello)
//   1. il Worker "postino" pubblicato
//   2. un Binding di servizi su questo progetto Pages, chiamato POSTINO,
//      che punta a quel Worker
//
// Se manca, la funzione NON finge di aver spedito: lo dice, e invita a
// scrivere direttamente. Un modulo che sembra funzionare e non manda
// niente fa perdere richieste vere senza che nessuno se ne accorga.

const RITORNO = 'https://puntowebferrara.com/grazie/';

// Solo questi campi finiscono nell'email. Un elenco chiuso invece di
// "tutto quello che arriva": se qualcuno inietta campi extra nel modulo,
// non li legge nessuno.
const CAMPI = {
  name: 'Nome',
  business: 'Attività',
  email: 'Email',
  phone: 'Telefono',
  service: 'Servizio richiesto',
  budget: 'Budget',
  'current-site': 'Sito attuale',
  message: 'Messaggio',
};

const MAX = 4000;   // per campo: oltre e' spam, non un messaggio

export async function onRequestPost(context) {
  let modulo;
  try {
    modulo = await context.request.formData();
  } catch {
    return errore(400, 'Richiesta non valida.');
  }

  // --- la trappola antispam -------------------------------------------
  // Un campo nascosto che nessuna persona compila: se e' pieno, e' un
  // programma. Si risponde come se fosse andato tutto bene, cosi' chi
  // manda spam non capisce di essere stato scartato e non riprova.
  if ((modulo.get('_gotcha') || '').trim()) return vaiA(RITORNO);

  // --- i campi obbligatori --------------------------------------------
  const nome = pulisci(modulo.get('name'));
  const email = pulisci(modulo.get('email'));
  const messaggio = pulisci(modulo.get('message'));

  if (!nome || !email || !messaggio) {
    return errore(400, 'Mancano nome, email o messaggio. Torna indietro, ' +
      'completa i campi e riprova: quello che avevi scritto è ancora lì.');
  }
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(email)) {
    return errore(400, 'L\'indirizzo email non sembra valido. Controllalo e riprova.');
  }

  // --- il corpo dell'email --------------------------------------------
  const quale = pulisci(modulo.get('_form')) || 'sito';
  const righe = [];
  for (const chiave of Object.keys(CAMPI)) {
    const v = pulisci(modulo.get(chiave));
    if (v) righe.push(CAMPI[chiave] + ': ' + v);
  }
  righe.push('');
  righe.push('—');
  righe.push('Modulo: ' + quale);
  righe.push('Data: ' + new Date().toLocaleString('it-IT', { timeZone: 'Europe/Rome' }));

  const oggetto = (pulisci(modulo.get('_subject')) || 'Messaggio dal sito') + ' — ' + nome;

  // --- la spedizione ---------------------------------------------------
  if (!context.env.POSTINO) {
    return errore(500,
      'Il modulo non è configurato correttamente e il messaggio non è stato ' +
      'inviato. Scrivi direttamente a info@puntowebferrara.com — mi dispiace ' +
      'per il disturbo.');
  }

  try {
    // L'indirizzo non conta: la richiesta non esce da Cloudflare e arriva
    // al Worker collegato, qualunque URL si scriva.
    const r = await context.env.POSTINO.fetch('https://postino/invia', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        oggetto,
        testo: righe.join('\n'),
        rispondiA: email,
      }),
    });
    if (!r.ok) {
      return errore(502,
        'Invio non riuscito. Scrivi a info@puntowebferrara.com oppure ' +
        'riprova fra qualche minuto.');
    }
  } catch {
    return errore(502,
      'Invio non riuscito. Scrivi a info@puntowebferrara.com oppure ' +
      'riprova fra qualche minuto.');
  }

  return vaiA(pulisci(modulo.get('_next')) || RITORNO);
}

// Un GET su questo indirizzo non ha senso: si rimanda ai contatti.
export function onRequestGet() {
  return vaiA('https://puntowebferrara.com/contatti/');
}

/* --- utilita' ---------------------------------------------------------- */

function pulisci(v) {
  return String(v == null ? '' : v)
    .replace(/[\r\n]+/g, ' ')      // niente a capo: si iniettano intestazioni
    .trim()
    .slice(0, MAX);
}

// Il modulo e' un POST normale, senza JavaScript: la risposta giusta e' un
// rimando alla pagina di ringraziamento, come faceva Formspree.
function vaiA(url) {
  return new Response(null, { status: 303, headers: { Location: url } });
}

// Una pagina di errore leggibile, non un foglio bianco con un codice.
function errore(stato, testo) {
  const html = '<!DOCTYPE html><html lang="it"><head><meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<meta name="robots" content="noindex"><title>Messaggio non inviato</title>' +
    '<style>body{margin:0;min-height:100vh;display:flex;align-items:center;' +
    'justify-content:center;background:#f3f4f6;font-family:system-ui,-apple-system,' +
    '"Segoe UI",Roboto,sans-serif;color:#1f2937;padding:20px}' +
    '.c{background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:32px;' +
    'max-width:520px}h1{font-size:1.3rem;margin:0 0 12px;color:#0d4275;line-height:1.3}' +
    'p{margin:0 0 16px;line-height:1.6}a{color:#0d6b58;font-weight:600}' +
    'a:focus-visible{outline:2px solid #0d6b58;outline-offset:2px}</style>' +
    '</head><body><main class="c"><h1>Il messaggio non è stato inviato</h1>' +
    '<p>' + testo + '</p>' +
    '<p><a href="/contatti/">Torna ai contatti</a></p></main></body></html>';
  return new Response(html, {
    status: stato,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}
