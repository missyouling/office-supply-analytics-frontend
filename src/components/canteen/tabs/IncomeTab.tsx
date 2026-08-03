import { useState, useEffect, useCallback } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { showToast } from '@/components/ui/toaster';
import { canteenApi } from '@/lib/api';
import { Plus, Pencil, Trash2, Printer } from 'lucide-react';

const fmt = (n: any) => `¥${Number(n || 0).toFixed(2)}`;

// 资源占用费收取缘由
const FEE_REASONS = ['已报餐但未用餐', '未报餐而用餐', '未报餐未刷卡'];

// ---------- 每日收入 ----------
function IncomePanel() {
  const [list, setList] = useState<any[]>([]);
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState({
    income_date: new Date().toISOString().slice(0, 10),
    breakfast_count: 0, breakfast_amount: 0,
    lunch_count: 0, lunch_amount: 0,
    dinner_count: 0, dinner_amount: 0,
    remark: '',
  });
  const [confirm, setConfirm] = useState<{ open: boolean; target: any }>({ open: false, target: null });

  const load = useCallback(async () => {
    try {
      const r = await canteenApi.income.list({ month, limit: 100 });
      setList(r.items);
    } catch (e: any) { showToast('加载失败', e.message, 'destructive'); }
  }, [month]);
  useEffect(() => { load(); }, [load]);

  const totals = list.reduce((acc, d) => {
    acc.count += d.total_count || 0; acc.amount += d.total_amount || 0;
    acc.breakfast += d.breakfast_amount || 0; acc.lunch += d.lunch_amount || 0; acc.dinner += d.dinner_amount || 0;
    return acc;
  }, { count: 0, amount: 0, breakfast: 0, lunch: 0, dinner: 0 });

  const dayTotal = () => (form.breakfast_amount || 0) + (form.lunch_amount || 0) + (form.dinner_amount || 0);

  const openNew = () => {
    setEditId(null);
    setForm({ income_date: new Date().toISOString().slice(0, 10), breakfast_count: 0, breakfast_amount: 0, lunch_count: 0, lunch_amount: 0, dinner_count: 0, dinner_amount: 0, remark: '' });
    setOpen(true);
  };
  const openEdit = (d: any) => {
    setEditId(d.id);
    setForm({
      income_date: d.income_date, breakfast_count: d.breakfast_count, breakfast_amount: d.breakfast_amount,
      lunch_count: d.lunch_count, lunch_amount: d.lunch_amount, dinner_count: d.dinner_count, dinner_amount: d.dinner_amount,
      remark: d.remark || '',
    });
    setOpen(true);
  };

  const save = async () => {
    if (!form.income_date) { showToast('校验失败', '日期不能为空', 'destructive'); return; }
    try {
      await canteenApi.income.save({ ...form });
      showToast('✅ 已保存');
      setOpen(false); load();
    } catch (e: any) { showToast('保存失败', e.message, 'destructive'); }
  };
  const del = async () => {
    if (!confirm.target) return;
    try { await canteenApi.income.delete(confirm.target.id); showToast('✅ 已删除'); load(); }
    catch (e: any) { showToast('删除失败', e.message, 'destructive'); }
    finally { setConfirm({ open: false, target: null }); }
  };

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">每日刷卡收入</h3>
          <div className="flex gap-2 items-center">
            <Input type="month" className="h-8 w-36" value={month} onChange={(e) => setMonth(e.target.value)} />
            <Button size="sm" onClick={openNew}><Plus className="mr-1 h-4 w-4" />新增</Button>
          </div>
        </div>
        {/* 月度汇总 */}
        {list.length > 0 && (
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="bg-blue-50 text-blue-700 rounded px-2 py-1">月收入 <b>{fmt(totals.amount)}</b></span>
            <span className="bg-slate-100 rounded px-2 py-1">早餐 {fmt(totals.breakfast)}</span>
            <span className="bg-slate-100 rounded px-2 py-1">午餐 {fmt(totals.lunch)}</span>
            <span className="bg-slate-100 rounded px-2 py-1">晚餐 {fmt(totals.dinner)}</span>
            <span className="bg-slate-100 rounded px-2 py-1">总人次 {totals.count}</span>
          </div>
        )}
        <Table className="max-h-[45vh]">
          <TableHeader>
            <TableRow>
              <TableHead className="w-12 text-center">序号</TableHead><TableHead className="w-28">日期</TableHead>
              <TableHead className="w-20">早餐(次)</TableHead><TableHead className="w-24">早餐(元)</TableHead>
              <TableHead className="w-20">午餐(次)</TableHead><TableHead className="w-24">午餐(元)</TableHead>
              <TableHead className="w-20">晚餐(次)</TableHead><TableHead className="w-24">晚餐(元)</TableHead>
              <TableHead className="w-24">总人次</TableHead><TableHead className="w-24">总收入</TableHead>
              <TableHead className="w-[100px] text-center">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {list.length === 0 ? (
              <TableRow><TableCell colSpan={11} className="h-16 text-center text-muted-foreground">本月暂无收入记录</TableCell></TableRow>
            ) : list.map((d) => (
              <TableRow key={d.id}>
                <TableCell className="text-center text-muted-foreground">{d.id}</TableCell>
                <TableCell>{d.income_date}</TableCell>
                <TableCell>{d.breakfast_count}</TableCell>
                <TableCell className="text-right">{fmt(d.breakfast_amount)}</TableCell>
                <TableCell>{d.lunch_count}</TableCell>
                <TableCell className="text-right">{fmt(d.lunch_amount)}</TableCell>
                <TableCell>{d.dinner_count}</TableCell>
                <TableCell className="text-right">{fmt(d.dinner_amount)}</TableCell>
                <TableCell className="text-center">{d.total_count}</TableCell>
                <TableCell className="text-right font-medium text-red-600">{fmt(d.total_amount)}</TableCell>
                <TableCell className="text-center">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(d)}><Pencil className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => setConfirm({ open: true, target: d })}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader><DialogTitle>{editId ? '编辑收入' : '新增收入'}</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <Input type="date" value={form.income_date} onChange={(e) => setForm({ ...form, income_date: e.target.value })} />
            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">早餐次数</label>
                <Input type="number" value={form.breakfast_count || ''} onChange={(e) => setForm({ ...form, breakfast_count: parseInt(e.target.value) || 0 })} />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">早餐金额</label>
                <Input type="number" value={form.breakfast_amount || ''} onChange={(e) => setForm({ ...form, breakfast_amount: parseFloat(e.target.value) || 0 })} />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">午餐次数</label>
                <Input type="number" value={form.lunch_count || ''} onChange={(e) => setForm({ ...form, lunch_count: parseInt(e.target.value) || 0 })} />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">午餐金额</label>
                <Input type="number" value={form.lunch_amount || ''} onChange={(e) => setForm({ ...form, lunch_amount: parseFloat(e.target.value) || 0 })} />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">晚餐次数</label>
                <Input type="number" value={form.dinner_count || ''} onChange={(e) => setForm({ ...form, dinner_count: parseInt(e.target.value) || 0 })} />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">晚餐金额</label>
                <Input type="number" value={form.dinner_amount || ''} onChange={(e) => setForm({ ...form, dinner_amount: parseFloat(e.target.value) || 0 })} />
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm bg-blue-50 rounded p-2">
              <span className="text-muted-foreground">当日总收入：</span>
              <span className="font-bold text-red-600">{fmt(dayTotal())}</span>
            </div>
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
          <p className="text-sm text-muted-foreground py-2">删除 {confirm.target?.income_date || ''} 的收入记录？</p>
          <div className="flex justify-end gap-2">
            <DialogClose asChild><Button variant="outline">取消</Button></DialogClose>
            <Button variant="destructive" onClick={del}>确认删除</Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

// ---------- 资源占用费 ----------
function ResourceFeePanel() {
  const [list, setList] = useState<any[]>([]);
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [summary, setSummary] = useState<any>({ summary: [], detail: [], total: 0 });
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<any | null>(null);
  const [form, setForm] = useState({ fee_date: new Date().toISOString().slice(0, 10), meal_type: '午餐', amount: 0, payer: '', reason: FEE_REASONS[0], remark: '', handler: '' });
  const [confirm, setConfirm] = useState<{ open: boolean; target: any }>({ open: false, target: null });

  const load = useCallback(async () => {
    try {
      const [r, s] = await Promise.all([
        canteenApi.resourceFees.list({ month, limit: 200 }),
        canteenApi.resourceFees.summary(month),
      ]);
      setList(r.items); setSummary(s);
    } catch (e: any) { showToast('加载失败', e.message, 'destructive'); }
  }, [month]);
  useEffect(() => { load(); }, [load]);

  const save = async () => {
    if (!form.fee_date || !form.payer.trim()) { showToast('校验失败', '日期和缴费人不能为空', 'destructive'); return; }
    try {
      if (edit) { await canteenApi.resourceFees.update(edit.id, form); showToast('✅ 已更新'); }
      else { await canteenApi.resourceFees.create(form); showToast('✅ 已保存'); }
      setOpen(false); load();
    } catch (e: any) { showToast('保存失败', e.message, 'destructive'); }
  };
  const del = async () => {
    if (!confirm.target) return;
    try { await canteenApi.resourceFees.delete(confirm.target.id); showToast('✅ 已删除'); load(); }
    catch (e: any) { showToast('删除失败', e.message, 'destructive'); }
    finally { setConfirm({ open: false, target: null }); }
  };

  const printPreview = () => {
    const rows = summary.detail.map((r: any, i: number) => `
      <tr${i % 2 === 0 ? ' class="even"' : ''}>
        <td>${i + 1}</td><td>${r.fee_date}</td><td>资源占用费</td><td>${r.meal_type}</td>
        <td class="num">${Number(r.amount).toFixed(2)}</td><td>${r.payer}</td><td>${r.reason || ''}</td><td>${r.remark || ''}</td><td>${r.handler || ''}</td>
      </tr>`).join('');
    const mergedRows = summary.summary.map((s: any, i: number) => `
      <tr${i % 2 === 0 ? ' class="even"' : ''}>
        <td>${i + 1}</td><td>${s.payer}</td><td class="num">${s.times} 次</td><td class="num">${Number(s.total_amount).toFixed(2)}</td><td>${s.reasons || ''}</td>
      </tr>`).join('');
    const html = `<!doctype html>
<html><head><meta charset="utf-8"><title>资源占用费月度统计 ${month}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:"Microsoft YaHei","PingFang SC","Noto Sans SC",sans-serif;padding:40px 50px;color:#333;font-size:14px}
h1{font-size:24px;margin-bottom:6px}
h2{font-size:16px;margin:24px 0 10px;color:#1e40af}
.meta{color:#666;font-size:13px;margin-bottom:20px}
table{width:100%;border-collapse:collapse;margin-bottom:24px}
th{background:#1e40af;color:#fff;padding:8px 6px;text-align:center;font-size:13px}
td{padding:7px 6px;border-bottom:1px solid #e5e7eb;font-size:13px;text-align:center}
tr.even td{background:#f8fafc}
.num{text-align:right;font-family:"Courier New",monospace}
.total{font-size:16px;font-weight:bold;color:#dc2626;text-align:right;margin-top:10px}
@media print{body{padding:20px 30px}th{background:#1e40af!important;-webkit-print-color-adjust:exact;print-color-adjust:exact}}
</style></head><body>
<h1>🍚 资源占用费月度统计表</h1>
<div class="meta">统计月份：${month}　|　合计：<b>${Number(summary.total).toFixed(2)} 元</b>　|　打印时间：${new Date().toLocaleString('zh-CN')}</div>
<h2>一、按人汇总</h2>
<table><thead><tr><th style="width:40px">序号</th><th>缴费人</th><th>次数</th><th>合计金额</th><th>收取缘由</th></tr></thead><tbody>${mergedRows}</tbody></table>
<div class="total">应收合计：${Number(summary.total).toFixed(2)} 元</div>
<h2>二、明细记录</h2>
<table><thead><tr><th style="width:40px">序号</th><th>收取日期</th><th>费用项目</th><th>餐别</th><th>金额</th><th>缴费个人</th><th>理由</th><th>备注</th><th>经办人</th></tr></thead><tbody>${rows}</tbody></table>
<script>setTimeout(()=>window.print(),300)</script>
</body></html>`;
    const w = window.open('', '_blank');
    if (!w) { showToast('浏览器拦截了打印窗口', '', 'destructive'); return; }
    w.document.write(html);
    w.document.close();
  };

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">资源占用费收取</h3>
          <div className="flex gap-2 items-center">
            <Input type="month" className="h-8 w-36" value={month} onChange={(e) => setMonth(e.target.value)} />
            <Button size="sm" variant="outline" onClick={printPreview} disabled={summary.detail.length === 0}>
              <Printer className="mr-1 h-4 w-4" />打印
            </Button>
            <Button size="sm" onClick={() => { setEdit(null); setForm({ fee_date: new Date().toISOString().slice(0, 10), meal_type: '午餐', amount: 0, payer: '', reason: FEE_REASONS[0], remark: '', handler: '' }); setOpen(true); }}>
              <Plus className="mr-1 h-4 w-4" />新增
            </Button>
          </div>
        </div>
        {summary.summary.length > 0 && (
          <div className="flex flex-wrap gap-2 text-xs">
            {summary.summary.map((s: any) => (
              <span key={s.payer} className="bg-orange-50 text-orange-700 rounded px-2 py-1">{s.payer}：{fmt(s.total_amount)}（{s.times}次）</span>
            ))}
            <span className="bg-blue-50 text-blue-700 rounded px-2 py-1">合计 <b>{fmt(summary.total)}</b></span>
          </div>
        )}
        <Table className="max-h-[45vh]">
          <TableHeader>
            <TableRow>
              <TableHead className="w-12 text-center">序号</TableHead><TableHead className="w-28">收取日期</TableHead>
              <TableHead className="w-20">餐别</TableHead><TableHead className="w-24">金额</TableHead>
              <TableHead className="w-24">缴费个人</TableHead><TableHead className="w-32">理由</TableHead>
              <TableHead className="w-24">经办人</TableHead><TableHead>备注</TableHead>
              <TableHead className="w-[100px] text-center">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {list.length === 0 ? (
              <TableRow><TableCell colSpan={9} className="h-16 text-center text-muted-foreground">本月暂无记录</TableCell></TableRow>
            ) : list.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="text-center text-muted-foreground">{r.id}</TableCell>
                <TableCell>{r.fee_date}</TableCell>
                <TableCell>{r.meal_type}</TableCell>
                <TableCell className="text-right font-medium text-orange-600">{fmt(r.amount)}</TableCell>
                <TableCell>{r.payer}</TableCell>
                <TableCell>{r.reason || '-'}</TableCell>
                <TableCell>{r.handler || '-'}</TableCell>
                <TableCell className="text-left max-w-[150px] truncate">{r.remark || '-'}</TableCell>
                <TableCell className="text-center">
                  <Button variant="ghost" size="icon" onClick={() => { setEdit(r); setForm({ fee_date: r.fee_date, meal_type: r.meal_type, amount: r.amount, payer: r.payer, reason: r.reason || FEE_REASONS[0], remark: r.remark || '', handler: r.handler || '' }); setOpen(true); }}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => setConfirm({ open: true, target: r })}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader><DialogTitle>{edit ? '编辑记录' : '新增记录'}</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div className="grid grid-cols-2 gap-2">
              <Input type="date" value={form.fee_date} onChange={(e) => setForm({ ...form, fee_date: e.target.value })} />
              <select className="h-9 rounded-md border px-2 text-sm" value={form.meal_type} onChange={(e) => setForm({ ...form, meal_type: e.target.value })}>
                <option value="午餐">午餐</option><option value="晚餐">晚餐</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Input type="number" placeholder="金额" value={form.amount || ''} onChange={(e) => setForm({ ...form, amount: parseFloat(e.target.value) || 0 })} />
              <Input placeholder="缴费个人" value={form.payer} onChange={(e) => setForm({ ...form, payer: e.target.value })} />
            </div>
            <select className="w-full h-9 rounded-md border px-2 text-sm" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })}>
              {FEE_REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
            <div className="grid grid-cols-2 gap-2">
              <Input placeholder="经办人" value={form.handler} onChange={(e) => setForm({ ...form, handler: e.target.value })} />
              <Input placeholder="备注" value={form.remark} onChange={(e) => setForm({ ...form, remark: e.target.value })} />
            </div>
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
          <p className="text-sm text-muted-foreground py-2">删除 {confirm.target?.payer || ''} 的这笔资源占用费记录？</p>
          <div className="flex justify-end gap-2">
            <DialogClose asChild><Button variant="outline">取消</Button></DialogClose>
            <Button variant="destructive" onClick={del}>确认删除</Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

export default function IncomeTab() {
  return (
    <Tabs defaultValue="income">
      <TabsList className="bg-slate-100 p-1 rounded-lg">
        <TabsTrigger value="income">每日收入</TabsTrigger>
        <TabsTrigger value="resource">资源占用费</TabsTrigger>
      </TabsList>
      <TabsContent value="income"><IncomePanel /></TabsContent>
      <TabsContent value="resource"><ResourceFeePanel /></TabsContent>
    </Tabs>
  );
}
