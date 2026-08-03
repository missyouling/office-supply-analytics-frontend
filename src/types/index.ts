// =============================================
// 统一类型定义 — 匹配后端 v2.0 Schema
// =============================================

export interface Category {
  id: number;
  name: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface Supplier {
  id: number;
  name: string;
  contact: string;
  phone: string;
  bank_name: string;
  bank_account: string;
  is_default?: number | boolean;
  remark: string;
  created_at: string;
  updated_at: string;
}

export interface Supply {
  id: number;
  name: string;
  spec: string;
  unit: string;
  reference_price: number;
  unit_price?: number;
  category?: string;
  safety_stock: number;
  category_id: number | null;
  supplier_id: number | null;
  status: 'active' | 'inactive';
  remark: string;
  category_name?: string;
  supplier_name?: string;
  created_at: string;
  updated_at: string;
}

export interface Purchase {
  id: number;
  order_no: string;
  purchase_date: string;
  total_amount: number;
  status: 'draft' | 'confirmed' | 'completed';
  remark: string;
  supplier_id?: number | null;
  supplier_name?: string;
  item_count?: number;
  payment_status?: string;
  payment_date?: string;
  created_at: string;
  updated_at: string;
}

export interface PurchaseItem {
  id?: number;
  purchase_id?: number;
  supply_id: number;
  supply_name: string;
  supply_spec: string;
  unit: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
}

export interface PurchaseDetail extends Purchase {
  items: PurchaseItem[];
}

export interface PaginatedResult<T> {
  ok: boolean;
  items: T[];
  total: number;
  page: number;
  limit: number;
  total_sum?: number;
  min_date?: string;
  max_date?: string;
}

export const CATEGORIES = ['办公文具', '劳保用品', '清洁用品', '耗材', '其他'] as const;
export const UNITS = ['个', '包', '箱', '瓶', '双', '盒', '把', '卷', '条', '只', '套'] as const;

export const CATEGORY_COLORS: Record<string, string> = {
  '办公文具': '#2563eb',
  '劳保用品': '#16a34a',
  '清洁用品': '#f59e0b',
  '耗材': '#dc2626',
  '其他': '#8b5cf6',
};

export interface ApiResponse<T = any> {
  ok: boolean;
  error?: string;
  [key: string]: any;
}

export interface PaymentRequest {
  id: number;
  request_no: string;
  payment_unit: string;
  department: string;
  applicant: string;
  request_date: string;
  content: string;
  payee: string;
  payee_supplier_id: number | null;
  bank_name: string;
  bank_account: string;
  amount: number;
  amount_cn: string;
  payment_method: string;
  remark: string;
  company_head: string;
  finance_head: string;
  dept_head: string;
  handler: string;
  status: 'draft' | 'submitted';
  purchase_ids?: string;
  created_at: string;
  updated_at: string;
}
