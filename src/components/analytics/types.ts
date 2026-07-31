// =============================================
// 分析页面专用类型定义
// =============================================

export interface TrendPoint {
  period: string;
  amount: number;
  quantity: number;
  count: number;
}

export interface CategoryStats {
  category: string;
  amount: number;
  quantity: number;
  percentage: number;
  trend: 'up' | 'down' | 'stable';
  changePercent: number;
}

export interface TopSupplyItem {
  id: number;
  name: string;
  spec: string;
  category: string;
  totalQuantity: number;
  totalAmount: number;
  avgPrice: number;
  lastPrice: number;
  prevPrice: number;
  priceChangePercent: number;
  lastPurchaseDate: string;
  monthlyHistory: { month: string; quantity: number; amount: number }[];
}

export interface PriceAnomaly {
  supplyId: number;
  supplyName: string;
  spec: string;
  category: string;
  lastUnitPrice: number;
  prevUnitPrice: number;
  changePercent: number;
  lastPurchaseDate: string;
  prevPurchaseDate: string;
}

export interface OptimizationSuggestion {
  id: string;
  type: 'warning' | 'optimize' | 'info' | 'success';
  title: string;
  description: string;
  action: string;
  impact?: string;
}

export interface KpiData {
  totalAmount: number;
  totalPurchases: number;
  avgOrderAmount: number;
  yoyChange: number;
  totalAmountTrend: number[];
  totalPurchasesTrend: number[];
  avgOrderTrend: number[];
}

export interface AnalyticsDashboardData {
  kpi: KpiData;
  categoryStats: CategoryStats[];
  monthlyTrend: TrendPoint[];
  topSupplies: TopSupplyItem[];
  priceAnomalies: PriceAnomaly[];
  suggestions: OptimizationSuggestion[];
  filterSummary: {
    currentTotal: number;
    prevTotal: number;
    changePercent: number;
  };
}

export interface FilterParams {
  type: 'monthly' | 'half-yearly' | 'yearly';
  date: string;
  categories: string[];
}

export const ALL_CATEGORIES = ['办公文具', '劳保用品', '清洁用品', '耗材', '其他'] as const;
