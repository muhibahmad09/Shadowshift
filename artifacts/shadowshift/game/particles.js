// ParticleSystem — small pooled burst particles used for coin-collect
// feedback. Pooled for the same reason as obstacles/coins: endless spawning
// without per-frame garbage.

const POOL_SIZE = 48;
const MIN_SPEED = 60; // px/s
const MAX_SPEED = 200; // px/s
const MIN_LIFE = 0.3; // seconds
const MAX_LIFE = 0.55; // seconds

function randomRange(min, max) {
  return min + Math.random() * (max - min);
}

class Particle {
  constructor() {
    this.active = false;
    this.x = 0;
    this.y = 0;
    this.vx = 0;
    this.vy = 0;
    this.life = 0;
    this.maxLife = 1;
    this.color = '#ffffff';
    this.size = 2;
  }
}

export class ParticleSystem {
  constructor() {
    this.pool = Array.from({ length: POOL_SIZE }, () => new Particle());
  }

  reset() {
    for (const particle of this.pool) {
      particle.active = false;
    }
  }

  /** Spawn a radial burst of `count` particles at (x, y) in the given color. */
  spawnBurst(x, y, color, count = 10) {
    for (let i = 0; i < count; i += 1) {
      const particle = this.pool.find((candidate) => !candidate.active);
      if (!particle) break; // Pool exhausted — drop remaining particles this burst.

      const angle = Math.random() * Math.PI * 2;
      const speed = randomRange(MIN_SPEED, MAX_SPEED);

      particle.active = true;
      particle.x = x;
      particle.y = y;
      particle.vx = Math.cos(angle) * speed;
      particle.vy = Math.sin(angle) * speed;
      particle.maxLife = randomRange(MIN_LIFE, MAX_LIFE);
      particle.life = particle.maxLife;
      particle.color = color;
      particle.size = randomRange(2, 4.5);
    }
  }

  update(deltaSeconds) {
    // Time-based drag so the burst feels the same regardless of frame rate.
    const dragFactor = Math.pow(0.05, deltaSeconds);

    for (const particle of this.pool) {
      if (!particle.active) continue;

      particle.x += particle.vx * deltaSeconds;
      particle.y += particle.vy * deltaSeconds;
      particle.vx *= dragFactor;
      particle.vy *= dragFactor;
      particle.life -= deltaSeconds;

      if (particle.life <= 0) {
        particle.active = false;
      }
    }
  }

  draw(ctx) {
    // Single save/restore for the whole batch — setting globalAlpha and
    // fillStyle directly is fine and avoids 48 save/restore pairs per frame.
    ctx.save();
    for (const particle of this.pool) {
      if (!particle.active) continue;

      ctx.globalAlpha = Math.max(0, particle.life / particle.maxLife);
      ctx.fillStyle = particle.color;
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}
