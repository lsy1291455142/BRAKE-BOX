/* ============================================================
   模块：制动热容量与温升
   ============================================================ */
(function (BT) {
  'use strict';
  BT.modules = BT.modules || [];

  BT.modules.push({
    id: 'thermal',
    group: '零部件开发',
    name: '热容量与温升',
    icon: 'thermo',
    desc: '单次/连续制动能量、盘温与冷却',
    render: function (root) {
      const v = BT.vehicle, d = BT.derived(v);
      root.appendChild(BT.pageHead('THERMAL CAPACITY', '制动热容量与温升', '将整车动能按前后制动力分配拆解到制动盘，估算单次制动温升与连续制动峰值温度，用于盘径/盘厚/通风方案与摩擦材料耐温评估。', [
        BT.el('span', { class: 'badge info' }, [BT.el('i', { class: 'dot' }), document.createTextNode('β ' + d.beta.toFixed(3))])
      ]));

      root.appendChild(BT.beginnerCard({
        title: '刹车盘为什么会红？',
        svg: BT.diagram('thermal'),
        principle: '整车的动能变成热，先进入制动盘。盘越重、比热越大，同样能量下温升越小。',
        steps: [
          'E = ½mv²：车速翻倍，动能是四倍。',
          '前轴通常吸收 70–80% 的能量，所以前盘更热。',
          '连续制动要看冷却时间常数 τ，单次温升不能代表山路峰值。'
        ],
        mistake: '只看单次 100→0 的温升，就判断连续山路不会热衰退；累积温度和冷却时间才是关键。',
        grade: 'C'
      }));

      const side = [];
      const p = BT.el('section', { class: 'panel' });
      p.appendChild(BT.el('div', { class: 'panel-head' }, [BT.el('h3', { text: '工况与材料' })]));
      const body = BT.el('div', { class: 'panel-body' });
      body.appendChild(BT.vehStrip(v));
      const form = new BT.Form(body, 'thermal');
      form.section('单次制动');
      form.num('v0', '制动初速度', 100, 'km/h', { step: 1, min: 10, max: 250 });
      form.num('ambient', '环境温度', 30, '°C', { step: 1, min: -30, max: 60 });
      form.num('discShare', '导入制动盘比例', 0.86, '—', { step: 0.01, min: 0.4, max: 1, hint: '其余由摩擦片/轮毂/卡钳吸收' });
      form.num('cp', '制动盘比热容', 500, 'J/(kg·K)', { step: 10, min: 300, max: 700, hint: '铸铁约 480–520' });
      form.section('连续制动');
      form.num('stops', '连续制动次数', 10, '次', { step: 1, min: 1, max: 100 });
      form.num('interval', '间隔时间', 60, 's', { step: 5, min: 1, max: 600 });
      form.num('tau', '冷却时间常数', 300, 's', { step: 10, min: 20, max: 2000, hint: '自然对流/辐射综合，需按实测标定' });
      form.num('limit', '盘温参考上限', 600, '°C', { step: 10, min: 200, max: 900, hint: '按摩擦材料等级设定' });
      p.appendChild(body);
      side.push(p);

      side.push(BT.panel('模型说明', [
        BT.el('div', { class: 'stack' }, [
          BT.note('单次制动动能 <b>E = ½mv²</b>；前/后按 β 分配；每个制动盘吸收 <b>E·share·η / (2m<sub>d</sub>c<sub>p</sub>)</b>。η 为导入盘体比例（默认 0.86）。', 'info'),
          BT.note('连续制动采用集总热容 + 指数冷却：<b>T ← T<sub>∞</sub> + (T−T<sub>∞</sub>)e<sup>−Δt/τ</sup></b>。未考虑温升导致的摩擦系数衰退、辐射非线性与气流随车速变化，峰值温度仅用于方案筛选。', 'warn'),
          BT.el('p', { class: 'small muted', style: { margin: 0 }, html: '乘用车前盘单次 100→0 km/h 温升通常在 30–60 °C 量级；连续山路/赛道工况需用热平衡试验或 CFD 标定 τ 后再评估。' })
        ])
      ]));

      const kpiHost = BT.el('div');
      const chartHost = BT.el('div');
      const checkHost = BT.el('div');
      const tableHost = BT.el('div');
      const main = [kpiHost, BT.chartCard('连续制动温度历程', '每次制动后的峰值温度与冷却后温度；虚线为材料参考上限', chartHost), checkHost, tableHost];
      root.appendChild(BT.workbench(side, main));

      function recalc() {
        const f = form.values();
        const v0 = BT.num(f.v0, 100, 10, 250) / 3.6;
        const ambient = BT.num(f.ambient, 30, -30, 60);
        const discShare = BT.num(f.discShare, 0.86, 0.4, 1);
        const cp = BT.num(f.cp, 500, 300, 700);
        const n = Math.max(1, Math.round(BT.num(f.stops, 10, 1, 100)));
        const tau = BT.num(f.tau, 300, 10, 2000);
        const interval = BT.num(f.interval, 60, 1, 600);
        const limit = BT.num(f.limit, 600, 200, 900);
        const th = BT.thermal({
          mass: v.mass, v0: v0, beta: d.beta,
          discMassF: v.front.discMass, discMassR: v.rear.discMass,
          discShare: discShare, cp: cp
        });
        let tempF = ambient;
        let tempR = ambient;
        const peaksF = [], cooledF = [], peaksR = [];
        let peakF = tempF, peakR = tempR;
        for (let i = 1; i <= n; i++) {
          tempF += th.dTF; tempR += th.dTR;
          peakF = Math.max(peakF, tempF); peakR = Math.max(peakR, tempR);
          peaksF.push([i, tempF]); peaksR.push([i, tempR]);
          tempF = ambient + (tempF - ambient) * Math.exp(-interval / tau);
          tempR = ambient + (tempR - ambient) * Math.exp(-interval / tau);
          cooledF.push([i, tempF]);
        }

        kpiHost.innerHTML = '';
        kpiHost.appendChild(BT.kpis([
          ['整车动能', BT.fmt(th.energy / 1000, 0), 'kJ', (v0 * 3.6).toFixed(0) + '→0 km/h'],
          ['前盘单次温升', 'Δ' + BT.fmt(th.dTF, 1), '°C', '每个前盘，η=' + discShare.toFixed(2)],
          ['前盘峰值温度', BT.fmt(peakF, 0), '°C', n + ' 次 · 间隔 ' + interval + ' s', peakF <= limit ? 'ok' : 'bad'],
          ['后盘单次温升', 'Δ' + BT.fmt(th.dTR, 1), '°C', '每个后盘'],
          ['后盘峰值温度', BT.fmt(peakR, 0), '°C', 'β 分配 ' + BT.pct(d.beta), peakR <= limit ? 'ok' : 'warn']
        ]));

        const top = peakF < limit * 0.75
          ? Math.max(peakF * 1.35, ambient + 60)
          : Math.max(limit * 1.1, peakF * 1.12);
        BT.chart(chartHost, {
          xDomain: [0.5, n + 0.5], yDomain: [ambient, top],
          xLabel: '制动次数', yLabel: '制动盘温度（°C）',
          xFmt: function (x) { return Math.round(x); }, yFmt: function (y) { return y.toFixed(0); },
          series: [
            { name: '前盘 · 制动后峰值', data: peaksF, color: '#c8502a', width: 2.2 },
            { name: '后盘 · 制动后峰值', data: peaksR, color: '#17657f', width: 1.8 },
            { name: '前盘 · 冷却后', data: cooledF, color: '#c8502a', width: 1.2, dash: '3 4', opacity: .8 }
          ],
          lines: limit <= top ? [{ y: limit, label: '参考上限 ' + limit.toFixed(0) + ' °C', color: '#b42318' }] : []
        });

        const margin = limit - peakF;
        checkHost.innerHTML = '';
        checkHost.appendChild(BT.panel('热评估', [
          BT.el('div', { class: 'checklist' }, [
            BT.checkRow(peakF <= limit ? 'pass' : 'fail', '前盘峰值 ' + peakF.toFixed(0) + ' °C',
              peakF <= limit ? '低于参考上限 ' + limit.toFixed(0) + ' °C，余量 ' + margin.toFixed(0) + ' °C。' :
                '超过参考上限 ' + Math.abs(margin).toFixed(0) + ' °C，存在热衰退/热裂纹风险，建议增大盘质量、改善通风或降低单次能量。'),
            BT.checkRow(th.dTF <= 80 ? 'pass' : 'warn', '单次温升 Δ' + th.dTF.toFixed(1) + ' °C',
              th.dTF <= 80 ? '处于乘用车常见单次温升范围。' : '单次温升偏高，需关注热冲击与摩擦片衰退。'),
            BT.checkRow(peakF / Math.max(1, limit) <= 0.85 ? 'pass' : 'warn', '热裕度',
              '峰值/上限 = ' + (peakF / limit).toFixed(2) + '。建议山路/高速工况保留 ≥15% 温度裕度。'),
            BT.checkRow('info', '能量分配', '前轴 ' + BT.fmt(th.front / 1000, 1) + ' kJ / 后轴 ' + BT.fmt(th.rear / 1000, 1) + ' kJ；前盘单次吸收 ' +
              BT.fmt(th.front * discShare / 2 / 1000, 1) + ' kJ。')
          ])
        ]));

        const rows = [];
        [0.3, 0.5, 0.7, 0.85, 1.0].forEach(function (k) {
          const e = BT.kineticEnergy(v.mass, v0 * k);
          rows.push([
            (v0 * 3.6 * k).toFixed(0),
            BT.fmt(e / 1000, 0),
            BT.fmt(e * d.beta * discShare / 2 / (v.front.discMass * cp), 1),
            BT.fmt(e * (1 - d.beta) * discShare / 2 / (v.rear.discMass * cp), 1)
          ]);
        });
        tableHost.innerHTML = '';
        tableHost.appendChild(BT.panel('能量—温升敏感性', [
          BT.table(['初速度 km/h', '整车动能 kJ', '前盘 ΔT °C', '后盘 ΔT °C'], rows, {
            caption: '单次制动，η = ' + discShare.toFixed(2) + '，c_p = ' + cp.toFixed(0) + ' J/(kg·K)'
          })
        ]));
      }
      form.onChange = BT.debounce(recalc, 50);
      recalc();
    }
  });
})(window.BT);
