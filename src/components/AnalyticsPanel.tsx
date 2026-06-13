import React, { useMemo } from 'react';
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  PieChart, 
  Pie, 
  Cell 
} from 'recharts';
import { 
  TrendingUp, 
  DollarSign, 
  Sparkles, 
  BarChart3, 
  PieChart as PieIcon, 
  TrendingDown,
  Percent
} from 'lucide-react';
import { Product, Sale, Expense } from '../types';
import { formatUGX } from '../utils';

interface AnalyticsPanelProps {
  products: Product[];
  sales: Sale[];
  expenses: Expense[];
}

export default function AnalyticsPanel({
  products,
  sales,
  expenses
}: AnalyticsPanelProps) {

  // Luxury Royal Blue and Gold themed Palette for charts
  const COLORS = ['#1e40af', '#3b82f6', '#fbbf24', '#f59e0b', '#1e293b', '#64748b'];
  const CATEGORY_COLORS = ['#1e40af', '#3b82f6', '#d97706', '#fbbf24', '#1e293b'];

  // Total sales and profits calculations
  const totalSalesRevenue = sales.reduce((acc, s) => acc + s.totalAmount, 0);

  const totalCOGS = sales.reduce((acc, s) => {
    return acc + s.items.reduce((itemAcc, item) => {
      const prod = products.find(p => p.id === item.productId);
      const finalCost = prod ? prod.costPrice : (item.price * 0.6);
      return itemAcc + (finalCost * item.quantity);
    }, 0);
  }, 0);

  const totalOperatingExpenses = expenses.reduce((acc, e) => acc + e.amount, 0);
  const grossProfit = totalSalesRevenue - totalCOGS;
  const netProfit = grossProfit - totalOperatingExpenses;
  const marginPercentage = totalSalesRevenue > 0 ? (grossProfit / totalSalesRevenue) * 100 : 0;

  // 1. Line Chart Data: Daily Sales & Profit trends for the past 7 days
  const dailyTrendsData = useMemo(() => {
    const datesMap: { [key: string]: { sales: number; profit: number; expenses: number } } = {};
    
    // Seed past 7 days up to today (June 13, 2026)
    const today = new Date('2026-06-13');
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      const str = date.toISOString().split('T')[0];
      datesMap[str] = { sales: 0, profit: 0, expenses: 0 };
    }

    // Accumulate sales
    sales.forEach(sale => {
      const sDate = sale.date.split('T')[0];
      if (datesMap[sDate]) {
        datesMap[sDate].sales += sale.totalAmount;
        
        // Calculate sales items profits
        const cogs = sale.items.reduce((acc, item) => {
          const prod = products.find(p => p.id === item.productId);
          const cost = prod ? prod.costPrice : item.price * 0.6;
          return acc + (cost * item.quantity);
        }, 0);
        
        datesMap[sDate].profit += (sale.totalAmount - cogs);
      }
    });

    // Accumulate operating expenses
    expenses.forEach(exp => {
      const expDate = exp.date;
      if (datesMap[expDate]) {
        datesMap[expDate].expenses += exp.amount;
      }
    });

    return Object.entries(datesMap).map(([date, vals]) => {
      const dateObj = new Date(date);
      const formattedDay = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      return {
        date: formattedDay,
        Sales: vals.sales,
        Profit: vals.profit - vals.expenses, // Net profit
        Expenses: vals.expenses
      };
    });
  }, [sales, expenses, products]);


  // 2. Bar Chart Data: Sales Volume count by Category
  const categorySalesData = useMemo(() => {
    const categoriesMap: { [key: string]: number } = {};
    sales.forEach(sale => {
      sale.items.forEach(item => {
        const prod = products.find(p => p.id === item.productId);
        const cat = prod ? prod.category : 'Makeup';
        categoriesMap[cat] = (categoriesMap[cat] || 0) + item.subtotal;
      });
    });

    return Object.entries(categoriesMap).map(([category, value]) => ({
      name: category,
      Sales: value
    }));
  }, [sales, products]);


  // 3. Pie Chart Data: Portion of sales registered via payments (Cash, Mobile money, etc)
  const paymentsShareData = useMemo(() => {
    const payMap: { [key: string]: number } = {
      'Cash': 0,
      'MTN Mobile Money': 0,
      'Airtel Money': 0,
      'Card': 0,
      'Credit': 0
    };

    sales.forEach(s => {
      if (payMap[s.paymentMethod] !== undefined) {
        payMap[s.paymentMethod] += s.totalAmount;
      }
    });

    return Object.entries(payMap)
      .filter(([_, val]) => val > 0)
      .map(([name, value]) => ({ name, value }));
  }, [sales]);


  // Custom tooltip formatter
  const formatTooltipValue = (value: any) => [`${Number(value).toLocaleString('en-UG')} Shs`];

  return (
    <div className="space-y-6">
      
      {/* Upper description */}
      <div className="flex justify-between items-center border-b border-zinc-200 pb-5">
        <div>
          <h2 className="font-display text-2xl font-semibold text-zinc-900 flex items-center gap-2">
            Store Performance & Financial Reports
          </h2>
          <p className="text-zinc-500 text-xs mt-1">Audit daily revenues, sales margins, operational OpEx, and popular departments.</p>
        </div>
      </div>

      {/* Margins summary card lists */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white p-4 rounded-xl border border-zinc-200 shadow-2xs">
          <span className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">Gross Revenues</span>
          <h4 className="text-lg font-space font-bold text-zinc-900 mt-1 font-mono">{formatUGX(totalSalesRevenue)}</h4>
          <p className="text-[10px] text-zinc-400 mt-1">Cumulated cash drawer intakes</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-zinc-200 shadow-2xs">
          <span className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">Invested COGS Val.</span>
          <h4 className="text-lg font-space font-bold text-zinc-900 mt-1 font-mono">{formatUGX(totalCOGS)}</h4>
          <p className="text-[10px] text-zinc-400 mt-1">Cost of sold high-end beauty goods</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-zinc-200 shadow-2xs">
          <span className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">Operating Expenses</span>
          <h4 className="text-lg font-space font-bold text-royal-700 mt-1 font-mono">{formatUGX(totalOperatingExpenses)}</h4>
          <p className="text-[10px] text-zinc-400 mt-1">Monthly OpEx sum (bills, rent, wages)</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-emerald-100 shadow-2xs bg-emerald-50/5">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[10px] uppercase font-bold text-emerald-600 tracking-wider">Gross Profit Margin</span>
              <h4 className="text-lg font-space font-bold text-emerald-800 mt-1">{marginPercentage.toFixed(1)}%</h4>
            </div>
            <span className="p-1.5 bg-emerald-100 rounded-lg text-emerald-600 shrink-0">
              <Percent className="w-4 h-4" />
            </span>
          </div>
          <p className="text-[10px] text-emerald-700 mt-1">High-end segment profitability margin</p>
        </div>
      </div>

      {/* DATA CHARTS GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* Sales & Profit line chart over time (8 columns) */}
        <div className="lg:col-span-8 bg-white p-5 rounded-xl border border-zinc-200 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-zinc-150 pb-3 mb-4">
            <h3 className="font-display font-semibold text-zinc-900 flex items-center gap-1.5 text-sm">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
              Sales & Net Profit Progression (Past 7 Days)
            </h3>
            <span className="text-[10px] text-zinc-400 font-mono">June 2026 Daily Balance</span>
          </div>

          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dailyTrendsData} margin={{ top: 5, right: 10, left: -5, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4e4e7" opacity={0.5} />
                <XAxis dataKey="date" stroke="#71717a" fontSize={10} tickLine={false} />
                <YAxis stroke="#71717a" fontSize={10} tickFormatter={(val) => `${val / 1000}k`} tickLine={false} />
                <Tooltip formatter={formatTooltipValue} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 10, marginTop: 15 }} />
                <Line type="monotone" dataKey="Sales" stroke="#1e40af" strokeWidth={3} activeDot={{ r: 6 }} name="Gross Sales" />
                <Line type="monotone" dataKey="Profit" stroke="#fbbf24" strokeWidth={3} name="Net Profit" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Category Share Distribution (4 columns) */}
        <div className="lg:col-span-4 bg-white p-5 rounded-xl border border-zinc-200 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-zinc-150 pb-3 mb-4">
            <h3 className="font-display font-semibold text-zinc-900 flex items-center gap-1.5 text-sm">
              <BarChart3 className="w-4 h-4 text-royal-700" />
              Category Revenue Share (UGX)
            </h3>
          </div>

          {categorySalesData.length === 0 ? (
            <div className="h-[280px] flex items-center justify-center text-zinc-400 text-xs">
              Record checkout payments to calculate statistics.
            </div>
          ) : (
            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categorySalesData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4e4e7" opacity={0.5} />
                  <XAxis dataKey="name" stroke="#71717a" fontSize={9} tickLine={false} />
                  <YAxis stroke="#71717a" fontSize={10} tickFormatter={(val) => `${val / 1000}k`} tickLine={false} />
                  <Tooltip formatter={formatTooltipValue} />
                  <Bar dataKey="Sales" fill="#1e40af" radius={[4, 4, 0, 0]}>
                    {categorySalesData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

      </div>

      {/* Payment Modes Distribution Ratio */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* Payment Shares Pie Chart */}
        <div className="bg-white p-5 rounded-xl border border-zinc-200 shadow-2xs">
          <div className="flex items-center justify-between border-b border-zinc-150 pb-3 mb-4">
            <h3 className="font-display font-semibold text-zinc-905 flex items-center gap-1.5 text-sm">
              <PieIcon className="w-4 h-4 text-gold-550" />
              Payment Channel Intakes Ratio
            </h3>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-6 justify-center h-[200px]">
            {paymentsShareData.length === 0 ? (
              <div className="text-zinc-400 text-xs">No orders recorded yet.</div>
            ) : (
              <>
                <div className="w-[180px] h-[180px] shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={paymentsShareData}
                        cx="50%"
                        cy="50%"
                        innerRadius={45}
                        outerRadius={70}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {paymentsShareData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={formatTooltipValue} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                
                <div className="space-y-2 text-xs w-full max-w-[150px]">
                  {paymentsShareData.map((item, index) => {
                    const ratio = totalSalesRevenue > 0 ? (item.value / totalSalesRevenue) * 100 : 0;
                    return (
                      <div key={item.name} className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 truncate">
                          <span className="w-2.5 h-2.5 rounded-full inline-block shrink-0" style={{ backgroundColor: COLORS[index % COLORS.length] }}></span>
                          <span className="text-zinc-700 truncate">{item.name}</span>
                        </div>
                        <span className="font-bold text-zinc-900 shrink-0 font-mono">{ratio.toFixed(0)}%</span>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Stock Turnover overview lists */}
        <div className="bg-white p-5 rounded-xl border border-zinc-200 shadow-2xs">
          <div className="flex items-center justify-between border-b border-zinc-150 pb-3 mb-4">
            <h3 className="font-display font-semibold text-zinc-900 flex items-center gap-1.5 text-sm">
              <Sparkles className="w-4 h-4 text-gold-550" />
              Stock Turnover Overview
            </h3>
          </div>

          <div className="space-y-4 text-xs">
            <div className="bg-royal-50/20 p-3 rounded-xl border border-royal-100/40 flex justify-between items-center">
              <div>
                <span className="block font-bold text-zinc-900">Active Stock Assets</span>
                <p className="text-zinc-550 mt-0.5">Physical cosmetics items counts inside store</p>
              </div>
              <span className="font-space font-bold text-lg text-zinc-805 font-mono">
                {products.reduce((acc, p) => acc + p.quantity, 0)} units
              </span>
            </div>

            <div className="bg-royal-50/20 p-3 rounded-xl border border-royal-100/40 flex justify-between items-center">
              <div>
                <span className="block font-bold text-zinc-900">Store Capital Base</span>
                <p className="text-zinc-550 mt-0.5">Weighted cost basis budget in inventory</p>
              </div>
              <span className="font-space font-bold text-lg text-zinc-805 font-mono">
                {formatUGX(products.reduce((acc, p) => acc + (p.quantity * p.costPrice), 0))}
              </span>
            </div>

            <div className="bg-royal-50/20 p-3 rounded-xl border border-royal-100/40 flex justify-between items-center">
              <div>
                <span className="block font-bold text-zinc-900">Aggregate Retail Value</span>
                <p className="text-zinc-550 mt-0.5">Evaluated sales value of current stock</p>
              </div>
              <span className="font-space font-bold text-lg text-zinc-850 font-mono">
                {formatUGX(products.reduce((acc, p) => acc + (p.quantity * p.sellingPrice), 0))}
              </span>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
