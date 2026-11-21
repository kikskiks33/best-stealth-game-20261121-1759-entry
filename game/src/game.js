// The game itself: one Game object owns the state machine, the
// score, and the update loop. The screens are plain words for where
// the player is in the loop:
//
//   title -> intro -> playing -> levelclear -> intro -> playing ...
//   playing -> caught -> (lives left) intro, (none left) gameover
//   playing -> win   (after the third floor's exit)
//
// Pause sits on top of playing. Every transition is explicit, so the
// screenshot staging can put the game into any screen directly.

import { LEVELS, parseLevel } from './levels.js';
import { Guard } from './guard.js';
import { Player, spreadPebbleNoise } from './player.js';
import { LIVES_START, SEAL_POINTS, GHOST_BONUS, TIME_BONUS_PER_SECOND } from './config.js';
import { sfx } from './audio.js';

export class Game {
  constructor() {
    this.levelIndex = 0;
    this.score = 0;
    this.lives = LIVES_START;
    this.screen = 'title';
    this.time = 0;
    this.levelTime = 0;
    this.timesSpotted = 0;
    this.totalSealsTaken = 0;
    this.totalSeals = LEVELS.reduce((n, l) => n + l.map.join('').split('*').length - 1, 0);
    this.levelSpotted = false;
    this.lastBonus = { time: 0, ghost: 0 };
    this.pebbleSplashes = [];
    this.lastStepTick = 0;
    this.loadLevel(0);
  }

  loadLevel(i) {
    this.levelIndex = i;
    this.level = parseLevel(LEVELS[i]);
    this.player = new Player(this.level.start.x, this.level.start.y);
    this.guards = this.level.def.guards.map((g, k) => new Guard(g.waypoints, g.pause, 1000 + i * 77 + k * 13));
    this.levelTime = 0;
    this.levelSpotted = false;
    this.sealsTaken = 0;
    this.sealsTotal = this.level.seals.length;
    this.pebbleSplashes = [];
    this.lastStepTick = 0;
  }

  startGame() {
    this.score = 0;
    this.lives = LIVES_START;
    this.timesSpotted = 0;
    this.totalSealsTaken = 0;
    this.loadLevel(0);
    this.screen = 'intro';
  }

  // One frame. Input is the shared input object (keys + mouse), and
  // events are collected here so sounds and scoring happen in exactly
  // one place.
  update(dt, input) {
    this.time += dt;
    if (this.screen !== 'playing') return;
    this.levelTime += dt;

    const events = [];
    this.player.update(dt, this.level, input, events);
    for (const g of this.guards) g.update(dt, this.level, this.player, events);
    this.handleEvents(events, input);

    // Footsteps: one soft tick per stride, alternating feet, only
    // while actually moving. The stride counter lives on the player;
    // this just notices when it rolls over to the next whole step.
    const stride = Math.floor(this.player.stepPhase);
    if (this.player.moving && stride !== this.lastStepTick) {
      this.lastStepTick = stride;
      sfx.step(this.player.sneaking, stride % 2 === 0);
    }

    // Pebble splashes fade out over half a second.
    for (const s of this.pebbleSplashes) s.age += dt;
    this.pebbleSplashes = this.pebbleSplashes.filter((s) => s.age < 0.6);

    // A chase starting is the moment to count a spotting — once per
    // chase, not once per frame.
    const anyChase = this.guards.some((g) => g.mode === 'chase');
    if (anyChase && !this.levelSpotted) {
      this.levelSpotted = true;
      this.timesSpotted += 1;
      sfx.alarm();
    }
  }

  handleEvents(events, input) {
    for (const e of events) {
      if (e.type === 'seal') {
        this.sealsTaken += 1;
        this.totalSealsTaken += 1;
        this.score += SEAL_POINTS;
        sfx.pickup();
      } else if (e.type === 'exit') {
        this.finishLevel();
      } else if (e.type === 'caught') {
        this.getCaught();
      }
    }
    // A pebble toss is an input action, handled here so the game —
    // not the input code — decides what it does to the wardens.
    if (input.consumePebble) {
      const landing = this.player.tossPebble(input.mouse.x, input.mouse.y);
      if (landing) {
        this.pebbleSplashes.push({ x: landing.x, y: landing.y, age: 0 });
        spreadPebbleNoise(this.guards, landing);
        sfx.pebble();
      }
    }
  }

  finishLevel() {
    const par = this.level.def.par;
    const timeBonus = Math.max(0, Math.round((par - this.levelTime) * TIME_BONUS_PER_SECOND));
    const ghostBonus = this.levelSpotted ? 0 : GHOST_BONUS;
    this.score += timeBonus + ghostBonus;
    this.lastBonus = { time: timeBonus, ghost: ghostBonus };
    sfx.levelClear();
    if (this.levelIndex >= LEVELS.length - 1) {
      this.screen = 'win';
      sfx.win();
    } else {
      this.screen = 'levelclear';
    }
  }

  getCaught() {
    this.lives -= 1;
    sfx.caught();
    if (this.lives <= 0) {
      this.screen = 'gameover';
    } else {
      this.screen = 'caught';
    }
  }

  // ENTER / click on a menu screen moves the loop forward.
  confirm() {
    if (this.screen === 'title') this.startGame();
    else if (this.screen === 'intro') this.screen = 'playing';
    else if (this.screen === 'levelclear') {
      this.loadLevel(this.levelIndex + 1);
      this.screen = 'intro';
    } else if (this.screen === 'caught') {
      this.loadLevel(this.levelIndex);
      this.screen = 'intro';
    } else if (this.screen === 'gameover' || this.screen === 'win') {
      this.startGame();
    }
  }

  togglePause() {
    if (this.screen === 'playing') this.screen = 'paused';
    else if (this.screen === 'paused') this.screen = 'playing';
  }

  restartLevel() {
    if (this.screen === 'playing' || this.screen === 'paused') {
      this.loadLevel(this.levelIndex);
      this.screen = 'intro';
    }
  }

  worstSuspicion() {
    return this.guards.reduce((m, g) => Math.max(m, g.suspicion), 0);
  }

  hud() {
    return {
      levelIndex: this.levelIndex,
      sealsTaken: this.sealsTaken,
      sealsTotal: this.sealsTotal,
      lives: this.lives,
      pebbles: this.player.pebbles,
      timeLeft: Math.max(0, Math.ceil(this.level.def.par - this.levelTime)),
      score: this.score,
      spotted: this.guards.some((g) => g.mode === 'chase'),
    };
  }
}
