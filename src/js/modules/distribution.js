/* ============================================================
   模块：制动力分配与法规风格校核
   ============================================================ */
(function (BT) {
  'use strict';
  BT.modules = BT.modules || [];

  BT.modules.push({
    id: 'distribution',
    group: '整车性能',
    name: '制动力分配校核',
    icon: 'split',
    desc: 'β / φ₀、利用附着系数与稳定性包络',
    render: function (root) {
      const v = BT.vehicle, d = BT.derived(v);
      root.appendChild(BT.pageHead('BRAKE DISTRIBUTION', '制动力分配与校核', '以固定 β 分配计算前后轴利用附着系数，检查后轴先抱死风险、同步附着系数与常用法规风格包络。法规条款请以项目适用版本原文为准。', [
        BT.el('span', { class: 'badge info' }, [BT.el('i', { class: 'dot' }), document.createTextNode('硬件 β ' + d.beta.toFixed(3))])
      ]));

      root.appendChild(BT.beginnerCard({
        title: '为什么 β 和 φ₀ 决定先抱哪个轮？',
        svg: BT.diagram('idealCurve'),
        principle: 'β 是前轮分到的制动力比例；φ₀ 是前后轮同时抱死的附着系数。两者一起决定制动稳定性。',
        steps: [
          'φ₀ 太低：湿滑路面可能后轮先抱死，车尾容易甩。',
          'φ₀ 太高：常规路面始终前轮先抱死，稳定但前轴负担重。',
          '看 f_f 与 f_r 谁高，谁就先抱死；z±0.07 只是工程参考带。'
        ],
        mistake: '把 z±0.07 当成法规判据。正式认证必须按 GB 21670-2025 / UN R13-H 的条款与实测数据。',
        grade: 'A'
      }));

      const side = [];
      const p = BT.el('section', { class: 'panel' });
      p.appendChild(BT.el('div', { class: 'panel-head' }, [BT.el('h3', { text: '分配方案' })]));
      const body = BT.el('div', { class: 'panel-body' });
      body.appendChild(BT.vehStrip(v));
      const form = new BT.Form(body, 'distribution');
      form.section('β 来源');
      form.select('mode', '计算模式', 'hardware', [
        { value: 'hardware', label: '按前后制动器硬件计算' },
        { value: 'manual', label: '手动输入设计 β' }
      ]);
      form.num('beta', '设计 β（手动）', +d.beta.toFixed(3), '—', { step: 0.001, min: 0.3, max: 0.95, hint: '仅“手动输入”模式生效' });
      form.section('校核条件');
      form.num('phiTarget', '目标 φ₀', 0.95, '—', { step: 0.01, min: 0.5, max: 1.2, hint: '常用乘用车设计区间 0.85–1.05' });
      form.num('zMin', '校核下限 z', 0.15, 'g', { step: 0.01, min: 0, max: 0.5 });
      form.num('zMax', '校核上限 z', 0.80, 'g', { step: 0.01, min: 0.4, max: 1.0 });
      p.appendChild(body);
      side.push(p);

      side.push(BT.panel('判据说明', [
        BT.el('div', { class: 'stack' }, [
          BT.note('稳定性硬判据：在 z = 0.15–0.80 内，后轴利用附着系数不得高于前轴（<b>f<sub>r</sub> ≤ f<sub>f</sub></b>），否则后轮先抱死、丧失方向稳定性。', 'info'),
          BT.note('图中 <b>f = z ± 0.07</b> 为行业常用工程参考带，尚未逐条对应 GB 21670-2025 / UN R13-H 条款。它<b>不是</b>认证判据；正式认证须按现行标准原文、满载/空载及实测数据执行。', 'warn'),
          BT.el('p', { class: 'small muted', style: { margin: 0 }, html: '固定 β 时，<b>f<sub>f</sub> = βz / (s<sub>f</sub> + zh/L)</b>，<b>f<sub>r</sub> = (1−β)z / (1−s<sub>f</sub>−zh/L)</b>，<b>φ₀ = (β−s<sub>f</sub>)L/h</b>。' })
        ])
      ]));

      const kpiHost = BT.el('div');
      const chartHost = BT.el('div');
      const checksHost = BT.el('div');
      const tableHost = BT.el('div');
      const main = [kpiHost, BT.chartCard('利用附着系数曲线', '曲线交点即同步附着系数 φ₀；曲线越靠近对角线，附着利用越充分', chartHost), checksHost, tableHost];
      root.appendChild(BT.workbench(side, main));

      function recalc() {
        const f = form.values();
        const beta = f.mode === 'manual' ? BT.num(f.beta, d.beta, 0.05, 0.95) : d.beta;
        const phi0 = BT.phi0(beta, v);
        const zMin = Math.max(0, Math.min(BT.num(f.zMin, 0.15), BT.num(f.zMax, 0.80) - 0.01));
        const zMax = Math.max(zMin + 0.01, BT.num(f.zMax, 0.80));
        const phiTarget = BT.num(f.phiTarget, 0.95, 0.5, 1.2);
        const betaTarget = BT.betaForPhi0(phiTarget, v);

        let maxViol = 0, worstZ = zMin;
        let bandViol = 0, bandZ = zMin;
        for (let z = zMin; z <= zMax + 1e-9; z += 0.005) {
          const u = BT.utilization(beta, z, v);
          const viol = u.rear - u.front;
          if (viol > maxViol) { maxViol = viol; worstZ = z; }
          // Check all four sides of the f = z ± 0.07 band, not just the two
          // sides that happen to be violated by the default B-class car.
          const band = BT.utilizationBandViolation(beta, z, v);
          if (band > bandViol) { bandViol = band; bandZ = z; }
        }

        kpiHost.innerHTML = '';
        kpiHost.appendChild(BT.kpis([
          ['设计 β', beta.toFixed(3), '', f.mode === 'manual' ? '手动输入' : '由硬件参数计算', 'accent'],
          ['同步附着系数 φ₀', phi0.toFixed(3), '', phi0 >= 0.85 && phi0 <= 1.05 ? '常用区间内' : '偏离常用区间', phi0 >= 0.85 && phi0 <= 1.05 ? 'ok' : 'warn'],
          ['目标 φ₀ 所需 β', betaTarget.toFixed(3), '', '目标 ' + phiTarget.toFixed(2) + '，差值 ' + BT.sign(betaTarget - beta, 3), Math.abs(betaTarget - beta) < 0.015 ? 'ok' : 'warn'],
          ['最大后轴超限', maxViol <= 0.002 ? '0' : (maxViol * 1000).toFixed(0), '‰', maxViol <= 0.002 ? '稳定性满足' : 'z=' + worstZ.toFixed(2) + ' 处后轴利用率更高', maxViol <= 0.002 ? 'ok' : 'bad'],
          ['包络偏差', bandViol <= 0.005 ? '0' : (bandViol * 1000).toFixed(0), '‰', bandViol <= 0.005 ? '位于 z±0.07 内' : 'z=' + bandZ.toFixed(2) + ' 处超出', bandViol <= 0.005 ? 'ok' : 'warn']
        ]));

        const ff = [], fr = [], diag = [], upper = [], lower = [];
        for (let z = 0; z <= 0.95; z += 0.01) {
          const u = BT.utilization(beta, z, v);
          ff.push([z, u.front]); fr.push([z, u.rear]);
          diag.push([z, z]); upper.push([z, z + 0.07]); lower.push([z, Math.max(0, z - 0.07)]);
        }
        BT.chart(chartHost, {
          xDomain: [0, 0.95], yDomain: [0, 1.05],
          xLabel: '减速度 z（g）', yLabel: '利用附着系数 f',
          xFmt: function (x) { return x.toFixed(1); }, yFmt: function (y) { return y.toFixed(1); },
          series: [
            { name: 'f = z', data: diag, color: '#98a2b3', width: 1, dash: '2 3' },
            { name: 'z+0.07（参考）', data: upper, color: '#c9a15b', width: 1, dash: '4 4' },
            { name: 'z−0.07（参考）', data: lower, color: '#c9a15b', width: 1, dash: '4 4' },
            { name: '前轴 f_f', data: ff, color: '#c8502a', width: 2.2 },
            { name: '后轴 f_r', data: fr, color: '#17657f', width: 2.2 },
            { name: 'φ₀ 同步点', data: [[phi0, phi0]], color: '#16202b', type: 'points', pointR: 4 }
          ],
          lines: [{ x: phi0, label: 'φ₀=' + phi0.toFixed(2), color: '#667085' }]
        });

        checksHost.innerHTML = '';
        const stable = maxViol <= 0.002;
        const inBand = bandViol <= 0.005;
        checksHost.appendChild(BT.panel('校核结果', [
          BT.el('div', { class: 'checklist' }, [
            BT.checkRow(stable ? 'pass' : 'fail', '后轴先抱死稳定性',
              stable ? 'z = ' + zMin.toFixed(2) + '–' + zMax.toFixed(2) + ' 内 f_r ≤ f_f，前轮先抱死，方向稳定性满足。' :
                'z = ' + worstZ.toFixed(2) + ' 处 f_r − f_f = ' + (maxViol * 1000).toFixed(1) + '‰，后轴利用率过高；建议提高 β、增大前制动器或降低后制动器效能。'),
            BT.checkRow(inBand ? 'pass' : 'warn', 'z ± 0.07 工程参考包络',
              inBand ? '两条利用附着系数曲线均位于参考包络内。' :
                'z = ' + bandZ.toFixed(2) + ' 处最大偏差 ' + (bandViol * 100).toFixed(1) + '%（绝对值），建议复核目标 φ₀ 与前后制动器匹配。'),
            BT.checkRow(phi0 >= 0.85 && phi0 <= 1.05 ? 'pass' : 'warn', '同步附着系数 ' + phi0.toFixed(3),
              phi0 < 0.85 ? '偏低：常规沥青路面（μ≈0.9）下可能后轮先抱死。' : phi0 > 1.05 ? '偏高：常规路面均前轮先抱死，稳定性好，但前轴热负荷与踏板感需重点校核。' : '处于乘用车常用区间。'),
            BT.checkRow('info', '0.5g 工况分配', (function () {
              const u = BT.utilization(beta, 0.5, v);
              return 'f_f = ' + u.front.toFixed(3) + '，f_r = ' + u.rear.toFixed(3) + '，前轴制动力占比 ' + BT.pct(beta) + '。';
            })())
          ])
        ]));

        const rows = [];
        for (let z = 0.1; z <= 0.91; z += 0.1) {
          const u = BT.utilization(beta, z, v);
          rows.push([
            z.toFixed(1), beta.toFixed(3), u.front.toFixed(3), u.rear.toFixed(3),
            BT.sign((u.rear - u.front) * 1000, 1), z <= phi0 ? { text: '前轮先抱', cls: 'ok' } : { text: '后轮先抱', cls: 'bad' }
          ]);
        }
        tableHost.innerHTML = '';
        tableHost.appendChild(BT.panel('逐工况明细', [
          BT.table(['z (g)', 'β', 'f 前', 'f 后', 'f后−f前 (‰)', '抱死顺序'], rows, { caption: '固定 β 分配', captionRight: 'φ₀ = ' + phi0.toFixed(3) })
        ]));
      }
      form.onChange = BT.debounce(recalc, 50);
      recalc();
    }
  });
})(window.BT);
