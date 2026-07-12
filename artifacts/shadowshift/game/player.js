// Player — physics, jump, and rendering for the runner character.
//
// The player stays at a fixed horizontal position (there's no world/camera
// yet) but plays a continuous running-leg animation so it always reads as
// "in motion". Vertical movement is real physics: gravity pulls it down
// every frame, it collides with the ground line, and it can jump exactly
// once per ground contact (no double jumping).

const GRAVITY = 2600; // px/s^2
const JUMP_VELOCITY = -980; // px/s (negative = up)
const RUN_CYCLE_SPEED = 9; // radians/s while grounded
const BOB_AMPLITUDE_PX = 2.6; // subtle vertical bob synced to stride while grounded

const BODY_WIDTH = 40;
const BODY_HEIGHT = 56;
const LEG_LENGTH = 20;
const LEG_SWING = 16; // px of horizontal leg travel at full stride
const ARM_SWING = 12; // px of horizontal arm travel at full stride

// Squash & stretch: how far scaleX/scaleY move from 1 on jump takeoff and
// landing impact, and how fast they spring back — classic animation-
// principle polish that makes the jump read as a real push-off/impact
// instead of just a parabola.
const SQUASH_SPRING_SPEED = 14; // how fast scale relaxes back to 1
const TRAIL_HUE_SPEED = 140; // degrees/s the Prism Streak trail cycles through

/** Original Violet Drifter look — used until a shop skin is equipped. */
const DEFAULT_SKIN = {
  body: '#c4b5fd',
  limb: '#8b5cf6',
  arm: '#a78bfa',
  glow: 'rgba(139, 92, 246, 0.65)',
};

export class Player {
  constructor() {
    /** Fixed horizontal anchor, set by the scene on resize. */
    this.x = 0;
    /** Top-left of the bounding box; `y + height` is the player's feet. */
    this.y = 0;
    this.width = BODY_WIDTH;
    this.height = BODY_HEIGHT;

    this.velocityY = 0;
    this.groundY = 0;
    this.isGrounded = false;

    /** Phase accumulator for the run-cycle leg/arm animation. */
    this._runCycle = 0;
    /** Set once per stride-half so PlayScene can trigger a footstep dust puff. */
    this._footstepPending = false;

    /** Squash/stretch scale, animated on jump takeoff and landing impact. */
    this._scaleX = 1;
    this._scaleY = 1;
    this._wasGrounded = true;

    /** Short ring buffer of recent {x, y, scaleY} for the motion-trail afterimage. */
    this._trail = [];
    this._trailTimer = 0;

    /** Cosmetic skin colors (body/limb/arm/glow) — see setSkin(). */
    this._skin = { ...DEFAULT_SKIN };
    /** Trail color: a CSS color, 'rainbow' for the Prism Streak, or null (no trail). */
    this._trailColor = '#8b5cf6';
    this._trailHue = 0;
  }

  /** Apply a shop skin's colors. Missing fields fall back to the default look. */
  setSkin(skin) {
    this._skin = {
      body: skin?.body ?? DEFAULT_SKIN.body,
      limb: skin?.limb ?? DEFAULT_SKIN.limb,
      arm: skin?.arm ?? DEFAULT_SKIN.arm,
      glow: skin?.glow ?? DEFAULT_SKIN.glow,
    };
  }

  /** Set the motion-trail color: a CSS color, 'rainbow', or null to disable. */
  setTrailColor(color) {
    this._trailColor = color;
  }

  /** Place the player standing on the given ground line, at rest. */
  reset(groundY) {
    this.groundY = groundY;
    this.y = groundY - this.height;
    this.velocityY = 0;
    this.isGrounded = true;
    this._runCycle = 0;
    this._footstepPending = false;
    this._scaleX = 1;
    this._scaleY = 1;
    this._wasGrounded = true;
    this._trail = [];
    this._trailTimer = 0;
  }

  /** Consume the pending footstep flag (true at most once per stride-half). */
  consumeFootstep() {
    const pending = this._footstepPending;
    this._footstepPending = false;
    return pending;
  }

  /** Update the ground line (e.g. after a resize) without disturbing flight. */
  setGroundY(groundY) {
    const wasResting = this.isGrounded;
    this.groundY = groundY;
    if (wasResting) {
      this.y = groundY - this.height;
    }
  }

  /** World-space AABB for collision checks: `x` is left edge, not center. */
  getBounds() {
    return {
      x: this.x - this.width / 2,
      y: this.y,
      width: this.width,
      height: this.height,
    };
  }

  /** Request a jump. No-op if airborne — this is what prevents double jumps. */
  jump() {
    if (!this.isGrounded) return;
    this.isGrounded = false;
    this.velocityY = JUMP_VELOCITY;
    // Stretch tall on takeoff — the "anticipation + push-off" beat.
    this._scaleY = 1.22;
    this._scaleX = 0.86;
  }

  update(deltaSeconds) {
    this._wasGrounded = this.isGrounded;

    // Gravity + integration, done in real units-per-second so speed is
    // identical regardless of frame rate.
    this.velocityY += GRAVITY * deltaSeconds;
    this.y += this.velocityY * deltaSeconds;

    // Ground collision: clamp to the ground line and kill vertical velocity.
    const restingY = this.groundY - this.height;
    if (this.y >= restingY) {
      this.y = restingY;
      this.velocityY = 0;
      if (!this.isGrounded) {
        // Just landed — squash flat, then let the spring pull it back to
        // normal over the next few frames.
        this._scaleY = 0.78;
        this._scaleX = 1.18;
      }
      this.isGrounded = true;
    }

    // Spring scale back toward 1 regardless of state, so a takeoff/landing
    // squash always relaxes even if the player chains jumps quickly.
    const springFactor = Math.min(1, deltaSeconds * SQUASH_SPRING_SPEED);
    this._scaleX += (1 - this._scaleX) * springFactor;
    this._scaleY += (1 - this._scaleY) * springFactor;

    // The running animation always advances while grounded, independent of
    // the jump arc, so the character never looks like it "stops" running.
    if (this.isGrounded) {
      const previousCycle = this._runCycle;
      this._runCycle += deltaSeconds * RUN_CYCLE_SPEED;
      // A footstep lands every half-stride (each time the sine wave crosses
      // a multiple of PI) — used by PlayScene to spawn a ground dust puff.
      if (Math.floor(previousCycle / Math.PI) !== Math.floor(this._runCycle / Math.PI)) {
        this._footstepPending = true;
      }
    }

    this._updateTrail(deltaSeconds);
    this._trailHue = (this._trailHue + deltaSeconds * TRAIL_HUE_SPEED) % 360;
  }

  _updateTrail(deltaSeconds) {
    this._trailTimer -= deltaSeconds;
    if (this._trailTimer > 0) return;
    this._trailTimer = 0.045; // sample a new ghost roughly every 45ms

    this._trail.push({ y: this.y, scaleY: this._scaleY, scaleX: this._scaleX });
    if (this._trail.length > 4) this._trail.shift();
  }

  /** Vertical stride bob applied on top of physics `y` while grounded. */
  get _bobOffset() {
    if (!this.isGrounded) return 0;
    return Math.abs(Math.sin(this._runCycle)) * -BOB_AMPLITUDE_PX;
  }

  /**
   * @param {number} switchGlow 0-1 intensity of the world-switch halo.
   * @param {string} glowColor CSS color for the halo while switching.
   * @param {boolean} showTrail whether to draw the motion-trail afterimages
   *   (disabled on low graphics quality — see settings.qualityPreset.playerTrail).
   */
  draw(ctx, switchGlow = 0, glowColor = '#ffffff', glowBlur = 18, showTrail = true) {
    const centerX = this.x;

    if (showTrail) {
      this._drawTrail(ctx, centerX);
    }

    const topY = this.y + this._bobOffset;
    const bodyBottomY = topY + this.height - LEG_LENGTH;
    const bodyCenterY = topY + (bodyBottomY - topY) / 2;

    ctx.save();
    ctx.translate(centerX, 0);

    if (switchGlow > 0) {
      this._drawSwitchHalo(ctx, bodyCenterY, switchGlow, glowColor);
    }

    ctx.save();
    // Squash & stretch pivots from the feet (bottom of the sprite), not the
    // center, so a squash reads as "pressing into the ground" rather than
    // the whole body sinking.
    ctx.translate(0, this.y + this.height);
    ctx.scale(this._scaleX, this._scaleY);
    ctx.translate(0, -(this.y + this.height));

    this._drawArms(ctx, bodyBottomY - (bodyBottomY - topY) * 0.32);
    this._drawLegs(ctx, bodyBottomY);
    this._drawBody(ctx, topY, bodyBottomY, glowBlur);
    ctx.restore();

    ctx.restore();
  }

  _drawTrail(ctx, centerX) {
    if (!this._trailColor) return;

    const steps = this._trail.length;
    for (let i = 0; i < steps; i += 1) {
      const ghost = this._trail[i];
      const age = (i + 1) / (steps + 1); // older = smaller index = fainter
      const topY = ghost.y + this._bobOffset;
      const bottomY = topY + this.height - LEG_LENGTH;
      const radius = this.width / 2;

      ctx.save();
      ctx.translate(centerX, 0);
      ctx.globalAlpha = age * 0.16;
      ctx.fillStyle =
        this._trailColor === 'rainbow'
          ? `hsl(${(this._trailHue + i * 40) % 360}, 85%, 65%)`
          : this._trailColor;
      ctx.beginPath();
      ctx.moveTo(-radius, topY + radius);
      ctx.arcTo(-radius, topY, 0, topY, radius);
      ctx.arcTo(radius, topY, radius, topY + radius, radius);
      ctx.lineTo(radius, bottomY);
      ctx.lineTo(-radius, bottomY);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  }

  _drawArms(ctx, shoulderY) {
    // Arms swing opposite the legs (front leg back, back leg front — the
    // natural counter-rotation of a run cycle) for a much less "stiff" gait.
    const stride = this.isGrounded ? Math.sin(this._runCycle) : -0.4;
    const frontSwing = -stride * ARM_SWING;
    const backSwing = stride * ARM_SWING;

    ctx.save();
    ctx.strokeStyle = this._skin.arm;
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';

    ctx.beginPath();
    ctx.moveTo(-9, shoulderY);
    ctx.lineTo(-9 + frontSwing * 0.5, shoulderY + 16);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(9, shoulderY);
    ctx.lineTo(9 + backSwing * 0.5, shoulderY + 16);
    ctx.stroke();

    ctx.restore();
  }

  _drawSwitchHalo(ctx, centerY, intensity, color) {
    const radius = this.width * 1.9;
    const gradient = ctx.createRadialGradient(
      0,
      centerY,
      0,
      0,
      centerY,
      radius,
    );
    gradient.addColorStop(0, color);
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

    ctx.save();
    ctx.globalAlpha = intensity * 0.85;
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(0, centerY, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  _drawLegs(ctx, hipY) {
    // While airborne, legs hold a fixed "tucked" running pose instead of
    // cycling — reads as a jump silhouette rather than mid-stride.
    const stride = this.isGrounded ? Math.sin(this._runCycle) : 0.6;

    const frontSwing = stride * LEG_SWING;
    const backSwing = -stride * LEG_SWING;

    ctx.strokeStyle = this._skin.limb;
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';

    ctx.beginPath();
    ctx.moveTo(-6, hipY);
    ctx.lineTo(-6 + frontSwing * 0.4, hipY + LEG_LENGTH);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(6, hipY);
    ctx.lineTo(6 + backSwing * 0.4, hipY + LEG_LENGTH);
    ctx.stroke();
  }

  _drawBody(ctx, topY, bottomY, glowBlur = 18) {
    const bodyHeight = bottomY - topY;
    const radius = this.width / 2;

    // Soft glow behind the silhouette so it reads against the dark backdrop.
    ctx.shadowColor = this._skin.glow;
    ctx.shadowBlur = glowBlur;

    ctx.fillStyle = this._skin.body;
    ctx.beginPath();
    ctx.moveTo(-radius, topY + radius);
    ctx.arcTo(-radius, topY, -radius + radius, topY, radius);
    ctx.arcTo(radius, topY, radius, topY + radius, radius);
    ctx.lineTo(radius, topY + bodyHeight);
    ctx.lineTo(-radius, topY + bodyHeight);
    ctx.closePath();
    ctx.fill();

    ctx.shadowBlur = 0;

    // Head.
    const headRadius = radius * 0.62;
    const headCenterY = topY - headRadius * 0.4;
    ctx.beginPath();
    ctx.arc(0, headCenterY, headRadius, 0, Math.PI * 2);
    ctx.fill();
  }
}
