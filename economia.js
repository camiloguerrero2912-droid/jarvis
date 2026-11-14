'use strict';

/* Datos económicos: dólar (TRM oficial), euro y noticias de economía y finanzas.
   Fuentes: datos.gov.co (TRM de la Superfinanciera), open.er-api.com / frankfurter.dev (euro)
   y Google News, sección Negocios para Colombia (vía rss2json, con allorigins de respaldo). */
const Eco = (() => {
  let cache = null, cacheT = 0;
  const fmt = n => Math.round(n).toLocaleString('es-CO');
  const quitarFuente = t => String(t || '').replace(/\s+-\s+[^-]+$/, '').trim();

  async function trm() {
    const hoy = new Date().toLocaleDateString('en-CA'); // AAAA-MM-DD en tu hora local
    const q = `$where=vigenciadesde<='${hoy}T00:00:00.000'&$order=vigenciadesde DESC&$limit=2`;
    const r = await fetch('https://www.datos.gov.co/resource/32sa-8pi3.json?' + encodeURI(q));
    if (!r.ok) throw new Error('TRM ' + r.status);
    const j = await r.json();
    return { valor: Number(j[0].valor), previo: j[1] ? Number(j[1].valor) : null };
  }

  async function tasas() {
    try {
      const r = await fetch('https://open.er-api.com/v6/latest/USD');
      const j = await r.json();
      if (j.rates && j.rates.EUR) return j.rates;
    } catch {}
    const r = await fetch('https://api.frankfurter.dev/v1/latest?base=USD&symbols=EUR');
    const j = await r.json();
    return { EUR: j.rates.EUR };
  }

  const NEWS = 'https://news.google.com/rss/headlines/section/topic/BUSINESS?hl=es-419&gl=CO&ceid=CO:es-419';
  async function noticias() {
    try {
      const r = await fetch('https://api.rss2json.com/v1/api.json?rss_url=' + encodeURIComponent(NEWS));
      const j = await r.json();
      if (j.status === 'ok' && j.items && j.items.length) return j.items.slice(0, 8).map(i => i.title);
    } catch {}
    const r = await fetch('https://api.allorigins.win/raw?url=' + encodeURIComponent(NEWS));
    const xml = new DOMParser().parseFromString(await r.text(), 'text/xml');
    return [...xml.querySelectorAll('item > title')].slice(0, 8).map(n => n.textContent);
  }

  async function datos(forzar) {
    if (!forzar && cache && Date.now() - cacheT < 10 * 60 * 1000) return cache;
    const d = { usd: null, previo: null, eur: null, noticias: [] };
    const [a, b, c] = await Promise.allSettled([trm(), tasas(), noticias()]);
    let eurPorUsd = null;
    if (a.status === 'fulfilled') { d.usd = a.value.valor; d.previo = a.value.previo; }
    if (b.status === 'fulfilled') { eurPorUsd = b.value.EUR; if (!d.usd && b.value.COP) d.usd = b.value.COP; }
    if (d.usd && eurPorUsd) d.eur = d.usd / eurPorUsd;
    if (c.status === 'fulfilled') d.noticias = c.value.map(quitarFuente).filter(Boolean);
    cache = d; cacheT = Date.now();
    return d;
  }

  /* Texto para decir en voz alta */
  async function texto(op) {
    const conNoticias = !op || op.noticias !== false;
    const d = await datos();
    const p = [];
    if (d.usd) {
      let s = `El dólar está en ${Math.round(d.usd)} pesos`;
      if (d.previo) {
        const x = Math.round(d.usd - d.previo);
        s += x === 0 ? ', igual que la tasa anterior' : `, ${Math.abs(x)} pesos ${x > 0 ? 'más' : 'menos'} que la tasa anterior`;
      }
      p.push(s + '.');
    } else p.push('No pude consultar el dólar.');
    if (d.eur) p.push(`El euro está cerca de ${Math.round(d.eur)} pesos.`);
    if (conNoticias) {
      if (d.noticias.length) p.push('Noticias económicas del día: ' + d.noticias.slice(0, 3).map((t, i) => `${i + 1}, ${t}`).join('. ') + '.');
      else p.push('No pude traer las noticias económicas.');
    }
    return p.join(' ');
  }

  /* Pinta la tarjeta de Mercados y la cinta de noticias */
  async function pintar() {
    try {
      const d = await datos(true);
      const set = (id, v) => { const e = document.getElementById(id); if (e) e.textContent = v; };
      set('fxUsd', d.usd ? '$ ' + fmt(d.usd) : '--');
      set('fxEur', d.eur ? '$ ' + fmt(d.eur) : '--');
      const dl = document.getElementById('fxUsdD');
      if (dl && d.usd && d.previo) {
        const x = d.usd - d.previo;
        dl.textContent = (x > 0 ? '▲ ' : x < 0 ? '▼ ' : '= ') + fmt(Math.abs(x));
        dl.className = 'delta ' + (x > 0 ? 'up' : x < 0 ? 'down' : '');
      }
      const tk = document.getElementById('tickerMove');
      if (tk && d.noticias.length) {
        tk.textContent = '';
        for (let k = 0; k < 2; k++) {
          d.noticias.forEach(t => { const s = document.createElement('span'); s.textContent = t; tk.appendChild(s); });
        }
        tk.style.setProperty('--dur', Math.max(45, d.noticias.join(' ').length * 0.2) + 's');
      }
    } catch {}
  }

  return { datos, texto, pintar };
})();
