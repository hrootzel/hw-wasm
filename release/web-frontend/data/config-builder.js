// Build webcfg64 config string for the Hedgewars engine
import { WEAPONS } from './weapons.js';
import { SCHEME_FLAGS } from './schemes.js';
import { DEFAULT_BINDINGS } from './defaults.js';
import { DEFAULT_WEAPON_SETS, createDefaultWeaponSet } from './weapons.js';

// Scheme flag bit values matching uConsts.pas gf* constants
const FLAG_BITS = {
  oneClanMode: 0x00000001, // For missions - game doesn't end with one clan
  // 0x00000002 is gfMultiWeapon (target practice); not currently exposed in web UI.
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
  switchHog: 0x00001000,
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

const ACTION_TO_ENGINE_COMMAND = {
  up: '+up',
  down: '+down',
  left: '+left',
  right: '+right',
  jump: 'ljump',
  highjump: 'hjump',
  attack: '+attack',
  precise: '+precise',
  switch: 'switch',
  timer1: 'timer 1',
  timer2: 'timer 2',
  timer3: 'timer 3',
  timer4: 'timer 4',
  timer5: 'timer 5',
  slot1: 'slot 1',
  slot2: 'slot 2',
  slot3: 'slot 3',
  slot4: 'slot 4',
  slot5: 'slot 5',
  slot6: 'slot 6',
  slot7: 'slot 7',
  slot8: 'slot 8',
  slot9: 'slot 9',
  chat: 'chat',
  pause: 'pause',
  quit: 'quit',
};

const CODE_TO_ENGINE_KEY = {
  ArrowUp: 'up',
  ArrowDown: 'down',
  ArrowLeft: 'left',
  ArrowRight: 'right',
  Enter: 'return',
  Backspace: 'backspace',
  Space: 'space',
  Tab: 'tab',
  Escape: 'escape',
  ShiftLeft: 'left_shift',
  ShiftRight: 'right_shift',
  ControlLeft: 'left_ctrl',
  ControlRight: 'right_ctrl',
  AltLeft: 'left_alt',
  AltRight: 'right_alt',
  Backquote: '`',
};

function toEngineKey(code) {
  if (!code || typeof code !== 'string') return null;
  if (CODE_TO_ENGINE_KEY[code]) return CODE_TO_ENGINE_KEY[code];

  if (/^Key[A-Z]$/.test(code)) return code.slice(3).toLowerCase();
  if (/^Digit[0-9]$/.test(code)) return code.slice(5);
  if (/^F([1-9]|10)$/.test(code)) return code.toLowerCase();
  if (/^Numpad[0-9]$/.test(code)) return 'keypad_' + code.slice(6);
  if (code === 'NumpadEnter') return 'enter';
  if (code === 'NumpadAdd') return 'keypad_plus';
  if (code === 'NumpadSubtract') return 'keypad_minus';
  if (code === 'NumpadMultiply') return 'keypad_multiply';
  if (code === 'NumpadDivide') return 'keypad_divide';

  return null;
}

function buildBindLines(bindings) {
  const lines = [];
  for (const [action, keyCode] of Object.entries(bindings || {})) {
    const command = ACTION_TO_ENGINE_COMMAND[action];
    const engineKey = toEngineKey(keyCode);
    if (!command || !engineKey) continue;
    lines.push('bind ' + engineKey + ' ' + command);
  }
  return lines;
}

// Build ammo string (one char per weapon in TAmmoType order)
function buildAmmoString(weaponSet, field) {
  return WEAPONS.map(w => {
    const v = (weaponSet[field] && weaponSet[field][w.id]) || 0;
    return String(Math.min(9, Math.max(0, v)));
  }).join('');
}

export function buildConfig({ mapType, theme, seed, scheme, weaponSet, teams, mission, bindings }) {
  const lines = [];
  const mergedBindings = bindings ? { ...DEFAULT_BINDINGS, ...bindings } : null;

  // Local Game can be entered before the weapon editor ever seeded storage.
  // The Emscripten loader expects ammo lines to always exist, so fall back safely.
  const effectiveWeaponSet =
    (weaponSet && weaponSet.ammo && weaponSet.prob && weaponSet.delay && weaponSet.crate)
      ? weaponSet
      : (DEFAULT_WEAPON_SETS?.[0] || createDefaultWeaponSet('Default'));
  if (effectiveWeaponSet !== weaponSet) {
    console.warn('[config] weaponSet missing/invalid; falling back to Default weapon set');
  }

  // Mission script (if provided)
  if (mission) {
    lines.push('setmissteam'); // Initialize mission team

    if (mergedBindings) {
      lines.push(...buildBindLines(mergedBindings));
    }

    // Mission path is relative to Missions/ directory
    const missionPath = mission.includes('/') ? 'Missions/Campaign/' + mission : 'Missions/Training/' + mission;
    lines.push('script ' + missionPath);
  } else {
    // Map (only for non-mission games)
    lines.push('mapgen ' + (MAPGEN[mapType] ?? 0));
    lines.push('theme ' + (theme || 'Nature'));
    lines.push('seed ' + (seed || '{' + Math.random().toString(36).slice(2) + '}'));
  }

  // Scheme settings
  if (scheme) {
    lines.push('turntime ' + ((scheme.turnTime || 45) * 1000));
    lines.push('sd_turns ' + (scheme.suddenDeathTimeout ?? 15));
    lines.push('waterrise ' + (scheme.suddenDeathWaterRise ?? 47));
    lines.push('healthdec ' + (scheme.suddenDeathHealthDec ?? 5));
    lines.push('damagepct ' + (scheme.damageMod ?? 100));
    lines.push('inithealth ' + (scheme.initialHealth ?? 100));
    lines.push('casefreq ' + (scheme.crateDropTurns ?? 5));
    // Engine expects mine timer in milliseconds; Qt frontend sends seconds * 1000.
    lines.push('minestime ' + ((scheme.minesTime ?? 3) * 1000));
    lines.push('minesnum ' + (scheme.minesCount ?? 4));
    lines.push('minedudpct ' + (scheme.mineDudPct ?? 0));
    lines.push('explosives ' + (scheme.explosives ?? 2));
    lines.push('airmines ' + (scheme.airMines ?? 0));
    lines.push('healthprob ' + (scheme.healthCratePct ?? 35));
    lines.push('hcaseamount ' + (scheme.healthCrateHP ?? 25));
    lines.push('sentries ' + (scheme.sentryCount ?? 0));
    lines.push('ropepct ' + (scheme.ropePct ?? scheme.ropePercent ?? scheme.ropeModifier ?? 100));
    lines.push('getawaytime ' + (scheme.getawayTime ?? scheme.getAwayTime ?? 100));
    lines.push('worldedge ' + (scheme.worldEdge ?? 0));
    lines.push('scriptparam ' + String(scheme.scriptParam ?? scheme.scriptparam ?? ''));

    // Game flags bitmask
    let flags = 0;
    if (scheme.flags) {
      for (const [key, bit] of Object.entries(FLAG_BITS)) {
        if (scheme.flags[key]) flags |= bit;
      }
    }
    // Always enable oneClanMode for missions
    if (mission) {
      flags |= FLAG_BITS.oneClanMode;
    }
    lines.push('gmflags ' + flags);
  }

  // Ammo
  const ammloadt = buildAmmoString(effectiveWeaponSet, 'ammo');
  const ammprob = buildAmmoString(effectiveWeaponSet, 'prob');
  const ammdelay = buildAmmoString(effectiveWeaponSet, 'delay');
  const ammreinf = buildAmmoString(effectiveWeaponSet, 'crate');
  
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

  // Teams - one ammstore per team (skip for missions - they use AddMissionTeam)
  if (!mission) {
    for (let i = 0; i < teams.length; i++) {
      const team = teams[i];
      lines.push('ammstore');
      lines.push('addteam x ' + (team.color ?? i) + ' ' + team.name);
      lines.push('grave ' + (team.grave || 'Statue'));
      lines.push('fort ' + (team.fort || 'Plane'));
      lines.push('flag ' + (team.flag || 'hedgewars'));
      lines.push('voicepack ' + (team.voice || 'Default'));

      const hogCount = team.hogCount || (team.hedgehogs ? Math.min(team.hedgehogs.length, 8) : 8);
      for (let h = 0; h < hogCount; h++) {
        const hog = team.hedgehogs?.[h] || { name: 'Hedgehog ' + (h + 1) };
        lines.push('addhh ' + (team.difficulty || 0) + ' ' + (scheme?.initialHealth ?? 100) + ' ' + hog.name);
        lines.push('hat ' + (team.hat || 'NoHat'));
      }

      // Controls are team-local in engine config, so apply the selected binds
      // to each generated team.
      if (mergedBindings) {
        lines.push(...buildBindLines(mergedBindings));
      }
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
