/* ============================================================
   模块：灵敏度 / 参数扫描
   ============================================================ */
(function (BT) {
  'use strict';
  BT.modules = BT.modules || [];

  function tornado(host, items, fmt) {
    host.innerHTML = '';
    const max = Math.max.apply(null, items.map(function (i) { return Math.max(Math.abs(i.low), Math.abs(i.high)); })) || 1;
    const wrap = BT.el('div', { class: 'stack', style: { gap: '8px', padding: '4px 2px' } });
    items.forEach(function (it) {
      const row = BT.el('div', { style: { display: 'grid', gridTemplateColumns: '108px 1fr 112px', gap: '8px', alignItems: 'center' } });
      row.appendChild(BT.el('div', { style: { fontSize: '10.5px', color: '#475467', textAlign: 'right', whiteSpace: 'nowrap' }, text: it.label }));
      const track = BT.el('div', { style: { position: 'relative', height: '16px', background: '#f2f5f8', borderRadius: '3px' } });
      track.appendChild(BT.el('div', { style: { position: 'absolute', left: '50%', top: 0, bottom: 0, width: '1px', background: '#cbd5e1' } }));
      if (it.low < 0) {
        const w = Math.abs(it.low) / max * 50;
        track.appendChild(BT.el('div', { style: { position: 'absolute', top: '2px', bottom: '2px', right: '50%', width: w + '%', background: '#17657f', borderRadius: '2px' } }));
      } else {
        const w = Math.abs(it.low) / max * 50;
        track.appendChild(BT.el('div', { style: { position: 'absolute', top: '2px', bottom: '2px', left: '50%', width: w + '%', background: '#17657f', borderRadius: '2px' } }));
      }
      if (it.high >= 0) {
        const w = Math.abs(it.high) / max * 50;
        track.appendChild(BT.el('div', { style: { position: 'absolute', top: '2px', bottom: '2px', left: '50%', width: w + '%', background: '#c8502a', borderRadius: '2px' } }));
      } else {
        const w = Math.abs(it.high) / max * 50;
        track.appendChild(BT.el('div', { style: { position: 'absolute', top: '2px', bottom: '2px', right: '50%', width: w + '%', background: '#c8502a', borderRadius: '2px' } }));
      }
      row.appendChild(track);
      row.appendChild(BT.el('div', { style: { fontFamily: 'var(--mono)', fontSize: '9.8px', color: '#344054', textAlign: 'right' }, text: fmt(it.low) + ' / ' + fmt(it.high) }));
      wrap.appendChild(row);
    });
    host.appendChild(wrap);
  }

  BT.modules.push({
    id: 'sensitivity',
    group: '匹配与数据',
    name: '灵敏度分析',
    icon: 'tornado',
    desc: '制动距离与 φ₀ 的参数龙卷风图',
    render: function (root) {
      const v = BT.vehicle;
      root.appendChild(BT.pageHead('SENSITIVITY', '参数灵敏度分析', '对关键输入做 ± 扰动，量化其对制动距离与同步附着系数 φ₀ 的影响，识别方案中的主导风险参数。', [
        BT.el('span', { class: 'badge info' }, [BT.el('i', { class: 'dot' }), document.createTextNode('单因素扰动')])
      ]));

      root.appendChild(BT.beginnerCard({
        title: '哪个参数最值得先控制？',
        svg: BT.diagram('sensitivity'),
        principle: '每次只动一个参数 ±10%，看结果变化；条形越长，说明这个参数越敏感。',
        steps: [
          '先看制动距离：初速度通常最敏感，其次是附着系数与反应时间。',
          '再看 φ₀：前活塞直径、前片 μ、质心高度往往比后片 μ 更敏感。',
          '把有限的公差和试验资源，优先放在最敏感的参数上。'
        ],
        mistake: '只看单因素，忽略参数之间的交互作用；重要方案还要做 DOE 或蒙特卡洛。',
        grade: 'A'
      }));

      const side = [];
      const p = BT.el('section', { class: 'panel' });
      p.appendChild(BT.el('div', { class: 'panel-head' }, [BT.el('h3', { text: '基准工况' })]));
      const body = BT.el('div', { class: 'panel-body' });
      body.appendChild(BT.vehStrip(v));
      const form = new BT.Form(body, 'sensitivity');
      form.section('制动距离基准');
      form.num('v0', '初速度', 100, 'km/h', { step: 1, min: 20, max: 200 });
      form.num('tr', '反应时间', 0.35, 's', { step: 0.01, min: 0, max: 1.5 });
      form.num('tb', '建压时间', 0.20, 's', { step: 0.01, min: 0, max: 1 });
      form.num('mu', '附着系数', 0.90, '—', { step: 0.01, min: 0.1, max: 1.3 });
      form.num('absEff', 'ABS / 轮胎效率 η', 0.95, '—', { step: 0.01, min: 0.5, max: 1, hint: '与制动距离模块保持同一口径' });
      form.num('pct', '扰动幅度', 10, '%', { step: 1, min: 1, max: 40 });
      p.appendChild(body);
      side.push(p);

      side.push(BT.panel('读图方法', [
        BT.el('div', { class: 'stack' }, [
          BT.note('每条为单因素扰动结果，左/右分别对应参数减小/增大。条形越长，该参数对结果越敏感；可用于确定公差、试验控制与设计裕度优先级。', 'info'),
          BT.note('制动距离基准按 μ·g·η 作为稳态减速度，η 与“制动距离”模块保持同一口径；φ₀ 由当前前后制动器硬件计算。未考虑参数间的交互作用，交互效应需用 DOE/蒙特卡洛进一步分析。', 'warn')
        ])
      ]));

      const kpiHost = BT.el('div');
      const distChart = BT.el('div');
      const phiChart = BT.el('div');
      const tableHost = BT.el('div');
      const main = [kpiHost,
        BT.el('div', { class: 'split-2' }, [
          BT.chartCard('制动距离灵敏度', '总距离变化量（m），基准在中心', distChart),
          BT.chartCard('φ₀ 灵敏度', '同步附着系数变化量，基准在中心', phiChart)
        ]),
        tableHost];
      root.appendChild(BT.workbench(side, main));

      function recalc() {
        const f = form.values();
        const pctPct = BT.num(f.pct, 10, 1, 40);
        const pct = pctPct / 100;
        const v0 = BT.num(f.v0, 100, 20, 200);
        const tr = BT.num(f.tr, 0.35, 0, 1.5);
        const tb = BT.num(f.tb, 0.20, 0, 1);
        const mu = BT.num(f.mu, 0.90, 0.1, 1.3);
        const eff = BT.num(f.absEff, 0.95, 0.5, 1);
        const baseA = mu * eff * BT.g;
        const baseDist = BT.stoppingDistance({ v0: v0 / 3.6, tr: tr, tb: tb, a: baseA }).total;
        const baseBeta = BT.derived(v).beta;
        const basePhi = BT.phi0(baseBeta, v);
        const items = [];
        const rows = [];

        function addDist(label, lo, hi) {
          const dLo = BT.stoppingDistance({ v0: lo.v0 / 3.6, tr: lo.tr, tb: lo.tb, a: lo.mu * eff * BT.g }).total;
          const dHi = BT.stoppingDistance({ v0: hi.v0 / 3.6, tr: hi.tr, tb: hi.tb, a: hi.mu * eff * BT.g }).total;
          items.push({ label: label, low: dLo - baseDist, high: dHi - baseDist });
          rows.push([label, baseDist.toFixed(1), dLo.toFixed(1), dHi.toFixed(1), BT.sign(dLo - baseDist, 1), BT.sign(dHi - baseDist, 1)]);
        }
        addDist('初速度', { v0: v0 * (1 - pct), tr: tr, tb: tb, mu: mu }, { v0: v0 * (1 + pct), tr: tr, tb: tb, mu: mu });
        addDist('反应时间', { v0: v0, tr: tr * (1 - pct), tb: tb, mu: mu }, { v0: v0, tr: tr * (1 + pct), tb: tb, mu: mu });
        addDist('建压时间', { v0: v0, tr: tr, tb: tb * (1 - pct), mu: mu }, { v0: v0, tr: tr, tb: tb * (1 + pct), mu: mu });
        addDist('附着系数', { v0: v0, tr: tr, tb: tb, mu: mu * (1 - pct) }, { v0: v0, tr: tr, tb: tb, mu: mu * (1 + pct) });

        items.sort(function (a, b) { return Math.max(Math.abs(b.low), Math.abs(b.high)) - Math.max(Math.abs(a.low), Math.abs(a.high)); });
        tornado(distChart, items, function (x) { return BT.sign(x, 1) + ' m'; });

        const phiItems = [], phiRows = [];
        function betaOf(mm) {
          const vv = BT.deepClone(v);
          vv.front.mu = mm.frontMu;
          vv.front.pistonD = mm.frontD;
          vv.front.re = mm.frontRe;
          vv.rear.mu = mm.rearMu;
          vv.h = mm.h;
          return BT.derived(vv).beta;
        }
        function addPhi(label, lo, hi) {
          const bLo = betaOf(lo), bHi = betaOf(hi);
          const pLo = BT.phi0(bLo, { L: v.L, h: lo.h, frontShare: v.frontShare });
          const pHi = BT.phi0(bHi, { L: v.L, h: hi.h, frontShare: v.frontShare });
          phiItems.push({ label: label, low: pLo - basePhi, high: pHi - basePhi });
          phiRows.push([label, basePhi.toFixed(3), pLo.toFixed(3), pHi.toFixed(3), BT.sign(pLo - basePhi, 3), BT.sign(pHi - basePhi, 3)]);
        }
        function mm(key, factor) {
          const o = { frontMu: v.front.mu, frontD: v.front.pistonD, frontRe: v.front.re, rearMu: v.rear.mu, h: v.h };
          if (key === 'frontMu') o.frontMu *= factor;
          if (key === 'frontD') o.frontD *= factor;
          if (key === 'frontRe') o.frontRe *= factor;
          if (key === 'rearMu') o.rearMu *= factor;
          if (key === 'h') o.h *= factor;
          return o;
        }
        ['frontMu', 'frontD', 'frontRe', 'rearMu', 'h'].forEach(function (key) {
          const names = { frontMu: '前片 μ', frontD: '前活塞直径', frontRe: '前有效半径', rearMu: '后片 μ', h: '质心高度' };
          addPhi(names[key], mm(key, 1 - pct), mm(key, 1 + pct));
        });
        phiItems.sort(function (a, b) { return Math.max(Math.abs(b.low), Math.abs(b.high)) - Math.max(Math.abs(a.low), Math.abs(a.high)); });
        tornado(phiChart, phiItems, function (x) { return BT.sign(x, 3); });

        kpiHost.innerHTML = '';
        kpiHost.appendChild(BT.kpis([
          ['基准总距离', BT.fmt(baseDist, 1), 'm', v0.toFixed(0) + ' km/h · μ ' + mu.toFixed(2)],
          ['基准 φ₀', basePhi.toFixed(3), '', 'β ' + baseBeta.toFixed(3)],
          ['距离最敏感', items[0].label, '', '峰值 ' + BT.fmt(Math.max(Math.abs(items[0].low), Math.abs(items[0].high)), 1) + ' m'],
          ['φ₀ 最敏感', phiItems[0].label, '', '峰值 ' + BT.fmt(Math.max(Math.abs(phiItems[0].low), Math.abs(phiItems[0].high)), 3)],
          ['扰动幅度', '±' + pctPct.toFixed(0), '%', '单因素']
        ]));

        tableHost.innerHTML = '';
        tableHost.appendChild(BT.el('div', { class: 'split-2' }, [
          BT.panel('制动距离明细（m）', [
            BT.table(['参数', '基准', '−' + pctPct.toFixed(0) + '%', '+' + pctPct.toFixed(0) + '%', 'Δ−', 'Δ+'], rows, { caption: '总距离（含反应）' })
          ]),
          BT.panel('φ₀ 明细', [
            BT.table(['参数', '基准', '−' + pctPct.toFixed(0) + '%', '+' + pctPct.toFixed(0) + '%', 'Δ−', 'Δ+'], phiRows, { caption: '同步附着系数' })
          ])
        ]));
      }
      form.onChange = BT.debounce(recalc, 60);
      recalc();
    }
  });
})(window.BT);
