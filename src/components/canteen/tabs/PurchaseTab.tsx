import { useState, useEffect, useCallback } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { showToast } from '@/components/ui/toaster';
import { canteenApi } from '@/lib/api';
import { Plus, Pencil, Trash2, X, Download, Save } from 'lucide-react';

const fmt = (n: any) => `¥${Number(n || 0).toFixed(2)}`;

// ---------- 食材采购录入 ----------
function PurchasePanel() {
  const [list, setList] = useState<any[]>([]);
  const [supplies, setSupplies] = useState<any[]>([]);
  const [keyword, setKeyword] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 20;

  // 新建/编辑采购单
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState({
    purchase_date: new Date().toISOString().slice(0, 10),
    supplier_name: '', channel: '', actual_pay: 0, remark: '',
    items: [] as any[],
  });
  // 行内添加食材
  const [rowKeyword, setRowKeyword] = useState('');
  const [rowOpen, setRowOpen] = useState(false);
  const [confirm, setConfirm] = useState<{ open: boolean; target: any }>({ open: false, target: null });

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

  const openNew = () => {
    setEditId(null);
    setForm({ purchase_date: new Date().toISOString().slice(0, 10), supplier_name: '', channel: '', actual_pay: 0, remark: '', items: [] });
    setOpen(true); loadSupplies();
  };
  const openEdit = async (p: any) => {
    setEditId(p.id);
    try {
      const d = await canteenApi.purchases.get(p.id);
      setForm({
        purchase_date: d.purchase_date, supplier_name: d.supplier_name || '', channel: d.channel || '',
        actual_pay: d.actual_pay || 0, remark: d.remark || '',
        items: (d.items || []).map((i: any) => ({
          supply_id: i.supply_id, supply_name: i.supply_name, unit: i.unit,
          quantity: i.quantity, unit_price: i.unit_price, subtotal: i.subtotal,
        })),
      });
      setOpen(true); loadSupplies();
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
      if (editId) { await canteenApi.purchases.update(editId, { ...form }); showToast('✅ 已更新'); }
      else { await canteenApi.purchases.create({ ...form }); showToast('✅ 已保存'); }
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
              <TableHead className="w-12 text-center">序号</TableHead><TableHead>采购单号</TableHead>
              <TableHead className="w-28">日期</TableHead><TableHead>供应商</TableHead>
              <TableHead className="w-20">明细</TableHead><TableHead className="w-24">总金额</TableHead>
              <TableHead className="w-24">实支</TableHead><TableHead className="w-[100px] text-center">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {list.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="h-16 text-center text-muted-foreground">暂无采购单</TableCell></TableRow>
            ) : list.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="text-center text-muted-foreground">{p.id}</TableCell>
                <TableCell className="font-medium">{p.order_no}</TableCell>
                <TableCell>{p.purchase_date}</TableCell>
                <TableCell>{p.supplier_name || '-'}</TableCell>
                <TableCell className="text-center">{p.item_count} 项</TableCell>
                <TableCell className="text-right font-medium">{fmt(p.total_amount)}</TableCell>
                <TableCell className="text-right">{p.actual_pay ? fmt(p.actual_pay) : '-'}</TableCell>
                <TableCell className="text-center">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(p)}><Pencil className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => setConfirm({ open: true, target: p })}><Trash2 className="h-4 w-4 text-red-500" /></Button>
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
            <Input placeholder="供应商" value={form.supplier_name} onChange={(e) => setForm({ ...form, supplier_name: e.target.value })} />
            <Input placeholder="采购渠道" value={form.channel} onChange={(e) => setForm({ ...form, channel: e.target.value })} />
            <Input type="number" placeholder="实支金额" value={form.actual_pay || ''} onChange={(e) => setForm({ ...form, actual_pay: parseFloat(e.target.value) || 0 })} />
          </div>
          <div className="flex items-center gap-2">
            <Input placeholder="搜索食材添加…" value={rowKeyword} onChange={(e) => { setRowKeyword(e.target.value); setRowOpen(true); loadSupplies(e.target.value); }} />
            {rowOpen && (
              <div className="flex-1 max-h-40 overflow-y-auto border rounded-md p-1">
                {filteredSupplies.length === 0 ? <p className="text-xs text-muted-foreground p-2">无匹配食材，请先在「数据字典」中添加</p> :
                  filteredSupplies.map((s) => (
                    <div key={s.id} className="flex items-center justify-between px-2 py-1 hover:bg-slate-100 rounded cursor-pointer" onClick={() => addRow(s)}>
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
                  <TableHead className="w-12 text-center">序号</TableHead><TableHead>品名</TableHead>
                  <TableHead className="w-20">单位</TableHead><TableHead className="w-24">数量</TableHead>
                  <TableHead className="w-24">单价</TableHead><TableHead className="w-24">小计</TableHead>
                  <TableHead className="w-14"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {form.items.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="h-16 text-center text-muted-foreground">搜索上方添加食材</TableCell></TableRow>
                ) : form.items.map((it, idx) => (
                  <TableRow key={`${it.supply_id}-${idx}`}>
                    <TableCell className="text-center text-muted-foreground">{idx + 1}</TableCell>
                    <TableCell className="text-left">{it.supply_name}</TableCell>
                    <TableCell>{it.unit}</TableCell>
                    <TableCell><Input className="h-7 w-20 text-right" type="number" value={it.quantity} onChange={(e) => { const q = parseFloat(e.target.value) || 0; updateRow(idx, { quantity: q, subtotal: q * it.unit_price }); }} /></TableCell>
                    <TableCell><Input className="h-7 w-20 text-right" type="number" value={it.unit_price} onChange={(e) => { const p = parseFloat(e.target.value) || 0; updateRow(idx, { unit_price: p, subtotal: it.quantity * p }); }} /></TableCell>
                    <TableCell className="text-right font-medium">{fmt(it.subtotal)}</TableCell>
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

// ---------- 其他费用录入 ----------
function ExpensePanel() {
  const [list, setList] = useState<any[]>([]);
  const [cats, setCats] = useState<any[]>([]);
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [summary, setSummary] = useState<Record<string, number>>({});
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<any | null>(null);
  const [form, setForm] = useState({ expense_date: new Date().toISOString().slice(0, 10), category: '', amount: 0, remark: '' });
  const [confirm, setConfirm] = useState<{ open: boolean; target: any }>({ open: false, target: null });

  const load = useCallback(async () => {
    try {
      const [r, rc] = await Promise.all([canteenApi.expenses.list({ month }), canteenApi.expenseCategories.list()]);
      setList(r.items); setCats(rc.items);
      const s: Record<string, number> = {};
      for (const it of r.items) s[it.category] = (s[it.category] || 0) + Number(it.amount || 0);
      setSummary(s);
    } catch (e: any) { showToast('加载失败', e.message, 'destructive'); }
  }, [month]);
  useEffect(() => { load(); }, [load]);

  const total = Object.values(summary).reduce((a, b) => a + b, 0);

  const save = async () => {
    if (!form.expense_date || !form.category) { showToast('校验失败', '日期和科目不能为空', 'destructive'); return; }
    try {
      if (edit) { await canteenApi.expenses.update(edit.id, form); showToast('✅ 已更新'); }
      else { await canteenApi.expenses.create(form); showToast('✅ 已保存'); }
      setOpen(false); load();
    } catch (e: any) { showToast('保存失败', e.message, 'destructive'); }
  };
  const del = async () => {
    if (!confirm.target) return;
    try { await canteenApi.expenses.delete(confirm.target.id); showToast('✅ 已删除'); load(); }
    catch (e: any) { showToast('删除失败', e.message, 'destructive'); }
    finally { setConfirm({ open: false, target: null }); }
  };

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">其他费用（水电气、人工费）</h3>
          <div className="flex gap-2 items-center">
            <Input type="month" className="h-8 w-36" value={month} onChange={(e) => setMonth(e.target.value)} />
            <Button size="sm" onClick={() => { setEdit(null); setForm({ expense_date: `${month}-01`, category: cats[0]?.name || '', amount: 0, remark: '' }); setOpen(true); }}>
              <Plus className="mr-1 h-4 w-4" />新增
            </Button>
          </div>
        </div>
        {/* 月度汇总条 */}
        {Object.keys(summary).length > 0 && (
          <div className="flex flex-wrap gap-2">
            {Object.entries(summary).map(([k, v]) => (
              <span key={k} className="text-xs bg-slate-100 rounded px-2 py-1">{k}：<b className="text-red-600">{fmt(v)}</b></span>
            ))}
            <span className="text-xs bg-blue-50 text-blue-700 rounded px-2 py-1">合计：<b>{fmt(total)}</b></span>
          </div>
        )}
        <Table className="max-h-[45vh]">
          <TableHeader>
            <TableRow>
              <TableHead className="w-12 text-center">序号</TableHead><TableHead className="w-28">日期</TableHead>
              <TableHead className="w-28">科目</TableHead><TableHead className="w-24">金额</TableHead>
              <TableHead>备注</TableHead><TableHead className="w-[100px] text-center">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {list.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="h-16 text-center text-muted-foreground">本月暂无费用</TableCell></TableRow>
            ) : list.map((e) => (
              <TableRow key={e.id}>
                <TableCell className="text-center text-muted-foreground">{e.id}</TableCell>
                <TableCell>{e.expense_date}</TableCell>
                <TableCell>{e.category}</TableCell>
                <TableCell className="text-right font-medium">{fmt(e.amount)}</TableCell>
                <TableCell className="text-left max-w-[200px] truncate">{e.remark || '-'}</TableCell>
                <TableCell className="text-center">
                  <Button variant="ghost" size="icon" onClick={() => { setEdit(e); setForm({ expense_date: e.expense_date, category: e.category, amount: e.amount, remark: e.remark || '' }); setOpen(true); }}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => setConfirm({ open: true, target: e })}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader><DialogTitle>{edit ? '编辑费用' : '新增费用'}</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <Input type="date" value={form.expense_date} onChange={(e) => setForm({ ...form, expense_date: e.target.value })} />
            <select className="w-full h-9 rounded-md border px-2 text-sm" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
              <option value="">选择科目</option>
              {cats.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
            </select>
            <Input type="number" placeholder="金额" value={form.amount || ''} onChange={(e) => setForm({ ...form, amount: parseFloat(e.target.value) || 0 })} />
            <Input placeholder="备注" value={form.remark} onChange={(e) => setForm({ ...form, remark: e.target.value })} />
          </div>
          <div className="flex justify-end gap-2">
            <DialogClose asChild><Button variant="outline">取消</Button></DialogClose>
            <Button onClick={save}>保存</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={confirm.open} onOpenChange={(v) => setConfirm({ open: v, target: confirm.target })}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader><DialogTitle>确认操作</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground py-2">删除该费用记录？</p>
          <div className="flex justify-end gap-2">
            <DialogClose asChild><Button variant="outline">取消</Button></DialogClose>
            <Button variant="destructive" onClick={del}>确认删除</Button>
          </div>
        </DialogContent>
      </Dialog>
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
