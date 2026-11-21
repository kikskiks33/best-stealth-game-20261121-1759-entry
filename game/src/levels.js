// The three floors of the library, one map each. I drew them on
// graph paper first, in my head: the player starts bottom-left, the
// exit sits top-right, and every route between them crosses at least
// two cones — the puzzle is when to cross, not whether.
//
// Tile letters:
//   #  wall or bookshelf — blocks movement and blocks sight
//   .  open floor
//   F  a fern planter — walk in and a warden's cone cannot see you
//   *  a wax seal — optional, worth points, usually in the open
//   E  the exit door — reach it unseen to finish the floor
//   P  where the player starts
//
// Guards patrol between waypoints given in tile coordinates. A patrol
// should always loop through open floor, never through a shelf — the
// game trusts the map here, and the play-test checks it.

export const LEVELS = [
  {
    name: 'The Reading Room',
    par: 75,
    intro: 'Closing time. Slip past the wardens, reach the far door.',
    map: [
      '########################',
      '#P....#......#........E#',
      '#.....#......#.........#',
      '#..##.......##....##...#',
      '#..##.......##....##...#',
      '#......F........F......#',
      '#.####......####.....#.#',
      '#......................#',
      '#..F.....##......##..F.#',
      '#.......##......##.....#',
      '#.####......##......##.#',
      '#......F........F......#',
      '#..*.....##....##....*.#',
      '#......................#',
      '########################',
    ],
    guards: [
      { waypoints: [[8, 7], [16, 7]], pause: 1.0 },
      { waypoints: [[22, 3], [22, 11]], pause: 1.4 },
      { waypoints: [[3, 12], [8, 12], [8, 13], [3, 13]], pause: 0.8 },
    ],
    lamps: [[5, 1], [12, 7], [19, 1], [8, 13], [16, 13]],
  },
  {
    name: 'The Long Stacks',
    par: 90,
    intro: 'Row after row of shelves. The wardens walk them all night.',
    map: [
      '########################',
      '#P...##....##....##..E.#',
      '#....##....##....##....#',
      '#....##....##....##.F..#',
      '#......................#',
      '#.###...####...####..#.#',
      '#......................#',
      '#..F....##....##....F..#',
      '#......##....##........#',
      '#.####.....##.....####.#',
      '#......................#',
      '#..*...##......##....*.#',
      '#.....##......##.......#',
      '#..F.......##.......F..#',
      '########################',
    ],
    guards: [
      { waypoints: [[2, 4], [21, 4]], pause: 0.9 },
      { waypoints: [[2, 6], [21, 6]], pause: 1.2 },
      { waypoints: [[4, 10], [20, 10]], pause: 1.0 },
      { waypoints: [[16, 12], [21, 12]], pause: 0.7 },
    ],
    lamps: [[4, 3], [12, 6], [20, 3], [6, 12], [18, 12]],
  },
  {
    name: 'The Vault of Dust',
    par: 105,
    intro: 'The oldest floor. Five wardens, and nowhere to hide but ferns.',
    map: [
      '########################',
      '#P...#....F....#.....E.#',
      '#....#.........#.......#',
      '#.##...##..##...##..##.#',
      '#......................#',
      '#..F...####...####..F..#',
      '#......................#',
      '#.###....##..##....###.#',
      '#.......##....##.......#',
      '#..*..F......##.....F.*#',
      '#......................#',
      '#.####...##..##...####.#',
      '#......F........F......#',
      '#..*......##.........*.#',
      '########################',
    ],
    guards: [
      { waypoints: [[6, 1], [14, 1], [14, 4], [6, 4]], pause: 0.8 },
      { waypoints: [[2, 6], [21, 6]], pause: 1.1 },
      { waypoints: [[8, 10], [16, 10]], pause: 0.9 },
      { waypoints: [[3, 9], [9, 9], [9, 10], [3, 10]], pause: 0.7 },
      { waypoints: [[15, 13], [22, 13]], pause: 1.0 },
    ],
    lamps: [[6, 2], [12, 7], [18, 2], [4, 12], [20, 12]],
  },
];

// Read a level's map into a grid the game can query. Walls and shelves
// are the only solid tiles; ferns, seals and the exit are floor you
// can stand on, with something extra drawn on top.
export function parseLevel(def) {
  const grid = def.map.map((row) => row.split(''));
  const solid = (tx, ty) => {
    if (tx < 0 || ty < 0 || tx >= 24 || ty >= 15) return true;
    return grid[ty][tx] === '#';
  };
  const at = (tx, ty) => {
    if (tx < 0 || ty < 0 || tx >= 24 || ty >= 15) return '#';
    return grid[ty][tx];
  };
  let start = { x: 60, y: 60 };
  let exit = { x: 900, y: 60 };
  const seals = [];
  const ferns = [];
  for (let y = 0; y < 15; y++) {
    for (let x = 0; x < 24; x++) {
      const c = grid[y][x];
      if (c === 'P') start = { x: x * 40 + 20, y: y * 40 + 20 };
      if (c === 'E') exit = { x: x * 40 + 20, y: y * 40 + 20 };
      if (c === '*') seals.push({ x: x * 40 + 20, y: y * 40 + 20, taken: false });
      if (c === 'F') ferns.push({ x: x * 40 + 20, y: y * 40 + 20 });
    }
  }
  return { def, grid, solid, at, start, exit, seals, ferns };
}
