/* ============================================================
   模块：摩擦副与磨损寿命
   ============================================================ */
(function (BT) {
  'use strict';
  BT.modules = BT.modules || [];

  BT.modules.push({
    id: 'friction',
    group: '零部件开发',
    name: '摩擦副校核',
    icon: 'pad',
    desc: '单位压力、面能量、热态 μ 与磨损寿命',
    render: function (root) {
      const v = BT.vehicle, d = BT.derived(v);
      root.appendChild(BT.pageHead('FRICTION PAIR', '摩擦副与磨损寿命', '校核单片摩擦片单位压力、单片面能量、热态摩擦系数与磨损寿命，用于摩擦片配方/面积/厚度及制动盘热负荷的初步筛选。', [
        BT.el('span', { class: 'badge info' }, [BT.el('i', { class: 'dot' }), document.createTextNode('前片 ' + BT.fmt(v.front.padArea, 0) + ' cm²')])
      ]));

      root.appendChild(BT.beginnerCard({
        title: '摩擦片为什么不是一块“橡皮”？',
        svg: BT.diagram('friction'),
        principle: '摩擦系数会随压力、速度、温度变化；磨损也不是简单的线性关系。',
        steps: [
          '单位压力看会不会压碎、偏磨或产生噪声。',
          '单片摩擦片面能量看热冲击；每个前轮有两片，能量要分摊。',
          '热态 μ 看衰退；用常温 μ 算高温制动会高估制动力。'
        ],
        mistake: '把“单轮摩擦片面积”当成内外片合计，或者把单片面能量算成整轮能量；口径差一倍。',
        grade: 'B'
      }));

      const side = [];
      const p = BT.el('section', { class: 'panel' });
      p.appendChild(BT.el('div', { class: 'panel-head' }, [BT.el('h3', { text: '输入' })]));
      const body = BT.el('div', { class: 'panel-body' });
      body.appendChild(BT.vehStrip(v));
      const form = new BT.Form(body, 'friction');
      form.section('工况');
      form.num('pRef', '参考轮端压力', 7.0, 'MPa', { step: 0.1, min: 0.5, max: 16 });
      form.num('speed', '单次制动初速度', 100, 'km/h', { step: 1, min: 20, max: 220 });
      form.section('摩擦片');
      form.num('padThk', '单片摩擦材料厚度', v.front.padThk, 'mm', { step: 0.1, min: 2, max: 25 });
      form.num('minThk', '极限剩余厚度', 2.0, 'mm', { step: 0.1, min: 0.5, max: 8 });
      form.num('wearRate', '磨损率', 2.5, 'mm/万 km', { step: 0.1, min: 0.2, max: 15, hint: '按配方与使用工况实测' });
      form.num('hotRatio', '热态 μ 保持率', 0.85, '—', { step: 0.01, min: 0.4, max: 1.0, hint: '热态 μ / 常温 μ' });
      form.num('annual', '年行驶里程', 15000, 'km', { step: 1000, min: 1000, max: 100000 });
      form.num('energyLimit', '面能量参考上限', 45, 'J/mm²', { step: 1, min: 5, max: 100, hint: '按摩擦材料等级设定' });
      p.appendChild(body);
      side.push(p);

      side.push(BT.panel('计算说明', [
        BT.el('div', { class: 'stack' }, [
          BT.note('单位压力 <b>p<sub>pad</sub> = p·A<sub>cal</sub> / A<sub>pad</sub></b>；单片摩擦片面能量 <b>e = (½mv²·β/2) / (2·A<sub>pad</sub>)</b>。每个前轮有内外两片，能量按两片分摊。', 'info'),
          BT.note('摩擦系数、磨损率与热衰退强依赖配方、温度、压力与速度历史。本页的“热态保持率”是单点折减，不能替代 SAE J2522 / J2707 等台架试验。', 'warn'),
          BT.el('p', { class: 'small muted', style: { margin: 0 }, html: '典型乘用车单片单位压力约 1–3.5 MPa；100→0 km/h 单片摩擦片面能量约 15–40 J/mm²。超出区间时应复核单片面积、卡钳活塞面积与盘径。' })
        ])
      ]));

      const kpiHost = BT.el('div');
      const chartHost = BT.el('div');
      const checkHost = BT.el('div');
      const tableHost = BT.el('div');
      const main = [kpiHost, BT.chartCard('单片摩擦片面能量 vs 初速度', '每个前轮两块片，能量按单片面积分摊；虚线为参考上限', chartHost), checkHost, tableHost];
      root.appendChild(BT.workbench(side, main));

      function recalc() {
        const f = form.values();
        const pRef = BT.num(f.pRef, 7, 0.5, 16);
        const speed = BT.num(f.speed, 100, 20, 220);
        const padThk = BT.num(f.padThk, v.front.padThk, 2, 25);
        const minThk = BT.num(f.minThk, 2, 0.5, 8);
        const wearRate = BT.num(f.wearRate, 2.5, 0.2, 15);
        const hotRatio = BT.num(f.hotRatio, 0.85, 0.4, 1);
        const annual = BT.num(f.annual, 15000, 1000, 100000);
        const energyLimit = BT.num(f.energyLimit, 45, 5, 100);
        const A_pad = v.front.padArea * 100; // mm2, one pad (single side)
        const Fclamp = pRef * BT.areaCaliper(v.front);
        const unitP = A_pad > 0 ? Fclamp / A_pad : 0;
        const v0 = speed / 3.6;
        const E = BT.kineticEnergy(v.mass, v0);
        // one front wheel has two pads; each pad absorbs about half of the wheel energy
        const ePad = A_pad > 0 ? E * d.beta / 2 / (2 * A_pad) : 0; // J/mm2 per single pad
        const hotMu = v.front.mu * hotRatio;
        const lifeKm = Math.max(0, (padThk - minThk)) / Math.max(0.1, wearRate) * 10000;
        const years = lifeKm / Math.max(1000, annual);
        const torqueHot = 2 * hotMu * BT.areaCaliper(v.front) * v.front.re / 1000 * pRef;
        const decelHot = v.wheelR > 0 && v.mass > 0 ? 2 * (torqueHot + BT.torquePerMPa(v.rear) * pRef) / (v.wheelR / 1000) / (v.mass * BT.g) : 0;

        kpiHost.innerHTML = '';
        kpiHost.appendChild(BT.kpis([
          ['摩擦片单位压力', BT.fmt(unitP, 2), 'MPa', '@ ' + pRef.toFixed(1) + ' MPa 轮端', unitP >= 1 && unitP <= 3.5 ? 'ok' : 'warn'],
          ['单片摩擦片面能量', BT.fmt(ePad, 1), 'J/mm²', speed.toFixed(0) + '→0 km/h', ePad <= energyLimit ? 'ok' : 'bad'],
          ['热态摩擦系数', BT.fmt(hotMu, 3), '—', '常温 ' + v.front.mu.toFixed(2) + ' × ' + hotRatio.toFixed(2), hotMu >= 0.3 ? 'ok' : 'bad'],
          ['磨损寿命', BT.fmt(lifeKm / 10000, 1), '万 km', '约 ' + years.toFixed(1) + ' 年', lifeKm >= 30000 ? 'ok' : 'warn'],
          ['热态 1MPa 减速度', BT.fmt(decelHot, 3), 'g/MPa', '含后轴贡献'],
        ]));

        const eCurve = [];
        for (let sp = 30; sp <= 160; sp += 5) {
          const ee = BT.kineticEnergy(v.mass, sp / 3.6) * d.beta / 2 / (2 * A_pad);
          eCurve.push([sp, ee]);
        }
        BT.chart(chartHost, {
          xDomain: [30, 160], yDomain: [0, Math.max(energyLimit * 1.2, ePad * 1.2)],
          xLabel: '初速度（km/h）', yLabel: '单片摩擦片面能量（J/mm²）',
          xFmt: function (x) { return x.toFixed(0); }, yFmt: function (y) { return y.toFixed(0); },
          series: [
            { name: '单片摩擦片面能量', data: eCurve, color: '#c8502a', width: 2.2 },
            { name: '当前工况', data: [[speed, ePad]], color: '#16202b', type: 'points', pointR: 4 }
          ],
          lines: [{ y: energyLimit, label: '参考上限 ' + energyLimit.toFixed(0) + ' J/mm²', color: '#b42318' }]
        });

        checkHost.innerHTML = '';
        checkHost.appendChild(BT.panel('校核结果', [
          BT.el('div', { class: 'checklist' }, [
            BT.checkRow(unitP >= 1 && unitP <= 3.5 ? 'pass' : 'warn', '单位压力 ' + unitP.toFixed(2) + ' MPa',
              unitP < 1 ? '偏低：摩擦片面积偏大或活塞面积偏小，制动响应可能偏弱。' : unitP > 3.5 ? '偏高：关注摩擦片偏磨、噪声、热裂纹与卡钳刚度。' : '处于乘用车常用区间（约 1–3.5 MPa）。'),
            BT.checkRow(ePad <= energyLimit ? 'pass' : 'fail', '单片摩擦片面能量 ' + ePad.toFixed(1) + ' J/mm²',
              ePad <= energyLimit ? '低于参考上限，热冲击风险可控。' : '超过参考上限，建议增大单片摩擦片面积、盘径或降低整车质量/初速。'),
            BT.checkRow(hotMu >= 0.3 ? 'pass' : 'fail', '热态摩擦系数 ' + hotMu.toFixed(3),
              hotMu >= 0.3 ? '热态 μ 仍高于 0.30，制动能力基本可控。' : '热态 μ 偏低，存在明显热衰退，需调整配方或热容量。'),
            BT.checkRow(lifeKm >= 30000 ? 'pass' : 'warn', '磨损寿命 ' + (lifeKm / 10000).toFixed(1) + ' 万 km',
              '按 ' + wearRate.toFixed(1) + ' mm/万 km、可用厚度 ' + Math.max(0, padThk - minThk).toFixed(1) + ' mm 估算，约 ' + years.toFixed(1) + ' 年。'),
            BT.checkRow('info', '盘面热流', '单前轮制动能量 ' + BT.fmt(E * d.beta / 2 / 1000, 1) + ' kJ；单片面积 ' + v.front.padArea.toFixed(0) + ' cm²，内外片合计 ' + (v.front.padArea * 2).toFixed(0) + ' cm²。')
          ])
        ]));

        const rows = [];
        [2, 4, 6, 8, 10, 12].forEach(function (pp) {
          if (pp > v.maxPressure) return;
          const fc = pp * BT.areaCaliper(v.front);
          const bb = BT.brakeForceAtPressure(pp, v);
          rows.push([
            pp.toFixed(1), BT.fmt(fc / 1000, 1), BT.fmt(fc / A_pad, 2),
            BT.fmt(BT.torquePerMPa(v.front) * pp, 0), BT.fmt(bb.total / 1000, 1), BT.fmt(bb.decel, 2)
          ]);
        });
        tableHost.innerHTML = '';
        tableHost.appendChild(BT.panel('压力—单位压力—制动能力', [
          BT.table(['轮端 MPa', '夹紧力 kN', '单位压力 MPa', '前轮 N·m', '整车 kN', '减速度 g'], rows, {
            caption: '单片面积 ' + v.front.padArea.toFixed(0) + ' cm²；内外片合计 ' + (v.front.padArea * 2).toFixed(0) + ' cm²', captionRight: 'β = ' + d.beta.toFixed(3)
          })
        ]));
      }
      form.onChange = BT.debounce(recalc, 50);
      recalc();
    }
  });
})(window.BT);
