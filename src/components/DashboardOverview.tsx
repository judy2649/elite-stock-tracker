import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  Package, 
  TrendingUp, 
  AlertTriangle, 
  DollarSign, 
  TrendingDown, 
  Layers, 
  Sparkles, 
  Calendar,
  Eye,
  BadgeAlert
} from 'lucide-react';
import { Product, Sale, Expense } from '../types';
import { formatUGX, isOutOfStock, isLowStock, getExpiryStatus } from '../utils';

interface DashboardOverviewProps {
  products: Product[];
  sales: Sale[];
  expenses: Expense[];
  onNavigateToTab: (tab: string) => void;
  onSetProductFilter: (filterClass: string) => void;
}

export default function DashboardOverview({
  products,
  sales,
  expenses,
  onNavigateToTab,
  onSetProductFilter
}: DashboardOverviewProps) {

  // Calculations
  const totalProducts = products.length;
  
  // Total cost and sales values of current stock
  const totalStockQuantity = products.reduce((acc, p) => acc + p.quantity, 0);
  const totalCapitalInStock = products.reduce((acc, p) => acc + (p.quantity * p.costPrice), 0);
  const totalRetailValue = products.reduce((acc, p) => acc + (p.quantity * p.sellingPrice), 0);
  const potentialProfit = totalRetailValue - totalCapitalInStock;

  // Total sales revenue
  const totalSalesRevenue = sales.reduce((acc, s) => acc + s.totalAmount, 0);
  
  // Total cost of goods sold (COGS)
  const totalCOGS = sales.reduce((acc, s) => {
    return acc + s.items.reduce((itemAcc, item) => {
      const prod = products.find(p => p.id === item.productId);
      const cost = prod ? prod.costPrice : (item.price * 0.6); // Fallback: assume 40% margin if deleted
      return itemAcc + (cost * item.quantity);
    }, 0);
  }, 0);

  // Total operating expenses
  const totalOperatingExpenses = expenses.reduce((acc, e) => acc + e.amount, 0);

  // Net Profit = (Sales Revenue - COGS) - Expenses
  const grossProfit = totalSalesRevenue - totalCOGS;
  const netProfit = grossProfit - totalOperatingExpenses;

  // Alerts
  const outOfStockItems = products.filter(isOutOfStock);
  const lowStockItems = products.filter(isLowStock);
  const expiredItems = products.filter(p => getExpiryStatus(p.expiryDate) === 'expired');
  const expiringSoonItems = products.filter(p => getExpiryStatus(p.expiryDate) === 'expiring-soon');

  // Top products sold (by quantity)
  const productSalesMap: { [key: string]: { name: string, qty: number, revenue: number, image: string } } = {};
  sales.forEach(sale => {
    sale.items.forEach(item => {
      if (!productSalesMap[item.productId]) {
        const prod = products.find(p => p.id === item.productId);
        productSalesMap[item.productId] = {
          name: item.productName,
          qty: 0,
          revenue: 0,
          image: prod?.imageUrl || 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=200'
        };
      }
      productSalesMap[item.productId].qty += item.quantity;
      productSalesMap[item.productId].revenue += item.subtotal;
    });
  });

  const topSellingProducts = Object.values(productSalesMap)
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 4);

  return (
    <div className="space-y-6">
      {/* Upper header segment */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-200 pb-5">
        <div>
          <h1 className="font-display text-3xl font-bold text-zinc-900 flex items-center gap-2">
            Elite Beauty Kampala <Sparkles className="w-6 h-6 text-gold-500 fill-gold-100 animate-pulse" />
          </h1>
          <p className="text-zinc-500 text-sm mt-1">Boutique inventory control and point-of-sale console</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => onNavigateToTab('pos')}
            className="px-4 py-2 bg-royal-700 hover:bg-royal-800 text-white rounded-lg font-medium text-sm shadow-xs transition-all active:scale-95 flex items-center gap-2"
          >
            <Sparkles className="w-4 h-4 text-gold-300" /> Register POS Sale
          </button>
        </div>
      </div>

      {/* Core Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Sales Metric */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-4 rounded-xl border border-zinc-200 shadow-sm relative"
        >
          <div className="flex justify-between items-start mb-2">
            <p className="text-[13px] font-medium text-zinc-500">Total Revenue</p>
            <div className="p-1.5 bg-zinc-50 border border-zinc-100 rounded-md text-zinc-600">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <h3 className="font-space text-[22px] font-bold text-zinc-900 tracking-tight">{formatUGX(totalSalesRevenue)}</h3>
          <div className="mt-3 flex items-center justify-between pt-3 border-t border-zinc-100/80">
            <span className="text-xs text-zinc-500">{sales.length} transactions</span>
            <span className="text-[10px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/50">Active</span>
          </div>
        </motion.div>

        {/* Profit Metric */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="bg-white p-4 rounded-xl border border-zinc-200 shadow-sm relative"
        >
          <div className="flex justify-between items-start mb-2">
            <p className="text-[13px] font-medium text-zinc-500">Net Profit</p>
            <div className={`p-1.5 rounded-md border text-zinc-600 ${netProfit >= 0 ? 'bg-emerald-50 border-emerald-100' : 'bg-rose-50 border-rose-100'}`}>
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <h3 className={`font-space text-[22px] font-bold tracking-tight ${netProfit >= 0 ? 'text-zinc-900' : 'text-rose-600'}`}>
            {formatUGX(netProfit)}
          </h3>
          <div className="mt-3 flex items-center justify-between pt-3 border-t border-zinc-100/80">
            <span className="text-[11px] text-zinc-500 truncate mr-2">COGS: {formatUGX(totalCOGS)}</span>
            <span className="text-[10px] font-medium text-zinc-600 bg-zinc-100 px-2 py-0.5 rounded-md border border-zinc-200/50 whitespace-nowrap">Exp: {formatUGX(totalOperatingExpenses)}</span>
          </div>
        </motion.div>

        {/* Stock Value valuation */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white p-4 rounded-xl border border-zinc-200 shadow-sm relative"
        >
          <div className="flex justify-between items-start mb-2">
            <p className="text-[13px] font-medium text-zinc-500">Inventory Value</p>
            <div className="p-1.5 bg-zinc-50 border border-zinc-100 rounded-md text-zinc-600">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <h3 className="font-space text-[22px] font-bold text-zinc-900 tracking-tight">{formatUGX(totalCapitalInStock)}</h3>
          <div className="mt-3 flex items-center justify-between pt-3 border-t border-zinc-100/80">
            <span className="text-xs text-zinc-500">{totalStockQuantity} units</span>
            <span className="text-[10px] font-medium text-amber-700 bg-amber-50 border border-amber-200/50 px-2 py-0.5 rounded-md">Ret: {formatUGX(totalRetailValue)}</span>
          </div>
        </motion.div>

        {/* Alert Summary Box */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-white p-4 rounded-xl border border-zinc-200 shadow-sm relative"
        >
          <div className="flex justify-between items-start mb-2">
            <p className="text-[13px] font-medium text-zinc-500">Urgent Alerts</p>
            <div className="p-1.5 bg-rose-50 border border-rose-100 text-rose-600 rounded-md">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <h3 className="font-space text-[22px] font-bold text-zinc-900 tracking-tight">
            {outOfStockItems.length + lowStockItems.length + expiredItems.length} Warnings
          </h3>
          <div className="mt-3 grid grid-cols-3 gap-1.5 pt-3 border-t border-zinc-100/80">
            <div className="bg-rose-50/50 border border-rose-100 text-rose-700 py-0.5 px-1 rounded-md flex items-center justify-center gap-1.5 shadow-xs">
              <span className="font-bold text-[11px]">{outOfStockItems.length}</span><span className="text-[10px]">Out</span>
            </div>
            <div className="bg-amber-50/50 border border-amber-100 text-amber-700 py-0.5 px-1 rounded-md flex items-center justify-center gap-1.5 shadow-xs">
              <span className="font-bold text-[11px]">{lowStockItems.length}</span><span className="text-[10px]">Low</span>
            </div>
            <div className="bg-blue-50/50 border border-blue-100 text-blue-700 py-0.5 px-1 rounded-md flex items-center justify-center gap-1.5 shadow-xs">
              <span className="font-bold text-[11px]">{expiredItems.length}</span><span className="text-[10px]">Exp</span>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Interactive Alert Actions Board */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
               {/* Core Stock Monitoring Table & Fast RESTOCK panel */}
        <div className="bg-white rounded-xl border border-zinc-200 p-5 lg:col-span-8 shadow-xs">
          <div className="flex items-center justify-between border-b border-zinc-150 pb-3 mb-3">
            <h3 className="font-display text-lg font-semibold text-zinc-900 flex items-center gap-2">
              <AlertTriangle className="w-4.5 h-4.5 text-amber-500" />
              Inventory Alert Center
            </h3>
            <button 
              onClick={() => {
                onSetProductFilter('low-stock');
                onNavigateToTab('stock');
              }}
              className="text-xs text-royal-700 hover:text-royal-800 font-bold"
            >
              Manage Stock
            </button>
          </div>

          <div className="mb-4 p-2.5 bg-royal-50/40 border border-royal-100/60 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-zinc-600">
            <span className="flex items-center gap-2 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></span>
              <span>Dispatched alerts active to: <b className="text-zinc-800 font-mono">sonyaesther8@gmail.com</b>, <b className="text-zinc-800 font-mono">islamnakibinge@gmail.com</b> and <b className="text-zinc-800 font-mono">judithoyoo64@gmail.com</b></span>
            </span>
            <button 
              onClick={() => onNavigateToTab('alerts')}
              className="font-bold text-royal-700 hover:text-royal-800 shrink-0 select-none hover:underline text-left sm:text-right"
            >
              Manage Alerts Center →
            </button>
          </div>

          <div className="space-y-4">
            {outOfStockItems.length === 0 && lowStockItems.length === 0 && expiredItems.length === 0 && expiringSoonItems.length === 0 ? (
              <div className="p-8 text-center text-zinc-400">
                <p className="font-medium text-sm">✓ All stock levels are sufficient and variants are fresh!</p>
              </div>
            ) : (
              <div className="divide-y divide-zinc-100 max-h-[320px] overflow-y-auto pr-2 space-y-3">
                {/* Out of Stock Rows */}
                {outOfStockItems.map(p => (
                  <div key={p.id} className="flex items-center justify-between py-2 gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg overflow-hidden bg-zinc-50 border border-zinc-200 shrink-0">
                        <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" />
                      </div>
                      <div>
                        <h4 className="text-sm font-medium text-gray-900 line-clamp-1">{p.name}</h4>
                        <span className="text-[11px] text-gray-400 font-mono tracking-wider">{p.sku} | {p.category}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200/50 font-bold text-[10px] rounded uppercase">
                        Out of Stock
                      </span>
                      <button 
                        onClick={() => {
                          onSetProductFilter('out-of-stock');
                          onNavigateToTab('stock');
                        }}
                        className="p-1 px-2.5 text-xs font-semibold bg-zinc-900 text-white rounded hover:bg-zinc-800 shrink-0"
                      >
                        Restock
                      </button>
                    </div>
                  </div>
                ))}

                {/* Low Stock Rows */}
                {lowStockItems.map(p => (
                  <div key={p.id} className="flex items-center justify-between py-2 gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg overflow-hidden bg-zinc-50 border border-zinc-200 shrink-0">
                        <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" />
                      </div>
                      <div>
                        <h4 className="text-sm font-medium text-gray-900 line-clamp-1">{p.name}</h4>
                        <span className="text-[11px] text-gray-400 font-mono tracking-wider">{p.sku} | {p.category}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right shrink-0">
                        <span className="block text-xs font-bold text-amber-600">{p.quantity} left</span>
                        <span className="text-[10px] text-gray-400">Min safe: {p.safeLevel}</span>
                      </div>
                      <button 
                        onClick={() => {
                          onSetProductFilter('low-stock');
                          onNavigateToTab('stock');
                        }}
                        className="p-1 px-2.5 text-xs font-semibold bg-royal-700 text-white rounded hover:bg-royal-800"
                      >
                        Add Quantity
                      </button>
                    </div>
                  </div>
                ))}

                {/* Expired / Approaching Rows */}
                {expiredItems.map(p => (
                  <div key={p.id} className="flex items-center justify-between py-2 gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg overflow-hidden bg-zinc-50 border border-zinc-200 shrink-0">
                        <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" />
                      </div>
                      <div>
                        <h4 className="text-sm font-medium text-gray-900 line-clamp-1">{p.name}</h4>
                        <span className="text-[11px] text-blue-600 font-medium pb-0.5">Expired on: {p.expiryDate}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="px-2 py-0.5 bg-blue-50 text-blue-800 border border-blue-200 text-[10px] font-bold rounded uppercase">
                        Expired
                      </span>
                    </div>
                  </div>
                ))}

                {expiringSoonItems.map(p => (
                  <div key={p.id} className="flex items-center justify-between py-2 gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg overflow-hidden bg-blue-50 border border-blue-100 shrink-0">
                        <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" />
                      </div>
                      <div>
                        <h4 className="text-sm font-medium text-gray-900 line-clamp-1">{p.name}</h4>
                        <span className="text-[11px] text-amber-600 font-medium">Expiring: {p.expiryDate}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-bold rounded uppercase">
                        Expiring Soon
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Top Demanded Products (Instagram Favorites) */}
        <div className="bg-white rounded-xl border border-zinc-200 p-5 lg:col-span-4 shadow-xs">
          <div className="flex items-center justify-between border-b border-zinc-150 pb-3 mb-4">
            <h3 className="font-display text-lg font-semibold text-zinc-900 flex items-center gap-2">
              <Sparkles className="w-4.5 h-4.5 text-gold-500" />
              Top Selling Beauty
            </h3>
            <span className="text-[11px] text-royal-700 bg-royal-50 border border-royal-100 px-3 py-0.5 rounded-full font-bold">
              Sales Volume
            </span>
          </div>

          <div className="space-y-4">
            {topSellingProducts.length === 0 ? (
              <div className="p-8 text-center text-zinc-400 text-sm">
                No cosmetics sales recorded yet. Use the POS to record sales.
              </div>
            ) : (
              <div className="space-y-3.5">
                {topSellingProducts.map((item, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <span className="font-space font-bold text-sm text-gold-500 w-4">#{index + 1}</span>
                    <div className="w-12 h-12 rounded-lg bg-zinc-50 overflow-hidden shrink-0 border border-zinc-200">
                      <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-medium text-zinc-900 truncate">{item.name}</h4>
                      <p className="text-xs text-zinc-500 mt-0.5 font-mono">{item.qty} units • {formatUGX(item.revenue)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {/* Quick Business Health Insight summary box */}
          <div className="mt-6 bg-gradient-to-br from-zinc-50 to-royal-50/40 p-4 rounded-xl border border-zinc-200">
            <h4 className="text-xs font-bold text-zinc-900 uppercase tracking-wide">Elite Beauty Performance</h4>
            <p className="text-xs text-zinc-700 leading-relaxed mt-1">
              Store inventory currently manages <b>{totalProducts} listings</b>. Average operating profit margins represent robust cosmetic retail averages in Kampala.
            </p>
          </div>
        </div>

      </div>

      {/* Quick Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div 
          onClick={() => onNavigateToTab('pos')}
          className="p-4 bg-white border border-zinc-200 hover:border-gold-400 rounded-xl cursor-pointer shadow-2xs hover:shadow-xs transition duration-200 group"
        >
          <div className="bg-royal-50 text-royal-700 p-2 rounded-lg inline-block group-hover:bg-royal-100 transition border border-royal-100">
            <Sparkles className="w-5 h-5 text-royal-700" />
          </div>
          <h4 className="font-semibold text-sm text-zinc-900 mt-3">Open POS Terminal</h4>
          <p className="text-xs text-zinc-500 mt-1">Quick checkout, mobile money payment integration, receipt calculator.</p>
        </div>

        <div 
          onClick={() => onNavigateToTab('stock')}
          className="p-4 bg-white border border-zinc-200 hover:border-gold-400 rounded-xl cursor-pointer shadow-2xs hover:shadow-xs transition duration-200 group"
        >
          <div className="bg-royal-50 text-royal-700 p-2 rounded-lg inline-block group-hover:bg-royal-100 transition border border-royal-100">
            <Layers className="w-5 h-5 text-royal-700" />
          </div>
          <h4 className="font-semibold text-sm text-zinc-900 mt-3">Catalog Manager</h4>
          <p className="text-xs text-zinc-500 mt-1">Audit prices, update cosmetics listings, batch edit expiration codes.</p>
        </div>

        <div 
          onClick={() => onNavigateToTab('customers')}
          className="p-4 bg-white border border-zinc-200 hover:border-gold-400 rounded-xl cursor-pointer shadow-2xs hover:shadow-xs transition duration-200 group"
        >
          <div className="bg-royal-50 text-royal-700 p-2 rounded-lg inline-block group-hover:bg-royal-100 transition border border-royal-100">
            <BadgeAlert className="w-5 h-5 text-royal-700" />
          </div>
          <h4 className="font-semibold text-sm text-zinc-900 mt-3">Customer Ledgers & Debts</h4>
          <p className="text-xs text-zinc-500 mt-1">Monitor credit sales (bannansi balance) and register payments smoothly.</p>
        </div>
      </div>
    </div>
  );
}
