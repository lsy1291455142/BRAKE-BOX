/* ============================================================
   Brake Lab · application shell, navigation, project I/O
   ============================================================ */
(function (BT) {
  'use strict';

  const GROUPS = ['整车性能', '零部件开发', '匹配与数据', '工况库', '参考'];
  let current = 'home';

  function modules() { return BT.modules || []; }
  function moduleById(id) { return modules().find(function (m) { return m.id === id; }); }

  function buildNav() {
    const nav = BT.q('#nav');
    nav.innerHTML = '';
    const home = BT.el('button', { class: 'nav-item', 'data-id': 'home', type: 'button' }, [
      BT.el('span', { class: 'nav-ico', html: BT.icon('home', 18) }),
      BT.el('span', { text: '工作台' }),
      BT.el('span', { class: 'nav-num', text: '00' })
    ]);
    nav.appendChild(home);
    let n = 0;
    GROUPS.forEach(function (g) {
      const list = modules().filter(function (m) { return m.group === g; });
      if (!list.length) return;
      nav.appendChild(BT.el('div', { class: 'nav-group', text: g }));
      list.forEach(function (m) {
        n++;
        nav.appendChild(BT.el('button', { class: 'nav-item', 'data-id': m.id, type: 'button' }, [
          BT.el('span', { class: 'nav-ico', html: BT.icon(m.icon, 18) }),
          BT.el('span', { text: m.name }),
          BT.el('span', { class: 'nav-num', text: String(n).padStart(2, '0') })
        ]));
      });
    });
    BT.qa('.nav-item', nav).forEach(function (b) {
      b.addEventListener('click', function () {
        location.hash = '#/' + b.dataset.id;
        document.body.classList.remove('nav-open');
      });
    });
  }

  function updateShell() {
    const id = current;
    const m = moduleById(id);
    BT.q('#groupName').textContent = m ? m.group : 'WORKBENCH';
    BT.q('#pageTitle').textContent = m ? m.name : '制动系统开发工具箱';
    BT.qa('.nav-item').forEach(function (b) { b.classList.toggle('active', b.dataset.id === id); });
    const v = BT.vehicle, d = BT.derived(v);
    BT.q('#vehLabel').textContent = (v.name || '整车参数') + ' · φ₀ ' + d.phi0.toFixed(2);
    const side = BT.q('#sideVehicle');
    side.innerHTML = '';
    side.appendChild(BT.el('b', { text: v.name || '未命名车型' }));
    side.appendChild(BT.el('span', { text: BT.fmt(v.mass, 0) + ' kg · L ' + BT.fmt(v.L, 0) + ' mm · β ' + d.beta.toFixed(3) }));
    side.title = '点击编辑整车参数';
  }

  function renderHome() {
    const v = BT.vehicle, d = BT.derived(v);
    const content = BT.q('#content');
    const hero = BT.el('section', { class: 'hero' }, [
      BT.el('span', { class: 'eyebrow', style: { color: '#f08a62' }, text: 'PASSENGER CAR BRAKE TOOLBOX' }),
      BT.el('h2', { text: '把制动开发的高频计算，放在一个工作台里。' }),
      BT.el('p', { text: '从整车轴荷、制动力分配到卡钳/主缸/助力器匹配，从热容量、摩擦副到试验数据与灵敏度分析。零依赖、离线运行，参数与项目保存在本机。' }),
      BT.el('div', { class: 'hero-tags' }, ['计算分析', '零部件开发', '系统匹配', '试验数据', '法规参考'].map(function (t) { return BT.el('span', { class: 'htag', text: t }); })),
      BT.el('div', { class: 'hero-stats' }, [
        BT.el('div', { class: 'hero-stat' }, [BT.el('b', { text: BT.fmt(v.mass, 0) + ' kg' }), BT.el('span', { text: '整备质量' })]),
        BT.el('div', { class: 'hero-stat' }, [BT.el('b', { text: BT.fmt(v.L, 0) + ' mm' }), BT.el('span', { text: '轴距' })]),
        BT.el('div', { class: 'hero-stat' }, [BT.el('b', { text: d.beta.toFixed(3) }), BT.el('span', { text: '设计 β' })]),
        BT.el('div', { class: 'hero-stat' }, [BT.el('b', { text: d.phi0.toFixed(2) }), BT.el('span', { text: '同步附着系数 φ₀' })])
      ])
    ]);
    content.appendChild(hero);

    const grid = BT.el('div', { class: 'home-grid' });
    const modulesPanel = BT.el('section', { class: 'panel' });
    modulesPanel.appendChild(BT.el('div', { class: 'panel-head' }, [
      BT.el('h3', { text: '模块导航' }),
      BT.el('span', { class: 'sub', text: modules().length + ' 个模块 · 点击进入' })
    ]));
    const mg = BT.el('div', { class: 'module-grid', style: { padding: '14px' } });
    modules().filter(function (m) { return m.id !== 'reference'; }).forEach(function (m) {
      const card = BT.el('button', { class: 'mod-card', type: 'button' }, [
        BT.el('div', { class: 'mc-top' }, [
          BT.el('span', { class: 'mc-ico', html: BT.icon(m.icon, 14) }),
          BT.el('b', { text: m.name })
        ]),
        BT.el('span', { text: m.desc }),
        BT.el('span', { class: 'mc-go', text: m.group })
      ]);
      card.addEventListener('click', function () { location.hash = '#/' + m.id; });
      mg.appendChild(card);
    });
    modulesPanel.appendChild(mg);
    grid.appendChild(modulesPanel);

    const right = BT.el('div', { class: 'stack' });
    const proj = BT.el('section', { class: 'panel' });
    proj.appendChild(BT.el('div', { class: 'panel-head' }, [BT.el('h3', { text: '当前项目' })]));
    const pb = BT.el('div', { class: 'panel-body' });
    pb.appendChild(BT.el('div', { style: { fontSize: '15px', fontWeight: 650, marginBottom: '3px' }, text: v.name || '未命名车型' }));
    pb.appendChild(BT.el('div', { class: 'small muted', text: '整备 ' + BT.fmt(v.mass, 0) + ' kg · 轴距 ' + BT.fmt(v.L, 0) + ' mm · 质心高 ' + BT.fmt(v.h, 0) + ' mm' }));
    pb.appendChild(BT.el('div', { class: 'hr' }));
    pb.appendChild(BT.el('dl', { class: 'veh-strip', style: { marginBottom: '12px', gridTemplateColumns: 'repeat(3, 1fr)' } }, [
      ['主缸', 'φ' + BT.fmt(v.mcD, 2) + ' mm'],
      ['前卡钳', v.front.pistons + '×φ' + BT.fmt(v.front.pistonD, 0)],
      ['后卡钳', v.rear.pistons + '×φ' + BT.fmt(v.rear.pistonD, 0)],
      ['前片 μ', BT.fmt(v.front.mu, 2)],
      ['β', d.beta.toFixed(3)],
      ['φ₀', d.phi0.toFixed(2)]
    ].map(function (it) {
      return BT.el('div', {}, [BT.el('dt', { text: it[0] }), BT.el('dd', { text: it[1] })]);
    })));
    const btnRow = BT.el('div', { class: 'row' }, [
      BT.el('button', { class: 'btn', type: 'button', text: '编辑整车参数', onclick: function () { openVehicle(); } }),
      BT.el('button', { class: 'btn ghost', type: 'button', text: '保存项目', onclick: saveProject })
    ]);
    pb.appendChild(btnRow);
    proj.appendChild(pb);
    right.appendChild(proj);

    const flow = BT.el('section', { class: 'panel' });
    flow.appendChild(BT.el('div', { class: 'panel-head' }, [BT.el('h3', { text: '推荐工作流' })]));
    const fb = BT.el('div', { class: 'panel-body', style: { paddingTop: '4px' } });
    const steps = [
      ['01', '建立整车与硬件基准', '质量、轴距、质心、前后卡钳/盘/主缸/助力器', 'dynamics'],
      ['02', '校核制动力分配', '看 β、φ₀ 与后轴先抱死风险', 'distribution'],
      ['03', '匹配踏板感与液压', '0.5g 踏板力/行程、1g 踏板力', 'pedal'],
      ['04', '校核热与摩擦副', '单次/连续温升、面能量、磨损寿命', 'thermal'],
      ['05', '用试验数据闭环', 'MFDD、制动距离、压力增益', 'analysis']
    ];
    steps.forEach(function (s) {
      const r = BT.el('button', { class: 'quick-row', type: 'button' }, [
        BT.el('span', { class: 'qr-num', text: s[0] }),
        BT.el('span', {}, [BT.el('b', { text: s[1] }), BT.el('span', { text: s[2] })]),
        BT.el('span', { class: 'qr-arrow', text: '›' })
      ]);
      r.addEventListener('click', function () { location.hash = '#/' + s[3]; });
      fb.appendChild(r);
    });
    flow.appendChild(fb);
    right.appendChild(flow);

    right.appendChild(BT.el('div', { class: 'note info' }, [
      BT.el('span', { class: 'n-ico', text: 'i' }),
      BT.el('span', { html: '所有计算均为<b>工程估算</b>，用于方案筛选与趋势判断；认证与量产放行请以实车试验、台架数据及适用法规原文为准。' })
    ]));

    grid.appendChild(right);
    content.appendChild(grid);
  }

  function render(id) {
    current = id;
    const content = BT.q('#content');
    content.innerHTML = '';
    if (id === 'home') renderHome();
    else {
      const m = moduleById(id);
      if (!m) { location.hash = '#/home'; return; }
      m.render(content);
    }
    updateShell();
    if (BT.applyBeginner) BT.applyBeginner();
    try { localStorage.setItem('brakelab.last.v1', id); } catch (e) { /* ignore */ }
    window.scrollTo({ top: 0, behavior: 'auto' });
  }
  BT.renderCurrent = function () { render(current); };

  function openVehicle() {
    BT.openVehicleModal(function () { render(current); });
  }

  function saveProject() {
    const data = {
      app: 'Brake Lab',
      version: 1,
      savedAt: new Date().toISOString(),
      vehicle: BT.vehicle,
      inputs: BT.inputs
    };
    const name = (BT.vehicle.name || 'brake').replace(/[\\/:*?"<>|\s]+/g, '_');
    BT.download('brake_project_' + name + '_' + BT.today() + '.json', JSON.stringify(data, null, 2), 'application/json');
    BT.toast('项目已保存为 JSON');
  }

  function loadProject(file) {
    const reader = new FileReader();
    reader.onload = function () {
      try {
        const data = JSON.parse(String(reader.result));
        if (!data || !data.vehicle || !data.vehicle.front) throw new Error('bad file');
        BT.vehicle = data.vehicle;
        BT.inputs = data.inputs || {};
        BT.saveVehicle();
        try { localStorage.setItem('brakelab.inputs.v1', JSON.stringify(BT.inputs)); } catch (e) { /* ignore */ }
        BT.toast('项目已载入：' + (BT.vehicle.name || '未命名'));
        render(current);
      } catch (e) {
        BT.toast('项目文件无效或不是 Brake Lab 项目');
      }
    };
    reader.readAsText(file, 'utf-8');
  }

  function route() {
    const id = (location.hash || '').replace(/^#\/?/, '') || 'home';
    render(id);
  }

  function init() {
    BT.loadSavedVehicle();
    try { BT.beginner = localStorage.getItem('brakelab.beginner.v1') !== '0'; } catch (e) { BT.beginner = true; }
    buildNav();
    const last = (function () { try { return localStorage.getItem('brakelab.last.v1'); } catch (e) { return null; } })();
    if (!location.hash && last && (last === 'home' || moduleById(last))) location.hash = '#/' + last;
    route();
    window.addEventListener('hashchange', route);

    BT.q('#beginnerBtn').addEventListener('click', function () {
      BT.beginner = !BT.beginner;
      try { localStorage.setItem('brakelab.beginner.v1', BT.beginner ? '1' : '0'); } catch (e) { /* ignore */ }
      if (BT.applyBeginner) BT.applyBeginner();
      BT.toast(BT.beginner ? '已展开模型原理图' : '已收起模型原理图');
    });
    BT.q('#vehicleBtn').addEventListener('click', openVehicle);
    BT.q('#sideVehicle').addEventListener('click', openVehicle);
    BT.q('#saveBtn').addEventListener('click', saveProject);
    BT.q('#openBtn').addEventListener('click', function () { BT.q('#fileInput').click(); });
    BT.q('#fileInput').addEventListener('change', function (e) {
      const f = e.target.files && e.target.files[0];
      if (f) loadProject(f);
      e.target.value = '';
    });
    BT.q('#printBtn').addEventListener('click', function () { window.print(); });
    BT.q('#menuBtn').addEventListener('click', function () { document.body.classList.toggle('nav-open'); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        document.body.classList.remove('nav-open');
        const modal = BT.q('#vehicleModal');
        if (modal && modal.classList.contains('open')) {
          modal.classList.remove('open');
          modal.setAttribute('aria-hidden', 'true');
        }
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        saveProject();
      }
    });
    // close mobile nav when clicking outside
    document.addEventListener('click', function (e) {
      if (!document.body.classList.contains('nav-open')) return;
      if (!e.target.closest('#sidebar') && !e.target.closest('#menuBtn')) document.body.classList.remove('nav-open');
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})(window.BT);
