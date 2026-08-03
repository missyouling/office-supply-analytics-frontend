import { useState, useEffect, useCallback } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { showToast } from '@/components/ui/toaster';
import { canteenApi } from '@/lib/api';
import { Plus, Pencil, Trash2, Link2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// ---------- 通用编辑弹窗 ----------
function EditDialog({ open, onOpenChange, title, fields, values, setValues, onSave }: {
  open: boolean; onOpenChange: (v: boolean) => void; title: string;
  fields: { key: string; label: string; type?: string; placeholder?: string }[];
  values: any; setValues: (v: any) => void; onSave: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader>
        <div className="space-y-3 py-2">
          {fields.map((f) => (
            <Input
              key={f.key}
              type={f.type || 'text'}
              placeholder={f.placeholder || f.label}
              value={values[f.key] ?? ''}
              onChange={(e) => setValues({ ...values, [f.key]: f.type === 'number' ? (parseFloat(e.target.value) || 0) : e.target.value })}
            />
          ))}
        </div>
        <div className="flex justify-end gap-2">
          <DialogClose asChild><Button variant="outline">取消</Button></DialogClose>
          <Button onClick={onSave}>保存</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ConfirmDialog({ open, onOpenChange, msg, onConfirm }: {
  open: boolean; onOpenChange: (v: boolean) => void; msg: string; onConfirm: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader><DialogTitle>确认操作</DialogTitle></DialogHeader>
        <p className="text-sm text-muted-foreground py-2">{msg}</p>
        <div className="flex justify-end gap-2">
          <DialogClose asChild><Button variant="outline">取消</Button></DialogClose>
          <Button variant="destructive" onClick={onConfirm}>确认删除</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ---------- 食材分类子面板 ----------
function CategoryPanel() {
  const [cats, setCats] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<any | null>(null);
  const [form, setForm] = useState({ name: '', sort_order: 0 });
  const [confirm, setConfirm] = useState<{ open: boolean; target: any }>({ open: false, target: null });

  const load = useCallback(async () => {
    try { setCats((await canteenApi.categories.list()).items); } catch (e: any) { showToast('加载失败', e.message, 'destructive'); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const save = async () => {
    if (!form.name.trim()) { showToast('校验失败', '名称不能为空', 'destructive'); return; }
    try {
      if (edit) { await canteenApi.categories.update(edit.id, form); showToast('✅ 已更新'); }
      else { await canteenApi.categories.create(form); showToast('✅ 已新增'); }
      setOpen(false); load();
    } catch (e: any) { showToast('保存失败', e.message, 'destructive'); }
  };
  const del = async () => {
    if (!confirm.target) return;
    try { await canteenApi.categories.delete(confirm.target.id); showToast('✅ 已删除'); load(); }
    catch (e: any) { showToast('删除失败', e.message, 'destructive'); }
    finally { setConfirm({ open: false, target: null }); }
  };

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">食材分类</h3>
          <Button size="sm" onClick={() => { setEdit(null); setForm({ name: '', sort_order: cats.length + 1 }); setOpen(true); }}>
            <Plus className="mr-1 h-4 w-4" />新增
          </Button>
        </div>
        <Table className="max-h-[50vh]">
          <TableHeader>
            <TableRow>
              <TableHead className="w-12 text-center">序号</TableHead><TableHead>名称</TableHead>
              <TableHead className="text-center w-20">排序</TableHead><TableHead className="w-[100px] text-center">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {cats.length === 0 ? (
              <TableRow><TableCell colSpan={4} className="h-16 text-center text-muted-foreground">暂无分类</TableCell></TableRow>
            ) : cats.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="text-center text-muted-foreground">{c.id}</TableCell>
                <TableCell className="font-medium">{c.name}</TableCell>
                <TableCell className="text-center">{c.sort_order}</TableCell>
                <TableCell className="text-center">
                  <Button variant="ghost" size="icon" onClick={() => { setEdit(c); setForm({ name: c.name, sort_order: c.sort_order }); setOpen(true); }}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => setConfirm({ open: true, target: c })}>
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
      <EditDialog open={open} onOpenChange={setOpen} title={edit ? '编辑分类' : '新增分类'}
        fields={[{ key: 'name', label: '分类名称' }, { key: 'sort_order', label: '排序', type: 'number' }]}
        values={form} setValues={setForm} onSave={save} />
      <ConfirmDialog open={confirm.open} onOpenChange={(v) => setConfirm({ open: v, target: confirm.target })}
        msg={`删除分类「${confirm.target?.name || ''}」？如被食材引用则无法删除。`} onConfirm={del} />
    </Card>
  );
}

// ---------- 食材字典子面板 ----------
function SupplyPanel() {
  const [items, setItems] = useState<any[]>([]);
  const [cats, setCats] = useState<any[]>([]);
  const [keyword, setKeyword] = useState('');
  const [catFilter, setCatFilter] = useState('');
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<any | null>(null);
  const [form, setForm] = useState({ name: '', spec: '', unit: '斤', reference_price: 0, category_id: '' as any, remark: '' });
  const [confirm, setConfirm] = useState<{ open: boolean; target: any }>({ open: false, target: null });

  const load = useCallback(async () => {
    try {
      const [r, rc] = await Promise.all([
        canteenApi.supplies.list({ keyword, category_id: catFilter, page: 1, limit: 100 }),
        canteenApi.categories.list(),
      ]);
      setItems(r.items); setCats(rc.items);
    } catch (e: any) { showToast('加载失败', e.message, 'destructive'); }
  }, [keyword, catFilter]);
  useEffect(() => { const t = setTimeout(load, 300); return () => clearTimeout(t); }, [load]);

  const save = async () => {
    if (!form.name.trim()) { showToast('校验失败', '品名不能为空', 'destructive'); return; }
    try {
      if (edit) { await canteenApi.supplies.update(edit.id, form); showToast('✅ 已更新'); }
      else { await canteenApi.supplies.create(form); showToast('✅ 已新增'); }
      setOpen(false); load();
    } catch (e: any) { showToast('保存失败', e.message, 'destructive'); }
  };
  const del = async () => {
    if (!confirm.target) return;
    try { await canteenApi.supplies.delete(confirm.target.id); showToast('✅ 已删除'); load(); }
    catch (e: any) { showToast('删除失败', e.message, 'destructive'); }
    finally { setConfirm({ open: false, target: null }); }
  };

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <h3 className="text-sm font-semibold">食材/菜品字典</h3>
          <div className="flex items-center gap-2">
            <Input className="h-8 w-40" placeholder="搜索品名/规格" value={keyword} onChange={(e) => setKeyword(e.target.value)} />
            <select className="h-8 rounded-md border px-2 text-sm" value={catFilter} onChange={(e) => setCatFilter(e.target.value)}>
              <option value="">全部分类</option>
              {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <Button size="sm" onClick={() => { setEdit(null); setForm({ name: '', spec: '', unit: '斤', reference_price: 0, category_id: '', remark: '' }); setOpen(true); }}>
              <Plus className="mr-1 h-4 w-4" />新增
            </Button>
          </div>
        </div>
        <Table className="max-h-[50vh]">
          <TableHeader>
            <TableRow>
              <TableHead className="w-12 text-center">序号</TableHead><TableHead>品名</TableHead>
              <TableHead>规格</TableHead><TableHead className="w-16">单位</TableHead>
              <TableHead className="w-24">参考单价</TableHead><TableHead className="w-24">分类</TableHead>
              <TableHead className="w-[100px] text-center">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="h-16 text-center text-muted-foreground">暂无食材</TableCell></TableRow>
            ) : items.map((s) => (
              <TableRow key={s.id}>
                <TableCell className="text-center text-muted-foreground">{s.id}</TableCell>
                <TableCell className="font-medium">{s.name}</TableCell>
                <TableCell>{s.spec || '-'}</TableCell>
                <TableCell>{s.unit}</TableCell>
                <TableCell>¥{Number(s.reference_price).toFixed(2)}</TableCell>
                <TableCell>{s.category_name || '-'}</TableCell>
                <TableCell className="text-center">
                  <Button variant="ghost" size="icon" onClick={() => { setEdit(s); setForm({ name: s.name, spec: s.spec || '', unit: s.unit, reference_price: s.reference_price, category_id: s.category_id || '', remark: s.remark || '' }); setOpen(true); }}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => setConfirm({ open: true, target: s })}>
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
      <EditDialog open={open} onOpenChange={setOpen} title={edit ? '编辑食材' : '新增食材'}
        fields={[{ key: 'name', label: '品名' }, { key: 'spec', label: '规格' }, { key: 'unit', label: '单位' },
          { key: 'reference_price', label: '参考单价', type: 'number' }, { key: 'remark', label: '备注' }]}
        values={form} setValues={setForm} onSave={save} />
      {/* 分类选择内嵌在弹窗下方 */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader><DialogTitle>{edit ? '编辑食材' : '新增食材'}</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <Input placeholder="品名" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <Input placeholder="规格" value={form.spec} onChange={(e) => setForm({ ...form, spec: e.target.value })} />
            <div className="flex gap-2">
              <Input placeholder="单位" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} />
              <Input type="number" placeholder="参考单价" value={form.reference_price} onChange={(e) => setForm({ ...form, reference_price: parseFloat(e.target.value) || 0 })} />
            </div>
            <select className="w-full h-9 rounded-md border px-2 text-sm" value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })}>
              <option value="">未分类</option>
              {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <Input placeholder="备注" value={form.remark} onChange={(e) => setForm({ ...form, remark: e.target.value })} />
          </div>
          <div className="flex justify-end gap-2">
            <DialogClose asChild><Button variant="outline">取消</Button></DialogClose>
            <Button onClick={save}>保存</Button>
          </div>
        </DialogContent>
      </Dialog>
      <ConfirmDialog open={confirm.open} onOpenChange={(v) => setConfirm({ open: v, target: confirm.target })}
        msg={`删除食材「${confirm.target?.name || ''}」？如被采购记录引用则无法删除。`} onConfirm={del} />
    </Card>
  );
}

// ---------- 费用科目子面板 ----------
function ExpenseCategoryPanel() {
  const [cats, setCats] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<any | null>(null);
  const [form, setForm] = useState({ name: '', sort_order: 0 });
  const [confirm, setConfirm] = useState<{ open: boolean; target: any }>({ open: false, target: null });

  const load = useCallback(async () => {
    try { setCats((await canteenApi.expenseCategories.list()).items); } catch (e: any) { showToast('加载失败', e.message, 'destructive'); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const save = async () => {
    if (!form.name.trim()) { showToast('校验失败', '名称不能为空', 'destructive'); return; }
    try {
      if (edit) { await canteenApi.expenseCategories.update(edit.id, form); showToast('✅ 已更新'); }
      else { await canteenApi.expenseCategories.create(form); showToast('✅ 已新增'); }
      setOpen(false); load();
    } catch (e: any) { showToast('保存失败', e.message, 'destructive'); }
  };
  const del = async () => {
    if (!confirm.target) return;
    try { await canteenApi.expenseCategories.delete(confirm.target.id); showToast('✅ 已删除'); load(); }
    catch (e: any) { showToast('删除失败', e.message, 'destructive'); }
    finally { setConfirm({ open: false, target: null }); }
  };

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">费用科目</h3>
          <Button size="sm" onClick={() => { setEdit(null); setForm({ name: '', sort_order: cats.length + 1 }); setOpen(true); }}>
            <Plus className="mr-1 h-4 w-4" />新增
          </Button>
        </div>
        <Table className="max-h-[40vh]">
          <TableHeader>
            <TableRow>
              <TableHead className="w-12 text-center">序号</TableHead><TableHead>名称</TableHead>
              <TableHead className="text-center w-20">排序</TableHead><TableHead className="w-[100px] text-center">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {cats.length === 0 ? (
              <TableRow><TableCell colSpan={4} className="h-16 text-center text-muted-foreground">暂无科目</TableCell></TableRow>
            ) : cats.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="text-center text-muted-foreground">{c.id}</TableCell>
                <TableCell className="font-medium">{c.name}</TableCell>
                <TableCell className="text-center">{c.sort_order}</TableCell>
                <TableCell className="text-center">
                  <Button variant="ghost" size="icon" onClick={() => { setEdit(c); setForm({ name: c.name, sort_order: c.sort_order }); setOpen(true); }}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => setConfirm({ open: true, target: c })}>
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
      <EditDialog open={open} onOpenChange={setOpen} title={edit ? '编辑科目' : '新增科目'}
        fields={[{ key: 'name', label: '科目名称' }, { key: 'sort_order', label: '排序', type: 'number' }]}
        values={form} setValues={setForm} onSave={save} />
      <ConfirmDialog open={confirm.open} onOpenChange={(v) => setConfirm({ open: v, target: confirm.target })}
        msg={`删除科目「${confirm.target?.name || ''}」？如被费用记录引用则无法删除。`} onConfirm={del} />
    </Card>
  );
}

// ---------- 供应商入口 ----------
function SupplierPanel() {
  const navigate = useNavigate();
  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">供应商</h3>
        </div>
        <p className="text-sm text-muted-foreground">
          食堂采购可复用办公用品模块的供应商表（含联系人、电话、结算账户），点击下方按钮进入管理。
        </p>
        <Button variant="outline" size="sm" onClick={() => navigate('/suppliers')}>
          <Link2 className="mr-1 h-4 w-4" />进入供应商管理
        </Button>
      </CardContent>
    </Card>
  );
}

export default function DictionaryTab() {
  return (
    <Tabs defaultValue="category">
      <TabsList className="bg-slate-100 p-1 rounded-lg">
        <TabsTrigger value="category">食材分类</TabsTrigger>
        <TabsTrigger value="supply">食材字典</TabsTrigger>
        <TabsTrigger value="expense-category">费用科目</TabsTrigger>
        <TabsTrigger value="supplier">供应商</TabsTrigger>
      </TabsList>
      <TabsContent value="category"><CategoryPanel /></TabsContent>
      <TabsContent value="supply"><SupplyPanel /></TabsContent>
      <TabsContent value="expense-category"><ExpenseCategoryPanel /></TabsContent>
      <TabsContent value="supplier"><SupplierPanel /></TabsContent>
    </Tabs>
  );
}
