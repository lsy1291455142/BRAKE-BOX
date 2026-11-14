/* ============================================================
   Brake Lab · operating-condition library
   Each entry: setup, procedure, metrics, model, pitfalls.
   Clause numbers are deliberately marked pending until full text.
   ============================================================ */
(function (BT) {
  'use strict';

  BT.CONDITIONS = [
    {
      id: 'type0', name: 'Type 0 · 冷态基础制动', en: 'Cold service brake',
      category: '法规工况', severity: '基础', tone: 'info', svg: 'distance',
      summary: '制动器处于冷态，按规定初速和踏板力做单次制动，评价基础制动能力与方向稳定性。这是所有后续热态/失效工况的基准。',
      standard: 'GB 21670-2025 / UN R13-H；具体初速、踏板力、载荷与判据待全文锁定。',
      setup: ['制动器冷却至规定温度，避免前序试验残留热量', '载荷、轮胎、路面、胎压按标准/项目要求', '记录初速、踏板力、管路压力、制动器温度'],
      procedure: ['加速至规定初速并稳定', '按规定的踏板力或踏板行程踩下制动', '保持至停车，记录制动距离、MFDD、跑偏与异常'],
      metrics: ['制动距离', 'MFDD', '踏板力 / 行程', '制动稳定性', '拖滞与噪声'],
      model: '“制动距离”做三段预估；“试验数据分析”处理实测。模型只能用于预估，法规判定必须用实测。',
      module: 'distance', moduleName: '制动距离',
      mistake: '把冷态单次成绩当成热态或连续山路能力；冷态好不代表热态好。'
    },
    {
      id: 'type1', name: 'Type I · 热衰退', en: 'Fade test',
      category: '法规工况', severity: '高风险', tone: 'warn', svg: 'fadeCycle',
      summary: '通过规定次数的加热制动使制动器进入热态，再评价衰退后的制动能力。核心不是“热一次”，而是热态下的性能保持。',
      standard: 'GB 21670-2025 / UN R13-H；加热循环、次数、温度与判据待全文锁定。',
      setup: ['按标准进行加热循环，记录制动器温度', '避免中途额外冷却，保持试验连续性', '热态性能测试前记录踏板行程与压力'],
      procedure: ['完成规定加热循环', '立即进行热态制动性能测试', '记录距离、MFDD、踏板力/行程变化与衰退率'],
      metrics: ['热态制动距离', 'MFDD', '衰退率', '踏板行程增量', '热外观/裂纹'],
      model: '“热容量与温升”估算能量与温度；“试验数据分析”处理热态数据。μ(P,V,T) 需台架数据。',
      module: 'thermal', moduleName: '热容量与温升',
      mistake: '只做单次 100→0 温升，不做加热循环；忽略热态踏板行程变长。'
    },
    {
      id: 'type2', name: 'Type II · 连续下坡/高速热负荷', en: 'Continuous brake / high thermal load',
      category: '法规工况', severity: '高风险', tone: 'warn', svg: 'fadeCycle',
      summary: '连续下坡或高速工况下的热负荷与制动能力保持；适用车型和具体工况按标准确认，不能与 Type I 混为一谈。',
      standard: 'GB 21670-2025；适用性、坡度、车速、次数与判据待全文锁定。',
      setup: ['坡道/车速/挡位/载荷按标准或项目规范', '记录连续制动次数、盘温、环境温度', '确认冷却条件与风速影响'],
      procedure: ['按规定的下坡/循环工况连续制动', '监控盘温、踏板行程与减速度', '评价剩余制动能力与热风险'],
      metrics: ['峰值盘温', '热衰退', '踏板行程', '剩余减速度', '热裂纹风险'],
      model: '“热容量与温升”的连续制动曲线；冷却时间常数必须实测标定。',
      module: 'thermal', moduleName: '热容量与温升',
      mistake: '把 Type II 当成 Type I；连续下坡是累积热负荷，不是单次制动。'
    },
    {
      id: 'emergency', name: '应急 / 部分失效', en: 'Emergency / partial failure',
      category: '系统工况', severity: '高风险', tone: 'bad', svg: 'hydraulicSplit',
      summary: '行车制动传能装置部分失效时，剩余制动能力与方向稳定性。乘用车常用对角线双回路，单回路失效后只剩两个对角车轮。',
      standard: 'GB 21670-2025；失效模式、初速、踏板力与剩余性能判据待全文锁定。',
      setup: ['按标准模拟单回路/助力/供电失效', '确认另一回路完好、报警正常', '载荷、路面、初速按条款'],
      procedure: ['模拟规定失效模式', '按规定初速和踏板力制动', '记录剩余减速度/距离、跑偏与报警'],
      metrics: ['剩余制动能力', '跑偏/横摆', '踏板力', '报警与警示', '失效后可控性'],
      model: '当前工具只做双回路静力分配示意，没有失效规则引擎；“标准与合规”页标为未实现。',
      module: 'distribution', moduleName: '制动力分配校核',
      mistake: '用正常双回路结果代替失效结果；忽略对角线回路的剩余制动力只有约一半。'
    },
    {
      id: 'parking', name: '驻车 / 坡道保持', en: 'Parking brake',
      category: '法规工况', severity: '基础', tone: 'info', svg: 'parking',
      summary: '在规定坡道、载荷和挡位下，驻车制动应保持车辆静止。EPB 还要关注夹紧速度、释放和热衰退。',
      standard: 'GB 21670-2025 / GB 7258；坡度、载荷、挡位与保持时间待全文锁定。',
      setup: ['坡道、路面、载荷、挡位按标准/项目要求', 'EPB 或手刹初始状态确认', '记录夹紧力/电机电流（如有）'],
      procedure: ['驶上规定坡道', '施加驻车制动', '释放行车制动，保持规定时间，观察滑移'],
      metrics: ['坡道保持力', '夹紧力', '电机扭矩', '滑移量', '释放响应'],
      model: '“驻车与 EPB”静力模型：mg·sinθ·SF → 单轮夹紧力 → 电机扭矩。',
      module: 'parking', moduleName: '驻车与 EPB',
      mistake: '把 20% 坡度当 20°；忘记安全系数、摩擦系数和效率。'
    },
    {
      id: 'lowmu', name: '低附 / 湿滑路面', en: 'Low-μ / wet road',
      category: '道路工况', severity: '高风险', tone: 'warn', svg: 'conditionMap',
      summary: '低附着路面下 ABS/ESC 介入，评价制动距离、方向稳定性与踏板反馈。固定 β 分配在这里不再代表实际制动力。',
      standard: 'GB 21670-2025 对 ABS/稳定性的要求；具体路面 μ、初速与判据待全文锁定。',
      setup: ['湿滑/低附路面，记录实际 μ', 'ABS/ESC 正常工作，轮胎状态一致', '初速与载荷按项目/标准'],
      procedure: ['稳定车速进入试验区域', '紧急制动至停车', '记录距离、跑偏、横摆、踏板振动与 ABS 介入'],
      metrics: ['制动距离', '横摆角速度', '跑偏', 'ABS 介入品质', '踏板反馈'],
      model: '当前“制动距离”按 μ·g·η 估算；ABS 滑移控制未建模，只能做趋势。',
      module: 'distance', moduleName: '制动距离',
      mistake: '用干路结果推算湿滑；ABS 介入后前后分配不再等于设计 β。'
    },
    {
      id: 'abs', name: 'ABS 介入 / 滑移控制', en: 'ABS intervention',
      category: '系统工况', severity: '专项', tone: 'info', svg: 'conditionMap',
      summary: 'ABS 通过滑移控制保持方向稳定性；制动距离取决于路面、轮胎、控制品质与驾驶员输入。',
      standard: 'GB 21670-2025 ABS 条款；具体试验路面、初速、判据待全文锁定。',
      setup: ['规定路面与初速，ABS 启用', '记录轮速、压力、横摆角速度', '确认轮胎、制动器温度一致'],
      procedure: ['进入试验区域', '全力制动触发 ABS', '记录压力循环、滑移、横摆与停车距离'],
      metrics: ['滑移率', '压力循环频率/幅值', '横摆', '制动距离', '踏板反馈'],
      model: '当前没有 ABS 滑移模型；只做边界说明和实测数据分析。',
      module: 'analysis', moduleName: '试验数据分析',
      mistake: '把 ABS 当“缩短距离”的万能；低附/对接路面上稳定性优先。'
    },
    {
      id: 'regen', name: '能量回收 / 电液协调', en: 'Regenerative blending',
      category: '系统工况', severity: '专项', tone: 'info', svg: 'regenBlend',
      summary: '电机制动与液压制动协调，保证踏板感一致、制动灯逻辑正确，并在电池/电机能力范围内回收能量。',
      standard: 'GB 21670-2025 电力再生制动条款；具体协调、制动灯与判据待全文锁定。',
      setup: ['设定 SOC、车速、挡位、回收等级', '记录电机扭矩、液压压力、电池功率', '确认制动灯与踏板感基线'],
      procedure: ['松踏板/踩制动进入回收', '记录电液分配与切换点', '评价减速度一致性、制动灯、回收率'],
      metrics: ['回收率', '电液切换平顺性', '踏板感一致性', '制动灯逻辑', 'SOC 边界'],
      model: '当前未实现电液协调模型；需要电机 map、电池功率限制与踏板解耦信息。',
      module: 'pedal', moduleName: '踏板感与液压',
      mistake: '只看回收率，不看电液切换的踏板感与制动灯；SOC 高时回收能力会骤降。'
    },
    {
      id: 'repeated', name: '连续山路 / 热累积', en: 'Mountain route / thermal accumulation',
      category: '道路工况', severity: '高风险', tone: 'warn', svg: 'fadeCycle',
      summary: '连续下坡、弯道制动导致热累积；评价峰值温度、热衰退、冷却与恢复，而不是单次温升。',
      standard: '工程/企标；可参考 Type I/II，但坡道、车速、间隔按项目定义。',
      setup: ['坡度、车速、间隔、载荷按项目路线', '记录盘温、环境温度、风速', '保持驾驶员/踏板策略一致'],
      procedure: ['连续循环制动', '记录温度、踏板行程、减速度', '冷却后复测恢复'],
      metrics: ['峰值温度', '衰退与恢复', '踏板行程', '热裂纹风险', '冷却时间常数'],
      model: '“热容量与温升”连续制动 + 指数冷却；τ 必须实测标定。',
      module: 'thermal', moduleName: '热容量与温升',
      mistake: '用单次温升代替连续峰值；忽略冷却间隔与下一次起点温度。'
    },
    {
      id: 'laden', name: '满载 / 质心变化', en: 'Laden / CG shift',
      category: '载荷与环境', severity: '基础', tone: 'info', svg: 'loadTransfer',
      summary: '满载使质量、质心高度和前轴荷变化，直接影响轴荷转移、β、φ₀、制动距离与热负荷。',
      standard: '法规载荷工况按标准；企业目标按项目规范。',
      setup: ['空载/满载质量、质心、前轴荷、胎压', '确认悬架高度与轮胎接地状态', '记录载荷分布'],
      procedure: ['分别建立空载/满载基准', '计算/测试轴荷、分配与距离', '对比热负荷与踏板感'],
      metrics: ['动态轴荷', 'β / φ₀', '制动距离', '热负荷', '踏板感'],
      model: '“动力学与轴荷”修改质量/质心/附加载荷；“制动力分配”看 φ₀ 变化。',
      module: 'dynamics', moduleName: '动力学与轴荷',
      mistake: '只用整备质量；满载质心升高会让 φ₀ 和轴荷转移明显变化。'
    },
    {
      id: 'highspeed', name: '高速制动', en: 'High-speed braking',
      category: '道路工况', severity: '高风险', tone: 'warn', svg: 'distance',
      summary: '高速制动能量高、热负荷大，制动距离对初速平方敏感；轮胎、空气动力学与制动器温度都会影响结果。',
      standard: '项目/法规初速按标准；认证条款待全文锁定。',
      setup: ['初速、载荷、路面、轮胎、制动器初始温度', '确认高速稳定性与冷却', '记录风速/环境'],
      procedure: ['加速至目标车速并稳定', '制动至停车', '记录距离、峰值温度、跑偏与踏板'],
      metrics: ['制动距离', '峰值温度', '跑偏', '踏板力/行程', '轮胎状态'],
      model: '“制动距离”+“热容量”；高速气动阻力/升力未建模。',
      module: 'distance', moduleName: '制动距离',
      mistake: '用 100 km/h 结果线性外推到 160 km/h；动能是平方关系。'
    },
    {
      id: 'cold', name: '低温 / 冷启动', en: 'Cold ambient / cold start',
      category: '载荷与环境', severity: '专项', tone: 'info', svg: 'thermal',
      summary: '低温下制动液黏度、摩擦系数、轮胎抓地、EPB 释放都会变化；不能只验证高温。',
      standard: '项目/地区法规；低温冷浸、判据待锁定。',
      setup: ['环境温度、冷浸时间、轮胎/制动液状态', 'EPB/ABS 初始状态', '记录蓄电池电压'],
      procedure: ['按规定冷浸', '启动后低速/紧急制动', '记录踏板力/行程、距离、噪声、EPB 释放'],
      metrics: ['踏板力/行程', '制动距离', 'EPB 释放', '噪声', 'ABS 自检'],
      model: '当前热模型不覆盖低温；只能提示边界，不能预测。',
      module: 'pedal', moduleName: '踏板感与液压',
      mistake: '只关注高温热衰退，不做低温冷启动与 EPB 释放。'
    }
  ];
})(window.BT);
