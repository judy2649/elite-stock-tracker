import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, 
  Package, 
  TrendingUp, 
  DollarSign, 
  LayoutDashboard, 
  Receipt,
  Layers, 
  CircleDollarSign, 
  Users, 
  BarChart3, 
  Instagram, 
  Menu, 
  X,
  CreditCard,
  BellRing
} from 'lucide-react';

import { Product, Sale, Expense } from './types';
import { INITIAL_PRODUCTS, INITIAL_SALES, INITIAL_EXPENSES } from './data';
import DashboardOverview from './components/DashboardOverview';
import PosRegister from './components/PosRegister';
import ProductCatalog from './components/ProductCatalog';
import ExpenseTracker from './components/ExpenseTracker';
import CustomerLedger from './components/CustomerLedger';
import AnalyticsPanel from './components/AnalyticsPanel';
import EmailAlertsSettings from './components/EmailAlertsSettings';
// @ts-ignore
import eliteBeautyBadge from './assets/images/elite_beauty_badge_1781372578945.jpg';

export default function App() {
  // Navigation active tab State
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  
  // Mobile sidebar menu toggle state
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Filter state passed when clicking alerts from Dashboard
  const [productFilterClass, setProductFilterClass] = useState<string>('all');

  // Shared Core state - Loads from LocalStorage or seeds defaults
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);

  // Initial Seed loaders
  useEffect(() => {
    const cachedProducts = localStorage.getItem('elite_beauty_custom_products');
    const cachedSales = localStorage.getItem('elite_beauty_custom_sales');
    const cachedExpenses = localStorage.getItem('elite_beauty_custom_expenses');

    if (cachedProducts) {
      setProducts(JSON.parse(cachedProducts));
    } else {
      setProducts(INITIAL_PRODUCTS);
      localStorage.setItem('elite_beauty_custom_products', JSON.stringify(INITIAL_PRODUCTS));
    }

    if (cachedSales) {
      setSales(JSON.parse(cachedSales));
    } else {
      setSales(INITIAL_SALES);
      localStorage.setItem('elite_beauty_custom_sales', JSON.stringify(INITIAL_SALES));
    }

    if (cachedExpenses) {
      setExpenses(JSON.parse(cachedExpenses));
    } else {
      setExpenses(INITIAL_EXPENSES);
      localStorage.setItem('elite_beauty_custom_expenses', JSON.stringify(INITIAL_EXPENSES));
    }
  }, []);

  // Sync to local storage handlers
  const saveProductsToStorage = (updatedProducts: Product[]) => {
    setProducts(updatedProducts);
    localStorage.setItem('elite_beauty_custom_products', JSON.stringify(updatedProducts));
  };

  const saveSalesToStorage = (updatedSales: Sale[]) => {
    setSales(updatedSales);
    localStorage.setItem('elite_beauty_custom_sales', JSON.stringify(updatedSales));
  };

  const saveExpensesToStorage = (updatedExpenses: Expense[]) => {
    setExpenses(updatedExpenses);
    localStorage.setItem('elite_beauty_custom_expenses', JSON.stringify(updatedExpenses));
  };

  // Automated alerts audit check
  const checkForAutomatedAlerts = (previousProducts: Product[], currentProducts: Product[], triggerSource: string) => {
    // Collect toggle parameters
    const storedToggleLow = localStorage.getItem('elite_beauty_toggle_low');
    const storedToggleOut = localStorage.getItem('elite_beauty_toggle_out');
    const enableLowStock = storedToggleLow ? JSON.parse(storedToggleLow) : true;
    const enableOutOfStock = storedToggleOut ? JSON.parse(storedToggleOut) : true;

    if (!enableLowStock && !enableOutOfStock) return;

    const storedEmails = localStorage.getItem('elite_beauty_admin_emails');
    const adminEmails = storedEmails ? JSON.parse(storedEmails) : ['sonyaesther8@gmail.com', 'islamnakibinge@gmail.com'];

    const newWarnings: string[] = [];
    let isOutOfStockTrigger = false;

    currentProducts.forEach(curr => {
      // Find original listing quantity to see if we breached a boundary
      const prev = previousProducts.find(p => p.id === curr.id);
      
      // Out of Stock trigger transition
      if (enableOutOfStock && curr.quantity === 0 && (!prev || prev.quantity > 0)) {
        newWarnings.push(`🔴 OUT OF STOCK ALERT: "${curr.name}" (SKU: ${curr.sku}) has hit 0 units! (Min Safe Level: ${curr.safeLevel})`);
        isOutOfStockTrigger = true;
      }
      // Low Stock trigger transition
      else if (enableLowStock && curr.quantity <= curr.safeLevel && (!prev || prev.quantity > curr.safeLevel)) {
        newWarnings.push(`⚠️ LOW STOCK WARNING: "${curr.name}" (SKU: ${curr.sku}) dropped to ${curr.quantity} units (Min Safe Level: ${curr.safeLevel})`);
      }
    });

    if (newWarnings.length > 0) {
      const subject = `Elite Beauty Kampala: Automated Stock Alert (${triggerSource})`;
      let emailBody = `ELITE BEAUTY KAMPALA — AUTOMATED SYSTEM ALERT\n`;
      emailBody += `Trigger Event: ${triggerSource}\n`;
      emailBody += `Designated Targets: ${adminEmails.join(', ')}\n`;
      emailBody += `==========================================\n\n`;
      
      emailBody += `The stock ledger has registered the following changes that require attention:\n\n`;
      newWarnings.forEach(w => {
        emailBody += `${w}\n`;
      });
      
      emailBody += `\nAn immediate restock procedure is recommended.`;
      emailBody += `\n\n---\nElite Beauty Stock Automation Controller\nKampala, Uganda`;

      // Log it
      const cachedLogs = localStorage.getItem('elite_beauty_alert_logs');
      const currentLogs = cachedLogs ? JSON.parse(cachedLogs) : [];
      
      const newLog = {
        id: `log-auto-${Date.now()}`,
        recipientList: [...adminEmails],
        subject,
        body: emailBody,
        timestamp: new Date().toLocaleString('en-US'),
        triggerType: isOutOfStockTrigger ? 'Automated Out of Stock' : 'Automated Low Stock',
        status: 'Sent Successfully'
      };

      const updatedLogs = [newLog, ...currentLogs];
      localStorage.setItem('elite_beauty_alert_logs', JSON.stringify(updatedLogs));
    }
  };

  // PRODUCT MUTATORS
  const handleAddProduct = (newProduct: Product) => {
    const updated = [newProduct, ...products];
    checkForAutomatedAlerts(products, updated, `New Catalog Item Registered`);
    saveProductsToStorage(updated);
  };

  const handleUpdateProduct = (updatedProduct: Product) => {
    const updated = products.map(p => p.id === updatedProduct.id ? updatedProduct : p);
    checkForAutomatedAlerts(products, updated, `Catalog Stock Quantity Restocked`);
    saveProductsToStorage(updated);
  };

  const handleDeleteProduct = (productId: string) => {
    const updated = products.filter(p => p.id !== productId);
    saveProductsToStorage(updated);
  };

  // SALES MUTATORS
  const handleRecordSale = (newSale: Sale) => {
    // 1. Append the sale ledger
    const updatedSales = [newSale, ...sales];
    saveSalesToStorage(updatedSales);

    // 2. AUTOMATIC NESTED & MULTI-LOCATION STOCK DECREMENT
    let updatedProducts = [...products];

    newSale.items.forEach(saleItem => {
      // Find the sold product in inventory catalog
      const productIndex = updatedProducts.findIndex(p => p.id === saleItem.productId);
      if (productIndex !== -1) {
        const product = updatedProducts[productIndex];
        
        // Decrement main aggregated quantity
        const newQty = Math.max(0, product.quantity - saleItem.quantity);
        
        // Decrement from specific branch stock or fallback to kampala
        let updatedLocStocks = product.locationStocks ? { ...product.locationStocks } : undefined;
        if (updatedLocStocks) {
          const targetLoc = newSale.location || 'kampala';
          if (targetLoc in updatedLocStocks) {
            updatedLocStocks[targetLoc] = Math.max(0, (updatedLocStocks[targetLoc] as number) - saleItem.quantity);
          } else if ('KampalaHQ' in updatedLocStocks) {
            // Support legacy label if present
            updatedLocStocks.KampalaHQ = Math.max(0, (updatedLocStocks.KampalaHQ as number) - saleItem.quantity);
          } else {
            const firstKey = Object.keys(updatedLocStocks)[0];
            if (firstKey) {
              updatedLocStocks[firstKey] = Math.max(0, (updatedLocStocks[firstKey] as number) - saleItem.quantity);
            }
          }
        }

        updatedProducts[productIndex] = {
          ...product,
          quantity: newQty,
          locationStocks: updatedLocStocks
        };

        // If it's a Bundled Kit item, automatically subtract its constituent products!
        if (product.isBundle && product.bundleComponents) {
          product.bundleComponents.forEach(component => {
            const compProductIndex = updatedProducts.findIndex(cp => cp.id === component.productId);
            if (compProductIndex !== -1) {
              const compProduct = updatedProducts[compProductIndex];
              const compsToDeduct = component.quantity * saleItem.quantity;
              const newCompQty = Math.max(0, compProduct.quantity - compsToDeduct);
              
              let updatedCompLocStocks = compProduct.locationStocks ? { ...compProduct.locationStocks } : undefined;
              if (updatedCompLocStocks) {
                if ('kampala' in updatedCompLocStocks) {
                  updatedCompLocStocks.kampala = Math.max(0, (updatedCompLocStocks.kampala as number) - compsToDeduct);
                } else if ('KampalaHQ' in updatedCompLocStocks) {
                  updatedCompLocStocks.KampalaHQ = Math.max(0, (updatedCompLocStocks.KampalaHQ as number) - compsToDeduct);
                } else {
                  const firstCompKey = Object.keys(updatedCompLocStocks)[0];
                  if (firstCompKey) {
                    updatedCompLocStocks[firstCompKey] = Math.max(0, (updatedCompLocStocks[firstCompKey] as number) - compsToDeduct);
                  }
                }
              }

              updatedProducts[compProductIndex] = {
                ...compProduct,
                quantity: newCompQty,
                locationStocks: updatedCompLocStocks
              };
            }
          });
        }
      }
    });

    checkForAutomatedAlerts(products, updatedProducts, `POS Customer Checkout`);
    saveProductsToStorage(updatedProducts);
  };

  // DEBT SETTLEMENT MUTATOR
  // Settle Outstanding Debt for a client by applying payment amount across their historic credit sales
  const handleSettleDebt = (customerName: string, settleAmount: number) => {
    let remainingPayment = settleAmount;

    // Iterate through sales chronologically from oldest credit sales to pay off debts
    const updatedSales = [...sales].reverse().map(sale => {
      if (sale.customerName?.trim().toLowerCase() === customerName.trim().toLowerCase() && sale.balanceDue > 0) {
        if (remainingPayment <= 0) return sale;

        const originalPay = sale.paidAmount;
        const originalDebt = sale.balanceDue;

        if (remainingPayment >= originalDebt) {
          remainingPayment -= originalDebt;
          return {
            ...sale,
            paidAmount: originalPay + originalDebt,
            balanceDue: 0,
            paymentMethod: originalPay === 0 ? 'Cash' : sale.paymentMethod // Upgrade Mode if fully liquidated
          };
        } else {
          const appliedOfdebt = remainingPayment;
          remainingPayment = 0;
          return {
            ...sale,
            paidAmount: originalPay + appliedOfdebt,
            balanceDue: originalDebt - appliedOfdebt
          };
        }
      }
      return sale;
    });

    // Re-reverse back to original decending order before storing
    saveSalesToStorage(updatedSales.reverse());
    alert(`Payment of ${settleAmount.toLocaleString('en-UG')} Shs successfully logged! Credit ledger updated.`);
  };

  // EXPENSE MUTATORS
  const handleAddExpense = (newExpense: Expense) => {
    const updated = [newExpense, ...expenses];
    saveExpensesToStorage(updated);
  };

  const handleDeleteExpense = (expenseId: string) => {
    const updated = expenses.filter(e => e.id !== expenseId);
    saveExpensesToStorage(updated);
  };

  // Clear products warning indicators click handler
  const handleSetProductFilter = (filterClass: string) => {
    setProductFilterClass(filterClass);
  };

  // Sidebar navigation indices definition
  const NAVIGATION_ITEMS = [
    { key: 'dashboard', label: 'Dashboard Overview', icon: LayoutDashboard },
    { key: 'pos', label: 'Point of Sale (POS)', icon: Receipt },
    { key: 'stock', label: 'Inventory & Catalog', icon: Layers },
    { key: 'expenses', label: 'Expenses Register', icon: CircleDollarSign },
    { key: 'customers', label: 'Clients & Debts', icon: Users },
    { key: 'alerts', label: 'Admin Alert Center', icon: BellRing },
    { key: 'analytics', label: 'Sales Reports', icon: BarChart3 }
  ];

  return (
    <div id="beauty-root-frame" className="flex h-screen bg-zinc-50 overflow-hidden font-sans">
      
      {/* 1. SIDEBAR NAVIGATION - DESKTOP VIEW */}
      <aside className="hidden lg:flex flex-col w-64 bg-zinc-950 text-zinc-300 border-r border-zinc-850 shrink-0 select-none">
        {/* Brand log */}
        <div className="p-3 border-b border-zinc-850 shrink-0">
          <div className="flex flex-col items-center justify-center gap-2">
            <div className="w-full h-32 rounded-xl overflow-hidden border border-gold-500/20 shadow-lg bg-black">
              <img 
                src={eliteBeautyBadge} 
                alt="Elite Beauty Badge" 
                className="w-full h-full object-contain"
                referrerPolicy="no-referrer"
              />
            </div>
          </div>
        </div>

        {/* Navigation list */}
        <nav className="flex-grow p-4 space-y-1.5 overflow-y-auto">
          {NAVIGATION_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.key;
            return (
              <button
                key={item.key}
                onClick={() => {
                  setActiveTab(item.key);
                  if (item.key !== 'stock') setProductFilterClass('all'); // Clear alerts
                }}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg font-medium text-xs transition duration-150 ${
                  isActive 
                    ? 'bg-royal-800/90 text-gold-400 border-l-4 border-gold-500 shadow-md font-semibold' 
                    : 'hover:bg-zinc-900 hover:text-white text-zinc-400'
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-gold-400' : 'text-zinc-500'}`} />
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Instagram Account footer panel */}
        <div className="p-4 border-t border-zinc-900 text-xs shrink-0 bg-zinc-950/40">
          <a 
            href="https://www.instagram.com/elite_beauty256/" 
            target="_blank" 
            referrerPolicy="no-referrer"
            className="flex items-center gap-2 text-[11px] text-zinc-400 hover:text-white transition group"
          >
            <span className="p-1.5 bg-zinc-900 border border-zinc-850 rounded text-gold-400 group-hover:scale-105 transition">
              <Instagram className="w-4 h-4" />
            </span>
            <div>
              <span className="block font-semibold">@elite_beauty256</span>
              <span className="text-[9px] text-gold-500">View Instagram Shop</span>
            </div>
          </a>
        </div>
      </aside>

      {/* 2. MAIN CONTAINER */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        
        {/* UPPER CONCISE NAVBAR */}
        <header className="sticky top-0 z-30 bg-zinc-900 border-b border-zinc-850 flex items-center justify-between px-5 py-3 shrink-0">
          
          {/* Mobile hamburger menu */}
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="p-1.5 lg:hidden text-zinc-300 hover:bg-zinc-850 rounded"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Breadcrumb section */}
          <div className="flex items-center gap-2">
            <span className="font-space font-bold uppercase tracking-wider text-[11px] text-gold-400 bg-royal-950 border border-gold-500/20 px-2.5 py-0.5 rounded-full">
               Live Terminal
            </span>
            <span className="text-zinc-700 text-xs hidden sm:inline">|</span>
            <span className="text-zinc-400 text-xs font-mono font-medium hidden sm:inline">
              Location: Kampala Central, UG
            </span>
          </div>

          {/* User metadata indicators info */}
          <div className="flex items-center gap-3.5">
            {/* Quick Warning badge notifier */}
            <div className="p-1.5 bg-zinc-800 rounded-full border border-zinc-700 relative text-gold-400">
              <BellRing className="w-4 h-4" />
              {products.filter(p => p.quantity <= p.safeLevel).length > 0 && (
                <span className="absolute top-0.5 right-0.5 w-2 h-2 rounded-full bg-gold-400 animate-ping"></span>
              )}
            </div>

            <div className="flex items-center gap-2 text-xs">
              <div className="w-8 h-8 rounded-full bg-royal-700 text-gold-400 flex items-center justify-center font-extrabold font-sans border border-gold-500/30 shadow-sm">
                EB
              </div>
              <div className="hidden md:block">
                <span className="block font-semibold font-sans leading-none text-white uppercase tracking-wider">Elite Beauty</span>
                <span className="text-[9px] text-zinc-500 font-mono">Central Management Terminal</span>
              </div>
            </div>
          </div>
        </header>

        {/* 3. SCROLLABLE TAB CHANGER WINDOW */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-slate-50/50 leading-normal">
          {activeTab === 'dashboard' && (
            <DashboardOverview 
              products={products}
              sales={sales}
              expenses={expenses}
              onNavigateToTab={(tab) => {
                setActiveTab(tab);
                setProductFilterClass('all');
              }}
              onSetProductFilter={handleSetProductFilter}
            />
          )}

          {activeTab === 'pos' && (
            <PosRegister 
              products={products}
              onRecordSale={handleRecordSale}
              existingSalesCount={sales.length}
            />
          )}

          {activeTab === 'stock' && (
            <ProductCatalog 
              products={products}
              sales={sales}
              onRecordSale={handleRecordSale}
              onAddProduct={handleAddProduct}
              onUpdateProduct={handleUpdateProduct}
              onDeleteProduct={handleDeleteProduct}
              initialFilterClass={productFilterClass}
            />
          )}

          {activeTab === 'expenses' && (
            <ExpenseTracker 
              expenses={expenses}
              onAddExpense={handleAddExpense}
              onDeleteExpense={handleDeleteExpense}
            />
          )}

          {activeTab === 'customers' && (
            <CustomerLedger 
              sales={sales}
              onSettleDebt={handleSettleDebt}
            />
          )}

          {activeTab === 'analytics' && (
            <AnalyticsPanel 
              products={products}
              sales={sales}
              expenses={expenses}
            />
          )}

          {activeTab === 'alerts' && (
            <EmailAlertsSettings 
              products={products}
            />
          )}
        </main>
      </div>

      {/* 4. MOBILE DRAWER OVERLAY POPUP */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 lg:hidden bg-zinc-950/80 backdrop-blur-xs flex">
            {/* Modal Drawer slider */}
            <motion.aside 
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              className="bg-zinc-950 w-64 max-w-xs text-zinc-300 flex flex-col p-5 space-y-4 border-r border-zinc-850"
            >
              <div className="flex justify-between items-center pb-2 border-b border-zinc-850">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg overflow-hidden border border-gold-500/30">
                      <img 
                        src={eliteBeautyBadge} 
                        alt="Logo" 
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  <span className="font-display font-extrabold text-white text-sm">ELITE BEAUTY</span>
                </div>
                <button onClick={() => setMobileMenuOpen(false)} className="p-1 hover:text-white">
                  <X className="w-5 h-5 text-zinc-400" />
                </button>
              </div>

              <nav className="flex-1 space-y-2">
                {NAVIGATION_ITEMS.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.key;
                  return (
                    <button
                      key={item.key}
                      onClick={() => {
                        setActiveTab(item.key);
                        if (item.key !== 'stock') setProductFilterClass('all');
                        setMobileMenuOpen(false);
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg font-medium text-xs transition duration-150 ${
                        isActive 
                          ? 'bg-royal-800 text-gold-400 border-l-4 border-gold-500 font-semibold' 
                          : 'hover:bg-zinc-900 hover:text-white text-zinc-400'
                      }`}
                    >
                      <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-gold-400' : 'text-zinc-500'}`} />
                      {item.label}
                    </button>
                  );
                })}
              </nav>

              <div className="pt-4 border-t border-zinc-900 bg-zinc-950/40 -mx-5 -mb-5 p-4">
                <a 
                  href="https://www.instagram.com/elite_beauty256/" 
                  target="_blank"
                  referrerPolicy="no-referrer"
                  className="flex items-center gap-2 text-xs"
                >
                  <Instagram className="w-4.5 h-4.5 text-gold-500 shrink-0" />
                  <span className="text-[11px] text-zinc-400">@elite_beauty256</span>
                </a>
              </div>
            </motion.aside>

            {/* Tap sidebar blank area to close */}
            <div className="flex-1" onClick={() => setMobileMenuOpen(false)}></div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
