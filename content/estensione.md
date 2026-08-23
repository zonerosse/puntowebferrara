---
title: "Estensione per il browser"
titleSeo: "Estensione Chrome per analizzare una pagina | Punto Web"
description: "Estensione gratuita per Chrome, Edge e Brave: analizza la pagina aperta con 48 controlli, legge anche i contenuti generati da JavaScript e i siti dietro login."
tipoPagina: "WebPage"
sitemap:
  priority: 0.6
  changefreq: monthly
faq:
  - q: "Perché non è nel Chrome Web Store?"
    a: "Perché per ora è uno strumento che uso io e che condivido con chi me lo chiede. Pubblicarla nello store richiede una revisione e l'impegno a mantenerla aggiornata a ogni cambio di regole di Google: lo farò se scoprirò che serve a qualcuno oltre a me. Nel frattempo l'installazione manuale funziona identica."
  - q: "È sicura? Chrome mi avvisa che è in modalità sviluppatore."
    a: "L'avviso di Chrome riguarda tutte le estensioni non installate dallo store, indipendentemente da cosa fanno. Il codice è leggibile: sono file di testo, puoi aprirli con il Blocco note e vedere cosa fanno. L'estensione non manda dati da nessuna parte tranne la richiesta di misura della velocità, che va a Google."
  - q: "Che dati raccoglie?"
    a: "Nessuno. L'analisi avviene nel tuo browser e il risultato resta lì: quando chiudi la scheda sparisce. Non ci sono server che registrano gli indirizzi analizzati, non c'è registrazione, non c'è un account."
  - q: "Funziona anche su Firefox?"
    a: "Non ancora. Il formato dell'estensione è quello di Chrome, che vale anche per Edge, Brave, Opera e Vivaldi. Per Firefox serve una piccola modifica: se ti serve, scrivimi."
---

## Estensione per il browser

Fa le stesse verifiche dello [strumento online](/sottosopra/) — gli stessi 48 controlli, le stesse spiegazioni — ma partendo dal tuo browser invece che da un server. Il che cambia tre cose concrete.

### Legge quello che vede il browser, non quello che manda il server

I siti costruiti con React, Vue o framework simili consegnano al server una pagina quasi vuota e riempiono il contenuto con JavaScript dopo il caricamento. Uno strumento che legge il codice servito vede il guscio; l'estensione legge la pagina come l'hai davanti agli occhi.

### Funziona sui siti che rifiutano le analisi automatiche

Molti server bloccano le richieste che arrivano dai datacenter. Con l'estensione la richiesta è la tua normale navigazione, quindi passa dove uno strumento esterno viene respinto.

### Funziona dietro il login

Aree riservate, ambienti di prova non ancora pubblici, pagine visibili solo agli utenti registrati: se ci accedi tu, l'estensione le legge. Nessuno strumento esterno può farlo.

## Come si installa

L'estensione non è nel Chrome Web Store, quindi l'installazione è manuale. Sono quattro passaggi e servono due minuti. Funziona su **Chrome, Edge, Brave, Opera e Vivaldi**.

1. [Scarica il pacchetto](/download/verifica-sito-estensione.zip) ed **estrailo** in una cartella dove resterà: se la cancelli, l'estensione smette di funzionare. Non usare la cartella Download.
2. Apri `chrome://extensions` scrivendolo nella barra degli indirizzi. Su Edge è `edge://extensions`, su Brave `brave://extensions`.
3. Attiva **Modalità sviluppatore**, l'interruttore in alto a destra.
4. Clicca **Carica estensione non pacchettizzata** e scegli la cartella che hai estratto — quella che contiene il file `manifest.json`.

L'icona compare nella barra. Se non la vedi, clicca il simbolo del puzzle in alto a destra e fissa "Verifica sito" con la puntina.

## Cosa vedrai

Cliccando l'icona su una pagina qualsiasi, il pannello mostra il punteggio di **quella** pagina, cosa le manca, i meta tag scritti per esteso, la scaletta dei titoli con i salti di livello evidenziati, i dati strutturati dichiarati e i collegamenti in uscita.

Da lì un pulsante lancia l'**analisi completa del sito**: apre una scheda intera, scarica tutte le pagine dalla sitemap fino a duecento, e produce il rapporto con tutti i controlli, i crawler dei motori IA, le tecnologie riconosciute e la velocità misurata da Google.

## Onestà sulle limitazioni

L'avviso che Chrome mostra sulle estensioni in modalità sviluppatore è normale e riguarda tutte quelle non installate dallo store, non questa in particolare. Puoi disattivarlo solo pubblicandole, e per ora non l'ho fatto.

Il codice è leggibile: sono file di testo. Se vuoi controllare cosa fa prima di installarla, aprili — `pannello.js` e `rapporto.js` sono i due che contano.

Come tratta i dati è scritto nell'[informativa privacy dell'estensione](/estensione-privacy/): in breve, non ne raccoglie.

Se qualcosa non funziona o se ti serve la versione per Firefox, [scrivimi](/contatti/).
