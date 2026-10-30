import * as THREE from 'three';
import { createAsphaltRoadTexture, getContactShadowTexture } from '@/lib/three/materials';
import { ObstacleCollider } from '@/lib/three/obstacles';
import { CUTE_GIRL_PERSONAS } from '@/lib/constants';
import { GirlPersonaId } from '@/types/game';
import { groundHeightAt } from '@/lib/game-utils';

export const CONTENDER_MODEL_SCALE = 1.48; // Larger characters so they are easy to detect and hit

function createContactShadow(radius = 0.85): THREE.Mesh {
  const geo = new THREE.PlaneGeometry(radius * 2, radius * 2);
  geo.rotateX(-Math.PI / 2);
  const mat = new THREE.MeshBasicMaterial({
    map: getContactShadowTexture(),
    transparent: true,
    depthWrite: false,
    opacity: 0.58,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.y = 0.02;
  return mesh;
}

/**
 * Formats contender overhead name:
 * - If bot: "adam(bot)"
 * - If real player: "Mohammad"
 */
export function formatContenderHeaderName(rawName: string, isBot: boolean): string {
  const clean = rawName.trim() || (isBot ? 'adam' : 'Mohammad');
  if (isBot) {
    return clean.toLowerCase().endsWith('(bot)') ? clean : `${clean.toLowerCase()}(bot)`;
  }
  return clean.replace(/\(bot\)$/i, '');
}

/**
 * Draws the overhead nameplate and health bar onto a 2D canvas for a 3D Sprite above the player's head.
 */
function renderNameplateCanvas(
  canvas: HTMLCanvasElement,
  formattedName: string,
  isBot: boolean,
  hpRatio: number
): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Dark tactical backing pill
  ctx.fillStyle = 'rgba(11, 15, 25, 0.82)';
  ctx.strokeStyle = isBot ? 'rgba(244, 63, 94, 0.75)' : 'rgba(16, 185, 129, 0.9)';
  ctx.lineWidth = 3;

  const boxX = 16;
  const boxY = 10;
  const boxW = canvas.width - 32;
  const boxH = canvas.height - 20;
  ctx.beginPath();
  ctx.roundRect(boxX, boxY, boxW, boxH, 14);
  ctx.fill();
  ctx.stroke();

  // Name Text ("adam(bot)" for bots, "Mohammad" for real player)
  ctx.font = 'bold 28px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = isBot ? '#FFE4E6' : '#6EE7B7';
  ctx.fillText(formattedName, canvas.width / 2, 38);

  // Health Bar Track
  const barX = 40;
  const barY = 64;
  const barW = canvas.width - 80;
  const barH = 12;
  ctx.fillStyle = 'rgba(30, 41, 59, 0.95)';
  ctx.fillRect(barX, barY, barW, barH);

  // Health Bar Fill
  const clampedHp = Math.max(0, Math.min(1, hpRatio));
  ctx.fillStyle = isBot ? '#F43F5E' : '#10B981';
  ctx.fillRect(barX, barY, Math.round(barW * clampedHp), barH);
}

function createOverheadNameplateSprite(displayName: string, isBot: boolean): THREE.Sprite {
  const canvas = document.createElement('canvas');
  canvas.width = 320;
  canvas.height = 96;
  const formatted = formatContenderHeaderName(displayName, isBot);
  renderNameplateCanvas(canvas, formatted, isBot, 1.0);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;

  const mat = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthTest: false,
    depthWrite: false,
  });
  const sprite = new THREE.Sprite(mat);
  sprite.name = 'overheadNameplate';
  sprite.position.set(0, 2.22, 0);
  sprite.scale.set(1.95, 0.58, 1);
  sprite.renderOrder = 10;
  sprite.userData = {
    canvas,
    texture,
    formatted,
    isBot,
    lastHpBucket: 100,
  };
  return sprite;
}

/**
 * Updates the overhead nameplate health bar only when the health percentage bucket changes.
 */
export function updateContenderOverheadHealth(
  contenderGroup: THREE.Group,
  hpRatio: number,
  rawName?: string,
  isBot?: boolean
): void {
  const sprite = contenderGroup.getObjectByName('overheadNameplate') as THREE.Sprite | undefined;
  if (!sprite || !sprite.userData?.canvas) return;

  const bucket = Math.round(hpRatio * 25);
  const nextFormatted =
    rawName !== undefined && isBot !== undefined
      ? formatContenderHeaderName(rawName, isBot)
      : sprite.userData.formatted;

  if (
    bucket === sprite.userData.lastHpBucket &&
    nextFormatted === sprite.userData.formatted
  ) {
    return;
  }

  sprite.userData.lastHpBucket = bucket;
  sprite.userData.formatted = nextFormatted;
  renderNameplateCanvas(
    sprite.userData.canvas,
    nextFormatted,
    sprite.userData.isBot,
    hpRatio
  );
  sprite.userData.texture.needsUpdate = true;
}

/**
 * Builds a realistic 14-part Articulated Tactical Survivor Character Rig (`THREE.Group`)
 * scaled up by `CONTENDER_MODEL_SCALE` (1.48x) so characters are large and easy to detect,
 * plus an overhead 3D nameplate displaying `"adam(bot)"` or `"Mohammad"`.
 */
export function createContenderModel(
  armorHex: string,
  visorHex: string,
  outfitStyle: 'striker' | 'valkyrie' | 'phantom',
  displayName = 'Mohammad',
  isBot = false,
  showOverheadNameplate = true
): THREE.Group {
  const group = new THREE.Group();
  group.scale.setScalar(CONTENDER_MODEL_SCALE);
  group.add(createContactShadow(0.95));

  // Only add overhead 3D Nameplate for other contenders (never on local player so it never blocks scope!)
  if (showOverheadNameplate) {
    const nameSprite = createOverheadNameplateSprite(displayName, isBot);
    group.add(nameSprite);
  }

  const jacketMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(armorHex),
    roughness: 0.52,
    metalness: 0.25,
  });
  const vestMat = new THREE.MeshStandardMaterial({
    color: 0x1e242b,
    roughness: 0.65,
    metalness: 0.35,
  });
  const pantsMat = new THREE.MeshStandardMaterial({
    color: 0x27303f,
    roughness: 0.78,
    metalness: 0.1,
  });
  const bootMat = new THREE.MeshStandardMaterial({
    color: 0x11151c,
    roughness: 0.55,
    metalness: 0.3,
  });
  const skinMat = new THREE.MeshStandardMaterial({
    color: 0xeab68c,
    roughness: 0.58,
    metalness: 0.04,
  });
  const hairMat = new THREE.MeshStandardMaterial({
    color: outfitStyle === 'valkyrie' ? 0x1e1b4b : 0x18181b,
    roughness: 0.65,
    metalness: 0.12,
  });
  const accentMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(visorHex),
    emissive: new THREE.Color(visorHex),
    emissiveIntensity: 0.45,
    roughness: 0.22,
    metalness: 0.8,
  });
  const gunMetalMat = new THREE.MeshStandardMaterial({
    color: 0x181c22,
    roughness: 0.28,
    metalness: 0.88,
  });

  // 1 & 2: Articulated Left & Right Legs
  const buildLegRig = (sideOffset: number, name: string) => {
    const legPivot = new THREE.Group();
    legPivot.position.set(sideOffset, 0.78, 0);
    legPivot.name = name;

    const thigh = new THREE.Mesh(new THREE.CapsuleGeometry(0.11, 0.28, 6, 10), pantsMat);
    thigh.position.set(0, -0.18, 0);
    thigh.castShadow = true;

    const kneePad = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.12, 0.16), vestMat);
    kneePad.position.set(0, -0.36, 0.04);

    const shin = new THREE.Mesh(new THREE.CylinderGeometry(0.095, 0.08, 0.32, 10), pantsMat);
    shin.position.set(0, -0.52, 0);
    shin.castShadow = true;

    const boot = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.14, 0.28), bootMat);
    boot.position.set(0, -0.71, 0.04);

    legPivot.add(thigh, kneePad, shin, boot);
    return legPivot;
  };

  group.add(buildLegRig(-0.16, 'leftLegPivot'));
  group.add(buildLegRig(0.16, 'rightLegPivot'));

  // 3: Pelvis & Tactical Utility Belt with Side Holster
  const pelvis = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.18, 0.3), pantsMat);
  pelvis.position.set(0, 0.82, 0);
  const belt = new THREE.Mesh(new THREE.BoxGeometry(0.51, 0.08, 0.33), bootMat);
  belt.position.set(0, 0.89, 0);
  const sideHolster = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.2, 0.16), vestMat);
  sideHolster.position.set(0.28, 0.75, 0.02);
  group.add(pelvis, belt, sideHolster);

  // 4: Torso Jacket + Plate Carrier Vest
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.56, 0.28), jacketMat);
  torso.position.set(0, 1.18, 0);
  torso.castShadow = true;
  group.add(torso);

  const plateCarrier = new THREE.Mesh(new THREE.BoxGeometry(0.51, 0.42, 0.32), vestMat);
  plateCarrier.position.set(0, 1.18, 0);
  group.add(plateCarrier);

  for (let m = -1; m <= 1; m++) {
    const pouch = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.16, 0.06), bootMat);
    pouch.position.set(m * 0.14, 1.1, 0.18);
    group.add(pouch);
  }

  // 5: Level-3 Military Survival Backpack + Secondary Weapon Holster on Back
  const backpack = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.44, 0.2), vestMat);
  backpack.position.set(0, 1.2, -0.22);
  backpack.castShadow = true;
  const packTrim = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.08, 0.22), accentMat);
  packTrim.position.set(0, 1.32, -0.22);
  const backGunBarrel = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.65, 8), gunMetalMat);
  backGunBarrel.position.set(0.18, 1.35, -0.26);
  backGunBarrel.rotation.z = -0.25;
  group.add(backpack, packTrim, backGunBarrel);

  // 6: Neck
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.09, 0.14, 10), skinMat);
  neck.position.set(0, 1.5, 0);
  group.add(neck);

  // 7: Articulated 3D Pitch Aiming Pivot (`aimPivot`) at Shoulder Height (y = 1.34)
  const aimPivot = new THREE.Group();
  aimPivot.position.set(0, 1.34, 0);
  aimPivot.name = 'aimPivot';

  const headGroup = new THREE.Group();
  headGroup.position.set(0, 0.3, 0);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.21, 16, 16), skinMat);
  head.scale.set(0.95, 1.08, 0.98);
  head.castShadow = true;
  headGroup.add(head);

  const helmetCap = new THREE.Mesh(
    new THREE.SphereGeometry(0.225, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.58),
    outfitStyle === 'phantom' ? vestMat : hairMat
  );
  helmetCap.position.set(0, 0.03, -0.01);
  headGroup.add(helmetCap);

  const visorGlasses = new THREE.Mesh(new THREE.BoxGeometry(0.31, 0.08, 0.12), accentMat);
  visorGlasses.position.set(0, 0.02, 0.16);
  const earHeadsetL = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.05, 10), vestMat);
  earHeadsetL.rotation.z = Math.PI / 2;
  earHeadsetL.position.set(-0.21, 0.0, 0);
  const earHeadsetR = earHeadsetL.clone();
  earHeadsetR.position.set(0.21, 0.0, 0);
  headGroup.add(visorGlasses, earHeadsetL, earHeadsetR);
  aimPivot.add(headGroup);

  const rightUpperArm = new THREE.Mesh(new THREE.CapsuleGeometry(0.08, 0.24, 6, 8), jacketMat);
  rightUpperArm.position.set(-0.28, -0.04, 0.14);
  rightUpperArm.rotation.x = Math.PI / 2.6;

  const rightForearm = new THREE.Mesh(new THREE.CapsuleGeometry(0.068, 0.24, 6, 8), skinMat);
  rightForearm.position.set(-0.22, -0.08, 0.38);
  rightForearm.rotation.x = Math.PI / 2;

  const leftUpperArm = new THREE.Mesh(new THREE.CapsuleGeometry(0.08, 0.26, 6, 8), jacketMat);
  leftUpperArm.position.set(0.28, -0.04, 0.16);
  leftUpperArm.rotation.x = Math.PI / 2.5;
  leftUpperArm.rotation.y = -0.32;

  const leftForearm = new THREE.Mesh(new THREE.CapsuleGeometry(0.068, 0.26, 6, 8), skinMat);
  leftForearm.position.set(0.06, -0.08, 0.42);
  leftForearm.rotation.x = Math.PI / 2;
  leftForearm.rotation.y = -0.45;

  aimPivot.add(rightUpperArm, rightForearm, leftUpperArm, leftForearm);

  // Detailed Multi-Part Free Fire Assault Rifle Assembly
  const gunGroup = new THREE.Group();
  gunGroup.name = 'gunAssembly';
  gunGroup.position.set(-0.16, -0.06, 0.42);

  const stock = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.12, 0.24), vestMat);
  stock.position.set(0, -0.02, -0.22);
  const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.13, 0.42), gunMetalMat);
  receiver.position.set(0, 0.01, 0.06);
  const magazine = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.22, 0.09), vestMat);
  magazine.position.set(0, -0.14, 0.12);
  magazine.rotation.x = 0.22;
  const opticMount = new THREE.Mesh(new THREE.BoxGeometry(0.065, 0.06, 0.12), gunMetalMat);
  opticMount.position.set(0, 0.1, 0.04);
  const opticLens = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.04, 0.02), accentMat);
  opticLens.position.set(0, 0.11, 0.09);
  const handguard = new THREE.Mesh(new THREE.BoxGeometry(0.065, 0.09, 0.28), jacketMat);
  handguard.position.set(0, 0.01, 0.34);
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.36, 10), gunMetalMat);
  barrel.rotation.x = Math.PI / 2;
  barrel.position.set(0, 0.02, 0.56);

  const muzzleFlash = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.16, 0),
    new THREE.MeshBasicMaterial({ color: 0xfef08a })
  );
  muzzleFlash.position.set(0, 0.02, 0.78);
  muzzleFlash.visible = false;
  muzzleFlash.name = 'muzzleFlash';

  gunGroup.add(stock, receiver, magazine, opticMount, opticLens, handguard, barrel, muzzleFlash);
  aimPivot.add(gunGroup);

  group.add(aimPivot);

  // 8: Free Fire Arch-Wing Parachute Canopy & Suspension Cords (`parachuteRig`)
  const parachuteRig = new THREE.Group();
  parachuteRig.name = 'parachuteRig';
  parachuteRig.visible = false;

  const canopyMainMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(armorHex),
    roughness: 0.45,
    metalness: 0.15,
    side: THREE.DoubleSide,
  });
  const canopyStripeMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(visorHex),
    emissive: new THREE.Color(visorHex),
    emissiveIntensity: 0.35,
    roughness: 0.35,
    metalness: 0.25,
    side: THREE.DoubleSide,
  });
  const cordMat = new THREE.MeshBasicMaterial({ color: 0xe2e8f0 });

  // Segmented arch-wing parachute canopy above the character
  for (let seg = -3; seg <= 3; seg++) {
    const segGroup = new THREE.Group();
    const angle = seg * 0.16;
    const cellMesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.46, 0.16, 1.35),
      Math.abs(seg) % 2 === 1 ? canopyStripeMat : canopyMainMat
    );
    cellMesh.position.set(
      Math.sin(angle) * 2.5,
      3.45 + Math.cos(angle) * 0.45,
      -0.1
    );
    cellMesh.rotation.z = -angle * 0.85;
    segGroup.add(cellMesh);
    parachuteRig.add(segGroup);
  }

  // 4 Suspension Riser Cords connecting backpack shoulders to canopy
  const cordOffsets = [
    [-0.95, 2.55, 0.25],
    [0.95, 2.55, 0.25],
    [-0.95, 2.55, -0.35],
    [0.95, 2.55, -0.35],
  ];
  cordOffsets.forEach(([cx, cy, cz]) => {
    const cord = new THREE.Mesh(
      new THREE.CylinderGeometry(0.012, 0.012, 2.45, 6),
      cordMat
    );
    cord.position.set(cx * 0.55, cy, cz * 0.6);
    cord.rotation.z = cx > 0 ? -0.34 : 0.34;
    cord.rotation.x = cz > 0 ? 0.12 : -0.12;
    parachuteRig.add(cord);
  });

  group.add(parachuteRig);
  return group;
}

/**
 * Builds the 3D Battle Royale C-130 Cargo Dropship Plane (`THREE.Group`)
 * that flies across Bermuda Island at the start of every match.
 */
export function createDropshipPlaneModel(): THREE.Group {
  const plane = new THREE.Group();

  const hullMat = new THREE.MeshStandardMaterial({
    color: 0x334155,
    roughness: 0.42,
    metalness: 0.65,
  });
  const stripeMat = new THREE.MeshStandardMaterial({
    color: 0xf43f5e,
    emissive: 0xe11d48,
    emissiveIntensity: 0.55,
    roughness: 0.28,
    metalness: 0.5,
  });
  const darkMetalMat = new THREE.MeshStandardMaterial({
    color: 0x0f172a,
    roughness: 0.3,
    metalness: 0.85,
  });
  const cockpitGlassMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    emissive: 0x0284c7,
    emissiveIntensity: 0.5,
    roughness: 0.15,
    metalness: 0.9,
  });

  // Main Cargo Fuselage
  const fuselage = new THREE.Mesh(
    new THREE.CylinderGeometry(2.1, 2.2, 20, 16),
    hullMat
  );
  fuselage.rotation.x = Math.PI / 2;
  fuselage.castShadow = true;
  plane.add(fuselage);

  // Nose Cone & Cockpit Windshield
  const nose = new THREE.Mesh(
    new THREE.ConeGeometry(2.1, 4.5, 16),
    hullMat
  );
  nose.rotation.x = Math.PI / 2;
  nose.position.set(0, 0, 12.25);
  const windshield = new THREE.Mesh(
    new THREE.BoxGeometry(2.4, 0.85, 1.8),
    cockpitGlassMat
  );
  windshield.position.set(0, 1.1, 10.2);
  windshield.rotation.x = 0.25;
  plane.add(nose, windshield);

  // Glowing Rear Jump Ramp (Open Cargo Bay)
  const rearRamp = new THREE.Mesh(
    new THREE.BoxGeometry(2.8, 0.25, 4.2),
    darkMetalMat
  );
  rearRamp.position.set(0, -1.45, -11.2);
  rearRamp.rotation.x = 0.38;
  const cargoGlow = new THREE.Mesh(
    new THREE.BoxGeometry(2.6, 2.2, 0.4),
    stripeMat
  );
  cargoGlow.position.set(0, 0, -9.9);
  plane.add(rearRamp, cargoGlow);

  // Crimson Racing Stripe along Fuselage Sides
  const sideStripe = new THREE.Mesh(
    new THREE.BoxGeometry(4.35, 0.42, 17.5),
    stripeMat
  );
  sideStripe.position.set(0, 0.2, 0);
  plane.add(sideStripe);

  // High Main Wings (28m Wingspan)
  const mainWing = new THREE.Mesh(
    new THREE.BoxGeometry(28, 0.38, 3.8),
    hullMat
  );
  mainWing.position.set(0, 1.55, 1.0);
  mainWing.castShadow = true;
  plane.add(mainWing);

  // Wingtip Navigation Beacons
  const leftBeacon = new THREE.Mesh(
    new THREE.SphereGeometry(0.32, 8, 8),
    new THREE.MeshBasicMaterial({ color: 0xef4444 })
  );
  leftBeacon.position.set(-14.1, 1.65, 1.0);
  const rightBeacon = new THREE.Mesh(
    new THREE.SphereGeometry(0.32, 8, 8),
    new THREE.MeshBasicMaterial({ color: 0x10b981 })
  );
  rightBeacon.position.set(14.1, 1.65, 1.0);
  plane.add(leftBeacon, rightBeacon);

  // Tail Vertical Fin & Horizontal Stabilizer
  const tailFin = new THREE.Mesh(
    new THREE.BoxGeometry(0.45, 5.2, 3.8),
    hullMat
  );
  tailFin.position.set(0, 3.8, -8.2);
  tailFin.rotation.x = -0.2;
  const tailStripe = new THREE.Mesh(
    new THREE.BoxGeometry(0.52, 1.2, 3.6),
    stripeMat
  );
  tailStripe.position.set(0, 5.4, -8.4);
  const hStab = new THREE.Mesh(
    new THREE.BoxGeometry(9.6, 0.28, 2.4),
    hullMat
  );
  hStab.position.set(0, 1.6, -8.6);
  plane.add(tailFin, tailStripe, hStab);

  // 4 Turboprop Engine Nacelles & Spinning Propellers
  const propellersGroup = new THREE.Group();
  propellersGroup.name = 'propellersGroup';
  const engineXOffsets = [-9.5, -5.2, 5.2, 9.5];
  engineXOffsets.forEach((ex) => {
    const nacelle = new THREE.Mesh(
      new THREE.CylinderGeometry(0.58, 0.52, 2.8, 12),
      darkMetalMat
    );
    nacelle.rotation.x = Math.PI / 2;
    nacelle.position.set(ex, 1.15, 2.2);
    plane.add(nacelle);

    const propSpinner = new THREE.Group();
    propSpinner.position.set(ex, 1.15, 3.68);
    const blade1 = new THREE.Mesh(
      new THREE.BoxGeometry(2.3, 0.22, 0.06),
      stripeMat
    );
    const blade2 = new THREE.Mesh(
      new THREE.BoxGeometry(0.22, 2.3, 0.06),
      stripeMat
    );
    propSpinner.add(blade1, blade2);
    propellersGroup.add(propSpinner);
  });
  plane.add(propellersGroup);

  return plane;
}

export function createCuteGirlBotModel(personaId: GirlPersonaId = 'aiko'): THREE.Group {
  const persona = CUTE_GIRL_PERSONAS[personaId] || CUTE_GIRL_PERSONAS.aiko;
  const group = new THREE.Group();
  group.scale.setScalar(1.32);
  group.add(createContactShadow(0.7));

  const dressMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(persona.primaryColor),
    roughness: 0.35,
    metalness: 0.3,
  });
  const trimMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(persona.secondaryColor),
    emissive: new THREE.Color(persona.primaryColor),
    emissiveIntensity: 0.35,
    roughness: 0.2,
    metalness: 0.7,
  });
  const hairMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(persona.hairColor),
    roughness: 0.45,
    metalness: 0.15,
  });
  const skinMat = new THREE.MeshStandardMaterial({
    color: 0xffedd5,
    roughness: 0.55,
    metalness: 0.05,
  });
  const bootMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    roughness: 0.4,
    metalness: 0.5,
  });

  const legGeo = new THREE.CylinderGeometry(0.068, 0.055, 0.46, 10);
  const leftLeg = new THREE.Mesh(legGeo, skinMat);
  leftLeg.position.set(-0.12, 0.3, 0);
  const rightLeg = new THREE.Mesh(legGeo, skinMat);
  rightLeg.position.set(0.12, 0.3, 0);

  const bootGeo = new THREE.BoxGeometry(0.13, 0.14, 0.22);
  const leftBoot = new THREE.Mesh(bootGeo, bootMat);
  leftBoot.position.set(-0.12, 0.07, 0.03);
  const rightBoot = new THREE.Mesh(bootGeo, bootMat);
  rightBoot.position.set(0.12, 0.07, 0.03);
  group.add(leftLeg, rightLeg, leftBoot, rightBoot);

  const skirt = new THREE.Mesh(new THREE.ConeGeometry(0.35, 0.4, 16), dressMat);
  skirt.position.set(0, 0.62, 0);
  skirt.castShadow = true;
  group.add(skirt);

  const bodice = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.15, 0.4, 12), trimMat);
  bodice.position.set(0, 0.94, 0);
  group.add(bodice);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.23, 16, 16), skinMat);
  head.position.set(0, 1.32, 0);
  head.castShadow = true;
  group.add(head);

  const hairCap = new THREE.Mesh(
    new THREE.SphereGeometry(0.245, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.6),
    hairMat
  );
  hairCap.position.set(0, 1.34, -0.02);
  group.add(hairCap);

  const tailGeo = new THREE.ConeGeometry(0.1, 0.52, 10);
  const leftTail = new THREE.Mesh(tailGeo, hairMat);
  leftTail.position.set(-0.27, 1.22, -0.06);
  leftTail.rotation.z = 0.4;
  const rightTail = new THREE.Mesh(tailGeo, hairMat);
  rightTail.position.set(0.27, 1.22, -0.06);
  rightTail.rotation.z = -0.4;
  group.add(leftTail, rightTail);

  const halo = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.025, 8, 24), trimMat);
  halo.rotation.x = Math.PI / 2;
  halo.position.set(0, 1.68, 0);
  group.add(halo);

  const wand = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.5, 8), trimMat);
  wand.rotation.x = Math.PI / 2;
  wand.position.set(-0.24, 0.96, 0.28);
  group.add(wand);

  return group;
}

export function createDogBotModel(): THREE.Group {
  const group = new THREE.Group();
  group.scale.setScalar(1.35);
  group.add(createContactShadow(0.75));

  const coatMat = new THREE.MeshStandardMaterial({
    color: 0xb45309,
    roughness: 0.62,
    metalness: 0.15,
  });
  const armorMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    roughness: 0.35,
    metalness: 0.7,
  });
  const collarMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    emissive: 0x38bdf8,
    emissiveIntensity: 0.5,
    roughness: 0.2,
    metalness: 0.85,
  });

  const body = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.34, 0.74), coatMat);
  body.position.set(0, 0.44, 0);
  body.castShadow = true;
  const vest = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.26, 0.44), armorMat);
  vest.position.set(0, 0.47, 0.04);
  group.add(body, vest);

  const legGeo = new THREE.CylinderGeometry(0.055, 0.045, 0.32, 8);
  const legOffsets = [
    [-0.14, 0.16, 0.24],
    [0.14, 0.16, 0.24],
    [-0.14, 0.16, -0.24],
    [0.14, 0.16, -0.24],
  ];
  legOffsets.forEach(([lx, ly, lz]) => {
    const leg = new THREE.Mesh(legGeo, coatMat);
    leg.position.set(lx, ly, lz);
    group.add(leg);
  });

  const head = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.28, 0.32), coatMat);
  head.position.set(0, 0.68, 0.38);
  const snout = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.14, 0.24), armorMat);
  snout.position.set(0, 0.63, 0.56);
  group.add(head, snout);

  const earGeo = new THREE.ConeGeometry(0.065, 0.18, 6);
  const leftEar = new THREE.Mesh(earGeo, armorMat);
  leftEar.position.set(-0.11, 0.88, 0.36);
  const rightEar = new THREE.Mesh(earGeo, armorMat);
  rightEar.position.set(0.11, 0.88, 0.36);
  group.add(leftEar, rightEar);

  const collar = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.028, 8, 16), collarMat);
  collar.rotation.x = Math.PI / 2;
  collar.position.set(0, 0.58, 0.3);
  const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.045, 0.3, 8), coatMat);
  tail.position.set(0, 0.62, -0.42);
  tail.rotation.x = -0.6;
  group.add(collar, tail);

  const turret = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.055, 0.42, 8), collarMat);
  turret.rotation.x = Math.PI / 2;
  turret.position.set(0, 0.68, 0.05);
  group.add(turret);

  return group;
}

export function createVendingMachineModel(isSoftwareGl: boolean): THREE.Group {
  const group = new THREE.Group();
  group.add(createContactShadow(1.6));

  const bodyMat = new THREE.MeshStandardMaterial({
    color: 0x991b1b,
    roughness: 0.38,
    metalness: 0.55,
  });
  const trimMat = new THREE.MeshStandardMaterial({
    color: 0xfbbf24,
    emissive: 0xf59e0b,
    emissiveIntensity: 0.55,
    roughness: 0.2,
    metalness: 0.85,
  });
  const darkMetalMat = new THREE.MeshStandardMaterial({
    color: 0x181c24,
    roughness: 0.6,
    metalness: 0.45,
  });
  const glassMat = new THREE.MeshPhysicalMaterial({
    color: 0xe0f2fe,
    transparent: true,
    opacity: isSoftwareGl ? 0.35 : 0.48,
    roughness: 0.12,
    metalness: 0.1,
    depthWrite: false,
  });

  const pad = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.16, 1.8), darkMetalMat);
  pad.position.y = 0.08;
  group.add(pad);

  const cabinet = new THREE.Mesh(new THREE.BoxGeometry(1.56, 2.55, 1.04), bodyMat);
  cabinet.position.set(0, 1.38, 0);
  cabinet.castShadow = true;
  cabinet.receiveShadow = true;
  group.add(cabinet);

  const pillarGeo = new THREE.BoxGeometry(0.12, 2.6, 1.08);
  const leftPillar = new THREE.Mesh(pillarGeo, trimMat);
  leftPillar.position.set(-0.78, 1.38, 0);
  const rightPillar = new THREE.Mesh(pillarGeo, trimMat);
  rightPillar.position.set(0.78, 1.38, 0);
  group.add(leftPillar, rightPillar);

  const glass = new THREE.Mesh(new THREE.BoxGeometry(1.18, 1.32, 0.06), glassMat);
  glass.position.set(0, 1.64, 0.51);
  glass.renderOrder = 2;
  group.add(glass);

  const coreItem = new THREE.Mesh(new THREE.OctahedronGeometry(0.28, 0), trimMat);
  coreItem.position.set(0, 1.64, 0.25);
  group.add(coreItem);

  const chute = new THREE.Mesh(new THREE.BoxGeometry(1.12, 0.42, 0.18), darkMetalMat);
  chute.position.set(0, 0.58, 0.49);
  group.add(chute);

  const crown = new THREE.Mesh(new THREE.TorusGeometry(0.54, 0.065, 10, 24), trimMat);
  crown.position.set(0, 3.18, 0);
  crown.name = 'vending_crown';
  group.add(crown);

  return group;
}

export function createCompatibilityShrineModel(): THREE.Group {
  const group = new THREE.Group();
  group.add(createContactShadow(1.4));

  const stoneMat = new THREE.MeshStandardMaterial({
    color: 0x334155,
    roughness: 0.78,
    metalness: 0.2,
  });
  const crystalMat = new THREE.MeshStandardMaterial({
    color: 0xf43f5e,
    emissive: 0xe11d48,
    emissiveIntensity: 0.75,
    roughness: 0.18,
    metalness: 0.85,
  });
  const ringMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    emissive: 0x0284c7,
    emissiveIntensity: 0.55,
    roughness: 0.22,
    metalness: 0.9,
  });

  const base = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.35, 0.35, 8), stoneMat);
  base.position.y = 0.175;
  const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.65, 1.2, 8), stoneMat);
  pillar.position.y = 0.95;

  const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.48, 0), crystalMat);
  crystal.position.y = 2.25;
  crystal.name = 'shrine_crystal';

  const ring1 = new THREE.Mesh(new THREE.TorusGeometry(0.85, 0.04, 8, 24), ringMat);
  ring1.position.y = 2.25;
  ring1.name = 'shrine_ring';

  group.add(base, pillar, crystal, ring1);
  return group;
}

export function createLootItemModel(
  kind: 'weapon' | 'medkit' | 'shield_heart',
  colorHex: number
): THREE.Group {
  const group = new THREE.Group();
  group.add(createContactShadow(0.6));

  const accentMat = new THREE.MeshStandardMaterial({
    color: colorHex,
    emissive: colorHex,
    emissiveIntensity: 0.5,
    roughness: 0.25,
    metalness: 0.8,
  });
  const caseMat = new THREE.MeshStandardMaterial({
    color: 0x1e242b,
    roughness: 0.55,
    metalness: 0.45,
  });

  if (kind === 'weapon') {
    const crate = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.28, 0.52), caseMat);
    crate.position.y = 0.3;
    const gunTop = new THREE.Mesh(new THREE.BoxGeometry(0.78, 0.16, 0.16), accentMat);
    gunTop.position.y = 0.52;
    group.add(crate, gunTop);
  } else if (kind === 'medkit') {
    const box = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.4, 0.48), caseMat);
    box.position.y = 0.34;
    const crossH = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.1, 0.5), accentMat);
    crossH.position.y = 0.34;
    group.add(box, crossH);
  } else {
    const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.36, 0), accentMat);
    gem.position.y = 0.5;
    group.add(gem);
  }

  const ringMat = new THREE.MeshBasicMaterial({
    color: colorHex,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.75,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  });
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.55, 0.68, 20), ringMat);
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.03;
  group.add(ring);

  return group;
}

export function populateIslandScenery(
  scene: THREE.Scene,
  groundTexture: THREE.Texture,
  renderer: THREE.WebGLRenderer
): ObstacleCollider[] {
  const obstacles: ObstacleCollider[] = [];

  const oceanGeo = new THREE.PlaneGeometry(1000, 1000);
  oceanGeo.rotateX(-Math.PI / 2);
  const oceanMat = new THREE.MeshStandardMaterial({
    color: 0x0c4a6e,
    roughness: 0.22,
    metalness: 0.68,
  });
  const ocean = new THREE.Mesh(oceanGeo, oceanMat);
  ocean.position.y = -0.7;
  scene.add(ocean);

  const beachGeo = new THREE.CylinderGeometry(156, 170, 0.8, 64);
  const beachMat = new THREE.MeshStandardMaterial({
    color: 0xa1804c,
    roughness: 0.9,
    metalness: 0.04,
  });
  const beach = new THREE.Mesh(beachGeo, beachMat);
  beach.position.y = -0.38;
  beach.receiveShadow = true;
  scene.add(beach);

  const terrainGeo = new THREE.CylinderGeometry(144, 150, 0.6, 64);
  const terrainMat = new THREE.MeshStandardMaterial({
    map: groundTexture,
    roughness: 0.86,
    metalness: 0.06,
  });
  const terrain = new THREE.Mesh(terrainGeo, terrainMat);
  terrain.position.y = -0.3;
  terrain.receiveShadow = true;
  scene.add(terrain);

  const roadTex = createAsphaltRoadTexture(renderer);
  const roadMat = new THREE.MeshStandardMaterial({
    map: roadTex,
    roughness: 0.78,
    metalness: 0.1,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  });

  const nsRoadGeo = new THREE.PlaneGeometry(7.2, 260);
  nsRoadGeo.rotateX(-Math.PI / 2);
  const nsRoad = new THREE.Mesh(nsRoadGeo, roadMat);
  nsRoad.position.set(-4, 0.03, 0);
  nsRoad.receiveShadow = true;
  scene.add(nsRoad);

  const ewRoadGeo = new THREE.PlaneGeometry(7.2, 260);
  ewRoadGeo.rotateX(-Math.PI / 2);
  ewRoadGeo.rotateY(Math.PI / 2);
  const ewRoad = new THREE.Mesh(ewRoadGeo, roadMat);
  ewRoad.position.set(0, 0.035, -6);
  ewRoad.receiveShadow = true;
  scene.add(ewRoad);

  const stuccoWallMat = new THREE.MeshStandardMaterial({
    color: 0xd6cfc2,
    roughness: 0.85,
    metalness: 0.05,
  });
  const weatheredBrickMat = new THREE.MeshStandardMaterial({
    color: 0x7c3f2c,
    roughness: 0.82,
    metalness: 0.08,
  });
  const concreteMat = new THREE.MeshStandardMaterial({
    color: 0x64748b,
    roughness: 0.8,
    metalness: 0.12,
  });
  const darkRoofMat = new THREE.MeshStandardMaterial({
    color: 0x334155,
    roughness: 0.72,
    metalness: 0.25,
  });
  const windowDarkMat = new THREE.MeshStandardMaterial({
    color: 0x0f172a,
    roughness: 0.2,
    metalness: 0.7,
  });

  // LANDMARK A: BERMUDA CLOCK TOWER (Solid Obstacle Collider)
  const clockTowerGroup = new THREE.Group();
  const ctX = -28;
  const ctZ = -38;
  const ctBaseY = groundHeightAt(ctX, ctZ);
  clockTowerGroup.position.set(ctX, ctBaseY, ctZ);

  const ctPlinth = new THREE.Mesh(new THREE.BoxGeometry(8.5, 0.6, 8.5), concreteMat);
  ctPlinth.position.y = 0.3;
  const ctBase = new THREE.Mesh(new THREE.BoxGeometry(5.2, 6.5, 5.2), weatheredBrickMat);
  ctBase.position.y = 3.55;
  ctBase.castShadow = true;
  ctBase.receiveShadow = true;

  const ctShaft = new THREE.Mesh(new THREE.BoxGeometry(3.8, 8.5, 3.8), weatheredBrickMat);
  ctShaft.position.y = 11.0;
  ctShaft.castShadow = true;

  const ctClockFace = new THREE.Mesh(
    new THREE.CylinderGeometry(1.35, 1.35, 4.0, 20),
    new THREE.MeshStandardMaterial({
      color: 0xfef3c7,
      emissive: 0xf59e0b,
      emissiveIntensity: 0.25,
      roughness: 0.3,
    })
  );
  ctClockFace.rotation.x = Math.PI / 2;
  ctClockFace.position.y = 12.8;

  const ctSpire = new THREE.Mesh(new THREE.ConeGeometry(3.1, 4.8, 4), darkRoofMat);
  ctSpire.rotation.y = Math.PI / 4;
  ctSpire.position.y = 17.6;
  ctSpire.castShadow = true;

  clockTowerGroup.add(ctPlinth, ctBase, ctShaft, ctClockFace, ctSpire);
  scene.add(clockTowerGroup);

  obstacles.push({
    id: 'clock_tower_main',
    x: ctX,
    z: ctZ,
    halfW: 2.85,
    halfD: 2.85,
    minY: ctBaseY,
    maxY: ctBaseY + 18.5,
    rotationY: 0,
    blocksMovement: true,
    blocksBullets: true,
  });

  // LANDMARK B: POCHINOK TWO-STORY TACTICAL COMPOUNDS (Solid Building Colliders)
  const createPochinokBuilding = (id: string, bx: number, bz: number, rotY: number) => {
    const bGroup = new THREE.Group();
    const by = groundHeightAt(bx, bz);
    bGroup.position.set(bx, by, bz);
    bGroup.rotation.y = rotY;

    const floorPad = new THREE.Mesh(new THREE.BoxGeometry(10.4, 0.3, 7.4), concreteMat);
    floorPad.position.y = 0.15;

    const firstFloor = new THREE.Mesh(new THREE.BoxGeometry(9.6, 3.6, 6.6), stuccoWallMat);
    firstFloor.position.y = 2.1;
    firstFloor.castShadow = true;
    firstFloor.receiveShadow = true;

    const midLedge = new THREE.Mesh(new THREE.BoxGeometry(10.2, 0.35, 7.2), concreteMat);
    midLedge.position.y = 4.0;

    const secondFloor = new THREE.Mesh(new THREE.BoxGeometry(9.2, 3.3, 6.2), stuccoWallMat);
    secondFloor.position.y = 5.8;
    secondFloor.castShadow = true;

    const roofParapet = new THREE.Mesh(new THREE.BoxGeometry(9.8, 0.6, 6.8), darkRoofMat);
    roofParapet.position.y = 7.75;

    const door = new THREE.Mesh(new THREE.BoxGeometry(1.6, 2.4, 6.72), windowDarkMat);
    door.position.set(0, 1.35, 0);

    for (const wx of [-2.8, 2.8]) {
      const win1 = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.2, 6.72), windowDarkMat);
      win1.position.set(wx, 2.4, 0);
      const win2 = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.2, 6.32), windowDarkMat);
      win2.position.set(wx, 5.8, 0);
      bGroup.add(win1, win2);
    }

    bGroup.add(floorPad, firstFloor, midLedge, secondFloor, roofParapet, door);
    scene.add(bGroup);

    obstacles.push({
      id,
      x: bx,
      z: bz,
      halfW: 4.95,
      halfD: 3.45,
      minY: by,
      maxY: by + 8.1,
      rotationY: rotY,
      blocksMovement: true,
      blocksBullets: true,
    });
  };

  createPochinokBuilding('pochinok_1', 26, -22, -0.2);
  createPochinokBuilding('pochinok_2', -36, 24, 0.45);
  createPochinokBuilding('pochinok_3', 12, 42, 3.14);

  // BIMASAKTI STRIP TACTICAL CONCRETE COVER WALLS (Free Fire Hard Cover)
  const bimasaktiWalls = [
    { id: 'bima_wall_1', x: -13, z: -14, w: 6.4, h: 2.8, d: 1.2, rot: 0.15 },
    { id: 'bima_wall_2', x: 14, z: -15, w: 6.4, h: 2.8, d: 1.2, rot: -0.2 },
    { id: 'bima_wall_3', x: -15, z: 16, w: 6.4, h: 2.8, d: 1.2, rot: -0.18 },
    { id: 'bima_wall_4', x: 15, z: 18, w: 6.4, h: 2.8, d: 1.2, rot: 0.22 },
  ];
  bimasaktiWalls.forEach((bw) => {
    const wy = groundHeightAt(bw.x, bw.z);
    const wallGroup = new THREE.Group();
    wallGroup.position.set(bw.x, wy, bw.z);
    wallGroup.rotation.y = bw.rot;

    const wallMesh = new THREE.Mesh(
      new THREE.BoxGeometry(bw.w, bw.h, bw.d),
      stuccoWallMat
    );
    wallMesh.position.y = bw.h / 2;
    wallMesh.castShadow = true;
    wallMesh.receiveShadow = true;

    const capMesh = new THREE.Mesh(
      new THREE.BoxGeometry(bw.w + 0.2, 0.28, bw.d + 0.2),
      darkRoofMat
    );
    capMesh.position.y = bw.h + 0.14;

    wallGroup.add(wallMesh, capMesh);
    scene.add(wallGroup);

    obstacles.push({
      id: bw.id,
      x: bw.x,
      z: bw.z,
      halfW: bw.w / 2 + 0.1,
      halfD: bw.d / 2 + 0.1,
      minY: wy,
      maxY: wy + bw.h + 0.28,
      rotationY: bw.rot,
      blocksMovement: true,
      blocksBullets: true,
    });
  });

  // LANDMARK C: FACTORY SHIPPING CONTAINER YARD (Solid Container Colliders)
  const factoryGroup = new THREE.Group();
  const fx = 44;
  const fz = 14;
  const fy = groundHeightAt(fx, fz);
  factoryGroup.position.set(fx, fy, fz);

  const dockSlab = new THREE.Mesh(new THREE.BoxGeometry(18, 0.35, 14), concreteMat);
  dockSlab.position.y = 0.175;
  factoryGroup.add(dockSlab);

  const containerColors = [0x991b1b, 0x1d4ed8, 0xb45309, 0x047857];
  const containerOffsets = [
    [-5.2, 1.4, -3.5, 0],
    [4.6, 1.4, -3.5, 0.08],
    [-5.2, 1.4, 3.2, -0.05],
    [-5.2, 3.9, -3.5, 0.04],
  ];
  containerOffsets.forEach(([cx, cy, cz, rot], idx) => {
    const cMat = new THREE.MeshStandardMaterial({
      color: containerColors[idx % containerColors.length],
      roughness: 0.55,
      metalness: 0.45,
    });
    const box = new THREE.Mesh(new THREE.BoxGeometry(6.2, 2.5, 2.6), cMat);
    box.position.set(cx, cy, cz);
    box.rotation.y = rot;
    box.castShadow = true;
    box.receiveShadow = true;
    factoryGroup.add(box);

    obstacles.push({
      id: `factory_container_${idx}`,
      x: fx + cx,
      z: fz + cz,
      halfW: 3.15,
      halfD: 1.35,
      minY: fy + cy - 1.25,
      maxY: fy + cy + 1.35,
      rotationY: rot,
      blocksMovement: true,
      blocksBullets: true,
    });
  });
  scene.add(factoryGroup);

  // Military Cover Crates (Solid Bullet & Movement Cover)
  const crateCount = 36;
  const crateGeo = new THREE.BoxGeometry(1.7, 1.45, 1.1);
  crateGeo.translate(0, 0.725, 0);
  const crateMat = new THREE.MeshStandardMaterial({
    color: 0x5c5346,
    roughness: 0.85,
    metalness: 0.1,
  });
  const crateInstanced = new THREE.InstancedMesh(crateGeo, crateMat, crateCount);
  crateInstanced.castShadow = true;
  crateInstanced.receiveShadow = true;

  const dummy = new THREE.Object3D();
  for (let i = 0; i < crateCount; i++) {
    const angle = (i / crateCount) * Math.PI * 2 + 0.2;
    const rad = 14 + ((i * 23) % 72);
    const cx = Math.cos(angle) * rad;
    const cz = Math.sin(angle) * rad;
    const cy = groundHeightAt(cx, cz);
    const rotY = (i * 0.9) % Math.PI;
    const scaleX = 1 + (i % 3) * 0.25;
    dummy.position.set(cx, cy, cz);
    dummy.rotation.set(0, rotY, 0);
    dummy.scale.set(scaleX, 1, 1);
    dummy.updateMatrix();
    crateInstanced.setMatrixAt(i, dummy.matrix);

    obstacles.push({
      id: `crate_${i}`,
      x: cx,
      z: cz,
      halfW: 0.85 * scaleX,
      halfD: 0.55,
      minY: cy,
      maxY: cy + 1.5,
      rotationY: rotY,
      blocksMovement: true,
      blocksBullets: true,
    });
  }
  crateInstanced.instanceMatrix.needsUpdate = true;
  crateInstanced.computeBoundingSphere();
  scene.add(crateInstanced);

  // Tropical Bermuda Palm Trees
  const treeCount = 64;
  const trunkGeo = new THREE.CylinderGeometry(0.18, 0.34, 4.6, 8);
  trunkGeo.translate(0, 2.3, 0);
  const trunkMat = new THREE.MeshStandardMaterial({
    color: 0x5c4033,
    roughness: 0.9,
    metalness: 0.04,
  });
  const frondGeo = new THREE.DodecahedronGeometry(1.85, 1);
  frondGeo.scale(1.35, 0.55, 1.35);
  frondGeo.translate(0, 4.7, 0);
  const frondMat = new THREE.MeshStandardMaterial({
    color: 0x2d4c2b,
    roughness: 0.75,
    metalness: 0.06,
  });

  const trunkInstanced = new THREE.InstancedMesh(trunkGeo, trunkMat, treeCount);
  const frondInstanced = new THREE.InstancedMesh(frondGeo, frondMat, treeCount);
  trunkInstanced.castShadow = true;
  frondInstanced.castShadow = true;

  const colorVar = new THREE.Color();
  for (let i = 0; i < treeCount; i++) {
    const angle = (i / treeCount) * Math.PI * 2 + (i % 3) * 0.15;
    const radius = i < 38 ? 115 + (i % 6) * 4.5 : 30 + ((i * 19) % 75);
    const tx = Math.cos(angle) * radius;
    const tz = Math.sin(angle) * radius;
    if (Math.abs(tx + 4) < 6 || Math.abs(tz + 6) < 6) continue;
    const ty = groundHeightAt(tx, tz);
    const scale = 0.85 + (i % 5) * 0.1;

    dummy.position.set(tx, ty, tz);
    dummy.rotation.set(0.06, (i * 1.1) % (Math.PI * 2), 0);
    dummy.scale.setScalar(scale);
    dummy.updateMatrix();

    trunkInstanced.setMatrixAt(i, dummy.matrix);
    frondInstanced.setMatrixAt(i, dummy.matrix);

    colorVar.setHSL(0.3 + (i % 4) * 0.02, 0.48, 0.22 + (i % 3) * 0.04);
    frondInstanced.setColorAt(i, colorVar);

    obstacles.push({
      id: `tree_${i}`,
      x: tx,
      z: tz,
      halfW: 0.35 * scale,
      halfD: 0.35 * scale,
      minY: ty,
      maxY: ty + 4.5 * scale,
      rotationY: 0,
      blocksMovement: true,
      blocksBullets: true,
    });
  }
  trunkInstanced.instanceMatrix.needsUpdate = true;
  frondInstanced.instanceMatrix.needsUpdate = true;
  if (frondInstanced.instanceColor) frondInstanced.instanceColor.needsUpdate = true;
  trunkInstanced.computeBoundingSphere();
  frondInstanced.computeBoundingSphere();
  scene.add(trunkInstanced, frondInstanced);

  // Coastal & Inland Boulders
  const rockCount = 48;
  const rockGeo = new THREE.DodecahedronGeometry(1.9, 0);
  rockGeo.translate(0, 0.9, 0);
  const rockMat = new THREE.MeshStandardMaterial({
    color: 0x57534e,
    roughness: 0.88,
    metalness: 0.1,
  });
  const rockInstanced = new THREE.InstancedMesh(rockGeo, rockMat, rockCount);
  rockInstanced.castShadow = true;
  rockInstanced.receiveShadow = true;

  for (let i = 0; i < rockCount; i++) {
    const angle = (i / rockCount) * Math.PI * 2;
    const radius = i < 34 ? 136 + (i % 3) * 3 : 40 + ((i * 29) % 68);
    const rx = Math.cos(angle) * radius;
    const rz = Math.sin(angle) * radius;
    if (Math.abs(rx + 4) < 6 || Math.abs(rz + 6) < 6) continue;
    const ry = groundHeightAt(rx, rz) - 0.2;
    const s = i < 34 ? 1.5 + (i % 4) * 0.35 : 0.8 + (i % 3) * 0.2;
    dummy.position.set(rx, ry, rz);
    dummy.rotation.set((i * 0.4) % 1, (i * 1.3) % 3, 0);
    dummy.scale.set(s, s * 0.78, s);
    dummy.updateMatrix();
    rockInstanced.setMatrixAt(i, dummy.matrix);

    obstacles.push({
      id: `rock_${i}`,
      x: rx,
      z: rz,
      halfW: 1.45 * s,
      halfD: 1.45 * s,
      minY: ry,
      maxY: ry + 2.1 * s,
      rotationY: 0,
      blocksMovement: true,
      blocksBullets: true,
    });
  }
  rockInstanced.instanceMatrix.needsUpdate = true;
  rockInstanced.computeBoundingSphere();
  scene.add(rockInstanced);

  return obstacles;
}
