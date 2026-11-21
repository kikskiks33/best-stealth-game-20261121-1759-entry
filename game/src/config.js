// The Quiet Stacks — shared numbers every other module reads.
// One place for the tuning so a balance tweak never means hunting
// through the guard code and the renderer at the same time.

export const TILE = 40;
export const COLS = 24;
export const ROWS = 15;
export const VIEW_W = COLS * TILE; // 960
export const VIEW_H = ROWS * TILE; // 600

// How fast things move, in pixels per second.
export const WALK_SPEED = 150;
export const SNEAK_SPEED = 82;
export const GUARD_PATROL_SPEED = 62;
export const GUARD_CHASE_SPEED = 132;
export const GUARD_INVESTIGATE_SPEED = 95;

// Vision: how far a warden can see, and how wide the cone is.
export const SIGHT_RANGE = 175;
export const SIGHT_HALF_ANGLE = 0.61; // ~35 degrees each side

// Suspicion runs 0..100. These are per-second rates while the player
// stands inside a cone with nothing between them and the warden.
// Near is nearly instant — the cone is only forgiving at its edge.
export const SPOT_RATE_NEAR = 95; // closer than half range: seen almost at once
export const SPOT_RATE_FAR = 42; // at the edge of the cone
export const SPOT_RATE_SNEAK = 0.38; // tiptoeing multiplies the rate down
export const SPOT_RATE_FERN = 0; // tucked in a fern: invisible, full stop
export const CALM_RATE = 26; // suspicion draining per second, out of sight

// Once a warden is fully suspicious it chases. Lose it for this long
// and it gives up and goes back to its rounds.
export const GIVE_UP_SECONDS = 3.2;
export const CHASE_TOUCH = 20; // caught if a chasing warden gets this close

// Pebbles: the player's only distraction. A thrown pebble makes every
// warden in earshot walk over to listen.
export const PEBBLES_PER_LEVEL = 3;
export const PEBBLE_HEAR_RANGE = 260;

export const LIVES_START = 3;
export const SEAL_POINTS = 150;
export const GHOST_BONUS = 300; // finish a level without ever being spotted
export const TIME_BONUS_PER_SECOND = 4; // leftover par time, per second

// The palette: a library after closing time. Warm lamp light on cold
// blue dark, so the safe dark and the dangerous light read at a glance.
export const COLORS = {
  floor: '#1d2b33',
  floorAlt: '#1a262d',
  wall: '#4a3423',
  wallTop: '#6b4e33',
  shelf: '#3d2b1d',
  shelfSpine: ['#7a4a3a', '#4a6b5a', '#6b5a3a', '#5a4a6b', '#8a6b3a'],
  fern: '#2e5d43',
  fernDark: '#234735',
  exit: '#e8c96a',
  exitGlow: '#f5dd8a',
  player: '#e8dcc8',
  playerCloak: '#7a5a8a',
  guard: '#c8b890',
  guardRobe: '#8a3a3a',
  coneCalm: 'rgba(232, 201, 106, 0.30)',
  coneWary: 'rgba(232, 160, 60, 0.44)',
  coneAlarm: 'rgba(200, 60, 50, 0.52)',
  lamp: 'rgba(245, 220, 140, 0.10)',
  seal: '#e8c96a',
  pebble: '#b8b0a0',
  text: '#e8dcc8',
  textDim: '#9a9080',
  danger: '#e05a4a',
  ok: '#7ac88a',
};
