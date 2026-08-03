import { useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import DictionaryTab from './tabs/DictionaryTab';
import PurchaseTab from './tabs/PurchaseTab';
import IncomeTab from './tabs/IncomeTab';
import MenuTab from './tabs/MenuTab';
import AnalyticsTab from './tabs/AnalyticsTab';

export default function CanteenPage() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold flex items-center gap-2">🍚 食堂管理</h2>
      </div>
      <Tabs defaultValue="dictionary">
        <TabsList className="flex w-full overflow-x-auto justify-start bg-slate-100 p-1 rounded-lg">
          <TabsTrigger value="dictionary">数据字典</TabsTrigger>
          <TabsTrigger value="purchase">采购费用</TabsTrigger>
          <TabsTrigger value="income">食堂收入</TabsTrigger>
          <TabsTrigger value="menu">每周菜单</TabsTrigger>
          <TabsTrigger value="analytics">数据分析</TabsTrigger>
        </TabsList>
        <TabsContent value="dictionary"><DictionaryTab /></TabsContent>
        <TabsContent value="purchase"><PurchaseTab /></TabsContent>
        <TabsContent value="income"><IncomeTab /></TabsContent>
        <TabsContent value="menu"><MenuTab /></TabsContent>
        <TabsContent value="analytics"><AnalyticsTab /></TabsContent>
      </Tabs>
    </div>
  );
}
