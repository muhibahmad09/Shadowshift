// Time — tracks delta time and frame rate for the game loop.
//
// Delta time is clamped so a stall (tab switch, breakpoint, slow device)
// never produces a huge dt that teleports gameplay forward ("spiral of
// death"). FPS is smoothed with a rolling average so the HUD/debug readout
// doesn't jitter every frame.

export class Time {
  constructor({ maxDeltaSeconds = 1 / 15 } = {}) {
    /** Clamp applied to raw delta so a stall never produces a huge step. */
    this.maxDeltaSeconds = maxDeltaSeconds;

    /** Seconds elapsed since the previous frame (clamped). */
    this.delta = 0;

    /** Total seconds elapsed since the loop started. */
    this.elapsed = 0;

    /** Smoothed frames-per-second estimate for debugging/telemetry. */
    this.fps = 0;

    this._last = 0;
    this._fpsAccumulator = 0;
    this._fpsFrameCount = 0;
  }

  /** Call once, right before starting the loop, so the first frame has no gap. */
  reset(nowMs) {
    this._last = nowMs;
    this.delta = 0;
    this._fpsAccumulator = 0;
    this._fpsFrameCount = 0;
  }

  /** Advance the clock using a `performance.now()`-style timestamp (ms). */
  tick(nowMs) {
    const rawDeltaSeconds = (nowMs - this._last) / 1000;
    this._last = nowMs;

    this.delta = Math.max(0, Math.min(rawDeltaSeconds, this.maxDeltaSeconds));
    this.elapsed += this.delta;

    this._updateFps(this.delta);
  }

  _updateFps(deltaSeconds) {
    this._fpsAccumulator += deltaSeconds;
    this._fpsFrameCount += 1;

    // Recompute the smoothed FPS reading a few times a second instead of
    // every frame — cheaper and much easier to read.
    if (this._fpsAccumulator >= 0.25) {
      this.fps = this._fpsFrameCount / this._fpsAccumulator;
      this._fpsAccumulator = 0;
      this._fpsFrameCount = 0;
    }
  }
}
