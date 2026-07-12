// MenuScene — the animated main menu. Canvas draws a drifting starfield
// over a slowly pulsing Light/Shadow gradient (the game's visual identity
// distilled into an idle animation); the DOM overlay (#main-menu) holds
// the animated logo, high score, and menu buttons.

import { Scene } from '../engine/scene.js';
import { WORLDS } from './worldManager.js';
import { lerpColor } from '../engine/colorUtils.js';
import { getPersistedHighScore } from './scoreManager.js';
import { settings } from './settings.js';

const PULSE_PERIOD_SECONDS = 7;

function randomRange(min, max) {
  return min + Math.random() * (max - min);
}

export class MenuScene extends Scene {
  constructor({ menuEl, highScoreEl } = {}) {
    super();
    this.menuEl = menuEl ?? null;
    this.highScoreEl = highScoreEl ?? null;

    this.width = 0;
    this.height = 0;
    this.stars = [];
    this._pulse = 0;

    // Re-seed the starfield density immediately if Graphics Quality changes
    // while the menu is visible, instead of waiting for the next resize.
    settings.onChange(() => {
      if (this.width > 0) this._seedStars();
    });
  }

  onEnter() {
    document.body.classList.add('scene-menu');
    document.body.classList.remove('scene-play');

    if (this.menuEl) this.menuEl.classList.add('is-visible');
    if (this.highScoreEl) {
      this.highScoreEl.textContent = String(getPersistedHighScore());
    }
    if (this.stars.length === 0 && this.width > 0) this._seedStars();
  }

  onExit() {
    document.body.classList.remove('scene-menu');
    if (this.menuEl) this.menuEl.classList.remove('is-visible');
  }

  onResize(width, height) {
    this.width = width;
    this.height = height;
    this._seedStars();
  }

  _seedStars() {
    const starCount = settings.qualityPreset.starCount;
    this.stars = Array.from({ length: starCount }, () => ({
      x: Math.random() * this.width,
      y: Math.random() * this.height,
      radius: randomRange(0.6, 2.2),
      speed: randomRange(6, 22),
      twinklePhase: Math.random() * Math.PI * 2,
    }));
  }

  update(deltaSeconds) {
    this._pulse += deltaSeconds / PULSE_PERIOD_SECONDS;
    this._pulse %= 1;

    for (const star of this.stars) {
      star.x -= star.speed * deltaSeconds;
      star.twinklePhase += deltaSeconds * 2;
      if (star.x < -4) {
        star.x = this.width + 4;
        star.y = Math.random() * this.height;
      }
    }
  }

  render(ctx) {
    this._drawBackground(ctx);
    this._drawStars(ctx);
  }

  _drawBackground(ctx) {
    const baseRadius = Math.max(this.width, this.height) * 0.8;
    const baseGradient = ctx.createRadialGradient(
      this.width / 2,
      this.height * 0.4,
      0,
      this.width / 2,
      this.height * 0.4,
      baseRadius,
    );
    baseGradient.addColorStop(0, WORLDS.shadow.bgInner);
    baseGradient.addColorStop(1, WORLDS.shadow.bgOuter);
    ctx.fillStyle = baseGradient;
    ctx.fillRect(0, 0, this.width, this.height);

    // A slow ping-pong glow that drifts between the two world accents —
    // the menu's idle "shadow shift" heartbeat.
    const blend = Math.sin(this._pulse * Math.PI * 2) * 0.5 + 0.5;
    const glowColor = lerpColor(WORLDS.shadow.accent, WORLDS.light.accent, blend);

    ctx.save();
    ctx.globalAlpha = 0.28 + blend * 0.14;
    const glowRadius = Math.max(this.width, this.height) * 0.45;
    const glowGradient = ctx.createRadialGradient(
      this.width / 2,
      this.height * 0.42,
      0,
      this.width / 2,
      this.height * 0.42,
      glowRadius,
    );
    glowGradient.addColorStop(0, glowColor);
    glowGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = glowGradient;
    ctx.fillRect(0, 0, this.width, this.height);
    ctx.restore();
  }

  _drawStars(ctx) {
    for (const star of this.stars) {
      const twinkle = 0.5 + 0.5 * Math.sin(star.twinklePhase);
      ctx.save();
      ctx.globalAlpha = 0.25 + twinkle * 0.55;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }
}
