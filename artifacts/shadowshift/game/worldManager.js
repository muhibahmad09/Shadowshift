// WorldManager — owns the Light/Shadow world state machine: which world is
// active, the crossfade/flash/glow animation while switching, and the
// cooldown that throttles how often the player can switch.
//
// Pure logic/state — no DOM, no canvas drawing here. PlayScene reads this
// each frame to decide what to render.

import { easeInOutCubic } from '../engine/colorUtils.js';

export const WORLDS = {
  light: {
    id: 'light',
    label: 'LIGHT WORLD',
    bgInner: '#fdfbff',
    bgOuter: '#c9b8f8',
    ground: '#4b3f7a',
    accent: '#6d28d9',
    hudText: '#241a3d',
  },
  shadow: {
    id: 'shadow',
    label: 'SHADOW WORLD',
    bgInner: '#12162a',
    bgOuter: '#05060a',
    ground: '#8b5cf6',
    accent: '#c4b5fd',
    hudText: '#e8e6f5',
  },
};

const SWITCH_DURATION = 0.6; // seconds for the visual crossfade
const COOLDOWN_DURATION = 1.4; // seconds before another switch is allowed
const FLASH_DECAY = 0.35; // seconds for the screen flash to fade out

export class WorldManager {
  constructor(startWorld = 'light') {
    this.previous = WORLDS[startWorld];
    this.current = WORLDS[startWorld];

    this.isSwitching = false;
    /** Raw (un-eased) 0-1 progress through the current switch animation. */
    this.transitionT = 1;

    /** 0-1, decays after a switch. Drives the full-screen flash overlay. */
    this.flashAlpha = 0;

    /** Seconds remaining before another switch is allowed. */
    this.cooldownRemaining = 0;
    this.cooldownDuration = COOLDOWN_DURATION;
  }

  /** True once the cooldown has fully elapsed and a new switch is allowed. */
  canSwitch() {
    return this.cooldownRemaining <= 0;
  }

  /** 0 (just switched) -> 1 (fully recharged). For UI progress rings. */
  get cooldownReadiness() {
    if (this.cooldownDuration <= 0) return 1;
    return 1 - this.cooldownRemaining / this.cooldownDuration;
  }

  /**
   * Attempt to switch worlds. Returns true if the switch was accepted,
   * false if it was rejected by the cooldown (nothing changes in that case).
   */
  requestSwitch() {
    if (!this.canSwitch()) return false;

    this.previous = this.current;
    this.current = this.current.id === 'light' ? WORLDS.shadow : WORLDS.light;

    this.isSwitching = true;
    this.transitionT = 0;
    this.flashAlpha = 0.9;
    this.cooldownRemaining = this.cooldownDuration;

    return true;
  }

  update(deltaSeconds) {
    if (this.isSwitching) {
      this.transitionT = Math.min(
        1,
        this.transitionT + deltaSeconds / SWITCH_DURATION,
      );
      if (this.transitionT >= 1) {
        this.isSwitching = false;
      }
    }

    if (this.flashAlpha > 0) {
      this.flashAlpha = Math.max(
        0,
        this.flashAlpha - deltaSeconds / FLASH_DECAY,
      );
    }

    if (this.cooldownRemaining > 0) {
      this.cooldownRemaining = Math.max(
        0,
        this.cooldownRemaining - deltaSeconds,
      );
    }
  }

  /** Eased 0-1 factor for crossfading colors between `previous` and `current`. */
  get colorBlend() {
    return easeInOutCubic(this.transitionT);
  }

  /**
   * 0-1 bell curve that peaks mid-transition, for the player's glow pulse.
   * Uses the raw (un-eased) progress so the pulse always completes exactly
   * with the switch animation regardless of the color easing curve.
   */
  get glowPulse() {
    if (!this.isSwitching && this.transitionT >= 1) return 0;
    return Math.sin(Math.PI * this.transitionT);
  }
}
