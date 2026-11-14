/* ============================================================
   模块：踏板感与液压匹配
   ============================================================ */
(function (BT) {
  'use strict';
  BT.modules = BT.modules || [];

  BT.modules.push({
    id: 'pedal',
    group: '零部件开发',
    name: '踏板感与液压',
    icon: 'pedal',
    desc: '踏板力—减速度、行程与助力器工作点',
    render: function (root) {
      const v = BT.vehicle, d = BT.derived(v);
      root.appendChild(BT.pageHead('PEDAL FEEL', '踏板感与液压匹配', '基于助力器折线特性、主缸面积、卡钳需液量与系统柔度，估算踏板力—减速度、踏板行程—减速度曲线。用于助力器/主缸/卡钳的方案匹配。', [
        BT.el('span', { class: 'badge info' }, [BT.el('i', { class: 'dot' }), document.createTextNode('主缸 φ' + BT.fmt(v.mcD, 2) + ' mm')])
      ]));

      root.appendChild(BT.beginnerCard({
        title: '为什么有的车“一踩就有”，有的很“虚”？',
        svg: BT.diagram('pedal'),
        principle: '踏板力经杠杆和助力器放大，推动主缸，把制动液送到卡钳；踏板力和行程共同决定脚感。',
        steps: [
          '踏板力 × 杠杆比 × 助力比 ≈ 推杆力，推杆力除以主缸面积得到压力。',
          '主缸越细：压力越高、踏板行程越长；主缸越粗则相反。',
          '卡钳需液量、软管膨胀、摩擦片压缩决定行程，不能只看踏板力。'
        ],
        mistake: '只改主缸想改 β。主缸不改变前后分配，只改变压力与行程；β 由前后制动器决定。',
        grade: 'C'
      }));

      const side = [];
      const p = BT.el('section', { class: 'panel' });
      p.appendChild(BT.el('div', { class: 'panel-head' }, [BT.el('h3', { text: '目标与方案调整' })]));
      const body = BT.el('div', { class: 'panel-body' });
      body.appendChild(BT.vehStrip(v));
      const form = new BT.Form(body, 'pedal');
      form.section('踏板感目标');
      form.num('fTarget', '0.5g 目标踏板力', 80, 'N', { step: 1, min: 20, max: 200 });
      form.num('tTarget', '0.5g 目标行程', 55, 'mm', { step: 1, min: 20, max: 120 });
      form.section('方案调整（不改整车基准）');
      form.num('mcOverride', '主缸直径覆盖', 0, 'mm', { step: 0.01, min: 0, max: 40, hint: '0 = 使用整车参数' });
      form.num('boostFactor', '助力比系数', 1.0, '—', { step: 0.05, min: 0.5, max: 1.5, hint: '1.0 = 使用整车参数' });
      p.appendChild(body);
      side.push(p);

      side.push(BT.panel('模型边界', [
        BT.el('div', { class: 'stack' }, [
          BT.note('助力器按<b>折线特性</b>简化：低于起始踏板力时助力比 1，高于后按额定助力比放大，并受最大助力限制；未建模真空度变化、迟滞与踏板回位弹簧。', 'info'),
          BT.note('行程按<b>间隙 + 卡钳轴向柔度 + 管路膨胀</b>估算：x = x₀ + F/K，V = ΣA·x + C·p，踏板行程 = (V/A<sub>mc</sub>)·i + 空行程。摩擦片压缩与软管鼓胀需用实测柔度修正。', 'warn'),
          BT.el('p', { class: 'small muted', style: { margin: 0 }, html: '本页用于比较主缸直径、助力比、卡钳面积对踏板感的影响趋势；最终踏板感需以实车/台架客观测量（踏板力—减速度—行程—迟滞）为准。' })
        ])
      ]));

      const kpiHost = BT.el('div');
      const forceChart = BT.el('div');
      const travelChart = BT.el('div');
      const checksHost = BT.el('div');
      const tableHost = BT.el('div');
      const main = [kpiHost,
        BT.el('div', { class: 'split-2' }, [
          BT.chartCard('踏板力—减速度', '目标带为 0.5g 目标力 ±15%', forceChart),
          BT.chartCard('踏板行程—减速度', '0.5g 目标行程 ±10 mm', travelChart)
        ]),
        checksHost, tableHost];
      root.appendChild(BT.workbench(side, main));

      function recalc() {
        const f = form.values();
        const vv = BT.deepClone(v);
        const boostFactor = BT.num(f.boostFactor, 1, 0.3, 1.5);
        const mcOverride = BT.num(f.mcOverride, 0, 0, 40);
        vv.boost = v.boost * boostFactor;
        if (mcOverride > 0) vv.mcD = mcOverride;
        const dd = BT.derived(vv);

        const ptsF = [], ptsT = [];
        for (let z = 0; z <= 1.2 + 1e-9; z += 0.025) {
          const pr = BT.pressureForDecel(z, vv);
          ptsF.push([z, BT.pedalForceForPressure(pr, vv)]);
          ptsT.push([z, BT.pedalTravelAtPressure(pr, vv)]);
        }
        const p05 = BT.pressureForDecel(0.5, vv);
        const F05 = BT.pedalForceForPressure(p05, vv);
        const T05 = BT.pedalTravelAtPressure(p05, vv);
        const p10 = BT.pressureForDecel(1.0, vv);
        const F10 = BT.pedalForceForPressure(p10, vv);
        const T10 = BT.pedalTravelAtPressure(p10, vv);
        const gain = (BT.pedalTravelAtPressure(BT.pressureForDecel(0.55, vv), vv) -
          BT.pedalTravelAtPressure(BT.pressureForDecel(0.45, vv), vv)) / 0.1;
        const targetF = BT.num(f.fTarget, 80, 20, 200);
        const targetT = BT.num(f.tTarget, 55, 20, 120);

        kpiHost.innerHTML = '';
        kpiHost.appendChild(BT.kpis([
          ['0.5g 踏板力', BT.fmt(F05, 0), 'N', '目标 ' + targetF.toFixed(0) + ' N', Math.abs(F05 - targetF) <= targetF * 0.15 ? 'ok' : 'warn'],
          ['0.5g 踏板行程', BT.fmt(T05, 0), 'mm', '目标 ' + targetT.toFixed(0) + ' mm', Math.abs(T05 - targetT) <= 10 ? 'ok' : 'warn'],
          ['0.5g 轮端压力', BT.fmt(p05, 2), 'MPa', '0.5g 需求'],
          ['踏板增益', BT.fmt(gain, 0), 'mm/g', '0.45–0.55g 割线'],
          ['1g 踏板力', BT.fmt(F10, 0), 'N', '行程 ' + BT.fmt(T10, 0) + ' mm', F10 <= 250 ? 'ok' : 'bad']
        ]));

        BT.chart(forceChart, {
          height: 270, xDomain: [0, 1.2], yDomain: [0, Math.max(140, Math.ceil(Math.max(F10, F05) * 1.25 / 20) * 20)],
          xLabel: '减速度（g）', yLabel: '踏板力（N）',
          xFmt: function (x) { return x.toFixed(1); }, yFmt: function (y) { return y.toFixed(0); },
          bands: [{ x1: 0.4, x2: 0.6, y1: Math.max(0, targetF * 0.85), y2: targetF * 1.15, color: 'rgba(23,101,127,.10)', label: '0.5g 目标带' }],
          series: [
            { name: '踏板力', data: ptsF, color: '#c8502a', width: 2.2 },
            { name: '0.5g 工况', data: [[0.5, F05]], color: '#16202b', type: 'points', pointR: 4 }
          ],
          lines: [{ x: 0.5, color: '#667085' }]
        });
        BT.chart(travelChart, {
          height: 270, xDomain: [0, 1.2], yDomain: [0, Math.max(90, Math.ceil(Math.max(T10, T05) * 1.25 / 10) * 10)],
          xLabel: '减速度（g）', yLabel: '踏板行程（mm）',
          xFmt: function (x) { return x.toFixed(1); }, yFmt: function (y) { return y.toFixed(0); },
          bands: [{ x1: 0.4, x2: 0.6, y1: Math.max(0, targetT - 10), y2: targetT + 10, color: 'rgba(23,101,127,.10)', label: '0.5g 目标带' }],
          series: [
            { name: '踏板行程', data: ptsT, color: '#17657f', width: 2.2 },
            { name: '0.5g 工况', data: [[0.5, T05]], color: '#16202b', type: 'points', pointR: 4 }
          ],
          lines: [{ x: 0.5, color: '#667085' }]
        });

        const fTone = Math.abs(F05 - targetF) <= targetF * 0.15 ? 'pass' : 'warn';
        const tTone = Math.abs(T05 - targetT) <= 10 ? 'pass' : 'warn';
        checksHost.innerHTML = '';
        checksHost.appendChild(BT.panel('踏板感校核', [
          BT.el('div', { class: 'checklist' }, [
            BT.checkRow(fTone, '0.5g 踏板力 ' + F05.toFixed(0) + ' N',
              '目标 ' + targetF.toFixed(0) + ' N，偏差 ' + BT.sign(F05 - targetF, 0) + ' N（' + BT.sign((F05 / targetF - 1) * 100, 1) + '%）。'),
            BT.checkRow(tTone, '0.5g 踏板行程 ' + T05.toFixed(0) + ' mm',
              '目标 ' + targetT.toFixed(0) + ' mm，偏差 ' + BT.sign(T05 - targetT, 0) + ' mm。'),
            BT.checkRow(gain >= 45 && gain <= 115 ? 'pass' : 'warn', '踏板增益 ' + gain.toFixed(0) + ' mm/g',
              '乘用车常用约 45–115 mm/g。增益过大易“踩空”，过小则踏板偏硬、行程不足。'),
            BT.checkRow(F10 <= 250 ? 'pass' : 'warn', '1g 踏板力 ' + F10.toFixed(0) + ' N',
              '乘用车 1g 常用 120–250 N；超过 250 N 时紧急制动踏板力偏大。'),
            BT.checkRow('info', '助力器工作点', '0.5g 时推杆力约 ' + (p05 * BT.areaMC(vv)).toFixed(0) + ' N，主缸压力 ' + p05.toFixed(2) +
              ' MPa；助力比系数 ' + boostFactor.toFixed(2) + (mcOverride > 0 ? '，主缸覆盖 φ' + mcOverride.toFixed(2) + ' mm' : '') + '。')
          ])
        ]));

        const rows = [];
        [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0].forEach(function (z) {
          const pr = BT.pressureForDecel(z, vv);
          const ff = BT.pedalForceForPressure(pr, vv);
          const tt = BT.pedalTravelAtPressure(pr, vv);
          const bb = BT.brakeForceAtPressure(pr, vv);
          rows.push([z.toFixed(1), pr.toFixed(2), ff.toFixed(0), tt.toFixed(1), BT.fmt(bb.total / 1000, 1), (ff / z).toFixed(0), z === 0.5 ? { text: '目标' + targetF.toFixed(0) + 'N', cls: Math.abs(ff - targetF) <= targetF * 0.15 ? 'ok' : 'bad' } : '']);
        });
        tableHost.innerHTML = '';
        tableHost.appendChild(BT.panel('踏板感明细', [
          BT.table(['z (g)', '压力 MPa', '踏板力 N', '行程 mm', '整车制动力 kN', '力/减速度 N/g', '0.5g 目标'], rows, {
            caption: '助力比 ' + vv.boost.toFixed(1) + ' · 主缸 φ' + vv.mcD.toFixed(2) + ' mm',
            captionRight: '踏板杠杆比 ' + vv.pedalRatio.toFixed(2)
          })
        ]));
      }
      form.onChange = BT.debounce(recalc, 50);
      recalc();
    }
  });
})(window.BT);
