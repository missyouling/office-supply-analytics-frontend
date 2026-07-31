import { useState, useEffect, useCallback, useRef } from 'react';
import type { FilterParams, AnalyticsDashboardData, TrendPoint, CategoryStats, TopSupplyItem, PriceAnomaly, OptimizationSuggestion } from './types';
import GlobalFilterBar from './GlobalFilterBar';
import KpiCards from './KpiCards';
import CategoryTrendChart from './CategoryTrendChart';
import PurchaseEfficiencyChart from './PurchaseEfficiencyChart';
import CostPieChart from './CostPieChart';
import TopConsumptionChart from './TopConsumptionChart';
import PriceAnomalyTable from './PriceAnomalyTable';
import OptimizationPanel from './OptimizationPanel';
import ExportToolbar from './ExportToolbar';
import { analyticsApi } from '@/lib/api';

export default function AnalyticsPage() {
  const now = new Date();
  const [filters, setFilters] = useState<FilterParams>({
    type: 'monthly',
    date: now.toISOString().substring(0, 7),
    categories: ['all'],
  });
  const [data, setData] = useState<AnalyticsDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const dashboardRef = useRef<HTMLDivElement>(null);

  const loadData = useCallback(async (f: FilterParams) => {
    setLoading(true);
    const result = await fetchDashboardData(f);
    setData(result);
    setLoading(false);
  }, []);

  useEffect(() => { loadData(filters); }, []);

  const handleFilterChange = (f: FilterParams) => {
    setFilters(f);
    loadData(f);
  };

  const handlePrint = () => {
    window.print();
  };

  const hasData = !!data && data.monthlyTrend.length > 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-xl font-semibold">📊 数据分析看板</h2>
        <ExportToolbar onPrint={handlePrint} />
      </div>

      <GlobalFilterBar
        filters={filters}
        onChange={handleFilterChange}
        currentTotal={data?.filterSummary.currentTotal ?? 0}
        prevTotal={data?.filterSummary.prevTotal ?? 0}
        changePercent={data?.filterSummary.changePercent ?? 0}
      />

      {loading && (
        <div className="space-y-4 animate-pulse">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[1, 2, 3, 4].map(i => <div key={i} className="h-24 bg-slate-200 rounded-xl" />)}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-72 bg-slate-200 rounded-xl" />)}
          </div>
          <div className="h-64 bg-slate-200 rounded-xl" />
        </div>
      )}

      {!loading && (
        <div ref={dashboardRef} className="space-y-4">
          <KpiCards kpi={data!.kpi} />
          {hasData ? (
            <>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <CategoryTrendChart monthlyTrend={data!.monthlyTrend} categoryStats={data!.categoryStats} />
                <PurchaseEfficiencyChart monthlyTrend={data!.monthlyTrend} />
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <CostPieChart categoryStats={data!.categoryStats} topSupplies={data!.topSupplies} />
                <TopConsumptionChart topSupplies={data!.topSupplies} />
              </div>
              <PriceAnomalyTable priceAnomalies={data!.priceAnomalies} />
              <OptimizationPanel suggestions={data!.suggestions} />
            </>
          ) : (
            <div className="text-center py-16 text-muted-foreground">
              <p className="text-lg mb-2">📭 暂无数据</p>
              <p>所选筛选条件下没有采购记录，请先录入采购单</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

async function fetchDashboardData(f: FilterParams): Promise<AnalyticsDashboardData | null> {
  const q = `type=${f.type}&date=${f.date}`;
  try {
    const [summary, catTrend, trendData, topData, anomalyData, sugData] = await Promise.all([
      analyticsApi.summary(f),
      analyticsApi.categoryTrend(f),
      analyticsApi.trend(f),
      analyticsApi.topItems(f),
      analyticsApi.priceAnomaly(f),
      analyticsApi.suggestions(f),
    ]);
    if (!summary.ok) return null;

    const s = summary;
    const catStats: CategoryStats[] = (catTrend.categoryStats || []).map((c: any, i: number) => {
      const amt = Number(c.amount) || 0;
      const qty = Number(c.quantity) || 0;
      const pct = s.totalAmount > 0 ? Math.round((amt / s.totalAmount) * 10000) / 100 : 0;
      return {
        category: c.category || '其他',
        amount: amt,
        quantity: qty,
        percentage: pct,
        trend: 'stable' as const,
        changePercent: 0,
      };
    });

    const monthlyTrend: TrendPoint[] = (trendData.trend || []).map((t: any) => ({
      period: t.period,
      amount: Number(t.amount) || 0,
      quantity: Number(t.quantity) || 0,
      count: Number(t.count) || 0,
    }));

    const totalAmountTrend = monthlyTrend.map(t => t.amount);
    const totalPurchasesTrend = monthlyTrend.map(t => t.count);
    const avgOrderTrend = monthlyTrend.map(t => t.count > 0 ? Math.round((t.amount / t.count) * 100) / 100 : 0);

    const topSupplies: TopSupplyItem[] = (topData.topSupplies || []).map((t: any) => ({
      id: t.id,
      name: t.name,
      spec: t.spec || '',
      category: t.category || '',
      totalQuantity: Number(t.total_qty) || 0,
      totalAmount: Number(t.total_amount) || 0,
      avgPrice: Number(t.avg_price) || 0,
      lastPrice: Number(t.avg_price) || 0,
      prevPrice: Number(t.avg_price) || 0,
      priceChangePercent: 0,
      lastPurchaseDate: '',
      monthlyHistory: [],
    }));

    const priceAnomalies: PriceAnomaly[] = (anomalyData.priceAnomalies || []).map((a: any) => ({
      supplyId: a.supplyId,
      supplyName: a.supplyName,
      spec: a.spec || '',
      category: a.category || '',
      lastUnitPrice: Number(a.lastUnitPrice) || 0,
      prevUnitPrice: Number(a.prevUnitPrice) || 0,
      changePercent: Number(a.changePercent) || 0,
      lastPurchaseDate: a.lastPurchaseDate || '',
      prevPurchaseDate: a.prevPurchaseDate || '',
    }));

    const suggestions: OptimizationSuggestion[] = (sugData.suggestions || []).map((s: any, i: number) => ({
      id: `sug-${i + 1}`,
      type: s.type || 'info',
      title: s.title || '',
      description: s.description || '',
      action: s.action || '',
      impact: s.impact,
    }));

    return {
      kpi: {
        totalAmount: Number(s.totalAmount) || 0,
        totalPurchases: Number(s.totalPurchases) || 0,
        avgOrderAmount: Number(s.avgOrderAmount) || 0,
        yoyChange: Number(s.yoyChange) || 0,
        totalAmountTrend,
        totalPurchasesTrend,
        avgOrderTrend,
      },
      categoryStats: catStats,
      monthlyTrend,
      topSupplies,
      priceAnomalies,
      suggestions,
      filterSummary: {
        currentTotal: Number(s.currentTotal) || 0,
        prevTotal: Number(s.prevTotal) || 0,
        changePercent: Number(s.changePercent) || 0,
      },
    };
  } catch (e) {
    console.error('Analytics fetch error:', e);
    return null;
  }
}