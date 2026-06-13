import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, 
  Trash2, 
  TrendingDown, 
  DollarSign, 
  Calendar, 
  FileText, 
  TrendingUp,
  Sparkles,
  X
} from 'lucide-react';
import { Expense } from '../types';
import { formatUGX } from '../utils';

interface ExpenseTrackerProps {
  expenses: Expense[];
  onAddExpense: (expense: Expense) => void;
  onDeleteExpense: (expenseId: string) => void;
}

const EXPENSE_CATEGORIES: Expense['category'][] = [
  'Rent',
  'Electricity & Water',
  'Transport & Customs',
  'Marketing',
  'Packaging & Delivery',
  'Staff Wages',
  'Other'
];

export default function ExpenseTracker({
  expenses,
  onAddExpense,
  onDeleteExpense
}: ExpenseTrackerProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  
  // Form State
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState<number>(0);
  const [category, setCategory] = useState<Expense['category']>('Other');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');

  // Calculations
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

  // Group by category for visual graph bar representation
  const categoryTotals = expenses.reduce((acc, e) => {
    acc[e.category] = (acc[e.category] || 0) + e.amount;
    return acc;
  }, {} as Record<Expense['category'], number>);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || amount <= 0) return;

    const added: Expense = {
      id: `exp-${Date.now()}`,
      title,
      amount: Number(amount),
      category,
      date,
      notes: notes.trim() || undefined
    };

    onAddExpense(added);
    
    // reset
    setTitle('');
    setAmount(0);
    setCategory('Other');
    setDate(new Date().toISOString().split('T')[0]);
    setNotes('');
    setShowAddForm(false);
  };

  return (
    <div className="space-y-6">
      
      {/* Header Segment */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-200 pb-5">
        <div>
          <h2 className="font-display text-2xl font-semibold text-zinc-900 flex items-center gap-2">
            Store Expenses & Costs Ledger
          </h2>
          <p className="text-zinc-500 text-xs mt-1">Record rent, custom imports shipping, advertising, packaging, and utilities.</p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="px-4 py-2 bg-royal-700 hover:bg-royal-800 text-white rounded-lg font-bold text-sm shadow-sm transition active:scale-95 flex items-center gap-2 self-start md:self-auto shadow-royal-200"
        >
          <Plus className="w-4 h-4 text-gold-300" /> Log Operating Expense
        </button>
      </div>

      {/* Overview stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Metric total expenses */}
        <div className="bg-white p-5 rounded-xl border border-zinc-200 shadow-2xs">
          <p className="text-xs font-bold text-zinc-400 uppercase tracking-wide">Monthly OpEx Total</p>
          <h3 className="font-space font-bold text-2xl text-royal-700 mt-2">{formatUGX(totalExpenses)}</h3>
          <span className="text-[10px] text-zinc-400 block mt-1">Cumulative calculated bills & wages</span>
        </div>

        {/* Categories breakdown visual bar */}
        <div className="bg-white p-4 rounded-xl border border-zinc-200 shadow-2xs col-span-2 flex flex-col justify-between">
          <span className="text-xs font-bold text-zinc-400 uppercase tracking-wide">Expense Category Breakdown</span>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-2.5">
            {EXPENSE_CATEGORIES.map(cat => {
              const spent = categoryTotals[cat] || 0;
              const ratio = totalExpenses > 0 ? (spent / totalExpenses) * 100 : 0;
              
              return (
                <div key={cat} className="bg-royal-50/20 p-2 rounded-lg border border-royal-100/40">
                  <span className="block text-[9px] font-bold text-royal-855 uppercase tracking-tight truncate">{cat}</span>
                  <span className="block text-xs font-semibold text-zinc-900 mt-0.5 font-mono">{formatUGX(spent).replace(' /-','')}</span>
                  <div className="w-full bg-royal-100/50 h-1 rounded-full mt-1.5 overflow-hidden">
                    <div style={{ width: `${ratio}%` }} className="bg-gold-500 h-full"></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* EXPENSES RECORDS LIST */}
      <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden shadow-2xs">
        <div className="p-4 border-b border-zinc-150 bg-zinc-50">
          <h3 className="font-display font-semibold text-zinc-800 text-sm">Operating logs ({expenses.length})</h3>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-zinc-50 border-b border-zinc-200 text-[10px] font-bold text-zinc-550 uppercase tracking-widest leading-none">
                <th className="py-3.5 px-4">Date</th>
                <th className="py-3.5 px-4">Expense Particular Line</th>
                <th className="py-3.5 px-4">Classification</th>
                <th className="py-3.5 px-4 font-mono">Cost Amount</th>
                <th className="py-3.5 px-4">Particular Remarks</th>
                <th className="py-3.5 px-4 text-right">Delete</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 text-xs">
              {expenses.map(e => (
                <tr key={e.id} className="hover:bg-zinc-50 transition leading-tight">
                  <td className="py-3 px-4 font-mono text-[10px] text-zinc-500 shrink-0">
                    {e.date}
                  </td>
                  <td className="py-3 px-4">
                    <h5 className="font-bold text-zinc-800">{e.title}</h5>
                  </td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 bg-zinc-100 text-zinc-700 font-medium text-[10px] rounded-md border border-zinc-200/50">
                      {e.category}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-mono font-bold text-royal-700">
                    {formatUGX(e.amount)}
                  </td>
                  <td className="py-3 px-4 max-w-xxs truncate text-zinc-500 italic text-[11px]">
                    {e.notes || '—'}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={() => {
                        if (confirm(`Remove expense log "${e.title}"?`)) {
                          onDeleteExpense(e.id);
                        }
                      }}
                      className="p-1 px-1.5 text-zinc-400 hover:text-red-650 rounded hover:bg-zinc-100"
                    >
                      <Trash2 className="w-4.5 h-4.5" />
                    </button>
                  </td>
                </tr>
              ))}

              {expenses.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-zinc-400">
                    No operating expenses logged for this month.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ADD EXPENSE DIALOG FORM */}
      <AnimatePresence>
        {showAddForm && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-5 border border-zinc-200"
            >
              <div className="flex items-center justify-between border-b border-zinc-150 pb-3 mb-4">
                <h3 className="font-display font-semibold text-zinc-900 flex items-center gap-1.5">
                  <Sparkles className="w-4.5 h-4.5 text-gold-500" />
                  Log Particular Expense
                </h3>
                <button onClick={() => setShowAddForm(false)} className="text-zinc-400 hover:text-zinc-650">
                  <X className="w-4.5 h-4.5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                
                {/* Title */}
                <div>
                  <label className="block text-[11px] font-bold text-zinc-500 uppercase tracking-wider mb-1">
                    Expense Line Item Description <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. June Shop Rent Arcade"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full border border-zinc-200 rounded-lg p-2 text-xs focus:outline-hidden focus:border-gold-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {/* Amount */}
                  <div>
                    <label className="block text-[11px] font-bold text-zinc-500 uppercase tracking-wider mb-1">
                      Cash Amount (UGX) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      required
                      placeholder="e.g. 150000"
                      value={amount || ''}
                      onChange={(e) => setAmount(Number(e.target.value))}
                      className="w-full border border-zinc-200 rounded-lg p-2 text-xs font-mono font-bold focus:outline-hidden focus:border-gold-500"
                      min="1"
                    />
                  </div>

                  {/* Date */}
                  <div>
                    <label className="block text-[11px] font-bold text-zinc-500 uppercase tracking-wider mb-1">
                      Billing Date
                    </label>
                    <input
                      type="date"
                      required
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="w-full border border-zinc-200 rounded-lg p-2 text-xs font-mono focus:outline-hidden focus:border-gold-500 bg-white"
                    />
                  </div>
                </div>

                {/* Category classification */}
                <div>
                  <label className="block text-[11px] font-bold text-zinc-500 uppercase tracking-wider mb-1">
                    Expense Classification
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as any)}
                    className="w-full border border-zinc-200 rounded-lg p-2 text-xs focus:outline-hidden focus:border-gold-500 bg-white"
                  >
                    {EXPENSE_CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                {/* Remarks notes */}
                <div>
                  <label className="block text-[11px] font-bold text-zinc-500 uppercase tracking-wider mb-1">
                    Receipt Details / Particular notes (optional)
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Add batch reference number, supplier details etc..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full border border-zinc-200 rounded-lg p-2 text-xs focus:outline-hidden focus:border-gold-500"
                  />
                </div>

                {/* submit */}
                <div className="flex gap-2.5 pt-2 border-t border-zinc-200">
                  <button
                    type="button"
                    onClick={() => setShowAddForm(false)}
                    className="flex-1 py-1.5 bg-zinc-100 hover:bg-zinc-150 text-zinc-700 rounded-lg text-xs font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-1.5 bg-royal-700 hover:bg-royal-800 text-white rounded-lg text-xs font-bold"
                  >
                    Record Expense
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
