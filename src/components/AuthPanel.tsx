import { ReactNode } from 'react';

interface AuthPanelProps {
  title: string;
  subtitle: string;
  children: ReactNode;
}

export function AuthPanel({ title, subtitle, children }: AuthPanelProps) {
  return (
    <div className="glass-integrated relative rounded-2xl border border-cyan-400/20 shadow-cyber overflow-hidden">
      {/* Neon corner strokes using improved positioning */}
      <div className="neon-corner-tl" />
      <div className="neon-corner-tr" />
      <div className="neon-corner-bl" />
      <div className="neon-corner-br" />

      {/* Enhanced glow effect with integrated lighting */}
      <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/8 via-transparent to-violet-500/8 pointer-events-none" />
      
      {/* Animated light streak for integrated lighting */}
      <div className="light-streak" />
      
      {/* Diagonal highlight sweep every 7-12s */}
      <div className="card-sweep" style={{ animationDuration: `${7 + Math.random() * 5}s` }} />

      {/* Content */}
      <div className="relative p-8 sm:p-10">
        {/* Header */}
        <div className="text-center mb-8 space-y-2">
          <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-widest text-white">
            {title}
          </h1>
          <p className="text-xs sm:text-sm font-mono uppercase tracking-wider text-cyan-400/70">
            {subtitle}
          </p>
          <div className="h-px w-20 mx-auto bg-gradient-to-r from-transparent via-cyan-400 to-transparent mt-4" />
        </div>

        {/* Form Content */}
        {children}
      </div>

      {/* Bottom scan line */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-cyan-400/0 via-cyan-400/50 to-cyan-400/0 animate-pulse" />
    </div>
  );
}
