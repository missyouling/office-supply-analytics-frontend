import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from '@/components/ui/toaster';
import Layout from '@/components/Layout';
import DictionaryPage from '@/components/dictionary/DictionaryPage';
import AnalyticsPage from '@/components/analytics/AnalyticsPage';
import CategoriesPage from '@/components/categories/CategoriesPage';
import SuppliersPage from '@/components/suppliers/SuppliersPage';
import SettingsPage from '@/components/settings/SettingsPage';
import PurchasesPage from '@/components/purchases/PurchasesPage';
import PaymentsPage from '@/components/payments/PaymentsPage';

export default function App() {
  return (
    <BrowserRouter>
      <Toaster />
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Navigate to="/dictionary" replace />} />
          <Route path="/dictionary" element={<DictionaryPage />} />
          <Route path="/analytics" element={<AnalyticsPage />} />
          <Route path="/categories" element={<CategoriesPage />} />
          <Route path="/suppliers" element={<SuppliersPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/purchases" element={<PurchasesPage />} />
          <Route path="/payments" element={<PaymentsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
