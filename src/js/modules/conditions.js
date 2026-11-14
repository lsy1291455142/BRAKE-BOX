/* ============================================================
   模块：工况详解库
   ============================================================ */
(function (BT) {
  'use strict';
  BT.modules = BT.modules || [];

  const CATS = ['全部', '法规工况', '道路工况', '系统工况', '载荷与环境'];

  BT.modules.push({
    id: 'conditions',
    group: '工况库',
    name: '工况详解',
    icon: 'wave',
    desc: 'Type 0/I/II、失效、驻车、低附、ABS、回收、热累积',
    render: function (root) {
      root.appendChild(BT.pageHead('OPERATING CONDITIONS', '工况详解库', '把“什么工况、怎么设、怎么做、看什么、模型能做到哪一步”讲清楚。每个工况都配一张原理图，并可直接跳到对应计算模块。', [
        BT.badge(BT.CONDITIONS.length + ' 个工况', 'info'),
        BT.badge('条款待全文锁定', 'warn')
      ]));

      root.appendChild(BT.beginnerCard({
        title: '同样一脚刹车，不同工况完全不是一回事',
        svg: BT.diagram('conditionMap'),
        principle: '路面附着、车速、温度、载荷和系统状态，会同时改变制动距离、方向稳定性与热负荷。',
        steps: [
          '先判断工况属于“法规、道路、系统、载荷/环境”哪一类。',
          '再看它考的是距离、稳定性、热衰退还是失效后剩余能力。',
          '最后确认工具箱里哪个模型能算、哪个只能提示边界。'
        ],
        mistake: '拿一个工况的结果去代表所有工况；冷态好不等于热态好，干路好不等于湿滑好。',
        grade: 'A'
      }));

      const chips = BT.el('div', { class: 'filter-chips' });
      const host = BT.el('div', { class: 'stack' });
      let active = '全部';
      CATS.forEach(function (c) {
        const b = BT.el('button', { class: 'filter-chip' + (c === active ? ' active' : ''), type: 'button', text: c });
        b.addEventListener('click', function () {
          active = c;
          BT.qa('.filter-chip', chips).forEach(function (x) { x.classList.toggle('active', x === b); });
          draw();
        });
        chips.appendChild(b);
      });
      root.appendChild(chips);
      root.appendChild(host);

      function draw() {
        host.innerHTML = '';
        const list = BT.CONDITIONS.filter(function (c) { return active === '全部' || c.category === active; });
        if (!list.length) { host.appendChild(BT.el('div', { class: 'empty', text: '没有匹配的工况' })); return; }
        list.forEach(function (c) { host.appendChild(card(c)); });
      }

      function card(c) {
        const sec = BT.el('section', { class: 'cond-card' });
        const head = BT.el('div', { class: 'cond-head' });
        head.appendChild(BT.el('div', {}, [
          BT.el('div', { class: 'cond-kicker' }, [
            BT.el('span', { class: 'cond-cat', text: c.category }),
            BT.el('span', { class: 'cond-en', text: c.en })
          ]),
          BT.el('h3', { text: c.name })
        ]));
        head.appendChild(BT.el('div', { class: 'cond-actions' }, [
          BT.badge(c.severity, c.tone),
          BT.el('button', {
            class: 'btn ghost', type: 'button', text: '打开模块 ›',
            onclick: function () { location.hash = '#/' + c.module; }
          })
        ]));
        sec.appendChild(head);

        const body = BT.el('div', { class: 'cond-body' });
        const svgWrap = BT.el('div', { class: 'cond-svg', html: BT.diagram(c.svg) });
        body.appendChild(svgWrap);

        const text = BT.el('div', { class: 'cond-text' });
        text.appendChild(BT.el('p', { class: 'cond-summary', text: c.summary }));
        text.appendChild(BT.el('div', { class: 'cond-standard', html: '<b>标准依据</b><span>' + c.standard + '</span>' }));

        const cols = BT.el('div', { class: 'cond-cols' });
        const setup = BT.el('div', {}, [BT.el('h4', { text: '怎么设置' }), BT.el('ul', {}, c.setup.map(function (x) { return BT.el('li', { text: x }); }))]);
        const proc = BT.el('div', {}, [BT.el('h4', { text: '怎么做' }), BT.el('ol', {}, c.procedure.map(function (x) { return BT.el('li', { text: x }); }))]);
        cols.appendChild(setup); cols.appendChild(proc);
        text.appendChild(cols);

        const metrics = BT.el('div', { class: 'cond-metrics' });
        metrics.appendChild(BT.el('b', { text: '看什么' }));
        c.metrics.forEach(function (m) { metrics.appendChild(BT.el('span', { class: 'metric-chip', text: m })); });
        text.appendChild(metrics);

        text.appendChild(BT.el('div', { class: 'cond-model', html: '<b>工具箱怎么做</b><span>' + c.model + '</span>' }));
        const draft = BT.DRAFT_BY_CONDITION && BT.DRAFT_BY_CONDITION[c.id];
        if (draft) text.appendChild(BT.el('div', { class: 'cond-draft', html: '<b>草案参考</b><span>' + draft + '</span>' }));
        text.appendChild(BT.el('div', { class: 'bmistake', html: '<b>常见误区</b><span>' + c.mistake + '</span>' }));
        body.appendChild(text);
        sec.appendChild(body);
        return sec;
      }

      draw();
    }
  });
})(window.BT);
