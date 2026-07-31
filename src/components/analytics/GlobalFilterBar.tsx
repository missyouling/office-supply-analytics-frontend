import { useState } from 'react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ALL_CATEGORIES } from './types';
import type { FilterParams } from './types';
import { RotateCcw, Search } from 'lucide-react';

interface Props {
  filters: FilterParams;
  onChange: (f: FilterParams) => void;
  currentTotal: number;
  prevTotal: number;
  changePercent: number;
}

export default function GlobalFilterBar({ filters, onChange, currentTotal, prevTotal, changePercent }: Props) {
  const [localType, setLocalType] = useState(filters.type);
  const [localDate, setLocalDate] = useState(filters.date);
  const [localCats, setLocalCats] = useState(filters.categories);

  const handleApply = () => {
    onChange({ type: localType, date: localDate, categories: localCats });
  };

  const handleReset = () => {
    const now = new Date();
    const t: FilterParams['type'] = 'monthly';
    const d = now.toISOString().substring(0, 7);
    const c = ['all'];
    setLocalType(t); setLocalDate(d); setLocalCats(c);
    onChange({ type: t, date: d, categories: c });
  };

  const handleTypeChange = (v: string) => {
    const t = v as FilterParams['type'];
    setLocalType(t);
    const now = new Date();
    if (t === 'monthly') setLocalDate(now.toISOString().substring(0, 7));
    else if (t === 'half-yearly') setLocalDate(`${now.getFullYear()}-${now.getMonth() < 6 ? '01' : '07'}`);
    else setLocalDate(String(now.getFullYear()));
  };

  const dateType = localType === 'yearly' ? 'number' : 'month';

  return (
    <div className="space-y-3">
      {/* 时间维度 */}
      <div className="flex flex-wrap items-center gap-3">
        <Tabs value={localType} onValueChange={handleTypeChange}>
          <TabsList>
            <TabsTrigger value="monthly">📅 月度</TabsTrigger>
            <TabsTrigger value="half-yearly">📆 半年度</TabsTrigger>
            <TabsTrigger value="yearly">📋 年度</TabsTrigger>
          </TabsList>
        </Tabs>

        <Input
          type={dateType}
          className="w-[160px]"
          value={localDate}
          onChange={e => setLocalDate(e.target.value)}
          min={localType === 'yearly' ? 2020 : undefined}
          max={localType === 'yearly' ? 2030 : undefined}
        />

        {/* 分类多选（简化：Select 单值改为逗号分隔） */}
        <div className="relative">
          <Select
            value={localCats.includes('all') ? 'all' : localCats[0] || 'all'}
            onValueChange={v => setLocalCats(v === 'all' ? ['all'] : [v])}
          >
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="全部分类" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">📂 全部分类</SelectItem>
              {ALL_CATEGORIES.map(c => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button onClick={handleApply}><Search className="mr-1 h-4 w-4" />应用筛选</Button>
        <Button variant="outline" onClick={handleReset}><RotateCcw className="mr-1 h-4 w-4" />重置</Button>
      </div>

      {/* 汇总指标 */}
      <div className="flex flex-wrap items-center gap-4 text-sm bg-blue-50 rounded-lg px-4 py-2">
        <span>
          当前总计：<strong className="text-lg text-blue-700">¥{currentTotal.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}</strong>
        </span>
        <span className="text-muted-foreground">|</span>
        <span>
          上{localType === 'monthly' ? '月' : localType === 'half-yearly' ? '半年' : '年'}：
          ¥{prevTotal.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
        </span>
        <span className="text-muted-foreground">|</span>
        <span className={changePercent >= 0 ? 'text-red-600' : 'text-green-600'}>
          环比：{changePercent >= 0 ? '↑' : '↓'} {Math.abs(changePercent).toFixed(1)}%
          <span className="text-xs ml-1">{changePercent >= 0 ? '⚠️ 超支' : '✅ 降本'}</span>
        </span>
      </div>
    </div>
  );
}
