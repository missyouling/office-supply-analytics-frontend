import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ComposedChart, Legend, ReferenceLine } from 'recharts';
import type { TrendPoint } from './types';

interface Props {
  monthlyTrend: TrendPoint[];
}

const REASONABLE_LINE = 100; // 合理线参考值

export default function PurchaseEfficiencyChart({ monthlyTrend }: Props) {
  // 标记低于合理线的月份柱体变色
  const chartData = monthlyTrend.map(t => {
    const avg = t.count > 0 ? t.amount / t.count : 0;
    return {
      period: t.period.replace('2026-', ''),
      purchaseCount: t.count,
      avgAmount: Math.round(avg * 100) / 100,
      isLow: avg < REASONABLE_LINE,
    };
  });

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-white border rounded-lg shadow-lg p-3 text-sm">
        <p className="font-medium mb-1">{label}</p>
        {payload.map((p: any, i: number) => (
          <p key={i} style={{ color: p.color }} className="flex justify-between gap-4">
            <span>{p.name}</span>
            <span className="font-mono font-medium">
              {p.name === '采购单数' ? `${p.value} 单` : `¥${Number(p.value).toFixed(2)}`}
            </span>
          </p>
        ))}
      </div>
    );
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">📈 采购频次与效率趋势</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="period" tick={{ fontSize: 11 }} />
              <YAxis yAxisId="left" tick={{ fontSize: 11 }} label={{ value: '单数', angle: -90, position: 'insideLeft', style: { fontSize: 11 } }} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} tickFormatter={v => `¥${v}`} />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              {/* 柱状图为采购单数 */}
              <Bar yAxisId="left" dataKey="purchaseCount" name="采购单数" radius={[4, 4, 0, 0]}
                fill="#2563eb" />
              {/* 折线图为平均金额 */}
              <Line yAxisId="right" type="monotone" dataKey="avgAmount" name="平均单次金额"
                stroke="#16a34a" strokeWidth={2} dot={{ r: 3 }} />
              {/* 合理线 */}
              <ReferenceLine yAxisId="right" y={REASONABLE_LINE} stroke="#dc2626" strokeDasharray="6 3"
                label={{ value: '合理线 ¥100', position: 'right', fontSize: 10 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          💡 柱体表示采购单数，折线为平均单次金额。低于 ¥100 合理线（虚线）的月份存在碎片化风险。
        </p>
      </CardContent>
    </Card>
  );
}
