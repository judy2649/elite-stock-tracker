import React, { useState } from 'react';
import { 
  signOut, 
  signInWithPopup,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail
} from 'firebase/auth';
import { auth, googleProvider, db, isFirebaseAvailable } from '../lib/firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { LogIn, Sparkles, Mail, Lock, User, ArrowRight, Loader2, KeyRound, WifiOff } from 'lucide-react';
// @ts-ignore
import eliteBeautyBadge from '../assets/images/elite_beauty_badge_1781372578945.jpg';

const ADMIN_EMAILS = [
  'islamnakibinge@gmail.com',
  'sonyaesther8@gmail.com',
  'judithoyoo64@gmail.com'
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
  
  // Password Reset States
  const [resetSent, setResetSent] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  // Form states
  const [email, setEmail] = useState(() => localStorage.getItem('saved_email') || '');
  const [password, setPassword] = useState(() => localStorage.getItem('saved_password') || '');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState(() => localStorage.getItem('saved_fullname') || '');


  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      
      if (!isFirebaseAvailable) {
        // Local simulation for Google Login
        const mockEmail = "testuser@gmail.com";
        const mockName = "Google Test User";
        
        const usersStored = localStorage.getItem('local_mock_users') || "{}";
        const users = JSON.parse(usersStored);
        if (!users[mockEmail]) {
          users[mockEmail] = { email: mockEmail, password: '', fullName: mockName };
          localStorage.setItem('local_mock_users', JSON.stringify(users));
        }
        
        localStorage.setItem('local_mock_session', JSON.stringify({ email: mockEmail, displayName: mockName }));
        onAuthSuccess({ email: mockEmail, displayName: mockName });
        return;
      }

      if (!googleProvider || typeof signInWithPopup !== 'function') {
        throw new Error("Google Login is currently unavailable. Please use email/password.");
      }

      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      
      try {
        const userRef = doc(db, 'users', user.email!);
        const userDoc = await getDoc(userRef);
        
        if (!userDoc.exists()) {
          await setDoc(userRef, {
            userId: user.email,
            fullName: user.displayName || user.email?.split('@')[0],
            email: user.email,
            role: getRoleForEmail(user.email),
            createdAt: serverTimestamp()
          });
        }
      } catch (dbErr) {
        console.warn("Firestore user sync failed, continuing with local session.");
      }

      onAuthSuccess({
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL
      });
    } catch (error: any) {
      if (error.code === 'auth/unauthorized-domain') {
        setError("Domain not authorized in Firebase. Please add this URL to Firebase Console > Authentication > Settings > Authorized domains. For now, try Email/Password.");
      } else {
        console.error("Google Auth Error:", error);
        setError(error.message || "Authentication failed");
      }
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
      localStorage.setItem('saved_email', email);
      localStorage.setItem('saved_password', password);
      if (fullName) {
        localStorage.setItem('saved_fullname', fullName);
      }

      if (!isFirebaseAvailable) {
        // Local simulation for offline/dev preview without backend
        const usersStored = localStorage.getItem('local_mock_users') || "{}";
        const users = JSON.parse(usersStored);
        const normalizedEmail = email.trim().toLowerCase();

        if (mode === 'register') {
          if (users[normalizedEmail]) {
            // User exists, try logging them in auto
            const existingUser = users[normalizedEmail];
            if (existingUser.password === password) {
              localStorage.setItem('local_mock_session', JSON.stringify({ email: existingUser.email, displayName: existingUser.fullName }));
              onAuthSuccess({ email: existingUser.email, displayName: existingUser.fullName || existingUser.email.split('@')[0] });
            } else {
              throw new Error("This email is already registered with a different password.");
            }
          } else {
            users[normalizedEmail] = { email: normalizedEmail, password, fullName };
            localStorage.setItem('local_mock_users', JSON.stringify(users));
            localStorage.setItem('local_mock_session', JSON.stringify({ email: normalizedEmail, displayName: fullName }));
            onAuthSuccess({ email: normalizedEmail, displayName: fullName || normalizedEmail.split('@')[0] });
          }
        } else {
          // Attempt case-insensitive or exact match
          const user = users[normalizedEmail] || users[email] || Object.values(users).find((u: any) => u.email.toLowerCase() === normalizedEmail);
          
          if (!user) {
            // User not found on local login, auto-register them
            users[normalizedEmail] = { email: normalizedEmail, password, fullName: email.split('@')[0] };
            localStorage.setItem('local_mock_users', JSON.stringify(users));
            localStorage.setItem('local_mock_session', JSON.stringify({ email: normalizedEmail, displayName: normalizedEmail.split('@')[0] }));
            onAuthSuccess({ email: normalizedEmail, displayName: normalizedEmail.split('@')[0] });
          } else if (user.password !== password) {
            throw new Error("Invalid password.");
          } else {
            localStorage.setItem('local_mock_session', JSON.stringify({ email: user.email, displayName: user.fullName }));
            onAuthSuccess({ email: user.email, displayName: user.fullName || user.email.split('@')[0] });
          }
        }
      } else {
        let user;
        if (mode === 'register') {
          try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            user = userCredential.user;
            
            // Try to sync to firestore
            try {
              const userRef = doc(db, 'users', user.email!);
              await setDoc(userRef, {
                userId: user.email,
                fullName: fullName || user.email?.split('@')[0],
                email: user.email,
                role: getRoleForEmail(user.email),
                createdAt: serverTimestamp()
              });
            } catch (e) {
              console.warn("Firestore user sync failed, continuing", e);
            }
          } catch (regErr: any) {
            // If email already in use, auto log them in with this password
            if (regErr.code === 'auth/email-already-in-use') {
              console.log("Email already in use, trying to log in instead...");
              const userCredential = await signInWithEmailAndPassword(auth, email, password);
              user = userCredential.user;
            } else {
              throw regErr;
            }
          }
        } else {
          try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            user = userCredential.user;
          } catch (loginErr: any) {
            // If user not found, auto-register them instead
            if (loginErr.code === 'auth/user-not-found' || loginErr.code === 'auth/invalid-credential' || loginErr.message?.includes('user-not-found')) {
              console.log("User not found, trying to register instead...");
              try {
                const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                user = userCredential.user;
                
                // Try to sync to firestore
                try {
                  const userRef = doc(db, 'users', user.email!);
                  await setDoc(userRef, {
                    userId: user.email,
                    fullName: fullName || user.email?.split('@')[0],
                    email: user.email,
                    role: getRoleForEmail(user.email),
                    createdAt: serverTimestamp()
                  });
                } catch (e) {
                  console.warn("Firestore user sync failed, continuing", e);
                }
              } catch (regErr) {
                // If register fails as well (meaning the email exists and it was just incorrect password), throw original login-err
                throw loginErr;
              }
            } else {
              throw loginErr;
            }
          }
        }

        onAuthSuccess({
          email: user.email,
          displayName: user.displayName || fullName || user.email?.split('@')[0],
          photoURL: user.photoURL
        });
      }
    } catch (error: any) {
      console.error("Auth Failure Detail:", error);
      let userFriendlyMessage = "";
      if (error.code === 'auth/invalid-credential' || error.message?.includes('invalid-credential')) {
        userFriendlyMessage = "Incorrect password or account details. If you forgot your password, enter your email and click 'Reset Password' below, or claim immediate Guest Mode access.";
      } else if (error.code === 'auth/email-already-in-use') {
        userFriendlyMessage = "This email is already in use. Please select 'Login' instead of 'Register' to access your account.";
      } else if (error.code === 'auth/weak-password') {
        userFriendlyMessage = "Password is too weak. It must be at least 6 characters long.";
      } else if (error.code === 'auth/invalid-email') {
        userFriendlyMessage = "The email format is invalid. Please double-check spelling.";
      } else if (error.code === 'auth/unauthorized-domain' || error.message?.includes('unauthorized-domain')) {
        userFriendlyMessage = "This domain is not yet authorized in Firebase Console > Authentication > Settings. Please add it, or log in instantly using Offline Escape button.";
      } else {
        userFriendlyMessage = error.message || "Authentication failed. Try again.";
      }
      setError(userFriendlyMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!email.trim()) {
      setError("Please type your email address first so we know where to send the reset instructions.");
      return;
    }
    setResetLoading(true);
    setError(null);
    setResetSent(false);
    try {
      if (isFirebaseAvailable && auth) {
        await sendPasswordResetEmail(auth, email.trim());
        setResetSent(true);
        setError(null);
      } else {
        setError("Firebase service is offline. Logging in via offline mode is recommended.");
      }
    } catch (err: any) {
      console.error("Reset Password Failed:", err);
      let resetMsg = "Failed to send reset email.";
      if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-email' || err.message?.includes('invalid-credential') || err.message?.includes('user-not-found')) {
        resetMsg = "We couldn't find any account matching this email. Please verify spelling or register a new account on the Register tab.";
      } else {
        resetMsg = err.message || resetMsg;
      }
      setError(resetMsg);
    } finally {
      setResetLoading(false);
    }
  };

  const handleOfflineBypass = () => {
    setError(null);
    const bypassEmail = email.trim().toLowerCase() || "judithoyoo64@gmail.com";
    const bypassName = fullName.trim() || bypassEmail.split('@')[0];
    localStorage.setItem('local_mock_session', JSON.stringify({ email: bypassEmail, displayName: bypassName }));
    onAuthSuccess({ email: bypassEmail, displayName: bypassName });
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
            <div className="flex justify-between items-center ml-1">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Password</label>
              {mode === 'login' && (
                <button
                  type="button"
                  onClick={handleResetPassword}
                  disabled={resetLoading}
                  className="text-[10px] text-gold-500 hover:text-gold-400 font-bold transition-all flex items-center gap-1"
                >
                  {resetLoading ? (
                    <Loader2 className="w-2.5 h-2.5 animate-spin" />
                  ) : (
                    <KeyRound className="w-2.5 h-2.5" />
                  )}
                  {resetSent ? "Reset Link Sent!" : "Forgot? Reset Password"}
                </button>
              )}
            </div>
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

          {resetSent && (
            <motion.p 
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-[11px] text-emerald-400 bg-emerald-950/40 border border-emerald-500/30 p-3 rounded-xl font-medium"
            >
              Password recovery link successfully sent to <strong>{email}</strong>! Please check your email inbox and spam folder to select your new credentials.
            </motion.p>
          )}

          {error && (
            <motion.div 
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-[11px] text-red-400 bg-red-950/40 border border-red-500/30 p-3 rounded-xl font-medium space-y-2"
            >
              <p>{error}</p>
              {error.includes("password") && (
                <div className="pt-1 flex gap-2">
                  <button
                    type="button"
                    onClick={handleResetPassword}
                    className="px-2 py-1 text-[10px] bg-red-500/20 text-red-200 border border-red-500/30 hover:bg-gold-500 hover:text-black hover:border-gold-400 rounded transition-all font-bold"
                  >
                    Reset Password Now
                  </button>
                  <button
                    type="button"
                    onClick={handleOfflineBypass}
                    className="px-2 py-1 text-[10px] bg-zinc-800 text-zinc-200 border border-zinc-700 hover:bg-zinc-700 rounded transition-all font-bold flex items-center gap-1"
                  >
                    <WifiOff className="w-3 h-3" />
                    Offline Bypass
                  </button>
                </div>
              )}
            </motion.div>
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

        <div className="flex flex-col gap-2">
          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full py-3.5 px-4 bg-zinc-800/50 hover:bg-zinc-800 border border-zinc-700 text-gold-300 font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-3 active:scale-[0.98]"
          >
            <img src="https://www.google.com/favicon.ico" className="w-4 h-4 grayscale opacity-70" alt="" />
            Continue with Google
          </button>

          <button
            onClick={handleOfflineBypass}
            disabled={loading}
            type="button"
            className="w-full py-3.5 px-4 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-zinc-200 font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-2.5 active:scale-[0.98]"
          >
            <WifiOff className="w-4 h-4 text-zinc-500" />
            Enter in Offline Escape Mode
          </button>
        </div>

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
