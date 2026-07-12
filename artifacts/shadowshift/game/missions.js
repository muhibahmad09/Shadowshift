// Mission catalog — static definitions for every mission. Pure data: no
// DOM, no persistence. Each mission tracks one lifetime counter from
// missionStats.js up to a target, and pays out a one-time coin reward.
// See missionStore.js for completion/claim state.

export const MISSION_CATEGORIES = [
  { id: 'coinsCollected', label: 'Coins' },
  { id: 'bestDistanceMeters', label: 'Distance' },
  { id: 'worldSwitches', label: 'Switches' },
  { id: 'gamesPlayed', label: 'Games' },
];

export const MISSIONS = [
  // --- Coins collected (lifetime, across all runs) ---
  { id: 'coins-1', statKey: 'coinsCollected', name: 'Pocket Change', description: 'Collect 100 coins', target: 100, reward: 50 },
  { id: 'coins-2', statKey: 'coinsCollected', name: 'Coin Collector', description: 'Collect 500 coins', target: 500, reward: 200 },
  { id: 'coins-3', statKey: 'coinsCollected', name: 'Treasure Hoarder', description: 'Collect 2000 coins', target: 2000, reward: 600 },

  // --- Best single-run distance ---
  { id: 'distance-1', statKey: 'bestDistanceMeters', name: 'First Steps', description: 'Reach 300m', target: 300, reward: 40 },
  { id: 'distance-2', statKey: 'bestDistanceMeters', name: 'Long Hauler', description: 'Reach 1000m', target: 1000, reward: 150 },
  { id: 'distance-3', statKey: 'bestDistanceMeters', name: 'Marathoner', description: 'Reach 2500m', target: 2500, reward: 400 },

  // --- World switches (lifetime) ---
  { id: 'switches-1', statKey: 'worldSwitches', name: 'Phase Shifter', description: 'Switch worlds 15 times', target: 15, reward: 40 },
  { id: 'switches-2', statKey: 'worldSwitches', name: 'Dimension Hopper', description: 'Switch worlds 50 times', target: 50, reward: 150 },
  { id: 'switches-3', statKey: 'worldSwitches', name: 'Reality Bender', description: 'Switch worlds 150 times', target: 150, reward: 400 },

  // --- Games played (lifetime) ---
  { id: 'games-1', statKey: 'gamesPlayed', name: 'Warming Up', description: 'Play 5 games', target: 5, reward: 30 },
  { id: 'games-2', statKey: 'gamesPlayed', name: 'Regular Runner', description: 'Play 20 games', target: 20, reward: 120 },
  { id: 'games-3', statKey: 'gamesPlayed', name: 'Veteran', description: 'Play 60 games', target: 60, reward: 350 },
];

export function getMissionsByCategory(category) {
  return MISSIONS.filter((mission) => mission.statKey === category);
}

export function getMission(id) {
  return MISSIONS.find((mission) => mission.id === id);
}
