import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, 
  Plus, 
  Trash2, 
  Edit3, 
  AlertTriangle, 
  Sparkles, 
  Image as ImageIcon,
  Check, 
  X,
  PackagePlus,
  RefreshCw,
  Coins,
  History,
  Lock,
  CheckCircle2,
  Bookmark
} from 'lucide-react';
import { Product, Sale, SaleItem } from '../types';
import { COSMETICS_CATEGORIES } from '../data';
import { formatUGX, getExpiryStatus } from '../utils';

interface ProductCatalogProps {
  products: Product[];
  sales: Sale[];
  onRecordSale: (sale: Sale) => void;
  onAddProduct: (product: Product) => void;
  onUpdateProduct: (product: Product) => void;
  onDeleteProduct: (productId: string) => void;
  initialFilterClass?: string;
  onForceSeed?: () => Promise<void>;
}

export default function ProductCatalog({
  products,
  sales,
  onRecordSale,
  onAddProduct,
  onUpdateProduct,
  onDeleteProduct,
  initialFilterClass = 'all',
  onForceSeed
}: ProductCatalogProps) {
  const [seedLoading, setSeedLoading] = useState(false);
  const [seedSuccess, setSeedSuccess] = useState(false);

  const handleForceSeed = async () => {
    if (!onForceSeed) return;
    setSeedLoading(true);
    setSeedSuccess(false);
    try {
      await onForceSeed();
      setSeedSuccess(true);
      setTimeout(() => setSeedSuccess(false), 3000);
    } catch (e) {
      console.error("Force seeding failed:", e);
    } finally {
      setSeedLoading(false);
    }
  };
  // Navigation view mode for the admin
  const [catalogViewMode, setCatalogViewMode] = useState<'catalog' | 'sold-vs-remaining'>('catalog');

  // Quick direct sale (bought item entry) state
  const [showQuickBuyForm, setShowQuickBuyForm] = useState(false);
  const [quickBuyProductId, setQuickBuyProductId] = useState('');
  const [quickBuyQuantity, setQuickBuyQuantity] = useState<number>(1);
  const [quickBuyCustomerName, setQuickBuyCustomerName] = useState('');
  const [quickBuyCustomerPhone, setQuickBuyCustomerPhone] = useState('');
  const [quickBuyShade, setQuickBuyShade] = useState('');
  const [quickBuyOutlet, setQuickBuyOutlet] = useState<'kampala' | 'wandegeya' | 'entebbe'>('kampala');
  const [quickBuySuccessDetails, setQuickBuySuccessDetails] = useState<{ txCode: string; itemCode: string; invoice: string; productId?: string } | null>(null);

  // Filters state
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [stockTypeFilter, setStockTypeFilter] = useState<'all' | 'low' | 'out' | 'expired' | 'expiring-soon'>(initialFilterClass as any);

  // Edit or Add Item Modal/Form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Single Item quick stock-in adjustment states
  const [stockInProduct, setStockInProduct] = useState<Product | null>(null);
  const [additionalStockQty, setAdditionalStockQty] = useState<number>(10);

  // Form State
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState(COSMETICS_CATEGORIES[0]);
  const [formSku, setFormSku] = useState('');
  const [formCostPrice, setFormCostPrice] = useState<number>(0);
  const [formSellingPrice, setFormSellingPrice] = useState<number>(0);
  const [formQuantity, setFormQuantity] = useState<number>(10);
  const [formSafeLevel, setFormSafeLevel] = useState<number>(5);
  const [formExpiryDate, setFormExpiryDate] = useState('2027-12-31');
  const [formImageUrl, setFormImageUrl] = useState('');
  const [formDescription, setFormDescription] = useState('');
  
  // Custom beauty-specific form states
  const [formBatchNumber, setFormBatchNumber] = useState('');
  const [formShadeVariantsStr, setFormShadeVariantsStr] = useState('');
  const [formKampalaStock, setFormKampalaStock] = useState<number>(0);
  const [formWandegeyaStock, setFormWandegeyaStock] = useState<number>(0);
  const [formEntebbeStock, setFormEntebbeStock] = useState<number>(0);

  // File Upload states
  const [dragActive, setDragActive] = useState(false);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const processFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Please upload a valid image file (.png, .jpg, .jpeg, .webp)');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 450;
        const MAX_HEIGHT = 450;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.85);
          setFormImageUrl(compressedDataUrl);
        } else {
          setFormImageUrl(event.target?.result as string || '');
        }
      };
      img.src = event.target?.result as string || '';
    };
    reader.readAsDataURL(file);
  };

  // Sync edit form fields
  const openEditModal = (p: Product) => {
    setEditingProduct(p);
    setFormName(p.name);
    setFormCategory(p.category);
    setFormSku(p.sku);
    setFormCostPrice(p.costPrice);
    setFormSellingPrice(p.sellingPrice);
    setFormQuantity(p.quantity);
    setFormSafeLevel(p.safeLevel);
    setFormExpiryDate(p.expiryDate);
    setFormImageUrl(p.imageUrl);
    setFormDescription(p.description || '');
    setFormBatchNumber(p.batchNumber || '');
    setFormShadeVariantsStr(p.shadeVariants ? p.shadeVariants.join(', ') : '');
    setFormKampalaStock(p.locationStocks ? (p.locationStocks.kampala || 0) : p.quantity);
    setFormWandegeyaStock(p.locationStocks ? (p.locationStocks.wandegeya || 0) : 0);
    setFormEntebbeStock(p.locationStocks ? (p.locationStocks.entebbe || 0) : 0);
    setShowAddForm(true);
  };

  const openAddModal = () => {
    setEditingProduct(null);
    setFormName('');
    setFormCategory(COSMETICS_CATEGORIES[0]);
    // Generate static automatic elegant SKU for Elite Beauty
    setFormSku(`EB-${COSMETICS_CATEGORIES[0].slice(0, 3).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`);
    setFormCostPrice(0);
    setFormSellingPrice(0);
    setFormQuantity(15);
    setFormSafeLevel(5);
    setFormExpiryDate(new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]); // 1 year out
    setFormImageUrl('');
    setFormDescription('');
    setFormBatchNumber(`B26-${Math.floor(1000 + Math.random() * 9000).toString()}`);
    setFormShadeVariantsStr('');
    setFormKampalaStock(10);
    setFormWandegeyaStock(5);
    setFormEntebbeStock(0);
    setShowAddForm(true);
  };

  // Auto update SKU during Add Mode when Category changes
  const handleCategoryChangeInForm = (cat: string) => {
    setFormCategory(cat);
    if (!editingProduct) {
      setFormSku(`EB-${cat.slice(0, 3).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`);
    }
  };

  // Submit product add or update
  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();

    const finalImage = formImageUrl.trim() || 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=400&auto=format&fit=crop';
    const parsedShades = formShadeVariantsStr.trim()
      ? formShadeVariantsStr.split(',').map(s => s.trim()).filter(Boolean)
      : undefined;

    const parsedKampala = Number(formKampalaStock);
    const parsedWandegeya = Number(formWandegeyaStock);
    const parsedEntebbe = Number(formEntebbeStock);
    const finalQuantity = parsedKampala + parsedWandegeya + parsedEntebbe;

    if (editingProduct) {
      const updated: Product = {
        ...editingProduct,
        name: formName,
        category: formCategory,
        sku: formSku,
        costPrice: Number(formCostPrice),
        sellingPrice: Number(formSellingPrice),
        quantity: finalQuantity,
        safeLevel: Number(formSafeLevel),
        expiryDate: formExpiryDate,
        imageUrl: finalImage,
        description: formDescription,
        batchNumber: formBatchNumber ? formBatchNumber.trim() : undefined,
        shadeVariants: parsedShades,
        locationStocks: {
          kampala: parsedKampala,
          wandegeya: parsedWandegeya,
          entebbe: parsedEntebbe
        }
      };
      onUpdateProduct(updated);
    } else {
      const added: Product = {
        id: `prod-${Date.now()}`,
        name: formName,
        category: formCategory,
        sku: formSku,
        costPrice: Number(formCostPrice),
        sellingPrice: Number(formSellingPrice),
        quantity: finalQuantity,
        safeLevel: Number(formSafeLevel),
        expiryDate: formExpiryDate,
        imageUrl: finalImage,
        description: formDescription,
        lastStockIn: new Date().toISOString().split('T')[0],
        batchNumber: formBatchNumber ? formBatchNumber.trim() : undefined,
        shadeVariants: parsedShades,
        locationStocks: {
          kampala: parsedKampala,
          wandegeya: parsedWandegeya,
          entebbe: parsedEntebbe
        }
      };
      onAddProduct(added);
    }
    setShowAddForm(false);
  };

  // Submit fast stock addition
  const handleStockInSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!stockInProduct) return;

    const adjusted: Product = {
      ...stockInProduct,
      quantity: stockInProduct.quantity + Number(additionalStockQty),
      lastStockIn: new Date().toISOString().split('T')[0]
    };
    onUpdateProduct(adjusted);
    setStockInProduct(null);
  };

  // Submit direct admin recorded purchase & generate codes
  const handleQuickBuySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickBuyProductId) return;

    const product = products.find(p => p.id === quickBuyProductId);
    if (!product) {
      alert('Selected cosmetic product does not exist.');
      return;
    }

    // Check branch stock levels
    const availableStock = product.locationStocks?.[quickBuyOutlet] ?? product.quantity;
    if (availableStock < quickBuyQuantity) {
      alert(`Conflict: Insufficient stock in ${quickBuyOutlet.toUpperCase()} store! Remaining units available: ${availableStock}`);
      return;
    }

    // Generate codes
    const txCode = `EB-TX-${Math.floor(1000 + Math.random() * 9000)}`;
    const itemCode = `EB-ITM-${Math.floor(10000 + Math.random() * 90000)}`;
    const invoiceNum = `EB-AUTO-${100000 + Math.floor(Math.random() * 900000)}`;
    
    // Create SaleItem
    const extension = quickBuyShade ? ` (${quickBuyShade})` : '';
    const saleItem: SaleItem = {
      productId: product.id,
      productName: product.name + extension,
      price: product.sellingPrice,
      quantity: quickBuyQuantity,
      subtotal: product.sellingPrice * quickBuyQuantity,
      verificationCode: itemCode
    };

    const finalAmount = product.sellingPrice * quickBuyQuantity;

    const generatedSaleObj: Sale = {
      id: `sale-${Date.now()}`,
      invoiceNumber: invoiceNum,
      items: [saleItem],
      totalAmount: finalAmount,
      discount: 0,
      paidAmount: finalAmount,
      balanceDue: 0,
      paymentMethod: 'Cash',
      customerName: quickBuyCustomerName.trim() || 'Walk-in Client',
      customerPhone: quickBuyCustomerPhone.trim() || undefined,
      date: new Date().toISOString(),
      location: quickBuyOutlet,
      verificationCode: txCode
    };

    onRecordSale(generatedSaleObj);
    setQuickBuySuccessDetails({ txCode, itemCode, invoice: invoiceNum, productId: product.id });
    
    // Clear other state values
    setQuickBuyProductId('');
    setQuickBuyQuantity(1);
    setQuickBuyCustomerName('');
    setQuickBuyCustomerPhone('');
    setQuickBuyShade('');
  };

  // Dynamic filter products pool
  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          p.sku.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (p.description && p.description.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory;

    // Warning filtering
    let matchesStockStatus = true;
    if (stockTypeFilter === 'out') {
      matchesStockStatus = p.quantity <= 0;
    } else if (stockTypeFilter === 'low') {
      matchesStockStatus = p.quantity > 0 && p.quantity <= p.safeLevel;
    } else if (stockTypeFilter === 'expired') {
      matchesStockStatus = getExpiryStatus(p.expiryDate) === 'expired';
    } else if (stockTypeFilter === 'expiring-soon') {
      matchesStockStatus = getExpiryStatus(p.expiryDate) === 'expiring-soon';
    }

    return matchesSearch && matchesCategory && matchesStockStatus;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-blue-100 pb-5">
        <div>
          <h2 className="font-display text-2xl font-semibold text-blue-950 flex items-center gap-2">
            Inventory & Catalog System
          </h2>
          <p className="text-gray-500 text-xs mt-1">Add, update, and inspect cosmetics stock quantities and formulas.</p>
        </div>
        <div className="flex flex-wrap gap-2.5 self-start md:self-auto">
          {onForceSeed && (
            <button
              onClick={handleForceSeed}
              disabled={seedLoading}
              className={`px-3 py-2 border rounded-lg font-bold text-xs shadow-xs transition active:scale-95 flex items-center gap-1.5 ${
                seedSuccess 
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-250' 
                  : 'bg-white hover:bg-gray-50 text-gray-700 border-gray-200'
              }`}
            >
              <RefreshCw className={`w-3.5 h-3.5 text-blue-500 ${seedLoading ? 'animate-spin' : ''}`} />
              {seedLoading ? 'Syncing Catalog...' : seedSuccess ? 'Original Cosmetics Restored ✓' : 'Sync / Restore default Cosmetics'}
            </button>
          )}
          <button
            onClick={openAddModal}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-sm shadow-sm transition active:scale-95 flex items-center gap-2 shadow-blue-200"
          >
            <Plus className="w-4 h-4" /> Add Cosmetic Product
          </button>
        </div>
      </div>

      {/* VIEW SELECTION SWITCHERS */}
      <div className="flex gap-4 border-b border-blue-100/60 pb-1">
        <button
          onClick={() => {
            setCatalogViewMode('catalog');
            setSearchTerm(''); // clean up
          }}
          className={`pb-2.5 px-2 font-bold text-xs relative transition ${
            catalogViewMode === 'catalog' ? 'text-blue-750' : 'text-gray-400 hover:text-gray-700'
          }`}
        >
          🧴 Asset Catalog & Editing
          {catalogViewMode === 'catalog' && (
            <motion.div layoutId="catalog-active-line" className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />
          )}
        </button>
        <button
          onClick={() => {
            setCatalogViewMode('sold-vs-remaining');
            setSearchTerm(''); // clean up
          }}
          className={`pb-2.5 px-2 font-bold text-xs relative transition ${
            catalogViewMode === 'sold-vs-remaining' ? 'text-blue-750' : 'text-gray-400 hover:text-gray-700'
          }`}
        >
          🔍 Audit Sold vs. Remaining Stock & Verification Keys
          {catalogViewMode === 'sold-vs-remaining' && (
            <motion.div layoutId="catalog-active-line" className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />
          )}
        </button>
      </div>

      {catalogViewMode === 'catalog' ? (
        <>
          {/* FILTER CONTROLS GRID */}
      <div className="bg-white p-4 rounded-xl border border-rose-50 shadow-2xs space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          
          {/* Main search bar */}
          <div className="relative md:col-span-5">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search by name, SKU code, brand description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 border border-rose-100 rounded-lg text-xs focus:outline-hidden focus:border-rose-400"
            />
          </div>

          {/* Category Select */}
          <div className="md:col-span-3">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3 py-1.5 border border-rose-100 rounded-lg text-xs focus:outline-hidden focus:border-rose-400 font-semibold bg-white text-gray-700"
            >
              <option value="All">🧴 All Categories</option>
              {COSMETICS_CATEGORIES.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {/* Quick Warning Indicators */}
          <div className="md:col-span-4 flex rounded-lg border border-blue-100 p-0.5 bg-blue-50/20 overflow-hidden">
            <button
              onClick={() => setStockTypeFilter('all')}
              className={`flex-1 text-[10px] py-1 font-bold text-center rounded transition ${
                stockTypeFilter === 'all' ? 'bg-white text-blue-750 shadow-xs' : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              All Assets ({products.length})
            </button>
            <button
              onClick={() => setStockTypeFilter('low')}
              className={`flex-1 text-[10px] py-1 font-bold text-center rounded transition ${
                stockTypeFilter === 'low' ? 'bg-amber-500 text-white shadow-xs' : 'text-amber-600 hover:bg-amber-50/50'
              }`}
            >
              Low ({products.filter(p => p.quantity > 0 && p.quantity <= p.safeLevel).length})
            </button>
            <button
              onClick={() => setStockTypeFilter('out')}
              className={`flex-1 text-[10px] py-1 font-bold text-center rounded transition ${
                stockTypeFilter === 'out' ? 'bg-blue-650 text-white shadow-xs' : 'text-blue-600 hover:bg-blue-50/50'
              }`}
            >
              Out ({products.filter(p => p.quantity <= 0).length})
            </button>
            <button
              onClick={() => setStockTypeFilter('expired')}
              className={`flex-1 text-[10px] py-1 font-bold text-center rounded transition ${
                stockTypeFilter === 'expired' ? 'bg-zinc-800 text-white' : 'text-zinc-600 hover:bg-zinc-100'
              }`}
            >
              Expired ({products.filter(p => getExpiryStatus(p.expiryDate) === 'expired').length})
            </button>
          </div>

        </div>
      </div>

      {/* CORE TABLE VIEW */}
      <div className="bg-white rounded-xl border border-rose-50 overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-rose-50/40 border-b border-rose-100 text-[10px] font-bold text-rose-950 uppercase tracking-wider">
                <th className="py-3.5 px-4 w-12 text-center">Shot</th>
                <th className="py-3.5 px-4">Cosmetics Name</th>
                <th className="py-3.5 px-4">Categories</th>
                <th className="py-3.5 px-4 font-mono">SKU ID</th>
                <th className="py-3.5 px-4 text-rose-800">Cost Price</th>
                <th className="py-3.5 px-4 text-emerald-800">Selling Price</th>
                <th className="py-3.5 px-4 text-center">Qty / Stock</th>
                <th className="py-3.5 px-4">Expiration</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-rose-50 text-xs">
              {filteredProducts.map(p => {
                const outOfStock = p.quantity <= 0;
                const lowStock = p.quantity > 0 && p.quantity <= p.safeLevel;
                const expiryStatus = getExpiryStatus(p.expiryDate);

                return (
                  <tr key={p.id} className="hover:bg-rose-50/10 transition leading-tight">
                    
                    {/* Item Image */}
                    <td className="py-3 px-4">
                      <div className="w-10 h-10 rounded overflow-hidden border border-gray-100 bg-gray-50 flex items-center justify-center">
                        <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" />
                      </div>
                    </td>

                    {/* Cosmetic Name & Description */}
                    <td className="py-3 px-4 max-w-xs md:max-w-sm">
                      <div className="space-y-1">
                        <h4 className="font-bold text-gray-900 leading-normal flex items-center gap-1.5 flex-wrap">
                          {p.name}
                          {p.isBundle && (
                            <span className="bg-rose-100 text-rose-800 text-[8px] font-extrabold px-1.5 py-0.5 rounded tracking-wider uppercase shrink-0">Bundle Kit</span>
                          )}
                        </h4>
                        
                        {p.description && <p className="text-[10px] text-gray-400 line-clamp-1">{p.description}</p>}
                        
                        {/* Shading/Formulation list */}
                        {p.shadeVariants && p.shadeVariants.length > 0 && (
                          <div className="flex flex-wrap gap-1 items-center pt-0.5">
                            <span className="text-[8px] uppercase font-bold text-gray-400">Shades:</span>
                            {p.shadeVariants.map(sh => (
                              <span key={sh} className="px-1 py-0.5 bg-rose-50 text-rose-700 rounded text-[9px] font-semibold border border-rose-100/50">
                                {sh}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Batch lot & Location split representation */}
                        <div className="flex flex-wrap gap-x-2.5 gap-y-1 items-center text-[10px] text-zinc-400">
                          {p.batchNumber && (
                            <span className="font-mono text-[9px]">Lot: <b className="text-zinc-600">{p.batchNumber}</b></span>
                          )}
                          {p.locationStocks && (
                            <span className="flex items-center gap-2 font-mono text-[9px] bg-zinc-50 p-1 rounded border border-zinc-100/40 flex-wrap">
                              <span>🏢 KLA: <b>{p.locationStocks.kampala || 0}</b></span>
                              <span>🏬 WDY: <b>{p.locationStocks.wandegeya || 0}</b></span>
                              <span>🏬 EBB: <b>{p.locationStocks.entebbe || 0}</b></span>
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Category Label */}
                    <td className="py-3 px-4 shrink-0">
                      <span className="px-2 py-0.5 bg-rose-50 text-rose-700 rounded text-[10px] font-semibold">
                        {p.category}
                      </span>
                    </td>

                    {/* SKU code */}
                    <td className="py-3 px-4 font-mono text-[10px] tracking-wider text-gray-400 font-medium">
                      {p.sku}
                    </td>

                    {/* Prices */}
                    <td className="py-3 px-4 font-mono text-[11px] font-medium text-rose-800">
                      {formatUGX(p.costPrice)}
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] font-medium text-emerald-800">
                      {formatUGX(p.sellingPrice)}
                    </td>

                    {/* Stock quantities with visual colors */}
                    <td className="py-3 px-4 text-center">
                      <div className="flex flex-col items-center">
                        <span className={`px-2 py-1.5 rounded-md font-space font-bold w-12 text-center text-[12px] ${
                          outOfStock 
                            ? 'bg-blue-100 text-blue-700' 
                            : lowStock 
                              ? 'bg-amber-100 text-amber-700' 
                              : 'bg-emerald-50 text-emerald-700'
                        }`}>
                          {p.quantity}
                        </span>
                        {p.lastStockIn && (
                          <span className="text-[9px] text-gray-400 mt-1">Stocked: {p.lastStockIn}</span>
                        )}
                      </div>
                    </td>

                    {/* Expiration warning codes */}
                    <td className="py-3 px-4">
                      <div className="flex flex-col">
                        <span className="font-mono text-[10px] font-semibold">{p.expiryDate}</span>
                        {expiryStatus === 'expired' ? (
                          <span className="text-[9px] font-bold text-blue-600 bg-blue-50 py-0.5 px-1.5 rounded mt-0.5 uppercase tracking-wide inline-block w-max">
                            ⚠️ EXPIRED
                          </span>
                        ) : expiryStatus === 'expiring-soon' ? (
                          <span className="text-[9px] font-bold text-amber-600 bg-amber-50 py-0.5 px-1.5 rounded mt-0.5 uppercase tracking-wide inline-block w-max">
                            ⚠️ EXPIRE SOON
                          </span>
                        ) : null}
                      </div>
                    </td>

                    {/* Standard table operations */}
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-2.5">
                        
                        {/* Quick stock replenishment toggle button */}
                        <button
                          onClick={() => {
                            setStockInProduct(p);
                            setAdditionalStockQty(10); // default
                          }}
                          className="p-1.5 text-rose-600 hover:bg-rose-50 rounded"
                          title="Quick Stock In"
                        >
                          <PackagePlus className="w-4 h-4" />
                        </button>

                        {/* Edit details */}
                        <button
                          onClick={() => openEditModal(p)}
                          className="p-1.5 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-950 rounded"
                          title="Amend Product"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>

                        {/* Delete entry */}
                        <button
                          onClick={() => {
                            if (confirm(`Do you want to permanently delete "${p.name}"?`)) {
                              onDeleteProduct(p.id);
                            }
                          }}
                          className="p-1.5 text-zinc-300 hover:text-red-600 rounded hover:bg-rose-50"
                          title="Purge Listing"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>

                  </tr>
                );
              })}

              {filteredProducts.length === 0 && (
                <tr>
                  <td colSpan={9} className="p-10 text-center text-gray-400 bg-linear-to-b from-white to-rose-50/10">
                    <div className="max-w-md mx-auto space-y-3">
                      <p className="font-semibold text-gray-800 text-sm">No cosmetics found matching descriptions.</p>
                      {products.length === 0 && onForceSeed && (
                        <div className="bg-amber-50 border border-amber-200/60 rounded-xl p-4 mt-2 space-y-2 text-left">
                          <p className="text-[11px] text-amber-900 leading-normal">
                            ⚠️ <strong>Skincare Catalog is Empty:</strong> It looks like your active database catalog has no products. You can instantly restore the 5 default skincare products shown in your stock report (including <strong>Organic Body Scrub</strong>, <strong>Glutathione Cleanser</strong>, <strong>PauDeLune</strong>, etc.) with a single click.
                          </p>
                          <button
                            onClick={handleForceSeed}
                            disabled={seedLoading}
                            className="w-full py-1.5 px-3 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white rounded-md text-[10px] font-bold transition flex items-center justify-center gap-1.5 shadow-xs"
                          >
                            <Sparkles className="w-3.5 h-3.5 animate-pulse" />
                            {seedLoading ? 'Syncing Cosmetics Catalog...' : 'Instantly Seed & Sync Skincare Catalog'}
                          </button>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
        </>
      ) : (
        <div className="space-y-6 animate-fadeIn">
          
          {/* Action Banner for Recording Direct Purchase */}
          <div className="bg-zinc-900 p-5 rounded-2xl text-white shadow-lg relative overflow-hidden border border-zinc-800">
            <div className="absolute top-0 right-0 p-4 opacity-5">
              <Coins className="w-36 h-36 rotate-12" />
            </div>
            <div className="relative z-10 max-w-xl space-y-2">
              <span className="px-2 py-0.5 bg-rose-600 rounded text-[9px] font-extrabold uppercase font-mono tracking-wider">Administrator manual register</span>
              <h3 className="font-display font-extrabold text-base md:text-lg text-white">Manual Core Sales & Security Code Generator</h3>
              <p className="text-[11px] text-zinc-400">
                Register a direct cosmetic purchase for an item. The system instantly decrements matching outlet stock, archives the transaction, and generates a dynamic verified key certificate.
              </p>
              <button
                type="button"
                onClick={() => {
                  setQuickBuySuccessDetails(null);
                  setShowQuickBuyForm(true);
                }}
                className="mt-2 text-rose-500 hover:text-rose-450 font-extrabold text-xs transition flex items-center gap-1.5 font-mono cursor-pointer bg-transparent border-0 px-0 outline-hidden"
              >
                <span>➕ Record direct manual transaction & verify codes</span>
              </button>
            </div>
          </div>

          {/* Summary counters */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-xl border border-rose-100/50 shadow-2xs">
              <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Remaining Assets</span>
              <div className="font-display font-bold text-xl text-rose-950 mt-1">
                {products.reduce((sum, p) => sum + p.quantity, 0).toLocaleString()} <span className="text-xs text-rose-600 font-sans font-medium">units</span>
              </div>
              <p className="text-[9px] mt-1 text-gray-450">Kampala HQ, Wandegeya, Entebbe sum</p>
            </div>
            <div className="bg-white p-4 rounded-xl border border-rose-100/50 shadow-2xs">
              <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Total Sold units</span>
              <div className="font-display font-bold text-xl text-emerald-800 mt-1">
                {sales.reduce((sum, s) => sum + s.items.reduce((sumQty, item) => sumQty + item.quantity, 0), 0)} <span className="text-xs font-sans font-medium">units</span>
              </div>
              <p className="text-[9px] mt-1 text-gray-455">Total beauty assets bought by clients</p>
            </div>
            <div className="bg-white p-4 rounded-xl border border-rose-100/50 shadow-2xs">
              <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Durable turnover</span>
              <div className="font-display font-bold text-xl text-zinc-900 mt-1">
                {(() => {
                  const rem = products.reduce((sum, p) => sum + p.quantity, 0);
                  const sold = sales.reduce((sum, s) => sum + s.items.reduce((sumQty, item) => sumQty + item.quantity, 0), 0);
                  const total = rem + sold;
                  return total > 0 ? `${Math.round((sold / total) * 100)}%` : '0%';
                })()}
              </div>
              <p className="text-[9px] mt-1 text-gray-450">Replacement cycle speed</p>
            </div>
            <div className="bg-white p-4 rounded-xl border border-rose-100/50 shadow-2xs">
              <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Verified Codes Generated</span>
              <div className="font-display font-bold text-xl text-rose-750 mt-1">
                {sales.filter(s => s.verificationCode).length} <span className="text-xs font-sans font-medium">items</span>
              </div>
              <p className="text-[9px] mt-1 text-gray-450">Specific secure tracking hashes</p>
            </div>
          </div>

          {/* The Ledger Audit List */}
          <div className="bg-white rounded-xl border border-rose-100/60 overflow-hidden shadow-2xs">
            <div className="p-4 border-b border-rose-100/50 bg-rose-50/10 flex flex-col sm:flex-row justify-between gap-3 items-center">
              <div>
                <h4 className="font-bold text-rose-950 text-xs sm:text-sm">Remaining vs. Sold Tracking Ledger</h4>
                <p className="text-[10px] text-gray-500">Audit exact remaining counts per product and their sold code logs.</p>
              </div>
              
              {/* Simple search bar inside the tracker */}
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Filter tracker products via name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-8 pr-3 py-1 border border-rose-100 rounded-md text-xs focus:outline-hidden focus:border-rose-350"
                />
              </div>
            </div>

            <div className="divide-y divide-rose-50">
              {products
                .filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.sku.toLowerCase().includes(searchTerm.toLowerCase()))
                .map(p => {
                  const matchedSoldItems = sales.flatMap(s => 
                    s.items
                      .filter(item => item.productId === p.id)
                      .map(item => ({
                        ...item,
                        buyerName: s.customerName || 'Walk-In Customer',
                        buyerPhone: s.customerPhone || 'N/A',
                        saleDate: s.date,
                        txCode: s.verificationCode,
                        outlet: s.location || 'kampala'
                      }))
                  );

                  const qtySold = matchedSoldItems.reduce((sum, item) => sum + item.quantity, 0);
                  const totalRevenue = matchedSoldItems.reduce((sum, item) => sum + item.subtotal, 0);
                  const qtyRemaining = p.quantity;
                  const totalOverall = qtyRemaining + qtySold;
                  const soldRatio = totalOverall > 0 ? Math.round((qtySold / totalOverall) * 100) : 0;

                  return (
                    <ProductAuditRow 
                      key={p.id} 
                      p={p} 
                      qtyRemaining={qtyRemaining} 
                      qtySold={qtySold} 
                      totalRevenue={totalRevenue} 
                      soldRatio={soldRatio} 
                      matchedSoldItems={matchedSoldItems} 
                    />
                  );
                })}
            </div>
          </div>
        </div>
      )}

      {/* QUICK QUANTITY REPLENISH MODAL */}
      <AnimatePresence>
        {stockInProduct && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-xl shadow-xl max-w-sm w-full p-5 border border-rose-100"
            >
              <div className="flex items-center justify-between border-b border-rose-50 pb-3 mb-4">
                <h3 className="font-display font-medium text-rose-950 flex items-center gap-1.5">
                  <PackagePlus className="w-4.5 h-4.5 text-rose-500" />
                  Quick Stock Adjustment
                </h3>
                <button onClick={() => setStockInProduct(null)} className="text-gray-400 hover:text-gray-600">
                  <X className="w-4.5 h-4.5" />
                </button>
              </div>

              <form onSubmit={handleStockInSubmit} className="space-y-4">
                <div>
                  <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Product selected</span>
                  <p className="font-bold text-gray-900 mt-0.5 leading-tight">{stockInProduct.name}</p>
                  <p className="text-[11px] font-mono text-gray-500 mt-1">Current Balance Stock: {stockInProduct.quantity} items</p>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                    Added Quantity Count (Arrived units)
                  </label>
                  <input
                    type="number"
                    value={additionalStockQty}
                    onChange={(e) => setAdditionalStockQty(Number(e.target.value))}
                    className="w-full border border-rose-100 rounded-lg p-2 text-sm focus:outline-hidden focus:border-rose-450 font-bold font-mono"
                    min="1"
                    required
                  />
                  <p className="text-[10px] text-gray-400 mt-1">
                    New aggregated inventory total: <b>{stockInProduct.quantity + Number(additionalStockQty)}</b> items.
                  </p>
                </div>

                <div className="flex gap-2.5 pt-2 border-t border-rose-50">
                  <button
                    type="button"
                    onClick={() => setStockInProduct(null)}
                    className="flex-1 py-1.5 bg-gray-100 text-gray-700 hover:bg-gray-150 rounded-lg text-xs font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold"
                  >
                    Apply Stock
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* DETAILED ADD / EDIT PRODUCT MODAL FORM */}
      <AnimatePresence>
        {showAddForm && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 20, opacity: 0 }}
              className="bg-white rounded-2xl shadow-xl max-w-xl w-full p-6 border border-rose-100 flex flex-col max-h-[90vh]"
            >
              <div className="flex items-center justify-between border-b border-rose-55 pb-3 mb-4 shrink-0">
                <h3 className="font-display text-lg font-bold text-rose-950 flex items-center gap-1.5">
                  <Sparkles className="w-4.5 h-4.5 text-rose-500" />
                  {editingProduct ? 'Amend Cosmetics Listing' : 'Introduce Elite Cosmetic'}
                </h3>
                <button onClick={() => setShowAddForm(false)} className="text-gray-400 hover:text-gray-650">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveProduct} className="flex-1 overflow-y-auto pr-1 space-y-4">
                
                {/* Name fields */}
                <div>
                  <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-1">
                    Cosmetics Product Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. CeraVe Hydrating Sunscreen SPF 30"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="w-full border border-rose-100 rounded-lg p-2 text-xs focus:outline-hidden focus:border-rose-450"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Category Selector */}
                  <div>
                    <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-1">
                      Cosmetics Category <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={formCategory}
                      onChange={(e) => handleCategoryChangeInForm(e.target.value)}
                      className="w-full border border-rose-100 rounded-lg p-2 text-xs focus:outline-hidden focus:border-rose-450 bg-white"
                    >
                      {COSMETICS_CATEGORIES.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>

                  {/* SKU Identifier */}
                  <div>
                    <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-1">
                      SKU Code (Automatic Barcode ID) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="EB-ORD-55"
                      value={formSku}
                      onChange={(e) => setFormSku(e.target.value)}
                      className="w-full border border-rose-100 rounded-lg p-2 text-xs focus:outline-hidden focus:border-rose-450 font-mono font-bold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Cost price inputs */}
                  <div>
                    <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-1">
                      Wholesale Cost Price (UGX) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="number"
                      required
                      placeholder="e.g. 50000"
                      value={formCostPrice || ''}
                      onChange={(e) => setFormCostPrice(Number(e.target.value))}
                      className="w-full border border-rose-100 rounded-lg p-2 text-xs font-mono font-bold focus:outline-hidden focus:border-rose-450"
                      min="0"
                    />
                  </div>

                  {/* Selling price inputs */}
                  <div>
                    <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-1">
                      Retail Selling Price (UGX) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="number"
                      required
                      placeholder="e.g. 75000"
                      value={formSellingPrice || ''}
                      onChange={(e) => setFormSellingPrice(Number(e.target.value))}
                      className="w-full border border-rose-100 rounded-lg p-2 text-xs font-mono font-bold focus:outline-hidden focus:border-rose-450 text-emerald-800"
                      min="0"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Initial stock values */}
                  <div>
                    <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wide mb-1">
                      Aggregated Balance Qty
                    </label>
                    <input
                      type="number"
                      disabled
                      value={Number(formKampalaStock) + Number(formWandegeyaStock) + Number(formEntebbeStock)}
                      className="w-full border border-gray-100 bg-gray-50 rounded-lg p-2 text-xs font-mono font-bold text-gray-500"
                    />
                  </div>

                  {/* Safety Limit alert trigger */}
                  <div>
                    <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-1">
                      Safe Level threshold <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="number"
                      required
                      placeholder="5"
                      value={formSafeLevel || ''}
                      onChange={(e) => setFormSafeLevel(Number(e.target.value))}
                      className="w-full border border-rose-100 rounded-lg p-2 text-xs font-mono focus:outline-hidden focus:border-rose-450"
                      min="0"
                    />
                  </div>

                  {/* Expiration warning code input */}
                  <div>
                    <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-1">
                      Expiry Date
                    </label>
                    <input
                      type="date"
                      required
                      value={formExpiryDate}
                      onChange={(e) => setFormExpiryDate(e.target.value)}
                      className="w-full border border-rose-100 rounded-lg p-2 text-xs font-mono focus:outline-hidden focus:border-rose-455 bg-white"
                    />
                  </div>
                </div>

                {/* Product Image Manager with Drag & Drop and manual upload */}
                <div className="bg-rose-50/10 rounded-xl border border-rose-100 p-4 space-y-3.5">
                  <span className="block text-[11px] font-bold text-gray-700 uppercase tracking-wide">
                    Product Picture / Media Cover
                  </span>

                  <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                    
                    {/* Visual Preview Thumbnail */}
                    <div className="md:col-span-4 flex flex-col items-center justify-center bg-white p-2 rounded-lg border border-rose-100/60 aspect-square h-28 w-full md:h-auto overflow-hidden relative group">
                      {formImageUrl ? (
                        <>
                          <img 
                            src={formImageUrl} 
                            alt="Cosmetic product view" 
                            className="w-full h-full object-cover rounded-md"
                          />
                          <button
                            type="button"
                            onClick={() => setFormImageUrl('')}
                            className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold rounded-md gap-1"
                          >
                            <Trash2 className="w-4 h-4 text-rose-400" />
                            Clear Image
                          </button>
                        </>
                      ) : (
                        <div className="text-center text-gray-350 flex flex-col items-center gap-1">
                          <ImageIcon className="w-8 h-8 text-rose-300" />
                          <span className="text-[10px] font-bold text-rose-400/80 uppercase">No Cover</span>
                        </div>
                      )}
                    </div>

                    {/* Drag and Drop with manual selector click trigger */}
                    <div className="md:col-span-8">
                      <div
                        onDragEnter={handleDrag}
                        onDragOver={handleDrag}
                        onDragLeave={handleDrag}
                        onDrop={handleDrop}
                        className={`border-2 border-dashed rounded-lg p-4 text-center transition-all cursor-pointer relative ${
                          dragActive 
                            ? 'border-rose-500 bg-rose-50/40 scale-[1.01]' 
                            : 'border-rose-100 hover:border-rose-300 hover:bg-rose-50/10'
                        }`}
                        onClick={() => document.getElementById('product-image-upload')?.click()}
                      >
                        <input 
                          type="file"
                          id="product-image-upload"
                          className="hidden"
                          accept="image/*"
                          onChange={handleFileChange}
                        />
                        <div className="space-y-1 text-gray-500">
                          <div className="flex justify-center">
                            <Plus className="w-5 h-5 text-rose-500" />
                          </div>
                          <p className="text-xs font-bold text-gray-700">
                            Drag &amp; Drop cosmetic picture here
                          </p>
                          <p className="text-[10px] text-gray-400">
                            or <span className="text-rose-650 hover:underline font-bold">browse local files</span> (PNG, JPG, WEBP)
                          </p>
                        </div>
                      </div>
                    </div>

                  </div>

                  {/* Fallback Paste URL option */}
                  <div className="pt-2 border-t border-rose-100/40">
                    <label className="block text-[10px] font-extrabold text-rose-700 uppercase tracking-wider mb-1">
                      Alternative: Paste Web Image URL
                    </label>
                    <input
                      type="url"
                      placeholder="https://images.unsplash.com/photo-..."
                      value={formImageUrl}
                      onChange={(e) => setFormImageUrl(e.target.value)}
                      className="w-full border border-rose-100 rounded-lg p-2 text-xs focus:outline-hidden focus:border-rose-450 bg-white"
                    />
                    <p className="text-[9px] text-gray-400 mt-1">
                      Perfect for linking instant high resolution cosmetics branding or bottle shots.
                    </p>
                  </div>
                </div>

                {/* Batch LOT and Shade Variants */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-1">
                      Batch / Lot code
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. B26-1049"
                      value={formBatchNumber}
                      onChange={(e) => setFormBatchNumber(e.target.value)}
                      className="w-full border border-rose-100 rounded-lg p-2 text-xs focus:outline-hidden focus:border-rose-450 font-mono font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-1">
                      Shade Variants (comma-separated list)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Classic Ivory, Soft Sand, Velvet Plum"
                      value={formShadeVariantsStr}
                      onChange={(e) => setFormShadeVariantsStr(e.target.value)}
                      className="w-full border border-rose-100 rounded-lg p-2 text-xs focus:outline-hidden focus:border-rose-450 font-semibold"
                    />
                  </div>
                </div>

                {/* Multi-Location stocks counts */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-rose-50/20 rounded-xl border border-rose-100">
                  <div>
                    <label className="block text-[10px] font-extrabold text-rose-700 uppercase tracking-wider mb-1">
                      Kampala HQ Stock
                    </label>
                    <input
                      type="number"
                      placeholder="10"
                      value={formKampalaStock}
                      onChange={(e) => setFormKampalaStock(Number(e.target.value))}
                      className="w-full border border-rose-100 rounded-lg p-2 text-xs focus:outline-hidden focus:border-rose-450 font-mono font-bold bg-white"
                      min="0"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-extrabold text-rose-700 uppercase tracking-wider mb-1">
                      Wandegeya Stock
                    </label>
                    <input
                      type="number"
                      placeholder="5"
                      value={formWandegeyaStock}
                      onChange={(e) => setFormWandegeyaStock(Number(e.target.value))}
                      className="w-full border border-rose-100 rounded-lg p-2 text-xs focus:outline-hidden focus:border-rose-450 font-mono font-bold bg-white"
                      min="0"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-extrabold text-rose-700 uppercase tracking-wider mb-1">
                      Entebbe Stock
                    </label>
                    <input
                      type="number"
                      placeholder="5"
                      value={formEntebbeStock}
                      onChange={(e) => setFormEntebbeStock(Number(e.target.value))}
                      className="w-full border border-rose-100 rounded-lg p-2 text-xs focus:outline-hidden focus:border-rose-450 font-mono font-bold bg-white"
                      min="0"
                    />
                  </div>
                  <div className="col-span-full pt-1 text-[10px] text-zinc-500 font-sans">
                    * The outlets stocks will automatically sum to define the Primary inventory balance total of <b>{Number(formKampalaStock) + Number(formWandegeyaStock) + Number(formEntebbeStock)}</b> units.
                  </div>
                </div>

                {/* Brief description column */}
                <div>
                  <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-1">
                    Formula Specification & Description
                  </label>
                  <textarea
                    rows={2}
                    placeholder="e.g. Suitable for sensitive skin types, fragrance-free, hyaluronic-infused formulation."
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    className="w-full border border-rose-100 rounded-lg p-2 text-xs focus:outline-hidden focus:border-rose-450"
                  />
                </div>

                {/* Submit buttons */}
                <div className="flex gap-3 pt-4 border-t border-rose-50 shrink-0">
                  <button
                    type="button"
                    onClick={() => setShowAddForm(false)}
                    className="flex-1 py-1.5 bg-gray-150 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-semibold"
                  >
                    Dismiss
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold shadow-sm"
                  >
                    {editingProduct ? 'Commit Changes' : 'Launch Listing'}
                  </button>
                </div>

              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* QUICK ADMIN DIRECT SOLD-transaction RECORDING MODAL */}
      <AnimatePresence>
        {showQuickBuyForm && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-rose-100 flex flex-col max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between border-b border-rose-100 pb-3 mb-4 shrink-0">
                <div className="flex items-center gap-1.5 text-rose-950 font-bold">
                  <Coins className="w-5 h-5 text-rose-600" />
                  <span className="font-sans text-sm md:text-base">Record Bought/Sold Transaction</span>
                </div>
                <button 
                  onClick={() => {
                    setShowQuickBuyForm(false);
                    setQuickBuySuccessDetails(null);
                  }} 
                  className="text-gray-400 hover:text-rose-600 transition border-0 bg-transparent cursor-pointer outline-hidden"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {quickBuySuccessDetails ? (
                <div className="text-center py-6 space-y-4">
                  <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-200">
                    <CheckCircle2 className="w-6 h-6 animate-bounce" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-extrabold text-emerald-800 text-sm font-sans">Bought Log Form Successfully Generated!</h4>
                    <p className="text-[11px] text-gray-500">The product quantity has been automatically decremented, and security keys generated.</p>
                  </div>

                  <div className="bg-rose-50/40 p-4 rounded-xl border border-rose-100/50 text-left font-mono space-y-1.5 text-xs max-w-sm mx-auto">
                    <div className="flex justify-between border-b border-rose-100/30 pb-1 text-gray-500 text-[10px]">
                      <span>INVOICE SERIAL:</span>
                      <span className="font-bold text-gray-800">{quickBuySuccessDetails.invoice}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-rose-700 font-bold">TRANSACTION CODE:</span>
                      <span className="font-extrabold text-zinc-900">{quickBuySuccessDetails.txCode}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-650">PRODUCT INSTANCE KEY:</span>
                      <span className="font-bold text-rose-800">{quickBuySuccessDetails.itemCode}</span>
                    </div>
                  </div>

                  {quickBuySuccessDetails.productId && (() => {
                    const matchProd = products.find(p => p.id === quickBuySuccessDetails.productId);
                    if (!matchProd) return null;
                    return (
                      <div className="bg-emerald-50/45 p-3.5 rounded-xl border border-emerald-100 text-left space-y-1 text-[11px] max-w-sm mx-auto">
                        <span className="block text-[9px] font-bold text-emerald-800 uppercase tracking-wider mb-1">Post-Purchase Stock Status</span>
                        <div className="flex justify-between text-zinc-700">
                          <span>Total Remaining Stock:</span>
                          <span className="font-extrabold text-zinc-900 font-mono">{matchProd.quantity} units</span>
                        </div>
                        {matchProd.locationStocks && (
                          <div className="flex justify-between text-zinc-500 text-[10px]">
                            <span>Branch Stock ({quickBuyOutlet === 'kampala' ? 'KAMPALA HQ' : quickBuyOutlet.toUpperCase()}):</span>
                            <span className="font-bold font-mono text-zinc-800">{matchProd.locationStocks[quickBuyOutlet] ?? 0} units</span>
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  <div className="pt-2 flex gap-3">
                    <button
                      type="button"
                      onClick={() => setQuickBuySuccessDetails(null)}
                      className="flex-1 py-2 bg-rose-55 hover:bg-rose-100 text-rose-950 rounded-lg text-xs font-bold font-mono transition cursor-pointer border-0"
                    >
                      Record Another
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowQuickBuyForm(false);
                        setQuickBuySuccessDetails(null);
                      }}
                      className="flex-1 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold font-sans transition cursor-pointer border-0"
                    >
                      Close Window
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleQuickBuySubmit} className="space-y-4 text-xs text-gray-700">
                  
                  {/* Select product */}
                  <div>
                    <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">Select Purchased Cosmetic product *</label>
                    <select
                      required
                      value={quickBuyProductId}
                      onChange={(e) => {
                        setQuickBuyProductId(e.target.value);
                        // Default shade choice
                        const p = products.find(prod => prod.id === e.target.value);
                        if (p && p.shadeVariants && p.shadeVariants.length > 0) {
                          setQuickBuyShade(p.shadeVariants[0]);
                        } else {
                          setQuickBuyShade('');
                        }
                      }}
                      className="w-full border border-rose-100 rounded-lg p-2.5 text-xs font-semibold focus:outline-hidden focus:border-rose-450 bg-white"
                    >
                      <option value="">-- Choose cosmetics listing --</option>
                      {products.map(p => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.quantity} rem • {formatUGX(p.sellingPrice)})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Branch outlet */}
                  <div>
                    <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">Selling Outlet Branch *</label>
                    <div className="grid grid-cols-3 gap-2.5">
                      {(['kampala', 'wandegeya', 'entebbe'] as const).map(loc => (
                        <button
                          key={loc}
                          type="button"
                          onClick={() => setQuickBuyOutlet(loc)}
                          className={`py-2 text-center rounded-lg border font-bold capitalize transition cursor-pointer ${
                            quickBuyOutlet === loc 
                              ? 'bg-rose-600 text-white border-rose-600' 
                              : 'bg-white hover:bg-rose-50/50 border-rose-100 text-gray-600'
                          }`}
                        >
                          {loc === 'kampala' ? 'Kampala HQ' : loc}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Quantity and Shade selection */}
                  <div className="grid grid-cols-2 gap-3.5">
                    <div>
                      <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">Quantity bought *</label>
                      <input
                        type="number"
                        min={1}
                        required
                        value={quickBuyQuantity}
                        onChange={(e) => setQuickBuyQuantity(Math.max(1, Number(e.target.value)))}
                        className="w-full border border-rose-100 rounded-lg p-2 font-bold font-mono focus:outline-hidden bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">Select Formulation Shade</label>
                      {quickBuyProductId && products.find(p => p.id === quickBuyProductId)?.shadeVariants?.length ? (
                        <select
                          value={quickBuyShade}
                          onChange={(e) => setQuickBuyShade(e.target.value)}
                          className="w-full border border-rose-100 rounded-lg p-2 text-xs font-semibold focus:outline-hidden bg-white text-gray-700"
                        >
                          {products.find(p => p.id === quickBuyProductId)?.shadeVariants?.map(sh => (
                            <option key={sh} value={sh}>{sh}</option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type="text"
                          placeholder="No variants"
                          disabled
                          className="w-full border border-gray-100 rounded-lg p-2 bg-gray-50 text-gray-400 focus:outline-hidden"
                        />
                      )}
                    </div>
                  </div>

                  <div className="border-t border-dashed border-rose-100/60 my-3"></div>

                  {/* Customer details */}
                  <div className="grid grid-cols-2 gap-3.5">
                    <div>
                      <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">Client name (bought details)</label>
                      <input
                        type="text"
                        placeholder="Sandra Nabukenya"
                        value={quickBuyCustomerName}
                        onChange={(e) => setQuickBuyCustomerName(e.target.value)}
                        className="w-full border border-rose-100 rounded-lg p-2 font-medium focus:outline-hidden bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">Client phone number</label>
                      <input
                        type="text"
                        placeholder="e.g. 077123456"
                        value={quickBuyCustomerPhone}
                        onChange={(e) => setQuickBuyCustomerPhone(e.target.value)}
                        className="w-full border border-rose-100 rounded-lg p-2 font-mono focus:outline-hidden font-bold bg-white"
                      />
                    </div>
                  </div>

                    <div className="bg-blue-50/30 p-3 rounded-xl border border-blue-100/50 flex justify-between items-center mt-3">
                    <div>
                      <span className="text-[10px] text-gray-500 font-bold block">Live Estimated retail Amount:</span>
                      <span className="text-xs text-blue-800 font-extrabold font-mono">
                        {quickBuyProductId 
                          ? formatUGX((products.find(p => p.id === quickBuyProductId)?.sellingPrice || 0) * quickBuyQuantity) 
                          : '0 Shs'}
                      </span>
                    </div>
                    <span className="text-[9px] text-emerald-650 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100 font-bold uppercase font-mono">Auto verified</span>
                  </div>

                  <div className="pt-3 flex gap-3">
                    <button
                      type="button"
                      onClick={() => setShowQuickBuyForm(false)}
                      className="flex-1 py-1.5 bg-gray-150 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-semibold cursor-pointer border-0"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={!quickBuyProductId}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-bold shadow-sm transition border-0 cursor-pointer ${
                        quickBuyProductId 
                          ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                          : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                      }`}
                    >
                      ⚡ Record Purchase & Code
                    </button>
                  </div>

                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}

// ==========================================
// INDIVIDUAL PRODUCT REMAINING VS SOLD ROW
// ==========================================
function ProductAuditRow({ 
  p, 
  qtyRemaining, 
  qtySold, 
  totalRevenue, 
  soldRatio, 
  matchedSoldItems 
}: { 
  key?: string;
  p: Product; 
  qtyRemaining: number; 
  qtySold: number; 
  totalRevenue: number; 
  soldRatio: number; 
  matchedSoldItems: any[] 
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div id={`audit-row-${p.sku}`} className="p-4 sm:p-5 transition hover:bg-blue-50/5/35">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        
        {/* Item metadata */}
        <div className="flex items-center gap-3 min-w-0 md:w-1/3 text-left">
          <div className="w-12 h-12 rounded overflow-hidden shadow-2xs border border-blue-100/50 flex-shrink-0">
            <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" />
          </div>
          <div className="min-w-0">
            <h5 className="font-bold text-gray-950 font-sans text-xs sm:text-sm truncate" title={p.name}>{p.name}</h5>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[10px] font-mono text-blue-800 bg-blue-50 px-1 rounded font-bold">{p.sku}</span>
              <span className="text-[9px] text-gray-450 font-semibold">{p.category}</span>
            </div>
          </div>
        </div>

        {/* Remaining vs Sold numbers column */}
        <div className="grid grid-cols-2 gap-4 text-center md:w-1/3 shrink-0">
          <div className="bg-blue-50/20 p-2 rounded-lg border border-blue-50/50 flex flex-col justify-center">
            <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">Remaining Stock</span>
            <div className="font-mono text-sm font-extrabold text-blue-750 mt-0.5">
              {qtyRemaining} <span className="text-[9px] font-sans font-semibold text-gray-500">units</span>
            </div>
            {/* Multi location breakdown */}
            <div className="flex justify-center gap-2 text-[8px] text-gray-400 mt-1 uppercase">
              <span>kla: {p.locationStocks?.kampala ?? qtyRemaining}</span>
              <span>wdy: {p.locationStocks?.wandegeya ?? 0}</span>
              <span>ebb: {p.locationStocks?.entebbe ?? 0}</span>
            </div>
          </div>

          <div className="bg-emerald-50/10 p-2 rounded-lg border border-emerald-50/50 flex flex-col justify-center">
            <span className="text-[9px] text-zinc-400 font-bold uppercase tracking-wider">Sold Units</span>
            <div className="font-mono text-sm font-extrabold text-emerald-850 mt-0.5">
              {qtySold} <span className="text-[9px] font-sans font-semibold text-gray-500">units</span>
            </div>
            <span className="text-[7.5px] text-emerald-600 font-extrabold uppercase tracking-widest mt-1">
              rev: {formatUGX(totalRevenue)}
            </span>
          </div>
        </div>

        {/* Turn Ratio and Expansion toggle */}
        <div className="flex items-center justify-between md:justify-end gap-5 md:w-1/3 shrink-0">
          <div className="flex-1 max-w-[120px] text-right">
            <div className="flex justify-between text-[9px] text-gray-400 font-bold mb-1">
              <span>Turnover:</span>
              <span className="text-blue-700">{soldRatio}% sold</span>
            </div>
            <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden flex">
              <div 
                className="bg-emerald-600 h-full rounded-full transition-all duration-500" 
                style={{ width: `${soldRatio}%` }}
              />
              <div 
                className="bg-blue-300 h-full transition-all duration-500" 
                style={{ width: `${100 - soldRatio}%` }}
              />
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className={`px-3 py-1 text-[10px] font-bold rounded-lg border transition cursor-pointer ${
              isOpen 
                ? 'bg-blue-600 text-white border-blue-600' 
                : 'bg-white text-blue-850 hover:bg-blue-50 border-blue-100'
            }`}
          >
            {isOpen ? 'Close Audits' : `Check Sales (${qtySold})`}
          </button>
        </div>

      </div>

      {/* Expanded sub-table showing buyers verification certificates & dates */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden bg-blue-50/10 rounded-lg border border-blue-100/30 mt-3 p-3 space-y-2 font-sans"
          >
            <div className="flex items-center gap-1 text-[9.5px] font-bold text-blue-950 uppercase border-b border-blue-100/30 pb-1.5">
              <History className="w-3.5 h-3.5 text-blue-600 animate-spin" style={{ animationDuration: '6s' }} />
              <span>Purchase History & Authenticity Key Registry</span>
            </div>

            {matchedSoldItems.length === 0 ? (
              <p className="text-[10px] text-gray-400 italic py-2 pl-1">No units of this cosmetic have been sold yet through POS or Direct Entry.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-[10.5px]">
                  <thead>
                    <tr className="text-gray-400 text-[9px] uppercase font-bold border-b border-gray-150/40">
                      <th className="py-1">Buyer Client Name</th>
                      <th className="py-1">Branch/Outlet</th>
                      <th className="py-1 text-center font-bold">Qty bought</th>
                      <th className="py-1">Subtotal</th>
                      <th className="py-1">Purchase Date</th>
                      <th className="py-1 text-right font-mono">SPECIFIC CODES GENERATED</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100/50">
                    {matchedSoldItems.map((item, idx) => (
                      <tr key={idx} className="hover:bg-blue-50/30">
                        <td className="py-1.5 font-bold text-gray-800">{item.buyerName}</td>
                        <td className="py-1.5 uppercase font-medium text-gray-500">{item.outlet}</td>
                        <td className="py-1 text-center font-bold font-mono text-zinc-900">{item.quantity}</td>
                        <td className="py-1.5 font-bold text-blue-900">{formatUGX(item.subtotal)}</td>
                        <td className="py-1.5 text-gray-450">{new Date(item.saleDate).toLocaleDateString()}</td>
                        <td className="py-1.5 text-right font-mono">
                          <div className="flex items-center justify-end gap-1 flex-wrap">
                            {item.verificationCode && (
                              <span className="px-1.5 py-0.5 bg-blue-50 border border-blue-100/60 rounded text-[9px] text-blue-750 font-extrabold" title="Item Specific ID">
                                ITEM: {item.verificationCode}
                              </span>
                            )}
                            {item.txCode && (
                              <span className="px-1.5 py-0.5 bg-zinc-900 text-zinc-100 rounded text-[9px] font-extrabold" title="Overall Purchase Receipt Code">
                                TX: {item.txCode}
                              </span>
                            )}
                            {!item.verificationCode && !item.txCode && (
                              <span className="text-blue-500 font-bold uppercase text-[8px]">Unregistered</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
