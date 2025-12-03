import { ReactNode } from 'react';
import { CyberDefensePanel } from './CyberDefensePanel';
import { HUDOverlay } from './HUDOverlay';

interface CommandLayoutProps {
  children: ReactNode;
  statusBadges?: { label: string; status: string; color: string }[];
}

export function CommandLayout({ children, statusBadges: _statusBadges }: CommandLayoutProps) {
  return (
    <div className="fixed inset-0 w-screen h-screen overflow-hidden bg-cyber-steel">
      {/* Unified full-width 3D background */}
      <div className="absolute inset-0 w-full h-full">
        <CyberDefensePanel fullWidth />
      </div>

      {/* Cinematic HUD Overlay */}
      <div className="hud-overlay" />
      <HUDOverlay />

      {/* Auth Panel - Fixed to right at 40-45% width, left side wide-open for visuals */}
      <div className="fixed right-0 top-0 h-full w-full md:w-[42%] flex items-center justify-center overflow-y-auto z-20 pointer-events-none">
        <div className="w-full max-w-md px-6 py-8 pointer-events-auto animate-slide-in-right auth-card-container">
          {children}
        </div>
      </div>

      {/* Status Footer */}
      <div className="absolute bottom-0 inset-x-0 flex items-center justify-center gap-4 p-4 bg-gradient-to-t from-black/30 to-transparent pointer-events-none z-10">
        <div className="flex items-center gap-2 text-xs text-cyan-400/70">
          <span className="block h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />
          <span className="uppercase tracking-wider font-mono">System Online</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-violet-400/70">
          <span className="block h-2 w-2 rounded-full bg-violet-400" />
          <span className="uppercase tracking-wider font-mono">Encrypted</span>
        </div>
      </div>
    </div>
  );
}
