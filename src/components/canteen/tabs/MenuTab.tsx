import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { showToast } from '@/components/ui/toaster';
import { canteenApi } from '@/lib/api';
import { Printer, Copy, Save, BookmarkPlus, ChevronLeft, ChevronRight, Trash2, FolderOpen } from 'lucide-react';

const MEALS = ['早餐', '午餐', '晚餐'] as const;
const DAY_NAMES = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];

function mondayOf(date: Date): string {
  const d = new Date(date);
  const day = d.getDay() || 7;
  d.setDate(d.getDate() - day + 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

const emptyDays = () =>
  Array.from({ length: 7 }, (_, i) => ({ day_of_week: i + 1, 早餐: '', 午餐: '', 晚餐: '', remark: '' }));

export default function MenuTab() {
  const [weekStart, setWeekStart] = useState(() => mondayOf(new Date()));
  const [days, setDays] = useState<any[]>(emptyDays());
  const [templates, setTemplates] = useState<any[]>([]);
  const [tmplOpen, setTmplOpen] = useState(false);
  const [tmplName, setTmplName] = useState('');
  const [applyOpen, setApplyOpen] = useState(false);
  const [saved, setSaved] = useState(false);

  const load = useCallback(async () => {
    try {
      const r = await canteenApi.menus.get(weekStart);
      const loaded = r.days || [];
      setDays(loaded.length ? loaded.map((d: any) => ({ ...emptyDays()[d.day_of_week - 1], ...d })) : emptyDays());
      setSaved(r.rows?.length > 0);
    } catch (e: any) { showToast('加载失败', e.message, 'destructive'); }
  }, [weekStart]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { loadTemplates(); }, []);

  const loadTemplates = async () => {
    try { setTemplates((await canteenApi.menuTemplates.list()).items); } catch { /* ignore */ }
  };

  const updateDay = (idx: number, meal: string, val: string) => {
    setDays((ds) => ds.map((d, i) => (i === idx ? { ...d, [meal]: val } : d)));
  };

  const save = async () => {
    try {
      await canteenApi.menus.save({ week_start_date: weekStart, days });
      showToast('✅ 菜单已保存'); setSaved(true);
    } catch (e: any) { showToast('保存失败', e.message, 'destructive'); }
  };

  const copyPrev = async () => {
    const prev = addDays(weekStart, -7);
    try {
      const r = await canteenApi.menus.copy(prev, weekStart);
      if (r.ok) { showToast(`✅ 已复制上周菜单（${r.copied} 条）`); load(); }
    } catch (e: any) { showToast('复制失败', e.message, 'destructive'); }
  };

  const saveTemplate = async () => {
    if (!tmplName.trim()) { showToast('校验失败', '模板名称不能为空', 'destructive'); return; }
    try {
      await canteenApi.menuTemplates.create({ name: tmplName.trim(), data: { days } });
      showToast('✅ 模板已保存'); setTmplOpen(false); setTmplName(''); loadTemplates();
    } catch (e: any) { showToast('保存失败', e.message, 'destructive'); }
  };

  const applyTemplate = async (t: any) => {
    try {
      const data = typeof t.data === 'string' ? JSON.parse(t.data) : t.data;
      const tDays = data.days || [];
      setDays(tDays.length ? tDays.map((d: any) => ({ ...emptyDays()[d.day_of_week - 1], ...d })) : emptyDays());
      showToast(`✅ 已套用「${t.name}」`); setApplyOpen(false);
    } catch (e: any) { showToast('套用失败', e.message, 'destructive'); }
  };

  const deleteTemplate = async (id: number) => {
    try { await canteenApi.menuTemplates.delete(id); showToast('✅ 已删除'); loadTemplates(); }
    catch (e: any) { showToast('删除失败', e.message, 'destructive'); }
  };

  const printPreview = () => {
    const rows = days.map((d) => `
      <tr>
        <td class="day">${DAY_NAMES[d.day_of_week - 1]}<br><span class="date">${addDays(weekStart, d.day_of_week - 1)}</span></td>
        <td>${d.早餐 || '&nbsp;'}</td><td>${d.午餐 || '&nbsp;'}</td><td>${d.晚餐 || '&nbsp;'}</td>
      </tr>`).join('');
    const html = `<!doctype html>
<html><head><meta charset="utf-8"><title>每周菜单 ${weekStart}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:"Microsoft YaHei","PingFang SC","Noto Sans SC",sans-serif;padding:40px 50px;color:#333;font-size:14px}
h1{font-size:24px;text-align:center;margin-bottom:6px}
.meta{text-align:center;color:#666;font-size:13px;margin-bottom:24px}
table{width:100%;border-collapse:collapse;margin-bottom:20px}
th{background:#1e40af;color:#fff;padding:10px 8px;text-align:center;font-size:14px}
td{padding:12px 8px;border:1px solid #d1d5db;text-align:center;font-size:14px;vertical-align:middle}
td.day{font-weight:bold;background:#f8fafc}
td .date{font-size:11px;color:#9ca3af;font-weight:normal}
@media print{body{padding:20px 30px}th{background:#1e40af!important;-webkit-print-color-adjust:exact;print-color-adjust:exact}}
</style></head><body>
<h1>🍚 食堂每周菜单</h1>
<div class="meta">日期：${weekStart} 至 ${addDays(weekStart, 6)}</div>
<table><thead><tr><th style="width:110px">星期</th><th>早餐</th><th>午餐</th><th>晚餐</th></tr></thead><tbody>${rows}</tbody></table>
<script>setTimeout(()=>window.print(),300)</script>
</body></html>`;
    const w = window.open('', '_blank');
    if (!w) { showToast('浏览器拦截了打印窗口', '', 'destructive'); return; }
    w.document.write(html);
    w.document.close();
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-1">
              <Button size="sm" variant="outline" onClick={() => setWeekStart(addDays(weekStart, -7))}><ChevronLeft className="h-4 w-4" /></Button>
              <Input type="date" className="h-8 w-40" value={weekStart} onChange={(e) => setWeekStart(e.target.value || weekStart)} />
              <Button size="sm" variant="outline" onClick={() => setWeekStart(addDays(weekStart, 7))}><ChevronRight className="h-4 w-4" /></Button>
              <Button size="sm" variant="ghost" onClick={() => setWeekStart(mondayOf(new Date()))}>本周</Button>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={copyPrev}><Copy className="mr-1 h-4 w-4" />复制上周</Button>
              <Button size="sm" variant="outline" onClick={printPreview}><Printer className="mr-1 h-4 w-4" />打印预览</Button>
              <Button size="sm" variant="outline" onClick={() => { setTmplName(''); setTmplOpen(true); }}><BookmarkPlus className="mr-1 h-4 w-4" />存为模板</Button>
              <Button size="sm" variant="outline" onClick={() => setApplyOpen(true)} disabled={templates.length === 0}><FolderOpen className="mr-1 h-4 w-4" />套用模板</Button>
              <Button size="sm" onClick={save}><Save className="mr-1 h-4 w-4" />保存</Button>
            </div>
          </div>
          <div className="text-xs text-muted-foreground">{saved ? '✅ 本周菜单已保存' : '⚠️ 本周菜单尚未保存'}</div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                <th className="border p-2 bg-slate-100 w-28">星期</th>
                {MEALS.map((m) => <th key={m} className="border p-2 bg-slate-100">{m}</th>)}
              </tr>
            </thead>
            <tbody>
              {days.map((d, idx) => (
                <tr key={d.day_of_week}>
                  <td className="border p-2 font-medium bg-slate-50 text-center">
                    {DAY_NAMES[idx]}<div className="text-[10px] text-muted-foreground font-normal">{addDays(weekStart, idx)}</div>
                  </td>
                  {MEALS.map((m) => (
                    <td key={m} className="border p-1">
                      <Input className="h-8 border-transparent hover:border-gray-300 focus:border-blue-400" placeholder={`${DAY_NAMES[idx]}${m}`}
                        value={d[m] || ''} onChange={(e) => updateDay(idx, m, e.target.value)} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* 存为模板 */}
      <Dialog open={tmplOpen} onOpenChange={setTmplOpen}>
        <DialogContent className="sm:max-w-[380px]">
          <DialogHeader><DialogTitle>保存为菜单模板</DialogTitle></DialogHeader>
          <div className="py-2">
            <Input placeholder="模板名称（如：标准周菜单）" value={tmplName} onChange={(e) => setTmplName(e.target.value)} />
          </div>
          <div className="flex justify-end gap-2">
            <DialogClose asChild><Button variant="outline">取消</Button></DialogClose>
            <Button onClick={saveTemplate}>保存</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 套用模板 */}
      <Dialog open={applyOpen} onOpenChange={setApplyOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader><DialogTitle>套用菜单模板</DialogTitle></DialogHeader>
          <div className="space-y-2 py-2">
            {templates.length === 0 ? <p className="text-sm text-muted-foreground">暂无模板</p> :
              templates.map((t) => (
                <div key={t.id} className="flex items-center justify-between border rounded-md px-3 py-2">
                  <button className="text-sm hover:text-blue-600" onClick={() => applyTemplate(t)}>{t.name}</button>
                  <Button variant="ghost" size="icon" onClick={() => deleteTemplate(t.id)}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                </div>
              ))}
          </div>
          <div className="flex justify-end">
            <DialogClose asChild><Button variant="outline">关闭</Button></DialogClose>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
