---
title: "Estensione per il browser"
titleSeo: "Estensione Chrome per analizzare una pagina | Punto Web"
description: "Estensione gratuita nel Chrome Web Store: analizza la pagina aperta con 48 controlli, legge i contenuti generati da JavaScript e arriva anche dietro il login."
tipoPagina: "WebPage"
sitemap:
  priority: 0.6
  changefreq: monthly
software:
  nome: "Sottosopra — analisi tecnica del sito"
  descrizione: "Estensione gratuita per il browser: analizza la pagina aperta o l'intero sito con 48 controlli tecnici, SEO e di accesso dei motori IA."
  categoria: "BrowserApplication"
  sistemi: "Chrome, Edge, Brave, Opera, Vivaldi"
  url: "https://chromewebstore.google.com/detail/bfgmlinfkcleljfoahigajnfhdfbngig"
  funzioni:
    - "48 controlli con punteggio verificabile su 100"
    - "Analisi della pagina aperta, letta dal browser"
    - "Analisi dell'intero sito dalla sitemap, fino a 200 pagine"
    - "Elenco dei crawler dei motori IA ammessi o bloccati dal robots.txt"
    - "Velocità misurata con Lighthouse"
    - "Rapporto esportabile in PDF"
    - "Nessuna registrazione e nessun dato raccolto"
faq:
  - q: "Chrome dice che l'estensione non è attendibile. Devo preoccuparmi?"
    a: "No. È l'avviso che la Protezione avanzata di Navigazione sicura mostra sulle estensioni di sviluppatori pubblicati da poco, indipendentemente da cosa fanno: servono alcuni mesi perché uno sviluppatore nuovo venga considerato attendibile. Lo vedi solo se hai attivato la Protezione avanzata, che non è l'impostazione predefinita, e l'installazione prosegue normalmente."
  - q: "Che dati raccoglie?"
    a: "Nessuno. L'analisi avviene nel tuo browser e il risultato resta lì: quando chiudi la scheda sparisce. Non ci sono server che registrano gli indirizzi analizzati, non c'è registrazione, non c'è un account."
  - q: "Funziona su Edge, Brave, Opera e Vivaldi?"
    a: "Sì. Installano tutti dal Chrome Web Store e il formato dell'estensione è lo stesso."
  - q: "Funziona anche su Firefox?"
    a: "Non ancora. Il formato dell'estensione è quello di Chrome, che vale anche per Edge, Brave, Opera e Vivaldi. Per Firefox serve una piccola modifica: se ti serve, scrivimi."
---

## Estensione per il browser

Fa le stesse verifiche dello [strumento online](/sottosopra/) — gli stessi 48 controlli, le stesse spiegazioni — ma partendo dal tuo browser invece che da un server.

{{< button link="https://chromewebstore.google.com/detail/bfgmlinfkcleljfoahigajnfhdfbngig" text="Installa dal Chrome Web Store" >}}

### Due modi di leggere, e conviene sapere quale stai usando

Cliccando l'icona nella barra, l'estensione analizza **la pagina che hai davanti**, leggendola dal browser: cioè com'è dopo che il JavaScript ha finito il suo lavoro. I siti costruiti con React, Vue o framework simili consegnano al server una pagina quasi vuota e la riempiono dopo il caricamento. Uno strumento che legge il codice servito vede il guscio; l'estensione vede il contenuto.

Dal pannello parte poi l'**analisi completa del sito**: legge la sitemap e scarica le altre pagine una per una. Qui riceve l'HTML che manda il server, quindi sui siti costruiti in JavaScript quelle pagine le vede in parte. In compenso le richieste partono dal tuo browser, con la tua sessione: passa dove gli strumenti esterni vengono respinti, e legge anche le pagine dietro il login.

## Come si installa

Dal Chrome Web Store, col pulsante qui sopra: **Aggiungi**, poi **Aggiungi estensione**. Funziona anche su **Edge, Brave, Opera e Vivaldi**, che installano dallo stesso store.

L'icona compare nella barra. Se non la vedi, clicca il simbolo del puzzle in alto a destra e fissala con la puntina.

### Se Chrome ti dice «Procedi con cautela»

Può comparire una finestra che avverte che l'estensione non è ritenuta attendibile da Navigazione sicura avanzata. Non riguarda cosa fa l'estensione: Chrome considera attendibili gli sviluppatori dopo qualche mese di presenza nello store, e questa è pubblicata da poco. La vedi solo se hai attivato la Protezione avanzata, che non è l'impostazione predefinita. «Installa comunque» procede normalmente.

Se preferisci non fidarti sulla parola, il codice è leggibile: sono file di testo, e `pannello.js` e `rapporto.js` sono i due che contano.

## Cosa vedrai

Cliccando l'icona su una pagina qualsiasi, il pannello mostra il punteggio di **quella** pagina, cosa le manca, i meta tag scritti per esteso, la scaletta dei titoli con i salti di livello evidenziati, i dati strutturati dichiarati e i collegamenti in uscita.

Da lì un pulsante lancia l'**analisi completa del sito**: apre una scheda intera, scarica tutte le pagine dalla sitemap fino a duecento, e produce il rapporto con tutti i controlli, i crawler dei motori IA, le tecnologie riconosciute e la velocità misurata da Google.

## Cosa raccoglie

Niente. L'analisi avviene nel tuo browser e il risultato resta lì: quando chiudi la scheda sparisce. Non c'è registrazione, non c'è un account, nessun server registra gli indirizzi analizzati. L'unica richiesta che esce è quella della misura di velocità, che va a Google.

Per esteso è scritto nell'[informativa privacy dell'estensione](/estensione-privacy/).

Se qualcosa non funziona o se ti serve la versione per Firefox, [scrivimi](/contatti/).
