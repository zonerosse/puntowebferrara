# Punto Web Ferrara — modifiche SEO tecnica

Build verificata con Hugo 0.147.7.

## File modificati o aggiunti

| File | Cosa cambia |
|---|---|
| `layouts/partials/schema.html` | **NUOVO** — JSON-LD unico in `@graph` |
| `layouts/_default/baseof.html` | Rimossi 4 blocchi JSON-LD duplicati e `meta keywords`; aggiunto WhatsApp nel footer; email da params |
| `hugo.toml` | Nuovo blocco `[params.biz]`; email aggiornata |
| `static/_headers` | Corretta la cache di un anno che bloccava gli aggiornamenti |
| `static/llms.txt` | **NUOVO** — indice del sito per i sistemi AI |
| `.gitignore` | **NUOVO** — esclude `public/` e file temporanei |

## Comandi

```bash
# Anteprima locale
hugo server -D

# Build di produzione
hugo --minify

# Primo push su Git
git rm -r --cached public          # se public/ era già tracciato
git add .
git commit -m "SEO tecnica: schema unificato, cache headers, llms.txt"
git push
```

## Da fare a mano

1. **Formspree** — cambiare la destinazione del form da `zonerosse@gmail.com` a `info@puntowebferrara.com`.
2. **Verifica schema** — dopo il deploy, controllare la home su `search.google.com/test/rich-results`.
3. **Google Business Profile** — non ancora attiva. È la leva più pesante per il posizionamento locale.

## Nota sul NAP

Lo schema dichiarava sede a Ferrara (CAP 44121, coordinate del centro città), il footer diceva Ostellato.
Ora è tutto allineato su **Ostellato (FE) 44020**, con Ferrara e provincia in `areaServed`.
Se si vuole tornare a Ferrara, va cambiato anche il footer — ma l'indirizzo dichiarato deve essere quello reale,
soprattutto se in futuro si apre la scheda Google Business.

## Cache: perché non un anno

Gli asset hanno nomi fissi (`/css/style.css`), quindi una cache lunga significa che chi ha già visitato
il sito continua a vedere la versione vecchia dopo un aggiornamento.
Per tornare a `max-age=31536000` in sicurezza servono nomi versionati, spostando il CSS in `assets/`
e usando `resources.Get` con `fingerprint`.
