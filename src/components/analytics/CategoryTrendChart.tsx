import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BarChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ComposedChart, Legend } from 'recharts';
import type { TrendPoint, CategoryStats } from './types';

interface Props {
  monthlyTrend: TrendPoint[];
  categoryStats: CategoryStats[];
}

export default function CategoryTrendChart({ monthlyTrend, categoryStats }: Props) {
  const [mode, setMode] = useState<'amount' | 'quantity'>('amount');

  // 合并数据：按月份
  const chartData = monthlyTrend.map(t => {
    const row: any = { period: t.period.replace('2026-', '') };
    row[mode === 'amount' ? 'total' : 'totalQty'] = mode === 'amount' ? t.amount : t.quantity;
    // 按月计算各分类值
    return row;
  });

  // 给每个分类生成系列
  const colors = ['#2563eb', '#16a34a', '#f59e0b', '#dc2626', '#8b5cf6'];

  // 简化版：使用总金额 + 各分类柱状堆叠
  // 因为mock数据只提供了月度汇总，这里使用总趋势展示
  const barData = monthlyTrend.map(t => ({
    period: t.period.replace('2026-', ''),
    [mode === 'amount' ? '总金额' : '总数量']: mode === 'amount' ? t.amount : t.quantity,
  }));

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-white border rounded-lg shadow-lg p-3 text-sm">
        <p className="font-medium mb-1">{label}</p>
        {payload.map((p: any, i: number) => (
          <p key={i} style={{ color: p.color }} className="flex justify-between gap-4">
            <span>{p.name}</span>
            <span className="font-mono font-medium">
              {mode === 'amount' ? `¥${Number(p.value).toLocaleString()}` : p.value.toLocaleString()}
            </span>
          </p>
        ))}
        {payload.length > 0 && (
          <p className="text-xs text-muted-foreground mt-1 border-t pt-1">
            {mode === 'amount'
              ? `占全部 ${categoryStats.length > 0 ? ((payload[0].value / monthlyTrend.reduce((s, t) => s + t.amount, 0)) * 100).toFixed(1) : 0}%`
              : ''}
          </p>
        )}
      </div>
    );
  };

  return (
    <Card>
      <CardHeader className="pb-2 flex-row items-center justify-between">
        <CardTitle className="text-sm">📊 分类费用趋势</CardTitle>
        <div className="flex gap-1">
          <Button size="sm" variant={mode === 'amount' ? 'default' : 'outline'} className="h-7 text-xs px-2" onClick={() => setMode('amount')}>金额</Button>
          <Button size="sm" variant={mode === 'quantity' ? 'default' : 'outline'} className="h-7 text-xs px-2" onClick={() => setMode('quantity')}>数量</Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={barData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="period" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={v => mode === 'amount' ? `¥${(v / 1000).toFixed(0)}k` : String(v)} />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Bar dataKey={mode === 'amount' ? '总金额' : '总数量'} fill="#2563eb" radius={[4, 4, 0, 0]} name={mode === 'amount' ? '总金额' : '总数量'} />
              <Line type="monotone" dataKey={mode === 'amount' ? '总金额' : '总数量'} stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} name="趋势线" />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
