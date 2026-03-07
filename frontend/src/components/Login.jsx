import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Eye, EyeOff } from 'lucide-react';

const LOCKOUT_KEY = 'expense_tracker_login_attempts';
const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 5 * 60 * 1000; // 5 minutes

function getAttemptState() {
  try {
    return JSON.parse(localStorage.getItem(LOCKOUT_KEY) ?? 'null') ?? { attempts: 0, lockedUntil: null };
  } catch {
    return { attempts: 0, lockedUntil: null };
  }
}

function saveAttemptState(state) {
  localStorage.setItem(LOCKOUT_KEY, JSON.stringify(state));
}

function clearAttemptState() {
  localStorage.removeItem(LOCKOUT_KEY);
}

export default function Login({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [shaking, setShaking] = useState(false);
  const [lockRemaining, setLockRemaining] = useState(0); // seconds

  // Update countdown every second while locked
  useEffect(() => {
    const tick = () => {
      const { lockedUntil } = getAttemptState();
      if (!lockedUntil) { setLockRemaining(0); return; }
      const remaining = Math.ceil((lockedUntil - Date.now()) / 1000);
      if (remaining <= 0) { setLockRemaining(0); saveAttemptState({ attempts: 0, lockedUntil: null }); }
      else setLockRemaining(remaining);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();

    // Check lock
    const state = getAttemptState();
    if (state.lockedUntil && Date.now() < state.lockedUntil) return;

    const validUser = import.meta.env.VITE_APP_USERNAME;
    const validPass = import.meta.env.VITE_APP_PASSWORD;

    if (username === validUser && password === validPass) {
      clearAttemptState();
      setLockRemaining(0);
      setError('');
      onLogin();
    } else {
      const newAttempts = (state.attempts ?? 0) + 1;
      if (newAttempts >= MAX_ATTEMPTS) {
        const lockedUntil = Date.now() + LOCKOUT_MS;
        saveAttemptState({ attempts: newAttempts, lockedUntil });
        setLockRemaining(Math.ceil(LOCKOUT_MS / 1000));
        setError('');
      } else {
        saveAttemptState({ attempts: newAttempts, lockedUntil: null });
        setError(`Incorrect credentials. ${MAX_ATTEMPTS - newAttempts} attempt${MAX_ATTEMPTS - newAttempts === 1 ? '' : 's'} remaining.`);
        setShaking(true);
        setTimeout(() => setShaking(false), 500);
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-[#F5F5F0] flex items-center justify-center px-6">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-sm"
      >
        {/* Logo / title */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-3xl bg-[#5A5A40] mb-5">
            <span className="text-white text-2xl font-bold" style={{ fontFamily: 'Cormorant Garamond, serif' }}>
              E
            </span>
          </div>
          <h1
            className="text-3xl font-semibold text-[#1A1A1A]"
            style={{ fontFamily: 'Cormorant Garamond, serif' }}
          >
            Expense Manager
          </h1>
          <p className="mt-1 text-sm text-[#8A8A70]" style={{ fontFamily: 'Inter, sans-serif' }}>
            Sign in to continue
          </p>
        </div>

        {/* Form */}
        <motion.form
          onSubmit={handleSubmit}
          animate={shaking ? { x: [0, -10, 10, -8, 8, -4, 4, 0] } : { x: 0 }}
          transition={{ duration: 0.5 }}
          className="space-y-4"
        >
          <div>
            <label
              htmlFor="username"
              className="block text-xs font-medium text-[#5A5A40] mb-1.5 uppercase tracking-wide"
              style={{ fontFamily: 'Inter, sans-serif' }}
            >
              Username
            </label>
            <input
              id="username"
              type="text"
              autoComplete="username"
              value={username}
              onChange={(e) => { setUsername(e.target.value); setError(''); }}
              className="w-full px-4 py-3.5 rounded-2xl bg-white border border-[#1A1A1A]/8 text-[#1A1A1A] text-sm placeholder-[#8A8A70] focus:outline-none focus:ring-2 focus:ring-[#5A5A40]/30 focus:border-[#5A5A40]/40 transition-all"
              style={{ fontFamily: 'Inter, sans-serif' }}
              placeholder="Enter username"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-xs font-medium text-[#5A5A40] mb-1.5 uppercase tracking-wide"
              style={{ fontFamily: 'Inter, sans-serif' }}
            >
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(''); }}
                className="w-full px-4 py-3.5 pr-12 rounded-2xl bg-white border border-[#1A1A1A]/8 text-[#1A1A1A] text-sm placeholder-[#8A8A70] focus:outline-none focus:ring-2 focus:ring-[#5A5A40]/30 focus:border-[#5A5A40]/40 transition-all"
                style={{ fontFamily: 'Inter, sans-serif' }}
                placeholder="Enter password"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#8A8A70] hover:text-[#5A5A40] transition-colors"
              >
                {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>
          </div>

          {/* Lockout message */}
          {lockRemaining > 0 && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2"
              style={{ fontFamily: 'Inter, sans-serif' }}
            >
              Too many attempts. Try again in {Math.floor(lockRemaining / 60)}:{String(lockRemaining % 60).padStart(2, '0')}.
            </motion.p>
          )}

          {/* Error message */}
          {error && lockRemaining === 0 && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-xs text-red-600 px-1"
              style={{ fontFamily: 'Inter, sans-serif' }}
            >
              {error}
            </motion.p>
          )}

          <motion.button
            type="submit"
            disabled={lockRemaining > 0}
            whileHover={lockRemaining === 0 ? { scale: 1.02, backgroundColor: '#4A4A30' } : {}}
            whileTap={lockRemaining === 0 ? { scale: 0.97 } : {}}
            className="w-full py-3.5 mt-2 bg-[#5A5A40] text-white text-sm font-medium rounded-2xl shadow-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ fontFamily: 'Inter, sans-serif' }}
          >
            Sign In
          </motion.button>
        </motion.form>
      </motion.div>
    </div>
  );
}
