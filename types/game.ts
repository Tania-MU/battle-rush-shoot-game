export enum GameScreenState {
  TITLE = 'TITLE',
  MATCHMAKING = 'MATCHMAKING',
  PLAYING = 'PLAYING',
  PAUSED = 'PAUSED',
  SUMMARY = 'SUMMARY',
  TOP_THREE_REWARD = 'TOP_THREE_REWARD',
}

export enum HubTab {
  PLAY = 'PLAY',
  QUIZ = 'QUIZ',
  PROFILE = 'PROFILE',
  LEADERBOARD = 'LEADERBOARD',
  CHAT = 'CHAT',
}

export type CompanionType = 'girl' | 'dog';

export type GirlPersonaId = 'aiko' | 'hana' | 'miku';

export interface GirlPersonaSpec {
  id: GirlPersonaId;
  name: string;
  title: string;
  primaryColor: string;
  secondaryColor: string;
  hairColor: string;
  bio: string;
  dateOpeningLine: string;
  dateResponses: {
    prompt: string;
    choices: {
      text: string;
      reply: string;
      affinityBonus: number;
    }[];
  }[];
}

export type WeaponId =
  | 'starter_pistol'
  | 'pulse_smg'
  | 'crimson_ar'
  | 'heartbreaker_shotgun'
  | 'cupid_sniper';

export interface WeaponSpec {
  id: WeaponId;
  name: string;
  rarity: 'Common' | 'Rare' | 'Epic' | 'Legendary';
  damage: number;
  fireRateSec: number;
  range: number;
  projectileSpeed: number;
  pellets: number;
  spreadRad: number;
  scopeZoom: 2 | 4; // 2x default zoom on RMB, 4x for snipers
  colorHex: number;
  badgeColor: string;
}

export type SynergyBuffId =
  | 'heartbeat_overdrive'
  | 'companion_sync'
  | 'shielded_romance'
  | 'vampire_charm';

export interface SynergyBuffSpec {
  id: SynergyBuffId;
  name: string;
  description: string;
  speedMultiplier: number;
  damageMultiplier: number;
  companionCooldownMultiplier: number;
  lifestealRatio: number;
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: {
    label: string;
    trait: string;
    buffId: SynergyBuffId;
  }[];
}

export interface PlayerProfile {
  id: string;
  displayName: string;
  avatarColor: string;
  visorColor: string;
  outfitStyle: 'striker' | 'valkyrie' | 'phantom';
  titleBadge: string;
  quizCompleted: boolean;
  activeSynergyBuff: SynergyBuffId;
  compatibilityScore: number;
  unlockedCuteGirl: boolean;
  selectedCompanion: CompanionType;
  selectedGirlPersona: GirlPersonaId;
  matchesPlayed: number;
  wins: number;
  top3Finishes: number;
  totalKills: number;
  totalDamage: number;
  bestSurvivalSeconds: number;
}

export interface CompanionState {
  ownerId: string;
  type: CompanionType;
  personaId: GirlPersonaId;
  displayName: string;
  x: number;
  y: number;
  z: number;
  rotationY: number;
  pitch: number;
  hp: number;
  maxHp: number;
  maxDamage: number; // Strictly 50 max damage
  damageDealtTotal: number;
  lastAttackTime: number;
  targetId: string | null;
}

export interface ContenderState {
  id: string;
  name: string;
  isBot: boolean;
  isLocalPlayer: boolean;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number; // Jump vertical velocity
  vz: number;
  isGrounded: boolean;
  isSprinting: boolean;
  rotationY: number;
  pitch: number;
  hp: number;
  maxHp: number; // 200 Max HP
  shield: number;
  maxShield: number;
  weapons: [WeaponSpec, WeaponSpec | null]; // Carry up to 2 weapons
  activeWeaponIndex: 0 | 1;
  weapon: WeaponSpec;
  kills: number;
  damageDealt: number;
  botTotalDamageDealt: number; // Bots can deal at most 50 total damage
  alive: boolean;
  spawnedAt: number;
  eliminatedAt: number | null;
  placement: number | null;
  avatarColor: string;
  visorColor: string;
  outfitStyle: 'striker' | 'valkyrie' | 'phantom';
  activeBuff: SynergyBuffId;
  unlockedCuteGirl: boolean;
  companion: CompanionState | null;
  lastShotTime: number;
  aiTargetX?: number;
  aiTargetZ?: number;
  aiStateTimer?: number;
  usedVendingIds: string[];
}

export interface WorldLootItem {
  id: string;
  kind: 'weapon' | 'medkit' | 'shield_heart';
  weaponSpec?: WeaponSpec;
  healAmount?: number;
  shieldAmount?: number;
  x: number;
  y: number;
  z: number;
  collected: boolean;
}

export interface VendingMachineStation {
  id: string;
  name: string;
  x: number;
  y: number;
  z: number;
  rotationY: number;
}

export interface CompatibilityShrineStation {
  id: string;
  name: string;
  prompt: string;
  optionA: { label: string; buffId: SynergyBuffId };
  optionB: { label: string; buffId: SynergyBuffId };
  x: number;
  y: number;
  z: number;
  activatedByPlayer: boolean;
}

export interface StormPhaseState {
  phase: number;
  maxPhases: number;
  currentRadius: number;
  targetRadius: number;
  centerX: number;
  centerZ: number;
  timeRemainingSec: number;
  damagePerSecond: number;
  isShrinking: boolean;
}

export interface ProjectileEntity {
  id: string;
  ownerId: string;
  fromBotOrCompanion: boolean;
  fromCompanion: boolean;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  damage: number;
  colorHex: number;
  distanceTraveled: number;
  maxRange: number;
}

export interface KillFeedEntry {
  id: string;
  killerName: string;
  victimName: string;
  weaponName: string;
  byCompanion?: CompanionType;
  timestamp: number;
}

export interface KillBannerAnnouncement {
  id: string;
  victimName: string;
  weaponName: string;
  killStreakNumber: number;
  headline: string; // e.g., "FIRST BLOOD", "DOUBLE KILL", "TRIPLE KILL", "RAMPAGE"
  timestamp: number;
}

export interface MatchSummaryStats {
  matchId: string;
  placement: number;
  totalPlayers: number; // 10
  kills: number;
  damageDealt: number;
  companionDamageDealt: number;
  survivalTimeSec: number;
  weaponsLooted: number;
  vendingItemsClaimed: number;
  compatibilityBonus: number;
  qualifiedForTop3Reward: boolean;
  companionUsed: CompanionType | null;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderBadge: string;
  text: string;
  timestamp: number;
  isSystem?: boolean;
}

export interface LeaderboardEntry {
  playerId: string;
  displayName: string;
  titleBadge: string;
  wins: number;
  top3Finishes: number;
  kills: number;
  damageDealt: number;
  compatibilityScore: number;
  unlockedCuteGirl: boolean;
  updatedAt: number;
}

export interface CombatHudSnapshot {
  hp: number;
  maxHp: number;
  shield: number;
  maxShield: number;
  botDamageTakenByPlayer: number;
  maxBotDamageAllowed: number; // 50
  weapon: WeaponSpec;
  weapons: [WeaponSpec, WeaponSpec | null];
  activeWeaponIndex: 0 | 1;
  aliveCount: number;
  totalContenders: number;
  kills: number;
  damageDealt: number;
  companion: CompanionState | null;
  storm: StormPhaseState;
  nearbyVending: VendingMachineStation | null;
  nearbyShrine: CompatibilityShrineStation | null;
  nearbyLoot: WorldLootItem | null;
  activeBuff: SynergyBuffSpec;
  outsideStorm: boolean;
  killFeed: KillFeedEntry[];
  killBanner: KillBannerAnnouncement | null;
  isPointerLocked: boolean;
  isAds: boolean;
  isSprinting: boolean;
  zoomLevel: 1 | 2 | 4;
  pitchDeg: number;
  currentZoneName: string;
  playerPos: { x: number; z: number; rotationY: number };
  contenderRadar: {
    id: string;
    x: number;
    z: number;
    isLocal: boolean;
    alive: boolean;
  }[];
  vendingRadar: { id: string; x: number; z: number }[];
}
