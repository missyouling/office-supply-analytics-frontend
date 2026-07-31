import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { LineChart, Line } from 'recharts';
import type { TopSupplyItem } from './types';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface Props {
  topSupplies: TopSupplyItem[];
}

const COLORS = ['#2563eb', '#16a34a', '#f59e0b', '#dc2626', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#84cc16'];

export default function TopConsumptionChart({ topSupplies }: Props) {
  const [historyItem, setHistoryItem] = useState<TopSupplyItem | null>(null);

  const top10 = topSupplies.slice(0, 10);
  const maxAmount = Math.max(...top10.map(s => s.totalAmount), 1);

  const chartData = top10.map(s => ({
    name: s.name.length > 6 ? s.name.substring(0, 6) + '..' : s.name,
    fullName: s.name,
    amount: s.totalAmount,
    qty: s.totalQuantity,
    change: s.priceChangePercent,
  }));

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    const item = top10[payload[0].payload.index] || payload[0].payload;
    const orig = top10.find(s => s.name.startsWith(payload[0].payload.name.replace('..', ''))) || top10[0];
    return (
      <div className="bg-white border rounded-lg shadow-lg p-3 text-sm min-w-[180px]">
        <p className="font-medium mb-1">{orig.name}</p>
        <p>金额：¥{orig.totalAmount.toLocaleString()}</p>
        <p>数量：{orig.totalQuantity}</p>
        <p className={orig.priceChangePercent > 5 ? 'text-red-500' : orig.priceChangePercent < -5 ? 'text-green-500' : ''}>
          均价：¥{orig.avgPrice.toFixed(2)}
          {orig.priceChangePercent !== 0 && (
            <span className="ml-1">({orig.priceChangePercent > 0 ? '↑' : '↓'}{Math.abs(orig.priceChangePercent).toFixed(1)}%)</span>
          )}
        </p>
        <p className="text-xs text-muted-foreground mt-1">点击查看月度趋势</p>
      </div>
    );
  };

  return (
    <>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">🏆 高消耗用品 TOP10（按金额）</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} layout="vertical" margin={{ left: 10, right: 30 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={v => `¥${(v / 1000).toFixed(0)}k`} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={70} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="amount" radius={[0, 4, 4, 0]} onClick={(entry) => {
                  const s = top10.find(item => item.name.startsWith(entry.name.replace('..', '')));
                  if (s) setHistoryItem(s);
                }} style={{ cursor: 'pointer' }}>
                  {chartData.map((_, idx) => (
                    <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap gap-2 mt-1 justify-center text-xs text-muted-foreground">
            {top10.slice(0, 5).map((s, i) => (
              <span key={s.id} className="inline-flex items-center gap-1">
                <span className="w-2 h-2 rounded-full inline-block" style={{ background: COLORS[i] }} />
                {s.name}
                {s.priceChangePercent > 5 ? <TrendingUp className="h-3 w-3 text-red-500" />
                  : s.priceChangePercent < -5 ? <TrendingDown className="h-3 w-3 text-green-500" />
                  : <Minus className="h-3 w-3 text-muted-foreground" />}
              </span>
            ))}
          </div>
          <p className="text-xs text-center text-muted-foreground mt-1">💡 点击条形查看该用品月度消耗趋势</p>
        </CardContent>
      </Card>

      {/* 历史趋势弹窗 */}
      <Dialog open={!!historyItem} onOpenChange={(v) => { if (!v) setHistoryItem(null); }}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              📈 {historyItem?.name} 月度消耗趋势
              <span className="text-sm font-normal text-muted-foreground ml-2">({historyItem?.spec})</span>
            </DialogTitle>
          </DialogHeader>
          {historyItem && (
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={historyItem.monthlyHistory.map(m => ({ ...m, month: m.month.replace('2026-', '') }))}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis yAxisId="left" tick={{ fontSize: 11 }} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Line yAxisId="left" type="monotone" dataKey="quantity" name="数量" stroke="#2563eb" strokeWidth={2} dot={{ r: 3 }} />
                  <Line yAxisId="right" type="monotone" dataKey="amount" name="金额" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
