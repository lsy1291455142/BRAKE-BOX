/* ============================================================
   模块：整车制动动力学与轴荷转移
   ============================================================ */
(function (BT) {
  'use strict';
  BT.modules = BT.modules || [];

  BT.modules.push({
    id: 'dynamics',
    group: '整车性能',
    name: '动力学与轴荷',
    icon: 'scale',
    desc: '轴荷转移、理想制动力分配与利用附着系数',
    render: function (root) {
      const v = BT.vehicle, d = BT.derived(v);
      root.appendChild(BT.pageHead('VEHICLE DYNAMICS', '整车制动动力学', '由轴距、质心高度和前轴静态荷计算动态轴荷、理想前制动力占比与附着利用率。适用于方案阶段的分配趋势判断。', [
        BT.el('span', { class: 'badge info' }, [BT.el('i', { class: 'dot' }), document.createTextNode('设计 β ' + d.beta.toFixed(3))])
      ]));

      root.appendChild(BT.beginnerCard({
        title: '制动时，车为什么会“点头”？',
        svg: BT.diagram('loadTransfer'),
        principle: '制动减速度让载荷从后轴向前轴转移。质心越高、轴距越短，转移越明显。',
        steps: [
          '先看 h/L：它决定同样减速度下前轴多增加多少载荷。',
          '动态前轴荷 = 静态前轴荷 + m·a·h/L。',
          'I 曲线给出理想前制动力占比；设计 β 线给出实际值。'
        ],
        mistake: '把静态 59% 当成制动时的前轴荷；0.8g 时可能已经到 74%。',
        grade: 'A'
      }));

      const side = [];
      const formPanel = BT.el('section', { class: 'panel' });
      formPanel.appendChild(BT.el('div', { class: 'panel-head' }, [BT.el('h3', { text: '计算工况' })]));
      const body = BT.el('div', { class: 'panel-body' });
      body.appendChild(BT.vehStrip(v));
      const form = new BT.Form(body, 'dynamics');
      form.section('输入');
      form.num('z', '目标减速度', 0.8, 'g', { step: 0.01, min: 0.05, max: 1.3, hint: '1 g = 9.80665 m/s²' });
      form.num('massExtra', '附加载荷', 0, 'kg', { step: 10, min: 0, hint: '乘员 / 行李等，叠加到整备质量' });
      form.num('hExtra', '质心高度变化', 0, 'mm', { step: 5, hint: '载荷导致质心上移为正' });
      formPanel.appendChild(body);
      side.push(formPanel);

      const note = BT.panel('模型说明', [
        BT.el('div', { class: 'stack' }, [
          BT.note('动态轴荷：<b>F<sub>zf</sub> = mg·(s<sub>f</sub> + z·h/L)</b>，<b>F<sub>zr</sub> = mg·(1−s<sub>f</sub>−z·h/L)</b>。其中 s<sub>f</sub> 为前轴静态荷比例，z 为减速度（g）。', 'info'),
          BT.el('p', { class: 'small muted', style: { margin: 0 }, html: '理想分配要求前后轮同时抱死，即各轴利用附着系数均等于 z。固定 β 的制动系统只能在某一 φ₀ 处同时抱死，因此实际工程需要在稳定性、制动距离与踏板感之间取折中。' })
        ])
      ]);
      side.push(note);

      const kpiHost = BT.el('div');
      const chartHost = BT.el('div');
      const tableHost = BT.el('div');
      const utilHost = BT.el('div');
      const main = [kpiHost, BT.chartCard('理想前制动力占比 vs 减速度', 'I 曲线与固定 β 设计线；交点对应同步附着系数 φ₀', chartHost), utilHost, tableHost];

      root.appendChild(BT.workbench(side, main));

      function recalc() {
        const f = form.values();
        const vv = BT.deepClone(v);
        const massExtra = Math.max(0, BT.finite(f.massExtra, 0));
        const hExtra = BT.finite(f.hExtra, 0);
        vv.mass = Math.max(1, v.mass + massExtra);
        vv.h = Math.max(100, v.h + hExtra);
        const z = BT.clamp(BT.finite(f.z, 0.8), 0.01, 1.3);
        const dd = BT.derived(vv);
        const loads = BT.axleLoads(z, vv);
        const ideal = BT.idealFrontShare(z, vv);
        const util = BT.utilization(dd.beta, z, vv);
        const transfer = vv.mass * z * BT.g * vv.h / vv.L;
        const phi0 = dd.phi0;

        kpiHost.innerHTML = '';
        kpiHost.appendChild(BT.kpis([
          ['前轴动态载荷', BT.fmt(loads.front / 1000, 1), 'kN', '静态 ' + BT.fmt(vv.mass * BT.g * vv.frontShare / 100 / 1000, 1) + ' kN'],
          ['后轴动态载荷', BT.fmt(loads.rear / 1000, 1), 'kN', '静态 ' + BT.fmt(vv.mass * BT.g * (1 - vv.frontShare / 100) / 1000, 1) + ' kN'],
          ['轴荷转移量', BT.fmt(transfer / 1000, 1), 'kN', '前增后减'],
          ['理想前制动力占比', BT.fmt(ideal * 100, 1), '%', 'z = ' + z.toFixed(2) + ' g'],
          ['设计 β / φ₀', dd.beta.toFixed(3) + ' / ' + phi0.toFixed(2), '', 'β 由前后制动器参数计算', phi0 >= 0.85 && phi0 <= 1.05 ? 'ok' : 'warn']
        ]));

        const zs = [];
        for (let zz = 0; zz <= 1.001; zz += 0.02) zs.push([zz, BT.idealFrontShare(zz, vv)]);
        BT.chart(chartHost, {
          xDomain: [0, 1.1], yDomain: [0, 1],
          xLabel: '减速度 z（g）', yLabel: '前制动力占比',
          xFmt: function (x) { return x.toFixed(1); }, yFmt: function (y) { return (y * 100).toFixed(0) + '%'; },
          series: [
            { name: '理想分配（I 曲线）', data: zs, color: '#17657f', width: 2.2 },
            { name: '设计 β 线', data: [[0, dd.beta], [1.1, dd.beta]], color: '#c8502a', width: 1.8, dash: '5 4' },
            { name: '当前工况', data: [[z, ideal]], color: '#16202b', type: 'points', pointR: 4.2 },
            { name: 'φ₀ 交点', data: [[phi0, dd.beta]], color: '#a86412', type: 'points', pointR: 3.4 }
          ],
          lines: [{ x: z, label: 'z=' + z.toFixed(2), color: '#667085' }]
        });

        const rows = [];
        [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0].forEach(function (zz) {
          const ld = BT.axleLoads(zz, vv);
          const ut = BT.utilization(dd.beta, zz, vv);
          rows.push([
            zz.toFixed(1),
            BT.fmt(ld.front / 1000, 2),
            BT.fmt(ld.rear / 1000, 2),
            (BT.idealFrontShare(zz, vv) * 100).toFixed(1) + '%',
            (ut.front).toFixed(3),
            (ut.rear).toFixed(3),
            { text: zz <= phi0 ? '前轮先抱' : '后轮先抱', cls: zz <= phi0 ? 'ok' : 'bad' }
          ]);
        });
        tableHost.innerHTML = '';
        tableHost.appendChild(BT.panel('分配特性表', [
          BT.table(['z (g)', '前轴 kN', '后轴 kN', '理想前占比', 'f 前', 'f 后', '抱死顺序'], rows, { caption: '动态载荷与利用附着系数', captionRight: '按设计 β = ' + dd.beta.toFixed(3) })
        ]));

        utilHost.innerHTML = '';
        const margin = ideal - dd.beta;
        utilHost.appendChild(BT.panel('快速判断', [
          BT.el('div', { class: 'checklist' }, [
            BT.checkRow(Math.abs(margin) <= 0.02 ? 'pass' : 'warn', '目标工况分配偏差',
              '理想前占比 ' + BT.pct(ideal) + '，设计 β ' + BT.pct(dd.beta) + '，差值 ' + BT.sign(margin * 100, 1) + ' 个百分点。' +
              (Math.abs(margin) <= 0.02 ? ' 接近理想分配。' : margin < 0 ? ' β 偏低，后轴利用率更高，湿滑路面倾向于后轮先抱死。' : ' β 偏高，前轴利用率更高，制动距离可能偏长。')),
            BT.checkRow(phi0 >= 0.85 && phi0 <= 1.05 ? 'pass' : 'warn', '同步附着系数 φ₀ = ' + phi0.toFixed(2),
              phi0 < 0.85 ? '偏低：中等附着路面就可能出现后轮先抱死，需提高 β 或降低质心/轴距比。' : phi0 > 1.05 ? '偏高：常规路面始终前轮先抱死，稳定性好但前轴负担重。' : '处于乘用车常用设计区间（约 0.85–1.05）。'),
            BT.checkRow('info', '载荷敏感性', '附加 ' + BT.fmt(massExtra, 0) + ' kg、质心 ' + BT.sign(hExtra, 0) + ' mm 时，φ₀ 变为 ' + phi0.toFixed(3) + '。')
          ])
        ]));
      }
      form.onChange = BT.debounce(recalc, 60);
      recalc();
    }
  });
})(window.BT);
