import React, { useState } from 'react';
import { 
  signOut, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword 
} from 'firebase/auth';
import { auth, isFirebaseAvailable } from '../lib/firebase';
import { motion, AnimatePresence } from 'motion/react';
import { LogIn, Mail, Lock, ArrowRight, Loader2 } from 'lucide-react';
// @ts-ignore
import eliteBeautyBadge from '../assets/images/elite_beauty_badge_1781372578945.jpg';

const ADMIN_EMAILS = [
  'islamnakibinge@gmail.com',
  'sonyaesther8@gmail.com',
  'sonyaesther8@gmaoil.com',
  'judithoyoo64@gmail.com',
  'nakibingei@gmail.com',
  'admin@elitebeauty.com',
  'manager@elitebeauty.com',
  'sonya@elitebeauty.com',
  'judith@elitebeauty.com'
].map(e => e.toLowerCase());

const getRoleForEmail = (email: string | null | undefined): string => {
  if (!email) return 'Sales Cashier';
  return ADMIN_EMAILS.includes(email.toLowerCase()) ? 'Owner / Manager' : 'Sales Cashier';
};

type AuthMode = 'login' | 'register';

export default function Auth({ onAuthSuccess }: { onAuthSuccess: (user: any) => void }) {
  const [mode, setMode] = useState<AuthMode>('login');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form states with Judith Oyoo as the default convenient value
  const [email, setEmail] = useState(() => localStorage.getItem('saved_email') || 'judithoyoo64@gmail.com');
  const [password, setPassword] = useState(() => localStorage.getItem('saved_password') || 'elitebeauty2026');
  const [confirmPassword, setConfirmPassword] = useState('elitebeauty2026');

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Client-side validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError("Please enter a valid email address.");
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      setLoading(false);
      return;
    }

    if (mode === 'register' && password !== confirmPassword) {
      setError("Passwords do not match.");
      setLoading(false);
      return;
    }

    try {
      // 1. Prepare offline session data for immediate accessibility
      const normalizedEmail = email.trim().toLowerCase();
      const displayName = normalizedEmail.split('@')[0];
      const role = getRoleForEmail(normalizedEmail);
      const session = { email: normalizedEmail, displayName, role };

      // 2. Attempt Real Cloud Auth if available (The "Sync Engine")
      if (isFirebaseAvailable && auth) {
        try {
          console.log("Attempting Cloud Sync login for:", normalizedEmail);
          // Try to sign in. If it fails, they might need an account or the password is wrong.
          await signInWithEmailAndPassword(auth, normalizedEmail, password);
          console.log("Cloud Sync connection established.");
          
          // Store credentials for auto-reconnection in diagnostics
          localStorage.setItem('saved_email', normalizedEmail);
          localStorage.setItem('saved_password', password);
        } catch (authErr: any) {
          // If user doesn't exist, register them seamlessly to satisfy "no-stress" requirement
          if (authErr.code === 'auth/user-not-found' || authErr.code === 'auth/invalid-credential' || authErr.code === 'auth/wrong-password') {
            try {
              console.log("Sync account issue, attempting automatic sync-provisioning...");
              // We'll try to create the account if it doesn't exist. 
              await createUserWithEmailAndPassword(auth, normalizedEmail, password);
              console.log("Cloud Sync account provisioned.");
              
              localStorage.setItem('saved_email', normalizedEmail);
              localStorage.setItem('saved_password', password);
            } catch (regErr: any) {
              if (regErr.code === 'auth/email-already-in-use') {
                 console.warn("Cloud account exists but password mismatch. Sync will be restricted.");
                 // Still allow local login, but sync will be off.
              } else {
                 console.warn("Cloud registration failed:", regErr.message);
              }
            }
          } else {
            console.warn("Cloud sync authentication failed, using local fallback:", authErr.message);
          }
        }
      }

      // 3. Persist locally for "No-Stress" persistence
      localStorage.setItem('saved_email', normalizedEmail);
      localStorage.setItem('saved_password', password);
      localStorage.setItem('local_mock_session', JSON.stringify(session));
      
      onAuthSuccess(session);
    } catch (err: any) {
      console.error("Auth process error:", err);
      setError(err.message || "Authentication failed. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-4 sm:p-6 font-sans relative overflow-hidden">
      {/* Soft Elegant Background Glows */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 opacity-10 pointer-events-none">
        <div className="absolute top-[-20%] left-[-20%] w-[50%] h-[50%] bg-gold-600/30 blur-[150px] rounded-full"></div>
        <div className="absolute bottom-[-20%] right-[-20%] w-[50%] h-[50%] bg-zinc-600/30 blur-[150px] rounded-full"></div>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6 relative overflow-hidden"
      >
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="w-20 h-20 mx-auto rounded-2xl overflow-hidden border border-zinc-800 bg-black flex items-center justify-center shadow-lg">
            <img 
              src={eliteBeautyBadge} 
              alt="Elite Beauty Logo" 
              className="w-full h-full object-contain p-2"
              referrerPolicy="no-referrer"
            />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Elite Beauty
            </h1>
            <p className="text-zinc-500 text-[10px] uppercase tracking-widest font-bold mt-0.5">
              Offline-First Stock Terminal
            </p>
          </div>
        </div>

        {/* Tab Selection */}
        <div className="flex bg-zinc-950 p-1 rounded-xl border border-zinc-800">
          <button
            type="button"
            onClick={() => { setMode('login'); setError(null); }}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${mode === 'login' ? 'bg-zinc-800 text-gold-400 font-bold shadow-sm' : 'text-zinc-400 hover:text-zinc-200'}`}
          >
            Login
          </button>
          <button
            type="button"
            onClick={() => { setMode('register'); setError(null); }}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${mode === 'register' ? 'bg-zinc-800 text-gold-400 font-bold shadow-sm' : 'text-zinc-400 hover:text-zinc-200'}`}
          >
            Register
          </button>
        </div>

        {/* Auth form */}
        <form onSubmit={handleEmailAuth} className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-1">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <input
                required
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="staff@elitebeauty.ug"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white focus:ring-1 focus:ring-gold-500 focus:border-gold-500 focus:outline-none transition-all placeholder:text-zinc-700"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-1">Password</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <input
                required
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white focus:ring-1 focus:ring-gold-500 focus:border-gold-500 focus:outline-none transition-all placeholder:text-zinc-700"
              />
            </div>
          </div>

          <AnimatePresence mode="wait">
            {mode === 'register' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-1">Confirm Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                    <input
                      required={mode === 'register'}
                      type="password"
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white focus:ring-1 focus:ring-gold-500 focus:border-gold-500 focus:outline-none transition-all placeholder:text-zinc-700"
                    />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {error && (
            <motion.p 
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-[11px] text-red-400 bg-red-950/30 border border-red-500/20 p-2.5 rounded-xl font-medium leading-relaxed text-center"
            >
              {error}
            </motion.p>
          )}

          <button
            disabled={loading}
            type="submit"
            className="w-full py-3 bg-gold-600 hover:bg-gold-500 disabled:bg-zinc-800 text-gold-950 font-bold text-xs uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-2 active:scale-[0.98] shadow-lg shadow-gold-600/10 mt-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : (
              <>
                {mode === 'login' ? 'Access Terminal' : 'Register Account'}
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="pt-1 text-center text-[9px] text-zinc-500 flex items-center justify-center gap-1.5 uppercase tracking-widest">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>Offline Terminal Mode Active</span>
        </div>
      </motion.div>
    </div>
  );
}

export function LogoutButton() {
  const handleLogout = async () => {
    try {
      if (isFirebaseAvailable && auth) {
        await signOut(auth);
      }
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <button
      onClick={handleLogout}
      className="text-xs text-zinc-500 hover:text-white transition-colors flex items-center gap-2 font-bold uppercase tracking-widest"
    >
      <LogIn className="w-3 h-3 rotate-180" />
      Sign Out
    </button>
  );
}
