import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, 
  Search, 
  DollarSign, 
  Smartphone, 
  History, 
  Sparkles, 
  BadgeAlert, 
  HandCoins,
  CheckCircle,
  X,
  CreditCard
} from 'lucide-react';
import { Sale } from '../types';
import { formatUGX } from '../utils';

interface CustomerLedgerProps {
  sales: Sale[];
  onSettleDebt: (customerName: string, settleAmount: number) => void;
}

export default function CustomerLedger({
  sales,
  onSettleDebt
}: CustomerLedgerProps) {
  const [searchTerm, setSearchTerm] = useState('');
  
  // Debt Settling State popup
  const [settleCustomerName, setSettleCustomerName] = useState<string | null>(null);
  const [settleAmount, setSettleAmount] = useState<number>(0);

  // Group sales data by customer (only for sales that have defined names)
  const customersMap = sales.reduce((acc, sale) => {
    if (!sale.customerName) return acc;
    const name = sale.customerName.trim();
    if (!acc[name]) {
      acc[name] = {
        name,
        phone: sale.customerPhone || 'No Phone provided',
        totalItemsSold: 0,
        totalSalesVolume: 0,
        unpaidBalance: 0,
        salesHistory: [] as Sale[]
      };
    }

    acc[name].totalItemsSold += sale.items.reduce((sum, item) => sum + item.quantity, 0);
    acc[name].totalSalesVolume += sale.totalAmount;
    acc[name].unpaidBalance += sale.balanceDue;
    acc[name].salesHistory.push(sale);

    return acc;
  }, {} as Record<string, {
    name: string;
    phone: string;
    totalItemsSold: number;
    totalSalesVolume: number;
    unpaidBalance: number;
    salesHistory: Sale[];
  }>);

  const customersList = Object.values(customersMap);

  // Filter listings
  const filteredCustomers = customersList.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.phone.includes(searchTerm)
  );

  // Totals
  const totalOutstandingDebts = customersList.reduce((sum, c) => sum + c.unpaidBalance, 0);
  const debtorCount = customersList.filter(c => c.unpaidBalance > 0).length;

  const handleSettleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!settleCustomerName || settleAmount <= 0) return;

    onSettleDebt(settleCustomerName, settleAmount);
    setSettleCustomerName(null);
    setSettleAmount(0);
  };

  return (
    <div className="space-y-6">
      
      {/* Header Info */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-200 pb-5">
        <div>
          <h2 className="font-display text-2xl font-semibold text-zinc-900 flex items-center gap-2">
            Client Directory & Outstanding Debts
          </h2>
          <p className="text-zinc-500 text-xs mt-1 font-sans">Supervise customer loyalty lists, sales logs, and credit balances (bannansi ledger).</p>
        </div>
      </div>

      {/* KPI Stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        
        {/* Total loyalty clients */}
        <div className="bg-white p-5 rounded-xl border border-zinc-200 shadow-2xs">
          <p className="text-xs font-bold text-zinc-400 uppercase tracking-wide">Loyal Cosmetics Clients</p>
          <h3 className="font-space font-bold text-2xl text-zinc-900 mt-2">{customersList.length} Accounts</h3>
          <span className="text-[10px] text-zinc-400 block mt-1">Clients registered via checkout terminal</span>
        </div>

        {/* Total outstanding debt value */}
        <div className="bg-white p-5 rounded-xl border border-zinc-200 shadow-2xs">
          <p className="text-xs font-bold text-royal-700 uppercase tracking-wide">Outstanding Debts balance</p>
          <div className="flex items-baseline gap-2 mt-2">
            <h3 className="font-space font-bold text-2xl text-red-600">{formatUGX(totalOutstandingDebts)}</h3>
            <span className="text-[11px] text-zinc-450 font-semibold font-mono">({debtorCount} Debtor{debtorCount !== 1 ? 's' : ''})</span>
          </div>
          <span className="text-[10px] text-zinc-400 block mt-1">Pending payments due to Elite Beauty</span>
        </div>

        {/* Total loyal revenues */}
        <div className="bg-white p-5 rounded-xl border border-zinc-200 shadow-2xs">
          <p className="text-xs font-bold text-zinc-400 uppercase tracking-wide">Loyal Customer Revenues</p>
          <h3 className="font-space font-bold text-2xl text-emerald-800 mt-2">
            {formatUGX(customersList.reduce((sum, c) => sum + c.totalSalesVolume, 0))}
          </h3>
          <span className="text-[10px] text-zinc-400 block mt-1">Sum total sales to identified clients</span>
        </div>

      </div>

      {/* FILTER AND SEARCH CONTROLS */}
      <div className="bg-white p-4 rounded-xl border border-zinc-200 shadow-2xs">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input 
            type="text" 
            placeholder="Search clients via Name or Telephone contact..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 border border-zinc-200 rounded-lg text-xs focus:ring-1 focus:ring-gold-400 focus:outline-hidden bg-white"
          />
        </div>
      </div>

      {/* MAIN CLIENTS DIRECTORY GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {filteredCustomers.map(customer => (
          <motion.div 
            layout
            key={customer.name}
            className={`bg-white rounded-xl p-5 border shadow-2xs group flex flex-col justify-between ${
              customer.unpaidBalance > 0 ? 'border-red-200 bg-red-50/5' : 'border-zinc-150'
            }`}
          >
            <div>
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-zinc-100 text-royal-700 border border-zinc-200 shrink-0 flex items-center justify-center font-bold">
                    {customer.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h4 className="font-bold text-zinc-900 font-sans">{customer.name}</h4>
                    <span className="text-[10px] text-zinc-400 font-mono flex items-center gap-1 mt-0.5">
                      <Smartphone className="w-3 h-3 text-gold-500 shrink-0" /> {customer.phone}
                    </span>
                  </div>
                </div>

                {customer.unpaidBalance > 0 ? (
                  <span className="px-2 py-1 bg-red-50 border border-red-200 text-red-600 rounded-md text-[10px] font-bold uppercase tracking-wide shrink-0 font-mono">
                    ⚠️ {formatUGX(customer.unpaidBalance).replace(' /-','')} Due
                  </span>
                ) : (
                  <span className="px-2 py-1 bg-emerald-50 text-emerald-705 border border-emerald-100 rounded-md text-[10px] font-bold uppercase shrink-0">
                    ✓ Clear Balance
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4 mt-4 pt-3.5 border-t border-zinc-150 text-center">
                <div>
                  <span className="block text-[10px] text-zinc-400 uppercase tracking-widest leading-none font-semibold">Purchased Items</span>
                  <span className="text-sm font-bold text-zinc-805 mt-1 block">{customer.totalItemsSold} items</span>
                </div>
                <div>
                  <span className="block text-[10px] text-zinc-400 uppercase tracking-widest leading-none font-semibold">Total Revenue</span>
                  <span className="text-sm font-bold text-zinc-900 mt-1 block font-mono">{formatUGX(customer.totalSalesVolume)}</span>
                </div>
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-zinc-150 flex gap-2 items-center justify-between">
              
              {/* Debt settle trigger form button */}
              {customer.unpaidBalance > 0 ? (
                <button
                  type="button"
                  onClick={() => {
                    setSettleCustomerName(customer.name);
                    setSettleAmount(customer.unpaidBalance); // default to pay full
                  }}
                  className="p-1.5 px-3.5 bg-emerald-605 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold tracking-wide active:scale-95 flex items-center gap-1.5 shadow-2xs"
                >
                  <HandCoins className="w-4 h-4 text-emerald-100" /> Settle Debt
                </button>
              ) : (
                <div className="text-[10px] text-zinc-400 italic">No pending debt liability balance.</div>
              )}

              {/* Collapsible short history logs */}
              <div className="text-right text-[10px] text-zinc-400 font-medium font-mono">
                {customer.salesHistory.length} orders recorded
              </div>

            </div>

          </motion.div>
        ))}

        {filteredCustomers.length === 0 && (
          <div className="col-span-full bg-white rounded-xl border border-zinc-200 p-12 text-center text-zinc-450">
            No loyal cosmetics clients found. All cash walk-in accounts have no direct name log.
          </div>
        )}
      </div>

      {/* SETTLE DEBT BALANCE FLOATING DIALOG */}
      <AnimatePresence>
        {settleCustomerName && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-xl shadow-xl max-w-sm w-full p-5 border border-zinc-200"
            >
              <div className="flex items-center justify-between border-b border-zinc-150 pb-3 mb-4">
                <h3 className="font-display font-semibold text-zinc-900 flex items-center gap-1.5">
                  <HandCoins className="w-4.5 h-4.5 text-gold-500" />
                  Settle Credit Balance
                </h3>
                <button onClick={() => setSettleCustomerName(null)} className="text-zinc-400 hover:text-zinc-650">
                  <X className="w-4.5 h-4.5" />
                </button>
              </div>

              <form onSubmit={handleSettleSubmit} className="space-y-4">
                <div>
                  <span className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider block">Customer</span>
                  <p className="font-bold text-zinc-900 mt-0.5 text-base">{settleCustomerName}</p>
                  <p className="text-[11px] font-mono text-royal-700 font-bold mt-1">
                    Total unpaid balance: {formatUGX(customersMap[settleCustomerName].unpaidBalance)}
                  </p>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-zinc-500 uppercase tracking-wider mb-1">
                    Paid Amount (UGX) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={settleAmount}
                    onChange={(e) => setSettleAmount(Math.min(customersMap[settleCustomerName].unpaidBalance, Number(e.target.value)))}
                    className="w-full border border-zinc-200 rounded-lg p-2 text-sm font-bold font-mono text-zinc-900 focus:outline-hidden focus:border-gold-500 bg-white"
                    min="1"
                    max={customersMap[settleCustomerName].unpaidBalance}
                    required
                  />
                  <p className="text-[10px] text-zinc-400 mt-1">
                    Outstanding balance after settlement: <b className="font-mono">{formatUGX(customersMap[settleCustomerName].unpaidBalance - settleAmount)}</b>
                  </p>
                </div>

                <div className="flex gap-2.5 pt-2 border-t border-zinc-150">
                  <button
                    type="button"
                    onClick={() => setSettleCustomerName(null)}
                    className="flex-1 py-1.5 bg-zinc-100 text-zinc-700 hover:bg-zinc-150 rounded-lg text-xs font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-1.5 bg-royal-700 hover:bg-royal-800 text-white rounded-lg text-xs font-bold"
                  >
                    Record Payment
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
