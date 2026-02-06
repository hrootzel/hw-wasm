// Default schemes
export const SCHEME_SETTINGS = [
  { key: 'damageMod', label: 'Damage Modifier %', min: 10, max: 300, default: 100 },
  { key: 'turnTime', label: 'Turn Time (sec)', min: 1, max: 999, default: 45 },
  { key: 'initialHealth', label: 'Initial Health', min: 1, max: 200, default: 100 },
  { key: 'suddenDeathTimeout', label: 'Sudden Death (turns)', min: 0, max: 999, default: 15 },
  { key: 'suddenDeathWaterRise', label: 'Water Rise (px/turn)', min: 0, max: 100, default: 47 },
  { key: 'suddenDeathHealthDec', label: 'Health Decrease', min: 0, max: 100, default: 5 },
  { key: 'crateDropTurns', label: 'Crate Drop Turns', min: 0, max: 10, default: 5 },
  { key: 'minesTime', label: 'Mines Time (sec)', min: -1, max: 5, default: 3 },
  { key: 'minesCount', label: 'Mines Count', min: 0, max: 80, default: 4 },
  { key: 'mineDudPct', label: 'Dud Mines %', min: 0, max: 100, default: 0 },
  { key: 'explosives', label: 'Explosives', min: 0, max: 40, default: 2 },
  { key: 'airMines', label: 'Air Mines', min: 0, max: 40, default: 0 },
  { key: 'healthCratePct', label: 'Health Crate %', min: 0, max: 100, default: 35 },
  { key: 'healthCrateHP', label: 'Health per Crate', min: 0, max: 200, default: 25 },
  { key: 'sentryCount', label: 'Sentries', min: 0, max: 40, default: 0 },
  { key: 'worldEdge', label: 'World Edge', options: ['None', 'Wrap', 'Bounce', 'Sea'], default: 0 },
];

export const SCHEME_FLAGS = [
  { key: 'fortsMode', label: 'Forts Mode' },
  { key: 'dividedTeams', label: 'Divided Teams' },
  { key: 'solidLand', label: 'Solid Land' },
  { key: 'border', label: 'Add Border' },
  { key: 'lowGravity', label: 'Low Gravity' },
  { key: 'laserSight', label: 'Laser Sight' },
  { key: 'invulnerable', label: 'Invulnerable' },
  { key: 'resetHealth', label: 'Reset Health' },
  { key: 'vampirism', label: 'Vampirism' },
  { key: 'karma', label: 'Karma' },
  { key: 'artillery', label: 'Artillery Mode' },
  { key: 'randomOrder', label: 'Random Order' },
  { key: 'king', label: 'King Mode' },
  { key: 'placeHogs', label: 'Place Hedgehogs' },
  { key: 'sharedAmmo', label: 'Shared Ammo' },
  { key: 'disableGirders', label: 'Disable Girders' },
  { key: 'disableLandObjects', label: 'Disable Land Objects' },
  { key: 'aiSurvival', label: 'AI Survival' },
  { key: 'infiniteAttack', label: 'Infinite Attack' },
  { key: 'resetWeapons', label: 'Reset Weapons' },
  { key: 'perHogAmmo', label: 'Per-Hog Ammo' },
  { key: 'disableWind', label: 'Disable Wind' },
  { key: 'moreWind', label: 'More Wind' },
  { key: 'tagTeam', label: 'Tag Team' },
  { key: 'bottomBorder', label: 'Bottom Border' },
];

export function createDefaultScheme(name) {
  const scheme = { name, flags: {} };
  for (const s of SCHEME_SETTINGS) {
    scheme[s.key] = s.default;
  }
  for (const f of SCHEME_FLAGS) {
    scheme.flags[f.key] = false;
  }
  return scheme;
}

export const DEFAULT_SCHEMES = [
  createDefaultScheme('Default'),
  {
    ...createDefaultScheme('Pro Mode'),
    initialHealth: 100,
    suddenDeathTimeout: 15,
    crateDropTurns: 0,
    flags: { ...createDefaultScheme('Pro Mode').flags, resetHealth: false },
  },
  {
    ...createDefaultScheme('Shoppa'),
    turnTime: 30,
    initialHealth: 100,
    suddenDeathTimeout: 50,
    crateDropTurns: 1,
    minesCount: 0,
    explosives: 0,
    flags: { ...createDefaultScheme('Shoppa').flags, placeHogs: true, sharedAmmo: true },
  },
  {
    ...createDefaultScheme('Artillery'),
    flags: { ...createDefaultScheme('Artillery').flags, artillery: true },
  },
  {
    ...createDefaultScheme('Fort Mode'),
    flags: { ...createDefaultScheme('Fort Mode').flags, fortsMode: true, dividedTeams: true },
  },
];
