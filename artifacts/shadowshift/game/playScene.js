// PlayScene — hosts the ground, the player, the Light/Shadow world switch,
// and endless procedural obstacles. No further scene switching yet.

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

const GROUND_MARGIN_RATIO = 0.22; // ground line sits this far up from the bottom
const SPAWN_MARGIN_PX = 40; // spawn just past the right edge, off-screen
const COIN_SCORE_VALUE = 10;
const COIN_PARTICLE_COLOR = '#fde68a';
const COIN_PARTICLE_COUNT = 12;

export class PlayScene extends Scene {
  constructor({
    worldSwitchButton,
    worldLabelEl,
    coinsLabelEl,
    scoreLabelEl,
  } = {}) {
    super();
    this.player = new Player();
    this.world = new WorldManager('light');
    this.spawner = new ObstacleSpawner();
    this.coinSpawner = new CoinSpawner();
    this.particles = new ParticleSystem();
    this.difficulty = new Difficulty();
    this.sfx = new Sfx();
    this.worldSwitchButton = worldSwitchButton ?? null;
    this.worldLabelEl = worldLabelEl ?? null;
    this.coinsLabelEl = coinsLabelEl ?? null;
    this.scoreLabelEl = scoreLabelEl ?? null;

    this.width = 0;
    this.height = 0;
    this.groundY = 0;
    this.isGameOver = false;
    this.coinsCollected = 0;
    this.score = 0;
  }

  onEnter() {
    this._startRun();
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
    if (this.isGameOver) return;
    const accepted = this.world.requestSwitch();
    if (accepted) {
      this._syncWorldChrome();
    }
  }

  update(deltaSeconds) {
    const { input } = this.engine;

    if (this.isGameOver) {
      if (input.wasKeyPressed('Space') || input.wasPointerPressed()) {
        this._startRun();
      }
      return;
    }

    if (input.wasKeyPressed('Space') || input.wasPointerPressed()) {
      this.player.jump();
    }

    if (input.wasKeyPressed('KeyW')) {
      this.requestWorldSwitch();
    }

    this.world.update(deltaSeconds);
    this.difficulty.update(deltaSeconds);
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
  }

  _checkCoinCollisions() {
    const playerBounds = this.player.getBounds();

    this.coinSpawner.forEachActive((coin) => {
      if (!rectsOverlap(playerBounds, coin.getBounds())) return;

      coin.active = false;
      this.coinsCollected += 1;
      this.score += COIN_SCORE_VALUE;
      this.particles.spawnBurst(
        coin.x,
        coin.y,
        COIN_PARTICLE_COLOR,
        COIN_PARTICLE_COUNT,
      );
      this.sfx.playCoin();
      this._syncScoreChrome();
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
  }

  _startRun() {
    this.isGameOver = false;
    this.world = new WorldManager('light');
    this.difficulty.reset();
    this.spawner.reset();
    this.coinSpawner.reset();
    this.particles.reset();
    this.coinsCollected = 0;
    this.score = 0;
    this.player.x = Math.max(120, this.width * 0.25);
    this.player.reset(this.groundY);
    this._syncWorldChrome();
    this._syncScoreChrome();
  }

  render(ctx) {
    this._drawBackground(ctx);
    this._drawGround(ctx);

    this.coinSpawner.forEachActive((coin) => coin.draw(ctx));

    this.spawner.forEachActive((obstacle) =>
      obstacle.draw(ctx, this.world.current.id),
    );

    this.player.draw(ctx, this.world.glowPulse, this.world.current.accent);

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
    ctx.save();
    ctx.fillStyle = 'rgba(5, 6, 10, 0.72)';
    ctx.fillRect(0, 0, this.width, this.height);

    const titleSize = Math.min(64, Math.max(32, this.width * 0.05));
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `700 ${titleSize}px Orbitron, Inter, system-ui, sans-serif`;
    ctx.fillText('GAME OVER', this.width / 2, this.height / 2 - titleSize * 0.4);

    const subSize = Math.max(14, titleSize * 0.32);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
    ctx.font = `500 ${subSize}px Inter, system-ui, sans-serif`;
    ctx.fillText(
      'Press Space or tap to restart',
      this.width / 2,
      this.height / 2 + titleSize * 0.55,
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

  /** Keep the HUD coin counter and score in sync. */
  _syncScoreChrome() {
    if (this.coinsLabelEl) {
      this.coinsLabelEl.textContent = `COINS: ${this.coinsCollected}`;
    }
    if (this.scoreLabelEl) {
      this.scoreLabelEl.textContent = `SCORE: ${this.score}`;
    }
  }
}
