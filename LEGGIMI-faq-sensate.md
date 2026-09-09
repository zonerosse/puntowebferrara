# Un controllo che nessun altro strumento fa

Si estrae in `C:\Hugo\puntowebferrara-hugo`. Tre file, uno nuovo.
Comprende anche le due correzioni sui plurali: se non hai ancora estratto
`puntowebferrara-plurali.zip`, questo lo sostituisce.

| File | Cosa cambia |
|---|---|
| `functions/api/_analisi.js` | quattro nuovi rilievi sulla qualità del FAQPage |
| `static/sottosopra/verifica.js` | i due plurali del rapporto |
| `prove/faq-sensate.mjs` | nuovo: 7 prove sul controllo |

## Il problema che nessuno vede

Un FAQPage può essere JSON perfettamente valido e dichiarare a Google, come
domanda, un paragrafo intero. Succede quando l'espressione che pesca le domande
dal contenuto scavalca la chiusura del titolo e si porta dietro il testo che
segue. Tutti i validatori dicono che va bene: `name` è una stringa, e la stringa
c'è.

Quattro controlli nuovi, tutti nel gruppo Dati strutturati:

- il `name` non finisce con il punto interrogativo
- il `name` supera i 120 caratteri, che è il segno tipico del titolo che si è
  portato dietro il paragrafo
- la `acceptedAnswer` è senza testo
- la voce è senza `name`

Ogni rilievo mostra il testo trovato, non un conteggio: è l'unico modo perché
chi legge riconosca il proprio paragrafo finito dentro una domanda.

## Non tocca il punteggio

Sono rilievi, non controlli con punti: i 48 controlli restano 48 e il totale
resta 100. Se preferisci che valga punti, si fa, ma bisogna toglierne uno a un
altro controllo del gruppo, altrimenti la somma non torna più — e quella somma
è il tuo argomento contro gli altri strumenti.

## Provato sul campo, non solo con casi finti

Fatto girare sul sito delpiccolodiavolo.it ricostruito, prima e dopo la
correzione di `schema.html`:

```
prima   39 pagine con FAQPage,  36 segnalate
dopo    40 pagine con FAQPage,   4 segnalate
```

E quelle quattro rimaste erano un difetto vero, che ha trovato lui: la
correzione di ieri riguardava una sola delle due espressioni di `schema.html`.
La seconda, quella della fisarmonica, aveva lo stesso problema. Corretta anche
quella, si va a zero su 40. La correzione sta nello zip
`delpiccolodiavolo-schema1`.

## Le prove

```
node prove\faq-sensate.mjs
```

7 passate, 0 fallite.
