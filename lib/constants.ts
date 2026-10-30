import {
  CompatibilityShrineStation,
  GirlPersonaId,
  GirlPersonaSpec,
  QuizQuestion,
  SynergyBuffId,
  SynergyBuffSpec,
  VendingMachineStation,
  WeaponId,
  WeaponSpec,
} from '@/types/game';

export const MAX_PLAYER_HP = 200;
export const MAX_PLAYER_SHIELD = 50;
export const MAX_MATCH_CONTENDERS = 10;
export const MAX_COMPANION_DAMAGE = 50; // Strict 50 Max Damage cap for all bots
export const ARENA_RADIUS = 135;

export const WEAPONS_CATALOG: Record<WeaponId, WeaponSpec> = {
  starter_pistol: {
    id: 'starter_pistol',
    name: 'G18 Tactical Pistol',
    rarity: 'Common',
    damage: 28,
    fireRateSec: 0.3,
    range: 72,
    projectileSpeed: 120,
    pellets: 1,
    spreadRad: 0.008,
    scopeZoom: 2,
    colorHex: 0x94a3b8,
    badgeColor: 'text-slate-300',
  },
  pulse_smg: {
    id: 'pulse_smg',
    name: 'MP40 Cobra SMG',
    rarity: 'Rare',
    damage: 24,
    fireRateSec: 0.12,
    range: 68,
    projectileSpeed: 135,
    pellets: 1,
    spreadRad: 0.018,
    scopeZoom: 2,
    colorHex: 0x38bdf8,
    badgeColor: 'text-sky-400',
  },
  crimson_ar: {
    id: 'crimson_ar',
    name: 'AK47 Dragon Flame',
    rarity: 'Epic',
    damage: 38,
    fireRateSec: 0.18,
    range: 95,
    projectileSpeed: 150,
    pellets: 1,
    spreadRad: 0.009,
    scopeZoom: 2,
    colorHex: 0xf43f5e,
    badgeColor: 'text-rose-400',
  },
  heartbreaker_shotgun: {
    id: 'heartbreaker_shotgun',
    name: 'M1887 One-Punch',
    rarity: 'Epic',
    damage: 22,
    fireRateSec: 0.58,
    range: 46,
    projectileSpeed: 125,
    pellets: 5,
    spreadRad: 0.055,
    scopeZoom: 2,
    colorHex: 0xa855f7,
    badgeColor: 'text-purple-400',
  },
  cupid_sniper: {
    id: 'cupid_sniper',
    name: 'AWM Heartpiercer (4x)',
    rarity: 'Legendary',
    damage: 95,
    fireRateSec: 0.85,
    range: 145,
    projectileSpeed: 195,
    pellets: 1,
    spreadRad: 0.001,
    scopeZoom: 4, // Only Sniper zooms 4x!
    colorHex: 0xf59e0b,
    badgeColor: 'text-amber-400',
  },
};

export const LOOTABLE_WEAPON_IDS: WeaponId[] = [
  'pulse_smg',
  'crimson_ar',
  'heartbreaker_shotgun',
  'cupid_sniper',
];

export const SYNERGY_BUFFS: Record<SynergyBuffId, SynergyBuffSpec> = {
  heartbeat_overdrive: {
    id: 'heartbeat_overdrive',
    name: 'Heartbeat Overdrive',
    description: '+18% Sprint Speed & agile strafing in combat encounters',
    speedMultiplier: 1.18,
    damageMultiplier: 1.05,
    companionCooldownMultiplier: 1.0,
    lifestealRatio: 0,
  },
  companion_sync: {
    id: 'companion_sync',
    name: 'Soulmate Link',
    description: 'Partner Bot attacks 30% faster and locks on from longer range',
    speedMultiplier: 1.05,
    damageMultiplier: 1.05,
    companionCooldownMultiplier: 0.7,
    lifestealRatio: 0.05,
  },
  shielded_romance: {
    id: 'shielded_romance',
    name: 'Devotion Aegis',
    description: '+12% Weapon Damage & bonus shield regeneration on eliminations',
    speedMultiplier: 1.06,
    damageMultiplier: 1.12,
    companionCooldownMultiplier: 0.9,
    lifestealRatio: 0.08,
  },
  vampire_charm: {
    id: 'vampire_charm',
    name: 'Crimson Allure',
    description: 'Restores 15% of damage dealt as instant HP up to 200 Max HP',
    speedMultiplier: 1.08,
    damageMultiplier: 1.08,
    companionCooldownMultiplier: 0.85,
    lifestealRatio: 0.15,
  },
};

export const CUTE_GIRL_PERSONAS: Record<GirlPersonaId, GirlPersonaSpec> = {
  aiko: {
    id: 'aiko',
    name: 'Aiko Starlight',
    title: 'Cyber-Pop Valkyrie',
    primaryColor: '#F43F5E',
    secondaryColor: '#FDA4AF',
    hairColor: '#FB7185',
    bio: 'Energetic twin-tail sharpshooter who cheers your every elimination and blasts rivals with a 50-damage Starlight Beam.',
    dateOpeningLine:
      'We actually survived the final storm circle together! Tell me, what was your favorite moment out there in the arena?',
    dateResponses: [
      {
        prompt: 'What is your ideal post-victory celebration date?',
        choices: [
          {
            text: 'Rooftop neon ramen overlooking the island',
            reply:
              'Yes! Hot ramen after dodging sniper fire sounds like absolute heaven!',
            affinityBonus: 35,
          },
          {
            text: 'Practicing duo trick-shots at the firing range',
            reply:
              'Ooh, competitive even on a date! No wonder we hit Top 3 so effortlessly.',
            affinityBonus: 30,
          },
          {
            text: 'Sunset walk along the quiet coastal cliffs',
            reply:
              'When the storm wall fades, the beach here really is breathtaking with you.',
            affinityBonus: 40,
          },
        ],
      },
      {
        prompt: 'When the storm circle closes in, what is your combat philosophy?',
        choices: [
          {
            text: 'Protect my partner first and push together',
            reply: 'My heart just skipped a beat—I will always watch your back too!',
            affinityBonus: 45,
          },
          {
            text: 'Rush the nearest vending machine for max gear',
            reply: 'Smart tactician! Free loot plus my 50-damage beam is unbeatable.',
            affinityBonus: 35,
          },
        ],
      },
    ],
  },
  hana: {
    id: 'hana',
    name: 'Hana Kurenai',
    title: 'Crimson Blossom Striker',
    primaryColor: '#EC4899',
    secondaryColor: '#F9A8D4',
    hairColor: '#312E81',
    bio: 'Graceful tactical duelist who flanks aggressive opponents and unleashes a 50-damage Sakura Pulse.',
    dateOpeningLine:
      'Your footwork in that final circle was impressive. Not everyone earns a Top 3 podium spot alongside me.',
    dateResponses: [
      {
        prompt: 'How do you stay calm when 10 contenders are fighting at once?',
        choices: [
          {
            text: 'Knowing you have my six keeps me focused',
            reply: 'Smooth answer... and completely true. Nobody gets past us.',
            affinityBonus: 45,
          },
          {
            text: 'Pure instinct and fast reflexes',
            reply: 'I noticed! Your aim under pressure is seriously attractive.',
            affinityBonus: 35,
          },
        ],
      },
      {
        prompt: 'Pick our next destination after the Victory Lounge:',
        choices: [
          {
            text: 'Lantern festival in the Sakura district',
            reply: 'You remembered my favorite place. It is officially a date.',
            affinityBonus: 45,
          },
          {
            text: 'VIP sky-lounge overlooking the next match',
            reply: 'Watching the arena from above with a cold drink sounds wonderful.',
            affinityBonus: 35,
          },
        ],
      },
    ],
  },
  miku: {
    id: 'miku',
    name: 'Miku Celestia',
    title: 'Holo-Harmonic Guardian',
    primaryColor: '#06B6D4',
    secondaryColor: '#67E8F9',
    hairColor: '#22D3EE',
    bio: 'Futuristic synth-guardian who harmonizes with your compatibility wavelength and delivers 50-damage Harmonic Waves.',
    dateOpeningLine:
      'Compatibility synchronization at 99.8%! Our teamwork in the arena was mathematically and romantically flawless.',
    dateResponses: [
      {
        prompt: 'What drew you to summon me from the Love-Vend terminal?',
        choices: [
          {
            text: 'Your radiant energy and unbeatable combat sync',
            reply: 'Aww, you are overloading my heart-core sensors in the best way!',
            affinityBonus: 45,
          },
          {
            text: 'That 50-damage harmonic cannon is clutch',
            reply: 'Haha, honest and practical! I love delivering clutch support for you.',
            affinityBonus: 35,
          },
        ],
      },
      {
        prompt: 'What song should play on our victory broadcast?',
        choices: [
          {
            text: 'High-tempo synthwave duet',
            reply: 'Turning up the volume! Every contender on the island will hear us.',
            affinityBonus: 40,
          },
          {
            text: 'Starlight acoustic melody for two',
            reply: 'Just for the two of us... I will save that track in my memory forever.',
            affinityBonus: 45,
          },
        ],
      },
    ],
  },
};

export const COMPATIBILITY_QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    id: 'q1',
    question: 'In a high-stakes battle royale date, how do you make a first impression?',
    options: [
      {
        label: 'Charge straight into the hot-drop zone with confidence',
        trait: 'Fearless Romantic',
        buffId: 'heartbeat_overdrive',
      },
      {
        label: 'Coordinate closely with my partner bot for synchronized strikes',
        trait: 'Loyal Soulmate',
        buffId: 'companion_sync',
      },
      {
        label: 'Secure high ground and protect our shared shield reserves',
        trait: 'Guardian Heart',
        buffId: 'shielded_romance',
      },
    ],
  },
  {
    id: 'q2',
    question: 'You find a Free Vending Machine while the storm is closing. First pick?',
    options: [
      {
        label: 'Summon my Partner Bot immediately so we never fight alone',
        trait: 'Devoted Duo',
        buffId: 'companion_sync',
      },
      {
        label: 'Grab a Legendary weapon and hunt the remaining contenders',
        trait: 'Crimson Hunter',
        buffId: 'vampire_charm',
      },
      {
        label: 'Stock up on emergency medkits to keep HP at 200',
        trait: 'Unbreakable Survivor',
        buffId: 'shielded_romance',
      },
    ],
  },
  {
    id: 'q3',
    question: 'What defines your dream Top 3 Victory Date?',
    options: [
      {
        label: 'Adrenaline-fueled sunset adventure after clinching #1',
        trait: 'Electric Spark',
        buffId: 'heartbeat_overdrive',
      },
      {
        label: 'Deep heart-to-heart conversation in the VIP Date Lounge',
        trait: 'True Harmony',
        buffId: 'vampire_charm',
      },
    ],
  },
];

export const VENDING_MACHINES: VendingMachineStation[] = [
  { id: 'vm_center', name: 'Bimasakti Love-Vend', x: 14, y: 0, z: -12, rotationY: 0.4 },
  { id: 'vm_north', name: 'Clock Tower Love-Vend', x: -38, y: 0, z: -52, rotationY: -0.6 },
  { id: 'vm_east', name: 'Factory Love-Vend', x: 54, y: 0, z: 22, rotationY: -1.5 },
  { id: 'vm_south', name: 'Mars Electric Love-Vend', x: -16, y: 0, z: 58, rotationY: 2.8 },
  { id: 'vm_west', name: 'Pochinok Love-Vend', x: -62, y: 0, z: 12, rotationY: 1.2 },
];

export const COMPATIBILITY_SHRINES: CompatibilityShrineStation[] = [
  {
    id: 'shrine_alpha',
    name: 'Cupid Resonance Shrine',
    prompt: 'Compatibility Trial: Loyalty under fire or bold solo flank?',
    optionA: { label: 'Synchronize Partner Pulse', buffId: 'companion_sync' },
    optionB: { label: 'Overdrive Sprint Rush', buffId: 'heartbeat_overdrive' },
    x: -18,
    y: 0,
    z: -22,
    activatedByPlayer: false,
  },
  {
    id: 'shrine_beta',
    name: 'Crimson Harmony Altar',
    prompt: 'Compatibility Trial: Unbreakable shield or vampiric passion?',
    optionA: { label: 'Devotion Shield Aegis', buffId: 'shielded_romance' },
    optionB: { label: 'Crimson Lifesteal Charm', buffId: 'vampire_charm' },
    x: 32,
    y: 0,
    z: -30,
    activatedByPlayer: false,
  },
  {
    id: 'shrine_gamma',
    name: 'Starlight Vow Terminal',
    prompt: 'Compatibility Trial: Speed of love or soulmate firepower?',
    optionA: { label: 'Heartbeat Overdrive', buffId: 'heartbeat_overdrive' },
    optionB: { label: 'Soulmate Link (Fast Bot)', buffId: 'companion_sync' },
    x: 18,
    y: 0,
    z: 36,
    activatedByPlayer: false,
  },
];

export const STORM_PHASES = [
  { phase: 1, startRadius: 128, targetRadius: 92, durationSec: 45, damagePerSec: 4 },
  { phase: 2, startRadius: 92, targetRadius: 60, durationSec: 42, damagePerSec: 8 },
  { phase: 3, startRadius: 60, targetRadius: 32, durationSec: 40, damagePerSec: 14 },
  { phase: 4, startRadius: 32, targetRadius: 12, durationSec: 45, damagePerSec: 22 },
];

export const AI_CONTENDER_PROFILES = [
  { name: 'adam', color: '#38BDF8', visor: '#F43F5E', style: 'striker' as const, badge: 'Heart Hunter' },
  { name: 'kelly', color: '#A855F7', visor: '#22D3EE', style: 'valkyrie' as const, badge: 'Sprinter' },
  { name: 'alok', color: '#F97316', visor: '#FACC15', style: 'phantom' as const, badge: 'DJ Beat' },
  { name: 'hayato', color: '#EC4899', visor: '#67E8F9', style: 'valkyrie' as const, badge: 'Bushido' },
  { name: 'chrono', color: '#10B981', visor: '#F43F5E', style: 'striker' as const, badge: 'Time Turner' },
  { name: 'moco', color: '#6366F1', visor: '#F472B6', style: 'valkyrie' as const, badge: 'Hacker Eye' },
  { name: 'maxim', color: '#14B8A6', visor: '#FBBF24', style: 'phantom' as const, badge: 'Glutton' },
  { name: 'kla', color: '#EF4444', visor: '#38BDF8', style: 'striker' as const, badge: 'Muay Thai' },
  { name: 'andrew', color: '#F59E0B', visor: '#EC4899', style: 'valkyrie' as const, badge: 'Vest Specialist' },
];
