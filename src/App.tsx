import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from '@/components/ui/toaster';
import Layout from '@/components/Layout';
import HomePage from '@/components/home/HomePage';
import DictionaryPage from '@/components/dictionary/DictionaryPage';
import AnalyticsPage from '@/components/analytics/AnalyticsPage';
import CategoriesPage from '@/components/categories/CategoriesPage';
import SuppliersPage from '@/components/suppliers/SuppliersPage';
import SettingsPage from '@/components/settings/SettingsPage';
import PurchasesPage from '@/components/purchases/PurchasesPage';
import PaymentsPage from '@/components/payments/PaymentsPage';
import CanteenPage from '@/components/canteen/CanteenPage';
import AuthGate from '@/components/AuthGate';

export default function App() {
  return (
    <AuthGate>
    <BrowserRouter>
      <Toaster />
      <Routes>
        <Route element={<Layout />}>
          {/* 首页：日常事务（卡片式业务模块入口） */}
          <Route path="/" element={<HomePage />} />
          {/* 办公用品模块（原页面保持不动） */}
          <Route path="/dictionary" element={<DictionaryPage />} />
          <Route path="/analytics" element={<AnalyticsPage />} />
          <Route path="/categories" element={<CategoriesPage />} />
          <Route path="/suppliers" element={<SuppliersPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/purchases" element={<PurchasesPage />} />
          <Route path="/payments" element={<PaymentsPage />} />
          {/* 食堂管理模块 */}
          <Route path="/canteen" element={<CanteenPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
    </AuthGate>
  );
}
