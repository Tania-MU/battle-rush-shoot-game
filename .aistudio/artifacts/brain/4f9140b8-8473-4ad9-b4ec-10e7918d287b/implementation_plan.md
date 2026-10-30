# Heartdrop Royale — 3D Multiplayer Dating Battle Royale

**Heartdrop Royale** is a fast-paced 3D third-person multiplayer battle royale and dating game where 10 solo contenders drop into a vibrant island arena, answer compatibility challenges for combat synergy buffs, scavenge weapons, visit free vending machines to summon a loyal helper bot (a **Tactical Dog** by default, or an unlockable **Cute Virtual Girl** won by placing in the Top 3), survive a shrinking storm, and compete for virtual dates and leaderboard glory.

---

## User Review & Critical Decisions

> [!IMPORTANT]
> The following core design and gameplay decisions incorporate your confirmed preferences from our clarification step:

- **Confirmed Camera & Rendering Style**: **3D Third-Person Arena View** powered by Three.js with smooth over-the-shoulder chase camera damping, physically based materials (`MeshStandardMaterial` / `MeshPhysicalMaterial`), studio environment lighting, and composite multi-part 3D character, companion, weapon, and landmark models.
- **Confirmed Dating & Compatibility Loop**: **Pre-Match Compatibility Quiz + Mid-Match Synergy Buffs + Post-Match Virtual Date Lounge**. Players calibrate their compatibility profile before dropping, activate mid-match Compatibility Shrines for combat buffs, and celebrate Top 3 victories in an interactive Virtual Date Lounge with their unlocked Cute Virtual Girl companion.
- **Confirmed Matchmaking & Lobby Population**: **10-Player Solo Matches with Instant Bot Backfill**. Matches are strictly solo (10 players max, no duos or squads). Live players in the matchmaking queue are paired together, and any remaining slots up to 10 are automatically filled by tactical AI contenders so matches launch without delay. Players summon their helper bot (Dog or Cute Virtual Girl) mid-match from free Vending Machines.

---

## 1. Overview & Core Concept

- **What It Does**: Combines the high-adrenaline scavenging, shrinking safe-zone storm, and third-person gunplay of *Free Fire* with a lighthearted competitive dating show. Every contender enters with **200 Max HP**, loots ground weapons across the map, visits **Free Vending Machines** for complimentary weapons, medkits, and helper bot summons, and battles until one champion remains.
- **Target Audience / Persona**: Action and battle-royale players who enjoy fast 3–5 minute 3D arena matches, companion summoning mechanics, expressive character customization, and social features like live chat and competitive leaderboards.
- **Key Value**: Delivers an immediately playable 10-contender 3D battle royale with meaningful progression—placing in the **Top 3** permanently unlocks the **Cute Virtual Girl** helper bot (who deals up to **50 damage** per engagement and accompanies the player in all future matches), while new contenders always have access to the loyal **Dog Helper Bot** (also capable of up to **50 damage**).

---

## 2. User Experience & Visual Design

### Key User Flows

1. **Live 3D Title Screen & Pre-Match Hub**:
   - Opens directly into a full-viewport 3D island camera pan behind a custom inline SVG title lockup (**HEARTDROP ROYALE**), showing the player's customized 3D contender alongside their active companion preview (Dog Bot or unlocked Cute Virtual Girl).
   - A sleek bottom control dock provides instant access to **Profile Customization** (outfit colors, emblem, title, active helper companion toggle), the **3-Question Compatibility Calibration Quiz** (granting a tailored passive buff), **Global Leaderboard**, and **Live Lobby Chat**.
   - Pressing **Enter / Space** or clicking **Drop Into Match (Solo 10P)** launches matchmaking, syncing active live players and filling remaining slots up to 10 contenders.
2. **Active 3D Third-Person Battle Royale (`Playing` State)**:
   - **200 HP & Shield Status**: Crisp perimeter HUD showing the player's **200 Max HP** bar, active weapon & ammo, companion status (Dog Bot or Cute Virtual Girl HP/cooldown), alive count (`10 Alive`), kill counter, and Shrinking Storm phase timer.
   - **Ground Loot & Free Vending Machines**: Weapons (Pulse SMG, Heartbreaker Shotgun, Cupid Sniper, Crimson AR) and Medkits spawn at randomized world coordinates with color-coded rarity beacons. Glowing **Love-Vend Machines** scattered across the island allow players to press `F` to claim **free weapons**, **free full-heal packs**, and **spawn their Helper Bot** at zero cost.
   - **Helper Bot Combat (Girl vs. Dog)**: Once summoned from a Vending Machine, the helper bot follows the player in 3D space, automatically acquires nearby enemy contenders within range, fires/strikes with clear visual projectiles, and inflicts up to **50 maximum damage** (capped strictly at 50 damage per burst/engagement cycle).
   - **Mid-Match Compatibility Shrines**: Interactive heart-holo terminals in the arena let players answer a rapid 1-click compatibility challenge mid-match to trigger temporary combat synergy buffs (e.g., +20% movement speed or rapid companion attack cadence).
   - **Shrinking Storm Wall**: A translucent crimson-magenta 3D energy cylinder encloses the safe zone. Between phases, the storm shrinks toward a new focal point, dealing continuous tick damage to contenders caught outside and forcing final showdowns.
3. **Animated Match Summary Screen**:
   - Upon elimination or `#1 Victory Royale`, an animated post-match summary modal reveals final placement (`#1`–`#10`), animated counters for **Kills**, **Damage Dealt**, **Survival Time**, and **Compatibility Sync Score**, plus leaderboard rank progression.
4. **Top 3 Reward Showcase & Virtual Date Lounge**:
   - Contenders who finish in the **Top 3 (`#1`, `#2`, or `#3`)** advance from the stats summary into an animated **Top 3 Reward Ceremony**.
   - **Cute Virtual Girl Unlock**: Unlocks the **Cute Virtual Girl** companion (with selectable persona styles such as *Aiko — Cyber Pop Idol*, *hana — Crimson Valkyrie*, or *Miku — Starlight Tactician*) who can be spawned from Vending Machines in every subsequent match to deal up to 50 damage.
   - **Virtual Date Lounge**: Top 3 winners can enter an interactive dialogue & compatibility date scene with their virtual companion to earn bonus affinity points and exclusive profile titles.

### Visual Identity & Theme

- **Aesthetic Direction**: High-craft **Vibrant Battle Royale Arena** (*Free Fire* / *Apex* / *Supervive* energy) blending sunlit tropical-neon arena architecture with sharp competitive HUD telemetry.
- **Color Palette & Mood**:
  - **Dominant Canvas (60%)**: Deep obsidian-indigo HUD surfaces (`#0B0F19` at 75% opacity, no backdrop-filter over active WebGL) paired with a bright golden-hour 3D skybox and lush coastal terrain.
  - **Structural Surfaces (30%)**: Gunmetal slate (`#1E293B`), crisp hairline borders (`rgba(255,255,255,0.12)`), and warm sand/stone arena geometry.
  - **Accent Budget (10%)**: Electric Crimson-Rose (`#F43F5E`) for compatibility/romance highlights, Solar Amber (`#F59E0B`) for legendary loot and Top 3 rewards, and Emerald Vitality (`#10B981`) for the 200 HP health bar.
- **Typography & Hierarchy**:
  - *Display / HUD Headings*: `Outfit` (Bold/ExtraBold, tight tracking, crisp geometric energy for victory banners, storm warnings, and section titles).
  - *Body & Chat UI*: `Plus Jakarta Sans` (Regular/SemiBold for high legibility across chat messages, quiz prompts, and profile customization).
  - *Telemetry & Numerals*: `JetBrains Mono` with `tabular-nums` for HP (`200 / 200`), damage popups (`-50`), storm countdowns (`01:15`), kill counters, and leaderboard tables.
- **Low-Occlusion Viewport Architecture**:
  - At least **85% of the 3D WebGL viewport** remains completely unobstructed during combat.
  - Pre-match and non-combat controls are consolidated into a **Collapsible Bottom Dock** with a `▾ Hide Controls (H)` toggle for full-screen immersion.

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: Hybrid Authoritative Room State + Instant AI Contender Backfill**
  - *Chosen Approach*: A pooled real-time state & chat synchronization service pairs active human players in a 10-player solo lobby and fills remaining slots up to 10 with autonomous 3D tactical AI contenders.
  - *Why*: Guarantees zero matchmaking deadlocks—whether 1 player or 10 players are online simultaneously, a full 10-player Free Fire-style match launches immediately while real-time chat and leaderboards stay live across all connected sessions.
- **Decision 2: Connection Pooling & Automatic Lifecycle Cleanup**
  - *Chosen Approach*: A singleton client/server connection pool manager caps concurrent transport channels, reuses active sessions across match restarts, and registers `pagehide` / `beforeunload` / visibility teardown hooks to disconnect cleanly when a user leaves the site.
  - *Why*: Directly satisfies strict connection pooling and automatic disconnect efficiency while keeping memory footprint minimal.
- **Decision 3: 100% Procedural 3D Composite Models & Web Audio Synth**
  - *Chosen Approach*: Every 3D entity (Player Contender, Cute Virtual Girl Companion, Tactical Dog Bot, Vending Machines, Compatibility Shrines, Loot Crates, Trees/Rocks) is constructed as a multi-part `THREE.Group` (3–12 distinct geometric sub-parts with varied roughness/metalness) paired with procedural Web Audio sound synthesis.
  - *Why*: Eliminates external `.glb` or `.mp3` 404 failures, ensures instant loading, and keeps 60fps performance across both hardware GPUs and software WebGL environments.

---

## 4. Technical Architecture & Data Strategy

### Architecture & Component Diagram

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                     HEARTDROP ROYALE — FULL-VIEWPORT SHELL                   │
├──────────────────────────────────────────────────────────────────────────────┤
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │                ISOLATED 3D WEBGL CANVAS (Three.js Engine)              │  │
│  │  ┌──────────────────┐  ┌────────────────────┐  ┌────────────────────┐  │  │
│  │  │ 3D Island Arena  │  │ 10 Solo Contenders │  │ Helper Bot System  │  │  │
│  │  │ • Terrain & Fog  │  │ • 200 Max HP       │  │ • Cute Girl (Top3) │  │  │
│  │  │ • Shrinking Storm│  │ • 3rd-Person Cam   │  │ • Dog Bot (Default)│  │  │
│  │  │ • Ground Weapons │  │ • Raycast Ballistic│  │ • Max 50 Damage Cap│  │  │
│  │  │ • Vending Machine│  │ • AI Pathfinding   │  │ • Auto-Target Assist│ │  │
│  │  └──────────────────┘  └────────────────────┘  └────────────────────┘  │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
│                                      ▲                                       │
│                         Mutable Ref Bridge (60fps, Zero React Re-render)     │
│                                      ▼                                       │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │                  LOW-OCCLUSION SEMANTIC DOM OVERLAYS                   │  │
│  │  ┌────────────────┐ ┌─────────────────┐ ┌────────────┐ ┌────────────┐  │  │
│  │  │ Title & Quiz   │ │ Combat Perimeter│ │ Animated   │ │ Top 3 Girl │  │  │
│  │  │ Collapsible    │ │ HUD (200 HP,    │ │ Match Stats│ │ Reward &   │  │  │
│  │  │ Bottom Dock    │ │ Weapon, Storm,  │ │ Summary    │ │ Virtual    │  │  │
│  │  │ (Profile/Chat) │ │ Vending Prompt) │ │ Modal      │ │ Date Lounge│  │  │
│  │  └────────────────┘ └─────────────────┘ └────────────┘ └────────────┘  │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
│                                      ▲                                       │
│                                      ▼                                       │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │         POOLED REAL-TIME SYNC, CHAT & LEADERBOARD API LAYER            │  │
│  │  • Bounded Connection Pool Manager (Auto-Disconnect on Leave/Unload)   │  │
│  │  • Indexed In-Memory + Persistent Store for Leaderboards, Chat & Saves │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────────────┘
```

### Data Model & State

- **PlayerProfile**: `id`, `displayName`, `avatarColor`, `visorColor`, `outfitStyle`, `compatibilityTraits` (quiz answers & active synergy badge), `unlockedCuteGirl` (boolean unlocked by placing Top 3), `selectedCompanion` (`'girl' | 'dog'`), `selectedGirlPersona` (`'aiko' | 'hana' | 'miku'`), `careerStats` (`matchesPlayed`, `wins`, `top3Finishes`, `totalKills`, `totalDamage`, `bestSurvivalSeconds`, `compatibilityScore`).
- **MatchEntityState**:
  - `Contender`: `id`, `name`, `isBot`, `position (x,y,z)`, `rotationY`, `hp (0..200)`, `maxHp (200)`, `shield (0..50)`, `equippedWeapon`, `kills`, `damageDealt`, `alive`, `eliminatedAt`, `activeBuff`, `companion` (`null | CompanionEntity`).
  - `CompanionEntity`: `ownerId`, `type ('girl' | 'dog')`, `personaName`, `position`, `hp (120)`, `maxDamageCap (50)`, `attackCooldown`, `targetEnemyId`.
  - `WorldLootItem`: `id`, `type ('weapon' | 'medkit' | 'shield')`, `weaponSpec`, `position`, `collected`.
  - `VendingMachine`: `id`, `position`, `cooldownPerPlayer`, dispense options (`Free Random/Upgraded Weapon`, `Free Emergency Medkit`, `Summon Helper Bot: Cute Girl / Dog`).
  - `StormState`: `phase (1..4)`, `currentRadius`, `targetRadius`, `center (x,z)`, `timeRemaining`, `damagePerSecond`.

### Interactive Component & State Mapping

- **Title Screen & Collapsible Bottom Dock**:
  - Switching tabs between **Play**, **Compatibility Quiz**, **Customize Profile**, **Leaderboard**, and **Live Chat** updates overlay panels smoothly while the 3D island and character turntable render continuously behind them.
  - Clicking **Collapse HUD (`H`)** slides the bottom dock out of view for unobstructed 3D inspection.
- **3D Arena & Vending Machine Interaction**:
  - Moving with `WASD`, aiming/rotating with mouse or arrow keys, firing with `Left Click / Space`, picking up ground weapons with `E`, and interacting with Vending Machines or Compatibility Shrines with `F`.
  - Approaching a Vending Machine opens a crisp radial/quick-select bar (`[1] Free Weapon`, `[2] Free Medkit (+75 HP)`, `[3] Summon Partner Bot (Cute Girl if unlocked, else Dog Bot — Max 50 DMG)`).
- **Post-Match Animated Summary -> Top 3 Reward Flow**:
  - Finishing a match transitions automatically to the **Animated Stats Summary** (counting up Kills, Damage Dealt, Survival Time, and Rank points).
  - Clicking **Claim Top 3 Reward** (when ranked `#1`, `#2`, or `#3`) transitions to the **Cute Virtual Girl Unlock & Date Lounge** where the player unlocks their permanent helper girl, customizes her persona, and chats/dates to boost compatibility rank.
- **Connection Pooling & Disconnect Lifecycle**:
  - Client session manager pools API/sync requests through a single reusable channel and fires `navigator.sendBeacon('/api/game/disconnect', ...)` on `pagehide` / `beforeunload` to immediately release server pool slots when the user leaves the site.
