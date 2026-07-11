// SceneManager — registers scenes by name and drives the active one's
// lifecycle (onEnter/onExit/update/render/onResize).
//
// Only one scene is active at a time. Switching scenes is deferred to the
// start of the next update() so it never happens mid-render.

export class SceneManager {
  constructor(engine) {
    this.engine = engine;
    this._scenes = new Map();
    this.current = null;
    this._currentName = null;
    this._pendingSwitch = null;
  }

  /** Register a scene instance under a name so it can be switched to later. */
  add(name, scene) {
    scene.engine = this.engine;
    this._scenes.set(name, scene);
    return this;
  }

  /** Request a switch to a registered scene. Takes effect before the next update. */
  switchTo(name, data) {
    if (!this._scenes.has(name)) {
      throw new Error(`SceneManager: no scene registered under "${name}"`);
    }
    this._pendingSwitch = { name, data };
  }

  get currentName() {
    return this._currentName;
  }

  _applyPendingSwitch() {
    if (!this._pendingSwitch) return;

    const { name, data } = this._pendingSwitch;
    this._pendingSwitch = null;

    if (this.current) {
      this.current.onExit();
    }

    this.current = this._scenes.get(name);
    this._currentName = name;
    this.current.onEnter(data);

    // Sync the freshly-entered scene with the current canvas size — the
    // last resize may have happened before this scene existed.
    this.current.onResize(this.engine.width, this.engine.height);
  }

  /** Advance the active scene by one frame. */
  update(deltaSeconds) {
    this._applyPendingSwitch();
    if (this.current) {
      this.current.update(deltaSeconds);
    }
  }

  /** Render the active scene. */
  render(ctx) {
    if (this.current) {
      this.current.render(ctx);
    }
  }

  /** Forward a canvas resize to the active scene. */
  onResize(width, height) {
    if (this.current) {
      this.current.onResize(width, height);
    }
  }
}
