import { useState, useRef, useEffect } from 'react';
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { suppliesApi } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import type { Supply, PurchaseItem } from '@/types';
import { Search, Plus } from 'lucide-react';

interface Props {
  onSelect: (item: PurchaseItem) => void;
  inputRef?: React.RefObject<HTMLInputElement>;
}

export default function SupplySearch({ onSelect, inputRef }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Supply[]>([]);
  const [loading, setLoading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    clearTimeout(timerRef.current);
    if (!query.trim()) { setResults([]); return; }
    timerRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const r = await suppliesApi.list({ keyword: query, limit: 20 });
        setResults(r.items);
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => clearTimeout(timerRef.current);
  }, [query]);

  const handleSelect = (supply: Supply) => {
    onSelect({
      supply_id: supply.id,
      supply_name: supply.name,
      supply_spec: supply.spec,
      unit: supply.unit,
      quantity: 1,
      unit_price: supply.unit_price ?? supply.reference_price ?? 0,
      subtotal: supply.unit_price ?? supply.reference_price ?? 0,
    });
    setQuery('');
    setOpen(false);
    setTimeout(() => inputRef?.current?.focus(), 50);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div className="relative" onClick={() => setOpen(true)}>
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <input
            ref={inputRef}
            className="flex h-12 w-full rounded-lg border border-input bg-background pl-10 pr-4 py-3 text-base shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            placeholder="🔍 搜索用品添加到清单（品名/规格）..."
            value={query}
            onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
            onFocus={() => { if (query.trim()) setOpen(true); }}
            onKeyDown={(e) => {
              if (e.key === 'Escape') { setOpen(false); }
              // Arrow keys handled by Command
            }}
          />
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start" sideOffset={4}>
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="继续输入关键字搜索..."
            value={query}
            onValueChange={setQuery}
            className="border-0"
          />
          <CommandList>
            <CommandEmpty>
              {loading ? '搜索中...' : '未找到匹配用品，请先到用品字典中添加'}
            </CommandEmpty>
            <CommandGroup>
              {results.map((supply) => (
                <CommandItem
                  key={supply.id}
                  value={String(supply.id)}
                  onSelect={() => handleSelect(supply)}
                  className="flex items-center justify-between py-3"
                >
                  <div className="flex flex-col gap-0.5">
                    <span className="font-medium">{supply.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {supply.spec} · {supply.category} · {supply.unit}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-blue-600">{formatCurrency(supply.unit_price ?? supply.reference_price ?? 0)}</span>
                    <Button size="icon" className="h-7 w-7 rounded-full">
                      <Plus className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
