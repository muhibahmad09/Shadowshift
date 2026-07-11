// Scene — base class describing the lifecycle the SceneManager drives.
//
// Gameplay code will subclass this. Every hook is optional (no-ops here)
// so a scene only needs to override what it actually uses.

export class Scene {
  /** Convenience back-reference set by SceneManager before onEnter(). */
  engine = null;

  /** Called once, right after this scene becomes active. */
  onEnter(_data) {}

  /** Called once, right before this scene is replaced by another. */
  onExit() {}

  /** Called every frame with the clamped delta time, in seconds. */
  update(_deltaSeconds) {}

  /** Called every frame after update(), with the 2D canvas context. */
  render(_ctx) {}

  /** Called whenever the canvas' logical (CSS pixel) size changes. */
  onResize(_width, _height) {}
}
