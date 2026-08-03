import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { ShoppingBag, UtensilsCrossed } from 'lucide-react';

const modules = [
  {
    key: 'office',
    title: '办公用品',
    desc: '用品字典管理、采购录入、数据分析',
    path: '/dictionary',
    icon: ShoppingBag,
    color: 'bg-blue-500',
    accent: 'text-blue-600',
    ring: 'hover:border-blue-300 hover:shadow-blue-100',
  },
  {
    key: 'canteen',
    title: '食堂管理',
    desc: '食堂采购、收入、菜单、数据分析',
    path: '/canteen',
    icon: UtensilsCrossed,
    color: 'bg-orange-500',
    accent: 'text-orange-600',
    ring: 'hover:border-orange-300 hover:shadow-orange-100',
  },
];

export default function HomePage() {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">日常事务</h2>
        <p className="text-sm text-muted-foreground mt-1">选择业务模块进入管理</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {modules.map((m) => (
          <Card
            key={m.key}
            className={`cursor-pointer transition-all shadow-sm hover:shadow-md ${m.ring}`}
            onClick={() => navigate(m.path)}
          >
            <CardContent className="p-6 flex flex-col gap-3">
              <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${m.color} text-white`}>
                <m.icon className="h-6 w-6" />
              </div>
              <div>
                <h3 className={`text-lg font-semibold ${m.accent}`}>{m.title}</h3>
                <p className="text-sm text-muted-foreground mt-1">{m.desc}</p>
              </div>
              <div className="text-xs text-slate-400 mt-auto pt-2">点击进入 →</div>
            </CardContent>
          </Card>
        ))}

        {/* 占位卡片：后续模块 */}
        <Card className="border-dashed bg-slate-50/50">
          <CardContent className="p-6 flex flex-col gap-3 items-center justify-center h-full text-center min-h-[160px]">
            <div className="text-slate-300 text-3xl">+</div>
            <p className="text-sm text-slate-400">更多模块建设中</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
