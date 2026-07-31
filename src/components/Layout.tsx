import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';

const navItems = [
  { to: '/dictionary', label: '📖 字典' },
  { to: '/purchases', label: '📋 采购单' },
  { to: '/payments', label: '💰 请款单' },
  { to: '/analytics', label: '📊 分析' },
  { to: '/categories', label: '🏷️ 分类' },
  { to: '/suppliers', label: '🏭 供应商' },
  { to: '/settings', label: '⚙️' },
];

export default function Layout() {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-slate-50">
      {/* 顶部导航 */}
      <header className="sticky top-0 z-50 w-full border-b bg-white shadow-sm">
        <div className="mx-auto flex h-14 max-w-6xl items-center px-4 gap-2">
          <h1 className="text-lg font-bold text-blue-700 whitespace-nowrap mr-2">
            劳保用品管理
          </h1>
          <nav className="hidden md:flex items-center gap-0.5 overflow-x-auto">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    'px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap',
                    isActive ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>

      {/* 移动端底部导航 */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden border-t bg-white">
        <div className="flex overflow-x-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  'flex-1 flex flex-col items-center py-2 text-[10px] font-medium min-w-[60px] transition-colors',
                  isActive ? 'text-blue-600' : 'text-slate-500'
                )
              }
            >
              {item.label}
            </NavLink>
          ))}
        </div>
      </nav>

      {/* 主内容区 */}
      <main className="mx-auto max-w-6xl px-4 py-5 pb-20 md:pb-6">
        <Outlet />
      </main>
    </div>
  );
}
