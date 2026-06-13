import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, 
  Plus, 
  Minus, 
  Trash2, 
  Sparkles, 
  User, 
  Smartphone, 
  Tags, 
  Check, 
  Printer, 
  X,
  CreditCard,
  CircleCheck,
  AlertCircle,
  QrCode,
  Wifi,
  Lock,
  SmartphoneCharging,
  ShieldCheck,
  Coins
} from 'lucide-react';
import { Product, Sale, SaleItem } from '../types';
import { formatUGX } from '../utils';

interface PosRegisterProps {
  products: Product[];
  onRecordSale: (sale: Sale) => void;
  existingSalesCount: number;
}

export default function PosRegister({
  products,
  onRecordSale,
  existingSalesCount
}: PosRegisterProps) {
  // Core Cart State
  // Cart items can also track the specific chosen cosmetic shade
  const [cart, setCart] = useState<{ product: Product; quantity: number; selectedShade?: string }[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<Sale['paymentMethod']>('Cash');
  const [paidAmount, setPaidAmount] = useState<number>(0);
  
  // Client stats
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');

  // Cosmetic shade selections (temporary picker per product card)
  const [productShadePickers, setProductShadePickers] = useState<{ [prodId: string]: string }>({});

  // Barcode / Scanner simulator state
  const [showScanner, setShowScanner] = useState(false);
  const [scannerFeedback, setScannerFeedback] = useState<string>('');

  // Mobile Money Interactive Prompt State
  const [showMomoModal, setShowMomoModal] = useState(false);
  const [momoNetwork, setMomoNetwork] = useState<'MTN Mobile Money' | 'Airtel Money'>('MTN Mobile Money');
  const [momoStep, setMomoStep] = useState<'digits' | 'sending' | 'pin-input' | 'authorized'>('digits');
  const [momoTargetPhone, setMomoTargetPhone] = useState('');
  const [momoPinCode, setMomoPinCode] = useState('');
  const [momoTimer, setMomoTimer] = useState(0);

  // Receipt Modal State
  const [showReceipt, setShowReceipt] = useState(false);
  const [generatedSale, setGeneratedSale] = useState<Sale | null>(null);

  // Initialize shade pickers with first shade when products list loads
  useEffect(() => {
    const initialPickers: { [id: string]: string } = {};
    products.forEach(p => {
      if (p.shadeVariants && p.shadeVariants.length > 0) {
        initialPickers[p.id] = p.shadeVariants[0];
      }
    });
    setProductShadePickers(initialPickers);
  }, [products]);

  // Handle category list
  const categories = useMemo(() => {
    return ['All', ...Array.from(new Set(products.map(p => p.category)))];
  }, [products]);

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          p.sku.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Cart operations
  const addToCart = (product: Product, shadeOverride?: string) => {
    if (product.quantity <= 0) return;
    
    const chosenShade = shadeOverride || productShadePickers[product.id] || (product.shadeVariants ? product.shadeVariants[0] : undefined);
    
    setCart(prev => {
      // Find item matching same product and same shade variant
      const existing = prev.find(item => item.product.id === product.id && item.selectedShade === chosenShade);
      if (existing) {
        // Guard against total remaining stock counts
        const totalQtyForProd = prev
          .filter(item => item.product.id === product.id)
          .reduce((sum, item) => sum + item.quantity, 0);

        if (totalQtyForProd >= product.quantity) {
          alert(`Warning: Only ${product.quantity} units of ${product.name} are available in store stock.`);
          return prev;
        }
        return prev.map(item => 
          (item.product.id === product.id && item.selectedShade === chosenShade)
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { product, quantity: 1, selectedShade: chosenShade }];
    });
  };

  const updateCartQty = (productId: string, selectedShade: string | undefined, delta: number) => {
    setCart(prev => {
      return prev.map(item => {
        if (item.product.id === productId && item.selectedShade === selectedShade) {
          const newQty = item.quantity + delta;
          if (newQty <= 0) return null;
          
          // Count total cart items of this product
          const totalQtyForProd = prev
            .filter(i => i.product.id === productId)
            .reduce((sum, i) => sum + (i.selectedShade === selectedShade ? newQty : i.quantity), 0);

          if (delta > 0 && totalQtyForProd > item.product.quantity) return item;
          return { ...item, quantity: newQty };
        }
        return item;
      }).filter((item): item is typeof cart[0] => item !== null);
    });
  };

  const removeFromCart = (productId: string, selectedShade: string | undefined) => {
    setCart(prev => prev.filter(item => !(item.product.id === productId && item.selectedShade === selectedShade)));
  };

  const clearPosState = () => {
    setCart([]);
    setSearchTerm('');
    setDiscountAmount(0);
    setPaidAmount(0);
    setPaymentMethod('Cash');
    setCustomerName('');
    setCustomerPhone('');
  };

  // Calculations
  const cartSubtotal = cart.reduce((sum, item) => sum + (item.product.sellingPrice * item.quantity), 0);
  const cartTotal = Math.max(0, cartSubtotal - discountAmount);
  
  // Sync default paidAmount for checkouts
  useEffect(() => {
    if (paymentMethod !== 'Credit') {
      setPaidAmount(cartTotal);
    } else {
      setPaidAmount(0);
    }
  }, [cartTotal, paymentMethod]);

  const balanceDue = Math.max(0, cartTotal - paidAmount);

  // Barcode quick scans simulation
  const handleSimulateScan = (scannedSku: string) => {
    const productFound = products.find(p => p.sku === scannedSku);
    if (productFound) {
      if (productFound.quantity <= 0) {
        setScannerFeedback(`❌ SKU ${scannedSku} found but it is OUT OF STOCK.`);
        return;
      }
      // Play a simulated beep
      try {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.frequency.setValueAtTime(1400, audioCtx.currentTime); // Beep pitch
        gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.12); // Short beep duration
      } catch (e) {
        // Safe fail block if audio context blocked or unready
      }

      addToCart(productFound);
      setScannerFeedback(`🟢 SUCCESS: Scanned "${productFound.name}" SKU [${productFound.sku}] added to cart!`);
    } else {
      setScannerFeedback(`⚠️ SKU ${scannedSku} not registered in cosmetics inventory.`);
    }
    setTimeout(() => setScannerFeedback(''), 4500);
  };

  // Mobile Money simulated processing triggers
  const triggerMobileMoneyFlow = () => {
    const userTel = customerPhone.trim() || "0772456789";
    setMomoTargetPhone(userTel);
    setMomoNetwork(paymentMethod === 'Airtel Money' ? 'Airtel Money' : 'MTN Mobile Money');
    setMomoStep('digits');
    setShowMomoModal(true);
  };

  // Proceed order logging
  const executeFinalCheckout = (paymentReceiptMethod: Sale['paymentMethod'] = paymentMethod) => {
    const invoiceNumber = `EB-2026-${existingSalesCount + 101}`;
    const txCode = `EB-TX-${Math.floor(1000 + Math.random() * 9000)}`;
    const saleItems: SaleItem[] = cart.map((item, idx) => {
      const extension = item.selectedShade ? ` (${item.selectedShade})` : '';
      const itemCode = `EB-ITM-${Math.floor(10000 + Math.random() * 90000)}`;
      return {
        productId: item.product.id,
        productName: item.product.name + extension,
        price: item.product.sellingPrice,
        quantity: item.quantity,
        subtotal: item.product.sellingPrice * item.quantity,
        verificationCode: itemCode
      };
    });

    const finalSale: Sale = {
      id: `sale-${Date.now()}`,
      invoiceNumber,
      items: saleItems,
      totalAmount: cartTotal,
      discount: discountAmount,
      paidAmount: paymentReceiptMethod === 'Credit' ? paidAmount : cartTotal,
      balanceDue: paymentReceiptMethod === 'Credit' ? balanceDue : 0,
      paymentMethod: paymentReceiptMethod,
      customerName: customerName.trim() || undefined,
      customerPhone: customerPhone.trim() || undefined,
      date: new Date().toISOString(),
      verificationCode: txCode
    };

    onRecordSale(finalSale);
    setGeneratedSale(finalSale);
    setShowReceipt(true);
  };

  const handleCheckoutSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) return;

    if (paymentMethod === 'MTN Mobile Money' || paymentMethod === 'Airtel Money') {
      triggerMobileMoneyFlow();
    } else {
      executeFinalCheckout();
    }
  };

  // MOMO simulated verification sequences
  const startMomoPushPrompt = () => {
    setMomoStep('sending');
    setTimeout(() => {
      setMomoStep('pin-input');
    }, 2000);
  };

  const authorizeMomoPayment = () => {
    setMomoStep('authorized');
    setTimeout(() => {
      setShowMomoModal(false);
      // Finalize the recorded sale with verified Mobile Money payment method
      executeFinalCheckout(momoNetwork);
    }, 1800);
  };

  return (
    <div id="beauty-pos-container" className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start h-[calc(100vh-140px)] min-h-[500px]">
      
      {/* LEFT COMPONENT: Catalog Grid & Search / Scanner Simulators */}
      <div className="lg:col-span-7 xl:col-span-8 flex flex-col h-full gap-4">
        
        {/* Search header container */}
        <div className="bg-white p-4 rounded-xl border border-rose-100 shadow-xs space-y-3">
          <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center">
            
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-rose-400" />
              <input 
                type="text" 
                placeholder="Search products by title, active formula, or SKU code..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-rose-100 rounded-lg text-xs focus:outline-hidden focus:ring-1 focus:ring-rose-400 focus:border-rose-400 font-sans text-gray-800"
              />
            </div>

            {/* BARCODE SCAN SIMULATOR BUTTON */}
            <button
              type="button"
              onClick={() => {
                setShowScanner(!showScanner);
                setScannerFeedback('');
              }}
              className="flex items-center justify-center gap-1.5 px-4 py-2 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-white text-xs font-bold rounded-lg transition shrink-0 transition"
            >
              <QrCode className="w-4 h-4 text-rose-500 animate-pulse" />
              Barcode Scanner Gun
            </button>
          </div>

          {/* Barcode scanner panel drawer */}
          <AnimatePresence>
            {showScanner && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="border border-dashed border-zinc-700 bg-zinc-950 p-3.5 rounded-lg overflow-hidden text-zinc-300"
              >
                <div className="flex justify-between items-center mb-2 pb-1.5 border-b border-zinc-900/60">
                  <span className="text-[11px] font-mono tracking-wider text-rose-450 uppercase font-black flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-ping"></span>
                    Interactive Laser Scanner Gun Simulator
                  </span>
                  <button onClick={() => setShowScanner(false)} className="text-zinc-500 hover:text-white">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <p className="text-[10px] text-zinc-400 mb-3 font-sans">
                  No scanning hardware connected. Click any beauty item below to simulate pointing the hardware scanner gun and drawing the red SKU barcode sweep beam:
                </p>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {products.slice(0, 8).map(prod => (
                    <button
                      key={prod.sku}
                      type="button"
                      onClick={() => handleSimulateScan(prod.sku)}
                      className="px-2.5 py-1.5 bg-zinc-900 border border-zinc-800 rounded hover:border-rose-700 hover:bg-zinc-850 text-left text-[11px] truncate text-zinc-300 transition shrink shadow-2xs font-mono"
                    >
                      📟 {prod.name.split(' ')[0]} ({prod.sku})
                    </button>
                  ))}
                </div>

                {scannerFeedback && (
                  <div className="mt-3 text-center py-1.5 px-2 bg-zinc-900 border border-zinc-800 rounded text-xs font-semibold font-mono tracking-wide">
                    {scannerFeedback}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1 text-[11px] font-bold shrink-0 rounded-full transition-all ${
                  selectedCategory === cat 
                    ? 'bg-rose-600 text-white shadow-xs' 
                    : 'bg-rose-50/60 hover:bg-rose-100 text-rose-900'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Product Catalog list display */}
        <div className="flex-1 overflow-y-auto pr-1 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 pb-4">
          {filteredProducts.map(p => {
            const isOutOfStock = p.quantity <= 0;
            const isLow = p.quantity > 0 && p.quantity <= p.safeLevel;
            
            // Calc current quantity left considering cart
            const itemsInCartForProduct = cart.filter(item => item.product.id === p.id);
            const totalQtyInCart = itemsInCartForProduct.reduce((sum, item) => sum + item.quantity, 0);
            const qtyRemaining = p.quantity - totalQtyInCart;

            return (
              <motion.div 
                layout
                key={p.id}
                className={`bg-white rounded-xl border p-3 flex flex-col justify-between shadow-2xs group relative transition duration-150 ${
                  isOutOfStock ? 'opacity-60 border-zinc-100 bg-zinc-50/20' : 'hover:border-rose-200 border-rose-50'
                }`}
              >
                <div>
                  <div className="w-full h-32 rounded-lg bg-rose-50/20 overflow-hidden relative border border-rose-50/50">
                    <img 
                      src={p.imageUrl} 
                      alt={p.name} 
                      className="w-full h-full object-cover transition duration-300 group-hover:scale-105" 
                    />
                    
                    {/* Expiration date countdown warnings */}
                    {p.expiryDate && (
                      <span className="absolute bottom-2 left-2 bg-black/70 backdrop-blur-md text-white text-[9px] font-bold px-1.5 py-0.5 rounded tracking-wide font-mono z-10">
                        EXP: {p.expiryDate}
                      </span>
                    )}

                    <div className="absolute top-2 right-2 flex flex-col gap-1 items-end">
                      {isOutOfStock ? (
                        <span className="bg-red-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded tracking-wide uppercase shadow-xs">
                          Out of Stock
                        </span>
                      ) : isLow ? (
                        <span className="bg-amber-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded tracking-wide uppercase shadow-xs">
                          Low Stock
                        </span>
                      ) : null}
                    </div>
                  </div>

                  {/* Content details */}
                  <div className="mt-2.5">
                    <span className="text-[10px] text-rose-500 font-extrabold tracking-widest uppercase">{p.category}</span>
                    <h4 className="text-xs font-bold text-gray-900 mt-0.5 line-clamp-2 leading-tight min-h-[2.2rem]">
                      {p.name}
                    </h4>
                    
                    <div className="flex gap-2 items-center text-[10px] text-gray-400 mt-1 font-mono">
                      <span>SKU: {p.sku}</span>
                      {p.batchNumber && <span>• Batch: {p.batchNumber}</span>}
                    </div>

                    {/* Dynamic Cosmetic Shade Selection dropdown inside card */}
                    {p.shadeVariants && p.shadeVariants.length > 0 && (
                      <div className="mt-2.5 bg-rose-50/20 p-1.5 rounded-lg border border-rose-100 mr-2">
                        <label className="block text-[8px] font-extrabold text-rose-700 uppercase tracking-wider mb-0.5">Select Shade shade/mix</label>
                        <select
                          value={productShadePickers[p.id] || p.shadeVariants[0]}
                          onChange={(e) => setProductShadePickers(prev => ({ ...prev, [p.id]: e.target.value }))}
                          className="w-full p-0.5 bg-white text-[10px] font-medium border border-rose-100 rounded text-gray-700"
                        >
                          {p.shadeVariants.map(sh => (
                            <option key={sh} value={sh}>{sh}</option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-4 pt-2.5 border-t border-rose-50/60 flex items-center justify-between">
                  <div>
                    <span className="block text-[8px] text-gray-400 uppercase tracking-widest font-extrabold">Retail Price</span>
                    <span className="font-space font-bold text-[13px] text-gray-900 font-mono">{formatUGX(p.sellingPrice)}</span>
                  </div>
                  
                  {isOutOfStock ? (
                    <button 
                      type="button"
                      disabled
                      className="p-1.5 bg-gray-100 text-gray-400 rounded-lg cursor-not-allowed text-[10px] font-bold uppercase"
                    >
                      Empty
                    </button>
                  ) : qtyRemaining <= 0 ? (
                    <span className="bg-emerald-50 text-emerald-600 py-1 px-2 rounded-lg text-[10px] font-bold">
                      Add limit
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => addToCart(p)}
                      className="p-1.5 px-3.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1 active:scale-95 shadow-2xs shadow-rose-200"
                    >
                      <Plus className="w-3.5 h-3.5" /> ADD TO CART
                    </button>
                  )}
                </div>
                
                {/* Stock remaining flag overlay badge */}
                <div className="absolute top-4 left-4 bg-white/95 backdrop-blur-xs px-1.5 py-0.5 rounded border border-gray-100 text-[9px] font-bold text-gray-700 font-mono">
                  {qtyRemaining} left
                </div>
              </motion.div>
            );
          })}

          {filteredProducts.length === 0 && (
            <div className="col-span-full bg-white rounded-xl border border-rose-50 p-12 text-center text-gray-400">
              <AlertCircle className="w-8 h-8 text-rose-300 mx-auto" />
              <p className="font-medium mt-3">No registered cosmetics match search metrics.</p>
              <button 
                type="button"
                onClick={() => { setSearchTerm(''); setSelectedCategory('All'); }}
                className="mt-2 text-xs text-rose-600 font-bold hover:underline"
              >
                Clear keywords query
              </button>
            </div>
          )}
        </div>
      </div>

      {/* RIGHT COMPONENT: ACTIVE SHOPPING CART DRAWER (4 columns) */}
      <form 
        onSubmit={handleCheckoutSubmit}
        className="lg:col-span-5 xl:col-span-4 bg-white rounded-xl border border-rose-50 shadow-xs h-full flex flex-col overflow-hidden"
      >
        <div className="p-4 bg-rose-50/40 border-b border-rose-50 flex justify-between items-center shrink-0">
          <h3 className="font-display font-bold text-rose-950 flex items-center gap-1.5">
            <Sparkles className="w-4.5 h-4.5 text-rose-600" />
            POS Cash Ledger
          </h3>
          <span className="px-2 py-0.5 bg-rose-100 text-rose-800 text-[10px] font-bold rounded-full font-mono">
            {cart.reduce((sum, i) => sum + i.quantity, 0)} items
          </span>
        </div>

        {/* Selected Items List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-400 text-center py-10">
              <span className="p-3 bg-rose-50 rounded-full text-rose-300 mb-2.5">
                <QrCode className="w-6 h-6" />
              </span>
              <p className="font-medium text-xs">Waiting for sales items checkout...</p>
              <p className="text-[10px] mt-1 text-gray-410 px-6 font-sans">Select cosmetics from the list or simulate scanning barcode gun key tags.</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {cart.map((item, idx) => (
                <div key={`${item.product.id}-${item.selectedShade || idx}`} className="bg-rose-50/20 p-2.5 rounded-lg border border-rose-100/40">
                  <div className="flex items-start gap-2.5">
                    <div className="w-10 h-10 rounded overflow-hidden shrink-0 bg-gray-100 border border-gray-100">
                      <img src={item.product.imageUrl} alt={item.product.name} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h5 className="text-[11px] font-bold text-gray-800 truncate leading-tight">{item.product.name}</h5>
                      
                      {/* Shade Tag display */}
                      {item.selectedShade && (
                        <span className="inline-block mt-0.5 px-1.5 py-0.5 bg-rose-100/60 text-rose-800 text-[9px] font-bold rounded">
                          🎨 {item.selectedShade}
                        </span>
                      )}
                      
                      <div className="text-[10px] font-medium text-gray-500 font-mono mt-0.5">
                        {formatUGX(item.product.sellingPrice)} × {item.quantity}
                      </div>
                    </div>
                    
                    {/* Qty count edit */}
                    <div className="flex items-center gap-1 rounded bg-white px-0.5 border border-rose-100">
                      <button 
                        type="button"
                        onClick={() => updateCartQty(item.product.id, item.selectedShade, -1)}
                        className="p-1 hover:text-rose-600 text-gray-400 transition"
                      >
                        <Minus className="w-2.5 h-2.5" />
                      </button>
                      <span className="text-[10px] font-bold text-gray-850 w-4 text-center font-mono">
                        {item.quantity}
                      </span>
                      <button 
                        type="button"
                        onClick={() => updateCartQty(item.product.id, item.selectedShade, 1)}
                        className="p-1 hover:text-rose-600 text-gray-400 transition"
                      >
                        <Plus className="w-2.5 h-2.5" />
                      </button>
                    </div>

                    <button 
                      type="button"
                      onClick={() => removeFromCart(item.product.id, item.selectedShade)}
                      className="p-1 text-gray-300 hover:text-red-500 transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Customer Information detail inputs */}
        <div className="p-4 border-t border-rose-100 bg-gray-50/50 space-y-3 shrink-0 text-gray-700">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[9px] font-bold text-gray-500 uppercase tracking-wider mb-1">Customer Name</label>
              <div className="relative">
                <User className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                <input 
                  type="text" 
                  placeholder="e.g. Sandra" 
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full pl-8 pr-2 py-1 bg-white text-xs border border-rose-100 rounded focus:outline-hidden focus:border-rose-450"
                />
              </div>
            </div>
            <div>
              <label className="block text-[9px] font-bold text-gray-500 uppercase tracking-wider mb-1">Mobile Contact</label>
              <div className="relative">
                <Smartphone className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                <input 
                  type="text" 
                  placeholder="077xxxxxx" 
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="w-full pl-8 pr-2 py-1 bg-white text-xs border border-rose-100 rounded focus:outline-hidden focus:border-rose-450 font-mono"
                />
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-2 pt-1">
            <div>
              <label className="block text-[9px] font-bold text-gray-500 uppercase tracking-wider mb-1">Cash Discount (UGX)</label>
              <div className="relative">
                <Tags className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-rose-400" />
                <input 
                  type="number" 
                  placeholder="0" 
                  value={discountAmount || ''}
                  onChange={(e) => setDiscountAmount(Number(e.target.value))}
                  className="w-full pl-8 pr-2 py-1 bg-white text-xs border border-rose-100 rounded focus:outline-hidden focus:border-rose-450 font-mono"
                  min="0"
                  max={cartSubtotal}
                />
              </div>
            </div>
            <div>
              <label className="block text-[9px] font-bold text-gray-500 uppercase tracking-wider mb-1">Payment Channel</label>
              <select 
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as Sale['paymentMethod'])}
                className="w-full px-2 py-1 bg-white text-xs border border-rose-150 rounded focus:outline-hidden bg-white font-bold text-rose-955"
              >
                <option value="Cash">💵 Cash Money</option>
                <option value="MTN Mobile Money">📱 MTN Mobile Money</option>
                <option value="Airtel Money">📱 Airtel Pay Uganda</option>
                <option value="Card">💳 Credit Card POS</option>
                <option value="Credit">⚠️ Term Credit (Debts)</option>
              </select>
            </div>
          </div>

          {paymentMethod === 'Credit' && (
            <div className="pt-2 border-t border-rose-100/50">
              <label className="block text-[9px] font-bold text-gray-500 uppercase tracking-widest mb-1 font-mono">Immediate Deposit Received (UGX)</label>
              <input 
                type="number" 
                placeholder="Paid today Shs (remainder logged as Debt)" 
                value={paidAmount || ''}
                onChange={(e) => setPaidAmount(Math.min(cartTotal, Number(e.target.value)))}
                className="w-full px-2.5 py-1 text-xs border border-rose-100 rounded bg-white text-gray-800 font-mono font-bold"
                min="0"
                max={cartTotal}
              />
              <span className="text-[9px] text-amber-600 block mt-1 font-sans leading-tight">
                An outstanding of {formatUGX(balanceDue)} Shs will be recorded immediately into Client Debt ledger.
              </span>
            </div>
          )}
        </div>

        {/* Pricing Summary */}
        <div className="p-4 border-t border-rose-100 space-y-2 shrink-0 bg-rose-50/10">
          <div className="flex justify-between text-xs text-gray-500">
            <span>Subtotal before promo</span>
            <span className="font-mono">{formatUGX(cartSubtotal)}</span>
          </div>
          {discountAmount > 0 && (
            <div className="flex justify-between text-xs text-rose-600 font-semibold">
              <span>Promo discount</span>
              <span className="font-mono">-{formatUGX(discountAmount)}</span>
            </div>
          )}
          
          <div className="flex justify-between items-end border-t border-rose-50 pt-2">
            <span className="text-xs font-bold text-rose-950">Grand Net Total</span>
            <span className="font-space font-bold text-lg text-rose-750 font-mono">{formatUGX(cartTotal)}</span>
          </div>

          <button
            type="submit"
            disabled={cart.length === 0}
            className={`w-full py-2.5 mt-2 rounded-xl text-xs font-bold shadow-sm flex items-center justify-center gap-1.5 transition duration-150 ${
              cart.length === 0 
                ? 'bg-zinc-100 text-zinc-400 cursor-not-allowed border border-zinc-200' 
                : 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-200 hover:scale-[1.01] active:scale-95'
            }`}
          >
            <Sparkles className="w-4 h-4" /> CONCLUDE checkout receipt
          </button>
        </div>
      </form>

      {/* MTN / AIRTEL INTERACTIVE USSD PUSH TRANSACTION SIMULATOR */}
      <AnimatePresence>
        {showMomoModal && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-zinc-900 border border-zinc-800 text-white rounded-2xl p-6 max-w-md w-full relative flex flex-col md:flex-row gap-6"
            >
              <button 
                onClick={() => setShowMomoModal(false)}
                className="absolute top-4 right-4 text-zinc-450 hover:text-white transition z-10"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Momo push setup options */}
              <div className="flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`p-1.5 rounded text-white text-xs font-bold ${momoNetwork === 'Airtel Money' ? 'bg-red-650' : 'bg-yellow-500 text-black'}`}>
                      {momoNetwork === 'Airtel Money' ? 'Airtel' : 'MTN'}
                    </span>
                    <h3 className="font-bold text-sm tracking-tight text-white uppercase">Mobile Money Payment API Pro</h3>
                  </div>
                  
                  <p className="text-[11px] text-zinc-400 mb-4">
                    Authorized live integration gateway API to receive client payments on central cash registers instantly.
                  </p>

                  <div className="space-y-3">
                    <div>
                      <span className="block text-[8px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Endpoint Gateway Status</span>
                      <div className="flex items-center gap-2 text-xs font-mono font-bold text-emerald-400">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></span>
                        LIVE SECURE TUNNEL
                      </div>
                    </div>

                    <div>
                      <span className="block text-[8px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Grand Bill total</span>
                      <span className="text-sm font-semibold font-mono text-zinc-100">{formatUGX(cartTotal)} Shs</span>
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-zinc-800 space-y-3">
                  {momoStep === 'digits' && (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-[9px] font-bold text-zinc-400 uppercase tracking-widest mb-1">Uganda Subscriber Number</label>
                        <input
                          type="text"
                          value={momoTargetPhone}
                          onChange={(e) => setMomoTargetPhone(e.target.value)}
                          className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 text-white rounded font-mono text-xs focus:outline-hidden focus:border-rose-500 font-bold"
                          placeholder="e.g. 0772456789"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={startMomoPushPrompt}
                        className={`w-full py-2.5 font-bold text-xs rounded-lg transition ${
                          momoNetwork === 'Airtel Money' 
                            ? 'bg-red-600 hover:bg-red-700 text-white' 
                            : 'bg-yellow-500 hover:bg-yellow-600 text-black'
                        }`}
                      >
                        🚀 Push USSD Prompt request
                      </button>
                    </div>
                  )}

                  {momoStep === 'sending' && (
                    <div className="text-center py-4 space-y-3">
                      <div className="w-8 h-8 rounded-full border-2 border-rose-500 border-t-transparent animate-spin mx-auto"></div>
                      <p className="text-xs font-mono text-rose-350">Pushing USSD payment code payload over cellular networks to {momoTargetPhone}...</p>
                    </div>
                  )}

                  {momoStep === 'pin-input' && (
                    <div className="bg-zinc-950 p-3 rounded-lg border border-zinc-850 text-center">
                      <p className="text-xs text-zinc-300 font-mono font-bold animate-bounce text-emerald-400">⚡ Prompt loaded on subscriber mobile screen!</p>
                      <p className="text-[10px] text-zinc-500 mt-1">Please look at the simulated cell phone on the right to input payment authorization PIN.</p>
                    </div>
                  )}

                  {momoStep === 'authorized' && (
                    <div className="text-center py-4 text-emerald-400 space-y-1.5 bg-emerald-900/15 border border-emerald-900/30 p-3 rounded-lg">
                      <ShieldCheck className="w-8 h-8 mx-auto" />
                      <p className="text-xs font-bold font-mono text-emerald-400">SUBSCRIBER PAID TRANSACTION SLIP VERIFIED!</p>
                      <p className="text-[10px] text-emerald-500 font-mono">Receipt code EB-MOMO-{Date.now().toString().slice(-6)} ok</p>
                    </div>
                  )}
                </div>
              </div>

              {/* RIGHT CELL PHONE ARTWORK INTERACTIVE MOCK */}
              <div className="w-54 h-84 rounded-3xl bg-zinc-950 border-4 border-zinc-700 p-3 flex flex-col relative shrink-0 shadow-xl overflow-hidden font-sans">
                
                {/* Speaker pill */}
                <div className="absolute top-1 left-1/2 -translate-x-1/2 w-12 h-2.5 rounded-full bg-zinc-800"></div>

                {/* Simulated Screen */}
                <div className="flex-1 bg-zinc-900 rounded-2xl p-2.5 flex flex-col justify-between text-zinc-200">
                  
                  {/* Status Bar */}
                  <div className="flex justify-between items-center text-[8px] text-zinc-500 font-mono uppercase pb-1.5 border-b border-zinc-800">
                    <span className="flex items-center gap-0.5">
                      <Wifi className="w-2.5 h-2.5 text-zinc-500" />
                      {momoNetwork === 'Airtel Money' ? 'Airtel UG' : 'MTN UG'}
                    </span>
                    <span>12:28 PM</span>
                  </div>

                  {/* Incoming USSD verification prompt dialogue */}
                  <div className="flex-grow flex items-center justify-center py-3">
                    {momoStep === 'digits' && (
                      <div className="text-center text-[10px] text-zinc-500">
                        <SmartphoneCharging className="w-6 h-6 text-zinc-650 mx-auto mb-2" />
                        Awaiting network push trigger...
                      </div>
                    )}

                    {momoStep === 'sending' && (
                      <div className="text-center text-[10px] text-zinc-400">
                        <div className="w-4 h-4 border border-rose-500 border-t-transparent animate-spin mx-auto mb-2 rounded-full"></div>
                        Establishing cell tunnel...
                      </div>
                    )}

                    {momoStep === 'pin-input' && (
                      <div className="bg-zinc-800 border border-zinc-700 p-2.5 rounded-lg text-left text-[10px] space-y-2 select-none">
                        <div className="font-bold text-zinc-100 flex items-center gap-1">
                          <Lock className="w-3 h-3 text-yellow-400 shrink-0" />
                          <span>USSD authorization</span>
                        </div>
                        <p className="text-[9px] text-zinc-300 leading-tight">
                          Pay Elite Beauty store <span className="font-bold text-yellow-350">{formatUGX(cartTotal)}</span>. Enter your subscriber Mobile PIN:
                        </p>
                        
                        <input
                          type="password"
                          maxLength={4}
                          placeholder="••••"
                          value={momoPinCode}
                          onChange={(e) => setMomoPinCode(e.target.value)}
                          className="w-full text-center tracking-widest text-xs bg-zinc-950 border border-zinc-700 rounded text-yellow-400 font-mono py-1.5 focus:outline-hidden"
                        />
                        
                        <button
                          type="button"
                          onClick={authorizeMomoPayment}
                          disabled={momoPinCode.length < 4}
                          className={`w-full py-1 rounded text-[9px] font-bold text-center ${
                            momoPinCode.length < 4
                              ? 'bg-zinc-750 text-zinc-500 cursor-not-allowed'
                              : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                          }`}
                        >
                          Confirm PIN Authorization
                        </button>
                      </div>
                    )}

                    {momoStep === 'authorized' && (
                      <div className="text-center space-y-2.5 text-emerald-400">
                        <ShieldCheck className="w-7 h-7 mx-auto animate-bounce text-emerald-400" />
                        <div className="text-[10px] text-zinc-250 leading-tight">
                          <span className="block font-bold font-mono text-emerald-400">PAYMENT SENT!</span>
                          <span className="text-[8px] text-zinc-500">Trans ID: MOMO-{Date.now().toString().slice(-4)}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Cellular brand signoff footer */}
                  <div className="text-center text-[7px] text-zinc-650 tracking-widest font-mono">
                    SECURED BY {momoNetwork === 'Airtel Money' ? 'AIRTEL PAY' : 'MTN MOMO API'}
                  </div>

                </div>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* RETAIL THERMAL INVOICE MODAL POPUP */}
      <AnimatePresence>
        {showReceipt && generatedSale && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-zinc-800 shadow-2xl rounded-2xl max-w-sm w-full p-6 relative flex flex-col max-h-[90vh]"
            >
              <button 
                onClick={() => {
                  setShowReceipt(false);
                  clearPosState();
                }}
                className="absolute top-4 right-4 text-zinc-400 hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex-1 overflow-y-auto bg-white text-zinc-800 p-5 rounded-lg font-mono text-[10px] border border-zinc-200">
                
                <div className="text-center font-sans tracking-tight space-y-1">
                  <h3 className="font-bold text-rose-700 text-sm font-display leading-tight">ELITE BEAUTY LTD</h3>
                  <p className="text-[9px] text-zinc-500 font-sans font-medium uppercase tracking-wider">Cosmetics & Skin Health</p>
                  <p className="text-[8px] text-zinc-400 font-sans">Kampala Road Arcades HQ Room 68 • Kampala, UG</p>
                  <p className="text-[8px] text-zinc-400 font-sans">Tel: +256 772 456789</p>
                  <p className="text-[8px] text-zinc-400 font-mono">IG: @elite_beauty256</p>
                </div>

                <div className="border-t border-dashed border-zinc-300 my-3"></div>

                <div className="space-y-0.5 text-[9px] text-zinc-600">
                  <div className="flex justify-between">
                    <span>Invoice Serial:</span>
                    <span className="font-bold text-zinc-800">{generatedSale.invoiceNumber}</span>
                  </div>
                  {generatedSale.verificationCode && (
                    <div className="flex justify-between text-rose-650 font-extrabold uppercase font-mono bg-rose-50 px-1 rounded border border-rose-100/40">
                      <span>Verification Code:</span>
                      <span>{generatedSale.verificationCode}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span>Timestamp:</span>
                    <span>{new Date(generatedSale.date).toLocaleString()}</span>
                  </div>
                  {generatedSale.customerName && (
                    <div className="flex justify-between">
                      <span>Customer client:</span>
                      <span>{generatedSale.customerName}</span>
                    </div>
                  )}
                  {generatedSale.customerPhone && (
                    <div className="flex justify-between">
                      <span>Subscriber phone:</span>
                      <span>{generatedSale.customerPhone}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span>Register agent:</span>
                    <span>Judith O.</span>
                  </div>
                </div>

                <div className="border-t border-dashed border-zinc-300 my-3"></div>

                <div className="space-y-2">
                  <div className="grid grid-cols-12 font-bold text-[9px] border-b border-zinc-100 pb-1 text-zinc-800">
                    <span className="col-span-7">ITEM</span>
                    <span className="col-span-2 text-center">QTY</span>
                    <span className="col-span-3 text-right">TOTAL</span>
                  </div>

                  {generatedSale.items.map((item, idx) => {
                    const matchingProduct = products.find(p => p.id === item.productId);
                    return (
                      <div key={idx} className="grid grid-cols-12 text-[9px] items-start text-zinc-700 py-1 border-b border-zinc-100/40">
                        <div className="col-span-7 leading-tight flex flex-col">
                          <span className="font-sans font-medium text-zinc-800">{item.productName}</span>
                          {item.verificationCode && (
                            <span className="text-[7.5px] text-gray-550 font-bold font-mono">CODE: {item.verificationCode}</span>
                          )}
                          {matchingProduct && (
                            <span className="text-[7.5px] text-emerald-800 font-extrabold mt-0.5 uppercase tracking-wide">
                              Remaining Stock: {matchingProduct.quantity} units {matchingProduct.locationStocks && `(${matchingProduct.locationStocks[generatedSale.location || 'kampala'] ?? 0} in ${(generatedSale.location || 'kampala').toUpperCase()})`}
                            </span>
                          )}
                        </div>
                        <span className="col-span-2 text-center">{item.quantity}</span>
                        <span className="col-span-3 text-right">{item.subtotal.toLocaleString('en-UG')}</span>
                      </div>
                    );
                  })}
                </div>

                <div className="border-t border-dashed border-zinc-300 my-3"></div>

                <div className="space-y-0.5 text-right text-[10px] text-zinc-700">
                  <div className="flex justify-between">
                    <span>Catalog subtotal:</span>
                    <span>{(generatedSale.totalAmount + generatedSale.discount).toLocaleString('en-UG')} Shs</span>
                  </div>
                  {generatedSale.discount > 0 && (
                    <div className="flex justify-between text-rose-600 font-semibold">
                      <span>Promo Discount:</span>
                      <span>-{generatedSale.discount.toLocaleString('en-UG')} Shs</span>
                    </div>
                  )}
                  <div className="flex justify-between font-extrabold text-xs border-t border-zinc-100 pt-1 text-zinc-900">
                    <span>GRAND PAID DUE:</span>
                    <span>{generatedSale.totalAmount.toLocaleString('en-UG')} Shs</span>
                  </div>
                  
                  <div className="flex justify-between text-zinc-500 text-[9px] pt-1">
                    <span>Payment Channel:</span>
                    <span>{generatedSale.paymentMethod}</span>
                  </div>
                  <div className="flex justify-between text-[9px]">
                    <span>Immediate Received:</span>
                    <span>{generatedSale.paidAmount.toLocaleString('en-UG')} Shs</span>
                  </div>
                  {generatedSale.balanceDue > 0 && (
                    <div className="flex justify-between text-red-600 font-bold text-[9px] border-t border-rose-50/50 pt-0.5">
                      <span>CLIENT UNPAID DEBT:</span>
                      <span>{generatedSale.balanceDue.toLocaleString('en-UG')} Shs</span>
                    </div>
                  )}
                </div>

                <div className="border-t border-dashed border-zinc-300 my-3"></div>

                <div className="text-center space-y-1">
                  <div className="text-[11px] font-bold text-gray-800 tracking-wider">
                     ✶ ELITE KAMPALA APPROVED ✶
                  </div>
                  <p className="text-[8px] text-zinc-400">Thank you for choosing luxury beauty!</p>
                  <p className="text-[8.5px] text-rose-650 italic font-sans font-medium">Glow in confidence, glow in Elite!</p>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => alert('Printer simulated connection: Printing thermal receipt invoice...')}
                  className="w-full py-2 bg-zinc-700 hover:bg-zinc-600 text-white rounded-lg transition font-sans font-medium text-xs flex items-center justify-center gap-1.5"
                >
                  <Printer className="w-4 h-4" /> Print Receipt
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowReceipt(false);
                    clearPosState();
                  }}
                  className="w-full py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg transition font-sans font-bold text-xs flex items-center justify-center gap-1.5"
                >
                  <CircleCheck className="w-4 h-4" /> New Order
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
