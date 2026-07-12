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

export class PlayScene extends Scene {
  constructor({ worldSwitchButton, worldLabelEl, hud, sfx, onPauseChange } = {}) {
    super();
    this.player = new Player();
    this.world = new WorldManager('light');
    this.spawner = new ObstacleSpawner();
    this.coinSpawner = new CoinSpawner();
    this.particles = new ParticleSystem();
    this.difficulty = new Difficulty();
    this.sfx = sfx ?? new Sfx();
    this.scoreManager = new ScoreManager();
    this.worldSwitchButton = worldSwitchButton ?? null;
    this.worldLabelEl = worldLabelEl ?? null;
    this.hud = hud ?? null;
    this._onPauseChange = onPauseChange ?? null;

    this.width = 0;
    this.height = 0;
    this.groundY = 0;
    this.isGameOver = false;
    this.isPaused = false;
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

    if (input.wasKeyPressed('Escape')) {
      if (this.isGameOver) {
        this.engine.scenes.switchTo('menu');
      } else if (this.isPaused) {
        this.resume();
      } else {
        this.pause();
      }
      return;
    }

    // Frozen completely: no physics, spawning, difficulty, or score
    // updates happen while paused. The last rendered frame just sits still.
    if (this.isPaused) return;

    if (this.isGameOver) {
      if (input.wasKeyPressed('Space') || input.wasPointerPressed()) {
        this._startRun();
      }
      return;
    }

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
    this.player.update(deltaSeconds);

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
    const { glowBlur } = settings.qualityPreset;

    this._drawBackground(ctx);
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
    );

    this.particles.draw(ctx);

    this._drawFlash(ctx);

    if (this.isGameOver) {
      this._drawGameOver(ctx);
    }
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

    ctx.save();
    ctx.strokeStyle = groundColor;
    ctx.lineWidth = 2;
    ctx.globalAlpha = 0.65;
    ctx.beginPath();
    ctx.moveTo(0, this.groundY);
    ctx.lineTo(this.width, this.groundY);
    ctx.stroke();
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

  _drawGameOver(ctx) {
    const { scoreManager } = this;

    ctx.save();
    ctx.fillStyle = 'rgba(5, 6, 10, 0.72)';
    ctx.fillRect(0, 0, this.width, this.height);

    const titleSize = Math.min(64, Math.max(32, this.width * 0.05));
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    ctx.fillStyle = '#ffffff';
    ctx.font = `700 ${titleSize}px Orbitron, Inter, system-ui, sans-serif`;
    ctx.fillText(
      'GAME OVER',
      this.width / 2,
      this.height / 2 - titleSize * 0.9,
    );

    const statsSize = Math.max(15, titleSize * 0.34);
    ctx.font = `600 ${statsSize}px Inter, system-ui, sans-serif`;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
    ctx.fillText(
      `Score ${Math.floor(scoreManager.score)}   ·   Distance ${Math.floor(scoreManager.distanceMeters)} m   ·   Coins ${scoreManager.coins}`,
      this.width / 2,
      this.height / 2,
    );

    const bestSize = Math.max(14, titleSize * 0.3);
    ctx.font = `700 ${bestSize}px Orbitron, Inter, system-ui, sans-serif`;
    ctx.fillStyle = scoreManager.isNewHighScore ? '#fbbf24' : 'rgba(255, 255, 255, 0.65)';
    ctx.fillText(
      scoreManager.isNewHighScore
        ? 'NEW HIGH SCORE!'
        : `BEST ${Math.floor(scoreManager.highScore)}`,
      this.width / 2,
      this.height / 2 + statsSize * 1.6,
    );

    const subSize = Math.max(13, titleSize * 0.26);
    ctx.font = `500 ${subSize}px Inter, system-ui, sans-serif`;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.fillText(
      'Space or tap to restart   ·   Esc for menu',
      this.width / 2,
      this.height / 2 + statsSize * 3.1,
    );

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
