// Drawing: everything the player sees, in one place.
//
// The look is "library after closing": cold blue dark, warm lamp
// pools, bookshelves drawn as wood blocks with coloured spines, and
// vision cones as translucent wedges so the danger is always visible.
// The order matters: floor, lamps, ferns and seals, exit, cones,
// wardens, player, then the HUD and the screens on top.

import { TILE, COLS, ROWS, VIEW_W, VIEW_H, SIGHT_RANGE, SIGHT_HALF_ANGLE, COLORS } from './config.js';

function conePath(ctx, x, y, facing, range, halfAngle) {
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.arc(x, y, range, facing - halfAngle, facing + halfAngle);
  ctx.closePath();
}

// A cone is not a clean wedge: shelves cut it. Clip the wedge to
// what the warden can actually see by tracing rays and stopping each
// one at the first solid tile — the shape the player sees is the
// shape the rules use.
function clippedCone(ctx, level, x, y, facing) {
  const rays = 26;
  ctx.beginPath();
  ctx.moveTo(x, y);
  for (let i = 0; i <= rays; i++) {
    const a = facing - SIGHT_HALF_ANGLE + (2 * SIGHT_HALF_ANGLE * i) / rays;
    let r = SIGHT_RANGE;
    for (let d = 8; d <= SIGHT_RANGE; d += 8) {
      const px = x + Math.cos(a) * d;
      const py = y + Math.sin(a) * d;
      if (level.solid(Math.floor(px / TILE), Math.floor(py / TILE))) { r = d; break; }
    }
    ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
  }
  ctx.closePath();
}

export function drawWorld(ctx, game) {
  const { level, player, guards, time } = game;
  drawFloor(ctx, level, time);
  drawFernsAndSeals(ctx, level, time);
  drawExit(ctx, level, time);
  drawCones(ctx, level, guards);
  for (const g of guards) drawGuard(ctx, g, time);
  drawPlayer(ctx, player, time);
  drawLampGlow(ctx, level, time);
}

function drawFloor(ctx, level, time) {
  ctx.fillStyle = COLORS.floor;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  for (let ty = 0; ty < ROWS; ty++) {
    for (let tx = 0; tx < COLS; tx++) {
      const x = tx * TILE;
      const y = ty * TILE;
      const c = level.at(tx, ty);
      if (c === '#') {
        // Shelf or wall: a wood block with a lighter top edge and a
        // few book spines, so cover reads as furniture, not void.
        ctx.fillStyle = COLORS.shelf;
        ctx.fillRect(x, y, TILE, TILE);
        ctx.fillStyle = COLORS.wallTop;
        ctx.fillRect(x, y, TILE, 5);
        ctx.fillStyle = COLORS.shelfSpine[(tx * 7 + ty * 3) % 5];
        ctx.fillRect(x + 6, y + 10, 5, 24);
        ctx.fillStyle = COLORS.shelfSpine[(tx * 5 + ty * 11) % 5];
        ctx.fillRect(x + 16, y + 12, 5, 22);
        ctx.fillStyle = COLORS.shelfSpine[(tx * 3 + ty * 5) % 5];
        ctx.fillRect(x + 26, y + 9, 5, 25);
      } else if ((tx + ty) % 2 === 0) {
        ctx.fillStyle = COLORS.floorAlt;
        ctx.fillRect(x, y, TILE, TILE);
      }
      // A faint rug runner down the middle of the reading room,
      // purely for the eye — it marks the main walkway.
      if (ty === 7 && tx > 0 && tx < COLS - 1 && c !== '#') {
        ctx.fillStyle = 'rgba(122, 74, 58, 0.25)';
        ctx.fillRect(x, y + 12, TILE, 16);
      }
    }
  }
}

function drawFernsAndSeals(ctx, level, time) {
  for (const f of level.ferns) {
    const sway = Math.sin(time * 1.4 + f.x * 0.05) * 2;
    ctx.fillStyle = COLORS.fernDark;
    ctx.beginPath();
    ctx.arc(f.x, f.y + 4, 17, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = COLORS.fern;
    for (let i = 0; i < 5; i++) {
      const a = -Math.PI / 2 + (i - 2) * 0.5;
      ctx.beginPath();
      ctx.ellipse(f.x + Math.cos(a) * 9 + sway, f.y + Math.sin(a) * 9, 4, 12, a + Math.PI / 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  for (const s of level.seals) {
    if (s.taken) continue;
    const pulse = 1 + Math.sin(time * 3 + s.x) * 0.12;
    ctx.save();
    ctx.translate(s.x, s.y);
    ctx.scale(pulse, pulse);
    ctx.fillStyle = COLORS.seal;
    ctx.beginPath();
    ctx.arc(0, 0, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#8a3a3a';
    ctx.font = 'bold 10px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('S', 0, 1);
    ctx.restore();
  }
}

function drawExit(ctx, level, time) {
  const e = level.exit;
  const glow = 0.5 + Math.sin(time * 2) * 0.2;
  ctx.save();
  ctx.globalAlpha = glow;
  const g = ctx.createRadialGradient(e.x, e.y, 4, e.x, e.y, 46);
  g.addColorStop(0, 'rgba(232, 201, 106, 0.5)');
  g.addColorStop(1, 'rgba(232, 201, 106, 0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(e.x, e.y, 46, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  ctx.fillStyle = COLORS.exit;
  ctx.fillRect(e.x - 14, e.y - 16, 28, 32);
  ctx.fillStyle = '#3d2b1d';
  ctx.fillRect(e.x - 9, e.y - 11, 18, 22);
  ctx.fillStyle = COLORS.exitGlow;
  ctx.font = 'bold 11px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('EXIT', e.x, e.y - 24);
}

function drawCones(ctx, level, guards) {
  for (const g of guards) {
    const alert = g.alertLevel;
    ctx.fillStyle = alert === 2 ? COLORS.coneAlarm : alert === 1 ? COLORS.coneWary : COLORS.coneCalm;
    clippedCone(ctx, level, g.x, g.y, g.facing);
    ctx.fill();
    // A clear edge so the cone's reach reads even on dark floor and
    // even when the screenshot is shrunk to a thumbnail.
    ctx.strokeStyle = alert === 2 ? 'rgba(224, 90, 74, 0.75)' : alert === 1 ? 'rgba(232, 160, 60, 0.65)' : 'rgba(232, 201, 106, 0.55)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
}

function drawGuard(ctx, g, time) {
  // A warden never stands perfectly still — a little sway sells that
  // it is alive and listening, and it makes the lantern swing.
  const sway = Math.sin(g.sway * 2.2) * 1.5;
  // Robe: a hooded warden, dark red, with a lantern dot that swings.
  ctx.fillStyle = COLORS.guardRobe;
  ctx.beginPath();
  ctx.arc(g.x, g.y + sway, 13, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = COLORS.guard;
  ctx.beginPath();
  ctx.arc(g.x, g.y + sway - 2, 7, 0, Math.PI * 2);
  ctx.fill();
  // Eyes look where the warden looks.
  const ex = Math.cos(g.facing) * 3;
  const ey = Math.sin(g.facing) * 3;
  ctx.fillStyle = '#1d2b33';
  ctx.beginPath();
  ctx.arc(g.x + ex - 2, g.y + sway - 3 + ey * 0.4, 1.4, 0, Math.PI * 2);
  ctx.arc(g.x + ex + 2, g.y + sway - 3 + ey * 0.4, 1.4, 0, Math.PI * 2);
  ctx.fill();
  // Lantern: a warm dot at the warden's side.
  ctx.fillStyle = '#f5dd8a';
  ctx.beginPath();
  ctx.arc(g.x - Math.sin(g.facing) * 14, g.y + Math.cos(g.facing) * 14 + sway, 3, 0, Math.PI * 2);
  ctx.fill();
  // The mark over its head says what it thinks: ? while suspicious,
  // ! once it is chasing you. No mark at all means you are safe.
  if (g.mode === 'chase') {
    drawMark(ctx, g.x, g.y - 26 + sway, '!', COLORS.danger);
  } else if (g.suspicion > 30) {
    drawMark(ctx, g.x, g.y - 26 + sway, '?', '#e8a03c');
  }
  // A thin suspicion arc under a wary warden.
  if (g.suspicion > 5 && g.mode !== 'chase') {
    ctx.strokeStyle = g.suspicion > 60 ? COLORS.danger : '#e8a03c';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(g.x, g.y + sway, 18, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * g.suspicion) / 100);
    ctx.stroke();
  }
}

function drawMark(ctx, x, y, ch, color) {
  ctx.fillStyle = color;
  ctx.font = 'bold 16px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(ch, x, y);
}

function drawPlayer(ctx, p, time) {
  const wobble = p.moving ? Math.sin(p.stepPhase) * 2 : 0;
  // Tiptoeing crouches the figure a little — the pose tells the
  // player which speed they are at without looking at the HUD.
  const squash = p.sneaking ? 0.85 : 1;
  ctx.save();
  ctx.translate(p.x, p.y + wobble * 0.4);
  ctx.scale(1, squash);
  ctx.fillStyle = COLORS.playerCloak;
  ctx.beginPath();
  ctx.arc(0, 0, 13, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = COLORS.player;
  ctx.beginPath();
  ctx.arc(0, -2, 7, 0, Math.PI * 2);
  ctx.fill();
  // The satchel: a small brown square on the back.
  ctx.fillStyle = '#6b4e33';
  ctx.fillRect(-11, -4, 6, 8);
  ctx.restore();
  // Tucked in a fern, a soft green ring says "hidden" at a glance.
  if (p.inFern) {
    ctx.strokeStyle = 'rgba(122, 200, 138, 0.8)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 18, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function drawLampGlow(ctx, level, time) {
  // Lamp pools are drawn last and faint, so they warm the scene
  // without washing out the cones and the figures.
  for (const [tx, ty] of level.def.lamps) {
    const x = tx * TILE + TILE / 2;
    const y = ty * TILE + TILE / 2;
    const flicker = 0.08 + Math.sin(time * 5 + tx) * 0.02;
    const g = ctx.createRadialGradient(x, y, 4, x, y, 70);
    g.addColorStop(0, `rgba(245, 220, 140, ${flicker})`);
    g.addColorStop(1, 'rgba(245, 220, 140, 0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, 70, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#e8c96a';
    ctx.beginPath();
    ctx.arc(x, y, 3, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ---- HUD ----

export function drawHud(ctx, game) {
  const { levelIndex, sealsTaken, sealsTotal, lives, pebbles, timeLeft, score, spotted } = game.hud();
  ctx.fillStyle = 'rgba(10, 16, 20, 0.72)';
  ctx.fillRect(0, 0, VIEW_W, 34);
  ctx.fillStyle = COLORS.text;
  ctx.font = 'bold 14px sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(`Floor ${levelIndex + 1} · ${game.level.def.name}`, 12, 18);
  ctx.textAlign = 'center';
  ctx.fillText(`Seals ${sealsTaken}/${sealsTotal}   Pebbles ${pebbles}   Lives ${'♥'.repeat(lives)}`, VIEW_W / 2, 18);
  ctx.textAlign = 'right';
  ctx.fillText(`Score ${score}   ${timeLeft}s`, VIEW_W - 12, 18);

  // The eye at the top says how close the wardens are to seeing you:
  // it fills and reddens with the highest suspicion among them. The
  // pale ring keeps it visible against the dark floor at a glance.
  const worst = game.worstSuspicion();
  const ex = VIEW_W / 2;
  const ey = 52;
  ctx.fillStyle = 'rgba(10, 16, 20, 0.6)';
  ctx.beginPath();
  ctx.ellipse(ex, ey, 26, 12, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(232, 220, 200, 0.55)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.ellipse(ex, ey, 26, 12, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = worst > 66 ? COLORS.danger : worst > 30 ? '#e8a03c' : COLORS.ok;
  ctx.beginPath();
  ctx.ellipse(ex, ey, 22 * (worst / 100) + 3, 9, 0, 0, Math.PI * 2);
  ctx.fill();
  if (spotted) {
    ctx.fillStyle = COLORS.danger;
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('SPOTTED — break line of sight!', ex, ey + 26);
  } else if (worst > 30) {
    ctx.fillStyle = '#e8a03c';
    ctx.font = '13px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('A warden is getting suspicious…', ex, ey + 26);
  }
}

// ---- Screens ----

function overlay(ctx, alpha) {
  ctx.fillStyle = `rgba(8, 12, 16, ${alpha})`;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
}

function title(ctx, text, y) {
  ctx.fillStyle = COLORS.text;
  ctx.font = 'bold 44px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, VIEW_W / 2, y);
}

function line(ctx, text, y, size = 16, color = COLORS.textDim) {
  ctx.fillStyle = color;
  ctx.font = `${size}px Georgia, serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, VIEW_W / 2, y);
}

export function drawTitleScreen(ctx, game) {
  drawWorld(ctx, game);
  overlay(ctx, 0.72);
  title(ctx, 'THE QUIET STACKS', 150);
  line(ctx, 'a stealth game in the old library', 200, 18, COLORS.exit);
  line(ctx, 'WASD / arrows — move        Shift — tiptoe', 280);
  line(ctx, 'Click or Space — toss a pebble to distract a warden', 308);
  line(ctx, 'Ferns hide you. Gold cones are watching. Reach the EXIT unseen.', 336);
  line(ctx, 'Collect wax seals for points. Three floors. Three lives.', 364);
  line(ctx, 'Press ENTER or click to begin', 440, 18, COLORS.text);
  line(ctx, 'M — mute', 480, 13);
}

export function drawLevelIntro(ctx, game) {
  drawWorld(ctx, game);
  overlay(ctx, 0.6);
  title(ctx, game.level.def.name, 220);
  line(ctx, game.level.def.intro, 280, 18, COLORS.text);
  line(ctx, `Floor ${game.levelIndex + 1} of 3 — par ${game.level.def.par}s`, 320);
  line(ctx, 'Press ENTER to slip in', 400, 18, COLORS.text);
}

export function drawPaused(ctx) {
  overlay(ctx, 0.6);
  title(ctx, 'PAUSED', 260);
  line(ctx, 'P or Esc — resume        R — restart the floor', 320, 18, COLORS.text);
}

export function drawLevelClear(ctx, game, bonus) {
  overlay(ctx, 0.65);
  title(ctx, 'FLOOR CLEARED', 200);
  line(ctx, `${game.level.def.name} — unseen${game.levelSpotted ? '' : ' and never once spotted'}`, 260, 18, COLORS.text);
  line(ctx, `Seals ${game.sealsTaken}/${game.sealsTotal}  ·  Time bonus +${bonus.time}  ·  Ghost bonus +${bonus.ghost}`, 310);
  line(ctx, `Score ${game.score}`, 350, 20, COLORS.exit);
  line(ctx, 'Press ENTER for the next floor', 430, 18, COLORS.text);
}

export function drawWinScreen(ctx, game) {
  overlay(ctx, 0.78);
  title(ctx, 'THE BOOK IS YOURS', 170);
  line(ctx, 'Three floors, and not a single warden knows your name.', 225, 18, COLORS.text);
  line(ctx, `Final score ${game.score}`, 290, 24, COLORS.exit);
  line(ctx, `Seals ${game.totalSealsTaken}/${game.totalSeals}   ·   Times spotted: ${game.timesSpotted}`, 330);
  line(ctx, 'Press ENTER to play again', 430, 18, COLORS.text);
}

export function drawCaughtScreen(ctx, game) {
  overlay(ctx, 0.7);
  title(ctx, 'CAUGHT!', 200);
  line(ctx, 'A warden’s lantern found you, and the library woke up.', 260, 18, COLORS.text);
  line(ctx, `Lives left: ${game.lives}`, 310, 20, COLORS.danger);
  line(ctx, game.lives > 0 ? 'Press ENTER to try the floor again' : 'Press ENTER to start over', 380, 18, COLORS.text);
}

export function drawGameOverScreen(ctx, game) {
  overlay(ctx, 0.78);
  title(ctx, 'THE LIBRARY KEEPS ITS BOOK', 180);
  line(ctx, 'Three strikes, and the wardens know your face now.', 240, 18, COLORS.text);
  line(ctx, `Score ${game.score}`, 300, 22, COLORS.exit);
  line(ctx, 'Press ENTER to try again from the first floor', 380, 18, COLORS.text);
}
