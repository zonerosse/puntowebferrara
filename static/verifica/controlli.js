// controlli.js — i controlli che compongono il punteggio.
// Ogni voce dichiara quanto pesa, perché conta e come si sistema.
// I testi sono la parte che si aggiorna più spesso: stanno tutti qui.

export const CONTROLLI = [

{ gruppo:'Accesso dei motori IA', peso:14, voci:[
  { id:'botPrimari', punti:6, nome:'ChatGPT, Claude e Perplexity possono leggere il sito',
    no:'ChatGPT, Claude o Perplexity sono bloccati',
    perche:'Il file robots.txt contiene una direttiva Disallow per ciascun crawler che vuoi escludere. I cinque token che contano qui — GPTBot, OAI-SearchBot, ChatGPT-User, ClaudeBot, PerplexityBot — alimentano le risposte che milioni di persone leggono al posto dei risultati di Google. Se anche uno solo è escluso, quel motore non può recuperare le tue pagine e quindi non può citarle: non appari nella risposta, e non c\u2019è nessun segnale che ti avverta.',
    come:'Apri robots.txt e cerca i blocchi User-agent con quei nomi. Togli le righe Disallow: / che li riguardano, oppure sostituiscile con Allow: /. Attenzione al blocco generico User-agent: *, che vale per chiunque non abbia una regola dedicata. Molti plugin SEO per WordPress aggiungono queste esclusioni per impostazione predefinita, senza dirtelo.',
    fonte:{n:'OpenAI — I nostri crawler e come gestirli',u:'https://platform.openai.com/docs/bots'} },

  { id:'botSecondari', punti:4, nome:'Google, Bing e Apple possono leggere il sito',
    fonte:{n:'OpenAI — I nostri crawler e come gestirli',u:'https://platform.openai.com/docs/bots'},
    fonte:{n:'Google — Panoramica dei crawler',u:'https://developers.google.com/search/docs/crawling-indexing/overview-google-crawlers'},
    no:'Google, Bing o Apple sono bloccati',
    perche:'Google-Extended è il token che governa l\u2019uso dei tuoi contenuti in Gemini e nelle AI Overviews, ed è separato da Googlebot: bloccarlo non toglie il sito dai risultati classici, ma lo toglie dalle risposte generate. Lo stesso vale per Applebot-Extended con Apple Intelligence e per Bingbot con Copilot.',
    come:'Nel robots.txt lascia accessibili Google-Extended, GoogleOther, Applebot-Extended e Bingbot. Se hai un motivo per escludere i tuoi contenuti dall\u2019addestramento è una scelta legittima, ma va fatta sapendo che rinunci anche alla citazione.' },

  { id:'sitemap', punti:2, nome:'Il sito dichiara una sitemap',
    fonte:{n:'Google — Google-Extended e crawler IA',u:'https://developers.google.com/search/docs/crawling-indexing/overview-google-crawlers'},
    no:'Il sito non dichiara nessuna sitemap',
    perche:'La sitemap XML è l\u2019elenco esplicito degli URL che vuoi far indicizzare, con l\u2019ultima modifica di ciascuno. Senza, i crawler devono scoprire le pagine seguendo i collegamenti interni: le pagine profonde o poco linkate vengono trovate tardi o mai, e gli aggiornamenti passano inosservati per settimane.',
    come:'Genera sitemap.xml e dichiarala nel robots.txt con la riga Sitemap: seguita dall\u2019indirizzo completo. Se il sito è multilingua usa un sitemap index che punta a una sitemap per lingua. Poi inviala in Google Search Console: da lì vedi anche quante pagine sono state effettivamente indicizzate.' },

  { id:'llms', punti:2, nome:'È presente il file llms.txt',
    fonte:{n:'Google — Creare e inviare una sitemap',u:'https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap'},
    no:'Manca il file llms.txt',
    perche:'È una convenzione recente, non uno standard ufficiale: un file di testo in markdown nella radice del sito che riassume cosa contiene e indica le pagine principali. Serve agli agenti IA che devono capire in fretta com\u2019è fatto un sito senza scaricarne cinquanta pagine. Costa dieci minuti e qualche agente già lo legge.',
    come:'Crea llms.txt nella cartella principale con un titolo, un paragrafo di descrizione e un elenco puntato delle pagine importanti, ciascuna con indirizzo e una riga di spiegazione. Chi vuole fare il passo in più genera anche llms-full.txt con il testo completo delle pagine.' },
]},

{ gruppo:'Dati strutturati', peso:16, voci:[
  { id:'jsonLd', punti:4, nome:'Le pagine contengono dati strutturati JSON-LD',
    fonte:{n:'Specifica llms.txt',u:'https://llmstxt.org/'},
    no:'Le pagine non contengono dati strutturati JSON-LD',
    perche:'JSON-LD è il formato con cui una pagina dichiara in modo leggibile da una macchina che cosa rappresenta, usando il vocabolario schema.org. Senza, il motore deve dedurre tutto dal testo: capisce che parli di qualcosa, ma non sa se sei un\u2019attività, un articolo o un catalogo, e nel dubbio non ti propone.',
    come:'Inserisci un blocco script con type="application/ld+json" nella parte alta di ogni pagina. Su WordPress lo generano i plugin SEO, su un sito statico si mette nel template così vale per tutte le pagine insieme. Non usare microdata o RDFa: Google raccomanda esplicitamente JSON-LD.' },

  { id:'jsonLdValido', punti:4, nome:'I dati strutturati sono tutti validi',
    fonte:{n:'Google — Introduzione ai dati strutturati',u:'https://developers.google.com/search/docs/appearance/structured-data/intro-structured-data'},
    no:'Alcuni dati strutturati non sono validi e vengono scartati',
    perche:'Il parser JSON è intollerante: una virgola di troppo, un apostrofo tipografico non protetto o un a capo dentro una stringa fanno scartare il blocco per intero. Il markup c\u2019è, il lavoro è stato fatto, ma per il motore non esiste — e nessuno ti avvisa. È l\u2019errore più frustrante perché è invisibile.',
    come:'Incolla l\u2019indirizzo su validator.schema.org: ti indica riga e colonna. Le cause ricorrenti sono le virgolette curve inserite dall\u2019editor, le virgole finali prima di una parentesi chiusa, e i campi generati dinamicamente che restano vuoti.' },

  { id:'schemaEntita', punti:3, nome:'È dichiarato chi c\u2019è dietro il sito',
    fonte:{n:'Validatore ufficiale schema.org',u:'https://validator.schema.org/'},
    no:'Non è dichiarato chi c’è dietro il sito',
    perche:'Il tipo Organization, o LocalBusiness se hai una sede fisica aperta al pubblico, è ciò che collega il sito a un soggetto reale. È il punto da cui partono i motori per costruire l\u2019entità: senza, non hai un\u2019identità riconoscibile e ogni pagina viene valutata isolata dalle altre.',
    come:'Aggiungi un blocco Organization o LocalBusiness con name, url, logo, address, telephone, email e un identificatore stabile con @id, tipo https://tuosito.it/#organization. Poi richiamalo dalle altre pagine con @id invece di riscriverlo: così il grafo resta coerente.' },

  { id:'entitaCompleta', punti:2, nome:'La scheda dell\u2019attività è completa',
    fonte:{n:'Google — Dati strutturati LocalBusiness',u:'https://developers.google.com/search/docs/appearance/structured-data/local-business'},
    no:'La scheda dell’attività è incompleta',
    perche:'Una scheda con il solo campo name non permette nessuna verifica incrociata. I motori confrontano nome, indirizzo e telefono dichiarati nello schema con quelli di Google Business Profile, delle directory e delle recensioni: se i campi mancano, il confronto non si può fare e la fiducia resta bassa.',
    come:'Compila address con PostalAddress completo di streetAddress, postalCode, addressLocality e addressCountry; aggiungi telephone in formato internazionale, email, e un array sameAs con i profili social e le schede esterne. Se hai una sede, aggiungi anche geo con latitudine e longitudine.' },

  { id:'schemaContenuto', punti:1, nome:'Le pagine dichiarano che tipo di contenuto sono',
    fonte:{n:'schema.org — Organization',u:'https://schema.org/Organization'},
    no:'Le pagine non dichiarano che tipo di contenuto sono',
    perche:'Dire che una pagina è un Article, un CollectionPage o una ContactPage permette al motore di scegliere quella giusta per la domanda ricevuta, e di estrarne i campi previsti da quel tipo: data di pubblicazione, autore, elenco degli elementi. Una pagina non tipizzata resta un blocco di testo indistinto.',
    come:'Assegna Article ai contenuti datati, con author, datePublished e dateModified; CollectionPage agli elenchi; AboutPage al chi siamo; ContactPage ai contatti; FAQPage dove ci sono coppie di domanda e risposta. Un tipo per pagina: due FAQPage sulla stessa pagina si annullano a vicenda.' },

  { id:'schemaSito', punti:1, nome:'Il sito è dichiarato come entità',
    fonte:{n:'Google — Galleria dei dati strutturati',u:'https://developers.google.com/search/docs/appearance/structured-data/search-gallery'},
    no:'Il sito non è dichiarato come entità',
    perche:'Il tipo WebSite rappresenta il sito nel suo insieme e fa da contenitore a cui le singole pagine si agganciano con isPartOf. È l\u2019elemento che permette a un motore di capire che quaranta pagine diverse appartengono allo stesso progetto invece di essere quaranta cose slegate.',
    come:'Aggiungi un blocco WebSite con url, name, inLanguage e publisher che punta con @id all\u2019Organization. Non aggiungere SearchAction se non hai una ricerca interna funzionante: dichiarare una funzione che non esiste è peggio che ometterla.' },

  { id:'briciole', punti:1, nome:'È presente il percorso di navigazione',
    fonte:{n:'schema.org — WebSite',u:'https://schema.org/WebSite'},
    no:'Manca il percorso di navigazione',
    perche:'Il BreadcrumbList descrive la posizione della pagina nella gerarchia del sito. Google lo usa per sostituire l\u2019indirizzo nudo con il percorso leggibile nei risultati, e i motori IA lo usano per capire quali pagine sono principali e quali di dettaglio.',
    come:'Aggiungi un BreadcrumbList con itemListElement numerati dalla home alla pagina corrente. Deve rispecchiare la struttura del sito, non il percorso che ha fatto il visitatore.' },
]},

{ gruppo:'Segnali E-E-A-T', peso:12, eeat:true, voci:[
  { id:'firmaVisibile', punti:2, nome:'I contenuti sono firmati e datati',
    no:'I contenuti non sono firmati né datati',
    perche:'Google chiama questo blocco di criteri E-E-A-T: esperienza, competenza, autorevolezza, affidabilità. Non è un punteggio interno che il motore calcola, è il metro che i valutatori umani usano nelle linee guida, e che l\u2019algoritmo prova ad approssimare con segnali osservabili. Il primo è il più elementare: chi ha scritto questa pagina, e quando. Un testo anonimo e senza data è indistinguibile da uno generato in serie.',
    come:'Aggiungi in fondo o in cima a ogni contenuto il nome di chi scrive e la data di ultimo aggiornamento, con un elemento time e l\u2019attributo datetime. Il nome deve rimandare a una pagina che dice chi è quella persona.',
    fonte:{n:'Google — Chi, come e perché dei contenuti',u:'https://developers.google.com/search/docs/fundamentals/creating-helpful-content'} },

  { id:'autoreSchema', punti:2, nome:'L\u2019autore è dichiarato nei dati strutturati',
    no:'L\u2019autore non è dichiarato nei dati strutturati',
    perche:'La firma a video la legge una persona; il campo author dello schema la legge una macchina. È il ponte fra il testo e l\u2019entità che lo ha prodotto, e permette a un motore di collegare fra loro tutti i contenuti della stessa persona anche su siti diversi.',
    come:'Nel blocco Article aggiungi author con un oggetto Person che abbia name, url della pagina biografica, e possibilmente jobTitle e knowsAbout. Usa un @id stabile per la persona, così tutti i contenuti puntano allo stesso soggetto.',
    fonte:{n:'Google — Dati strutturati Article',u:'https://developers.google.com/search/docs/appearance/structured-data/article'} },

  { id:'dataModifica', punti:1, nome:'È dichiarata la data di pubblicazione o aggiornamento',
    no:'Manca la data di pubblicazione o aggiornamento',
    perche:'Per molte domande la freschezza cambia la risposta: prezzi, normative, versioni. Senza una data dichiarata nei dati strutturati il motore non sa se il contenuto è di ieri o del 2016, e nel dubbio preferisce una fonte datata.',
    come:'Aggiungi datePublished e dateModified in formato ISO nel blocco Article. Aggiorna davvero dateModified quando modifichi il contenuto: cambiarla senza toccare il testo è una pratica che Google riconosce e ignora.',
    fonte:{n:'Google — Date nei risultati di ricerca',u:'https://developers.google.com/search/docs/appearance/publication-dates'} },

  { id:'sameAs', punti:2, nome:'L\u2019attività è collegata ai suoi profili esterni',
    no:'L\u2019attività non è collegata a nessun profilo esterno',
    perche:'La proprietà sameAs elenca gli altri luoghi in cui la stessa entità esiste: pagina Facebook, canale YouTube, profilo LinkedIn, scheda Google, voce Wikidata. È il modo con cui un motore verifica che il soggetto sia reale e non un sito nato ieri, ed è la base del riconoscimento dell\u2019entità nelle risposte generate.',
    come:'Nel blocco Organization aggiungi un array sameAs con gli indirizzi completi dei tuoi profili. Devono essere profili attivi e riconducibili con evidenza alla stessa attività: elencarne di altrui o abbandonati non aiuta.',
    fonte:{n:'schema.org — proprietà sameAs',u:'https://schema.org/sameAs'} },

  { id:'citazioni', punti:2, nome:'Le guide e gli articoli citano fonti esterne',
    no:'Le guide e gli articoli non citano fonti esterne',
    perche:'Il controllo riguarda solo le pagine informative — guide, articoli, FAQ — perché una pagina contatti o un elenco non ha nulla da citare. Un testo che afferma senza mai rimandare a una fonte è indistinguibile da un\u2019opinione. I collegamenti a documentazione ufficiale, normative, enciclopedie o studi sono il segnale più diretto che dietro c\u2019è una verifica, e i motori generativi tendono a citare volentieri le pagine che a loro volta citano.',
    come:'Quando affermi un dato, un limite di legge o una specifica tecnica, collega la fonte originale. Meglio la documentazione ufficiale del produttore o l\u2019atto normativo che un articolo di terzi che li riassume.',
    fonte:{n:'Google — Creare contenuti utili e affidabili',u:'https://developers.google.com/search/docs/fundamentals/creating-helpful-content'} },

  { id:'paginePolicy', punti:1, nome:'Ci sono privacy policy e note legali',
    no:'Mancano privacy policy o note legali',
    perche:'Nelle linee guida per i valutatori, l\u2019assenza di informazioni su chi gestisce il sito è motivo di valutazione bassa, soprattutto per le attività che trattano denaro o dati. Sono anche un obbligo di legge in Italia e nell\u2019Unione Europea, non solo un segnale.',
    come:'Pubblica una privacy policy che dica quali dati raccogli e con quali strumenti, e una pagina di note legali con partita IVA o codice fiscale, forma giuridica e recapiti. Collegale dal piè di pagina di ogni pagina.',
    fonte:{n:'Google — Linee guida per i valutatori della qualità',u:'https://guidelines.raterhub.com/searchqualityevaluatorguidelines.pdf'} },

  { id:'paginaContatti', punti:1, nome:'Esiste una pagina di contatti raggiungibile',
    no:'Non esiste una pagina di contatti raggiungibile',
    perche:'Una via di contatto visibile è uno dei pochi elementi che le linee guida citano esplicitamente come indicatore di affidabilità. Un sito che vende o consiglia senza dire come lo si raggiunge viene trattato con sospetto, dai valutatori e dai lettori.',
    come:'Crea una pagina contatti con telefono, email e indirizzo, coerenti con quelli dichiarati nei dati strutturati e nella scheda Google. Collegala dal menu principale, non solo dal piè di pagina.',
    fonte:{n:'Google — Linee guida per i valutatori della qualità',u:'https://guidelines.raterhub.com/searchqualityevaluatorguidelines.pdf'} },

  { id:'ancoreDescrittive', punti:1, nome:'I collegamenti dicono dove portano',
    no:'Molti collegamenti hanno testo generico',
    perche:'Il testo di un link è ciò che il motore usa per capire di cosa parla la pagina di destinazione, ed è anche ciò che sente chi naviga con un lettore di schermo saltando da un collegamento all\u2019altro. Una pagina piena di "clicca qui" non trasmette niente a nessuno dei due.',
    come:'Scrivi il collegamento sulle parole che descrivono la destinazione: non "per i prezzi clicca qui" ma "i prezzi dei siti vetrina". Vale anche per i pulsanti, dove l\u2019attributo title o aria-label può integrare un testo breve.',
    fonte:{n:'Google — Rendere i link scansionabili',u:'https://developers.google.com/search/docs/crawling-indexing/links-crawlable'} },
]},

{ gruppo:'Struttura dei contenuti', peso:12, voci:[
  { id:'h1unico', punti:3, nome:'Ogni pagina ha un solo titolo principale',
    fonte:{n:'Google — Breadcrumb',u:'https://developers.google.com/search/docs/appearance/structured-data/breadcrumb'},
    no:'Le pagine non hanno un solo titolo principale',
    perche:'L\u2019H1 è la dichiarazione dell\u2019argomento della pagina, e i motori lo pesano più di ogni altro elemento del corpo. Se ne mancano, l\u2019argomento va dedotto; se ce ne sono due o tre, la pagina sembra parlare di cose diverse e nessuna prevale.',
    come:'Un solo H1 per pagina, corrispondente al contenuto vero, possibilmente coerente con il tag title senza esserne la copia esatta. Gli slogan grafici e i titoli decorativi vanno in H2 o in un elemento neutro con lo stile che preferisci.' },

  { id:'titoliOrdinati', punti:3, nome:'I livelli dei titoli non saltano',
    fonte:{n:'W3C WAI — Titoli di pagina',u:'https://www.w3.org/WAI/tutorials/page-structure/headings/'},
    no:'I livelli dei titoli saltano',
    perche:'La sequenza H1, H2, H3 non è estetica: è la struttura ad albero del documento. Saltare da H1 a H4 crea un ramo orfano, rompe l\u2019indice che il motore ricostruisce per capire cosa sta sotto cosa, e disorienta chi naviga con un lettore di schermo, che si sposta proprio saltando di titolo in titolo.',
    come:'Scegli il livello in base alla gerarchia del contenuto, mai in base a quanto vuoi grande il testo: la dimensione si regola con il CSS. Un H4 dentro una scheda va bene solo se quella scheda sta sotto un H3.' },

  { id:'haH2', punti:2, nome:'I contenuti sono divisi in sezioni',
    fonte:{n:'W3C WAI — Struttura dei titoli',u:'https://www.w3.org/WAI/tutorials/page-structure/headings/'},
    no:'I contenuti non sono divisi in sezioni',
    perche:'I motori generativi non citano pagine intere: estraggono passaggi autosufficienti. Un H2 che pone una domanda o annuncia un tema, seguito da un paragrafo che risponde, è la forma più facile da estrarre. Un muro di testo senza sottotitoli non offre nessun punto di presa.',
    come:'Inserisci un H2 ogni due o tre paragrafi, con un titolo che dica cosa c\u2019è sotto invece di essere evocativo. Metti la risposta nella prima frase del paragrafo, non in fondo: è quella che viene estratta.' },

  { id:'testoSufficiente', punti:2, nome:'Le pagine hanno abbastanza testo',
    fonte:{n:'Google — Creare contenuti utili',u:'https://developers.google.com/search/docs/fundamentals/creating-helpful-content'},
    no:'Le pagine non hanno abbastanza testo',
    perche:'Sotto le trecento parole non c\u2019è materiale sufficiente perché un motore possa ricavarne una risposta compiuta. La pagina viene indicizzata ma resta inerte: non si posiziona e non viene citata. In quantità, le pagine sottili peggiorano anche la percezione complessiva del sito.',
    come:'Amplia con contenuto realmente utile, o unisci più pagine sottili in una sola più solida con un redirect 301 dalle vecchie. Se una pagina serve solo come modulo o ringraziamento, escludila con noindex invece di lasciarla pesare.' },

  { id:'domandeCoperte', punti:1, nome:'Le domande nel testo sono marcate come FAQ',
    fonte:{n:'Google — Norme antispam',u:'https://developers.google.com/search/docs/essentials/spam-policies'},
    no:'Le domande nel testo non sono marcate come FAQ',
    perche:'Se hai già scritto domande e risposte, il markup FAQPage le rende estraibili così come sono, senza toccare una virgola del testo. È il rapporto migliore fra lavoro e risultato che esista in questo campo.',
    come:'Aggiungi un blocco FAQPage con mainEntity, una Question per ogni domanda e la sua acceptedAnswer. Il testo deve corrispondere a quello visibile nella pagina: dichiarare risposte che il visitatore non vede è una violazione delle linee guida.' },

  { id:'collegata', punti:1, nome:'Le pagine sono collegate fra loro',
    fonte:{n:'Google — Dati strutturati FAQPage',u:'https://developers.google.com/search/docs/appearance/structured-data/faqpage'},
    no:'Le pagine non sono collegate fra loro',
    perche:'I collegamenti interni distribuiscono autorità e dicono al motore quali pagine consideri importanti. Una pagina che non riceve né manda link è orfana: viene scoperta tardi, aggiornata di rado nell\u2019indice e valutata poco.',
    come:'Aggiungi almeno tre collegamenti verso pagine correlate, con un testo che descriva la destinazione invece di dire "clicca qui". Le pagine più importanti dovrebbero essere raggiungibili in non più di tre passaggi dalla home.' },
]},

{ gruppo:'Indicizzazione', peso:12, voci:[
  { id:'canonical', punti:4, nome:'Ogni pagina dichiara il proprio indirizzo canonico',
    fonte:{n:'Google — Link scansionabili',u:'https://developers.google.com/search/docs/crawling-indexing/links-crawlable'},
    no:'Le pagine non dichiarano il proprio indirizzo canonico',
    perche:'Lo stesso contenuto raggiungibile con e senza barra finale, con parametri di tracciamento o da percorsi diversi diventa più URL distinti agli occhi del motore. Il rel="canonical" indica quale è quello buono e concentra su di lui i segnali, invece di disperderli su copie che si fanno concorrenza.',
    come:'Inserisci in ogni pagina un link rel="canonical" con l\u2019URL assoluto e definitivo, completo di protocollo e di barra finale se il sito la usa. Deve essere autoreferenziale: la pagina indica se stessa.' },

  { id:'canonicalCoerente', punti:2, nome:'I canonical puntano alla pagina stessa',
    fonte:{n:'Google — Consolidare gli URL duplicati',u:'https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls'},
    no:'Ci sono canonical che puntano ad altre pagine',
    perche:'Un canonical che indica un altro indirizzo è una richiesta esplicita di non indicizzare questa pagina e di attribuire tutto all\u2019altra. Quando è un errore di configurazione — capita spesso con i template duplicati o le migrazioni — stai cancellando pagine dall\u2019indice senza accorgertene.',
    come:'Verifica che ogni canonical corrisponda all\u2019URL della pagina che lo contiene. Le eccezioni volute esistono, come le pagine filtrate o paginate che puntano alla principale, ma devono essere una scelta, non un residuo.' },

  { id:'lang', punti:2, nome:'È dichiarata la lingua della pagina',
    fonte:{n:'Google — Consolidare gli URL duplicati',u:'https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls'},
    no:'Non è dichiarata la lingua della pagina',
    perche:'L\u2019attributo lang sul tag html dice a motori, browser e lettori di schermo in che lingua è scritto il contenuto. Senza, un testo italiano può finire valutato fra i risultati inglesi, e la sintesi vocale lo legge con la pronuncia sbagliata.',
    come:'Aggiungi lang="it" al tag html, o il codice giusto per ogni versione linguistica. Se dentro la pagina ci sono blocchi in un\u2019altra lingua, marcali con un lang locale sul loro contenitore.' },

  { id:'hreflangOk', punti:2, nome:'Le versioni in altre lingue sono collegate',
    fonte:{n:'MDN — Attributo lang',u:'https://developer.mozilla.org/it/docs/Web/HTML/Global_attributes/lang'},
    no:'Le versioni in altre lingue non sono collegate come dovrebbero',
    perche:'Gli hreflang dicono a Google quale versione mostrare a seconda della lingua del visitatore. Perché funzionino devono essere reciproci: se la pagina italiana indica la tedesca, quella tedesca deve indicare l\u2019italiana. Un collegamento a senso unico viene ignorato in blocco, e agli italiani può capitare la pagina tedesca.',
    come:'Ogni pagina deve elencare tutte le sue traduzioni, se stessa compresa, con URL assoluti. Aggiungi x-default per indicare la versione di riserva. Se una traduzione non esiste, non inventare il collegamento.' },

  { id:'nap', punti:2, nome:'Indirizzo, telefono e coordinate coincidono ovunque',
    fonte:{n:'Google — Versioni localizzate',u:'https://developers.google.com/search/docs/specialty/international/localized-versions'},
    no:'Indirizzo, telefono o coordinate non coincidono ovunque',
    perche:'Nel posizionamento locale conta la coerenza dei dati di contatto fra sito, scheda Google e directory esterne. Se il sito stesso dichiara due CAP diversi o due coppie di coordinate, il motore non sa quale credere e abbassa la fiducia sull\u2019intera entità. È il controllo che praticamente nessuno strumento commerciale esegue.',
    come:'Tieni i dati di contatto in un punto solo del progetto — una variabile di configurazione — e richiamali ovunque, invece di riscriverli pagina per pagina. Poi confrontali con la scheda Google, che deve dire esattamente la stessa cosa.' },
]},

{ gruppo:'Metadati e condivisione', peso:9, voci:[
  { id:'titleOk', punti:2, nome:'I titoli per Google sono di lunghezza corretta',
    fonte:{n:'Google — Posizionamento locale',u:'https://support.google.com/business/answer/7091'},
    no:'I titoli per Google non sono di lunghezza corretta',
    perche:'Il tag title è la riga cliccabile nei risultati e uno dei segnali più pesanti per capire di cosa parla la pagina. Oltre i sessanta caratteri circa viene troncato — il limite reale è in pixel, non in lettere — e sotto i quindici non dice abbastanza per distinguerla dalle altre.',
    come:'Scrivi titoli fra i trenta e i sessanta caratteri, con il concetto principale all\u2019inizio perché è la parte che sopravvive al taglio. Uno diverso per ogni pagina. Il nome del sito, se lo metti, va in fondo dopo un separatore.' },

  { id:'descrizioneOk', punti:2, nome:'Le descrizioni sono di lunghezza corretta',
    fonte:{n:'Google — Link del titolo',u:'https://developers.google.com/search/docs/appearance/title-link'},
    no:'Le descrizioni non sono di lunghezza corretta',
    perche:'La meta description non influisce sulla posizione ma decide quanti clic ricevi a parità di posizione. Se manca o è troppo corta, Google ritaglia da solo una frase dalla pagina, spesso una qualsiasi. È l\u2019unico pezzo di testo pubblicitario che puoi controllare gratis nei risultati.',
    come:'Scrivi fra i settanta e i centosessantacinque caratteri, dicendo cosa trova chi entra e perché dovrebbe entrare proprio qui. Una diversa per ogni pagina, e senza ripetere parola per parola il title.' },

  { id:'titoliUnici', punti:2, nome:'Titoli e descrizioni non sono duplicati',
    fonte:{n:'Google — Snippet e meta description',u:'https://developers.google.com/search/docs/appearance/snippet'},
    no:'Ci sono titoli o descrizioni duplicati',
    perche:'Due pagine con lo stesso title sembrano al motore la stessa pagina replicata. Ne sceglie una, ignora l\u2019altra, e nessuna delle due si posiziona bene. Succede quasi sempre sulle pagine generate in serie: schede prodotto, categorie, paginazioni.',
    come:'Rendi ogni titolo specifico del suo contenuto, inserendo l\u2019elemento che distingue quella pagina. Se hai davvero pagine quasi identiche, valuta se non convenga unirle o escluderne alcune dagli indici.' },

  { id:'openGraph', punti:2, nome:'Le condivisioni mostrano titolo e immagine',
    fonte:{n:'Google — Link del titolo',u:'https://developers.google.com/search/docs/appearance/title-link'},
    no:'Le condivisioni non mostrano titolo e immagine',
    perche:'Il protocollo Open Graph controlla l\u2019anteprima quando un indirizzo viene incollato su WhatsApp, Facebook, LinkedIn o Telegram. Senza, esce una riga di testo grigia e i clic crollano: l\u2019anteprima con immagine fa la differenza fra un collegamento che viene aperto e uno che scorre via.',
    come:'Aggiungi og:title, og:description, og:image, og:url e og:type. L\u2019immagine deve essere da 1200 per 630 pixel, con URL assoluto, sotto i cinque megabyte. Verifica il risultato con il debugger di Facebook, che mostra cosa vede davvero.' },

  { id:'viewport', punti:1, nome:'Il sito è impostato per il telefono',
    fonte:{n:'Protocollo Open Graph',u:'https://ogp.me/'},
    no:'Il sito non è impostato per il telefono',
    perche:'Senza il meta viewport il browser mobile finge una finestra da desktop e rimpicciolisce tutto, rendendo il testo illeggibile. Google indicizza il web guardandolo da telefono, quindi è quella la versione che valuta.',
    come:'Aggiungi il meta viewport con width=device-width e initial-scale=1. Non impostare maximum-scale né user-scalable=no: impedire lo zoom è un problema di accessibilità.' },
]},

{ gruppo:'Sicurezza e configurazione', peso:10, voci:[
  { id:'https', punti:3, nome:'Il sito viaggia in HTTPS',
    fonte:{n:'MDN — Meta viewport',u:'https://developer.mozilla.org/it/docs/Web/HTML/Viewport_meta_tag'},
    no:'Il sito non viaggia in HTTPS',
    perche:'Senza certificato TLS il browser scrive "Non sicuro" accanto all\u2019indirizzo, i moduli di contatto mostrano un avviso, e Google usa HTTPS come segnale di posizionamento dichiarato dal 2014. Oggi il certificato è gratuito e automatico: non averlo è solo trascuratezza.',
    come:'Attiva un certificato Let\u2019s Encrypt, incluso in qualsiasi hosting serio e in Cloudflare. Poi imposta un redirect 301 permanente da http a https, e correggi i riferimenti interni che puntano ancora alla versione in chiaro.' },

  { id:'intestazioniSicurezza', punti:3, nome:'Sono presenti le intestazioni di sicurezza',
    fonte:{n:'Google — HTTPS come segnale',u:'https://developers.google.com/search/docs/crawling-indexing/https'},
    no:'Non sono presenti le intestazioni di sicurezza',
    perche:'Poche righe di configurazione del server che chiudono attacchi noti: X-Content-Type-Options impedisce al browser di indovinare il tipo di un file e di eseguirlo, X-Frame-Options impedisce a un altro sito di incorniciare il tuo per raccogliere clic, Referrer-Policy limita i dati che mandi ai siti verso cui esci.',
    come:'Aggiungi X-Content-Type-Options: nosniff, X-Frame-Options: DENY e Referrer-Policy: strict-origin-when-cross-origin. La Content-Security-Policy è la più efficace ma va tarata sul sito, perché se sbagliata blocca risorse legittime.' },

  { id:'hsts', punti:2, nome:'È attivo HSTS',
    fonte:{n:'OWASP — Secure Headers Project',u:'https://owasp.org/www-project-secure-headers/'},
    no:'HSTS non è attivo',
    perche:'Strict-Transport-Security dice al browser di usare esclusivamente HTTPS su questo dominio per il periodo indicato, anche se qualcuno lo porta sulla versione in chiaro. Chiude la finestra del primo accesso, che è quella sfruttata dagli attacchi di declassamento su reti pubbliche.',
    come:'Aggiungi Strict-Transport-Security con max-age di almeno un anno, cioè 31536000 secondi. Attivalo solo dopo esserti accertato che tutto, sottodomini compresi, funzioni in HTTPS: una volta memorizzato dal browser non si torna indietro in fretta.' },

  { id:'quattroZeroQuattro', punti:2, nome:'Gli indirizzi inesistenti rispondono 404',
    fonte:{n:'MDN — Strict-Transport-Security',u:'https://developer.mozilla.org/it/docs/Web/HTTP/Headers/Strict-Transport-Security'},
    no:'Gli indirizzi inesistenti non rispondono 404',
    perche:'Se un indirizzo che non esiste risponde 200 invece di 404 — il cosiddetto soft 404, tipico dei redirect automatici alla home — il motore crede che quelle pagine esistano e continua a chiederle. Il risultato è un budget di scansione bruciato su pagine fantasma, sottratto a quelle vere.',
    come:'Configura il server perché gli URL non trovati restituiscano davvero il codice 404, o 410 se la pagina è stata rimossa apposta. La pagina di errore può essere bella quanto vuoi, ma il codice di stato deve dire la verità.' },
]},

{ gruppo:'Peso e codice', peso:7, voci:[
  { id:'pesoPagina', punti:1, nome:'Le pagine non sono troppo pesanti',
    fonte:{n:'Google — Errori HTTP e di rete',u:'https://developers.google.com/search/docs/crawling-indexing/http-network-errors'},
    no:'Le pagine sono troppo pesanti',
    perche:'Oltre i 250 KB di solo HTML, escluse immagini e script, la pagina è lenta a scaricarsi sulle reti mobili e faticosa da analizzare per i crawler, che in certi casi la troncano perdendo la parte finale. Di solito il peso viene da CSS incorporato o da codice generato che nessuno rilegge.',
    come:'Sposta il CSS in un file esterno, che viene messo in cache e riusato su tutte le pagine. Elimina il markup ridondante lasciato dai costruttori visuali e i commenti generati automaticamente.' },

  { id:'scriptNonBloccanti', punti:2, nome:'Gli script non bloccano il disegno della pagina',
    fonte:{n:'web.dev — Largest Contentful Paint',u:'https://web.dev/articles/lcp'},
    no:'Gli script bloccano il disegno della pagina',
    perche:'Uno script senza defer né async ferma il parser HTML finché non è stato scaricato ed eseguito. Con quattro o cinque script in testa la pagina resta bianca per interi secondi anche se il contenuto è già arrivato. È la causa più comune di un punteggio prestazioni basso a parità di contenuto.',
    come:'Aggiungi defer agli script che manipolano la pagina e async a quelli indipendenti, come le statistiche. Sposta in fondo al body quello che non puoi rinviare, e togli le librerie che non usi più: nei siti cresciuti negli anni sono quasi sempre parecchie.' },

  { id:'immaginiConAlt', punti:2, nome:'Le immagini hanno il testo alternativo',
    fonte:{n:'MDN — script, defer e async',u:'https://developer.mozilla.org/it/docs/Web/HTML/Element/script'},
    no:'Le immagini non hanno il testo alternativo',
    perche:'L\u2019attributo alt è ciò che viene letto da chi usa un lettore di schermo e ciò che il motore usa per capire il contenuto dell\u2019immagine, dato che il file in sé gli dice poco. È anche il testo mostrato quando l\u2019immagine non carica. Senza, quella parte di pagina è muta.',
    come:'Descrivi cosa si vede, in modo specifico: non "foto", ma "cucciolo di Staffordshire Bull Terrier nero di tre settimane". Le immagini puramente decorative vanno lasciate con alt vuoto, cioè alt="", così i lettori di schermo le saltano invece di annunciarle.' },

  { id:'immaginiConMisure', punti:1, nome:'Le immagini dichiarano le proprie misure',
    fonte:{n:'W3C WAI — Testo alternativo',u:'https://www.w3.org/WAI/tutorials/images/'},
    no:'Le immagini non dichiarano le proprie misure',
    perche:'Senza gli attributi width e height il browser non sa quanto spazio riservare, quindi disegna il testo e poi lo sposta quando l\u2019immagine arriva. Quello spostamento è il Cumulative Layout Shift, una delle tre metriche che Google misura ufficialmente: fastidioso per chi legge e penalizzante nel punteggio.',
    come:'Metti width e height su ogni tag img con le dimensioni reali del file. Il rapporto fra i due basta al browser per riservare lo spazio, poi il CSS può ridimensionare liberamente.' },

  { id:'immaginiLeggere', punti:1, nome:'Le immagini usano formati moderni',
    fonte:{n:'web.dev — Cumulative Layout Shift',u:'https://web.dev/articles/cls'},
    no:'Le immagini non usano formati moderni',
    perche:'AVIF e WebP pesano fra il quaranta e il sessanta per cento in meno di JPG e PNG a parità di qualità percepita. Su un sito ricco di fotografie è l\u2019intervento singolo che sposta di più il tempo di caricamento, molto più di qualsiasi ottimizzazione del codice.',
    come:'Converti le immagini in AVIF, con WebP come riserva e il formato originale come ultima spiaggia, usando l\u2019elemento picture con più source. Aggiungi srcset per servire dimensioni diverse a schermi diversi invece di rimpicciolire un file enorme via CSS.' },
]},

{ gruppo:'Prestazioni misurate (Lighthouse)', peso:8, lighthouse:true, voci:[
  { id:'lhPerformance', punti:3, nome:'Punteggio prestazioni',
    fonte:{n:'web.dev — Formati immagine moderni',u:'https://web.dev/articles/serve-images-webp'},
    fonte:{n:'web.dev — Formati immagine moderni',u:'https://web.dev/articles/serve-images-webp'},
    perche:'È la misura di Lighthouse su quanto è veloce la pagina davvero, simulando un telefono di fascia media su rete mobile lenta. Pesa soprattutto il Largest Contentful Paint, cioè quando compare l\u2019elemento più grande, e il Total Blocking Time, cioè per quanto il browser resta sordo ai clic.',
    come:'Guarda l\u2019elenco "cosa rallenta la pagina" qui sotto: Lighthouse ordina gli interventi per quanto tempo fanno risparmiare. Nella grande maggioranza dei casi i primi due sono immagini non ottimizzate e JavaScript bloccante.' },

  { id:'lhAccessibility', punti:2, nome:'Punteggio accessibilità',
    fonte:{n:'Chrome — Lighthouse',u:'https://developer.chrome.com/docs/lighthouse/overview'},
    perche:'Verifica contrasto dei colori, etichette dei campi, testi alternativi, ordine di navigazione da tastiera e ruoli ARIA. Riguarda chi ha difficoltà visive o motorie, ed è materia di legge: la direttiva europea sull\u2019accessibilità si applica a un numero crescente di attività private.',
    come:'Le cause più frequenti sono testo chiaro su sfondo chiaro sotto il rapporto 4,5 a 1, campi di modulo senza label associata, e collegamenti il cui testo è solo "clicca qui", inutile per chi naviga saltando da un link all\u2019altro.' },

  { id:'lhBestPractices', punti:2, nome:'Punteggio buone pratiche',
    fonte:{n:'Chrome — Punteggio accessibilità',u:'https://developer.chrome.com/docs/lighthouse/accessibility/scoring'},
    perche:'Controlla errori nella console del browser, librerie JavaScript con vulnerabilità note, immagini servite con proporzioni sbagliate, uso di API deprecate. Preso da solo non sposta il posizionamento, ma è l\u2019indicatore più onesto di quanto un sito sia stato seguito nel tempo.',
    come:'Apri gli strumenti per sviluppatori e guarda la console: gli errori in rosso sono di solito pochi e ripetuti su tutte le pagine, quindi si sistemano una volta sola. Aggiorna le librerie segnalate come vulnerabili, o rimuovile se non servono più.' },

  { id:'lhSeo', punti:1, nome:'Punteggio SEO di base',
    fonte:{n:'Chrome — Lighthouse',u:'https://developer.chrome.com/docs/lighthouse/overview'},
    perche:'I controlli elementari che Lighthouse esegue sulla singola pagina: title, description, viewport, testo leggibile, link con testo descrittivo, assenza di noindex involontari. Non misura la strategia, misura se manca qualcosa di ovvio.',
    come:'Un punteggio basso qui è quasi sempre spiegato da una delle voci elencate sopra in questo report, che ti dicono già su quale pagina intervenire.' },
]},
];
