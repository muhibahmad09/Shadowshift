// Difficulty — tracks elapsed run time and ramps the world-scroll speed.
//
// Pure state: no rendering, no spawning decisions. ObstacleSpawner reads
// `.speed` to move obstacles and to size the gap between spawns.

const DEFAULT_BASE_SPEED = 320; // px/s at the start of a run
const DEFAULT_MAX_SPEED = 760; // px/s speed cap
const DEFAULT_RAMP_PER_SECOND = 12; // px/s gained per second of survival

export class Difficulty {
  constructor({
    baseSpeed = DEFAULT_BASE_SPEED,
    maxSpeed = DEFAULT_MAX_SPEED,
    rampPerSecond = DEFAULT_RAMP_PER_SECOND,
  } = {}) {
    this.baseSpeed = baseSpeed;
    this.maxSpeed = maxSpeed;
    this.rampPerSecond = rampPerSecond;

    this.elapsed = 0;
    this.speed = baseSpeed;
  }

  reset() {
    this.elapsed = 0;
    this.speed = this.baseSpeed;
  }

  update(deltaSeconds) {
    this.elapsed += deltaSeconds;
    this.speed = Math.min(
      this.maxSpeed,
      this.baseSpeed + this.elapsed * this.rampPerSecond,
    );
  }
}
