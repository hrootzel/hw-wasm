// Name generator for teams and hedgehogs
// Based on frontend-qt6/util/namegen.cpp

const TEAM_NAMES = [
  'Hedgehogs', 'Hogs of War', 'Porkers', 'Snouts', 'Hoglets', 'Bacon Battalion',
  'Pork Chops', 'Swine Squad', 'Boar Brigade', 'Tuskers', 'Razorbacks', 'Warthogs',
  'Wild Boars', 'Piggies', 'Oinkers', 'Grunters', 'Squeakers', 'Rooters'
];

// All available name dictionaries
const NAME_DICTS = [
  'angel', 'apple', 'banana', 'bandit', 'biblical', 'clown', 'crown', 'female',
  'fruit', 'generic', 'kiss', 'knight', 'lemon', 'morbid', 'native_american',
  'ninja', 'nordic', 'orange', 'pirate', 'pokehogs', 'scif_swDarthvader',
  'scif_swStormtrooper', 'war', 'whysoserious', 'wizard'
];

// Preloaded name dictionaries
const nameDicts = new Map();
let dictsLoaded = false;

// Preload all name dictionaries
(async function preloadDicts() {
  for (const dict of NAME_DICTS) {
    try {
      const response = await fetch(`../Data/Names/${dict}.txt`);
      if (response.ok) {
        const text = await response.text();
        const names = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
        nameDicts.set(dict, names);
      }
    } catch (e) {
      console.warn(`Failed to load ${dict}:`, e);
    }
  }
  dictsLoaded = true;
  console.log(`Loaded ${nameDicts.size} name dictionaries`);
})();

// Get names from a dictionary (synchronous, uses preloaded data)
function getNames(dictName) {
  return nameDicts.get(dictName) || nameDicts.get('generic') || ['Hedgehog'];
}

// Load dictionary list for a hat (returns dict name, not full list)
function getHatDict(hatname) {
  // For now, just use generic. In full implementation, would load .cfg files
  // that map hats to specific dictionaries
  return 'generic';
}

function getTeamHogCount(team) {
  const fromTeam = Number(team?.hogCount);
  if (Number.isInteger(fromTeam) && fromTeam > 0) {
    return Math.min(fromTeam, 8);
  }
  const fromArray = team?.hedgehogs?.length || 0;
  return Math.min(Math.max(fromArray, 1), 8);
}

function ensureHedgehog(team, index) {
  if (!team.hedgehogs) team.hedgehogs = [];
  while (team.hedgehogs.length <= index) {
    team.hedgehogs.push({ name: `Hedgehog ${team.hedgehogs.length + 1}` });
  }
}

// Generate random hedgehog names for a team
export async function randomHogNames(team) {
  const usedNames = new Set();
  const dictName = getHatDict(team.hat || 'NoHat');
  const names = getNames(dictName);
  const hogCount = getTeamHogCount(team);
  
  for (let i = 0; i < hogCount; i++) {
    ensureHedgehog(team, i);
    let availableNames = names.filter(n => !usedNames.has(n));
    if (availableNames.length === 0) {
      availableNames = names;
    }
    
    const name = availableNames[Math.floor(Math.random() * availableNames.length)];
    team.hedgehogs[i].name = name;
    usedNames.add(name);
  }
  
  return team;
}

// Generate a random team name
export function randomTeamName() {
  return TEAM_NAMES[Math.floor(Math.random() * TEAM_NAMES.length)];
}

// Simple synchronous version using preloaded generic names
export function randomHogNamesSync(team) {
  const usedNames = new Set();
  const dictName = getHatDict(team.hat || 'NoHat');
  const names = getNames(dictName);
  const hogCount = getTeamHogCount(team);
  
  for (let i = 0; i < hogCount; i++) {
    ensureHedgehog(team, i);
    let availableNames = names.filter(n => !usedNames.has(n));
    if (availableNames.length === 0) {
      availableNames = names;
    }
    
    const name = availableNames[Math.floor(Math.random() * availableNames.length)];
    team.hedgehogs[i].name = name;
    usedNames.add(name);
  }
  
  return team;
}

export function randomHogNameSync(team, hogIndex) {
  const hogCount = getTeamHogCount(team);
  if (!Number.isInteger(hogIndex) || hogIndex < 0 || hogIndex >= hogCount) {
    return team;
  }

  ensureHedgehog(team, hogIndex);

  const dictName = getHatDict(team.hat || 'NoHat');
  const names = getNames(dictName);
  const usedNames = new Set();

  for (let i = 0; i < hogCount; i++) {
    if (i === hogIndex) continue;
    const existing = team.hedgehogs?.[i]?.name;
    if (existing) usedNames.add(existing);
  }

  let availableNames = names.filter(n => !usedNames.has(n));
  if (availableNames.length === 0) {
    availableNames = names;
  }
  team.hedgehogs[hogIndex].name = availableNames[Math.floor(Math.random() * availableNames.length)];
  return team;
}
