import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Receipt, 
  Search, 
  Calendar, 
  User, 
  Tag, 
  Download, 
  ChevronDown, 
  ChevronUp, 
  Clock,
  Filter,
  ArrowRight,
  Printer,
  History
} from 'lucide-react';
import { Sale } from '../types';
import { formatUGX } from '../utils';

interface SalesHistoryProps {
  sales: Sale[];
}

export default function SalesHistory({ sales }: SalesHistoryProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedSaleId, setExpandedSaleId] = useState<string | null>(null);
  const [dateFilter, setDateFilter] = useState('all'); // all, today, week, month

  const filteredSales = useMemo(() => {
    return sales.filter(sale => {
      const matchesSearch = 
        sale.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (sale.customerName?.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (sale.customerPhone?.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const saleDate = new Date(sale.date);
      const now = new Date();
      let matchesDate = true;
      
      if (dateFilter === 'today') {
        matchesDate = saleDate.toDateString() === now.toDateString();
      } else if (dateFilter === 'week') {
        const weekAgo = new Date();
        weekAgo.setDate(now.getDate() - 7);
        matchesDate = saleDate >= weekAgo;
      } else if (dateFilter === 'month') {
        const monthAgo = new Date();
        monthAgo.setMonth(now.getMonth() - 1);
        matchesDate = saleDate >= monthAgo;
      }
      
      return matchesSearch && matchesDate;
    });
  }, [sales, searchTerm, dateFilter]);

  const toggleExpand = (id: string) => {
    setExpandedSaleId(expandedSaleId === id ? null : id);
  };

  return (
    <div className="space-y-6">
      {/* Header View */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-200 pb-5">
        <div>
          <h1 className="font-display text-3xl font-bold text-zinc-900 flex items-center gap-2">
            Sales History & Audit <History className="w-7 h-7 text-royal-700" />
          </h1>
          <p className="text-zinc-500 text-sm mt-1 flex items-center gap-1.5">
            <Clock className="w-4 h-4" /> Real-time transaction log from all outlets
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input 
              type="text" 
              placeholder="Search invoice or customer..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-2 bg-white border border-zinc-200 rounded-lg text-sm w-64 focus:ring-2 focus:ring-royal-500/20 focus:border-royal-500 outline-hidden transition-all shadow-sm"
            />
          </div>
          <button className="p-2 bg-white border border-zinc-200 rounded-lg hover:bg-zinc-50 text-zinc-600 transition-colors">
            <Download className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-royal-900 border border-royal-800 p-4 rounded-xl text-white shadow-md">
          <p className="text-royal-300 text-xs font-semibold uppercase tracking-wider mb-1">Total Records</p>
          <div className="flex items-center justify-between">
            <h3 className="text-2xl font-bold font-space">{filteredSales.length}</h3>
            <Receipt className="w-6 h-6 text-royal-400 opacity-50" />
          </div>
        </div>
        <div className="bg-white border border-zinc-200 p-4 rounded-xl shadow-sm">
          <p className="text-zinc-500 text-xs font-semibold uppercase tracking-wider mb-1">Period Revenue</p>
          <div className="flex items-center justify-between">
            <h3 className="text-2xl font-bold text-zinc-900 font-space">
              {formatUGX(filteredSales.reduce((acc, s) => acc + s.totalAmount, 0))}
            </h3>
            <Tag className="w-6 h-6 text-gold-500 opacity-50" />
          </div>
        </div>
        <div className="bg-white border border-zinc-200 p-4 rounded-xl shadow-sm">
          <p className="text-zinc-500 text-xs font-semibold uppercase tracking-wider mb-1">Customer Credit</p>
          <div className="flex items-center justify-between">
            <h3 className="text-2xl font-bold text-rose-600 font-space">
              {formatUGX(filteredSales.reduce((acc, s) => acc + s.balanceDue, 0))}
            </h3>
            <User className="w-6 h-6 text-rose-400 opacity-50" />
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
        {[
          { label: 'All Time', key: 'all' },
          { label: 'Today', key: 'today' },
          { label: 'Last 7 Days', key: 'week' },
          { label: 'Last 30 Days', key: 'month' }
        ].map(filter => (
          <button
            key={filter.key}
            onClick={() => setDateFilter(filter.key)}
            className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all border ${
              dateFilter === filter.key 
                ? 'bg-royal-700 text-white border-royal-700 shadow-sm' 
                : 'bg-white text-zinc-500 border-zinc-200 hover:border-zinc-300'
            }`}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {/* Sales List */}
      <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-zinc-50/80 border-b border-zinc-200">
                <th className="px-6 py-4 text-[11px] font-bold text-zinc-500 uppercase tracking-widest">Invoice</th>
                <th className="px-6 py-4 text-[11px] font-bold text-zinc-500 uppercase tracking-widest">Date & Time</th>
                <th className="px-6 py-4 text-[11px] font-bold text-zinc-500 uppercase tracking-widest">Customer</th>
                <th className="px-6 py-4 text-[11px] font-bold text-zinc-500 uppercase tracking-widest">Payment</th>
                <th className="px-6 py-4 text-[11px] font-bold text-zinc-500 uppercase tracking-widest">Amount</th>
                <th className="px-6 py-4 text-[11px] font-bold text-zinc-500 uppercase tracking-widest right-align">Status</th>
                <th className="w-10 pr-6"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {filteredSales.map((sale) => (
                <React.Fragment key={sale.id}>
                  <tr 
                    className={`hover:bg-zinc-50/50 transition-colors cursor-pointer ${expandedSaleId === sale.id ? 'bg-royal-50/20' : ''}`}
                    onClick={() => toggleExpand(sale.id)}
                  >
                    <td className="px-6 py-4">
                      <span className="font-mono text-xs font-bold text-royal-700">{sale.invoiceNumber}</span>
                      {sale.verificationCode && (
                        <div className="text-[10px] text-zinc-400 mt-0.5">AUTH: {sale.verificationCode}</div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-zinc-900 font-medium">
                        {new Date(sale.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                      </div>
                      <div className="text-[11px] text-zinc-500 flex items-center gap-1 mt-0.5">
                        <Clock className="w-3 h-3" /> {new Date(sale.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-zinc-900 font-semibold">{sale.customerName || 'Walk-in Customer'}</div>
                      <div className="text-[11px] text-zinc-500">{sale.customerPhone || 'No contact provided'}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                        sale.paymentMethod === 'Cash' ? 'bg-zinc-50 text-zinc-600 border-zinc-200' :
                        sale.paymentMethod === 'Card' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                        'bg-gold-50 text-gold-700 border-gold-200'
                      }`}>
                        {sale.paymentMethod}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-mono font-bold text-sm text-zinc-900">
                      {formatUGX(sale.totalAmount)}
                    </td>
                    <td className="px-6 py-4">
                      {sale.balanceDue > 0 ? (
                        <span className="px-2 py-0.5 bg-rose-50 text-rose-700 border border-rose-200 rounded text-[10px] font-bold uppercase">
                          Credit / Due
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded text-[10px] font-bold uppercase">
                          Full Paid
                        </span>
                      )}
                    </td>
                    <td className="pr-6 py-4 text-zinc-400">
                      {expandedSaleId === sale.id ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                    </td>
                  </tr>
                  
                  {/* Expanded Detail View */}
                  <AnimatePresence>
                    {expandedSaleId === sale.id && (
                      <tr>
                        <td colSpan={7} className="px-6 py-0 border-none">
                          <motion.div 
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                          >
                            <div className="py-6 px-10 bg-zinc-50/50 border-x border-zinc-100 mb-4 rounded-b-xl shadow-inner-sm">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div>
                                  <h4 className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest mb-3">Items Purchased</h4>
                                  <div className="space-y-3">
                                    {sale.items.map((item, idx) => (
                                      <div key={idx} className="flex justify-between items-center text-sm">
                                        <div className="flex items-center gap-3">
                                          <div className="w-6 h-6 flex items-center justify-center bg-royal-100 text-royal-700 text-[10px] font-bold rounded-full">
                                            {item.quantity}
                                          </div>
                                          <span className="font-medium text-zinc-800">{item.productName}</span>
                                        </div>
                                        <span className="font-mono text-zinc-600">{formatUGX(item.subtotal)}</span>
                                      </div>
                                    ))}
                                    <div className="pt-3 border-t border-zinc-200 mt-2 flex justify-between items-center font-bold">
                                      <span className="text-zinc-500 text-xs">Total Sales Amount</span>
                                      <span className="text-zinc-900">{formatUGX(sale.totalAmount)}</span>
                                    </div>
                                  </div>
                                </div>
                                
                                <div className="space-y-4">
                                  <div className="bg-white p-4 rounded-xl border border-zinc-200 shadow-xs">
                                     <h4 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2 text-center">Transaction Breakdown</h4>
                                     <div className="space-y-2">
                                       <div className="flex justify-between text-xs">
                                          <span className="text-zinc-500">Subtotal</span>
                                          <span className="text-zinc-800 font-semibold">{formatUGX(sale.totalAmount + sale.discount)}</span>
                                       </div>
                                       {sale.discount > 0 && (
                                         <div className="flex justify-between text-xs">
                                            <span className="text-rose-600">Discount Applied</span>
                                            <span className="text-rose-600 font-semibold">-{formatUGX(sale.discount)}</span>
                                         </div>
                                       )}
                                       <div className="flex justify-between text-xs">
                                          <span className="text-zinc-500">Amount Paid</span>
                                          <span className="text-zinc-800 font-semibold">{formatUGX(sale.paidAmount)}</span>
                                       </div>
                                       <div className="pt-2 border-t border-zinc-100 flex justify-between text-xs font-bold">
                                          <span className="text-zinc-900">Account Balance Due</span>
                                          <span className={`${sale.balanceDue > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                                            {formatUGX(sale.balanceDue)}
                                          </span>
                                       </div>
                                     </div>
                                  </div>
                                  
                                  <div className="flex gap-2">
                                    <button className="flex-1 flex items-center justify-center gap-2 py-2 bg-royal-700 text-white rounded-lg text-xs font-bold hover:bg-royal-800 transition shadow-sm">
                                      <Printer className="w-3.5 h-3.5" /> Print E-Receipt
                                    </button>
                                    <button className="flex-1 flex items-center justify-center gap-2 py-2 bg-white border border-zinc-200 text-zinc-600 rounded-lg text-xs font-bold hover:bg-zinc-50 transition">
                                      <Download className="w-3.5 h-3.5" /> PDF Log
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        </td>
                      </tr>
                    )}
                  </AnimatePresence>
                </React.Fragment>
              ))}

              {filteredSales.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-20 text-center text-zinc-400">
                    <History className="w-12 h-12 mx-auto mb-3 opacity-20" />
                    <p className="font-medium">No sales records found matching your criteria.</p>
                    <p className="text-xs mt-1">Transactions recorded via POS will appear here in real-time.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
