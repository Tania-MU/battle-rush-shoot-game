export interface ObstacleCollider {
  id: string;
  x: number;
  z: number;
  halfW: number;
  halfD: number;
  minY: number;
  maxY: number;
  rotationY: number;
  blocksMovement: boolean;
  blocksBullets: boolean;
}

/**
 * Resolves 2D circle-vs-OBB (Oriented Bounding Box) collisions for a player or bot
 * so characters cannot walk through buildings, walls, containers, crates, or rocks,
 * sliding smoothly along walls just like Free Fire.
 */
export function resolveEntityObstacleCollisions(
  x: number,
  y: number,
  z: number,
  radius: number,
  obstacles: ObstacleCollider[]
): { x: number; z: number } {
  let curX = x;
  let curZ = z;

  for (let pass = 0; pass < 2; pass++) {
    for (let i = 0; i < obstacles.length; i++) {
      const obs = obstacles[i];
      if (!obs.blocksMovement) continue;
      // If character feet are above the obstacle top, don't block horizontally
      if (y >= obs.maxY - 0.15) continue;

      const dx = curX - obs.x;
      const dz = curZ - obs.z;

      // Broadphase bounding radius check
      const maxExtent = Math.hypot(obs.halfW, obs.halfD) + radius + 0.5;
      if (dx * dx + dz * dz > maxExtent * maxExtent) continue;

      const cos = Math.cos(-obs.rotationY);
      const sin = Math.sin(-obs.rotationY);

      // Transform into obstacle local space
      const localX = dx * cos - dz * sin;
      const localZ = dx * sin + dz * cos;

      const closestX = Math.max(-obs.halfW, Math.min(obs.halfW, localX));
      const closestZ = Math.max(-obs.halfD, Math.min(obs.halfD, localZ));

      const diffX = localX - closestX;
      const diffZ = localZ - closestZ;
      const distSq = diffX * diffX + diffZ * diffZ;

      if (distSq < radius * radius) {
        let pushedLocalX = localX;
        let pushedLocalZ = localZ;

        if (distSq > 1e-6) {
          const dist = Math.sqrt(distSq);
          const overlap = radius - dist;
          pushedLocalX += (diffX / dist) * overlap;
          pushedLocalZ += (diffZ / dist) * overlap;
        } else {
          // Center is inside the OBB; push out along the nearest face
          const penX = obs.halfW + radius - Math.abs(localX);
          const penZ = obs.halfD + radius - Math.abs(localZ);
          if (penX < penZ) {
            pushedLocalX = localX >= 0 ? obs.halfW + radius : -(obs.halfW + radius);
          } else {
            pushedLocalZ = localZ >= 0 ? obs.halfD + radius : -(obs.halfD + radius);
          }
        }

        // Transform back to world space
        const invCos = Math.cos(obs.rotationY);
        const invSin = Math.sin(obs.rotationY);
        curX = obs.x + pushedLocalX * invCos - pushedLocalZ * invSin;
        curZ = obs.z + pushedLocalX * invSin + pushedLocalZ * invCos;
      }
    }
  }

  return { x: curX, z: curZ };
}

/**
 * Tests a 3D line segment `(x1, y1, z1) -> (x2, y2, z2)` against a single OBB collider
 * using the 3D slab method. Returns hit fraction `t in [0, 1]` or `null` if no hit.
 */
function intersectSegmentOBB(
  x1: number,
  y1: number,
  z1: number,
  x2: number,
  y2: number,
  z2: number,
  obs: ObstacleCollider,
  padding = 0
): number | null {
  // Quick vertical bounds reject
  const segMinY = Math.min(y1, y2);
  const segMaxY = Math.max(y1, y2);
  if (segMaxY < obs.minY || segMinY > obs.maxY) return null;

  const cos = Math.cos(-obs.rotationY);
  const sin = Math.sin(-obs.rotationY);

  const dx1 = x1 - obs.x;
  const dz1 = z1 - obs.z;
  const p1x = dx1 * cos - dz1 * sin;
  const p1z = dx1 * sin + dz1 * cos;

  const dx2 = x2 - obs.x;
  const dz2 = z2 - obs.z;
  const p2x = dx2 * cos - dz2 * sin;
  const p2z = dx2 * sin + dz2 * cos;

  const dirX = p2x - p1x;
  const dirY = y2 - y1;
  const dirZ = p2z - p1z;

  const hw = obs.halfW + padding;
  const hd = obs.halfD + padding;

  let tMin = 0;
  let tMax = 1;

  // X slab
  if (Math.abs(dirX) < 1e-8) {
    if (p1x < -hw || p1x > hw) return null;
  } else {
    const invD = 1 / dirX;
    let t1 = (-hw - p1x) * invD;
    let t2 = (hw - p1x) * invD;
    if (t1 > t2) {
      const tmp = t1;
      t1 = t2;
      t2 = tmp;
    }
    tMin = Math.max(tMin, t1);
    tMax = Math.min(tMax, t2);
    if (tMin > tMax) return null;
  }

  // Y slab
  if (Math.abs(dirY) < 1e-8) {
    if (y1 < obs.minY || y1 > obs.maxY) return null;
  } else {
    const invD = 1 / dirY;
    let t1 = (obs.minY - y1) * invD;
    let t2 = (obs.maxY - y1) * invD;
    if (t1 > t2) {
      const tmp = t1;
      t1 = t2;
      t2 = tmp;
    }
    tMin = Math.max(tMin, t1);
    tMax = Math.min(tMax, t2);
    if (tMin > tMax) return null;
  }

  // Z slab
  if (Math.abs(dirZ) < 1e-8) {
    if (p1z < -hd || p1z > hd) return null;
  } else {
    const invD = 1 / dirZ;
    let t1 = (-hd - p1z) * invD;
    let t2 = (hd - p1z) * invD;
    if (t1 > t2) {
      const tmp = t1;
      t1 = t2;
      t2 = tmp;
    }
    tMin = Math.max(tMin, t1);
    tMax = Math.min(tMax, t2);
    if (tMin > tMax) return null;
  }

  return tMin;
}

/**
 * Checks if a 3D segment `(x1, y1, z1) -> (x2, y2, z2)` intersects any bullet-blocking obstacle.
 * Returns the earliest intersection fraction `t in [0, 1]` and hit point, or `null` if clear.
 */
export function segmentHitsObstacle(
  x1: number,
  y1: number,
  z1: number,
  x2: number,
  y2: number,
  z2: number,
  obstacles: ObstacleCollider[],
  padding = 0.08
): { t: number; hitX: number; hitY: number; hitZ: number } | null {
  let bestT: number | null = null;

  for (let i = 0; i < obstacles.length; i++) {
    const obs = obstacles[i];
    if (!obs.blocksBullets) continue;
    const t = intersectSegmentOBB(x1, y1, z1, x2, y2, z2, obs, padding);
    if (t !== null && (bestT === null || t < bestT)) {
      bestT = t;
    }
  }

  if (bestT === null) return null;
  return {
    t: bestT,
    hitX: x1 + (x2 - x1) * bestT,
    hitY: y1 + (y2 - y1) * bestT,
    hitZ: z1 + (z2 - z1) * bestT,
  };
}

/**
 * Returns true if there is an unobstructed line of sight between two 3D points.
 */
export function hasLineOfSight(
  x1: number,
  y1: number,
  z1: number,
  x2: number,
  y2: number,
  z2: number,
  obstacles: ObstacleCollider[]
): boolean {
  return segmentHitsObstacle(x1, y1, z1, x2, y2, z2, obstacles, 0.05) === null;
}
