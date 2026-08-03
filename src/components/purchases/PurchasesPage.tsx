import { useState, useEffect, useRef, useCallback } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { showToast } from '@/components/ui/toaster';
import { purchasesApi, suppliesApi, suppliersApi } from '@/lib/api';
import type { Supply, Supplier } from '@/types';
import { Search, Plus, FileText, Trash2, Eye, Pencil, Save, X, RotateCcw, MoreHorizontal, Printer } from 'lucide-react';
import { formatCurrency, formatPurchaseDate, formatShortDate, todayStr } from '@/lib/utils';
import { Label } from '@/components/ui/label';

type PageMode = 'list';
type DialogType = 'new' | 'view' | 'edit' | null;

interface FormItem {
  supply_id: number;
  supply_name: string;
  supply_spec: string;
  unit: string;
  reference_price: number;
  date: string;
  quantity: number;
  unit_price: number;
  unit_price_str: string;
  subtotal: number;
}

export default function PurchasesPage() {
  // ========== List State ==========
  const [purchases, setPurchases] = useState<any[]>([]);
  const [filters, setFilters] = useState({ keyword: '', date_from: '', date_to: '' });

  // ========== Dialog State ==========
  const [dialogType, setDialogType] = useState<DialogType>(null);
  const [dialogPurchase, setDialogPurchase] = useState<any>(null);
  const [dialogItems, setDialogItems] = useState<any[]>([]);
  const [dialogSaving, setDialogSaving] = useState(false);

  // ========== New/Edit form state (shared for new + edit dialogs) ==========
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [supplies, setSupplies] = useState<Supply[]>([]);
  const [formDateFrom, setFormDateFrom] = useState(todayStr());
  const [formDateTo, setFormDateTo] = useState(todayStr());
  const [formItems, setFormItems] = useState<FormItem[]>([]);
  const [formSupplierId, setFormSupplierId] = useState<number | null>(null);
  const [formRemark, setFormRemark] = useState('');
  const [saving, setSaving] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);
  const itemsScrollRef = useRef<HTMLDivElement>(null);

  // ========== Confirm dialog ==========
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmMsg, setConfirmMsg] = useState('');
  const [confirmAction, setConfirmAction] = useState<() => void>(() => {});

  // ========== Load List (infinite scroll) ==========
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [totalSum, setTotalSum] = useState(0);
  const [menuOpenId, setMenuOpenId] = useState<number | null>(null);
  const autoFilledRef = useRef(false);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // ========== 商品查询弹窗 ==========
  const [queryOpen, setQueryOpen] = useState(false);
  const [queryKeyword, setQueryKeyword] = useState('');
  const [queryItems, setQueryItems] = useState<any[]>([]);
  const [queryLoading, setQueryLoading] = useState(false);

  const doSearchBySupply = async (kw: string) => {
    if (!kw.trim()) { setQueryItems([]); return; }
    setQueryLoading(true);
    try {
      const r = await purchasesApi.searchBySupply(kw.trim());
      setQueryItems(r.items || []);
    } catch (e: any) { showToast('查询失败', e.message, 'destructive'); setQueryItems([]); }
    finally { setQueryLoading(false); }
  };

  // 商品查询结果打印预览
  const printQueryResult = () => {
    if (queryItems.length === 0) return;
    const totalQty = queryItems.reduce((s, it: any) => s + (Number(it.quantity) || 0), 0);
    const totalAmt = queryItems.reduce((s, it: any) => s + (Number(it.subtotal) || 0), 0);
    const rows = queryItems.map((it: any, i: number) => `
      <tr>
        <td>${i + 1}</td>
        <td>${it.order_no || ''}</td>
        <td>${it.date || ''}</td>
        <td>${it.supply_name || ''}</td>
        <td>${it.supply_spec || ''}</td>
        <td class="num">${it.unit || ''}</td>
        <td class="num">${Number(it.unit_price || 0).toFixed(2)}</td>
        <td class="num">${it.quantity}</td>
        <td class="num">${Number(it.subtotal || 0).toFixed(2)}</td>
        <td>${it.supplier_name || ''}</td>
      </tr>`).join('');
    const html = `<!doctype html>
<html><head><meta charset="utf-8"><title>商品查询 - ${queryKeyword}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:"Microsoft YaHei","PingFang SC","Noto Sans SC",sans-serif;padding:40px 50px;color:#333;font-size:13px}
h1{font-size:22px;margin-bottom:8px}
.meta{color:#666;font-size:12px;margin-bottom:16px;display:flex;justify-content:space-between}
table{width:100%;border-collapse:collapse;margin-bottom:20px}
th{background:#1e40af;color:#fff;padding:7px 6px;text-align:center;font-size:12px;border:1px solid #1e40af}
td{padding:6px;border:1px solid #d1d5db;text-align:center;font-size:12px}
tr:nth-child(even) td{background:#f8fafc}
.num{font-family:"Courier New",monospace}
.total{font-size:15px;font-weight:bold;text-align:right;margin-bottom:20px}
@media print{body{padding:20px 30px}th{background:#1e40af!important;-webkit-print-color-adjust:exact;print-color-adjust:exact}}
</style></head><body>
<h1>商品查询：${queryKeyword}</h1>
<div class="meta"><span>共 ${queryItems.length} 条记录</span><span>打印时间：${new Date().toLocaleString('zh-CN')}</span></div>
<table><thead><tr>
  <th style="width:36px">序号</th><th>采购单号</th><th>采购日期</th><th>品名</th><th>规格</th><th style="width:44px">单位</th>
  <th style="width:70px">采购单价</th><th style="width:50px">数量</th><th style="width:80px">小计</th><th>供应商</th>
</tr></thead><tbody>${rows}</tbody></table>
<div class="total">记录 ${queryItems.length} 条 ｜ 总数量 ${totalQty} ｜ 合计 ¥${totalAmt.toFixed(2)}</div>
<script>setTimeout(()=>window.print(),300)</script>
</body></html>`;
    const w = window.open('', '_blank');
    if (w) { w.document.write(html); w.document.close(); }
  };

  const loadList = useCallback(async (reset = false) => {
    if (loading) return;
    setLoading(true);
    try {
      const p = reset ? 1 : page;
      const r = await purchasesApi.list({ page: p, limit: 20, ...filters });
      if (reset) { setPurchases(r.items); setPage(2); }
      else { setPurchases(prev => [...prev, ...r.items]); setPage(p + 1); }
      setHasMore(r.items.length >= 20);
      setTotalSum(r.total_sum || 0);
      // 首次加载自动填充日期范围（最早起始日期 ~ 最晚结束日期）
      if (!autoFilledRef.current && r.min_date && r.max_date) {
        autoFilledRef.current = true;
        setFilters(prev => prev.date_from === '' && prev.date_to === '' ? { ...prev, date_from: r.min_date || '', date_to: r.max_date || '' } : prev);
      }
    } catch (e: any) { showToast('加载失败', e.message, 'destructive'); }
    finally { setLoading(false); }
  }, [loading, page, filters]);

  useEffect(() => { setPage(1); setHasMore(true); loadList(true); }, [filters]);

  useEffect(() => {
    if (observerRef.current) observerRef.current.disconnect();
    if (!sentinelRef.current) return;
    observerRef.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore && !loading) loadList();
    }, { rootMargin: '200px' });
    observerRef.current.observe(sentinelRef.current);
    return () => observerRef.current?.disconnect();
  }, [hasMore, loading]);

  // ========== Load search supplies ==========
  useEffect(() => {
    if (!searchQuery.trim()) { setSupplies([]); return; }
    const t = setTimeout(async () => {
      try { const r = await suppliesApi.list({ keyword: searchQuery, limit: 10, status: 'active' }); setSupplies(r.items); }
      catch { setSupplies([]); }
    }, 250);
    return () => clearTimeout(t);
  }, [searchQuery]);

  // ========== Load suppliers list for form ==========
  useEffect(() => {
    suppliersApi.list().then(r => {
      setSuppliers(r.items);
      // 默认选择第一个供应商
      if (r.items.length) setFormSupplierId(prev => prev ?? r.items[0].id);
    }).catch(() => setSuppliers([]));
  }, []);

  // ========== Add item to form ==========
  const addItem = (sup: Supply) => {
    // 允许重复添加相同产品（同一采购单内可有不同日期/价格的同名产品）
    // 新添加的产品默认沿用上一个产品的日期（没有则用今天）
    const lastDate = formItems.length ? formItems[formItems.length - 1].date : todayStr();
    setFormItems(prev => [...prev, {
      supply_id: sup.id, supply_name: sup.name, supply_spec: sup.spec || '', unit: sup.unit || '个',
      reference_price: sup.reference_price || 0, date: lastDate,
      quantity: 1, unit_price: sup.reference_price || 0, unit_price_str: (sup.reference_price || 0).toFixed(2), subtotal: sup.reference_price || 0,
    }]);
    setSearchQuery(''); setSearchOpen(false);
    // 添加后自动滚动到列表底部（最新添加的记录）
    setTimeout(() => {
      if (itemsScrollRef.current) itemsScrollRef.current.scrollTop = itemsScrollRef.current.scrollHeight;
    }, 60);
    setTimeout(() => searchRef.current?.focus(), 50);
  };

  const updateDate = (idx: number, date: string) => {
    setFormItems(prev => prev.map((item, i) => i === idx ? { ...item, date } : item));
  };

  const updateQty = (idx: number, qty: number) => {
    setFormItems(prev => prev.map((item, i) =>
      i === idx ? { ...item, quantity: Math.max(1, qty), subtotal: Math.max(1, qty) * item.unit_price } : item
    ));
  };

  const updatePrice = (idx: number, raw: string) => {
    const price = parseFloat(raw);
    const valid = isNaN(price) ? 0 : price;
    setFormItems(prev => {
      const newItems = prev.map((item, i) =>
        i === idx ? { ...item, unit_price_str: raw, unit_price: Math.max(0, valid), subtotal: item.quantity * Math.max(0, valid) } : item
      );
      return newItems;
    });
  };

  // 失焦时格式化单价为两位小数
  const blurPrice = (idx: number) => {
    setFormItems(prev => prev.map((item, i) =>
      i === idx ? { ...item, unit_price_str: item.unit_price.toFixed(2) } : item
    ));
  };

  const removeItem = (idx: number) => setFormItems(prev => prev.filter((_, i) => i !== idx));

  // ========== Open new purchase dialog ==========
  const openNew = () => {
    setFormDateFrom(todayStr());
    setFormDateTo(todayStr());
    setFormItems([]);
    setFormSupplierId(suppliers.length ? suppliers[0].id : null);
    setFormRemark('');
    setDialogPurchase(null);
    setDialogType('new');
  };

  // ========== Open view dialog ==========
  const openViewDialog = async (id: number) => {
    try {
      const d = await purchasesApi.get(id);
      setDialogPurchase(d); setDialogItems(d.items || []); setDialogType('view');
    } catch (e: any) { showToast('加载失败', e.message, 'destructive'); }
  };

  // ========== Open edit dialog ==========
  const openEditDialog = async (id: number) => {
    try {
      const d = await purchasesApi.get(id);
      setDialogPurchase(d);
      // Parse date range: "2026-07-12~2026-07-31" → from/to
      const dateStr = d.purchase_date || '';
      if (dateStr.includes('~')) {
        const parts = dateStr.split('~');
        setFormDateFrom(parts[0]);
        setFormDateTo(parts[1] || parts[0]);
      } else {
        setFormDateFrom(dateStr);
        setFormDateTo(dateStr);
      }
      setFormSupplierId(d.supplier_id || null);
      setFormRemark(d.remark || '');
      setFormItems((d.items || []).map((i: any) => ({
        supply_id: i.supply_id, supply_name: i.supply_name, supply_spec: i.supply_spec || '',
        unit: i.unit || '个', reference_price: i.reference_price || 0,
        date: i.date || d.purchase_date,
        quantity: i.quantity, unit_price: i.unit_price, unit_price_str: Number(i.unit_price).toFixed(2), subtotal: i.subtotal,
      })));
      setDialogType('edit');
    } catch (e: any) { showToast('加载失败', e.message, 'destructive'); }
  };

  // ========== Save ==========
  const handleSave = async () => {
    if (formItems.length === 0) { showToast('校验失败', '请至少添加一项用品', 'destructive'); return; }
    setSaving(true);
    try {
      // 日期范围：优先按产品行日期自动汇总（最早~最晚）；无产品日期时回退到表单选择器
      const itemDates = formItems.map(i => i.date).filter(Boolean);
      let purchaseDate;
      if (itemDates.length) {
        const minD = itemDates.reduce((a, b) => (a < b ? a : b));
        const maxD = itemDates.reduce((a, b) => (a > b ? a : b));
        purchaseDate = minD === maxD ? minD : `${minD}~${maxD}`;
      } else {
        purchaseDate = formDateFrom === formDateTo ? formDateFrom : `${formDateFrom}~${formDateTo}`;
      }
      const body = {
        purchase_date: purchaseDate,
        items: formItems.map(i => ({ supply_id: i.supply_id, quantity: i.quantity, unit_price: i.unit_price, date: i.date })),
        supplier_id: formSupplierId,
        remark: formRemark.trim(),
      };
      if (dialogType === 'edit' && dialogPurchase) {
        await purchasesApi.update(dialogPurchase.id, body);
        showToast('✅ 采购单已更新');
      } else {
        const r = await purchasesApi.create(body);
        showToast('✅ 已保存', `单号: ${r.order_no}`, 'success');
      }
      setDialogType(null);
      // 保存后重置日期筛选并允许重新自动填充，确保新采购单（日期可能超出原范围）能显示
      autoFilledRef.current = false;
      setFilters(prev => ({ ...prev, date_from: '', date_to: '' }));
      loadList(true);
    } catch (e: any) { showToast('保存失败', e.message, 'destructive'); }
    finally { setSaving(false); }
  };

  // ========== PDF ==========
  const openPdf = (id: number) => { window.open(`/api/purchases/${id}/pdf?print=1`, '_blank'); };

  // ========== Delete ==========
  const handleDelete = (id: number, orderNo: string) => {
    setConfirmMsg(`确认删除采购单「${orderNo}」？此操作不可恢复。`);
    setConfirmAction(() => async () => {
      try { await purchasesApi.delete(id); showToast('✅ 已删除'); loadList(true); setConfirmOpen(false); }
      catch (e: any) { showToast('删除失败', e.message, 'destructive'); }
    });
    setConfirmOpen(true);
  };

  // ========== Close dialog ==========
  const closeDialog = () => { setDialogType(null); };

  const totalAmount = formItems.reduce((s, i) => s + i.subtotal, 0);

  // =============================================
  // RENDER: New/Edit Form Dialog
  // =============================================
  const formDialog = (
    <Dialog open={dialogType === 'new' || dialogType === 'edit'}
      onOpenChange={(open) => { if (!open) setDialogType(null); }}>
      <DialogContent className="sm:max-w-[900px] max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {dialogType === 'edit' ? <Pencil className="h-5 w-5 text-blue-600" /> : <Plus className="h-5 w-5 text-blue-600" />}
            {dialogType === 'edit' ? `编辑采购单 · ${dialogPurchase?.order_no || ''}` : '新建采购单'}
          </DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3 flex-1 min-h-0">
          {/* Supplier selection */}
          <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
            <Label className="text-sm font-medium w-20">供应商：</Label>
            <select
              className="flex-1 max-w-xs h-9 rounded-lg border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              value={formSupplierId ?? ''}
              onChange={e => {
                setFormSupplierId(e.target.value ? Number(e.target.value) : null);
              }}
            >
              <option value="">请选择供应商</option>
              {suppliers.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input ref={searchRef}
              className="flex h-10 w-full rounded-lg border border-input bg-background pl-10 pr-4 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              placeholder="🔍 搜索用品添加到清单..."
              value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              onFocus={() => setSearchOpen(true)} onBlur={() => setTimeout(() => setSearchOpen(false), 200)}
              onKeyDown={e => { if (e.key === 'Escape') setSearchOpen(false); if (e.key === 'ArrowDown' && supplies.length > 0) { e.preventDefault(); addItem(supplies[0]); } }}
            />
            {searchOpen && searchQuery.trim() && (
              <div className="absolute left-0 right-0 top-full mt-1 z-50 bg-white border rounded-lg shadow-lg max-h-[260px] overflow-y-auto">
                {supplies.length === 0 ? (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    <p>未找到匹配用品</p>
                    <p className="text-xs mt-1">请先到「字典」页面添加用品</p>
                  </div>
                ) : supplies.map(sup => (
                  <div key={sup.id}
                    className="flex items-center justify-between px-3 py-2 hover:bg-blue-50 cursor-pointer border-b last:border-0 transition-colors"
                    onMouseDown={() => addItem(sup)}>
                    <div>
                      <span className="font-medium text-sm">{sup.name}</span>
                      <span className="text-xs text-muted-foreground ml-2">{sup.spec} · {sup.unit}</span>
                    </div>
                    <span className="text-sm font-semibold text-blue-600">¥{sup.reference_price?.toFixed(2) || '0.00'}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Items table with date column — 仅此区域滚动 */}
          <div ref={itemsScrollRef} className="overflow-auto border rounded-lg flex-1 min-h-0 max-h-[50vh]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8 text-center text-xs">序号</TableHead>
                  <TableHead className="text-xs">品名</TableHead>
                  <TableHead className="text-xs">规格</TableHead>
                  <TableHead className="w-14 text-center text-xs">单位</TableHead>
                  <TableHead className="w-28 text-center text-xs">参考单价</TableHead>
                  <TableHead className="w-28 text-center text-xs">单价</TableHead>
                  <TableHead className="w-28 text-center text-xs">数量</TableHead>
                  <TableHead className="w-36 text-center text-xs">日期</TableHead>
                  <TableHead className="w-24 text-right text-xs">小计</TableHead>
                  <TableHead className="w-8"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {formItems.length === 0 ? (
                  <TableRow><TableCell colSpan={10} className="h-20 text-center text-sm text-muted-foreground">搜索添加入用品</TableCell></TableRow>
                ) : formItems.map((item, idx) => (
                  <TableRow key={item.supply_id + '-' + idx}>
                    <TableCell className="text-center text-xs text-muted-foreground">{idx + 1}</TableCell>
                    <TableCell className="text-sm font-medium">{item.supply_name}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{item.supply_spec}</TableCell>
                    <TableCell className="text-center text-xs text-muted-foreground">{item.unit}</TableCell>
                    <TableCell className="text-center text-xs text-muted-foreground font-mono">¥{item.reference_price?.toFixed(2)}</TableCell>
                    <TableCell className="text-center">
                      <input type="text" inputMode="decimal" pattern="[0-9.]*"
                        className={`h-7 w-20 text-center font-mono text-xs rounded border px-1 focus-visible:outline-none focus-visible:ring-2 ${
                          item.reference_price > 0 && item.unit_price > item.reference_price
                            ? 'border-amber-500 text-amber-700 focus-visible:ring-amber-500'
                            : 'border-input bg-background focus-visible:ring-blue-500'
                        }`}
                        value={item.unit_price_str} onChange={e => updatePrice(idx, e.target.value)} onBlur={() => blurPrice(idx)} />
                    </TableCell>
                    <TableCell className="text-center">
                      <input type="text" inputMode="numeric" pattern="[0-9]*"
                        className="h-7 w-20 text-center font-mono text-xs rounded border border-input bg-background px-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                        value={item.quantity} onChange={e => updateQty(idx, parseInt(e.target.value) || 1)} />
                    </TableCell>
                    <TableCell className="text-center">
                      <input type="date" className="h-7 w-32 rounded border border-input bg-background px-1 text-xs font-mono focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                        value={item.date} onChange={e => updateDate(idx, e.target.value)} />
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm font-medium">¥{item.subtotal.toFixed(2)}</TableCell>
                    <TableCell><Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeItem(idx)}><X className="h-3 w-3 text-red-500" /></Button></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* 备注 */}
          <div className="flex items-center gap-3">
            <Label className="text-sm font-medium w-20 shrink-0">备注：</Label>
            <Input placeholder="备注信息（可选）" value={formRemark}
              onChange={e => setFormRemark(e.target.value)} />
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between pt-1">
            <label className="text-sm text-muted-foreground">采购日期：
              <input type="date" className="ml-1 h-8 w-[140px] rounded border border-input bg-background px-1 text-sm font-mono focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                value={formDateFrom} onChange={e => setFormDateFrom(e.target.value)} />
              <span className="mx-1 text-muted-foreground">~</span>
              <input type="date" className="h-8 w-[140px] rounded border border-input bg-background px-1 text-sm font-mono focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                value={formDateTo} onChange={e => setFormDateTo(e.target.value)} />
            </label>
            <span className="text-xl font-bold text-red-600">{formatCurrency(totalAmount)}</span>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <DialogClose asChild><Button variant="outline" size="sm">取消</Button></DialogClose>
            <Button onClick={handleSave} disabled={saving} size="sm">
              <Save className="mr-1 h-3.5 w-3.5" />{saving ? '保存中...' : '保存'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );

  // =============================================
  // RENDER: View Dialog (read-only + PDF)
  // =============================================
  const viewDialog = (
    <Dialog open={dialogType === 'view'} onOpenChange={(open) => { if (!open) setDialogType(null); }}>
      <DialogContent className="sm:max-w-[780px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-600" />
            采购单详情 · {dialogPurchase?.order_no || ''}
          </DialogTitle>
        </DialogHeader>
        {dialogPurchase && (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-4 text-sm">
              <span><strong>单号：</strong>{dialogPurchase.order_no}</span>
              <span><strong>日期：</strong>{formatShortDate(dialogPurchase.purchase_date)}</span>
              <span><strong>供应商：</strong>{dialogPurchase.supplier_name || '-'}</span>
              <span><strong>状态：</strong>
                <Badge variant={dialogPurchase.status === 'completed' || dialogPurchase.status === 'confirmed' ? 'default' : 'secondary'}>
                  {dialogPurchase.status === 'completed' || dialogPurchase.status === 'confirmed' ? '已完成' : '草稿'}
                </Badge>
              </span>
            </div>
            <div className="overflow-x-auto border rounded-lg">
              <Table className="max-h-[55vh]">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8 text-center text-xs">序号</TableHead>
                    <TableHead className="text-xs">品名</TableHead>
                    <TableHead className="text-xs">规格</TableHead>
                    <TableHead className="w-14 text-center text-xs">单位</TableHead>
                    <TableHead className="w-28 text-center text-xs">参考单价</TableHead>
                    <TableHead className="w-28 text-center text-xs">单价</TableHead>
                    <TableHead className="w-28 text-center text-xs">数量</TableHead>
                    <TableHead className="w-36 text-center text-xs">日期</TableHead>
                    <TableHead className="w-24 text-right text-xs">小计</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dialogItems.map((item: any, idx: number) => (
                    <TableRow key={idx}>
                      <TableCell className="text-center text-xs text-muted-foreground">{idx + 1}</TableCell>
                      <TableCell className="text-sm font-medium">{item.supply_name}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{item.supply_spec || '-'}</TableCell>
                      <TableCell className="text-center text-xs">{item.unit || '-'}</TableCell>
                      <TableCell className="text-right font-mono text-xs text-muted-foreground">
                        {item.reference_price ? `¥${Number(item.reference_price).toFixed(2)}` : '-'}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs">¥{Number(item.unit_price).toFixed(2)}</TableCell>
                      <TableCell className="text-right font-mono text-xs">{item.quantity}</TableCell>
                      <TableCell className="text-center font-mono text-xs">{item.date ? formatShortDate(item.date) : '-'}</TableCell>
                      <TableCell className="text-right font-mono text-sm font-medium">¥{Number(item.subtotal).toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="flex items-center justify-between pt-1">
              <span className="text-xl font-bold text-red-600">合计：¥{Number(dialogPurchase.total_amount).toFixed(2)}</span>
              <Button size="sm" onClick={() => openPdf(dialogPurchase.id)}>
                <FileText className="mr-1.5 h-4 w-4" />打印预览
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );

  // =============================================
  // RENDER: LIST VIEW
  // =============================================
  return (
    <div className="space-y-4">
      {formDialog}
      {viewDialog}

      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">📋 采购单管理</h2>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => { setQueryKeyword(''); setQueryItems([]); setQueryOpen(true); }}>
            <Search className="mr-1 h-4 w-4" />商品查询
          </Button>
          <Button onClick={openNew} size="sm"><Plus className="mr-1 h-4 w-4" />新建</Button>
        </div>
      </div>

      {/* Filter bar */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap items-center gap-2">
            <Input placeholder="搜索单号..." className="w-[180px] h-9 text-sm" value={filters.keyword}
              onChange={e => setFilters(f => ({ ...f, keyword: e.target.value }))} />
            <input type="date" className="h-9 rounded-lg border border-input bg-background px-3 text-sm font-mono focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              value={filters.date_from} onChange={e => setFilters(f => ({ ...f, date_from: e.target.value }))}
              placeholder="开始日期" />
            <span className="text-muted-foreground text-xs">~</span>
            <input type="date" className="h-9 rounded-lg border border-input bg-background px-3 text-sm font-mono focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              value={filters.date_to} onChange={e => setFilters(f => ({ ...f, date_to: e.target.value }))}
              placeholder="结束日期" />
            <Button variant="outline" size="sm" className="h-9"
              onClick={() => { setPage(1); setHasMore(true); loadList(true); }}>查询</Button>
            <Button variant="outline" size="sm" className="h-9"
              onClick={() => { setFilters({ keyword: '', date_from: '', date_to: '' }); setPage(1); setHasMore(true); loadList(true); }}>
              <RotateCcw className="h-3.5 w-3.5 mr-1" />重置
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table className="max-h-[65vh]">
            <TableHeader>
              <TableRow>
                <TableHead className="w-auto text-xs">采购单号</TableHead>
                <TableHead className="w-36 text-xs">日期范围</TableHead>
                <TableHead className="w-12 text-center text-xs">品项</TableHead>
                <TableHead className="w-auto text-xs">供应商</TableHead>
                <TableHead className="w-24 text-right text-xs">金额</TableHead>
                <TableHead className="w-20 text-center text-xs">付款状态</TableHead>
                <TableHead className="w-24 text-xs">付款日期</TableHead>
                <TableHead className="w-auto text-xs">备注</TableHead>
                <TableHead className="w-14 text-right text-xs">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={9} className="h-24 text-center text-sm text-muted-foreground">加载中...</TableCell></TableRow>
              ) : purchases.length === 0 ? (
                <TableRow><TableCell colSpan={9} className="h-24 text-center text-sm text-muted-foreground">暂无采购单</TableCell></TableRow>
              ) : purchases.map(p => (
                <TableRow key={p.id}>
                  <TableCell className="font-mono text-xs font-medium whitespace-nowrap">{p.order_no}</TableCell>
                  <TableCell className="text-xs whitespace-nowrap">{formatPurchaseDate(p.purchase_date)}</TableCell>
                  <TableCell className="text-center text-xs" title={p.item_names || ''}>
                    {p.item_count || 0} 项
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{p.supplier_name || '-'}</TableCell>
                  <TableCell className="text-right font-mono text-sm font-bold">{formatCurrency(p.total_amount)}</TableCell>
                  <TableCell className="text-center">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${p.payment_status === '已付款' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                      {p.payment_status || '未付款'}
                    </span>
                  </TableCell>
                  <TableCell className="text-xs">{p.payment_date ? formatPurchaseDate(p.payment_date) : '-'}</TableCell>
                  <TableCell className="text-xs text-muted-foreground truncate max-w-[120px]">{p.remark || '-'}</TableCell>
                  <TableCell className="text-right">
                    <Popover open={menuOpenId === p.id} onOpenChange={(open) => setMenuOpenId(open ? p.id : null)}>
                      <PopoverTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7" title="更多">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-32 p-1" align="end">
                        <button className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-slate-50 rounded" onClick={() => { setMenuOpenId(null); openViewDialog(p.id); }}>
                          <Eye className="h-3.5 w-3.5" />查看
                        </button>
                        <button className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-slate-50 rounded" onClick={() => { setMenuOpenId(null); openEditDialog(p.id); }}>
                          <Pencil className="h-3.5 w-3.5" />编辑
                        </button>
                        <button className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-500 hover:bg-red-50 rounded" onClick={() => { setMenuOpenId(null); handleDelete(p.id, p.order_no); }}>
                          <Trash2 className="h-3.5 w-3.5" />删除
                        </button>
                      </PopoverContent>
                    </Popover>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {purchases.length > 0 && (
            <div className="flex justify-end items-center gap-2 border-t px-4 py-3 bg-slate-50">
              <span className="text-sm text-muted-foreground">共 {purchases.length} 单</span>
              <span className="text-sm font-medium">汇总金额：</span>
              <span className="text-lg font-bold text-red-600">{formatCurrency(totalSum)}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Infinite scroll */}
      <div ref={sentinelRef} className="py-3 text-center text-sm text-muted-foreground">
        {loading && <span>加载中...</span>}
        {!hasMore && purchases.length > 0 && <span>已显示所有采购单</span>}
      </div>

      {/* 商品查询弹窗 */}
      <Dialog open={queryOpen} onOpenChange={setQueryOpen}>
        <DialogContent className="sm:max-w-[900px] max-h-[85vh] flex flex-col overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Search className="h-5 w-5 text-blue-600" />商品查询
            </DialogTitle>
          </DialogHeader>
          <div className="flex items-center gap-2">
            <Input placeholder="输入品名，如：垃圾桶" value={queryKeyword}
              onChange={e => setQueryKeyword(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') doSearchBySupply(queryKeyword); }} />
            <Button size="sm" onClick={() => doSearchBySupply(queryKeyword)} disabled={queryLoading}>
              {queryLoading ? '查询中...' : '查询'}
            </Button>
          </div>
          <div className="overflow-auto border rounded-lg flex-1 min-h-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10 text-xs">序号</TableHead>
                  <TableHead className="text-xs">采购单号</TableHead>
                  <TableHead className="text-xs">采购日期</TableHead>
                  <TableHead className="text-xs">品名</TableHead>
                  <TableHead className="text-xs">规格</TableHead>
                  <TableHead className="text-xs">单位</TableHead>
                  <TableHead className="text-xs">参考单价</TableHead>
                  <TableHead className="text-xs">采购单价</TableHead>
                  <TableHead className="text-xs">数量</TableHead>
                  <TableHead className="text-xs">小计</TableHead>
                  <TableHead className="text-xs">供应商</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {queryLoading ? (
                  <TableRow><TableCell colSpan={11} className="h-24 text-center text-sm text-muted-foreground">查询中...</TableCell></TableRow>
                ) : queryItems.length === 0 ? (
                  <TableRow><TableCell colSpan={11} className="h-24 text-center text-sm text-muted-foreground">
                    {queryKeyword ? '未找到包含该品名的采购记录' : '输入品名后点击查询'}
                  </TableCell></TableRow>
                ) : queryItems.map((it: any, idx: number) => (
                  <TableRow key={it.id}>
                    <TableCell className="text-xs text-muted-foreground">{idx + 1}</TableCell>
                    <TableCell className="font-mono text-xs">{it.order_no}</TableCell>
                    <TableCell className="text-xs">{it.date ? formatShortDate(it.date) : formatPurchaseDate(it.purchase_date)}</TableCell>
                    <TableCell className="text-xs font-medium">{it.supply_name}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{it.supply_spec || '-'}</TableCell>
                    <TableCell className="text-xs">{it.unit || '-'}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">¥{Number(it.reference_price || 0).toFixed(2)}</TableCell>
                    <TableCell className="text-xs">¥{Number(it.unit_price).toFixed(2)}</TableCell>
                    <TableCell className="text-xs">{it.quantity}</TableCell>
                    <TableCell className="text-xs font-medium">¥{Number(it.subtotal).toFixed(2)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{it.supplier_name || '-'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {/* 汇总 */}
          {queryItems.length > 0 && (() => {
            const totalQty = queryItems.reduce((s, it: any) => s + (Number(it.quantity) || 0), 0);
            const totalAmt = queryItems.reduce((s, it: any) => s + (Number(it.subtotal) || 0), 0);
            return (
              <div className="flex items-center justify-between pt-1">
                <span className="text-sm text-muted-foreground">
                  共 <span className="font-bold text-blue-600">{queryItems.length}</span> 条记录 ｜ 总数量 <span className="font-bold text-blue-600">{totalQty}</span> ｜ 总金额 <span className="font-bold text-red-600">¥{totalAmt.toFixed(2)}</span>
                </span>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={printQueryResult} disabled={queryItems.length === 0}>
                    <Printer className="mr-1.5 h-3.5 w-3.5" />打印预览
                  </Button>
                  <DialogClose asChild><Button variant="outline" size="sm">关闭</Button></DialogClose>
                </div>
              </div>
            );
          })()}
          {queryItems.length === 0 && (
            <div className="flex justify-end pt-1">
              <DialogClose asChild><Button variant="outline" size="sm">关闭</Button></DialogClose>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Confirm dialog */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader><DialogTitle>确认操作</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground py-2">{confirmMsg}</p>
          <div className="flex justify-end gap-2">
            <DialogClose asChild><Button variant="outline" size="sm">取消</Button></DialogClose>
            <Button variant="destructive" size="sm" onClick={() => confirmAction()}>确认</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
