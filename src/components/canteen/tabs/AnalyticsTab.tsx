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
import { TrendingUp, TrendingDown, Lightbulb, Download, CalendarRange } from 'lucide-react';

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
  const [compare, setCompare] = useState<any[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [range, setRange] = useState({ from: `${year}-01`, to: `${year}-12` });

  const loadMonth = useCallback(async (m: string) => {
    setLoading(true);
    try {
      const [s, t, b, f, top, sugg] = await Promise.all([
        canteenApi.analytics.summary(m),
        canteenApi.analytics.dailyTrend(m),
        canteenApi.analytics.expenseBreakdown(m),
        canteenApi.analytics.foodShare(m),
        canteenApi.analytics.topSupplies(m, 5),
        canteenApi.analytics.suggestions(m),
      ]);
      setSummary(s as unknown as Summary); setDailyTrend(t.items || []); setExpenseBreakdown(b);
      setFoodShare(f.items || []); setTopSupplies(top.items || []); setSuggestions(sugg.items || []);
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
      setRange({ from: `${year}-01`, to: `${year}-06` });
      loadCompare({ from: `${year}-01`, to: `${year}-06` });
    } else if (p === 'year') {
      loadCompare({ year });
    }
  };

  // 每日盈亏明细表（支出 = 当日采购 + 当月其他费用分摊）
  const dailyTable = dailyTrend.map((d, i) => {
    const share = d.share_expense || 0;
    const totalExpense = (d.expense || 0) + share;
    return {
      序号: i + 1, 日期: d.date, 收入: d.income || 0, 支出: totalExpense,
      采购: d.expense || 0, 分摊支出: share,
      盈亏: (d.income || 0) - totalExpense, 人次: d.count || 0,
      人均: d.count ? ((d.income || 0) / d.count).toFixed(2) : '-',
    };
  });

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
    perCapita: c.count ? ((c.income || 0) / c.count).toFixed(2) : 0,
  }));

  const exportDetail = () => {
    const rows = [['序号', '日期', '收入', '支出', '采购', '分摊支出', '盈亏', '人次', '人均']];
    dailyTable.forEach((r) => rows.push([r.序号, r.日期, r.收入, r.支出, r.采购, r.分摊支出, r.盈亏, r.人次, r.人均]));
    const csv = '\uFEFF' + rows.map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `食堂收支明细_${period === 'month' ? month : `${range.from}_${range.to}`}.csv`; a.click();
    URL.revokeObjectURL(url);
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
              <div className="flex items-center gap-1">
                <Input type="month" className="h-8 w-36" value={range.from} onChange={(e) => setRange({ ...range, from: e.target.value || range.from })} />
                <span className="text-xs text-muted-foreground">至</span>
                <Input type="month" className="h-8 w-36" value={range.to} onChange={(e) => setRange({ ...range, to: e.target.value || range.to })} />
                <Button size="sm" variant="outline" onClick={() => loadCompare({ from: range.from, to: range.to })}>查询</Button>
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

            {/* Top5 食材 */}
            <Card>
              <CardHeader><CardTitle className="text-sm">采购量 Top 5 食材</CardTitle></CardHeader>
              <CardContent className="h-64">
                {topSupplies.length === 0 ? <p className="text-sm text-muted-foreground text-center pt-20">暂无采购数据</p> :
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={topSupplies} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" tick={{ fontSize: 10 }} />
                      <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 11 }} />
                      <Tooltip formatter={(v: any, n: any) => [n === '数量' ? `${v} ${topSupplies[0]?.unit || ''}` : fmt(v), n]} />
                      <Legend />
                      <Bar dataKey="quantity" name="数量" fill="#2563eb" />
                      <Bar dataKey="amount" name="金额" fill="#f59e0b" />
                    </BarChart>
                  </ResponsiveContainer>}
              </CardContent>
            </Card>
          </div>

          {/* 优化建议 */}
          {suggestions.length > 0 && (
            <Card className="border-amber-200 bg-amber-50/40">
              <CardHeader><CardTitle className="text-sm flex items-center gap-1"><Lightbulb className="h-4 w-4 text-amber-500" />优化建议</CardTitle></CardHeader>
              <CardContent>
                <ul className="space-y-1.5">
                  {suggestions.map((s, i) => <li key={i} className="text-sm flex gap-2"><span className="text-amber-500">●</span>{s}</li>)}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* 每日盈亏明细表 */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-sm">每日盈亏明细</CardTitle>
              <Button size="sm" variant="outline" onClick={exportDetail}><Download className="mr-1 h-4 w-4" />导出</Button>
            </CardHeader>
            <CardContent className="p-0">
              <Table className="max-h-[40vh]">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12 text-center">序号</TableHead><TableHead className="w-28 text-center">日期</TableHead>
                    <TableHead className="w-28 text-center">收入</TableHead><TableHead className="w-28 text-center">支出</TableHead>
                    <TableHead className="w-24 text-center">采购</TableHead><TableHead className="w-28 text-center">分摊支出</TableHead>
                    <TableHead className="w-28 text-center">盈亏</TableHead><TableHead className="w-20 text-center">人次</TableHead><TableHead className="w-24 text-center">人均</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dailyTable.length === 0 ? (
                    <TableRow><TableCell colSpan={9} className="h-16 text-center text-muted-foreground">本月无记录</TableCell></TableRow>
                  ) : dailyTable.map((r) => (
                    <TableRow key={r.序号}>
                      <TableCell className="text-center text-muted-foreground">{r.序号}</TableCell>
                      <TableCell className="text-center">{r.日期}</TableCell>
                      <TableCell className="text-green-600 text-center">{fmt(r.收入)}</TableCell>
                      <TableCell className="text-red-600 text-center">{r.支出 ? fmt(r.支出) : '-'}</TableCell>
                      <TableCell className="text-center">{r.采购 ? fmt(r.采购) : '-'}</TableCell>
                      <TableCell className="text-amber-600 text-center">{r.分摊支出 ? fmt(r.分摊支出) : '-'}</TableCell>
                      <TableCell className={`font-medium text-center ${r.盈亏 >= 0 ? 'text-blue-600' : 'text-red-600'}`}>{fmt(r.盈亏)}</TableCell>
                      <TableCell className="text-center">{r.人次 || '-'}</TableCell>
                      <TableCell className="text-center">{r.人均}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
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
                <Button size="sm" variant="outline" onClick={exportDetail}><Download className="mr-1 h-4 w-4" />导出</Button>
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
