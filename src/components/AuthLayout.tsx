import { useRef, ReactNode } from 'react';
import { Shield, Lock, Zap } from 'lucide-react';
import { useCyberScene } from '../hooks/useCyberScene';

interface AuthLayoutProps {
  children: ReactNode;
  title: string;
  subtitle: string;
}

export function AuthLayout({ children, title, subtitle }: AuthLayoutProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  useCyberScene(containerRef);

  return (
    <div className="fixed inset-0 w-screen h-screen overflow-hidden bg-[#050a14]">
      {/* Three.js Background */}
      <div ref={containerRef} className="absolute inset-0 z-0" />

      {/* Vignette Overlay */}
      <div className="absolute inset-0 z-10 bg-gradient-radial from-transparent via-[#050a14]/50 to-[#050a14] pointer-events-none" />

      {/* Scan Lines Effect */}
      <div className="absolute inset-0 z-10 opacity-5 pointer-events-none bg-scan-lines animate-scan-slow" />

      {/* Content Container */}
      <div className="relative z-20 w-full h-full flex flex-col items-center justify-center p-4 sm:p-6 overflow-y-auto">
        
        {/* Branding Header */}
        <div className="text-center mb-6 sm:mb-8 animate-fade-in-up">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="relative">
              <Shield className="w-10 h-10 sm:w-12 sm:h-12 text-cyan-400 animate-pulse-glow" />
              <div className="absolute inset-0 blur-xl bg-cyan-400/30 animate-pulse" />
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-white tracking-wider cyber-font">
              SECURESHIELD
            </h1>
          </div>
          
          <div className="space-y-1">
            <h2 className="text-base sm:text-lg md:text-xl font-bold text-cyan-400 uppercase tracking-widest">
              {title}
            </h2>
            <p className="text-xs sm:text-sm text-cyan-300/60 tracking-wider font-mono">
              {subtitle}
            </p>
          </div>
        </div>

        {/* Form Container */}
        <div className="w-full max-w-md">
          <div className="cyber-card-glow">
            {children}
          </div>
        </div>

        {/* Security Status Footer */}
        <div className="mt-6 sm:mt-8 flex items-center gap-4 sm:gap-6 animate-fade-in-up animation-delay-300">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse-fast" />
            <span className="text-xs sm:text-sm text-green-400 font-mono uppercase tracking-wider">Secure</span>
          </div>
          <div className="w-px h-4 bg-cyan-400/30" />
          <div className="flex items-center gap-2">
            <Lock className="w-3 h-3 text-cyan-400" />
            <span className="text-xs sm:text-sm text-cyan-400 font-mono uppercase tracking-wider">Encrypted</span>
          </div>
          <div className="w-px h-4 bg-cyan-400/30" />
          <div className="flex items-center gap-2">
            <Zap className="w-3 h-3 text-violet-400" />
            <span className="text-xs sm:text-sm text-violet-400 font-mono uppercase tracking-wider">Private</span>
          </div>
        </div>

        {/* Version Info */}
        <div className="mt-4 text-xs text-cyan-300/40 font-mono tracking-widest">
          QUANTUM FIREWALL OS • BUILD 2.0.1
        </div>
      </div>
    </div>
  );
}
