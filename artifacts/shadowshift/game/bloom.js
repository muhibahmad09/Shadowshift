// BloomLayer — a cheap fake "bloom" post-effect for a raw 2D canvas.
//
// Real bloom is a WebGL post-process; on a 2D canvas the equivalent trick
// is: render just the glowing shapes into a small offscreen canvas (a
// fraction of the real resolution), blur that tiny canvas (cheap, because
// it's tiny), then composite it back over the main canvas with an
// additive ('lighter') blend. The result reads as soft neon light bleed
// without paying for a full-resolution blur every frame.
//
// Gated behind settings.qualityPreset.bloomEnabled — low tier skips it.

export class BloomLayer {
  constructor() {
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d');
    this.scale = 0.35;
    this.width = 0;
    this.height = 0;
  }

  resize(width, height, scale) {
    this.width = width;
    this.height = height;
    this.scale = scale;
    this.canvas.width = Math.max(1, Math.round(width * scale));
    this.canvas.height = Math.max(1, Math.round(height * scale));
  }

  /** Start drawing bloom-source shapes; caller draws in full-canvas coordinates. */
  begin() {
    const { ctx, canvas } = this;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.scale(this.scale, this.scale);
  }

  end() {
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
  }

  /** Composite the blurred, downscaled glow layer onto the main context. */
  composite(destCtx, blurPx, alpha = 0.85) {
    destCtx.save();
    destCtx.globalCompositeOperation = 'lighter';
    destCtx.globalAlpha = alpha;
    destCtx.filter = `blur(${blurPx}px)`;
    destCtx.drawImage(
      this.canvas,
      0,
      0,
      this.canvas.width,
      this.canvas.height,
      0,
      0,
      this.width,
      this.height,
    );
    destCtx.filter = 'none';
    destCtx.restore();
  }
}
