import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { showToast } from '@/components/ui/toaster';
import SupplySearch from './SupplySearch';
import { useStore } from '@/store';
import { formatCurrency, todayStr } from '@/lib/utils';
import type { PurchaseItem } from '@/types';
import { Download, Copy, Save, Trash2 } from 'lucide-react';

export default function EntryPage() {
  const {
    entryItems, entryDate, lastSavedPurchaseId, lastPurchase,
    setEntryDate, addEntryItem, updateEntryQty, removeEntryItem,
    clearEntry, savePurchase, loadDraft, copyLastPurchaseItems, loadLastPurchase,
  } = useStore();

  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const qtyRefs = useRef<(HTMLInputElement | null)[]>([]);

  // 恢复草稿
  useEffect(() => { loadDraft(); loadLastPurchase(); }, []);

  // 总金额
  const totalAmount = entryItems.reduce((s, i) => s + i.subtotal, 0);

  // 添加用品
  const handleAddItem = useCallback((item: PurchaseItem) => {
    const exists = entryItems.some((i) => i.supply_id === item.supply_id);
    if (exists) {
      showToast('提示', '该用品已在清单中', 'default');
      return;
    }
    addEntryItem(item);
    showToast('已添加', `${item.supply_name} ¥${item.unit_price.toFixed(2)}`);
    // 聚焦搜索框
    setTimeout(() => searchRef.current?.focus(), 50);
  }, [entryItems, addEntryItem]);

  // 保存
  const handleSave = async () => {
    if (entryItems.length === 0) {
      showToast('校验失败', '采购清单不能为空', 'destructive');
      return;
    }
    for (const item of entryItems) {
      if (!item.quantity || item.quantity < 1) {
        showToast('校验失败', `「${item.supply_name}」数量至少为 1`, 'destructive');
        return;
      }
    }
    setSaving(true);
    try {
      await savePurchase();
      showToast('✅ 保存成功', '采购单已保存，可立即录入下一单', 'success');
      setTimeout(() => searchRef.current?.focus(), 100);
    } catch (e: any) {
      showToast('保存失败', e.message, 'destructive');
    } finally {
      setSaving(false);
    }
  };

  // 导出 PDF
  const handleExportPdf = async () => {
    if (!lastSavedPurchaseId && entryItems.length === 0) {
      showToast('提示', '请先保存采购单再导出 PDF', 'default');
      return;
    }
    setExporting(true);
    try {
      // 模拟 PDF 下载
      const blob = new Blob(['Mock PDF content'], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `采购单_${todayStr()}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      showToast('PDF 已导出');
    } catch {
      showToast('导出失败', 'PDF 生成出错', 'destructive');
    } finally {
      setExporting(false);
    }
  };

  // 复制上次采购单
  const handleCopyLast = async () => {
    try {
      await copyLastPurchaseItems();
      showToast('已复制', '上次采购单的用品已加载到清单（数量置为 1）', 'success');
    } catch {
      showToast('复制失败', '没有找到上次采购记录', 'destructive');
    }
  };

  // 键盘导航：在数量输入框按 Tab 切换到下一行，按 Enter 聚焦搜索框
  const handleQtyKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Tab' && !e.shiftKey && index < entryItems.length - 1) {
      e.preventDefault();
      qtyRefs.current[index + 1]?.focus();
      qtyRefs.current[index + 1]?.select();
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      searchRef.current?.focus();
    }
  };

  return (
    <div className="space-y-4 max-w-3xl mx-auto">
      <h2 className="text-xl font-semibold">📝 采购录入</h2>

      {/* 搜索添加区 */}
      <Card>
        <CardContent className="pt-4">
          <SupplySearch onSelect={handleAddItem} inputRef={searchRef} />
        </CardContent>
      </Card>

      {/* 采购清单表格 */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[140px]">品名</TableHead>
                <TableHead className="w-[100px]">规格</TableHead>
                <TableHead className="w-[60px] text-right">单价</TableHead>
                <TableHead className="w-[100px] text-center">数量</TableHead>
                <TableHead className="w-[80px] text-right">小计</TableHead>
                <TableHead className="w-[60px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entryItems.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                    <p>搜索并选择用品添加到清单</p>
                    <p className="text-xs mt-1">支持键盘上下选择，回车添加</p>
                  </TableCell>
                </TableRow>
              ) : (
                entryItems.map((item, idx) => (
                  <TableRow key={item.supply_id}>
                    <TableCell className="font-medium">{item.supply_name}</TableCell>
                    <TableCell className="text-muted-foreground text-xs">{item.supply_spec}</TableCell>
                    <TableCell className="text-right font-mono">{formatCurrency(item.unit_price)}</TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => updateEntryQty(idx, Math.max(1, item.quantity - 1))}
                        >−</Button>
                        <Input
                          ref={(el) => { qtyRefs.current[idx] = el; }}
                          type="number"
                          min="1"
                          className="h-7 w-16 text-center [appearance:textfield]"
                          value={item.quantity}
                          onChange={(e) => {
                            const v = parseInt(e.target.value) || 1;
                            updateEntryQty(idx, Math.max(1, v));
                          }}
                          onFocus={(e) => e.target.select()}
                          onKeyDown={(e) => handleQtyKeyDown(idx, e)}
                        />
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => updateEntryQty(idx, item.quantity + 1)}
                        >+</Button>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-mono font-medium">
                      {formatCurrency(item.subtotal)}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => removeEntryItem(idx)}
                      >
                        <Trash2 className="h-3.5 w-3.5 text-red-500" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* 底部操作栏 */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <label className="text-sm text-muted-foreground">采购日期：</label>
              <Input
                type="date"
                className="w-[160px]"
                value={entryDate}
                onChange={(e) => setEntryDate(e.target.value)}
              />
            </div>
            <div className="text-right">
              <span className="text-sm text-muted-foreground">合计：</span>
              <span className="text-2xl font-bold text-red-600">{formatCurrency(totalAmount)}</span>
            </div>
          </div>

          <Separator className="my-4" />

          <div className="flex flex-wrap items-center gap-3">
            <Button onClick={handleSave} disabled={saving || entryItems.length === 0}>
              <Save className="mr-1 h-4 w-4" />
              {saving ? '保存中...' : '保存采购单'}
            </Button>
            <Button variant="outline" onClick={handleExportPdf} disabled={exporting}>
              <Download className="mr-1 h-4 w-4" />
              {exporting ? '导出中...' : '导出采购单 PDF'}
            </Button>
            <Button variant="outline" onClick={handleCopyLast}>
              <Copy className="mr-1 h-4 w-4" />
              复制上次采购单
            </Button>
            {entryItems.length > 0 && (
              <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={clearEntry}>
                清空清单
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
