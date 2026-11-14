/* ============================================================
   模块：制动系统匹配求解器
   ============================================================ */
(function (BT) {
  'use strict';
  BT.modules = BT.modules || [];

  const MC = [22.22, 23.81, 25.4, 26.99, 28.58, 30.16];
  const FRONT = [
    { n: 1, d: 54 }, { n: 1, d: 57 }, { n: 1, d: 60 }, { n: 1, d: 63 },
    { n: 2, d: 42 }, { n: 2, d: 46 }, { n: 2, d: 48 }, { n: 2, d: 51 }, { n: 2, d: 54 }
  ];
  const REAR = [
    { n: 1, d: 32 }, { n: 1, d: 34 }, { n: 1, d: 36 }, { n: 1, d: 38 }, { n: 1, d: 40 },
    { n: 1, d: 42 }, { n: 1, d: 46 }, { n: 1, d: 48 }, { n: 2, d: 38 }, { n: 2, d: 42 }
  ];

  BT.modules.push({
    id: 'matching',
    group: '匹配与数据',
    name: '匹配求解器',
    icon: 'target',
    desc: '主缸/卡钳组合扫描与可行域排序',
    render: function (root) {
      const v = BT.vehicle;
      root.appendChild(BT.pageHead('MATCHING SOLVER', '制动系统匹配求解器', '在给定主缸直径、前/后卡钳活塞组合的离散目录中扫描，按 φ₀、0.5g 踏板力、0.5g 行程与最大减速度筛选可行方案并排序。', [
        BT.el('span', { class: 'badge info' }, [BT.el('i', { class: 'dot' }), document.createTextNode('目录 ' + (MC.length * FRONT.length * REAR.length) + ' 组合')])
      ]));

      root.appendChild(BT.beginnerCard({
        title: '为什么同一个卡钳，换个主缸脚感就变了？',
        svg: BT.diagram('matching'),
        principle: 'β 由前后制动器决定；主缸和助力器主要改变踏板力与行程，不改变前后分配。',
        steps: [
          '先定 φ₀ 和 β：这一步由前后卡钳/盘/摩擦片决定。',
          '再选主缸与卡钳活塞面积：影响 0.5g 踏板力和行程。',
          '最后把热、失效、轮辋空间、需液量和成本作为约束筛掉不可行组合。'
        ],
        mistake: '只换主缸想改变前后制动力分配；主缸只改压力增益和行程，β 不会跟着变。',
        grade: 'C'
      }));

      const side = [];
      const p = BT.el('section', { class: 'panel' });
      p.appendChild(BT.el('div', { class: 'panel-head' }, [BT.el('h3', { text: '匹配目标' })]));
      const body = BT.el('div', { class: 'panel-body' });
      body.appendChild(BT.vehStrip(v));
      const form = new BT.Form(body, 'matching');
      form.section('目标区间');
      form.num('phi', '目标 φ₀', 0.95, '—', { step: 0.01, min: 0.6, max: 1.2 });
      form.num('phiTol', 'φ₀ 容差', 0.05, '—', { step: 0.01, min: 0.01, max: 0.2 });
      form.num('force', '0.5g 目标踏板力', 80, 'N', { step: 1, min: 30, max: 180 });
      form.num('forceTol', '踏板力容差', 15, 'N', { step: 1, min: 3, max: 50 });
      form.num('travel', '0.5g 目标行程', 55, 'mm', { step: 1, min: 25, max: 100 });
      form.num('travelTol', '行程容差', 12, 'mm', { step: 1, min: 3, max: 30 });
      form.num('minDecel', '最小最大减速度', 1.0, 'g', { step: 0.05, min: 0.5, max: 1.5 });
      p.appendChild(body);
      side.push(p);

      side.push(BT.panel('求解逻辑', [
        BT.el('div', { class: 'stack' }, [
          BT.note('枚举 <b>主缸 φ × 前卡钳 × 后卡钳</b>；制动器有效半径与摩擦系数沿用当前整车参数。对每个组合计算 β、φ₀、0.5g 压力/踏板力/行程与最高压力下的最大减速度。', 'info'),
          BT.note('可行条件：φ₀、踏板力、行程均落在目标容差内，且最大减速度 ≥ 设定值。排序按归一化偏差加权（φ₀ 权重 1.5，踏板力/行程权重 1）。', 'info'),
          BT.note('目录为工程示例，不代表任何供应商产品型谱；实际选型还需校核卡钳轮辋空间、热容量、拖滞、NVH 与成本。', 'warn')
        ])
      ]));

      const kpiHost = BT.el('div');
      const chartHost = BT.el('div');
      const tableHost = BT.el('div');
      const main = [kpiHost, BT.chartCard('可行域分布', '横轴 φ₀，纵轴 0.5g 踏板力；绿色为满足全部约束的组合', chartHost), tableHost];
      root.appendChild(BT.workbench(side, main));

      function evaluate(vv) {
        const d = BT.derived(vv);
        const p05 = BT.pressureForDecel(0.5, vv);
        const F05 = BT.pedalForceForPressure(p05, vv);
        const T05 = BT.pedalTravelAtPressure(p05, vv);
        const maxD = d.decelPerMPa * vv.maxPressure;
        return { d: d, p05: p05, F05: F05, T05: T05, maxD: maxD };
      }

      function recalc() {
        const f = form.values();
        const phiT = BT.num(f.phi, 0.95, 0.6, 1.2);
        const phiTol = BT.num(f.phiTol, 0.05, 0.01, 0.2);
        const FT = BT.num(f.force, 80, 30, 180);
        const FTol = BT.num(f.forceTol, 15, 3, 50);
        const TT = BT.num(f.travel, 55, 25, 100);
        const TTol = BT.num(f.travelTol, 12, 3, 30);
        const minD = BT.num(f.minDecel, 1.0, 0.5, 1.5);
        const combos = [];
        MC.forEach(function (mc) {
          FRONT.forEach(function (fc) {
            REAR.forEach(function (rc) {
              const vv = BT.deepClone(v);
              vv.mcD = mc;
              vv.front.pistons = fc.n; vv.front.pistonD = fc.d;
              vv.rear.pistons = rc.n; vv.rear.pistonD = rc.d;
              const e = evaluate(vv);
              const feas = Math.abs(e.d.phi0 - phiT) <= phiTol &&
                Math.abs(e.F05 - FT) <= FTol &&
                Math.abs(e.T05 - TT) <= TTol &&
                e.maxD >= minD;
              const score = Math.abs(e.d.phi0 - phiT) / Math.max(0.01, phiTol) * 1.5 +
                Math.abs(e.F05 - FT) / Math.max(1, FTol) +
                Math.abs(e.T05 - TT) / Math.max(1, TTol) +
                Math.max(0, minD - e.maxD) * 4;
              combos.push({ mc: mc, fc: fc, rc: rc, e: e, feas: feas, score: score });
            });
          });
        });
        combos.sort(function (a, b) { return (a.feas === b.feas ? a.score - b.score : (a.feas ? -1 : 1)); });
        const feasible = combos.filter(function (c) { return c.feas; });
        const best = combos[0];
        const current = evaluate(v);

        kpiHost.innerHTML = '';
        kpiHost.appendChild(BT.kpis([
          ['可行组合', BT.fmt(feasible.length, 0), '/ ' + combos.length, '满足全部目标', feasible.length > 0 ? 'ok' : 'warn'],
          ['当前 φ₀', current.d.phi0.toFixed(3), '', '目标 ' + phiT.toFixed(2) + ' ± ' + phiTol.toFixed(2), Math.abs(current.d.phi0 - phiT) <= phiTol ? 'ok' : 'warn'],
          ['当前 0.5g 踏板力', BT.fmt(current.F05, 0), 'N', '目标 ' + FT.toFixed(0) + ' ± ' + FTol.toFixed(0), Math.abs(current.F05 - FT) <= FTol ? 'ok' : 'warn'],
          ['当前 0.5g 行程', BT.fmt(current.T05, 0), 'mm', '目标 ' + TT.toFixed(0) + ' ± ' + TTol.toFixed(0), Math.abs(current.T05 - TT) <= TTol ? 'ok' : 'warn'],
          ['当前最大减速度', BT.fmt(current.maxD, 2), 'g', '要求 ≥ ' + minD.toFixed(2), current.maxD >= minD ? 'ok' : 'bad']
        ]));

        const infeas = combos.filter(function (c) { return !c.feas; });
        BT.chart(chartHost, {
          xDomain: [0.5, 1.2], yDomain: [0, Math.max(160, FT * 2)],
          xLabel: '同步附着系数 φ₀', yLabel: '0.5g 踏板力（N）',
          xFmt: function (x) { return x.toFixed(2); }, yFmt: function (y) { return y.toFixed(0); },
          series: [
            { name: '不可行', data: infeas.map(function (c) { return [c.e.d.phi0, c.e.F05]; }), color: '#b8c2cd', type: 'points', pointR: 2.2, opacity: .55 },
            { name: '可行', data: feasible.map(function (c) { return [c.e.d.phi0, c.e.F05]; }), color: '#177a52', type: 'points', pointR: 2.8 },
            { name: '当前方案', data: [[current.d.phi0, current.F05]], color: '#c8502a', type: 'points', pointR: 5.5 }
          ],
          lines: [
            { x: phiT - phiTol, color: '#94a3b8' }, { x: phiT + phiTol, color: '#94a3b8' },
            { y: FT - FTol, color: '#94a3b8' }, { y: FT + FTol, color: '#94a3b8' }
          ]
        });

        const rows = [];
        combos.slice(0, 12).forEach(function (c, i) {
          rows.push([
            i + 1,
            'φ' + c.mc.toFixed(2),
            c.fc.n + '×φ' + c.fc.d,
            c.rc.n + '×φ' + c.rc.d,
            c.e.d.beta.toFixed(3),
            c.e.d.phi0.toFixed(3),
            c.e.F05.toFixed(0),
            c.e.T05.toFixed(0),
            c.e.maxD.toFixed(2),
            c.feas ? { text: '可行', cls: 'ok' } : { text: '—', cls: '' },
            BT.el('button', {
              class: 'btn subtle', type: 'button', text: '应用',
              onclick: function () {
                BT.vehicle.mcD = c.mc;
                BT.vehicle.front.pistons = c.fc.n; BT.vehicle.front.pistonD = c.fc.d;
                BT.vehicle.rear.pistons = c.rc.n; BT.vehicle.rear.pistonD = c.rc.d;
                BT.saveVehicle();
                BT.toast('已应用方案：φ' + c.mc.toFixed(2) + ' / ' + c.fc.n + '×φ' + c.fc.d + ' / ' + c.rc.n + '×φ' + c.rc.d);
                if (BT.renderCurrent) BT.renderCurrent();
              }
            })
          ]);
        });
        tableHost.innerHTML = '';
        tableHost.appendChild(BT.panel('推荐方案（前 12）', [
          BT.table(['#', '主缸', '前卡钳', '后卡钳', 'β', 'φ₀', '0.5g N', '0.5g mm', 'max g', '状态', ''], rows, {
            caption: '按综合偏差排序', captionRight: '可行 ' + feasible.length + ' 组'
          }),
          BT.note('“应用”会直接写入整车参数并刷新全部模块；建议先保存当前项目，便于方案回退。', 'warn')
        ]));
      }
      form.onChange = BT.debounce(recalc, 80);
      recalc();
    }
  });
})(window.BT);
