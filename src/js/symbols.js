/* ============================================================
   Brake Lab · symbol & unit dictionary
   Single source of truth for symbols, units and field mapping.
   ============================================================ */
(function (BT) {
  'use strict';

  BT.SYMBOLS = [
    /* ---- 整车 ---- */
    { sym: 'm', key: 'mass', name: '整车质量', unit: 'kg', group: '整车', def: '整备 / 试验 / 最大设计质量必须区分', risk: '高', note: '默认整备质量 + 附加载荷', used: '整车参数、动力学、热、驻车' },
    { sym: 'Δm', key: 'massExtra', name: '附加载荷', unit: 'kg', group: '整车', def: '乘员、行李等叠加到整备质量', risk: '中', note: '满载工况按项目定义', used: '动力学、驻车' },
    { sym: 'L', key: 'L', name: '轴距', unit: 'mm', group: '整车', def: '前轴到后轴中心距', risk: '低', note: '内部换算为 m', used: '动力学、分配' },
    { sym: 'h', key: 'h', name: '质心高度', unit: 'mm', group: '整车', def: '空载/满载不同，必须注明工况', risk: '高', note: '直接影响轴荷转移与 φ₀', used: '动力学、分配、驻车' },
    { sym: 'Δh', key: 'hExtra', name: '质心高度变化', unit: 'mm', group: '整车', def: '载荷导致质心上移为正', risk: '中', note: '满载质心通常升高', used: '动力学' },
    { sym: 'sf', key: 'frontShare', name: '前轴静态荷比例', unit: '—', group: '整车', def: '前轴静态载荷 / 整车重量', risk: '高', note: '不是制动时的动态比例', used: '动力学、分配' },
    { sym: 'z', key: 'z', name: '减速度', unit: 'g', group: '整车', def: '瞬时/稳态/平均需区分', risk: '高', note: '1 g = 9.80665 m/s²', used: '动力学、分配、踏板' },
    { sym: 'a', key: 'a', name: '减速度', unit: 'm/s²', group: '整车', def: 'SI 单位，内部计算统一使用', risk: '中', note: 'a = z·g', used: '制动距离、分析' },
    { sym: 'β', key: 'beta', name: '前制动力占比', unit: '—', group: '整车', def: '前轴制动力 / 整车制动力', risk: '高', note: '由前后制动器硬件或设计值决定', used: '分配、力矩、匹配' },
    { sym: 'φ₀', key: 'phiTarget', name: '同步附着系数', unit: '—', group: '整车', def: '前后轮同时抱死时的附着系数', risk: '高', note: 'φ₀=(β−sf)L/h', used: '分配、匹配' },
    { sym: 'Fzf', key: '', name: '前轴动态载荷', unit: 'N', group: '整车', def: 'mg(sf + z·h/L)', risk: '中', note: '随减速度增加', used: '动力学' },
    { sym: 'Fzr', key: '', name: '后轴动态载荷', unit: 'N', group: '整车', def: 'mg(1−sf−z·h/L)', risk: '中', note: '随减速度减小', used: '动力学' },

    /* ---- 制动器 ---- */
    { sym: 'T', key: '', name: '制动力矩', unit: 'N·m', group: '制动器', def: '单卡钳制动力矩', risk: '高', note: 'T=2μpARe', used: '力矩、匹配' },
    { sym: 'F', key: '', name: '轮端制动力', unit: 'N', group: '制动器', def: '轮胎接地处制动力', risk: '中', note: 'F=2T/r', used: '力矩、距离' },
    { sym: 'p', key: 'pressure', name: '轮端压力', unit: 'MPa', group: '制动器', def: '卡钳入口压力，不是主缸压力', risk: '高', note: '忽略管路压降', used: '力矩、摩擦副、踏板' },
    { sym: 'Acal', key: 'areaCaliper', name: '单侧活塞总面积', unit: 'mm²', group: '制动器', def: '活塞数 × 单活塞面积', risk: '高', note: '浮钳取活塞侧；对置钳取单侧', used: '力矩、踏板' },
    { sym: 'Apad', key: 'padArea', name: '单片摩擦片面积', unit: 'cm²', group: '制动器', def: '单侧一片；内外片合计=2×', risk: '高', note: '面能量按每片分摊', used: '摩擦副' },
    { sym: 'Re', key: 're', name: '有效半径', unit: 'mm', group: '制动器', def: '摩擦合力作用半径', risk: '高', note: '不是盘外径', used: '力矩、摩擦副' },
    { sym: 'Ro', key: 'padRo', name: '摩擦片外半径', unit: 'mm', group: '制动器', def: '用于 Re 计算', risk: '中', note: 'Re=(2/3)(Ro³−Ri³)/(Ro²−Ri²)', used: '整车参数计算器' },
    { sym: 'Ri', key: 'padRi', name: '摩擦片内半径', unit: 'mm', group: '制动器', def: '用于 Re 计算', risk: '中', note: '必须 Ro > Ri', used: '整车参数计算器' },
    { sym: 'μ', key: 'mu', name: '摩擦系数', unit: '—', group: '制动器', def: '按上下文为路面或摩擦片', risk: '高', note: '随压力、速度、温度变化', used: '力矩、摩擦副、距离' },
    { sym: 'md', key: 'discMass', name: '单个制动盘质量', unit: 'kg', group: '制动器', def: '每个盘的重量', risk: '中', note: '不是整车四盘总重', used: '热容量' },
    { sym: 'Do', key: 'discOD', name: '制动盘外径', unit: 'mm', group: '制动器', def: '盘外缘直径', risk: '低', note: '不直接等于 Re', used: '整车参数、摩擦副' },
    { sym: 'Di', key: 'discID', name: '制动盘内径', unit: 'mm', group: '制动器', def: '盘内缘直径', risk: '低', note: '用于扫掠面积', used: '整车参数、摩擦副' },

    /* ---- 液压 / 踏板 ---- */
    { sym: 'ip', key: 'pedalRatio', name: '踏板杠杆比', unit: '—', group: '液压与踏板', def: '踏板行程 / 推杆行程', risk: '高', note: '不是助力比', used: '踏板感' },
    { sym: 'BR', key: 'boost', name: '助力比', unit: '—', group: '液压与踏板', def: '助力器输出 / 输入', risk: '高', note: '含 jump-in 与最大助力', used: '踏板感' },
    { sym: 'Fj', key: 'jumpIn', name: '助力起始踏板力', unit: 'N', group: '液压与踏板', def: '助力开始生效的踏板力', risk: '中', note: '影响初段脚感', used: '踏板感' },
    { sym: 'FBmax', key: 'boostMax', name: '最大助力', unit: 'N', group: '液压与踏板', def: '助力器能提供的最大推力', risk: '中', note: '高减速度时可能饱和', used: '踏板感' },
    { sym: 'Fp', key: 'fTarget', name: '踏板力', unit: 'N', group: '液压与踏板', def: '驾驶员作用于踏板的力', risk: '高', note: '0.5g 目标常用 60–100N', used: '踏板感、匹配' },
    { sym: 'Frod', key: '', name: '推杆力', unit: 'N', group: '液压与踏板', def: '助力器输出到主缸的力', risk: '中', note: 'Frod ≈ ip·Fp·BR', used: '踏板感' },
    { sym: 'Amc', key: 'mcD', name: '主缸面积', unit: 'mm²', group: '液压与踏板', def: '由主缸直径计算', risk: '高', note: 'Amc=π·dmc²/4', used: '踏板感、匹配' },
    { sym: 'dmc', key: 'mcD', name: '主缸直径', unit: 'mm', group: '液压与踏板', def: '主缸 bore', risk: '高', note: '越细压力高、行程长', used: '踏板感、匹配' },
    { sym: 'sp', key: 'tTarget', name: '踏板行程', unit: 'mm', group: '液压与踏板', def: '踏板端点位移', risk: '高', note: '含空行程、间隙与柔度', used: '踏板感、匹配' },
    { sym: 'x₀', key: 'clearance', name: '单侧间隙', unit: 'mm', group: '液压与踏板', def: '摩擦片与盘的自然间隙', risk: '中', note: '影响初始行程', used: '踏板感' },
    { sym: 'Kcal', key: 'calStiff', name: '卡钳轴向刚度', unit: 'N/mm', group: '液压与踏板', def: '夹紧力 / 轴向变形', risk: '高', note: '需实测标定', used: '踏板感' },
    { sym: 'Cline', key: 'lineComp', name: '管路膨胀量', unit: 'mm³/MPa', group: '液压与踏板', def: '软管/硬管随压力膨胀', risk: '中', note: '影响行程', used: '踏板感' },
    { sym: 'V', key: '', name: '系统需液量', unit: 'mm³', group: '液压与踏板', def: '卡钳间隙 + 柔度 + 管路', risk: '高', note: '决定踏板行程', used: '踏板感' },

    /* ---- 热 ---- */
    { sym: 'E', key: '', name: '制动动能', unit: 'J', group: '热', def: 'E=½mv²', risk: '中', note: '车速翻倍，能量四倍', used: '热容量' },
    { sym: 'Q', key: '', name: '制动热量', unit: 'J', group: '热', def: '进入制动器的能量', risk: '中', note: '按 β 分配到前后轴', used: '热容量、摩擦副' },
    { sym: 'ΔT', key: '', name: '温升', unit: 'K / °C', group: '热', def: '单次或连续制动温升', risk: '高', note: 'ΔT=Q/(m·cp)', used: '热容量' },
    { sym: 'cp', key: 'cp', name: '比热容', unit: 'J/(kg·K)', group: '热', def: '制动盘材料比热', risk: '中', note: '铸铁约 480–520', used: '热容量' },
    { sym: 'τ', key: 'tau', name: '冷却时间常数', unit: 's', group: '热', def: '指数冷却参数', risk: '高', note: '必须实测标定', used: '热容量' },
    { sym: 'Tamb', key: 'ambient', name: '环境温度', unit: '°C', group: '热', def: '试验环境温度', risk: '低', note: '影响起点温度', used: '热容量' },
    { sym: 'Tlim', key: 'limit', name: '盘温参考上限', unit: '°C', group: '热', def: '按摩擦材料等级设定', risk: '高', note: '不是统一标准值', used: '热容量' },
    { sym: 'ηd', key: 'discShare', name: '导入制动盘比例', unit: '—', group: '热', def: '能量进入盘体的比例', risk: '中', note: '其余进入摩擦片/轮毂/卡钳', used: '热容量' },

    /* ---- 驻车 / EPB ---- */
    { sym: 'θ', key: '', name: '坡道角', unit: '°', group: '驻车', def: 'atan(坡度/100)', risk: '高', note: '20% ≈ 11.3°', used: '驻车' },
    { sym: 'SF', key: 'sf', name: '安全系数', unit: '—', group: '驻车', def: '坡道保持设计裕度', risk: '中', note: '按企标设定', used: '驻车' },
    { sym: 'Fc', key: '', name: '单卡钳夹紧力', unit: 'N', group: '驻车', def: '坡道保持所需夹紧力', risk: '高', note: 'Fc=Fr/(4μRe)', used: '驻车' },
    { sym: 'Tm', key: 'motorMax', name: 'EPB 电机扭矩', unit: 'N·m', group: '驻车', def: '电机输出扭矩', risk: '高', note: 'Tm=Fc·L/(2πηi)', used: '驻车' },
    { sym: 'Llead', key: 'lead', name: '丝杠导程', unit: 'mm/rev', group: '驻车', def: '每转轴向位移', risk: '中', note: '影响电机扭矩', used: '驻车' },
    { sym: 'ig', key: 'ratio', name: '减速比', unit: '—', group: '驻车', def: '电机到丝杠的减速比', risk: '中', note: '影响夹紧速度与扭矩', used: '驻车' },
    { sym: 'ηg', key: 'eff', name: '传动效率', unit: '—', group: '驻车', def: '丝杠+齿轮效率', risk: '中', note: '需实测', used: '驻车' },

    /* ---- 试验 / 数据 ---- */
    { sym: 'v₀', key: 'v0', name: '制动初速度', unit: 'km/h', group: '试验', def: '制动开始时的车速', risk: '高', note: '法规初速按标准', used: '距离、热、分析' },
    { sym: 'tr', key: 'tr', name: '反应/协调时间', unit: 's', group: '试验', def: '踏板接触到建压开始', risk: '高', note: '不等于驾驶员反应时间', used: '距离、分析' },
    { sym: 'tb', key: 'tb', name: '制动力上升时间', unit: 's', group: '试验', def: '减速度从 0 到稳态的时间', risk: '中', note: '影响建压段距离', used: '距离' },
    { sym: 's', key: '', name: '制动距离', unit: 'm', group: '试验', def: '从踩下踏板到停车', risk: '高', note: '法规不含驾驶员反应', used: '距离、分析' },
    { sym: 'MFDD', key: '', name: '充分发出的平均减速度', unit: 'm/s²', group: '试验', def: '0.8v₀ → 0.1v₀ 区间', risk: '高', note: '分母 25.92（v: km/h, s: m）', used: '分析' },
    { sym: 'vb', key: '', name: 'MFDD 起始速度', unit: 'km/h', group: '试验', def: '0.8·v₀', risk: '中', note: '按标准定义', used: '分析' },
    { sym: 've', key: '', name: 'MFDD 结束速度', unit: 'km/h', group: '试验', def: '0.1·v₀', risk: '中', note: '按标准定义', used: '分析' },
    { sym: 'ηABS', key: 'absEff', name: 'ABS/轮胎综合效率', unit: '—', group: '试验', def: '实际减速度 / μ·g', risk: '高', note: '默认 0.95 为工程假设', used: '制动距离' },
    { sym: 'epad', key: '', name: '单片面能量', unit: 'J/mm²', group: '试验', def: '单片摩擦片单位面积能量', risk: '高', note: 'e=Qwheel/(2Apad)', used: '摩擦副' },
    { sym: 'w', key: 'wearRate', name: '磨损率', unit: 'mm/万 km', group: '试验', def: '摩擦材料厚度磨损速率', risk: '高', note: '按配方/工况实测', used: '摩擦副' },
    { sym: 'S', key: '', name: '制动距离（标准符号）', unit: 'm', group: '试验', def: 'GB 21670 草案用 S 表示制动距离', risk: '高', note: '从踩下踏板到停车', used: '距离、法规' },
    { sym: 'k', key: '', name: '附着系数（标准符号）', unit: '—', group: '试验', def: '标准中轮胎-路面附着系数用 k', risk: '高', note: '与 μ_road 同义，按上下文区分', used: 'ABS、分配' },
    { sym: 'kpeak', key: '', name: '峰值附着系数', unit: '—', group: '试验', def: '附着系数-滑移率曲线最大值', risk: '高', note: 'ABS 匹配关键参数', used: 'ABS' },
    { sym: 'klock', key: '', name: '抱死附着系数', unit: '—', group: '试验', def: '滑移率 100% 时的附着系数', risk: '高', note: '用于计算 kpeak/klock', used: 'ABS' },
    { sym: 'η', key: '', name: '附着系数利用率', unit: '—', group: '试验', def: 'ABS 工作时最大制动强度 / 理论附着系数', risk: '高', note: '草案要求 ≥0.75', used: 'ABS' },
    { sym: 'vtest', key: '', name: '试验车速', unit: 'km/h', group: '试验', def: '标准规定的试验初速', risk: '中', note: '允许偏差 ±2%', used: '法规、距离' },
    { sym: 'vmax', key: '', name: '最高设计车速', unit: 'km/h', group: '试验', def: '车辆最高设计车速', risk: '中', note: '决定试验车速上限', used: '法规、高速' },
    { sym: 'p1', key: '', name: '储能器切断压力', unit: 'MPa', group: '液压与踏板', def: '制造商规定的最大系统工作压力', risk: '中', note: '储能试验起点', used: '法规、液压' },
    { sym: 'p2', key: '', name: '4 次促动后压力', unit: 'MPa', group: '液压与踏板', def: '不补能时 4 次全行程促动后的压力', risk: '中', note: '用于储能容量校核', used: '法规、液压' },
    { sym: 't0-1', key: '', name: '充能时间', unit: 's', group: '液压与踏板', def: '压力从 p2 升到 p1 的时间', risk: '中', note: '草案要求 ≤20 s', used: '法规、液压' },

    /* ---- 目标 / 匹配 ---- */
    { sym: 'zt', key: 'targetDecel', name: '目标减速度', unit: 'g', group: '目标', def: '设计目标或工况目标', risk: '中', note: '不要与实测 z 混用', used: '力矩、匹配' },
    { sym: 'φt', key: 'phi', name: '目标 φ₀', unit: '—', group: '目标', def: '匹配目标同步附着系数', risk: '中', note: '常用 0.85–1.05', used: '匹配' },
    { sym: 'Ft', key: 'force', name: '目标踏板力', unit: 'N', group: '目标', def: '0.5g 目标踏板力', risk: '中', note: '按车型定位设定', used: '匹配' },
    { sym: 'st', key: 'target', name: '目标制动距离', unit: 'm', group: '目标', def: '工程目标，不含反应', risk: '中', note: '不是法规限值', used: '距离' },
    { sym: 'δ', key: 'pct', name: '扰动幅度', unit: '%', group: '目标', def: '灵敏度分析的 ± 百分比', risk: '低', note: '单因素扰动', used: '灵敏度' },

    /* ---- 表单补充映射 ---- */
    { sym: 'v', key: 'speed', name: '车速', unit: 'km/h', group: '试验', def: '试验/分析中的瞬时车速', risk: '中', note: '与 v₀ 区分', used: '摩擦副、分析' },
    { sym: 'pref', key: 'pRef', name: '参考轮端压力', unit: 'MPa', group: '制动器', def: '校核用参考压力', risk: '中', note: '不是实测峰值', used: '摩擦副' },
    { sym: 'tpad', key: 'padThk', name: '摩擦片厚度', unit: 'mm', group: '制动器', def: '单片摩擦材料厚度', risk: '中', note: '与磨损寿命相关', used: '摩擦副' },
    { sym: 'tmin', key: 'minThk', name: '极限剩余厚度', unit: 'mm', group: '制动器', def: '更换阈值', risk: '中', note: '按维修规范', used: '摩擦副' },
    { sym: 'kμ', key: 'hotRatio', name: '热态 μ 保持率', unit: '—', group: '制动器', def: '热态 μ / 常温 μ', risk: '高', note: '需台架数据', used: '摩擦副' },
    { sym: 'elim', key: 'energyLimit', name: '面能量参考上限', unit: 'J/mm²', group: '试验', def: '按材料等级设定', risk: '中', note: '不是统一标准值', used: '摩擦副' },
    { sym: 'Lyear', key: 'annual', name: '年行驶里程', unit: 'km', group: '试验', def: '用于磨损寿命折算', risk: '低', note: '按项目设定', used: '摩擦副' },
    { sym: 'n', key: 'stops', name: '连续制动次数', unit: '次', group: '热', def: '连续工况循环次数', risk: '中', note: '与间隔时间共同决定峰值', used: '热容量' },
    { sym: 'Δt', key: 'interval', name: '制动间隔时间', unit: 's', group: '热', def: '两次制动之间的冷却时间', risk: '高', note: '影响峰值温度', used: '热容量' },
    { sym: 'igrade', key: 'grade', name: '坡度', unit: '%', group: '驻车', def: '坡度百分比', risk: '高', note: '20% ≈ 11.3°，不是 20°', used: '驻车' },
    { sym: 'Δφ₀', key: 'phiTol', name: 'φ₀ 容差', unit: '—', group: '目标', def: '匹配允许的 φ₀ 偏差', risk: '中', note: '按项目设定', used: '匹配' },
    { sym: 'ΔFp', key: 'forceTol', name: '踏板力容差', unit: 'N', group: '目标', def: '匹配允许的踏板力偏差', risk: '中', note: '按项目设定', used: '匹配' },
    { sym: 'Δsp', key: 'travelTol', name: '行程容差', unit: 'mm', group: '目标', def: '匹配允许的行程偏差', risk: '中', note: '按项目设定', used: '匹配' },
    { sym: 'zmin', key: 'minDecel', name: '最小最大减速度', unit: 'g', group: '目标', def: '匹配方案的最低能力要求', risk: '中', note: '按项目设定', used: '匹配' },
    { sym: 'dmc', key: 'mcOverride', name: '主缸直径覆盖', unit: 'mm', group: '液压与踏板', def: '方案对比时的临时主缸直径', risk: '低', note: '0 = 使用整车参数', used: '踏板感' },
    { sym: 'kBR', key: 'boostFactor', name: '助力比系数', unit: '—', group: '液压与踏板', def: '助力比的方案调整系数', risk: '中', note: '1.0 = 使用整车参数', used: '踏板感' },
    { sym: 'zmin', key: 'zMin', name: '校核下限', unit: 'g', group: '目标', def: '分配校核的减速度下限', risk: '低', note: '通常 0.15', used: '分配' },
    { sym: 'zmax', key: 'zMax', name: '校核上限', unit: 'g', group: '目标', def: '分配校核的减速度上限', risk: '低', note: '通常 0.80', used: '分配' }
  ];

  BT.SYMBOL_BY_KEY = {};
  BT.SYMBOLS.forEach(function (s) {
    if (s.key) BT.SYMBOL_BY_KEY[s.key] = s;
  });
  /* vehicle modal paths use last segment keys */
  ['re', 'pistonD', 'padArea', 'discMass', 'discOD', 'discID', 'padThk', 'mcD', 'pedalRatio', 'boost', 'jumpIn', 'boostMax', 'deadTravel', 'clearance', 'calStiff', 'lineComp', 'maxPressure', 'frontShare', 'mass', 'wheelR', 'L', 'h'].forEach(function (k) {
    if (!BT.SYMBOL_BY_KEY[k]) {
      const found = BT.SYMBOLS.find(function (s) { return s.sym.toLowerCase() === k.toLowerCase(); });
      if (found) BT.SYMBOL_BY_KEY[k] = found;
    }
  });
  /* explicit aliases for vehicle modal fields */
  BT.SYMBOL_BY_KEY.padArea = BT.SYMBOLS.find(function (s) { return s.sym === 'Apad'; });
  BT.SYMBOL_BY_KEY.discMass = BT.SYMBOLS.find(function (s) { return s.sym === 'md'; });
  BT.SYMBOL_BY_KEY.re = BT.SYMBOLS.find(function (s) { return s.sym === 'Re'; });
  BT.SYMBOL_BY_KEY.mcD = BT.SYMBOLS.find(function (s) { return s.sym === 'dmc'; });
  BT.SYMBOL_BY_KEY.pedalRatio = BT.SYMBOLS.find(function (s) { return s.sym === 'ip'; });
  BT.SYMBOL_BY_KEY.boost = BT.SYMBOLS.find(function (s) { return s.sym === 'BR'; });
  BT.SYMBOL_BY_KEY.jumpIn = BT.SYMBOLS.find(function (s) { return s.sym === 'Fj'; });
  BT.SYMBOL_BY_KEY.boostMax = BT.SYMBOLS.find(function (s) { return s.sym === 'FBmax'; });
  BT.SYMBOL_BY_KEY.clearance = BT.SYMBOLS.find(function (s) { return s.sym === 'x₀'; });
  BT.SYMBOL_BY_KEY.calStiff = BT.SYMBOLS.find(function (s) { return s.sym === 'Kcal'; });
  BT.SYMBOL_BY_KEY.lineComp = BT.SYMBOLS.find(function (s) { return s.sym === 'Cline'; });
  BT.SYMBOL_BY_KEY.wheelR = { sym: 'r', name: '车轮滚动半径', unit: 'mm', def: '轮胎滚动半径', risk: '中', note: '不是轮辋半径', used: '力矩、驻车' };
  BT.SYMBOL_BY_KEY.pistonD = { sym: 'dp', name: '活塞直径', unit: 'mm', group: '制动器', def: '单个活塞直径', risk: '中', note: '面积按 πd²/4', used: '力矩、踏板' };
  BT.SYMBOL_BY_KEY.pistons = { sym: 'np', name: '单侧活塞数', unit: '个', group: '制动器', def: '卡钳单侧活塞数量', risk: '中', note: '浮钳取活塞侧', used: '力矩、踏板' };
  BT.SYMBOL_BY_KEY.discOD = { sym: 'Do', name: '制动盘外径', unit: 'mm', group: '制动器', def: '盘外缘直径', risk: '低', note: '不直接等于 Re', used: '整车参数' };
  BT.SYMBOL_BY_KEY.discID = { sym: 'Di', name: '制动盘内径', unit: 'mm', group: '制动器', def: '盘内缘直径', risk: '低', note: '用于扫掠面积', used: '整车参数' };
  BT.SYMBOL_BY_KEY.maxPressure = { sym: 'pmax', name: '系统最高压力', unit: 'MPa', group: '液压与踏板', def: '系统可建立的最高轮端压力', risk: '中', note: '用于最大减速度估算', used: '整车参数、力矩' };
  BT.SYMBOL_BY_KEY.deadTravel = { sym: 's₀', name: '踏板空行程', unit: 'mm', group: '液压与踏板', def: '踏板自由行程', risk: '低', note: '影响初始踏板感', used: '踏板感' };
  BT.SYMBOL_BY_KEY.travel = BT.SYMBOLS.find(function (s) { return s.sym === 'sp'; });

  /* standards page can use the full dictionary */
  BT.VARIABLES = BT.SYMBOLS;
})(window.BT);
