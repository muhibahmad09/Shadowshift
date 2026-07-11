// CoinSpawner — endless coin spawning from a fixed object pool, same
// no-per-frame-allocation approach as ObstacleSpawner.

import { Coin } from './coin.js';

const POOL_SIZE = 20;

const MIN_RADIUS = 10;
const MAX_RADIUS = 14;

// Coins spawn more frequently and closer together than obstacles.
const MIN_GAP_PX = 220;
const MAX_GAP_PX = 420;
const INITIAL_DELAY_SECONDS = 1.6;

// Coins float at varying heights above the ground — some reachable while
// running, some requiring a well-timed jump.
const MIN_HEIGHT_ABOVE_GROUND = 30;
const MAX_HEIGHT_ABOVE_GROUND = 170;

function randomRange(min, max) {
  return min + Math.random() * (max - min);
}

export class CoinSpawner {
  constructor() {
    this.pool = Array.from({ length: POOL_SIZE }, () => new Coin());
    this._timeUntilNextSpawn = INITIAL_DELAY_SECONDS;
  }

  reset() {
    for (const coin of this.pool) {
      coin.active = false;
    }
    this._timeUntilNextSpawn = INITIAL_DELAY_SECONDS;
  }

  update(deltaSeconds, { speed, spawnX, groundY }) {
    this._timeUntilNextSpawn -= deltaSeconds;
    if (this._timeUntilNextSpawn <= 0) {
      this._spawnOne(spawnX, groundY);
      this._timeUntilNextSpawn = randomRange(MIN_GAP_PX, MAX_GAP_PX) / Math.max(speed, 1);
    }

    for (const coin of this.pool) {
      if (!coin.active) continue;
      coin.update(deltaSeconds, speed);
      if (coin.isOffScreen()) {
        coin.active = false;
      }
    }
  }

  _spawnOne(spawnX, groundY) {
    const coin = this.pool.find((candidate) => !candidate.active);
    if (!coin) return; // Pool exhausted — skip this spawn, try again next tick.

    const heightAboveGround = randomRange(
      MIN_HEIGHT_ABOVE_GROUND,
      MAX_HEIGHT_ABOVE_GROUND,
    );

    coin.spawn({
      x: spawnX,
      y: groundY - heightAboveGround,
      radius: randomRange(MIN_RADIUS, MAX_RADIUS),
    });
  }

  /** Zero-allocation iteration over currently-active coins. */
  forEachActive(callback) {
    for (const coin of this.pool) {
      if (coin.active) callback(coin);
    }
  }
}
