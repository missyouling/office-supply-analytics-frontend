import { Card, CardContent } from '@/components/ui/card';
import type { KpiData } from './types';

interface Props {
  kpi: KpiData;
}

/** 内联 SVG 迷你趋势图 */
function Sparkline({ data, color }: { data: number[]; color: string }) {
  if (!data.length) return null;
  const w = 80; const h = 28;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const points = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - min) / range) * h}`).join(' ');
  return (
    <svg width={w} height={h} className="flex-shrink-0">
      <polyline fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" points={points} />
      <circle cx={w} cy={h - ((data[data.length - 1] - min) / range) * h} r="2.5" fill={color} />
    </svg>
  );
}

export default function KpiCards({ kpi }: Props) {
  const cards = [
    {
      title: '总采购金额',
      value: `¥${kpi.totalAmount.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}`,
      sub: `较上期 ${kpi.yoyChange >= 0 ? '↑' : '↓'} ${Math.abs(kpi.yoyChange).toFixed(1)}%`,
      subClass: kpi.yoyChange >= 0 ? 'text-red-500' : 'text-green-500',
      trend: kpi.totalAmountTrend,
      color: '#2563eb',
    },
    {
      title: '采购单总数',
      value: `${kpi.totalPurchases} 单`,
      sub: `平均 ${kpi.totalPurchases > 0 ? (kpi.totalAmount / kpi.totalPurchases).toFixed(0) : 0} 元/单`,
      subClass: 'text-muted-foreground',
      trend: kpi.totalPurchasesTrend,
      color: '#16a34a',
    },
    {
      title: '平均单次金额',
      value: `¥${kpi.avgOrderAmount.toFixed(2)}`,
      sub: kpi.totalPurchases > 0 ? '含所有分类' : '暂无数据',
      subClass: 'text-muted-foreground',
      trend: kpi.avgOrderTrend,
      color: '#f59e0b',
    },
    {
      title: '同比变化率',
      value: `${kpi.yoyChange >= 0 ? '+' : ''}${kpi.yoyChange.toFixed(1)}%`,
      sub: kpi.yoyChange > 0 ? '费用增长，注意控制' : kpi.yoyChange < 0 ? '费用下降，趋势良好' : '与上期持平',
      subClass: kpi.yoyChange > 0 ? 'text-red-500' : kpi.yoyChange < 0 ? 'text-green-500' : 'text-muted-foreground',
      trend: kpi.totalAmountTrend.map((v, i) => i > 0 ? ((v - kpi.totalAmountTrend[i - 1]) / kpi.totalAmountTrend[i - 1] * 100) : 0),
      color: kpi.yoyChange > 0 ? '#dc2626' : '#16a34a',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {cards.map((card, idx) => (
        <Card key={idx} className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">{card.title}</p>
                <p className="text-xl font-bold">{card.value}</p>
                <p className={`text-xs ${card.subClass}`}>{card.sub}</p>
              </div>
              <Sparkline data={card.trend} color={card.color} />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
