// =============================================
// 增强版分析 Mock 数据 — 覆盖真实异常场景
// =============================================
import type {
  AnalyticsDashboardData, CategoryStats, TrendPoint, TopSupplyItem,
  PriceAnomaly, OptimizationSuggestion, KpiData, FilterParams
} from './types';

const MONTHS = ['2026-01','2026-02','2026-03','2026-04','2026-05','2026-06','2026-07','2026-08','2026-09','2026-10','2026-11','2026-12'];
const CATS = ['办公文具','劳保用品','清洁用品','耗材','其他'];

// 用品池
const SUPPLIES: { id: number; name: string; spec: string; cat: string }[] = [
  { id: 1, name: 'A4 打印纸', spec: '70g 500张/包', cat: '办公文具' },
  { id: 2, name: '中性笔', spec: '0.5mm 黑色', cat: '办公文具' },
  { id: 3, name: '安全帽', spec: 'ABS 标准型', cat: '劳保用品' },
  { id: 4, name: '棉纱手套', spec: '均码', cat: '劳保用品' },
  { id: 5, name: '洗洁精', spec: '500ml', cat: '清洁用品' },
  { id: 6, name: '垃圾袋', spec: '45×50cm', cat: '清洁用品' },
  { id: 7, name: '碳粉盒', spec: 'HP 388A', cat: '耗材' },
  { id: 8, name: '文件夹', spec: 'A4 双夹', cat: '办公文具' },
  { id: 9, name: 'N95 口罩', spec: 'KN95 五层', cat: '劳保用品' },
  { id: 10, name: '消毒液', spec: '500ml 84', cat: '清洁用品' },
  { id: 11, name: '墨盒', spec: 'HP 955XL', cat: '耗材' },
  { id: 12, name: '硒鼓', spec: '兄弟 DR-2350', cat: '耗材' },
  { id: 13, name: '洗手液', spec: '500ml 抑菌', cat: '清洁用品' },
  { id: 14, name: '劳保鞋', spec: '防砸 42码', cat: '劳保用品' },
  { id: 15, name: '回形针', spec: '29mm 100只', cat: '办公文具' },
  { id: 16, name: '订书机', spec: '中号', cat: '办公文具' },
];

// 用品月度消耗基数 (quantity, price)
const BASE_CONSUMPTION: Record<number, { qty: number; price: number }> = {
  1:  { qty: 15, price: 22.50 },
  2:  { qty: 50, price: 1.50 },
  3:  { qty: 5,  price: 35.00 },
  4:  { qty: 40, price: 3.50 },
  5:  { qty: 12, price: 8.90 },
  6:  { qty: 20, price: 12.00 },
  7:  { qty: 3,  price: 89.00 },
  8:  { qty: 10, price: 6.50 },
  9:  { qty: 30, price: 2.80 },
  10: { qty: 8,  price: 6.50 },
  11: { qty: 2,  price: 120.00 },
  12: { qty: 1,  price: 180.00 },
  13: { qty: 10, price: 12.50 },
  14: { qty: 2,  price: 85.00 },
  15: { qty: 20, price: 3.00 },
  16: { qty: 3,  price: 15.00 },
};

// 生成月度数据，带异常场景
function generateMonthlyData(): { month: string; supId: number; qty: number; price: number }[] {
  const result: { month: string; supId: number; qty: number; price: number }[] = [];

  for (const month of MONTHS) {
    for (const sup of SUPPLIES) {
      const base = BASE_CONSUMPTION[sup.id];
      let qty = base.qty;
      let price = base.price;

      // === 异常场景注入 ===

      // 1. 打印纸用量持续增长趋势（3-7月每月+20%）
      if (sup.id === 1) {
        const m = MONTHS.indexOf(month);
        if (m >= 2 && m <= 6) qty = Math.round(base.qty * (1 + (m - 1) * 0.25));
        if (m === 6) qty = Math.round(base.qty * 2.2); // 7月飙高——异常增长>30%
      }

      // 2. 碳粉盒价格波动（5月涨价20%，7月再涨15%）
      if (sup.id === 7) {
        const m = MONTHS.indexOf(month);
        if (m >= 4) price = Math.round(base.price * 1.20 * 100) / 100;
        if (m >= 6) price = Math.round(base.price * 1.20 * 1.15 * 100) / 100;
      }

      // 3. 劳保手套3-4月突然大量采购（翻倍）
      if (sup.id === 4) {
        const m = MONTHS.indexOf(month);
        if (m === 2 || m === 3) qty = base.qty * 3;
      }

      // 4. N95口罩1-2月高消耗然后锐减
      if (sup.id === 9) {
        const m = MONTHS.indexOf(month);
        if (m <= 1) qty = Math.round(base.qty * 2.5);
        if (m >= 4) qty = Math.round(base.qty * 0.3); // 需求下降
      }

      // 5. 文件夹4-6月连续小额高频采购——碎片化
      if (sup.id === 8) {
        const m = MONTHS.indexOf(month);
        if (m >= 3 && m <= 5) { qty = 2; price = 7.00; } // 涨价+少量多次
      }

      // 6. 消毒液6-7月断崖下降
      if (sup.id === 10) {
        const m = MONTHS.indexOf(month);
        if (m >= 5) qty = Math.round(base.qty * 0.2);
      }

      // 随机微调 ±10%
      const noise = 0.9 + Math.random() * 0.2;
      qty = Math.max(1, Math.round(qty * noise));
      price = Math.round(price * (0.98 + Math.random() * 0.04) * 100) / 100;

      result.push({ month, supId: sup.id, qty, price });
    }
  }
  return result;
}

const monthlyData = generateMonthlyData();

// 根据筛选参数过滤数据
function filterData(params: FilterParams) {
  let months: string[];

  if (params.type === 'monthly') {
    months = MONTHS.filter(m => m.startsWith(params.date));
  } else if (params.type === 'half-yearly') {
    const [year, half] = params.date.split('-');
    const h = parseInt(half);
    months = MONTHS.filter(m => {
      const mNum = parseInt(m.split('-')[1]);
      return m.startsWith(year) && (h <= 6 ? mNum <= 6 : mNum >= 7);
    });
  } else {
    months = MONTHS.filter(m => m.startsWith(params.date));
  }

  const catSet = params.categories.includes('all') ? new Set(CATS) : new Set(params.categories);

  const data = monthlyData.filter(d => months.includes(d.month) && catSet.has(SUPPLIES.find(s => s.id === d.supId)?.cat || ''));

  // 获取前一个周期的数据（用于对比）
  const prevData = monthlyData.filter(d => {
    const prevMonths = getPrevMonths(params);
    return prevMonths.includes(d.month) && catSet.has(SUPPLIES.find(s => s.id === d.supId)?.cat || '');
  });

  return { data, prevData, months };
}

function getPrevMonths(params: FilterParams): string[] {
  if (params.type === 'monthly') {
    const [y, m] = params.date.split('-').map(Number);
    const prev = new Date(y, m - 2, 1);
    const py = prev.getFullYear();
    const pm = String(prev.getMonth() + 1).padStart(2, '0');
    return MONTHS.filter(m => m === `${py}-${pm}`);
  }
  if (params.type === 'half-yearly') {
    const [y, h] = params.date.split('-');
    const hNum = parseInt(h);
    if (hNum === 1) return MONTHS.filter(m => m.startsWith(String(parseInt(y) - 1)) && [7,8,9,10,11,12].includes(parseInt(m.split('-')[1])));
    return MONTHS.filter(m => m.startsWith(y) && [1,2,3,4,5,6].includes(parseInt(m.split('-')[1])));
  }
  // yearly
  return MONTHS.filter(m => m.startsWith(String(parseInt(params.date) - 1)));
}

export function fetchAnalyticsDashboard(params: FilterParams): AnalyticsDashboardData {
  const { data, prevData, months } = filterData(params);

  // KPI 计算
  const totalAmount = data.reduce((s, d) => s + d.qty * d.price, 0);
  const prevTotalAmount = prevData.reduce((s, d) => s + d.qty * d.price, 0);

  // 按月份聚合获得采购单数（模拟：每次采购包含多种用品，用用品总数/平均每单用品数 估算）
  const totalQty = data.reduce((s, d) => s + d.qty, 0);
  const simulatedPurchaseCount = Math.max(1, Math.round(totalQty / 8));
  const prevTotalQty = prevData.reduce((s, d) => s + d.qty, 0);
  const prevPurchaseCount = Math.max(1, Math.round(prevTotalQty / 8));

  // 月度趋势
  const monthlyTrend: TrendPoint[] = months.map(m => {
    const mData = data.filter(d => d.month === m);
    return {
      period: m,
      amount: Math.round(mData.reduce((s, d) => s + d.qty * d.price, 0) * 100) / 100,
      quantity: mData.reduce((s, d) => s + d.qty, 0),
      count: Math.max(1, Math.round(mData.reduce((s, d) => s + d.qty, 0) / 8)),
    };
  });

  // 分类统计
  const catAmount: Record<string, number> = {};
  const catQty: Record<string, number> = {};
  data.forEach(d => {
    const cat = SUPPLIES.find(s => s.id === d.supId)?.cat || '其他';
    catAmount[cat] = (catAmount[cat] || 0) + d.qty * d.price;
    catQty[cat] = (catQty[cat] || 0) + d.qty;
  });
  const catStats: CategoryStats[] = CATS.filter(c => params.categories.includes('all') || params.categories.includes(c)).map(cat => {
    const a = Math.round((catAmount[cat] || 0) * 100) / 100;
    const q = catQty[cat] || 0;
    const pct = totalAmount > 0 ? Math.round((a / totalAmount) * 10000) / 100 : 0;
    // 对比前周期
    const prevCatAmt = prevData
      .filter(d => (SUPPLIES.find(s => s.id === d.supId)?.cat || '') === cat)
      .reduce((s, d) => s + d.qty * d.price, 0);
    const change = prevCatAmt > 0 ? Math.round(((a - prevCatAmt) / prevCatAmt) * 10000) / 100 : 0;
    return {
      category: cat, amount: a, quantity: q, percentage: pct,
      trend: change > 5 ? 'up' : change < -5 ? 'down' : 'stable',
      changePercent: change,
    };
  });

  // TOP 用品
  const supMap: Record<number, { qty: number; amount: number; prices: number[]; months: string[]; qtyByMonth: Record<string, number>; amtByMonth: Record<string, number> }> = {};
  data.forEach(d => {
    if (!supMap[d.supId]) supMap[d.supId] = { qty: 0, amount: 0, prices: [], months: [], qtyByMonth: {}, amtByMonth: {} };
    supMap[d.supId].qty += d.qty;
    supMap[d.supId].amount += d.qty * d.price;
    supMap[d.supId].prices.push(d.price);
    if (!supMap[d.supId].months.includes(d.month)) supMap[d.supId].months.push(d.month);
    supMap[d.supId].qtyByMonth[d.month] = (supMap[d.supId].qtyByMonth[d.month] || 0) + d.qty;
    supMap[d.supId].amtByMonth[d.month] = (supMap[d.supId].amtByMonth[d.month] || 0) + d.qty * d.price;
  });

  const topSupplies: TopSupplyItem[] = Object.entries(supMap)
    .map(([idStr, v]) => {
      const id = parseInt(idStr);
      const sup = SUPPLIES.find(s => s.id === id)!;
      const prices = v.prices.sort((a, b) => a - b);
      const lastPrice = v.prices[v.prices.length - 1];
      const prevPrice = v.prices.length > 1 ? v.prices[v.prices.length - 2] : lastPrice;
      const priceChg = prevPrice > 0 ? Math.round(((lastPrice - prevPrice) / prevPrice) * 10000) / 100 : 0;
      const monthlyHistory = v.months.map(m => ({
        month: m,
        quantity: v.qtyByMonth[m] || 0,
        amount: Math.round((v.amtByMonth[m] || 0) * 100) / 100,
      })).sort((a, b) => a.month.localeCompare(b.month));

      return {
        id, name: sup.name, spec: sup.spec, category: sup.cat,
        totalQuantity: v.qty,
        totalAmount: Math.round(v.amount * 100) / 100,
        avgPrice: v.prices.length > 0 ? Math.round((v.prices.reduce((s, p) => s + p, 0) / v.prices.length) * 100) / 100 : 0,
        lastPrice, prevPrice, priceChangePercent: priceChg,
        lastPurchaseDate: v.months.sort().pop() || '',
        monthlyHistory,
      };
    })
    .sort((a, b) => b.totalAmount - a.totalAmount);

  // 价格异常
  const priceAnomalies: PriceAnomaly[] = topSupplies
    .filter(s => s.prevPrice > 0 && Math.abs(s.priceChangePercent) > 5)
    .map(s => ({
      supplyId: s.id, supplyName: s.name, spec: s.spec, category: s.category,
      lastUnitPrice: s.lastPrice, prevUnitPrice: s.prevPrice,
      changePercent: s.priceChangePercent,
      lastPurchaseDate: s.lastPurchaseDate,
      prevPurchaseDate: s.monthlyHistory.length > 1 ? s.monthlyHistory[s.monthlyHistory.length - 2]?.month || '' : '',
    }));

  // YOY 变化
  const yoyChange = prevTotalAmount > 0 ? Math.round(((totalAmount - prevTotalAmount) / prevTotalAmount) * 10000) / 100 : 0;

  // 趋势数组（用于 sparkline）
  const totalAmountTrend = monthlyTrend.map(t => t.amount);
  const totalPurchasesTrend = monthlyTrend.map(t => t.count);
  const avgOrderTrend = monthlyTrend.map(t => t.count > 0 ? Math.round((t.amount / t.count) * 100) / 100 : 0);

  const kpi: KpiData = {
    totalAmount: Math.round(totalAmount * 100) / 100,
    totalPurchases: simulatedPurchaseCount,
    avgOrderAmount: simulatedPurchaseCount > 0 ? Math.round((totalAmount / simulatedPurchaseCount) * 100) / 100 : 0,
    yoyChange,
    totalAmountTrend, totalPurchasesTrend, avgOrderTrend,
  };

  // 智能优化建议
  const suggestions = generateSuggestions(data, prevData, catStats, topSupplies, monthlyTrend, params);

  return {
    kpi, categoryStats: catStats, monthlyTrend, topSupplies, priceAnomalies,
    suggestions,
    filterSummary: {
      currentTotal: Math.round(totalAmount * 100) / 100,
      prevTotal: Math.round(prevTotalAmount * 100) / 100,
      changePercent: yoyChange,
    },
  };
}

function generateSuggestions(
  data: any[], prevData: any[],
  catStats: CategoryStats[], topSupplies: TopSupplyItem[],
  monthlyTrend: TrendPoint[], params: FilterParams
): OptimizationSuggestion[] {
  const suggestions: OptimizationSuggestion[] = [];
  let id = 0;

  // 规则1: 连续增长预警
  const growingCats = catStats.filter(c => c.trend === 'up' && c.changePercent > 20);
  for (const cat of growingCats) {
    suggestions.push({
      id: `sug-${++id}`, type: 'warning',
      title: `${cat.category} 费用显著增长`,
      description: `该分类较上${params.type === 'monthly' ? '月' : '周期'}增长 ${cat.changePercent.toFixed(1)}%，达到 ¥${cat.amount.toFixed(0)}。持续增长将影响整体预算。`,
      action: `审查${cat.category}实际需求，考虑批量采购锁定价格`,
      impact: `预计可节省 ${Math.round(cat.amount * 0.12)} 元/年`,
    });
  }

  // 规则2: 价格异常预警
  const priceSurge = topSupplies.filter(s => s.priceChangePercent > 15);
  for (const s of priceSurge.slice(0, 2)) {
    suggestions.push({
      id: `sug-${++id}`, type: 'warning',
      title: `${s.name} 价格上涨 ${s.priceChangePercent.toFixed(0)}%`,
      description: `单价从 ¥${s.prevPrice.toFixed(2)} 涨至 ¥${s.lastPrice.toFixed(2)}，涨幅较大。`,
      action: `寻找替代供应商或提前备货`,
      impact: `按当前用量年化影响约 ¥${Math.round(s.totalAmount * s.priceChangePercent / 100)}`,
    });
  }

  // 规则3: 碎片化采购
  const smallOrders = monthlyTrend.filter(t => t.amount > 0 && (t.amount / t.count) < 50);
  if (smallOrders.length >= 2) {
    suggestions.push({
      id: `sug-${++id}`, type: 'optimize',
      title: '小额采购频次偏高，存在碎片化',
      description: `有 ${smallOrders.length} 个月的平均单次采购金额低于 ¥50，碎片化采购增加物流和管理成本。`,
      action: '合并同类用品采购计划，改为月度集中采购',
      impact: '预计降低物流成本 15-20%',
    });
  }

  // 规则4: 闲置/淘汰建议
  const activeSupIds = new Set(data.map((d: any) => d.supId));
  const unused = SUPPLIES.filter(s => !activeSupIds.has(s.id));
  if (unused.length > 0) {
    suggestions.push({
      id: `sug-${++id}`, type: 'info',
      title: `${unused.length} 种用品在选期内没有采购记录`,
      description: `如：${unused.slice(0, 3).map(s => s.name).join('、')}${unused.length > 3 ? '等' : ''}。可能已不再需要或库存充足。`,
      action: '评估是否从字典中移除或降低安全库存',
      impact: '减少资金占用',
    });
  }

  // 规则5: 持续增长预警（单用品）
  const sustainedGrowth = topSupplies.filter(s => {
    const recent = s.monthlyHistory.slice(-3);
    return recent.length >= 3 && recent[0].quantity < recent[1].quantity && recent[1].quantity < recent[2].quantity;
  });
  for (const s of sustainedGrowth.slice(0, 2)) {
    suggestions.push({
      id: `sug-${++id}`, type: 'warning',
      title: `${s.name} 用量连续 3 个月递增`,
      description: `建议核实业务需求是否真实增长，防止库存不足或预算超支。`,
      action: '分析增长原因，考虑签订年度框架协议',
      impact: '框架协议通常可获 5-10% 折扣',
    });
  }

  // 规则6: 成本结构偏离预警
  const topCat = catStats[0];
  if (topCat && topCat.percentage > 40) {
    suggestions.push({
      id: `sug-${++id}`, type: 'optimize',
      title: `${topCat.category} 占比 ${topCat.percentage.toFixed(0)}%，成本结构集中`,
      description: `单一分类占比超过 40%，建议审查是否存在替代品或优化空间。`,
      action: '检查该分类高消耗用品，引入竞争供应商',
      impact: '降低单一品类依赖风险',
    });
  }

  // 默认积极建议
  if (suggestions.length === 0) {
    suggestions.push({
      id: `sug-${++id}`, type: 'success',
      title: '整体采购状况健康',
      description: '各项指标均在正常范围内，无异常波动。',
      action: '继续保持当前采购策略',
    });
  }

  return suggestions;
}

/** 获取所有用品列表（供其他模块使用） */
export function getAllSupplies() { return SUPPLIES; }
