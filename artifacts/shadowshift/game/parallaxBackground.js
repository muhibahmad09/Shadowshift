// ParallaxBackground — the scrolling atmosphere behind gameplay: a layered
// starfield, 1-3 depth silhouette bands, and drifting fog. Everything here
// is driven by the world's Light/Shadow color blend so the whole backdrop
// crossfades in lockstep with a world switch, and by the run's current
// scroll speed so distant layers drift slower than near ones (parallax).
//
// Perf notes: layer/particle counts come from settings.qualityPreset so low
// tier devices skip fog and ambient depth layers entirely. Silhouette
// shapes are generated once (per resize/quality change) into a small
// deterministic point list and just translated each frame — no per-frame
// path recomputation.

import { lerpColor } from '../engine/colorUtils.js';
import { settings } from './settings.js';

const TILE_WIDTH = 420;
const STAR_TWINKLE_SPEED = 1.6;

function randomRange(min, max) {
  return min + Math.random() * (max - min);
}

const WORLD_DARKNESS = { light: 0, shadow: 1 };

function lerpDarkness(previousId, currentId, t) {
  const from = WORLD_DARKNESS[previousId] ?? 0;
  const to = WORLD_DARKNESS[currentId] ?? 0;
  return from + (to - from) * t;
}

/** Small deterministic PRNG so a silhouette's jagged skyline is stable
 * across regenerations at the same seed, instead of re-randomizing (which
 * would make the tiling seam visible as a "pop"). */
function seededRandom(seed) {
  let state = seed % 2147483647;
  if (state <= 0) state += 2147483646;
  return () => {
    state = (state * 16807) % 2147483647;
    return (state - 1) / 2147483646;
  };
}

function buildSkylinePoints(seed, tileWidth, peakCount, minHeight, maxHeight) {
  const rand = seededRandom(seed);
  const step = tileWidth / peakCount;
  const points = [];
  for (let i = 0; i <= peakCount; i += 1) {
    points.push({
      x: i * step,
      height: minHeight + rand() * (maxHeight - minHeight),
    });
  }
  return points;
}

/** One scrolling depth band of jagged skyline, tiled seamlessly. */
class SilhouetteLayer {
  constructor({ seed, depth, peakCount, minHeight, maxHeight, alpha }) {
    this.depth = depth; // 0 (far, slow) -> 1 (near, fast)
    this.alpha = alpha;
    this.points = buildSkylinePoints(seed, TILE_WIDTH, peakCount, minHeight, maxHeight);
    this.offset = 0;
  }

  update(deltaSeconds, scrollSpeed) {
    // Far layers drift at a fraction of the ground scroll speed; a light
    // ambient drift keeps them alive even at very low run speeds.
    const speed = 12 + scrollSpeed * (0.08 + this.depth * 0.22);
    this.offset = (this.offset + speed * deltaSeconds) % TILE_WIDTH;
  }

  draw(ctx, width, height, baseline, color) {
    const startX = -this.offset - TILE_WIDTH;
    const tilesNeeded = Math.ceil((width + TILE_WIDTH * 2) / TILE_WIDTH);

    ctx.save();
    ctx.globalAlpha = this.alpha;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(startX, baseline);

    for (let tile = 0; tile < tilesNeeded; tile += 1) {
      const tileX = startX + tile * TILE_WIDTH;
      for (const point of this.points) {
        ctx.lineTo(tileX + point.x, baseline - point.height);
      }
    }

    ctx.lineTo(startX + tilesNeeded * TILE_WIDTH, baseline);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
}

class FogBlob {
  constructor(width, height) {
    this.reset(width, height, true);
  }

  reset(width, height, initial = false) {
    this.x = initial ? randomRange(0, width) : width + randomRange(0, 200);
    this.y = height * randomRange(0.62, 0.92);
    this.radiusX = randomRange(160, 340);
    this.radiusY = this.radiusX * randomRange(0.28, 0.4);
    this.speed = randomRange(8, 22);
    this.baseAlpha = randomRange(0.05, 0.14);
    this.phase = Math.random() * Math.PI * 2;
  }

  update(deltaSeconds, width, height) {
    this.x -= this.speed * deltaSeconds;
    this.phase += deltaSeconds * 0.4;
    if (this.x + this.radiusX < 0) {
      this.reset(width, height);
    }
  }

  draw(ctx, color) {
    const alpha = this.baseAlpha * (0.7 + 0.3 * Math.sin(this.phase));
    const gradient = ctx.createRadialGradient(
      this.x,
      this.y,
      0,
      this.x,
      this.y,
      this.radiusX,
    );
    gradient.addColorStop(0, color);
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.ellipse(this.x, this.y, this.radiusX, this.radiusY, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

export class ParallaxBackground {
  constructor() {
    this.width = 0;
    this.height = 0;
    this.stars = [];
    this.silhouettes = [];
    this.fogBlobs = [];

    settings.onChange(() => {
      if (this.width > 0) this._rebuild();
    });
  }

  onResize(width, height) {
    this.width = width;
    this.height = height;
    this._rebuild();
  }

  _rebuild() {
    const { starCount, parallaxLayers, fogEnabled } = settings.qualityPreset;

    this.stars = Array.from({ length: starCount }, () => ({
      x: Math.random() * this.width,
      y: Math.random() * this.height * 0.65,
      radius: randomRange(0.6, 2),
      driftSpeed: randomRange(4, 14),
      twinklePhase: Math.random() * Math.PI * 2,
    }));

    const layerConfigs = [
      { seed: 11, depth: 0, peakCount: 6, minHeight: 40, maxHeight: 110, alpha: 0.16 },
      { seed: 29, depth: 0.5, peakCount: 8, minHeight: 60, maxHeight: 160, alpha: 0.24 },
      { seed: 47, depth: 1, peakCount: 10, minHeight: 90, maxHeight: 220, alpha: 0.34 },
    ];
    this.silhouettes = layerConfigs
      .slice(0, Math.max(0, Math.min(parallaxLayers, layerConfigs.length)))
      .map((config) => new SilhouetteLayer(config));

    this.fogBlobs = fogEnabled
      ? Array.from({ length: 5 }, () => new FogBlob(this.width, this.height))
      : [];
  }

  update(deltaSeconds, scrollSpeed) {
    for (const star of this.stars) {
      star.x -= star.driftSpeed * deltaSeconds;
      star.twinklePhase += deltaSeconds * STAR_TWINKLE_SPEED;
      if (star.x < -4) {
        star.x = this.width + 4;
        star.y = Math.random() * this.height * 0.65;
      }
    }

    for (const layer of this.silhouettes) {
      layer.update(deltaSeconds, scrollSpeed);
    }

    for (const blob of this.fogBlobs) {
      blob.update(deltaSeconds, this.width, this.height);
    }
  }

  /** @param {object} world WorldManager instance (previous/current/colorBlend). */
  draw(ctx, world, groundY) {
    this._drawStars(ctx, world);
    this._drawSilhouettes(ctx, world, groundY);
    this._drawFog(ctx, world);
  }

  _drawStars(ctx, world) {
    if (this.stars.length === 0) return;

    // Stars read best against the Shadow world's dark sky — fade them out
    // as the Light world's bright sky takes over. DARKNESS maps each world
    // to how "night-like" it is; blending it the same way colors blend
    // keeps the star fade in lockstep with the world-switch crossfade.
    const darkness = lerpDarkness(world.previous.id, world.current.id, world.colorBlend);
    if (darkness <= 0) return; // Fully in Light world — skip all draws.

    // Single save/restore for the whole star batch: all stars share the
    // same fillStyle and only differ in globalAlpha, so per-star
    // save/restore pairs are unnecessary overhead.
    ctx.save();
    ctx.fillStyle = '#ffffff';
    for (const star of this.stars) {
      const twinkle = 0.5 + 0.5 * Math.sin(star.twinklePhase);
      ctx.globalAlpha = (0.2 + twinkle * 0.6) * darkness;
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  _drawSilhouettes(ctx, world, groundY) {
    const color = lerpColor(world.previous.ground, world.current.ground, world.colorBlend);
    for (const layer of this.silhouettes) {
      // Nearer layers sit closer to the ground line; far layers sit higher.
      const baseline = groundY - layer.depth * 6;
      layer.draw(ctx, this.width, this.height, baseline, color);
    }
  }

  _drawFog(ctx, world) {
    if (this.fogBlobs.length === 0) return;
    const color = lerpColor(world.previous.accent, world.current.accent, world.colorBlend);
    for (const blob of this.fogBlobs) {
      blob.draw(ctx, color);
    }
  }
}
