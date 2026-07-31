import { create } from 'zustand';
import type { Supply, Purchase, PurchaseItem } from '@/types';
import { purchasesApi, suppliesApi } from '@/lib/api';
import { todayStr } from '@/lib/utils';

interface AppState {
  supplies: Supply[];
  suppliesLoading: boolean;
  loadSupplies: (keyword?: string, categoryId?: string) => Promise<void>;

  purchases: Purchase[];
  lastPurchase: Purchase | null;
  loadPurchases: () => Promise<void>;
  loadLastPurchase: () => Promise<void>;

  entryItems: PurchaseItem[];
  entryDate: string;
  lastSavedPurchaseId: number | null;
  setEntryDate: (date: string) => void;
  addEntryItem: (item: PurchaseItem) => void;
  updateEntryQty: (index: number, qty: number) => void;
  removeEntryItem: (index: number) => void;
  clearEntry: () => void;
  savePurchase: () => Promise<Purchase>;
  loadDraft: () => void;
  saveDraft: () => void;
  copyLastPurchaseItems: () => Promise<void>;
}

export const useStore = create<AppState>((set, get) => ({
  supplies: [],
  suppliesLoading: false,

  loadSupplies: async (keyword?: string, categoryId?: string) => {
    set({ suppliesLoading: true });
    try {
      const r = await suppliesApi.list({ keyword, category_id: categoryId === 'all' ? undefined : categoryId, limit: 100 });
      set({ supplies: r.items, suppliesLoading: false });
    } catch {
      set({ suppliesLoading: false });
    }
  },

  purchases: [],
  lastPurchase: null,

  loadPurchases: async () => {
    try { const r = await purchasesApi.list({ limit: 50 }); set({ purchases: r.items }); }
    catch { /* ignore */ }
  },

  loadLastPurchase: async () => {
    try {
      const r = await purchasesApi.list({ page: 1, limit: 1 });
      if (r.items.length > 0) {
        const detail = await purchasesApi.get(r.items[0].id);
        set({ lastPurchase: detail as unknown as Purchase });
      }
    } catch { /* ignore */ }
  },

  entryItems: [],
  entryDate: todayStr(),
  lastSavedPurchaseId: null,

  setEntryDate: (date: string) => { set({ entryDate: date }); get().saveDraft(); },

  addEntryItem: (item: PurchaseItem) => {
    set({ entryItems: [...get().entryItems, item] });
    get().saveDraft();
  },

  updateEntryQty: (index: number, qty: number) => {
    const items = [...get().entryItems];
    if (index >= 0 && index < items.length) {
      items[index] = { ...items[index], quantity: qty, subtotal: qty * items[index].unit_price };
      set({ entryItems: items });
      get().saveDraft();
    }
  },

  removeEntryItem: (index: number) => {
    set({ entryItems: get().entryItems.filter((_, i) => i !== index) });
    get().saveDraft();
  },

  clearEntry: () => {
    set({ entryItems: [], entryDate: todayStr() });
    localStorage.removeItem('entry-draft');
  },

  savePurchase: async () => {
    const { entryItems, entryDate } = get();
    const r = await purchasesApi.create({
      purchase_date: entryDate,
      items: entryItems.map(i => ({ supply_id: i.supply_id, quantity: i.quantity, unit_price: i.unit_price })),
    });
    set({ lastSavedPurchaseId: r.id });
    get().clearEntry();
    return { id: r.id, order_no: r.order_no, purchase_date: entryDate, total_amount: 0, status: 'confirmed', remark: '', created_at: '', updated_at: '' } as Purchase;
  },

  loadDraft: () => {
    try {
      const raw = localStorage.getItem('entry-draft');
      if (raw) { const d = JSON.parse(raw); set({ entryItems: d.items || [], entryDate: d.date || todayStr() }); }
    } catch { /* ignore */ }
  },

  saveDraft: () => {
    try { localStorage.setItem('entry-draft', JSON.stringify({ items: get().entryItems, date: get().entryDate })); }
    catch { /* ignore */ }
  },

  copyLastPurchaseItems: async () => {
    try {
      const r = await purchasesApi.list({ page: 1, limit: 1 });
      if (r.items.length > 0) {
        const detail = await purchasesApi.get(r.items[0].id);
        set({ entryItems: detail.items.map(i => ({ ...i, quantity: 1, subtotal: i.unit_price })) });
      }
    } catch { /* ignore */ }
  },
}));
