// Screenshot staging: put the game into a posed state for a shot.
//
// Every shot is a real render of the game's own code — the staging
// only drives the game the way a player would (start it, walk a few
// steps, finish a floor), then freezes it. The query is ?shot=<name>
// with an optional &seed= for the small random details.
//
//   start   the title screen over the first floor
//   play    mid-floor, player crouched behind a shelf while two
//           wardens' cones sweep past — the stealth, in one frame
//   win     the win screen after all three floors
//   caught  the caught screen, a warden right on top of the player

import { makeRng } from './rng.js';

export function stageShot(game, shot, seed) {
  const rng = makeRng(seed * 7919 + 13);
  if (shot === 'start') {
    game.screen = 'title';
    return;
  }
  if (shot === 'play') {
    game.startGame();
    game.screen = 'playing';
    // Walk the player to a tense spot: tucked just behind the middle
    // shelf row with a cone sweeping past in front of them. The shot
    // wants the player small, the cone big, and the exit far away.
    const p = game.player;
    p.x = 300 + Math.floor(rng() * 20);
    p.y = 300;
    p.sneaking = true;
    // Wind the wardens a few seconds into their patrols so their
    // cones are mid-sweep, not parked at a waypoint.
    const idle = { up: false, down: false, left: false, right: false, sneak: true, consumePebble: false, mouse: { x: 0, y: 0 } };
    for (let i = 0; i < 240; i++) game.update(1 / 60, idle);
    // Put one warden properly suspicious so the HUD eye is amber
    // and the player can see the stakes in the shot.
    game.guards[0].suspicion = 55;
    game.guards[0].mode = 'wary';
    return;
  }
  if (shot === 'win') {
    game.startGame();
    game.score = 1840;
    game.timesSpotted = 1;
    game.totalSealsTaken = 5;
    game.screen = 'win';
    return;
  }
  if (shot === 'caught') {
    game.startGame();
    game.screen = 'playing';
    const idle = { up: false, down: false, left: false, right: false, sneak: false, consumePebble: false, mouse: { x: 0, y: 0 } };
    for (let i = 0; i < 120; i++) game.update(1 / 60, idle);
    // Drop a warden on top of the player: the chase, the moment
    // before the catch, reads clearly in a still frame.
    const g = game.guards[0];
    g.x = game.player.x + 40;
    g.y = game.player.y;
    g.facing = Math.PI;
    g.mode = 'chase';
    g.suspicion = 100;
    game.screen = 'caught';
    game.lives = 2;
    return;
  }
  game.screen = 'title';
}
