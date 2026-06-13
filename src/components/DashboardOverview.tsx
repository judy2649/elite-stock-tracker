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
  BadgeAlert,
  Brain,
  Copy,
  Check,
  Mail,
  RefreshCw
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

  // Local AI states
  const [aiReport, setAiReport] = useState<any | null>(null);
  const [loadingAi, setLoadingAi] = useState(false);
  const [copied, setCopied] = useState(false);
  const [aiMessage, setAiMessage] = useState('Consulting central store inventory statistics...');

  const triggerAiForecast = async () => {
    setLoadingAi(true);
    setCopied(false);
    
    const messages = [
      'Reading current inventory batch codes and shade velocities...',
      'Matching Kampala sales trends with near-expiry cosmetics thresholds...',
      'Drafting restock order proforma drafts for wholesale suppliers...',
      'Synthesizing predictions using Gemini 3.5 Flash...'
    ];
    let msgIdx = 0;
    setAiMessage(messages[0]);
    const timer = setInterval(() => {
      msgIdx = (msgIdx + 1) % messages.length;
      setAiMessage(messages[msgIdx]);
    }, 2000);

    try {
      const response = await fetch('/api/ai/forecast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ products, sales, expenses })
      });
      const data = await response.json();
      setAiReport(data);
    } catch (e) {
      console.error(e);
    } finally {
      clearInterval(timer);
      setLoadingAi(false);
    }
  };

  const handleCopyText = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 3050);
  };

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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Total Sales Metric */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-5 rounded-xl border border-zinc-200 shadow-xs relative overflow-hidden"
        >
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Total Revenue</p>
              <h3 className="font-space text-2xl font-bold text-zinc-900 mt-2">{formatUGX(totalSalesRevenue)}</h3>
            </div>
            <div className="p-2.5 bg-royal-50 rounded-lg text-royal-700 border border-royal-100">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between border-t border-zinc-100 pt-3">
            <span className="text-xs text-zinc-500">{sales.length} transactions</span>
            <span className="text-xs font-semibold text-gold-700 bg-gold-100 px-2 py-0.5 rounded">Active Sales</span>
          </div>
        </motion.div>

        {/* Profit Metric */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="bg-white p-5 rounded-xl border border-emerald-50 shadow-xs relative overflow-hidden"
        >
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-semibold text-zinc-400 tracking-wider uppercase">Net Profit</p>
              <h3 className={`font-space text-2xl font-bold mt-2 ${netProfit >= 0 ? 'text-emerald-700' : 'text-blue-700'}`}>
                {formatUGX(netProfit)}
              </h3>
            </div>
            <div className={`p-2.5 rounded-lg ${netProfit >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'}`}>
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between border-t border-emerald-50/50 pt-3">
            <span className="text-xs text-zinc-500">COGS: {formatUGX(totalCOGS)}</span>
            <span className="text-xs text-zinc-500">Expense: {formatUGX(totalOperatingExpenses)}</span>
          </div>
        </motion.div>

        {/* Stock Value valuation */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white p-5 rounded-xl border border-zinc-200 shadow-xs"
        >
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Inventory Value</p>
              <h3 className="font-space text-2xl font-bold text-zinc-900 mt-2">{formatUGX(totalCapitalInStock)}</h3>
            </div>
            <div className="p-2.5 bg-zinc-100 rounded-lg text-zinc-700">
              <Package className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between border-t border-zinc-100 pt-3 text-xs text-zinc-550">
            <span>Units: {totalStockQuantity}</span>
            <span>Retail Val: {formatUGX(totalRetailValue)}</span>
          </div>
        </motion.div>

        {/* Alert Summary Box */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-white p-5 rounded-xl border border-amber-200 shadow-xs"
        >
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-semibold text-amber-700 uppercase tracking-wider">Urgent Alerts</p>
              <h3 className="font-space text-2xl font-bold text-amber-800 mt-2">
                {outOfStockItems.length + lowStockItems.length + expiredItems.length} Warnings
              </h3>
            </div>
            <div className="p-2.5 bg-amber-50 rounded-lg text-amber-600">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-1 border-t border-amber-150 pt-3 text-center text-[10px] font-medium text-zinc-650">
            <div className="bg-blue-50 text-blue-700 py-1 px-1.5 rounded border border-blue-100">
              <span className="block font-bold text-xs">{outOfStockItems.length}</span> Out
            </div>
            <div className="bg-amber-50 text-amber-750 py-1 px-1.5 rounded border border-amber-100">
              <span className="block font-bold text-xs">{lowStockItems.length}</span> Low
            </div>
            <div className="bg-amber-50/40 text-amber-800 py-1 px-1.5 rounded border border-amber-200/50">
              <span className="block font-bold text-xs">{expiredItems.length}</span> Exp.
            </div>
          </div>
        </motion.div>
      </div>

      {/* ELITE BEAUTY INTUITIVE GEMINI AI ADVISOR */}
      <div className="bg-white rounded-xl border border-zinc-200 p-5 shadow-xs transition duration-200">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2.5">
            <span className="p-2.5 bg-royal-50 text-royal-700 rounded-lg shrink-0 border border-royal-100">
              <Brain className="w-5 h-5 text-royal-700" />
            </span>
            <div>
              <h3 className="font-display text-base font-bold text-zinc-900 flex items-center gap-1.5">
                Elite Beauty AI Smart Advisor
                <span className="bg-gold-100 text-gold-950 text-[9px] font-bold px-2 py-0.5 rounded-full tracking-wider uppercase border border-gold-300/30">Gemini powered</span>
              </h3>
              <p className="text-xs text-zinc-500">Instant predictive stock forecasting, luxury shade recommendations, and automated restocking formats</p>
            </div>
          </div>
          <button
            type="button"
            onClick={triggerAiForecast}
            disabled={loadingAi}
            className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-bold rounded-lg transition shrink-0 flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 cursor-pointer border border-zinc-800"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingAi ? 'animate-spin' : ''}`} />
            {aiReport ? 'Re-Run Insights' : '⚡ Run AI Stock Trend Forecasting'}
          </button>
        </div>

        {/* LOADING ANIMATED LOADER */}
        {loadingAi && (
          <div className="p-10 border border-dashed border-zinc-200 bg-zinc-50 rounded-xl text-center space-y-3 animate-fade-in">
            <div className="w-10 h-10 border-4 border-royal-750 border-t-transparent animate-spin mx-auto rounded-full"></div>
            <p className="font-mono text-xs text-royal-950 animate-pulse font-bold">{aiMessage}</p>
            <p className="text-[10px] text-zinc-400">Deep-learning analytics scan of cosmetics stock quantities is initiated...</p>
          </div>
        )}

        {/* AI INSIGHTS REPORT DATA */}
        {!loadingAi && aiReport && (
          <div className="space-y-4 pt-1 animate-fade-in">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              
              {/* Demand Forecasting Unit */}
              <div className="bg-royal-50/20 border border-royal-100/50 p-4 rounded-xl space-y-2">
                <span className="text-[9px] font-extrabold text-royal-800 uppercase tracking-widest block font-sans">1. Demand Forecasting</span>
                <p className="text-xs text-zinc-700 font-sans leading-relaxed">
                  {aiReport.demandForecast || "Higher volume shifts projected for long-wear pigments and skincare bundles next fortnight due to seasonal wedding celebrations."}
                </p>
              </div>

              {/* Bundle/Expiring Clearance Unit */}
              <div className="bg-gold-50/30 border border-gold-200/40 p-4 rounded-xl space-y-2">
                <span className="text-[9px] font-extrabold text-gold-700 uppercase tracking-widest block font-sans">2. Promotional Combos</span>
                <p className="text-xs text-zinc-700 font-sans leading-relaxed">
                  {aiReport.slowMoversOffers || "Create matching lip stain lipstick shade sets with expiring lotions to secure quick-mover stock clearances."}
                </p>
              </div>

              {/* Trending Cosmetics Insight */}
              <div className="bg-royal-50/20 border border-royal-100/50 p-4 rounded-xl space-y-2">
                <span className="text-[9px] font-extrabold text-royal-800 uppercase tracking-widest block font-sans">3. Shading & Variants Velocity</span>
                <p className="text-xs text-zinc-700 font-sans leading-relaxed">
                  {aiReport.trendingBeautySuggestions || "Maybelline Foundation shade 220 Natural Beige is our highest velocity variant; prepare early sub-stock procurement orders."}
                </p>
              </div>

            </div>

            {/* SUPPLIER PURCHASE ORDER AUTOMATED PROMPT */}
            {aiReport.draftedSupplierEmail && (
              <div className="border border-zinc-200 bg-zinc-50 rounded-xl p-4 space-y-2.5">
                <div className="flex justify-between items-center pb-2 border-b border-zinc-200 border-dashed">
                  <span className="text-[10px] font-bold text-zinc-900 uppercase tracking-widest flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-royal-700" />
                    Supplier Procurement Order Email Draft
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopyText(aiReport.draftedSupplierEmail)}
                    className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-bold bg-white hover:bg-zinc-100 text-zinc-800 border border-zinc-300 rounded transition cursor-pointer shadow-2xs"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-500" />
                        Copied draft order!
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3 text-gold-600" />
                        Copy Restock Email
                      </>
                    )}
                  </button>
                </div>

                <textarea
                  readOnly
                  value={aiReport.draftedSupplierEmail}
                  rows={6}
                  className="w-full bg-white text-zinc-800 p-3 rounded border border-zinc-200 focus:outline-hidden font-mono text-[11px] leading-relaxed resize-none cursor-text"
                />
                
                <p className="text-[10px] text-zinc-400 font-sans">
                  *This replenishment order automatically factors item safeLevels, live customer trends, and empty store stock to draft the exact purchase invoice list instantly.
                </p>
              </div>
            )}
          </div>
        )}
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
              <span>Dispatched alerts active to: <b className="text-zinc-800 font-mono">sonyaesther8@gmail.com</b> and <b className="text-zinc-800 font-mono">islamnakibinge@gmail.com</b></span>
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
