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
