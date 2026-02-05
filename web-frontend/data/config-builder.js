// Build webcfg64 config string for the Hedgewars engine
import { WEAPONS } from './weapons.js';
import { SCHEME_FLAGS } from './schemes.js';

// Scheme flag bit values matching uConsts.pas gf* constants
const FLAG_BITS = {
  fortsMode: 0x00000000, // forts mode is handled via mapgen=4
  dividedTeams: 0x00000010,
  solidLand: 0x00000004,
  border: 0x00000008,
  lowGravity: 0x00000020,
  laserSight: 0x00000040,
  invulnerable: 0x00000080,
  resetHealth: 0x00000100,
  vampirism: 0x00000200,
  karma: 0x00000400,
  artillery: 0x00000800,
  randomOrder: 0x00002000,
  king: 0x00004000,
  placeHogs: 0x00008000,
  sharedAmmo: 0x00010000,
  disableGirders: 0x00020000,
  disableLandObjects: 0x00040000,
  aiSurvival: 0x00080000,
  infiniteAttack: 0x00100000,
  resetWeapons: 0x00200000,
  perHogAmmo: 0x00400000,
  disableWind: 0x00800000,
  moreWind: 0x01000000,
  tagTeam: 0x02000000,
  bottomBorder: 0x04000000,
};

// Map type name to mapgen integer
const MAPGEN = { 'Random': 0, 'Maze': 1, 'Drawn': 3, 'Perlin': 2, 'Forts': 4, 'WFC': 5 };

// Build ammo string (one char per weapon in TAmmoType order)
function buildAmmoString(weaponSet, field) {
  return WEAPONS.map(w => {
    const v = (weaponSet[field] && weaponSet[field][w.id]) || 0;
    return String(Math.min(9, Math.max(0, v)));
  }).join('');
}

export function buildConfig({ mapType, theme, seed, scheme, weaponSet, teams }) {
  const lines = [];

  // Map
  lines.push('mapgen ' + (MAPGEN[mapType] ?? 0));
  lines.push('theme ' + (theme || 'Nature'));
  lines.push('seed ' + (seed || '{' + Math.random().toString(36).slice(2) + '}'));

  // Scheme settings
  if (scheme) {
    lines.push('turntime ' + ((scheme.turnTime || 45) * 1000));
    lines.push('sd_turns ' + (scheme.suddenDeathTimeout ?? 15));
    lines.push('waterrise ' + (scheme.suddenDeathWaterRise ?? 47));
    lines.push('healthdec ' + (scheme.suddenDeathHealthDec ?? 5));
    lines.push('damagepct ' + (scheme.damageMod ?? 100));
    lines.push('inithealth ' + (scheme.initialHealth ?? 100));
    lines.push('casefreq ' + (scheme.crateDropTurns ?? 5));
    lines.push('minestime ' + (scheme.minesTime ?? 3));
    lines.push('minesnum ' + (scheme.minesCount ?? 4));
    lines.push('minedudpct ' + (scheme.mineDudPct ?? 0));
    lines.push('explosives ' + (scheme.explosives ?? 2));
    lines.push('airmines ' + (scheme.airMines ?? 0));
    lines.push('healthprob ' + (scheme.healthCratePct ?? 35));
    lines.push('hcaseamount ' + (scheme.healthCrateHP ?? 25));
    lines.push('sentries ' + (scheme.sentryCount ?? 0));
    lines.push('worldedge ' + (scheme.worldEdge ?? 0));

    // Game flags bitmask
    let flags = 0;
    if (scheme.flags) {
      for (const [key, bit] of Object.entries(FLAG_BITS)) {
        if (scheme.flags[key]) flags |= bit;
      }
    }
    lines.push('gmflags ' + flags);
  }

  // Ammo
  const ammloadt = buildAmmoString(weaponSet, 'ammo');
  const ammprob = buildAmmoString(weaponSet, 'prob');
  const ammdelay = buildAmmoString(weaponSet, 'delay');
  const ammreinf = buildAmmoString(weaponSet, 'crate');
  
  console.log('[config] ammo string lengths:', {
    ammloadt: ammloadt.length,
    ammprob: ammprob.length,
    ammdelay: ammdelay.length,
    ammreinf: ammreinf.length
  });
  
  lines.push('ammloadt ' + ammloadt);
  lines.push('ammprob ' + ammprob);
  lines.push('ammdelay ' + ammdelay);
  lines.push('ammreinf ' + ammreinf);

  // Teams - one ammstore per team
  for (let i = 0; i < teams.length; i++) {
    const team = teams[i];
    lines.push('ammstore');
    lines.push('addteam x ' + i + ' ' + team.name);
    lines.push('grave ' + (team.grave || 'Grave'));
    lines.push('fort ' + (team.fort || 'Castle'));
    lines.push('flag ' + (team.flag || 'hedgewars'));
    lines.push('voicepack ' + (team.voice || 'Default'));

    const hogCount = team.hedgehogs ? Math.min(team.hedgehogs.length, 8) : 1;
    for (let h = 0; h < hogCount; h++) {
      const hog = team.hedgehogs?.[h] || { name: 'Hedgehog ' + (h + 1) };
      lines.push('addhh ' + (team.difficulty || 0) + ' ' + (scheme?.initialHealth ?? 100) + ' ' + hog.name);
      lines.push('hat ' + (team.hat || 'NoHat'));
    }
  }

  return lines.join('\n');
}

// Encode config and return args array for Module.callMain
export function buildArgs(configText) {
  const args = ['--prefix', '/Data', '--user-prefix', '/'];
  const encoded = btoa(configText);
  const chunkSize = 200;
  for (let i = 0; i < encoded.length; i += chunkSize) {
    args.push('--webcfg64', encoded.slice(i, i + chunkSize));
  }
  return args;
}
