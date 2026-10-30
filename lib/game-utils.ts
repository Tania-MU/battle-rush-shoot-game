import { MAX_COMPANION_DAMAGE, MAX_PLAYER_HP, SYNERGY_BUFFS } from '@/lib/constants';
import { SynergyBuffId, SynergyBuffSpec } from '@/types/game';

export function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

export function lerp(start: number, end: number, alpha: number): number {
  return start + (end - start) * clamp(alpha, 0, 1);
}

export function damp(current: number, target: number, lambda: number, dt: number): number {
  return lerp(current, target, 1 - Math.exp(-lambda * dt));
}

export function distance2D(x1: number, z1: number, x2: number, z2: number): number {
  const dx = x2 - x1;
  const dz = z2 - z1;
  return Math.sqrt(dx * dx + dz * dz);
}

export function distanceSquared2D(x1: number, z1: number, x2: number, z2: number): number {
  const dx = x2 - x1;
  const dz = z2 - z1;
  return dx * dx + dz * dz;
}

/**
 * Deterministic terrain height function so every actor, prop, vending machine,
 * and tree sits flush on the ground at groundHeightAt(x, z).
 */
export function groundHeightAt(x: number, z: number): number {
  const distFromOrigin = Math.sqrt(x * x + z * z);
  // Keep central arena relatively flat for crisp third-person combat, with gentle rolling dunes
  const gentleWave =
    Math.sin(x * 0.035) * Math.cos(z * 0.035) * 0.45 +
    Math.sin(x * 0.08 + z * 0.06) * 0.15;
  // Flatten near vending machine / shrine coordinates
  const flatFactor = clamp(distFromOrigin / 25, 0.25, 1.0);
  return Math.max(0, gentleWave * flatFactor);
}

/**
 * Enforces the strict rule that any helper bot (Cute Virtual Girl or Dog Bot)
 * can deal at most 50 damage per hit/burst.
 */
export function capCompanionDamage(rawDamage: number): number {
  return clamp(Math.round(rawDamage), 1, MAX_COMPANION_DAMAGE);
}

/**
 * Clamps player or contender health strictly between 0 and 200 Max HP.
 */
export function clampPlayerHp(hp: number): number {
  return clamp(Math.round(hp), 0, MAX_PLAYER_HP);
}

export function formatTimeMMSS(totalSeconds: number): string {
  const safeSec = Math.max(0, Math.floor(totalSeconds));
  const mins = Math.floor(safeSec / 60);
  const secs = safeSec % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export function formatNumber(num: number): string {
  return Math.round(num).toLocaleString('en-US');
}

export function generateId(prefix = 'id'): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 7)}`;
}

export function getSynergyBuffSpec(buffId: SynergyBuffId): SynergyBuffSpec {
  return SYNERGY_BUFFS[buffId] || SYNERGY_BUFFS.companion_sync;
}

export function getOrdinalPlacement(rank: number): string {
  if (rank === 1) return '1st';
  if (rank === 2) return '2nd';
  if (rank === 3) return '3rd';
  return `${rank}th`;
}
