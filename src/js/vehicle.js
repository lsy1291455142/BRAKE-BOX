/* ============================================================
   Brake Lab · vehicle parameter dialog
   ============================================================ */
(function (BT) {
  'use strict';

  function getPath(obj, path) {
    return path.split('.').reduce(function (o, k) { return o ? o[k] : undefined; }, obj);
  }
  function setPath(obj, path, val) {
    const parts = path.split('.'), last = parts.pop();
    let o = obj;
    parts.forEach(function (k) { o = o[k]; });
    o[last] = val;
  }

  BT.loadSavedVehicle = function () {
    try {
      const raw = localStorage.getItem('brakelab.vehicle.v1');
      if (raw) {
        const v = JSON.parse(raw);
        if (BT.isValidVehicle && BT.isValidVehicle(v)) BT.vehicle = v;
      }
    } catch (e) { /* ignore */ }
  };
  BT.saveVehicle = function () {
    try { localStorage.setItem('brakelab.vehicle.v1', JSON.stringify(BT.vehicle)); } catch (e) { /* ignore */ }
  };

  function inputRow(path, label, value, unit, step, min) {
    const wrap = BT.el('label', { class: 'field' });
    const lab = BT.el('span', { class: 'field-label', text: label });
    const key = path.split('.').pop();
    const sym = BT.SYMBOL_BY_KEY && BT.SYMBOL_BY_KEY[key];
    if (sym) lab.appendChild(BT.el('span', { class: 'field-sym', text: sym.sym }));
    wrap.appendChild(lab);
    const ctl = BT.el('span', { class: 'field-control' });
    const inp = BT.el('input', { type: 'number', step: step || 'any', min: min === undefined ? 0 : min });
    inp.value = value;
    inp.dataset.path = path;
    ctl.appendChild(inp);
    if (unit) ctl.appendChild(BT.el('span', { class: 'field-unit', text: unit }));
    wrap.appendChild(ctl);
    return wrap;
  }

  function section(title, fields) {
    const sec = BT.el('section', { class: 'veh-sec' });
    sec.appendChild(BT.el('h4', { text: title }));
    const g = BT.el('div', { class: 'form-grid' });
    fields.forEach(function (f) { g.appendChild(inputRow.apply(null, f)); });
    sec.appendChild(g);
    return sec;
  }

  BT.openVehicleModal = function (onApply) {
    const modal = BT.q('#vehicleModal');
    const body = BT.q('#vehicleBody');
    body.innerHTML = '';
    const v = BT.vehicle;

    /* presets */
    const presetWrap = BT.el('div', {});
    presetWrap.appendChild(BT.el('div', { class: 'small muted', style: { marginBottom: '6px' }, text: '从模板开始（修改后点击“应用参数”生效）' }));
    const row = BT.el('div', { class: 'preset-row' });
    BT.PRESETS.forEach(function (p) {
      const b = BT.el('button', { class: 'preset-btn', type: 'button', text: p.name }, []);
      b.addEventListener('click', function () {
        const copy = BT.deepClone(p);
        copy.name = p.name;
        fillForm(copy);
        BT.toast('已载入模板：' + p.name);
      });
      row.appendChild(b);
    });
    presetWrap.appendChild(row);

    const nameRow = BT.el('label', { class: 'field', style: { marginBottom: '12px' } });
    nameRow.appendChild(BT.el('span', { class: 'field-label', text: '项目 / 车型名称' }));
    const nameCtl = BT.el('span', { class: 'field-control' });
    const nameInp = BT.el('input', { type: 'text' });
    nameInp.id = 'vehName';
    nameInp.value = v.name || '';
    nameCtl.appendChild(nameInp);
    nameRow.appendChild(nameCtl);
    presetWrap.appendChild(nameRow);
    body.appendChild(presetWrap);

    const grid = BT.el('div', { class: 'veh-grid' });
    grid.appendChild(section('整车参数', [
      ['mass', '整备质量', v.mass, 'kg', 1, 1],
      ['wheelR', '车轮滚动半径', v.wheelR, 'mm', 1, 1],
      ['L', '轴距', v.L, 'mm', 1, 1],
      ['h', '质心高度', v.h, 'mm', 1, 1],
      ['frontShare', '前轴静态荷比例', v.frontShare, '%', .1, 1],
      ['maxPressure', '系统最高压力', v.maxPressure, 'MPa', .1, 1]
    ]));
    grid.appendChild(section('前制动器', [
      ['front.re', '有效半径 Re', v.front.re, 'mm', .5, 1],
      ['front.pistons', '单侧活塞数', v.front.pistons, '个', 1, 1],
      ['front.pistonD', '活塞直径', v.front.pistonD, 'mm', .1, 1],
      ['front.mu', '摩擦系数 μ', v.front.mu, '—', .01, .05],
      ['front.discMass', '制动盘质量 / 个', v.front.discMass, 'kg', .1, .1],
      ['front.padArea', '单片摩擦片面积', v.front.padArea, 'cm²', .5, 1],
      ['front.discOD', '制动盘外径', v.front.discOD, 'mm', 1, 1],
      ['front.discID', '制动盘内径', v.front.discID, 'mm', 1, 1]
    ]));
    grid.appendChild(section('后制动器', [
      ['rear.re', '有效半径 Re', v.rear.re, 'mm', .5, 1],
      ['rear.pistons', '单侧活塞数', v.rear.pistons, '个', 1, 1],
      ['rear.pistonD', '活塞直径', v.rear.pistonD, 'mm', .1, 1],
      ['rear.mu', '摩擦系数 μ', v.rear.mu, '—', .01, .05],
      ['rear.discMass', '制动盘质量 / 个', v.rear.discMass, 'kg', .1, .1],
      ['rear.padArea', '单片摩擦片面积', v.rear.padArea, 'cm²', .5, 1],
      ['rear.discOD', '制动盘外径', v.rear.discOD, 'mm', 1, 1],
      ['rear.discID', '制动盘内径', v.rear.discID, 'mm', 1, 1]
    ]));
    grid.appendChild(section('液压与踏板', [
      ['mcD', '主缸直径', v.mcD, 'mm', .01, 1],
      ['pedalRatio', '踏板杠杆比', v.pedalRatio, '—', .05, .5],
      ['boost', '助力器助力比', v.boost, '—', .1, 1],
      ['jumpIn', '助力起始踏板力', v.jumpIn, 'N', 1, 0],
      ['boostMax', '最大助力', v.boostMax, 'N', 50, 0],
      ['deadTravel', '踏板空行程', v.deadTravel, 'mm', .5, 0],
      ['clearance', '单侧间隙', v.clearance, 'mm', .01, 0],
      ['calStiff', '卡钳轴向刚度', v.calStiff, 'N/mm', 100, 100],
      ['lineComp', '管路膨胀量', v.lineComp, 'mm³/MPa', 5, 0]
    ]));
    body.appendChild(grid);

    /* effective radius calculator */
    const reBox = BT.el('section', { class: 'veh-sec', style: { marginTop: '14px' } });
    reBox.appendChild(BT.el('h4', { text: '有效半径 Re 计算器（可选）' }));
    reBox.appendChild(BT.el('p', { class: 'small muted', style: { margin: '0 0 8px' }, text: 'Re = (2/3)·(Ro³ − Ri³)/(Ro² − Ri²)。Ro/Ri 为摩擦片外/内半径，不是制动盘外径。' }));
    const reGrid = BT.el('div', { class: 'form-grid', style: { gridTemplateColumns: '1fr 1fr 1fr auto auto' } });
    const axleSel = BT.el('select', {}, [BT.el('option', { value: 'front', text: '前制动器' }), BT.el('option', { value: 'rear', text: '后制动器' })]);
    const roInp = BT.el('input', { type: 'number', step: '0.5', value: '150' });
    const riInp = BT.el('input', { type: 'number', step: '0.5', value: '110' });
    [['制动器', axleSel], ['摩擦片外半径 Ro mm', roInp], ['内半径 Ri mm', riInp]].forEach(function (it) {
      const w = BT.el('label', { class: 'field' });
      w.appendChild(BT.el('span', { class: 'field-label', text: it[0] }));
      const c = BT.el('span', { class: 'field-control' }); c.appendChild(it[1]); w.appendChild(c);
      reGrid.appendChild(w);
    });
    const reBtn = BT.el('button', { class: 'btn ghost', type: 'button', text: '计算并填入' });
    const reResult = BT.el('span', { class: 'small muted', style: { alignSelf: 'center' }, text: '—' });
    reGrid.appendChild(reBtn); reGrid.appendChild(reResult);
    reBox.appendChild(reGrid);
    body.appendChild(reBox);
    reBtn.addEventListener('click', function () {
      const ro = parseFloat(roInp.value), ri = parseFloat(riInp.value);
      if (!(ro > ri && ri > 0)) { BT.toast('请输入有效的外/内半径（Ro > Ri > 0）'); return; }
      const re = (2 / 3) * (Math.pow(ro, 3) - Math.pow(ri, 3)) / (Math.pow(ro, 2) - Math.pow(ri, 2));
      const path = axleSel.value === 'front' ? 'front.re' : 'rear.re';
      const target = BT.q('[data-path="' + path + '"]', body);
      if (target) target.value = re.toFixed(2);
      reResult.textContent = 'Re = ' + re.toFixed(2) + ' mm';
      updatePreview();
      BT.toast('已填入' + (axleSel.value === 'front' ? '前' : '后') + '制动器 Re = ' + re.toFixed(2) + ' mm');
    });

    const preview = BT.el('div', { class: 'note info', id: 'vehPreview', style: { marginTop: '14px' } });
    body.appendChild(preview);

    function readForm() {
      const out = BT.deepClone(BT.vehicle);
      out.name = nameInp.value.trim() || '未命名车型';
      BT.qa('[data-path]', body).forEach(function (inp) {
        const val = parseFloat(inp.value);
        if (isFinite(val)) setPath(out, inp.dataset.path, val);
      });
      return out;
    }
    function updatePreview() {
      const o = readForm();
      if (o.mass > 0 && o.L > 0 && o.h > 0 && o.mcD > 0) {
        const d = BT.derived(o);
        const p05 = BT.pressureForDecel(0.5, o);
        preview.innerHTML = '<span class="n-ico">i</span><span>设计 β <b>' + d.beta.toFixed(3) +
          '</b> · 同步附着系数 φ₀ <b>' + d.phi0.toFixed(3) +
          '</b> · 0.5g 轮端压力 <b>' + p05.toFixed(2) + ' MPa</b> · 0.5g 踏板力 <b>' +
          BT.pedalForceForPressure(p05, o).toFixed(0) + ' N</b></span>';
      } else {
        preview.textContent = '请输入有效的整车与液压参数。';
      }
    }
    function fillForm(src) {
      nameInp.value = src.name || '';
      BT.qa('[data-path]', body).forEach(function (inp) {
        const val = getPath(src, inp.dataset.path);
        if (val !== undefined) inp.value = val;
      });
      updatePreview();
    }
    body.addEventListener('input', updatePreview);
    updatePreview();

    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
    nameInp.focus();

    const close = function () {
      modal.classList.remove('open');
      modal.setAttribute('aria-hidden', 'true');
    };
    BT.q('#modalClose').onclick = close;
    BT.q('#vehicleCancel').onclick = close;
    modal.onclick = function (e) { if (e.target === modal) close(); };
    BT.q('#vehicleApply').onclick = function () {
      const next = readForm();
      if (!BT.isValidVehicle(next)) {
        BT.toast('参数无效：质量/轴距/质心/主缸/卡钳/摩擦/压力等必须为正，前轴荷需在 20%–85%');
        return;
      }
      BT.vehicle = next;
      BT.saveVehicle();
      close();
      BT.toast('整车参数已更新');
      if (onApply) onApply();
    };
  };
})(window.BT);
