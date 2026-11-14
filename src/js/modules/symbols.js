/* ============================================================
   模块：符号与单位
   ============================================================ */
(function (BT) {
  'use strict';
  BT.modules = BT.modules || [];

  BT.modules.push({
    id: 'symbols',
    group: '参考',
    name: '符号与单位',
    icon: 'calc',
    desc: '每个参数/物理量的符号、单位、定义与用途',
    render: function (root) {
      const groups = [];
      BT.SYMBOLS.forEach(function (s) { if (groups.indexOf(s.group) < 0) groups.push(s.group); });
      const highRisk = BT.SYMBOLS.filter(function (s) { return s.risk === '高'; }).length;

      root.appendChild(BT.pageHead('SYMBOLS & UNITS', '符号与单位', '同一物理量只能有一个符号。本页是输入框旁橙色符号的总表：符号、名称、单位、定义、风险与使用模块，可搜索和导出。', [
        BT.badge(BT.SYMBOLS.length + ' 个符号', 'info'),
        BT.badge(highRisk + ' 个高风险', 'warn')
      ]));

      root.appendChild(BT.beginnerCard({
        title: '为什么每个输入框都要标符号？',
        svg: BT.diagram('symbolBoard'),
        principle: '制动计算里最常见的错误，不是公式不会，而是把“半径/直径”“单片/内外片”“主缸/轮端压力”混用。符号是防错的第一道门。',
        steps: [
          '先认符号：m 是整车质量，m_d 是单个制动盘质量；A_pad 是单片面积，A_cal 是单侧活塞面积。',
          '再看单位：mm 和 m、MPa 和 bar、g 和 m/s²，界面显示单位与公式内部单位必须分开。',
          '最后看用途：同一个 μ 在路面和摩擦片里含义不同，按模块上下文取值。'
        ],
        mistake: '把“符号相同”当成“定义相同”；例如 β 在分配、踏板和匹配里都出现，但定义必须始终是前制动力占比。',
        grade: 'A'
      }));

      root.appendChild(BT.kpis([
        ['符号总数', String(BT.SYMBOLS.length), '个', '覆盖整车/制动器/液压/热/驻车/试验'],
        ['分组', String(groups.length), '组', groups.join(' · ')],
        ['高风险符号', String(highRisk), '个', '定义不清就会算错'],
        ['已映射输入', String(Object.keys(BT.SYMBOL_BY_KEY || {}).length), '个', '输入框自动显示符号']
      ]));

      const toolbar = BT.el('div', { class: 'sym-toolbar' });
      const search = BT.el('input', { type: 'search', class: 'sym-search', placeholder: '搜索符号 / 名称 / 定义，例如：A_pad、主缸、面积' });
      const exportBtn = BT.el('button', { class: 'btn ghost', type: 'button', text: '导出 CSV' });
      toolbar.appendChild(search);
      toolbar.appendChild(exportBtn);
      root.appendChild(toolbar);

      const chips = BT.el('div', { class: 'filter-chips' });
      const host = BT.el('div', { class: 'sym-grid' });
      let active = '全部';
      ['全部'].concat(groups).forEach(function (g) {
        const b = BT.el('button', { class: 'filter-chip' + (g === active ? ' active' : ''), type: 'button', text: g });
        b.addEventListener('click', function () {
          active = g;
          BT.qa('.filter-chip', chips).forEach(function (x) { x.classList.toggle('active', x === b); });
          draw();
        });
        chips.appendChild(b);
      });
      root.appendChild(chips);
      root.appendChild(host);

      function draw() {
        const q = (search.value || '').trim().toLowerCase();
        const list = BT.SYMBOLS.filter(function (s) {
          const okGroup = active === '全部' || s.group === active;
          const hay = [s.sym, s.name, s.unit, s.def, s.note, s.used].join(' ').toLowerCase();
          return okGroup && (!q || hay.indexOf(q) >= 0);
        });
        host.innerHTML = '';
        if (!list.length) {
          host.appendChild(BT.el('div', { class: 'empty', text: '没有匹配的符号' }));
          return;
        }
        list.forEach(function (s) { host.appendChild(card(s)); });
      }

      function card(s) {
        const c = BT.el('div', { class: 'sym-card' });
        const head = BT.el('div', { class: 'sym-head' });
        head.appendChild(BT.el('span', { class: 'sym-glyph', text: s.sym }));
        head.appendChild(BT.badge(s.risk + '风险', s.risk === '高' ? 'bad' : s.risk === '中' ? 'warn' : 'neutral'));
        c.appendChild(head);
        c.appendChild(BT.el('div', { class: 'sym-name', text: s.name }));
        c.appendChild(BT.el('div', { class: 'sym-unit', text: s.unit }));
        c.appendChild(BT.el('p', { class: 'sym-def', text: s.def }));
        c.appendChild(BT.el('div', { class: 'sym-note', text: s.note }));
        c.appendChild(BT.el('div', { class: 'sym-used', text: '用于：' + s.used }));
        return c;
      }

      search.addEventListener('input', BT.debounce(draw, 80));
      exportBtn.addEventListener('click', function () {
        const rows = [['symbol', 'name', 'unit', 'group', 'definition', 'risk', 'note', 'used_in']];
        BT.SYMBOLS.forEach(function (s) {
          rows.push([s.sym, s.name, s.unit, s.group, s.def, s.risk, s.note, s.used]);
        });
        BT.download('brake_symbols.csv', rows.map(function (r) {
          return r.map(function (x) { return '"' + String(x).replace(/"/g, '""') + '"'; }).join(',');
        }).join('\n'), 'text/csv;charset=utf-8');
      });

      const rules = BT.panel('命名与口径规则', [
        BT.el('div', { class: 'split-2' }, [
          BT.el('ul', { class: 'rule-list' }, [
            BT.el('li', { html: '<b>变量</b>用斜体/等宽，<b>单位</b>用正体；界面单位与公式内部 SI 单位分开。' }),
            BT.el('li', { html: '下标：f/r 前/后，0 基准，max/min 极限，t/target 目标。' }),
            BT.el('li', { html: '希腊字母：β 分配、φ 附着、μ 摩擦、θ 坡道、τ 冷却、η 效率、Δ 增量。' }),
            BT.el('li', { html: '<b>同一符号只允许一个定义</b>；跨模块复用必须保持定义一致。' })
          ]),
          BT.el('ul', { class: 'rule-list' }, [
            BT.el('li', { html: '<b>A_pad</b> 单片面积；内外片合计 = 2·A_pad。' }),
            BT.el('li', { html: '<b>A_cal</b> 单侧活塞总面积；浮钳取活塞侧，对置钳取单侧。' }),
            BT.el('li', { html: '<b>p</b> 轮端压力；主缸压力单独用 p_mc，不混用。' }),
            BT.el('li', { html: '<b>m</b> 整车质量；<b>m_d</b> 单个制动盘质量；<b>m_pad</b> 单片质量（如使用）。' })
          ])
        ]),
        BT.note('输入框旁的橙色符号来自本表；如果你发现页面里符号与定义不一致，以本页为准并记录为缺陷。', 'info')
      ]);
      root.appendChild(rules);

      draw();
    }
  });
})(window.BT);
