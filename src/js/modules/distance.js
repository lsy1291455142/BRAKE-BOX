/* ============================================================
   模块：制动距离与减速度
   ============================================================ */
(function (BT) {
  'use strict';
  BT.modules = BT.modules || [];

  function requiredDecel(v0, tr, tb, target) {
    if (!(v0 > 0) || !(target > 0)) return Infinity;
    // Distance decreases monotonically with deceleration. Start low enough
    // that long targets are not silently clamped to an arbitrary 0.5 m/s².
    let lo = 1e-4, hi = 50;
    for (let i = 0; i < 100; i++) {
      const mid = (lo + hi) / 2;
      const s = BT.stoppingDistance({ v0: v0, tr: tr, tb: tb, a: mid }).total;
      if (s > target) lo = mid; else hi = mid;
    }
    return (lo + hi) / 2;
  }

  BT.modules.push({
    id: 'distance',
    group: '整车性能',
    name: '制动距离',
    icon: 'ruler',
    desc: '反应/建压/稳态段分解与目标反算',
    render: function (root) {
      const v = BT.vehicle;
      root.appendChild(BT.pageHead('STOPPING DISTANCE', '制动距离与减速度', '按“反应—建压—稳态”三段模型分解制动过程，支持由目标距离反算所需减速度，并给出 50 km/h 法规参考校核。', [
        BT.el('span', { class: 'badge info' }, [BT.el('i', { class: 'dot' }), document.createTextNode('整备 ' + BT.fmt(v.mass, 0) + ' kg')])
      ]));

      root.appendChild(BT.beginnerCard({
        title: '刹车距离为什么不是 v²/2a 这么简单？',
        svg: BT.diagram('distance'),
        principle: '总距离 = 反应段 + 建压段 + 稳态段。反应和建压阶段车还在高速行驶，距离很可观。',
        steps: [
          '100 km/h 时，0.35 s 反应时间大约跑 9.7 m。',
          '0.2 s 建压时间大约再跑 5.5 m。',
          '剩下的稳态段才接近课本里的 v²/2a。'
        ],
        mistake: '把计算出来的距离直接写成“满足法规”。法规判定必须用规定工况下的实测数据；这里只是工程预估。',
        grade: 'B'
      }));

      const side = [];
      const p = BT.el('section', { class: 'panel' });
      p.appendChild(BT.el('div', { class: 'panel-head' }, [BT.el('h3', { text: '工况输入' })]));
      const body = BT.el('div', { class: 'panel-body' });
      body.appendChild(BT.vehStrip(v));
      const form = new BT.Form(body, 'distance');
      form.section('初始条件');
      form.num('v0', '制动初速度', 100, 'km/h', { step: 1, min: 10, max: 250 });
      form.num('tr', '反应 / 协调时间', 0.35, 's', { step: 0.01, min: 0, max: 2, hint: '从踏板接触到建压开始' });
      form.num('tb', '制动力上升时间', 0.20, 's', { step: 0.01, min: 0, max: 1 });
      form.section('路面与目标');
      form.select('road', '路面预设', 'dry', [
        { value: 'dry', label: '干燥沥青（μ≈0.90）' },
        { value: 'wet', label: '湿沥青（μ≈0.60）' },
        { value: 'low', label: '低附/冰雪（μ≈0.35）' },
        { value: 'custom', label: '自定义' }
      ]);
      form.num('mu', '路面附着系数 μ', 0.90, '—', { step: 0.01, min: 0.05, max: 1.3 });
      form.num('absEff', 'ABS / 轮胎综合效率 η', 0.95, '—', { step: 0.01, min: 0.6, max: 1.0, hint: '工程假设，默认 0.95；有实测数据后替换' });
      form.num('target', '目标制动距离（不含反应）', 42, 'm', { step: 0.5, min: 5, hint: '工程目标，可自行设定' });
      p.appendChild(body);
      side.push(p);

      side.push(BT.panel('法规参考', [
        BT.el('div', { class: 'stack' }, [
          BT.checkRow('info', 'GB 7258-2017（路试）', '乘用车 50 km/h、空载、干湿混凝土/沥青路面的制动距离 ≤ 19 m（从踩下踏板起计，不含驾驶员反应距离）。'),
          BT.note('50 km/h 校核按“踩下踏板”起算，因此使用不含反应段的制动距离。GB 21670-2025 / UN R13-H 认证还包含初速、满载、制动次数、踏板力等条件，正式判定请以现行标准原文与实车试验为准。', 'warn')
        ])
      ]));

      const kpiHost = BT.el('div');
      const chartHost = BT.el('div');
      const breakdownHost = BT.el('div');
      const main = [kpiHost, BT.chartCard('制动距离 vs 初速度', '当前参数下的距离曲线；标记为初速度工况点', chartHost), breakdownHost];
      root.appendChild(BT.workbench(side, main));

      const muInput = BT.q('[data-key="mu"]', form.grid);
      const roadSel = BT.q('[data-key="road"]', form.grid);
      roadSel.addEventListener('change', function () {
        const map = { dry: 0.9, wet: 0.6, low: 0.35 };
        if (map[roadSel.value] !== undefined) {
          muInput.value = map[roadSel.value];
          recalc();
        }
      });

      function recalc() {
        const f = form.values();
        const v0kmh = Math.max(1, BT.finite(f.v0, 100));
        const v0 = v0kmh / 3.6;
        const mu = BT.clamp(BT.finite(f.mu, 0.9), 0.05, 1.3);
        const eff = BT.clamp(BT.finite(f.absEff, 0.95), 0.5, 1);
        const tr = Math.max(0, BT.finite(f.tr, 0.35));
        const tb = Math.max(0, BT.finite(f.tb, 0.20));
        const a = mu * BT.g * eff;
        const seg = BT.stoppingDistance({ v0: v0, tr: tr, tb: tb, a: a });
        const target = Math.max(1, BT.finite(f.target, 42));
        const req = requiredDecel(v0, 0, tb, target);
        const avg = BT.avgDecelForDistance(v0, seg.braking);
        const s50 = BT.stoppingDistance({ v0: 50 / 3.6, tr: 0, tb: tb, a: a }).braking;

        kpiHost.innerHTML = '';
        kpiHost.appendChild(BT.kpis([
          ['制动距离（不含反应）', BT.fmt(seg.braking, 1), 'm', '初速 ' + v0kmh.toFixed(0) + ' km/h'],
          ['停车总距离', BT.fmt(seg.total, 1), 'm', '反应 ' + BT.fmt(seg.reaction, 1) + ' m'],
          ['稳态减速度', BT.fmt(a / BT.g, 2) + ' g', '', '含效率 η=' + eff.toFixed(2)],
          ['平均减速度（制动段）', BT.fmt(avg / BT.g, 2) + ' g', '', '按距离反算'],
          ['目标余量', BT.fmt(target - seg.braking, 1), 'm', seg.braking <= target ? '满足目标' : '超出目标', seg.braking <= target ? 'ok' : 'bad']
        ]));

        const curve = [];
        for (let sp = 20; sp <= 140; sp += 5) {
          const s = BT.stoppingDistance({ v0: sp / 3.6, tr: 0, tb: tb, a: a });
          curve.push([sp, s.braking]);
        }
        BT.chart(chartHost, {
          xDomain: [20, 140], yDomain: [0, Math.max(60, Math.ceil(seg.braking * 1.35 / 10) * 10)],
          xLabel: '初速度（km/h）', yLabel: '制动距离（m）',
          xFmt: function (x) { return x.toFixed(0); }, yFmt: function (y) { return y.toFixed(0); },
          series: [
            { name: '制动距离（不含反应）', data: curve, color: '#c8502a', width: 2.2 },
            { name: '当前工况', data: [[v0kmh, seg.braking]], color: '#16202b', type: 'points', pointR: 4.5 }
          ],
          lines: [{ y: target, label: '目标 ' + target.toFixed(0) + ' m', color: '#17657f' }]
        });

        breakdownHost.innerHTML = '';
        breakdownHost.appendChild(BT.panel('过程分解与校核', [
          BT.el('div', { class: 'checklist', style: { marginBottom: '12px' } }, [
            BT.checkRow(seg.braking <= target ? 'pass' : 'fail', '目标制动距离 ' + target.toFixed(0) + ' m',
              '计算制动距离 ' + seg.braking.toFixed(1) + ' m，余量 ' + BT.sign(target - seg.braking, 1) + ' m；所需稳态减速度约 ' + (req / BT.g).toFixed(2) + ' g（不含反应段）。'),
            BT.checkRow(s50 <= 19 ? 'pass' : 'fail', 'GB 7258 50 km/h 参考（≤19 m）',
              '按当前 μ 与建压时间计算，50 km/h 制动距离 ' + s50.toFixed(1) + ' m。' + (s50 <= 19 ? ' 满足参考限值。' : ' 超出参考限值，请复核路面假定与制动系统能力。')),
            BT.checkRow('info', '距离构成', '反应 ' + seg.reaction.toFixed(1) + ' m（' + (seg.total > 0 ? (seg.reaction / seg.total * 100).toFixed(1) : '0.0') + '%）· 建压段 ' +
              seg.buildDistance.toFixed(1) + ' m · 稳态段 ' + seg.steadyDistance.toFixed(1) + ' m。' +
              (seg.stoppedDuringBuild ? ' 车辆在制动力上升阶段已停车，稳态段为 0。' : ''))
          ]),
          BT.table(['项目', '数值', '说明'], [
            ['初速度', v0kmh.toFixed(0) + ' km/h', (v0).toFixed(2) + ' m/s'],
            ['附着/效率', mu.toFixed(2) + ' / ' + eff.toFixed(2), 'a = μ·g·η'],
            ['反应距离', seg.reaction.toFixed(2) + ' m', 'v₀·t_r'],
            ['建压段距离', seg.buildDistance.toFixed(2) + ' m', seg.stoppedDuringBuild ? '减速度线性上升，停车发生在该段' : '减速度线性上升'],
            ['稳态段距离', seg.steadyDistance.toFixed(2) + ' m', '匀减速'],
            ['总距离', seg.total.toFixed(2) + ' m', '含反应'],
            ['目标所需减速度', isFinite(req) ? (req / BT.g).toFixed(3) + ' g' : '—', isFinite(req) && req / BT.g <= mu * eff ? '在当前附着/效率能力内' : '超出当前 μ·η 能力']
          ], { caption: '计算明细', captionRight: 'μ = ' + mu.toFixed(2) + ' · η = ' + eff.toFixed(2) })
        ]));
      }
      form.onChange = BT.debounce(recalc, 50);
      recalc();
    }
  });
})(window.BT);
