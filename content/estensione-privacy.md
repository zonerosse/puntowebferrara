---
title: "Privacy dell'estensione"
titleSeo: "Informativa privacy dell'estensione Sottosopra | Punto Web"
description: "Quali dati tratta l'estensione Sottosopra per Chrome: nessuna raccolta, nessun account, analisi eseguita nel browser. Informativa completa."
tipoPagina: "WebPage"
sitemap:
  priority: 0.3
  changefreq: yearly
---

## Informativa privacy dell'estensione "Sottosopra"

Ultimo aggiornamento: 24 agosto 2026

Questa informativa riguarda l'estensione per browser **Sottosopra**, pubblicata da Paolo Boldrini — Punto Web Ferrara, Ostellato (FE), Italia. Contatto: [info@puntowebferrara.com](mailto:info@puntowebferrara.com).

### In sintesi

L'estensione non raccoglie dati personali, non richiede registrazione, non usa cookie, non profila e non vende nulla a nessuno. Il contenuto delle pagine viene esaminato dentro il tuo browser e il risultato resta lì: chiudendo la scheda sparisce. L'unica cosa che esce, e solo durante l'analisi completa, è l'indirizzo del sito che hai chiesto di analizzare: sotto è spiegato verso chi e perché.

### Quali dati tratta e perché

Quando clicchi l'icona, l'estensione legge il contenuto HTML della pagina che hai aperto — testi, titoli, meta tag, dati strutturati, collegamenti — per calcolare i controlli. Questa lettura avviene sul tuo computer. Il contenuto non viene salvato, non viene inviato ad alcun server e non è accessibile a nessuno tranne te.

Quando lanci l'analisi completa di un sito, l'estensione scarica le pagine elencate nella sitemap di quel sito, fino a un massimo di duecento, e le esamina con lo stesso procedimento. Anche in questo caso l'elaborazione è locale.

### Cosa esce dal browser, e verso chi

Durante l'**analisi completa di un sito** l'indirizzo del sito analizzato viene trasmesso a due servizi esterni. Il contenuto delle pagine non esce mai dal browser, in nessun caso.

**puntowebferrara.com** — per la misura di velocità. L'indirizzo viene passato a un componente su questo dominio, che a sua volta lo inoltra all'API PageSpeed Insights di Google. Il passaggio serve unicamente a tenere la chiave di accesso all'API su un server anziché dentro l'estensione, dove sarebbe leggibile da chiunque. L'indirizzo non viene registrato né conservato. Il trattamento successivo da parte di Google è regolato dalle [norme sulla privacy di Google](https://policies.google.com/privacy).

**cloudflare-dns.com** — per riconoscere chi ospita il sito. Il nome del dominio analizzato viene inviato al servizio DNS pubblico di Cloudflare, che risponde con i record tecnici del dominio. È la stessa interrogazione che il browser compie ogni volta che apri un sito qualsiasi.

In entrambi i casi viaggia solo l'indirizzo del sito che hai chiesto di analizzare: non la tua navigazione, non le pagine che visiti, non il contenuto di alcuna pagina.

Il **pannello su singola pagina** non contatta alcun server esterno: l'analisi avviene interamente nel browser. Se non vuoi che nulla esca, usa solo il pannello e non avviare l'analisi completa.

### Cosa non fa

Non registra la cronologia di navigazione. Non traccia le pagine che visiti. Non usa strumenti di analisi statistica, né propri né di terze parti. Non mostra pubblicità. Non crea profili. Non trasferisce dati a soggetti terzi per finalità commerciali.

### Permessi richiesti e perché

L'estensione dichiara tre permessi, e ciascuno serve a una funzione precisa.

**activeTab e scripting** servono a leggere il contenuto della pagina che hai aperto nel momento in cui clicchi l'icona. Senza di essi l'estensione non potrebbe analizzare nulla. Durante l'analisi completa, `scripting` serve anche a scaricare le altre pagine passando dalla scheda che hai aperto: è ciò che permette di leggere le pagine visibili solo dopo l'accesso, usando la tua sessione. Anche in quel caso il contenuto resta nel browser.

**tabs** serve ad aprire la scheda con il rapporto completo quando premi il pulsante.

**Accesso ai siti web (`http` e `https`)** serve a scaricare le altre pagine del sito durante l'analisi completa, oltre a `robots.txt` e alla sitemap. Le pagine vengono scaricate solo quando avvii esplicitamente l'analisi, mai in sottofondo.

### Conservazione

Nessun dato viene conservato. L'estensione non usa memoria locale, non salva impostazioni e non tiene traccia delle analisi precedenti.

### I tuoi diritti

Non essendoci raccolta di dati personali, non c'è alcun archivio da consultare, correggere o cancellare. Se hai domande su come funziona, il codice è leggibile: sono file di testo che puoi aprire con un editor qualsiasi. Per qualsiasi chiarimento, [scrivimi](/contatti/).

### Modifiche

Se una versione futura dovesse trattare dati in modo diverso, questa pagina verrà aggiornata prima della pubblicazione e la data in cima cambierà.
