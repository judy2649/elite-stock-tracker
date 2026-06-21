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
import SyncDiagnostics from './components/SyncDiagnostics';
import { signOut, signInWithEmailAndPassword } from 'firebase/auth';
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

// Sonya's missing products image assets
// @ts-ignore
import glutathioneCleanserImg from './assets/images/glutathione_cleanser_1781537823353.jpg';
// @ts-ignore
import skincareScrubImg from './assets/images/skincare_scrub_1781537841102.jpg';
// @ts-ignore
import blemishcareShowergelImg from './assets/images/blemishcare_showergel_1781537859264.jpg';
// @ts-ignore
import skduchesShowergelImg from './assets/images/skduches_showergel_1781537877337.jpg';
// @ts-ignore
import paudeluneShowergelImg from './assets/images/paudelune_showergel_1781537894028.jpg';

const IMAGE_MAPPING: Record<string, string> = {
  'glutathione_cleanser': glutathioneCleanserImg,
  'skincare_scrub': skincareScrubImg,
  'blemishcare_showergel': blemishcareShowergelImg,
  'skduches_showergel': skduchesShowergelImg,
  'paudelune_showergel': paudeluneShowergelImg,
};

const ADMIN_EMAILS = [
  'islamnakibinge@gmail.com', 
  'sonyaesther8@gmail.com', 
  'judithoyoo64@gmail.com',
  'nakibingei@gmail.com',
  'admin@elitebeauty.com',
  'manager@elitebeauty.com',
  'sonya@elitebeauty.com',
  'judith@elitebeauty.com',
  'System Admin'
].map(e => e.toLowerCase());

export default function App() {
  const [firebaseUser, loading] = useAuthState(auth);
  const [localUser, setLocalUser] = useState<any>(null);
  const [isSyncing, setIsSyncing] = useState(true);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);

  const user = firebaseUser || localUser;
  const isOnlineSyncEnabled = isFirebaseAvailable && !!firebaseUser;

  // Auto-sync local data to Cloud once connection is open
  useEffect(() => {
    if (!user || !isOnlineSyncEnabled) return;

    const syncPendingChanges = async (key: string, collectionName: string) => {
      const stored = localStorage.getItem(`elite_beauty_${key}`);
      if (!stored) return;

      try {
        const parsed = JSON.parse(stored);
        
        // 1. Sync NEW items (Additions)
        const locals = parsed.filter((item: any) => String(item.id).startsWith('local_'));
        if (locals.length > 0) {
          console.log(`Sync System: Uploading ${locals.length} local ${key}...`);
          for (const item of locals) {
            const { id, ...data } = item;
            const newDocRef = await addDoc(collection(db, collectionName), data);
            
            // Special case: If we synced a sale, we MUST update inventory on Firestore too
            if (key === 'sales') {
              const sale = item as Sale;
              for (const saleItem of sale.items) {
                // Find matching product in current state
                const targetProd = products.find(p => p.id === saleItem.productId);
                if (targetProd) {
                  // We don't use absolute quantity here because cloud might have changed.
                  // But for migration, we'll try to reach a consistent state.
                  await setDoc(doc(db, 'products', targetProd.id), { 
                    quantity: targetProd.quantity 
                  }, { merge: true });
                }
              }
            }
          }
        }

        // 2. Sync DELETIONS (Surgical)
        if (key === 'products') {
          const delStored = localStorage.getItem('elite_beauty_deleted_products');
          const delIds: string[] = delStored ? JSON.parse(delStored) : [];
          if (delIds.length > 0) {
            console.log(`Sync System: Finalizing ${delIds.length} deletions...`);
            for (const id of delIds) {
              if (!id.startsWith('local_')) {
                try {
                  await deleteDoc(doc(db, 'products', id));
                } catch (e) {}
              }
            }
            // Clear local deletion cache once synced to cloud
            localStorage.setItem('elite_beauty_deleted_products', JSON.stringify([]));
            setDeletedProductIds([]);
          }
        }

        // Clean local state and storage of processed items
        if (locals.length > 0) {
          const freshStored = localStorage.getItem(`elite_beauty_${key}`);
          const freshParsed = freshStored ? JSON.parse(freshStored) : [];
          const clean = freshParsed.filter((item: any) => !String(item.id).startsWith('local_'));
          localStorage.setItem(`elite_beauty_${key}`, JSON.stringify(clean));

          if (key === 'products') setProducts(prev => prev.filter(p => !String(p.id).startsWith('local_')));
          if (key === 'sales') setSales(prev => prev.filter(p => !String(p.id).startsWith('local_')));
          if (key === 'expenses') setExpenses(prev => prev.filter(p => !String(p.id).startsWith('local_')));
          if (key === 'customers') setCustomers(prev => prev.filter(p => !String(p.id).startsWith('local_')));
        }
      } catch (e) {
        console.error(`Cloud Sync logic error for ${key}:`, e);
      }
    };

    const runSync = async () => {
      await syncPendingChanges('products', 'products');
      await syncPendingChanges('sales', 'sales');
      await syncPendingChanges('expenses', 'expenses');
      await syncPendingChanges('customers', 'customers');
    };
    runSync();
  }, [user, isOnlineSyncEnabled]);

  // Enforce Admin Roles on login just to guarantee older documents get upgraded
  useEffect(() => {
    if (!user || (!user.email)) return;
    const enforceRoles = async () => {
      const email = user.email.toLowerCase();
      if (ADMIN_EMAILS.includes(email) && isOnlineSyncEnabled) {
        try {
          await setDoc(doc(db, 'users', email), {
            role: 'Owner / Manager'
          }, { merge: true });
        } catch (e) {
          console.warn('Failed to enforce admin role');
        }
      }
    };
    enforceRoles();
  }, [user]);

  // Auto-seed missing products added by sonyaesther8@gmail.com if not already present on Firestore
  const seedMissingProducts = async () => {
    const missingProducts: Product[] = [
      {
        id: 'prod-ski-261',
        name: 'Glutathione Facial Cleanser',
        category: 'Skin Care',
        sku: 'EB-SKI-261',
        costPrice: 25000,
        sellingPrice: 35000,
        quantity: 0,
        safeLevel: 5,
        expiryDate: '2028-06-30',
        imageUrl: 'glutathione_cleanser',
        description: 'Deeply cleanses, brightens, and refreshes skin. Formulated with high-quality Glutathione and Vitamin C.',
        batchNumber: 'B26-2610',
        locationStocks: { kampala: 0, wandegeya: 0, entebbe: 0 },
        createdBy: 'system@elitebeauty.com'
      },
      {
        id: 'prod-ski-683',
        name: 'Organic Body Scrub',
        category: 'Skin Care',
        sku: 'EB-SKI-683',
        costPrice: 15000,
        sellingPrice: 25000,
        quantity: 12,
        safeLevel: 5,
        expiryDate: '2028-03-15',
        imageUrl: 'skincare_scrub',
        description: 'Exfoliating and skin smoothing natural body scrub infused with botanical extracts.',
        batchNumber: 'B26-6589',
        locationStocks: { kampala: 12, wandegeya: 0, entebbe: 0 },
        createdBy: 'system@elitebeauty.com'
      },
      {
        id: 'prod-ski-191',
        name: 'Blemishcare Showergel /body wash',
        category: 'Skin Care',
        sku: 'EB-SKI-191',
        costPrice: 40000,
        sellingPrice: 55000,
        quantity: 0,
        safeLevel: 3,
        expiryDate: '2027-12-01',
        imageUrl: 'blemishcare_showergel',
        description: 'Acne and spot clearing blemishcare shower gel body wash, ideal for glowing skin.',
        batchNumber: 'B26-6258',
        locationStocks: { kampala: 0, wandegeya: 0, entebbe: 0 },
        createdBy: 'system@elitebeauty.com'
      },
      {
        id: 'prod-ski-832',
        name: 'Sk duches showergel',
        category: 'Skin Care',
        sku: 'EB-SKI-832',
        costPrice: 35000,
        sellingPrice: 48000,
        quantity: 0,
        safeLevel: 3,
        expiryDate: '2028-01-20',
        imageUrl: 'skduches_showergel',
        description: 'Luxurious gold royal shower gel with long-lasting enchanting scent.',
        batchNumber: 'B26-5685',
        locationStocks: { kampala: 0, wandegeya: 0, entebbe: 0 },
        createdBy: 'system@elitebeauty.com'
      },
      {
        id: 'prod-ski-545',
        name: 'PauDeLune showergel',
        category: 'Skin Care',
        sku: 'EB-SKI-545',
        costPrice: 38000,
        sellingPrice: 52000,
        quantity: 0,
        safeLevel: 3,
        expiryDate: '2027-09-10',
        imageUrl: 'paudelune_showergel',
        description: 'Premium French spa aromatherapy body wash for intense skin hydration.',
        batchNumber: 'B26-3742',
        locationStocks: { kampala: 0, wandegeya: 0, entebbe: 0 },
        createdBy: 'system@elitebeauty.com'
      }
    ];

    // 1. Force sync to Local State & Storage first for absolute guarantee and instant view
    const deletedJson = localStorage.getItem('elite_beauty_deleted_products');
    let delIds: string[] = deletedJson ? JSON.parse(deletedJson) : [];
    
    // Explicitly restore Sonya's products if they were accidentally deleted
    const sonyaIds = missingProducts.map(p => p.id);
    const originalDelLen = delIds.length;
    delIds = delIds.filter(id => !sonyaIds.includes(id));
    
    if (delIds.length !== originalDelLen) {
      localStorage.setItem('elite_beauty_deleted_products', JSON.stringify(delIds));
      setDeletedProductIds(delIds);
    }

    const missingFiltered = missingProducts.filter(p => !delIds.includes(p.id));

    setProducts(prev => {
      const filteredPrev = prev.filter(p => !missingFiltered.some(m => m.sku === p.sku) && !delIds.includes(p.id));
      const merged = [...filteredPrev, ...missingFiltered];
      localStorage.setItem('elite_beauty_products', JSON.stringify(merged));
      return merged;
    });

    // 2. Synchronize to Firestore if online
    if (isOnlineSyncEnabled && db && missingFiltered.length > 0) {
      try {
        console.log("Seeding Sonya's skincare products to Firestore...");
        for (const prod of missingFiltered) {
          const { id, ...data } = prod;
          await setDoc(doc(db, 'products', id), data, { merge: true });
        }
        console.log("Successfully seeded/synced Sonya's missing products to Firestore.");
      } catch (err) {
        console.warn("Seeding Sonya's missing products to Firestore failed:", err);
      }
    }
  };

  useEffect(() => {
    if (!user) return;
    // Auto-seed on login to guarantee default setup
    seedMissingProducts();
  }, [user]);

  // Background Auto-Reconnect for Admins (The "Always-On Sync" Assurance)
  useEffect(() => {
    if (!isFirebaseAvailable || !auth || firebaseUser || !user) return;
    
    const attemptBgReconnect = async () => {
      const storedEmail = localStorage.getItem('saved_email');
      const storedPass = localStorage.getItem('saved_password');
      if (storedEmail && storedPass) {
        try {
          console.log("Elite System: Maintaining admin sync context...");
          await signInWithEmailAndPassword(auth, storedEmail, storedPass);
        } catch (e) {
          console.warn("Background sync restoration failed.");
        }
      }
    };

    attemptBgReconnect();
  }, [firebaseUser, user, isFirebaseAvailable]);

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
  const [deletedProductIds, setDeletedProductIds] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem('elite_beauty_deleted_products');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });
  const [sales, setSales] = useState<Sale[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);

  // Render-time mapping of abstract product image URLs to local Vite bundled assets
  const enrichedProducts = products
    .filter(p => !deletedProductIds.includes(p.id))
    .map(p => ({
      ...p,
      imageUrl: IMAGE_MAPPING[p.imageUrl as string] || p.imageUrl || 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=200'
    }));

  // Real-time Firestore Sync with Local Storage Fallback
  useEffect(() => {
    if (!user) return;

    const loadLocal = (key: string, setter: any) => {
      const stored = localStorage.getItem(`elite_beauty_${key}`);
      if (stored) {
        try {
          let parsed = JSON.parse(stored);
          if (key === 'products') {
            const delStored = localStorage.getItem('elite_beauty_deleted_products');
            const delIds: string[] = delStored ? JSON.parse(delStored) : [];
            parsed = parsed.filter((item: any) => {
              const notDeleted = !delIds.includes(item.id);
              if (!notDeleted) return false;
              // If we have a creator tag, it MUST be an admin or system
              if (item.createdBy) {
                const creator = item.createdBy.toLowerCase();
                return ADMIN_EMAILS.includes(creator) || creator === 'system@elitebeauty.com' || creator === 'system admin';
              }
              return true; // Legacy items are trusted
            });
          }
          setter(parsed);
        } catch (e) {}
      }
    };

    const saveLocal = (key: string, data: any) => {
      // Don't overwrite local unmigrated records when saving from firestore!
      const stored = localStorage.getItem(`elite_beauty_${key}`);
      let currentLocals: any[] = [];
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          currentLocals = parsed.filter((item: any) => 
            String(item.id).startsWith('local_') || 
            String(item.id).startsWith('prod-') || 
            String(item.id).startsWith('sale-') || 
            String(item.id).startsWith('cust_') || 
            String(item.id).startsWith('exp_')
          );
        } catch (e) {}
      }
      
      // Filter out any local items that have been merged/saved on firestore
      let filteredLocals = currentLocals;
      if (key === 'products') {
        filteredLocals = currentLocals.filter(p => !data.some((d: any) => d.sku === p.sku || d.name.toLowerCase() === p.name.toLowerCase()));
      } else if (key === 'sales') {
        filteredLocals = currentLocals.filter(s => !data.some((d: any) => d.invoiceNumber === s.invoiceNumber));
      } else if (key === 'customers') {
        filteredLocals = currentLocals.filter(c => !data.some((d: any) => d.name.toLowerCase() === c.name.toLowerCase() || (d.phone && d.phone === c.phone)));
      } else if (key === 'expenses') {
        filteredLocals = currentLocals.filter(e => !data.some((d: any) => d.title === e.title && d.amount === e.amount && d.date === e.date));
      }

      // Use strictly cloud data if available, but keep local logic for other collections if needed
      let merged = data;
      if (key !== 'products') {
        merged = [...data, ...filteredLocals];
      }
      
      if (key === 'products') {
        const delStored = localStorage.getItem('elite_beauty_deleted_products');
        const delIds: string[] = delStored ? JSON.parse(delStored) : [];
        merged = merged.filter((item: any) => !delIds.includes(item.id));
      }
      
      localStorage.setItem(`elite_beauty_${key}`, JSON.stringify(merged));
    };

    // Load initial from local for instant feedback
    loadLocal('products', setProducts);
    loadLocal('sales', setSales);
    loadLocal('expenses', setExpenses);
    loadLocal('customers', setCustomers);

    if (!isOnlineSyncEnabled) {
      console.log("Running in local storage offline mode. Skipping Firestore sync subscription.");
      setIsSyncing(false);
      return;
    }

    const unsubProducts = onSnapshot(collection(db, 'products'), (snapshot) => {
      const delStored = localStorage.getItem('elite_beauty_deleted_products');
      const delIds: string[] = delStored ? JSON.parse(delStored) : [];

      const cloudData = snapshot.docs
        .map(d => ({ ...d.data(), id: d.id } as Product))
        .filter(p => !delIds.includes(p.id))
        .filter(p => {
          // Trusted sources: Official Admins, System tags, or Legacy items (no tag)
          if (!p.createdBy) return true;
          const creator = p.createdBy.toLowerCase();
          return ADMIN_EMAILS.includes(creator) || creator === 'system@elitebeauty.com' || creator === 'system admin';
        });
      
      setProducts(() => {
        // STRICT: Only show cloud data that passed the admin filter
        const final = [...cloudData]
          .filter(p => !delIds.includes(p.id))
          .sort((a, b) => a.name.localeCompare(b.name));

        saveLocal('products', final);
        setIsSyncing(false);
        return final;
      });
      setLastSyncTime(new Date());
    }, (error) => {
      console.warn("Firestore products sync failed, using local.");
      loadLocal('products', setProducts);
      setIsSyncing(false);
    });

    const unsubSales = onSnapshot(query(collection(db, 'sales'), orderBy('date', 'desc')), (snapshot) => {
      const cloudData = snapshot.docs.map(d => ({ ...d.data(), id: d.id } as Sale));
      setSales(prev => {
        const mergedMap = new Map<string, Sale>();
        prev.forEach(s => mergedMap.set(s.id, s));
        cloudData.forEach(s => mergedMap.set(s.id, s));
        const final = Array.from(mergedMap.values()).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        saveLocal('sales', final);
        setIsSyncing(false);
        return final;
      });
      setLastSyncTime(new Date());
    }, (error) => {
      console.warn("Firestore sales sync failed, using local.");
      loadLocal('sales', setSales);
      setIsSyncing(false);
    });

    const unsubExpenses = onSnapshot(query(collection(db, 'expenses'), orderBy('date', 'desc')), (snapshot) => {
      const cloudData = snapshot.docs.map(d => ({ ...d.data(), id: d.id } as Expense));
      setExpenses(prev => {
        const mergedMap = new Map<string, Expense>();
        prev.forEach(e => mergedMap.set(e.id, e));
        cloudData.forEach(e => mergedMap.set(e.id, e));
        const final = Array.from(mergedMap.values()).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        saveLocal('expenses', final);
        setIsSyncing(false);
        return final;
      });
      setLastSyncTime(new Date());
    }, (error) => {
      console.warn("Firestore expenses sync failed, using local.");
      loadLocal('expenses', setExpenses);
      setIsSyncing(false);
    });

    const unsubCustomers = onSnapshot(query(collection(db, 'customers'), orderBy('name', 'asc')), (snapshot) => {
      const cloudData = snapshot.docs.map(d => ({ ...d.data(), id: d.id } as Customer));
      setCustomers(prev => {
        const mergedMap = new Map<string, Customer>();
        prev.forEach(c => mergedMap.set(c.id, c));
        cloudData.forEach(c => mergedMap.set(c.id, c));
        const final = Array.from(mergedMap.values()).sort((a, b) => a.name.localeCompare(b.name));
        saveLocal('customers', final);
        setIsSyncing(false);
        return final;
      });
      setLastSyncTime(new Date());
    }, (error) => {
      console.warn("Firestore customers sync failed, using local.");
      loadLocal('customers', setCustomers);
      setIsSyncing(false);
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
    const adminEmails = [
      'sonyaesther8@gmail.com', 
      'islamnakibinge@gmail.com', 
      'judithoyoo64@gmail.com',
      'nakibingei@gmail.com',
      'admin@elitebeauty.com',
      'manager@elitebeauty.com',
      'sonya@elitebeauty.com',
      'judith@elitebeauty.com'
    ].map(e => e.toLowerCase());

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
    // Optimistically assign a safe local ID if it does not already have a valid prefix
    const optimisticId = newProduct.id.startsWith('local_') || newProduct.id.startsWith('prod-')
      ? newProduct.id 
      : `local_prod_${Date.now()}`;
    const optimisticProduct = { 
      ...newProduct, 
      id: optimisticId,
      createdBy: user?.email || 'System Admin'
    };

    // Update state only (optimistic) - will be reconciled by onSnapshot
    setProducts(prev => [...prev, optimisticProduct]);
    
    try {
      if (!isOnlineSyncEnabled) return;
      const { id, ...data } = optimisticProduct;
      await setDoc(doc(db, 'products', id), data);
    } catch (error: any) {
      console.warn("Firestore CREATE failed, cached locally:", error.message || error);
    }
  };

  const handleUpdateProduct = async (updatedProduct: Product) => {
    // Update state only (optimistic) - will be reconciled by onSnapshot
    setProducts(prev => prev.map(p => p.id === updatedProduct.id ? updatedProduct : p));

    // If Firebase is unavailable, local state already handles it
    if (!isOnlineSyncEnabled) return;

    try {
      const { id, ...data } = updatedProduct;
      await setDoc(doc(db, 'products', id), data, { merge: true });
    } catch (error) {
      console.warn("Firestore UPDATE failed, cached locally:", error);
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    // 1. Keep track of user-deleted products to prevent sync-reversions or re-seeding
    const currentDeletedJson = localStorage.getItem('elite_beauty_deleted_products');
    let currentDeleted: string[] = currentDeletedJson ? JSON.parse(currentDeletedJson) : [];
    if (!currentDeleted.includes(productId)) {
      currentDeleted.push(productId);
      localStorage.setItem('elite_beauty_deleted_products', JSON.stringify(currentDeleted));
      setDeletedProductIds(currentDeleted);
    }

    // Remove locally first for immediate responsiveness
    const updated = products.filter(p => p.id !== productId);
    setProducts(updated);
    localStorage.setItem('elite_beauty_products', JSON.stringify(updated));

    if (!isOnlineSyncEnabled) {
      return;
    }

    try {
      await deleteDoc(doc(db, 'products', productId));
    } catch (error) {
      console.warn("Firestore DELETE failed, bypassed to local:", error);
    }
  };

  const handleRecordSale = async (newSale: Sale) => {
    // Generate optimistic ID
    const optimisticId = newSale.id.startsWith('local_') || newSale.id.startsWith('sale-')
      ? newSale.id
      : `local_sale_${Date.now()}`;
    const optSale = { ...newSale, id: optimisticId };

    // Update sales and products state & localStorage optimistically
    const updatedSales = [optSale, ...sales];
    setSales(updatedSales);
    localStorage.setItem('elite_beauty_sales', JSON.stringify(updatedSales));

    const updatedProducts = products.map(p => {
      const item = newSale.items.find(i => i.productId === p.id);
      if (item) return { ...p, quantity: Math.max(0, p.quantity - item.quantity) };
      return p;
    });
    setProducts(updatedProducts);
    localStorage.setItem('elite_beauty_products', JSON.stringify(updatedProducts));

    try {
      if (!isOnlineSyncEnabled) return;
      const { id, ...saleData } = optSale;
      await setDoc(doc(db, 'sales', id), saleData);

      for (const saleItem of newSale.items) {
        const product = products.find(p => p.id === saleItem.productId);
        if (product) {
          const newQty = Math.max(0, product.quantity - saleItem.quantity);
          await setDoc(doc(db, 'products', product.id), { quantity: newQty }, { merge: true });
        }
      }
    } catch (error) {
      console.warn("Firestore SALE failed, cached locally:", error);
    }
  };

  const handleSettleDebt = async (customerName: string, settleAmount: number) => {
    // Optimistically update locally
    let remainingPaymentLocally = settleAmount;
    const updatedSalesLocally = sales.map(s => {
       if (s.customerName === customerName && s.balanceDue > 0 && remainingPaymentLocally > 0) {
          const toPay = Math.min(remainingPaymentLocally, s.balanceDue);
          remainingPaymentLocally -= toPay;
          return {
            ...s,
            paidAmount: s.paidAmount + toPay,
            balanceDue: s.balanceDue - toPay
          };
       }
       return s;
    });
    setSales(updatedSalesLocally);
    localStorage.setItem('elite_beauty_sales', JSON.stringify(updatedSalesLocally));

    try {
      if (!isOnlineSyncEnabled) return;
      let remainingPayment = settleAmount;
      const relevantSales = sales.filter(s => s.customerName === customerName && s.balanceDue > 0)
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      for (const sale of relevantSales) {
        if (remainingPayment <= 0) break;
        const debt = sale.balanceDue;
        const toPay = Math.min(remainingPayment, debt);
        // Only run online update if firebase available
        if (isOnlineSyncEnabled) {
          await setDoc(doc(db, 'sales', sale.id), {
            paidAmount: sale.paidAmount + toPay,
            balanceDue: sale.balanceDue - toPay
          }, { merge: true });
        }
        remainingPayment -= toPay;
      }
    } catch (error) {
      console.warn("Firestore DEBT update failed, cached locally:", error);
    }
  };

  const handleAddCustomer = async (newCustomer: Customer) => {
    const optimisticId = newCustomer.id.startsWith('local_') || newCustomer.id.startsWith('cust_')
      ? newCustomer.id
      : `local_cust_${Date.now()}`;
    const optCust = { ...newCustomer, id: optimisticId };

    const updated = [...customers, optCust];
    setCustomers(updated);
    localStorage.setItem('elite_beauty_customers', JSON.stringify(updated));

    try {
      if (!isOnlineSyncEnabled) return;
      const { id, ...data } = optCust;
      await setDoc(doc(db, 'customers', id), data);
    } catch (error) {
      console.warn("Firestore CUSTOMER failed, cached locally:", error);
    }
  };

  const handleAddExpense = async (newExpense: Expense) => {
    const optimisticId = newExpense.id.startsWith('local_') || newExpense.id.startsWith('exp_')
      ? newExpense.id
      : `local_exp_${Date.now()}`;
    const optExp = { ...newExpense, id: optimisticId };

    const updated = [...expenses, optExp];
    setExpenses(updated);
    localStorage.setItem('elite_beauty_expenses', JSON.stringify(updated));

    try {
      if (!isOnlineSyncEnabled) return;
      const { id, ...data } = optExp;
      await setDoc(doc(db, 'expenses', id), data);
    } catch (error) {
      console.warn("Firestore EXPENSE failed, cached locally:", error);
    }
  };

  const handleDeleteExpense = async (expenseId: string) => {
    // If Firebase is unavailable, delete it locally right away
    if (!isOnlineSyncEnabled) {
      const updated = expenses.filter(e => e.id !== expenseId);
      setExpenses(updated);
      localStorage.setItem('elite_beauty_expenses', JSON.stringify(updated));
      return;
    }

    try {
      // Remove locally first for immediate responsiveness
      const updated = expenses.filter(e => e.id !== expenseId);
      setExpenses(updated);
      localStorage.setItem('elite_beauty_expenses', JSON.stringify(updated));

      await deleteDoc(doc(db, 'expenses', expenseId));
    } catch (error) {
      console.warn("Firestore DELETE EXPENSE failed, bypassed to local:", error);
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
              products={enrichedProducts}
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
              products={enrichedProducts}
              customers={customers}
              onRecordSale={handleRecordSale}
              existingSalesCount={sales.length}
            />
          )}

          {activeTab === 'stock' && (
            <ProductCatalog 
              products={enrichedProducts}
              sales={sales}
              onRecordSale={handleRecordSale}
              onAddProduct={handleAddProduct}
              onUpdateProduct={handleUpdateProduct}
              onDeleteProduct={handleDeleteProduct}
              initialFilterClass={productFilterClass}
              onForceSeed={seedMissingProducts}
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
              products={enrichedProducts}
              sales={sales}
              expenses={expenses}
            />
          )}

          {activeTab === 'alerts' && (
            <EmailAlertsSettings 
              products={enrichedProducts}
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

      {/* 5. DIAGNOSTIC SYNC PANEL */}
      <SyncDiagnostics 
        isFirebaseAvailable={isFirebaseAvailable}
        isOnlineSyncEnabled={isOnlineSyncEnabled}
        userEmail={user?.email || null}
        lastSyncTime={lastSyncTime}
        counts={{
          products: products.length,
          sales: sales.length,
          customers: customers.length,
          expenses: expenses.length
        }}
      />
    </div>
  );
}
