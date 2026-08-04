import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { PriceAnomaly } from './types';
import { Download, AlertTriangle } from 'lucide-react';

interface Props {
  priceAnomalies: PriceAnomaly[];
}

export default function PriceAnomalyTable({ priceAnomalies }: Props) {
  const categories = useMemo(() => {
    const s = new Set(priceAnomalies.map(a => a.category));
    return ['all', ...Array.from(s)];
  }, [priceAnomalies]);

  const handleExportCsv = () => {
    const header = '品名,规格,分类,上次单价,前次单价,价差%,上次采购日期\n';
    const rows = priceAnomalies.map(a =>
      `${a.supplyName},${a.spec},${a.category},${a.lastUnitPrice},${a.prevUnitPrice},${a.changePercent}%,${a.lastPurchaseDate}`
    ).join('\n');
    const blob = new Blob(['\uFEFF' + header + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `价格异常_${new Date().toISOString().substring(0, 10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  if (priceAnomalies.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">✅ 价格监测</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground py-6">当前筛选条件下无价格异常记录</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2 flex-row items-center justify-between">
        <CardTitle className="text-sm flex items-center gap-2">
          🔍 价格异常监测
          <Badge variant="destructive" className="text-xs">{priceAnomalies.length} 项异常</Badge>
        </CardTitle>
        <Button variant="outline" size="sm" className="h-7 text-xs" onClick={handleExportCsv}>
          <Download className="mr-1 h-3 w-3" />导出 CSV
        </Button>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>品名</TableHead>
                <TableHead>规格</TableHead>
                <TableHead>分类</TableHead>
                <TableHead>上次单价</TableHead>
                <TableHead>前次单价</TableHead>
                <TableHead>价差</TableHead>
                <TableHead>采购日期</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {priceAnomalies.map((a, idx) => {
                const absChg = Math.abs(a.changePercent);
                const rowClass = absChg > 20 ? 'bg-red-50' : absChg > 10 ? 'bg-orange-50' : '';
                return (
                  <TableRow key={idx} className={rowClass}>
                    <TableCell className="font-medium">
                      <span className="flex items-center gap-1">
                        {absChg > 15 && <AlertTriangle className="h-3.5 w-3.5 text-red-500" />}
                        {a.supplyName}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{a.spec}</TableCell>
                    <TableCell><Badge variant="secondary" className="text-xs">{a.category}</Badge></TableCell>
                    <TableCell className="font-mono text-red-600 font-medium">¥{a.lastUnitPrice.toFixed(2)}</TableCell>
                    <TableCell className="font-mono">¥{a.prevUnitPrice.toFixed(2)}</TableCell>
                    <TableCell className="text-center">
                      <span className={`font-mono font-bold ${
                        a.changePercent > 0 ? 'text-red-600' : 'text-green-600'
                      }`}>
                        {a.changePercent > 0 ? '+' : ''}{a.changePercent.toFixed(1)}%
                      </span>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{a.lastPurchaseDate}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
