import React, { useState } from 'react';
import { 
  signOut, 
  signInWithPopup,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword
} from 'firebase/auth';
import { auth, googleProvider, db } from '../lib/firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { LogIn, Sparkles, Mail, Lock, User, ArrowRight, Loader2 } from 'lucide-react';
// @ts-ignore
import eliteBeautyBadge from '../assets/images/elite_beauty_badge_1781372578945.jpg';

type AuthMode = 'login' | 'register';

export default function Auth({ onAuthSuccess }: { onAuthSuccess: (user: any) => void }) {
  const [mode, setMode] = useState<AuthMode>('login');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');

  const handleGoogleLogin = async () => {
    if (!googleProvider || typeof signInWithPopup !== 'function') {
      setError("Google Login is currently unavailable. Please use email/password.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      
      // Only attempt Firestore sync if db is valid
      const isFirebaseAvailable = typeof db.type === 'string' || (db.app && db.type === 'firestore');
      
      if (isFirebaseAvailable) {
        try {
          const userRef = doc(db, 'users', user.email!);
          const userDoc = await getDoc(userRef);
          
          if (!userDoc.exists()) {
            await setDoc(userRef, {
              userId: user.email,
              fullName: user.displayName || user.email?.split('@')[0],
              email: user.email,
              role: 'Sales Cashier',
              createdAt: serverTimestamp()
            });
          }
        } catch (dbErr) {
          console.warn("Firestore user sync failed, continuing with local session.");
        }
      }

      onAuthSuccess({
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL
      });
    } catch (error: any) {
      console.error("Google Auth Error:", error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

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

    if (mode === 'register' && !fullName.trim()) {
      setError("Please enter your full name.");
      setLoading(false);
      return;
    }

    if (mode === 'register' && password !== confirmPassword) {
      setError("Passwords do not match.");
      setLoading(false);
      return;
    }

    try {
      // Force local mode for email auth to bypass Firebase
      const isFirebaseAvailable = false; // Bypass Firebase completely for email auth

      if (!isFirebaseAvailable) {
        // Local simulation for offline/dev preview without backend
        if (mode === 'register') {
          localStorage.setItem('local_mock_user', JSON.stringify({ email, password, fullName }));
        } else {
          const stored = localStorage.getItem('local_mock_user');
          const user = stored ? JSON.parse(stored) : null;
          if (!user || user.email !== email || user.password !== password) {
            throw new Error("Invalid email or password");
          }
        }
        onAuthSuccess({ email, displayName: fullName || "Mock User" });
      } else {
        let user;
        if (mode === 'register') {
          const userCredential = await createUserWithEmailAndPassword(auth, email, password);
          user = userCredential.user;
          
          // Try to sync to firestore
          try {
            const userRef = doc(db, 'users', user.email!);
            await setDoc(userRef, {
              userId: user.email,
              fullName: fullName || user.email?.split('@')[0],
              email: user.email,
              role: 'Sales Cashier',
              createdAt: serverTimestamp()
            });
          } catch (e) {
            console.warn("Firestore user sync failed, continuing", e);
          }
        } else {
          const userCredential = await signInWithEmailAndPassword(auth, email, password);
          user = userCredential.user;
        }

        onAuthSuccess({
          email: user.email,
          displayName: user.displayName || fullName || user.email?.split('@')[0],
          photoURL: user.photoURL
        });
      }
    } catch (error: any) {
      if (error.code === 'auth/unauthorized-domain') {
        setError("Domain not authorized in Firebase. Please add this URL to Firebase Console > Authentication > Settings > Authorized domains.");
      } else {
        setError(error.message || "Authentication failed");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-4 sm:p-6 font-sans overflow-hidden relative">
      {/* Decorative Background Elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 opacity-20 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-gold-600/20 blur-[120px] rounded-full"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-royal-600/20 blur-[120px] rounded-full"></div>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-3xl p-6 sm:p-10 shadow-2xl space-y-8 relative overflow-hidden backdrop-blur-sm"
      >
        <div className="text-center space-y-4">
          <motion.div 
            whileHover={{ scale: 1.05 }}
            className="w-24 h-24 sm:w-28 sm:h-28 mx-auto rounded-3xl overflow-hidden border border-gold-500/30 shadow-xl bg-black flex items-center justify-center"
          >
            <img 
              src={eliteBeautyBadge} 
              alt="Elite Beauty" 
              className="w-full h-full object-contain p-2"
              referrerPolicy="no-referrer"
            />
          </motion.div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-display font-bold text-white tracking-tight">
              Elite Beauty
            </h1>
            <p className="text-zinc-500 text-xs sm:text-sm mt-1 uppercase tracking-widest font-bold">
              Terminal System v2
            </p>
          </div>
        </div>

        <div className="flex bg-zinc-800/50 p-1 rounded-xl">
          <button
            onClick={() => { setMode('login'); setError(null); }}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${mode === 'login' ? 'bg-zinc-700 text-gold-400 shadow-lg' : 'text-zinc-400 hover:text-zinc-200'}`}
          >
            Login
          </button>
          <button
            onClick={() => { setMode('register'); setError(null); }}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${mode === 'register' ? 'bg-zinc-700 text-gold-400 shadow-lg' : 'text-zinc-400 hover:text-zinc-200'}`}
          >
            Register
          </button>
        </div>

        <form onSubmit={handleEmailAuth} className="space-y-4">
          <AnimatePresence mode="wait">
            {mode === 'register' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-4 overflow-hidden"
              >
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Full Name</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
                    <input
                      required
                      type="text"
                      value={fullName}
                      onChange={e => setFullName(e.target.value)}
                      placeholder="e.g. Judith Oyoo"
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 pl-10 pr-4 text-sm text-white focus:ring-2 focus:ring-gold-500/50 focus:border-gold-500/50 focus:outline-none transition-all placeholder:text-zinc-700"
                    />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
              <input
                required
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="staff@elitebeauty.ug"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 pl-10 pr-4 text-sm text-white focus:ring-2 focus:ring-gold-500/50 focus:border-gold-500/50 focus:outline-none transition-all placeholder:text-zinc-700"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
              <input
                required
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 pl-10 pr-4 text-sm text-white focus:ring-2 focus:ring-gold-500/50 focus:border-gold-500/50 focus:outline-none transition-all placeholder:text-zinc-700"
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
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Confirm Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
                    <input
                      required={mode === 'register'}
                      type="password"
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 pl-10 pr-4 text-sm text-white focus:ring-2 focus:ring-gold-500/50 focus:border-gold-500/50 focus:outline-none transition-all placeholder:text-zinc-700"
                    />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {error && (
            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-[10px] text-red-500 bg-red-500/10 border border-red-500/20 p-2 rounded-lg font-bold"
            >
              {error}
            </motion.p>
          )}

          <button
            disabled={loading}
            type="submit"
            className="w-full py-4 bg-gold-600 hover:bg-gold-500 disabled:bg-zinc-800 text-gold-950 font-black text-xs uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-2 active:scale-[0.98] mt-2 shadow-xl shadow-gold-600/20"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
              <>
                {mode === 'login' ? 'Access System' : 'Create Account'}
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-zinc-800"></span>
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-zinc-900 px-2 text-zinc-600 font-bold tracking-widest">or</span>
          </div>
        </div>

        <button
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full py-3.5 px-4 bg-zinc-800/50 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-3 active:scale-[0.98]"
        >
          <img src="https://www.google.com/favicon.ico" className="w-4 h-4 grayscale opacity-70" alt="" />
          Continue with Google
        </button>

        <div className="text-center space-y-4">
          <p className="text-[10px] text-zinc-600 uppercase tracking-widest font-black">
            Authorized Personnel Only
          </p>

          <div className="pt-2 flex items-center justify-center gap-2 text-zinc-500 text-[10px] uppercase tracking-tighter">
            <Sparkles className="w-3 h-3 text-gold-500 animate-pulse" />
            <span>Secure Terminal: Kampala Main HQ</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export function LogoutButton() {
  const handleLogout = async () => {
    try {
      if (typeof auth.signOut === 'function') {
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
