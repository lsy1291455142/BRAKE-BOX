/* ============================================================
   模块：标准与合规基座
   ============================================================ */
(function (BT) {
  'use strict';
  BT.modules = BT.modules || [];

  BT.modules.push({
    id: 'standards',
    group: '参考',
    name: '标准与合规',
    icon: 'book',
    desc: '标准版本、条款矩阵、变量字典与差距清单',
    render: function (root) {
      root.appendChild(BT.pageHead('STANDARDS & COMPLIANCE', '标准与合规基座', '先锁标准版本，再谈计算正确。本页记录现行标准、待锁定条款、变量定义和现有模块差距；没有全文依据的条款不会伪造条款号。', [
        BT.badge('GB 21670-2025', 'ok'),
        BT.badge('非认证', 'warn')
      ]));

      root.appendChild(BT.beginnerCard({
        title: '计算值、试验值、法规结论，不是一回事',
        svg: BT.diagram('standards'),
        principle: '模型只能给趋势和预估，实测数据才是证据，法规条款才给判定。三者混在一起，是制动开发里最危险的错误。',
        steps: [
          '先锁定标准号和版本：GB 21670-2025 已代替 2008 版，2026-01-01 实施。',
          '再把每条要求拆成“适用条件 + 判据 + 试验方法”，缺一不可。',
          '最后只对规定工况下的实测数据写“通过/不通过”；缺数据写“未评估”。'
        ],
        mistake: '拿计算出来的制动距离直接写“满足 GB 21670”。这是审计红线，不是工程结论。',
        grade: 'A'
      }));

      const kpis = BT.kpis([
        ['现行核心标准', '2', '项', 'GB 21670-2025 / GB 7258-2017'],
        ['被代替版本', '1', '项', 'GB 21670-2008'],
        ['草案参考', '1', '项', '2023-12-20，非现行'],
        ['高风险管理变量', String(BT.VARIABLES.filter(function (v) { return v.risk === '高'; }).length), '项', '定义不清就会算错'],
        ['模块待补缺口', String(BT.GAPS.length), '项', '见差距清单']
      ]);
      root.appendChild(BT.el('div', { style: { marginBottom: '14px' } }, [kpis]));

      const tabs = BT.el('div', { class: 'pill-tabs' });
      const host = BT.el('div', { style: { marginTop: '12px' } });
      const defs = [
        { id: 'versions', label: '标准版本' },
        { id: 'clauses', label: '条款矩阵' },
        { id: 'draft', label: '草案要点' },
        { id: 'vars', label: '变量字典' },
        { id: 'gaps', label: '差距清单' }
      ];
      let active = (new URLSearchParams(location.search).get('tab') || 'versions');
      if (!defs.some(function (d) { return d.id === active; })) active = 'versions';
      defs.forEach(function (d) {
        const b = BT.el('button', { class: 'pill-tab' + (d.id === active ? ' active' : ''), type: 'button', text: d.label });
        b.addEventListener('click', function () {
          active = d.id;
          BT.qa('.pill-tab', tabs).forEach(function (x) { x.classList.toggle('active', x === b); });
          draw();
        });
        tabs.appendChild(b);
      });
      root.appendChild(tabs);
      root.appendChild(host);

      function draw() {
        host.innerHTML = '';
        if (active === 'versions') host.appendChild(versions());
        if (active === 'clauses') host.appendChild(clauses());
        if (active === 'draft') host.appendChild(draft());
        if (active === 'vars') host.appendChild(vars());
        if (active === 'gaps') host.appendChild(gaps());
      }

      function versions() {
        const rows = BT.STANDARDS.map(function (s) {
          const cells = [
            { text: s.id, cls: '' }, s.name,
            BT.badge(s.status, s.tone),
            s.scope, s.role,
            (s.published || '—') + ' / ' + (s.effective || '—'),
            s.note
          ];
          if (s.url) {
            cells.push(BT.el('a', { href: s.url, target: '_blank', rel: 'noopener', class: 'btn subtle', text: '官方信息' }));
          } else {
            cells.push('—');
          }
          return cells;
        });
        return BT.panel('标准版本矩阵', [
          BT.table(['标准号', '名称', '状态', '适用', '作用', '发布 / 实施', '说明', '来源'], rows, {
            caption: '版本锁定是正确性的第一步', captionRight: '官方元数据核对：GB 21670-2025 现行'
          }),
          BT.el('div', { class: 'stack', style: { marginTop: '12px' } }, [
            BT.note('GB 21670-2025 于 2025-05-30 发布、<b>2026-01-01 实施</b>，全部代替 GB 21670-2008。当前工具箱按 2025 版作为目标基线；旧版仅保留历史对照。', 'ok'),
            BT.note('乘用车 M1 的 UN 法规对应 <b>UN R13-H</b>，不是 R13。R13 与 R13-H 的适用范围、附录和试验工况不同，禁止混用。', 'warn'),
            BT.note('GB 7258-2017 的现行状态与修改单需在官方平台再次核对；本页的 50 km/h ≤19 m 仅作为路试参考口径。', 'warn')
          ])
        ]);
      }

      function clauses() {
        const rows = BT.CLAUSE_MATRIX.map(function (c) {
          const tone = c.status === '部分' ? 'info' : c.status === '待全文' ? 'warn' : 'neutral';
          return [c.area, c.std, c.clause, BT.badge(c.status, tone), c.impl, c.action];
        });
        return BT.panel('条款矩阵（条款号待全文锁定）', [
          BT.table(['领域', '标准', '条款号', '状态', '当前实现', '下一步'], rows, {
            caption: '没有条款号就不写条款号', captionRight: '待获取全文后逐条补全'
          }),
          BT.note('这张表是开发清单，不是合规声明。条款号、适用条件和判据必须从标准全文逐条摘录；在完成前，界面上的法规检查只能标“参考/未评估”。', 'warn')
        ]);
      }

      function draft() {
        const rows = BT.DRAFT_CRITERIA.map(function (c) {
          return [c.item, c.value, c.ref, c.note];
        });
        return BT.panel('GB 21670 草案要点（2023-12-20）', [
          BT.note('这是<b>草案</b>，不是 GB 21670-2025 正式版。表中数值用于理解试验结构和判据趋势；认证判定必须用 2025 正式版全文与实测数据。', 'warn'),
          BT.el('div', { class: 'small muted', style: { margin: '8px 0 10px', lineHeight: '1.7' } }, [
            BT.el('div', { html: '<b>本地文件</b>：<span class="mono">' + BT.DRAFT.file + '</span>' }),
            BT.el('div', { html: '<b>草案日期</b>：' + BT.DRAFT.date + ' · <b>参考</b>：' + BT.DRAFT.basis }),
            BT.el('div', { html: '<b>SHA-256</b>：<span class="mono" style="font-size:9.5px;word-break:break-all">' + BT.DRAFT.sha256 + '</span>' })
          ]),
          BT.table(['项目', '草案值 / 判据', '草案条款', '备注'], rows, {
            caption: '草案参考，待 2025 正式版逐条核对', captionRight: '共 ' + rows.length + ' 条'
          }),
          BT.note('草案对空载的定义是“整备质量 + 110 kg”，与部分企业“空载=整备质量”的口径不同；做法规对比时必须先统一质量口径。', 'info')
        ]);
      }

      function vars() {
        const rows = BT.VARIABLES.map(function (v) {
          return [v.sym, v.name, v.unit, v.def, BT.badge(v.risk + '风险', v.risk === '高' ? 'bad' : v.risk === '中' ? 'warn' : 'neutral'), v.note];
        });
        return BT.panel('变量字典（Phase 1 冻结）', [
          BT.table(['符号', '名称', '单位', '定义', '风险', '当前实现 / 注意'], rows, {
            caption: '同一符号只能有一个定义', captionRight: '内部统一 SI，界面单位在边界转换'
          }),
          BT.note('本轮已修正：摩擦片面积明确为<b>单片面积</b>；面能量按每个前轮两块片分摊（除以 2）。这是当前版本最容易被误用两倍的地方。', 'ok'),
          BT.note('下一步：把质量、质心高度、载荷工况拆成空载/满载两套；把“单轮/单轴/整车”能量与力全部显式命名。', 'info')
        ]);
      }

      function gaps() {
        const rows = BT.GAPS.map(function (g) {
          return [g.module, BT.badge(g.grade, g.tone), g.basis, g.gap, g.action];
        });
        return BT.panel('现有模块差距清单', [
          BT.table(['模块', '等级', '当前依据', '主要缺口', '计划阶段'], rows, {
            caption: 'A 解析级 · B 工程级 · C 概念级', captionRight: '等级会显示在各模块“一分钟看懂”卡片上'
          }),
          BT.el('div', { class: 'stack', style: { marginTop: '12px' } }, [
            BT.note('A 级：公式有解析依据，已通过手算/独立程序验证，但仍有适用域。B 级：工程模型，需实测标定后才能用于预测。C 级：概念/趋势模型，不得用于合规或放行。', 'info'),
            BT.note('法规正确性不是给模型加一个“通过”标签，而是：标准版本 + 条款 + 适用条件 + 实测数据 + 判据 + 证据链。缺任何一项，结果只能是“未评估”。', 'warn')
          ])
        ]);
      }

      draw();
    }
  });
})(window.BT);
