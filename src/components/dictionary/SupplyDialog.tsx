import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Check, ChevronsUpDown, Plus } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { showToast } from '@/components/ui/toaster';
import { suppliesApi, categoriesApi } from '@/lib/api';
import type { Supply, Category } from '@/types';
import { cn } from '@/lib/utils';

interface Props {
  open: boolean;
  onClose: (refresh: boolean) => void;
  supply: Supply | null;
}

export default function SupplyDialog({ open, onClose, supply }: Props) {
  const isEdit = !!supply;
  const [cats, setCats] = useState<Category[]>([]);
  const [allUnits, setAllUnits] = useState<string[]>(['个','包','箱','瓶','支','双','卷','盒','条','袋']);
  const [form, setForm] = useState({
    name: '', spec: '', unit: '个', reference_price: '',
    category_id: '', status: 'active', remark: '',
  });
  const [continuous, setContinuous] = useState(false);
  const [loading, setLoading] = useState(false);
  const [unitOpen, setUnitOpen] = useState(false);
  const [unitSearch, setUnitSearch] = useState('');
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    categoriesApi.list().then(r => setCats(r.items)).catch(() => {});
    suppliesApi.listUnits().then(r => { if (r.units?.length) setAllUnits(r.units); }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!open) return;
    if (supply) {
      setForm({
        name: supply.name,
        spec: supply.spec || '',
        unit: supply.unit || '个',
        reference_price: String(supply.reference_price || supply.unit_price || ''),
        category_id: String(supply.category_id || ''),
        status: supply.status || 'active',
        remark: supply.remark || '',
      });
      setContinuous(false);
    } else {
      if (!continuous) {
        setForm({ name: '', spec: '', unit: '个', reference_price: '', category_id: '', status: 'active', remark: '' });
      } else {
        setForm(prev => ({ ...prev, name: '', spec: '', reference_price: '' }));
      }
    }
    setTimeout(() => nameRef.current?.focus(), 100);
  }, [open, supply]);

  const handleSubmit = async () => {
    if (!form.name.trim()) { showToast('校验失败', '品名不能为空', 'destructive'); nameRef.current?.focus(); return; }
    const price = parseFloat(form.reference_price);
    if (isNaN(price) || price < 0) { showToast('校验失败', '请输入有效单价', 'destructive'); return; }
    if (!form.category_id) { showToast('校验失败', '请选择分类', 'destructive'); return; }

    setLoading(true);
    try {
      const data = {
        name: form.name.trim(),
        spec: form.spec.trim(),
        unit: form.unit,
        reference_price: price,
        category_id: parseInt(form.category_id),
        status: form.status,
        remark: form.remark.trim(),
      };

      if (isEdit) {
        await suppliesApi.update(supply!.id, data);
        showToast('✅ 已更新', `用品「${data.name}」已修改`, 'success');
        onClose(true);
      } else {
        await suppliesApi.create(data);
        if (continuous) {
          showToast('✅ 已保存', `「${data.name}」继续添加下一个`, 'success');
          setForm(prev => ({ ...prev, name: '', spec: '', reference_price: '' }));
          setTimeout(() => nameRef.current?.focus(), 50);
        } else {
          showToast('✅ 已保存', `用品「${data.name}」已添加`, 'success');
          onClose(true);
        }
      }
    } catch (e: any) {
      showToast('保存失败', e.message, 'destructive');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(false); }}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader><DialogTitle>{isEdit ? '编辑用品' : '新增用品'}</DialogTitle></DialogHeader>
        <div className="grid gap-4 py-2">
          {/* 品名 */}
          <div className="grid grid-cols-4 items-center gap-3">
            <Label className="text-right">品名 *</Label>
            <Input ref={nameRef} className="col-span-3" value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="输入用品名称"
              onKeyDown={e => { if (e.key === 'Enter') handleSubmit(); }} />
          </div>

          {/* 规格 */}
          <div className="grid grid-cols-4 items-center gap-3">
            <Label className="text-right">规格</Label>
            <Input className="col-span-3" value={form.spec}
              onChange={e => setForm(f => ({ ...f, spec: e.target.value }))}
              placeholder="如：70g 500张/包" />
          </div>

          {/* 单位 + 参考单价 */}
          <div className="grid grid-cols-4 items-center gap-3">
            <Label className="text-right">单位</Label>
            <div className="col-span-1">
              <Popover open={unitOpen} onOpenChange={setUnitOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" role="combobox" aria-expanded={unitOpen}
                    className="w-full justify-between text-sm font-normal">
                    {form.unit || '选择或输入单位'}
                    <ChevronsUpDown className="ml-1 h-3.5 w-3.5 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[180px] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="搜索/输入单位..." value={unitSearch}
                      onValueChange={v => setUnitSearch(v)} />
                    <CommandList
                      onWheel={(e) => {
                        // Modal Dialog 的滚动锁会拦截 wheel，手动滚动并阻止冒泡
                        e.stopPropagation();
                        const el = e.currentTarget;
                        el.scrollTop += e.deltaY;
                      }}>
                      <CommandEmpty>
                        {unitSearch.trim() ? (
                          <button className="w-full flex items-center gap-2 px-2 py-2 text-sm hover:bg-accent"
                            onMouseDown={(e) => { e.preventDefault(); setForm(f => ({ ...f, unit: unitSearch.trim() })); setUnitOpen(false); setUnitSearch(''); }}>
                            <Plus className="h-3.5 w-3.5" />使用「{unitSearch.trim()}」
                          </button>
                        ) : '未找到单位'}
                      </CommandEmpty>
                      <CommandGroup>
                        {allUnits.map(u => (
                          <CommandItem key={u} value={u}
                            onMouseDown={(e) => { e.preventDefault(); setForm(f => ({ ...f, unit: u })); setUnitOpen(false); setUnitSearch(''); }}
                            onSelect={() => { setForm(f => ({ ...f, unit: u })); setUnitOpen(false); setUnitSearch(''); }}>
                            <Check className={cn('mr-2 h-3.5 w-3.5', form.unit === u ? 'opacity-100' : 'opacity-0')} />
                            {u}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
            <Label className="text-right col-start-3">参考单价 *</Label>
            <Input type="number" step="0.01" min="0" className="col-span-1"
              value={form.reference_price}
              onChange={e => setForm(f => ({ ...f, reference_price: e.target.value }))}
              placeholder="0.00" />
          </div>

          {/* 分类 */}
          <div className="grid grid-cols-4 items-center gap-3">
            <Label className="text-right">分类 *</Label>
            <Select value={form.category_id} onValueChange={v => setForm(f => ({ ...f, category_id: v }))}>
              <SelectTrigger className="col-span-3"><SelectValue placeholder="选择分类" /></SelectTrigger>
              <SelectContent>
                {cats.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* 状态 */}
          <div className="grid grid-cols-4 items-center gap-3">
            <Label className="text-right">状态</Label>
            <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
              <SelectTrigger className="col-span-3"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="active">启用</SelectItem>
                <SelectItem value="inactive">停用</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 备注 */}
          <div className="grid grid-cols-4 items-start gap-3">
            <Label className="text-right pt-2">备注</Label>
            <textarea className="col-span-3 flex h-20 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
              value={form.remark}
              onChange={e => setForm(f => ({ ...f, remark: e.target.value }))}
              placeholder="可选备注信息" />
          </div>

          {/* 连续添加 */}
          {!isEdit && (
            <div className="flex items-center gap-2 pl-16">
              <Checkbox id="continuous" checked={continuous}
                onCheckedChange={v => setContinuous(v as boolean)} />
              <Label htmlFor="continuous" className="text-sm cursor-pointer">连续添加（保存后继续录入下一项）</Label>
            </div>
          )}
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="outline" onClick={() => onClose(false)}>取消</Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? '保存中...' : (isEdit ? '保存修改' : '保存')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
