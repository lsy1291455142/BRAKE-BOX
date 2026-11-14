/* ============================================================
   Brake Lab · interactive, formula-driven SVG model diagrams
   Every diagram owns a small parameter state, recomputes with the
   same model functions used by the calculator, and exposes sliders
   or draggable handles. No external dependency.
   ============================================================ */
(function (BT) {
  'use strict';

  let seq = 0;
  const G = 9.80665;
  const C = {
    ink: '#16202b', muted: '#667085', line: '#b9c4cf', soft: '#f3f6f9',
    accent: '#c8502a', accentSoft: '#fdf0ea', blue: '#17657f', blueSoft: '#eaf4f7',
    green: '#177a52', greenSoft: '#e8f6ef', amber: '#a86412', amberSoft: '#fdf4e3',
    bad: '#b42318'
  };

  /* ---------- primitives ---------- */
  function t(x, y, s, cls, anchor, extra) {
    return '<text x="' + x + '" y="' + y + '" class="' + (cls || 'lbl') + '" text-anchor="' + (anchor || 'start') + '"' + (extra || '') + '>' + s + '</text>';
  }
  function box(x, y, w, h, fill, stroke, r, extra) {
    return '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="' + (r === undefined ? 9 : r) + '" fill="' + fill + '" stroke="' + stroke + '" stroke-width="1.4"' + (extra || '') + '/>';
  }
  function arrow(u, key, x1, y1, x2, y2, w, dash) {
    const col = { a: C.accent, b: C.blue, m: C.muted, g: C.green, k: C.ink }[key] || C.accent;
    return '<line x1="' + x1.toFixed(1) + '" y1="' + y1.toFixed(1) + '" x2="' + x2.toFixed(1) + '" y2="' + y2.toFixed(1) +
      '" stroke="' + col + '" stroke-width="' + (w || 2) + '" stroke-linecap="round" marker-end="url(#' + key + u + ')"' +
      (dash ? ' stroke-dasharray="' + dash + '"' : '') + '/>';
  }
  function car(x, y, scale) {
    return '<g transform="translate(' + x + ' ' + y + ') scale(' + (scale || 1) + ')">' +
      '<path d="M0 0 L8 -20 L55 -20 L72 -4 L96 -4 L96 12 L0 12 Z" fill="#e8eef4" stroke="#344054" stroke-width="1.6"/>' +
      '<path d="M18 -17 L50 -17 L60 -5 L18 -5 Z" fill="#cfe0ea"/>' +
      '<circle cx="20" cy="14" r="9" fill="#16202b"/><circle cx="76" cy="14" r="9" fill="#16202b"/>' +
      '</g>';
  }
  function defs(u) {
    function marker(k, col) {
      return '<marker id="' + k + u + '" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="' + col + '"/></marker>';
    }
    return marker('a', C.accent) + marker('b', C.blue) + marker('m', C.muted) + marker('g', C.green) + marker('k', C.ink) +
      '<linearGradient id="heat' + u + '" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#d9480f"/><stop offset=".45" stop-color="#f08a3c"/><stop offset="1" stop-color="#f6c28b"/></linearGradient>';
  }
  function f(v, d) { return isFinite(v) ? v.toFixed(d === undefined ? 1 : d) : '—'; }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function readout(list) {
    return list.map(function (it) {
      return '<span class="dgm-chip"><b>' + BT.esc(it[0]) + '</b>' + BT.esc(it[1]) + '</span>';
    }).join('');
  }
  function heatFill(T) {
    const k = clamp((T - 20) / 640, 0, 1);
    return 'hsl(' + (34 - 10 * k) + ',88%,' + (90 - 54 * k) + '%)';
  }
  function tempColor(T) {
    const k = clamp((T - 20) / 640, 0, 1);
    return 'hsl(' + (30 - 8 * k) + ',90%,' + (86 - 52 * k) + '%)';
  }
  function niceNum(v) { return BT.fmt(v, v >= 100 ? 0 : v >= 10 ? 1 : 2); }

  /* ---------- interactive registry ---------- */
  const REG = {};
  let dragTarget = null;

  function slidersHTML(spec, st, v) {
    if (!spec.sliders) return '';
    return spec.sliders.map(function (c) {
      return '<label class="dgm-ctl"><span class="dgm-ctl-top"><em>' + c.label + '</em><b data-val="' + c.k + '">' + c.disp(st[c.k]) + '</b></span>' +
        '<input type="range" data-k="' + c.k + '" min="' + c.min + '" max="' + c.max + '" step="' + c.step + '" value="' + st[c.k] + '" aria-label="' + c.label + '"></label>';
    }).join('');
  }
  function tabsHTML(spec, st, v) {
    const list = typeof spec.tabs === 'function' ? spec.tabs(v) : (spec.tabs || []);
    if (!list.length) return '';
    return '<div class="dgm-tabs">' + list.map(function (b) {
      return '<button type="button" class="dgm-tab' + (String(st[b.k]) === String(b.val) ? ' active' : '') + '" data-act="' + b.k + '" data-val="' + b.val + '">' + b.label + '</button>';
    }).join('') + '</div>';
  }
  function bodyHTML(spec, st, v, u) {
    const out = spec.draw(st, v, u);
    return '<svg class="diagram" viewBox="0 0 720 ' + spec.h + '" preserveAspectRatio="xMidYMid meet" role="img" aria-label="' + BT.esc(spec.label) + '">' +
      '<title>' + BT.esc(spec.label) + '</title>' +
      '<desc>可交互原理图。拖动下方滑杆或图上控制点，图形与读数按公式实时重算。</desc>' +
      '<defs>' + defs(u) + '</defs><g class="dgm-canvas">' + out.body + '</g></svg>' +
      '<div class="dgm-foot">' +
      '<div class="dgm-controls">' + slidersHTML(spec, st, v) + tabsHTML(spec, st, v) + '</div>' +
      '<div class="dgm-readout">' + readout(out.readout || []) + '</div>' +
      ((out.note || spec.note) ? '<div class="dgm-note">' + (out.note || spec.note) + '</div>' : '') +
      '</div>';
  }

  BT.diagram = function (kind) {
    const spec = REG[kind] || REG.standards;
    if (!spec) return '<div class="dgm-live"></div>';
    const v = BT.vehicle;
    const st = spec.init(v);
    const u = 'd' + (++seq);
    return '<div class="dgm-live" data-dgm="' + kind + '" data-uid="' + u + '">' + bodyHTML(spec, st, v, u) + '</div>';
  };

  /* ---------- live binding ---------- */
  function paint(host) {
    const spec = REG[host.dataset.dgm];
    if (!spec) return;
    const st = host._st;
    const v = BT.vehicle;
    const u = host.dataset.uid;
    const out = spec.draw(st, v, u);
    const svg = host.querySelector('svg.diagram');
    if (!svg) return;
    svg.setAttribute('viewBox', '0 0 720 ' + spec.h);
    const canvas = svg.querySelector('.dgm-canvas');
    if (canvas) canvas.innerHTML = out.body;

    if (spec.sliders) {
      spec.sliders.forEach(function (c) {
        const inp = host.querySelector('input[data-k="' + c.k + '"]');
        if (inp && document.activeElement !== inp) inp.value = st[c.k];
        const lab = host.querySelector('[data-val="' + c.k + '"]');
        if (lab) lab.textContent = c.disp(st[c.k]);
      });
    }
    const ro = host.querySelector('.dgm-readout');
    if (ro) ro.innerHTML = readout(out.readout || []);
    const note = host.querySelector('.dgm-note');
    if (note && (out.note || spec.note)) note.innerHTML = out.note || spec.note;
    BT.qa('[data-act]', host).forEach(function (b) {
      if (String(st[b.dataset.act]) === String(b.dataset.val)) b.classList.add('active');
      else b.classList.remove('active');
    });
    bindDrag(host);
  }

  function bindDrag(host) {
    const spec = REG[host.dataset.dgm];
    const svg = host.querySelector('svg.diagram');
    if (!spec || !spec.drag || !svg) return;
    BT.qa('[data-drag]', svg).forEach(function (el) {
      el.addEventListener('pointerdown', function (e) {
        e.preventDefault();
        e.stopPropagation();
        const key = el.dataset.drag;
        function toSvg(ev) {
          const pt = svg.createSVGPoint();
          pt.x = ev.clientX; pt.y = ev.clientY;
          const m = svg.getScreenCTM();
          return m ? pt.matrixTransform(m.inverse()) : pt;
        }
        function move(ev) { spec.drag(host._st, key, toSvg(ev), BT.vehicle); paint(host); }
        function up() {
          window.removeEventListener('pointermove', move);
          window.removeEventListener('pointerup', up);
          window.removeEventListener('pointercancel', up);
        }
        move(e);
        window.addEventListener('pointermove', move);
        window.addEventListener('pointerup', up);
        window.addEventListener('pointercancel', up);
      });
    });
  }

  function initOne(host) {
    if (!host || host.dataset.ready === '1') return;
    const spec = REG[host.dataset.dgm];
    if (!spec) return;
    host.dataset.uid = host.dataset.uid || ('d' + (++seq));
    host._st = spec.init(BT.vehicle);
    host.dataset.ready = '1';
    host.addEventListener('input', function (e) {
      const k = e.target.dataset && e.target.dataset.k;
      if (!k) return;
      host._st[k] = parseFloat(e.target.value);
      paint(host);
    });
    host.addEventListener('click', function (e) {
      const b = e.target.closest('[data-act]');
      if (!b) return;
      const k = b.dataset.act;
      const raw = b.dataset.val;
      host._st[k] = /^-?\d+(\.\d+)?$/.test(raw) ? parseFloat(raw) : raw;
      paint(host);
    });
    paint(host);
  }

  BT.mountDiagrams = function (root) {
    BT.qa('.dgm-live', root || document).forEach(initOne);
  };
  BT.syncDiagram = function (target, values) {
    if (!target) return;
    const host = target.classList && target.classList.contains('dgm-live') ? target : target.querySelector('.dgm-live');
    if (!host || !host._st) return;
    Object.keys(values || {}).forEach(function (k) {
      if (Object.prototype.hasOwnProperty.call(host._st, k) && isFinite(values[k])) host._st[k] = values[k];
    });
    paint(host);
  };

  if (typeof MutationObserver !== 'undefined' && document.documentElement) {
    const mo = new MutationObserver(function (muts) {
      for (let i = 0; i < muts.length; i++) {
        const added = muts[i].addedNodes;
        for (let j = 0; j < added.length; j++) {
          const n = added[j];
          if (n.nodeType !== 1) continue;
          if (n.classList && n.classList.contains('dgm-live')) initOne(n);
          const list = n.querySelectorAll ? n.querySelectorAll('.dgm-live') : [];
          for (let k = 0; k < list.length; k++) initOne(list[k]);
        }
      }
    });
    mo.observe(document.documentElement, { childList: true, subtree: true });
  }

  /* ============================================================
     1. axle load transfer
     ============================================================ */
  REG.loadTransfer = {
    h: 300,
    label: '制动轴荷转移交互图',
    init: function () { return { z: 0.8 }; },
    sliders: [{ k: 'z', label: '减速度 z', min: 0, max: 1.2, step: 0.01, disp: function (v) { return v.toFixed(2) + ' g'; } }],
    draw: function (s, v, u) {
      const mg = v.mass * G, sf = v.frontShare / 100;
      const ld = BT.axleLoads(s.z, v);
      const zf = ld.front / mg, zr = ld.rear / mg;
      const dF = mg * s.z * v.h / v.L;
      const Lf = clamp(28 + 96 * (zf - 0.42), 24, 112);
      const Lr = clamp(28 + 96 * (zr - 0.42), 24, 112);
      let s2 = '<rect width="720" height="300" fill="#fff"/>';
      s2 += t(36, 30, '制动时，车为什么会“点头”？', 'ttl');
      s2 += t(36, 50, 'z = ' + s.z.toFixed(2) + ' g：载荷前移 ' + f(dF / 1000, 1) + ' kN（h/L = ' + (v.h / v.L).toFixed(3) + '）', 'sm');
      s2 += '<line x1="40" y1="216" x2="680" y2="216" stroke="#98a2b3" stroke-width="2"/>';
      s2 += '<path d="M150 158 L182 116 L300 102 L430 102 L542 128 L578 158 Z" fill="#e8eef4" stroke="#344054" stroke-width="1.8"/>';
      s2 += '<path d="M208 120 L300 108 L420 108 L505 128 L482 140 L232 140 Z" fill="#cfe0ea" opacity=".6"/>';
      s2 += '<circle cx="220" cy="184" r="27" fill="#16202b"/><circle cx="220" cy="184" r="11" fill="#667085"/>';
      s2 += '<circle cx="515" cy="184" r="27" fill="#16202b"/><circle cx="515" cy="184" r="11" fill="#667085"/>';
      s2 += '<circle cx="350" cy="116" r="6" fill="' + C.accent + '"/>' + t(360, 112, '质心 CG', 'val');
      s2 += '<line x1="350" y1="122" x2="350" y2="214" stroke="' + C.accent + '" stroke-width="1.2" stroke-dasharray="4 3"/>';
      s2 += t(356, 172, 'h', 'val');
      s2 += arrow(u, 'a', 220, 192, 220, 192 - Lf, 3.4) + t(228, 204 - Lf, 'Fzf ' + f(ld.front / 1000, 1) + ' kN', 'val');
      s2 += arrow(u, 'b', 515, 192, 515, 192 - Lr, 2.6) + t(523, 204 - Lr, 'Fzr ' + f(ld.rear / 1000, 1) + ' kN', 'val');
      s2 += arrow(u, 'a', 178, 70, 278, 70, 2.4) + t(286, 74, '减速度 a = ' + s.z.toFixed(2) + ' g', 'val');
      s2 += '<path d="M515 148 C450 94 300 94 244 142" fill="none" stroke="' + C.amber + '" stroke-width="2" stroke-dasharray="6 4" marker-end="url(#a' + u + ')"/>';
      s2 += t(310, 88, '载荷前移 ΔF', 'val');
      s2 += t(40, 246, '前轴静态 ' + f(sf * 100, 0) + '%  →  动态 ' + f(zf * 100, 0) + '%', 'sm');
      s2 += t(40, 264, '后轴静态 ' + f((1 - sf) * 100, 0) + '%  →  动态 ' + f(zr * 100, 0) + '%', 'sm');
      s2 += t(36, 290, 'Fzf = mg(sf + z·h/L) = ' + f(ld.front / 1000, 1) + ' kN；Fzr = mg(1 − sf − z·h/L) = ' + f(ld.rear / 1000, 1) + ' kN', 'formula');
      return {
        body: s2,
        readout: [['Fzf', f(ld.front / 1000, 1) + ' kN'], ['Fzr', f(ld.rear / 1000, 1) + ' kN'], ['ΔF', '±' + f(dF / 1000, 1) + ' kN'], ['z', s.z.toFixed(2) + ' g']],
        note: '拖动 z：前轴增载、后轴减载；z 超过 φ₀ 后，后轴先抱死风险由分配页继续校核。'
      };
    }
  };

  /* ============================================================
     2. ideal distribution curve
     ============================================================ */
  REG.idealCurve = {
    h: 320,
    label: '制动力分配 I 曲线交互图',
    init: function (v) { return { beta: BT.derived(v).beta, z: 0.5 }; },
    sliders: [
      { k: 'beta', label: '设计 β', min: 0.2, max: 0.95, step: 0.005, disp: function (v) { return v.toFixed(3); } },
      { k: 'z', label: '减速度 z', min: 0, max: 1, step: 0.01, disp: function (v) { return v.toFixed(2) + ' g'; } }
    ],
    drag: function (st, key, p) {
      if (key === 'beta') st.beta = clamp((250 - p.y) / (250 - 60) * 1.05, 0.2, 0.95);
      if (key === 'z') st.z = clamp((p.x - 92) / (650 - 92), 0, 1);
    },
    draw: function (s, v, u) {
      const x0 = 92, x1 = 650, y0 = 250, y1 = 60;
      const X = function (z) { return x0 + z * (x1 - x0); };
      const Y = function (b) { return y0 - b * (y0 - y1); };
      const sf = v.frontShare / 100;
      const phi0 = BT.phi0(s.beta, v);
      const uu = BT.utilization(s.beta, s.z, v);
      const idealAt = sf + s.z * v.h / v.L;
      let s2 = '<rect width="720" height="320" fill="#fff"/>';
      s2 += t(36, 30, '为什么 β 和 φ₀ 决定先抱哪个轮？', 'ttl');
      s2 += t(36, 50, 'β 是前制动力占比；φ₀ 是前后轮同时抱死的附着系数。', 'sm');
      const xp = clamp(phi0, 0, 1);
      s2 += '<rect x="' + X(0) + '" y="' + y1 + '" width="' + Math.max(0, X(xp) - X(0)) + '" height="' + (y0 - y1) + '" fill="' + C.greenSoft + '" opacity=".6"/>';
      s2 += '<rect x="' + X(xp) + '" y="' + y1 + '" width="' + Math.max(0, X(1) - X(xp)) + '" height="' + (y0 - y1) + '" fill="' + C.amberSoft + '" opacity=".6"/>';
      for (let k = 0; k <= 1.001; k += 0.2) {
        s2 += '<line x1="' + x0 + '" y1="' + Y(k) + '" x2="' + x1 + '" y2="' + Y(k) + '" class="grid"/>';
        s2 += t(x0 - 8, Y(k) + 3, (k * 100).toFixed(0) + '%', 'tick', 'end');
        s2 += '<line x1="' + X(k) + '" y1="' + y0 + '" x2="' + X(k) + '" y2="' + y1 + '" class="grid"/>';
        s2 += t(X(k), y0 + 16, k.toFixed(1), 'tick', 'middle');
      }
      s2 += '<line x1="' + x0 + '" y1="' + y0 + '" x2="' + x1 + '" y2="' + y0 + '" class="axis"/>';
      s2 += '<line x1="' + x0 + '" y1="' + y0 + '" x2="' + x0 + '" y2="' + y1 + '" class="axis"/>';
      let zEnd = 1;
      if (sf + v.h / v.L > 1) zEnd = Math.min(1, (1 - sf) * v.L / v.h);
      s2 += '<line x1="' + X(0) + '" y1="' + Y(sf) + '" x2="' + X(zEnd) + '" y2="' + Y(sf + zEnd * v.h / v.L) + '" stroke="' + C.blue + '" stroke-width="2.8"/>';
      s2 += t(560, Y(sf + 0.9 * (zEnd) * v.h / v.L) - 8, '理想 I 曲线', 'val', 'middle');
      s2 += '<line x1="' + x0 + '" y1="' + Y(s.beta) + '" x2="' + x1 + '" y2="' + Y(s.beta) + '" stroke="' + C.accent + '" stroke-width="2.6" stroke-dasharray="7 5" data-drag="beta" style="cursor:ns-resize"/>';
      s2 += '<line x1="' + x0 + '" y1="' + Y(s.beta) + '" x2="' + x1 + '" y2="' + Y(s.beta) + '" stroke="transparent" stroke-width="18" data-drag="beta" style="cursor:ns-resize"/>';
      s2 += t(x0 + 8, Y(s.beta) - 8, '设计 β = ' + s.beta.toFixed(3) + '（可上下拖）', 'val');
      if (phi0 >= 0 && phi0 <= 1.15) {
        s2 += '<circle cx="' + X(phi0) + '" cy="' + Y(s.beta) + '" r="6" fill="' + C.ink + '"/>';
        s2 += '<circle cx="' + X(phi0) + '" cy="' + Y(s.beta) + '" r="13" fill="transparent" stroke="' + C.ink + '" stroke-width="1" stroke-dasharray="3 3"/>';
        s2 += t(clamp(X(phi0) + 10, 100, 560), Y(s.beta) + 24, 'φ₀ = ' + phi0.toFixed(3) + ' 同时抱死', 'val');
      }
      s2 += '<line x1="' + X(s.z) + '" y1="' + y0 + '" x2="' + X(s.z) + '" y2="' + y1 + '" stroke="' + C.muted + '" stroke-width="1.2" stroke-dasharray="4 3"/>';
      s2 += '<circle cx="' + X(s.z) + '" cy="' + Y(idealAt) + '" r="4" fill="' + C.blue + '"/>';
      s2 += '<circle cx="' + X(s.z) + '" cy="' + Y(s.beta) + '" r="7" fill="' + C.accent + '" data-drag="z" style="cursor:ew-resize"/>';
      s2 += '<circle cx="' + X(s.z) + '" cy="' + Y(s.beta) + '" r="14" fill="transparent" data-drag="z" style="cursor:ew-resize"/>';
      s2 += t(clamp(X(s.z) + 10, 96, 560), Y(s.beta) - 10, 'z = ' + s.z.toFixed(2) + ' g', 'val');
      s2 += t(180, y0 - 10, '前轮先抱死（稳定）', 'lbl', 'middle');
      s2 += t(548, y0 - 10, '后轮先抱死（危险）', 'lbl', 'middle');
      s2 += t(x0 + (x1 - x0) / 2, 276, '减速度 z（g）', 'sm', 'middle');
      s2 += t(24, 158, '前制动力占比', 'sm', 'middle', ' transform="rotate(-90 24 158)"');
      s2 += t(36, 308, 'φ₀ = (β − sf)·L/h = ' + phi0.toFixed(3) + '；在 z = ' + s.z.toFixed(2) + ' 处 ff = ' + f(uu.front, 2) + '，fr = ' + f(uu.rear, 2), 'formula');
      return {
        body: s2,
        readout: [['β', s.beta.toFixed(3)], ['φ₀', phi0.toFixed(3)], ['ff @z', f(uu.front, 2)], ['fr @z', f(uu.rear, 2)],
          ['先抱死', uu.rear > uu.front + 0.002 ? '后轮（危险）' : '前轮（稳定）']],
        note: '拖动橙色 β 线或圆点：β 改变同时抱死点 φ₀；拖动 z 点读取该减速度下的利用附着系数。'
      };
    }
  };

  /* ============================================================
     3. stopping distance
     ============================================================ */
  REG.distance = {
    h: 330,
    label: '制动距离三段模型交互图',
    init: function () { return { v0: 100, mu: 0.9, tr: 0.35, tb: 0.2, tp: 1 }; },
    sliders: [
      { k: 'v0', label: '初速度 v₀', min: 30, max: 200, step: 1, disp: function (v) { return v.toFixed(0) + ' km/h'; } },
      { k: 'mu', label: '附着 μ', min: 0.3, max: 1.1, step: 0.01, disp: function (v) { return v.toFixed(2); } },
      { k: 'tr', label: '反应 tᵣ', min: 0, max: 1.2, step: 0.01, disp: function (v) { return v.toFixed(2) + ' s'; } },
      { k: 'tb', label: '建压 t_b', min: 0.02, max: 0.6, step: 0.01, disp: function (v) { return v.toFixed(2) + ' s'; } }
    ],
    drag: function (st, key, p) {
      if (key === 'tp') st.tp = clamp((p.x - 82) / (650 - 82), 0, 1);
    },
    draw: function (s, v, u) {
      const v0 = s.v0 / 3.6, a = s.mu * G * 0.95, tr = s.tr, tb = Math.max(0.02, s.tb);
      const seg = BT.stoppingDistance({ v0: v0, tr: tr, tb: tb, a: a });
      const tStopBuild = Math.sqrt(2 * v0 * tb / a);
      let tBuild = tb, build = 0, steady = 0, tSteady = 0, v1 = 0;
      if (tStopBuild < tb) { tBuild = tStopBuild; build = seg.braking; steady = 0; tSteady = 0; }
      else { build = v0 * tb - a * tb * tb / 6; v1 = v0 - a * tb / 2; steady = v1 * v1 / (2 * a); tSteady = v1 / a; }
      const tTotal = tr + tBuild + tSteady;
      const react = v0 * tr;
      function vAt(tt) {
        if (tt <= tr) return v0;
        const x = tt - tr;
        if (x <= tBuild) return Math.max(0, v0 - a * x * x / (2 * tb));
        return Math.max(0, v1 - a * (x - tBuild));
      }
      function sAt(tt) {
        let sum = 0, last = vAt(0), n = 80;
        for (let i = 1; i <= n; i++) { const tv = vAt(tt * i / n); sum += (last + tv) / 2 * (tt / n); last = tv; }
        return sum;
      }
      const tp = clamp(s.tp, 0, 1) * tTotal;
      const vp = vAt(tp), sp = sAt(tp);

      const barX = 70, barW = 580, barY = 96;
      const total = Math.max(0.001, react + build + steady);
      let w1 = Math.max(8, barW * react / total), w2 = Math.max(8, barW * build / total), w3 = Math.max(8, barW * steady / total);
      const kk = barW / (w1 + w2 + w3); w1 *= kk; w2 *= kk; w3 *= kk;
      let s2 = '<rect width="720" height="330" fill="#fff"/>';
      s2 += t(36, 30, '刹车距离为什么不是 v²/2a 这么简单？', 'ttl');
      s2 += t(36, 50, '总距离 = 反应段 + 建压段 + 稳态段；当前 a = ' + f(a / G, 2) + ' g。', 'sm');
      s2 += '<line x1="' + barX + '" y1="' + barY + '" x2="' + (barX + w1) + '" y2="' + barY + '" stroke="' + C.blue + '" stroke-width="8"/>';
      s2 += '<line x1="' + (barX + w1) + '" y1="' + barY + '" x2="' + (barX + w1 + w2) + '" y2="' + barY + '" stroke="' + C.amber + '" stroke-width="8"/>';
      s2 += '<line x1="' + (barX + w1 + w2) + '" y1="' + barY + '" x2="' + (barX + w1 + w2 + w3) + '" y2="' + barY + '" stroke="' + C.accent + '" stroke-width="8"/>';
      s2 += car(74, 60, .5) + car(566, 60, .5);
      s2 += t(barX + w1 / 2, 118, '反应 ' + f(react, 1) + ' m', 'val', 'middle');
      s2 += t(barX + w1 + w2 / 2, 118, '建压 ' + f(build, 1) + ' m', 'val', 'middle');
      s2 += t(barX + w1 + w2 + w3 / 2, 118, '稳态 ' + f(steady, 1) + ' m', 'val', 'middle');
      s2 += t(36, 142, 'v₀·tᵣ = ' + f(react, 1) + ' m    建压段 = ' + f(build, 1) + ' m    v₁²/2a = ' + f(steady, 1) + ' m', 'sm');

      const x0 = 82, x1 = 650, y0 = 270, y1 = 168;
      s2 += '<line x1="' + x0 + '" y1="' + y0 + '" x2="' + x1 + '" y2="' + y0 + '" class="axis"/>';
      s2 += '<line x1="' + x0 + '" y1="' + y0 + '" x2="' + x0 + '" y2="' + y1 + '" class="axis"/>';
      for (let k = 0; k <= 1.001; k += 0.5) {
        s2 += '<line x1="' + x0 + '" y1="' + (y0 - k * (y0 - y1)) + '" x2="' + x1 + '" y2="' + (y0 - k * (y0 - y1)) + '" class="grid"/>';
        s2 += t(x0 - 8, y0 - k * (y0 - y1) + 3, (s.v0 * k).toFixed(0), 'tick', 'end');
      }
      let path = '';
      for (let i = 0; i <= 100; i++) {
        const tt = tTotal * i / 100;
        path += (i ? 'L' : 'M') + (x0 + (x1 - x0) * i / 100).toFixed(1) + ' ' + (y0 - (y0 - y1) * vAt(tt) / v0).toFixed(1) + ' ';
      }
      s2 += '<path d="' + path + '" fill="none" stroke="' + C.accent + '" stroke-width="2.4"/>';
      s2 += '<line x1="' + (x0 + (x1 - x0) * s.tp) + '" y1="' + y1 + '" x2="' + (x0 + (x1 - x0) * s.tp) + '" y2="' + y0 + '" stroke="' + C.muted + '" stroke-width="1.2" stroke-dasharray="4 3"/>';
      s2 += '<circle cx="' + (x0 + (x1 - x0) * s.tp) + '" cy="' + (y0 - (y0 - y1) * vp / v0) + '" r="6" fill="' + C.ink + '" data-drag="tp" style="cursor:ew-resize"/>';
      s2 += '<circle cx="' + (x0 + (x1 - x0) * s.tp) + '" cy="' + (y0 - (y0 - y1) * vp / v0) + '" r="14" fill="transparent" data-drag="tp" style="cursor:ew-resize"/>';
      s2 += t(clamp(x0 + (x1 - x0) * s.tp + 10, 90, 600), clamp(y0 - (y0 - y1) * vp / v0 - 12, 176, 264), 'v ' + f(vp * 3.6, 0) + ' km/h · s ' + f(sp, 1) + ' m', 'val');
      s2 += t(x0 + (x1 - x0) / 2, 288, '时间（s）', 'sm', 'middle');
      s2 += t(28, 220, 'v（km/h）', 'sm', 'middle', ' transform="rotate(-90 28 220)"');
      s2 += t(36, 320, 's = v₀tᵣ + [v₀t_b − a·t_b²/6] + (v₁²/2a) = ' + f(seg.total, 1) + ' m', 'formula');
      return {
        body: s2,
        readout: [['总距离', f(seg.total, 1) + ' m'], ['反应', f(react, 1) + ' m'], ['建压', f(build, 1) + ' m'], ['稳态', f(steady, 1) + ' m'], ['a', f(a / G, 2) + ' g']],
        note: '拖动曲线上的黑色圆点查看任意时刻的车速与已行驶距离；横轴按当前总制动时间归一。'
      };
    }
  };

  /* ============================================================
     4. brake torque
     ============================================================ */
  REG.torque = {
    h: 310,
    label: '制动器力矩交互图',
    init: function () { return { p: 6 }; },
    sliders: [{ k: 'p', label: '轮端压力 p', min: 0, max: 12, step: 0.1, disp: function (v) { return v.toFixed(1) + ' MPa'; } }],
    draw: function (s, v, u) {
      const ax = v.front, A = BT.areaCaliper(ax);
      const Fc = s.p * A;
      const T = BT.torquePerMPa(ax) * s.p;
      const Fw = 2 * T / (v.wheelR / 1000);
      const ppad = Fc / (ax.padArea * 100);
      const decel = Fw / (v.mass * G);
      const k = clamp(s.p / 12, 0, 1);
      let s2 = '<rect width="720" height="310" fill="#fff"/>';
      s2 += t(36, 30, '卡钳怎么把一脚刹车变成力矩？', 'ttl');
      s2 += t(36, 50, 'p = ' + s.p.toFixed(1) + ' MPa：夹紧力 ' + f(Fc / 1000, 1) + ' kN，单轮制动力矩 ' + f(T, 0) + ' N·m。', 'sm');
      s2 += '<g transform="translate(0 15)">';
      s2 += '<circle cx="235" cy="170" r="92" fill="#eef2f6" stroke="#667085" stroke-width="2"/>';
      s2 += '<circle cx="235" cy="170" r="35" fill="#dbe4ec" stroke="#667085" stroke-width="1.5"/>';
      for (let ang = 0; ang < 360; ang += 30) {
        const r = 63, xx = 235 + r * Math.cos(ang * Math.PI / 180), yy = 170 + r * Math.sin(ang * Math.PI / 180);
        s2 += '<circle cx="' + xx.toFixed(1) + '" cy="' + yy.toFixed(1) + '" r="4" fill="#cbd5e1"/>';
      }
      s2 += box(190, 42, 90, 36, '#344054', '#16202b', 7) + t(235, 65, '卡钳', 'lbl', 'middle', ' style="fill:#fff"');
      s2 += box(196, 80, 32, 16, '#8c6a4f', '#5b4636', 3) + box(242, 80, 32, 16, '#8c6a4f', '#5b4636', 3);
      s2 += arrow(u, 'a', 235, 78, 235, 98, 3 + 2 * k) + t(245, 94, 'p·A', 'val');
      s2 += arrow(u, 'b', 196, 88, 158, 88, 1.8 + 2 * k) + t(146, 82, 'μF', 'val');
      s2 += arrow(u, 'b', 274, 88, 312, 88, 1.8 + 2 * k) + t(318, 82, 'μF', 'val');
      s2 += '<line x1="235" y1="170" x2="235" y2="82" stroke="' + C.amber + '" stroke-width="1.6" stroke-dasharray="4 3"/>' + t(241, 118, 'Re', 'val');
      s2 += '<path d="M267 208 A62 62 0 0 1 203 208" fill="none" stroke="' + C.accent + '" stroke-width="2.4" marker-end="url(#a' + u + ')"/>' + t(235, 232, 'T = ' + f(T, 0) + ' N·m', 'val', 'middle');
      s2 += '</g>';
      s2 += '<rect x="50" y="112" width="18" height="136" rx="6" fill="#eef2f6" stroke="#c8d1dc"/>';
      s2 += '<rect x="52" y="' + (246 - 130 * k) + '" width="14" height="' + (130 * k) + '" rx="5" fill="' + C.accent + '" opacity=".85"/>';
      s2 += t(72, 248, f(s.p, 1) + ' MPa', 'val');
      s2 += t(72, 264, '轮端压力', 'sm');
      s2 += t(398, 104, 'p · A = 夹紧力 F_c', 'sm');
      s2 += t(398, 132, f(s.p, 1) + ' × ' + f(A, 0) + ' mm² = ' + f(Fc / 1000, 1) + ' kN', 'val');
      s2 += t(398, 162, 'T = 2·μ·p·A·Re', 'sm');
      s2 += t(398, 185, '= 2 × ' + ax.mu.toFixed(2) + ' × ' + f(s.p, 1) + ' × ' + f(A, 0) + ' × ' + ax.re.toFixed(0) + ' / 1000', 'val');
      s2 += t(398, 208, '= ' + f(T, 0) + ' N·m', 'val');
      s2 += t(398, 236, '轮端力 2T/r = ' + f(Fw / 1000, 1) + ' kN · 前轴 ' + f(decel, 2) + ' g', 'sm');
      s2 += t(398, 258, '单片单位压力 = ' + f(ppad, 2) + ' MPa', 'sm');
      s2 += '<rect x="398" y="270" width="286" height="20" rx="5" fill="' + C.accentSoft + '" stroke="#efc9b8"/>';
      s2 += t(406, 284, '系数 2 表示内外两片摩擦片；Re 不是盘外径', 'sm');
      s2 += t(36, 304, 'T = 2·μ·p·A·Re = ' + f(T, 0) + ' N·m；F_轮端 = 2T/r = ' + f(Fw / 1000, 1) + ' kN', 'formula');
      return {
        body: s2,
        readout: [['F_c', f(Fc / 1000, 1) + ' kN'], ['T', f(T, 0) + ' N·m'], ['轮端力', f(Fw / 1000, 1) + ' kN'], ['单片 p', f(ppad, 2) + ' MPa']],
        note: '拖动压力滑杆：力矩、夹紧力、轮端力与单位压力同步变化；p 为轮端压力，不是主缸压力。'
      };
    }
  };

  /* ============================================================
     5. pedal / hydraulic
     ============================================================ */
  function pressureFromPedal(Fp, v) {
    if (!(Fp > 0)) return 0;
    let lo = 0, hi = 15;
    for (let i = 0; i < 60; i++) {
      const mid = (lo + hi) / 2;
      if (BT.pedalForceForPressure(mid, v) < Fp) lo = mid; else hi = mid;
    }
    return (lo + hi) / 2;
  }
  REG.pedal = {
    h: 310,
    label: '踏板力与液压交互图',
    init: function () { return { Fp: 80 }; },
    sliders: [{ k: 'Fp', label: '踏板力 F_p', min: 0, max: 350, step: 1, disp: function (v) { return v.toFixed(0) + ' N'; } }],
    draw: function (s, v, u) {
      const p = pressureFromPedal(s.Fp, v);
      const travel = s.Fp > 0 ? BT.pedalTravelAtPressure(p, v) : 0;
      const z = p * BT.derived(v).decelPerMPa;
      const ang = clamp(travel / 110, 0, 1) * 30;
      const k = clamp(p / 12, 0, 1);
      let s2 = '<rect width="720" height="310" fill="#fff"/>';
      s2 += t(36, 30, '为什么有的车“一踩就有”，有的很“虚”？', 'ttl');
      s2 += t(36, 50, 'F_p = ' + s.Fp.toFixed(0) + ' N → p = ' + f(p, 2) + ' MPa → z = ' + f(z, 2) + ' g。', 'sm');
      s2 += '<g transform="rotate(' + ang.toFixed(1) + ' 80 80)">';
      s2 += '<line x1="80" y1="80" x2="58" y2="188" stroke="#344054" stroke-width="7" stroke-linecap="round"/>';
      s2 += '<rect x="44" y="186" width="34" height="12" rx="4" fill="#344054"/>';
      s2 += '</g>';
      s2 += '<circle cx="80" cy="80" r="5" fill="#16202b"/>';
      s2 += arrow(u, 'a', 34, 216, 72, 202, 3) + t(16, 232, 'F_p', 'val');
      s2 += t(96, 200, '踏板 i = ' + v.pedalRatio.toFixed(1), 'sm');
      s2 += '<line x1="80" y1="104" x2="170" y2="104" stroke="#344054" stroke-width="5"/>';
      s2 += '<circle cx="210" cy="104" r="40" fill="' + C.blueSoft + '" stroke="' + C.blue + '" stroke-width="2"/>';
      s2 += t(210, 100, '助力器', 'lbl', 'middle') + t(210, 119, 'BR ' + v.boost.toFixed(1), 'val', 'middle');
      s2 += '<line x1="250" y1="104" x2="280" y2="104" stroke="#344054" stroke-width="5"/>';
      s2 += box(280, 84, 92, 40, '#eef2f6', '#344054', 5);
      s2 += '<rect x="292" y="72" width="9" height="64" fill="#344054"/>';
      s2 += t(338, 106, '主缸', 'lbl', 'middle') + t(338, 126, 'φ ' + v.mcD.toFixed(2), 'val', 'middle');
      s2 += '<path d="M372 100 C410 100 420 66 470 66" fill="none" stroke="' + C.accent + '" stroke-width="2" stroke-dasharray="6 4"/>';
      s2 += '<path d="M372 108 C410 108 420 176 470 176" fill="none" stroke="' + C.blue + '" stroke-width="2" stroke-dasharray="6 4"/>';
      s2 += box(470, 48, 120, 38, 'rgba(200,80,42,' + (0.08 + 0.18 * k) + ')', '#efc9b8', 6) + t(530, 72, '前卡钳', 'lbl', 'middle');
      s2 += box(470, 158, 120, 38, 'rgba(23,101,127,' + (0.08 + 0.18 * k) + ')', '#bfdce5', 6) + t(530, 182, '后卡钳', 'lbl', 'middle');
      s2 += t(470, 138, f(p, 2) + ' MPa', 'val') + t(470, 154, '轮端压力', 'sm');
      s2 += '<line x1="40" y1="120" x2="40" y2="' + (120 + 2.2 * travel) + '" stroke="' + C.amber + '" stroke-width="1.5" marker-start="url(#m' + u + ')" marker-end="url(#m' + u + ')"/>';
      s2 += t(18, 150, 's_p', 'val') + t(46, 252, f(travel, 0) + ' mm', 'val');
      s2 += '<rect x="398" y="216" width="286" height="58" rx="7" fill="#fbfcfd" stroke="#dde3ea"/>';
      s2 += t(410, 236, '推杆力 = i·F_p = ' + f(v.pedalRatio * s.Fp / 1000, 2) + ' kN', 'sm');
      s2 += t(410, 254, 'p = F_rod / A_mc = ' + f(p, 2) + ' MPa；s_p = V/A_mc·i + s₀', 'sm');
      s2 += t(410, 270, '减速度 z = ' + f(z, 2) + ' g', 'val');
      s2 += t(36, 298, 'F_rod = i·F_p·BR（助力段）  p = F_rod/A_mc  s_p = V/A_mc·i + s₀', 'formula');
      return {
        body: s2,
        readout: [['F_p', s.Fp.toFixed(0) + ' N'], ['p', f(p, 2) + ' MPa'], ['s_p', f(travel, 0) + ' mm'], ['z', f(z, 2) + ' g']],
        note: '踏板力经杠杆与助力器放大；主缸越细压力越高、行程越长。助力器折算按当前整车参数。'
      };
    }
  };

  /* ============================================================
     6. thermal
     ============================================================ */
  REG.thermal = {
    h: 320,
    label: '制动盘热容量交互图',
    init: function () { return { v0: 100, stops: 10, interval: 60 }; },
    sliders: [
      { k: 'v0', label: '初速度 v₀', min: 60, max: 200, step: 1, disp: function (v) { return v.toFixed(0) + ' km/h'; } },
      { k: 'stops', label: '制动次数', min: 1, max: 30, step: 1, disp: function (v) { return v.toFixed(0) + ' 次'; } },
      { k: 'interval', label: '间隔时间', min: 10, max: 300, step: 5, disp: function (v) { return v.toFixed(0) + ' s'; } }
    ],
    draw: function (s, v, u) {
      const n = Math.max(1, Math.round(s.stops)), interval = Math.max(1, s.interval), tau = 300, amb = 30;
      const th = BT.thermal({
        mass: v.mass, v0: s.v0 / 3.6, beta: BT.derived(v).beta,
        discMassF: v.front.discMass, discMassR: v.rear.discMass, discShare: 0.86, cp: 500
      });
      let Tf = amb, Tr = amb, peakF = amb, peakR = amb;
      const front = [[0, amb]], rear = [[0, amb]], coolF = [];
      for (let i = 1; i <= n; i++) {
        Tf += th.dTF; Tr += th.dTR;
        peakF = Math.max(peakF, Tf); peakR = Math.max(peakR, Tr);
        front.push([i, Tf]); rear.push([i, Tr]);
        Tf = amb + (Tf - amb) * Math.exp(-interval / tau);
        Tr = amb + (Tr - amb) * Math.exp(-interval / tau);
        coolF.push([i, Tf]);
      }
      const x0 = 392, x1 = 674, y0 = 254, y1 = 92;
      const topT = Math.max(700, peakF * 1.12);
      const X = function (i) { return x0 + (x1 - x0) * i / n; };
      const Y = function (T) { return y0 - (y0 - y1) * clamp(T / topT, 0, 1); };
      let s2 = '<rect width="720" height="320" fill="#fff"/>';
      s2 += t(36, 30, '刹车盘为什么会红？', 'ttl');
      s2 += t(36, 50, '单次温升 ΔT = ' + f(th.dTF, 1) + ' °C；' + n + ' 次后前盘峰值 ' + f(peakF, 0) + ' °C。', 'sm');
      function disc(cx, cy, r, T) {
        const k = clamp((T - amb) / 620, 0, 1);
        let o = '<circle cx="' + cx + '" cy="' + cy + '" r="' + (r + 10) + '" fill="' + heatFill(T) + '" opacity="' + (0.12 + 0.55 * k) + '"/>';
        o += '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="' + heatFill(T) + '" stroke="#8c4a2f" stroke-width="2"/>';
        o += '<circle cx="' + cx + '" cy="' + cy + '" r="' + (r * .36) + '" fill="#f3e3d6" stroke="#8c4a2f" stroke-width="1.4"/>';
        for (let a = 0; a < 360; a += 45) {
          const rr = r * .68, xx = cx + rr * Math.cos(a * Math.PI / 180), yy = cy + rr * Math.sin(a * Math.PI / 180);
          o += '<circle cx="' + xx.toFixed(1) + '" cy="' + yy.toFixed(1) + '" r="' + (r * .07).toFixed(1) + '" fill="#fbe9dc" opacity=".85"/>';
        }
        return o;
      }
      s2 += disc(140, 160, 66, peakF) + t(140, 246, '前盘 ' + f(peakF, 0) + ' °C', 'val', 'middle');
      s2 += disc(292, 174, 48, peakR) + t(292, 246, '后盘 ' + f(peakR, 0) + ' °C', 'val', 'middle');
      s2 += '<path d="M96 82 C108 62 118 62 130 82" fill="none" stroke="' + C.accent + '" stroke-width="2" opacity=".55"/>';
      s2 += '<path d="M126 76 C138 56 148 56 160 76" fill="none" stroke="' + C.accent + '" stroke-width="2" opacity=".4"/>';
      s2 += arrow(u, 'b', 140, 96, 140, 72, 1.6) + t(148, 90, '对流', 'sm');
      s2 += '<line x1="' + x0 + '" y1="' + y0 + '" x2="' + x1 + '" y2="' + y0 + '" class="axis"/>';
      s2 += '<line x1="' + x0 + '" y1="' + y0 + '" x2="' + x0 + '" y2="' + y1 + '" class="axis"/>';
      for (let q = 0; q <= 4; q++) {
        const tv = topT * q / 4;
        s2 += '<line x1="' + x0 + '" y1="' + Y(tv) + '" x2="' + x1 + '" y2="' + Y(tv) + '" class="grid"/>';
        s2 += t(x0 - 6, Y(tv) + 3, tv.toFixed(0), 'tick', 'end');
      }
      function line(data, color, wdt, dash) {
        return '<path d="' + data.map(function (p, i) { return (i ? 'L' : 'M') + X(p[0]).toFixed(1) + ' ' + Y(p[1]).toFixed(1); }).join(' ') + '" fill="none" stroke="' + color + '" stroke-width="' + wdt + '"' + (dash ? ' stroke-dasharray="' + dash + '"' : '') + '/>';
      }
      s2 += line(front, C.accent, 2.3) + line(rear, C.blue, 1.8) + line(coolF, C.accent, 1.1, '3 4');
      s2 += t(x0 + 4, y1 - 6, '前盘峰值', 'sm', 'start', ' style="fill:#c8502a"');
      s2 += t(x0 + 86, y1 - 6, '后盘峰值', 'sm', 'start', ' style="fill:#17657f"');
      for (let q = 1; q <= 4; q++) {
        const ii = Math.round(n * q / 4);
        s2 += t(X(ii), y0 + 15, ii.toFixed(0), 'tick', 'middle');
      }
      s2 += t((x0 + x1) / 2, 282, '制动次数', 'sm', 'middle');
      s2 += t(386, 112, '°C', 'sm', 'end');
      s2 += '<line x1="' + x0 + '" y1="' + y0 + '" x2="' + x1 + '" y2="' + y0 + '" class="axis"/>';
      s2 += t(36, 308, 'E = ½mv² = ' + f(th.energy / 1000, 0) + ' kJ；前盘 ΔT = E·β·η/(2m_d·c_p) = ' + f(th.dTF, 1) + ' °C', 'formula');
      return {
        body: s2,
        readout: [['单次 ΔT', f(th.dTF, 1) + ' °C'], ['前盘峰值', f(peakF, 0) + ' °C'], ['后盘峰值', f(peakR, 0) + ' °C'], ['整车能量', f(th.energy / 1000, 0) + ' kJ']],
        note: '拖动次数/间隔：峰值由集总热容 + 指数冷却逐步累积（τ = 300 s 工程假设）；单次温升不等于连续山路峰值。'
      };
    }
  };

  /* ============================================================
     7. friction pair
     ============================================================ */
  function muAtTemp(mu0, T) {
    const k = clamp((T - 120) / 360, 0, 1);
    return mu0 * (1 - 0.18 * k * k * (3 - 2 * k));
  }
  REG.friction = {
    h: 310,
    label: '摩擦副压力与面能量交互图',
    init: function (v) { return { v0: 100, Fc: 7 * BT.areaCaliper(v.front) / 1000 }; },
    sliders: [
      { k: 'v0', label: '初速度 v₀', min: 40, max: 180, step: 1, disp: function (v) { return v.toFixed(0) + ' km/h'; } },
      { k: 'Fc', label: '夹紧力 F_c', min: 5, max: 40, step: 0.5, disp: function (v) { return v.toFixed(1) + ' kN'; } }
    ],
    draw: function (s, v, u) {
      const ax = v.front, A_pad = ax.padArea * 100;
      const Fc = s.Fc * 1000, ppad = Fc / A_pad;
      const E = BT.kineticEnergy(v.mass, s.v0 / 3.6);
      const ePad = E * BT.derived(v).beta / 2 / (2 * A_pad);
      const th = BT.thermal({ mass: v.mass, v0: s.v0 / 3.6, beta: BT.derived(v).beta, discMassF: v.front.discMass, discMassR: v.rear.discMass, discShare: .86, cp: 500 });
      const temp = 30 + th.dTF;
      const hotMu = muAtTemp(ax.mu, temp);
      let s2 = '<rect width="720" height="310" fill="#fff"/>';
      s2 += t(36, 30, '摩擦片为什么不是一块“橡皮”？', 'ttl');
      s2 += t(36, 50, 'p_pad = ' + f(ppad, 2) + ' MPa；单片 e = ' + f(ePad, 1) + ' J/mm²；μ(T) = ' + hotMu.toFixed(3) + '。', 'sm');
      s2 += '<rect x="56" y="196" width="310" height="18" fill="#cbd5e1" stroke="#667085"/>';
      s2 += '<path d="' + (function () {
        let d = 'M56 196';
        for (let x = 64; x <= 366; x += 8) d += ' L' + x + ' ' + (x % 16 === 0 ? 186 : 196);
        return d;
      })() + '" fill="none" stroke="#8c6a4f" stroke-width="1.2"/>';
      s2 += '<rect x="96" y="112" width="196" height="70" rx="4" fill="#5b4636" stroke="#3d2f25"/>';
      s2 += t(194, 152, '摩擦片 ' + f(ax.padArea, 0) + ' cm²', 'lbl', 'middle', ' style="fill:#fff"');
      const nArrow = clamp(Math.round(1 + 7 * s.Fc / 40), 1, 8);
      for (let i = 0; i < nArrow; i++) {
        const xx = 120 + i * (150 / Math.max(1, nArrow - 1));
        s2 += arrow(u, 'a', xx, 84, xx, 108, 1 + 1.8 * s.Fc / 40);
      }
      s2 += t(194, 72, '夹紧力 ' + f(s.Fc, 1) + ' kN', 'val', 'middle');
      s2 += '<circle cx="306" cy="224" r="3" fill="#a86412"/><circle cx="326" cy="230" r="2" fill="#a86412"/><circle cx="344" cy="222" r="2.4" fill="#a86412"/>';
      s2 += t(300, 248, '磨屑', 'sm');
      s2 += '<rect x="412" y="88" width="270" height="158" rx="8" fill="#fbfcfd" stroke="#dde3ea"/>';
      const gx0 = 440, gx1 = 662, gy0 = 226, gy1 = 106;
      s2 += '<line x1="' + gx0 + '" y1="' + gy0 + '" x2="' + gx1 + '" y2="' + gy0 + '" class="axis"/><line x1="' + gx0 + '" y1="' + gy0 + '" x2="' + gx0 + '" y2="' + gy1 + '" class="axis"/>';
      let curve = '';
      for (let T = 20; T <= 650; T += 10) {
        const yy = gy0 - (gy0 - gy1) * clamp(muAtTemp(ax.mu, T) / Math.max(0.2, ax.mu), 0, 1);
        curve += (T === 20 ? 'M' : 'L') + (gx0 + (gx1 - gx0) * T / 650).toFixed(1) + ' ' + yy.toFixed(1) + ' ';
      }
      s2 += '<path d="' + curve + '" fill="none" stroke="' + C.accent + '" stroke-width="2.2"/>';
      s2 += '<circle cx="' + (gx0 + (gx1 - gx0) * clamp(temp / 650, 0, 1)) + '" cy="' + (gy0 - (gy0 - gy1) * clamp(hotMu / Math.max(0.2, ax.mu), 0, 1)) + '" r="5" fill="' + C.blue + '"/>';
      s2 += t(clamp(gx0 + (gx1 - gx0) * clamp(temp / 650, 0, 1) + 8, gx0, gx1 - 70), gy1 + 20, '当前 ' + f(temp, 0) + ' °C', 'sm');
      for (let Tt = 0; Tt <= 600; Tt += 150) {
        s2 += t(gx0 + (gx1 - gx0) * Tt / 650, 240, Tt.toFixed(0), 'tick', 'middle');
      }
      [0.7, 0.85, 1.0].forEach(function (rr) {
        s2 += '<line x1="' + gx0 + '" y1="' + (gy0 - (gy0 - gy1) * rr) + '" x2="' + gx1 + '" y2="' + (gy0 - (gy0 - gy1) * rr) + '" class="grid"/>';
        s2 += t(gx0 - 6, gy0 - (gy0 - gy1) * rr + 3, rr.toFixed(2), 'tick', 'end');
      });
      s2 += t((gx0 + gx1) / 2, 256, '温度（°C）', 'sm', 'middle');
      s2 += t(424, 82, 'μ/μ₀', 'sm', 'middle');
      s2 += t(412, 274, 'μ(T) 为工程拟合：μ₀·[1 − 0.18·smoothstep(120…480 °C)]', 'sm');
      s2 += t(36, 286, 'p_pad = F_c / A_pad = ' + f(ppad, 2) + ' MPa；e = (½mv²·β/2)/(2·A_pad) = ' + f(ePad, 1) + ' J/mm²', 'formula');
      return {
        body: s2,
        readout: [['p_pad', f(ppad, 2) + ' MPa'], ['单片 e', f(ePad, 1) + ' J/mm²'], ['盘温', f(temp, 0) + ' °C'], ['当前 μ', hotMu.toFixed(3)], ['μ@400°C', muAtTemp(ax.mu, 400).toFixed(3)]],
        note: '单位压力与面能量按公式严格计算；μ(T) 曲线是单点热衰退的工程拟合，不能替代台架试验。'
      };
    }
  };

  /* ============================================================
     8. parking / EPB
     ============================================================ */
  REG.parking = {
    h: 310,
    label: '坡道驻车交互图',
    init: function () { return { grade: 20 }; },
    sliders: [{ k: 'grade', label: '坡度', min: 0, max: 45, step: 1, disp: function (v) { return v.toFixed(0) + '% · ' + (Math.atan(v / 100) * 180 / Math.PI).toFixed(1) + '°'; } }],
    draw: function (s, v, u) {
      const grader = clamp(s.grade, 0, 45);
      const theta = Math.atan(grader / 100);
      const SF = 1.2, mu = 0.38, lead = 2, ratio = 20, eff = 0.35;
      const F = v.mass * G * Math.sin(theta) * SF;
      const perWheel = F / 2;
      const Fc = perWheel * (v.wheelR / 1000) / (2 * mu * (v.rear.re / 1000));
      const Tm = Fc * (lead / 1000) / (2 * Math.PI * eff * ratio);
      const deg = theta * 180 / Math.PI;
      const roadX0 = 160, roadX1 = 540, baseY = 246;
      const rise = (roadX1 - roadX0) * Math.tan(theta);
      const roadY1 = baseY - rise;
      let s2 = '<rect width="720" height="310" fill="#fff"/>';
      s2 += t(36, 30, '坡道上，EPB 要夹多紧？', 'ttl');
      s2 += t(36, 50, grader.toFixed(0) + '% 坡道 = ' + f(deg, 1) + '°：整车保持力 ' + f(F / 1000, 1) + ' kN。', 'sm');
      s2 += '<path d="M' + roadX0 + ' ' + baseY + ' L' + roadX1 + ' ' + roadY1 + ' L' + roadX1 + ' ' + baseY + ' Z" fill="#eef2f6" stroke="#667085" stroke-width="1.5"/>';
      s2 += '<line x1="' + roadX0 + '" y1="' + baseY + '" x2="' + (roadX0 + 74) + '" y2="' + baseY + '" stroke="#667085" stroke-width="1.5"/>';
      s2 += '<path d="M' + (roadX0 + 58) + ' ' + baseY + ' A58 58 0 0 0 ' + (roadX0 + 54) + ' ' + (baseY - 12) + '" fill="none" stroke="' + C.accent + '" stroke-width="2"/>';
      s2 += t(roadX0 + 66, baseY - 4, 'θ', 'val');
      const carY = baseY - (300 - roadX0) * Math.tan(theta) - 16;
      s2 += '<g transform="translate(270 ' + carY.toFixed(1) + ') rotate(' + (-deg).toFixed(1) + ')">' + car(0, 0, .82) + '</g>';
      const cgx = 333, cgy = carY - 6;
      s2 += '<circle cx="' + cgx + '" cy="' + cgy + '" r="5" fill="' + C.ink + '"/>';
      const Lg = 64;
      s2 += arrow(u, 'k', cgx, cgy, cgx, cgy + Lg, 2.4) + t(cgx + 8, cgy + Lg - 4, 'mg', 'val');
      s2 += arrow(u, 'a', cgx, cgy, cgx - Lg * Math.cos(theta), cgy + Lg * Math.sin(theta), 2) + t(cgx - 62, cgy + 20, 'mg·sinθ', 'sm');
      s2 += arrow(u, 'g', cgx, cgy, cgx - Lg * Math.sin(theta) * 0.8, cgy - Lg * Math.cos(theta) * 0.8, 1.8, '4 3') + t(cgx - 72, cgy - 44, 'mg·cosθ', 'sm');
      s2 += '<circle cx="468" cy="184" r="23" fill="#16202b"/><circle cx="468" cy="184" r="9" fill="#667085"/>';
      s2 += arrow(u, 'a', 468, 206, 468, 238, 2.4) + t(478, 230, 'F_c ' + f(Fc / 1000, 1) + ' kN', 'val');
      s2 += t(454, 92, '后轮单侧', 'sm') + t(454, 108, f(Fc / 1000, 1) + ' kN', 'val');
      s2 += '<rect x="36" y="252" width="330" height="20" rx="5" fill="#fbfcfd" stroke="#dde3ea"/>';
      s2 += t(44, 266, 'F = mg·sinθ·SF = ' + f(F / 1000, 1) + ' kN；后轮单侧 ' + f(perWheel / 1000, 1) + ' kN', 'sm');
      s2 += t(36, 298, 'F_c = F·r/(4μRe) = ' + f(Fc / 1000, 1) + ' kN；T_m = F_c·L/(2πη·i) = ' + f(Tm, 2) + ' N·m', 'formula');
      return {
        body: s2,
        readout: [['θ', f(deg, 1) + '°'], ['保持力', f(F / 1000, 1) + ' kN'], ['单轮夹紧力', f(Fc / 1000, 1) + ' kN'], ['EPB 扭矩', f(Tm, 2) + ' N·m']],
        note: '坡度按 tanθ = 百分比/100 计算；夹紧力与电机扭矩按后卡钳参数反算，未计丝杠自锁与温度影响。'
      };
    }
  };

  /* ============================================================
     9. matching map
     ============================================================ */
  REG.matching = {
    h: 320,
    label: '制动系统匹配交互图',
    init: function (v) { return { mcD: v.mcD, pD: v.front.pistonD }; },
    sliders: [
      { k: 'mcD', label: '主缸直径', min: 22, max: 32, step: 0.01, disp: function (v) { return 'φ' + v.toFixed(2) + ' mm'; } },
      { k: 'pD', label: '前活塞直径', min: 50, max: 70, step: 1, disp: function (v) { return 'φ' + v.toFixed(0) + ' mm'; } }
    ],
    draw: function (s, v, u) {
      function evaluate(vv) {
        const d = BT.derived(vv);
        const p05 = BT.pressureForDecel(0.5, vv);
        return { d: d, F05: BT.pedalForceForPressure(p05, vv), T05: BT.pedalTravelAtPressure(p05, vv), maxD: d.decelPerMPa * vv.maxPressure };
      }
      const cur = evaluate((function () {
        const vv = BT.deepClone(v); vv.mcD = s.mcD; vv.front.pistonD = s.pD; return vv;
      })());
      const x0 = 96, x1 = 520, y0 = 264, y1 = 82;
      const xd = [0.65, 1.15], yd = [30, 160];
      const X = function (x) { return x0 + (x1 - x0) * clamp((x - xd[0]) / (xd[1] - xd[0]), 0, 1); };
      const Y = function (y) { return y0 - (y0 - y1) * clamp((y - yd[0]) / (yd[1] - yd[0]), 0, 1); };
      let s2 = '<rect width="720" height="320" fill="#fff"/>';
      s2 += t(36, 30, '为什么同一个卡钳，换个主缸脚感就变了？', 'ttl');
      s2 += t(36, 50, '主缸与活塞直径改变踏板力/行程；β 由前后制动器决定，不会因主缸而变。', 'sm');
      s2 += '<rect x="' + x0 + '" y="' + y1 + '" width="' + (x1 - x0) + '" height="' + (y0 - y1) + '" fill="#fbfcfd" stroke="#dde3ea" rx="8"/>';
      s2 += '<line x1="' + x0 + '" y1="' + y0 + '" x2="' + x1 + '" y2="' + y0 + '" class="axis"/><line x1="' + x0 + '" y1="' + y0 + '" x2="' + x0 + '" y2="' + y1 + '" class="axis"/>';
      s2 += '<rect x="' + X(0.9) + '" y="' + Y(95) + '" width="' + (X(1.0) - X(0.9)) + '" height="' + (Y(65) - Y(95)) + '" fill="' + C.greenSoft + '" stroke="' + C.green + '" stroke-dasharray="4 4"/>';
      s2 += t(X(0.95), Y(95) - 6, '目标区间', 'sm', 'middle');
      const MC = [22.22, 23.81, 25.4, 26.99, 28.58, 30.16];
      const PD = [50, 54, 57, 60, 63, 66, 70];
      MC.forEach(function (mc) {
        PD.forEach(function (pd) {
          const vv = BT.deepClone(v); vv.mcD = mc; vv.front.pistonD = pd;
          const e = evaluate(vv);
          if (e.d.phi0 < xd[0] || e.d.phi0 > xd[1] || e.F05 < yd[0] || e.F05 > yd[1]) return;
          s2 += '<circle cx="' + X(e.d.phi0) + '" cy="' + Y(e.F05) + '" r="2.6" fill="#b8c2cd" opacity=".75"/>';
        });
      });
      s2 += '<circle cx="' + X(cur.d.phi0) + '" cy="' + Y(cur.F05) + '" r="8" fill="transparent" stroke="' + C.accent + '" stroke-width="1.4" opacity=".5"/>';
      s2 += '<circle cx="' + X(cur.d.phi0) + '" cy="' + Y(cur.F05) + '" r="6" fill="' + C.accent + '"/>';
      s2 += t(clamp(X(cur.d.phi0) + 10, 110, 450), Y(cur.F05) - 10, 'φ₀ ' + cur.d.phi0.toFixed(2) + ' · ' + f(cur.F05, 0) + ' N', 'val');
      for (let q = 0; q <= 4; q++) {
        const xv = xd[0] + (xd[1] - xd[0]) * q / 4, yv = yd[0] + (yd[1] - yd[0]) * q / 4;
        s2 += t(X(xv), y0 + 15, xv.toFixed(2), 'tick', 'middle');
        s2 += t(x0 - 8, Y(yv) + 3, yv.toFixed(0), 'tick', 'end');
      }
      s2 += t((x0 + x1) / 2, 296, '同步附着系数 φ₀', 'sm', 'middle');
      s2 += t(28, 176, '0.5g 踏板力（N）', 'sm', 'middle', ' transform="rotate(-90 28 176)"');
      s2 += '<rect x="540" y="96" width="150" height="132" rx="8" fill="#fff" stroke="#e2e8f0"/>';
      s2 += t(552, 116, '当前组合', 'val');
      s2 += t(552, 138, 'φ₀ ' + cur.d.phi0.toFixed(3), 'sm');
      s2 += t(552, 156, 'F₀.₅g ' + f(cur.F05, 0) + ' N', 'sm');
      s2 += t(552, 174, '行程 ' + f(cur.T05, 0) + ' mm', 'sm');
      s2 += t(552, 192, '最大 ' + f(cur.maxD, 2) + ' g', 'sm');
      s2 += t(552, 212, '主缸 φ' + s.mcD.toFixed(2), 'sm');
      s2 += t(36, 308, 'φ₀ = (β − sf)·L/h = ' + cur.d.phi0.toFixed(3) + '；p₀.₅ = ' + f(BT.pressureForDecel(0.5, v), 2) + ' MPa', 'formula');
      return {
        body: s2,
        readout: [['φ₀', cur.d.phi0.toFixed(3)], ['β', cur.d.beta.toFixed(3)], ['0.5g 踏板力', f(cur.F05, 0) + ' N'], ['0.5g 行程', f(cur.T05, 0) + ' mm'], ['最大减速度', f(cur.maxD, 2) + ' g']],
        note: '灰点为示例目录中的主缸/活塞组合；拖动滑杆改变当前组合，目标区间与点一起移动。'
      };
    }
  };

  /* ============================================================
     10. sensitivity tornado
     ============================================================ */
  REG.sensitivity = {
    h: 300,
    label: '参数灵敏度交互龙卷风图',
    init: function () { return { v0: 100, mu: 0.9 }; },
    sliders: [
      { k: 'v0', label: '基准初速度', min: 50, max: 160, step: 1, disp: function (v) { return v.toFixed(0) + ' km/h'; } },
      { k: 'mu', label: '基准附着 μ', min: 0.4, max: 1.1, step: 0.01, disp: function (v) { return v.toFixed(2); } }
    ],
    draw: function (s, v, u) {
      function dist(o) {
        return BT.stoppingDistance({ v0: (o.v0 || s.v0) / 3.6, tr: o.tr === undefined ? 0.35 : o.tr, tb: o.tb === undefined ? 0.2 : o.tb, a: (o.mu || s.mu) * G * 0.95 }).total;
      }
      const base = dist({});
      const items = [
        { name: '初速度', lo: dist({ v0: s.v0 * 0.9 }), hi: dist({ v0: s.v0 * 1.1 }) },
        { name: '附着系数', lo: dist({ mu: s.mu * 0.9 }), hi: dist({ mu: s.mu * 1.1 }) },
        { name: '反应时间', lo: dist({ tr: 0.315 }), hi: dist({ tr: 0.385 }) },
        { name: '建压时间', lo: dist({ tb: 0.18 }), hi: dist({ tb: 0.22 }) }
      ];
      items.forEach(function (it) { it.dLo = it.lo - base; it.dHi = it.hi - base; });
      const maxAbs = Math.max.apply(null, items.map(function (it) { return Math.max(Math.abs(it.dLo), Math.abs(it.dHi)); }).concat([1]));
      const cx = 420, scale = 145 / maxAbs;
      let s2 = '<rect width="720" height="300" fill="#fff"/>';
      s2 += t(36, 30, '哪个参数最值得先控制？', 'ttl');
      s2 += t(36, 50, '每个参数只动 ±10%，其他不变；条形越长越敏感（基准 ' + f(base, 1) + ' m）。', 'sm');
      s2 += '<line x1="' + cx + '" y1="66" x2="' + cx + '" y2="236" stroke="#cbd5e1" stroke-dasharray="4 4"/>';
      items.forEach(function (it, i) {
        const y = 86 + i * 36;
        s2 += '<line x1="' + (cx - Math.abs(it.dLo) * scale) + '" y1="' + y + '" x2="' + (cx + Math.abs(it.dHi) * scale) + '" y2="' + y + '" stroke="#e2e8f0" stroke-width="1"/>';
        s2 += t(292, y + 4, it.name, 'lbl', 'end');
        s2 += '<rect x="' + (cx - Math.abs(it.dLo) * scale) + '" y="' + (y - 8) + '" width="' + Math.max(1, Math.abs(it.dLo) * scale) + '" height="16" rx="3" fill="' + C.blue + '" opacity=".85"/>';
        s2 += '<rect x="' + cx + '" y="' + (y - 8) + '" width="' + Math.max(1, Math.abs(it.dHi) * scale) + '" height="16" rx="3" fill="' + C.accent + '" opacity=".85"/>';
        s2 += t(cx - Math.abs(it.dLo) * scale - 6, y + 4, f(it.dLo, 1), 'tick', 'end');
        s2 += t(cx + Math.abs(it.dHi) * scale + 6, y + 4, '+' + f(it.dHi, 1), 'tick');
      });
      s2 += t(cx - 150, 252, '−10%', 'sm', 'middle') + t(cx + 145, 252, '+10%', 'sm', 'middle');
      const strongest = items.slice().sort(function (a, b) { return Math.max(Math.abs(b.dLo), Math.abs(b.dHi)) - Math.max(Math.abs(a.dLo), Math.abs(a.dHi)); })[0];
      s2 += t(36, 274, '当前最敏感：' + strongest.name + '（±' + f(Math.max(Math.abs(strongest.dLo), Math.abs(strongest.dHi)), 1) + ' m）', 'val');
      s2 += t(36, 292, '总距离 s(±10%) − s₀；基准：v₀ ' + s.v0.toFixed(0) + ' km/h，μ ' + s.mu.toFixed(2) + '，tᵣ 0.35 s，t_b 0.20 s', 'formula');
      return {
        body: s2,
        readout: [['基准距离', f(base, 1) + ' m'], ['最敏感', strongest.name], ['Δmax', f(Math.max(Math.abs(strongest.dLo), Math.abs(strongest.dHi)), 1) + ' m']],
        note: '灵敏度由三段制动距离公式逐项扰动得到，不是示意条形；改变基准初速度或附着后排序可能变化。'
      };
    }
  };

  /* ============================================================
     11. standards chain
     ============================================================ */
  REG.standards = {
    h: 330,
    label: '标准、试验与计算值关系交互图',
    init: function () { return { focus: 'calc' }; },
    tabs: [
      { k: 'focus', val: 'calc', label: '计算值' },
      { k: 'focus', val: 'test', label: '实测数据' },
      { k: 'focus', val: 'rule', label: '法规判定' }
    ],
    draw: function (s, v, u) {
      const act = s.focus;
      function op(key) { return act === key ? 1 : 0.42; }
      let s2 = '<rect width="720" height="330" fill="#fff"/>';
      s2 += t(36, 30, '计算值、试验值、法规结论，不是一回事', 'ttl');
      s2 += t(36, 50, '模型给趋势，实测给证据，法规给判定；缺数据只能写“未评估”。', 'sm');
      s2 += '<g opacity="' + (act === 'rule' ? 1 : .8) + '">';
      s2 += box(40, 72, 196, 50, C.blueSoft, '#bfdce5', 8) + t(138, 94, 'GB 21670-2025', 'val', 'middle') + t(138, 111, '中国乘用车制动', 'sm', 'middle');
      s2 += box(252, 72, 196, 50, C.amberSoft, '#efd7a9', 8) + t(350, 94, 'GB 7258-2017', 'val', 'middle') + t(350, 111, '道路运行安全', 'sm', 'middle');
      s2 += box(464, 72, 196, 50, C.greenSoft, '#c6e6d8', 8) + t(562, 94, 'UN R13-H', 'val', 'middle') + t(562, 111, 'M1 / N1 出口', 'sm', 'middle');
      s2 += '</g>';
      [[138, 126, 250, 158], [350, 126, 350, 158], [562, 126, 450, 158]].forEach(function (p) {
        s2 += arrow(u, 'm', p[0], p[1], p[2], p[3], 1.6, '5 4');
      });
      s2 += '<g opacity="' + op('rule') + '">' + box(200, 158, 300, 44, act === 'rule' ? '#eef8f3' : '#fbfcfd', act === 'rule' ? C.green : '#c8d1dc', 8);
      s2 += t(350, 176, '条款矩阵 / 适用条件 / 判据 / 容差', 'sm', 'middle') + t(350, 192, '每条规则有 ID 和证据', 'sm', 'middle') + '</g>';
      s2 += '<g opacity="' + (act === 'test' ? 1 : .55) + '">' + box(60, 238, 150, 46, act === 'test' ? C.greenSoft : '#fbfcfd', act === 'test' ? C.green : '#c8d1dc', 8);
      s2 += t(135, 258, '实测数据', 'lbl', 'middle') + t(135, 274, '规定工况', 'sm', 'middle') + '</g>';
      s2 += arrow(u, 'g', 214, 261, 260, 261, 2);
      s2 += '<g opacity="' + op('rule') + '">' + box(264, 238, 150, 46, '#fbfcfd', '#c8d1dc', 8);
      s2 += t(339, 258, '规则引擎', 'lbl', 'middle') + t(339, 274, '通过/不通过/未评估', 'sm', 'middle') + '</g>';
      s2 += arrow(u, 'g', 418, 261, 464, 261, 2);
      s2 += box(468, 232, 64, 26, C.greenSoft, '#c6e6d8', 6) + t(500, 249, '通过', 'sm', 'middle');
      s2 += box(468, 264, 64, 26, '#fdecea', '#f2c3bf', 6) + t(500, 281, '不通过', 'sm', 'middle');
      s2 += box(540, 232, 76, 26, '#f3f6f9', '#c8d1dc', 6) + t(578, 249, '未评估', 'sm', 'middle');
      s2 += '<g opacity="' + (act === 'calc' ? 1 : .5) + '">' + box(540, 264, 76, 26, act === 'calc' ? C.blueSoft : '#f3f6f9', act === 'calc' ? C.blue : '#c8d1dc', 6);
      s2 += t(578, 281, '计算值', 'sm', 'middle') + '</g>';
      s2 += '<path d="M578 236 C620 190 620 150 590 120" fill="none" stroke="' + C.bad + '" stroke-width="1.6" stroke-dasharray="5 4" marker-end="url(#a' + u + ')"/>';
      s2 += t(600, 140, '≠ 合规结论', 'sm');
      const msg = act === 'calc'
        ? '计算值只能写“预估”：模型不含悬架、轮胎非线性、ABS 滑移与空气升力。'
        : act === 'test'
          ? '实测值必须带工况：载荷、初速、路面 μ、温度、踏板力、时间同步。'
          : '法规判定只对“规定工况 + 实测证据 + 条款容差”给出通过/不通过；缺数据只能未评估。';
      s2 += '<rect x="36" y="292" width="648" height="28" rx="6" fill="#fbfcfd" stroke="#dde3ea"/>' + t(46, 310, msg, 'sm');
      return { body: s2, readout: [['当前视角', act === 'calc' ? '计算值' : act === 'test' ? '实测数据' : '法规判定']], note: '点击下方标签切换视角，高亮对应的证据链节点。' };
    }
  };

  /* ============================================================
     12. condition map with computed iso-distance contours
     ============================================================ */
  REG.conditionMap = {
    h: 330,
    label: '制动工况地图交互图',
    init: function () { return { v: 100, mu: 0.9 }; },
    sliders: [
      { k: 'v', label: '车速 v', min: 10, max: 200, step: 1, disp: function (v) { return v.toFixed(0) + ' km/h'; } },
      { k: 'mu', label: '路面附着 μ', min: 0.1, max: 1.0, step: 0.01, disp: function (v) { return v.toFixed(2); } }
    ],
    drag: function (st, key, p) {
      st.v = clamp(10 + (p.x - 90) / (640 - 90) * 190, 10, 200);
      st.mu = clamp(0.1 + (270 - p.y) / (270 - 75) * 0.9, 0.1, 1.0);
    },
    draw: function (s, v, u) {
      const x0 = 90, x1 = 640, y0 = 270, y1 = 75;
      const X = function (sp) { return x0 + (x1 - x0) * sp / 200; };
      const Y = function (mu) { return y0 - (y0 - y1) * (mu - 0.1) / 0.9; };
      function distAt(sp, mu) {
        return BT.stoppingDistance({ v0: sp / 3.6, tr: 0.35, tb: 0.2, a: mu * G * 0.95 }).total;
      }
      let s2 = '<rect width="720" height="330" fill="#fff"/>';
      s2 += t(36, 30, '同样一脚刹车，不同工况完全不是一回事', 'ttl');
      s2 += t(36, 50, '等距离线由三段模型计算；拖动橙色点读取任意车速/附着组合。', 'sm');
      s2 += '<rect x="' + x0 + '" y="' + Y(0.4) + '" width="' + (x1 - x0) + '" height="' + (Y(0.1) - Y(0.4)) + '" fill="#fdf0ea"/>';
      s2 += '<rect x="' + x0 + '" y="' + Y(0.7) + '" width="' + (x1 - x0) + '" height="' + (Y(0.4) - Y(0.7)) + '" fill="#eaf4f7"/>';
      s2 += '<rect x="' + x0 + '" y="' + Y(1.0) + '" width="' + (x1 - x0) + '" height="' + (Y(0.7) - Y(1.0)) + '" fill="#f3f6f9"/>';
      for (let mu = 0.2; mu <= 1.001; mu += 0.2) {
        s2 += '<line x1="' + x0 + '" y1="' + Y(mu) + '" x2="' + x1 + '" y2="' + Y(mu) + '" class="grid"/>' + t(x0 - 8, Y(mu) + 3, mu.toFixed(1), 'tick', 'end');
      }
      for (let sp = 0; sp <= 200; sp += 40) {
        s2 += '<line x1="' + X(sp) + '" y1="' + y1 + '" x2="' + X(sp) + '" y2="' + y0 + '" class="grid"/>' + t(X(sp), y0 + 16, sp.toFixed(0), 'tick', 'middle');
      }
      s2 += '<line x1="' + x0 + '" y1="' + y0 + '" x2="' + x1 + '" y2="' + y0 + '" class="axis"/>';
      s2 += '<line x1="' + x0 + '" y1="' + y0 + '" x2="' + x0 + '" y2="' + y1 + '" class="axis"/>';
      s2 += t(110, 118, '低附 / 冰雪', 'val') + t(260, 146, '湿滑', 'val') + t(455, 118, '干路', 'val');
      s2 += t(560, 136, '高速 + 热负荷', 'val', 'end');
      const levels = [20, 40, 60, 80, 100, 140, 180];
      levels.forEach(function (lev, li) {
        let path = '', lp = null;
        const labelMu = [0.3, 0.5, 0.7][li % 3];
        for (let mu = 0.12; mu <= 1.001; mu += 0.04) {
          let lo = 5, hi = 240;
          if (distAt(hi, mu) < lev) continue;
          for (let i = 0; i < 24; i++) {
            const mid = (lo + hi) / 2;
            if (distAt(mid, mu) < lev) lo = mid; else hi = mid;
          }
          const sp = (lo + hi) / 2;
          if (sp < 6 || sp > 200) continue;
          path += (path ? 'L' : 'M') + X(sp).toFixed(1) + ' ' + Y(mu).toFixed(1) + ' ';
          if (Math.abs(mu - labelMu) < 0.021) lp = { x: X(sp), y: Y(mu) };
        }
        if (path) {
          s2 += '<path d="' + path + '" fill="none" stroke="#ffffff" stroke-width="4" opacity=".8"/>';
          s2 += '<path d="' + path + '" fill="none" stroke="#8492a3" stroke-width="1.2" opacity=".85"/>';
          if (lp) s2 += t(lp.x > 580 ? lp.x - 4 : lp.x + 4, lp.y - 4, lev + ' m', 'tick', lp.x > 580 ? 'end' : 'start');
        }
      });
      const sp = s.v, mu = s.mu;
      const dist = distAt(sp, mu);
      s2 += '<line x1="' + X(sp) + '" y1="' + y1 + '" x2="' + X(sp) + '" y2="' + y0 + '" stroke="' + C.accent + '" stroke-width="1" stroke-dasharray="4 3"/>';
      s2 += '<line x1="' + x0 + '" y1="' + Y(mu) + '" x2="' + x1 + '" y2="' + Y(mu) + '" stroke="' + C.accent + '" stroke-width="1" stroke-dasharray="4 3"/>';
      s2 += '<circle cx="' + X(sp) + '" cy="' + Y(mu) + '" r="8" fill="' + C.accent + '" data-drag="probe" style="cursor:move"/>';
      s2 += '<circle cx="' + X(sp) + '" cy="' + Y(mu) + '" r="18" fill="transparent" data-drag="probe" style="cursor:move"/>';
      s2 += t(clamp(X(sp) + 12, 96, 520), clamp(Y(mu) - 10, 84, 258), f(sp, 0) + ' km/h · μ ' + mu.toFixed(2) + ' · ' + f(dist, 0) + ' m', 'val');
      s2 += t(x0 + (x1 - x0) / 2, 296, '车速（km/h）', 'sm', 'middle');
      s2 += t(24, 172, '路面附着 μ', 'sm', 'middle', ' transform="rotate(-90 24 172)"');
      s2 += t(36, 318, 's = v·tᵣ + 建压段 + v₁²/(2a)，a = μ·g·0.95 = ' + f(mu * 0.95, 2) + ' g → ' + f(dist, 1) + ' m', 'formula');
      return {
        body: s2,
        readout: [['车速', f(sp, 0) + ' km/h'], ['μ', mu.toFixed(2)], ['总距离', f(dist, 1) + ' m'], ['减速度', f(mu * 0.95, 2) + ' g']],
        note: '等距离线由 BT.stoppingDistance 逐点求解，不是装饰曲线；工况标签只表示区域，不代表法规判据。'
      };
    }
  };

  /* ============================================================
     13. fade cycle
     ============================================================ */
  REG.fadeCycle = {
    h: 310,
    label: '热衰退循环交互图',
    init: function () { return { v0: 100, stops: 12, interval: 60 }; },
    sliders: [
      { k: 'v0', label: '初速度 v₀', min: 60, max: 180, step: 1, disp: function (v) { return v.toFixed(0) + ' km/h'; } },
      { k: 'stops', label: '循环次数', min: 4, max: 24, step: 1, disp: function (v) { return v.toFixed(0) + ' 次'; } },
      { k: 'interval', label: '间隔时间', min: 15, max: 240, step: 5, disp: function (v) { return v.toFixed(0) + ' s'; } }
    ],
    draw: function (s, v, u) {
      const n = Math.max(1, Math.round(s.stops));
      const th = BT.thermal({ mass: v.mass, v0: s.v0 / 3.6, beta: BT.derived(v).beta, discMassF: v.front.discMass, discMassR: v.rear.discMass, discShare: .86, cp: 500 });
      const amb = 30, tau = 300, interval = Math.max(1, s.interval);
      let T = amb, peak = amb;
      const peaks = [[0, amb]], cooled = [];
      for (let i = 1; i <= n; i++) {
        T += th.dTF; peaks.push([i, T]); peak = Math.max(peak, T);
        T = amb + (T - amb) * Math.exp(-interval / tau);
        cooled.push([i, T]);
      }
      const x0 = 90, x1 = 660, y0 = 250, y1 = 78;
      const top = Math.max(peak * 1.18, 260);
      const showLimit = 600 <= top;
      const X = function (i) { return x0 + (x1 - x0) * i / n; };
      const Y = function (Tv) { return y0 - (y0 - y1) * clamp(Tv / top, 0, 1); };
      let s2 = '<rect width="720" height="310" fill="#fff"/>';
      s2 += t(36, 30, '热衰退不是“一次就热”，而是循环累积', 'ttl');
      s2 += t(36, 50, '单次 ΔT = ' + f(th.dTF, 1) + ' °C；' + n + ' 次后峰值 ' + f(peak, 0) + ' °C（间隔 ' + interval + ' s）。', 'sm');
      if (showLimit) {
        s2 += '<rect x="' + x0 + '" y="' + y1 + '" width="' + (x1 - x0) + '" height="18" fill="#fdecea"/>' + t(x1 - 6, y1 + 13, '衰退风险区', 'sm', 'end');
      }
      s2 += '<line x1="' + x0 + '" y1="' + y0 + '" x2="' + x1 + '" y2="' + y0 + '" class="axis"/><line x1="' + x0 + '" y1="' + y0 + '" x2="' + x0 + '" y2="' + y1 + '" class="axis"/>';
      for (let q = 0; q <= 4; q++) {
        const tv = top * q / 4;
        s2 += '<line x1="' + x0 + '" y1="' + Y(tv) + '" x2="' + x1 + '" y2="' + Y(tv) + '" class="grid"/>' + t(x0 - 8, Y(tv) + 3, tv.toFixed(0), 'tick', 'end');
      }
      let path = '', saw = '';
      for (let i = 1; i <= n; i++) {
        path += (i === 1 ? 'M' : 'L') + X(i).toFixed(1) + ' ' + Y(peaks[i][1]).toFixed(1) + ' ';
        saw += 'L' + X(i).toFixed(1) + ' ' + Y(peaks[i][1]).toFixed(1) + ' L' + (X(i) + 5).toFixed(1) + ' ' + Y(cooled[i - 1][1]).toFixed(1) + ' ';
      }
      s2 += '<path d="M' + X(0) + ' ' + Y(amb) + ' ' + saw + '" fill="none" stroke="' + C.accent + '" stroke-width="1.8"/>';
      s2 += '<path d="' + path + '" fill="none" stroke="' + C.accent + '" stroke-width="2.3"/>';
      if (showLimit) {
        s2 += '<line x1="' + x0 + '" y1="' + Y(600) + '" x2="' + x1 + '" y2="' + Y(600) + '" stroke="' + C.bad + '" stroke-width="1.2" stroke-dasharray="5 4"/>';
        s2 += t(x0 + 6, Y(600) - 5, '参考上限 600 °C', 'sm', 'start');
      }
      for (let q = 1; q <= 4; q++) {
        const ii = Math.round(n * q / 4);
        s2 += t(X(ii), y0 + 15, ii.toFixed(0), 'tick', 'middle');
      }
      s2 += t(x0 + (x1 - x0) / 2, 276, '制动次数', 'sm', 'middle');
      s2 += t(24, 166, '制动盘温度（°C）', 'sm', 'middle', ' transform="rotate(-90 24 166)"');
      s2 += t(36, 298, 'T_i = T_{i−1} + ΔT；冷却 T ← T∞ + (T−T∞)e^(−Δt/τ)，τ = 300 s', 'formula');
      return {
        body: s2,
        readout: [['峰值', f(peak, 0) + ' °C'], ['单次 ΔT', f(th.dTF, 1) + ' °C'], ['末次冷却后', f(cooled[n - 1][1], 0) + ' °C'], ['参考上限', '600 °C']],
        note: '间隔越短、初速越高，下一次起点越高；峰值温度用于方案筛选，热衰退判定需台架。'
      };
    }
  };

  /* ============================================================
     14. hydraulic split failure
     ============================================================ */
  REG.hydraulicSplit = {
    h: 310,
    label: '对角线双回路失效交互图',
    init: function () { return { mode: 0 }; },
    tabs: [
      { k: 'mode', val: 0, label: '正常' },
      { k: 'mode', val: 1, label: '回路 1 失效' },
      { k: 'mode', val: 2, label: '回路 2 失效' }
    ],
    draw: function (s, v, u) {
      const mode = Math.round(s.mode);
      const active = mode === 0 ? [true, true, true, true] : mode === 1 ? [false, true, true, false] : [true, false, false, true];
      const frac = mode === 0 ? 1 : 0.5;
      const amax = BT.maxDecel(v) * frac;
      let s2 = '<rect width="720" height="310" fill="#fff"/>';
      s2 += t(36, 30, '一个回路失效，还剩多少制动能力？', 'ttl');
      s2 += t(36, 50, mode === 0 ? '正常状态：四轮均有压力，理论制动能力 100%。' : '对角线双回路：单回路失效后只剩两个对角车轮，理论剩余 50%。', 'sm');
      s2 += box(52, 116, 110, 52, '#eef2f6', '#344054', 7) + t(107, 140, '主缸', 'lbl', 'middle') + t(107, 157, '双回路', 'sm', 'middle');
      s2 += '<path d="M162 130 C230 130 262 96 300 96" fill="none" stroke="' + (mode === 1 ? '#c8d1dc' : C.green) + '" stroke-width="2.4" ' + (mode === 1 ? 'stroke-dasharray="6 4"' : '') + '/>';
      s2 += '<path d="M378 96 C430 96 470 160 500 196" fill="none" stroke="' + (mode === 1 ? '#c8d1dc' : C.green) + '" stroke-width="2.4" ' + (mode === 1 ? 'stroke-dasharray="6 4"' : '') + '/>';
      s2 += '<path d="M162 154 C230 154 262 196 300 196" fill="none" stroke="' + (mode === 2 ? '#c8d1dc' : C.green) + '" stroke-width="2.4" ' + (mode === 2 ? 'stroke-dasharray="6 4"' : '') + '/>';
      s2 += '<path d="M378 196 C430 196 470 132 500 96" fill="none" stroke="' + (mode === 2 ? '#c8d1dc' : C.green) + '" stroke-width="2.4" ' + (mode === 2 ? 'stroke-dasharray="6 4"' : '') + '/>';
      s2 += t(36, 72, '● 回路 1：左前 + 右后', 'sm', 'start', ' style="fill:#177a52"');
      s2 += t(36, 88, '● 回路 2：右前 + 左后', 'sm', 'start', ' style="fill:#177a52"');
      const wheels = [[300, 78, '左前', 0], [500, 78, '右前', 1], [300, 178, '左后', 2], [500, 178, '右后', 3]];
      wheels.forEach(function (w) {
        const on = active[w[3]];
        s2 += box(w[0], w[1], 78, 36, on ? C.greenSoft : '#f3f6f9', on ? C.green : '#c8d1dc', 7);
        s2 += t(w[0] + 39, w[1] + 22, w[2], 'sm', 'middle');
        s2 += t(w[0] + 39, w[1] + 50, on ? '有压力' : '失效', 'tick', 'middle');
      });
      if (mode === 1) {
        s2 += '<line x1="228" y1="108" x2="248" y2="128" stroke="' + C.bad + '" stroke-width="3"/><line x1="248" y1="108" x2="228" y2="128" stroke="' + C.bad + '" stroke-width="3"/>';
      }
      if (mode === 2) {
        s2 += '<line x1="228" y1="178" x2="248" y2="198" stroke="' + C.bad + '" stroke-width="3"/><line x1="248" y1="178" x2="228" y2="198" stroke="' + C.bad + '" stroke-width="3"/>';
      }
      s2 += t(42, 248, '剩余制动力 ' + f(frac * 100, 0) + '%', 'val');
      s2 += '<rect x="190" y="236" width="170" height="18" rx="5" fill="#f2f5f8" stroke="#c8d1dc"/>';
      s2 += '<rect x="190" y="236" width="' + (170 * frac) + '" height="18" rx="5" fill="' + (frac < 1 ? C.accent : C.green) + '" opacity=".75"/>';
      s2 += t(190, 230, '剩余制动能力', 'sm');
      s2 += '<rect x="390" y="232" width="250" height="32" rx="6" fill="#fbfcfd" stroke="#dde3ea"/>';
      s2 += t(400, 246, '当前最大减速度 ≈ ' + f(amax, 2) + ' g', 'val') + t(400, 260, '按四轮等附着、等制动力估算', 'sm');
      s2 += t(36, 306, '对角线回路单回路失效 → 两个对角车轮有效 → 剩余约 50%（理论值，未计 ABS/ESC 再分配）', 'formula');
      return {
        body: s2,
        readout: [['模式', mode === 0 ? '正常' : '单回路失效'], ['有效车轮', active.filter(Boolean).length + ' / 4'], ['剩余制动力', f(frac * 100, 0) + '%'], ['最大减速度', f(amax, 2) + ' g']],
        note: '点击标签切换失效回路；对角线双回路失效后仍能保持方向稳定，但制动距离会明显增加。'
      };
    }
  };

  /* ============================================================
     15. regen blend
     ============================================================ */
  REG.regenBlend = {
    h: 320,
    label: '电机制动与液压制动协调交互图',
    init: function () { return { z: 0.25, speed: 80, soc: 80 }; },
    sliders: [
      { k: 'z', label: '需求减速度', min: 0.1, max: 0.4, step: 0.01, disp: function (v) { return v.toFixed(2) + ' g'; } },
      { k: 'speed', label: '车速', min: 5, max: 180, step: 1, disp: function (v) { return v.toFixed(0) + ' km/h'; } },
      { k: 'soc', label: 'SOC', min: 20, max: 100, step: 1, disp: function (v) { return v.toFixed(0) + '%'; } }
    ],
    draw: function (s, v, u) {
      const mass = v.mass, Pmax = 60000;
      function capAt(sp) {
        const ms = Math.max(2, sp / 3.6);
        const socK = 0.55 + 0.45 * s.soc / 100;
        return Math.min(s.z, 0.25, Pmax / (mass * ms)) * socK;
      }
      const cap = capAt(s.speed);
      const regen = Math.max(0, Math.min(s.z, cap));
      const hyd = Math.max(0, s.z - regen);
      const ms = Math.max(2, s.speed / 3.6);
      const power = mass * regen * G * ms / 1000;
      const x0 = 90, x1 = 660, y0 = 262, y1 = 92;
      const X = function (sp) { return x0 + (x1 - x0) * sp / 180; };
      const Y = function (a) { return y0 - (y0 - y1) * clamp(a / 0.4, 0, 1); };
      let s2 = '<rect width="720" height="320" fill="#fff"/>';
      s2 += t(36, 30, '能量回收不是“把刹车交给电机”', 'ttl');
      s2 += t(36, 50, '需求 ' + s.z.toFixed(2) + ' g：电机 ' + f(regen, 2) + ' g，液压补 ' + f(hyd, 2) + ' g。', 'sm');
      s2 += '<line x1="' + x0 + '" y1="' + y0 + '" x2="' + x1 + '" y2="' + y0 + '" class="axis"/><line x1="' + x0 + '" y1="' + y0 + '" x2="' + x0 + '" y2="' + y1 + '" class="axis"/>';
      for (let a = 0; a <= 0.401; a += 0.1) {
        s2 += '<line x1="' + x0 + '" y1="' + Y(a) + '" x2="' + x1 + '" y2="' + Y(a) + '" class="grid"/>' + t(x0 - 8, Y(a) + 3, a.toFixed(1), 'tick', 'end');
      }
      for (let sp = 0; sp <= 180; sp += 30) {
        s2 += '<line x1="' + X(sp) + '" y1="' + y1 + '" x2="' + X(sp) + '" y2="' + y0 + '" class="grid"/>' + t(X(sp), y0 + 16, sp.toFixed(0), 'tick', 'middle');
      }
      let curve = '';
      for (let sp = 5; sp <= 180; sp += 2) curve += (sp === 5 ? 'M' : 'L') + X(sp).toFixed(1) + ' ' + Y(capAt(sp)).toFixed(1) + ' ';
      s2 += '<path d="' + curve + '" fill="none" stroke="' + C.green + '" stroke-width="2.6"/>';
      s2 += '<line x1="' + x0 + '" y1="' + Y(s.z) + '" x2="' + x1 + '" y2="' + Y(s.z) + '" stroke="' + C.accent + '" stroke-width="1.8" stroke-dasharray="6 4"/>';
      s2 += '<rect x="' + X(s.speed) + '" y="' + Y(s.z) + '" width="' + (x1 - X(s.speed)) + '" height="' + (Y(regen) - Y(s.z)) + '" fill="' + C.accentSoft + '" opacity=".65"/>';
      s2 += '<line x1="' + X(s.speed) + '" y1="' + y1 + '" x2="' + X(s.speed) + '" y2="' + y0 + '" stroke="' + C.muted + '" stroke-width="1" stroke-dasharray="4 3"/>';
      s2 += '<circle cx="' + X(s.speed) + '" cy="' + Y(regen) + '" r="5.5" fill="' + C.green + '"/>';
      s2 += '<circle cx="' + X(s.speed) + '" cy="' + Y(s.z) + '" r="5.5" fill="' + C.accent + '"/>';
      s2 += t(clamp(X(s.speed) + 10, 96, 470), Y(s.z) - 8, '需求 ' + s.z.toFixed(2) + ' g', 'val');
      s2 += t(clamp(X(s.speed) + 10, 96, 470), Y(regen) + 18, '电机 ' + f(regen, 2) + ' g', 'val');
      s2 += t(x0 + 8, y1 + 14, '绿线：电机/电池功率上限', 'sm');
      s2 += t((x0 + x1) / 2, 292, '车速（km/h）', 'sm', 'middle');
      s2 += t(24, 174, '减速度（g）', 'sm', 'middle', ' transform="rotate(-90 24 174)"');
      s2 += t(36, 310, 'a_regen = min(a_req, 0.25g, P_max/(m·v))·k_SOC = ' + f(cap, 2) + ' g；a_hyd = a_req − a_regen = ' + f(hyd, 2) + ' g', 'formula');
      return {
        body: s2,
        readout: [['电机', f(regen, 2) + ' g'], ['液压补足', f(hyd, 2) + ' g'], ['回收功率', f(power, 1) + ' kW'], ['回收占比', f(s.z > 0 ? regen / s.z * 100 : 0, 0) + '%']],
        note: '电机能力按 60 kW、0.25g 与 SOC 系数建模；高速时功率限制使回收下降，液压必须无缝补足。'
      };
    }
  };

  /* ============================================================
     16. test data pipeline
     ============================================================ */
  REG.analysis = {
    h: 330,
    label: '试验数据分析流程交互图',
    init: function () { return { win: 9, delay: 0.06 }; },
    sliders: [
      { k: 'win', label: '滤波窗口', min: 1, max: 21, step: 2, disp: function (v) { return v.toFixed(0) + ' 点'; } },
      { k: 'delay', label: '时移补偿', min: 0, max: 0.2, step: 0.01, disp: function (v) { return v.toFixed(2) + ' s'; } }
    ],
    draw: function (s, v, u) {
      const dt = 0.02, v0 = 100 / 3.6, a = 0.9 * G, tr = 0.35, tb = 0.2;
      function trueV(tt) {
        if (tt <= tr) return v0;
        const x = tt - tr;
        if (x <= tb) return Math.max(0, v0 - a * x * x / (2 * tb));
        return Math.max(0, v0 - a * tb / 2 - a * (x - tb));
      }
      const raw = [], shifted = [], filt = [];
      let stop = 0;
      for (let i = 0; i < 220; i++) {
        const tt = i * dt, tv = trueV(tt);
        raw.push([tt, tv * 3.6]);
        if (tv <= 0.01) { stop = tt; break; }
      }
      const n = raw.length;
      const noise = function (i) { return 4.2 * Math.sin(i * 2.17) + 1.8 * Math.sin(i * 5.73 + 1); };
      const shiftN = Math.round(s.delay / dt);
      for (let i = 0; i < n; i++) shifted.push([raw[i][0], Math.max(0, raw[i][1] + noise(i))]);
      const w = Math.max(1, Math.round(s.win));
      for (let i = 0; i < n; i++) {
        let sum = 0, cnt = 0;
        for (let k = -Math.floor(w / 2); k <= Math.floor(w / 2); k++) {
          const j = i + k + shiftN;
          if (j >= 0 && j < n) { sum += shifted[j][1]; cnt++; }
        }
        filt.push([raw[i][0], cnt ? sum / cnt : shifted[i][1]]);
      }
      let dist = 0, sAt = [0];
      for (let i = 1; i < n; i++) {
        dist += (filt[i][1] + filt[i - 1][1]) / 2 / 3.6 * dt;
        sAt.push(dist);
      }
      function crossing(frac) {
        const target = v0 * 3.6 * frac;
        for (let i = 1; i < n; i++) {
          if (filt[i][1] <= target) {
            const t0 = filt[i - 1][1], t1 = filt[i][1];
            const k = (t0 - target) / Math.max(0.001, t0 - t1);
            return { t: filt[i - 1][0] + k * dt, s: sAt[i - 1] + k * (sAt[i] - sAt[i - 1]) };
          }
        }
        return { t: stop, s: dist };
      }
      const b = crossing(0.8), e = crossing(0.1);
      const mfdd = (Math.pow(v0 * 3.6 * 0.8, 2) - Math.pow(v0 * 3.6 * 0.1, 2)) / (25.92 * Math.max(0.001, e.s - b.s));
      const x0 = 92, x1 = 420, y0 = 258, y1 = 108;
      const X = function (tt) { return x0 + (x1 - x0) * clamp(tt / Math.max(0.1, stop), 0, 1); };
      const Y = function (sp) { return y0 - (y0 - y1) * clamp(sp / (v0 * 3.6), 0, 1); };
      let s2 = '<rect width="720" height="330" fill="#fff"/>';
      s2 += t(36, 30, '一段路试数据，怎么变成结论？', 'ttl');
      s2 += t(36, 50, '原始车速先做时移对齐，再滤波，再积分；顺序错了，距离与 MFDD 都会偏。', 'sm');
      s2 += '<rect x="40" y="66" width="120" height="26" rx="5" fill="#fbfcfd" stroke="#c8d1dc"/>' + t(100, 84, 'CSV 车速', 'sm', 'middle');
      s2 += arrow(u, 'm', 162, 79, 186, 79, 1.6);
      s2 += '<rect x="188" y="66" width="120" height="26" rx="5" fill="' + C.blueSoft + '" stroke="#bfdce5"/>' + t(248, 84, '时移 ' + s.delay.toFixed(2) + ' s', 'sm', 'middle');
      s2 += arrow(u, 'm', 310, 79, 334, 79, 1.6);
      s2 += '<rect x="336" y="66" width="130" height="26" rx="5" fill="' + C.amberSoft + '" stroke="#efd7a9"/>' + t(401, 84, '滤波 ' + w + ' 点', 'sm', 'middle');
      s2 += arrow(u, 'm', 468, 79, 492, 79, 1.6);
      s2 += '<rect x="494" y="66" width="176" height="26" rx="5" fill="' + C.greenSoft + '" stroke="#c6e6d8"/>' + t(582, 84, '积分 / MFDD', 'sm', 'middle');
      s2 += '<rect x="40" y="104" width="360" height="168" rx="8" fill="#fbfcfd" stroke="#dde3ea"/>';
      s2 += '<line x1="' + x0 + '" y1="' + y0 + '" x2="' + x1 + '" y2="' + y0 + '" class="axis"/><line x1="' + x0 + '" y1="' + y0 + '" x2="' + x0 + '" y2="' + y1 + '" class="axis"/>';
      s2 += t(x0 - 6, y1 + 4, f(v0 * 3.6, 0), 'tick', 'end') + t(x0 - 6, y0 + 3, '0', 'tick', 'end') + t(x0 - 6, (y0 + y1) / 2 + 3, f(v0 * 1.8, 0), 'tick', 'end');
      for (let tq = 0; tq <= 3; tq++) {
        if (tq > stop + 0.05) break;
        s2 += '<line x1="' + X(tq) + '" y1="' + y0 + '" x2="' + X(tq) + '" y2="' + (y0 + 4) + '" class="axis"/>';
        s2 += t(X(tq), y0 + 16, tq.toFixed(0), 'tick', 'middle');
      }
      let rawPath = '', filtPath = '';
      for (let i = 0; i < n; i += 2) {
        rawPath += (i ? 'L' : 'M') + X(raw[i][0]).toFixed(1) + ' ' + Y(shifted[i][1]).toFixed(1) + ' ';
        filtPath += (i ? 'L' : 'M') + X(filt[i][0]).toFixed(1) + ' ' + Y(filt[i][1]).toFixed(1) + ' ';
      }
      s2 += '<path d="' + rawPath + '" fill="none" stroke="#b8c2cd" stroke-width="1" opacity=".8"/>';
      s2 += '<path d="' + filtPath + '" fill="none" stroke="' + C.accent + '" stroke-width="2.2"/>';
      s2 += t(x0 + 6, y1 + 12, '灰：原始（带噪声/时移）', 'sm');
      s2 += t(x0 + 6, y1 + 26, '橙：滤波后', 'sm');
      s2 += t((x0 + x1) / 2, 286, '时间（s）', 'sm', 'middle');
      s2 += '<rect x="416" y="104" width="266" height="168" rx="8" fill="#fbfcfd" stroke="#dde3ea"/>';
      s2 += t(430, 124, '结果（滤波后）', 'val');
      s2 += t(430, 150, '制动距离 ' + f(dist, 1) + ' m', 'lbl');
      s2 += t(430, 170, 'MFDD ' + f(mfdd, 2) + ' m/s²', 'lbl');
      s2 += t(430, 190, '最大减速度 ' + f(a / G, 2) + ' g', 'sm');
      s2 += t(430, 210, 'v_b 0.8v₀ → v_e 0.1v₀', 'sm');
      s2 += t(430, 230, '数据点 ' + n + ' @ ' + (dt * 1000).toFixed(0) + ' ms', 'sm');
      s2 += '<rect x="430" y="240" width="238" height="20" rx="4" fill="#fff" stroke="#e2e8f0"/>';
      s2 += '<rect x="430" y="240" width="' + (238 * clamp(mfdd / (0.9 * G), 0, 1)) + '" height="20" rx="4" fill="' + C.green + '" opacity=".35"/>';
      s2 += t(36, 318, 'v_filt[i] = (1/N)Σ v_shift[i+k]；s = Σ(v_i+v_{i−1})/2·Δt；MFDD = (v_b²−v_e²)/(25.92·Δs)', 'formula');
      return {
        body: s2,
        readout: [['制动距离', f(dist, 1) + ' m'], ['MFDD', f(mfdd, 2) + ' m/s²'], ['时移', s.delay.toFixed(2) + ' s'], ['滤波', w + ' 点']],
        note: '数据为确定性合成示例（100→0 km/h、0.9g、含噪声与 CAN 时移），用于说明处理顺序；真实 CSV 请在“试验数据分析”页导入。'
      };
    }
  };

  /* ============================================================
     17. symbol board
     ============================================================ */
  REG.symbolBoard = {
    h: 330,
    label: '制动系统符号地图交互图',
    init: function () { return { group: 0 }; },
    tabs: function () {
      const groups = BT.SYMBOLS ? BT.SYMBOLS.map(function (x) { return x.group; }).filter(function (x, i, a) { return a.indexOf(x) === i; }) : ['整车', '制动器', '液压与踏板', '热', '驻车', '试验', '目标'];
      return groups.map(function (g, i) { return { k: 'group', val: i, label: g }; });
    },
    draw: function (s, v, u) {
      const all = BT.SYMBOLS || [];
      const groups = all.map(function (x) { return x.group; }).filter(function (x, i, a) { return a.indexOf(x) === i; });
      const cur = groups[Math.round(s.group)] || groups[0] || '整车';
      const list = all.filter(function (x) { return x.group === cur; });
      const colors = [C.blue, C.accent, C.green, C.amber, C.blue, C.accent, C.green];
      let s2 = '<rect width="720" height="330" fill="#fff"/>';
      s2 += t(36, 30, '制动系统的符号地图', 'ttl');
      s2 += t(36, 50, '点击任意分组：高亮该组符号，并在下方读出定义与风险。', 'sm');
      const cols = 4, w = 156, hh = 92, gx = 40, gy = 72, gap = 12;
      groups.forEach(function (g, i) {
        const col = i % cols, row = Math.floor(i / cols);
        const x = gx + col * (w + gap), y = gy + row * (hh + gap);
        const active = g === cur;
        s2 += '<g data-act="group" data-val="' + i + '" style="cursor:pointer">';
        s2 += box(x, y, w, hh, active ? (i % 2 ? C.accentSoft : C.blueSoft) : '#fbfcfd', active ? (i % 2 ? C.accent : C.blue) : '#c8d1dc', 9, active ? ' stroke-width="2.2"' : '');
        s2 += '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="24" rx="9" fill="' + (colors[i % colors.length]) + '" opacity=".13"/>';
        s2 += t(x + 10, y + 17, g, 'val');
        s2 += t(x + 10, y + 38, (all.filter(function (x2) { return x2.group === g; }).length) + ' 个符号', 'sm');
        const sample = all.filter(function (x2) { return x2.group === g; }).slice(0, 3).map(function (x2) { return x2.sym; }).join('  ');
        s2 += t(x + 10, y + 58, sample, 'symbig');
        s2 += t(x + 10, y + 78, active ? '已选中' : '点击查看', 'sm');
        s2 += '</g>';
      });
      s2 += '<rect x="36" y="282" width="648" height="34" rx="6" fill="#fbfcfd" stroke="#dde3ea"/>';
      s2 += t(46, 294, cur + '：' + list.slice(0, 6).map(function (x2) { return x2.sym + '=' + x2.name; }).join(' · '), 'sm');
      s2 += t(46, 309, list.length ? '高风险：' + (list.filter(function (x2) { return x2.risk === '高'; }).map(function (x2) { return x2.sym; }).join('、') || '无') + '；同一符号只允许一个定义。' : '暂无数据', 'sm');
      return {
        body: s2,
        readout: [['分组', cur], ['符号数', list.length + ' 个'], ['高风险', (list.filter(function (x2) { return x2.risk === '高'; }).length) + ' 个']],
        note: '符号数据来自“符号与单位”页的单一数据源；点击图内分组或下方标签切换。'
      };
    }
  };

  /* ---------- beginner card ---------- */
  BT.beginner = true;
  BT.beginnerCard = function (o) {
    const sec = document.createElement('section');
    sec.className = 'beginner' + (BT.beginner ? '' : ' collapsed');
    const tone = o.grade === 'A' ? 'ok' : o.grade === 'B' ? 'info' : 'warn';
    const gradeText = o.grade === 'A' ? 'A · 解析级' : o.grade === 'B' ? 'B · 工程级' : 'C · 概念级';
    sec.innerHTML =
      '<div class="beginner-head">' +
      '<div><span class="eyebrow">一分钟看懂 · 可交互</span><h3>' + o.title + '</h3></div>' +
      '<div class="beginner-meta"><span class="badge ' + tone + '">' + gradeText + '</span>' +
      '<button class="beginner-toggle" type="button">' + (BT.beginner ? '收起' : '展开原理图') + '</button></div>' +
      '</div>' +
      '<div class="beginner-body">' +
      '<div class="beginner-diagram">' + o.svg + '</div>' +
      '<div class="beginner-text">' +
      '<p class="bp">' + o.principle + '</p>' +
      '<ol class="bstep">' + o.steps.map(function (s) { return '<li>' + s + '</li>'; }).join('') + '</ol>' +
      '<div class="bmistake"><b>常见误区</b><span>' + o.mistake + '</span></div>' +
      '</div></div>';
    const btn = sec.querySelector('.beginner-toggle');
    btn.addEventListener('click', function () {
      sec.classList.toggle('collapsed');
      btn.textContent = sec.classList.contains('collapsed') ? '展开原理图' : '收起';
    });
    return sec;
  };

  BT.applyBeginner = function () {
    BT.qa('.beginner').forEach(function (el) {
      el.classList.toggle('collapsed', !BT.beginner);
      const b = el.querySelector('.beginner-toggle');
      if (b) b.textContent = BT.beginner ? '收起' : '展开原理图';
    });
    const btn = BT.q('#beginnerBtn');
    if (btn) btn.classList.toggle('active', BT.beginner);
  };
})(window.BT);
