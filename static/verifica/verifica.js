// verifica.js — orchestrazione dell'analisi e resa del report.
import { CONTROLLI } from './controlli.js';

const GRAVITA = [['alto', 'Da sistemare'], ['medio', 'Da valutare'], ['basso', 'Rifiniture']];

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

modulo.addEventListener('submit', async e => {
  e.preventDefault();
  const indirizzo = campo.value.trim();
  if (!indirizzo) return;

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
    if (v._stato === 'misurato' && v._quota < 0.999) perse.push({ nome: v.nome, persi: v.punti - v._punti, come: v.come });
  perse.sort((a, b) => b.persi - a.persi);
  const principali = perse.filter(x => x.persi > 0).slice(0, 3);

  // ---- resa
  const p = [];
  const R = 50, C = 2 * Math.PI * R;
  const colore = voto >= 85 ? 'var(--verde)' : voto >= 60 ? 'var(--ambra)' : 'var(--rosso)';
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
    p.push('<div><b>' + g._punti + '<span style="font-size:.8rem;color:var(--grafite)">/' + g._max + '</span></b>' +
      '<span>' + T(g.gruppo) + '</span><i><em style="width:' + q + '%"></em></i></div>');
  }
  p.push('</div>');

  if (principali.length) {
    p.push('<h2>Le tre cose che pesano di più</h2>');
    for (const v of principali)
      p.push('<div class="voce alto"><b>−' + v.persi + ' punti</b> — ' + T(v.nome) +
        '<div class="dove" style="font-family:inherit;font-size:.86rem">' + T(v.come) + '</div></div>');
  }

  p.push('<h2>Tutti i controlli, uno per uno</h2>' +
    '<p class="nota" style="margin:-.5rem 0 1rem">Apri una voce per leggere perché conta e come si sistema.</p>');
  for (const g of CONTROLLI) {
    p.push('<h3>' + T(g.gruppo) + (g._max ? ' — ' + g._punti + ' su ' + g._max : '') + '</h3>');
    for (const v of g.voci) {
      let stato;
      if (v._stato === 'assente') stato = '<span style="color:var(--grafite)">non misurato</span>';
      else if (v._valore) stato = '<span class="' + (v._quota >= .9 ? 'si' : v._quota >= .5 ? 'parziale' : 'no') + '">' + T(v._valore) + '</span>';
      else if (v._quota >= 0.999) stato = '<span class="si">superato</span>';
      else if (v._quota <= 0.001) stato = '<span class="no">non superato</span>';
      else stato = '<span class="parziale">' + Math.round(v._quota * 100) + '% delle pagine</span>';
      const punti = v._stato === 'assente' ? '—' : v._punti + '/' + v.punti;
      p.push('<details class="controllo"><summary><span class="che">' + T(v.nome) + '</span>' +
        '<span class="val">' + stato + ' · ' + punti + '</span></summary>' +
        '<div class="spiega"><p><b>Perché conta</b>' + T(v.perche) + '</p>' +
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
    p.push('<table><tr><th>Metrica</th><th style="text-align:right">Valore</th></tr>');
    for (const m of lh.metriche)
      p.push('<tr><td>' + T(m.nome) + '<div class="dove" style="font-family:inherit">' + T(m.spiegazione) +
        '</div></td><td class="num ' + (m.esito >= .9 ? 'si' : m.esito >= .5 ? 'parziale' : 'no') + '">' +
        T(m.valore) + '</td></tr>');
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
  if (!segnalazioni.length) p.push('<h2>Segnalazioni</h2><div class="pulito">Nessun problema rilevato.</div>');
  else for (const [chiave, etichetta] of GRAVITA) {
    const gruppo = segnalazioni.filter(s => s.gravita === chiave);
    if (!gruppo.length) continue;
    p.push('<h2>' + etichetta + ' — ' + gruppo.length + '</h2>');
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
      '<td class="num ' + (ok === tot ? 'si' : ok >= tot - 2 ? 'parziale' : 'no') + '">' + ok + '/' + tot + '</td></tr>');
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
