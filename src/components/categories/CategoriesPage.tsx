import { useState, useEffect } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { showToast } from '@/components/ui/toaster';
import { categoriesApi } from '@/lib/api';
import type { Category } from '@/types';
import { Plus, Pencil, Trash2, FolderTree } from 'lucide-react';

export default function CategoriesPage() {
  const [cats, setCats] = useState<Category[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<Category | null>(null);
  const [form, setForm] = useState({ name: '', sort_order: 0 });
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmMsg, setConfirmMsg] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);

  const load = async () => {
    try { const r = await categoriesApi.list(); setCats(r.items); }
    catch (e: any) { showToast('加载失败', e.message, 'destructive'); }
  };
  useEffect(() => { load(); }, []);

  const openNew = () => { setEditItem(null); setForm({ name: '', sort_order: cats.length + 1 }); setDialogOpen(true); };
  const openEdit = (c: Category) => { setEditItem(c); setForm({ name: c.name, sort_order: c.sort_order }); setDialogOpen(true); };

  const handleSave = async () => {
    if (!form.name.trim()) { showToast('校验失败', '名称不能为空', 'destructive'); return; }
    try {
      if (editItem) { await categoriesApi.update(editItem.id, form); showToast('✅ 已更新'); }
      else { await categoriesApi.create(form); showToast('✅ 已新增'); }
      setDialogOpen(false); load();
    } catch (e: any) { showToast('保存失败', e.message, 'destructive'); }
  };

  const handleDelete = (c: Category) => {
    setDeleteTarget(c);
    setConfirmMsg(`删除分类「${c.name}」？如被用品引用则无法删除。`);
    setConfirmOpen(true);
  };
  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      const r = await categoriesApi.delete(deleteTarget.id);
      if (r.ok) { showToast('✅ 已删除'); load(); }
    } catch (e: any) { showToast('删除失败', e.message, 'destructive'); }
    finally { setConfirmOpen(false); setDeleteTarget(null); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold flex items-center gap-2"><FolderTree className="h-5 w-5" /> 分类管理</h2>
        <Button onClick={openNew}><Plus className="mr-1 h-4 w-4" />新增分类</Button>
      </div>
      <Card>
        <CardContent className="p-0">
          <Table className="max-h-[65vh]">
            <TableHeader>
              <TableRow>
                <TableHead className="w-12 text-center">序号</TableHead><TableHead>名称</TableHead>
                <TableHead className="text-center w-20">排序</TableHead><TableHead className="w-[100px] text-center">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cats.length === 0 ? (
                <TableRow><TableCell colSpan={4} className="h-24 text-center text-muted-foreground">暂无分类</TableCell></TableRow>
              ) : cats.map(c => (
                <TableRow key={c.id}>
                  <TableCell className="text-center text-muted-foreground">{c.id}</TableCell>
                  <TableCell className="font-medium">{c.name}</TableCell>
                  <TableCell className="text-center">{c.sort_order}</TableCell>
                  <TableCell className="text-center">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(c)}><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(c)}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* 编辑弹窗 */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader><DialogTitle>{editItem ? '编辑分类' : '新增分类'}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <Input placeholder="分类名称" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            <Input type="number" placeholder="排序" value={form.sort_order} onChange={e => setForm(f => ({ ...f, sort_order: parseInt(e.target.value) || 0 }))} />
          </div>
          <div className="flex justify-end gap-2">
            <DialogClose asChild><Button variant="outline">取消</Button></DialogClose>
            <Button onClick={handleSave}>保存</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 确认弹窗 */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader><DialogTitle>确认操作</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground py-2">{confirmMsg}</p>
          <div className="flex justify-end gap-2">
            <DialogClose asChild><Button variant="outline">取消</Button></DialogClose>
            <Button variant="destructive" onClick={confirmDelete}>确认删除</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
