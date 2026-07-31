import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { OptimizationSuggestion } from './types';
import { Lightbulb, AlertTriangle, Sparkles, Info, CheckCircle2, ArrowRight } from 'lucide-react';

interface Props {
  suggestions: OptimizationSuggestion[];
}

const typeConfig = {
  warning: {
    icon: AlertTriangle,
    color: 'border-yellow-500 bg-yellow-50',
    textColor: 'text-yellow-800',
    badge: 'bg-yellow-100 text-yellow-700',
    label: '⚠️ 预警',
  },
  optimize: {
    icon: Sparkles,
    color: 'border-purple-500 bg-purple-50',
    textColor: 'text-purple-800',
    badge: 'bg-purple-100 text-purple-700',
    label: '💡 优化',
  },
  info: {
    icon: Info,
    color: 'border-blue-500 bg-blue-50',
    textColor: 'text-blue-800',
    badge: 'bg-blue-100 text-blue-700',
    label: 'ℹ️ 提示',
  },
  success: {
    icon: CheckCircle2,
    color: 'border-green-500 bg-green-50',
    textColor: 'text-green-800',
    badge: 'bg-green-100 text-green-700',
    label: '✅ 良好',
  },
};

export default function OptimizationPanel({ suggestions }: Props) {
  if (!suggestions.length) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-yellow-500" />
            AI 采购优化建议
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground py-6">暂无建议，添加更多数据后自动生成</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Lightbulb className="h-4 w-4 text-yellow-500" />
          AI 采购优化建议
          <Badge variant="secondary" className="text-xs ml-1">{suggestions.length} 条</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {suggestions.map((sug) => {
            const cfg = typeConfig[sug.type];
            const Icon = cfg.icon;
            return (
              <div key={sug.id} className={`p-4 rounded-lg border-l-4 ${cfg.color}`}>
                <div className="flex items-start gap-3">
                  <Icon className={`h-5 w-5 mt-0.5 ${sug.type === 'warning' ? 'text-yellow-600' : sug.type === 'optimize' ? 'text-purple-600' : sug.type === 'success' ? 'text-green-600' : 'text-blue-600'}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${cfg.badge}`}>
                        {cfg.label}
                      </span>
                      <h4 className={`text-sm font-medium ${cfg.textColor}`}>{sug.title}</h4>
                    </div>
                    <p className="text-sm text-slate-600 mb-2">{sug.description}</p>
                    <div className="flex flex-wrap items-center gap-2">
                      <Button variant="outline" size="sm" className="h-7 text-xs">
                        {sug.action} <ArrowRight className="ml-1 h-3 w-3" />
                      </Button>
                      {sug.impact && (
                        <span className="text-xs text-muted-foreground">
                          预期效益：{sug.impact}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
