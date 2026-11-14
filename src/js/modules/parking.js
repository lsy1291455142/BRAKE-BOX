/* ============================================================
   模块：驻车制动 / EPB
   ============================================================ */
(function (BT) {
  'use strict';
  BT.modules = BT.modules || [];

  BT.modules.push({
    id: 'parking',
    group: '零部件开发',
    name: '驻车与 EPB',
    icon: 'park',
    desc: '坡道保持夹紧力、电机扭矩与能力余量',
    render: function (root) {
      const v = BT.vehicle;
      root.appendChild(BT.pageHead('PARK BRAKE / EPB', '驻车制动与 EPB 匹配', '按坡道保持需求计算后轮所需制动力、卡钳夹紧力与 EPB 电机扭矩，并给出夹紧力/电机能力余量。', [
        BT.el('span', { class: 'badge info' }, [BT.el('i', { class: 'dot' }), document.createTextNode('后卡钳 φ' + BT.fmt(v.rear.pistonD, 0) + ' mm')])
      ]));

      root.appendChild(BT.beginnerCard({
        title: '坡道上，EPB 要夹多紧？',
        svg: BT.diagram('parking'),
        principle: '重力沿坡道的分力，要靠后轮制动力平衡；再通过制动器力矩反算夹紧力和电机扭矩。',
        steps: [
          '坡度 20% ≈ 11.3°，不是 20°。',
          '先算整车保持力 mg·sinθ，再分到两个后轮。',
          '由单轮制动力矩反算夹紧力，最后算 EPB 电机扭矩。'
        ],
        mistake: '把坡度百分比当角度，或者忘了安全系数；坡道保持会算少。',
        grade: 'B'
      }));

      const side = [];
      const p = BT.el('section', { class: 'panel' });
      p.appendChild(BT.el('div', { class: 'panel-head' }, [BT.el('h3', { text: '坡道与 EPB 参数' })]));
      const body = BT.el('div', { class: 'panel-body' });
      body.appendChild(BT.vehStrip(v));
      const form = new BT.Form(body, 'parking');
      form.section('载荷与坡道');
      form.num('grade', '目标坡度', 20, '%', { step: 1, min: 0, max: 60, hint: '20% ≈ 11.3°' });
      form.num('massExtra', '附加载荷', 0, 'kg', { step: 10, min: 0, hint: '乘员/行李' });
      form.num('sf', '安全系数', 1.2, '—', { step: 0.05, min: 1, max: 2 });
      form.num('mu', '摩擦系数 μ', 0.38, '—', { step: 0.01, min: 0.1, max: 0.8 });
      form.section('EPB 执行机构');
      form.num('lead', '丝杠导程', 2.0, 'mm/rev', { step: 0.1, min: 0.5, max: 8 });
      form.num('ratio', '减速比', 20, '—', { step: 0.5, min: 1, max: 100 });
      form.num('eff', '传动效率', 0.35, '—', { step: 0.01, min: 0.1, max: 0.9 });
      form.num('motorMax', '电机可用扭矩', 3.0, 'N·m', { step: 0.1, min: 0.2, max: 20 });
      form.num('clampMax', '卡钳可用夹紧力', 30, 'kN', { step: 1, min: 5, max: 80 });
      p.appendChild(body);
      side.push(p);

      side.push(BT.panel('模型说明', [
        BT.el('div', { class: 'stack' }, [
          BT.note('坡道保持力 <b>F = m·g·sinθ·SF</b>；后轮单轮制动力 <b>F<sub>w</sub> = F/2</b>；夹紧力 <b>F<sub>c</sub> = F<sub>w</sub>·r / (2μR<sub>e</sub>)</b>。', 'info'),
          BT.note('电机扭矩 <b>T<sub>m</sub> = F<sub>c</sub>·L / (2πη·i)</b>，未计入丝杠自锁、摩擦圆与温度引起的效率变化；实际 EPB 还需校核夹紧速度、释放行程与热衰退。', 'warn'),
          BT.el('p', { class: 'small muted', style: { margin: 0 }, html: 'M1 类乘用车驻车制动通常要求 20% 坡道保持；项目出口/特殊用途车辆请按适用法规与企标调整。' })
        ])
      ]));

      const kpiHost = BT.el('div');
      const chartHost = BT.el('div');
      const checkHost = BT.el('div');
      const tableHost = BT.el('div');
      const main = [kpiHost, BT.chartCard('坡道保持需求', '后轮单侧夹紧力与坡度的关系；标记为当前坡度', chartHost), checkHost, tableHost];
      root.appendChild(BT.workbench(side, main));

      function calc(grade, mass, mu, sf) {
        return BT.parkingDemand({
          grade: grade, mass: mass, mu: mu, sf: sf,
          wheelR: v.wheelR, re: v.rear.re
        });
      }

      function recalc() {
        const f = form.values();
        const mass = Math.max(1, BT.finite(v.mass, 0) + Math.max(0, BT.finite(f.massExtra, 0)));
        const mu = BT.clamp(BT.finite(f.mu, 0.38), 0.05, 0.8);
        const sf = Math.max(1, BT.finite(f.sf, 1.2));
        const grade = Math.max(0, BT.finite(f.grade, 20));
        const lead = Math.max(0.1, BT.finite(f.lead, 2.0));
        const ratio = Math.max(1, BT.finite(f.ratio, 20));
        const eff = BT.clamp(BT.finite(f.eff, 0.35), 0.05, 1);
        const motorMax = Math.max(0, BT.finite(f.motorMax, 3.0));
        const clampMax = Math.max(0, BT.finite(f.clampMax, 30));
        const c = calc(grade, mass, mu, sf);
        const clampReq = c.clamp / 1000;
        const motorT = c.clamp * (lead / 1000) / (2 * Math.PI * eff * ratio);
        const motorMargin = motorMax - motorT;
        const clampMargin = clampMax - clampReq;
        const c20 = calc(20, mass, mu, sf);

        kpiHost.innerHTML = '';
        kpiHost.appendChild(BT.kpis([
          ['坡度角', BT.fmt(c.theta * 180 / Math.PI, 1), '°', grade.toFixed(0) + '% 坡道'],
          ['整车保持力', BT.fmt(c.F / 1000, 1), 'kN', '含 SF ' + sf.toFixed(2)],
          ['单后轮夹紧力', BT.fmt(clampReq, 1), 'kN', '需求 / 可用 ' + clampMax.toFixed(0) + ' kN', clampMargin >= 0 ? 'ok' : 'bad'],
          ['EPB 电机扭矩', BT.fmt(motorT, 2), 'N·m', '可用 ' + motorMax.toFixed(1) + ' N·m', motorMargin >= 0 ? 'ok' : 'bad'],
          ['20% 坡道需求', BT.fmt(c20.clamp / 1000, 1), 'kN', '单轮夹紧力'],
        ]));

        const curve = [];
        for (let g = 0; g <= 45; g += 1) curve.push([g, calc(g, mass, mu, sf).clamp / 1000]);
        BT.chart(chartHost, {
          xDomain: [0, 45], yDomain: [0, Math.max(10, Math.ceil(Math.max(c.clamp / 1000, c20.clamp / 1000) * 1.4 / 5) * 5)],
          xLabel: '坡度（%）', yLabel: '单轮夹紧力（kN）',
          xFmt: function (x) { return x.toFixed(0); }, yFmt: function (y) { return y.toFixed(0); },
          series: [
            { name: '需求夹紧力', data: curve, color: '#c8502a', width: 2.2 },
            { name: '当前坡度', data: [[grade, clampReq]], color: '#16202b', type: 'points', pointR: 4 }
          ],
          lines: [{ x: 20, label: '20%', color: '#17657f' }, { y: clampMax, label: '卡钳可用', color: '#b42318' }]
        });

        checkHost.innerHTML = '';
        checkHost.appendChild(BT.panel('校核结果', [
          BT.el('div', { class: 'checklist' }, [
            BT.checkRow(clampMargin >= 0 ? 'pass' : 'fail', '夹紧力余量 ' + BT.sign(clampMargin, 1) + ' kN',
              '需求 ' + clampReq.toFixed(1) + ' kN / 可用 ' + clampMax.toFixed(1) + ' kN。' + (clampMargin >= 0 ? ' 满足当前坡度。' : ' 不足，需增大卡钳减速比或夹紧力。')),
            BT.checkRow(motorMargin >= 0 ? 'pass' : 'fail', '电机扭矩余量 ' + BT.sign(motorMargin, 2) + ' N·m',
              '需求 ' + motorT.toFixed(2) + ' N·m / 可用 ' + motorMax.toFixed(2) + ' N·m（导程 ' + lead.toFixed(1) + ' mm，减速比 ' + ratio.toFixed(0) + '）。'),
            BT.checkRow(c20.clamp / 1000 <= clampMax ? 'pass' : 'fail', '20% 坡道法规/工程目标',
              '20% 坡道单轮夹紧力需求 ' + (c20.clamp / 1000).toFixed(1) + ' kN，' + (c20.clamp / 1000 <= clampMax ? '当前卡钳能力满足。' : '当前卡钳能力不足。')),
            BT.checkRow('info', '坡道力分解', '整车保持力 ' + (c.F / 1000).toFixed(1) + ' kN；单后轮制动力 ' + (c.perWheel / 1000).toFixed(1) + ' kN；单轮制动力矩 ' + c.torque.toFixed(0) + ' N·m。')
          ])
        ]));

        const rows = [];
        [10, 15, 20, 25, 30, 35].forEach(function (g) {
          const cc = calc(g, mass, mu, sf);
          const mt = cc.clamp * (lead / 1000) / (2 * Math.PI * eff * ratio);
          rows.push([
            g.toFixed(0), BT.fmt(cc.F / 1000, 1), BT.fmt(cc.clamp / 1000, 1),
            BT.fmt(mt, 2), cc.clamp / 1000 <= clampMax ? { text: '满足', cls: 'ok' } : { text: '不足', cls: 'bad' },
            mt <= motorMax ? { text: '满足', cls: 'ok' } : { text: '不足', cls: 'bad' }
          ]);
        });
        tableHost.innerHTML = '';
        tableHost.appendChild(BT.panel('坡度—夹紧力—电机扭矩', [
          BT.table(['坡度 %', '保持力 kN', '夹紧力 kN', '电机 N·m', '卡钳', '电机'], rows, {
            caption: '质量 ' + mass.toFixed(0) + ' kg · μ ' + mu.toFixed(2) + ' · SF ' + sf.toFixed(2)
          })
        ]));
      }
      form.onChange = BT.debounce(recalc, 50);
      recalc();
    }
  });
})(window.BT);
