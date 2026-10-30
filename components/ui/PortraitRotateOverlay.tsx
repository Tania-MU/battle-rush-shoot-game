'use client';

import React, { useEffect, useState } from 'react';
import { Maximize2, Smartphone } from 'lucide-react';

/**
 * Forces mobile/tablet players in portrait orientation to rotate their device
 * to landscape mode for the full Free Fire Battle Royale experience.
 */
export function PortraitRotateOverlay() {
  const [isPortraitMobile, setIsPortraitMobile] = useState(false);

  useEffect(() => {
    const checkOrientation = () => {
      if (typeof window === 'undefined') return;
      const w = window.innerWidth;
      const h = window.innerHeight;
      // Trigger portrait lock when height > width on mobile/tablet viewports
      setIsPortraitMobile(h > w && w < 960);
    };

    checkOrientation();
    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', checkOrientation);
    return () => {
      window.removeEventListener('resize', checkOrientation);
      window.removeEventListener('orientationchange', checkOrientation);
    };
  }, []);

  const handleRequestLandscapeFullscreen = async () => {
    try {
      if (document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
      }
      const scr = window.screen as Screen & {
        orientation?: { lock?: (mode: string) => Promise<void> };
      };
      if (scr.orientation?.lock) {
        await scr.orientation.lock('landscape');
      }
    } catch {
      // Browser may require physical device rotation
    }
  };

  if (!isPortraitMobile) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-slate-950/98 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center select-none">
      <div className="w-20 h-20 rounded-2xl bg-rose-500/15 border-2 border-rose-500/60 flex items-center justify-center mb-5 shadow-2xl">
        <Smartphone className="w-10 h-10 text-rose-400 animate-spin" style={{ animationDuration: '3s' }} />
      </div>

      <span className="px-3 py-1 rounded-full bg-amber-500/20 border border-amber-400/50 text-amber-300 text-[11px] font-mono font-bold uppercase tracking-wider mb-2">
        Landscape Mode Required
      </span>

      <h2 className="text-xl font-black text-white tracking-wide uppercase max-w-xs">
        Please Rotate Your Device to Landscape
      </h2>

      <p className="text-xs text-slate-300 mt-2 max-w-xs leading-relaxed">
        Heartdrop Royale requires horizontal landscape orientation so you can
        use the left virtual joystick, right aiming pad, and tactical combat
        buttons simultaneously.
      </p>

      <button
        type="button"
        onClick={handleRequestLandscapeFullscreen}
        className="mt-6 px-5 py-2.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-xl shadow-lg flex items-center gap-2 transition-colors"
      >
        <Maximize2 className="w-4 h-4" />
        <span>Auto-Lock Landscape Fullscreen</span>
      </button>
    </div>
  );
}
