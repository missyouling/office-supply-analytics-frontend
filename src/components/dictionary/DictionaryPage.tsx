import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog';
import { showToast } from '@/components/ui/toaster';
import SupplyDialog from './SupplyDialog';
import { suppliesApi, categoriesApi } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import type { Supply, Category } from '@/types';
import { Search, Plus, Pencil, Trash2, PackageOpen, Upload, Download, FileDown } from 'lucide-react';

export default function DictionaryPage() {
  const [supplies, setSupplies] = useState<Supply[]>([]);
  const [cats, setCats] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [category, setCategory] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSupply, setEditingSupply] = useState<Supply | null>(null);
  // Confirm dialog
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmMsg, setConfirmMsg] = useState('');
  const [confirmAction, setConfirmAction] = useState<() => void>(() => {});
  // Import dialog
  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState('');
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ ok: number; err: number } | null>(null);

  useEffect(() => {
    categoriesApi.list().then(r => setCats(r.items)).catch(() => {});
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await suppliesApi.list({
        keyword: keyword || undefined,
        category_id: category !== 'all' ? category : undefined,
        limit: 500,
        status: 'all',
      });
      setSupplies(r.items);
    } catch (e: any) { showToast('加载失败', e.message, 'destructive'); }
    finally { setLoading(false); }
  }, [keyword, category]);

  useEffect(() => { load(); }, [load]);

  const handleEdit = (s: Supply) => { setEditingSupply(s); setDialogOpen(true); };
  const handleDelete = (id: number, name: string) => {
    setConfirmMsg(`确认删除用品「${name}」？`);
    setConfirmAction(() => async () => {
      try { await suppliesApi.delete(id); showToast('✅ 已删除'); load(); setConfirmOpen(false); }
      catch (e: any) { showToast('删除失败', e.message, 'destructive'); }
    });
    setConfirmOpen(true);
  };
  const handleDialogClose = (refresh: boolean) => {
    setDialogOpen(false);
    setEditingSupply(null);
    if (refresh) load();
  };

  // 导出 CSV
  const handleExport = async () => {
    try {
      const blob = await suppliesApi.exportCsv();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `用品字典_${new Date().toISOString().substring(0, 10)}.csv`;
      a.click();
      showToast('✅ 已导出');
    } catch (e: any) { showToast('导出失败', e.message, 'destructive'); }
  };

  // 导入 CSV — 文件选择（自动检测编码 UTF-8 / GBK）
  const handleFileSelect = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const buf = e.target?.result as ArrayBuffer;
      if (!buf) return;
      // 先尝试 UTF-8
      let text = new TextDecoder('utf-8', { fatal: false }).decode(buf);
      // 如果出现替换字符 \uFFFD，尝试 GBK
      if (text.indexOf('\uFFFD') >= 0) {
        try {
          const gbkText = new TextDecoder('gbk', { fatal: false }).decode(buf);
          if (gbkText.indexOf('\uFFFD') < 0) text = gbkText;
        } catch { /* 保留 UTF-8 */ }
      }
      // 移除 BOM
      if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);
      setImportText(text);
    };
    reader.readAsArrayBuffer(file);
  };
  const handleImport = async () => {
    if (!importText.trim()) { showToast('校验失败', '请选择 CSV 文件', 'destructive'); return; }
    setImporting(true);
    setImportResult(null);
    try {
      const r = await suppliesApi.importCsv(importText);
      setImportResult({ ok: r.ok ?? 0, err: r.err ?? 0 });
      showToast('✅ 导入完成', `成功 ${r.ok} 条，失败 ${r.err} 条`);
      load();
    } catch (e: any) { showToast('导入失败', e.message, 'destructive'); }
    finally { setImporting(false); }
  };

  return (
    <div className="space-y-4">
      {/* 头部 */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-xl font-semibold">📖 办公用品字典</h2>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExport}><FileDown className="mr-1 h-4 w-4" />导出</Button>
          <Button variant="outline" onClick={() => { setImportText(''); setImportResult(null); setImportOpen(true); }}>
            <Upload className="mr-1 h-4 w-4" />导入
          </Button>
          <Button onClick={() => { setEditingSupply(null); setDialogOpen(true); }}>
            <Plus className="mr-1 h-4 w-4" />新增用品
          </Button>
        </div>
      </div>

      {/* 搜索筛选 */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="搜索品名 / 规格..." value={keyword} onChange={(e) => setKeyword(e.target.value)} className="pl-9" />
            </div>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="w-[140px]"><SelectValue placeholder="全部分类" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部分类</SelectItem>
                {cats.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={() => { setKeyword(''); setCategory('all'); }}>重置</Button>
          </div>
        </CardContent>
      </Card>

      {/* 表格 — 滚动容器 */}
      <Card>
        <div className="max-h-[calc(100vh-280px)] overflow-y-auto">
          <CardContent className="p-0">
            <Table className="max-h-[65vh]">
              <TableHeader>
                <TableRow>
                  <TableHead>品名</TableHead><TableHead>规格</TableHead><TableHead>单位</TableHead>
                  <TableHead>参考单价</TableHead>
                  <TableHead>分类</TableHead><TableHead>状态</TableHead><TableHead>备注</TableHead><TableHead>操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={8} className="h-32 text-center text-muted-foreground">加载中...</TableCell></TableRow>
                ) : supplies.length === 0 ? (
                  <TableRow><TableCell colSpan={8} className="h-32 text-center text-muted-foreground">
                    <PackageOpen className="mx-auto h-10 w-10 mb-2 opacity-40" />
                    <p>暂无用品数据</p>
                  </TableCell></TableRow>
                ) : supplies.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.name}</TableCell>
                    <TableCell className="text-muted-foreground text-xs">{s.spec}</TableCell>
                    <TableCell>{s.unit}</TableCell>
                    <TableCell className="font-mono">{formatCurrency(s.reference_price)}</TableCell>
                    <TableCell><Badge variant="secondary" className="text-xs">{s.category_name || '-'}</Badge></TableCell>
                    <TableCell><Badge variant={s.status === 'active' ? 'default' : 'secondary'} className="text-xs">{s.status === 'active' ? '启用' : '停用'}</Badge></TableCell>
                    <TableCell className="text-muted-foreground text-xs truncate max-w-[160px]">{s.remark || '-'}</TableCell>
                    <TableCell className="text-center">                      <Button variant="ghost" size="icon" onClick={() => handleEdit(s)}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(s.id, s.name)}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </div>
      </Card>

      <SupplyDialog open={dialogOpen} onClose={handleDialogClose} supply={editingSupply} />

      {/* 确认弹窗 */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader><DialogTitle>确认操作</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground py-2">{confirmMsg}</p>
          <div className="flex justify-end gap-2">
            <DialogClose asChild><Button variant="outline">取消</Button></DialogClose>
            <Button variant="destructive" onClick={() => confirmAction()}>确认</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 导入弹窗 */}
      <Dialog open={importOpen} onOpenChange={(v) => { setImportOpen(v); if (!v) setImportResult(null); }}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader><DialogTitle>📥 CSV 批量导入用品</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              选择 CSV 文件导入用品数据。文件必须包含表头行，编码为 UTF-8。
            </p>
            <div className="flex items-center gap-3">
              <Button variant="outline" size="sm" onClick={() => {
                const template = '品名,规格,单位,参考单价,分类名称,备注\nA4打印纸,70g 500张/包,包,22.50,办公文具,\n中性笔,0.5mm 黑色,支,1.50,办公文具,';
                const blob = new Blob(['\uFEFF' + template], { type: 'text/csv;charset=utf-8;' });
                const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = '用品导入模板.csv'; a.click();
              }}>
                <Download className="mr-1 h-3 w-3" />下载模板
              </Button>
            </div>
            <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-blue-400 transition-colors cursor-pointer"
              onClick={() => document.getElementById('csv-file-input')?.click()}
              onDragOver={e => e.preventDefault()}
              onDrop={e => { e.preventDefault(); const file = e.dataTransfer.files[0]; if (file) handleFileSelect(file); }}>
              <input id="csv-file-input" type="file" accept=".csv" className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) handleFileSelect(f); }} />
              <Upload className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">点击或拖拽 CSV 文件到此处</p>
              {importText && <p className="text-xs text-green-500 mt-2">✅ 已选择文件</p>}
            </div>
            {importResult && (
              <div className={`p-3 rounded-md text-sm ${importResult.err > 0 ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-green-50 text-green-700 border border-green-200'}`}>
                ✅ 成功 <strong>{importResult.ok}</strong> 条
                {importResult.err > 0 && `，❌ 失败 <strong>${importResult.err}</strong> 条（请检查数据格式）`}
              </div>
            )}
          </div>
          <div className="flex justify-end gap-2">
            <DialogClose asChild><Button variant="outline">关闭</Button></DialogClose>
            <Button onClick={handleImport} disabled={importing || !importText}>
              {importing ? '导入中...' : '开始导入'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
