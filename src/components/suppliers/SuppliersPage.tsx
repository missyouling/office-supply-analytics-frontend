import { useState, useEffect } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { showToast } from '@/components/ui/toaster';
import { suppliersApi } from '@/lib/api';
import type { Supplier } from '@/types';
import { Plus, Pencil, Trash2, Building2, Star } from 'lucide-react';

export default function SuppliersPage() {
  const [items, setItems] = useState<Supplier[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [edit, setEdit] = useState<Supplier | null>(null);
  const [form, setForm] = useState({ name: '', contact: '', phone: '', bank_name: '', bank_account: '', is_default: false, remark: '' });
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmMsg, setConfirmMsg] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<Supplier | null>(null);

  const load = async () => {
    try { const r = await suppliersApi.list(); setItems(r.items); }
    catch (e: any) { showToast('加载失败', e.message, 'destructive'); }
  };
  useEffect(() => { load(); }, []);

  const openNew = () => { setEdit(null); setForm({ name: '', contact: '', phone: '', bank_name: '', bank_account: '', is_default: false, remark: '' }); setDialogOpen(true); };
  const openEdit = (s: Supplier) => { setEdit(s); setForm({ name: s.name, contact: s.contact, phone: s.phone, bank_name: s.bank_name||'', bank_account: s.bank_account||'', is_default: !!s.is_default, remark: s.remark }); setDialogOpen(true); };

  const handleSave = async () => {
    if (!form.name.trim()) { showToast('校验失败', '名称不能为空', 'destructive'); return; }
    try {
      if (edit) { await suppliersApi.update(edit.id, form); showToast('✅ 已更新'); }
      else { await suppliersApi.create(form); showToast('✅ 已新增'); }
      setDialogOpen(false); load();
    } catch (e: any) { showToast('保存失败', e.message, 'destructive'); }
  };

  const handleDelete = (s: Supplier) => {
    setDeleteTarget(s);
    setConfirmMsg(`确认删除供应商「${s.name}」？`);
    setConfirmOpen(true);
  };
  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try { const r = await suppliersApi.delete(deleteTarget.id); if (r.ok) { showToast('✅ 已删除'); load(); } }
    catch (e: any) { showToast('删除失败', e.message, 'destructive'); }
    finally { setConfirmOpen(false); setDeleteTarget(null); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold flex items-center gap-2"><Building2 className="h-5 w-5" /> 供应商管理</h2>
        <Button onClick={openNew}><Plus className="mr-1 h-4 w-4" />新增供应商</Button>
      </div>
      <Card>
        <CardContent className="p-0">
          <Table className="max-h-[65vh]">
            <TableHeader>
              <TableRow>
                <TableHead>名称</TableHead><TableHead>联系人</TableHead><TableHead>电话</TableHead><TableHead>开户行</TableHead><TableHead>账号</TableHead>
                <TableHead>备注</TableHead><TableHead className="w-28 text-center">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="h-24 text-center text-muted-foreground">暂无供应商</TableCell></TableRow>
              ) : items.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">
                    {s.name}
                    {!!s.is_default && (
                      <span className="ml-2 inline-flex items-center gap-0.5 text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5">
                        <Star className="h-3 w-3 fill-amber-500 text-amber-500" />默认
                      </span>
                    )}
                  </TableCell>
                  <TableCell>{s.contact || '-'}</TableCell>
                  <TableCell>{s.phone || '-'}</TableCell>
                  <TableCell className="text-xs">{s.bank_name || '-'}</TableCell>
                  <TableCell className="text-xs font-mono">{s.bank_account || '-'}</TableCell>
                  <TableCell className="text-muted-foreground text-xs truncate max-w-[150px]">{s.remark || '-'}</TableCell>
                  <TableCell className="text-center">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(s)}><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(s)}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{edit ? '编辑供应商' : '新增供应商'}</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div><label className="text-sm font-medium">名称 *</label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-sm font-medium">联系人</label><Input value={form.contact} onChange={e => setForm(f => ({ ...f, contact: e.target.value }))} /></div>
              <div><label className="text-sm font-medium">电话</label><Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-sm font-medium">开户行</label><Input value={form.bank_name} onChange={e => setForm(f => ({ ...f, bank_name: e.target.value }))} placeholder="银行名称" /></div>
              <div><label className="text-sm font-medium">银行账号</label><Input value={form.bank_account} onChange={e => setForm(f => ({ ...f, bank_account: e.target.value }))} placeholder="账号" /></div>
            </div>
            <div><label className="text-sm font-medium">备注</label><textarea className="flex h-20 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm" value={form.remark} onChange={e => setForm(f => ({ ...f, remark: e.target.value }))} /></div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <Label className="text-sm font-medium cursor-pointer">默认供货商</Label>
                <p className="text-xs text-muted-foreground mt-0.5">设为默认后，新建采购单将自动加载该供应商</p>
              </div>
              <Switch checked={form.is_default} onCheckedChange={v => setForm(f => ({ ...f, is_default: v }))} />
            </div>
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
