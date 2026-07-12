// Achievement catalog — static definitions for every achievement badge.
// Pure data: no DOM, no persistence. Each `isMet` predicate reads live
// stats and must be monotonic (once true, always true) so an achievement
// can never "un-unlock" — see achievementStore.js for the unlock/notify
// bookkeeping built on top of this.

import { missionStats } from './missionStats.js';
import { achievementStats } from './achievementStats.js';

export const ACHIEVEMENTS = [
  {
    id: 'first-jump',
    name: 'First Jump',
    description: 'Make your first jump',
    icon: '⤴',
    isMet: () => achievementStats.get('hasJumped'),
  },
  {
    id: 'coin-collector',
    name: 'Coin Collector',
    description: 'Collect your first coin',
    icon: '●',
    isMet: () => missionStats.get('coinsCollected') >= 1,
  },
  {
    id: 'survivor',
    name: 'Survivor',
    description: 'Survive 60 seconds in a single run',
    icon: '♥',
    isMet: () => achievementStats.get('longestRunSeconds') >= 60,
  },
  {
    id: 'speed-runner',
    name: 'Speed Runner',
    description: 'Reach maximum run speed',
    icon: '»',
    isMet: () => achievementStats.get('reachedMaxSpeed'),
  },
  {
    id: 'shadow-master',
    name: 'Shadow Master',
    description: 'Spend 2 minutes total in the Shadow World',
    icon: '◐',
    isMet: () => achievementStats.get('shadowSeconds') >= 120,
  },
];

export function getAchievement(id) {
  return ACHIEVEMENTS.find((achievement) => achievement.id === id);
}
