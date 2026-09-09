import { readFileSync } from 'node:fs';

let passate = 0, fallite = 0;
const ok = (nome, atteso, avuto) => {
  const a = JSON.stringify(atteso), b = JSON.stringify(avuto);
  if (a === b) { passate++; console.log('  ok   ' + nome); }
  else { fallite++; console.log('  NO   ' + nome + '\n       atteso: ' + a + '\n       avuto:  ' + b); }
};

// ---- 1. lettura degli attributi con l'apostrofo -------------------------
function reValore(nome) {
  return new RegExp('(?<![-\\w])' + nome + '\\s*=\\s*(?:(["\'])([\\s\\S]*?)\\1|([^\\s"\'>`=]+))', 'i');
}
function attr(tag, nome) {
  const m = tag.match(reValore(nome));
  if (m) return (m[2] !== undefined ? m[2] : m[3] || '').trim();
  return null;
}

console.log('\nApostrofo negli attributi');
ok('aria-label con apostrofo',
  "Leggi l'articolo: Il carattere dello Staffordshire",
  attr('<a href="/x/" aria-label="Leggi l\'articolo: Il carattere dello Staffordshire">', 'aria-label'));
ok('due aria-label diversi restano diversi', true,
  attr('<a aria-label="Leggi l\'articolo: A">', 'aria-label') !==
  attr('<a aria-label="Leggi l\'articolo: B">', 'aria-label'));
ok('valore fra apici singoli', 'ciao', attr("<a title='ciao'>", 'title'));
ok('apici singoli con virgoletta dentro', 'dice "si"', attr('<a title=\'dice "si"\'>', 'title'));
ok('valore senza virgolette', 'main', attr('<div role=main>', 'role'));
ok('href normale', '/cuccioli/', attr('<a href="/cuccioli/" class="x">', 'href'));
ok('attributo assente', null, attr('<a href="/x/">', 'aria-label'));
ok('non confonde data-title con title', 'vero', attr('<a data-title="falso" title="vero">', 'title'));

// ---- 2. sitemap con l'estensione image: ---------------------------------
const sorgente = readFileSync(new URL('../functions/api/scopri.js', import.meta.url), 'utf8');
const pezzo = sorgente.slice(sorgente.indexOf('const RE_LOC'), sorgente.indexOf('const TEMPO_MASSIMO'));
const estraiUrl = new Function('MAX_XML', 'MAX_URL', pezzo + '; return estraiUrl;')(5e6, 5000);

console.log('\nSitemap');
const conImmagini = `<?xml version="1.0"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
  <url><loc>https://esempio.it/a/</loc>
    <image:image><image:loc>https://esempio.it/img/1.jpg</image:loc></image:image>
    <image:image><image:loc>https://esempio.it/img/2.jpg</image:loc></image:image>
  </url>
  <url><loc>https://esempio.it/b/</loc>
    <image:image><image:loc>https://esempio.it/img/3.jpg</image:loc></image:image>
  </url>
</urlset>`;
ok('due pagine, non cinque', ['https://esempio.it/a/', 'https://esempio.it/b/'], estraiUrl(conImmagini));

const indice = `<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap><loc>https://esempio.it/sitemap-it.xml</loc></sitemap>
  <sitemap><loc>https://esempio.it/sitemap-en.xml</loc></sitemap>
</sitemapindex>`;
ok('sitemapindex', ['https://esempio.it/sitemap-it.xml', 'https://esempio.it/sitemap-en.xml'], estraiUrl(indice));

const prefissata = `<sm:urlset xmlns:sm="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sm:url><sm:loc>https://esempio.it/a/</sm:loc></sm:url>
</sm:urlset>`;
ok('namespace con prefisso', ['https://esempio.it/a/'], estraiUrl(prefissata));

const cdata = `<urlset><url><loc><![CDATA[https://esempio.it/c/]]></loc></url></urlset>`;
ok('CDATA', ['https://esempio.it/c/'], estraiUrl(cdata));

const video = `<urlset xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">
  <url><loc>https://esempio.it/v/</loc>
    <video:video><video:content_loc>https://esempio.it/v.mp4</video:content_loc>
    <video:loc>https://esempio.it/v2.mp4</video:loc></video:video>
  </url></urlset>`;
ok('estensione video:', ['https://esempio.it/v/'], estraiUrl(video));

const rss = `<rss><channel><item><loc>https://esempio.it/r/</loc></item></channel></rss>`;
ok('ripiego su file senza <url>', ['https://esempio.it/r/'], estraiUrl(rss));

// ---- 3. pagina contatti ------------------------------------------------
function trovaContatti(pagine, indirizzi) {
  const hoPagina = (...parole) => parole.some(x => indirizzi.includes(x));
  const daSchema = pagine.some(p =>
    (p.contatti && p.contatti.puntoContatto) ||
    (p.tipiSchema || []).some(t => t === 'ContactPage' || t === 'ContactPoint'));
  const daDati = pagine.some(p =>
    p.contatti && p.contatti.telefono && (p.contatti.via || p.contatti.coordinate));
  return hoPagina('contatt', 'contact', 'kontakt', 'preventivo') || daSchema || daDati;
}

console.log('\nPagina contatti');
ok('slug classico', true,
  trovaContatti([{}], 'https://esempio.it/contatti/'));
ok('slug posizionato + ContactPoint', true,
  trovaContatti([{ contatti: { puntoContatto: true } }],
    'https://x.it/allevamento-staffordshire-bull-terrier-in-emilia-romagna/'));
ok('slug posizionato + telefono e indirizzo', true,
  trovaContatti([{ contatti: { telefono: '+39392', via: 'via Chierici 12' } }],
    'https://x.it/allevamento-staffordshire-bull-terrier-in-emilia-romagna/'));
ok('davvero nessun contatto', false,
  trovaContatti([{ contatti: { telefono: null, via: null } }], 'https://x.it/blog/'));


// ---- 4. description e og: con l'apostrofo ------------------------------
function tagMeta(html, chiave, valore) {
  const re = /<meta\b[^>]*>/gi;
  const cercato = String(valore).toLowerCase();
  let m;
  while ((m = re.exec(html)) !== null) {
    const v = attr(m[0], chiave);
    if (v !== null && v.toLowerCase() === cercato) return m[0];
  }
  return null;
}
const metaDi = (html, nome) => { const t = tagMeta(html, 'name', nome); return t ? attr(t, 'content') : null; };
const propDi = (html, p) => { const t = tagMeta(html, 'property', p); return t ? attr(t, 'content') : null; };

console.log('\nMeta con apostrofo');
const testa = '<meta charset="utf-8">' +
  '<meta name="viewport" content="width=device-width">' +
  '<meta name="description" content="L\'allevamento di Staffordshire Bull Terrier a Ostellato: cucciolate, pedigree ENCI e l\'indice di consanguineita.">' +
  '<meta property="og:title" content="L\'allevamento Del Piccolo Diavolo">';
ok('description intera',
  "L'allevamento di Staffordshire Bull Terrier a Ostellato: cucciolate, pedigree ENCI e l'indice di consanguineita.",
  metaDi(testa, 'description'));
ok('description lunga il giusto', true, (metaDi(testa, 'description') || '').length > 100);
ok('og:title intero', "L'allevamento Del Piccolo Diavolo", propDi(testa, 'og:title'));
ok('viewport', 'width=device-width', metaDi(testa, 'viewport'));
ok('meta assente', null, metaDi(testa, 'robots'));

console.log('\n' + passate + ' passate, ' + fallite + ' fallite\n');
process.exit(fallite ? 1 : 0);
