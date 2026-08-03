import { useState, useEffect, useCallback, useRef } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { showToast } from '@/components/ui/toaster';
import { canteenApi } from '@/lib/api';
import { Plus, Pencil, Trash2, Printer, Upload, X, Eye } from 'lucide-react';

const fmt = (n: any) => `¥${Number(n || 0).toFixed(2)}`;

// 资源占用费收取缘由
const FEE_REASONS = ['已报餐但未用餐', '未报餐而用餐', '未报餐未刷卡'];

// ---------- CSV 解析（刷卡机个人餐别统计）----------
// 表头示例：工号,姓名,卡号,部门编号,部门名称,早餐|次数,早餐|金额,中餐|次数,中餐|金额,晚餐|次数,晚餐|金额,餐外消费|次数,餐外消费|金额,合计次数,合计金额
// 数据行：每人一行；末行"汇总:"跳过
function parseMealCsv(text: string): { breakfast_count: number; breakfast_amount: number; lunch_count: number; lunch_amount: number; dinner_count: number; dinner_amount: number; people: number } | null {
  // 简单 CSV 解析（支持双引号包裹、逗号分隔）
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return null;
  const parseLine = (line: string): string[] => {
    const out: string[] = [];
    let cur = ''; let inQ = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQ && line[i + 1] === '"') { cur += '"'; i++; }
        else inQ = !inQ;
      } else if (ch === ',' && !inQ) { out.push(cur); cur = ''; }
      else cur += ch;
    }
    out.push(cur);
    return out.map((s) => s.trim().replace(/^"|"$/g, ''));
  };

  const header = parseLine(lines[0]).map((h) => h.toLowerCase());
  // 按表头名识别列（兼容 早餐|次数 / 早餐次数 / 早餐 次数 等）
  const findCol = (meal: string, type: '次数' | '金额'): number => {
    const idx = header.findIndex((h) => h.includes(meal) && h.includes(type));
    return idx;
  };
  const bCnt = findCol('早餐', '次数'), bAmt = findCol('早餐', '金额');
  const lCnt = findCol('中餐', '次数'), lAmt = findCol('中餐', '金额');
  const dCnt = findCol('晚餐', '次数'), dAmt = findCol('晚餐', '金额');
  if (bCnt < 0 || lCnt < 0 || dCnt < 0) return null;

  const num = (v: string): number => {
    const n = parseFloat(String(v || '').replace(/[￥¥,\s]/g, ''));
    return isNaN(n) ? 0 : n;
  };

  let breakfast_count = 0, breakfast_amount = 0;
  let lunch_count = 0, lunch_amount = 0;
  let dinner_count = 0, dinner_amount = 0;
  let people = 0;
  for (let i = 1; i < lines.length; i++) {
    const cols = parseLine(lines[i]);
    const first = cols[0] || '';
    // 跳过汇总/合计行
    if (/汇总|合计|总计|小计/.test(first)) continue;
    if (!/^\d/.test(first)) continue;
    people++;
    breakfast_count += num(cols[bCnt]);
    breakfast_amount += num(cols[bAmt]);
    lunch_count += num(cols[lCnt]);
    lunch_amount += num(cols[lAmt]);
    dinner_count += num(cols[dCnt]);
    dinner_amount += num(cols[dAmt]);
  }
  if (people === 0) return null;
  return { breakfast_count, breakfast_amount, lunch_count, lunch_amount, dinner_count, dinner_amount, people };
}

async function readCsvFile(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  // 优先 UTF-8，若出现替换字符则尝试 GBK（刷卡机导出常见 GBK）
  try {
    const utf8 = new TextDecoder('utf-8', { fatal: true }).decode(buf);
    return utf8;
  } catch {
    try {
      return new TextDecoder('gbk').decode(buf);
    } catch {
      return new TextDecoder('utf-8', { fatal: false }).decode(buf);
    }
  }
}

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

  // ===== CSV 导入 =====
  const [importOpen, setImportOpen] = useState(false);
  const [importDate, setImportDate] = useState(new Date().toISOString().slice(0, 10));
  const [fileName, setFileName] = useState('');
  const [parsed, setParsed] = useState<any>(null);
  const [importing, setImporting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = async (f: File | undefined | null) => {
    if (!f) return;
    setFileName(f.name); setParsed(null);
    try {
      const text = await readCsvFile(f);
      const r = parseMealCsv(text);
      if (!r) { showToast('解析失败', '未识别到早餐/中餐/晚餐列，请确认是餐别统计导出文件', 'destructive'); return; }
      setParsed(r);
    } catch (e: any) { showToast('读取失败', e.message, 'destructive'); }
  };

  const doImport = async () => {
    if (!parsed || !importDate) return;
    setImporting(true);
    try {
      await canteenApi.income.save({
        income_date: importDate,
        breakfast_count: parsed.breakfast_count, breakfast_amount: parsed.breakfast_amount,
        lunch_count: parsed.lunch_count, lunch_amount: parsed.lunch_amount,
        dinner_count: parsed.dinner_count, dinner_amount: parsed.dinner_amount,
        remark: `CSV导入(${fileName})`,
      });
      showToast(`✅ 已导入 ${parsed.people} 人数据到 ${importDate}`);
      setImportOpen(false); setParsed(null); setFileName('');
      setMonth(importDate.slice(0, 7)); load();
    } catch (e: any) { showToast('导入失败', e.message, 'destructive'); }
    finally { setImporting(false); }
  };

  // ===== 查看/打印 =====
  const [viewOpen, setViewOpen] = useState(false);
  const [viewItem, setViewItem] = useState<any>(null);

  const viewIncome = (d: any) => { setViewItem(d); setViewOpen(true); };

  const printIncome = (d: any) => {
    const html = `<!doctype html>
<html><head><meta charset="utf-8"><title>食堂每日收入 ${d.income_date}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:"Microsoft YaHei","PingFang SC","Noto Sans SC",sans-serif;padding:40px 50px;color:#333;font-size:14px}
h1{font-size:24px;margin-bottom:6px}
.meta{color:#666;font-size:13px;margin-bottom:20px;display:flex;justify-content:space-between}
table{width:100%;border-collapse:collapse;margin-bottom:24px}
th{background:#1e40af;color:#fff;padding:8px 6px;text-align:center;font-size:13px}
td{padding:8px 6px;border-bottom:1px solid #e5e7eb;font-size:14px;text-align:center}
tr.even td{background:#f8fafc}
.num{text-align:right;font-family:"Courier New",monospace}
.total{font-size:18px;font-weight:bold;color:#dc2626;text-align:right}
@media print{body{padding:20px 30px}th{background:#1e40af!important;-webkit-print-color-adjust:exact;print-color-adjust:exact}}
</style></head><body>
<h1>🍚 食堂每日收入统计</h1>
<div class="meta"><span><strong>日期：</strong>${d.income_date}</span><span><strong>打印时间：</strong>${new Date().toLocaleString('zh-CN')}</span></div>
<table><thead><tr><th>餐别</th><th>次数</th><th>金额</th></tr></thead><tbody>
<tr><td>早餐</td><td>${d.breakfast_count}</td><td class="num">¥${Number(d.breakfast_amount).toFixed(2)}</td></tr>
<tr class="even"><td>午餐</td><td>${d.lunch_count}</td><td class="num">¥${Number(d.lunch_amount).toFixed(2)}</td></tr>
<tr><td>晚餐</td><td>${d.dinner_count}</td><td class="num">¥${Number(d.dinner_amount).toFixed(2)}</td></tr>
</tbody></table>
<div class="total">总人次：${d.total_count}　总收入：¥${Number(d.total_amount).toFixed(2)}</div>
${d.remark ? `<p style="margin-top:20px;color:#666;font-size:13px">备注：${d.remark}</p>` : ''}
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
          <h3 className="text-sm font-semibold">每日刷卡收入</h3>
          <div className="flex gap-2 items-center">
            <Input type="month" className="h-8 w-36" value={month} onChange={(e) => setMonth(e.target.value)} />
            <Button size="sm" variant="outline" onClick={() => { setImportDate(new Date().toISOString().slice(0, 10)); setFileName(''); setParsed(null); setImportOpen(true); }}>
              <Upload className="mr-1 h-4 w-4" />导入
            </Button>
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
              <TableHead className="w-[150px] text-center">操作</TableHead>
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
                  <Button variant="ghost" size="icon" title="查看" onClick={() => viewIncome(d)}><Eye className="h-4 w-4 text-blue-600" /></Button>
                  <Button variant="ghost" size="icon" title="打印预览" onClick={() => printIncome(d)}><Printer className="h-4 w-4 text-green-600" /></Button>
                  <Button variant="ghost" size="icon" title="编辑" onClick={() => openEdit(d)}><Pencil className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" title="删除" onClick={() => setConfirm({ open: true, target: d })}><Trash2 className="h-4 w-4 text-red-500" /></Button>
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

      {/* CSV 导入弹窗 */}
      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader><DialogTitle>导入餐别统计</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">统计日期（该日期的早/中/晚收入）</label>
              <Input type="date" value={importDate} onChange={(e) => setImportDate(e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">选择刷卡机导出的「个人餐别统计」CSV 文件（支持 GBK/UTF-8）</label>
              <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => handleFile(e.target.files?.[0])} />
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={() => fileRef.current?.click()}>
                  <Upload className="mr-1 h-4 w-4" />选择文件
                </Button>
                {fileName && (
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    {fileName}
                    <button className="text-red-500 hover:text-red-700" onClick={() => { setFileName(''); setParsed(null); }}><X className="h-3 w-3" /></button>
                  </span>
                )}
              </div>
            </div>
            {parsed && (
              <div className="rounded-md border bg-slate-50 p-3 space-y-1.5 text-sm">
                <p className="font-medium">解析结果：{parsed.people} 人</p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                  <span>早餐：{parsed.breakfast_count} 次 / {fmt(parsed.breakfast_amount)}</span>
                  <span>午餐：{parsed.lunch_count} 次 / {fmt(parsed.lunch_amount)}</span>
                  <span>晚餐：{parsed.dinner_count} 次 / {fmt(parsed.dinner_amount)}</span>
                  <span className="text-blue-700 font-medium">总人次 {parsed.breakfast_count + parsed.lunch_count + parsed.dinner_count} / 总额 {fmt(parsed.breakfast_amount + parsed.lunch_amount + parsed.dinner_amount)}</span>
                </div>
                <p className="text-[11px] text-muted-foreground">将写入 {importDate}（如该日期已有数据将被覆盖）</p>
              </div>
            )}
          </div>
          <div className="flex justify-end gap-2">
            <DialogClose asChild><Button variant="outline">取消</Button></DialogClose>
            <Button onClick={doImport} disabled={!parsed || importing}>{importing ? '导入中…' : '确认导入'}</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 收入详情弹窗 */}
      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader><DialogTitle>收入详情 {viewItem?.income_date || ''}</DialogTitle></DialogHeader>
          {viewItem && (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>餐别</TableHead><TableHead>次数</TableHead><TableHead>金额</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow><TableCell>早餐</TableCell><TableCell>{viewItem.breakfast_count}</TableCell><TableCell className="text-right">{fmt(viewItem.breakfast_amount)}</TableCell></TableRow>
                  <TableRow><TableCell>午餐</TableCell><TableCell>{viewItem.lunch_count}</TableCell><TableCell className="text-right">{fmt(viewItem.lunch_amount)}</TableCell></TableRow>
                  <TableRow><TableCell>晚餐</TableCell><TableCell>{viewItem.dinner_count}</TableCell><TableCell className="text-right">{fmt(viewItem.dinner_amount)}</TableCell></TableRow>
                </TableBody>
              </Table>
              <div className="flex items-center justify-between pt-2 border-t">
                <div className="text-sm">总人次 <b>{viewItem.total_count}</b>　总收入 <b className="text-red-600">{fmt(viewItem.total_amount)}</b></div>
                <div className="flex gap-2">
                  <DialogClose asChild><Button variant="outline">关闭</Button></DialogClose>
                  <Button onClick={() => printIncome(viewItem)}><Printer className="mr-1 h-4 w-4" />打印预览</Button>
                </div>
              </div>
              {viewItem.remark && <p className="text-xs text-muted-foreground mt-1">备注：{viewItem.remark}</p>}
            </>
          )}
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

// ---------- 饭卡充值 ----------
const RECHARGE_FIELDS: { key: string; label: string; required?: boolean; hint?: string }[] = [
  { key: 'external_sn', label: '外部编号', required: true, hint: '卡流水号' },
  { key: 'user_name', label: '姓名', required: true },
  { key: 'user_id', label: '工号' },
  { key: 'user_department', label: '部门名称' },
  { key: 'department_code', label: '部门编号' },
  { key: 'recharge_date', label: '充值日期', required: true, hint: '自动取日期部分' },
  { key: 'amount', label: '充值金额', required: true, hint: '自动去除￥' },
  { key: 'payment_method', label: '支付方式', hint: '默认现金' },
  { key: 'operator', label: '操作员', hint: '默认导入' },
  { key: 'card_no', label: '卡号' },
  { key: 'balance_recorded', label: '卡余额' },
  { key: 'machine_no', label: '机号' },
  { key: 'bill_no', label: '账单号' },
  { key: 'remark', label: '备注' },
];

function RechargePanel() {
  const [list, setList] = useState<any[]>([]);
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [keyword, setKeyword] = useState('');
  const [summary, setSummary] = useState<any>({ total: 0, count: 0, people: 0 });
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 20;
  const [confirm, setConfirm] = useState<{ open: boolean; target: any }>({ open: false, target: null });

  // 导入
  const [importOpen, setImportOpen] = useState(false);
  const [fileName, setFileName] = useState('');
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvPreview, setCsvPreview] = useState<string[][]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [mode, setMode] = useState<'upsert' | 'skip'>('upsert');
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<any>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    try {
      const [r, s] = await Promise.all([
        canteenApi.recharges.list({ month, keyword, page, limit }),
        canteenApi.recharges.summary(month),
      ]);
      setList(r.items); setTotal(r.total); setSummary(s);
    } catch (e: any) { showToast('加载失败', e.message, 'destructive'); }
  }, [month, keyword, page]);
  useEffect(() => { load(); }, [load]);

  const del = async () => {
    if (!confirm.target) return;
    try { await canteenApi.recharges.delete(confirm.target.id); showToast('✅ 已删除'); load(); }
    catch (e: any) { showToast('删除失败', e.message, 'destructive'); }
    finally { setConfirm({ open: false, target: null }); }
  };

  // 解析 CSV 头部 + 预览（GBK/UTF-8）
  const handleFile = async (f: File | undefined | null) => {
    if (!f) return;
    setFileName(f.name); setResult(null);
    try {
      const buf = await f.arrayBuffer();
      let text = '';
      try { text = new TextDecoder('utf-8', { fatal: true }).decode(buf); }
      catch { try { text = new TextDecoder('gbk').decode(buf); } catch { text = new TextDecoder('utf-8', { fatal: false }).decode(buf); } }
      if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);
      const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
      if (lines.length < 2) { showToast('解析失败', 'CSV 数据不足', 'destructive'); return; }
      const parseLine = (line: string): string[] => {
        const out: string[] = []; let cur = ''; let inQ = false;
        for (let i = 0; i < line.length; i++) {
          const ch = line[i];
          if (ch === '"') { if (inQ && line[i + 1] === '"') { cur += '"'; i++; } else inQ = !inQ; }
          else if (ch === ',' && !inQ) { out.push(cur); cur = ''; }
          else cur += ch;
        }
        out.push(cur);
        return out.map((s) => s.trim().replace(/^"|"$/g, ''));
      };
      const header = parseLine(lines[0]);
      const preview = lines.slice(1, 6).map(parseLine);
      setCsvHeaders(header);
      setCsvPreview(preview);
      // 智能匹配映射
      const norm = (h: string) => h.replace(/[|｜]/g, '').replace(/\s+/g, '').toLowerCase();
      const headerNorm = header.map(norm);
      const auto = (targets: string[]) => {
        for (const t of targets) {
          const idx = headerNorm.findIndex((h) => h.includes(t));
          if (idx >= 0) return header[idx];
        }
        return '';
      };
      setMapping({
        external_sn: auto(['卡流水号', '流水号', 'externalsn']),
        user_name: auto(['姓名', '用户名', 'username']),
        user_id: auto(['工号', 'userid']),
        user_department: auto(['部门名称', '部门', 'department']),
        department_code: auto(['部门编号', 'departmentcode']),
        recharge_date: auto(['充值时间', '充值日期', '时间', 'rechargedate']),
        amount: auto(['充值金额', '金额', 'amount']),
        payment_method: auto(['类型', '支付方式', 'paymentmethod']),
        operator: auto(['操作员', 'operator']),
        card_no: auto(['卡号', 'cardno']),
        balance_recorded: auto(['卡余额', '余额', 'balance']),
        machine_no: auto(['机号', 'machineno']),
        bill_no: auto(['账单号', 'billno']),
        remark: '',
      });
    } catch (e: any) { showToast('读取失败', e.message, 'destructive'); }
  };

  const doImport = async () => {
    if (!fileRef.current?.files?.[0]) { showToast('请选择文件', '', 'destructive'); return; }
    setImporting(true);
    try {
      const r = await canteenApi.recharges.importCsv(fileRef.current.files[0], mode, mapping);
      if (r.ok && r.data) setResult(r.data);
      else showToast('导入失败', r.error || '未知错误', 'destructive');
      load();
    } catch (e: any) { showToast('导入失败', e.message, 'destructive'); }
    finally { setImporting(false); }
  };

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">饭卡充值记录</h3>
          <div className="flex gap-2 items-center">
            <Input type="month" className="h-8 w-36" value={month} onChange={(e) => setMonth(e.target.value)} />
            <Input className="h-8 w-36" placeholder="搜索姓名/工号/卡号" value={keyword} onChange={(e) => { setKeyword(e.target.value); setPage(1); }} />
            <Button size="sm" variant="outline" onClick={() => { setFileName(''); setCsvHeaders([]); setCsvPreview([]); setResult(null); setImportOpen(true); }}>
              <Upload className="mr-1 h-4 w-4" />导入CSV
            </Button>
          </div>
        </div>
        {(summary.count > 0 || list.length > 0) && (
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="bg-blue-50 text-blue-700 rounded px-2 py-1">月充值 <b>{fmt(summary.total)}</b></span>
            <span className="bg-slate-100 rounded px-2 py-1">{summary.count} 笔</span>
            <span className="bg-slate-100 rounded px-2 py-1">{summary.people} 人</span>
          </div>
        )}
        <Table className="max-h-[45vh]">
          <TableHeader>
            <TableRow>
              <TableHead className="w-12 text-center">序号</TableHead><TableHead>姓名</TableHead>
              <TableHead className="w-24">工号</TableHead><TableHead className="w-24">卡号</TableHead>
              <TableHead className="w-20">流水号</TableHead><TableHead className="w-28">充值日期</TableHead>
              <TableHead className="w-24">金额</TableHead><TableHead className="w-24">余额</TableHead>
              <TableHead className="w-24">方式</TableHead><TableHead className="w-20">操作员</TableHead>
              <TableHead className="w-20">部门</TableHead><TableHead className="w-[80px] text-center">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {list.length === 0 ? (
              <TableRow><TableCell colSpan={12} className="h-16 text-center text-muted-foreground">暂无充值记录，点击「导入CSV」批量导入</TableCell></TableRow>
            ) : list.map((r, idx) => (
              <TableRow key={r.id}>
                <TableCell className="text-center text-muted-foreground">{idx + 1}</TableCell>
                <TableCell className="font-medium">{r.user_name}</TableCell>
                <TableCell>{r.user_id || '-'}</TableCell>
                <TableCell>{r.card_no || '-'}</TableCell>
                <TableCell>{r.external_sn || '-'}</TableCell>
                <TableCell>{r.recharge_date || '-'}</TableCell>
                <TableCell className="text-right font-medium text-green-600">{fmt(r.amount)}</TableCell>
                <TableCell className="text-right">{r.balance_recorded != null ? fmt(r.balance_recorded) : '-'}</TableCell>
                <TableCell>{r.payment_method || '现金'}</TableCell>
                <TableCell>{r.operator || '-'}</TableCell>
                <TableCell className="max-w-[80px] truncate">{r.user_department || '-'}</TableCell>
                <TableCell className="text-center">
                  <Button variant="ghost" size="icon" onClick={() => setConfirm({ open: true, target: r })}><Trash2 className="h-4 w-4 text-red-500" /></Button>
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

      {/* 导入弹窗 */}
      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className="sm:max-w-[680px] max-h-[85vh] flex flex-col">
          <DialogHeader><DialogTitle>导入饭卡充值 CSV</DialogTitle></DialogHeader>
          <div className="space-y-3 overflow-y-auto pr-1">
            <div className="flex items-center gap-2">
              <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => handleFile(e.target.files?.[0])} />
              <Button size="sm" variant="outline" onClick={() => fileRef.current?.click()}><Upload className="mr-1 h-4 w-4" />选择 CSV 文件</Button>
              {fileName && <span className="text-xs text-muted-foreground">{fileName}</span>}
            </div>

            {csvHeaders.length > 0 && (
              <>
                {/* 数据预览 */}
                <div className="rounded-md border overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-slate-100">
                        {csvHeaders.map((h, i) => <th key={i} className="px-2 py-1 whitespace-nowrap text-left">{h}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {csvPreview.map((row, i) => (
                        <tr key={i} className="border-t">
                          {csvHeaders.map((_, j) => <td key={j} className="px-2 py-1 whitespace-nowrap">{row[j] || ''}</td>)}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* 字段映射 */}
                <div className="space-y-1.5">
                  <p className="text-xs font-medium text-muted-foreground">字段映射（自动匹配，可调整）</p>
                  {RECHARGE_FIELDS.map((fld) => (
                    <div key={fld.key} className="flex items-center gap-2 text-sm">
                      <span className={`w-24 shrink-0 ${fld.required ? 'text-red-600 font-medium' : 'text-slate-600'}`}>
                        {fld.label}{fld.required ? ' *' : ''}
                      </span>
                      <select className="flex-1 h-8 rounded-md border px-2 text-sm" value={mapping[fld.key] || ''}
                        onChange={(e) => setMapping({ ...mapping, [fld.key]: e.target.value })}>
                        <option value="">不导入</option>
                        {csvHeaders.map((h) => <option key={h} value={h}>{h}</option>)}
                      </select>
                      {fld.hint && <span className="text-[11px] text-muted-foreground shrink-0">{fld.hint}</span>}
                    </div>
                  ))}
                </div>

                {/* 导入模式 */}
                <div className="flex items-center gap-4 text-sm">
                  <span className="text-muted-foreground">导入模式：</span>
                  <label className="flex items-center gap-1 cursor-pointer">
                    <input type="radio" checked={mode === 'upsert'} onChange={() => setMode('upsert')} /> 更新导入（存在则更新）
                  </label>
                  <label className="flex items-center gap-1 cursor-pointer">
                    <input type="radio" checked={mode === 'skip'} onChange={() => setMode('skip')} /> 仅新增（重复跳过）
                  </label>
                </div>
              </>
            )}

            {/* 导入结果 */}
            {result && (
              <div className="rounded-md border bg-slate-50 p-3 text-sm space-y-1">
                <p className="font-medium">导入结果</p>
                <div className="grid grid-cols-2 gap-x-4 text-xs">
                  <span>总行数：{result.total}</span>
                  <span className="text-green-600">新增：{result.inserted}</span>
                  <span className="text-blue-600">更新：{result.updated}</span>
                  <span className="text-amber-600">跳过：{result.skipped}</span>
                </div>
                {result.errors?.length > 0 && (
                  <div className="mt-1">
                    <p className="text-red-600 text-xs">失败 {result.errors.length} 行：</p>
                    <div className="max-h-28 overflow-y-auto space-y-0.5">
                      {result.errors.map((e: any, i: number) => <p key={i} className="text-[11px] text-red-500">第 {e.row} 行：{e.reason}</p>)}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t">
            <DialogClose asChild><Button variant="outline">关闭</Button></DialogClose>
            <Button onClick={doImport} disabled={!fileName || importing}>{importing ? '导入中…' : '开始导入'}</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={confirm.open} onOpenChange={(v) => setConfirm({ open: v, target: confirm.target })}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader><DialogTitle>确认操作</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground py-2">删除 {confirm.target?.user_name || ''} 的充值记录（{confirm.target?.external_sn || ''}）？</p>
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
        <TabsTrigger value="recharge">饭卡充值</TabsTrigger>
        <TabsTrigger value="resource">资源占用费</TabsTrigger>
      </TabsList>
      <TabsContent value="income"><IncomePanel /></TabsContent>
      <TabsContent value="recharge"><RechargePanel /></TabsContent>
      <TabsContent value="resource"><ResourceFeePanel /></TabsContent>
    </Tabs>
  );
}
