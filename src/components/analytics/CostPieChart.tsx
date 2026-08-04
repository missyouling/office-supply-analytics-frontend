import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Sector } from 'recharts';
import type { CategoryStats, TopSupplyItem } from './types';
import { Download, ArrowRight } from 'lucide-react';

interface Props {
  categoryStats: CategoryStats[];
  topSupplies: TopSupplyItem[];
}

const COLORS = ['#2563eb', '#16a34a', '#f59e0b', '#dc2626', '#8b5cf6'];

export default function CostPieChart({ categoryStats, topSupplies }: Props) {
  const [drillCat, setDrillCat] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState<number | undefined>();

  const total = categoryStats.reduce((s, c) => s + c.amount, 0);

  const pieData = categoryStats.map((c, i) => ({
    name: c.category,
    value: Math.round(c.amount * 100) / 100,
    pct: c.percentage,
    color: COLORS[i % COLORS.length],
  }));

  // 下钻数据
  const drillSupplies = drillCat
    ? topSupplies.filter(s => s.category === drillCat).slice(0, 5)
    : [];

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const d = payload[0].payload;
    return (
      <div className="bg-white border rounded-lg shadow-lg p-3 text-sm">
        <p className="font-medium">{d.name}</p>
        <p>¥{d.value.toLocaleString()} <span className="text-muted-foreground">({d.pct}%)</span></p>
      </div>
    );
  };

  const renderActiveShape = (props: any) => {
    const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill, payload, percent } = props;
    return (
      <g>
        <text x={cx} y={cy - 8} textAnchor="middle" className="text-lg font-bold" fill="#333">
          ¥{total.toLocaleString()}
        </text>
        <text x={cx} y={cy + 12} textAnchor="middle" className="text-xs" fill="#999">
          总计
        </text>
        <Sector cx={cx} cy={cy} innerRadius={innerRadius} outerRadius={outerRadius + 6}
          startAngle={startAngle} endAngle={endAngle} fill={fill} />
        <Sector cx={cx} cy={cy} innerRadius={outerRadius + 8} outerRadius={outerRadius + 12}
          startAngle={startAngle} endAngle={endAngle} fill={fill} />
      </g>
    );
  };

  return (
    <>
      <Card>
        <CardHeader className="pb-2 flex-row items-center justify-between">
          <CardTitle className="text-sm">🧩 成本结构占比</CardTitle>
          <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => exportCsv(categoryStats)}>
            <Download className="mr-1 h-3 w-3" />导出明细
          </Button>
        </CardHeader>
        <CardContent>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%" cy="50%"
                  innerRadius={65}
                  outerRadius={100}
                  dataKey="value"
                  activeIndex={activeIndex}
                  activeShape={renderActiveShape}
                  onMouseEnter={(_, idx) => setActiveIndex(idx)}
                  onMouseLeave={() => setActiveIndex(undefined)}
                  onClick={(entry) => setDrillCat(entry.name)}
                  style={{ cursor: 'pointer' }}
                >
                  {pieData.map((entry, idx) => (
                    <Cell key={idx} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          {/* 图例 + 可点击下钻提示 */}
          <div className="flex flex-wrap gap-3 mt-2 justify-center">
            {pieData.map((d, i) => (
              <button key={i}
                className="flex items-center gap-1.5 text-xs hover:text-blue-600 transition-colors"
                onClick={() => setDrillCat(d.name)}
              >
                <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: d.color }} />
                {d.name} <span className="text-muted-foreground">{d.pct}%</span>
              </button>
            ))}
          </div>
          <p className="text-xs text-center text-muted-foreground mt-1">
            💡 点击扇区或分类名称可查看 TOP5 用品明细
          </p>
        </CardContent>
      </Card>

      {/* 下钻弹窗 */}
      <Dialog open={!!drillCat} onOpenChange={(v) => { if (!v) setDrillCat(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>📋 {drillCat} - TOP5 用品消耗明细</DialogTitle>
          </DialogHeader>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>品名</TableHead>
                <TableHead>规格</TableHead>
                <TableHead>数量</TableHead>
                <TableHead>金额</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {drillSupplies.length === 0 ? (
                <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">暂无数据</TableCell></TableRow>
              ) : drillSupplies.map(s => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.name}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{s.spec}</TableCell>
                  <TableCell>{s.totalQuantity}</TableCell>
                  <TableCell className="font-mono">¥{s.totalAmount.toFixed(2)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </DialogContent>
      </Dialog>
    </>
  );
}

function exportCsv(stats: CategoryStats[]) {
  const header = '分类,金额,数量,占比\n';
  const rows = stats.map(s => `${s.category},${s.amount},${s.quantity},${s.percentage}%`).join('\n');
  const blob = new Blob(['\uFEFF' + header + rows], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `分类明细_${new Date().toISOString().substring(0, 10)}.csv`;
  a.click(); URL.revokeObjectURL(url);
}
