import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Activity, 
  Wifi, 
  WifiOff, 
  Database, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  ChevronUp, 
  ChevronDown, 
  Terminal,
  ShieldCheck,
  Package,
  ShoppingCart,
  Users,
  Wallet
} from 'lucide-react';

interface DiagnosticProps {
  isFirebaseAvailable: boolean;
  isOnlineSyncEnabled: boolean;
  userEmail: string | null;
  lastSyncTime: Date | null;
  counts: {
    products: number;
    sales: number;
    customers: number;
    expenses: number;
  };
}

export default function SyncDiagnostics({ 
  isFirebaseAvailable, 
  isOnlineSyncEnabled, 
  userEmail, 
  lastSyncTime,
  counts 
}: DiagnosticProps) {
  const [isOpen, setIsOpen] = useState(false);

  const statusLabel = isOnlineSyncEnabled ? 'Cloud Synced' : 'Local Only';
  const statusColor = isOnlineSyncEnabled ? 'text-emerald-400' : 'text-amber-400';
  const ConnectionIcon = isOnlineSyncEnabled ? Wifi : WifiOff;

  return (
    <div className="fixed bottom-4 right-4 z-[100] font-sans">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="mb-3 w-80 bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden backdrop-blur-xl"
          >
            {/* Header */}
            <div className="bg-zinc-900/50 p-4 border-b border-zinc-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-gold-500" />
                <h3 className="text-xs font-bold text-white uppercase tracking-widest">Connection Diagnostics</h3>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="text-zinc-500 hover:text-white transition-colors"
              >
                <ChevronDown className="w-4 h-4" />
              </button>
            </div>

            {/* Content */}
            <div className="p-4 space-y-5">
              {/* Infrastructure State */}
              <div className="space-y-3">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-zinc-500 font-medium">GCP Infrastructure</span>
                  <div className="flex items-center gap-1.5 font-bold">
                    {isFirebaseAvailable ? (
                      <><ShieldCheck className="w-3.5 h-3.5 text-emerald-500" /> <span className="text-zinc-300">Ready</span></>
                    ) : (
                      <><XCircle className="w-3.5 h-3.5 text-red-500" /> <span className="text-red-400">Offline</span></>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-zinc-500 font-medium">Auto-Sync Pulse</span>
                  <div className={`flex items-center gap-1.5 font-bold ${statusColor}`}>
                    <ConnectionIcon className="w-3.5 h-3.5" />
                    <span>{statusLabel}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-zinc-500 font-medium">Authorized Agent</span>
                  <span className="text-zinc-300 font-mono truncate max-w-[120px]" title={userEmail || 'Unauthenticated'}>
                    {userEmail || 'Guest'}
                  </span>
                </div>
              </div>

              {/* Data Snapshot */}
              <div className="pt-4 border-t border-zinc-900">
                <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                  <Database className="w-3 h-3" />
                  Terminal Memory (Local Cache)
                </h4>
                
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-zinc-900/40 p-2.5 rounded-xl border border-zinc-800/50 flex flex-col gap-1">
                    <div className="flex items-center gap-1.5 text-zinc-500">
                      <Package className="w-3 h-3" />
                      <span className="text-[9px] font-bold uppercase tracking-wider">Products</span>
                    </div>
                    <span className="text-lg font-mono font-bold text-white tracking-tighter">{counts.products}</span>
                  </div>
                  
                  <div className="bg-zinc-900/40 p-2.5 rounded-xl border border-zinc-800/50 flex flex-col gap-1">
                    <div className="flex items-center gap-1.5 text-zinc-500">
                      <ShoppingCart className="w-3 h-3" />
                      <span className="text-[9px] font-bold uppercase tracking-wider">Sales</span>
                    </div>
                    <span className="text-lg font-mono font-bold text-white tracking-tighter">{counts.sales}</span>
                  </div>
                  
                  <div className="bg-zinc-900/40 p-2.5 rounded-xl border border-zinc-800/50 flex flex-col gap-1">
                    <div className="flex items-center gap-1.5 text-zinc-500">
                      <Users className="w-3 h-3" />
                      <span className="text-[9px] font-bold uppercase tracking-wider">Customers</span>
                    </div>
                    <span className="text-lg font-mono font-bold text-white tracking-tighter">{counts.customers}</span>
                  </div>
                  
                  <div className="bg-zinc-900/40 p-2.5 rounded-xl border border-zinc-800/50 flex flex-col gap-1">
                    <div className="flex items-center gap-1.5 text-zinc-500">
                      <Wallet className="w-3 h-3" />
                      <span className="text-[9px] font-bold uppercase tracking-wider">Expenses</span>
                    </div>
                    <span className="text-lg font-mono font-bold text-white tracking-tighter">{counts.expenses}</span>
                  </div>
                </div>
              </div>

              {/* Sync Metadata */}
              <div className="pt-2 flex items-center gap-2 text-[10px] text-zinc-600 font-medium">
                <Clock className="w-3 h-3" />
                <span>Last Terminal Update:</span>
                <span className="text-zinc-400">
                  {lastSyncTime ? lastSyncTime.toLocaleTimeString() : 'Never'}
                </span>
              </div>
            </div>

            {/* Quick Refresh Hint */}
            <div className="bg-royal-950/20 p-3 px-4 flex items-center justify-between border-t border-zinc-900">
              <span className="text-[9px] text-zinc-500 tracking-wide">Sync cycles occur automatically.</span>
              <div className="flex items-center gap-1">
                <CheckCircle2 className="w-2.5 h-2.5 text-emerald-500" />
                <span className="text-[9px] text-emerald-500 font-bold">ACTIVE</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Trigger Toggle */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-3.5 py-2.5 rounded-full border transition-all shadow-xl active:scale-95 ${
          isOpen 
            ? 'bg-zinc-900 border-zinc-700 text-white' 
            : 'bg-zinc-950 border-zinc-800 text-gold-500 hover:border-gold-500/30'
        }`}
      >
        <Activity className={`w-4 h-4 ${isOnlineSyncEnabled && !isOpen ? 'animate-pulse' : ''}`} />
        <span className="text-[10px] font-bold uppercase tracking-widest">
          {isOpen ? 'Close Diags' : 'Sync Diags'}
        </span>
        {isOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
      </button>
    </div>
  );
}
