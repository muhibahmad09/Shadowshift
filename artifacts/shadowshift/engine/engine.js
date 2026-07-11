// Engine — owns the canvas, the requestAnimationFrame loop, delta time,
// input, the scene manager, and resize handling.
//
// 60 FPS optimization notes:
//   - The canvas backing store is sized in device pixels but all drawing
//     happens in CSS-pixel space via ctx.scale(dpr, dpr), so scene code
//     never has to think about DPR.
//   - DPR is capped (see `maxDpr`) so a 3x/4x phone screen doesn't force
//     4-9x the pixel fill work for no visible benefit.
//   - Resize handling is debounced so rapid resize events (dragging a
//     window edge) don't thrash the backing store every pixel of movement.
//   - The loop is paused on `visibilitychange` (tab hidden) so a
//     backgrounded tab doesn't burn CPU/battery, and the clock is reset on
//     resume so the next frame doesn't see a multi-second delta spike.
//   - No per-frame allocations in the hot path (no closures, arrays, or
//     objects created inside the loop callback itself).

import { Time } from './time.js';
import { InputManager } from './input.js';
import { SceneManager } from './sceneManager.js';

const RESIZE_DEBOUNCE_MS = 100;

export class Engine {
  constructor(canvas, { maxDpr = 2 } = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.maxDpr = maxDpr;

    /** Logical (CSS pixel) size of the drawing surface. */
    this.width = 0;
    this.height = 0;

    this.time = new Time();
    this.input = new InputManager(canvas);
    this.scenes = new SceneManager(this);

    this.running = false;
    this._rafHandle = null;
    this._resizeTimeout = null;

    this._boundLoop = this._loop.bind(this);
    this._boundResize = this._onResizeEvent.bind(this);
    this._boundVisibility = this._onVisibilityChange.bind(this);

    this._resizeToWindow();
    window.addEventListener('resize', this._boundResize);
    window.addEventListener('orientationchange', this._boundResize);
    document.addEventListener('visibilitychange', this._boundVisibility);
  }

  /** Start the requestAnimationFrame loop. Safe to call once. */
  start() {
    if (this.running) return;
    this.running = true;
    this.time.reset(performance.now());
    this._rafHandle = requestAnimationFrame(this._boundLoop);
  }

  /** Stop the loop. The engine can be restarted later with start(). */
  stop() {
    this.running = false;
    if (this._rafHandle !== null) {
      cancelAnimationFrame(this._rafHandle);
      this._rafHandle = null;
    }
  }

  /** Tear down all listeners. Call if the engine instance is discarded. */
  destroy() {
    this.stop();
    window.removeEventListener('resize', this._boundResize);
    window.removeEventListener('orientationchange', this._boundResize);
    document.removeEventListener('visibilitychange', this._boundVisibility);
    this.input.destroy();
  }

  _loop(nowMs) {
    if (!this.running) return;

    this.time.tick(nowMs);

    this.scenes.update(this.time.delta);
    this.scenes.render(this.ctx);

    // Clear this-frame input edges only after gameplay has had a chance
    // to read them, and only once per tick.
    this.input.update();

    this._rafHandle = requestAnimationFrame(this._boundLoop);
  }

  _onVisibilityChange() {
    if (document.hidden) {
      this.stop();
    } else {
      this.start();
    }
  }

  _onResizeEvent() {
    // Debounce: coalesce a burst of resize events (window drag, mobile
    // keyboard opening/closing, rotation) into a single backing-store
    // reallocation instead of one per event.
    if (this._resizeTimeout !== null) {
      clearTimeout(this._resizeTimeout);
    }
    this._resizeTimeout = setTimeout(() => {
      this._resizeTimeout = null;
      this._resizeToWindow();
    }, RESIZE_DEBOUNCE_MS);
  }

  _resizeToWindow() {
    const dpr = Math.min(window.devicePixelRatio || 1, this.maxDpr);
    const width = window.innerWidth;
    const height = window.innerHeight;

    this.width = width;
    this.height = height;

    this.canvas.width = Math.round(width * dpr);
    this.canvas.height = Math.round(height * dpr);
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;

    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.scale(dpr, dpr);

    this.scenes.onResize(width, height);
  }
}
