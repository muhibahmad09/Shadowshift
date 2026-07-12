// PlayScene — hosts the ground, the player, the Light/Shadow world switch,
// endless procedural obstacles, and coin/score/distance tracking. No
// further scene switching yet.

import { Scene } from '../engine/scene.js';
import { lerpColor } from '../engine/colorUtils.js';
import { Player } from './player.js';
import { WorldManager } from './worldManager.js';
import { ObstacleSpawner } from './obstacleSpawner.js';
import { CoinSpawner } from './coinSpawner.js';
import { ParticleSystem } from './particles.js';
import { AmbientParticles } from './ambientParticles.js';
import { ParallaxBackground } from './parallaxBackground.js';
import { BloomLayer } from './bloom.js';
import { Difficulty } from './difficulty.js';
import { rectsOverlap } from './collision.js';
import { Sfx } from './audio.js';
import { ScoreManager } from './scoreManager.js';
import { settings } from './settings.js';
import { vibrate, HAPTICS } from './vibration.js';

const GROUND_MARGIN_RATIO = 0.22; // ground line sits this far up from the bottom
const SPAWN_MARGIN_PX = 40; // spawn just past the right edge, off-screen
const COIN_SCORE_VALUE = 10;
const COIN_PARTICLE_COLOR = '#fde68a';
const DUST_PARTICLE_COLOR = 'rgba(230, 224, 245, 0.8)';

const GAME_OVER_CONFETTI_COLORS = ['#8b5cf6', '#c4b5fd', '#fbbf24', '#fde68a', '#f472b6'];

// Ground "speed lines" — short neon tick marks that scroll with the world,
// giving the ground a sense of motion instead of being a single static line.
const GROUND_TICK_SPACING = 46;
const GROUND_TICK_LENGTH = 14;

export class PlayScene extends Scene {
  constructor({
    worldSwitchButton,
    worldLabelEl,
    hud,
    sfx,
    onPauseChange,
    onGameOver,
  } = {}) {
    super();
    this.player = new Player();
    this.world = new WorldManager('light');
    this.spawner = new ObstacleSpawner();
    this.coinSpawner = new CoinSpawner();
    this.particles = new ParticleSystem();
    this.ambientParticles = new AmbientParticles();
    this.background = new ParallaxBackground();
    this.bloom = new BloomLayer();
    this.difficulty = new Difficulty();
    this.sfx = sfx ?? new Sfx();
    this.scoreManager = new ScoreManager();
    this.worldSwitchButton = worldSwitchButton ?? null;
    this.worldLabelEl = worldLabelEl ?? null;
    this.hud = hud ?? null;
    this._onPauseChange = onPauseChange ?? null;
    this._onGameOver = onGameOver ?? null;

    this.width = 0;
    this.height = 0;
    this.groundY = 0;
    this.isGameOver = false;
    this.isPaused = false;
    this._groundScrollOffset = 0;

    // Re-seed background density immediately on a Graphics Quality change
    // instead of waiting for the next resize.
    settings.onChange(() => {
      if (this.width > 0) {
        this.ambientParticles.setCount(settings.qualityPreset.ambientParticleCount);
      }
    });
  }

  onEnter() {
    document.body.classList.add('scene-play');
    document.body.classList.remove('scene-menu');
    this._startRun();
  }

  onExit() {
    document.body.classList.remove('scene-play');
    // Leaving the scene (e.g. "Main Menu" from the pause menu) must not
    // leave a stale paused flag behind for the next run.
    this.isPaused = false;
  }

  /** Freeze gameplay completely. No-op once game over or already paused. */
  pause() {
    if (this.isGameOver || this.isPaused) return;
    this.isPaused = true;
    this._onPauseChange?.(true);
  }

  /** Unfreeze gameplay. No-op if not currently paused. */
  resume() {
    if (!this.isPaused) return;
    this.isPaused = false;
    this._onPauseChange?.(false);
  }

  /** Start a brand-new run, resuming play immediately even if paused. */
  restart() {
    this._startRun();
    this._onPauseChange?.(false);
  }

  onResize(width, height) {
    this.width = width;
    this.height = height;
    this.groundY = height - height * GROUND_MARGIN_RATIO;
    this.player.x = Math.max(120, width * 0.25);
    this.player.setGroundY(this.groundY);

    this.background.onResize(width, height);
    this.ambientParticles.onResize(width, height, settings.qualityPreset.ambientParticleCount);
    this.bloom.resize(width, height, settings.qualityPreset.bloomScale);
  }

  /** Called by the keyboard handler and the on-screen button alike. */
  requestWorldSwitch() {
    if (this.isGameOver || this.isPaused) return;
    const accepted = this.world.requestSwitch();
    if (accepted) {
      this._syncWorldChrome();
      vibrate(HAPTICS.worldSwitch);
    }
  }

  update(deltaSeconds) {
    const { input } = this.engine;

    // The Game Over overlay (DOM) owns navigation once a run ends — its
    // Restart/Main Menu/Share buttons replace the old space-to-restart and
    // Esc-to-menu shortcuts.
    if (this.isGameOver) return;

    if (input.wasKeyPressed('Escape')) {
      if (this.isPaused) {
        this.resume();
      } else {
        this.pause();
      }
      return;
    }

    // Frozen completely: no physics, spawning, difficulty, or score
    // updates happen while paused. The last rendered frame just sits still.
    if (this.isPaused) return;

    if (input.wasKeyPressed('Space') || input.wasPointerPressed()) {
      const wasGrounded = this.player.isGrounded;
      this.player.jump();
      if (wasGrounded) vibrate(HAPTICS.jump);
    }

    if (input.wasKeyPressed('KeyW')) {
      this.requestWorldSwitch();
    }

    this.world.update(deltaSeconds);
    this.difficulty.update(deltaSeconds);

    // Distance mirrors exactly what's scrolling past — same speed that
    // drives obstacles and coins — so the HUD number always matches what
    // the player sees.
    this.scoreManager.addDistance(this.difficulty.speed * deltaSeconds);

    this.spawner.update(deltaSeconds, {
      speed: this.difficulty.speed,
      spawnX: this.width + SPAWN_MARGIN_PX,
      groundY: this.groundY,
    });
    this.coinSpawner.update(deltaSeconds, {
      speed: this.difficulty.speed,
      spawnX: this.width + SPAWN_MARGIN_PX,
      groundY: this.groundY,
    });
    this.particles.update(deltaSeconds);
    this.ambientParticles.update(deltaSeconds);
    this.background.update(deltaSeconds, this.difficulty.speed);
    this._groundScrollOffset =
      (this._groundScrollOffset + this.difficulty.speed * deltaSeconds) % GROUND_TICK_SPACING;

    this.player.update(deltaSeconds);
    if (this.player.consumeFootstep()) {
      this._spawnFootstepDust();
    }

    if (this.worldSwitchButton) {
      this.worldSwitchButton.sync(
        this.world.cooldownReadiness,
        this.world.current.accent,
      );
    }

    // Coins are collectible in either world; check them before obstacles so
    // a last-instant pickup still counts even if the run ends this frame.
    this._checkCoinCollisions();
    this._checkCollisions();

    if (this.hud) {
      this.hud.sync(this.scoreManager);
    }
  }

  _checkCoinCollisions() {
    const playerBounds = this.player.getBounds();

    this.coinSpawner.forEachActive((coin) => {
      if (!rectsOverlap(playerBounds, coin.getBounds())) return;

      coin.active = false;
      this.scoreManager.addCoin(COIN_SCORE_VALUE);
      this.particles.spawnBurst(
        coin.x,
        coin.y,
        COIN_PARTICLE_COLOR,
        settings.qualityPreset.particleCount,
      );
      this.sfx.playCoin();
      vibrate(HAPTICS.coinPickup);
    });
  }

  _checkCollisions() {
    const playerBounds = this.player.getBounds();
    const activeWorldId = this.world.current.id;

    this.spawner.forEachActive((obstacle) => {
      if (this.isGameOver) return;
      // Obstacles from the other world are pure visual noise right now —
      // this is the entire "same world only" collision rule.
      if (obstacle.world !== activeWorldId) return;
      if (rectsOverlap(playerBounds, obstacle.getBounds())) {
        this._triggerGameOver();
      }
    });
  }

  _triggerGameOver() {
    this.isGameOver = true;
    this.world.flashAlpha = 0.7;
    vibrate(HAPTICS.gameOver);
    this._spawnGameOverConfetti();

    this._onGameOver?.({
      score: this.scoreManager.score,
      highScore: this.scoreManager.highScore,
      distanceMeters: this.scoreManager.distanceMeters,
      coins: this.scoreManager.coins,
      isNewHighScore: this.scoreManager.isNewHighScore,
    });
  }

  /** A bigger, multi-colored burst than a coin pickup — the "impact" beat. */
  _spawnGameOverConfetti() {
    const { particleCount } = settings.qualityPreset;
    const burstX = this.player.x;
    const burstY = this.player.y + this.player.height / 2;

    for (const color of GAME_OVER_CONFETTI_COLORS) {
      this.particles.spawnBurst(burstX, burstY, color, Math.ceil(particleCount * 0.6));
    }
  }

  /** A tiny puff of ground dust each time a running foot touches down. */
  _spawnFootstepDust() {
    const { particleCount } = settings.qualityPreset;
    if (particleCount <= 0) return;

    this.particles.spawnBurst(
      this.player.x,
      this.groundY - 2,
      DUST_PARTICLE_COLOR,
      Math.max(1, Math.round(particleCount * 0.25)),
    );
  }

  _startRun() {
    this.isGameOver = false;
    this.world = new WorldManager('light');
    this.difficulty.reset();
    this.spawner.reset();
    this.coinSpawner.reset();
    this.particles.reset();
    this.scoreManager.reset();
    this.player.x = Math.max(120, this.width * 0.25);
    this.player.reset(this.groundY);
    this._syncWorldChrome();
    if (this.hud) {
      this.hud.sync(this.scoreManager);
    }
  }

  render(ctx) {
    const { glowBlur, bloomEnabled, bloomBlurPx, playerTrail } = settings.qualityPreset;

    this._drawBackground(ctx);
    this.background.draw(ctx, this.world, this.groundY);

    const ambientColor = lerpColor(
      this.world.previous.accent,
      this.world.current.accent,
      this.world.colorBlend,
    );
    this.ambientParticles.draw(ctx, ambientColor);

    this._drawGround(ctx);

    this.coinSpawner.forEachActive((coin) => coin.draw(ctx, glowBlur));

    this.spawner.forEachActive((obstacle) =>
      obstacle.draw(ctx, this.world.current.id, glowBlur),
    );

    this.player.draw(
      ctx,
      this.world.glowPulse,
      this.world.current.accent,
      glowBlur,
      playerTrail,
    );

    this.particles.draw(ctx);

    if (bloomEnabled) {
      this._drawBloom(ctx, bloomBlurPx);
    }

    this._drawFlash(ctx);
  }

  /**
   * Fake bloom pass: redraw just the glowing shapes (ground strip, coins,
   * solid obstacles, player halo) into a small offscreen canvas, blur that
   * tiny canvas, and composite it back additively. See bloom.js for why
   * this is cheap enough to run every frame at 60 FPS.
   */
  _drawBloom(ctx, blurPx) {
    const groundColor = lerpColor(
      this.world.previous.ground,
      this.world.current.ground,
      this.world.colorBlend,
    );

    this.bloom.begin();
    const bloomCtx = this.bloom.ctx;

    bloomCtx.save();
    bloomCtx.strokeStyle = groundColor;
    bloomCtx.lineWidth = 3;
    bloomCtx.globalAlpha = 0.4;
    bloomCtx.beginPath();
    bloomCtx.moveTo(0, this.groundY);
    bloomCtx.lineTo(this.width, this.groundY);
    bloomCtx.stroke();
    bloomCtx.restore();

    this.coinSpawner.forEachActive((coin) => {
      bloomCtx.save();
      bloomCtx.globalAlpha = 0.45;
      bloomCtx.fillStyle = '#fde68a';
      bloomCtx.beginPath();
      bloomCtx.arc(coin.x, coin.y, coin.radius * 0.55, 0, Math.PI * 2);
      bloomCtx.fill();
      bloomCtx.restore();
    });

    const activeWorldId = this.world.current.id;
    this.spawner.forEachActive((obstacle) => {
      if (obstacle.world !== activeWorldId) return;
      // Inset the bloom source rect so it reads as an edge glow around the
      // solid obstacle fill rather than fully re-covering (and blowing
      // out) the shape once composited additively.
      const inset = Math.min(obstacle.width, obstacle.height) * 0.28;
      bloomCtx.save();
      bloomCtx.globalAlpha = 0.35;
      bloomCtx.fillStyle = this.world.current.accent;
      bloomCtx.fillRect(
        obstacle.x + inset,
        obstacle.y + inset,
        Math.max(1, obstacle.width - inset * 2),
        Math.max(1, obstacle.height - inset * 2),
      );
      bloomCtx.restore();
    });

    bloomCtx.save();
    bloomCtx.globalAlpha = 0.32;
    bloomCtx.fillStyle = this.world.current.accent;
    bloomCtx.beginPath();
    bloomCtx.arc(this.player.x, this.player.y + this.player.height / 2, this.player.width * 0.45, 0, Math.PI * 2);
    bloomCtx.fill();
    bloomCtx.restore();

    this.bloom.end();
    this.bloom.composite(ctx, blurPx, 0.55);
  }

  _drawBackground(ctx) {
    const { previous, current } = this.world;
    const blend = this.world.colorBlend;

    const innerColor = lerpColor(previous.bgInner, current.bgInner, blend);
    const outerColor = lerpColor(previous.bgOuter, current.bgOuter, blend);

    const radius = Math.max(this.width, this.height) * 0.75;
    const gradient = ctx.createRadialGradient(
      this.width / 2,
      this.height * 0.35,
      0,
      this.width / 2,
      this.height * 0.35,
      radius,
    );
    gradient.addColorStop(0, innerColor);
    gradient.addColorStop(1, outerColor);

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, this.width, this.height);
  }

  _drawGround(ctx) {
    const { previous, current } = this.world;
    const groundColor = lerpColor(
      previous.ground,
      current.ground,
      this.world.colorBlend,
    );
    const { glowBlur } = settings.qualityPreset;

    ctx.save();
    ctx.strokeStyle = groundColor;
    ctx.lineWidth = 2.5;
    ctx.globalAlpha = 0.8;
    if (glowBlur > 0) {
      ctx.shadowColor = groundColor;
      ctx.shadowBlur = glowBlur * 0.8;
    }
    ctx.beginPath();
    ctx.moveTo(0, this.groundY);
    ctx.lineTo(this.width, this.groundY);
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.restore();

    this._drawGroundTicks(ctx, groundColor);
  }

  /** Short diagonal "speed line" ticks scrolling under the ground line. */
  _drawGroundTicks(ctx, color) {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.globalAlpha = 0.3;

    const startX = -this._groundScrollOffset;
    for (let x = startX; x < this.width; x += GROUND_TICK_SPACING) {
      ctx.beginPath();
      ctx.moveTo(x, this.groundY + 6);
      ctx.lineTo(x + GROUND_TICK_LENGTH, this.groundY + 6);
      ctx.stroke();
    }
    ctx.restore();
  }

  _drawFlash(ctx) {
    if (this.world.flashAlpha <= 0) return;

    ctx.save();
    ctx.globalAlpha = this.world.flashAlpha;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, this.width, this.height);
    ctx.restore();
  }

  /** Keep DOM chrome (HUD text color, world label) in sync with the active world. */
  _syncWorldChrome() {
    document.body.classList.toggle(
      'world-light',
      this.world.current.id === 'light',
    );
    document.body.classList.toggle(
      'world-shadow',
      this.world.current.id === 'shadow',
    );

    if (this.worldLabelEl) {
      this.worldLabelEl.textContent = this.world.current.label;
    }
  }
}
