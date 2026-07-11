// ObstacleSpawner — endless obstacle spawning from a fixed object pool.
//
// Reusing a pre-allocated pool (instead of `new Obstacle()` + array
// push/splice per spawn) keeps the hot path allocation-free, which is what
// keeps spawning smooth with no GC-driven frame hitches.

import { Obstacle } from './obstacle.js';

const POOL_SIZE = 32;

const MIN_WIDTH = 28;
const MAX_WIDTH = 64;
const MIN_HEIGHT = 40;
const MAX_HEIGHT = 110;

// Gap is measured in pixels of world travel, not seconds — dividing by the
// current speed keeps spacing consistent (in distance) as the game speeds
// up, instead of obstacles bunching together at high speed.
const MIN_GAP_PX = 320;
const MAX_GAP_PX = 560;
const INITIAL_DELAY_SECONDS = 1;

function randomRange(min, max) {
  return min + Math.random() * (max - min);
}

export class ObstacleSpawner {
  constructor() {
    this.pool = Array.from({ length: POOL_SIZE }, () => new Obstacle());
    this._timeUntilNextSpawn = INITIAL_DELAY_SECONDS;
  }

  reset() {
    for (const obstacle of this.pool) {
      obstacle.active = false;
    }
    this._timeUntilNextSpawn = INITIAL_DELAY_SECONDS;
  }

  update(deltaSeconds, { speed, spawnX, groundY }) {
    this._timeUntilNextSpawn -= deltaSeconds;
    if (this._timeUntilNextSpawn <= 0) {
      this._spawnOne(spawnX, groundY);
      this._timeUntilNextSpawn = randomRange(MIN_GAP_PX, MAX_GAP_PX) / Math.max(speed, 1);
    }

    for (const obstacle of this.pool) {
      if (!obstacle.active) continue;
      obstacle.update(deltaSeconds, speed);
      if (obstacle.isOffScreen()) {
        obstacle.active = false;
      }
    }
  }

  _spawnOne(spawnX, groundY) {
    const obstacle = this.pool.find((candidate) => !candidate.active);
    if (!obstacle) return; // Pool exhausted — skip this spawn, try again next tick.

    obstacle.spawn({
      x: spawnX,
      groundY,
      width: randomRange(MIN_WIDTH, MAX_WIDTH),
      height: randomRange(MIN_HEIGHT, MAX_HEIGHT),
      world: Math.random() < 0.5 ? 'light' : 'shadow',
    });
  }

  /** Zero-allocation iteration over currently-active obstacles. */
  forEachActive(callback) {
    for (const obstacle of this.pool) {
      if (obstacle.active) callback(obstacle);
    }
  }
}
