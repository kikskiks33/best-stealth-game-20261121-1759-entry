// Seeing, for wardens and for the renderer.
//
// A warden sees the player when three things are all true: the player
// is inside the cone's range, inside its angle, and there is no shelf
// or wall on the straight line between them. The line test samples
// the grid every few pixels — cheap, and exact enough that a shelf
// corner never wrongly hides or exposes someone.

import { TILE, SIGHT_RANGE, SIGHT_HALF_ANGLE } from './config.js';

// True when no solid tile sits between (x0,y0) and (x1,y1).
export function hasLineOfSight(solid, x0, y0, x1, y1) {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const dist = Math.hypot(dx, dy);
  const steps = Math.max(1, Math.ceil(dist / 6));
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    const tx = Math.floor((x0 + dx * t) / TILE);
    const ty = Math.floor((y0 + dy * t) / TILE);
    if (solid(tx, ty)) return false;
  }
  return true;
}

// How far around a facing angle a target sits, folded to 0..PI.
export function angleDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return Math.abs(d);
}

// The full test: is the player, at (px,py), visible to a warden at
// (gx,gy) facing `facing`? Returns 'near' | 'far' | null. The caller
// scales suspicion with distance, so being spotted at the edge of a
// cone is a warning and being spotted up close is a disaster.
export function canSee(solid, gx, gy, facing, px, py) {
  const dx = px - gx;
  const dy = py - gy;
  const dist = Math.hypot(dx, dy);
  if (dist > SIGHT_RANGE) return null;
  if (dist > 12 && angleDiff(Math.atan2(dy, dx), facing) > SIGHT_HALF_ANGLE) return null;
  if (!hasLineOfSight(solid, gx, gy, px, py)) return null;
  return dist < SIGHT_RANGE * 0.5 ? 'near' : 'far';
}
