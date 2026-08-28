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
//   due parole chiave, sola Italia      → 10 unità ≈ 0,020 $
//   due parole chiave, Italia + città   → 20 unità ≈ 0,040 $
// Cioè quattro centesimi per l'analisi più cara. Cento analisi complete:
// quattro dollari. PROFONDITA è il moltiplicatore: a 20 si spendeva un
// centesimo e mezzo, a 100 si arriva a otto centesimi. È l'unico numero da
// toccare se un giorno il consumo diventa un problema. Alzare PROFONDITA a 100 quintuplica tutto: prima di
// toccarlo, fare il conto su quante analisi al giorno ci si aspetta.
//
// ATTENZIONE ALL'ABUSO. Questo endpoint spende soldi veri a ogni chiamata.
// Il tetto qui sotto (due parole chiave, due località) limita il danno per
// richiesta, ma non il numero di richieste: quello va limitato con una regola
// di rate limiting di Cloudflare sul percorso /api/posizioni. Senza quella
// regola, chiunque con un ciclo può prosciugare il credito in una notte.

// --- verifica anti-abuso -------------------------------------------------
// Questo endpoint spende soldi veri a ogni chiamata. Turnstile e' l'unica cosa
// fra il credito DataForSEO e chiunque abbia un ciclo for.
//
// I token durano 300 secondi e valgono una volta sola: un token riusato torna
// con l'errore timeout-or-duplicate, ed e' giusto cosi'.
//
// SI CHIUDE, NON SI APRE. Se manca TURNSTILE_SECRET l'endpoint rifiuta invece
// di lasciar passare. E' l'opposto della regola usata per DFS_LOGIN: la',
// senza chiavi, non si spende niente; qui, senza chiavi, si spende tutto.
const SITEVERIFY = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

async function personaVera(context) {
  const segreto = context.env.TURNSTILE_SECRET;
  if (!segreto) return { ok: false, motivo: 'Verifica anti-abuso non configurata.' };

  const token = context.request.headers.get('X-Turnstile-Token');
  if (!token) return { ok: false, motivo: 'Verifica anti-abuso mancante.' };

  const corpo = new FormData();
  corpo.append('secret', segreto);
  corpo.append('response', token);
  corpo.append('remoteip', context.request.headers.get('CF-Connecting-IP') || '');
  corpo.append('idempotency_key', crypto.randomUUID());

  try {
    const r = await fetch(SITEVERIFY, { method: 'POST', body: corpo });
    const esito = await r.json();
    if (esito.success) return { ok: true };
    const codici = esito['error-codes'] || [];
    return {
      ok: false,
      motivo: codici.includes('timeout-or-duplicate')
        ? 'Verifica scaduta: ricarica la pagina e riprova.'
        : 'Verifica anti-abuso non superata.'
    };
  } catch {
    // Se Cloudflare non risponde si rifiuta lo stesso: meglio un'analisi
    // mancata che il credito prosciugato.
    return { ok: false, motivo: 'Verifica anti-abuso non raggiungibile.' };
  }
}

const MAX_PAROLE = 2;
const PROFONDITA = 50;        // quanti risultati guardare: si fattura ogni 10, quindi 50 = cinque unità
const NAZIONE = 'Italy';
const LINGUA = 'it';


// Le schede del riquadro mappe spesso NON dichiarano un sito: sono attività
// di Google Business Profile, e il campo domain resta vuoto. Cercarsi solo
// per dominio faceva fallire il confronto e concludere "non ci sei" mentre
// la scheda stava prima fra tutte — con l'assurdo che il rapporto poi la
// elencava fra quelle in cima.
//
// Quando il dominio manca si confronta il NOME dell'attività con quello del
// sito, ripulito di tutto quello che non aiuta: la punteggiatura, le parole
// comuni del settore, gli articoli. Se resta un nome proprio abbastanza
// lungo e quello compare nella scheda, è lui.
const PAROLE_COMUNI = /\b(allevamento|kennel|cani|cane|dog|dogs|di|del|della|dei|delle|il|lo|la|le|e|and|srl|snc|sas|spa|studio|centro|azienda|agricola)\b/gi;

function nomeSignificativo(testo) {
  return String(testo || '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(PAROLE_COMUNI, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Il nome proprio ricavato dal dominio: delpiccolodiavolo.it -> "piccolodiavolo"
//
// Nel dominio le parole sono attaccate, quindi PAROLE_COMUNI — che cerca
// parole intere — non le trova: "delpiccolodiavolo" restava intero mentre
// dal titolo il "Del" veniva tolto, e i due non combaciavano mai. Qui i
// prefissi vanno tolti per posizione, non per confine di parola.
const PREFISSI = /^(allevamento|kennel|studio|centro|azienda|agricola|del|della|dei|delle|il|lo|la|le|di|da)+/;

function nomeDalDominio(dominio) {
  let radice = String(dominio || '')
    .replace(/^www\./, '').split('.')[0]
    .replace(/[^a-z0-9]/gi, '').toLowerCase();

  // si tolgono i prefissi finche' ce ne sono, ma senza svuotare il nome
  let prima;
  do {
    prima = radice;
    const dopo = radice.replace(PREFISSI, '');
    if (dopo.length >= 5) radice = dopo;
  } while (radice !== prima);

  return radice;
}

function schedaMia(voce, dominio) {
  // se la scheda dichiara un sito, quello vince: è il confronto sicuro
  if (voce.domain) return stessoDominio(voce.domain, dominio);

  const cercato = nomeDalDominio(dominio);
  if (cercato.length < 6) return false;   // troppo corto: rischio di falsi

  // Il nome della scheda, ridotto alle sue parole significative. NON si
  // incollano insieme: "Allevamento Staffordshire Bull Terrier Del Piccolo
  // Diavolo" incollato diventa "staffordshirebullterrierpiccolodiavolo", e
  // cercarci dentro "piccolodiavolo" funziona solo per caso — basta una
  // parola in mezzo e non trova più niente.
  //
  // Si prova invece a ricomporre il nome cercato da parole CONSECUTIVE del
  // titolo: "piccolo diavolo" -> "piccolodiavolo" corrisponde, "bull
  // terrier del" no.
  const parole = nomeSignificativo(voce.title).split(' ').filter(Boolean);
  if (!parole.length) return false;

  for (let i = 0; i < parole.length; i++) {
    let insieme = '';
    for (let j = i; j < parole.length && insieme.length <= cercato.length + 4; j++) {
      insieme += parole[j];
      if (insieme === cercato) return true;
    }
  }

  // ultimo tentativo: il titolo intero senza spazi, per i nomi di una parola
  const tutto = parole.join('');
  return tutto === cercato;
}

export async function onRequest(context) {
  // Primissima cosa, prima di leggere i parametri e prima di qualunque
  // chiamata a DataForSEO: se non e' una persona, non si spende.
  const varco = await personaVera(context);
  if (!varco.ok) {
    return new Response(
      JSON.stringify({ disponibile: false, motivo: varco.motivo }),
      { status: 403, headers: { 'Content-Type': 'application/json' } }
    );
  }

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

  // UNA RICHIESTA PER COMPITO. La modalità live del fornitore accetta un solo
  // compito per chiamata: mandarne due nello stesso array li fa fallire
  // entrambi, con un errore che sembra un problema di credenziali o di
  // località. Quindi si spara una richiesta per ogni combinazione parola ×
  // luogo, tutte in parallelo: stesso costo, stessa attesa.
  const luoghi = [NAZIONE];
  if (citta) luoghi.push(citta);

  const combinazioni = [];
  for (const parola of parole)
    for (const luogo of luoghi)
      combinazioni.push({ parola: parola, luogo: luogo });

  const chiamate = combinazioni.map(c =>
    fetch('https://api.dataforseo.com/v3/serp/google/organic/live/advanced', {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + basic,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify([{
        keyword: c.parola,
        location_name: c.luogo,
        language_code: LINGUA,
        device: 'desktop',
        depth: PROFONDITA,
      }]),
      signal: AbortSignal.timeout(40000),
    })
      .then(async r => {
        if (!r.ok) return { http: r.status };
        const j = await r.json();
        return { compito: (j.tasks && j.tasks[0]) || null };
      })
      .catch(err => ({ rete: String(err && err.message || err).slice(0, 120) }))
  );

  const risposte = await Promise.all(chiamate);

  // Se tutte hanno preso 401, il problema sono le credenziali: vale la pena
  // dirlo una volta sola e chiaro, invece di ripeterlo su ogni riga.
  if (risposte.length && risposte.every(x => x.http === 401))
    return risposta({
      disponibile: false,
      motivo: 'Il fornitore ha rifiutato le credenziali (401). Controlla che DFS_BASIC contenga la ' +
              'stringa "Base64 Format" copiata dal pannello, e che l\'account sia attivato.',
    });

  // Rimetto insieme i risultati per parola chiave. Se la città non viene
  // riconosciuta dal fornitore fallisce solo metà dei compiti: la nazionale
  // resta valida e il rapporto la mostra lo stesso, segnalando il problema.
  const perParola = new Map();
  for (const parola of parole) perParola.set(parola, { parola: parola, nazionale: null, locale: null });
  let cittaFallita = false;

  for (let i = 0; i < risposte.length; i++) {
    const atteso = combinazioni[i];
    const chiave = (citta && atteso.luogo === citta) ? 'locale' : 'nazionale';
    const riga = perParola.get(atteso.parola);
    if (!riga) continue;

    const esito = risposte[i];
    if (esito.http) { riga[chiave] = { errore: 'HTTP ' + esito.http }; continue; }
    if (esito.rete) { riga[chiave] = { errore: 'rete: ' + esito.rete }; continue; }

    const compito = esito.compito;
    if (!compito) { riga[chiave] = { errore: 'risposta vuota dal fornitore' }; continue; }

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

    // Posizione FRA I SOLI ORGANICI (rank_group), non quella assoluta sulla
    // pagina. L'assoluta conta anche mappe, annunci e riquadri, quindi può
    // dire 27 quando fra i link blu sei quattordicesimo: un numero corretto
    // ma incoerente con la frase "primi N risultati" che gli sta accanto.
    const posizione = mio ? (mio.rank_group || mio.rank_absolute) : null;

    // Il riquadro delle mappe. Per un'attività locale conta spesso più
    // dell'organico: occupa mezzo schermo e sta sopra tutti i link blu.
    // Arriva nella stessa risposta, quindi non costa una chiamata in più.
    const mappe = voci.filter(v => v.type === 'local_pack');
    const mioNelleMappe = mappe.findIndex(v => schedaMia(v, dominio));

    riga[chiave] = {
      posizione: posizione,
      oltre: !mio,
      indirizzo: mio ? mio.url : null,
      // Chi sta davanti serve più del numero: se in cima ci sono tre portali
      // nazionali, la parola chiave è persa, e va detto. L'indirizzo serve a
      // rendere le voci cliccabili nel rapporto.
      primi: organici.slice(0, 3).map(v => ({
        dominio: v.domain,
        titolo: (v.title || '').slice(0, 90),
        indirizzo: v.url || null,
      })),
      mappe: {
        presente: mappe.length > 0,
        dentro: mioNelleMappe >= 0,
        // Come si e' riconosciuta la scheda: per sito dichiarato (sicuro) o
        // per somiglianza del nome (probabile). Il rapporto lo dice, cosi'
        // chi legge sa quanto fidarsi.
        perNome: mioNelleMappe >= 0 && !mappe[mioNelleMappe].domain,
        posizione: mioNelleMappe >= 0 ? mioNelleMappe + 1 : null,
        // Il totale va contato su TUTTE le schede, non sulle tre che mi porto
        // dietro per mostrarle: altrimenti chi è quarto risulta "4° su 3".
        totale: mappe.length,
        // Nome e sito dichiarato nella scheda. Il sito spesso manca: in quel
        // caso la voce resta non cliccabile, senza inventarle un indirizzo.
        chi: mappe.slice(0, 3).map(v => ({
          nome: (v.title || '').slice(0, 60),
          indirizzo: v.url || (v.domain ? 'https://' + v.domain : null),
        })),
      },
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
