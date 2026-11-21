// Level definitions: each level is a tile grid plus entities.
// Legend: '#' wall, 'C' crate (cover, blocks vision), 'P' pillar, '.' floor,
// 'S' player start, 'E' exit, 'G' guard post, 'I' intel pickup.
const LEVELS = [
  {
    name: 'Cold Storage',
    hint: 'Sneak past the sentry. Grab the intel, reach the yellow exit.',
    grid: [
      '####################',
      '#........C.........#',
      '#..S.....C....G....#',
      '#........C.........#',
      '#....CC............#',
      '#..........CC......#',
      '#..........CC...E..#',
      '#....C.............#',
      '#....C.....G.......#',
      '#..........C...I...#',
      '#...C......C.......#',
      '#...C..............#',
      '####################',
    ],
    guards: [
      { x: 14, y: 2, route: [[14, 2], [6, 2], [6, 6], [14, 6]] },
      { x: 11, y: 8, route: [[11, 8], [11, 3], [16, 3], [16, 8]] },
    ],
  },
  {
    name: 'Patrol Yard',
    hint: 'Two guards, tight corners. Watch the cones, stay in shadow.',
    grid: [
      '######################',
      '#.........#..........#',
      '#..S......#...C......#',
      '#.........#...C...G..#',
      '#....C....#..........#',
      '#....C....#....CC....#',
      '#.........#....CC....#',
      '#####.#####..........#',
      '#.........#....C.....#',
      '#...G.....#....C..I..#',
      '#.........C..........#',
      '#....CC...C....G.....#',
      '#....CC...C..........#',
      '#..................E.#',
      '######################',
    ],
    guards: [
      { x: 18, y: 3, route: [[18, 3], [18, 9], [13, 9], [13, 3]] },
      { x: 4, y: 9, route: [[4, 9], [4, 3], [9, 3], [9, 9]] },
      { x: 15, y: 11, route: [[15, 11], [15, 6], [19, 6], [19, 11]] },
    ],
  },
  {
    name: 'Vault Approach',
    hint: 'Three guards guard the vault door. Patience wins.',
    grid: [
      '########################',
      '#......C.......#.......#',
      '#..S...C.......#...G...#',
      '#......C.......#.......#',
      '#..............#...CC..#',
      '#....G.........#...CC..#',
      '#..............#.......#',
      '####.####...####.......#',
      '#..............#...C...#',
      '#...CC.........#...C...#',
      '#...CC....I....#.......#',
      '#..............#..G....#',
      '#....C.........#.......#',
      '#....C...G..........E..#',
      '#..............#.......#',
      '########################',
    ],
    guards: [
      { x: 19, y: 2, route: [[19, 2], [19, 7], [14, 7], [14, 2]] },
      { x: 5, y: 5, route: [[5, 5], [2, 5], [2, 1], [9, 1], [9, 5]] },
      { x: 19, y: 11, route: [[19, 11], [19, 8], [15, 8], [15, 13]] },
      { x: 9, y: 13, route: [[9, 13], [4, 13], [4, 10], [12, 10], [12, 13]] },
    ],
  },
];

// Convert a level spec into runtime objects.
export function buildLevel(spec) {
  const rows = spec.grid;
  const grid = rows.map(r => r.split(''));
  const h = rows.length, w = rows[0].length;
  const start = { x: 0, y: 0 };
  const exit = { x: 0, y: 0 };
  const crates = [];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const c = grid[y][x];
      if (c === 'S') { start.x = x; start.y = y; grid[y][x] = '.'; }
      else if (c === 'E') { exit.x = x; exit.y = y; grid[y][x] = '.'; }
      else if (c === 'C') crates.push({ x, y });
      else if (c === 'I') { spec.intel = { x, y }; grid[y][x] = '.'; }
    }
  }
  const guards = spec.guards.map(g => ({
    px: g.x * 40 + 20, py: g.y * 40 + 20,
    route: g.route, wp: 0,
    facing: 0, state: 'patrol', timer: 0, suspicion: 0,
    lastSeen: null,
  }));
  return {
    name: spec.name, hint: spec.hint,
    grid, w, h, crates, guards, start, exit,
    intel: spec.intel ? { x: spec.intel.x * 40 + 20, y: spec.intel.y * 40 + 20, taken: false } : null,
  };
}

export { LEVELS };
