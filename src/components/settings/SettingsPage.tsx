import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { showToast } from '@/components/ui/toaster';
import { systemApi } from '@/lib/api';
import { AlertTriangle, RefreshCw, Database, RotateCcw, Trash2, Save, Download, FileText } from 'lucide-react';

const CONFIRM_TEXT = '确认清除';

export default function SettingsPage() {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [typing, setTyping] = useState('');
  const [resetting, setResetting] = useState(false);
  
  // 重置开关状态
  const [resetOptions, setResetOptions] = useState({
    categories: true,
    suppliers: true,
    supplies: true,
    purchases: true,
    payment_requests: true,
  });
  
  // 备份列表
  const [backups, setBackups] = useState<any[]>([]);
  const [loadingBackups, setLoadingBackups] = useState(false);
  const [creatingBackup, setCreatingBackup] = useState(false);
  const [restoringId, setRestoringId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const loadBackups = async () => {
    setLoadingBackups(true);
    try {
      const res = await systemApi.listBackups();
      if (res.ok) setBackups(res.items);
    } catch (e: any) {
      showToast('加载失败', e.message, 'destructive');
    } finally {
      setLoadingBackups(false);
    }
  };

  useEffect(() => { loadBackups(); }, []);

  const handleReset = async () => {
    if (!Object.values(resetOptions).some(v => v)) {
      showToast('提示', '请至少选择一项要清除的数据', 'destructive');
      return;
    }
    setResetting(true);
    try {
      const r = await systemApi.reset(resetOptions);
      if (r.ok) {
        showToast('✅ 系统已初始化', '选中的数据已清除');
        setConfirmOpen(false);
        setTyping('');
      } else {
        showToast('重置失败', r.error || '未知错误', 'destructive');
      }
    } catch (e: any) { showToast('重置失败', e.message, 'destructive'); }
    finally { setResetting(false); }
  };

  const handleCreateBackup = async () => {
    setCreatingBackup(true);
    try {
      const r = await systemApi.createBackup();
      if (r.ok) {
        showToast('✅ 备份创建成功', r.filename);
        loadBackups();
      } else {
        showToast('备份失败', r.error || '未知错误', 'destructive');
      }
    } catch (e: any) { showToast('备份失败', e.message, 'destructive'); }
    finally { setCreatingBackup(false); }
  };

  const handleRestore = async (id: number) => {
    if (!window.confirm('确认恢复此备份？当前数据将被覆盖，不可恢复。')) return;
    setRestoringId(id);
    try {
      const r = await systemApi.restoreBackup(id);
      if (r.ok) {
        showToast('✅ 恢复成功', '页面即将刷新');
        setTimeout(() => window.location.reload(), 1000);
      } else {
        showToast('恢复失败', r.error || '未知错误', 'destructive');
      }
    } catch (e: any) { showToast('恢复失败', e.message, 'destructive'); }
    finally { setRestoringId(null); }
  };

  const handleDeleteBackup = async (id: number) => {
    if (!window.confirm('确认删除此备份记录？')) return;
    setDeletingId(id);
    try {
      const r = await systemApi.deleteBackup(id);
      if (r.ok) { showToast('✅ 已删除'); loadBackups(); }
      else showToast('删除失败', r.error || '未知错误', 'destructive');
    } catch (e: any) { showToast('删除失败', e.message, 'destructive'); }
    finally { setDeletingId(null); }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)}MB`;
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <h2 className="text-xl font-semibold">⚙️ 系统管理</h2>

      {/* 危险操作区 */}
      <Card className="border-red-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            危险操作 - 系统初始化
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            选择要清除的数据，未勾选的项将保留。此操作<strong>不可恢复</strong>，建议先创建备份。
          </p>
          
          <div className="grid gap-3 sm:grid-cols-2">
            <Label className="flex items-center gap-2 cursor-pointer">
              <Switch checked={resetOptions.categories} onCheckedChange={c => setResetOptions(o => ({...o, categories: c}))} />
              <span className="text-sm">分类数据</span>
            </Label>
            <Label className="flex items-center gap-2 cursor-pointer">
              <Switch checked={resetOptions.suppliers} onCheckedChange={c => setResetOptions(o => ({...o, suppliers: c}))} />
              <span className="text-sm">供应商数据</span>
            </Label>
            <Label className="flex items-center gap-2 cursor-pointer">
              <Switch checked={resetOptions.supplies} onCheckedChange={c => setResetOptions(o => ({...o, supplies: c}))} />
              <span className="text-sm">用品字典</span>
            </Label>
            <Label className="flex items-center gap-2 cursor-pointer">
              <Switch checked={resetOptions.purchases} onCheckedChange={c => setResetOptions(o => ({...o, purchases: c}))} />
              <span className="text-sm">采购单记录 (含明细)</span>
            </Label>
            <Label className="flex items-center gap-2 cursor-pointer">
              <Switch checked={resetOptions.payment_requests} onCheckedChange={c => setResetOptions(o => ({...o, payment_requests: c}))} />
              <span className="text-sm">请款单记录</span>
            </Label>
          </div>

          <Button variant="destructive" onClick={() => setConfirmOpen(true)} disabled={resetting}>
            <RefreshCw className="mr-2 h-4 w-4" />
            {resetting ? '重置中...' : '初始化系统（清除选中数据）'}
          </Button>
        </CardContent>
      </Card>

      {/* 二次确认弹窗 */}
      <Dialog open={confirmOpen} onOpenChange={(v) => { if (!v) { setTyping(''); setConfirmOpen(false); } }}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              确认初始化系统
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              此操作将永久删除以下选中的数据，不可恢复。请在下方输入 <strong>{CONFIRM_TEXT}</strong> 确认：
            </p>
            <ul className="text-sm list-disc pl-5 space-y-1 text-muted-foreground">
              {resetOptions.categories && <li>分类数据</li>}
              {resetOptions.suppliers && <li>供应商数据</li>}
              {resetOptions.supplies && <li>用品字典</li>}
              {resetOptions.purchases && <li>采购单记录 (含明细)</li>}
              {resetOptions.payment_requests && <li>请款单记录</li>}
            </ul>
            <Input
              placeholder={`输入「${CONFIRM_TEXT}」确认`}
              value={typing}
              onChange={e => setTyping(e.target.value)}
              autoFocus
            />
          </div>
          <div className="flex justify-end gap-2">
            <DialogClose asChild><Button variant="outline">取消</Button></DialogClose>
            <Button variant="destructive" disabled={typing !== CONFIRM_TEXT || resetting} onClick={handleReset}>
              {resetting ? '清除中...' : '确认清除'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 系统备份区 */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            系统数据备份
          </CardTitle>
          <Button onClick={handleCreateBackup} disabled={creatingBackup} size="sm">
            <Save className="mr-1.5 h-4 w-4" />{creatingBackup ? '备份中...' : '创建备份'}
          </Button>
        </CardHeader>
        <CardContent>
          {loadingBackups ? (
            <div className="text-center py-4 text-muted-foreground">加载中...</div>
          ) : backups.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>暂无备份记录</p>
              <p className="text-xs mt-1">点击上方「创建备份」按钮创建首个备份</p>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="grid grid-cols-[auto_1fr_auto_auto_auto] gap-2 text-xs text-muted-foreground border-b pb-2">
                <span>序号</span>
                <span>文件名</span>
                <span className="text-right">大小</span>
                <span className="text-right">创建时间</span>
                <span>操作</span>
              </div>
              {backups.map((b, i) => (
                <div key={b.id} className="grid grid-cols-[auto_1fr_auto_auto_auto] gap-2 items-center text-sm border-b pb-2 last:border-0">
                  <span className="text-muted-foreground">{backups.length - i}</span>
                  <span className="font-mono truncate">{b.filename}</span>
                  <span className="text-right text-muted-foreground">{formatSize(b.file_size)}</span>
                  <span className="text-right text-muted-foreground">{formatDate(b.created_at)}</span>
                  <div className="flex items-center gap-1 justify-end">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleRestore(b.id)} disabled={restoringId === b.id} title="恢复此备份">
                      <RotateCcw className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:text-red-700" onClick={() => handleDeleteBackup(b.id)} disabled={deletingId === b.id} title="删除备份记录">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}