// posizioni.js — a che posizione sta il sito, per le parole chiave che
// l'utente scrive lui, in Italia e — se lo chiede — anche in una città.
//
// Google non ha un'API per leggere le proprie SERP: bisogna passare da un
// fornitore di dati che le interroga al posto nostro. Qui si usa DataForSEO,
// modalità "live advanced": risponde in pochi secondi, che è l'unica cosa
// compatibile con qualcuno che aspetta davanti allo schermo.
//
// LE DUE RICERCHE INSIEME. La nazionale si fa sempre; la locale solo se
// arriva il parametro "citta". Partono nella stessa richiesta, quindi si
// aspetta una volta sola, e il rapporto le mette affiancate. È il confronto
// a dire qualcosa: sedicesimo in Italia e terzo a Ferrara vuol dire che il
// territorio va difeso, non che la parola chiave è persa.
//
// Servono due variabili d'ambiente nel progetto Cloudflare Pages:
//   DFS_LOGIN    — l'indirizzo email dell'account DataForSEO
//   DFS_PASSWORD — la "API password", che NON è la password dell'account:
//                  sta nel pannello, sotto API Settings.
// Senza le due variabili l'endpoint risponde "non configurato" e il resto
// dello strumento continua a funzionare esattamente come prima.
//
// QUANTO COSTA. Si paga a consumo. L'unità fatturata è una SERP da 10
// risultati: con PROFONDITA a 20 ogni interrogazione costa due unità.
// In modalità live l'unità sta intorno a 0,002 dollari, quindi:
//   tre parole chiave, sola Italia      → 6 unità  ≈ 0,012 $
//   tre parole chiave, Italia + città   → 12 unità ≈ 0,024 $
// Cioè due centesimi e mezzo per l'analisi più cara. Cento analisi complete:
// meno di tre dollari. Alzare PROFONDITA a 100 quintuplica tutto: prima di
// toccarlo, fare il conto su quante analisi al giorno ci si aspetta.
//
// ATTENZIONE ALL'ABUSO. Questo endpoint spende soldi veri a ogni chiamata.
// Il tetto qui sotto (tre parole chiave, due località) limita il danno per
// richiesta, ma non il numero di richieste: quello va limitato con una regola
// di rate limiting di Cloudflare sul percorso /api/posizioni. Senza quella
// regola, chiunque con un ciclo può prosciugare il credito in una notte.

const MAX_PAROLE = 3;
const PROFONDITA = 20;        // quanti risultati guardare: 20 = due unità fatturate
const NAZIONE = 'Italy';
const LINGUA = 'it';

export async function onRequest(context) {
  try {
    return await posizioni(context);
  } catch (err) {
    return risposta({
      disponibile: false,
      motivo: 'Controllo posizioni non riuscito: ' + String(err && err.message || err).slice(0, 140),
    });
  }
}

// Le credenziali si possono dare in due modi. Il secondo esiste perché il
// pannello del fornitore non sempre mostra un campo "API login" separato, e
// tirare a indovinare quale sia il login produce un 401 che sembra un problema
// di codice: DFS_BASIC è la stringa Base64 già pronta che il pannello offre
// sotto "Base64 Format", cioè login:password impacchettati. Se c'è quella,
// vince lei e non c'è più niente da interpretare.
// Il .trim() non è pignoleria: copiando dal pannello si porta dietro uno spazio
// o un a capo che il server rifiuta senza dire perché.
function credenziali(env) {
  const pronta = (env && env.DFS_BASIC || '').trim();
  if (pronta) return pronta;

  const login = (env && env.DFS_LOGIN || '').trim();
  const password = (env && env.DFS_PASSWORD || '').trim();
  if (!login || !password) return null;
  return btoa(login + ':' + password);
}

async function posizioni(context) {
  const basic = credenziali(context.env);

  const parametri = new URL(context.request.url).searchParams;
  const sito = (parametri.get('sito') || '').trim();

  // La città arriva già nel formato del fornitore ("Ferrara,Emilia-Romagna,Italy"),
  // perché la sceglie da una tendina: niente da indovinare, niente da correggere.
  let citta = (parametri.get('citta') || '').trim();
  if (citta && !/,Italy$/i.test(citta)) citta = '';   // non accetto località arbitrarie

  const parole = (parametri.get('parole') || '')
    .split(/[,;\n]/)
    .map(p => p.trim().replace(/\s+/g, ' '))
    .filter(p => p.length > 1 && p.length <= 80)
    .slice(0, MAX_PAROLE);

  if (!parole.length) return risposta({ disponibile: false, motivo: 'Nessuna parola chiave.' });

  const dominio = estraiDominio(sito);
  if (!dominio) return risposta({ disponibile: false, motivo: 'Dominio non valido.' }, 400);

  if (!basic)
    return risposta({
      disponibile: false,
      motivo: 'Controllo posizioni non configurato: mancano le credenziali del fornitore di dati SERP.',
    });

  // Un compito per ogni combinazione parola × località. Il fornitore accetta
  // un array e li esegue in parallelo: si aspetta una volta sola.
  const luoghi = [NAZIONE];
  if (citta) luoghi.push(citta);

  const compiti = [];
  for (const parola of parole)
    for (const luogo of luoghi)
      compiti.push({
        keyword: parola,
        location_name: luogo,
        language_code: LINGUA,
        device: 'desktop',
        depth: PROFONDITA,
      });

  const r = await fetch('https://api.dataforseo.com/v3/serp/google/organic/live/advanced', {
    method: 'POST',
    headers: {
      'Authorization': 'Basic ' + basic,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(compiti),
    signal: AbortSignal.timeout(40000),
  });

  if (!r.ok) {
    const dettaglio = r.status === 401
      ? 'Il fornitore ha rifiutato le credenziali (401). Controlla che DFS_BASIC contenga la ' +
        'stringa "Base64 Format" copiata dal pannello, oppure che DFS_LOGIN sia l\'API login ' +
        'esatto e non un indirizzo email diverso. Verifica anche che l\'account sia attivato.'
      : 'Il fornitore di dati ha risposto ' + r.status + '.';
    return risposta({ disponibile: false, motivo: dettaglio });
  }

  const dati = await r.json();

  // Rimetto insieme i risultati per parola chiave. Se la città non viene
  // riconosciuta dal fornitore fallisce solo metà dei compiti: la nazionale
  // resta valida e il rapporto la mostra lo stesso, segnalando il problema.
  const perParola = new Map();
  for (const parola of parole) perParola.set(parola, { parola: parola, nazionale: null, locale: null });
  let cittaFallita = false;

  for (const compito of (dati.tasks || [])) {
    const richiesta = (compito.data && compito.data.keyword) || '';
    const dove = (compito.data && compito.data.location_name) || '';
    const chiave = (citta && dove === citta) ? 'locale' : 'nazionale';
    const riga = perParola.get(richiesta);
    if (!riga) continue;

    if (compito.status_code >= 40000) {
      if (chiave === 'locale' && /location/i.test(compito.status_message || '')) cittaFallita = true;
      riga[chiave] = {
        errore: (compito.status_code + ' ' + (compito.status_message || 'non riuscita')).slice(0, 160),
      };
      continue;
    }

    const voci = (compito.result && compito.result[0] && compito.result[0].items) || [];
    const organici = voci.filter(v => v.type === 'organic');
    const mio = organici.find(v => stessoDominio(v.domain, dominio));

    riga[chiave] = {
      posizione: mio ? mio.rank_absolute : null,
      oltre: !mio,
      indirizzo: mio ? mio.url : null,
      // Chi sta davanti serve più del numero: se in cima ci sono tre portali
      // nazionali, la parola chiave è persa, e va detto.
      primi: organici.slice(0, 3).map(v => ({
        dominio: v.domain,
        titolo: (v.title || '').slice(0, 90),
      })),
    };
  }

  return risposta({
    disponibile: true,
    profondita: PROFONDITA,
    citta: citta || null,
    cittaFallita: cittaFallita,
    esiti: parole.map(p => perParola.get(p)),
  });
}

function estraiDominio(valore) {
  try {
    const u = new URL(/^https?:\/\//i.test(valore) ? valore : 'https://' + valore);
    return u.hostname.replace(/^www\./i, '').toLowerCase();
  } catch (e) {
    return null;
  }
}

function stessoDominio(trovato, mio) {
  if (!trovato) return false;
  const t = String(trovato).replace(/^www\./i, '').toLowerCase();
  return t === mio || t.endsWith('.' + mio);
}

function risposta(dati, stato) {
  return new Response(JSON.stringify(dati), {
    status: stato || 200,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}
