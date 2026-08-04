import { useState, useEffect, useCallback } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { showToast } from '@/components/ui/toaster';
import { canteenApi, suppliersApi } from '@/lib/api';
import { Plus, Pencil, Trash2, X, Download, Save, Eye, Printer } from 'lucide-react';

const fmt = (n: any) => `¥${Number(n || 0).toFixed(2)}`;
// 采购渠道选项
const CHANNELS = ['电商平台', '个体经营', '自购'];

// ---------- 食材采购录入 ----------
function PurchasePanel() {
  const [list, setList] = useState<any[]>([]);
  const [supplies, setSupplies] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [keyword, setKeyword] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 20;

  // 新建/编辑采购单
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState({
    purchase_date: new Date().toISOString().slice(0, 10),
    supplier_id: null as number | null, supplier_name: '', channel: '', actual_pay: 0, remark: '',
    items: [] as any[],
  });
  // 行内添加食材
  const [rowKeyword, setRowKeyword] = useState('');
  const [rowOpen, setRowOpen] = useState(false);
  const [confirm, setConfirm] = useState<{ open: boolean; target: any }>({ open: false, target: null });
  // 查看详情
  const [viewOpen, setViewOpen] = useState(false);
  const [viewDetail, setViewDetail] = useState<any>(null);

  const load = useCallback(async () => {
    try {
      const r = await canteenApi.purchases.list({ page, limit });
      setList(r.items); setTotal(r.total);
    } catch (e: any) { showToast('加载失败', e.message, 'destructive'); }
  }, [page]);
  useEffect(() => { load(); }, [load]);

  const loadSupplies = useCallback(async (kw = '') => {
    try { setSupplies((await canteenApi.supplies.list({ keyword: kw, page: 1, limit: 30 })).items); }
    catch { /* ignore */ }
  }, []);

  const loadSuppliers = useCallback(async () => {
    try {
      const r = await suppliersApi.list();
      setSuppliers(r.items || []);
    } catch { /* ignore */ }
  }, []);

  const openNew = () => {
    setEditId(null);
    setForm({ purchase_date: new Date().toISOString().slice(0, 10), supplier_id: null, supplier_name: '', channel: CHANNELS[0], actual_pay: 0, remark: '', items: [] });
    setOpen(true); loadSupplies(); loadSuppliers();
  };
  const openEdit = async (p: any) => {
    setEditId(p.id);
    try {
      const d = await canteenApi.purchases.get(p.id);
      setForm({
        purchase_date: d.purchase_date, supplier_id: d.supplier_id || null, supplier_name: d.supplier_name || '', channel: d.channel || CHANNELS[0],
        actual_pay: d.actual_pay || 0, remark: d.remark || '',
        items: (d.items || []).map((i: any) => ({
          supply_id: i.supply_id, supply_name: i.supply_name, unit: i.unit,
          quantity: i.quantity, unit_price: i.unit_price, subtotal: i.subtotal,
        })),
      });
      setOpen(true); loadSupplies(); loadSuppliers();
    } catch (e: any) { showToast('加载失败', e.message, 'destructive'); }
  };

  const totalAmount = form.items.reduce((s, i) => s + (Number(i.subtotal) || 0), 0);

  const addRow = (s: any) => {
    setForm((f) => ({
      ...f,
      items: [...f.items, { supply_id: s.id, supply_name: s.name, unit: s.unit, quantity: 1, unit_price: s.reference_price || 0, subtotal: s.reference_price || 0 }],
    }));
    setRowOpen(false); setRowKeyword('');
  };
  const updateRow = (idx: number, patch: any) => {
    setForm((f) => {
      const items = f.items.map((it, i) => (i === idx ? { ...it, ...patch } : it));
      return { ...f, items };
    });
  };
  const removeRow = (idx: number) => setForm((f) => ({ ...f, items: f.items.filter((_, i) => i !== idx) }));

  const save = async () => {
    if (!form.items.length) { showToast('校验失败', '请至少添加一行采购明细', 'destructive'); return; }
    try {
      // 根据选中的供应商自动填 supplier_name（兼容下拉选择）
      const sel = suppliers.find((s) => s.id === form.supplier_id);
      const payload = { ...form, supplier_name: sel ? sel.name : form.supplier_name };
      if (editId) { await canteenApi.purchases.update(editId, payload); showToast('✅ 已更新'); }
      else { await canteenApi.purchases.create(payload); showToast('✅ 已保存'); }
      setOpen(false); load();
    } catch (e: any) { showToast('保存失败', e.message, 'destructive'); }
  };
  const del = async () => {
    if (!confirm.target) return;
    try { await canteenApi.purchases.delete(confirm.target.id); showToast('✅ 已删除'); load(); }
    catch (e: any) { showToast('删除失败', e.message, 'destructive'); }
    finally { setConfirm({ open: false, target: null }); }
  };

  const exportCsv = async () => {
    try {
      const blob = await canteenApi.purchases.exportCsv({});
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = '食堂采购明细.csv'; a.click();
      URL.revokeObjectURL(url);
    } catch (e: any) { showToast('导出失败', e.message, 'destructive'); }
  };

  // 查看采购单详情
  const viewPurchase = async (p: any) => {
    try {
      const d = await canteenApi.purchases.get(p.id);
      setViewDetail(d); setViewOpen(true);
    } catch (e: any) { showToast('加载失败', e.message, 'destructive'); }
  };

  // 打印预览
  const printPurchase = async (p: any) => {
    try {
      const d = p.items ? p : await canteenApi.purchases.get(p.id);
      const rows = (d.items || []).map((it: any, i: number) => `
      <tr${i % 2 === 0 ? ' class="even"' : ''}>
        <td>${i + 1}</td>
        <td>${it.supply_name || ''}</td>
        <td>${it.supply_spec || ''}</td>
        <td>${it.unit || ''}</td>
        <td class="num">${Number(it.unit_price).toFixed(2)}</td>
        <td class="num">${Number(it.quantity).toFixed(2)}</td>
        <td class="num">${Number(it.subtotal).toFixed(2)}</td>
      </tr>`).join('');
      const html = `<!doctype html>
<html><head><meta charset="utf-8"><title>${d.order_no || '采购单'}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:"Microsoft YaHei","PingFang SC","Noto Sans SC",sans-serif;padding:40px 50px;color:#333;font-size:14px}
h1{font-size:24px;margin-bottom:6px}
.meta{color:#666;font-size:13px;margin-bottom:20px;display:flex;justify-content:space-between;flex-wrap:wrap;gap:4px}
table{width:100%;border-collapse:collapse;margin-bottom:24px}
th{background:#1e40af;color:#fff;padding:8px 6px;text-align:center;font-size:13px}
td{padding:7px 6px;border-bottom:1px solid #e5e7eb;font-size:13px;text-align:center}
tr.even td{background:#f8fafc}
.num{text-align:right;font-family:"Courier New",monospace}
.total{font-size:18px;font-weight:bold;color:#dc2626;text-align:right;margin-bottom:6px}
.pay{font-size:14px;font-weight:bold;text-align:right;margin-bottom:30px}
@media print{body{padding:20px 30px}th{background:#1e40af!important;-webkit-print-color-adjust:exact;print-color-adjust:exact}}
</style></head><body>
<h1>🍚 食堂采购单</h1>
<div class="meta">
  <span><strong>单号：</strong>${d.order_no || ''}</span>
  <span><strong>日期：</strong>${d.purchase_date || ''}</span>
  <span><strong>供应商：</strong>${d.supplier_name || '-'}</span>
  <span><strong>渠道：</strong>${d.channel || '-'}</span>
</div>
<table><thead><tr>
  <th style="width:40px">序号</th><th>品名</th><th>规格</th><th style="width:50px">单位</th>
  <th style="width:80px">单价</th><th style="width:60px">数量</th><th style="width:90px">小计</th>
</tr></thead><tbody>
${rows}
</tbody></table>
<div class="total">合计：¥${Number(d.total_amount).toFixed(2)}</div>
<div class="pay">实支：¥${Number(d.actual_pay || d.total_amount).toFixed(2)}</div>
<script>setTimeout(()=>window.print(),300)</script>
</body></html>`;
      const w = window.open('', '_blank');
      if (!w) { showToast('浏览器拦截了打印窗口', '', 'destructive'); return; }
      w.document.write(html);
      w.document.close();
    } catch (e: any) { showToast('打印失败', e.message, 'destructive'); }
  };

  const filteredSupplies = supplies.filter((s) => !form.items.some((i) => i.supply_id === s.id));

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">食材采购</h3>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={exportCsv}><Download className="mr-1 h-4 w-4" />导出</Button>
            <Button size="sm" onClick={openNew}><Plus className="mr-1 h-4 w-4" />新建</Button>
          </div>
        </div>
        <Table className="max-h-[50vh]">
          <TableHeader>
            <TableRow>
              <TableHead className="w-12 text-center">序号</TableHead><TableHead className="text-center">采购单号</TableHead>
              <TableHead className="w-28 text-center">日期</TableHead><TableHead className="text-center">供应商</TableHead>
              <TableHead className="w-20 text-center">明细</TableHead><TableHead className="w-24 text-center">总金额</TableHead>
              <TableHead className="w-24 text-center">实支</TableHead><TableHead className="w-[110px] text-center">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {list.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="h-16 text-center text-muted-foreground">暂无采购单</TableCell></TableRow>
            ) : list.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="text-center text-muted-foreground">{p.id}</TableCell>
                <TableCell className="font-medium text-center">{p.order_no}</TableCell>
                <TableCell className="text-center">{p.purchase_date}</TableCell>
                <TableCell className="text-center">{p.supplier_name || '-'}</TableCell>
                <TableCell className="text-center">{p.item_count} 项</TableCell>
                <TableCell className="font-medium text-center">{fmt(p.total_amount)}</TableCell>
                <TableCell className="text-center">{p.actual_pay ? fmt(p.actual_pay) : '-'}</TableCell>
                <TableCell className="text-center">
                  <Button variant="ghost" size="icon" title="查看" onClick={() => viewPurchase(p)}><Eye className="h-4 w-4 text-blue-600" /></Button>
                  <Button variant="ghost" size="icon" title="编辑" onClick={() => openEdit(p)}><Pencil className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" title="删除" onClick={() => setConfirm({ open: true, target: p })}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {total > limit && (
          <div className="flex justify-center gap-2">
            <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage(page - 1)}>上一页</Button>
            <span className="text-xs text-muted-foreground self-center">{page} / {Math.ceil(total / limit)}</span>
            <Button size="sm" variant="outline" disabled={page >= Math.ceil(total / limit)} onClick={() => setPage(page + 1)}>下一页</Button>
          </div>
        )}
      </CardContent>

      {/* 采购单编辑弹窗 */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[800px] max-h-[85vh] flex flex-col">
          <DialogHeader><DialogTitle>{editId ? `编辑采购单 #${editId}` : '新建采购单'}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <Input type="date" value={form.purchase_date} onChange={(e) => setForm({ ...form, purchase_date: e.target.value })} />
            {/* 供应商下拉（系统供应商列表） */}
            <select className="h-9 rounded-md border px-2 text-sm" value={form.supplier_id ?? ''} onChange={(e) => setForm({ ...form, supplier_id: e.target.value ? Number(e.target.value) : null, supplier_name: e.target.options[e.target.selectedIndex]?.text || '' })}>
              <option value="">选择供应商</option>
              {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            {/* 采购渠道选择框 */}
            <select className="h-9 rounded-md border px-2 text-sm" value={form.channel} onChange={(e) => setForm({ ...form, channel: e.target.value })}>
              {CHANNELS.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <Input type="number" placeholder="实支金额" value={form.actual_pay || ''} onChange={(e) => setForm({ ...form, actual_pay: parseFloat(e.target.value) || 0 })} />
          </div>
          <div className="relative">
            <Input placeholder="搜索食材添加…" value={rowKeyword}
              onFocus={() => { setRowOpen(true); loadSupplies(rowKeyword); }}
              onChange={(e) => { setRowKeyword(e.target.value); setRowOpen(true); loadSupplies(e.target.value); }} />
            {rowOpen && (
              <div className="absolute z-20 left-0 right-0 top-full mt-1 max-h-40 overflow-y-auto border rounded-md bg-white shadow-lg p-1">
                {filteredSupplies.length === 0 ? <p className="text-xs text-muted-foreground p-2">无匹配食材，请先在「数据字典」中添加</p> :
                  filteredSupplies.map((s) => (
                    <div key={s.id} className="flex items-center justify-between px-2 py-1.5 hover:bg-slate-100 rounded cursor-pointer" onClick={() => addRow(s)}>
                      <span className="text-sm">{s.name} <span className="text-muted-foreground text-xs">{s.spec || ''} {s.unit}</span></span>
                      <span className="text-xs text-blue-600">{fmt(s.reference_price)}</span>
                    </div>
                  ))}
              </div>
            )}
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12 text-center">序号</TableHead><TableHead className="text-center">品名</TableHead>
                  <TableHead className="w-20 text-center">单位</TableHead><TableHead className="w-24 text-center">数量</TableHead>
                  <TableHead className="w-24 text-center">单价</TableHead><TableHead className="w-24 text-center">小计</TableHead>
                  <TableHead className="w-14"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {form.items.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="h-16 text-center text-muted-foreground">搜索上方添加食材</TableCell></TableRow>
                ) : form.items.map((it, idx) => (
                  <TableRow key={`${it.supply_id}-${idx}`}>
                    <TableCell className="text-center text-muted-foreground">{idx + 1}</TableCell>
                    <TableCell className="text-center">{it.supply_name}</TableCell>
                    <TableCell className="text-center">{it.unit}</TableCell>
                    <TableCell className="text-center"><Input className="h-7 w-20 text-center" type="number" value={it.quantity} onChange={(e) => { const q = parseFloat(e.target.value) || 0; updateRow(idx, { quantity: q, subtotal: q * it.unit_price }); }} /></TableCell>
                    <TableCell className="text-center"><Input className="h-7 w-20 text-center" type="number" value={it.unit_price} onChange={(e) => { const p = parseFloat(e.target.value) || 0; updateRow(idx, { unit_price: p, subtotal: it.quantity * p }); }} /></TableCell>
                    <TableCell className="font-medium text-center">{fmt(it.subtotal)}</TableCell>
                    <TableCell><Button variant="ghost" size="icon" onClick={() => removeRow(idx)}><X className="h-4 w-4 text-red-500" /></Button></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="flex items-center justify-between pt-2 border-t">
            <div className="text-sm">合计：<span className="font-bold text-red-600 text-base">{fmt(totalAmount)}</span></div>
            <div className="flex gap-2">
              <DialogClose asChild><Button variant="outline">取消</Button></DialogClose>
              <Button onClick={save}><Save className="mr-1 h-4 w-4" />保存</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 查看详情弹窗 */}
      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="sm:max-w-[640px] max-h-[85vh] flex flex-col">
          <DialogHeader className="flex flex-row items-center justify-between pr-10">
            <DialogTitle>采购单详情 {viewDetail?.order_no || ''}</DialogTitle>
          </DialogHeader>
          {viewDetail && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                <div><span className="text-muted-foreground text-xs">日期</span><div className="font-medium">{viewDetail.purchase_date}</div></div>
                <div><span className="text-muted-foreground text-xs">供应商</span><div className="font-medium">{viewDetail.supplier_name || '-'}</div></div>
                <div><span className="text-muted-foreground text-xs">渠道</span><div className="font-medium">{viewDetail.channel || '-'}</div></div>
                <div><span className="text-muted-foreground text-xs">实支</span><div className="font-medium text-red-600">{viewDetail.actual_pay ? fmt(viewDetail.actual_pay) : '-'}</div></div>
              </div>
              {viewDetail.remark && <p className="text-xs text-muted-foreground"><span className="text-muted-foreground">备注：</span>{viewDetail.remark}</p>}
              <div className="flex-1 min-h-0 overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12 text-center">序号</TableHead><TableHead className="text-center">品名</TableHead>
                      <TableHead className="w-20 text-center">单位</TableHead><TableHead className="w-24 text-center">数量</TableHead>
                      <TableHead className="w-24 text-center">单价</TableHead><TableHead className="w-28 text-center">小计</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(viewDetail.items || []).length === 0 ? (
                      <TableRow><TableCell colSpan={6} className="h-16 text-center text-muted-foreground">无明细</TableCell></TableRow>
                    ) : viewDetail.items.map((it: any, idx: number) => (
                      <TableRow key={idx}>
                        <TableCell className="text-center text-muted-foreground">{idx + 1}</TableCell>
                        <TableCell className="text-center">{it.supply_name || ''}</TableCell>
                        <TableCell className="text-center">{it.unit}</TableCell>
                        <TableCell className="text-center">{Number(it.quantity).toFixed(2)}</TableCell>
                        <TableCell className="text-center">{fmt(it.unit_price)}</TableCell>
                        <TableCell className="font-medium text-center">{fmt(it.subtotal)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="flex items-center justify-between pt-2 border-t">
                <div className="text-sm">合计：<span className="font-bold text-red-600 text-base">{fmt(viewDetail.total_amount)}</span></div>
                <div className="flex gap-2">
                  <DialogClose asChild><Button variant="outline">关闭</Button></DialogClose>
                  <Button onClick={() => printPurchase(viewDetail)}><Printer className="mr-1 h-4 w-4" />打印</Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={confirm.open} onOpenChange={(v) => setConfirm({ open: v, target: confirm.target })}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader><DialogTitle>确认操作</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground py-2">删除采购单「{confirm.target?.order_no || ''}」？明细将一并删除。</p>
          <div className="flex justify-end gap-2">
            <DialogClose asChild><Button variant="outline">取消</Button></DialogClose>
            <Button variant="destructive" onClick={del}>确认删除</Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

// ---------- 其他费用录入（水电气自动计算 + 人工/维护手动） ----------
function ExpensePanel() {
  const [list, setList] = useState<any[]>([]);
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [people, setPeople] = useState(0); // 当月早餐+晚餐总人次（自动从每日收入累加）
  const [summary, setSummary] = useState<Record<string, number>>({});
  const [saving, setSaving] = useState(false);

  // 参数（可手动录入，默认值）
  const [params, setParams] = useState({
    water_per_capita: 25,   // 人均用水量 L/人
    water_price: 5.22,      // 自来水单价 元/吨
    elec_usage: 50,         // 用电量 度/天
    gas_usage: 40,          // 用气量 m³/天
    gas_price: 3.55,        // 天然气单价 元/m³
    labor: 0,               // 人工费（手动）
    maintenance: 0,         // 设备维护费（手动）
  });

  // 当月已过天数：所选月份==当前月 → 当前日（8.4 → 4 天），历史月份 → 整月天数
  const elapsedDays = (m: string) => {
    const [y, mo] = m.split('-').map(Number);
    const dim = new Date(y, mo, 0).getDate();
    const now = new Date();
    const isCur = now.getFullYear() === y && now.getMonth() + 1 === mo;
    return isCur ? Math.min(now.getDate(), dim) : dim;
  };
  const days = elapsedDays(month);

  // 水费 = 人均用水量(L→吨) × 当月用餐人次(早+晚) × 水单价
  const waterAmount = people * (params.water_per_capita / 1000) * params.water_price;
  // 电费 = 用电量 × 天数
  const elecAmount = params.elec_usage * days;
  // 气费 = 用气量 × 天数 × 气单价
  const gasAmount = params.gas_usage * days * params.gas_price;
  const laborAmount = Number(params.labor) || 0;
  const maintAmount = Number(params.maintenance) || 0;
  const total = waterAmount + elecAmount + gasAmount + laborAmount + maintAmount;

  const load = useCallback(async () => {
    try {
      const [r, inc] = await Promise.all([
        canteenApi.expenses.list({ month, limit: 200 }),
        canteenApi.income.list({ month, limit: 100 }),
      ]);
      setList(r.items);
      const s: Record<string, number> = {};
      for (const it of r.items) s[it.category] = (s[it.category] || 0) + Number(it.amount || 0);
      setSummary(s);
      // 用餐人次 = 早餐+晚餐 人次累加
      const p = (inc.items || []).reduce((acc: number, d: any) => acc + (Number(d.breakfast_count) || 0) + (Number(d.dinner_count) || 0), 0);
      setPeople(p);
      // 回显已保存参数（remark 存 JSON）
      const find = (cat: string) => r.items.find((e: any) => e.category === cat);
      const w = find('水费'), e = find('电费'), g = find('燃气费'), l = find('人工费'), m = find('设备维护费');
      const prs = (rec: any, dft: any) => { if (!rec?.remark) return dft; try { return { ...dft, ...JSON.parse(rec.remark) }; } catch { return dft; } };
      setParams((prev) => ({
        ...prs(w, prev), ...prs(e, prev), ...prs(g, prev),
        labor: l ? Number(l.amount) || 0 : prev.labor,
        maintenance: m ? Number(m.amount) || 0 : prev.maintenance,
      }));
    } catch (e: any) { showToast('加载失败', e.message, 'destructive'); }
  }, [month]);
  useEffect(() => { load(); }, [load]);

  const save = async () => {
    setSaving(true);
    try {
      const items = [
        { category: '水费', amount: waterAmount, remark: JSON.stringify({ water_per_capita: params.water_per_capita, water_price: params.water_price }) },
        { category: '电费', amount: elecAmount, remark: JSON.stringify({ elec_usage: params.elec_usage }) },
        { category: '燃气费', amount: gasAmount, remark: JSON.stringify({ gas_usage: params.gas_usage, gas_price: params.gas_price }) },
        { category: '人工费', amount: laborAmount, remark: '' },
        { category: '设备维护费', amount: maintAmount, remark: '' },
      ];
      await canteenApi.expenses.upsert({ month, items });
      showToast('✅ 已保存');
      load();
    } catch (e: any) { showToast('保存失败', e.message, 'destructive'); }
    finally { setSaving(false); }
  };

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">其他费用（水电气、人工费）</h3>
          <div className="flex gap-2 items-center">
            <Input type="month" className="h-8 w-36" value={month} onChange={(e) => setMonth(e.target.value)} />
            <Button size="sm" onClick={save} disabled={saving}>{saving ? '保存中…' : '保存'}</Button>
          </div>
        </div>
        {/* 汇总 */}
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="bg-blue-50 text-blue-700 rounded px-2 py-1">月费用合计 <b>{fmt(total)}</b></span>
          <span className="bg-slate-100 rounded px-2 py-1">用餐人次（早+晚）{people}</span>
          <span className="bg-slate-100 rounded px-2 py-1">计费天数 {days}</span>
        </div>
        <Table className="max-h-[45vh]">
          <TableHeader>
            <TableRow>
              <TableHead className="w-12 text-center">序号</TableHead><TableHead className="w-24 text-center">科目</TableHead>
              <TableHead className="text-center">计算参数</TableHead><TableHead className="w-36 text-center">计算式</TableHead>
              <TableHead className="w-28 text-center">金额</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {/* 水费 */}
            <TableRow>
              <TableCell className="text-center text-muted-foreground">1</TableCell>
              <TableCell className="font-medium text-center">水费</TableCell>
              <TableCell className="text-center">
                <span className="inline-flex items-center gap-1">
                  <Input type="number" className="h-7 w-20 text-center" value={params.water_per_capita || ''} onChange={(e) => setParams({ ...params, water_per_capita: parseFloat(e.target.value) || 0 })} />
                  <span className="text-xs text-muted-foreground">L/人 ×</span>
                  <Input type="number" className="h-7 w-20 text-center" value={params.water_price || ''} onChange={(e) => setParams({ ...params, water_price: parseFloat(e.target.value) || 0 })} />
                  <span className="text-xs text-muted-foreground">元/吨</span>
                </span>
              </TableCell>
              <TableCell className="text-center text-xs text-muted-foreground">{people}人次×{params.water_per_capita}L/1000×{params.water_price}元</TableCell>
              <TableCell className="font-medium text-blue-600 text-center">{fmt(waterAmount)}</TableCell>
            </TableRow>
            {/* 电费 */}
            <TableRow>
              <TableCell className="text-center text-muted-foreground">2</TableCell>
              <TableCell className="font-medium text-center">电费</TableCell>
              <TableCell className="text-center">
                <span className="inline-flex items-center gap-1">
                  <Input type="number" className="h-7 w-20 text-center" value={params.elec_usage || ''} onChange={(e) => setParams({ ...params, elec_usage: parseFloat(e.target.value) || 0 })} />
                  <span className="text-xs text-muted-foreground">度/天 × {days}天</span>
                </span>
              </TableCell>
              <TableCell className="text-center text-xs text-muted-foreground">{params.elec_usage}度×{days}天</TableCell>
              <TableCell className="font-medium text-blue-600 text-center">{fmt(elecAmount)}</TableCell>
            </TableRow>
            {/* 气费 */}
            <TableRow>
              <TableCell className="text-center text-muted-foreground">3</TableCell>
              <TableCell className="font-medium text-center">气费</TableCell>
              <TableCell className="text-center">
                <span className="inline-flex items-center gap-1">
                  <Input type="number" className="h-7 w-20 text-center" value={params.gas_usage || ''} onChange={(e) => setParams({ ...params, gas_usage: parseFloat(e.target.value) || 0 })} />
                  <span className="text-xs text-muted-foreground">m³/天 × {days}天 ×</span>
                  <Input type="number" className="h-7 w-20 text-center" value={params.gas_price || ''} onChange={(e) => setParams({ ...params, gas_price: parseFloat(e.target.value) || 0 })} />
                  <span className="text-xs text-muted-foreground">元/m³</span>
                </span>
              </TableCell>
              <TableCell className="text-center text-xs text-muted-foreground">{params.gas_usage}m³×{days}天×{params.gas_price}元</TableCell>
              <TableCell className="font-medium text-blue-600 text-center">{fmt(gasAmount)}</TableCell>
            </TableRow>
            {/* 人工费 */}
            <TableRow>
              <TableCell className="text-center text-muted-foreground">4</TableCell>
              <TableCell className="font-medium text-center">人工费</TableCell>
              <TableCell className="text-center">
                <Input type="number" className="h-7 w-32 text-center" value={params.labor || ''} onChange={(e) => setParams({ ...params, labor: parseFloat(e.target.value) || 0 })} />
              </TableCell>
              <TableCell className="text-center text-xs text-muted-foreground">手动录入</TableCell>
              <TableCell className="font-medium text-blue-600 text-center">{fmt(laborAmount)}</TableCell>
            </TableRow>
            {/* 设备维护费 */}
            <TableRow>
              <TableCell className="text-center text-muted-foreground">5</TableCell>
              <TableCell className="font-medium text-center">设备维护费</TableCell>
              <TableCell className="text-center">
                <Input type="number" className="h-7 w-32 text-center" value={params.maintenance || ''} onChange={(e) => setParams({ ...params, maintenance: parseFloat(e.target.value) || 0 })} />
              </TableCell>
              <TableCell className="text-center text-xs text-muted-foreground">手动录入</TableCell>
              <TableCell className="font-medium text-blue-600 text-center">{fmt(maintAmount)}</TableCell>
            </TableRow>
            {/* 合计行 */}
            <TableRow className="bg-slate-50">
              <TableCell className="text-center text-muted-foreground" colSpan={4}>合计</TableCell>
              <TableCell className="font-bold text-red-600 text-center">{fmt(total)}</TableCell>
            </TableRow>
          </TableBody>
        </Table>
        {/* 已保存记录（只读参考） */}
        {list.length > 0 && (
          <div className="text-xs text-muted-foreground flex flex-wrap gap-x-4 gap-y-1 border-t pt-2">
            {Object.entries(summary).map(([cat, amt]) => (
              <span key={cat}>{cat} {fmt(amt)}</span>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function PurchaseTab() {
  return (
    <Tabs defaultValue="purchase">
      <TabsList className="bg-slate-100 p-1 rounded-lg">
        <TabsTrigger value="purchase">食材采购</TabsTrigger>
        <TabsTrigger value="expense">其他费用</TabsTrigger>
      </TabsList>
      <TabsContent value="purchase"><PurchasePanel /></TabsContent>
      <TabsContent value="expense"><ExpensePanel /></TabsContent>
    </Tabs>
  );
}
