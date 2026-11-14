/* ============================================================
   模块：制动器力矩与夹紧力
   ============================================================ */
(function (BT) {
  'use strict';
  BT.modules = BT.modules || [];

  BT.modules.push({
    id: 'torque',
    group: '零部件开发',
    name: '制动器力矩',
    icon: 'disc',
    desc: '卡钳夹紧力、轮端制动力与压力增益',
    render: function (root) {
      const v = BT.vehicle, d = BT.derived(v);
      root.appendChild(BT.pageHead('BRAKE TORQUE', '制动器力矩与夹紧力', '由卡钳单侧活塞面积、摩擦系数与有效半径计算轮端制动力矩，并换算为整车制动力与减速度。用于卡钳/制动盘方案快速估算。', [
        BT.el('span', { class: 'badge info' }, [BT.el('i', { class: 'dot' }), document.createTextNode('β ' + d.beta.toFixed(3) + ' · φ₀ ' + d.phi0.toFixed(2))])
      ]));

      root.appendChild(BT.beginnerCard({
        title: '卡钳怎么把一脚刹车变成力矩？',
        svg: BT.diagram('torque'),
        principle: '液压推动活塞，活塞夹紧两片摩擦片，摩擦在盘面上形成制动力矩。',
        steps: [
          'T = 2·μ·p·A·Re：系数 2 代表内外两片摩擦片。',
          'p 是轮端压力，不是主缸压力；A 是单侧活塞总面积。',
          'Re 是摩擦合力作用半径，不是制动盘外径。'
        ],
        mistake: '把盘半径当 Re，力矩会明显高估；把主缸压力当轮端压力也会高估。',
        grade: 'A'
      }));

      const side = [];
      const p = BT.el('section', { class: 'panel' });
      p.appendChild(BT.el('div', { class: 'panel-head' }, [BT.el('h3', { text: '工况输入' })]));
      const body = BT.el('div', { class: 'panel-body' });
      body.appendChild(BT.vehStrip(v));
      const form = new BT.Form(body, 'torque');
      form.section('计算方式');
      form.select('mode', '模式', 'pressure', [
        { value: 'pressure', label: '指定轮端压力' },
        { value: 'decel', label: '指定目标减速度' }
      ]);
      form.num('pressure', '轮端压力', 6.0, 'MPa', { step: 0.1, min: 0.1, max: 20 });
      form.num('targetDecel', '目标减速度', 0.8, 'g', { step: 0.01, min: 0.05, max: 1.4 });
      p.appendChild(body);
      side.push(p);

      side.push(BT.panel('计算假设', [
        BT.el('div', { class: 'stack' }, [
          BT.note('单卡钳力矩：<b>T = 2·μ·p·A·R<sub>e</sub></b>。A 为单侧活塞总面积（浮钳取活塞侧面积），系数 2 代表两侧摩擦片；忽略拖滞、滚阻与制动力衰退。', 'info'),
          BT.note('轮端制动力 <b>F = 2T / r</b>（每轴两个车轮）。实际车辆还受 ABS 调节、悬架变形、摩擦副温升与盘面磨损影响，本页用于方案对比而非认证计算。', 'warn')
        ])
      ]));

      const kpiHost = BT.el('div');
      const chartHost = BT.el('div');
      const tableHost = BT.el('div');
      const main = [kpiHost, BT.chartCard('制动力 vs 轮端压力', '前/后轴及整车制动力；水平虚线为目标减速度所需制动力', chartHost), tableHost];
      root.appendChild(BT.workbench(side, main));

      function recalc() {
        const f = form.values();
        const targetDecel = BT.num(f.targetDecel, 0.8, 0.05, 1.4);
        const pReqTarget = BT.pressureForDecel(targetDecel, v);
        const pWork = f.mode === 'decel' ? pReqTarget : BT.num(f.pressure, 6.0, 0.05, 20);
        const b = BT.brakeForceAtPressure(pWork, v);
        const tauF = BT.torquePerMPa(v.front) * pWork;
        const tauR = BT.torquePerMPa(v.rear) * pWork;
        const clampF = pWork * BT.areaCaliper(v.front);
        const clampR = pWork * BT.areaCaliper(v.rear);
        const reqForce = targetDecel * v.mass * BT.g;

        kpiHost.innerHTML = '';
        kpiHost.appendChild(BT.kpis([
          ['前轮制动力矩', BT.fmt(tauF, 0), 'N·m', '单轮 @ ' + pWork.toFixed(2) + ' MPa', 'accent'],
          ['后轮制动力矩', BT.fmt(tauR, 0), 'N·m', '单轮 @ ' + pWork.toFixed(2) + ' MPa'],
          ['前卡钳夹紧力', BT.fmt(clampF / 1000, 1), 'kN', '单卡钳'],
          ['整车制动力', BT.fmt(b.total / 1000, 1), 'kN', '需求 ' + BT.fmt(reqForce / 1000, 1) + ' kN'],
          ['等效减速度', BT.fmt(b.decel, 2) + ' g', '', '目标 ' + targetDecel.toFixed(2) + ' g', b.decel >= targetDecel ? 'ok' : 'warn']
        ]));

        const seriesF = [], seriesR = [], seriesT = [];
        for (let pp = 0; pp <= v.maxPressure + 1e-9; pp += Math.max(0.25, v.maxPressure / 24)) {
          const bb = BT.brakeForceAtPressure(pp, v);
          seriesF.push([pp, bb.ff / 1000]); seriesR.push([pp, bb.fr / 1000]); seriesT.push([pp, bb.total / 1000]);
        }
        BT.chart(chartHost, {
          xDomain: [0, v.maxPressure], yDomain: [0, Math.max(10, Math.ceil(BT.brakeForceAtPressure(v.maxPressure, v).total / 1000 / 5) * 5)],
          xLabel: '轮端压力（MPa）', yLabel: '制动力（kN）',
          series: [
            { name: '前轴', data: seriesF, color: '#c8502a', width: 2.1 },
            { name: '后轴', data: seriesR, color: '#17657f', width: 2.1 },
            { name: '整车', data: seriesT, color: '#16202b', width: 2.4 },
            { name: '当前工况', data: [[pWork, b.total / 1000]], color: '#a86412', type: 'points', pointR: 4 }
          ],
          lines: [{ y: reqForce / 1000, label: '目标 ' + targetDecel.toFixed(2) + 'g 需求', color: '#b42318' }]
        });

        const rows = [];
        [0.5, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].forEach(function (pp) {
          if (pp > v.maxPressure + 0.01) return;
          const bb = BT.brakeForceAtPressure(pp, v);
          rows.push([
            pp.toFixed(1), BT.fmt(BT.torquePerMPa(v.front) * pp, 0), BT.fmt(BT.torquePerMPa(v.rear) * pp, 0),
            BT.fmt(bb.ff / 1000, 2), BT.fmt(bb.fr / 1000, 2), BT.fmt(bb.total / 1000, 2), BT.fmt(bb.decel, 3)
          ]);
        });
        tableHost.innerHTML = '';
        tableHost.appendChild(BT.panel('压力—力矩—减速度表', [
          BT.table(['压力 MPa', '前轮 N·m', '后轮 N·m', '前轴 kN', '后轴 kN', '整车 kN', '减速度 g'], rows, {
            caption: '设计 β = ' + d.beta.toFixed(3), captionRight: '系统最高压力 ' + v.maxPressure.toFixed(1) + ' MPa'
          }),
          BT.el('div', { style: { marginTop: '11px' } }, [
            BT.checkRow('info', '0.5 g 工况', '需求压力约 ' + BT.pressureForDecel(0.5, v).toFixed(2) + ' MPa，对应踏板力约 ' +
              BT.pedalForceForPressure(BT.pressureForDecel(0.5, v), v).toFixed(0) + ' N。'),
            BT.checkRow('info', '最大能力', '系统最高压力下整车制动力 ' + BT.fmt(BT.brakeForceAtPressure(v.maxPressure, v).total / 1000, 1) +
              ' kN，等效 ' + BT.fmt(BT.maxDecel(v), 2) + ' g。')
          ])
        ]));
      }
      form.onChange = BT.debounce(recalc, 50);
      recalc();
    }
  });
})(window.BT);
