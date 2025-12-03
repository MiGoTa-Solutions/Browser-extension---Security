import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, Lock, Key, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { CommandLayout } from '../components/CommandLayout';
import { AuthPanel } from '../components/AuthPanel';
import { HUDOverlay } from '../components/HUDOverlay';

export function Register() {
  const navigate = useNavigate();
  const { register } = useAuth();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [pin, setPin] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPinTooltip, setShowPinTooltip] = useState(false);
  const [emailValid, setEmailValid] = useState(false);
  const [passwordTyping, setPasswordTyping] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPass) {
      setError('PASSCODE MISMATCH: SEQUENCES DO NOT ALIGN');
      return;
    }
    
    setError(null);
    setIsLoading(true);

    try {
      await register({ email, password, pin });
      setTimeout(() => navigate('/'), 1500);
    } catch (err) {
      setIsLoading(false);
      setError('INITIALIZATION FAILED: ACCESS DENIED');
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
            title="NEW OPERATIVE ENROLLMENT"
            subtitle="ISSUE CREDENTIALS FOR SECURESHIELD ACCESS"
          >
            <form onSubmit={handleSubmit} className="space-y-4">
          
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
              whileFocus={{ scale: 1.01 }}
              onChange={(e) => {
                setEmail(e.target.value);
                setEmailValid(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.target.value));
              }}
              onFocus={() => {
                window.dispatchEvent(new Event('input-focus'));
              }}
              onBlur={() => {
                window.dispatchEvent(new Event('input-blur'));
              }}
              className={`cyber-input w-full pl-12 pr-4 py-3 bg-white/10 backdrop-blur-xl border border-cyan-400/20 rounded-xl text-white placeholder-cyan-300/40 font-mono text-sm tracking-wide focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/50 focus:bg-white/5 transition-all outline-none ${emailValid ? 'input-valid-glow' : ''}`}
              placeholder="OPERATIVE EMAIL"
            />
          </motion.div>

          {/* Password Fields Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="group relative col-span-2 sm:col-span-1">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none z-10">
                <Lock className="h-4 w-4 text-magenta-400 group-focus-within:text-magenta-300 transition-colors" />
              </div>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => {
                setPassword(e.target.value);
                setPasswordTyping(e.target.value.length > 0);
              }}
              onFocus={() => {
                window.dispatchEvent(new Event('input-focus'));
              }}
              onBlur={() => {
                window.dispatchEvent(new Event('input-blur'));
              }}
                className={`cyber-input w-full pl-11 pr-3 py-3 bg-black/40 border border-magenta-400/20 rounded-xl text-white placeholder-magenta-300/40 font-mono text-xs tracking-wide focus:border-magenta-400 focus:ring-2 focus:ring-magenta-400/50 focus:bg-black/60 transition-all outline-none ${passwordTyping ? 'input-typing-glow' : ''}`}
                placeholder="PASSCODE"
              />
            </div>
            
            <div className="group relative col-span-2 sm:col-span-1">
              <input
                type="password"
                required
                value={confirmPass}
                onChange={(e) => setConfirmPass(e.target.value)}
              onFocus={() => {
                window.dispatchEvent(new Event('input-focus'));
              }}
              onBlur={() => {
                window.dispatchEvent(new Event('input-blur'));
              }}
                className="cyber-input w-full px-3 py-3 bg-black/40 border border-magenta-400/20 rounded-xl text-white placeholder-magenta-300/40 font-mono text-xs tracking-wide focus:border-magenta-400 focus:ring-2 focus:ring-magenta-400/50 focus:bg-black/60 transition-all outline-none"
                placeholder="CONFIRM"
              />
            </div>
          </div>

          {/* PIN Input with Tooltip */}
          <div className="group relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none z-10">
              <Key className="h-5 w-5 text-yellow-400 group-focus-within:text-yellow-300 transition-colors" />
            </div>
            <input
              type="text"
              required
              pattern="[0-9]*"
              maxLength={6}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
              onFocus={() => {
                window.dispatchEvent(new Event('input-focus'));
              }}
              onBlur={() => {
                window.dispatchEvent(new Event('input-blur'));
              }}
              onMouseEnter={() => setShowPinTooltip(true)}
              onMouseLeave={() => setShowPinTooltip(false)}
              className="cyber-input w-full pl-12 pr-4 py-3 bg-black/40 border border-yellow-400/20 rounded-xl text-white placeholder-yellow-300/40 font-mono text-sm tracking-widest focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400/50 focus:bg-black/60 transition-all outline-none"
              placeholder="MASTER PIN (6 DIGITS)"
            />
            
            {/* Hologram Tooltip */}
            {showPinTooltip && (
              <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-black/90 border border-yellow-400/40 rounded-lg px-4 py-2 animate-fade-in-up z-20">
                <p className="text-xs font-mono text-yellow-400 whitespace-nowrap">
                  ⚠️ Required for Web Access Lock
                </p>
                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-black/90 border-r border-b border-yellow-400/40 rotate-45" />
              </div>
            )}
          </div>

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
            whileHover={{ scale: 1.02, boxShadow: '0 0 40px rgba(188,19,254,0.6)' }}
            whileTap={{ scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            onHoverStart={() => window.dispatchEvent(new CustomEvent('button-hover', { detail: true }))}
            onHoverEnd={() => window.dispatchEvent(new CustomEvent('button-hover', { detail: false }))}
            className="group relative w-full py-4 rounded-xl bg-gradient-to-r from-violet-500 via-cyan-500 to-magenta-500 bg-size-200 bg-pos-0 hover:bg-pos-100 text-white font-black uppercase tracking-widest text-sm overflow-hidden transition-all duration-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {/* Bleed sheen effect */}
            <div className="bleed-sheen" />
            
            <span className="relative z-10 flex items-center justify-center gap-3">
              {isLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>FORGING CREDENTIALS...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-5 h-5" />
                  <span>ENROLL OPERATIVE</span>
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform duration-300" />
                </>
              )}
            </span>
          </motion.button>

          {/* Divider */}
          <div className="relative py-3">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full h-px bg-gradient-to-r from-transparent via-violet-400/30 to-transparent"></div>
            </div>
            <div className="relative flex justify-center">
              <span className="px-4 text-xs text-violet-400/50 font-mono tracking-widest bg-black/40">
                OR
              </span>
            </div>
          </div>

          {/* Login Link */}
          <div className="text-center space-y-2">
            <p className="text-cyan-300/50 text-xs font-mono tracking-wider">ALREADY HAVE CREDENTIALS?</p>
            <Link
              to="/login"
              className="inline-flex items-center gap-2 text-violet-400 hover:text-violet-300 font-bold text-sm uppercase tracking-widest transition-all group"
            >
              <span>&lt; RETURN TO LOGIN</span>
            </Link>
          </div>
            </form>
          </AuthPanel>
        </motion.div>
      </CommandLayout>
    </>
  );
}
