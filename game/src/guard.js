// The night wardens.
//
// A warden has four moods, and the player can read every one of them
// from the cone's colour and the little mark over the warden's head:
//   patrol     walking its rounds, cone pale gold
//   wary       something caught its eye, cone amber, suspicion climbing
//   chase      it saw you clearly — it runs at you, cone red
//   listen     a pebble landed nearby — it walks over to look
//
// Suspicion is the whole stealth game in one number. It climbs while
// you stand in a cone, faster up close, slower when you tiptoe, not
// at all when you are tucked inside a fern. Lose the warden's sight
// and it drains away; stay hidden long enough after a chase and the
// warden shrugs and goes back to its rounds.

import {
  TILE, GUARD_PATROL_SPEED, GUARD_CHASE_SPEED, GUARD_INVESTIGATE_SPEED,
  SIGHT_RANGE, SPOT_RATE_NEAR, SPOT_RATE_FAR, SPOT_RATE_SNEAK,
  SPOT_RATE_FERN, CALM_RATE, GIVE_UP_SECONDS, CHASE_TOUCH,
} from './config.js';
import { canSee, angleDiff } from './vision.js';

export class Guard {
  constructor(waypoints, pause, seed) {
    // Waypoints come in as tile coordinates; the warden walks the
    // centres of those tiles, so it never clips a shelf corner.
    this.route = waypoints.map(([tx, ty]) => ({ x: tx * TILE + TILE / 2, y: ty * TILE + TILE / 2 }));
    this.x = this.route[0].x;
    this.y = this.route[0].y;
    this.leg = 1 % this.route.length;
    this.pause = pause;
    this.waiting = 0.6;
    this.facing = 0;
    this.mode = 'patrol';
    this.suspicion = 0;
    this.lostSightFor = 0;
    this.listenAt = null;
    this.seed = seed;
    this.sway = 0; // a slow idle sway, so a standing warden still looks alive
  }

  // A pebble clattered nearby. If it is close enough to hear, the
  // warden breaks off whatever it was doing and goes to listen.
  // Chasing wardens don't fall for it — once they have seen you,
  // a pebble is just a pebble.
  hearNoise(x, y, range) {
    if (this.mode === 'chase') return; // a chase is not interrupted by pebbles
    if (Math.hypot(x - this.x, y - this.y) > range) return;
    this.mode = 'listen';
    this.listenAt = { x, y };
    this.suspicion = Math.max(this.suspicion, 45);
  }

  update(dt, level, player, events) {
    this.sway += dt;
    const seen = this.lookAt(level, player);
    this.updateSuspicion(dt, seen, player);
    if (this.mode === 'patrol' || this.mode === 'wary') this.walkRoute(dt, level);
    else if (this.mode === 'listen') this.walkTo(dt, level, this.listenAt, GUARD_INVESTIGATE_SPEED, () => {
      // Nothing there. Stand a moment, look around, go back to rounds.
      this.mode = 'patrol';
      this.suspicion = Math.max(0, this.suspicion - 30);
      this.waiting = 1.2;
    });
    else if (this.mode === 'chase') this.chasePlayer(dt, level, player, events);
  }

  // Look at the player and return how clearly they are seen, or null.
  // A fern hides the player outright; tiptoeing slows the climb.
  lookAt(level, player) {
    if (player.inFern) return null;
    const seen = canSee(level.solid, this.x, this.y, this.facing, player.x, player.y);
    if (!seen) return null;
    if (player.sneaking) return 'sneak';
    return seen;
  }

  updateSuspicion(dt, seen, player) {
    if (seen === 'near') this.suspicion += SPOT_RATE_NEAR * dt;
    else if (seen === 'far') this.suspicion += SPOT_RATE_FAR * dt;
    else if (seen === 'sneak') this.suspicion += SPOT_RATE_FAR * SPOT_RATE_SNEAK * dt;
    else this.suspicion -= CALM_RATE * dt;

    if (seen) this.lostSightFor = 0;
    else this.lostSightFor += dt;

    this.suspicion = Math.max(0, Math.min(100, this.suspicion));

    // The mood follows the number. Chasing is the only one-way door:
    // once it starts, only losing you for a while ends it.
    if (this.suspicion >= 100 && this.mode !== 'chase') {
      this.mode = 'chase';
      this.lostSightFor = 0;
    }
    if (this.mode === 'chase' && this.lostSightFor > GIVE_UP_SECONDS) {
      // Lost you for good. A shrug, a mutter, back to the rounds —
      // but still more suspicious than it was.
      this.mode = 'patrol';
      this.suspicion = 35;
      this.waiting = 1.0;
    } else if (this.mode === 'wary' && this.suspicion < 25) {
      this.mode = 'patrol';
    } else if (this.mode === 'patrol' && this.suspicion >= 45) {
      this.mode = 'wary';
    }
  }

  // Walk the patrol route, pausing at each waypoint and turning to
  // face the next leg before setting off — a warden that turns its
  // head first is a warden the player can read.
  walkRoute(dt, level) {
    // Pausing at a waypoint is half the game: the warden stops, turns
    // its head toward the next leg, and only then sets off. That turn
    // is the moment a player watches for.
    if (this.waiting > 0) {
      this.waiting -= dt;
      const target = this.route[this.leg];
      this.turnToward(Math.atan2(target.y - this.y, target.x - this.x), dt);
      return;
    }
    const target = this.route[this.leg];
    this.walkTo(dt, level, target, GUARD_PATROL_SPEED, () => {
      this.leg = (this.leg + 1) % this.route.length;
      this.waiting = this.pause;
    });
  }

  walkTo(dt, level, target, speed, onArrive) {
    if (!target) return;
    const dx = target.x - this.x;
    const dy = target.y - this.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 4) {
      onArrive();
      return;
    }
    const step = Math.min(dist, speed * dt);
    const nx = this.x + (dx / dist) * step;
    const ny = this.y + (dy / dist) * step;
    this.facing = Math.atan2(dy, dx);
    if (!level.solid(Math.floor(nx / TILE), Math.floor(this.y / TILE))) this.x = nx;
    if (!level.solid(Math.floor(this.x / TILE), Math.floor(ny / TILE))) this.y = ny;
  }

  chasePlayer(dt, level, player, events) {
    this.walkTo(dt, level, player, GUARD_CHASE_SPEED, () => {});
    this.facing = Math.atan2(player.y - this.y, player.x - this.x);
    if (Math.hypot(player.x - this.x, player.y - this.y) < CHASE_TOUCH) {
      events.push({ type: 'caught', by: this });
    }
  }

  // Turn toward an angle at a fixed rate, the short way around.
  turnToward(target, dt) {
    let d = target - this.facing;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    const maxTurn = 2.6 * dt;
    this.facing += Math.max(-maxTurn, Math.min(maxTurn, d));
  }

  get alertLevel() {
    if (this.mode === 'chase') return 2;
    if (this.mode === 'wary' || this.mode === 'listen') return 1;
    return 0;
  }
}
