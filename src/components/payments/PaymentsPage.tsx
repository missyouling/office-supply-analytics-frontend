import { useState, useEffect, useCallback } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog';
import { showToast } from '@/components/ui/toaster';
import { paymentRequestsApi, purchasesApi, suppliersApi } from '@/lib/api';
import type { PaymentRequest, Supplier } from '@/types';
import { amountToCn, formatPurchaseDate, formatShortDate, todayStr } from '@/lib/utils';
import { Plus, Eye, Pencil, Trash2, Printer, Save, X, FileText } from 'lucide-react';
import { Label } from '@/components/ui/label';

type DialogType = 'new' | 'view' | 'edit' | null;

const PAYMENT_METHODS = ['现金', '现支', '转支', '电汇', '其它'];

export default function PaymentsPage() {
  // ========== List ==========
  const [items, setItems] = useState<PaymentRequest[]>([]);
  const [loading, setLoading] = useState(false);

  // ========== Dialog ==========
  const [dialogType, setDialogType] = useState<DialogType>(null);
  const [viewItem, setViewItem] = useState<PaymentRequest | null>(null);
  const [viewPurchases, setViewPurchases] = useState<any[]>([]);

  // ========== Form ==========
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState({
    payment_unit: '',
    department: '',
    applicant: '',
    request_date: todayStr(),
    content: '',
    payee: '',
    payee_supplier_id: '',
    bank_name: '',
    bank_account: '',
    amount: 0,
    payment_method: '转支',
    remark: '',
    company_head: '',
    finance_head: '',
    dept_head: '',
    handler: '',
    purchase_ids: '',
  });
  const [saving, setSaving] = useState(false);

  // ========== 未付款采购单（请款时选择） ==========
  const [unpaidPurchases, setUnpaidPurchases] = useState<any[]>([]);
  useEffect(() => {
    purchasesApi.unpaid().then(r => setUnpaidPurchases(r.items)).catch(() => {});
  }, []);

  // ========== 选择采购单 → 自动填充金额 ==========
  const togglePurchase = (id: number, amount: number) => {
    setForm(f => {
      const ids = f.purchase_ids ? f.purchase_ids.split(',').map(s => s.trim()).filter(Boolean) : [];
      const has = ids.includes(String(id));
      const newIds = has ? ids.filter(x => x !== String(id)) : [...ids, String(id)];
      const selected = unpaidPurchases.filter(p => newIds.includes(String(p.id)));
      const total = selected.reduce((s, p) => s + Number(p.total_amount || 0), 0);
      return { ...f, purchase_ids: newIds.join(','), amount: Math.round(total * 100) / 100 };
    });
  };

  // ========== Supplier autofill ==========
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  useEffect(() => {
    suppliersApi.list().then(r => setSuppliers(r.items)).catch(() => {});
  }, []);

  // ========== Amount to Chinese ==========
  const amountCn = amountToCn(form.amount);

  // ========== Load list ==========
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await paymentRequestsApi.list({ limit: 50 });
      setItems(r.items);
    } catch (e: any) { showToast('加载失败', e.message, 'destructive'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  // ========== Supplier auto-fill ==========
  const handlePayeeChange = (value: string) => {
    setForm(f => ({ ...f, payee: value, payee_supplier_id: '' }));
    const sup = suppliers.find(s => s.name === value);
    if (sup) {
      setForm(f => ({ ...f, payee: sup.name, payee_supplier_id: String(sup.id), bank_name: sup.bank_name || '', bank_account: sup.bank_account || '' }));
    }
  };

  // ========== Open new/edit ==========
  const openNew = () => {
    setEditId(null);
    setForm({
      payment_unit: '', department: '', applicant: '', request_date: todayStr(),
      content: '', payee: '', payee_supplier_id: '', bank_name: '', bank_account: '',
      amount: 0, payment_method: '转支', remark: '',
      company_head: '', finance_head: '', dept_head: '', handler: '', purchase_ids: '',
    });
    setDialogType('new');
  };

  const openEdit = async (id: number) => {
    try {
      const d = await paymentRequestsApi.get(id);
      setEditId(id);
      setForm({
        payment_unit: d.payment_unit || '',
        department: d.department || '',
        applicant: d.applicant || '',
        request_date: d.request_date,
        content: d.content || '',
        payee: d.payee || '',
        payee_supplier_id: d.payee_supplier_id ? String(d.payee_supplier_id) : '',
        bank_name: d.bank_name || '',
        bank_account: d.bank_account || '',
        amount: d.amount || 0,
        payment_method: d.payment_method || '转支',
        remark: d.remark || '',
        company_head: d.company_head || '',
        finance_head: d.finance_head || '',
        dept_head: d.dept_head || '',
        handler: d.handler || '',
        purchase_ids: d.purchase_ids || '',
      });
      setDialogType('edit');
    } catch (e: any) { showToast('加载失败', e.message, 'destructive'); }
  };

  const openView = async (id: number) => {
    try {
      const d = await paymentRequestsApi.get(id);
      setViewItem(d);
      setViewPurchases(await fetchLinkedPurchases(d));
      setDialogType('view');
    } catch (e: any) { showToast('加载失败', e.message, 'destructive'); }
  };

  // ========== Save ==========
  const handleSave = async () => {
    if (!form.request_date) { showToast('校验失败', '请选择申请日期', 'destructive'); return; }
    if (form.amount <= 0) { showToast('校验失败', '金额必须大于0', 'destructive'); return; }
    setSaving(true);
    try {
      const body = {
        ...form,
        payee_supplier_id: form.payee_supplier_id ? Number(form.payee_supplier_id) : null,
        amount_cn: amountCn,
      };
      if (editId) {
        await paymentRequestsApi.update(editId, body);
        showToast('✅ 请款单已更新');
      } else {
        const r = await paymentRequestsApi.create(body);
        showToast('✅ 已保存', `单号: ${r.request_no}`, 'success');
      }
      setDialogType(null);
      load();
    } catch (e: any) { showToast('保存失败', e.message, 'destructive'); }
    finally { setSaving(false); }
  };

  // ========== Delete ==========
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmMsg, setConfirmMsg] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<number | null>(null);

  const handleDelete = (id: number, no: string) => {
    setDeleteTarget(id);
    setConfirmMsg(`确认删除请款单「${no}」？`);
    setConfirmOpen(true);
  };
  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try { await paymentRequestsApi.delete(deleteTarget); showToast('✅ 已删除'); load(); }
    catch (e: any) { showToast('删除失败', e.message, 'destructive'); }
    finally { setConfirmOpen(false); setDeleteTarget(null); }
  };

  // ========== 关联采购单清单（附件） ==========
  const fetchLinkedPurchases = async (d: PaymentRequest): Promise<any[]> => {
    const ids = (d.purchase_ids || '').split(',').map(s => s.trim()).filter(Boolean);
    if (!ids.length) return [];
    const results: any[] = [];
    for (const id of ids) {
      try {
        const p = await purchasesApi.get(Number(id));
        if (p) results.push(p);
      } catch { /* 忽略获取失败的采购单 */ }
    }
    return results;
  };

  // ========== Print preview content for a PaymentRequest ==========
  const printContent = (d: PaymentRequest, purchases: any[] = []) => {
    const cn = d.amount_cn || amountToCn(d.amount);
    // 附件：所有采购单明细合并为紧凑清单（无表格、无采购单分组头）
    let itemLines = '';
    let rowNo = 0;
    let grandTotal = 0;
    purchases.forEach((p) => {
      const items = p.items || [];
      items.forEach((it: any) => {
        rowNo++;
        grandTotal += Number(it.subtotal) || 0;
        itemLines += `<div class="item-line">${rowNo}. ${it.supply_name || ''} ${it.supply_spec || ''} ${it.unit || ''} ×${it.quantity}　¥${Number(it.subtotal).toFixed(2)}</div>`;
      });
    });
    const attachHtml = purchases.length ? `
      <div class="attach">
        <h2>附件：采购单明细</h2>
        ${itemLines}
        <div class="attach-total">合计：¥${grandTotal.toFixed(2)}</div>
      </div>` : '';
    return `<!doctype html>
<html><head><meta charset="utf-8"><title>请款单 ${d.request_no}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:"Microsoft YaHei","PingFang SC","Noto Sans SC",sans-serif;padding:50px 60px;color:#333;font-size:14px;width:210mm;margin:0 auto}
h1{font-size:28px;text-align:center;letter-spacing:12px;margin-bottom:24px;color:#000}
.info{display:flex;justify-content:space-between;font-size:13px;color:#555;margin-bottom:16px}
table{width:100%;border-collapse:collapse;margin-bottom:20px}
th,td{border:1px solid #333;padding:8px 10px;text-align:left;font-size:13px}
th{background:#f0f4ff;font-weight:600;text-align:center;width:120px;color:#1e40af}
td{background:#fff}
.label{font-weight:600;background:#f8fafc;text-align:center;width:110px}
.amount-left{font-family:"Courier New",monospace;font-weight:bold;font-size:16px;color:#dc2626;text-align:left}
.cn-cell{font-size:15px;letter-spacing:2px;color:#1e40af;font-weight:600}
.sign-row td{height:40px;vertical-align:bottom}
.sign-name{font-size:13px;font-weight:600;color:#333}
.attach{margin-top:30px;padding-top:14px}
.attach h2{font-size:16px;color:#1e40af;margin-bottom:8px}
.item-line{font-size:13px;line-height:1.9;color:#333}
.attach-total{margin-top:6px;font-size:14px;font-weight:bold;color:#dc2626;border-top:1px dashed #999;padding-top:6px}
@media print{body{padding:30px 40px}th{background:#f0f4ff!important;-webkit-print-color-adjust:exact;print-color-adjust:exact}td{background:#fff!important}}
</style></head><body>
<h1>请 款 单</h1>
<div class="info">
  <span><strong>单号：</strong>${d.request_no}</span>
  <span><strong>日期：</strong>${d.request_date}</span>
</div>
<table>
  <tr><td class="label">付款单位</td><td>${d.payment_unit || ''}</td><td class="label">使用部门</td><td>${d.department || ''}</td></tr>
  <tr><td class="label">申请人</td><td>${d.applicant || ''}</td><td class="label">申请日期</td><td>${d.request_date}</td></tr>
  <tr><td class="label">请款内容</td><td colspan="3">${d.content || ''}</td></tr>
  <tr><td class="label">收款人</td><td>${d.payee || ''}</td><td class="label">支付方式</td><td>${d.payment_method || ''}</td></tr>
  <tr><td class="label">开户行</td><td>${d.bank_name || ''}</td><td class="label">银行账号</td><td class="font-mono">${d.bank_account || ''}</td></tr>
  <tr><td class="label">金额（小写）</td><td class="amount-left" colspan="3">¥${Number(d.amount).toFixed(2)}</td></tr>
  <tr><td class="label">金额（大写）</td><td class="cn-cell" colspan="3">${cn}</td></tr>
  <tr><td class="label">备注</td><td colspan="3">${d.remark || ''}</td></tr>
  <tr class="sign-row"><td class="label">公司负责人</td><td>${d.company_head ? `<span class="sign-name">${d.company_head}</span>` : ''}</td><td class="label">财务负责人</td><td>${d.finance_head ? `<span class="sign-name">${d.finance_head}</span>` : ''}</td></tr>
  <tr class="sign-row"><td class="label">部门负责人</td><td>${d.dept_head ? `<span class="sign-name">${d.dept_head}</span>` : ''}</td><td class="label">经办人</td><td>${d.handler ? `<span class="sign-name">${d.handler}</span>` : ''}</td></tr>
</table>
${attachHtml}
<script>setTimeout(()=>window.print(),300)</script>
</body></html>`;
  };

  // ========== Print ==========
  const handlePrint = async (d: PaymentRequest) => {
    const purchases = await fetchLinkedPurchases(d);
    const w = window.open('', '_blank');
    if (w) { w.document.write(printContent(d, purchases)); w.document.close(); }
  };

  // ========== Render: Form Dialog ==========
  const formDialog = (
    <Dialog open={dialogType === 'new' || dialogType === 'edit'} onOpenChange={(open) => { if (!open) setDialogType(null); }}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-600" />
            {editId ? '编辑请款单' : '新建请款单'}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div><Label>付款单位</Label><Input value={form.payment_unit} onChange={e => setForm(f => ({...f, payment_unit: e.target.value}))} placeholder="付款单位名称" /></div>
            <div><Label>使用部门</Label><Input value={form.department} onChange={e => setForm(f => ({...f, department: e.target.value}))} placeholder="部门名称" /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>申请人</Label><Input value={form.applicant} onChange={e => setForm(f => ({...f, applicant: e.target.value}))} /></div>
            <div><Label>申请日期</Label><Input type="date" value={form.request_date} onChange={e => setForm(f => ({...f, request_date: e.target.value}))} /></div>
          </div>
          <div><Label>请款内容</Label><Input value={form.content} onChange={e => setForm(f => ({...f, content: e.target.value}))} placeholder="请款事由及内容" /></div>
          {/* 关联未付款采购单（可选，选择后自动填充金额） */}
          {unpaidPurchases.length > 0 && (
            <div className="border rounded-lg p-3">
              <Label className="mb-1 block">关联采购单（未付款，勾选自动汇总金额）</Label>
              <div className="max-h-[140px] overflow-y-auto space-y-1">
                {unpaidPurchases.map(p => {
                  const checked = form.purchase_ids.split(',').includes(String(p.id));
                  return (
                    <label key={p.id} className={`flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer text-sm border ${checked ? 'bg-blue-50 border-blue-300' : 'hover:bg-slate-50'}`}>
                      <input type="checkbox" checked={checked} onChange={() => togglePurchase(p.id, p.total_amount)} />
                      <span className="font-mono text-xs flex-1 truncate">{p.order_no}</span>
                      <span className="text-xs text-muted-foreground flex-1 truncate">{p.supplier_name || ''} · {formatPurchaseDate(p.purchase_date)}</span>
                      <span className="font-mono text-xs font-bold">¥{Number(p.total_amount).toFixed(2)}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}
          <div>
            <Label>收款人</Label>
            <Input value={form.payee} onChange={e => handlePayeeChange(e.target.value)} placeholder="输入或从下方选择供应商" list="payee-list" />
            <datalist id="payee-list">
              {suppliers.map(s => <option key={s.id} value={s.name} />)}
            </datalist>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>开户行</Label><Input value={form.bank_name} onChange={e => setForm(f => ({...f, bank_name: e.target.value}))} placeholder="自动填充或手动输入" /></div>
            <div><Label>银行账号</Label><Input value={form.bank_account} onChange={e => setForm(f => ({...f, bank_account: e.target.value}))} placeholder="自动填充或手动输入" /></div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>金额（元）</Label>
              <Input type="number" step="0.01" min="0" value={form.amount || ''} onChange={e => setForm(f => ({...f, amount: parseFloat(e.target.value) || 0}))} />
            </div>
            <div className="col-span-2">
              <Label>金额大写</Label>
              <div className="flex h-10 w-full items-center rounded-lg border border-blue-200 bg-blue-50 px-3 text-sm font-bold text-blue-700">{amountCn}</div>
            </div>
          </div>
          <div>
            <Label>支付方式</Label>
            <div className="flex gap-3 mt-1">
              {PAYMENT_METHODS.map(m => (
                <label key={m} className="flex items-center gap-1.5 cursor-pointer">
                  <input type="radio" name="pm" checked={form.payment_method === m} onChange={() => setForm(f => ({...f, payment_method: m}))} />
                  <span className="text-sm">{m}</span>
                </label>
              ))}
            </div>
          </div>
          <div><Label>备注</Label><textarea className="flex h-16 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm" value={form.remark} onChange={e => setForm(f => ({...f, remark: e.target.value}))} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>部门负责人</Label>
              <Input value={form.dept_head} onChange={e => setForm(f => ({...f, dept_head: e.target.value}))} />
            </div>
            <div>
              <Label>经办人</Label>
              <Input value={form.handler} onChange={e => setForm(f => ({...f, handler: e.target.value}))} />
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2 border-t">
          <DialogClose asChild><Button variant="outline" size="sm">取消</Button></DialogClose>
          <Button onClick={handleSave} disabled={saving} size="sm">
            <Save className="mr-1 h-3.5 w-3.5" />{saving ? '保存中...' : '保存'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );

  // ========== Render: View/Print Dialog ==========
  const viewDialog = viewItem && (
    <Dialog open={dialogType === 'view'} onOpenChange={(open) => { if (!open) { setDialogType(null); setViewItem(null); setViewPurchases([]); } }}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-600" />
            请款单详情 · {viewItem.request_no}
          </DialogTitle>
        </DialogHeader>
        <div className="border rounded-lg p-4 bg-white" style={{ fontFamily: '"Microsoft YaHei","PingFang SC",sans-serif' }}>
          <style>{`
            .print-table{width:100%;border-collapse:collapse;margin-bottom:12px}
            .print-table th,.print-table td{border:1px solid #333;padding:7px 10px;text-align:left;font-size:13px}
            .print-table th{background:#f0f4ff;font-weight:600;text-align:center;color:#1e40af;width:110px}
            .print-table .amt{text-align:right;font-weight:bold;font-size:16px;color:#dc2626;font-family:"Courier New",monospace}
            .print-table .cn{font-size:15px;letter-spacing:2px;color:#1e40af;font-weight:600}
            .print-table .sign{height:44px;vertical-align:bottom}
            .print-table .sign-line{border-bottom:1px solid #999;display:inline-block;width:90px;margin-top:6px}
          `}</style>
          <h2 style={{textAlign:'center',fontSize:'22px',letterSpacing:'10px',marginBottom:'16px'}}>请 款 单</h2>
          <div style={{display:'flex',justifyContent:'space-between',fontSize:'12px',color:'#555',marginBottom:'12px'}}>
            <span><strong>单号：</strong>{viewItem.request_no}</span>
            <span><strong>日期：</strong>{viewItem.request_date}</span>
          </div>
          <table className="print-table">
            <tbody>
              <tr><th>付款单位</th><td>{viewItem.payment_unit || ''}</td><th>使用部门</th><td>{viewItem.department || ''}</td></tr>
              <tr><th>申请人</th><td>{viewItem.applicant || ''}</td><th>申请日期</th><td>{viewItem.request_date}</td></tr>
              <tr><th>请款内容</th><td colSpan={3}>{viewItem.content || ''}</td></tr>
              <tr><th>收款人</th><td>{viewItem.payee || ''}</td><th>支付方式</th><td>{viewItem.payment_method || ''}</td></tr>
              <tr><th>开户行</th><td>{viewItem.bank_name || ''}</td><th>银行账号</th><td style={{fontFamily:'monospace'}}>{viewItem.bank_account || ''}</td></tr>
              <tr><th>金额（小写）</th><td colSpan={3} style={{textAlign:'left',fontWeight:'bold',fontSize:'16px',color:'#dc2626',fontFamily:'"Courier New",monospace'}}>¥{Number(viewItem.amount).toFixed(2)}</td></tr>
              <tr><th>金额（大写）</th><td className="cn" colSpan={3}>{viewItem.amount_cn || amountToCn(viewItem.amount)}</td></tr>
              <tr><th>备注</th><td colSpan={3}>{viewItem.remark || ''}</td></tr>
              <tr className="sign"><th>公司负责人</th><td>{viewItem.company_head || ''}</td><th>财务负责人</th><td>{viewItem.finance_head || ''}</td></tr>
              <tr className="sign"><th>部门负责人</th><td>{viewItem.dept_head || ''}</td><th>经办人</th><td>{viewItem.handler || ''}</td></tr>
            </tbody>
          </table>
          {/* 附件：采购单明细（紧凑清单，无表格） */}
          {viewPurchases.length > 0 && (() => {
            let rowNo = 0;
            let grandTotal = 0;
            const lines = viewPurchases.flatMap((p) => (p.items || []).map((it: any) => {
              rowNo++;
              grandTotal += Number(it.subtotal) || 0;
              return (
                <div key={`${p.id}-${it.supply_id}`} className="text-[13px] leading-7">
                  {rowNo}. {it.supply_name} {it.supply_spec || ''} {it.unit} ×{it.quantity}　¥{Number(it.subtotal).toFixed(2)}
                </div>
              );
            }));
            return (
              <div className="mt-3 pt-2">
                <div className="font-bold text-sm text-blue-700 mb-1">附件：采购单明细</div>
                {lines}
                <div className="mt-1 text-sm font-bold text-red-600 border-t border-dashed pt-1">合计：¥{grandTotal.toFixed(2)}</div>
              </div>
            );
          })()}
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <DialogClose asChild><Button variant="outline" size="sm">关闭</Button></DialogClose>
          <Button size="sm" onClick={() => handlePrint(viewItem)}>
            <Printer className="mr-1.5 h-4 w-4" />打印
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );

  // ========== Main Render ==========
  return (
    <div className="space-y-4">
      {formDialog}
      {viewDialog}

      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold flex items-center gap-2"><FileText className="h-5 w-5" /> 请款单管理</h2>
        <Button onClick={openNew} size="sm"><Plus className="mr-1 h-4 w-4" />新建</Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table className="max-h-[65vh]">
            <TableHeader>
              <TableRow>
                <TableHead className="w-10 text-center text-xs">序号</TableHead>
                <TableHead className="text-xs">单号</TableHead>
                <TableHead className="w-24 text-xs">申请日期</TableHead>
                <TableHead className="text-xs">请款内容</TableHead>
                <TableHead className="text-xs">收款人</TableHead>
                <TableHead className="w-24 text-xs">金额</TableHead>
                <TableHead className="w-20 text-center text-xs">状态</TableHead>
                <TableHead className="w-24 text-xs">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={8} className="h-24 text-center text-sm text-muted-foreground">加载中...</TableCell></TableRow>
              ) : items.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="h-24 text-center text-sm text-muted-foreground">暂无请款单</TableCell></TableRow>
              ) : items.map((p, idx) => (
                <TableRow key={p.id}>
                  <TableCell className="text-center text-xs text-muted-foreground">{idx + 1}</TableCell>
                  <TableCell className="font-mono text-xs font-medium">{p.request_no}</TableCell>
                  <TableCell className="text-xs">{formatShortDate(p.request_date)}</TableCell>
                  <TableCell className="text-xs truncate max-w-[200px]">{p.content || '-'}</TableCell>
                  <TableCell className="text-xs">{p.payee || '-'}</TableCell>
                  <TableCell className="font-mono text-sm font-bold">¥{Number(p.amount).toFixed(2)}</TableCell>
                  <TableCell className="text-center">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${p.status === 'submitted' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                      {p.status === 'submitted' ? '已提交' : '草稿'}
                    </span>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex justify-center gap-0.5">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openView(p.id)} title="查看"><Eye className="h-3.5 w-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(p.id)} title="编辑"><Pencil className="h-3.5 w-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:text-red-700" onClick={() => handleDelete(p.id, p.request_no)} title="删除"><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Confirm dialog */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader><DialogTitle>确认操作</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground py-2">{confirmMsg}</p>
          <div className="flex justify-end gap-2">
            <DialogClose asChild><Button variant="outline" size="sm">取消</Button></DialogClose>
            <Button variant="destructive" size="sm" onClick={confirmDelete}>确认删除</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
