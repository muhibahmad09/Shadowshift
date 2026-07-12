// AmbientParticles — a fixed pool of slow-drifting embers/dust motes that
// live in the run background for atmosphere (independent from the
// gameplay ParticleSystem's burst effects). Density comes from
// settings.qualityPreset.ambientParticleCount, so low tier disables them
// entirely. Pooled + reused, no per-frame allocation.

function randomRange(min, max) {
  return min + Math.random() * (max - min);
}

export class AmbientParticles {
  constructor() {
    this.width = 0;
    this.height = 0;
    this.pool = [];
  }

  onResize(width, height, count) {
    this.width = width;
    this.height = height;
    this._seed(count);
  }

  setCount(count) {
    this._seed(count);
  }

  _seed(count) {
    this.pool = Array.from({ length: count }, () => this._spawnMote(true));
  }

  _spawnMote(initial = false) {
    return {
      x: initial ? Math.random() * this.width : this.width + randomRange(0, 60),
      y: Math.random() * this.height,
      vx: -randomRange(6, 26),
      vy: -randomRange(4, 18),
      size: randomRange(1, 2.6),
      baseAlpha: randomRange(0.15, 0.55),
      twinklePhase: Math.random() * Math.PI * 2,
    };
  }

  update(deltaSeconds) {
    for (const mote of this.pool) {
      mote.x += mote.vx * deltaSeconds;
      mote.y += mote.vy * deltaSeconds;
      mote.twinklePhase += deltaSeconds * 2.2;

      if (mote.x < -8 || mote.y < -8) {
        Object.assign(mote, this._spawnMote());
      }
    }
  }

  draw(ctx, color) {
    if (this.pool.length === 0) return;

    ctx.save();
    ctx.fillStyle = color;
    for (const mote of this.pool) {
      const twinkle = 0.6 + 0.4 * Math.sin(mote.twinklePhase);
      ctx.globalAlpha = mote.baseAlpha * twinkle;
      ctx.beginPath();
      ctx.arc(mote.x, mote.y, mote.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}
