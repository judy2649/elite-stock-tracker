import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Package, 
  LayoutDashboard, 
  Receipt,
  Layers, 
  CircleDollarSign, 
  Users, 
  BarChart3, 
  Instagram, 
  Menu, 
  X,
  BellRing,
  LogOut
} from 'lucide-react';

import { auth, db, handleFirestoreError, OperationType, isFirebaseAvailable } from './lib/firebase';
import { useAuthState } from 'react-firebase-hooks/auth';
import { signOut } from 'firebase/auth';
import { 
  collection, 
  onSnapshot, 
  doc, 
  setDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  orderBy,
  getDocs
} from 'firebase/firestore';

import { Product, Sale, Expense, Customer } from './types';
import DashboardOverview from './components/DashboardOverview';
import PosRegister from './components/PosRegister';
import ProductCatalog from './components/ProductCatalog';
import ExpenseTracker from './components/ExpenseTracker';
import CustomerLedger from './components/CustomerLedger';
import AnalyticsPanel from './components/AnalyticsPanel';
import EmailAlertsSettings from './components/EmailAlertsSettings';
import Auth from './components/Auth';
// @ts-ignore
import eliteBeautyBadge from './assets/images/elite_beauty_badge_1781372578945.jpg';

export default function App() {
  const [firebaseUser, loading] = useAuthState(auth);
  const [localUser, setLocalUser] = useState<any>(null);
  const [isSyncing, setIsSyncing] = useState(true);

  const user = firebaseUser || localUser;

  // Auto-migrate local data to Firestore once connection is open
  useEffect(() => {
    if (!user) return;
    if (!isFirebaseAvailable) return;

    const migrateLocals = async (key: string, collectionName: string) => {
      const stored = localStorage.getItem(`elite_beauty_${key}`);
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          const locals = parsed.filter((item: any) => String(item.id).startsWith('local_'));
          if (locals.length > 0) {
            console.log(`Migrating ${locals.length} local ${key} to Firestore...`);
            for (const item of locals) {
              const { id, ...data } = item;
              await addDoc(collection(db, collectionName), data);
            }
            // Remove them to prevent duplicate migrations
            const clean = parsed.filter((item: any) => !String(item.id).startsWith('local_'));
            localStorage.setItem(`elite_beauty_${key}`, JSON.stringify(clean));
          }
        } catch (e) {
          console.error(`Migration error for ${key}:`, e);
        }
      }
    };

    const runMigrations = async () => {
      await migrateLocals('products', 'products');
      await migrateLocals('sales', 'sales');
      await migrateLocals('expenses', 'expenses');
      await migrateLocals('customers', 'customers');
    };
    runMigrations();
  }, [user]);

  // Initialize Auth State (Fallback to Local Mock if Firebase absent)
  useEffect(() => {
    if (!loading) {
      if (!firebaseUser) {
        const stored = localStorage.getItem('local_mock_session');
        if (stored) {
          try {
            setLocalUser(JSON.parse(stored));
          } catch (e) {}
        }
      }
      setIsSyncing(false);
    }
  }, [loading, firebaseUser]);
  
  // Navigation active tab State
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  
  // Mobile sidebar menu toggle state
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Filter state passed when clicking alerts from Dashboard
  const [productFilterClass, setProductFilterClass] = useState<string>('all');

  // Firestore Shared State
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);

  // Real-time Firestore Sync with Local Storage Fallback
  useEffect(() => {
    if (!user) return;

    const loadLocal = (key: string, setter: any) => {
      const stored = localStorage.getItem(`elite_beauty_${key}`);
      if (stored) {
        try { setter(JSON.parse(stored)); } catch (e) {}
      }
    };

    const saveLocal = (key: string, data: any) => {
      localStorage.setItem(`elite_beauty_${key}`, JSON.stringify(data));
    };

    // Load initial from local for instant feedback
    loadLocal('products', setProducts);
    loadLocal('sales', setSales);
    loadLocal('expenses', setExpenses);
    loadLocal('customers', setCustomers);

    if (!isFirebaseAvailable) {
      console.log("Firebase not available. Continuing in Local Storage mode.");
      setIsSyncing(false);
      return;
    }

    const unsubProducts = onSnapshot(collection(db, 'products'), (snapshot) => {
      const data = snapshot.docs.map(d => ({ ...d.data(), id: d.id } as Product));
      setProducts(data);
      saveLocal('products', data);
    }, (error) => {
      console.warn("Firestore products sync failed, using local.");
      loadLocal('products', setProducts);
    });

    const unsubSales = onSnapshot(query(collection(db, 'sales'), orderBy('date', 'desc')), (snapshot) => {
      const data = snapshot.docs.map(d => ({ ...d.data(), id: d.id } as Sale));
      setSales(data);
      saveLocal('sales', data);
    }, (error) => {
      console.warn("Firestore sales sync failed, using local.");
      loadLocal('sales', setSales);
    });

    const unsubExpenses = onSnapshot(query(collection(db, 'expenses'), orderBy('date', 'desc')), (snapshot) => {
      const data = snapshot.docs.map(d => ({ ...d.data(), id: d.id } as Expense));
      setExpenses(data);
      saveLocal('expenses', data);
    }, (error) => {
      console.warn("Firestore expenses sync failed, using local.");
      loadLocal('expenses', setExpenses);
    });

    const unsubCustomers = onSnapshot(query(collection(db, 'customers'), orderBy('name', 'asc')), (snapshot) => {
      const data = snapshot.docs.map(d => ({ ...d.data(), id: d.id } as Customer));
      setCustomers(data);
      saveLocal('customers', data);
    }, (error) => {
      console.warn("Firestore customers sync failed, using local.");
      loadLocal('customers', setCustomers);
    });

    return () => {
      unsubProducts();
      unsubSales();
      unsubExpenses();
      unsubCustomers();
    };
  }, [user]);

  const handleLogout = async () => {
    try {
      if (isFirebaseAvailable && auth) {
        await signOut(auth);
      }
      localStorage.removeItem('local_mock_session');
      setLocalUser(null);
      setActiveTab('dashboard');
    } catch (error) {
        console.error('Logout failed:', error);
    }
  };

  if (loading || isSyncing) {
    return (
      <div className="h-screen bg-zinc-950 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-gold-500 border-t-transparent animate-spin rounded-full"></div>
      </div>
    );
  }

  if (!user) {
    return <Auth onAuthSuccess={(userData: any) => setLocalUser(userData)} />;
  }

  // Automated alerts audit check (simplified for Firestore)
  const checkForAutomatedAlerts = (previousProducts: Product[], currentProducts: Product[], triggerSource: string) => {
    // This logic could be moved to a Cloud Function for true automation, 
    // but we'll keep a client-side check for now as requested by typical flow.
    const enableLowStock = true;
    const enableOutOfStock = true;
    const adminEmails = ['sonyaesther8@gmail.com', 'islamnakibinge@gmail.com'];

    const newWarnings: string[] = [];
    currentProducts.forEach(curr => {
      const prev = previousProducts.find(p => p.id === curr.id);
      if (enableOutOfStock && curr.quantity === 0 && (!prev || prev.quantity > 0)) {
        newWarnings.push(`🔴 OUT OF STOCK: "${curr.name}"`);
      } else if (enableLowStock && curr.quantity <= curr.safeLevel && (!prev || prev.quantity > curr.safeLevel)) {
        newWarnings.push(`⚠️ LOW STOCK: "${curr.name}" (${curr.quantity} left)`);
      }
    });

    if (newWarnings.length > 0) {
      console.log("Automated Stock Alert:", newWarnings);
    }
  };

  // MUTATORS (Mapped to Firestore with Local Failover)
  const handleAddProduct = async (newProduct: Product) => {
    try {
      if (!isFirebaseAvailable) throw new Error("Firebase unavailable");
      const { id, ...data } = newProduct;
      await addDoc(collection(db, 'products'), data);
    } catch (error: any) {
      console.warn("Firestore CREATE failed, bypassing to local:", error.message || error);
      const updated = [...products, { ...newProduct, id: `local_${Date.now()}` }];
      setProducts(updated);
      localStorage.setItem('elite_beauty_products', JSON.stringify(updated));
    }
  };

  const handleUpdateProduct = async (updatedProduct: Product) => {
    try {
      if (!isFirebaseAvailable) throw new Error("Firebase unavailable");
      const { id, ...data } = updatedProduct;
      await updateDoc(doc(db, 'products', id), data);
    } catch (error) {
      console.warn("Firestore UPDATE failed, bypassing to local.");
      const updated = products.map(p => p.id === updatedProduct.id ? updatedProduct : p);
      setProducts(updated);
      localStorage.setItem('elite_beauty_products', JSON.stringify(updated));
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    try {
      if (!isFirebaseAvailable) throw new Error("Firebase unavailable");
      await deleteDoc(doc(db, 'products', productId));
    } catch (error) {
      console.warn("Firestore DELETE failed, bypassing to local.");
      const updated = products.filter(p => p.id !== productId);
      setProducts(updated);
      localStorage.setItem('elite_beauty_products', JSON.stringify(updated));
    }
  };

  const handleRecordSale = async (newSale: Sale) => {
    try {
      if (!isFirebaseAvailable) throw new Error("Firebase unavailable");
      const { id, ...saleData } = newSale;
      await addDoc(collection(db, 'sales'), saleData);

      for (const saleItem of newSale.items) {
        const product = products.find(p => p.id === saleItem.productId);
        if (product) {
          const newQty = Math.max(0, product.quantity - saleItem.quantity);
          await updateDoc(doc(db, 'products', product.id), { quantity: newQty });
        }
      }
    } catch (error) {
      console.warn("Firestore SALE failed, bypassing to local.");
      const newS = { ...newSale, id: `local_sale_${Date.now()}` };
      const updatedSales = [newS, ...sales];
      setSales(updatedSales);
      localStorage.setItem('elite_beauty_sales', JSON.stringify(updatedSales));

      const updatedProducts = products.map(p => {
        const item = newSale.items.find(i => i.productId === p.id);
        if (item) return { ...p, quantity: Math.max(0, p.quantity - item.quantity) };
        return p;
      });
      setProducts(updatedProducts);
      localStorage.setItem('elite_beauty_products', JSON.stringify(updatedProducts));
    }
  };

  const handleSettleDebt = async (customerName: string, settleAmount: number) => {
    try {
      if (!isFirebaseAvailable) throw new Error("Firebase unavailable");
      let remainingPayment = settleAmount;
      const relevantSales = sales.filter(s => s.customerName === customerName && s.balanceDue > 0)
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      for (const sale of relevantSales) {
        if (remainingPayment <= 0) break;
        const debt = sale.balanceDue;
        const toPay = Math.min(remainingPayment, debt);
        await updateDoc(doc(db, 'sales', sale.id), {
          paidAmount: sale.paidAmount + toPay,
          balanceDue: sale.balanceDue - toPay
        });
        remainingPayment -= toPay;
      }
    } catch (error) {
      console.warn("Firestore DEBT failed, bypassing to local.");
      let remainingPayment = settleAmount;
      const updatedSales = sales.map(s => {
         if (s.customerName === customerName && s.balanceDue > 0 && remainingPayment > 0) {
            const toPay = Math.min(remainingPayment, s.balanceDue);
            remainingPayment -= toPay;
            return {
              ...s,
              paidAmount: s.paidAmount + toPay,
              balanceDue: s.balanceDue - toPay
            };
         }
         return s;
      });
      setSales(updatedSales);
      localStorage.setItem('elite_beauty_sales', JSON.stringify(updatedSales));
    }
  };

  const handleAddCustomer = async (newCustomer: Customer) => {
    try {
      if (!isFirebaseAvailable) throw new Error("Firebase unavailable");
      const { id, ...data } = newCustomer;
      await addDoc(collection(db, 'customers'), data);
    } catch (error) {
      console.warn("Firestore CUSTOMER failed, bypassing to local.");
      const updated = [...customers, { ...newCustomer, id: `local_cust_${Date.now()}` }];
      setCustomers(updated);
      localStorage.setItem('elite_beauty_customers', JSON.stringify(updated));
    }
  };

  const handleAddExpense = async (newExpense: Expense) => {
    try {
      if (!isFirebaseAvailable) throw new Error("Firebase unavailable");
      const { id, ...data } = newExpense;
      await addDoc(collection(db, 'expenses'), data);
    } catch (error) {
      console.warn("Firestore EXPENSE failed, bypassing to local.");
      const updated = [...expenses, { ...newExpense, id: `local_exp_${Date.now()}` }];
      setExpenses(updated);
      localStorage.setItem('elite_beauty_expenses', JSON.stringify(updated));
    }
  };

  const handleDeleteExpense = async (expenseId: string) => {
    try {
      if (!isFirebaseAvailable) throw new Error("Firebase unavailable");
      await deleteDoc(doc(db, 'expenses', expenseId));
    } catch (error) {
      console.warn("Firestore DELETE EXPENSE failed, bypassing to local.");
      const updated = expenses.filter(e => e.id !== expenseId);
      setExpenses(updated);
      localStorage.setItem('elite_beauty_expenses', JSON.stringify(updated));
    }
  };

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

            <div className="flex items-center gap-3">
              <div className="flex flex-col items-end text-xs text-right">
                <span className="text-white font-bold">{user.displayName || 'Staff'}</span>
                <button 
                  onClick={handleLogout}
                  className="text-[10px] text-gold-500 hover:text-gold-400 font-bold uppercase tracking-widest flex items-center gap-1 mt-0.5"
                >
                  <LogOut className="w-3 h-3" /> Logout
                </button>
              </div>
              <div className="w-9 h-9 rounded-xl bg-royal-700 text-gold-400 flex items-center justify-center font-extrabold font-sans border border-gold-500/30 shadow-sm overflow-hidden">
                {user.photoURL ? (
                  <img src={user.photoURL} alt={user.displayName || ''} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  user.displayName?.slice(0, 2).toUpperCase() || 'EB'
                )}
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
              customers={customers}
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
              customers={customers}
              onAddCustomer={handleAddCustomer}
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
