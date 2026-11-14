/* ============================================================
   Brake Lab · core utilities
   Zero-dependency DOM, formatting, SVG chart and form helpers.
   ============================================================ */
window.BT = window.BT || {};
(function (BT) {
  'use strict';

  /* ---------- DOM ---------- */
  BT.el = function (tag, props, children) {
    const node = document.createElement(tag);
    props = props || {};
    Object.keys(props).forEach(function (k) {
      const v = props[k];
      if (v === null || v === undefined) return;
      if (k === 'class') node.className = v;
      else if (k === 'text') node.textContent = v;
      else if (k === 'html') node.innerHTML = v;
      else if (k === 'dataset') Object.assign(node.dataset, v);
      else if (k === 'style' && typeof v === 'object') Object.assign(node.style, v);
      else if (k.slice(0, 2) === 'on' && typeof v === 'function') node.addEventListener(k.slice(2).toLowerCase(), v);
      else node.setAttribute(k, v);
    });
    if (children !== undefined && children !== null) {
      (Array.isArray(children) ? children : [children]).forEach(function (c) {
        if (c === null || c === undefined || c === false) return;
        node.appendChild(c instanceof Node ? c : document.createTextNode(String(c)));
      });
    }
    return node;
  };
  BT.esc = function (s) {
    return String(s === undefined || s === null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };
  BT.q = function (sel, root) { return (root || document).querySelector(sel); };
  BT.qa = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };

  /* ---------- number / format ---------- */
  BT.clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };
  BT.isNum = function (v) { return typeof v === 'number' && isFinite(v); };
  BT.num = function (v, fallback) { const n = typeof v === 'number' ? v : parseFloat(v); return isFinite(n) ? n : (fallback === undefined ? 0 : fallback); };
  BT.fmt = function (v, d) {
    if (v === null || v === undefined || !isFinite(v)) return '—';
    d = d === undefined ? 2 : d;
    const av = Math.abs(v);
    if (av >= 100000) return (v / 1000).toFixed(0) + 'k';
    if (av >= 1000) return v.toLocaleString('zh-CN', { maximumFractionDigits: d });
    return parseFloat(v.toFixed(d)).toString();
  };
  BT.fixed = function (v, d) { return isFinite(v) ? v.toFixed(d === undefined ? 1 : d) : '—'; };
  BT.pct = function (v, d) { return isFinite(v) ? (v * 100).toFixed(d === undefined ? 1 : d) + '%' : '—'; };
  BT.sign = function (v, d) { const s = BT.fixed(v, d === undefined ? 2 : d); return v > 0 ? '+' + s : s; };
  BT.round = function (v, step) { return Math.round(v / step) * step; };
  BT.download = function (filename, content, mime) {
    const blob = new Blob([content], { type: mime || 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = BT.el('a', { href: url, download: filename });
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1500);
  };
  BT.toast = function (msg, ms) {
    const t = BT.q('#toast'); if (!t) return;
    t.textContent = msg; t.classList.add('show');
    clearTimeout(BT._toastTimer);
    BT._toastTimer = setTimeout(function () { t.classList.remove('show'); }, ms || 2300);
  };
  BT.debounce = function (fn, wait) {
    let timer = null;
    return function () {
      const args = arguments, ctx = this;
      clearTimeout(timer);
      timer = setTimeout(function () { fn.apply(ctx, args); }, wait === undefined ? 120 : wait);
    };
  };

  /* ---------- ticks ---------- */
  BT.ticks = function (min, max, count) {
    if (!isFinite(min) || !isFinite(max) || max <= min) return [min];
    const span = max - min;
    const step0 = span / (count || 6);
    const mag = Math.pow(10, Math.floor(Math.log10(step0)));
    const norm = step0 / mag;
    const step = (norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 5 ? 5 : 10) * mag;
    const out = [];
    let v = Math.ceil(min / step - 1e-9) * step;
    for (let i = 0; i < 200 && v <= max + 1e-9; i++) {
      out.push(Math.abs(v) < step * 1e-9 ? 0 : v);
      v += step;
    }
    return out;
  };

  /* ---------- images / icons ---------- */
  const ICONS = {
    home: 'M4 11.2 12 4l8 7.2V20h-5.2v-6H9.2v6H4z',
    gauge: 'M4 18a8 8 0 1 1 16 0M12 18l4.2-5.4M6.8 15.5h2.2M15 15.5h2.2M8 8.4l1.5 1.5M16 8.4l-1.5 1.5',
    scale: 'M12 4v16M5.5 8h13M7 8l-3 6h6zM17 8l-3 6h6z',
    split: 'M4 6h16M4 12h7.5M4 18h7.5M14 10.5 20 18M20 10.5 14 18',
    ruler: 'M4 17 17 4l3 3L7 20zM8 13l2 2M11 10l2 2M14 7l2 2',
    disc: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zm0 4.5a4.5 4.5 0 1 0 0 9 4.5 4.5 0 0 0 0-9zM12 5.4v1.4M12 17.2v1.4M5.4 12h1.4M17.2 12h1.4',
    pedal: 'M7 4v8.5a4.5 4.5 0 0 0 4.5 4.5H17M7 8h5M17 13v8M14 18h6',
    thermo: 'M10 13.4V5.5a2 2 0 1 1 4 0v7.9a4.5 4.5 0 1 1-4 0zM12 9v7.2',
    pad: 'M6 5h12a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2zm3 3v8M15 8v8',
    park: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM9.5 17V7h3.2a3.2 3.2 0 0 1 0 6.4H9.5',
    target: 'M12 3v3M12 18v3M3 12h3M18 12h3M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10zM12 10.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3z',
    wave: 'M3 14h3l2.2-7 3.4 12 3-9 2.4 6h4',
    tornado: 'M4 5h16M6 9h12M8 13h8M10 17h4M11 21h2',
    book: 'M4 5.5A2.5 2.5 0 0 1 6.5 3H11v17H6.5A2.5 2.5 0 0 0 4 22.5zM20 5.5A2.5 2.5 0 0 0 17.5 3H13v17h4.5a2.5 2.5 0 0 1 2.5 2.5z',
    calc: 'M6 3h12v18H6zM9 7h6M9 11h2M13 11h2M9 15h2M13 15h2M9 19h2M13 19h2'
  };
  BT.icon = function (name, size) {
    const d = ICONS[name] || ICONS.calc;
    return '<svg viewBox="0 0 24 24" width="' + (size || 18) + '" height="' + (size || 18) +
      '" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round"><path d="' + d + '"/></svg>';
  };

  /* ---------- chart ---------- */
  let chartSeq = 0;
  BT.chart = function (host, cfg) {
    if (!host) return;
    host.innerHTML = '';
    const series = (cfg.series || []).filter(function (s) { return s.data && s.data.length; });
    if (!series.length) {
      host.appendChild(BT.el('div', { class: 'chart-empty', text: cfg.emptyText || '暂无可绘制数据' }));
      return;
    }
    const measured = Math.round(host.getBoundingClientRect().width || host.clientWidth || 760);
    const W = cfg.width || Math.max(300, measured), H = cfg.height || 330;
    const pad = { l: cfg.padLeft || (W < 500 ? 46 : 58), r: cfg.padRight || (W < 500 ? 12 : 20), t: 18, b: cfg.padBottom || 48 };
    const iw = W - pad.l - pad.r, ih = H - pad.t - pad.b;
    let xd = cfg.xDomain, yd = cfg.yDomain;
    if (!xd) {
      const xs = [];
      series.forEach(function (s) { s.data.forEach(function (p) { if (isFinite(p[0])) xs.push(p[0]); }); });
      xd = [Math.min.apply(null, xs), Math.max.apply(null, xs)];
    }
    if (!yd) {
      const ys = [];
      series.forEach(function (s) { s.data.forEach(function (p) { if (isFinite(p[1])) ys.push(p[1]); }); });
      yd = [Math.min.apply(null, ys), Math.max.apply(null, ys)];
      const padY = (yd[1] - yd[0]) * 0.08 || 1;
      yd = [yd[0] - padY, yd[1] + padY];
    }
    if (xd[1] <= xd[0]) xd = [xd[0] - 1, xd[0] + 1];
    if (yd[1] <= yd[0]) yd = [yd[0] - 1, yd[0] + 1];
    const X = function (v) { return pad.l + (v - xd[0]) / (xd[1] - xd[0]) * iw; };
    const Y = function (v) { return pad.t + ih - (v - yd[0]) / (yd[1] - yd[0]) * ih; };
    const uid = 'bc' + (++chartSeq);

    let s = '<svg class="chart-svg" viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="xMidYMid meet" role="img" aria-label="' + BT.esc(cfg.title || cfg.yLabel || '制动图表') + '">';
    s += '<title>' + BT.esc(cfg.title || cfg.yLabel || '制动图表') + '</title>';
    s += '<desc>' + BT.esc((cfg.xLabel || '') + (cfg.yLabel ? ' / ' + cfg.yLabel : '') + '；数据系列 ' + series.length + ' 条') + '</desc>';
    s += '<defs><clipPath id="' + uid + '"><rect x="' + pad.l + '" y="' + pad.t + '" width="' + iw + '" height="' + ih + '"/></clipPath></defs>';
    s += '<rect x="' + pad.l + '" y="' + pad.t + '" width="' + iw + '" height="' + ih + '" fill="#fbfcfd"/>';

    /* bands */
    (cfg.bands || []).forEach(function (b) {
      const bx1 = BT.clamp(b.x1 !== undefined ? b.x1 : xd[0], xd[0], xd[1]);
      const bx2 = BT.clamp(b.x2 !== undefined ? b.x2 : xd[1], xd[0], xd[1]);
      const by1 = BT.clamp(b.y1 !== undefined ? b.y1 : yd[1], yd[0], yd[1]);
      const by2 = BT.clamp(b.y2 !== undefined ? b.y2 : yd[0], yd[0], yd[1]);
      const x1 = X(bx1), x2 = X(bx2);
      const y1 = Y(by1), y2 = Y(by2);
      s += '<rect x="' + Math.min(x1, x2).toFixed(1) + '" y="' + Math.min(y1, y2).toFixed(1) + '" width="' + Math.abs(x2 - x1).toFixed(1) +
        '" height="' + Math.abs(y2 - y1).toFixed(1) + '" fill="' + (b.color || 'rgba(23,101,127,.07)') + '"/>';
      if (b.label) {
        s += '<text x="' + (Math.min(x1, x2) + 5).toFixed(1) + '" y="' + (Math.min(y1, y2) + 12).toFixed(1) + '" fill="' + (b.textColor || '#7a8b9c') + '" font-size="9.5">' + BT.esc(b.label) + '</text>';
      }
    });

    /* grid + ticks */
    const xt = BT.ticks(xd[0], xd[1], cfg.xTicks || (W < 500 ? 4 : 6));
    const yt = BT.ticks(yd[0], yd[1], cfg.yTicks || (W < 500 ? 4 : 5));
    yt.forEach(function (v) {
      const y = Y(v);
      s += '<line class="gridline" x1="' + pad.l + '" y1="' + y.toFixed(1) + '" x2="' + (pad.l + iw) + '" y2="' + y.toFixed(1) + '"/>';
      s += '<text class="tick" x="' + (pad.l - 7) + '" y="' + (y + 3).toFixed(1) + '" text-anchor="end">' + BT.esc(cfg.yFmt ? cfg.yFmt(v) : BT.fmt(v, 2)) + '</text>';
    });
    xt.forEach(function (v) {
      const x = X(v);
      s += '<line class="gridline" x1="' + x.toFixed(1) + '" y1="' + pad.t + '" x2="' + x.toFixed(1) + '" y2="' + (pad.t + ih) + '"/>';
      s += '<text class="tick" x="' + x.toFixed(1) + '" y="' + (pad.t + ih + 15) + '" text-anchor="middle">' + BT.esc(cfg.xFmt ? cfg.xFmt(v) : BT.fmt(v, 2)) + '</text>';
    });
    if (xd[0] < 0 && xd[1] > 0) s += '<line class="zero" x1="' + X(0).toFixed(1) + '" y1="' + pad.t + '" x2="' + X(0).toFixed(1) + '" y2="' + (pad.t + ih) + '"/>';
    if (yd[0] < 0 && yd[1] > 0) s += '<line class="zero" x1="' + pad.l + '" y1="' + Y(0).toFixed(1) + '" x2="' + (pad.l + iw) + '" y2="' + Y(0).toFixed(1) + '"/>';
    s += '<line class="axisline" x1="' + pad.l + '" y1="' + (pad.t + ih) + '" x2="' + (pad.l + iw) + '" y2="' + (pad.t + ih) + '"/>';
    s += '<line class="axisline" x1="' + pad.l + '" y1="' + pad.t + '" x2="' + pad.l + '" y2="' + (pad.t + ih) + '"/>';

    /* axis titles */
    if (cfg.xLabel) s += '<text class="axis-title" x="' + (pad.l + iw / 2) + '" y="' + (H - 8) + '" text-anchor="middle">' + BT.esc(cfg.xLabel) + '</text>';
    if (cfg.yLabel) s += '<text class="axis-title" transform="translate(14,' + (pad.t + ih / 2) + ') rotate(-90)" text-anchor="middle">' + BT.esc(cfg.yLabel) + '</text>';

    /* reference lines */
    (cfg.lines || []).forEach(function (ln) {
      if (ln.x !== undefined && ln.x >= xd[0] && ln.x <= xd[1]) {
        const x = X(ln.x);
        s += '<line x1="' + x.toFixed(1) + '" y1="' + pad.t + '" x2="' + x.toFixed(1) + '" y2="' + (pad.t + ih) + '" stroke="' + (ln.color || '#b42318') + '" stroke-width="1" stroke-dasharray="4 4" opacity=".8"/>';
        if (ln.label) s += '<text x="' + (x + 4).toFixed(1) + '" y="' + (pad.t + 11) + '" fill="' + (ln.color || '#b42318') + '" font-size="9.5">' + BT.esc(ln.label) + '</text>';
      }
      if (ln.y !== undefined && ln.y >= yd[0] && ln.y <= yd[1]) {
        const y = Y(ln.y);
        s += '<line x1="' + pad.l + '" y1="' + y.toFixed(1) + '" x2="' + (pad.l + iw) + '" y2="' + y.toFixed(1) + '" stroke="' + (ln.color || '#b42318') + '" stroke-width="1" stroke-dasharray="4 4" opacity=".8"/>';
        if (ln.label) s += '<text x="' + (pad.l + iw - 4) + '" y="' + (y - 4).toFixed(1) + '" text-anchor="end" fill="' + (ln.color || '#b42318') + '" font-size="9.5">' + BT.esc(ln.label) + '</text>';
      }
    });

    /* series */
    s += '<g clip-path="url(#' + uid + ')">';
    series.forEach(function (ser) {
      const color = ser.color || '#c8502a';
      const width = ser.width || 2;
      let d = '', pen = false;
      ser.data.forEach(function (p) {
        if (!p || !isFinite(p[0]) || !isFinite(p[1])) { pen = false; return; }
        const cmd = pen ? 'L' : 'M';
        d += cmd + X(p[0]).toFixed(1) + ' ' + Y(p[1]).toFixed(1) + ' ';
        pen = true;
      });
      if (ser.type !== 'points' && d) {
        s += '<path d="' + d + '" fill="none" stroke="' + color + '" stroke-width="' + width + '" stroke-linejoin="round" stroke-linecap="round"' +
          (ser.dash ? ' stroke-dasharray="' + ser.dash + '"' : '') + ' opacity="' + (ser.opacity === undefined ? 1 : ser.opacity) + '"/>';
      }
      if (ser.type === 'points' || ser.showPoints) {
        ser.data.forEach(function (p) {
          if (!p || !isFinite(p[0]) || !isFinite(p[1])) return;
          s += '<circle cx="' + X(p[0]).toFixed(1) + '" cy="' + Y(p[1]).toFixed(1) + '" r="' + (ser.pointR || 2.4) + '" fill="' + color + '" opacity=".78"><title>' +
            BT.esc((ser.name || '') + '  ' + BT.fmt(p[0], 3) + ', ' + BT.fmt(p[1], 3)) + '</title></circle>';
        });
      }
      if (ser.labelEnd && ser.data.length) {
        const last = ser.data[ser.data.length - 1];
        if (last && isFinite(last[0]) && isFinite(last[1])) {
          s += '<text x="' + (X(last[0]) + 4).toFixed(1) + '" y="' + (Y(last[1]) - 5).toFixed(1) + '" fill="' + color + '" font-size="9.5">' + BT.esc(ser.labelEnd) + '</text>';
        }
      }
    });
    s += '</g></svg>';

    if (cfg.legend !== false) {
      const lg = BT.el('div', { class: 'legend-inline', style: { marginBottom: '2px' } });
      series.forEach(function (ser) {
        lg.appendChild(BT.el('span', { class: 'lg', style: { color: ser.color || '#c8502a' } }, [
          BT.el('i', { class: ser.dash ? 'dash' : '', style: { background: ser.dash ? '' : (ser.color || '#c8502a') } }),
          BT.el('span', { style: { color: '#667085' }, text: ser.name || '' })
        ]));
      });
      host.appendChild(lg);
    }
    host.insertAdjacentHTML('beforeend', s);
  };

  /* ---------- diverging bar chart (tornado / ranking) ---------- */
  BT.barChart = function (host, cfg) {
    host.innerHTML = '';
    const items = cfg.items || [];
    if (!items.length) { host.appendChild(BT.el('div', { class: 'chart-empty', text: '暂无数据' })); return; }
    const max = Math.max.apply(null, items.map(function (i) { return Math.abs(i.value); })) || 1;
    const wrap = BT.el('div', { class: 'stack', style: { gap: '7px', padding: '4px 2px' } });
    items.forEach(function (it) {
      const v = it.value;
      const w = Math.abs(v) / max * 100;
      const row = BT.el('div', { style: { display: 'grid', gridTemplateColumns: '126px 1fr 74px', alignItems: 'center', gap: '8px' } });
      row.appendChild(BT.el('div', { style: { fontSize: '10.5px', color: '#475467', textAlign: 'right', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }, text: it.label }));
      const track = BT.el('div', { style: { position: 'relative', height: '15px', background: '#f2f5f8', borderRadius: '3px' } });
      const zero = cfg.zeroAt === 'left' ? 0 : 50;
      track.appendChild(BT.el('div', { style: { position: 'absolute', left: '50%', top: '0', bottom: '0', width: '1px', background: '#cbd5e1' } }));
      const bar = BT.el('div', {
        style: {
          position: 'absolute', top: '2px', bottom: '2px', borderRadius: '2px',
          background: it.color || (v >= 0 ? '#c8502a' : '#17657f'),
          left: v >= 0 ? '50%' : (50 - w) + '%',
          width: w + '%'
        }
      });
      track.appendChild(bar);
      row.appendChild(track);
      row.appendChild(BT.el('div', { style: { fontFamily: 'var(--mono)', fontSize: '10.5px', color: '#344054', textAlign: 'right' }, text: (cfg.format ? cfg.format(v) : (v > 0 ? '+' : '') + BT.fmt(v, 2)) }));
      wrap.appendChild(row);
    });
    host.appendChild(wrap);
  };

  /* ---------- form ---------- */
  BT.inputs = {};
  try { BT.inputs = JSON.parse(localStorage.getItem('brakelab.inputs.v1') || '{}') || {}; } catch (e) { BT.inputs = {}; }
  BT.saveInputs = BT.debounce(function () {
    try { localStorage.setItem('brakelab.inputs.v1', JSON.stringify(BT.inputs)); } catch (e) { /* ignore */ }
  }, 350);
  BT.setInput = function (key, value) {
    BT.inputs[key] = value;
    BT.saveInputs();
  };

  BT.Form = function (root, id) {
    this.root = root;
    this.id = id;
    this.grid = BT.el('div', { class: 'form-grid' });
    root.appendChild(this.grid);
    this.onChange = null;
  };
  BT.Form.prototype.section = function (title) {
    this.grid.appendChild(BT.el('div', { class: 'form-section', text: title }));
    return this;
  };
  BT.Form.prototype.field = function (key, label, control, unit, hint, opts) {
    opts = opts || {};
    const wrap = BT.el('label', { class: 'field' + (opts.span2 ? ' span-2' : '') });
    const lab = BT.el('span', { class: 'field-label' }, [document.createTextNode(label)]);
    const sym = BT.SYMBOL_BY_KEY && BT.SYMBOL_BY_KEY[key];
    if (sym) lab.appendChild(BT.el('span', { class: 'field-sym', text: sym.sym }));
    if (opts.tag) lab.appendChild(BT.el('span', { class: 'tag', text: opts.tag }));
    wrap.appendChild(lab);
    const ctl = BT.el('span', { class: 'field-control' });
    ctl.appendChild(control);
    if (unit) ctl.appendChild(BT.el('span', { class: 'field-unit', text: unit }));
    wrap.appendChild(ctl);
    if (hint) wrap.appendChild(BT.el('span', { class: 'field-hint', text: hint }));
    control.dataset.key = key;
    this.grid.appendChild(wrap);
    return control;
  };
  BT.Form.prototype.num = function (key, label, def, unit, opts) {
    opts = opts || {};
    const saved = BT.inputs[this.id + '.' + key];
    const input = BT.el('input', {
      type: 'number', step: opts.step === undefined ? 'any' : opts.step,
      min: opts.min, max: opts.max, inputmode: 'decimal'
    });
    input.value = (saved !== undefined && saved !== '' && saved !== null) ? saved : def;
    input.dataset.type = 'number';
    const self = this;
    input.addEventListener('input', function () {
      BT.setInput(self.id + '.' + key, input.value);
      if (self.onChange) self.onChange();
    });
    this.field(key, label, input, unit, opts.hint, opts);
    return input;
  };
  BT.Form.prototype.select = function (key, label, def, options, opts) {
    opts = opts || {};
    const saved = BT.inputs[this.id + '.' + key];
    const sel = BT.el('select');
    (options || []).forEach(function (o) {
      const val = typeof o === 'string' ? o : o.value;
      const txt = typeof o === 'string' ? o : o.label;
      sel.appendChild(BT.el('option', { value: val, text: txt }));
    });
    sel.value = (saved !== undefined && saved !== '') ? saved : def;
    sel.dataset.type = 'text';
    const self = this;
    sel.addEventListener('change', function () {
      BT.setInput(self.id + '.' + key, sel.value);
      if (self.onChange) self.onChange();
    });
    this.field(key, label, sel, opts.unit, opts.hint, opts);
    return sel;
  };
  BT.Form.prototype.text = function (key, label, def, opts) {
    opts = opts || {};
    const saved = BT.inputs[this.id + '.' + key];
    const input = BT.el('input', { type: 'text' });
    input.value = (saved !== undefined && saved !== '') ? saved : def;
    input.dataset.type = 'text';
    const self = this;
    input.addEventListener('input', function () {
      BT.setInput(self.id + '.' + key, input.value);
      if (self.onChange) self.onChange();
    });
    this.field(key, label, input, opts.unit, opts.hint, opts);
    return input;
  };
  BT.Form.prototype.values = function () {
    const out = {};
    BT.qa('[data-key]', this.grid).forEach(function (inp) {
      out[inp.dataset.key] = inp.dataset.type === 'number' ? (inp.value === '' ? NaN : parseFloat(inp.value)) : inp.value;
    });
    return out;
  };
  BT.Form.prototype.set = function (key, value) {
    const inp = BT.q('[data-key="' + key + '"]', this.grid);
    if (inp) { inp.value = value; BT.setInput(this.id + '.' + key, value); }
    return this;
  };

  /* ---------- UI blocks ---------- */
  BT.panel = function (title, body, sub, tools) {
    const p = BT.el('section', { class: 'panel' });
    if (title) {
      const h = BT.el('div', { class: 'panel-head' }, [BT.el('h3', { text: title })]);
      if (sub) h.appendChild(BT.el('span', { class: 'sub', text: sub }));
      if (tools) h.appendChild(tools);
      p.appendChild(h);
    }
    const b = BT.el('div', { class: 'panel-body' }, body);
    p.appendChild(b);
    return p;
  };
  BT.kpi = function (label, value, unit, sub, tone) {
    const k = BT.el('div', { class: 'kpi ' + (tone || '') });
    k.appendChild(BT.el('div', { class: 'kpi-label', text: label }));
    const v = BT.el('div', { class: 'kpi-value', text: value });
    if (unit) v.appendChild(BT.el('small', { text: unit }));
    k.appendChild(v);
    if (sub) k.appendChild(BT.el('div', { class: 'kpi-sub', text: sub }));
    return k;
  };
  BT.kpis = function (items) {
    const g = BT.el('div', { class: 'kpis' });
    g.style.setProperty('--cols', String(Math.max(1, items.length)));
    items.forEach(function (it) { g.appendChild(BT.kpi(it[0], it[1], it[2], it[3], it[4])); });
    return g;
  };
  BT.badge = function (text, tone) {
    return BT.el('span', { class: 'badge ' + (tone || 'neutral') }, [BT.el('i', { class: 'dot' }), document.createTextNode(text)]);
  };
  BT.note = function (text, tone) {
    tone = tone || 'info';
    return BT.el('div', { class: 'note ' + tone }, [
      BT.el('span', { class: 'n-ico', text: tone === 'bad' ? '!' : tone === 'warn' ? '!' : tone === 'ok' ? '✓' : 'i' }),
      BT.el('span', { html: text })
    ]);
  };
  BT.checkRow = function (state, title, detail) {
    const tone = state === 'pass' ? 'ok' : state === 'warn' ? 'warn' : state === 'fail' ? 'bad' : 'neutral';
    const txt = state === 'pass' ? '通过' : state === 'warn' ? '关注' : state === 'fail' ? '不通过' : '参考';
    return BT.el('div', { class: 'check-row' }, [
      BT.badge(txt, tone),
      BT.el('div', { class: 'check-main' }, [BT.el('b', { text: title }), BT.el('span', { text: detail })])
    ]);
  };
  BT.table = function (headers, rows, opts) {
    opts = opts || {};
    const wrap = BT.el('div', { class: 'table-wrap' });
    if (opts.caption) {
      const cap = BT.el('div', { class: 'table-cap', style: { padding: '7px 9px' } }, [
        BT.el('span', { text: opts.caption }), BT.el('span', { text: opts.captionRight || '' })
      ]);
      wrap.appendChild(cap);
    }
    const table = BT.el('table', { class: 'data' });
    const thead = BT.el('thead'), trh = BT.el('tr');
    headers.forEach(function (h) {
      const isObj = h && typeof h === 'object';
      trh.appendChild(BT.el('th', { text: isObj ? h.label : h, style: isObj && h.align ? { textAlign: h.align } : null }));
    });
    thead.appendChild(trh); table.appendChild(thead);
    const tb = BT.el('tbody');
    rows.forEach(function (r, ri) {
      const tr = BT.el('tr', { class: opts.highlight === ri ? 'highlight' : '' });
      r.forEach(function (c) {
        let text = c, cls = '', isObj = c && typeof c === 'object' && !(c instanceof Node);
        if (isObj) { text = c.text; cls = c.cls || ''; }
        const td = BT.el('td', { class: cls });
        if (text instanceof Node) td.appendChild(text); else td.textContent = text === undefined || text === null ? '' : text;
        tr.appendChild(td);
      });
      tb.appendChild(tr);
    });
    table.appendChild(tb); wrap.appendChild(table);
    return wrap;
  };
  BT.vehStrip = function (v) {
    const d = BT.el('dl', { class: 'veh-strip' });
    const items = [
      ['整备质量', BT.fmt(v.mass, 0), 'kg'],
      ['轴距', BT.fmt(v.L, 0), 'mm'],
      ['质心高', BT.fmt(v.h, 0), 'mm'],
      ['前轴荷', BT.fmt(v.frontShare, 1), '%'],
      ['车轮半径', BT.fmt(v.wheelR, 0), 'mm'],
      ['设计 β', BT.fmt(BT.derived(v).beta, 3), '']
    ];
    items.forEach(function (it) {
      d.appendChild(BT.el('div', {}, [BT.el('dt', { text: it[0] }), BT.el('dd', {}, [document.createTextNode(it[1]), BT.el('small', { text: it[2] })])]));
    });
    return d;
  };
  BT.pageHead = function (eyebrow, title, desc, tools) {
    const h = BT.el('div', { class: 'page-head' });
    const l = BT.el('div', { class: 'lede' }, [BT.el('span', { class: 'eyebrow', text: eyebrow }), BT.el('h2', { text: title }), BT.el('p', { text: desc })]);
    h.appendChild(l);
    if (tools) h.appendChild(BT.el('div', { class: 'head-tools' }, tools));
    return h;
  };
  BT.workbench = function (side, main) {
    return BT.el('div', { class: 'workbench' }, [BT.el('div', { class: 'side-col' }, side), BT.el('div', { class: 'result-col' }, main)]);
  };
  BT.chartCard = function (title, sub, chartHost, extra) {
    const p = BT.el('section', { class: 'panel chart-card' });
    const h = BT.el('div', { class: 'chart-head' }, [BT.el('div', {}, [BT.el('h4', { text: title }), sub ? BT.el('p', { text: sub }) : null])]);
    if (extra) h.appendChild(extra);
    p.appendChild(h); p.appendChild(chartHost);
    return p;
  };

  /* ---------- data helpers ---------- */
  BT.parseCSV = function (text) {
    text = String(text || '').replace(/^\uFEFF/, '');
    const first = text.split(/\r?\n/).find(function (l) { return l.trim(); }) || '';
    const cands = [',', ';', '\t'];
    let delim = ',', best = -1;
    cands.forEach(function (d) {
      const n = first.split(d).length;
      if (n > best) { best = n; delim = d; }
    });
    const rows = []; let row = [], cell = '', quote = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i], n = text[i + 1];
      if (quote) {
        if (c === '"' && n === '"') { cell += '"'; i++; }
        else if (c === '"') quote = false;
        else cell += c;
      } else {
        if (c === '"') quote = true;
        else if (c === delim) { row.push(cell); cell = ''; }
        else if (c === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; }
        else if (c === '\r') { /* skip */ }
        else cell += c;
      }
    }
    if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
    const clean = rows.filter(function (r) { return r.some(function (c) { return String(c).trim() !== ''; }); });
    if (!clean.length) return { headers: [], rows: [], delim: delim };
    return { headers: clean[0].map(function (h) { return String(h).trim(); }), rows: clean.slice(1), delim: delim };
  };
  BT.toNum = function (v) {
    if (typeof v === 'number') return v;
    if (v === null || v === undefined) return NaN;
    const s = String(v).replace(/\s/g, '').replace(',', '.');
    const m = s.match(/-?\d+(\.\d+)?([eE][-+]?\d+)?/);
    return m ? parseFloat(m[0]) : NaN;
  };
  BT.regression = function (pts) {
    const n = pts.length;
    if (n < 2) return { a: 0, b: 0, r2: 0, n: n };
    let sx = 0, sy = 0, sxx = 0, sxy = 0, syy = 0;
    pts.forEach(function (p) { sx += p[0]; sy += p[1]; sxx += p[0] * p[0]; sxy += p[0] * p[1]; syy += p[1] * p[1]; });
    const den = n * sxx - sx * sx;
    const b = den === 0 ? 0 : (n * sxy - sx * sy) / den;
    const a = (sy - b * sx) / n;
    const varY = n * syy - sy * sy;
    // Constant y has zero variance: r is undefined, but r²=0 is the
    // non-deceptive display value for a flat fit.
    const r = (den === 0 || varY <= 1e-12) ? 0 : (n * sxy - sx * sy) / Math.sqrt((n * sxx - sx * sx) * varY);
    return { a: a, b: b, r2: r * r, n: n };
  };
  BT.smooth = function (arr, win) {
    win = Math.max(1, Math.round(win || 1));
    if (win % 2 === 0) win += 1; // keep a symmetric centered window
    if (win === 1) return arr.slice();
    const out = new Array(arr.length), half = Math.floor(win / 2);
    for (let i = 0; i < arr.length; i++) {
      let sum = 0, n = 0;
      for (let j = i - half; j <= i + half; j++) {
        if (j >= 0 && j < arr.length && isFinite(arr[j])) { sum += arr[j]; n++; }
      }
      out[i] = n ? sum / n : NaN;
    }
    return out;
  };

  /* ---------- misc ---------- */
  BT.today = function () {
    const d = new Date();
    const p = function (n) { return String(n).padStart(2, '0'); };
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
  };
  BT.uid = function () { return 'id' + Math.random().toString(36).slice(2, 9); };
})(window.BT);
