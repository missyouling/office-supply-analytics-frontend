import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { showToast } from '@/components/ui/toaster';
import { canteenApi } from '@/lib/api';
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ComposedChart, Area,
} from 'recharts';
import { Printer, Download } from 'lucide-react';

const fmt = (n: any) => `¥${Number(n || 0).toFixed(2)}`;
const fmtNum = (n: any) => Number(n || 0).toLocaleString();
const COLORS = ['#2563eb', '#16a34a', '#f59e0b', '#dc2626', '#8b5cf6', '#06b6d4', '#ec4899', '#84cc16'];

const currentMonth = () => new Date().toISOString().slice(0, 7);

type Period = 'month' | 'half' | 'year';

interface Summary {
  income: { total: number; meal: number; breakfast: number; lunch: number; dinner: number; resource: number; count: number };
  expense: { total: number; food: number; other: number };
  profit: number;
}

function KpiCards({ summary }: { summary: Summary | null }) {
  if (!summary) return null;
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <Card><CardContent className="p-4">
        <p className="text-xs text-muted-foreground">总收入</p>
        <p className="text-2xl font-bold text-green-600">{fmt(summary.income.total)}</p>
        <p className="text-[11px] text-muted-foreground">餐费 {fmt(summary.income.meal)} + 资源费 {fmt(summary.income.resource)}</p>
      </CardContent></Card>
      <Card><CardContent className="p-4">
        <p className="text-xs text-muted-foreground">总支出</p>
        <p className="text-2xl font-bold text-red-600">{fmt(summary.expense.total)}</p>
        <p className="text-[11px] text-muted-foreground">食材 {fmt(summary.expense.food)} + 其他 {fmt(summary.expense.other)}</p>
      </CardContent></Card>
      <Card><CardContent className="p-4">
        <p className="text-xs text-muted-foreground">净盈亏</p>
        <p className={`text-2xl font-bold ${summary.profit >= 0 ? 'text-blue-600' : 'text-red-600'}`}>{fmt(summary.profit)}</p>
        <p className="text-[11px] text-muted-foreground">{summary.profit >= 0 ? '盈余' : '亏损'}</p>
      </CardContent></Card>
      <Card><CardContent className="p-4">
        <p className="text-xs text-muted-foreground">就餐人次（午+晚）</p>
        <p className="text-2xl font-bold text-slate-700">{fmtNum(summary.income.count)}</p>
        <p className="text-[11px] text-muted-foreground">
          早 {summary.income.breakfast ? fmt(summary.income.breakfast) : '-'} / 午 {summary.income.lunch ? fmt(summary.income.lunch) : '-'} / 晚 {summary.income.dinner ? fmt(summary.income.dinner) : '-'}
        </p>
      </CardContent></Card>
    </div>
  );
}

export default function AnalyticsTab() {
  const [period, setPeriod] = useState<Period>('month');
  const [month, setMonth] = useState(currentMonth());
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [summary, setSummary] = useState<Summary | null>(null);
  const [dailyTrend, setDailyTrend] = useState<any[]>([]);
  const [expenseBreakdown, setExpenseBreakdown] = useState<any>({ food: 0, others: [] });
  const [foodShare, setFoodShare] = useState<any[]>([]);
  const [topSupplies, setTopSupplies] = useState<any[]>([]);
  const [costSummary, setCostSummary] = useState<any>(null);
  const [costItems, setCostItems] = useState<any[]>([]);
  const [compare, setCompare] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  // 半年度：上半年/下半年选择（默认当前所在半年），year 用于半年度/年度
  const [half, setHalf] = useState<'h1' | 'h2'>(() => {
    const mo = Number(currentMonth().slice(5, 7));
    return mo <= 6 ? 'h1' : 'h2';
  });
  const [range, setRange] = useState({ from: `${year}-01`, to: `${year}-12` });

  const loadMonth = useCallback(async (m: string) => {
    setLoading(true);
    try {
      // 月度费用汇总：月度视图按天（daily），跨月视图按月（range 默认最近月及之前）
      const [cs, csItems] = await Promise.all([
        canteenApi.analytics.costSummary({ month: m }),
        canteenApi.analytics.costSummary({}),
      ]);
      setCostSummary((cs as any)?.item || null);
      setCostItems((csItems as any)?.items || []);
      const [s, t, b, f, top] = await Promise.all([
        canteenApi.analytics.summary(m),
        canteenApi.analytics.dailyTrend(m),
        canteenApi.analytics.expenseBreakdown(m),
        canteenApi.analytics.foodShare(m),
        canteenApi.analytics.topSupplies(m, 10),
      ]);
      setSummary(s as unknown as Summary); setDailyTrend(t.items || []); setExpenseBreakdown(b);
      setFoodShare(f.items || []); setTopSupplies(top.items || []);
    } catch (e: any) { showToast('加载失败', e.message, 'destructive'); }
    finally { setLoading(false); }
  }, []);

  const loadCompare = useCallback(async (params: any) => {
    setLoading(true);
    try {
      const r = await canteenApi.analytics.monthlyCompare(params);
      setCompare(r.items || []);
    } catch (e: any) { showToast('加载失败', e.message, 'destructive'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadMonth(month); }, [loadMonth, month]);

  const changePeriod = (p: Period) => {
    setPeriod(p);
    if (p === 'month') loadMonth(month);
    else if (p === 'half') {
      const y = Number(year);
      const from = half === 'h1' ? `${year}-01` : `${year}-07`;
      const to = half === 'h1' ? `${year}-06` : `${year}-12`;
      setRange({ from, to });
      loadCompare({ from, to });
    } else if (p === 'year') {
      loadCompare({ year });
    }
  };

  // 切换上半年/下半年
  const changeHalf = (h: 'h1' | 'h2') => {
    setHalf(h);
    const from = h === 'h1' ? `${year}-01` : `${year}-07`;
    const to = h === 'h1' ? `${year}-06` : `${year}-12`;
    setRange({ from, to });
    loadCompare({ from, to });
  };

  // 每日盈亏明细表（收入 = 消费收入 + 资源占用费 + 早餐收入；支出 = 采购支出 + 分摊支出）
  const dailyTable = dailyTrend.map((d, i) => {
    const share = d.share_expense || 0;
    const purchase = d.expense || 0;
    const income = d.income || 0;
    const breakfast = d.breakfast || 0;
    const resource = d.resource || 0;
    const consume = (d.lunch || 0) + (d.dinner || 0); // 消费收入 = 午餐+晚餐
    const totalExpense = purchase + share;
    // 人均成本 = (采购支出 + 分摊支出 - 早餐收入 - 资源占用费收入) / 当日消费总人次
    const costPerCapita = d.count ? ((purchase + share - breakfast - resource) / d.count) : 0;
    return {
      序号: i + 1, 日期: d.date, 收入: income, 消费收入: consume, 早餐收入: breakfast, 资源费收入: resource,
      采购支出: purchase, 分摊支出: share,
      盈亏: income - totalExpense, 人次: d.count || 0, 人均成本: d.count ? costPerCapita.toFixed(2) : '-',
    };
  });
  // 每日盈亏明细：底部每列汇总 + 整月人均成本
  const dailySummary = (() => {
    if (!dailyTable.length) return null;
    const sumBill = (k: '收入' | '消费收入' | '早餐收入' | '资源费收入' | '采购支出' | '分摊支出' | '盈亏' | '人次') => dailyTable.reduce((s, r) => s + (Number(r[k]) || 0), 0);
    const perDayCosts = dailyTable.map((r) => Number(r.人均成本)).filter((v) => !isNaN(v));
    return {
      收入: sumBill('收入'), 消费收入: sumBill('消费收入'), 早餐收入: sumBill('早餐收入'), 资源费收入: sumBill('资源费收入'),
      采购支出: sumBill('采购支出'), 分摊支出: sumBill('分摊支出'),
      盈亏: sumBill('盈亏'), 人次: sumBill('人次'),
      人均成本: perDayCosts.length ? (perDayCosts.reduce((a, b) => a + b, 0) / perDayCosts.length).toFixed(2) : '-',
    };
  })();

  const expensePieData = [
    { name: '食材采购', value: expenseBreakdown.food || 0 },
    ...(expenseBreakdown.others || []).map((o: any) => ({ name: o.category, value: o.amount })),
  ].filter((d) => d.value > 0);

  const foodPieData = foodShare.map((f) => ({ name: f.category || '未分类', value: f.amount || 0 }));

  const compareData = compare.map((c) => ({
    ...c,
    totalIncome: (c.income || 0) + (c.resource || 0),
    expense: (c.food || 0) + (c.other || 0),
    profit: (c.income || 0) + (c.resource || 0) - (c.food || 0) - (c.other || 0),
    perCapita: c.perCapita ?? 0, // 后端已按「每日人均成本平均」口径计算，与月度明细一致
  }));

  // 打印预览月度费用汇总（月度视图按日、跨月按月）
  const printCostSummary = () => {
    const arr = period === 'month' ? (costSummary?.daily || []) : costItems;
    if (!arr.length) return;
    const headers = period === 'month' ? ['序号', '日期', '肉类', '蔬菜', '干杂', '充值', '消费', '退费', '盈亏'] : ['序号', '月份', '肉类', '蔬菜', '干杂', '充值', '消费', '退费', '盈亏', '人均'];
    const rows = arr.map((c: any, i: number) => [
      i + 1, period === 'month' ? (c.date || '').slice(5) : c.month,
      Number(c.meat).toFixed(2), Number(c.vegetable).toFixed(2), Number(c.dry).toFixed(2),
      Number(c.recharge).toFixed(2), Number(c.consume).toFixed(2), Number(c.refund).toFixed(2),
      Number(c.profit).toFixed(2),
      ...(period !== 'month' ? [Number(c.perCapita || 0).toFixed(2)] : []),
    ]);
    // 合计行
    const s = (k: string) => arr.reduce((acc: number, c: any) => acc + (Number(c[k]) || 0), 0);
    const caps = arr.map((c: any) => Number(c.perCapita)).filter((v: number) => v > 0);
    rows.push(['合计', `${arr.length} 天`, s('meat').toFixed(2), s('vegetable').toFixed(2), s('dry').toFixed(2),
      s('recharge').toFixed(2), s('consume').toFixed(2), s('refund').toFixed(2), s('profit').toFixed(2),
      ...(period !== 'month' ? [caps.length ? (caps.reduce((a: number, b: number) => a + b, 0) / caps.length).toFixed(2) : '0.00'] : [])]);
    const body = rows.map((r: any[], i: number) => `<tr${i % 2 === 0 ? ' class="even"' : ''}${i === rows.length - 1 ? ' class="total"' : ''}>${r.map((v: any) => `<td>${v}</td>`).join('')}</tr>`).join('\n');
    const title = period === 'month' ? `食堂月度费用汇总（${month} 按日）` : '食堂月度费用汇总（按月）';
    const html = `<!doctype html>
<html><head><meta charset="utf-8"><title>月度费用汇总</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:"Microsoft YaHei","PingFang SC","Noto Sans SC",sans-serif;padding:40px 50px;color:#333;font-size:13px}
h1{font-size:22px;margin-bottom:6px}
.meta{color:#666;font-size:12px;margin-bottom:16px}
table{width:100%;border-collapse:collapse;margin-bottom:20px}
th{background:#1e40af;color:#fff;padding:8px 6px;text-align:center;font-size:12px}
td{padding:7px 6px;border-bottom:1px solid #e5e7eb;font-size:12px;text-align:center}
tr.even td{background:#f8fafc}
tr.total td{background:#dbeafe;font-weight:bold}
@media print{body{padding:15px 25px}th{background:#1e40af!important;-webkit-print-color-adjust:exact;print-color-adjust:exact}tr.total td{background:#dbeafe!important}}
</style></head><body>
<h1>${title}</h1>
<p class="meta">统计范围：${arr[0]?.date || arr[0]?.month || ''} 至 ${arr[arr.length - 1]?.date || arr[arr.length - 1]?.month || ''}</p>
<table><thead><tr>${headers.map((h) => `<th>${h}</th>`).join('')}</tr></thead><tbody>
${body}
</tbody></table>
<p class="meta">肉类/蔬菜/干杂 = 当日食材采购按分类汇总；充值 = 饭卡充值总额；消费 = 午餐+晚餐刷卡金额；退费 = 饭卡退费总额；盈亏 = 收入（餐费+资源占用费）− 支出（食材采购+其他费用分摊+退费）${period === 'month' ? '' : '；人均 = 每日人均成本平均'}</p>
</body></html>`;
    const w = window.open('', '_blank');
    if (!w) { showToast('浏览器拦截了打印窗口', '', 'destructive'); return; }
    w.document.write(html);
    w.document.close();
  };

  // 导出月度费用汇总 CSV（月度视图按日、跨月按月）
  const exportCostSummary = () => {
    const arr = period === 'month' ? (costSummary?.daily || []) : costItems;
    if (!arr.length) return;
    const header = period === 'month' ? ['序号', '日期', '肉类', '蔬菜', '干杂', '充值', '消费', '退费', '盈亏'] : ['序号', '月份', '肉类', '蔬菜', '干杂', '充值', '消费', '退费', '盈亏', '人均'];
    const lines = [
      header.join(','),
      ...arr.map((c: any, i: number) => [
        i + 1, period === 'month' ? (c.date || '').slice(5) : c.month,
        Number(c.meat).toFixed(2), Number(c.vegetable).toFixed(2), Number(c.dry).toFixed(2),
        Number(c.recharge).toFixed(2), Number(c.consume).toFixed(2), Number(c.refund).toFixed(2),
        Number(c.profit).toFixed(2),
        ...(period !== 'month' ? [Number(c.perCapita || 0).toFixed(2)] : []),
      ].join(',')),
    ].join('\n');
    const blob = new Blob(['\ufeff' + lines], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = period === 'month' ? `食堂月度费用汇总_${month}_按日.csv` : '食堂月度费用汇总.csv';
    a.click();
    URL.revokeObjectURL(a.href);
  };

  // 打印预览每日盈亏明细
  const printDetail = () => {
    const headers = ['序号', '日期', '消费收入', '早餐收入', '资源费收入', '总收入', '采购支出', '分摊支出', '盈亏', '人次', '人均成本'];
    const rows = dailyTable.map((r) => [
      r.序号, r.日期, Number(r.消费收入).toFixed(2), Number(r.早餐收入).toFixed(2), Number(r.资源费收入).toFixed(2),
      Number(r.收入).toFixed(2), Number(r.采购支出).toFixed(2), Number(r.分摊支出).toFixed(2),
      Number(r.盈亏).toFixed(2), r.人次, r.人均成本 === '-' ? '-' : r.人均成本,
    ]);
    // 汇总行
    if (dailySummary) {
      rows.push([
        '合计', `${dailyTable.length} 天`, Number(dailySummary.消费收入).toFixed(2), Number(dailySummary.早餐收入).toFixed(2), Number(dailySummary.资源费收入).toFixed(2),
        Number(dailySummary.收入).toFixed(2), Number(dailySummary.采购支出).toFixed(2), Number(dailySummary.分摊支出).toFixed(2),
        Number(dailySummary.盈亏).toFixed(2), dailySummary.人次, dailySummary.人均成本,
      ]);
    }
    const body = rows.map((r, i) => `<tr${i % 2 === 0 ? ' class="even"' : ''}${i === rows.length - 1 && dailySummary ? ' class="total"' : ''}>${r.map((c) => `<td>${c}</td>`).join('')}</tr>`).join('\n');
    const html = `<!doctype html>
<html><head><meta charset="utf-8"><title>每日盈亏明细（${month}）</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:"Microsoft YaHei","PingFang SC","Noto Sans SC",sans-serif;padding:30px 40px;color:#333;font-size:13px}
h1{font-size:20px;margin-bottom:10px}
table{width:100%;border-collapse:collapse;margin-bottom:16px}
th{background:#1e40af;color:#fff;padding:8px 6px;text-align:center;font-size:13px}
td{padding:7px 6px;border-bottom:1px solid #e5e7eb;font-size:13px;text-align:center}
tr.even td{background:#f8fafc}
tr.total td{background:#dbeafe;font-weight:bold}
.formula{background:#f0f9ff;border:1px solid #bae6fd;border-radius:6px;padding:10px 14px;font-size:13px;line-height:1.9;color:#0c4a6e}
@media print{body{padding:15px 25px}th{background:#1e40af!important;-webkit-print-color-adjust:exact;print-color-adjust:exact}tr.total td{background:#dbeafe!important;-webkit-print-color-adjust:exact;print-color-adjust:exact}}
</style></head><body>
<h1>每日盈亏明细（${month}）</h1>
<table><thead><tr>${headers.map((h) => `<th>${h}</th>`).join('')}</tr></thead><tbody>
${body}
</tbody></table>
<div class="formula">
<b>计算口径：</b><br>
收入 = 消费收入 + 资源占用费收入 + 早餐收入<br>
支出 = 采购支出 + 分摊支出<br>
人均成本 = (采购支出 + 分摊支出 − 早餐收入 − 资源占用费收入) ÷ 当日消费总人次
</div>
<script>setTimeout(()=>window.print(),300)</script>
</body></html>`;
    const w = window.open('', '_blank');
    if (!w) { showToast('浏览器拦截了打印窗口', '', 'destructive'); return; }
    w.document.write(html);
    w.document.close();
  };

  // 打印预览月度对比明细
  const printCompare = () => {
    const headers = ['月份', '收入', '食材', '其他', '盈亏', '人次', '人均'];
    const rows = compareData.map((c) => [
      c.month, Number(c.totalIncome).toFixed(2), Number(c.food).toFixed(2), Number(c.other).toFixed(2),
      Number(c.profit).toFixed(2), c.count || 0, c.perCapita || 0,
    ]);
    // 汇总行
    if (compareData.length > 0) {
      const s = (k: string) => compareData.reduce((acc: number, c: any) => acc + (Number(c[k]) || 0), 0);
      const income = s('totalIncome'), count = s('count');
      const caps = compareData.map((c: any) => Number(c.perCapita)).filter((v: number) => v > 0);
      const perCapita = caps.length ? (caps.reduce((a: number, b: number) => a + b, 0) / caps.length).toFixed(2) : 0;
      rows.push(['合计', income.toFixed(2), s('food').toFixed(2), s('other').toFixed(2), s('profit').toFixed(2), count, perCapita]);
    }
    const body = rows.map((r, i) => `<tr${i % 2 === 0 ? ' class="even"' : ''}${i === rows.length - 1 && compareData.length > 0 ? ' class="total"' : ''}>${r.map((c) => `<td>${c}</td>`).join('')}</tr>`).join('\n');
    const html = `<!doctype html>
<html><head><meta charset="utf-8"><title>月度对比明细（${period === 'half' ? `${range.from} 至 ${range.to}` : year}）</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:"Microsoft YaHei","PingFang SC","Noto Sans SC",sans-serif;padding:30px 40px;color:#333;font-size:13px}
h1{font-size:20px;margin-bottom:10px}
table{width:100%;border-collapse:collapse;margin-bottom:16px}
th{background:#1e40af;color:#fff;padding:8px 6px;text-align:center;font-size:13px}
td{padding:7px 6px;border-bottom:1px solid #e5e7eb;font-size:13px;text-align:center}
tr.even td{background:#f8fafc}
tr.total td{background:#dbeafe;font-weight:bold}
@media print{body{padding:15px 25px}th{background:#1e40af!important;-webkit-print-color-adjust:exact;print-color-adjust:exact}tr.total td{background:#dbeafe!important;-webkit-print-color-adjust:exact;print-color-adjust:exact}}
</style></head><body>
<h1>月度对比明细（${period === 'half' ? `${range.from} 至 ${range.to}` : year}）</h1>
<table><thead><tr>${headers.map((h) => `<th>${h}</th>`).join('')}</tr></thead><tbody>
${body}
</tbody></table>
<script>setTimeout(()=>window.print(),300)</script>
</body></html>`;
    const w = window.open('', '_blank');
    if (!w) { showToast('浏览器拦截了打印窗口', '', 'destructive'); return; }
    w.document.write(html);
    w.document.close();
  };

  // 趋势图数据：支出 = 采购 + 分摊
  const trendChartData = dailyTrend.map((d) => ({
    ...d,
    expense: (d.expense || 0) + (d.share_expense || 0),
  }));

  return (
    <div className="space-y-4">
      {/* 时间维度切换 */}
      <Card>
        <CardContent className="p-4 flex items-center justify-between flex-wrap gap-2">
          <div className="flex gap-1">
            <Button size="sm" variant={period === 'month' ? 'default' : 'outline'} onClick={() => changePeriod('month')}>月度</Button>
            <Button size="sm" variant={period === 'half' ? 'default' : 'outline'} onClick={() => changePeriod('half')}>半年度</Button>
            <Button size="sm" variant={period === 'year' ? 'default' : 'outline'} onClick={() => changePeriod('year')}>年度</Button>
          </div>
          <div className="flex items-center gap-2">
            {period === 'month' ? (
              <Input type="month" className="h-8 w-40" value={month} onChange={(e) => setMonth(e.target.value || month)} />
            ) : period === 'half' ? (
              <div className="flex items-center gap-2">
                <Input className="h-8 w-20" value={year} onChange={(e) => setYear(e.target.value || year)} onBlur={() => changeHalf(half)} />
                <select
                  className="h-8 rounded-md border px-2 text-sm"
                  value={half}
                  onChange={(e) => changeHalf(e.target.value as 'h1' | 'h2')}
                >
                  <option value="h1">上半年</option>
                  <option value="h2">下半年</option>
                </select>
              </div>
            ) : (
              <div className="flex items-center gap-1">
                <Input className="h-8 w-24" value={year} onChange={(e) => setYear(e.target.value || year)} />
                <Button size="sm" variant="outline" onClick={() => loadCompare({ year })}>查询</Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {loading && <p className="text-sm text-muted-foreground text-center py-4">加载中…</p>}

      {/* ========== 月度视图 ========== */}
      {!loading && period === 'month' && (
        <>
          <KpiCards summary={summary} />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* 每日收支趋势 */}
            <Card>
              <CardHeader><CardTitle className="text-sm">每日收支趋势</CardTitle></CardHeader>
              <CardContent className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={trendChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip formatter={(v: any, n: any) => [fmt(v), n]} />
                    <Legend />
                    <Bar dataKey="income" name="收入" fill="#16a34a" />
                    <Bar dataKey="expense" name="支出" fill="#dc2626" />
                    <Line type="monotone" dataKey="profit" name="盈亏" stroke="#2563eb" strokeWidth={2} dot={false} />
                  </ComposedChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* 支出构成 */}
            <Card>
              <CardHeader><CardTitle className="text-sm">支出构成分析</CardTitle></CardHeader>
              <CardContent className="h-64">
                {expensePieData.length === 0 ? <p className="text-sm text-muted-foreground text-center pt-20">暂无支出数据</p> :
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={expensePieData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} label={(p: any) => `${p.name} ${((p.value / expensePieData.reduce((s, d) => s + d.value, 0)) * 100).toFixed(0)}%`}>
                        {expensePieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip formatter={(v: any) => fmt(v)} />
                    </PieChart>
                  </ResponsiveContainer>}
              </CardContent>
            </Card>

            {/* 食材分类占比 */}
            <Card>
              <CardHeader><CardTitle className="text-sm">食材采购分类占比</CardTitle></CardHeader>
              <CardContent className="h-64">
                {foodPieData.length === 0 ? <p className="text-sm text-muted-foreground text-center pt-20">暂无采购数据</p> :
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={foodPieData} dataKey="value" nameKey="name" outerRadius={80} label={(p: any) => `${p.name}`}>
                        {foodPieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip formatter={(v: any) => fmt(v)} />
                    </PieChart>
                  </ResponsiveContainer>}
              </CardContent>
            </Card>

            {/* Top10 食材（按采购金额） */}
            <Card>
              <CardHeader><CardTitle className="text-sm">采购金额 Top 10 食材</CardTitle></CardHeader>
              <CardContent className="h-64">
                {topSupplies.length === 0 ? <p className="text-sm text-muted-foreground text-center pt-20">暂无采购数据</p> :
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={topSupplies} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" tick={{ fontSize: 10 }} />
                      <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 11 }} />
                      <Tooltip formatter={(v: any) => fmt(v)} />
                      <Bar dataKey="amount" name="采购金额" fill="#2563eb" radius={[0, 3, 3, 0]} />
                    </BarChart>
                  </ResponsiveContainer>}
              </CardContent>
            </Card>
          </div>

          {/* 优化建议已移除 */}

          {/* 每日盈亏明细表 */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-sm">每日盈亏明细</CardTitle>
              <Button size="sm" variant="outline" onClick={printDetail}><Printer className="mr-1 h-4 w-4" />打印</Button>
            </CardHeader>
            <CardContent className="p-0">
              <Table className="max-h-[40vh]">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12 text-center">序号</TableHead><TableHead className="w-28 text-center">日期</TableHead>
                    <TableHead className="w-28 text-center">消费收入</TableHead><TableHead className="w-28 text-center">早餐收入</TableHead>
                    <TableHead className="w-28 text-center">资源费收入</TableHead><TableHead className="w-28 text-center">总收入</TableHead>
                    <TableHead className="w-28 text-center">采购支出</TableHead><TableHead className="w-28 text-center">分摊支出</TableHead>
                    <TableHead className="w-28 text-center">盈亏</TableHead><TableHead className="w-20 text-center">人次</TableHead><TableHead className="w-28 text-center">人均成本</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dailyTable.length === 0 ? (
                    <TableRow><TableCell colSpan={11} className="h-16 text-center text-muted-foreground">本月无记录</TableCell></TableRow>
                  ) : dailyTable.map((r) => (
                    <TableRow key={r.序号}>
                      <TableCell className="text-center text-muted-foreground">{r.序号}</TableCell>
                      <TableCell className="text-center">{r.日期}</TableCell>
                      <TableCell className="text-green-600 text-center">{fmt(r.消费收入)}</TableCell>
                      <TableCell className="text-green-600 text-center">{r.早餐收入 ? fmt(r.早餐收入) : '-'}</TableCell>
                      <TableCell className="text-green-600 text-center">{r.资源费收入 ? fmt(r.资源费收入) : '-'}</TableCell>
                      <TableCell className="text-green-700 font-medium text-center">{fmt(r.收入)}</TableCell>
                      <TableCell className="text-center">{r.采购支出 ? fmt(r.采购支出) : '-'}</TableCell>
                      <TableCell className="text-amber-600 text-center">{r.分摊支出 ? fmt(r.分摊支出) : '-'}</TableCell>
                      <TableCell className={`font-medium text-center ${r.盈亏 >= 0 ? 'text-blue-600' : 'text-red-600'}`}>{fmt(r.盈亏)}</TableCell>
                      <TableCell className="text-center">{r.人次 || '-'}</TableCell>
                      <TableCell className="text-center">{r.人均成本}</TableCell>
                    </TableRow>
                  ))}
                  {dailySummary && (
                    <TableRow className="bg-blue-50/70 font-semibold">
                      <TableCell className="text-center text-blue-900">合计</TableCell>
                      <TableCell className="text-center text-blue-900">{dailyTable.length} 天</TableCell>
                      <TableCell className="text-green-700 text-center">{fmt(dailySummary.消费收入)}</TableCell>
                      <TableCell className="text-green-700 text-center">{fmt(dailySummary.早餐收入)}</TableCell>
                      <TableCell className="text-green-700 text-center">{fmt(dailySummary.资源费收入)}</TableCell>
                      <TableCell className="text-green-800 text-center">{fmt(dailySummary.收入)}</TableCell>
                      <TableCell className="text-center text-blue-900">{fmt(dailySummary.采购支出)}</TableCell>
                      <TableCell className="text-amber-700 text-center">{fmt(dailySummary.分摊支出)}</TableCell>
                      <TableCell className={`font-semibold text-center ${dailySummary.盈亏 >= 0 ? 'text-blue-700' : 'text-red-700'}`}>{fmt(dailySummary.盈亏)}</TableCell>
                      <TableCell className="text-center text-blue-900">{dailySummary.人次}</TableCell>
                      <TableCell className="text-center text-blue-900">人均 {dailySummary.人均成本}</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
            {/* 计算口径公式（突出显示） */}
            <CardContent className="p-4 pt-2">
              <div className="rounded-md bg-blue-50 border border-blue-200 px-4 py-3 text-sm leading-7 text-blue-900">
                <p className="font-semibold mb-1">📐 计算口径</p>
                <p>收入 = 消费收入 + 资源占用费收入 + 早餐收入</p>
                <p>支出 = 采购支出 + 分摊支出</p>
                <p>人均成本 = (采购支出 + 分摊支出 − 早餐收入 − 资源占用费收入) ÷ 当日消费总人次</p>
                <p className="text-blue-600/80 mt-1">整月人均成本 = 每日人均成本之和 ÷ 天数（表格底部「合计」行）</p>
              </div>
            </CardContent>
          </Card>

          {/* 月度费用汇总（肉类/蔬菜/干杂/充值/消费/退费/盈亏/人均；月度视图按天、跨月按月） */}
          {(period === 'month' ? (costSummary?.daily?.length || 0) > 0 : costItems.length > 0) && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-sm">{period === 'month' ? `月度费用汇总（${month} 按日）` : '月度费用汇总（按月）'}</CardTitle>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={printCostSummary}><Printer className="mr-1 h-4 w-4" />打印</Button>
                  <Button size="sm" variant="outline" onClick={exportCostSummary}><Download className="mr-1 h-4 w-4" />导出</Button>
                </div>
              </CardHeader>
              <CardContent className="p-0 overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12 text-center">序号</TableHead>
                      <TableHead className="text-center">{period === 'month' ? '日期' : '月份'}</TableHead>
                      <TableHead className="text-center">肉类</TableHead><TableHead className="text-center">蔬菜</TableHead><TableHead className="text-center">干杂</TableHead>
                      <TableHead className="text-center">充值</TableHead><TableHead className="text-center">消费</TableHead>
                      <TableHead className="text-center">退费</TableHead><TableHead className="text-center">盈亏</TableHead>
                      {period !== 'month' && <TableHead className="text-center">人均</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(period === 'month' ? costSummary?.daily || [] : costItems).map((c: any, i: number) => (
                      <TableRow key={c.date || c.month}>
                        <TableCell className="text-center text-muted-foreground">{i + 1}</TableCell>
                        <TableCell className="text-center">{period === 'month' ? (c.date || '').slice(5) : c.month}</TableCell>
                        <TableCell className="text-center">{fmt(c.meat)}</TableCell>
                        <TableCell className="text-center">{fmt(c.vegetable)}</TableCell>
                        <TableCell className="text-center">{fmt(c.dry)}</TableCell>
                        <TableCell className="text-center text-green-600">{fmt(c.recharge)}</TableCell>
                        <TableCell className="text-center text-green-600">{fmt(c.consume)}</TableCell>
                        <TableCell className="text-center text-red-600">{fmt(c.refund)}</TableCell>
                        <TableCell className={`font-medium text-center ${c.profit >= 0 ? 'text-blue-600' : 'text-red-600'}`}>{fmt(c.profit)}</TableCell>
                        {period !== 'month' && <TableCell className="text-center">{Number(c.perCapita || 0).toFixed(2)}</TableCell>}
                      </TableRow>
                    ))}
                    {(() => {
                      const arr = period === 'month' ? (costSummary?.daily || []) : costItems;
                      if (!arr.length) return null;
                      const s = (k: string) => arr.reduce((acc: number, c: any) => acc + (Number(c[k]) || 0), 0);
                      const caps = arr.map((c: any) => Number(c.perCapita)).filter((v: number) => v > 0);
                      return (
                        <TableRow className="bg-blue-50/70 font-semibold">
                          <TableCell className="text-center text-blue-900" colSpan={2}>合计</TableCell>
                          <TableCell className="text-center text-blue-900">{fmt(s('meat'))}</TableCell>
                          <TableCell className="text-center text-blue-900">{fmt(s('vegetable'))}</TableCell>
                          <TableCell className="text-center text-blue-900">{fmt(s('dry'))}</TableCell>
                          <TableCell className="text-center text-green-700">{fmt(s('recharge'))}</TableCell>
                          <TableCell className="text-center text-green-700">{fmt(s('consume'))}</TableCell>
                          <TableCell className="text-center text-red-700">{fmt(s('refund'))}</TableCell>
                          <TableCell className={`font-semibold text-center ${s('profit') >= 0 ? 'text-blue-700' : 'text-red-700'}`}>{fmt(s('profit'))}</TableCell>
                          {period !== 'month' && <TableCell className="text-center text-blue-900">{caps.length ? (caps.reduce((a: number, b: number) => a + b, 0) / caps.length).toFixed(2) : '-'}</TableCell>}
                        </TableRow>
                      );
                    })()}
                  </TableBody>
                </Table>
              </CardContent>
              <CardContent className="p-4 pt-2">
                <div className="rounded-md bg-slate-50 px-4 py-3 text-xs leading-6 text-slate-600">
                  <p>月度视图按日展示当月 1 日至月末每一天的分类数据；跨月视图（半年度/年度）按月份汇总。肉类/蔬菜/干杂 = 当日食材采购按分类汇总；充值 = 饭卡充值总额；消费 = 午餐+晚餐刷卡金额；退费 = 饭卡退费总额；盈亏 = 收入（餐费+资源占用费）− 支出（食材采购+其他费用分摊+退费）；人均 = 每日人均成本平均（与每日盈亏明细口径一致）</p>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* ========== 半年度/年度视图 ========== */}
      {!loading && period !== 'month' && (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* 月度收支对比 */}
            <Card>
              <CardHeader><CardTitle className="text-sm">月度收支对比</CardTitle></CardHeader>
              <CardContent className="h-72">
                {compareData.length === 0 ? <p className="text-sm text-muted-foreground text-center pt-24">所选范围暂无数据</p> :
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={compareData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip formatter={(v: any, n: any) => [fmt(v), n]} />
                      <Legend />
                      <Bar dataKey="totalIncome" name="收入" fill="#16a34a" />
                      <Bar dataKey="expense" name="支出" fill="#dc2626" />
                      <Line type="monotone" dataKey="profit" name="盈亏" stroke="#2563eb" strokeWidth={2} />
                    </ComposedChart>
                  </ResponsiveContainer>}
              </CardContent>
            </Card>

            {/* 各月就餐人数 */}
            <Card>
              <CardHeader><CardTitle className="text-sm">各月就餐总人次与人均消费</CardTitle></CardHeader>
              <CardContent className="h-72">
                {compareData.length === 0 ? <p className="text-sm text-muted-foreground text-center pt-24">暂无数据</p> :
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={compareData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                      <YAxis yAxisId="l" tick={{ fontSize: 10 }} />
                      <YAxis yAxisId="r" orientation="right" tick={{ fontSize: 10 }} />
                      <Tooltip />
                      <Legend />
                      <Bar yAxisId="l" dataKey="count" name="人次" fill="#f59e0b" />
                      <Line yAxisId="r" type="monotone" dataKey="perCapita" name="人均" stroke="#2563eb" strokeWidth={2} />
                    </ComposedChart>
                  </ResponsiveContainer>}
              </CardContent>
            </Card>

            {/* 各月采购金额 */}
            <Card>
              <CardHeader><CardTitle className="text-sm">各月采购金额对比</CardTitle></CardHeader>
              <CardContent className="h-72">
                {compareData.length === 0 ? <p className="text-sm text-muted-foreground text-center pt-24">暂无数据</p> :
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={compareData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip formatter={(v: any) => fmt(v)} />
                      <Legend />
                      <Bar dataKey="food" name="食材采购" fill="#2563eb" />
                      <Bar dataKey="other" name="其他费用" fill="#dc2626" />
                    </BarChart>
                  </ResponsiveContainer>}
              </CardContent>
            </Card>

            {/* 月度明细表 */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-sm">月度对比明细</CardTitle>
                <Button size="sm" variant="outline" onClick={printCompare}><Printer className="mr-1 h-4 w-4" />打印</Button>
              </CardHeader>
              <CardContent className="p-0">
                <Table className="max-h-[40vh]">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-20 text-center">月份</TableHead><TableHead className="w-24 text-center">收入</TableHead>
                      <TableHead className="w-24 text-center">食材</TableHead><TableHead className="w-24 text-center">其他</TableHead>
                      <TableHead className="w-24 text-center">盈亏</TableHead><TableHead className="w-20 text-center">人次</TableHead><TableHead className="w-20 text-center">人均</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {compareData.length === 0 ? (
                      <TableRow><TableCell colSpan={7} className="h-16 text-center text-muted-foreground">暂无数据</TableCell></TableRow>
                    ) : compareData.map((c) => (
                      <TableRow key={c.month}>
                        <TableCell className="text-center">{c.month}</TableCell>
                        <TableCell className="text-green-600 text-center">{fmt(c.totalIncome)}</TableCell>
                        <TableCell className="text-center">{fmt(c.food)}</TableCell>
                        <TableCell className="text-center">{fmt(c.other)}</TableCell>
                        <TableCell className={`font-medium text-center ${c.profit >= 0 ? 'text-blue-600' : 'text-red-600'}`}>{fmt(c.profit)}</TableCell>
                        <TableCell className="text-center">{c.count || '-'}</TableCell>
                        <TableCell className="text-center">{c.perCapita || '-'}</TableCell>
                      </TableRow>
                    ))}
                    {compareData.length > 0 && (() => {
                      const s = (k: string) => compareData.reduce((acc: number, c: any) => acc + (Number(c[k]) || 0), 0);
                      const income = s('totalIncome'), food = s('food'), other = s('other'), profit = s('profit'), count = s('count');
                      const caps = compareData.map((c: any) => Number(c.perCapita)).filter((v: number) => v > 0);
                      const perCapita = caps.length ? (caps.reduce((a: number, b: number) => a + b, 0) / caps.length).toFixed(2) : '-';
                      return (
                        <TableRow className="bg-blue-50/70 font-semibold">
                          <TableCell className="text-center text-blue-900">合计</TableCell>
                          <TableCell className="text-green-700 text-center">{fmt(income)}</TableCell>
                          <TableCell className="text-center text-blue-900">{fmt(food)}</TableCell>
                          <TableCell className="text-center text-blue-900">{fmt(other)}</TableCell>
                          <TableCell className={`font-semibold text-center ${profit >= 0 ? 'text-blue-700' : 'text-red-700'}`}>{fmt(profit)}</TableCell>
                          <TableCell className="text-center text-blue-900">{count}</TableCell>
                          <TableCell className="text-center text-blue-900">{perCapita}</TableCell>
                        </TableRow>
                      );
                    })()}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
