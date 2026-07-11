// InputManager — unified keyboard, mouse, and touch/pointer input.
//
// Exposes both "held" state (isKeyDown / isPointerDown) and edge-triggered
// "this frame only" state (wasKeyPressed / wasKeyReleased / wasPointerPressed).
// Edge state is captured once per frame via `update()` — call it exactly
// once per game-loop tick, after all input events for that frame have had
// a chance to fire, then read the *Pressed/*Released queries afterward.

export class InputManager {
  constructor(target) {
    /** Element input listeners are attached to (usually the canvas). */
    this.target = target;

    /** Set of currently-held physical keys, keyed by KeyboardEvent.code. */
    this._keysDown = new Set();
    /** Keys that transitioned down -> up or up -> down since last update(). */
    this._keysPressed = new Set();
    this._keysReleased = new Set();

    /** Pointer (mouse/touch) state, in canvas-local CSS pixel coordinates. */
    this.pointer = { x: 0, y: 0, down: false, inside: false };
    this._pointerPressed = false;
    this._pointerReleased = false;

    this._bindHandlers();
    this._attach();
  }

  _bindHandlers() {
    this._onKeyDown = (event) => {
      if (!this._keysDown.has(event.code)) {
        this._keysPressed.add(event.code);
      }
      this._keysDown.add(event.code);
    };

    this._onKeyUp = (event) => {
      this._keysDown.delete(event.code);
      this._keysReleased.add(event.code);
    };

    // Losing window focus mid-keypress must not leave a "stuck" key held
    // forever (e.g. alt-tabbing away while holding a movement key).
    this._onBlur = () => {
      this._keysDown.clear();
      this.pointer.down = false;
    };

    this._onPointerMove = (event) => this._updatePointerPosition(event);

    this._onPointerDown = (event) => {
      this._updatePointerPosition(event);
      this.pointer.down = true;
      this._pointerPressed = true;
    };

    this._onPointerUp = () => {
      this.pointer.down = false;
      this._pointerReleased = true;
    };

    this._onPointerEnter = () => {
      this.pointer.inside = true;
    };

    this._onPointerLeave = () => {
      this.pointer.inside = false;
    };

    // Touch scrolling/zooming inside the game surface fights with gameplay.
    this._onTouchMove = (event) => event.preventDefault();
  }

  _attach() {
    window.addEventListener('keydown', this._onKeyDown);
    window.addEventListener('keyup', this._onKeyUp);
    window.addEventListener('blur', this._onBlur);

    this.target.addEventListener('pointermove', this._onPointerMove);
    this.target.addEventListener('pointerdown', this._onPointerDown);
    window.addEventListener('pointerup', this._onPointerUp);
    this.target.addEventListener('pointerenter', this._onPointerEnter);
    this.target.addEventListener('pointerleave', this._onPointerLeave);
    this.target.addEventListener('touchmove', this._onTouchMove, {
      passive: false,
    });
  }

  /** Remove all listeners. Call if the InputManager is ever torn down. */
  destroy() {
    window.removeEventListener('keydown', this._onKeyDown);
    window.removeEventListener('keyup', this._onKeyUp);
    window.removeEventListener('blur', this._onBlur);

    this.target.removeEventListener('pointermove', this._onPointerMove);
    this.target.removeEventListener('pointerdown', this._onPointerDown);
    window.removeEventListener('pointerup', this._onPointerUp);
    this.target.removeEventListener('pointerenter', this._onPointerEnter);
    this.target.removeEventListener('pointerleave', this._onPointerLeave);
    this.target.removeEventListener('touchmove', this._onTouchMove);
  }

  _updatePointerPosition(event) {
    const rect = this.target.getBoundingClientRect();
    this.pointer.x = event.clientX - rect.left;
    this.pointer.y = event.clientY - rect.top;
  }

  /** Is this physical key currently held down? */
  isKeyDown(code) {
    return this._keysDown.has(code);
  }

  /** Did this key transition from up to down during the current frame? */
  wasKeyPressed(code) {
    return this._keysPressed.has(code);
  }

  /** Did this key transition from down to up during the current frame? */
  wasKeyReleased(code) {
    return this._keysReleased.has(code);
  }

  /** Is the pointer (mouse or touch) currently held down? */
  isPointerDown() {
    return this.pointer.down;
  }

  /** Did the pointer go down during the current frame? */
  wasPointerPressed() {
    return this._pointerPressed;
  }

  /** Did the pointer come up during the current frame? */
  wasPointerReleased() {
    return this._pointerReleased;
  }

  /**
   * Clear this-frame edge state. Call exactly once per game loop tick,
   * after gameplay code has read the *Pressed/*Released queries for the
   * frame that just ended.
   */
  update() {
    this._keysPressed.clear();
    this._keysReleased.clear();
    this._pointerPressed = false;
    this._pointerReleased = false;
  }
}
