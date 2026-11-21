// Boot and input: the only file that touches the DOM and the keys.
//
// Keys: WASD or arrows to move, Shift to tiptoe, Space or a mouse
// click to toss a pebble, P or Esc to pause, R to restart the floor,
// M to mute, Enter to move through the menus. Clicking also confirms
// a menu screen, so the whole game is playable with one hand on the
// mouse if you like.
//
// The canvas scales to the window while keeping its 960x600 shape,
// and the mouse position is translated back into game coordinates so
// a pebble always lands where you clicked.

import { Game } from './game.js';
import { VIEW_W, VIEW_H } from './config.js';
import { drawWorld, drawHud, drawTitleScreen, drawLevelIntro, drawPaused, drawLevelClear, drawWinScreen, drawCaughtScreen, drawGameOverScreen } from './render.js';
import { stageShot } from './shots.js';
import { sfx } from './audio.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
canvas.width = VIEW_W;
canvas.height = VIEW_H;

const game = new Game();
window.__game = game; // the play-test driver talks to the game through this

const input = {
  up: false, down: false, left: false, right: false,
  sneak: false, consumePebble: false,
  mouse: { x: VIEW_W / 2, y: VIEW_H / 2 },
};

function toGameCoords(e) {
  const r = canvas.getBoundingClientRect();
  return {
    x: ((e.clientX - r.left) / r.width) * VIEW_W,
    y: ((e.clientY - r.top) / r.height) * VIEW_H,
  };
}

const MOVE_KEYS = {
  KeyW: 'up', ArrowUp: 'up',
  KeyS: 'down', ArrowDown: 'down',
  KeyA: 'left', ArrowLeft: 'left',
  KeyD: 'right', ArrowRight: 'right',
};

window.addEventListener('keydown', (e) => {
  if (MOVE_KEYS[e.code]) { input[MOVE_KEYS[e.code]] = true; e.preventDefault(); }
  if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') input.sneak = true;
  if (e.code === 'Space') {
    if (game.screen === 'playing') input.consumePebble = true;
    e.preventDefault();
  }
  if (e.code === 'Enter') {
    sfx.unlock();
    game.confirm();
  }
  if (e.code === 'KeyP' || e.code === 'Escape') game.togglePause();
  if (e.code === 'KeyR') game.restartLevel();
  if (e.code === 'KeyM') sfx.toggleMute();
});

window.addEventListener('keyup', (e) => {
  if (MOVE_KEYS[e.code]) input[MOVE_KEYS[e.code]] = false;
  if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') input.sneak = false;
});

canvas.addEventListener('mousemove', (e) => {
  input.mouse = toGameCoords(e);
});

canvas.addEventListener('mousedown', (e) => {
  sfx.unlock();
  input.mouse = toGameCoords(e);
  if (game.screen === 'playing') input.consumePebble = true;
  else game.confirm();
});

// The screenshot staging lives in shots.js: ?shot=start|play|win|
// caught poses the game the way a player would reach that moment,
// so the screenshots are honest renders of the game's own code.
// With no query at all you just get the title screen, like a player.
const params = new URLSearchParams(location.search);
const shot = params.get('shot');
if (shot) stageShot(game, shot, parseInt(params.get('seed') || '7', 10));

function draw() {
  ctx.clearRect(0, 0, VIEW_W, VIEW_H);
  switch (game.screen) {
    case 'title': drawTitleScreen(ctx, game); break;
    case 'intro': drawLevelIntro(ctx, game); break;
    case 'paused': drawWorld(ctx, game); drawHud(ctx, game); drawPaused(ctx); break;
    case 'levelclear': drawWorld(ctx, game); drawLevelClear(ctx, game, game.lastBonus); break;
    case 'win': drawWinScreen(ctx, game); break;
    case 'caught': drawCaughtScreen(ctx, game); break;
    case 'gameover': drawGameOverScreen(ctx, game); break;
    default:
      drawWorld(ctx, game);
      drawHud(ctx, game);
      // Pebble splashes: expanding rings where a pebble landed.
      for (const s of game.pebbleSplashes) {
        ctx.strokeStyle = `rgba(184, 176, 160, ${0.8 - s.age})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(s.x, s.y, 6 + s.age * 40, 0, Math.PI * 2);
        ctx.stroke();
      }
  }
  // The pebble flag is one-shot: the game reads it once per frame.
  input.consumePebble = false;
}

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  game.update(dt, input);
  draw();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
