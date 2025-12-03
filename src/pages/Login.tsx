import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, Fingerprint, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { CommandLayout } from '../components/CommandLayout';
import { AuthPanel } from '../components/AuthPanel';
import { HUDOverlay } from '../components/HUDOverlay';

export function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [emailValid, setEmailValid] = useState(false);
  const [passwordTyping, setPasswordTyping] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      await login(email, password);
      setTimeout(() => navigate('/'), 800);
    } catch (err) {
      setError('AUTHENTICATION FAILED: ACCESS DENIED');
      setIsLoading(false);
    }
  };

  const statusBadges = [
    { label: 'SYSTEM HEALTH: STABLE', status: 'active', color: 'green' },
    { label: 'ENCRYPTION: ACTIVE', status: 'active', color: 'cyan' },
    { label: 'THREAT BLOCKING: ENABLED', status: 'active', color: 'violet' },
  ];

  return (
    <>
      <HUDOverlay status="online" encryption="active" />
      <CommandLayout statusBadges={statusBadges}>
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        >
          <AuthPanel
            title="COMMAND GATEWAY ACCESS"
            subtitle="LOGIN ACCESS: LEVEL-7 SECURITY PROTOCOL"
          >
            <form onSubmit={handleSubmit} className="space-y-5">
          
          {/* Micro-text status */}
          {focusedField && (
            <div className="text-center mb-4">
              <p className="text-xs font-mono text-cyan-400 animate-pulse-fast">
                {focusedField === 'email' && '⚡ VERIFYING OPERATIVE ID...'}
                {focusedField === 'password' && '🔐 ENABLING BIOMETRIC PASSCODE...'}
              </p>
            </div>
          )}

          {/* Email Input */}
          <motion.div 
            className="group relative"
            whileFocus={{ scale: 1.01 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          >
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none z-10">
              <ShieldCheck className="h-5 w-5 text-cyan-400 group-focus-within:text-cyan-300 transition-colors" />
            </div>
            <motion.input
              type="email"
              required
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                // Simple email validation
                setEmailValid(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.target.value));
              }}
              onFocus={() => {
                setFocusedField('email');
                window.dispatchEvent(new Event('input-focus'));
              }}
              onBlur={() => {
                setFocusedField(null);
                window.dispatchEvent(new Event('input-blur'));
              }}
              className={`cyber-input w-full pl-12 pr-4 py-3.5 bg-white/10 backdrop-blur-xl border border-cyan-400/20 rounded-xl text-white placeholder-cyan-300/40 font-mono text-sm tracking-wide focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/50 focus:bg-white/5 transition-all outline-none ${emailValid ? 'input-valid-glow' : ''}`}
              placeholder="OPERATIVE ID / EMAIL"
              whileFocus={{ scale: 1.01 }}
            />
          </motion.div>

          {/* Password Input */}
          <motion.div 
            className="group relative"
            whileFocus={{ scale: 1.01 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          >
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none z-10">
              <Fingerprint className="h-5 w-5 text-magenta-400 group-focus-within:text-magenta-300 transition-colors" />
            </div>
            <motion.input
              type="password"
              required
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setPasswordTyping(e.target.value.length > 0);
              }}
              onFocus={() => {
                setFocusedField('password');
                window.dispatchEvent(new Event('input-focus'));
              }}
              onBlur={() => {
                setFocusedField(null);
                window.dispatchEvent(new Event('input-blur'));
              }}
              className={`cyber-input w-full pl-12 pr-4 py-3.5 bg-white/10 backdrop-blur-xl border border-magenta-400/20 rounded-xl text-white placeholder-magenta-300/40 font-mono text-sm tracking-wide focus:border-magenta-400 focus:ring-2 focus:ring-magenta-400/50 focus:bg-white/5 transition-all outline-none ${passwordTyping ? 'input-typing-glow' : ''}`}
              placeholder="BIOMETRIC PASSCODE"
              whileFocus={{ scale: 1.01 }}
            />
          </motion.div>

          {/* Error Display */}
          {error && (
            <div className="bg-red-500/10 border border-red-400/40 rounded-lg p-3 animate-shake">
              <p className="text-red-400 text-xs font-mono text-center tracking-wider">{error}</p>
            </div>
          )}

          {/* Submit Button with Bleed Sheen */}
          <motion.button
            type="submit"
            disabled={isLoading}
            whileHover={{ scale: 1.02, boxShadow: '0 0 40px rgba(0,243,255,0.6)' }}
            whileTap={{ scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            onHoverStart={() => window.dispatchEvent(new CustomEvent('button-hover', { detail: true }))}
            onHoverEnd={() => window.dispatchEvent(new CustomEvent('button-hover', { detail: false }))}
            className="group relative w-full py-4 rounded-xl bg-gradient-to-r from-cyan-500 via-magenta-500 to-cyan-500 bg-size-200 bg-pos-0 hover:bg-pos-100 text-white font-black uppercase tracking-widest text-sm overflow-hidden transition-all duration-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {/* Bleed sheen effect */}
            <div className="bleed-sheen" />
            
            <span className="relative z-10 flex items-center justify-center gap-3">
              {isLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>AUTHENTICATING...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-5 h-5" />
                  <span>UNLOCK SYSTEM</span>
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform duration-300" />
                </>
              )}
            </span>
          </motion.button>

          {/* Divider */}
          <div className="relative py-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full h-px bg-gradient-to-r from-transparent via-cyan-400/30 to-transparent"></div>
            </div>
            <div className="relative flex justify-center">
              <span className="px-4 text-xs text-cyan-400/50 font-mono tracking-widest bg-black/40">
                OR
              </span>
            </div>
          </div>

          {/* Register Link */}
          <div className="text-center space-y-2">
            <p className="text-cyan-300/50 text-xs font-mono tracking-wider">NO OPERATIVE CREDENTIALS?</p>
            <Link
              to="/register"
              className="inline-flex items-center gap-2 text-cyan-400 hover:text-cyan-300 font-bold text-sm uppercase tracking-widest transition-all group"
            >
              <span>INITIALIZE NEW PROFILE</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
            </form>
          </AuthPanel>
        </motion.div>
      </CommandLayout>
    </>
  );
}
