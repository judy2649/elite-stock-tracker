import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, 
  Search, 
  Smartphone, 
  HandCoins,
  X,
  Plus,
  BadgeAlert
} from 'lucide-react';
import { Sale, Customer } from '../types';
import { formatUGX } from '../utils';

interface CustomerLedgerProps {
  sales: Sale[];
  customers: Customer[];
  onAddCustomer: (customer: Customer) => void;
  onSettleDebt: (customerName: string, settleAmount: number) => void;
}

export default function CustomerLedger({
  sales,
  customers,
  onAddCustomer,
  onSettleDebt
}: CustomerLedgerProps) {
  const [searchTerm, setSearchTerm] = useState('');
  
  // New Customer Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [newCustomer, setNewCustomer] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    notes: ''
  });

  // Debt Settling State popup
  const [settleCustomerName, setSettleCustomerName] = useState<string | null>(null);
  const [settleAmount, setSettleAmount] = useState<number>(0);

  // Group sales data by customer (for statistics)
  const statsMap = sales.reduce((acc, sale) => {
    if (!sale.customerName) return acc;
    const name = sale.customerName.trim();
    if (!acc[name]) {
      acc[name] = {
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
    totalItemsSold: number;
    totalSalesVolume: number;
    unpaidBalance: number;
    salesHistory: Sale[];
  }>);

  // Combine registered customers with their sales stats
  const customersList = customers.map(c => ({
    ...c,
    stats: statsMap[c.name] || {
      totalItemsSold: 0,
      totalSalesVolume: 0,
      unpaidBalance: 0,
      salesHistory: []
    }
  }));

  // Also include customers who have sales but aren't registered yet? 
  // User asked for "admins to be able to add customer names and details through the system"
  // So we'll prioritize registered ones.
  
  // Filter listings
  const filteredCustomers = customersList.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (c.phone && c.phone.includes(searchTerm))
  );

  // Totals
  const totalOutstandingDebts = customersList.reduce((sum, c) => sum + c.stats.unpaidBalance, 0);
  const debtorCount = customersList.filter(c => c.stats.unpaidBalance > 0).length;

  const handleSettleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!settleCustomerName || settleAmount <= 0) return;

    onSettleDebt(settleCustomerName, settleAmount);
    setSettleCustomerName(null);
    setSettleAmount(0);
  };

  const handleAddCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustomer.name) return;

    onAddCustomer({
      ...newCustomer,
      id: `cust-${Date.now()}`,
      createdAt: new Date().toISOString()
    });
    setShowAddModal(false);
    setNewCustomer({ name: '', phone: '', email: '', address: '', notes: '' });
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
        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 bg-royal-700 hover:bg-royal-800 text-white rounded-lg text-sm font-bold flex items-center gap-2 transition active:scale-95 shadow-md"
        >
          <Plus className="w-5 h-5" />
          Register New Client
        </button>
      </div>

      {/* KPI Stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        
        {/* Total loyalty clients */}
        <div className="bg-white p-5 rounded-xl border border-zinc-200 shadow-2xs">
          <p className="text-xs font-bold text-zinc-400 uppercase tracking-wide">Loyal Cosmetics Clients</p>
          <h3 className="font-space font-bold text-2xl text-zinc-900 mt-2">{customersList.length} Accounts</h3>
          <span className="text-[10px] text-zinc-400 block mt-1">Clients registered in directory</span>
        </div>

        {/* Total outstanding debt value */}
        <div className="bg-white p-5 rounded-xl border border-zinc-200 shadow-2xs text-[#4c4c4c]">
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
            {formatUGX(customersList.reduce((sum, c) => sum + c.stats.totalSalesVolume, 0))}
          </h3>
          <span className="text-[10px] text-zinc-400 block mt-1">Sum total sales to loyal clients</span>
        </div>

      </div>

      {/* FILTER AND SEARCH CONTROLS */}
      <div className="bg-white p-4 rounded-xl border border-zinc-200 shadow-2xs">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input 
            type="text" 
            placeholder="Search clients via Name, Telephone or Email..."
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
            key={customer.id}
            className={`bg-white rounded-xl p-5 border shadow-2xs group flex flex-col justify-between ${
              customer.stats.unpaidBalance > 0 ? 'border-red-200 bg-red-50/5' : 'border-zinc-150'
            }`}
          >
            <div>
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-royal-50 text-royal-700 border border-royal-100 shrink-0 flex items-center justify-center font-bold">
                    {customer.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h4 className="font-bold text-zinc-900 font-sans">{customer.name}</h4>
                    <span className="text-[10px] text-zinc-400 font-mono flex items-center gap-1 mt-0.5">
                      <Smartphone className="w-3 h-3 text-gold-500 shrink-0" /> {customer.phone || 'No phone'}
                    </span>
                  </div>
                </div>

                {customer.stats.unpaidBalance > 0 ? (
                  <span className="px-2 py-1 bg-red-50 border border-red-200 text-red-600 rounded-md text-[10px] font-bold uppercase tracking-wide shrink-0 font-mono">
                    ⚠️ {formatUGX(customer.stats.unpaidBalance).replace(' /-','')} Due
                  </span>
                ) : (
                  <span className="px-2 py-1 bg-emerald-50 text-emerald-805 border border-emerald-100 rounded-md text-[10px] font-bold uppercase shrink-0">
                    ✓ Clear Balance
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4 mt-4 pt-3.5 border-t border-zinc-150 text-center text-[#4c4c4c]">
                <div>
                  <span className="block text-[10px] text-zinc-400 uppercase tracking-widest leading-none font-semibold">Purchased Items</span>
                  <span className="text-sm font-bold text-zinc-805 mt-1 block">{customer.stats.totalItemsSold} items</span>
                </div>
                <div>
                  <span className="block text-[10px] text-zinc-400 uppercase tracking-widest leading-none font-semibold">Total Revenue</span>
                  <span className="text-sm font-bold text-zinc-900 mt-1 block font-mono">{formatUGX(customer.stats.totalSalesVolume)}</span>
                </div>
              </div>
              
              {customer.notes && (
                <p className="mt-3 text-[10px] text-zinc-500 bg-zinc-50 p-2 rounded italic">
                  Note: {customer.notes}
                </p>
              )}
            </div>

            <div className="mt-5 pt-3 border-t border-zinc-150 flex gap-2 items-center justify-between text-[#4c4c4c]">
              
              {/* Debt settle trigger form button */}
              {customer.stats.unpaidBalance > 0 ? (
                <button
                  type="button"
                  onClick={() => {
                    setSettleCustomerName(customer.name);
                    setSettleAmount(customer.stats.unpaidBalance); // default to pay full
                  }}
                  className="p-1.5 px-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold tracking-wide active:scale-95 flex items-center gap-1.5 shadow-2xs"
                >
                  <HandCoins className="w-4 h-4 text-emerald-100" /> Settle Debt
                </button>
              ) : (
                <div className="text-[10px] text-zinc-400 italic">No pending debt liability balance.</div>
              )}

              {/* Collapsible short history logs */}
              <div className="text-right text-[10px] text-zinc-400 font-medium font-mono">
                {customer.stats.salesHistory.length} orders recorded
              </div>

            </div>

          </motion.div>
        ))}

        {filteredCustomers.length === 0 && (
          <div className="col-span-full bg-white rounded-xl border border-zinc-200 p-12 text-center text-zinc-450">
            No loyal cosmetics clients found. Add a new customer to get started.
          </div>
        )}
      </div>

      {/* NEW CUSTOMER MODAL */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden"
            >
              <div className="bg-zinc-900 p-4 border-b border-zinc-800 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-gold-500" />
                  <h3 className="text-white font-bold text-sm uppercase tracking-wider">Register New Client</h3>
                </div>
                <button onClick={() => setShowAddModal(false)} className="text-zinc-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleAddCustomer} className="p-6 space-y-4">
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5">Full Name *</label>
                    <input
                      required
                      type="text"
                      value={newCustomer.name}
                      onChange={e => setNewCustomer({ ...newCustomer, name: e.target.value })}
                      placeholder="e.g. Namusoke Prossy"
                      className="w-full bg-zinc-50 border border-zinc-200 rounded-xl p-2.5 text-xs focus:ring-2 focus:ring-gold-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5">Phone Number</label>
                    <input
                      type="tel"
                      value={newCustomer.phone}
                      onChange={e => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                      placeholder="+256 701 ..."
                      className="w-full bg-zinc-50 border border-zinc-200 rounded-xl p-2.5 text-xs focus:ring-2 focus:ring-gold-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5">Email Address</label>
                    <input
                      type="email"
                      value={newCustomer.email}
                      onChange={e => setNewCustomer({ ...newCustomer, email: e.target.value })}
                      placeholder="client@example.com"
                      className="w-full bg-zinc-50 border border-zinc-200 rounded-xl p-2.5 text-xs focus:ring-2 focus:ring-gold-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5">Home/Office Address</label>
                    <input
                      type="text"
                      value={newCustomer.address}
                      onChange={e => setNewCustomer({ ...newCustomer, address: e.target.value })}
                      placeholder="Kampala Road, Suite 4..."
                      className="w-full bg-zinc-50 border border-zinc-200 rounded-xl p-2.5 text-xs focus:ring-2 focus:ring-gold-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5">Preferences / Notes</label>
                    <textarea
                      value={newCustomer.notes}
                      onChange={e => setNewCustomer({ ...newCustomer, notes: e.target.value })}
                      placeholder="Interested in Skin Care, Maybelline shades..."
                      rows={2}
                      className="w-full bg-zinc-50 border border-zinc-200 rounded-xl p-2.5 text-xs focus:ring-2 focus:ring-gold-500 focus:outline-none resize-none"
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="flex-1 py-3 bg-zinc-100 hover:bg-zinc-200 text-zinc-600 text-xs font-bold rounded-xl transition"
                  >
                    Discard
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-3 bg-gold-600 hover:bg-gold-500 text-gold-950 text-xs font-bold rounded-xl transition shadow-lg shadow-gold-500/20"
                  >
                    Save Customer
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* SETTLE DEBT BALANCE FLOATING DIALOG */}
      <AnimatePresence>
        {settleCustomerName && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 border border-zinc-100"
            >
              <div className="flex items-center justify-between border-b border-zinc-100 pb-3 mb-4 text-[#4c4c4c]">
                <h3 className="font-display font-bold text-zinc-900 flex items-center gap-2">
                  <HandCoins className="w-5 h-5 text-gold-500" />
                  Settle Credit Balance
                </h3>
                <button onClick={() => setSettleCustomerName(null)} className="text-zinc-400 hover:text-zinc-650">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSettleSubmit} className="space-y-4">
                <div>
                  <span className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider block">Customer</span>
                  <p className="font-bold text-zinc-900 mt-1 text-base">{settleCustomerName}</p>
                  <p className="text-[11px] font-mono text-royal-700 font-bold mt-1.5 flex items-center gap-1">
                    <BadgeAlert className="w-3.5 h-3.5" />
                    Pending: {formatUGX(statsMap[settleCustomerName].unpaidBalance)}
                  </p>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-zinc-500 uppercase tracking-wider mb-2">
                    Payment Amount (UGX) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={settleAmount}
                    onChange={(e) => setSettleAmount(Math.min(statsMap[settleCustomerName].unpaidBalance, Number(e.target.value)))}
                    className="w-full border border-zinc-200 rounded-xl p-3 text-sm font-bold font-mono text-zinc-900 focus:ring-2 focus:ring-gold-500 focus:outline-none bg-zinc-50"
                    min="1"
                    max={statsMap[settleCustomerName].unpaidBalance}
                    required
                  />
                  <div className="flex justify-between items-center mt-2.5">
                    <span className="text-[10px] text-zinc-400 uppercase font-bold">New Balance:</span>
                    <span className="text-xs font-bold font-mono text-zinc-900">
                      {formatUGX(statsMap[settleCustomerName].unpaidBalance - settleAmount)}
                    </span>
                  </div>
                </div>

                <div className="flex gap-3 pt-4 border-t border-zinc-100">
                  <button
                    type="button"
                    onClick={() => setSettleCustomerName(null)}
                    className="flex-1 py-3 bg-zinc-100 text-zinc-600 hover:bg-zinc-200 rounded-xl text-xs font-bold transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-3 bg-royal-700 hover:bg-royal-800 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-royal-900/20"
                  >
                    Confirm Payment
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
