// Weapon definitions and default weapon sets
export const WEAPONS = [
  { id: 'amGrenade', name: 'Grenade', slot: 1 },
  { id: 'amClusterBomb', name: 'Cluster Bomb', slot: 1 },
  { id: 'amBazooka', name: 'Bazooka', slot: 1 },
  { id: 'amBee', name: 'Homing Bee', slot: 1 },
  { id: 'amShotgun', name: 'Shotgun', slot: 2 },
  { id: 'amPickHammer', name: 'Pick Hammer', slot: 2 },
  { id: 'amSkip', name: 'Skip Turn', slot: 9 },
  { id: 'amRope', name: 'Rope', slot: 7 },
  { id: 'amMine', name: 'Mine', slot: 3 },
  { id: 'amDEagle', name: 'Desert Eagle', slot: 2 },
  { id: 'amDynamite', name: 'Dynamite', slot: 3 },
  { id: 'amFirePunch', name: 'Fire Punch', slot: 6 },
  { id: 'amWhip', name: 'Whip', slot: 6 },
  { id: 'amBaseballBat', name: 'Baseball Bat', slot: 6 },
  { id: 'amParachute', name: 'Parachute', slot: 7 },
  { id: 'amAirAttack', name: 'Air Attack', slot: 5 },
  { id: 'amMineStrike', name: 'Mine Strike', slot: 5 },
  { id: 'amBlowTorch', name: 'Blow Torch', slot: 2 },
  { id: 'amGirder', name: 'Girder', slot: 4 },
  { id: 'amTeleport', name: 'Teleport', slot: 7 },
  { id: 'amSwitch', name: 'Switch Hog', slot: 9 },
  { id: 'amMortar', name: 'Mortar', slot: 1 },
  { id: 'amKamikaze', name: 'Kamikaze', slot: 6 },
  { id: 'amCake', name: 'Cake', slot: 3 },
  { id: 'amSeduction', name: 'Seduction', slot: 3 },
  { id: 'amWatermelon', name: 'Watermelon Bomb', slot: 1 },
  { id: 'amHellishBomb', name: 'Hellish Bomb', slot: 1 },
  { id: 'amNapalm', name: 'Napalm Strike', slot: 5 },
  { id: 'amDrill', name: 'Drill Rocket', slot: 1 },
  { id: 'amBallgun', name: 'Ballgun', slot: 3 },
  { id: 'amRCPlane', name: 'RC Plane', slot: 5 },
  { id: 'amLowGravity', name: 'Low Gravity', slot: 8 },
  { id: 'amExtraDamage', name: 'Extra Damage', slot: 8 },
  { id: 'amInvulnerable', name: 'Invulnerable', slot: 8 },
  { id: 'amExtraTime', name: 'Extra Time', slot: 8 },
  { id: 'amLaserSight', name: 'Laser Sight', slot: 8 },
  { id: 'amVampiric', name: 'Vampirism', slot: 8 },
  { id: 'amSniperRifle', name: 'Sniper Rifle', slot: 2 },
  { id: 'amJetpack', name: 'Flying Saucer', slot: 7 },
  { id: 'amMolotov', name: 'Molotov Cocktail', slot: 1 },
  { id: 'amBirdy', name: 'Birdy', slot: 7 },
  { id: 'amPortalGun', name: 'Portal Gun', slot: 7 },
  { id: 'amPiano', name: 'Piano Strike', slot: 5 },
  { id: 'amGasBomb', name: 'Gas Bomb', slot: 1 },
  { id: 'amSineGun', name: 'Sine Gun', slot: 2 },
  { id: 'amFlamethrower', name: 'Flamethrower', slot: 2 },
  { id: 'amSMine', name: 'Sticky Mine', slot: 3 },
  { id: 'amHammer', name: 'Hammer', slot: 6 },
  { id: 'amResurrector', name: 'Resurrector', slot: 4 },
  { id: 'amDrillStrike', name: 'Drill Strike', slot: 5 },
  { id: 'amSnowball', name: 'Snowball', slot: 1 },
  { id: 'amTardis', name: 'Time Box', slot: 7 },
  { id: 'amLandGun', name: 'Land Spray', slot: 4 },
  { id: 'amIceGun', name: 'Freezer', slot: 2 },
  { id: 'amKnife', name: 'Cleaver', slot: 6 },
  { id: 'amRubber', name: 'Rubber', slot: 4 },
  { id: 'amAirMine', name: 'Air Mine', slot: 3 },
  { id: 'amDuck', name: 'Rubber Duck', slot: 3 },
  { id: 'amMinigun', name: 'Minigun', slot: 2 },
];

// Ammo count: 0=none, 1-8=count, 9=infinite
export function createDefaultWeaponSet(name) {
  const ammo = {};
  const delay = {};
  const prob = {};
  const crate = {};
  
  for (const w of WEAPONS) {
    ammo[w.id] = 2;
    delay[w.id] = 0;
    prob[w.id] = 0;
    crate[w.id] = 1;
  }
  
  return { name, ammo, delay, prob, crate };
}

export const DEFAULT_WEAPON_SETS = [
  (() => {
    const ws = createDefaultWeaponSet('Default');
    // Set some weapons to infinite
    ws.ammo.amGrenade = 9;
    ws.ammo.amShotgun = 9;
    ws.ammo.amSkip = 9;
    ws.ammo.amSwitch = 9;
    // Set some to limited
    ws.ammo.amBazooka = 9;
    ws.ammo.amRope = 5;
    ws.ammo.amParachute = 2;
    ws.ammo.amAirAttack = 1;
    ws.ammo.amTeleport = 2;
    return ws;
  })(),
  (() => {
    const ws = createDefaultWeaponSet('Pro Mode');
    for (const w of WEAPONS) {
      ws.ammo[w.id] = 9;
    }
    ws.ammo.amAirAttack = 0;
    ws.ammo.amMineStrike = 0;
    ws.ammo.amNapalm = 0;
    ws.ammo.amDrillStrike = 0;
    ws.ammo.amPiano = 0;
    return ws;
  })(),
  (() => {
    const ws = createDefaultWeaponSet('Shoppa');
    for (const w of WEAPONS) {
      ws.ammo[w.id] = 0;
      ws.prob[w.id] = 2;
      ws.crate[w.id] = 1;
    }
    ws.ammo.amRope = 9;
    ws.ammo.amSkip = 9;
    return ws;
  })(),
];
