'use client';

import React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  Crosshair,
  Flame,
  Heart,
  MapPin,
  Pause,
  Plane,
  Shield,
  ShieldCheck,
  Skull,
  Sparkles,
  Volume2,
  VolumeX,
  Wind,
  Zap,
} from 'lucide-react';
import { ARENA_RADIUS, MAX_COMPANION_DAMAGE } from '@/lib/constants';
import { formatTimeMMSS } from '@/lib/game-utils';
import { ArenaActionHandle } from '@/components/game/ArenaCanvas';
import { TouchControlsHud } from '@/components/game/TouchControlsHud';
import { CombatHudSnapshot, PlayerProfile } from '@/types/game';

interface CombatHudProps {
  hud: CombatHudSnapshot;
  profile: PlayerProfile;
  isMuted: boolean;
  onToggleMute: () => void;
  onPause: () => void;
  actionRef: React.MutableRefObject<ArenaActionHandle | null>;
}

export function CombatHud({
  hud,
  profile,
  isMuted,
  onToggleMute,
  onPause,
  actionRef,
}: CombatHudProps) {
  const hpPercent = Math.max(0, Math.min(100, (hud.hp / hud.maxHp) * 100));
  const shieldPercent = Math.max(
    0,
    Math.min(100, (hud.shield / hud.maxShield) * 100)
  );

  const canSummonGirl =
    profile.unlockedCuteGirl && profile.selectedCompanion === 'girl';
  const botCapReached =
    hud.botDamageTakenByPlayer >= hud.maxBotDamageAllowed;

  return (
    <div className="fixed inset-0 z-20 pointer-events-none flex flex-col justify-between p-4 md:p-6">
      {/* Scope Vignette when RMB Scope (2x or 4x) is Active */}
      {hud.isAds && (
        <div
          className="fixed inset-0 pointer-events-none z-10"
          style={{
            background:
              hud.zoomLevel === 4
                ? 'radial-gradient(circle at 50% 50%, transparent 24%, rgba(2, 6, 23, 0.88) 54%)'
                : 'radial-gradient(circle at 50% 50%, transparent 36%, rgba(2, 6, 23, 0.65) 75%)',
          }}
        />
      )}

      {/* DEAD-CENTER CROSSHAIR & 2x / 4x SCOPE RETICLE (Exact 50%, 50% Camera Ray Convergence) */}
      <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20 pointer-events-none flex flex-col items-center justify-center">
        {hud.isAds && hud.zoomLevel === 4 ? (
          /* 4x Sniper Scope Reticle */
          <div className="relative flex items-center justify-center">
            <svg viewBox="0 0 220 220" className="w-56 h-56">
              <circle
                cx="110"
                cy="110"
                r="96"
                fill="none"
                stroke="#F43F5E"
                strokeWidth="2"
              />
              <circle
                cx="110"
                cy="110"
                r="52"
                fill="none"
                stroke="#F8FAFC"
                strokeWidth="1"
                strokeDasharray="4 4"
              />
              {/* Horizontal & Vertical Mil-Dot Crosshairs */}
              <line
                x1="14"
                y1="110"
                x2="206"
                y2="110"
                stroke="#F8FAFC"
                strokeWidth="1.2"
              />
              <line
                x1="110"
                y1="14"
                x2="110"
                y2="206"
                stroke="#F8FAFC"
                strokeWidth="1.2"
              />
              {/* Rangefinder ticks */}
              <line x1="85" y1="106" x2="85" y2="114" stroke="#F43F5E" strokeWidth="1.5" />
              <line x1="135" y1="106" x2="135" y2="114" stroke="#F43F5E" strokeWidth="1.5" />
              <line x1="106" y1="135" x2="114" y2="135" stroke="#F43F5E" strokeWidth="1.5" />
              <line x1="104" y1="155" x2="116" y2="155" stroke="#F43F5E" strokeWidth="1.5" />
              {/* Dead-center laser dot */}
              <circle cx="110" cy="110" r="2.8" fill="#F43F5E" />
            </svg>
            <span className="mt-1 px-2 py-0.5 rounded bg-slate-950/90 border border-rose-500/60 text-[10px] font-mono font-bold text-rose-400">
              4X SNIPER SCOPE
            </span>
          </div>
        ) : hud.isAds ? (
          /* 2x Default Tactical Optic Scope Reticle */
          <div className="relative flex items-center justify-center">
            <svg viewBox="0 0 120 120" className="w-28 h-28">
              <circle
                cx="60"
                cy="60"
                r="46"
                fill="none"
                stroke="#38BDF8"
                strokeWidth="1.8"
              />
              <line x1="14" y1="60" x2="46" y2="60" stroke="#F8FAFC" strokeWidth="1.6" />
              <line x1="74" y1="60" x2="106" y2="60" stroke="#F8FAFC" strokeWidth="1.6" />
              <line x1="60" y1="14" x2="60" y2="46" stroke="#F8FAFC" strokeWidth="1.6" />
              <line x1="60" y1="74" x2="60" y2="106" stroke="#F8FAFC" strokeWidth="1.6" />
              <circle cx="60" cy="60" r="2.6" fill="#F43F5E" />
            </svg>
            <span className="mt-1 px-2 py-0.5 rounded bg-slate-950/90 border border-sky-500/60 text-[10px] font-mono font-bold text-sky-300">
              2X SCOPE
            </span>
          </div>
        ) : (
          /* Standard Hip-Fire Free Fire Precision Crosshair */
          <svg viewBox="0 0 48 48" className="w-10 h-10 drop-shadow">
            <circle cx="24" cy="24" r="2.2" fill="#F43F5E" />
            <circle
              cx="24"
              cy="24"
              r="11"
              fill="none"
              stroke="rgba(255,255,255,0.45)"
              strokeWidth="1.2"
            />
            <line
              x1="24"
              y1="5"
              x2="24"
              y2="14"
              stroke="#FFFFFF"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <line
              x1="24"
              y1="34"
              x2="24"
              y2="43"
              stroke="#FFFFFF"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <line
              x1="5"
              y1="24"
              x2="14"
              y2="24"
              stroke="#FFFFFF"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <line
              x1="34"
              y1="24"
              x2="43"
              y2="24"
              stroke="#FFFFFF"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        )}
      </div>

      {/* FREE FIRE KILL NOTIFICATION BANNER (Animated Top-Center Overlay) */}
      <AnimatePresence>
        {hud.killBanner && (
          <div className="fixed top-28 inset-x-0 z-30 pointer-events-none flex justify-center px-4">
            <motion.div
              key={hud.killBanner.id}
              initial={{ opacity: 0, scale: 0.6, y: -28 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.85, y: -16 }}
              transition={{ type: 'spring', stiffness: 420, damping: 24 }}
              className="flex flex-col items-center"
            >
              <div className="relative bg-gradient-to-r from-amber-500/20 via-rose-600/95 to-amber-500/20 border-2 border-amber-400 px-8 py-3 rounded-2xl shadow-2xl flex flex-col items-center text-center">
                <div className="flex items-center gap-2 text-amber-300 mb-0.5">
                  <Flame className="w-5 h-5 fill-amber-400 text-amber-200" />
                  <Skull className="w-6 h-6 text-white" />
                  <Flame className="w-5 h-5 fill-amber-400 text-amber-200" />
                </div>
                <div className="text-xl md:text-2xl font-black tracking-wider text-white uppercase drop-shadow">
                  {hud.killBanner.headline}
                </div>
                <div className="text-xs font-bold text-amber-200 mt-0.5">
                  Eliminated{' '}
                  <span className="text-white underline decoration-amber-300">
                    {hud.killBanner.victimName}
                  </span>{' '}
                  · {hud.killBanner.weaponName}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Top Perimeter Row: Bermuda Radar (Left) · Storm & Match Telemetry (Center) · Kill Feed & Controls (Right) */}
      <div className="relative z-20 flex items-start justify-between gap-4">
        {/* Top-Left: Bermuda Tactical Radar */}
        <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-3 flex flex-col gap-2 w-44">
          <div className="flex items-center justify-between text-xs text-slate-300">
            <span className="flex items-center gap-1 font-semibold truncate">
              <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span className="truncate">{hud.currentZoneName}</span>
            </span>
            <span className="font-mono tabular-nums text-rose-400 shrink-0">
              P{hud.storm.phase}/{hud.storm.maxPhases}
            </span>
          </div>
          <div className="relative w-32 h-32 mx-auto rounded-full bg-slate-900 border border-slate-700 overflow-hidden">
            {/* Shrinking Storm Safe Circle */}
            <div
              className="absolute rounded-full border border-rose-500/80 bg-rose-500/10"
              style={{
                width: `${Math.min(100, (hud.storm.currentRadius / ARENA_RADIUS) * 100)}%`,
                height: `${Math.min(100, (hud.storm.currentRadius / ARENA_RADIUS) * 100)}%`,
                left: '50%',
                top: '50%',
                transform: 'translate(-50%, -50%)',
              }}
            />
            {/* Vending Machine Stations (Amber Squares) */}
            {hud.vendingRadar.map((vm) => {
              const rx = 50 + (vm.x / ARENA_RADIUS) * 46;
              const rz = 50 + (vm.z / ARENA_RADIUS) * 46;
              return (
                <div
                  key={vm.id}
                  className="absolute w-1.5 h-1.5 bg-amber-400"
                  style={{
                    left: `${rx}%`,
                    top: `${rz}%`,
                    transform: 'translate(-50%, -50%)',
                  }}
                  title="Free Vending Machine"
                />
              );
            })}
            {/* Contenders (Enemy Red Dots & Local Player Directional Navigation Arrow/Triangle) */}
            {hud.contenderRadar.map((c) => {
              if (!c.alive) return null;
              const cx = 50 + (c.x / ARENA_RADIUS) * 46;
              const cz = 50 + (c.z / ARENA_RADIUS) * 46;

              if (c.isLocal) {
                // Convert 3D yaw rotationY (0 = +Z South, PI = -Z North, PI/2 = +X East) to 2D radar clockwise degrees (0 deg = Up/-Z)
                const headingDeg =
                  180 - (hud.playerPos.rotationY * 180) / Math.PI;
                return (
                  <div
                    key={c.id}
                    className="absolute z-10 pointer-events-none"
                    style={{
                      left: `${cx}%`,
                      top: `${cz}%`,
                      transform: `translate(-50%, -50%) rotate(${headingDeg}deg)`,
                    }}
                    title="Your Position & Heading"
                  >
                    <svg
                      viewBox="0 0 24 24"
                      className="w-5 h-5 overflow-visible drop-shadow"
                    >
                      {/* Forward Field-of-View Cone */}
                      <path
                        d="M12 12 L4 1 A11 11 0 0 1 20 1 Z"
                        fill="rgba(52, 211, 153, 0.28)"
                      />
                      {/* Free Fire Style Directional Navigation Arrow / Triangle */}
                      <polygon
                        points="12,2 19,19 12,15 5,19"
                        fill="#10B981"
                        stroke="#FFFFFF"
                        strokeWidth="2"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                );
              }

              return (
                <div
                  key={c.id}
                  className="absolute w-1.5 h-1.5 rounded-full bg-rose-400"
                  style={{
                    left: `${cx}%`,
                    top: `${cz}%`,
                    transform: 'translate(-50%, -50%)',
                  }}
                />
              );
            })}
            {/* Dropship Plane Icon on Radar */}
            {hud.planePos?.active && (
              <div
                className="absolute text-amber-300 drop-shadow"
                style={{
                  left: `${50 + (hud.planePos.x / ARENA_RADIUS) * 46}%`,
                  top: `${50 + (hud.planePos.z / ARENA_RADIUS) * 46}%`,
                  transform: 'translate(-50%, -50%)',
                }}
                title="Cargo Dropship Plane"
              >
                <Plane className="w-3.5 h-3.5 fill-amber-400 text-amber-200" />
              </div>
            )}
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span>Bermuda Map</span>
            <span className="font-mono tabular-nums">
              {Math.round(hud.storm.currentRadius)}m Safe
            </span>
          </div>
        </div>

        {/* Top-Center: Alive Count, Kills, Damage, Storm Timer & Bot Protection Status */}
        <div className="flex flex-col items-center gap-2">
          <div className="bg-slate-950/90 border border-slate-800 rounded-xl px-5 py-2.5 flex items-center gap-5 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-slate-400 text-xs">Alive</span>
              <span className="font-mono tabular-nums font-bold text-slate-100 text-base">
                {hud.aliveCount}/{hud.totalContenders}
              </span>
            </div>
            <span className="text-slate-700" aria-hidden="true">
              ·
            </span>
            <div className="flex items-center gap-2">
              <span className="text-slate-400 text-xs">Kills</span>
              <span className="font-mono tabular-nums font-bold text-rose-400 text-base">
                {hud.kills}
              </span>
            </div>
            <span className="text-slate-700" aria-hidden="true">
              ·
            </span>
            <div className="flex items-center gap-2">
              <span className="text-slate-400 text-xs">Damage</span>
              <span className="font-mono tabular-nums font-bold text-amber-400 text-base">
                {hud.damageDealt}
              </span>
            </div>
            <span className="text-slate-700" aria-hidden="true">
              ·
            </span>
            <div className="flex items-center gap-2">
              <span className="text-slate-400 text-xs">Storm</span>
              <span className="font-mono tabular-nums font-bold text-sky-400 text-base">
                {formatTimeMMSS(hud.storm.timeRemainingSec)}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 text-[11px] bg-slate-950/85 border border-slate-800 px-3.5 py-1 rounded-lg text-slate-300 font-mono tabular-nums">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>
              Bot DMG Taken: {hud.botDamageTakenByPlayer}/{hud.maxBotDamageAllowed}{' '}
              {botCapReached
                ? '(50 Max Reached — Bots Deal 0 DMG)'
                : '(Bots Capped at 50 DMG · Non-Lethal)'}
            </span>
            <span className="text-slate-600">·</span>
            <span>
              Scope: {hud.zoomLevel === 1 ? '1x Hip' : `${hud.zoomLevel}x Active`}
            </span>
          </div>

          {hud.outsideStorm && (
            <div className="bg-rose-950/95 border border-rose-500/60 text-rose-200 px-4 py-1.5 rounded-lg text-xs font-semibold">
              Outside Safe Zone — Taking {hud.storm.damagePerSecond} Storm
              DMG/sec! Move Inward!
            </div>
          )}
        </div>

        {/* Top-Right: Audio / Pause Actions + Kill Feed */}
        <div className="flex flex-col items-end gap-2">
          <div className="flex items-center gap-2 pointer-events-auto">
            <button
              type="button"
              onClick={onToggleMute}
              className="p-2.5 bg-slate-950/90 border border-slate-800 rounded-lg text-slate-300 hover:text-white hover:border-slate-700 transition-colors"
              title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
            >
              {isMuted ? (
                <VolumeX className="w-4 h-4" />
              ) : (
                <Volume2 className="w-4 h-4" />
              )}
            </button>
            <button
              type="button"
              onClick={onPause}
              className="px-3.5 py-2 bg-slate-950/90 border border-slate-800 rounded-lg text-xs font-medium text-slate-200 hover:text-white hover:border-slate-700 transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0"
            >
              <Pause className="w-3.5 h-3.5" />
              <span>Pause (Esc)</span>
            </button>
          </div>

          {hud.killFeed.length > 0 && (
            <div className="flex flex-col items-end gap-1 mt-1">
              {hud.killFeed.slice(0, 4).map((entry) => (
                <div
                  key={entry.id}
                  className="bg-slate-950/85 border border-slate-800/90 rounded-lg px-3 py-1 text-xs text-slate-300 flex items-center gap-1.5"
                >
                  <span className="font-semibold text-rose-400">
                    {entry.killerName}
                  </span>
                  <span className="text-slate-500">[{entry.weaponName}]</span>
                  <span className="font-semibold text-slate-100">
                    {entry.victimName}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Contextual World Prompts Below Crosshair (Plane Jump, Parachute Open, Loot [F], Vending [F], Shrine [F]) */}
      <div className="relative z-20 flex flex-col items-center justify-end gap-2 mt-auto mb-4">
        {/* Free Fire Dropship Plane Jump / Freefall / Parachute Altimeter & Action Banner */}
        {hud.dropPhase !== 'landed' && (
          <div className="pointer-events-auto bg-slate-950/95 border-2 border-amber-400/90 rounded-2xl px-6 py-4 max-w-md w-full shadow-2xl flex flex-col items-center text-center gap-2.5">
            <div className="flex items-center justify-between w-full text-xs font-mono">
              <span className="flex items-center gap-1.5 text-amber-300 font-bold uppercase">
                {hud.dropPhase === 'in_plane' ? (
                  <>
                    <Plane className="w-4 h-4 text-amber-400" />
                    <span>Bermuda Cargo Dropship</span>
                  </>
                ) : hud.dropPhase === 'freefall' ? (
                  <>
                    <Wind className="w-4 h-4 text-sky-400" />
                    <span>Skydiving Freefall</span>
                  </>
                ) : (
                  <>
                    <Wind className="w-4 h-4 text-emerald-400" />
                    <span>Parachute Deployed</span>
                  </>
                )}
              </span>
              <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-100 font-bold">
                ALTITUDE: {hud.altitudeMeters}m
              </span>
            </div>

            {/* Altimeter Progress Bar */}
            <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
              <div
                className={`h-full transition-all duration-150 ${
                  hud.dropPhase === 'parachute'
                    ? 'bg-emerald-400'
                    : 'bg-amber-400'
                }`}
                style={{
                  width: `${Math.max(4, Math.min(100, (hud.altitudeMeters / 82) * 100))}%`,
                }}
              />
            </div>

            {hud.dropPhase === 'in_plane' ? (
              <button
                type="button"
                onClick={() => actionRef.current?.ejectOrDeployParachute()}
                className="w-full py-2.5 px-5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs md:text-sm uppercase tracking-wider rounded-xl shadow-lg transition-colors flex items-center justify-center gap-2"
              >
                <Plane className="w-4 h-4" />
                <span>EJECT / JUMP FROM PLANE [SPACE / F]</span>
              </button>
            ) : hud.dropPhase === 'freefall' ? (
              <button
                type="button"
                onClick={() => actionRef.current?.ejectOrDeployParachute()}
                className="w-full py-2.5 px-5 bg-sky-500 hover:bg-sky-400 text-slate-950 font-black text-xs md:text-sm uppercase tracking-wider rounded-xl shadow-lg transition-colors flex items-center justify-center gap-2"
              >
                <Wind className="w-4 h-4" />
                <span>OPEN PARACHUTE [SPACE / F]</span>
              </button>
            ) : (
              <div className="text-xs font-semibold text-emerald-300">
                Steer with WASD & Mouse to glide to your landing spot — weapons
                unlock upon landing!
              </div>
            )}
          </div>
        )}

        {/* Ground Loot Pickup Prompt (Press F to Loot) */}
        {hud.nearbyLoot && (
          <button
            type="button"
            onClick={() => actionRef.current?.pickupNearbyLoot()}
            className="pointer-events-auto bg-slate-950/95 border-2 border-amber-400 hover:bg-slate-900 px-5 py-2 rounded-xl text-xs font-bold text-amber-300 shadow-2xl transition-colors"
          >
            Press [F] to Loot{' '}
            {hud.nearbyLoot.kind === 'weapon'
              ? `${hud.nearbyLoot.weaponSpec?.name} (${hud.nearbyLoot.weaponSpec?.scopeZoom}x Scope)`
              : hud.nearbyLoot.kind === 'medkit'
                ? 'Emergency Medkit (+65 HP)'
                : 'Shield Heart (+35 Shield)'}
          </button>
        )}

        {/* Free Vending Machine Interactive Panel */}
        {hud.nearbyVending && (
          <div className="pointer-events-auto bg-slate-950/95 border border-rose-500/60 rounded-xl p-4 max-w-md w-full shadow-2xl">
            <div className="flex items-center justify-between gap-2 mb-2.5">
              <span className="text-xs font-semibold text-rose-400">
                {hud.nearbyVending.name} — Free Items Available
              </span>
              <span className="text-[11px] text-slate-400 font-mono">
                Press F or Click
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => actionRef.current?.claimVendingWeapon()}
                className="px-3 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-lg text-left transition-colors"
              >
                <div className="text-[11px] font-mono text-amber-400">
                  Free Weapon
                </div>
                <div className="text-xs font-semibold text-slate-100 truncate">
                  High-Tier Gun
                </div>
              </button>
              <button
                type="button"
                onClick={() => actionRef.current?.claimVendingMedkit()}
                className="px-3 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-lg text-left transition-colors"
              >
                <div className="text-[11px] font-mono text-emerald-400">
                  Free Medkit
                </div>
                <div className="text-xs font-semibold text-slate-100 truncate">
                  +90 HP & Shield
                </div>
              </button>
              <button
                type="button"
                onClick={() => actionRef.current?.summonVendingPartnerBot()}
                className="px-3 py-2 bg-rose-950/80 hover:bg-rose-900/80 border border-rose-500/60 rounded-lg text-left transition-colors"
              >
                <div className="text-[11px] font-mono text-rose-300">
                  [F] Free Partner
                </div>
                <div className="text-xs font-semibold text-white truncate">
                  {canSummonGirl ? 'Cute Girl (50 DMG)' : 'Dog Bot (50 DMG)'}
                </div>
              </button>
            </div>
          </div>
        )}

        {/* Mid-Match Compatibility Shrine Prompt */}
        {hud.nearbyShrine && (
          <div className="pointer-events-auto bg-slate-950/95 border border-sky-500/60 rounded-xl p-4 max-w-md w-full shadow-2xl">
            <div className="text-xs font-semibold text-sky-400 mb-1">
              {hud.nearbyShrine.name}
            </div>
            <p className="text-xs text-slate-300 mb-3">
              {hud.nearbyShrine.prompt}
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => actionRef.current?.chooseShrineOption('A')}
                className="px-3 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-lg text-xs font-medium text-slate-100 text-left transition-colors"
              >
                [F] {hud.nearbyShrine.optionA.label}
              </button>
              <button
                type="button"
                onClick={() => actionRef.current?.chooseShrineOption('B')}
                className="px-3 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-lg text-xs font-medium text-slate-100 text-left transition-colors"
              >
                {hud.nearbyShrine.optionB.label}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Status Bar: Controls & Sprint Status · 200 Max HP · 2-Weapon Slots & Helper Bot */}
      <div className="relative z-20 flex flex-col lg:flex-row items-center justify-between gap-3">
        {/* Left: Synergy Buff & Keybind Controls */}
        <div className="bg-slate-950/90 border border-slate-800 rounded-xl px-4 py-2.5 flex items-center gap-3 text-xs text-slate-300">
          <Zap
            className={`w-4 h-4 shrink-0 ${
              hud.isSprinting ? 'text-amber-400' : 'text-rose-400'
            }`}
          />
          <div>
            <div className="font-semibold text-slate-100 flex items-center gap-2">
              <span>{profile.displayName || 'Mohammad'}</span>
              <span className="text-slate-600">·</span>
              <span className="text-rose-400">{hud.activeBuff.name}</span>
              {hud.isSprinting && (
                <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px] font-mono">
                  SPRINTING
                </span>
              )}
            </div>
            <div className="text-[11px] text-slate-400 font-mono">
              Space Jump · Shift Sprint · F Loot · LMB Fire · RMB Scope (2x/4x) · Scroll Switch Gun
            </div>
          </div>
        </div>

        {/* Center: 200 Max HP & Shield Cluster */}
        <div className="bg-slate-950/95 border border-slate-800 rounded-xl px-5 py-3 w-full max-w-md flex flex-col gap-2">
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5 font-semibold text-emerald-400">
              <Heart className="w-4 h-4" />
              <span>HP</span>
            </span>
            <span className="font-mono tabular-nums font-bold text-slate-100 text-sm">
              {hud.hp} / {hud.maxHp}
            </span>
          </div>
          <div className="w-full h-3 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
            <div
              className="h-full bg-emerald-500 transition-all duration-150"
              style={{ width: `${hpPercent}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-xs mt-0.5">
            <span className="flex items-center gap-1.5 font-medium text-sky-400">
              <Shield className="w-3.5 h-3.5" />
              <span>Shield</span>
            </span>
            <span className="font-mono tabular-nums text-slate-300">
              {hud.shield} / {hud.maxShield}
            </span>
          </div>
          <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden">
            <div
              className="h-full bg-sky-400 transition-all duration-150"
              style={{ width: `${shieldPercent}%` }}
            />
          </div>
        </div>

        {/* Right: Dual Weapon Slots (Scroll Wheel / 1 & 2) + Helper Partner Bot */}
        <div className="bg-slate-950/90 border border-slate-800 rounded-xl px-3.5 py-2 flex items-center gap-3 text-xs pointer-events-auto">
          <div className="flex items-center gap-2">
            {[0, 1].map((slotIdx) => {
              const slotWeapon = hud.weapons[slotIdx as 0 | 1];
              const isSelected = hud.activeWeaponIndex === slotIdx;
              return (
                <button
                  key={slotIdx}
                  type="button"
                  onClick={() =>
                    actionRef.current?.switchWeaponSlot(slotIdx as 0 | 1)
                  }
                  className={`px-3 py-1.5 rounded-lg border text-left transition-colors min-w-[135px] ${
                    isSelected
                      ? 'bg-rose-950/60 border-rose-500 text-white'
                      : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between text-[10px] font-mono">
                    <span className="text-slate-400">SLOT {slotIdx + 1}</span>
                    {slotWeapon && (
                      <span className="px-1.5 py-0.2 rounded bg-slate-800 text-sky-300">
                        {slotWeapon.scopeZoom}x RMB
                      </span>
                    )}
                  </div>
                  {slotWeapon ? (
                    <>
                      <div
                        className={`font-bold text-xs truncate mt-0.5 ${slotWeapon.badgeColor}`}
                      >
                        {slotWeapon.name}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono tabular-nums flex items-center gap-1">
                        <Crosshair className="w-2.5 h-2.5 text-rose-400" />
                        <span>
                          {slotWeapon.damage * slotWeapon.pellets} DMG
                        </span>
                      </div>
                    </>
                  ) : (
                    <div className="text-xs text-slate-500 py-1">Empty Slot</div>
                  )}
                </button>
              );
            })}
          </div>

          <span className="text-slate-700" aria-hidden="true">
            |
          </span>

          <div className="flex items-center gap-2 pr-1">
            <Sparkles className="w-4 h-4 text-rose-400 shrink-0" />
            <div>
              <div className="text-slate-400 text-[10px]">Partner Bot</div>
              {hud.companion ? (
                <>
                  <div className="font-bold text-slate-100 truncate max-w-[110px]">
                    {hud.companion.displayName}
                  </div>
                  <div className="text-[10px] text-rose-400 font-mono tabular-nums">
                    Max {MAX_COMPANION_DAMAGE} DMG
                  </div>
                </>
              ) : (
                <>
                  <div className="font-semibold text-amber-300">
                    Not Summoned
                  </div>
                  <div className="text-[10px] text-slate-400">
                    Press [F] at Vend
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Virtual Analog Joystick (Touch + Live Keyboard WASD) & On-Screen Control Buttons */}
      <TouchControlsHud hud={hud} actionRef={actionRef} />
    </div>
  );
}
