---
title: "Sito WordPress Hackerato? Cosa Fare Subito (Guida Completa)"
date: 2025-12-25
description: "Il tuo sito WordPress è stato hackerato? Guida passo-passo per ripulirlo, metterlo in sicurezza e prevenire futuri attacchi. Cosa fare subito."
tags: ["wordpress", "sicurezza", "malware", "hacking"]
categories: ["Guide"]
author: "Paolo Boldrini"
slug: "sito-wordpress-hackerato-cosa-fare"
---

Il tuo sito WordPress è stato hackerato. Niente panico.

In questa guida ti spiego cosa fare **subito**, come ripulirlo e come evitare che succeda di nuovo.

## Segnali che il Tuo Sito È Stato Hackerato

Prima di tutto, confermiamo che sia davvero un hack:

**Segnali evidenti:**
- Redirect a siti strani (viagra, casino, porn)
- Pagine che non hai creato tu
- Google mostra "Questo sito potrebbe essere compromesso"
- Hosting ti ha sospeso l'account
- Antivirus blocca il tuo sito

**Segnali subdoli:**
- Sito molto più lento del solito
- Nuovi utenti admin che non conosci
- File modificati di recente (ma non da te)
- Email strane inviate dal tuo dominio
- Link nascosti nel footer

## Cosa Fare SUBITO (Primi 30 Minuti)

### 1. Metti il Sito Offline

Non lasciare il sito hackerato online. Danneggia:
- I tuoi visitatori (possono essere infettati)
- La tua reputazione
- Il tuo ranking Google

**Come fare:**
- Attiva la modalità manutenzione
- Oppure rinomina la cartella del sito via FTP
- Oppure chiedi all'hosting di sospenderlo

### 2. Cambia TUTTE le Password

Subito. Adesso.

- Password WordPress admin
- Password FTP
- Password database
- Password cPanel/Plesk
- Password email associate

**Usa password forti:** minimo 16 caratteri, lettere, numeri, simboli.

### 3. Controlla gli Utenti Admin

Vai in WordPress → Utenti → Tutti gli utenti.

Ci sono admin che non conosci? Eliminali subito.

### 4. Fai un Backup

Sì, anche se è infetto. Potresti aver bisogno dei contenuti.

Scarica:
- Tutti i file via FTP
- Il database via phpMyAdmin

Salvali in una cartella chiamata "SITO_INFETTO_DATA".

## Come Pulire il Sito

### Opzione 1: Ripristina da Backup Pulito

Se hai un backup **precedente** all'infezione:

1. Cancella tutto il sito attuale
2. Ripristina il backup
3. Aggiorna subito WordPress, temi, plugin
4. Cambia tutte le password

**Problema:** potresti perdere contenuti recenti.

### Opzione 2: Pulizia Manuale

Più complessa ma salvi tutto.

**Passo 1: Identifica i File Infetti**

Usa questi strumenti:
- Wordfence (plugin gratuito)
- Sucuri SiteCheck (online)
- MalCare (plugin)

Cercano:
- File core WordPress modificati
- File sospetti (spesso in /wp-content/uploads/)
- Codice malevolo nei file

**Passo 2: Reinstalla WordPress Core**

1. Scarica WordPress pulito da wordpress.org
2. Cancella tutto TRANNE:
   - /wp-content/
   - wp-config.php
3. Carica i file WordPress puliti

**Passo 3: Controlla i Temi**

Gli hacker adorano nascondere codice nei temi.

- Temi che non usi? Eliminali
- Tema attivo: confrontalo con versione originale
- Meglio: reinstalla il tema da zero

**Passo 4: Controlla i Plugin**

Stessa cosa:
- Plugin inattivi? Elimina
- Plugin attivi: confronta con originali
- Nel dubbio: elimina e reinstalla

**Passo 5: Pulisci il Database**

Cerca nel database:
- Utenti sconosciuti
- Post/pagine nascosti (status: draft o private)
- Opzioni strane nella tabella wp_options
- Link sospetti nei contenuti

**Passo 6: Controlla wp-config.php**

Apri il file e cerca codice strano. Deve contenere solo:
- Credenziali database
- Chiavi di autenticazione
- Prefisso tabelle
- Debug settings

Nient'altro.

**Passo 7: Controlla .htaccess**

Gli hacker spesso lo modificano per fare redirect.

Un .htaccess WordPress base:

```apache
# BEGIN WordPress
<IfModule mod_rewrite.c>
RewriteEngine On
RewriteBase /
RewriteRule ^index\.php$ - [L]
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule . /index.php [L]
</IfModule>
# END WordPress
```

Se c'è altro codice strano, rimuovilo.

### Opzione 3: Paga un Professionista

Se non ti senti sicuro, paga qualcuno.

**Costi tipici:**
- Pulizia base: 150-300€
- Pulizia complessa: 300-600€
- Pulizia + messa in sicurezza: 400-800€

Servizi specializzati: Sucuri, Wordfence, MalCare.

## Dopo la Pulizia

### 1. Aggiorna TUTTO

- WordPress all'ultima versione
- Tutti i plugin
- Tutti i temi

Le vulnerabilità note sono la porta d'ingresso principale.

### 2. Rimuovi da Blacklist Google

Se Google mostra warning sul tuo sito:

1. Vai su Google Search Console
2. Sezione "Problemi di sicurezza"
3. Richiedi revisione dopo aver pulito

Tempo di revisione: 24-72 ore.

### 3. Scansiona di Nuovo

Dopo qualche giorno, rifai una scansione completa. Gli hacker spesso lasciano backdoor.

## Come Evitare che Succeda di Nuovo

### Password Forti

- Minimo 16 caratteri
- Usa un password manager (Bitwarden, 1Password)
- Mai la stessa password per più siti
- Mai "admin" come username

### Aggiornamenti Automatici

Attiva gli aggiornamenti automatici:

```php
// In wp-config.php
define('WP_AUTO_UPDATE_CORE', true);
```

Per plugin e temi, usa un plugin come Easy Updates Manager.

### Plugin di Sicurezza

Installa almeno uno:
- **Wordfence** (gratuito, completo)
- **Sucuri** (gratuito + premium)
- **iThemes Security** (gratuito + premium)

Configuralo per:
- Limitare tentativi login
- Bloccare IP sospetti
- Scansioni automatiche

### Backup Automatici

Backup settimanali MINIMO. Meglio giornalieri.

Plugin:
- UpdraftPlus (gratuito)
- BlogVault (premium, migliore)
- BackupBuddy (premium)

Salva i backup FUORI dal server (Google Drive, Dropbox).

### Hosting Sicuro

Hosting economici = sicurezza scarsa.

Hosting consigliati per sicurezza:
- Siteground
- Kinsta
- WP Engine
- Cloudways

## Perché WordPress Viene Hackerato?

Numeri crudi:

- **43%** dei siti web usa WordPress
- Questo lo rende il **bersaglio numero 1**
- **90%** degli hack WordPress: vulnerabilità note in plugin/temi
- **8%**: password deboli
- **2%**: hosting compromesso

Il problema non è WordPress in sé. È l'ecosistema:
- 60.000+ plugin, molti abbandonati o insicuri
- Utenti che non aggiornano
- Password "pippo123"

## L'Alternativa: Siti che Non Si Possono Hackerare

Esiste una categoria di siti **tecnicamente impossibili da hackerare**: i siti statici.

**Perché sono sicuri?**
- Nessun database da attaccare
- Nessun PHP da sfruttare
- Nessun login da forzare
- Nessun plugin vulnerabile
- Solo file HTML/CSS

Non c'è niente da hackerare. È come cercare di scassinare una porta che non esiste.

**Per chi sono adatti:**
- Siti aziendali
- Portfolio
- Blog
- Landing page

**Non adatti per:**
- E-commerce (serve carrello dinamico)
- Siti con area utenti
- Applicazioni web complesse

## Quanto Costa un Hack?

Facciamo i conti:

| Voce | Costo |
|------|-------|
| Pulizia professionale | 200-500€ |
| Messa in sicurezza | 200-400€ |
| Giorni di downtime | ? (clienti persi) |
| Danno reputazionale | ? (incalcolabile) |
| Penalizzazione Google | ? (mesi per recuperare) |
| Stress e tempo | ? |

**Totale minimo: 400-1.000€**

Più il danno invisibile: clienti che non si fidano più, ranking perso, notti insonni.

## Conclusione

Se il tuo sito è stato hackerato:

1. ✅ Mettilo offline subito
2. ✅ Cambia tutte le password
3. ✅ Puliscilo (da solo o con professionista)
4. ✅ Aggiorna tutto
5. ✅ Metti in sicurezza

Ma la vera domanda è: **quante volte vuoi passare da questo incubo?**

Ogni sito WordPress è un bersaglio. Puoi proteggerlo, ma richiede manutenzione costante.

L'alternativa esiste.

---

**Stufo di preoccuparti della sicurezza?**

Realizzo siti impossibili da hackerare. Zero WordPress, zero database, zero rischi.

[Scopri come funziona →](/servizi/)

*Se il tuo sito WordPress ha bisogno di pulizia, posso consigliarti il professionista giusto. [Contattami](/contatti/).*
