// ShadowShift — core setup
// This file wires up a responsive, full-screen canvas and a render loop.
// No gameplay yet — this is the foundation the game will be built on.

(() => {
  'use strict';

  const canvas = document.getElementById('game-canvas');
  const ctx = canvas.getContext('2d');

  /** Device pixel ratio, capped so very high-DPI screens don't tank perf. */
  const getDpr = () => Math.min(window.devicePixelRatio || 1, 2);

  /** Logical (CSS pixel) size of the canvas. Gameplay code should read these. */
  const viewport = {
    width: 0,
    height: 0,
  };

  /**
   * Resize the canvas backing store to match the current window size and
   * device pixel ratio, while keeping a 1:1 logical-pixel drawing space.
   */
  function resizeCanvas() {
    const dpr = getDpr();
    viewport.width = window.innerWidth;
    viewport.height = window.innerHeight;

    canvas.width = Math.round(viewport.width * dpr);
    canvas.height = Math.round(viewport.height * dpr);
    canvas.style.width = `${viewport.width}px`;
    canvas.style.height = `${viewport.height}px`;

    // Reset then scale so all drawing code can work in CSS pixels.
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);
  }

  window.addEventListener('resize', resizeCanvas);
  window.addEventListener('orientationchange', resizeCanvas);
  resizeCanvas();

  /** Simple fixed-step game clock, ready for gameplay logic to hook into. */
  let lastTime = performance.now();

  function update(deltaSeconds) {
    // Gameplay update logic will live here.
    void deltaSeconds;
  }

  function render() {
    ctx.clearRect(0, 0, viewport.width, viewport.height);

    // Placeholder frame so the empty canvas isn't blank while gameplay
    // is being built. Safe to remove once real rendering exists.
    ctx.save();
    ctx.globalAlpha = 0.6;
    ctx.fillStyle = '#8b5cf6';
    ctx.font = '600 14px Inter, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(
      'canvas ready — no gameplay yet',
      viewport.width / 2,
      viewport.height / 2,
    );
    ctx.restore();
  }

  function loop(now) {
    const deltaSeconds = (now - lastTime) / 1000;
    lastTime = now;

    update(deltaSeconds);
    render();

    requestAnimationFrame(loop);
  }

  requestAnimationFrame(loop);
})();
