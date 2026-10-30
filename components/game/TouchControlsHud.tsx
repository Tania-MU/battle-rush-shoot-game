'use client';

import React, { useRef, useState } from 'react';
import {
  ArrowUp,
  Crosshair,
  Flame,
  Hand,
  Plane,
  RefreshCw,
  Wind,
  Zap,
} from 'lucide-react';
import { ArenaActionHandle } from '@/components/game/ArenaCanvas';
import { CombatHudSnapshot } from '@/types/game';

interface TouchControlsHudProps {
  hud: CombatHudSnapshot;
  actionRef: React.MutableRefObject<ArenaActionHandle | null>;
}

const JOYSTICK_MAX_RADIUS = 42;

export function TouchControlsHud({ hud, actionRef }: TouchControlsHudProps) {
  const baseRef = useRef<HTMLDivElement | null>(null);
  const activePointerIdRef = useRef<number | null>(null);
  const [touchStickPos, setTouchStickPos] = useState<{
    x: number;
    y: number;
    active: boolean;
  }>({
    x: 0,
    y: 0,
    active: false,
  });

  const aimPointerIdRef = useRef<number | null>(null);
  const lastAimPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isHoldingFire, setIsHoldingFire] = useState(false);

  const updateJoystickFromEvent = (clientX: number, clientY: number) => {
    const el = baseRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const rawDx = clientX - centerX;
    const rawDy = clientY - centerY;
    const dist = Math.hypot(rawDx, rawDy);
    const clampedDist = Math.min(dist, JOYSTICK_MAX_RADIUS);
    const angle = Math.atan2(rawDy, rawDx);

    const normX =
      dist > 2 ? (Math.cos(angle) * clampedDist) / JOYSTICK_MAX_RADIUS : 0;
    // Screen Y is down (+), whereas forward movement is up (-rawDy)
    const normForward =
      dist > 2 ? (-Math.sin(angle) * clampedDist) / JOYSTICK_MAX_RADIUS : 0;

    setTouchStickPos({ x: normX, y: normForward, active: true });
    // Touching the joystick immediately stops sprinting and moves using the joystick!
    actionRef.current?.setJoystickInput(normX, normForward, true);
  };

  const handleJoystickPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    activePointerIdRef.current = e.pointerId;
    updateJoystickFromEvent(e.clientX, e.clientY);
  };

  const handleJoystickPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (activePointerIdRef.current !== e.pointerId) return;
    e.stopPropagation();
    updateJoystickFromEvent(e.clientX, e.clientY);
  };

  const handleJoystickPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (activePointerIdRef.current !== e.pointerId) return;
    e.stopPropagation();
    activePointerIdRef.current = null;
    setTouchStickPos({ x: 0, y: 0, active: false });
    actionRef.current?.setJoystickInput(0, 0, false);
  };

  // Right-side Touch Aim Pad handlers (swipe to look around 360° & up/down on mobile)
  const handleAimPadPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (aimPointerIdRef.current !== null) return;
    aimPointerIdRef.current = e.pointerId;
    lastAimPosRef.current = { x: e.clientX, y: e.clientY };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handleAimPadPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (aimPointerIdRef.current !== e.pointerId) return;
    const dx = e.clientX - lastAimPosRef.current.x;
    const dy = e.clientY - lastAimPosRef.current.y;
    lastAimPosRef.current = { x: e.clientX, y: e.clientY };
    actionRef.current?.rotateCameraLook(dx, dy);
  };

  const handleAimPadPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (aimPointerIdRef.current !== e.pointerId) return;
    aimPointerIdRef.current = null;
  };

  // Visual knob offset combines active touch drag OR live keyboard WASD deflection (`hud.joystickVector`)
  const activeVecX = touchStickPos.active
    ? touchStickPos.x
    : hud.joystickVector?.x ?? 0;
  const activeVecForward = touchStickPos.active
    ? touchStickPos.y
    : hud.joystickVector?.y ?? 0;

  const knobPixelX = activeVecX * JOYSTICK_MAX_RADIUS;
  const knobPixelY = -activeVecForward * JOYSTICK_MAX_RADIUS;
  const isStickDeflected =
    Math.hypot(activeVecX, activeVecForward) > 0.08;

  const hasInteractableNearby = Boolean(
    hud.nearbyLoot || hud.nearbyVending || hud.nearbyShrine
  );

  return (
    <>
      {/* Touch Look Aiming Zone on Right Half of Viewport (for mobile swipe-to-aim) */}
      <div
        onPointerDown={handleAimPadPointerDown}
        onPointerMove={handleAimPadPointerMove}
        onPointerUp={handleAimPadPointerUp}
        onPointerCancel={handleAimPadPointerUp}
        className="fixed right-0 top-20 bottom-28 w-1/2 z-10 pointer-events-auto touch-none md:pointer-events-none"
        aria-label="Touch Camera Aim Zone"
      />

      {/* LEFT SIDE: SPRINT TOGGLE [SHIFT] + VIRTUAL ANALOG JOYSTICK (Syncs with Touch & Keyboard WASD) */}
      <div className="fixed left-5 bottom-24 z-30 pointer-events-auto select-none flex flex-col items-center gap-3">
        {/* Dedicated SPRINT [SHIFT] Toggle Button */}
        <button
          type="button"
          onClick={() => actionRef.current?.toggleSprint()}
          className={`px-3.5 py-2 rounded-xl border-2 font-mono text-xs font-bold flex items-center gap-1.5 shadow-xl transition-all active:scale-95 ${
            hud.isSprinting
              ? 'bg-amber-500 border-amber-200 text-slate-950 ring-4 ring-amber-400/30'
              : 'bg-slate-950/85 border-slate-700 text-slate-200 hover:border-amber-400/70'
          }`}
          title="Toggle Sprint (Shift)"
        >
          <Zap
            className={`w-4 h-4 ${
              hud.isSprinting
                ? 'fill-slate-950 text-slate-950'
                : 'text-amber-400'
            }`}
          />
          <span>{hud.isSprinting ? 'SPRINTING [SHIFT]' : 'SPRINT [SHIFT]'}</span>
        </button>

        {/* Interactive 360° Virtual Joystick (Touch + Live Keyboard WASD Visual Feedback) */}
        <div
          ref={baseRef}
          onPointerDown={handleJoystickPointerDown}
          onPointerMove={handleJoystickPointerMove}
          onPointerUp={handleJoystickPointerUp}
          onPointerCancel={handleJoystickPointerUp}
          className={`relative w-32 h-32 rounded-full border-2 touch-none flex items-center justify-center shadow-2xl transition-colors cursor-grab active:cursor-grabbing ${
            isStickDeflected
              ? 'bg-slate-950/80 border-rose-500/80'
              : 'bg-slate-950/65 border-slate-700/85'
          }`}
          aria-label="Movement Joystick (Touch or WASD)"
        >
          {/* W / A / S / D Key Indicators Around Ring */}
          <span
            className={`absolute top-1.5 left-1/2 -translate-x-1/2 text-[10px] font-mono font-bold ${
              activeVecForward > 0.25 ? 'text-rose-400' : 'text-slate-400'
            }`}
          >
            W
          </span>
          <span
            className={`absolute bottom-1.5 left-1/2 -translate-x-1/2 text-[10px] font-mono font-bold ${
              activeVecForward < -0.25 ? 'text-rose-400' : 'text-slate-400'
            }`}
          >
            S
          </span>
          <span
            className={`absolute left-2 top-1/2 -translate-y-1/2 text-[10px] font-mono font-bold ${
              activeVecX < -0.25 ? 'text-rose-400' : 'text-slate-400'
            }`}
          >
            A
          </span>
          <span
            className={`absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-mono font-bold ${
              activeVecX > 0.25 ? 'text-rose-400' : 'text-slate-400'
            }`}
          >
            D
          </span>

          {/* Inner Guide Circle */}
          <div className="w-16 h-16 rounded-full border border-slate-700/60 pointer-events-none" />

          {/* Movable Thumb Stick Knob */}
          <div
            className={`w-12 h-12 rounded-full border-2 flex items-center justify-center shadow-lg pointer-events-none transition-transform duration-75 ${
              touchStickPos.active
                ? 'bg-rose-500 border-white scale-105'
                : isStickDeflected
                  ? 'bg-rose-600/90 border-rose-200'
                  : 'bg-slate-800/95 border-slate-500'
            }`}
            style={{
              transform: `translate(${knobPixelX}px, ${knobPixelY}px)`,
            }}
          >
            <div className="w-3.5 h-3.5 rounded-full bg-white/90" />
          </div>
        </div>
      </div>

      {/* RIGHT SIDE: ON-SCREEN COMBAT & ACTION BUTTON CLUSTER (Fire, Scope, Jump/Parachute, Loot [F], Swap Weapon) */}
      <div className="fixed right-5 bottom-24 z-30 pointer-events-auto select-none flex flex-col items-end gap-2.5">
        {/* Top Action Row: Scope (RMB) & Jump / Eject (Space) */}
        <div className="flex items-center gap-2.5">
          {/* Loot / Interact [F] Button */}
          <button
            type="button"
            onClick={() => actionRef.current?.triggerInteract()}
            className={`w-14 h-14 rounded-2xl border-2 flex flex-col items-center justify-center shadow-xl transition-all active:scale-95 ${
              hasInteractableNearby
                ? 'bg-amber-500 border-white text-slate-950 animate-pulse'
                : 'bg-slate-950/85 border-slate-700 text-slate-200 hover:border-amber-400'
            }`}
            title="Loot / Interact [F]"
          >
            <Hand className="w-5 h-5" />
            <span className="text-[10px] font-mono font-bold mt-0.5">
              LOOT [F]
            </span>
          </button>

          {/* Scope Zoom [RMB] Button (2x Default / 4x Sniper) */}
          <button
            type="button"
            onClick={() => actionRef.current?.toggleScopeZoom()}
            className={`w-14 h-14 rounded-2xl border-2 flex flex-col items-center justify-center shadow-xl transition-all active:scale-95 ${
              hud.isAds
                ? 'bg-sky-500 border-white text-slate-950 ring-4 ring-sky-400/30'
                : 'bg-slate-950/85 border-slate-700 text-sky-300 hover:border-sky-400'
            }`}
            title="Toggle Scope Zoom (RMB)"
          >
            <Crosshair className="w-5 h-5" />
            <span className="text-[10px] font-mono font-bold mt-0.5">
              {hud.weapon.scopeZoom}X [RMB]
            </span>
          </button>

          {/* Jump / Eject / Parachute [SPACE] Button */}
          <button
            type="button"
            onClick={() => actionRef.current?.triggerJump()}
            className="w-14 h-14 rounded-2xl bg-slate-950/85 hover:bg-slate-900 border-2 border-emerald-400/80 text-emerald-300 flex flex-col items-center justify-center shadow-xl transition-all active:scale-95"
            title="Jump / Eject / Open Parachute (Space)"
          >
            {hud.dropPhase === 'in_plane' ? (
              <Plane className="w-5 h-5 text-amber-400" />
            ) : hud.dropPhase === 'freefall' ? (
              <Wind className="w-5 h-5 text-sky-400" />
            ) : (
              <ArrowUp className="w-5 h-5" />
            )}
            <span className="text-[10px] font-mono font-bold mt-0.5">
              {hud.dropPhase === 'in_plane'
                ? 'EJECT'
                : hud.dropPhase === 'freefall'
                  ? 'CHUTE'
                  : 'JUMP'}
            </span>
          </button>
        </div>

        {/* Bottom Primary Row: Switch Weapon Button + Large Free Fire Thumb FIRE Button (Hold or Tap) */}
        <div className="flex items-center gap-3">
          {/* Quick Switch Weapon [1/2 / Scroll] */}
          <button
            type="button"
            onClick={() => actionRef.current?.switchWeaponSlot()}
            className="px-3.5 py-3 rounded-2xl bg-slate-950/85 hover:bg-slate-900 border-2 border-slate-700 text-slate-200 flex flex-col items-center justify-center shadow-xl transition-all active:scale-95"
            title="Switch Weapon Slot (Scroll / 1 & 2)"
          >
            <RefreshCw className="w-4 h-4 text-amber-400" />
            <span className="text-[10px] font-mono font-bold mt-1">
              GUN {hud.activeWeaponIndex + 1}/2
            </span>
          </button>

          {/* Large Primary FIRE [LMB] Thumb Button */}
          <button
            type="button"
            onPointerDown={(e) => {
              e.stopPropagation();
              e.currentTarget.setPointerCapture(e.pointerId);
              setIsHoldingFire(true);
              actionRef.current?.setContinuousFire(true);
            }}
            onPointerUp={(e) => {
              e.stopPropagation();
              setIsHoldingFire(false);
              actionRef.current?.setContinuousFire(false);
            }}
            onPointerCancel={() => {
              setIsHoldingFire(false);
              actionRef.current?.setContinuousFire(false);
            }}
            className={`w-20 h-20 rounded-full border-4 flex flex-col items-center justify-center shadow-2xl touch-none transition-transform ${
              isHoldingFire
                ? 'bg-rose-500 border-amber-300 text-white scale-95 ring-4 ring-rose-500/40'
                : 'bg-gradient-to-br from-rose-600 to-amber-600 border-rose-200 text-white hover:from-rose-500 hover:to-amber-500'
            }`}
            title="Fire Weapon (LMB / Touch Hold)"
          >
            <Flame className="w-7 h-7 fill-white" />
            <span className="text-[11px] font-mono font-black tracking-wider mt-0.5">
              FIRE
            </span>
          </button>
        </div>
      </div>
    </>
  );
}
