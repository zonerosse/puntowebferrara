# Tre falsi positivi su quattro

Si estrae in `C:\Hugo\puntowebferrara`. Quattro file sostituiti, uno nuovo.
Nessuna dipendenza nuova, nessuna modifica all'aspetto del rapporto.

| File | Cosa cambia |
|---|---|
| `functions/api/_accessibilita.js` | l'apostrofo non tronca più il valore degli attributi |
| `functions/api/_analisi.js` | stessa correzione; e registra il `ContactPoint` |
| `functions/api/scopri.js` | le immagini della sitemap non contano come pagine; raccolte le intestazioni di cache |
| `static/sottosopra/verifica.js` | la pagina contatti non si cerca più solo nell'indirizzo |
| `prove/falsi-positivi.mjs` | nuovo: 23 prove sulle correzioni |

## 1. L'apostrofo

La regola che leggeva un attributo era:

```
\bnome\s*=\s*["']([^"']*)["']
```

La virgoletta di chiusura non era legata a quella di apertura, e la classe
`[^"']*` si fermava al primo apostrofo. Con
`aria-label="Leggi l'articolo: X"` il valore letto era `Leggi l`, uguale per
tutti e ventotto gli articoli: da lì la segnalazione dei nomi ripetuti che
portano a destinazioni diverse.

Ora la virgoletta di chiusura è la stessa di apertura, e sono ammessi anche i
valori scritti senza virgolette.

Con la stessa causa, e forse peggiore: le funzioni che leggevano
`<meta name="description" content="...">` e `<meta property="og:...">` usavano
la stessa classe rotta. Su una description italiana — «L'allevamento di
Staffordshire...» — il valore letto era `L`, e il controllo sulla lunghezza
concludeva che la description era troppo corta. Ora il tag `<meta>` si isola
prima e il valore si legge con la funzione corretta.

Nello stesso punto è sparito un terzo difetto: `\btitle` trovava anche
`data-title`, perché il trattino conta come confine di parola. Adesso no.

Restano scritte a mano, non toccate, le regole che leggono `id`, `class`,
`role`, `hreflang`, `canonical` e `generator`: sono valori che un apostrofo non
lo contengono mai. Se un giorno servisse, il posto dove intervenire è lo stesso.

## 2. Le immagini della sitemap

Cercava tutti i `<loc>` del documento, con qualunque prefisso: quindi anche gli
`<image:loc>` dentro `<image:image>`. Da lì i 198 indirizzi su un sito di 138
pagine, e i sessanta di troppo accusati poi di non essere contenuto.

Per specifica `<loc>` è il primo figlio di `<url>`, mentre `image:loc` e
`video:loc` stanno più in basso. Adesso si leggono i blocchi `<url>` — o
`<sitemap>` se il file è un indice — e di ciascuno vale il primo `<loc>`.

I file senza blocchi `<url>`, per esempio una sitemap in formato RSS, tornano al
comportamento di prima, che lì è quello giusto.

## 3. La pagina contatti

Si cercava `contatt` / `contact` / `kontakt` / `preventivo` dentro l'indirizzo.
Su un sito posizionato quella pagina può chiamarsi in qualunque modo:
`allevamento-staffordshire-bull-terrier-in-emilia-romagna` è una pagina contatti
a tutti gli effetti.

Adesso vale anche quando i dati strutturati dichiarano `ContactPage` o
`ContactPoint`, o quando una pagina pubblica insieme telefono e indirizzo.
`_analisi.js` raccoglie il `ContactPoint` anche quando è annidato dentro
`Organization`, dove non compare fra i `@type` di primo livello.

## Le intestazioni di cache

`scopri.js` adesso raccoglie anche `age`, `cf-cache-status`, `x-cache`, `date` e
`last-modified` della risposta della home. Il dato c'è, il rapporto non lo mostra
ancora: mostrarlo è una modifica all'aspetto e quella passa prima da un'anteprima.

## Il quarto falso positivo

Le fonti esterne contate a zero non è qui dentro. Prima serve sapere come è
scritta la condizione della Transform Rule su delpiccolodiavolo.it: lo user agent
del crawler è `VerificaSitoBot/1.0` e se la regola riconosce gli agenti IA dalla
presenza di `bot`, allo strumento viene servito Markdown invece di HTML — e in
Markdown i `<a href>` non esistono.

## Le prove

```
node prove\falsi-positivi.mjs
```

23 passate, 0 fallite.
