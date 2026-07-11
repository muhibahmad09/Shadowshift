// PlayScene — hosts the ground, the player, and the Light/Shadow world
// switch. No obstacles or scene switching beyond the two worlds yet.

import { Scene } from '../engine/scene.js';
import { lerpColor } from '../engine/colorUtils.js';
import { Player } from './player.js';
import { WorldManager } from './worldManager.js';

const GROUND_MARGIN_RATIO = 0.22; // ground line sits this far up from the bottom

export class PlayScene extends Scene {
  constructor({ worldSwitchButton, worldLabelEl } = {}) {
    super();
    this.player = new Player();
    this.world = new WorldManager('light');
    this.worldSwitchButton = worldSwitchButton ?? null;
    this.worldLabelEl = worldLabelEl ?? null;

    this.width = 0;
    this.height = 0;
    this.groundY = 0;
  }

  onEnter() {
    this.player.x = Math.max(120, this.width * 0.25);
    this.player.reset(this.groundY);
    this._syncWorldChrome();
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
    const accepted = this.world.requestSwitch();
    if (accepted) {
      this._syncWorldChrome();
    }
  }

  update(deltaSeconds) {
    const { input } = this.engine;

    if (input.wasKeyPressed('Space') || input.wasPointerPressed()) {
      this.player.jump();
    }

    if (input.wasKeyPressed('KeyW')) {
      this.requestWorldSwitch();
    }

    this.world.update(deltaSeconds);
    this.player.update(deltaSeconds);

    if (this.worldSwitchButton) {
      this.worldSwitchButton.sync(
        this.world.cooldownReadiness,
        this.world.current.accent,
      );
    }
  }

  render(ctx) {
    this._drawBackground(ctx);
    this._drawGround(ctx);

    this.player.draw(ctx, this.world.glowPulse, this.world.current.accent);

    this._drawFlash(ctx);
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
