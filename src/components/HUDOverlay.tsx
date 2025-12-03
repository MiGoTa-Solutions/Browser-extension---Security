import { useEffect, useRef, useState } from 'react';

interface HUDOverlayProps {
  threatBlocked?: boolean;
  status?: 'online' | 'offline' | 'scanning';
  encryption?: 'active' | 'inactive';
}

export function HUDOverlay({ threatBlocked = false, status = 'online', encryption = 'active' }: HUDOverlayProps) {
  const [glyphs, setGlyphs] = useState<string[]>([]);
  const [showThreatAlert, setShowThreatAlert] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Generate random digital glyphs
  useEffect(() => {
    const chars = '01アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホ';
    const newGlyphs = Array.from({ length: 60 }, () => 
      chars[Math.floor(Math.random() * chars.length)]
    );
    setGlyphs(newGlyphs);
    
    const interval = setInterval(() => {
      setGlyphs(prev => prev.map(() => 
        chars[Math.floor(Math.random() * chars.length)]
      ));
    }, 150);
    
    return () => clearInterval(interval);
  }, []);

  // Trigger threat alert animation
  useEffect(() => {
    if (threatBlocked) {
      setShowThreatAlert(true);
      const timer = setTimeout(() => setShowThreatAlert(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [threatBlocked]);

  // Animated scanning lines on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    let animationId: number;
    let offset = 0;

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Horizontal scan lines
      ctx.strokeStyle = 'rgba(0, 232, 255, 0.03)';
      ctx.lineWidth = 1;
      for (let y = offset % 20; y < canvas.height; y += 20) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }
      
      offset += 0.5;
      animationId = requestAnimationFrame(animate);
    };

    animate();

    return () => cancelAnimationFrame(animationId);
  }, []);

  return (
    <>
      {/* Canvas for animated scan lines */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 pointer-events-none opacity-30"
        style={{ mixBlendMode: 'overlay' }}
      />

      {/* Scrolling digital glyphs */}
      <div className="hud-glyphs absolute inset-0 pointer-events-none overflow-hidden opacity-10">
        <div className="glyph-grid">
          {glyphs.map((glyph, i) => (
            <span
              key={i}
              className="glyph"
              style={{
                left: `${(i % 10) * 10}%`,
                top: `${Math.floor(i / 10) * 10}%`,
                animationDelay: `${i * 0.05}s`,
                color: i % 3 === 0 ? '#00E8FF' : '#7F5AF0'
              }}
            >
              {glyph}
            </span>
          ))}
        </div>
      </div>

      {/* Rotating brackets around edges - will be positioned via CSS */}
      <div className="hud-brackets">
        <div className="bracket bracket-tl" />
        <div className="bracket bracket-tr" />
        <div className="bracket bracket-bl" />
        <div className="bracket bracket-br" />
      </div>

      {/* Threat blocked micro-flicker alert */}
      {showThreatAlert && (
        <div className="threat-alert animate-flicker">
          <div className="threat-alert-text">
            ⚠️ Threat Attempt: <span className="text-red-500 font-bold">BLOCKED</span>
          </div>
        </div>
      )}

      {/* Permanent flickering threat blocked text at bottom */}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
        <div className="flex items-center gap-3 px-6 py-2 bg-red-950/30 border border-red-500/30 rounded backdrop-blur-sm animate-pulse-subtle">
          <span className="text-red-400 text-sm font-mono tracking-wider animate-flicker-slow">
            ⚠ THREAT BLOCKED
          </span>
          <span className="text-cyan-400 text-xs font-mono opacity-60">
            System Secure
          </span>
        </div>
      </div>
      
      {/* Status Indicators - Top Left */}
      <div className="fixed top-6 left-6 z-40 pointer-events-none space-y-2">
        <div className="flex items-center gap-2 px-4 py-2 bg-black/40 border border-cyan-400/20 rounded-lg backdrop-blur-sm">
          <div className={`w-2 h-2 rounded-full ${status === 'online' ? 'bg-green-400 animate-pulse' : status === 'scanning' ? 'bg-yellow-400 animate-pulse' : 'bg-red-400'}`} />
          <span className="text-cyan-300 text-xs font-mono tracking-wider uppercase">
            System {status}
          </span>
        </div>
        
        <div className="flex items-center gap-2 px-4 py-2 bg-black/40 border border-cyan-400/20 rounded-lg backdrop-blur-sm">
          <div className={`w-2 h-2 rounded-full ${encryption === 'active' ? 'bg-cyan-400 animate-pulse' : 'bg-gray-400'}`} />
          <span className="text-cyan-300 text-xs font-mono tracking-wider uppercase">
            Encryption {encryption}
          </span>
        </div>
        
        <div className="flex items-center gap-2 px-4 py-2 bg-black/40 border border-cyan-400/20 rounded-lg backdrop-blur-sm">
          <div className="w-2 h-2 rounded-full bg-violet-400 animate-pulse" />
          <span className="text-cyan-300 text-xs font-mono tracking-wider uppercase">
            Threat Scan Active
          </span>
        </div>
      </div>
    </>
  );
}
