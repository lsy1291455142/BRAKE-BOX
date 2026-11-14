/* ============================================================
   模块：公式与判据
   ============================================================ */
(function (BT) {
  'use strict';
  BT.modules = BT.modules || [];

  function formula(title, expr, desc, vars) {
    return BT.el('div', { class: 'panel', style: { breakInside: 'avoid' } }, [
      BT.el('div', { class: 'panel-head' }, [BT.el('h3', { text: title })]),
      BT.el('div', { class: 'panel-body' }, [
        BT.el('div', { class: 'mono', style: { fontSize: '12px', background: '#f7f9fb', border: '1px solid #e4e9ef', borderRadius: '7px', padding: '10px 12px', overflowX: 'auto', lineHeight: '1.8', whiteSpace: 'pre-wrap' }, text: expr }),
        BT.el('p', { style: { fontSize: '11.5px', color: '#667085', margin: '9px 0 0' }, text: desc }),
        vars ? BT.el('div', { class: 'small muted', style: { marginTop: '6px' }, text: vars }) : null
      ])
    ]);
  }

  BT.modules.push({
    id: 'reference',
    group: '参考',
    name: '公式与判据',
    icon: 'book',
    desc: '计算模型、符号与使用边界',
    render: function (root) {
      root.appendChild(BT.pageHead('REFERENCE', '公式、符号与使用边界', '本工具箱所有计算均采用显式公式，便于复核与二次开发。以下列出核心关系、单位约定与常见误用边界。', []));

      const grid = BT.el('div', { class: 'stack' });
      grid.appendChild(BT.el('div', { class: 'split-2' }, [
        formula('动态轴荷', 'Fzf = m·g·(sf + z·h/L)\nFzr = m·g·(1 − sf − z·h/L)',
          '忽略空气升力与悬架变形，适用于方案阶段的准静态轴荷转移。',
          'm 整车质量 kg · L 轴距 m · h 质心高 m · sf 前轴静态荷比例 · z 减速度 g'),
        formula('理想前制动力占比', 'βideal(z) = sf + z·h/L',
          '前后轮同时抱死时前轴制动力占总制动力的比例，即 I 曲线。',
          '固定 β 的系统只在 φ₀ 处与 I 曲线相交。'),
        formula('同步附着系数', 'φ₀ = (β − sf)·L/h',
          'z < φ₀ 时前轮先抱死（稳定）；z > φ₀ 时后轮先抱死（不稳定）。乘用车常用 0.85–1.05。',
          'β 为前制动力占比；该式假定制动力分配不随压力变化。'),
        formula('利用附着系数', 'ff = β·z / (sf + z·h/L)\nfr = (1−β)·z / (1 − sf − z·h/L)',
          '各轴制动力与该轴动态垂直载荷之比。稳定性要求 fr ≤ ff（z = 0.15–0.80）。',
          'ABS 介入后该曲线不再代表实际轮胎滑移状态。')
      ]));
      grid.appendChild(BT.el('div', { class: 'split-2' }, [
        formula('制动器力矩', 'T = 2·μ·p·A·Re',
          '单卡钳、两侧摩擦片；A 为单侧活塞总面积，浮钳取活塞侧面积。',
          'T N·m · p MPa · A mm² · Re mm · 系数 2 对应两片摩擦片'),
        formula('轮端制动力 / 减速度', 'F = 2T/r\nz = ΣF / (m·g)',
          '每轴两个车轮；忽略拖滞、滚阻与旋转惯量。',
          'r 车轮滚动半径 m'),
        formula('踏板力（反算）', 'Frod = p·Amc\nFp = Frod / (i·BR)  (助力生效后)',
          '助力器按折线特性简化：低于起始力时 BR=1，高于后按额定 BR，并受最大助力限制。',
          'i 踏板杠杆比 · BR 助力比 · Amc 主缸面积 mm²'),
        formula('踏板行程', 'x = x0 + F/K\nV = ΣA·x + C·p\nSp = (V/Amc)·i + S0',
          '间隙 + 卡钳轴向柔度 + 管路膨胀；未含摩擦片压缩与软管鼓胀的实测修正。',
          'x0 单侧间隙 mm · K 卡钳轴向刚度 N/mm · C 管路膨胀 mm³/MPa')
      ]));
      grid.appendChild(BT.el('div', { class: 'split-2' }, [
        formula('制动距离（三段模型）', 's = v0·tr + [v0·tb − a·tb²/6] + (v0 − a·tb/2)²/(2a)',
          '反应段匀速、建压段减速度线性上升、稳态段匀减速；适用于干沥青紧急制动。',
          'v0 m/s · tr s · tb s · a m/s²'),
        formula('MFDD', 'MFDD = (vb² − ve²) / [25.92·(se − sb)]',
          '充分发出的平均减速度；vb = 0.8v0，ve = 0.1v0。',
          'v km/h · s m · 25.92 = 2×3.6²'),
        formula('单次制动温升', '前盘：ΔTf = E·β·η / (2·mdf·cp)\n后盘：ΔTr = E·(1−β)·η / (2·mdr·cp)\nE = ½mv²',
          '前后轴按制动力占比 β 分配；η 为导入制动盘的比例（默认 0.86），分母 2 表示每轴两个制动盘。',
          'E J · β 前制动力占比 · md 单个制动盘质量 kg · cp J/(kg·K)'),
        formula('坡道驻车', 'F = m·g·sinθ·SF\nFc = F·r / (4·μ·Re)',
          '后轮驻车、两轮均分；θ = atan(坡度/100)。',
          'Fc 单卡钳夹紧力 N · SF 安全系数')
      ]));

      const standards = BT.el('div', { class: 'panel' });
      standards.appendChild(BT.el('div', { class: 'panel-head' }, [BT.el('h3', { text: '标准与判据使用说明' })]));
      standards.appendChild(BT.el('div', { class: 'panel-body' }, [
        BT.el('div', { class: 'checklist' }, [
          BT.checkRow('info', 'GB 7258-2017 路试参考', '乘用车 50 km/h、空载制动距离 ≤ 19 m（从踩下踏板起计）。本工具箱在“制动距离”页按不含反应段的口径校核。'),
          BT.checkRow('warn', 'GB 21670-2025 / UN R13-H', '认证工况包含初速、满载、制动次数、踏板力、失效模式等完整条件。本工具箱的 z±0.07 包络仅为工程参考，不构成认证结论。'),
          BT.checkRow('warn', '摩擦材料试验', 'μ 的热衰退、恢复、磨损受配方与历史影响显著；本工具箱的热态 μ 为单点折减，正式评估需 SAE J2522 / J2707 或等效台架。'),
          BT.checkRow('warn', 'EPB / 驻车', '坡道保持要求随车型类别、出口市场与企标变化；20% 为常用乘用车工程目标，请按项目适用法规确认。'),
          BT.checkRow('info', '单位约定', '质量 kg、长度 mm（界面输入）/ m（公式内部）、压力 MPa、力矩 N·m、温度 °C、能量 J。减速度以 g 显示时按 9.80665 m/s² 换算。')
        ])
      ]));

      const boundary = BT.el('div', { class: 'panel' });
      boundary.appendChild(BT.el('div', { class: 'panel-head' }, [BT.el('h3', { text: '模型边界与建议' })]));
      boundary.appendChild(BT.el('div', { class: 'panel-body' }, [
        BT.el('ul', { style: { margin: 0, paddingLeft: '18px', fontSize: '12px', color: '#475467', lineHeight: '1.9' } }, [
          BT.el('li', { text: '准静态、刚性车身、无空气动力学升力；未建模悬架行程、衬套柔度与轮胎非线性。' }),
          BT.el('li', { text: '制动器力矩未含拖滞、摩擦副温升衰退、盘面磨损与制动液压缩性。' }),
          BT.el('li', { text: 'ABS/ESC 介入后，实际制动力分配由滑移控制决定，不再等于设计 β。' }),
          BT.el('li', { text: '踏板感模型为集总参数，适用于方案对比；最终需实车客观测量与主观评价。' }),
          BT.el('li', { text: '试验数据分析假设各通道时间同步；若存在 CAN 延迟，应先做时移对齐。' })
        ])
      ]));

      grid.appendChild(BT.el('div', { class: 'split-2' }, [standards, boundary]));
      grid.appendChild(BT.el('div', { class: 'note info' }, [
        BT.el('span', { class: 'n-ico', text: 'v' }),
        BT.el('span', { html: '<b>Brake Lab v2.3</b> · 纯前端离线工具，数据仅保存在本机浏览器。计算内核与界面分离，可在 <span class="mono">src/js/model.js</span> 中复核或扩展公式；标准依据见“标准与合规”页，工况说明见“工况详解”页，符号口径见“符号与单位”页。' })
      ]));
      root.appendChild(grid);
    }
  });
})(window.BT);
