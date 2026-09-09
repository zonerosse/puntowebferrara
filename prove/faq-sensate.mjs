import { analizzaPagina } from '../functions/api/_analisi.js';

let ok = 0, no = 0;
const verifica = (nome, atteso, avuto) => {
  if (atteso === avuto) { ok++; console.log('  ok   ' + nome); }
  else { no++; console.log('  NO   ' + nome + '  atteso ' + atteso + ', avuto ' + avuto); }
};

const pagina = (faq) => `<!doctype html><html lang="it"><head><title>Prova di una pagina con FAQ</title>
<meta name="description" content="Una descrizione di lunghezza ragionevole per non far scattare altri rilievi sul controllo.">
<link rel="canonical" href="https://esempio.it/x/">
<script type="application/ld+json">${JSON.stringify(faq)}</script></head>
<body><h1>Prova</h1><p>${'parola '.repeat(400)}</p></body></html>`;

const q = (name, text) => ({ '@type': 'Question', name, acceptedAnswer: { '@type': 'Answer', text } });
const faqDi = (...domande) => ({ '@context':'https://schema.org', '@type':'FAQPage', mainEntity: domande });

const rilievi = (faq) => analizzaPagina(pagina(faq), 'https://esempio.it/x/', new Map())
  .problemi.filter(p => /FAQPage/.test(p.messaggio)).map(p => p.messaggio);

console.log('\nFAQ pulite');
let r = rilievi(faqDi(
  q('Quanto costa un cucciolo?', 'Dipende dalla cucciolata, ma il prezzo si concorda prima.'),
  q('Quando posso venire?', 'Dopo la terza settimana, su appuntamento.')));
verifica('nessun rilievo su domande corrette', 0, r.length);

console.log('\nUna voce che non e una domanda');
r = rilievi(faqDi(
  q('Cosa dice lo standard ufficiale Lo standard FCI n. 76 elenca i colori ammessi', 'Testo della risposta, abbastanza lungo.'),
  q('Quanto costa?', 'Dipende.')));
verifica('un rilievo', 1, r.filter(m => /non \u00e8 una domanda/.test(m)).length);
console.log('       ' + r[0]);

console.log('\nDue voci che non sono domande');
r = rilievi(faqDi(q('Titolo uno', 'Risposta uno.'), q('Titolo due', 'Risposta due.')));
verifica('plurale corretto', 1, r.filter(m => /2 voci non sono domande/.test(m)).length);
console.log('       ' + r[0]);

console.log('\nDomanda vera ma lunghissima');
r = rilievi(faqDi(q('Perche lo Staffordshire Bull Terrier viene considerato un cane adatto alla vita in famiglia anche con bambini piccoli in casa?', 'Risposta.')));
verifica('segnalata la lunghezza', 1, r.filter(m => /120 caratteri/.test(m)).length);

console.log('\nDomanda senza risposta');
r = rilievi(faqDi(q('Serve il certificato TRACES?', '')));
verifica('segnalata la risposta vuota', 1, r.filter(m => /acceptedAnswer/.test(m)).length);

console.log('\nVoce senza name');
r = rilievi(faqDi({ '@type': 'Question', acceptedAnswer: { '@type':'Answer', text: 'Risposta orfana.' } }));
verifica('segnalata la voce senza name', 1, r.filter(m => /senza campo name/.test(m)).length);

console.log('\nPagina senza FAQPage');
r = rilievi({ '@context':'https://schema.org', '@type':'Article', headline: 'Un articolo' });
verifica('nessun rilievo FAQ', 0, r.length);

console.log('\n' + ok + ' passate, ' + no + ' fallite\n');
process.exit(no ? 1 : 0);
