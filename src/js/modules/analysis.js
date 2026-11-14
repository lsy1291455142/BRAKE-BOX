/* ============================================================
   模块：试验数据分析（CSV）
   ============================================================ */
(function (BT) {
  'use strict';
  BT.modules = BT.modules || [];

  const MAPS = [
    { key: 'time', label: '时间' },
    { key: 'speed', label: '车速' },
    { key: 'pressure', label: '轮端压力' },
    { key: 'decel', label: '减速度' },
    { key: 'pedal', label: '踏板力' }
  ];

  function autoPick(headers, key) {
    const pats = {
      time: /(^|[^a-z])(t|time|timestamp|时间|sec|second)([^a-z]|$)/i,
      speed: /(speed|velocity|车速|km\/h|kmh|m\/s|速度)/i,
      pressure: /(press|pressure|压力|mpa|bar|p\b)/i,
      decel: /(decel|accel|减速度|m\/s2|m\/s²|g\b)/i,
      pedal: /(pedal|踏板|force|n\b)/i
    };
    for (let i = 0; i < headers.length; i++) {
      if (pats[key].test(headers[i])) return headers[i];
    }
    return '';
  }

  function sampleCSV() {
    const rows = [['Time (s)', 'Speed (km/h)', 'Pressure (MPa)', 'Decel (m/s2)', 'Pedal Force (N)']];
    const dt = 0.01, v0 = 100 / 3.6;
    let v = v0, t = 0, phase = 0;
    for (let i = 0; i < 520; i++) {
      t = i * dt;
      let a = 0, p = 0, pedal = 0;
      if (t < 0.35) { a = 0; }
      else if (t < 0.65) {
        const k = (t - 0.35) / 0.30;
        a = 9.15 * k;
        p = 8.0 * k;
        pedal = 88 * Math.min(1, k * 1.15);
      } else if (v > 0) {
        a = 9.15 + 0.10 * Math.sin(t * 17) + 0.04 * Math.sin(t * 41);
        p = 8.0 + 0.08 * Math.sin(t * 13);
        pedal = 88 + 2.5 * Math.sin(t * 9);
      }
      if (v > 0) v = Math.max(0, v - a * dt);
      rows.push([t.toFixed(2), (v * 3.6).toFixed(2), p.toFixed(3), a.toFixed(3), pedal.toFixed(1)]);
      if (v <= 0 && t > 1) break;
    }
    return rows.map(function (r) { return r.join(','); }).join('\n');
  }

  BT.modules.push({
    id: 'analysis',
    group: '匹配与数据',
    name: '试验数据分析',
    icon: 'wave',
    desc: 'CSV 导入、滤波、MFDD、制动距离与压力增益',
    render: function (root) {
      root.appendChild(BT.pageHead('TEST DATA', '试验数据分析', '导入台架/路试 CSV，映射时间、车速、压力、减速度与踏板力通道，自动计算制动距离、MFDD、最大/平均减速度及压力—减速度增益，并导出处理结果。', [
        BT.el('span', { class: 'badge info' }, [BT.el('i', { class: 'dot' }), document.createTextNode('CSV / TXT · 本地处理')])
      ]));

      root.appendChild(BT.beginnerCard({
        title: '一段路试数据，怎么变成结论？',
        svg: BT.diagram('analysis'),
        principle: '先对齐单位和时间，再滤波，再积分或拟合。顺序错了，结论就会偏。',
        steps: [
          '车速对时间积分得到制动距离；不要用平均车速乘时间。',
          '在 0.8v₀ 到 0.1v₀ 区间计算 MFDD，比最大减速度更能代表制动能力。',
          '压力—减速度散点拟合的斜率，就是整车压力增益。'
        ],
        mistake: '不滤波直接取最大减速度，噪声会把峰值抬高；不校时直接拟合，压力与减速度会错位。',
        grade: 'A'
      }));

      const state = {
        headers: [], rows: [], fileName: '', columns: {},
        speedUnit: 'kmh', pressureUnit: 'MPa', decelUnit: 'mps2'
      };

      /* ---------- side ---------- */
      const side = [];
      const filePanel = BT.el('section', { class: 'panel' });
      filePanel.appendChild(BT.el('div', { class: 'panel-head' }, [BT.el('h3', { text: '1 · 导入数据' })]));
      const fbody = BT.el('div', { class: 'panel-body' });
      const drop = BT.el('label', { class: 'file-drop' }, [
        BT.el('b', { text: '拖入 CSV 或点击选择' }),
        BT.el('span', { text: '支持逗号 / 分号 / Tab 分隔；首行为表头' }),
        BT.el('input', { type: 'file', accept: '.csv,.txt,text/csv' })
      ]);
      const fileInput = drop.querySelector('input');
      fbody.appendChild(drop);
      const exampleBtn = BT.el('button', { class: 'btn ghost', type: 'button', text: '载入示例数据', style: { marginTop: '9px', width: '100%', justifyContent: 'center' } });
      fbody.appendChild(exampleBtn);
      fbody.appendChild(BT.el('div', { class: 'small muted', id: 'anaFile', style: { marginTop: '8px' }, text: '尚未载入数据' }));
      filePanel.appendChild(fbody);
      side.push(filePanel);

      const mapPanel = BT.el('section', { class: 'panel' });
      mapPanel.appendChild(BT.el('div', { class: 'panel-head' }, [BT.el('h3', { text: '2 · 通道映射' })]));
      const mbody = BT.el('div', { class: 'panel-body' });
      const mapGrid = BT.el('div', { class: 'form-grid' });
      mbody.appendChild(mapGrid);
      const mapSelects = {};
      MAPS.forEach(function (m) {
        const wrap = BT.el('label', { class: 'field' });
        wrap.appendChild(BT.el('span', { class: 'field-label', text: m.label }));
        const ctl = BT.el('span', { class: 'field-control' });
        const sel = BT.el('select', { 'data-map': m.key });
        ctl.appendChild(sel); wrap.appendChild(ctl);
        mapGrid.appendChild(wrap);
        mapSelects[m.key] = sel;
      });
      const unitGrid = BT.el('div', { class: 'form-grid', style: { marginTop: '9px' } });
      const speedUnit = BT.el('select', {}, [
        BT.el('option', { value: 'kmh', text: 'km/h' }), BT.el('option', { value: 'ms', text: 'm/s' })
      ]);
      const pressUnit = BT.el('select', {}, [
        BT.el('option', { value: 'MPa', text: 'MPa' }), BT.el('option', { value: 'bar', text: 'bar' })
      ]);
      const decelUnit = BT.el('select', {}, [
        BT.el('option', { value: 'mps2', text: 'm/s²' }), BT.el('option', { value: 'g', text: 'g' })
      ]);
      [['车速单位', speedUnit], ['压力单位', pressUnit], ['减速度单位', decelUnit]].forEach(function (it) {
        const wrap = BT.el('label', { class: 'field' });
        wrap.appendChild(BT.el('span', { class: 'field-label', text: it[0] }));
        const ctl = BT.el('span', { class: 'field-control' }); ctl.appendChild(it[1]);
        wrap.appendChild(ctl); unitGrid.appendChild(wrap);
      });
      mbody.appendChild(unitGrid);
      const smoothWrap = BT.el('label', { class: 'field', style: { marginTop: '9px' } });
      smoothWrap.appendChild(BT.el('span', { class: 'field-label', text: '平滑窗口（采样点）' }));
      const smoothCtl = BT.el('span', { class: 'field-control' });
      const smoothInp = BT.el('input', { type: 'number', min: 1, max: 101, step: 2, value: 5 });
      smoothCtl.appendChild(smoothInp);
      smoothCtl.appendChild(BT.el('span', { class: 'field-unit', text: 'pts' }));
      smoothWrap.appendChild(smoothCtl);
      mbody.appendChild(smoothWrap);
      const exportBtn = BT.el('button', { class: 'btn ghost', type: 'button', text: '导出处理结果 CSV', style: { marginTop: '10px', width: '100%', justifyContent: 'center' } });
      mbody.appendChild(exportBtn);
      mapPanel.appendChild(mbody);
      side.push(mapPanel);

      side.push(BT.panel('指标口径', [
        BT.el('div', { class: 'stack' }, [
          BT.note('制动距离：自动以压力 > 基线+0.2 MPa 或减速度 > 0.1g 的点作为建压起点，对车速做梯形积分至 v ≤ 0.5 km/h；表中另列“含反应总距离”。MFDD 取 v<sub>b</sub> = 0.8v₀、v<sub>e</sub> = 0.1v₀ 两点，按 <b>(v<sub>b</sub>²−v<sub>e</sub>²)/(25.92·(s<sub>e</sub>−s<sub>b</sub>))</b> 计算（v: km/h，s: m）。', 'info'),
          BT.note('压力—减速度增益用最小二乘拟合，仅取压力 > 0.5 MPa 的建压段；R² 低时说明存在 ABS 调节、路面变化或通道不同步。', 'info')
        ])
      ]));

      /* ---------- main ---------- */
      const kpiHost = BT.el('div');
      const emptyHost = BT.el('div');
      const chartsHost = BT.el('div', { class: 'stack' });
      const previewHost = BT.el('div');
      const tableHost = BT.el('div');
      const main = [kpiHost, emptyHost, chartsHost, tableHost, previewHost];
      root.appendChild(BT.workbench(side, main));

      const speedChart = BT.el('div'), pressureChart = BT.el('div'), decelChart = BT.el('div'), scatterChart = BT.el('div');
      chartsHost.appendChild(BT.chartCard('车速—时间', '积分得到制动距离；标记为停车点', speedChart));
      chartsHost.appendChild(BT.el('div', { class: 'split-2' }, [
        BT.chartCard('轮端压力—时间', '建压与保压过程', pressureChart),
        BT.chartCard('减速度—时间', '原始与平滑信号', decelChart)
      ]));
      chartsHost.appendChild(BT.chartCard('压力—减速度特性', '最小二乘拟合得到整车压力增益', scatterChart));

      function setEmpty(msg) {
        emptyHost.innerHTML = '';
        const box = BT.el('div', { class: 'empty' }, [
          BT.el('div', { text: msg }),
          BT.el('button', { class: 'btn', type: 'button', text: '载入示例数据', style: { marginTop: '12px' } })
        ]);
        box.querySelector('button').addEventListener('click', function () { loadText(sampleCSV(), 'demo_100-0.csv'); });
        emptyHost.appendChild(box);
        kpiHost.innerHTML = ''; tableHost.innerHTML = ''; previewHost.innerHTML = '';
        [speedChart, pressureChart, decelChart, scatterChart].forEach(function (h) { h.innerHTML = '<div class="chart-empty">载入数据后显示</div>'; });
      }

      function loadText(text, name) {
        const parsed = BT.parseCSV(text);
        if (!parsed.headers.length || parsed.rows.length < 2) {
          BT.toast('CSV 解析失败或数据行不足');
          return;
        }
        state.headers = parsed.headers;
        state.rows = parsed.rows;
        state.fileName = name || 'data.csv';
        state.columns = {};
        parsed.headers.forEach(function (h, idx) {
          state.columns[h] = parsed.rows.map(function (r) { return r[idx]; });
        });
        BT.q('#anaFile').textContent = state.fileName + ' · ' + parsed.rows.length + ' 行 × ' + parsed.headers.length + ' 列';
        MAPS.forEach(function (m) {
          const sel = mapSelects[m.key];
          sel.innerHTML = '';
          sel.appendChild(BT.el('option', { value: '', text: '— 未使用 —' }));
          parsed.headers.forEach(function (h) { sel.appendChild(BT.el('option', { value: h, text: h })); });
          sel.value = autoPick(parsed.headers, m.key) || '';
        });
        // unit auto-detect
        const findHeader = function (re) { return parsed.headers.find(function (h) { return re.test(h); }); };
        const sh = findHeader(/km\/h|kmh/i);
        speedUnit.value = sh ? 'kmh' : (findHeader(/m\/s/i) ? 'ms' : 'kmh');
        const ph = findHeader(/bar/i);
        pressUnit.value = ph && !/mpa/i.test(ph) ? 'bar' : 'MPa';
        const dh = findHeader(/\(g\)|\[g\]| g$/i);
        decelUnit.value = dh ? 'g' : 'mps2';
        compute();
      }

      function compute() {
        if (!state.rows.length) { setEmpty('请导入试验数据，或先载入示例查看分析流程'); return; }
        emptyHost.innerHTML = '';
        const read = function (key) {
          const col = mapSelects[key].value;
          if (!col || !state.columns[col]) return null;
          return state.columns[col].map(BT.toNum);
        };
        const tRaw = read('time');
        const sRaw = read('speed');
        const pRaw = read('pressure');
        const dRaw = read('decel');
        const pedRaw = read('pedal');
        const n = state.rows.length;
        if (!sRaw && !dRaw) {
          kpiHost.innerHTML = ''; tableHost.innerHTML = '';
          setEmpty('请至少映射“车速”或“减速度”通道。');
          return;
        }
        const t = [];
        for (let i = 0; i < n; i++) {
          if (tRaw && isFinite(tRaw[i])) t.push(tRaw[i]);
          else t.push(i * 0.01);
        }
        let v = [];
        if (sRaw) {
          v = sRaw.map(function (x) { return speedUnit.value === 'kmh' ? x / 3.6 : x; });
        } else {
          // integrate decel from initial speed = max decel? use first valid / 100 km/h fallback
          const a = dRaw.map(function (x) { return decelUnit.value === 'g' ? x * BT.g : x; });
          let vv = 100 / 3.6;
          v.push(vv);
          for (let i = 1; i < n; i++) {
            const dt = Math.max(1e-4, t[i] - t[i - 1]);
            vv = Math.max(0, vv - 0.5 * ((a[i] || 0) + (a[i - 1] || 0)) * dt);
            v.push(vv);
          }
        }
        let a = [];
        if (dRaw) {
          a = dRaw.map(function (x) { return decelUnit.value === 'g' ? x * BT.g : x; });
        } else {
          for (let i = 0; i < n; i++) {
            const i0 = Math.max(0, i - 1), i1 = Math.min(n - 1, i + 1);
            const dt = Math.max(1e-4, t[i1] - t[i0]);
            a.push(-(v[i1] - v[i0]) / dt);
          }
        }
        let p = pRaw ? pRaw.map(function (x) { return pressUnit.value === 'bar' ? x / 10 : x; }) : null;
        const win = Math.max(1, Math.round(smoothInp.value || 1));
        const aSm = BT.smooth(a, win);

        // Brake application point: pressure rise or deceleration threshold.
        // Braking distance and MFDD must start here, not at the beginning of
        // the log (which may contain seconds of coasting/reaction).
        let brakeIdx = 0;
        if (p) {
          const baseVals = p.slice(0, Math.min(5, n)).filter(isFinite);
          const pBase = baseVals.length ? Math.min.apply(null, baseVals) : NaN;
          const pThreshold = isFinite(pBase) ? Math.max(0.2, pBase + 0.2) : 0.2;
          for (let i = 1; i < n; i++) {
            if (isFinite(p[i]) && p[i] > pThreshold) { brakeIdx = i; break; }
          }
        }
        if (brakeIdx === 0 && dRaw) {
          const aThreshold = Math.max(0.1 * BT.g, 0.1);
          for (let i = 1; i < n; i++) {
            if (isFinite(a[i]) && a[i] > aThreshold) { brakeIdx = i; break; }
          }
        }
        if (brakeIdx >= n - 1) brakeIdx = 0;

        let v0 = v[brakeIdx];
        if (!(v0 > 0)) {
          const validV = v.filter(function (x) { return isFinite(x) && x > 0; });
          v0 = validV.length ? Math.max.apply(null, validV) : 0;
        }
        if (!(v0 > 0)) { setEmpty('车速通道无有效正值，请检查单位或映射。'); return; }

        let stopIdx = -1;
        for (let i = brakeIdx; i < n; i++) {
          if (isFinite(v[i]) && v[i] <= 0.5 / 3.6) { stopIdx = i; break; }
        }
        if (stopIdx < 0) stopIdx = n - 1;

        let brakeDist = 0, totalDist = 0;
        const distArr = new Array(n).fill(0);
        const totalArr = new Array(n).fill(0);
        for (let i = 1; i < n; i++) {
          const dt = Math.max(0, t[i] - t[i - 1]);
          const seg = 0.5 * (v[i] + v[i - 1]) * dt;
          if (i <= stopIdx) totalDist += seg;
          if (i > brakeIdx && i <= stopIdx) brakeDist += seg;
          distArr[i] = brakeDist;
          totalArr[i] = totalDist;
        }
        const stopTime = t[stopIdx] - t[brakeIdx];
        const totalTime = t[stopIdx] - t[0];
        const v0kmh = v0 * 3.6;
        // MFDD
        const cross = function (target) {
          for (let i = brakeIdx + 1; i < n; i++) {
            if ((v[i - 1] - target) * (v[i] - target) <= 0 && v[i - 1] >= v[i]) {
              const den = v[i - 1] - v[i];
              const k = den === 0 ? 0 : (v[i - 1] - target) / den;
              return { s: distArr[i - 1] + (distArr[i] - distArr[i - 1]) * k, v: target };
            }
          }
          return null;
        };
        const b = cross(0.8 * v0), e = cross(0.1 * v0);
        let mfdd = NaN;
        if (b && e && e.s > b.s) {
          mfdd = (Math.pow(b.v * 3.6, 2) - Math.pow(e.v * 3.6, 2)) / (25.92 * (e.s - b.s));
        }
        const aWindow = aSm.slice(brakeIdx, stopIdx + 1).filter(isFinite);
        const maxA = aWindow.length ? Math.max.apply(null, aWindow) : 0;
        const avgA = brakeDist > 0 ? v0 * v0 / (2 * brakeDist) : 0;
        // pressure fit
        let fit = null, fitPts = [];
        if (p) {
          const pts = [];
          for (let i = brakeIdx; i <= stopIdx; i++) {
            if (isFinite(p[i]) && p[i] > 0.5 && isFinite(aSm[i]) && aSm[i] > 0.2) pts.push([p[i], aSm[i]]);
          }
          if (pts.length > 5) {
            fit = BT.regression(pts);
            const pmin = Math.min.apply(null, pts.map(function (q) { return q[0]; }));
            const pmax = Math.max.apply(null, pts.map(function (q) { return q[0]; }));
            fitPts = [[pmin, fit.a + fit.b * pmin], [pmax, fit.a + fit.b * pmax]];
          }
        }

        kpiHost.innerHTML = '';
        kpiHost.appendChild(BT.kpis([
          ['初速度', BT.fmt(v0kmh, 1), 'km/h', brakeIdx > 0 ? '建压起点' : '首采样'],
          ['制动距离', BT.fmt(brakeDist, 1), 'm', brakeIdx > 0 ? '从建压起点积分' : '从首采样积分'],
          ['最大减速度', BT.fmt(maxA / BT.g, 2), 'g', '平滑后 ' + BT.fmt(maxA, 2) + ' m/s²', maxA / BT.g >= 0.8 ? 'ok' : 'warn'],
          ['MFDD', BT.fmt(mfdd / BT.g, 2), 'g', '0.8v₀ → 0.1v₀', mfdd / BT.g >= 0.75 ? 'ok' : 'warn'],
          ['压力增益', fit ? BT.fmt(fit.b / BT.g, 2) : '—', 'g/MPa', fit ? 'R² = ' + fit.r2.toFixed(3) : '未映射压力']
        ]));

        const ts = t.map(function (x, i) { return [x, v[i] * 3.6]; });
        BT.chart(speedChart, {
          height: 250, xDomain: [t[0], t[n - 1]], yDomain: [0, Math.max(20, v0kmh * 1.1)],
          xLabel: '时间（s）', yLabel: '车速（km/h）',
          xFmt: function (x) { return x.toFixed(1); }, yFmt: function (y) { return y.toFixed(0); },
          series: [{ name: '车速', data: ts, color: '#17657f', width: 2 }],
          lines: [
            { x: t[brakeIdx], label: '制动起点', color: '#17657f' },
            { x: t[stopIdx], label: '停车', color: '#b42318' }
          ]
        });
        if (p) {
          BT.chart(pressureChart, {
            height: 235, xDomain: [t[0], t[n - 1]], yDomain: [0, Math.max(2, Math.max.apply(null, p.filter(isFinite)) * 1.1)],
            xLabel: '时间（s）', yLabel: '压力（MPa）',
            series: [{ name: '轮端压力', data: t.map(function (x, i) { return [x, p[i]]; }), color: '#a86412', width: 1.7 }]
          });
        } else {
          pressureChart.innerHTML = '<div class="chart-empty">未映射压力通道</div>';
        }
        BT.chart(decelChart, {
          height: 235, xDomain: [t[0], t[n - 1]], yDomain: [0, Math.max(2, maxA * 1.15)],
          xLabel: '时间（s）', yLabel: '减速度（m/s²）',
          series: [
            { name: '原始', data: t.map(function (x, i) { return [x, a[i]]; }), color: '#b8c2cd', width: 1, opacity: .8 },
            { name: '平滑', data: t.map(function (x, i) { return [x, aSm[i]]; }), color: '#c8502a', width: 2 }
          ]
        });
        if (p && fitPts.length) {
          BT.chart(scatterChart, {
            height: 280, xDomain: [0, Math.max(2, Math.max.apply(null, p.filter(isFinite)) * 1.05)], yDomain: [0, Math.max(2, maxA * 1.15)],
            xLabel: '轮端压力（MPa）', yLabel: '减速度（m/s²）',
            series: [
              { name: '采样点', data: t.map(function (x, i) { return [p[i], aSm[i]]; }).filter(function (q) { return isFinite(q[0]) && isFinite(q[1]); }), color: '#98a2b3', type: 'points', pointR: 1.6, opacity: .55 },
              { name: '线性拟合', data: fitPts, color: '#c8502a', width: 2, dash: '6 4' }
            ]
          });
        } else {
          scatterChart.innerHTML = '<div class="chart-empty">需要压力通道且有效采样点 > 5</div>';
        }

        tableHost.innerHTML = '';
        tableHost.appendChild(BT.panel('分析指标', [
          BT.table(['指标', '数值', '说明'], [
            ['采样点 / 时长', n + ' / ' + (t[n - 1] - t[0]).toFixed(2) + ' s', '平均采样 ' + ((t[n - 1] - t[0]) / Math.max(1, n - 1) * 1000).toFixed(1) + ' ms'],
            ['制动起点', t[brakeIdx].toFixed(2) + ' s', brakeIdx > 0 ? '压力/减速度触发' : '首采样（无触发通道）'],
            ['初速度', v0kmh.toFixed(2) + ' km/h', '建压起点车速'],
            ['制动距离', brakeDist.toFixed(2) + ' m', '从建压起点至 v ≤ 0.5 km/h'],
            ['总距离', totalDist.toFixed(2) + ' m', '从首采样至停车（含反应/滑行）'],
            ['制动时间', stopTime.toFixed(2) + ' s', '从建压起点到停车'],
            ['总时间', totalTime.toFixed(2) + ' s', '从首采样到停车'],
            ['最大减速度', (maxA / BT.g).toFixed(3) + ' g', maxA.toFixed(2) + ' m/s²'],
            ['平均减速度', (avgA / BT.g).toFixed(3) + ' g', avgA.toFixed(2) + ' m/s²（按距离反算）'],
            ['MFDD', isFinite(mfdd) ? (mfdd / BT.g).toFixed(3) + ' g' : '—', isFinite(mfdd) ? mfdd.toFixed(2) + ' m/s²' : '速度区间不足'],
            ['压力—减速度斜率', fit ? fit.b.toFixed(2) + ' (m/s²)/MPa' : '—', fit ? 'R² = ' + fit.r2.toFixed(4) + '，截距 ' + fit.a.toFixed(2) : '—'],
            ['压力增益', fit ? (fit.b / BT.g).toFixed(2) + ' g/MPa' : '—', fit ? 'n = ' + fit.n : '—']
          ], { caption: '数据质量与性能指标', captionRight: state.fileName })
        ]));

        previewHost.innerHTML = '';
        const ph = state.headers.slice(0, 8);
        const prow = [];
        for (let i = 0; i < Math.min(5, n); i++) {
          prow.push(ph.map(function (h) { return state.columns[h][i]; }));
        }
        previewHost.appendChild(BT.panel('原始数据预览（前 5 行）', [
          BT.table(ph, prow, { caption: '共 ' + n + ' 行', captionRight: '列数 ' + state.headers.length })
        ]));

        exportBtn.onclick = function () {
          const out = [['time_s', 'speed_kmh', 'pressure_MPa', 'decel_mps2', 'decel_smooth_mps2', 'distance_m', 'distance_total_m']];
          for (let i = 0; i < n; i++) {
            out.push([t[i].toFixed(3), (v[i] * 3.6).toFixed(3), p && isFinite(p[i]) ? p[i].toFixed(4) : '',
              isFinite(a[i]) ? a[i].toFixed(4) : '', isFinite(aSm[i]) ? aSm[i].toFixed(4) : '', distArr[i].toFixed(3), totalArr[i].toFixed(3)]);
          }
          BT.download('brake_analysis_' + (state.fileName || 'data').replace(/\.[^.]+$/, '') + '.csv', out.map(function (r) { return r.join(','); }).join('\n'), 'text/csv;charset=utf-8');
        };
      }

      fileInput.addEventListener('change', function () {
        const file = fileInput.files && fileInput.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = function () { loadText(String(reader.result), file.name); };
        reader.readAsText(file, 'utf-8');
      });
      ['dragenter', 'dragover'].forEach(function (ev) {
        drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.add('drag'); });
      });
      ['dragleave', 'drop'].forEach(function (ev) {
        drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.remove('drag'); });
      });
      drop.addEventListener('drop', function (e) {
        e.preventDefault();
        const file = e.dataTransfer.files && e.dataTransfer.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = function () { loadText(String(reader.result), file.name); };
        reader.readAsText(file, 'utf-8');
      });
      exampleBtn.addEventListener('click', function () { loadText(sampleCSV(), 'demo_100-0.csv'); });
      MAPS.forEach(function (m) { mapSelects[m.key].addEventListener('change', compute); });
      [speedUnit, pressUnit, decelUnit, smoothInp].forEach(function (el) { el.addEventListener('change', compute); });

      setEmpty('导入试验数据开始分析；没有数据时可先载入示例。');
      if (/[?&]demo=1/.test(location.search)) loadText(sampleCSV(), 'demo_100-0.csv');
    }
  });
})(window.BT);
