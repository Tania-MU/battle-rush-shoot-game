'use client';

import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import {
  AI_CONTENDER_PROFILES,
  ARENA_RADIUS,
  COMPATIBILITY_SHRINES,
  CUTE_GIRL_PERSONAS,
  LOOTABLE_WEAPON_IDS,
  MAX_COMPANION_DAMAGE,
  MAX_MATCH_CONTENDERS,
  MAX_PLAYER_HP,
  MAX_PLAYER_SHIELD,
  STORM_PHASES,
  VENDING_MACHINES,
  WEAPONS_CATALOG,
} from '@/lib/constants';
import {
  capCompanionDamage,
  clamp,
  clampPlayerHp,
  distance2D,
  generateId,
  getSynergyBuffSpec,
  groundHeightAt,
  lerp,
} from '@/lib/game-utils';
import { soundFX } from '@/lib/sound-effects';
import {
  createArenaGroundTexture,
  detectSoftwareWebGL,
  disposeObject3D,
} from '@/lib/three/materials';
import {
  CONTENDER_MODEL_SCALE,
  createCompatibilityShrineModel,
  createContenderModel,
  createCuteGirlBotModel,
  createDogBotModel,
  createDropshipPlaneModel,
  createLootItemModel,
  createVendingMachineModel,
  formatContenderHeaderName,
  populateIslandScenery,
  updateContenderOverheadHealth,
} from '@/lib/three/models';
import {
  hasLineOfSight,
  ObstacleCollider,
  resolveEntityObstacleCollisions,
  segmentHitsObstacle,
} from '@/lib/three/obstacles';
import {
  CombatHudSnapshot,
  CompanionState,
  CompatibilityShrineStation,
  ContenderState,
  GameScreenState,
  KillBannerAnnouncement,
  KillFeedEntry,
  MatchSummaryStats,
  PlayerProfile,
  ProjectileEntity,
  StormPhaseState,
  VendingMachineStation,
  WeaponSpec,
  WorldLootItem,
} from '@/types/game';

const _camDesiredPos = new THREE.Vector3();
const _camLookTarget = new THREE.Vector3();
const _camForward = new THREE.Vector3();
const _aimTargetPoint = new THREE.Vector3();
const _muzzleOrigin = new THREE.Vector3();
const _bulletDir = new THREE.Vector3();
const _rightVec = new THREE.Vector3();
const _upVec = new THREE.Vector3();

function getBermudaZoneName(x: number, z: number): string {
  if (distance2D(x, z, -28, -38) < 26) return 'Clock Tower';
  if (distance2D(x, z, 44, 14) < 26) return 'Factory Container Yard';
  if (distance2D(x, z, 26, -22) < 24 || distance2D(x, z, -36, 24) < 24) {
    return 'Pochinok Compound';
  }
  if (distance2D(x, z, -16, 58) < 26) return 'Mars Electric South';
  return 'Bimasakti Strip';
}

function getKillStreakHeadline(kills: number): string {
  if (kills === 1) return 'FIRST BLOOD';
  if (kills === 2) return 'DOUBLE KILL';
  if (kills === 3) return 'TRIPLE KILL';
  if (kills === 4) return 'QUADRA KILL';
  if (kills === 5) return 'PENTA KILL';
  return 'BOOYAH RAMPAGE';
}

export interface ArenaActionHandle {
  ejectOrDeployParachute: () => void;
  setJoystickInput: (x: number, y: number, active: boolean) => void;
  toggleSprint: () => void;
  triggerJump: () => void;
  toggleScopeZoom: () => void;
  setContinuousFire: (firing: boolean) => void;
  triggerInteract: () => void;
  rotateCameraLook: (deltaPixelsX: number, deltaPixelsY: number) => void;
  claimVendingWeapon: () => void;
  claimVendingMedkit: () => void;
  summonVendingPartnerBot: () => void;
  pickupNearbyLoot: () => void;
  chooseShrineOption: (option: 'A' | 'B') => void;
  triggerFireWeapon: () => void;
  switchWeaponSlot: (slotIndex?: 0 | 1) => void;
}

interface ArenaCanvasProps {
  screenState: GameScreenState;
  profile: PlayerProfile;
  matchSeed: number;
  spawnCoords: { x: number; z: number };
  onlineHumanNames: string[];
  allowBots: boolean;
  onHudUpdate: (snapshot: CombatHudSnapshot) => void;
  onMatchComplete: (summary: MatchSummaryStats) => void;
  actionRef: React.MutableRefObject<ArenaActionHandle | null>;
}

export function ArenaCanvas({
  screenState,
  profile,
  matchSeed,
  spawnCoords,
  onlineHumanNames,
  allowBots,
  onHudUpdate,
  onMatchComplete,
  actionRef,
}: ArenaCanvasProps) {
  const canvasMountRef = useRef<HTMLDivElement | null>(null);

  const screenStateRef = useRef<GameScreenState>(screenState);
  const profileRef = useRef<PlayerProfile>(profile);
  const spawnCoordsRef = useRef<{ x: number; z: number }>(spawnCoords);
  const onlineNamesRef = useRef<string[]>(onlineHumanNames);
  const allowBotsRef = useRef<boolean>(allowBots);
  const onHudUpdateRef = useRef(onHudUpdate);
  const onMatchCompleteRef = useRef(onMatchComplete);

  useEffect(() => {
    screenStateRef.current = screenState;
    if (
      screenState !== GameScreenState.PLAYING &&
      typeof document !== 'undefined' &&
      document.pointerLockElement
    ) {
      document.exitPointerLock?.();
    }
  }, [screenState]);

  useEffect(() => {
    profileRef.current = profile;
  }, [profile]);

  useEffect(() => {
    spawnCoordsRef.current = spawnCoords;
  }, [spawnCoords]);

  useEffect(() => {
    onlineNamesRef.current = onlineHumanNames;
  }, [onlineHumanNames]);

  useEffect(() => {
    allowBotsRef.current = allowBots;
  }, [allowBots]);

  useEffect(() => {
    onHudUpdateRef.current = onHudUpdate;
  }, [onHudUpdate]);

  useEffect(() => {
    onMatchCompleteRef.current = onMatchComplete;
  }, [onMatchComplete]);

  const startNewMatchRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (screenState === GameScreenState.PLAYING && startNewMatchRef.current) {
      startNewMatchRef.current();
    }
  }, [matchSeed, screenState]);

  useEffect(() => {
    const container = canvasMountRef.current;
    if (!container) return;

    const isSoftwareGl = detectSoftwareWebGL();
    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    renderer.setPixelRatio(
      isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2)
    );
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setSize(
      container.clientWidth || window.innerWidth,
      container.clientHeight || window.innerHeight
    );

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const horizonHex = 0x1e293b;
    scene.background = new THREE.Color(horizonHex);
    scene.fog = new THREE.FogExp2(horizonHex, 0.0044);

    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    scene.environment = pmremGenerator.fromScene(
      new RoomEnvironment(),
      0.04
    ).texture;
    pmremGenerator.dispose();

    const BASE_FOV = 64;
    const camera = new THREE.PerspectiveCamera(
      BASE_FOV,
      (container.clientWidth || window.innerWidth) /
        (container.clientHeight || window.innerHeight),
      0.1,
      480
    );
    camera.position.set(0, 12, 22);

    const hemiLight = new THREE.HemisphereLight(0xbae6fd, 0x292524, 0.9);
    hemiLight.position.set(0, 70, 0);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xfff7ed, 1.65);
    keyLight.position.set(55, 85, 42);
    keyLight.castShadow = !isSoftwareGl;
    if (!isSoftwareGl) {
      keyLight.shadow.mapSize.width = 1024;
      keyLight.shadow.mapSize.height = 1024;
      keyLight.shadow.camera.near = 10;
      keyLight.shadow.camera.far = 240;
      const d = 100;
      keyLight.shadow.camera.left = -d;
      keyLight.shadow.camera.right = d;
      keyLight.shadow.camera.top = d;
      keyLight.shadow.camera.bottom = -d;
      keyLight.shadow.bias = -0.0005;
      keyLight.shadow.normalBias = 0.02;
    }
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x93c5fd, 0.45);
    rimLight.position.set(-55, 40, -50);
    scene.add(rimLight);

    const groundTexture = createArenaGroundTexture(renderer);
    const arenaObstacles: ObstacleCollider[] = populateIslandScenery(
      scene,
      groundTexture,
      renderer
    );

    const worldGroup = new THREE.Group();
    scene.add(worldGroup);

    // Shrinking Storm Wall
    const stormGeo = new THREE.CylinderGeometry(1, 1, 36, 48, 1, true);
    stormGeo.translate(0, 18, 0);
    const stormMat = new THREE.MeshBasicMaterial({
      color: 0xf43f5e,
      transparent: true,
      opacity: 0.22,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const stormWallMesh = new THREE.Mesh(stormGeo, stormMat);
    scene.add(stormWallMesh);

    const stormRingGeo = new THREE.RingGeometry(0.985, 1.005, 64);
    stormRingGeo.rotateX(-Math.PI / 2);
    const stormRingMat = new THREE.MeshBasicMaterial({
      color: 0xfda4af,
      side: THREE.DoubleSide,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    });
    const stormFloorRing = new THREE.Mesh(stormRingGeo, stormRingMat);
    stormFloorRing.position.y = 0.05;
    scene.add(stormFloorRing);

    const vendingMeshes: THREE.Group[] = [];
    VENDING_MACHINES.forEach((vm) => {
      const vmGroup = createVendingMachineModel(isSoftwareGl);
      const vy = groundHeightAt(vm.x, vm.z);
      vmGroup.position.set(vm.x, vy, vm.z);
      vmGroup.rotation.y = vm.rotationY;
      scene.add(vmGroup);
      vendingMeshes.push(vmGroup);

      arenaObstacles.push({
        id: `vending_${vm.id}`,
        x: vm.x,
        z: vm.z,
        halfW: 1.05,
        halfD: 0.85,
        minY: vy,
        maxY: vy + 3.2,
        rotationY: vm.rotationY,
        blocksMovement: true,
        blocksBullets: true,
      });
    });

    const shrineMeshes: THREE.Group[] = [];
    COMPATIBILITY_SHRINES.forEach((sh) => {
      const shGroup = createCompatibilityShrineModel();
      const sy = groundHeightAt(sh.x, sh.z);
      shGroup.position.set(sh.x, sy, sh.z);
      scene.add(shGroup);
      shrineMeshes.push(shGroup);

      arenaObstacles.push({
        id: `shrine_${sh.id}`,
        x: sh.x,
        z: sh.z,
        halfW: 1.15,
        halfD: 1.15,
        minY: sy,
        maxY: sy + 2.6,
        rotationY: 0,
        blocksMovement: true,
        blocksBullets: true,
      });
    });

    // 3D Free Fire Cargo Dropship Plane (Flies at 82m altitude across Bermuda Island)
    const dropshipPlaneMesh = createDropshipPlaneModel();
    dropshipPlaneMesh.visible = false;
    scene.add(dropshipPlaneMesh);

    const planeState = {
      active: false,
      x: -105,
      y: 82,
      z: -105,
      dirX: Math.SQRT1_2,
      dirZ: Math.SQRT1_2,
      speed: 34,
      rotationY: Math.PI / 4,
      elapsedSec: 0,
    };

    let contenders: ContenderState[] = [];
    const contenderMeshes = new Map<string, THREE.Group>();
    const companionMeshes = new Map<string, THREE.Group>();
    let lootItems: WorldLootItem[] = [];
    const lootMeshes = new Map<string, THREE.Group>();
    let projectiles: ProjectileEntity[] = [];
    const projectileMeshes = new Map<string, THREE.Mesh>();
    let shrinesState: CompatibilityShrineStation[] = [];
    let killFeed: KillFeedEntry[] = [];
    let activeKillBanner: KillBannerAnnouncement | null = null;

    let storm: StormPhaseState = {
      phase: 1,
      maxPhases: STORM_PHASES.length,
      currentRadius: STORM_PHASES[0].startRadius,
      targetRadius: STORM_PHASES[0].targetRadius,
      centerX: 0,
      centerZ: 0,
      timeRemainingSec: STORM_PHASES[0].durationSec,
      damagePerSecond: STORM_PHASES[0].damagePerSec,
      isShrinking: false,
    };

    let matchStartTime = performance.now();
    let matchEnded = false;
    let weaponsLootedCount = 0;
    let vendingClaimedCount = 0;
    let localCompanionDamageTotal = 0;
    let botDamageTakenByLocalPlayer = 0;

    let cameraShakeIntensity = 0;
    let localRecoilPitch = 0;
    let localMuzzleFlashTimer = 0;
    let hitstopTimer = 0;
    let lastHudEmitTime = 0;

    const heldKeys: Record<string, boolean> = {};
    let isSprintToggled = false;
    const joystickState = { x: 0, y: 0, active: false };
    let activeJoystickVisX = 0;
    let activeJoystickVisY = 0;
    let mouseLookYaw = Math.PI;
    let mouseLookPitch = 0;
    let isPointerDown = false;
    let isAdsActive = false;

    const clearDynamicEntities = () => {
      contenderMeshes.forEach((g) => {
        worldGroup.remove(g);
        disposeObject3D(g);
      });
      contenderMeshes.clear();

      companionMeshes.forEach((g) => {
        worldGroup.remove(g);
        disposeObject3D(g);
      });
      companionMeshes.clear();

      lootMeshes.forEach((g) => {
        worldGroup.remove(g);
        disposeObject3D(g);
      });
      lootMeshes.clear();

      projectileMeshes.forEach((m) => {
        worldGroup.remove(m);
        disposeObject3D(m);
      });
      projectileMeshes.clear();
    };

    const spawnCompanionForContender = (c: ContenderState) => {
      const useGirl = c.isLocalPlayer
        ? profileRef.current.unlockedCuteGirl &&
          profileRef.current.selectedCompanion === 'girl'
        : c.unlockedCuteGirl;

      const companionType = useGirl ? 'girl' : 'dog';
      const personaId = c.isLocalPlayer
        ? profileRef.current.selectedGirlPersona
        : 'aiko';
      const personaName =
        companionType === 'girl'
          ? `${CUTE_GIRL_PERSONAS[personaId].name} (Girl Bot)`
          : 'Bolt (Loyal Dog Bot)';

      const compState: CompanionState = {
        ownerId: c.id,
        type: companionType,
        personaId,
        displayName: personaName,
        x: c.x + 2.2,
        y: groundHeightAt(c.x + 2.2, c.z + 1.4),
        z: c.z + 1.4,
        rotationY: c.rotationY,
        pitch: 0,
        hp: 120,
        maxHp: 120,
        maxDamage: MAX_COMPANION_DAMAGE, // Strictly 50 Max Damage
        damageDealtTotal: 0,
        lastAttackTime: 0,
        targetId: null,
      };
      c.companion = compState;

      const prevMesh = companionMeshes.get(c.id);
      if (prevMesh) {
        worldGroup.remove(prevMesh);
        disposeObject3D(prevMesh);
      }

      const compMesh =
        companionType === 'girl'
          ? createCuteGirlBotModel(personaId)
          : createDogBotModel();
      compMesh.position.set(compState.x, compState.y, compState.z);
      worldGroup.add(compMesh);
      companionMeshes.set(c.id, compMesh);
    };

    const initializeMatch = () => {
      clearDynamicEntities();
      contenders = [];
      lootItems = [];
      projectiles = [];
      killFeed = [];
      activeKillBanner = null;
      shrinesState = COMPATIBILITY_SHRINES.map((s) => ({
        ...s,
        activatedByPlayer: false,
      }));

      matchStartTime = performance.now();
      matchEnded = false;
      weaponsLootedCount = 0;
      vendingClaimedCount = 0;
      localCompanionDamageTotal = 0;
      botDamageTakenByLocalPlayer = 0;
      cameraShakeIntensity = 0;
      localRecoilPitch = 0;
      isAdsActive = false;
      isSprintToggled = false;

      storm = {
        phase: 1,
        maxPhases: STORM_PHASES.length,
        currentRadius: STORM_PHASES[0].startRadius,
        targetRadius: STORM_PHASES[0].targetRadius,
        centerX: 0,
        centerZ: 0,
        timeRemainingSec: STORM_PHASES[0].durationSec,
        damagePerSecond: STORM_PHASES[0].damagePerSec,
        isShrinking: false,
      };

      const p = profileRef.current;
      const drop = spawnCoordsRef.current;
      const realPlayerName = p.displayName?.trim() || 'Mohammad';

      // Configure Dropship Plane Flight Path across Bermuda Island passing over the player's selected drop zone
      const startAngle = Math.atan2(drop.x || 15, drop.z || 15) + Math.PI;
      const startDist = 96;
      const planeStartX = Math.sin(startAngle) * startDist;
      const planeStartZ = Math.cos(startAngle) * startDist;
      const targetFlyX = drop.x * 0.55 - planeStartX;
      const targetFlyZ = drop.z * 0.55 - planeStartZ;
      const flyLen = Math.hypot(targetFlyX, targetFlyZ) || 1;

      planeState.active = true;
      planeState.x = planeStartX;
      planeState.y = 82;
      planeState.z = planeStartZ;
      planeState.dirX = targetFlyX / flyLen;
      planeState.dirZ = targetFlyZ / flyLen;
      planeState.speed = 32;
      planeState.rotationY = Math.atan2(planeState.dirX, planeState.dirZ);
      planeState.elapsedSec = 0;

      dropshipPlaneMesh.visible = true;
      dropshipPlaneMesh.position.set(
        planeState.x,
        planeState.y,
        planeState.z
      );
      dropshipPlaneMesh.rotation.y = planeState.rotationY;

      // 1. Spawn Local Player INSIDE the Dropship Plane (`dropPhase: 'in_plane'`)
      // (No overhead nameplate on local player so it never blocks scope!)
      const slot1Weapon = WEAPONS_CATALOG.crimson_ar; // 2x Scope AR
      const slot2Weapon = WEAPONS_CATALOG.cupid_sniper; // 4x Scope Sniper
      const localPlayer: ContenderState = {
        id: p.id,
        name: realPlayerName,
        isBot: false,
        isLocalPlayer: true,
        x: planeState.x,
        y: planeState.y,
        z: planeState.z,
        vx: 0,
        vy: 0,
        vz: 0,
        isGrounded: false,
        isSprinting: false,
        dropPhase: 'in_plane',
        rotationY: planeState.rotationY,
        pitch: -0.22,
        hp: MAX_PLAYER_HP, // 200 HP
        maxHp: MAX_PLAYER_HP,
        shield: 25,
        maxShield: MAX_PLAYER_SHIELD,
        weapons: [slot1Weapon, slot2Weapon],
        activeWeaponIndex: 0,
        weapon: slot1Weapon,
        kills: 0,
        damageDealt: 0,
        botTotalDamageDealt: 0,
        alive: true,
        spawnedAt: performance.now(),
        eliminatedAt: null,
        placement: null,
        avatarColor: p.avatarColor,
        visorColor: p.visorColor,
        outfitStyle: p.outfitStyle,
        activeBuff: p.activeSynergyBuff,
        unlockedCuteGirl: p.unlockedCuteGirl,
        companion: null,
        lastShotTime: 0,
        usedVendingIds: [],
      };
      contenders.push(localPlayer);
      mouseLookYaw = planeState.rotationY;
      mouseLookPitch = -0.22;

      const localMesh = createContenderModel(
        localPlayer.avatarColor,
        localPlayer.visorColor,
        localPlayer.outfitStyle,
        localPlayer.name,
        false,
        false // Do NOT render local player's own overhead nameplate so it never blocks scope!
      );
      localMesh.position.set(localPlayer.x, localPlayer.y, localPlayer.z);
      localMesh.visible = false; // Hidden while inside the plane until ejecting
      worldGroup.add(localMesh);
      contenderMeshes.set(localPlayer.id, localMesh);

      // 2. Spawn Other Contenders in this 10-Player Match Instance inside the Plane (`dropPhase: 'in_plane'`):
      // Each contender jumps from the plane along the flight path, opens their parachute, and lands before fighting!
      const otherHumanNames = onlineNamesRef.current
        .map((n) => n.trim())
        .filter((n) => n.length > 0 && n !== realPlayerName);

      const totalOtherSlots = allowBotsRef.current
        ? MAX_MATCH_CONTENDERS - 1
        : Math.min(MAX_MATCH_CONTENDERS - 1, otherHumanNames.length);

      for (let i = 0; i < totalOtherSlots; i++) {
        const isHumanRival = i < otherHumanNames.length;
        const template =
          AI_CONTENDER_PROFILES[i % AI_CONTENDER_PROFILES.length];
        const angle = (i / (MAX_MATCH_CONTENDERS - 1)) * Math.PI * 2 + 0.4;
        const spawnDist = 30 + (i % 3) * 16;
        const rawSx = Math.cos(angle) * spawnDist;
        const rawSz = Math.sin(angle) * spawnDist;
        const safeBotPos = resolveEntityObstacleCollisions(
          rawSx,
          groundHeightAt(rawSx, rawSz),
          rawSz,
          1.1,
          arenaObstacles
        );
        const sx = safeBotPos.x;
        const sz = safeBotPos.z;
        const botWeaponId = LOOTABLE_WEAPON_IDS[i % LOOTABLE_WEAPON_IDS.length];
        const botPrimary = WEAPONS_CATALOG[botWeaponId];

        const rawRivalName = isHumanRival
          ? otherHumanNames[i]
          : template.name;
        const formattedRivalName = formatContenderHeaderName(
          rawRivalName,
          !isHumanRival
        );

        const rivalContender: ContenderState = {
          id: `contender_${i + 1}`,
          name: formattedRivalName, // "Mohammad"/"Friend" for human, "adam(bot)" for bot
          isBot: !isHumanRival,
          isLocalPlayer: false,
          x: planeState.x,
          y: planeState.y,
          z: planeState.z,
          vx: 0,
          vy: 0,
          vz: 0,
          isGrounded: false,
          isSprinting: false,
          dropPhase: 'in_plane',
          planeJumpTimeSec: 0.9 + i * 0.52, // Staggered jumps along the plane's flight path
          rotationY: angle + Math.PI,
          pitch: 0,
          hp: MAX_PLAYER_HP, // 200 Max HP
          maxHp: MAX_PLAYER_HP,
          shield: 15,
          maxShield: MAX_PLAYER_SHIELD,
          weapons: [botPrimary, WEAPONS_CATALOG.starter_pistol],
          activeWeaponIndex: 0,
          weapon: botPrimary,
          kills: 0,
          damageDealt: 0,
          botTotalDamageDealt: 0,
          alive: true,
          spawnedAt: performance.now(),
          eliminatedAt: null,
          placement: null,
          avatarColor: template.color,
          visorColor: template.visor,
          outfitStyle: template.style,
          activeBuff: i % 2 === 0 ? 'heartbeat_overdrive' : 'companion_sync',
          unlockedCuteGirl: i < 3,
          companion: null,
          lastShotTime: 0,
          aiTargetX: sx,
          aiTargetZ: sz,
          aiStateTimer: 2 + (i % 4),
          usedVendingIds: [],
        };
        contenders.push(rivalContender);

        const cMesh = createContenderModel(
          rivalContender.avatarColor,
          rivalContender.visorColor,
          rivalContender.outfitStyle,
          rawRivalName,
          !isHumanRival, // true -> "adam(bot)", false -> "FriendName"
          true
        );
        cMesh.position.set(rivalContender.x, rivalContender.y, rivalContender.z);
        cMesh.visible = false; // Hidden while inside the plane until they jump
        worldGroup.add(cMesh);
        contenderMeshes.set(rivalContender.id, cMesh);
      }

      // 3. Spawn 32 Ground Loot Items (pushed outside building walls)
      for (let i = 0; i < 32; i++) {
        const angle = (i / 32) * Math.PI * 2 + (i % 5) * 0.22;
        const dist = 12 + ((i * 17) % 85);
        const rawLx = Math.cos(angle) * dist;
        const rawLz = Math.sin(angle) * dist;
        const safeLootPos = resolveEntityObstacleCollisions(
          rawLx,
          groundHeightAt(rawLx, rawLz),
          rawLz,
          1.2,
          arenaObstacles
        );
        const lx = safeLootPos.x;
        const lz = safeLootPos.z;
        const ly = groundHeightAt(lx, lz);

        let kind: WorldLootItem['kind'] = 'weapon';
        let weaponSpec =
          WEAPONS_CATALOG[LOOTABLE_WEAPON_IDS[i % LOOTABLE_WEAPON_IDS.length]];
        let colorHex = weaponSpec.colorHex;

        if (i % 4 === 1) {
          kind = 'medkit';
          weaponSpec = undefined!;
          colorHex = 0x10b981;
        } else if (i % 5 === 2) {
          kind = 'shield_heart';
          weaponSpec = undefined!;
          colorHex = 0x38bdf8;
        }

        const item: WorldLootItem = {
          id: `loot_${i}`,
          kind,
          weaponSpec,
          healAmount: kind === 'medkit' ? 65 : undefined,
          shieldAmount: kind === 'shield_heart' ? 35 : undefined,
          x: lx,
          y: ly,
          z: lz,
          collected: false,
        };
        lootItems.push(item);

        const lMesh = createLootItemModel(kind, colorHex);
        lMesh.position.set(lx, ly, lz);
        worldGroup.add(lMesh);
        lootMeshes.set(item.id, lMesh);
      }
    };

    startNewMatchRef.current = initializeMatch;
    initializeMatch();

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    /**
     * Spawns projectiles along an exact 3D unit direction vector (`dirX, dirY, dirZ`)
     * so player bullets converge 100% accurately onto the center crosshair!
     */
    const spawnDirectedProjectiles = (
      shooter: ContenderState,
      fromCompanion: boolean,
      originX: number,
      originY: number,
      originZ: number,
      baseDirX: number,
      baseDirY: number,
      baseDirZ: number,
      rawDamage: number,
      speed: number,
      range: number,
      pellets: number,
      spread: number,
      colorHex: number
    ) => {
      const buff = getSynergyBuffSpec(shooter.activeBuff);
      const isBotSource = shooter.isBot || fromCompanion;
      const finalDamage = isBotSource
        ? capCompanionDamage(rawDamage)
        : Math.round(rawDamage * buff.damageMultiplier);

      _bulletDir.set(baseDirX, baseDirY, baseDirZ).normalize();
      _rightVec.crossVectors(_bulletDir, camera.up).normalize();
      if (_rightVec.lengthSq() < 0.001) _rightVec.set(1, 0, 0);
      _upVec.crossVectors(_rightVec, _bulletDir).normalize();

      for (let p = 0; p < pellets; p++) {
        const spreadX =
          pellets > 1
            ? (p - (pellets - 1) / 2) * spread +
              (Math.random() - 0.5) * spread * 0.25
            : (Math.random() - 0.5) * spread;
        const spreadY = (Math.random() - 0.5) * spread * 0.6;

        const dir = _bulletDir
          .clone()
          .addScaledVector(_rightVec, spreadX)
          .addScaledVector(_upVec, spreadY)
          .normalize();

        const proj: ProjectileEntity = {
          id: generateId('proj'),
          ownerId: shooter.id,
          fromBotOrCompanion: isBotSource,
          fromCompanion,
          x: originX + dir.x * 0.6,
          y: originY + dir.y * 0.6,
          z: originZ + dir.z * 0.6,
          vx: dir.x * speed,
          vy: dir.y * speed,
          vz: dir.z * speed,
          damage: finalDamage,
          colorHex,
          distanceTraveled: 0,
          maxRange: range,
        };
        projectiles.push(proj);

        const tracerGeo = new THREE.CapsuleGeometry(
          fromCompanion ? 0.15 : 0.1,
          0.65,
          4,
          6
        );
        tracerGeo.rotateX(Math.PI / 2);
        const pMesh = new THREE.Mesh(
          tracerGeo,
          new THREE.MeshBasicMaterial({ color: colorHex })
        );
        pMesh.position.set(proj.x, proj.y, proj.z);
        pMesh.lookAt(proj.x + proj.vx, proj.y + proj.vy, proj.z + proj.vz);
        worldGroup.add(pMesh);
        projectileMeshes.set(proj.id, pMesh);
      }
    };

    const getLocalContender = (): ContenderState | undefined =>
      contenders.find((c) => c.isLocalPlayer);

    const equipNewWeaponInSlots = (c: ContenderState, newWep: WeaponSpec) => {
      if (c.weapons[0].id === newWep.id) {
        c.activeWeaponIndex = 0;
        c.weapon = c.weapons[0];
        return;
      }
      if (c.weapons[1]?.id === newWep.id) {
        c.activeWeaponIndex = 1;
        c.weapon = c.weapons[1];
        return;
      }
      if (!c.weapons[1]) {
        c.weapons[1] = newWep;
        c.activeWeaponIndex = 1;
        c.weapon = newWep;
      } else {
        c.weapons[c.activeWeaponIndex] = newWep;
        c.weapon = newWep;
      }
    };

    const getNearestVending = (
      c: ContenderState
    ): VendingMachineStation | null => {
      if (c.dropPhase !== 'landed') return null;
      let best: VendingMachineStation | null = null;
      let bestDist = 5.8;
      for (const vm of VENDING_MACHINES) {
        const d = distance2D(c.x, c.z, vm.x, vm.z);
        if (d < bestDist) {
          bestDist = d;
          best = vm;
        }
      }
      return best;
    };

    const getNearestShrine = (
      c: ContenderState
    ): CompatibilityShrineStation | null => {
      if (c.dropPhase !== 'landed') return null;
      let best: CompatibilityShrineStation | null = null;
      let bestDist = 5.2;
      for (const sh of shrinesState) {
        if (sh.activatedByPlayer) continue;
        const d = distance2D(c.x, c.z, sh.x, sh.z);
        if (d < bestDist) {
          bestDist = d;
          best = sh;
        }
      }
      return best;
    };

    const getNearestLoot = (c: ContenderState): WorldLootItem | null => {
      if (c.dropPhase !== 'landed') return null;
      let best: WorldLootItem | null = null;
      let bestDist = 4.4;
      for (const item of lootItems) {
        if (item.collected) continue;
        const d = distance2D(c.x, c.z, item.x, item.z);
        if (d < bestDist) {
          bestDist = d;
          best = item;
        }
      }
      return best;
    };

    const ejectContenderFromPlane = (c: ContenderState) => {
      if (c.dropPhase !== 'in_plane') return;
      c.dropPhase = 'freefall';
      c.x = clamp(
        planeState.x - planeState.dirX * 3.2 + (Math.random() - 0.5) * 2.5,
        -ARENA_RADIUS + 10,
        ARENA_RADIUS - 10
      );
      c.y = planeState.y - 2.4;
      c.z = clamp(
        planeState.z - planeState.dirZ * 3.2 + (Math.random() - 0.5) * 2.5,
        -ARENA_RADIUS + 10,
        ARENA_RADIUS - 10
      );
      c.vy = -25.0;
      c.isGrounded = false;
      const mesh = contenderMeshes.get(c.id);
      if (mesh) {
        mesh.visible = true;
        mesh.position.set(c.x, c.y, c.z);
      }
      if (c.isLocalPlayer) {
        soundFX.playPlaneEject();
      }
    };

    const deployContenderParachute = (c: ContenderState) => {
      if (c.dropPhase !== 'freefall') return;
      c.dropPhase = 'parachute';
      c.vy = -7.8;
      if (c.isLocalPlayer) {
        soundFX.playParachuteOpen();
      }
    };

    actionRef.current = {
      ejectOrDeployParachute: () => {
        const local = getLocalContender();
        if (!local || !local.alive) return;
        if (local.dropPhase === 'in_plane') {
          ejectContenderFromPlane(local);
        } else if (local.dropPhase === 'freefall') {
          deployContenderParachute(local);
        }
      },
      setJoystickInput: (x: number, y: number, active: boolean) => {
        // CRITICAL: Touching the joystick stops sprinting and moves using the joystick!
        // To sprint again, the player must press Shift (or tap the Sprint button).
        if (active) {
          isSprintToggled = false;
        }
        joystickState.x = clamp(x, -1, 1);
        joystickState.y = clamp(y, -1, 1);
        joystickState.active = active;
      },
      toggleSprint: () => {
        const local = getLocalContender();
        if (!local || !local.alive) return;
        isSprintToggled = !isSprintToggled;
        if (isSprintToggled && isAdsActive) {
          isAdsActive = false;
        }
      },
      triggerJump: () => {
        const local = getLocalContender();
        if (!local || !local.alive) return;
        if (local.dropPhase !== 'landed') {
          actionRef.current?.ejectOrDeployParachute();
          return;
        }
        if (local.isGrounded) {
          local.vy = 11.4;
          local.isGrounded = false;
          soundFX.playJump();
        }
      },
      toggleScopeZoom: () => {
        const local = getLocalContender();
        if (!local || !local.alive || local.dropPhase !== 'landed') return;
        isAdsActive = !isAdsActive;
        if (isAdsActive) {
          isSprintToggled = false;
        }
        soundFX.playScopeZoom(isAdsActive);
      },
      setContinuousFire: (firing: boolean) => {
        const local = getLocalContender();
        if (!local || !local.alive || local.dropPhase !== 'landed') {
          isPointerDown = false;
          return;
        }
        isPointerDown = firing;
        if (firing) {
          actionRef.current?.triggerFireWeapon();
        }
      },
      triggerInteract: () => {
        const local = getLocalContender();
        if (!local || !local.alive) return;
        if (local.dropPhase !== 'landed') {
          actionRef.current?.ejectOrDeployParachute();
          return;
        }
        if (getNearestLoot(local)) {
          actionRef.current?.pickupNearbyLoot();
        } else if (getNearestVending(local)) {
          if (!local.companion) {
            actionRef.current?.summonVendingPartnerBot();
          } else if (local.hp < 160) {
            actionRef.current?.claimVendingMedkit();
          } else {
            actionRef.current?.claimVendingWeapon();
          }
        } else if (getNearestShrine(local)) {
          actionRef.current?.chooseShrineOption('A');
        }
      },
      rotateCameraLook: (deltaPixelsX: number, deltaPixelsY: number) => {
        const local = getLocalContender();
        const zoomFactor =
          isAdsActive && local?.weapon.scopeZoom === 4
            ? 0.35
            : isAdsActive
              ? 0.6
              : 1.0;
        const sensitivity = 0.0046 * zoomFactor;
        mouseLookYaw -= deltaPixelsX * sensitivity;
        mouseLookPitch = clamp(
          mouseLookPitch - deltaPixelsY * sensitivity * 0.85,
          -0.65,
          0.72
        );
      },
      switchWeaponSlot: (slotIndex?: 0 | 1) => {
        const local = getLocalContender();
        if (!local || !local.alive) return;
        const targetIdx: 0 | 1 =
          slotIndex !== undefined
            ? slotIndex
            : local.activeWeaponIndex === 0
              ? 1
              : 0;
        const candidate = local.weapons[targetIdx];
        if (candidate) {
          local.activeWeaponIndex = targetIdx;
          local.weapon = candidate;
          soundFX.playScopeZoom(true);
        }
      },
      claimVendingWeapon: () => {
        const local = getLocalContender();
        if (!local || !local.alive || local.dropPhase !== 'landed') return;
        const vm = getNearestVending(local);
        if (!vm) return;

        const pool: (keyof typeof WEAPONS_CATALOG)[] = [
          'cupid_sniper',
          'heartbreaker_shotgun',
          'crimson_ar',
          'pulse_smg',
        ];
        const nextId =
          pool.find(
            (id) =>
              id !== local.weapons[0]?.id && id !== local.weapons[1]?.id
          ) || 'cupid_sniper';
        equipNewWeaponInSlots(local, WEAPONS_CATALOG[nextId]);
        vendingClaimedCount += 1;
        soundFX.playVendingDispense(false);
      },
      claimVendingMedkit: () => {
        const local = getLocalContender();
        if (!local || !local.alive || local.dropPhase !== 'landed') return;
        const vm = getNearestVending(local);
        if (!vm) return;

        local.hp = clampPlayerHp(local.hp + 90);
        local.shield = clamp(local.shield + 30, 0, MAX_PLAYER_SHIELD);
        vendingClaimedCount += 1;
        soundFX.playVendingDispense(false);
      },
      summonVendingPartnerBot: () => {
        const local = getLocalContender();
        if (!local || !local.alive || local.dropPhase !== 'landed') return;
        const vm = getNearestVending(local);
        if (!vm) return;

        spawnCompanionForContender(local);
        vendingClaimedCount += 1;
        soundFX.playVendingDispense(true);
      },
      pickupNearbyLoot: () => {
        const local = getLocalContender();
        if (!local || !local.alive || local.dropPhase !== 'landed') return;
        const item = getNearestLoot(local);
        if (!item) return;

        item.collected = true;
        const mesh = lootMeshes.get(item.id);
        if (mesh) mesh.visible = false;

        if (item.kind === 'weapon' && item.weaponSpec) {
          equipNewWeaponInSlots(local, item.weaponSpec);
          weaponsLootedCount += 1;
        } else if (item.kind === 'medkit' && item.healAmount) {
          local.hp = clampPlayerHp(local.hp + item.healAmount);
        } else if (item.kind === 'shield_heart' && item.shieldAmount) {
          local.shield = clamp(
            local.shield + item.shieldAmount,
            0,
            MAX_PLAYER_SHIELD
          );
        }
        soundFX.playVendingDispense(false);
      },
      chooseShrineOption: (option: 'A' | 'B') => {
        const local = getLocalContender();
        if (!local || !local.alive || local.dropPhase !== 'landed') return;
        const sh = getNearestShrine(local);
        if (!sh) return;
        sh.activatedByPlayer = true;
        local.activeBuff =
          option === 'A' ? sh.optionA.buffId : sh.optionB.buffId;
        local.shield = clamp(local.shield + 20, 0, MAX_PLAYER_SHIELD);
        soundFX.playVendingDispense(true);
      },
      triggerFireWeapon: () => {
        const local = getLocalContender();
        // Players can only fight AFTER landing from the plane/parachute!
        if (!local || !local.alive || local.dropPhase !== 'landed') return;
        const nowSec = performance.now() / 1000;
        if (nowSec - local.lastShotTime < local.weapon.fireRateSec) return;
        local.lastShotTime = nowSec;
        soundFX.playGunshot(local.weapon.id);

        localRecoilPitch = Math.min(0.08, localRecoilPitch + 0.018);
        localMuzzleFlashTimer = 0.055;

        // EXACT CROSSHAIR & BULLET SYNC WITH OBSTACLE RAYCAST:
        // Compute exact 3D camera center ray so bullets travel directly through the center crosshair!
        camera.getWorldDirection(_camForward);

        // First check if a building, wall, container, or crate blocks the camera ray
        let convergeDist = local.weapon.range;
        const rayObstacleHit = segmentHitsObstacle(
          camera.position.x,
          camera.position.y,
          camera.position.z,
          camera.position.x + _camForward.x * local.weapon.range,
          camera.position.y + _camForward.y * local.weapon.range,
          camera.position.z + _camForward.z * local.weapon.range,
          arenaObstacles,
          0.04
        );
        if (rayObstacleHit) {
          convergeDist = Math.max(2.5, rayObstacleHit.t * local.weapon.range);
        }

        // Next check if an enemy contender is closer than the obstacle along the crosshair ray
        for (const other of contenders) {
          if (
            other.id === local.id ||
            !other.alive ||
            other.dropPhase !== 'landed'
          ) {
            continue;
          }
          const toEnemyX = other.x - camera.position.x;
          const toEnemyY =
            other.y + 1.45 * CONTENDER_MODEL_SCALE - camera.position.y;
          const toEnemyZ = other.z - camera.position.z;
          const projDist =
            toEnemyX * _camForward.x +
            toEnemyY * _camForward.y +
            toEnemyZ * _camForward.z;
          if (projDist > 2 && projDist < convergeDist) {
            const perpX =
              camera.position.x + _camForward.x * projDist - other.x;
            const perpZ =
              camera.position.z + _camForward.z * projDist - other.z;
            if (Math.hypot(perpX, perpZ) < 2.4) {
              convergeDist = projDist;
              break;
            }
          }
        }

        _aimTargetPoint
          .copy(camera.position)
          .addScaledVector(_camForward, convergeDist);

        // Spawn projectile right along the camera-to-crosshair ray in front of the player
        // so there is ZERO parallax miss at both close and long range!
        _muzzleOrigin
          .copy(camera.position)
          .addScaledVector(_camForward, 1.85);
        _muzzleOrigin.y -= 0.08;

        _bulletDir.subVectors(_aimTargetPoint, _muzzleOrigin).normalize();

        const effectiveSpread = isAdsActive
          ? local.weapon.spreadRad * 0.12
          : local.weapon.spreadRad * 0.4;

        spawnDirectedProjectiles(
          local,
          false,
          _muzzleOrigin.x,
          _muzzleOrigin.y,
          _muzzleOrigin.z,
          _bulletDir.x,
          _bulletDir.y,
          _bulletDir.z,
          local.weapon.damage,
          local.weapon.projectileSpeed,
          local.weapon.range,
          local.weapon.pellets,
          effectiveSpread,
          local.weapon.colorHex
        );
      },
    };

    // Keyboard, Mouse Wheel & Pointer Controls
    const onKeyDown = (e: KeyboardEvent) => {
      if (
        document.activeElement &&
        ['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)
      ) {
        return;
      }
      heldKeys[e.code] = true;
      if (e.key) {
        heldKeys[e.key.toLowerCase()] = true;
      }

      if (screenStateRef.current === GameScreenState.PLAYING) {
        const local = getLocalContender();
        if (!local || !local.alive) return;

        // While in the plane or freefalling, Space or F/E ejects from the plane or opens the parachute!
        if (
          local.dropPhase !== 'landed' &&
          (e.code === 'Space' || e.code === 'KeyF' || e.code === 'KeyE')
        ) {
          e.preventDefault();
          actionRef.current?.ejectOrDeployParachute();
          return;
        }

        // SHIFT TOGGLE SPRINT:
        // Pressing Shift once starts sprinting; pressing Shift again while sprinting stops sprinting!
        if (
          (e.code === 'ShiftLeft' ||
            e.code === 'ShiftRight' ||
            e.key === 'Shift') &&
          !e.repeat
        ) {
          e.preventDefault();
          isSprintToggled = !isSprintToggled;
          if (isSprintToggled && isAdsActive) {
            isAdsActive = false;
          }
        }
        // SPACE = JUMP (Once landed on ground)
        else if (e.code === 'Space') {
          e.preventDefault();
          if (local.dropPhase === 'landed' && local.isGrounded) {
            local.vy = 11.4;
            local.isGrounded = false;
            soundFX.playJump();
          }
        }
        // F = LOOT or VENDING MACHINE / SHRINE INTERACT
        else if (e.code === 'KeyF' || e.code === 'KeyE') {
          if (getNearestLoot(local)) {
            actionRef.current?.pickupNearbyLoot();
          } else if (getNearestVending(local)) {
            if (!local.companion) {
              actionRef.current?.summonVendingPartnerBot();
            } else if (local.hp < 160) {
              actionRef.current?.claimVendingMedkit();
            } else {
              actionRef.current?.claimVendingWeapon();
            }
          } else if (getNearestShrine(local)) {
            actionRef.current?.chooseShrineOption('A');
          }
        }
        // 1 / 2 = Switch Weapon Slots (or Vending Machine if right next to it)
        else if (e.code === 'Digit1') {
          if (getNearestVending(local)) {
            actionRef.current?.claimVendingWeapon();
          } else {
            actionRef.current?.switchWeaponSlot(0);
          }
        } else if (e.code === 'Digit2') {
          if (getNearestVending(local)) {
            actionRef.current?.claimVendingMedkit();
          } else {
            actionRef.current?.switchWeaponSlot(1);
          }
        } else if (e.code === 'Digit3') {
          if (getNearestVending(local)) {
            actionRef.current?.summonVendingPartnerBot();
          }
        }
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      heldKeys[e.code] = false;
      if (e.key) {
        heldKeys[e.key.toLowerCase()] = false;
      }
    };

    // Mouse Wheel cycles through the player's 2 weapons
    const onWheel = (e: WheelEvent) => {
      if (screenStateRef.current !== GameScreenState.PLAYING) return;
      if (Math.abs(e.deltaY) > 0) {
        actionRef.current?.switchWeaponSlot();
      }
    };

    const onWindowBlur = () => {
      Object.keys(heldKeys).forEach((k) => {
        heldKeys[k] = false;
      });
      isPointerDown = false;
      isAdsActive = false;
    };

    const onPointerMove = (e: PointerEvent) => {
      if (screenStateRef.current !== GameScreenState.PLAYING) return;
      const isLocked = document.pointerLockElement === renderer.domElement;

      if (
        isLocked ||
        e.buttons > 0 ||
        Math.abs(e.movementX) + Math.abs(e.movementY) > 0
      ) {
        const local = getLocalContender();
        const zoomFactor =
          isAdsActive && local?.weapon.scopeZoom === 4
            ? 0.35
            : isAdsActive
              ? 0.6
              : 1.0;
        const sensitivity = 0.0034 * zoomFactor;
        mouseLookYaw -= e.movementX * sensitivity;
        mouseLookPitch = clamp(
          mouseLookPitch - e.movementY * sensitivity * 0.85,
          -0.65,
          0.72
        );
      } else {
        const rect = renderer.domElement.getBoundingClientRect();
        const ny = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
        mouseLookPitch = clamp(ny * 0.55, -0.65, 0.72);
      }
    };

    const onPointerDown = (e: PointerEvent) => {
      if (screenStateRef.current !== GameScreenState.PLAYING) return;
      if (document.pointerLockElement !== renderer.domElement) {
        renderer.domElement.requestPointerLock?.();
      }
      const local = getLocalContender();
      if (local && local.dropPhase !== 'landed') {
        // While in plane or freefall, left-click can also eject/open parachute if desired
        return;
      }
      // LMB (button 0) = Fire Weapon (only after landing)
      if (e.button === 0) {
        isPointerDown = true;
        actionRef.current?.triggerFireWeapon();
      }
      // RMB (button 2) = Scope On (2x default, 4x for Sniper)
      else if (e.button === 2) {
        isAdsActive = !isAdsActive;
        soundFX.playScopeZoom(isAdsActive);
      }
    };

    const onPointerUp = (e: PointerEvent) => {
      if (e.button === 0) {
        isPointerDown = false;
      }
    };

    const onContextMenu = (e: MouseEvent) => {
      if (screenStateRef.current === GameScreenState.PLAYING) {
        e.preventDefault();
      }
    };

    const onResize = () => {
      if (!container) return;
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('wheel', onWheel, { passive: true });
    window.addEventListener('blur', onWindowBlur);
    window.addEventListener('resize', onResize);
    const domElem = renderer.domElement;
    domElem.addEventListener('pointermove', onPointerMove);
    domElem.addEventListener('pointerdown', onPointerDown);
    domElem.addEventListener('contextmenu', onContextMenu);
    window.addEventListener('pointerup', onPointerUp);

    const completeMatch = (placement: number) => {
      if (matchEnded) return;
      matchEnded = true;
      if (document.pointerLockElement) {
        document.exitPointerLock?.();
      }
      const local = getLocalContender();
      const survivalSec = Math.max(
        1,
        Math.round((performance.now() - matchStartTime) / 1000)
      );
      if (placement <= 3) {
        soundFX.playVictoryFanfare();
      }
      onMatchCompleteRef.current({
        matchId: generateId('match'),
        placement,
        totalPlayers: MAX_MATCH_CONTENDERS,
        kills: local?.kills ?? 0,
        damageDealt: Math.round(local?.damageDealt ?? 0),
        companionDamageDealt: Math.round(localCompanionDamageTotal),
        survivalTimeSec: survivalSec,
        weaponsLooted: weaponsLootedCount,
        vendingItemsClaimed: vendingClaimedCount,
        compatibilityBonus: placement <= 3 ? 65 : 25,
        qualifiedForTop3Reward: placement <= 3,
        companionUsed: local?.companion?.type ?? null,
      });
    };

    let frameId = 0;
    let isDisposed = false;
    const clock = new THREE.Clock();

    function afterDraw(cb: () => void) {
      if (isDisposed) return;
      const gl = renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync
        ? gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0)
        : null;
      gl.flush();
      if (!sync) {
        frameId = window.setTimeout(cb, 80);
        return;
      }
      const poll = () => {
        if (isDisposed) return;
        const state = gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    }

    function animateContenderRig(
      c: ContenderState,
      mesh: THREE.Group,
      elapsedSec: number,
      isLocal: boolean
    ) {
      // Toggle 3D Parachute Canopy visibility & gentle gliding sway
      const parachuteRig = mesh.getObjectByName('parachuteRig');
      if (parachuteRig) {
        const showChute = c.dropPhase === 'parachute';
        parachuteRig.visible = showChute;
        if (showChute) {
          parachuteRig.rotation.z = Math.sin(elapsedSec * 2.8) * 0.065;
          parachuteRig.rotation.x = Math.cos(elapsedSec * 2.1) * 0.04;
        }
      }

      // Tilt body forward during skydiving freefall; upright when parachute open or landed
      mesh.rotation.x = c.dropPhase === 'freefall' ? 0.58 : 0;

      const speed = Math.hypot(c.vx, c.vz);
      const leftLeg = mesh.getObjectByName('leftLegPivot');
      const rightLeg = mesh.getObjectByName('rightLegPivot');
      if (leftLeg && rightLeg) {
        if (!c.isGrounded) {
          leftLeg.rotation.x = c.dropPhase === 'freefall' ? 0.65 : 0.42;
          rightLeg.rotation.x = c.dropPhase === 'freefall' ? 0.55 : -0.32;
        } else if (speed > 0.4) {
          const freq = c.isSprinting ? 15.5 : 11.5;
          const swing =
            Math.sin(elapsedSec * freq) * Math.min(0.75, speed * 0.048);
          leftLeg.rotation.x = swing;
          rightLeg.rotation.x = -swing;
        } else {
          leftLeg.rotation.x = THREE.MathUtils.lerp(leftLeg.rotation.x, 0, 0.2);
          rightLeg.rotation.x = THREE.MathUtils.lerp(
            rightLeg.rotation.x,
            0,
            0.2
          );
        }
      }

      const aimPivot = mesh.getObjectByName('aimPivot');
      if (aimPivot) {
        const recoil = isLocal ? localRecoilPitch : 0;
        const sprintDip = c.isSprinting ? 0.14 : 0;
        aimPivot.rotation.x = -(c.pitch + recoil) + sprintDip;
        // Angle the local player's weapon slightly toward the right-shoulder crosshair ray
        aimPivot.rotation.y = isLocal ? -0.045 : 0;

        const muzzleFlash = aimPivot.getObjectByName('muzzleFlash');
        if (muzzleFlash && isLocal) {
          muzzleFlash.visible =
            localMuzzleFlashTimer > 0 && c.dropPhase === 'landed';
          if (localMuzzleFlashTimer > 0) {
            muzzleFlash.rotation.z = elapsedSec * 40;
          }
        }
      }

      // Update overhead 3D nameplate health bar & player name
      updateContenderOverheadHealth(
        mesh,
        c.hp / c.maxHp,
        c.isLocalPlayer ? profileRef.current.displayName : c.name,
        c.isBot
      );
    }

    function updateSimulation(dt: number, elapsedSec: number) {
      vendingMeshes.forEach((vmGroup, i) => {
        const crown = vmGroup.getObjectByName('vending_crown');
        if (crown) {
          crown.rotation.y = elapsedSec * 1.6 + i;
          crown.position.y = 3.18 + Math.sin(elapsedSec * 2.5 + i) * 0.1;
        }
      });
      shrineMeshes.forEach((shGroup, i) => {
        const crystal = shGroup.getObjectByName('shrine_crystal');
        const ring = shGroup.getObjectByName('shrine_ring');
        if (crystal) {
          crystal.rotation.y = elapsedSec * 1.4 + i;
          crystal.position.y = 2.25 + Math.sin(elapsedSec * 2.2 + i) * 0.12;
        }
        if (ring) {
          ring.rotation.x = elapsedSec * 1.1;
          ring.rotation.z = elapsedSec * 0.8;
        }
      });

      if (screenStateRef.current !== GameScreenState.PLAYING) {
        dropshipPlaneMesh.visible = false;
        const local = getLocalContender();
        if (local) {
          const mesh = contenderMeshes.get(local.id);
          if (mesh) {
            mesh.visible = true;
            mesh.position.set(0, groundHeightAt(0, 8), 8);
            mesh.rotation.y = elapsedSec * 0.5;
            const chute = mesh.getObjectByName('parachuteRig');
            if (chute) chute.visible = false;
          }
        }
        const orbitAngle = elapsedSec * 0.2;
        _camDesiredPos.set(
          Math.sin(orbitAngle) * 14,
          6.5 + Math.sin(elapsedSec * 0.45) * 0.7,
          8 + Math.cos(orbitAngle) * 14
        );
        camera.position.x = THREE.MathUtils.damp(
          camera.position.x,
          _camDesiredPos.x,
          4,
          dt
        );
        camera.position.y = THREE.MathUtils.damp(
          camera.position.y,
          _camDesiredPos.y,
          4,
          dt
        );
        camera.position.z = THREE.MathUtils.damp(
          camera.position.z,
          _camDesiredPos.z,
          4,
          dt
        );
        camera.lookAt(0, 2.2, 4);
        return;
      }

      if (matchEnded) return;

      if (hitstopTimer > 0) {
        hitstopTimer -= dt;
        return;
      }

      if (localRecoilPitch > 0) {
        localRecoilPitch = THREE.MathUtils.damp(localRecoilPitch, 0, 14, dt);
      }
      if (localMuzzleFlashTimer > 0) {
        localMuzzleFlashTimer = Math.max(0, localMuzzleFlashTimer - dt);
      }

      // Clear Free Fire kill banner after 3.2 seconds
      if (
        activeKillBanner &&
        Date.now() - activeKillBanner.timestamp > 3200
      ) {
        activeKillBanner = null;
      }

      // 0. Update 3D Cargo Dropship Plane Flight Across Bermuda Island
      if (planeState.active) {
        planeState.elapsedSec += dt;
        planeState.x += planeState.dirX * planeState.speed * dt;
        planeState.z += planeState.dirZ * planeState.speed * dt;
        dropshipPlaneMesh.visible = true;
        dropshipPlaneMesh.position.set(
          planeState.x,
          planeState.y,
          planeState.z
        );
        dropshipPlaneMesh.rotation.y = planeState.rotationY;

        // Spin the 4 turboprop engines
        const propsGroup = dropshipPlaneMesh.getObjectByName('propellersGroup');
        if (propsGroup) {
          propsGroup.children.forEach((spinner) => {
            spinner.rotation.z = elapsedSec * 28;
          });
        }

        // Auto-eject any contender still inside the plane once it reaches the far boundary of the island
        const planeDistFromCenter = distance2D(0, 0, planeState.x, planeState.z);
        if (
          planeState.elapsedSec > 6.4 ||
          (planeState.elapsedSec > 2.2 && planeDistFromCenter > ARENA_RADIUS - 12)
        ) {
          for (const c of contenders) {
            if (c.alive && c.dropPhase === 'in_plane') {
              ejectContenderFromPlane(c);
            }
          }
        }

        if (planeDistFromCenter > ARENA_RADIUS + 60) {
          planeState.active = false;
          dropshipPlaneMesh.visible = false;
        }
      }

      // 1. Shrinking Storm Wall
      storm.timeRemainingSec -= dt;
      const phaseCfg =
        STORM_PHASES[clamp(storm.phase - 1, 0, STORM_PHASES.length - 1)];
      const progress = clamp(
        1 - storm.timeRemainingSec / phaseCfg.durationSec,
        0,
        1
      );
      storm.currentRadius = lerp(
        phaseCfg.startRadius,
        phaseCfg.targetRadius,
        progress
      );
      storm.isShrinking = progress > 0.25;

      if (storm.timeRemainingSec <= 0 && storm.phase < STORM_PHASES.length) {
        storm.phase += 1;
        const nextCfg = STORM_PHASES[storm.phase - 1];
        storm.timeRemainingSec = nextCfg.durationSec;
        storm.targetRadius = nextCfg.targetRadius;
        storm.damagePerSecond = nextCfg.damagePerSec;
      }

      stormWallMesh.scale.set(storm.currentRadius, 1, storm.currentRadius);
      stormFloorRing.scale.set(storm.currentRadius, storm.currentRadius, 1);

      // 2. Local Player: Plane Flight -> Freefall Skydive -> Parachute Glide -> Ground Movement & Combat
      const local = getLocalContender();
      if (local && local.alive) {
        if (heldKeys['ArrowLeft']) mouseLookYaw += 2.2 * dt;
        if (heldKeys['ArrowRight']) mouseLookYaw -= 2.2 * dt;
        if (heldKeys['ArrowUp']) {
          mouseLookPitch = clamp(mouseLookPitch + 1.5 * dt, -0.65, 0.72);
        }
        if (heldKeys['ArrowDown']) {
          mouseLookPitch = clamp(mouseLookPitch - 1.5 * dt, -0.65, 0.72);
        }

        local.rotationY = mouseLookYaw;
        local.pitch = mouseLookPitch;

        if (local.dropPhase === 'in_plane') {
          // Riding inside the high-altitude Dropship Plane
          local.x = planeState.x;
          local.y = planeState.y;
          local.z = planeState.z;
          local.vx = 0;
          local.vy = 0;
          local.vz = 0;
          local.isGrounded = false;
          local.isSprinting = false;
          isAdsActive = false;
          activeJoystickVisX = 0;
          activeJoystickVisY = 0;
        } else if (
          local.dropPhase === 'freefall' ||
          local.dropPhase === 'parachute'
        ) {
          // Skydiving ('freefall') or Gliding with 3D Parachute ('parachute')
          isAdsActive = false;
          local.isSprinting = false;

          let forwardInput = joystickState.active
            ? joystickState.y
            : (heldKeys['KeyW'] || heldKeys['w'] ? 1 : 0) -
              (heldKeys['KeyS'] || heldKeys['s'] ? 1 : 0);
          const rightInput = joystickState.active
            ? joystickState.x
            : (heldKeys['KeyD'] || heldKeys['d'] ? 1 : 0) -
              (heldKeys['KeyA'] || heldKeys['a'] ? 1 : 0);

          activeJoystickVisX = clamp(rightInput, -1, 1);
          activeJoystickVisY = clamp(forwardInput, -1, 1);

          // Gently glide forward even if no key is held so parachute feels responsive
          if (forwardInput === 0 && rightInput === 0) {
            forwardInput = 0.45;
          }

          const airHorizontalSpeed =
            local.dropPhase === 'freefall' ? 22.0 : 15.5;
          const fwdX = Math.sin(local.rotationY);
          const fwdZ = Math.cos(local.rotationY);
          const rightX = -Math.cos(local.rotationY);
          const rightZ = Math.sin(local.rotationY);

          let moveX = fwdX * forwardInput + rightX * rightInput;
          let moveZ = fwdZ * forwardInput + rightZ * rightInput;
          const len = Math.hypot(moveX, moveZ);
          if (len > 0.001) {
            moveX = (moveX / len) * airHorizontalSpeed;
            moveZ = (moveZ / len) * airHorizontalSpeed;
          }

          local.vx = THREE.MathUtils.damp(local.vx, moveX, 8, dt);
          local.vz = THREE.MathUtils.damp(local.vz, moveZ, 8, dt);
          local.x += local.vx * dt;
          local.z += local.vz * dt;

          const distFromCenter = distance2D(0, 0, local.x, local.z);
          if (distFromCenter > ARENA_RADIUS - 4) {
            const scaleBack = (ARENA_RADIUS - 4) / distFromCenter;
            local.x *= scaleBack;
            local.z *= scaleBack;
          }

          const terrainY = groundHeightAt(local.x, local.z);
          const altitudeAboveGround = local.y - terrainY;

          // Auto-deploy parachute at 28m altitude above ground (just like Free Fire!)
          if (local.dropPhase === 'freefall' && altitudeAboveGround <= 28) {
            deployContenderParachute(local);
          }

          const targetFallSpeed =
            local.dropPhase === 'freefall'
              ? heldKeys['KeyW'] || heldKeys['w'] || joystickState.y > 0.35
                ? -32.0
                : -24.5
              : -7.8;
          local.vy = THREE.MathUtils.damp(local.vy, targetFallSpeed, 10, dt);
          local.y += local.vy * dt;

          // Check if landed on the ground!
          if (local.y <= terrainY) {
            local.y = terrainY;
            local.vy = 0;
            local.isGrounded = true;
            local.dropPhase = 'landed';
            // Push outside any building footprint on landing so player never lands stuck inside a wall
            const safeLanding = resolveEntityObstacleCollisions(
              local.x,
              local.y,
              local.z,
              0.95,
              arenaObstacles
            );
            local.x = safeLanding.x;
            local.z = safeLanding.z;
            local.y = groundHeightAt(local.x, local.z);
            soundFX.playJump();
          }
        } else {
          // Ground Combat Mode (`local.dropPhase === 'landed'`)
          let forwardInput =
            (heldKeys['KeyW'] || heldKeys['w'] ? 1 : 0) -
            (heldKeys['KeyS'] || heldKeys['s'] ? 1 : 0);
          let rightInput =
            (heldKeys['KeyD'] || heldKeys['d'] ? 1 : 0) -
            (heldKeys['KeyA'] || heldKeys['a'] ? 1 : 0);

          // When the player touches the on-screen joystick:
          // Sprinting is stopped (`isSprintToggled = false`) and movement is driven by the joystick!
          // If the player wants to sprint again, they must press Shift (or tap the Sprint button).
          if (joystickState.active) {
            isSprintToggled = false;
            forwardInput = joystickState.y;
            rightInput = joystickState.x;
          }

          // If player presses backward (S) or scopes in with RMB, cancel sprint toggle
          if (forwardInput < -0.15 || isAdsActive) {
            isSprintToggled = false;
          }

          // When Shift Sprint Toggle is ON: character sprints continuously
          if (isSprintToggled && Math.abs(forwardInput) < 0.05) {
            forwardInput = 1;
          }

          activeJoystickVisX = clamp(rightInput, -1, 1);
          activeJoystickVisY = clamp(forwardInput, -1, 1);

          const isMoving =
            Math.abs(forwardInput) > 0.04 || Math.abs(rightInput) > 0.04;
          local.isSprinting = Boolean(
            isSprintToggled && isMoving && !isAdsActive
          );

          const buff = getSynergyBuffSpec(local.activeBuff);
          const adsSpeedFactor = isAdsActive ? 0.65 : 1.0;
          const sprintMultiplier = local.isSprinting ? 1.72 : 1.0;
          const baseSpeed =
            13.6 * buff.speedMultiplier * adsSpeedFactor * sprintMultiplier;

          const fwdX = Math.sin(local.rotationY);
          const fwdZ = Math.cos(local.rotationY);
          const rightX = -Math.cos(local.rotationY);
          const rightZ = Math.sin(local.rotationY);

          const inputMag = Math.min(1, Math.hypot(forwardInput, rightInput));
          let moveX = fwdX * forwardInput + rightX * rightInput;
          let moveZ = fwdZ * forwardInput + rightZ * rightInput;
          const len = Math.hypot(moveX, moveZ);
          if (len > 0.001) {
            moveX = (moveX / len) * baseSpeed * inputMag;
            moveZ = (moveZ / len) * baseSpeed * inputMag;
          }

          local.vx = THREE.MathUtils.damp(local.vx, moveX, 18, dt);
          local.vz = THREE.MathUtils.damp(local.vz, moveZ, 18, dt);
          local.x += local.vx * dt;
          local.z += local.vz * dt;

          // Solid Building, Wall, Container, Crate & Rock Collision (No walking through buildings!)
          const resolvedLocal = resolveEntityObstacleCollisions(
            local.x,
            local.y,
            local.z,
            0.92,
            arenaObstacles
          );
          local.x = resolvedLocal.x;
          local.z = resolvedLocal.z;

          const distFromCenter = distance2D(0, 0, local.x, local.z);
          if (distFromCenter > ARENA_RADIUS) {
            const scaleBack = ARENA_RADIUS / distFromCenter;
            local.x *= scaleBack;
            local.z *= scaleBack;
          }

          // Vertical Jump & Gravity Physics
          const terrainY = groundHeightAt(local.x, local.z);
          if (!local.isGrounded || local.vy !== 0) {
            local.vy -= 28.0 * dt; // Gravity
            local.y += local.vy * dt;
            if (local.y <= terrainY) {
              local.y = terrainY;
              local.vy = 0;
              local.isGrounded = true;
            }
          } else {
            local.y = terrainY;
          }

          // LMB = Fire Weapon (Only once landed!)
          if (isPointerDown) {
            actionRef.current?.triggerFireWeapon();
          }
        }
      }

      // 3. Rival / AI Contenders Update (Plane Jump -> Parachute -> Land -> Fight with Max 50 Bot DMG Cap)
      const nowSec = performance.now() / 1000;
      const playerReachedBotDamageCap =
        botDamageTakenByLocalPlayer >= MAX_COMPANION_DAMAGE;

      for (const bot of contenders) {
        if (bot.isLocalPlayer || !bot.alive) continue;

        // Phase A: Contender is still inside the Dropship Plane waiting for their jump time
        if (bot.dropPhase === 'in_plane') {
          bot.x = planeState.x;
          bot.y = planeState.y;
          bot.z = planeState.z;
          if (planeState.elapsedSec >= (bot.planeJumpTimeSec ?? 1.5)) {
            ejectContenderFromPlane(bot);
          }
          continue;
        }

        // Phase B: Contender is skydiving ('freefall') or gliding under their 3D parachute ('parachute')
        if (bot.dropPhase === 'freefall' || bot.dropPhase === 'parachute') {
          const targetLandX = bot.aiTargetX ?? 0;
          const targetLandZ = bot.aiTargetZ ?? 0;
          const toLandX = targetLandX - bot.x;
          const toLandZ = targetLandZ - bot.z;
          const toLandLen = Math.hypot(toLandX, toLandZ);
          const glideSpeed = bot.dropPhase === 'freefall' ? 18.0 : 13.5;

          if (toLandLen > 1.5) {
            bot.vx = (toLandX / toLandLen) * glideSpeed;
            bot.vz = (toLandZ / toLandLen) * glideSpeed;
            bot.x += bot.vx * dt;
            bot.z += bot.vz * dt;
            bot.rotationY = Math.atan2(bot.vx, bot.vz);
          }

          const terrainY = groundHeightAt(bot.x, bot.z);
          if (bot.dropPhase === 'freefall' && bot.y - terrainY <= 30) {
            deployContenderParachute(bot);
          }

          const fallSpeed = bot.dropPhase === 'freefall' ? -24.0 : -8.2;
          bot.vy = fallSpeed;
          bot.y += bot.vy * dt;

          if (bot.y <= terrainY) {
            bot.y = terrainY;
            bot.vy = 0;
            bot.isGrounded = true;
            bot.dropPhase = 'landed';
            const safeBotLand = resolveEntityObstacleCollisions(
              bot.x,
              bot.y,
              bot.z,
              0.92,
              arenaObstacles
            );
            bot.x = safeBotLand.x;
            bot.z = safeBotLand.z;
            bot.y = groundHeightAt(bot.x, bot.z);
          }
          continue;
        }

        // Phase C: Contender has landed (`bot.dropPhase === 'landed'`) -> Ground Loot & Combat!
        if (!bot.companion) {
          const nearVm = getNearestVending(bot);
          if (nearVm) {
            spawnCompanionForContender(bot);
          }
        }

        const nearItem = getNearestLoot(bot);
        if (nearItem) {
          nearItem.collected = true;
          const m = lootMeshes.get(nearItem.id);
          if (m) m.visible = false;
          if (nearItem.kind === 'weapon' && nearItem.weaponSpec) {
            bot.weapon = nearItem.weaponSpec;
          } else if (nearItem.kind === 'medkit' && nearItem.healAmount) {
            bot.hp = clampPlayerHp(bot.hp + nearItem.healAmount);
          }
        }

        // If this bot has already used up its 50 max damage ability, it doesn't shoot anymore!
        const botReachedOwn50Cap =
          bot.isBot && bot.botTotalDamageDealt >= MAX_COMPANION_DAMAGE;

        let nearestEnemy: ContenderState | null = null;
        let nearestDist = Infinity;
        if (!botReachedOwn50Cap) {
          for (const other of contenders) {
            // Only engage enemies who have ALSO landed on the ground!
            if (
              other.id === bot.id ||
              !other.alive ||
              other.dropPhase !== 'landed'
            ) {
              continue;
            }
            if (other.isLocalPlayer && playerReachedBotDamageCap) continue;
            if (
              bot.isBot &&
              other.isBot &&
              other.hp <= MAX_PLAYER_HP - MAX_COMPANION_DAMAGE
            ) {
              continue;
            }
            const d = distance2D(bot.x, bot.z, other.x, other.z);
            if (d < nearestDist) {
              nearestDist = d;
              nearestEnemy = other;
            }
          }
        }

        const distOutsideStorm = distance2D(0, 0, bot.x, bot.z);
        bot.aiStateTimer = (bot.aiStateTimer ?? 0) - dt;

        if (distOutsideStorm > storm.currentRadius * 0.85) {
          bot.aiTargetX = storm.centerX + (Math.random() - 0.5) * 14;
          bot.aiTargetZ = storm.centerZ + (Math.random() - 0.5) * 14;
        } else if (nearestEnemy && nearestDist < 42) {
          if (bot.aiStateTimer <= 0) {
            const strafeAngle = Math.random() * Math.PI * 2;
            bot.aiTargetX = nearestEnemy.x + Math.cos(strafeAngle) * 14;
            bot.aiTargetZ = nearestEnemy.z + Math.sin(strafeAngle) * 14;
            bot.aiStateTimer = 2.4;
          }
        } else if (bot.aiStateTimer <= 0) {
          const rAngle = Math.random() * Math.PI * 2;
          const rDist = Math.random() * (storm.currentRadius * 0.72);
          bot.aiTargetX = Math.cos(rAngle) * rDist;
          bot.aiTargetZ = Math.sin(rAngle) * rDist;
          bot.aiStateTimer = 4.0;
        }

        const tx = (bot.aiTargetX ?? 0) - bot.x;
        const tz = (bot.aiTargetZ ?? 0) - bot.z;
        const tLen = Math.hypot(tx, tz);
        const botSpeed = 8.6;
        if (tLen > 1.2) {
          bot.vx = THREE.MathUtils.damp(bot.vx, (tx / tLen) * botSpeed, 6, dt);
          bot.vz = THREE.MathUtils.damp(bot.vz, (tz / tLen) * botSpeed, 6, dt);
          bot.x += bot.vx * dt;
          bot.z += bot.vz * dt;
        } else {
          bot.vx = 0;
          bot.vz = 0;
        }

        // Solid Obstacle Collision for Bots (Bots cannot walk through buildings!)
        const resolvedBot = resolveEntityObstacleCollisions(
          bot.x,
          bot.y,
          bot.z,
          0.92,
          arenaObstacles
        );
        bot.x = resolvedBot.x;
        bot.z = resolvedBot.z;
        bot.y = groundHeightAt(bot.x, bot.z);

        // Bots check Line-of-Sight so they NEVER shoot through buildings/walls!
        const canSeeEnemy =
          nearestEnemy !== null &&
          hasLineOfSight(
            bot.x,
            bot.y + 1.8,
            bot.z,
            nearestEnemy.x,
            nearestEnemy.y + 1.8,
            nearestEnemy.z,
            arenaObstacles
          );

        if (
          !botReachedOwn50Cap &&
          nearestEnemy &&
          canSeeEnemy &&
          nearestDist < bot.weapon.range * 0.85
        ) {
          const dx = nearestEnemy.x - bot.x;
          const dy = nearestEnemy.y + 1.5 - (bot.y + 1.5);
          const dz = nearestEnemy.z - bot.z;
          const aimYaw = Math.atan2(dx, dz);
          const aimPitch = clamp(Math.atan2(dy, nearestDist), -0.4, 0.4);
          bot.rotationY = aimYaw;
          bot.pitch = aimPitch;

          if (nowSec - bot.lastShotTime >= bot.weapon.fireRateSec * 1.75) {
            bot.lastShotTime = nowSec;
            const len3D = Math.hypot(dx, dy, dz) || 1;
            spawnDirectedProjectiles(
              bot,
              false,
              bot.x,
              bot.y + 1.7,
              bot.z,
              dx / len3D,
              dy / len3D,
              dz / len3D,
              10,
              bot.weapon.projectileSpeed * 0.8,
              bot.weapon.range,
              1,
              0.08,
              bot.weapon.colorHex
            );
          }
        } else if (tLen > 0.5) {
          bot.rotationY = Math.atan2(tx, tz);
          bot.pitch = 0;
        }
      }

      // 4. Companion Helper Bots Update (Max 50 DMG ability + Obstacle Collision & Line-of-Sight)
      for (const c of contenders) {
        if (!c.alive || !c.companion || c.dropPhase !== 'landed') continue;
        const comp = c.companion;
        const followOffsetAngle = c.rotationY - 0.85;
        const desiredX = c.x + Math.sin(followOffsetAngle) * 2.6;
        const desiredZ = c.z + Math.cos(followOffsetAngle) * 2.6;

        comp.x = THREE.MathUtils.damp(comp.x, desiredX, 7, dt);
        comp.z = THREE.MathUtils.damp(comp.z, desiredZ, 7, dt);
        const resolvedComp = resolveEntityObstacleCollisions(
          comp.x,
          comp.y,
          comp.z,
          0.7,
          arenaObstacles
        );
        comp.x = resolvedComp.x;
        comp.z = resolvedComp.z;
        comp.y = groundHeightAt(comp.x, comp.z);

        const compReached50Cap = comp.damageDealtTotal >= MAX_COMPANION_DAMAGE;

        let targetEnemy: ContenderState | null = null;
        let bestEnemyDist = 48;
        if (!compReached50Cap) {
          for (const other of contenders) {
            if (
              other.id === c.id ||
              !other.alive ||
              other.dropPhase !== 'landed'
            ) {
              continue;
            }
            if (other.isLocalPlayer && playerReachedBotDamageCap) continue;
            const d = distance2D(comp.x, comp.z, other.x, other.z);
            if (
              d < bestEnemyDist &&
              hasLineOfSight(
                comp.x,
                comp.y + 1.1,
                comp.z,
                other.x,
                other.y + 1.5,
                other.z,
                arenaObstacles
              )
            ) {
              bestEnemyDist = d;
              targetEnemy = other;
            }
          }
        }

        const buff = getSynergyBuffSpec(c.activeBuff);
        const attackInterval = 2.0 * buff.companionCooldownMultiplier;

        if (!compReached50Cap && targetEnemy) {
          comp.targetId = targetEnemy.id;
          const dx = targetEnemy.x - comp.x;
          const dy = targetEnemy.y + 1.5 - (comp.y + 1.1);
          const dz = targetEnemy.z - comp.z;
          comp.rotationY = Math.atan2(dx, dz);
          comp.pitch = clamp(Math.atan2(dy, bestEnemyDist), -0.45, 0.45);

          if (nowSec - comp.lastAttackTime >= attackInterval) {
            comp.lastAttackTime = nowSec;
            if (c.isLocalPlayer) {
              soundFX.playCompanionAttack(comp.type);
            }
            const remainingCompBudget = Math.max(
              0,
              MAX_COMPANION_DAMAGE - comp.damageDealtTotal
            );
            const rawBotDmg = Math.min(
              remainingCompBudget,
              c.isLocalPlayer ? 25 : 12
            );
            if (rawBotDmg > 0) {
              const len3D = Math.hypot(dx, dy, dz) || 1;
              const projColor = comp.type === 'girl' ? 0xf43f5e : 0x38bdf8;
              spawnDirectedProjectiles(
                c,
                true,
                comp.x,
                comp.y + 1.1,
                comp.z,
                dx / len3D,
                dy / len3D,
                dz / len3D,
                rawBotDmg,
                110,
                56,
                1,
                0.01,
                projColor
              );
            }
          }
        } else {
          comp.targetId = null;
          comp.rotationY = c.rotationY;
          comp.pitch = c.pitch;
        }

        const cMesh = companionMeshes.get(c.id);
        if (cMesh) {
          cMesh.position.set(comp.x, comp.y, comp.z);
          cMesh.rotation.y = comp.rotationY;
        }
      }

      // 5. Storm Tick Damage (Only applies after contenders have landed on the island)
      for (const c of contenders) {
        if (!c.alive) continue;
        if (c.dropPhase === 'landed') {
          const distFromStormCenter = distance2D(
            storm.centerX,
            storm.centerZ,
            c.x,
            c.z
          );
          if (distFromStormCenter > storm.currentRadius) {
            if (c.isLocalPlayer) {
              c.hp = clampPlayerHp(c.hp - storm.damagePerSecond * dt);
              if (c.hp <= 0) {
                const aliveRemaining = contenders.filter((x) => x.alive).length;
                c.alive = false;
                c.eliminatedAt = performance.now();
                c.placement = aliveRemaining;
              }
            } else {
              c.hp = Math.max(
                150,
                clampPlayerHp(c.hp - storm.damagePerSecond * 0.2 * dt)
              );
            }
          }
        }

        const mesh = contenderMeshes.get(c.id);
        if (mesh && c.alive) {
          if (c.dropPhase === 'in_plane') {
            mesh.visible = false;
          } else {
            mesh.position.set(c.x, c.y, c.z);
            mesh.rotation.y = c.rotationY;
            if (c.isLocalPlayer) {
              mesh.visible = !(isAdsActive && c.weapon.scopeZoom === 4);
            } else {
              mesh.visible = true;
            }
            animateContenderRig(c, mesh, elapsedSec, c.isLocalPlayer);
          }
        }
      }

      // 6. Update Projectiles & Hit Detection (Buildings/Walls Block Bullets + Only Landed Contenders Fight)
      const hitRadius2D = 1.15 * CONTENDER_MODEL_SCALE;
      const hitCenterHeight = 1.15 * CONTENDER_MODEL_SCALE;
      const hitHalfHeight = 1.3 * CONTENDER_MODEL_SCALE;

      for (let i = projectiles.length - 1; i >= 0; i--) {
        const p = projectiles[i];
        const prevX = p.x;
        const prevY = p.y;
        const prevZ = p.z;

        const stepX = p.vx * dt;
        const stepY = p.vy * dt;
        const stepZ = p.vz * dt;

        p.x += stepX;
        p.y += stepY;
        p.z += stepZ;
        p.distanceTraveled += Math.hypot(stepX, stepY, stepZ);

        const pMesh = projectileMeshes.get(p.id);
        if (pMesh) {
          pMesh.position.set(p.x, p.y, p.z);
        }

        // Check if projectile hit ground OR hit a solid building, wall, container, crate, or rock!
        const groundY = groundHeightAt(p.x, p.z);
        const hitWall = segmentHitsObstacle(
          prevX,
          prevY,
          prevZ,
          p.x,
          p.y,
          p.z,
          arenaObstacles,
          0.05
        );
        if (p.y <= groundY - 0.1 || hitWall !== null) {
          if (pMesh) {
            worldGroup.remove(pMesh);
            disposeObject3D(pMesh);
            projectileMeshes.delete(p.id);
          }
          projectiles.splice(i, 1);
          continue;
        }

        let hitOccurred = false;
        for (const target of contenders) {
          if (
            !target.alive ||
            target.id === p.ownerId ||
            target.dropPhase !== 'landed'
          ) {
            continue;
          }

          if (target.isLocalPlayer && p.fromBotOrCompanion) {
            if (botDamageTakenByLocalPlayer >= MAX_COMPANION_DAMAGE) {
              continue;
            }
          }

          const hitDist2D = distance2D(p.x, p.z, target.x, target.z);
          const verticalDiff = Math.abs(
            p.y - (target.y + hitCenterHeight)
          );
          if (hitDist2D < hitRadius2D && verticalDiff < hitHalfHeight) {
            hitOccurred = true;
            const attacker = contenders.find((a) => a.id === p.ownerId);

            let appliedDmg = p.damage;

            if (p.fromBotOrCompanion) {
              if (p.fromCompanion && attacker?.companion) {
                const rem = Math.max(
                  0,
                  MAX_COMPANION_DAMAGE - attacker.companion.damageDealtTotal
                );
                appliedDmg = Math.min(appliedDmg, rem);
                attacker.companion.damageDealtTotal += appliedDmg;
              } else if (attacker?.isBot) {
                const rem = Math.max(
                  0,
                  MAX_COMPANION_DAMAGE - attacker.botTotalDamageDealt
                );
                appliedDmg = Math.min(appliedDmg, rem);
                attacker.botTotalDamageDealt += appliedDmg;
              }

              if (target.isLocalPlayer) {
                const remPlayer = Math.max(
                  0,
                  MAX_COMPANION_DAMAGE - botDamageTakenByLocalPlayer
                );
                appliedDmg = Math.min(appliedDmg, remPlayer);
                botDamageTakenByLocalPlayer += appliedDmg;
              }
            }

            if (appliedDmg > 0) {
              let remainingDmg = appliedDmg;
              if (target.shield > 0) {
                const absorbed = Math.min(target.shield, remainingDmg);
                target.shield -= absorbed;
                remainingDmg -= absorbed;
              }

              // CRITICAL RULE: Bots NEVER kill the player AND bots NEVER kill other bots!
              if (p.fromBotOrCompanion) {
                target.hp = Math.max(
                  1,
                  clampPlayerHp(target.hp - remainingDmg)
                );
              } else {
                target.hp = clampPlayerHp(target.hp - remainingDmg);
              }

              if (attacker) {
                attacker.damageDealt += appliedDmg;
                if (attacker.isLocalPlayer && p.fromCompanion) {
                  localCompanionDamageTotal += appliedDmg;
                }
                const attackerBuff = getSynergyBuffSpec(attacker.activeBuff);
                if (attackerBuff.lifestealRatio > 0 && attacker.alive) {
                  attacker.hp = clampPlayerHp(
                    attacker.hp + appliedDmg * attackerBuff.lifestealRatio
                  );
                }
              }

              if (target.isLocalPlayer) {
                cameraShakeIntensity = Math.min(
                  0.18,
                  cameraShakeIntensity + 0.06
                );
              }
            }

            // Elimination (Only Player shots can reduce HP to 0!)
            if (target.hp <= 0 && !p.fromBotOrCompanion) {
              const aliveBefore = contenders.filter((x) => x.alive).length;
              target.alive = false;
              target.eliminatedAt = performance.now();
              target.placement = aliveBefore;

              const tMesh = contenderMeshes.get(target.id);
              if (tMesh) tMesh.visible = false;
              const tCompMesh = companionMeshes.get(target.id);
              if (tCompMesh) tCompMesh.visible = false;

              if (attacker) {
                attacker.kills += 1;
                if (attacker.activeBuff === 'shielded_romance') {
                  attacker.shield = clamp(
                    attacker.shield + 25,
                    0,
                    MAX_PLAYER_SHIELD
                  );
                }
                if (attacker.isLocalPlayer) {
                  soundFX.playHitMarker(true);
                  hitstopTimer = 0.04;
                  activeKillBanner = {
                    id: generateId('kb'),
                    victimName: target.name,
                    weaponName: attacker.weapon.name,
                    killStreakNumber: attacker.kills,
                    headline: getKillStreakHeadline(attacker.kills),
                    timestamp: Date.now(),
                  };
                }
              }

              killFeed.unshift({
                id: generateId('kf'),
                killerName: attacker ? attacker.name : 'Mohammad',
                victimName: target.name,
                weaponName: attacker?.weapon.name || 'Rifle',
                timestamp: Date.now(),
              });
              killFeed = killFeed.slice(0, 5);
            } else {
              if (attacker?.isLocalPlayer) {
                soundFX.playHitMarker(false);
              }
            }
            break;
          }
        }

        if (hitOccurred || p.distanceTraveled >= p.maxRange) {
          if (pMesh) {
            worldGroup.remove(pMesh);
            disposeObject3D(pMesh);
            projectileMeshes.delete(p.id);
          }
          projectiles.splice(i, 1);
        }
      }

      // 7. Victory / Elimination Check
      const aliveList = contenders.filter((c) => c.alive);
      if (local && !local.alive) {
        completeMatch(local.placement ?? aliveList.length + 1);
        return;
      }
      if (
        contenders.length > 1 &&
        aliveList.length <= 1 &&
        local &&
        local.alive
      ) {
        local.placement = 1;
        completeMatch(1);
        return;
      }

      // 8. CAMERA SYSTEM:
      // - While in the Dropship Plane (`local.dropPhase === 'in_plane'`): External 3D chase camera overlooking the plane & Bermuda Island.
      // - During Freefall, Parachute, and Ground Combat: Free Fire Over-the-Right-Shoulder Camera + Stationary Crosshair!
      if (local) {
        if (local.dropPhase === 'in_plane') {
          if (Math.abs(camera.fov - BASE_FOV) > 0.05) {
            camera.fov = THREE.MathUtils.damp(camera.fov, BASE_FOV, 14, dt);
            camera.updateProjectionMatrix();
          }
          const camDist = 26.0;
          const pitchClamp = clamp(local.pitch, -0.55, 0.25);
          const camX =
            planeState.x -
            Math.sin(local.rotationY) * Math.cos(pitchClamp) * camDist;
          const camY = planeState.y + 8.5 - Math.sin(pitchClamp) * camDist;
          const camZ =
            planeState.z -
            Math.cos(local.rotationY) * Math.cos(pitchClamp) * camDist;

          camera.position.set(camX, camY, camZ);
          camera.lookAt(planeState.x, planeState.y - 1.5, planeState.z);
        } else {
          const activeZoom: 1 | 2 | 4 =
            isAdsActive && local.dropPhase === 'landed'
              ? local.weapon.scopeZoom
              : 1;
          const targetFov = BASE_FOV / activeZoom;
          if (Math.abs(camera.fov - targetFov) > 0.05) {
            camera.fov = THREE.MathUtils.damp(camera.fov, targetFov, 18, dt);
            camera.updateProjectionMatrix();
          }

          // Right-hand horizontal unit vector of the player: Right = (-cos(yaw), 0, sin(yaw))
          const rightX = -Math.cos(local.rotationY);
          const rightZ = Math.sin(local.rotationY);

          // Offset camera pivot to the RIGHT of the player so the player stays on the LEFT side of the screen
          // and the crosshair stays on the RIGHT side of the player!
          const shoulderRightOffset =
            activeZoom === 4 ? 0.92 : activeZoom === 2 ? 1.22 : 1.48;
          const shoulderHeight =
            (activeZoom === 4 ? 1.62 : 1.56) * CONTENDER_MODEL_SCALE;

          const pivotX = local.x + rightX * shoulderRightOffset;
          const pivotY = local.y + shoulderHeight;
          const pivotZ = local.z + rightZ * shoulderRightOffset;

          const effectivePitch = local.pitch + localRecoilPitch;
          const aimDirX = Math.sin(local.rotationY) * Math.cos(effectivePitch);
          const aimDirY = Math.sin(effectivePitch);
          const aimDirZ = Math.cos(local.rotationY) * Math.cos(effectivePitch);

          const isAerial =
            local.dropPhase === 'freefall' || local.dropPhase === 'parachute';
          const desiredCamDist = isAerial
            ? 10.8
            : activeZoom === 4
              ? 1.6
              : activeZoom === 2
                ? 4.4
                : 7.8;

          // Prevent camera from clipping inside solid building walls behind the player
          let actualCamDist = desiredCamDist;
          const rawCamX = pivotX - aimDirX * desiredCamDist;
          const rawCamY = pivotY - aimDirY * desiredCamDist;
          const rawCamZ = pivotZ - aimDirZ * desiredCamDist;
          const camWallHit = segmentHitsObstacle(
            pivotX,
            pivotY,
            pivotZ,
            rawCamX,
            rawCamY,
            rawCamZ,
            arenaObstacles,
            0.25
          );
          if (camWallHit !== null) {
            actualCamDist = Math.max(1.2, camWallHit.t * desiredCamDist * 0.88);
          }

          let camX = pivotX - aimDirX * actualCamDist;
          let camZ = pivotZ - aimDirZ * actualCamDist;
          let camY = Math.max(
            groundHeightAt(camX, camZ) + 0.65,
            pivotY - aimDirY * actualCamDist
          );

          if (cameraShakeIntensity > 0.005) {
            camX += (Math.random() - 0.5) * cameraShakeIntensity;
            camY += (Math.random() - 0.5) * cameraShakeIntensity;
            cameraShakeIntensity = THREE.MathUtils.damp(
              cameraShakeIntensity,
              0,
              14,
              dt
            );
          }

          // Rigidly lock camera position & look vector so movement NEVER shifts the crosshair/character alignment!
          camera.position.set(camX, camY, camZ);
          _camLookTarget.set(
            camX + aimDirX * 100,
            camY + aimDirY * 100,
            camZ + aimDirZ * 100
          );
          camera.lookAt(_camLookTarget);
        }
      }

      // 9. Emit Throttled HUD Snapshot (35ms for snappy live joystick & radar feedback)
      if (local && performance.now() - lastHudEmitTime > 35) {
        lastHudEmitTime = performance.now();
        const activeZoom: 1 | 2 | 4 =
          isAdsActive && local.dropPhase === 'landed'
            ? local.weapon.scopeZoom
            : 1;
        const altitudeMeters = Math.max(
          0,
          Math.round(local.y - groundHeightAt(local.x, local.z))
        );
        onHudUpdateRef.current({
          hp: local.hp,
          maxHp: local.maxHp,
          shield: Math.round(local.shield),
          maxShield: local.maxShield,
          botDamageTakenByPlayer: Math.round(botDamageTakenByLocalPlayer),
          maxBotDamageAllowed: MAX_COMPANION_DAMAGE,
          weapon: local.weapon,
          weapons: [local.weapons[0], local.weapons[1]],
          activeWeaponIndex: local.activeWeaponIndex,
          aliveCount: aliveList.length,
          totalContenders: MAX_MATCH_CONTENDERS,
          kills: local.kills,
          damageDealt: Math.round(local.damageDealt),
          companion: local.companion ? { ...local.companion } : null,
          storm: { ...storm },
          nearbyVending: getNearestVending(local),
          nearbyShrine: getNearestShrine(local),
          nearbyLoot: getNearestLoot(local),
          activeBuff: getSynergyBuffSpec(local.activeBuff),
          outsideStorm:
            local.dropPhase === 'landed' &&
            distance2D(storm.centerX, storm.centerZ, local.x, local.z) >
              storm.currentRadius,
          killFeed: [...killFeed],
          killBanner: activeKillBanner ? { ...activeKillBanner } : null,
          isPointerLocked:
            typeof document !== 'undefined' &&
            document.pointerLockElement === renderer.domElement,
          isAds: isAdsActive && local.dropPhase === 'landed',
          isSprinting: local.isSprinting,
          joystickVector: {
            x: activeJoystickVisX,
            y: activeJoystickVisY,
          },
          dropPhase: local.dropPhase,
          altitudeMeters,
          planePos: {
            x: planeState.x,
            z: planeState.z,
            active: planeState.active,
          },
          zoomLevel: activeZoom,
          pitchDeg: Math.round(THREE.MathUtils.radToDeg(local.pitch)),
          currentZoneName: getBermudaZoneName(local.x, local.z),
          playerPos: {
            x: local.x,
            z: local.z,
            rotationY: local.rotationY,
          },
          contenderRadar: contenders.map((c) => ({
            id: c.id,
            x: c.x,
            z: c.z,
            isLocal: c.isLocalPlayer,
            alive: c.alive,
          })),
          vendingRadar: VENDING_MACHINES.map((vm) => ({
            id: vm.id,
            x: vm.x,
            z: vm.z,
          })),
        });
      }
    }

    function tick() {
      if (isDisposed) return;
      const rawDt = clock.getDelta();
      const dt = Math.min(rawDt, 0.05);
      const elapsedSec = clock.getElapsedTime();

      updateSimulation(dt, elapsedSec);
      renderer.render(scene, camera);

      if (isSoftwareGl) {
        afterDraw(tick);
      } else {
        frameId = requestAnimationFrame(tick);
      }
    }

    frameId = requestAnimationFrame(tick);

    return () => {
      isDisposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('wheel', onWheel);
      window.removeEventListener('blur', onWindowBlur);
      window.removeEventListener('resize', onResize);
      domElem.removeEventListener('pointermove', onPointerMove);
      domElem.removeEventListener('pointerdown', onPointerDown);
      domElem.removeEventListener('contextmenu', onContextMenu);
      window.removeEventListener('pointerup', onPointerUp);

      clearDynamicEntities();
      disposeObject3D(scene);
      groundTexture.dispose();
      renderer.dispose();
    };
  }, [actionRef]);

  return (
    <div
      ref={canvasMountRef}
      className="fixed inset-0 w-full h-full z-0 cursor-crosshair"
      aria-label="Heartdrop Royale 3D Bermuda Arena Viewport"
    />
  );
}
