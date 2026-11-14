/* ============================================================
   Brake Lab · standards baseline, variable dictionary, gaps
   No invented clause numbers. Items not yet verified are marked.
   ============================================================ */
(function (BT) {
  'use strict';

  BT.STANDARDS = [
    {
      id: 'GB 21670-2025', name: '乘用车制动系统技术要求及试验方法', status: '现行', tone: 'ok',
      published: '2025-05-30', effective: '2026-01-01', scope: 'M1', role: '中国乘用车制动准入',
      replaces: 'GB 21670-2008', note: '官方元数据已核对；全文与条款号待锁定后逐条实现。',
      url: 'https://openstd.samr.gov.cn/bzgk/std/newGbInfo?hcno=5CC330073FDA2E395D2554FEFC1256DF'
    },
    {
      id: 'GB 21670-2008', name: '乘用车制动系统技术要求及试验方法（旧版）', status: '已被代替', tone: 'bad',
      published: '2008-04-25', effective: '2008-11-01', scope: 'M1', role: '历史版本',
      replaces: '—', note: '不得再作为现行认证依据；旧项目报告需做版本影响分析。'
    },
    {
      id: 'GB 21670 草案（2023-12-20）', name: '乘用车制动系统技术要求及试验方法（草案）', status: '草案 / 非现行', tone: 'warn',
      published: '2023-12-20', effective: '—', scope: 'M1', role: '条款结构与判据参考',
      replaces: '—', note: '本地参考文件；参考 UN R13-H Rev.4；不能替代 GB 21670-2025 正式版。'
    },
    {
      id: 'GB 7258-2017', name: '机动车运行安全技术条件', status: '现行（修改单待核对）', tone: 'warn',
      published: '2017-09-29', effective: '2018-01-01', scope: 'M1 / N1 等', role: '道路运行安全',
      replaces: 'GB 7258-2012', note: '路试 50 km/h 乘用车制动距离 ≤19 m（空载）为参考口径；以现行文本为准。'
    },
    {
      id: 'UN R13-H', name: '关于乘用车制动的统一规定', status: '现行（修订版待锁定）', tone: 'warn',
      published: '—', effective: '—', scope: 'M1 / N1', role: 'UN / 出口认证',
      replaces: '—', note: '乘用车对应 R13-H；R13 不适用于 M1，两者不能混用。'
    },
    {
      id: 'GB/T 5620', name: '道路车辆 汽车和挂车制动名词术语及其定义', status: '基础标准', tone: 'info',
      published: '—', effective: '—', scope: '汽车制动', role: '术语与定义',
      replaces: '—', note: '制动距离、MFDD、制动力等术语的口径来源；版本待核对。'
    },
    {
      id: 'SAE J2522', name: 'Brake Friction Material Effectiveness（AK Master）', status: '试验方法', tone: 'info',
      published: '—', effective: '—', scope: '摩擦材料', role: '摩擦系数/衰退试验',
      replaces: '—', note: '用于摩擦材料 μ(P,V,T) 与衰退/恢复数据，不作为法规判据。'
    },
    {
      id: 'SAE J2707', name: 'Wear Test Procedure for Brake Friction Materials', status: '试验方法', tone: 'info',
      published: '—', effective: '—', scope: '摩擦材料', role: '磨损试验',
      replaces: '—', note: '磨损率与寿命估算的数据来源；需按配方和工况标定。'
    },
    {
      id: 'ISO 611', name: 'Road vehicles — Braking of automotive vehicles and their trailers — Vocabulary', status: '术语参考', tone: 'info',
      published: '—', effective: '—', scope: '汽车制动', role: '术语对照',
      replaces: '—', note: '用于中英文术语对照；与 GB/T 5620 版本需对齐。'
    }
  ];

  BT.DRAFT = {
    id: 'GB 21670 草案（2023-12-20）',
    file: 'docs/standards/GB21670_draft_2023-12-20.docx',
    sha256: 'EC3ADD45F971696CEF73F6CC1AF2A7B6F03A7244CD998FC1D0A836DF1D0275AB',
    date: '2023-12-20',
    basis: 'UN R13-H（Rev.4 及其修正案）',
    status: '草案 / 非现行',
    note: '本地参考文件。用于条款结构、试验方法和判据对照；不得替代 GB 21670-2025 正式版，也不得作为认证依据。'
  };

  BT.DRAFT_CRITERIA = [
    { item: '空载定义', value: '整车整备质量 + 110 kg', ref: '草案 §3', note: '与部分企业“空载=整备质量”口径不同' },
    { item: '满载定义', value: '最大设计总质量（特殊说明除外）', ref: '草案 §3', note: '轴荷分配按制造商规定' },
    { item: '0 型制动器温度', value: '65–100 °C', ref: '草案 §6.1.4', note: '试验前最热车轴的平均温度' },
    { item: '0 型初速 / 路面', value: '100 km/h；μ ≥ 0.8', ref: '草案 §8.5.3.1', note: '最高车速不足时按可达最高车速' },
    { item: '0 型次数', value: '每次最多 6 次制动，最多重复 5 次', ref: '草案 §8.5.3.1', note: '含熟悉车辆所需制动' },
    { item: 'I 型加热', value: 'v₁ = 80% vmax ≤ 120 km/h；v₂ = 45 km/h；平均 3 m/s²；15 次', ref: '草案 §6.1.5 / §8.5.7.4', note: '循环周期表值待复核' },
    { item: 'I 型热态性能', value: '≥ 规定性能的 75%，且 ≥ 冷态 0 型的 60%', ref: '草案 §6.1.5.2', note: '核心判据' },
    { item: 'I 型恢复性能', value: '冷态 0 型的 70%–150%', ref: '草案 §6.1.5.4', note: '恢复过高也要记录' },
    { item: '应急制动', value: '踏板力 65–500 N；MFDD ≥ 2.44 m/s²', ref: '草案 §6.2.2', note: '模拟实际失效状态' },
    { item: '驻车制动', value: '满载 20% 坡道；列车 12%；手控 ≤ 400 N / 脚控 ≤ 500 N；保持 5 min', ref: '草案 §6.2.3 / §8.4.10', note: '允许多次促动' },
    { item: '响应时间', value: '≤ 0.6 s', ref: '草案 §6.3', note: '至最不利车轴达到规定性能' },
    { item: 'ABS 附着利用率', value: 'η ≥ 0.75；低 μ ≤ 0.3，高 μ ≈ 0.8；50 km/h', ref: '草案 §6.5', note: '满载/空载均需检验' },
    { item: 'ABS 单失效降级', value: '行车制动性能 ≥ 0 型的 80%', ref: '草案 §6.5.1.3', note: '单个电气功能失效' },
    { item: 'EPB 电气失效', value: '8% 上/下坡道保持满载车辆', ref: '草案 §5.2.19', note: '电子传输一处电气失效' },
    { item: '再生制动制动灯', value: '减速度 > 1.3 m/s² 应发出制动信号', ref: '草案 §5.2.22', note: 'A/B 型再生与自动控制制动' },
    { item: '紧急制动信号', value: '≥ 6 m/s² 可发出；< 2.5 m/s² 应解除', ref: '草案 §5.2.23', note: '制造商可定义实际限值' },
    { item: 'MFDD 公式', value: '(v_b² − v_e²) / [25.92·(s_e − s_b)]', ref: '草案 §6.1.1', note: 'v: km/h，s: m' },
    { item: '测量精度', value: '速度/距离/减速度/压力 ±1%；温度 ±2 °C；控制力 ±2%', ref: '草案 §8.2.2', note: '试验设备最低要求' }
  ];

  BT.DRAFT_BY_CONDITION = {
    type0: '草案 §6.1.4/§8.5.3：100 km/h、制动器 65–100 °C、μ≥0.8；空载=整备+110 kg。表 3 具体限值需从正式版补齐。',
    type1: '草案 §6.1.5：热态≥规定的 75%，且≥冷态 60%；恢复 70–150%；加热 15 次、平均 3 m/s²。',
    type2: '草案未单列 Type II 数值；连续热负荷参考 I 型与 GB 21670-2025 正式版。',
    emergency: '草案 §6.2.2：踏板力 65–500 N，MFDD≥2.44 m/s²。',
    parking: '草案 §6.2.3/§8.4.10：满载 20% 坡道；列车 12%；手控≤400 N/脚控≤500 N；保持 5 min。',
    lowmu: '草案 §6.5：ABS 附着利用率≥0.75；低 μ≤0.3、高 μ≈0.8。',
    abs: '草案 §6.5：50 km/h；低 μ≤0.3、高 μ≈0.8；η≥0.75；单失效行车制动≥0 型的 80%。',
    regen: '草案 §5.2.22：再生/自动制动减速度 >1.3 m/s² 应点亮制动灯；B 型再生受 ABS 控制。',
    repeated: '草案 I 型：15 次加热，热态≥75%/冷态 60%，恢复 70–150%。',
    laden: '草案 §3：空载=整备+110 kg；满载=最大设计总质量。',
    highspeed: '草案 §8.5.3.2：动力接合 0 型为 80% vmax 且≤160 km/h；vmax>200 km/h 取 160。',
    cold: '草案未单列低温性能；按项目/地区要求补充。'
  };

  BT.CLAUSE_MATRIX = [
    { area: '行车制动 Type 0', std: 'GB 21670-2025', clause: '待锁定', status: '待全文', impl: '已有工程预估，法规判定未实现', action: '获取全文后建规则' },
    { area: '行车制动 Type I（衰退）', std: 'GB 21670-2025', clause: '待锁定', status: '待全文', impl: '热模型仅趋势，未做试验判定', action: '建热衰退试验矩阵' },
    { area: '行车制动 Type II（适用时）', std: 'GB 21670-2025', clause: '待锁定', status: '待全文', impl: '未实现', action: '确认适用性' },
    { area: '应急 / 失效模式', std: 'GB 21670-2025', clause: '待锁定', status: '待全文', impl: '未实现', action: '建失效工况与判据' },
    { area: '驻车制动', std: 'GB 21670-2025', clause: '待锁定', status: '待全文', impl: '静力模型已有，法规判定未实现', action: '核对坡度/载荷/挡位' },
    { area: 'ABS / ESC', std: 'GB 21670-2025', clause: '待锁定', status: '待全文', impl: '仅固定 β，无 ABS 滑移控制', action: '建 ABS 边界说明' },
    { area: '电力再生制动', std: 'GB 21670-2025', clause: '待锁定', status: '待全文', impl: '未实现', action: '建电液协调模型' },
    { area: '功能安全（附录 A–C）', std: 'GB 21670-2025', clause: '待锁定', status: '待全文', impl: '未实现', action: '先做要求清单，不写代码' },
    { area: '动力蓄电池 SOC（附录 D）', std: 'GB 21670-2025', clause: '待锁定', status: '待全文', impl: '未实现', action: '确认 EV 适用范围' },
    { area: '车辆参数与试验数据处理（附录 F）', std: 'GB 21670-2025', clause: '待锁定', status: '待全文', impl: '部分：单位/滤波/MFDD', action: '按附录 F 对齐' },
    { area: '路试制动距离 / MFDD', std: 'GB 7258-2017', clause: '待锁定', status: '部分', impl: '50 km/h ≤19 m 参考校核', action: '加入加载/通道/路面条件' },
    { area: '出口制动认证', std: 'UN R13-H', clause: '待锁定', status: '待全文', impl: '未实现', action: '确认目标市场修订版' }
  ];

  BT.VARIABLES = [
    { sym: 'm', name: '整车质量', unit: 'kg', def: '整备 / 试验 / 最大设计质量必须区分', risk: '高', note: '当前模块默认整备质量 + 附加载荷' },
    { sym: 'L', name: '轴距', unit: 'mm', def: '前后轴中心距', risk: '低', note: '内部换算为 m' },
    { sym: 'h', name: '质心高度', unit: 'mm', def: '空载/满载不同，需注明工况', risk: '高', note: '直接影响轴荷转移与 φ₀' },
    { sym: 'sf', name: '前轴静态荷比例', unit: '—', def: '前轴静态载荷 / 整车重量', risk: '高', note: '不是制动时的动态比例' },
    { sym: 'β', name: '前制动力占比', unit: '—', def: '前轴制动力 / 整车制动力', risk: '高', note: '由前后制动器硬件或设计值决定' },
    { sym: 'φ₀', name: '同步附着系数', unit: '—', def: '前后轮同时抱死时的附着系数', risk: '高', note: 'φ₀=(β−sf)L/h' },
    { sym: 'Re', name: '有效半径', unit: 'mm', def: '摩擦合力作用半径', risk: '高', note: '不是盘外径；建议由摩擦片内外半径计算' },
    { sym: 'A_pad', name: '单片摩擦片面积', unit: 'cm² / mm²', def: '单侧一片的面积；内外片合计 = 2×', risk: '高', note: '当前按单片定义；面能量按每片分摊' },
    { sym: 'A_cal', name: '单侧活塞总面积', unit: 'mm²', def: '活塞数 × 单活塞面积', risk: '高', note: '浮钳取活塞侧；对置钳取单侧' },
    { sym: 'p', name: '轮端压力', unit: 'MPa', def: '卡钳入口压力，不是主缸压力', risk: '高', note: '忽略管路压降' },
    { sym: 'z', name: '减速度', unit: 'g', def: '瞬时/稳态/平均需区分', risk: '高', note: '1 g = 9.80665 m/s²' },
    { sym: 'a', name: '减速度', unit: 'm/s²', def: 'SI 单位', risk: '中', note: '内部计算统一用 m/s²' },
    { sym: 'E / Q', name: '制动能量', unit: 'J / kJ', def: '单次制动动能', risk: '中', note: 'E=½mv²' },
    { sym: 'MFDD', name: '充分发出的平均减速度', unit: 'm/s²', def: '0.8v₀ → 0.1v₀ 区间', risk: '高', note: '公式分母 25.92（v: km/h, s: m）' },
    { sym: 'μ', name: '摩擦系数', unit: '—', def: '随压力、速度、温度变化', risk: '高', note: '不能用常温单点代替热态' },
    { sym: 'τ', name: '冷却时间常数', unit: 's', def: '集总热容指数冷却参数', risk: '高', note: '必须用实测冷却曲线标定' }
  ];

  BT.GAPS = [
    { module: '动力学与轴荷', grade: 'A', basis: '刚体准静态轴荷转移', gap: '悬架/俯仰、空载/满载工况矩阵', action: 'Phase 2', tone: 'ok' },
    { module: '制动力分配校核', grade: 'A/B', basis: 'f/φ₀ 解析式', gap: 'GB 21670-2025 / R13-H 精确条款与坐标定义', action: 'Phase 0/3', tone: 'warn' },
    { module: '制动距离', grade: 'B', basis: '三段运动学模型', gap: '法规试验判定、ABS 效率、速度相关 μ', action: 'Phase 2/3', tone: 'warn' },
    { module: '制动器力矩', grade: 'A', basis: 'T=2μpARe', gap: '拖滞、刚度、摩擦副温升', action: 'Phase 2', tone: 'ok' },
    { module: '踏板感与液压', grade: 'C', basis: '折线助力器 + 集总柔度', gap: '助力器实测曲线、迟滞、软管/摩擦片压缩', action: 'Phase 2', tone: 'bad' },
    { module: '热容量与温升', grade: 'C', basis: '单盘集总热容', gap: '热网络、对流/辐射、实测 τ', action: 'Phase 2', tone: 'bad' },
    { module: '摩擦副校核', grade: 'B/C', basis: '单点 μ + 线性磨损', gap: 'μ(P,V,T) map、磨损 map、面能量口径', action: 'Phase 2/5', tone: 'bad' },
    { module: '驻车与 EPB', grade: 'B', basis: '静力平衡', gap: '法规坡度/载荷、电机 map、效率', action: 'Phase 3/5', tone: 'warn' },
    { module: '匹配求解器', grade: 'C', basis: '组合扫描 + 目标区间', gap: '热/失效/空间/需液量/成本约束', action: 'Phase 5', tone: 'bad' },
    { module: '试验数据分析', grade: 'A/B', basis: '积分/MFDD/线性拟合', gap: '时移对齐、MDF/Vector、批处理', action: 'Phase 5', tone: 'warn' },
    { module: '灵敏度分析', grade: 'A', basis: '单因素 ± 扰动', gap: '交互效应 / DOE', action: 'Phase 5', tone: 'ok' }
  ];
})(window.BT);
