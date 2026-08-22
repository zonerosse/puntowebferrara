// verifica.js — orchestrazione dell'analisi e resa del report.
import { CONTROLLI } from './controlli.js';

// --- semaforo -------------------------------------------------------------
// Quattro livelli invece di due: un controllo superato sul 70% delle pagine
// non è "fallito", ed è utile vederlo a colpo d'occhio.
const SEGNI = {
  ok:      '<svg class="segno" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2"><circle cx="10" cy="10" r="8"/><path d="M6.5 10.2l2.4 2.4 4.6-5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  giallo:  '<svg class="segno" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2"><circle cx="10" cy="10" r="8"/><path d="M10 6v5" stroke-linecap="round"/><circle cx="10" cy="14.2" r="1" fill="currentColor" stroke="none"/></svg>',
  arancio: '<svg class="segno" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 2.6l7.6 13.2H2.4z" stroke-linejoin="round"/><path d="M10 8v3.6" stroke-linecap="round"/><circle cx="10" cy="14" r="1" fill="currentColor" stroke="none"/></svg>',
  rosso:   '<svg class="segno" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2"><circle cx="10" cy="10" r="8"/><path d="M7.2 7.2l5.6 5.6M12.8 7.2l-5.6 5.6" stroke-linecap="round"/></svg>',
  grigio:  '<svg class="segno" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2"><circle cx="10" cy="10" r="8" stroke-dasharray="2.5 2.5"/><path d="M6.5 10h7" stroke-linecap="round"/></svg>',
  nota:    '<svg class="segno" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.9"><path d="M10 2.6a5 5 0 0 0-3 9v1.6h6V11.6a5 5 0 0 0-3-9z" stroke-linejoin="round"/><path d="M8 16.4h4M8.6 18.2h2.8" stroke-linecap="round"/></svg>',
};
// Cinque livelli. Quello in mezzo, "nota", è la differenza fra un problema e
// una rifinitura: sopra il 95% delle pagine il controllo resta verde e accanto
// compare un suggerimento, non un avviso.
function livello(quota) {
  if (quota == null) return 'grigio';
  if (quota >= 0.999) return 'ok';
  if (quota >= 0.95) return 'nota';
  if (quota >= 0.75) return 'giallo';
  if (quota >= 0.35) return 'arancio';
  return 'rosso';
}
const segno = liv => SEGNI[liv] || SEGNI.grigio;
const pill = (liv, testo) => '<span class="pill liv-' + liv + '">' + segno(liv) + T(testo) + '</span>';

// In un elenco di cose da sistemare ogni voce deve descrivere il difetto, non
// lo stato: "I livelli dei titoli non saltano" fra le cose da fare non si legge.
function difetto(v) {
  const testo = v.no || v.nome;
  if (v._tot && v._quota > 0.001) {
    const quante = v._tot - v._n;
    return testo + ' \u2014 ' + quante + (quante === 1 ? ' pagina' : ' pagine');
  }
  return testo;
}

const GRAVITA = [
  ['alto', 'Da sistemare', 'rosso'],
  ['medio', 'Da valutare', 'arancio'],
  ['basso', 'Suggerimenti', 'nota'],
];

const $ = id => document.getElementById(id);
const modulo = $('modulo'), campo = $('indirizzo'), bottone = $('avvia');
const avanzamento = $('avanzamento'), riempimento = $('riempimento'), passo = $('passo');
const esito = $('esito'), zonaErrore = $('zonaErrore');

const T = s => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const percorso = u => { try { return new URL(u).pathname; } catch { return u; } };

function avanza(fatte, totale, testo) {
  riempimento.style.width = (totale ? Math.round(fatte / totale * 100) : 0) + '%';
  passo.textContent = testo;
}

// Accetta quello che la gente scrive davvero: esempio.it, www.esempio.it,
// http://esempio.it, o l'indirizzo copiato dalla barra del browser.
function normalizza(scritto) {
  let v = scritto.trim().replace(/\s+/g, '');
  if (!v) return null;
  v = v.replace(/^https?:\/\//i, m => m.toLowerCase());
  if (!/^https?:\/\//i.test(v)) v = 'https://' + v;
  let u;
  try { u = new URL(v); } catch { return null; }
  if (!u.hostname.includes('.') || u.hostname.endsWith('.')) return null;
  return u.origin;
}

modulo.addEventListener('submit', async e => {
  e.preventDefault();
  const indirizzo = normalizza(campo.value);
  if (!indirizzo) {
    zonaErrore.innerHTML = '<div class="errore"><b>Non riconosco questo indirizzo.</b> ' +
      'Scrivi il dominio, per esempio <code>iltuosito.it</code>. Il resto lo aggiungo io.</div>';
    campo.focus();
    return;
  }
  campo.value = indirizzo;

  bottone.disabled = true;
  zonaErrore.innerHTML = '';
  esito.classList.remove('attivo');
  esito.innerHTML = '';
  avanzamento.classList.add('attivo');
  avanza(0, 1, 'Cerco robots.txt e sitemap…');

  let scoperta;
  try {
    const r = await fetch('/api/scopri?url=' + encodeURIComponent(indirizzo));
    scoperta = await r.json();
    if (scoperta.errore) throw new Error(scoperta.errore);
  } catch (err) {
    avanzamento.classList.remove('attivo');
    bottone.disabled = false;
    zonaErrore.innerHTML = '<div class="errore"><b>Non riesco a leggere questo sito.</b> ' + T(err.message) +
      " Controlla che l'indirizzo sia completo, con https:// davanti. Se il sito è protetto da un firewall " +
      'che blocca i programmi automatici, l\'analisi non passa: scrivimi e lo guardo a mano.</div>';
    return;
  }

  const pagine = (scoperta.pagine && scoperta.pagine.length) ? scoperta.pagine : [scoperta.sito + '/'];

  // La misura Lighthouse parte subito e viaggia in parallelo: è la più lenta.
  const misura = fetch('/api/lighthouse?url=' + encodeURIComponent(scoperta.sito + '/'))
    .then(r => r.json()).catch(() => ({ disponibile: false, motivo: 'Misura non riuscita' }));

  const risultati = [];
  let fatte = 0;
  const coda = pagine.slice();
  async function operaio() {
    while (coda.length) {
      const u = coda.shift();
      try { risultati.push(await (await fetch('/api/pagina?url=' + encodeURIComponent(u))).json()); }
      catch { risultati.push({ url: u, errore: 'Analisi non riuscita' }); }
      avanza(++fatte, pagine.length + 1, 'Lette ' + fatte + ' pagine su ' + pagine.length);
    }
  }
  await Promise.all([operaio(), operaio(), operaio(), operaio()]);

  avanza(pagine.length, pagine.length + 1, 'Misuro la velocità con Lighthouse…');
  const lighthouse = await misura;

  avanzamento.classList.remove('attivo');
  bottone.disabled = false;
  disegna(scoperta, risultati, lighthouse);
  esito.classList.add('attivo');
  esito.scrollIntoView({ behavior: 'smooth', block: 'start' });
});

function disegna(scoperta, risultati, lighthouse) {
  const buone = risultati.filter(r => !r.errore);
  const rotte = risultati.filter(r => r.errore);
  if (!buone.length) {
    zonaErrore.innerHTML = '<div class="errore"><b>Nessuna pagina leggibile.</b> Il sito potrebbe bloccare i ' +
      'programmi automatici, oppure costruire i contenuti con JavaScript. Scrivimi e lo guardo a mano.</div>';
    return;
  }

  const crawler = scoperta.robots.crawler || [];
  const primari = crawler.filter(c => c.livello === 1);
  const secondari = crawler.filter(c => c.livello === 2);
  const valori = k => Array.from(new Set(buone.map(p => p.contatti && p.contatti[k]).filter(Boolean)));

  // controlli che si vedono solo confrontando le pagine fra loro
  const conta = (lista) => { const c = {}; for (const x of lista) if (x) c[x] = (c[x] || 0) + 1; return c; };
  const titoliDoppi = Object.values(conta(buone.map(p => p.titolo))).filter(n => n > 1).length;
  const descrDoppie = Object.values(conta(buone.map(p => p.descrizione))).filter(n => n > 1).length;
  const canonicalFuori = buone.filter(p => {
    if (!p.canonical) return false;
    try { return new URL(p.canonical).pathname.replace(/\/$/, '') !== new URL(p.url).pathname.replace(/\/$/, ''); }
    catch { return false; }
  }).length;

  const perPagina = {};
  for (const k of Object.keys(buone[0].flag || {})) {
    const n = buone.filter(p => p.flag && p.flag[k]).length;
    perPagina[k] = { quota: n / buone.length, n, tot: buone.length };
  }

  const lh = lighthouse && lighthouse.disponibile ? lighthouse : null;
  const cat = id => lh && (lh.categorie.find(c => c.id === id) || null);
  const daCategoria = id => { const c = cat(id); return c ? { quota: c.punteggio / 100, valore: c.punteggio + '/100' } : null; };

  const esiti = Object.assign({}, perPagina, {
    botPrimari: { quota: primari.length ? primari.filter(c => c.ammesso).length / primari.length : 1 },
    botSecondari: { quota: secondari.length ? secondari.filter(c => c.ammesso).length / secondari.length : 1 },
    sitemap: { quota: scoperta.sitemapTrovate ? 1 : 0 },
    llms: { quota: scoperta.llmsPresente ? 1 : 0 },
    nap: { quota: ['via', 'cap', 'coordinate', 'telefono'].every(k => valori(k).length <= 1) ? 1 : 0 },
    titoliUnici: { quota: (titoliDoppi + descrDoppie) === 0 ? 1 : Math.max(0, 1 - (titoliDoppi + descrDoppie) / buone.length) },
    canonicalCoerente: { quota: 1 - canonicalFuori / buone.length },
    quattroZeroQuattro: { quota: scoperta.quattroZeroQuattro === 404 ? 1 : scoperta.quattroZeroQuattro == null ? null : 0 },
    lhPerformance: daCategoria('performance'),
    lhAccessibility: daCategoria('accessibility'),
    lhBestPractices: daCategoria('best-practices'),
    lhSeo: daCategoria('seo'),
  });

  // ---- punteggio
  let totale = 0, massimo = 0;
  for (const g of CONTROLLI) {
    g._punti = 0; g._max = 0;
    for (const v of g.voci) {
      const e = esiti[v.id];
      if (!e || e.quota == null) { v._stato = 'assente'; continue; }
      v._stato = 'misurato'; v._quota = e.quota; v._valore = e.valore || null;
      v._n = e.n; v._tot = e.tot;
      v._punti = Math.round(v.punti * e.quota);
      g._punti += v._punti; g._max += v.punti;
    }
    totale += g._punti; massimo += g._max;
  }
  const voto = massimo ? Math.round(totale / massimo * 100) : 0;

  // ---- segnalazioni
  const segnalazioni = [];
  for (const p of buone) for (const q of (p.problemi || [])) segnalazioni.push({ ...q, url: p.url });
  const agg = (categoria, gravita, messaggio) => segnalazioni.push({ categoria, gravita, messaggio, url: '' });
  for (const c of crawler.filter(c => !c.ammesso))
    agg('Motori IA', c.livello === 1 ? 'alto' : 'medio',
      c.nome + ' è escluso dal robots.txt: ' + c.chi + ' non può leggere il sito');
  if (!scoperta.sitemapTrovate) agg('Indicizzazione', 'alto', 'Nessuna sitemap trovata');
  if (!scoperta.llmsPresente) agg('Motori IA', 'basso', 'Manca il file llms.txt');
  if (scoperta.quattroZeroQuattro != null && scoperta.quattroZeroQuattro !== 404)
    agg('Configurazione', 'alto', 'Un indirizzo inesistente risponde ' + scoperta.quattroZeroQuattro +
      ' invece di 404: i motori indicizzeranno pagine fantasma');
  if (scoperta.alternativo && !scoperta.alternativo.reindirizza && scoperta.alternativo.stato === 200)
    agg('Indicizzazione', 'alto', 'Il sito risponde sia con che senza www senza reindirizzare: ' +
      'per Google sono due siti gemelli che si fanno concorrenza');
  if (titoliDoppi) agg('Metadati', 'medio', titoliDoppi + ' titoli usati su più pagine');
  if (descrDoppie) agg('Metadati', 'basso', descrDoppie + ' descrizioni usate su più pagine');
  if (canonicalFuori) agg('Indicizzazione', 'alto', canonicalFuori + ' pagine hanno un canonical che punta altrove: ' +
    'stanno chiedendo a Google di ignorarle');
  for (const p of rotte) agg('Collegamenti', 'alto', 'Pagina in sitemap ma irraggiungibile: ' + p.errore);
  for (const k of ['via', 'cap', 'coordinate', 'telefono']) {
    const v = valori(k);
    if (v.length > 1) agg('Coerenza dei contatti', 'alto',
      'Il sito dichiara ' + v.length + ' valori diversi per ' + k + ' — ' + v.join('  ·  '));
  }

  const gravi = segnalazioni.filter(s => s.gravita === 'alto');
  const perse = [];
  for (const g of CONTROLLI) for (const v of g.voci)
    if (v._stato === 'misurato' && v._quota < 0.999) perse.push({ nome: difetto(v), persi: v.punti - v._punti, come: v.come, quota: v._quota });
  perse.sort((a, b) => b.persi - a.persi);
  const principali = perse.filter(x => x.persi > 0).slice(0, 3);

  // ---- resa
  const p = [];
  const R = 50, C = 2 * Math.PI * R;
  const livVoto = livello(voto / 100 >= 0.999 ? 1 : voto / 100);
  const colore = { ok:'var(--verde)', nota:'var(--verde)', giallo:'var(--giallo)',
                   arancio:'var(--arancio)', rosso:'var(--rosso)', grigio:'#98a5a1' }[livVoto];
  const giudizio = voto >= 90 ? 'Il sito è in ottimo stato: quello che manca è rifinitura.'
    : voto >= 75 ? 'Buona base, con qualche punto da sistemare.'
    : voto >= 50 ? 'Ci sono problemi concreti che limitano quanto Google e i motori IA capiscono del sito.'
    : 'Il sito ha carenze tecniche importanti: gran parte di quello che pubblichi non arriva ai motori.';

  p.push('<h2>Risultato</h2><div class="punteggio"><div class="quadrante">' +
    '<svg width="112" height="112" viewBox="0 0 112 112">' +
    '<circle cx="56" cy="56" r="' + R + '" fill="none" stroke="var(--linea)" stroke-width="9"/>' +
    '<circle cx="56" cy="56" r="' + R + '" fill="none" stroke="' + colore + '" stroke-width="9" ' +
    'stroke-linecap="round" stroke-dasharray="' + C + '" stroke-dashoffset="' + (C * (1 - voto / 100)) + '"/>' +
    '</svg><b>' + voto + '</b></div><div class="parole">' +
    '<div class="dominio">' + T(scoperta.sito) + ' · ' + buone.length + ' pagine lette' +
    (lh ? ' · velocità misurata su ' + T(lh.dispositivo) : '') + '</div><p>' + T(giudizio) + '</p></div></div>');

  p.push('<div class="gruppi">');
  for (const g of CONTROLLI) {
    if (!g._max) continue;
    const q = Math.round(g._punti / g._max * 100);
    const liv = livello(g._punti / g._max);
    p.push('<div><b class="liv-' + liv + '">' + g._punti +
      '<span style="font-size:.8rem;color:var(--grafite);font-weight:400">/' + g._max + '</span></b>' +
      '<span>' + T(g.gruppo) + '</span>' +
      '<i><em class="liv-' + liv + '" style="width:' + q + '%"></em></i></div>');
  }
  p.push('</div>');

  if (principali.length) {
    p.push('<h2>Le tre cose che pesano di più</h2>');
    for (const v of principali) {
      const liv = livello(v.quota);
      p.push('<div class="voce ' + (liv === 'rosso' ? 'alto' : liv === 'arancio' ? 'medio' : 'basso') + '">' +
        '<span class="cat liv-' + liv + '">' + segno(liv) + '−' + v.persi + ' punti</span> ' + T(v.nome) +
        '<div class="dove" style="font-family:inherit;font-size:.87rem;color:var(--grafite)">' +
        T(v.come) + '</div></div>');
    }
  }

  p.push('<h2>Tutti i controlli, uno per uno</h2>' +
    '<p class="nota" style="margin:-.5rem 0 .6rem">Apri una voce per leggere perché conta e come si sistema.</p>' +
    '<div class="legenda">' +
    '<span class="liv-ok">' + SEGNI.ok + 'superato ovunque</span>' +
    '<span class="liv-nota">' + SEGNI.nota + 'suggerimento</span>' +
    '<span class="liv-giallo">' + SEGNI.giallo + 'manca su poche pagine</span>' +
    '<span class="liv-arancio">' + SEGNI.arancio + 'manca su molte pagine</span>' +
    '<span class="liv-rosso">' + SEGNI.rosso + 'non superato</span>' +
    '<span class="liv-grigio">' + SEGNI.grigio + 'non misurato</span></div>');
  for (const g of CONTROLLI) {
    p.push('<h3>' + T(g.gruppo) + (g._max ? ' — ' + g._punti + ' su ' + g._max : '') + '</h3>');
    for (const v of g.voci) {
      const assente = v._stato === 'assente';
      const liv = assente ? 'grigio' : livello(v._quota);
      // Sotto la metà delle pagine l'affermazione sarebbe falsa: si usa la
      // forma negativa, così la riga dice quello che il colore già mostra.
      const nome = (!assente && v._quota < 0.5 && v.no) ? v.no : v.nome;
      let etichetta;
      if (assente) etichetta = 'non misurato';
      else if (v._valore) etichetta = v._valore;
      else if (v._quota >= 0.999) etichetta = 'superato';
      else if (v._quota <= 0.001) etichetta = 'non superato';
      else if (v._tot) {
        // Il numero che serve è sempre quello delle pagine da sistemare.
        // Il verbo cambia perché sotto la metà la riga è già in negativo.
        const daSistemare = v._tot - v._n;
        const parola = daSistemare === 1 ? ' pagina' : ' pagine';
        etichetta = (v._quota < 0.5 && v.no ? 'su ' : 'manca su ') + daSistemare + parola;
      }
      else etichetta = 'manca sul ' + Math.round((1 - v._quota) * 100) + '%';
      const punti = assente ? '—' : v._punti + ' / ' + v.punti;
      p.push('<details class="controllo liv-' + liv + '"><summary>' +
        '<span class="che"><span class="liv-' + liv + '">' + segno(liv) + '</span>' + T(nome) + '</span>' +
        '<span class="val">' + pill(liv, etichetta) +
        ' <span class="punti-voce">' + punti + '</span></span></summary>' +
        '<div class="spiega">' +
        (liv === 'nota' ? '<p class="rifinitura">Superato su ' + (v._tot ? v._n + ' pagine su ' + v._tot : 'quasi tutte le pagine') +
          '. Non è un problema, ma se vuoi chiudere il cerchio è qui che si interviene.</p>' : '') +
        '<p><b>Perché conta</b>' + T(v.perche) + '</p>' +
        '<p><b>Come si sistema</b>' + T(v.come) + '</p></div></details>');
    }
  }

  // ---- Lighthouse
  p.push('<h2>Velocità misurata</h2>');
  if (!lh) {
    const motivo = (lighthouse && lighthouse.motivo) || 'Misura non disponibile.';
    p.push('<div class="grigio"><b>' + T(motivo) + '</b><br>' +
      "Il resto dell'analisi non ne risente: i dieci punti di questo gruppo sono esclusi dal totale, " +
      'non contati come zero.</div>');
  } else {
    p.push('<div class="gruppi" style="margin-bottom:1rem">');
    for (const c of lh.categorie) {
      const liv = livello(c.punteggio / 100);
      p.push('<div><b class="liv-' + liv + '">' + c.punteggio +
        '<span style="font-size:.8rem;color:var(--grafite);font-weight:400">/100</span></b>' +
        '<span>' + T(c.nome) + '</span><i><em class="liv-' + liv +
        '" style="width:' + c.punteggio + '%"></em></i></div>');
    }
    p.push('</div>');
    p.push('<table><tr><th>Metrica</th><th style="text-align:right">Valore</th></tr>');
    for (const m of lh.metriche)
      p.push('<tr><td>' + T(m.nome) + '<div class="dove" style="font-family:inherit;color:var(--grafite)">' +
        T(m.spiegazione) + '</div></td><td class="num">' + pill(livello(m.esito), m.valore) + '</td></tr>');
    p.push('</table>');
    if (lh.rallentamenti.length) {
      p.push('<h3>Cosa rallenta la pagina</h3>');
      for (const r of lh.rallentamenti)
        p.push('<div class="voce medio"><b>' + T(r.nome) + '</b> ' + T(r.quanto) +
          '<div class="dove" style="font-family:inherit;font-size:.86rem">' + T(r.rimedio) + '</div></div>');
    }
  }

  // ---- crawler
  p.push('<h2>Chi può leggere il sito</h2><div class="crawler">');
  for (const c of crawler)
    p.push('<div class="bot"><div><span class="nome">' + T(c.nome) + '</span>' +
      '<span class="chi">' + T(c.chi) + '</span></div><span class="esito-bot ' +
      (c.ammesso ? 'si">entra' : 'no">bloccato') + '</span></div>');
  p.push('</div>');

  // ---- schema
  const tipi = {};
  for (const q of buone) for (const t of (q.tipiSchema || [])) tipi[t] = (tipi[t] || 0) + 1;
  const elenco = Object.entries(tipi).sort((a, b) => b[1] - a[1]);
  p.push('<h2>Dati strutturati trovati</h2>');
  if (!elenco.length) p.push('<div class="errore">Nessun dato strutturato su nessuna pagina analizzata.</div>');
  else {
    p.push('<table><tr><th>Tipo</th><th style="text-align:right">Pagine</th></tr>');
    for (const [n, q] of elenco) p.push('<tr><td>' + T(n) + '</td><td class="num">' + q + '</td></tr>');
    p.push('</table>');
  }

  // ---- segnalazioni
  if (!segnalazioni.length) p.push('<h2>Segnalazioni</h2><div class="pulito">' + SEGNI.ok +
    ' Nessun problema rilevato sulle pagine analizzate.</div>');
  else for (const [chiave, etichetta, colore] of GRAVITA) {
    const gruppo = segnalazioni.filter(s => s.gravita === chiave);
    if (!gruppo.length) continue;
    p.push('<h2><span class="liv-' + colore + '">' + segno(colore) + '</span> ' +
      etichetta + ' — ' + gruppo.length + '</h2>');
    const raggruppate = {};
    for (const s of gruppo) (raggruppate[s.categoria + '||' + s.messaggio] ||= []).push(s.url);
    for (const [k, indirizzi] of Object.entries(raggruppate)) {
      const [categoria, messaggio] = k.split('||');
      const validi = indirizzi.filter(Boolean);
      const dove = validi.length ? '<div class="dove">' + validi.slice(0, 5).map(u => T(percorso(u))).join('  ·  ') +
        (validi.length > 5 ? '  · e altre ' + (validi.length - 5) : '') + '</div>' : '';
      p.push('<div class="voce ' + chiave + '"><span class="cat">' + T(categoria) + '</span>' + T(messaggio) + dove + '</div>');
    }
  }

  // ---- pagina per pagina
  p.push('<h2>Pagina per pagina</h2><table><tr><th>Pagina</th>' +
    '<th style="text-align:right">Parole</th><th style="text-align:right">Schema</th>' +
    '<th style="text-align:right">Link</th><th style="text-align:right">Controlli</th></tr>');
  const ordinate = buone.slice().sort((a, b) =>
    Object.values(a.flag || {}).filter(Boolean).length - Object.values(b.flag || {}).filter(Boolean).length);
  for (const q of ordinate.slice(0, 40)) {
    const tot = Object.keys(q.flag || {}).length;
    const ok = Object.values(q.flag || {}).filter(Boolean).length;
    p.push('<tr><td class="percorso">' + T(percorso(q.url)) + '</td>' +
      '<td class="num">' + (q.parole || 0) + '</td><td class="num">' + (q.blocchiJsonLd || 0) + '</td>' +
      '<td class="num">' + (q.linkInterni || 0) + '</td>' +
      '<td class="num liv-' + livello(ok / tot) + '" style="font-weight:700">' + ok + '/' + tot + '</td></tr>');
  }
  p.push('</table>');
  if (buone.length > 40) p.push('<p class="nota">Mostrate le 40 pagine con più controlli non superati.</p>');

  // ---- chiusura
  const c = ['<div class="chiusura"><h2>' + (gravi.length ? 'Queste cose le sistemo io' : 'Il sito è già messo bene') + '</h2>'];
  if (principali.length) {
    c.push('<p>Sul tuo sito, in ordine di peso, partirei da qui:</p><ol>');
    for (const v of principali) c.push('<li>' + T(v.nome) + '</li>');
    c.push('</ol>');
  }
  c.push('<p>Sono Paolo Boldrini, lavoro da Ferrara. Rispondo io, entro 24 ore, e il preventivo è dettagliato ' +
    'prima di cominciare: il prezzo concordato è quello finale.</p>');
  c.push('<div class="azioni"><a href="/contatti/">Chiedimi un preventivo</a>' +
    '<a class="vuoto" href="#" id="stampa">Salva questo report in PDF</a></div>');
  c.push('<p class="listino">Sito vetrina da 500 € · Landing page da 400 € · ' +
    'Migrazione da WordPress a sito statico da 500 €, senza più manutenzione né aggiornamenti.</p></div>');

  esito.innerHTML = p.join('') + c.join('');
  const bottoneStampa = document.getElementById('stampa');
  if (bottoneStampa) bottoneStampa.addEventListener('click', ev => {
    ev.preventDefault();
    document.querySelectorAll('.controllo').forEach(d => { if (!d.open) d.dataset.chiuso = '1'; d.open = true; });
    window.print();
    document.querySelectorAll('.controllo[data-chiuso]').forEach(d => { d.open = false; delete d.dataset.chiuso; });
  });
}
