// The player: a reader's apprentice with a satchel, a pocketful of
// pebbles, and no business being in the library after closing.
//
// Movement is WASD or arrows. Hold Shift to tiptoe — slower, but a
// warden's suspicion climbs far more slowly, and your footsteps stop
// carrying. Click (or press Space) to toss a pebble toward the mouse:
// every warden in earshot walks over to listen, which is the only
// way to pull one off a doorway you need.

import { TILE, WALK_SPEED, SNEAK_SPEED, PEBBLES_PER_LEVEL, PEBBLE_HEAR_RANGE } from './config.js';

export class Player {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.radius = 13;
    this.sneaking = false;
    this.pebbles = PEBBLES_PER_LEVEL;
    this.moving = false;
    this.stepPhase = 0;
    this.inFern = false;
  }

  reset(x, y) {
    this.x = x;
    this.y = y;
    this.pebbles = PEBBLES_PER_LEVEL;
    this.sneaking = false;
    this.inFern = false;
  }

  update(dt, level, input, events) {
    const vx = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    const vy = (input.down ? 1 : 0) - (input.up ? 1 : 0);
    this.sneaking = !!input.sneak;
    this.moving = vx !== 0 || vy !== 0;
    if (this.moving) {
      const len = Math.hypot(vx, vy);
      const speed = this.sneaking ? SNEAK_SPEED : WALK_SPEED;
      const nx = this.x + (vx / len) * speed * dt;
      const ny = this.y + (vy / len) * speed * dt;
      // Slide along walls: try each axis on its own so a diagonal
      // push against a shelf still moves you along it.
      if (!this.hitsWall(level, nx, this.y)) this.x = nx;
      if (!this.hitsWall(level, this.x, ny)) this.y = ny;
      this.stepPhase += dt * (this.sneaking ? 5 : 9);
    }

    // Ferns hide you. Standing in one is the safest place in the game.
    this.inFern = level.at(Math.floor(this.x / TILE), Math.floor(this.y / TILE)) === 'F';

    // Pick up a wax seal by walking over it.
    for (const seal of level.seals) {
      if (!seal.taken && Math.hypot(seal.x - this.x, seal.y - this.y) < 24) {
        seal.taken = true;
        events.push({ type: 'seal', seal });
      }
    }

    // Reached the exit door?
    if (Math.hypot(level.exit.x - this.x, level.exit.y - this.y) < 26) {
      events.push({ type: 'exit' });
    }
  }

  hitsWall(level, x, y) {
    const r = this.radius - 2;
    return (
      level.solid(Math.floor((x - r) / TILE), Math.floor((y - r) / TILE)) ||
      level.solid(Math.floor((x + r) / TILE), Math.floor((y - r) / TILE)) ||
      level.solid(Math.floor((x - r) / TILE), Math.floor((y + r) / TILE)) ||
      level.solid(Math.floor((x + r) / TILE), Math.floor((y + r) / TILE))
    );
  }

  // Toss a pebble toward a point. It never flies further than a good
  // underarm throw — about 190 pixels — so you have to get close
  // enough for the trick to be worth the risk. Returns the landing
  // spot, or null when the pocket is empty.
  tossPebble(tx, ty) {
    if (this.pebbles <= 0) return null;
    this.pebbles -= 1;
    const dx = tx - this.x;
    const dy = ty - this.y;
    const dist = Math.hypot(dx, dy);
    const range = 190;
    const d = Math.min(dist, range);
    const landing = {
      x: this.x + (dist > 0 ? (dx / dist) * d : 0),
      y: this.y + (dist > 0 ? (dy / dist) * d : 0),
    };
    return landing;
  }
}

// Tell every warden about a pebble landing. Wardens out of earshot
// never notice — a pebble is a local lie, not a building-wide alarm.
export function spreadPebbleNoise(guards, landing) {
  for (const g of guards) g.hearNoise(landing.x, landing.y, PEBBLE_HEAR_RANGE);
}
