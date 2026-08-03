// =============================================
// 统一 API 客户端 — 调用 Cloudflare Worker 后端
// =============================================
import type { Category, Supplier, Supply, Purchase, PurchaseItem, PurchaseDetail, PaymentRequest, PaginatedResult } from '@/types';

const API = '';

async function req<T>(path: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(API + path, {
    headers: { 'Content-Type': 'application/json', ...opts?.headers },
    ...opts,
  });
  const data = await res.json();
  if (!data.ok) throw new Error(data.error || `请求失败 ${res.status}`);
  return data as T;
}

function qs(params: Record<string, any>): string {
  const s = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== '') s.set(k, String(v)); });
  const q = s.toString();
  return q ? '?' + q : '';
}

// ========== 分类 ==========
export const categoriesApi = {
  list: () => req<{ ok: boolean; items: Category[] }>('/api/categories'),
  create: (data: Partial<Category>) => req<ApiResponse>('/api/categories', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: number, data: Partial<Category>) => req<ApiResponse>('/api/categories/' + id, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: number) => req<ApiResponse>('/api/categories/' + id, { method: 'DELETE' }),
};

// ========== 供应商 ==========
export const suppliersApi = {
  list: () => req<{ ok: boolean; items: Supplier[] }>('/api/suppliers'),
  create: (data: Partial<Supplier>) => req<ApiResponse>('/api/suppliers', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: number, data: Partial<Supplier>) => req<ApiResponse>('/api/suppliers/' + id, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: number) => req<ApiResponse>('/api/suppliers/' + id, { method: 'DELETE' }),
};

// ========== 用品 ==========
export const suppliesApi = {
  list: (params?: { keyword?: string; category_id?: string; status?: string; page?: number; limit?: number }) =>
    req<PaginatedResult<Supply>>('/api/supplies' + qs(params || {})),
  get: (id: number) => req<ApiResponse>('/api/supplies/' + id),
  create: (data: Partial<Supply>) => req<ApiResponse>('/api/supplies', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: number, data: Partial<Supply>) => req<ApiResponse>('/api/supplies/' + id, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: number) => req<ApiResponse>('/api/supplies/' + id, { method: 'DELETE' }),
  importCsv: (csv: string) => fetch(API + '/api/supplies/import', { method: 'POST', body: csv }).then(r => r.json()),
  exportCsv: () => fetch(API + '/api/supplies/export').then(r => r.blob()),
  listUnits: () => req<{ ok: boolean; units: string[] }>('/api/supplies/units'),
};

// ========== 采购单 ==========
export const purchasesApi = {
  list: (params?: { page?: number; limit?: number; date_from?: string; date_to?: string; keyword?: string }) =>
    req<PaginatedResult<Purchase>>('/api/purchases' + qs(params || {})),
  get: (id: number) => req<PurchaseDetail>('/api/purchases/' + id),
  create: (data: { purchase_date: string; items: { supply_id: number; quantity: number; unit_price: number; date?: string }[]; status?: string; remark?: string; supplier_id?: number | null }) =>
    req<ApiResponse>('/api/purchases', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: number, data: { purchase_date?: string; items: { supply_id: number; quantity: number; unit_price: number; date?: string }[]; status?: string; remark?: string; supplier_id?: number | null }) =>
    req<ApiResponse>('/api/purchases/' + id, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: number) => req<ApiResponse>('/api/purchases/' + id, { method: 'DELETE' }),
  copy: (id: number) => req<ApiResponse>('/api/purchases/' + id + '/copy', { method: 'POST' }),
  unpaid: () => req<{ ok: boolean; items: any[] }>('/api/purchases/unpaid'),
  searchBySupply: (name: string) => req<{ ok: boolean; items: any[] }>('/api/purchases/search-by-supply?name=' + encodeURIComponent(name)),
  pdf: (id: number) => fetch(API + '/api/purchases/' + id + '/pdf'),
  excel: (id: number) => fetch(API + '/api/purchases/' + id + '/excel'),
  exportCsv: (params?: { date_from?: string; date_to?: string; keyword?: string }) =>
    fetch(API + '/api/purchases/export' + qs(params || {})).then(r => r.blob()),
};

// ========== 系统备份/恢复 ==========
export const systemApi = {
  reset: (options?: { categories?: boolean; suppliers?: boolean; supplies?: boolean; purchases?: boolean }) =>
    req<ApiResponse>('/api/system/reset', { method: 'POST', body: JSON.stringify(options || {}) }),
  listBackups: () => req<{ ok: boolean; items: any[] }>('/api/system/backups'),
  createBackup: (description?: string) =>
    req<ApiResponse>('/api/system/backups', { method: 'POST', body: JSON.stringify({ description }) }),
  restoreBackup: (id: number) =>
    req<ApiResponse>('/api/system/backups/' + id + '/restore', { method: 'POST' }),
  deleteBackup: (id: number) =>
    req<ApiResponse>('/api/system/backups/' + id, { method: 'DELETE' }),
};

// ========== 分析 ==========
export const analyticsApi = {
  summary: (params?: any) => req<ApiResponse>('/api/analytics/summary' + qs(params || {})),
  categoryTrend: (params?: any) => req<ApiResponse>('/api/analytics/category-trend' + qs(params || {})),
  frequency: (params?: any) => req<ApiResponse>('/api/analytics/frequency' + qs(params || {})),
  topItems: (params?: any) => req<ApiResponse>('/api/analytics/top-items' + qs(params || {})),
  priceAnomaly: (params?: any) => req<ApiResponse>('/api/analytics/price-anomaly' + qs(params || {})),
  suggestions: (params?: any) => req<ApiResponse>('/api/analytics/suggestions' + qs(params || {})),
  trend: (params?: any) => req<ApiResponse>('/api/analytics/trend' + qs(params || {})),
  reportPdf: (data: any) => fetch(API + '/api/analytics/report-pdf', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }).then(r => r.blob()),
};

type ApiResponse = { ok: boolean; error?: string; [key: string]: any };

// ========== 请款单 ==========
export const paymentRequestsApi = {
  list: (params?: { page?: number; limit?: number; keyword?: string; status?: string; date_from?: string; date_to?: string }) =>
    req<PaginatedResult<PaymentRequest>>('/api/payment-requests' + qs(params || {})),
  get: (id: number) => req<PaymentRequest>('/api/payment-requests/' + id),
  create: (data: Partial<PaymentRequest>) => req<ApiResponse>('/api/payment-requests', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: number, data: Partial<PaymentRequest>) => req<ApiResponse>('/api/payment-requests/' + id, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: number) => req<ApiResponse>('/api/payment-requests/' + id, { method: 'DELETE' }),
};

// =============================================
// 食堂管理模块 API
// =============================================
const C = '/api/canteen';

export const canteenApi = {
  // 食材分类
  categories: {
    list: () => req<{ ok: boolean; items: any[] }>(C + '/categories'),
    create: (data: any) => req<ApiResponse>(C + '/categories', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: number, data: any) => req<ApiResponse>(C + '/categories/' + id, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: number) => req<ApiResponse>(C + '/categories/' + id, { method: 'DELETE' }),
  },
  // 食材字典
  supplies: {
    list: (params?: any) => req<PaginatedResult<any>>(C + '/supplies' + qs(params || {})),
    all: () => req<{ ok: boolean; items: any[] }>(C + '/supplies/all'),
    create: (data: any) => req<ApiResponse>(C + '/supplies', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: number, data: any) => req<ApiResponse>(C + '/supplies/' + id, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: number) => req<ApiResponse>(C + '/supplies/' + id, { method: 'DELETE' }),
  },
  // 费用科目
  expenseCategories: {
    list: () => req<{ ok: boolean; items: any[] }>(C + '/expense-categories'),
    create: (data: any) => req<ApiResponse>(C + '/expense-categories', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: number, data: any) => req<ApiResponse>(C + '/expense-categories/' + id, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: number) => req<ApiResponse>(C + '/expense-categories/' + id, { method: 'DELETE' }),
  },
  // 采购单
  purchases: {
    list: (params?: any) => req<PaginatedResult<any>>(C + '/purchases' + qs(params || {})),
    get: (id: number) => req<ApiResponse>(C + '/purchases/' + id),
    create: (data: any) => req<ApiResponse>(C + '/purchases', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: number, data: any) => req<ApiResponse>(C + '/purchases/' + id, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: number) => req<ApiResponse>(C + '/purchases/' + id, { method: 'DELETE' }),
    exportCsv: (params?: { date_from?: string; date_to?: string }) =>
      fetch(C + '/purchases/export/csv' + qs(params || {})).then((r) => r.blob()),
  },
  // 其他费用
  expenses: {
    list: (params?: any) => req<PaginatedResult<any>>(C + '/expenses' + qs(params || {})),
    create: (data: any) => req<ApiResponse>(C + '/expenses', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: number, data: any) => req<ApiResponse>(C + '/expenses/' + id, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: number) => req<ApiResponse>(C + '/expenses/' + id, { method: 'DELETE' }),
  },
  // 每日收入
  income: {
    list: (params?: any) => req<PaginatedResult<any>>(C + '/income' + qs(params || {})),
    get: (id: number) => req<ApiResponse>(C + '/income/' + id),
    save: (data: any) => req<ApiResponse>(C + '/income', { method: 'POST', body: JSON.stringify(data) }),
    delete: (id: number) => req<ApiResponse>(C + '/income/' + id, { method: 'DELETE' }),
  },
  // 资源占用费
  resourceFees: {
    list: (params?: any) => req<PaginatedResult<any>>(C + '/resource-fees' + qs(params || {})),
    create: (data: any) => req<ApiResponse>(C + '/resource-fees', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: number, data: any) => req<ApiResponse>(C + '/resource-fees/' + id, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: number) => req<ApiResponse>(C + '/resource-fees/' + id, { method: 'DELETE' }),
    summary: (month: string) => req<ApiResponse>(C + '/resource-fees/summary/' + month),
  },
  // 每周菜单
  menus: {
    get: (week: string) => req<ApiResponse>(C + '/menus?week=' + encodeURIComponent(week)),
    save: (data: any) => req<ApiResponse>(C + '/menus', { method: 'POST', body: JSON.stringify(data) }),
    copy: (from: string, to: string) => req<ApiResponse>(C + '/menus/copy', { method: 'POST', body: JSON.stringify({ from, to }) }),
  },
  // 菜单模板
  menuTemplates: {
    list: () => req<{ ok: boolean; items: any[] }>(C + '/menu-templates'),
    create: (data: any) => req<ApiResponse>(C + '/menu-templates', { method: 'POST', body: JSON.stringify(data) }),
    delete: (id: number) => req<ApiResponse>(C + '/menu-templates/' + id, { method: 'DELETE' }),
  },
  // 数据分析
  analytics: {
    summary: (month?: string) => req<ApiResponse>(C + '/analytics/summary' + qs({ month })),
    dailyTrend: (month?: string) => req<ApiResponse>(C + '/analytics/daily-trend' + qs({ month })),
    expenseBreakdown: (month?: string) => req<ApiResponse>(C + '/analytics/expense-breakdown' + qs({ month })),
    foodShare: (month?: string) => req<ApiResponse>(C + '/analytics/food-share' + qs({ month })),
    topSupplies: (month?: string, limit?: number) => req<ApiResponse>(C + '/analytics/top-supplies' + qs({ month, limit })),
    monthlyCompare: (params?: any) => req<ApiResponse>(C + '/analytics/monthly-compare' + qs(params || {})),
    suggestions: (month?: string) => req<ApiResponse>(C + '/analytics/suggestions' + qs({ month })),
  },
  // 饭卡充值
  recharges: {
    list: (params?: any) => req<PaginatedResult<any>>(C + '/recharges' + qs(params || {})),
    summary: (month?: string) => req<ApiResponse>(C + '/recharges/summary' + qs({ month })),
    delete: (id: number) => req<ApiResponse>(C + '/recharges/' + id, { method: 'DELETE' }),
    importCsv: (file: File, mode: string, mapping: Record<string, string>) => {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('mode', mode);
      fd.append('mapping', JSON.stringify(mapping));
      return fetch(C + '/recharges/import', { method: 'POST', body: fd }).then((r) => r.json());
    },
  },
};
