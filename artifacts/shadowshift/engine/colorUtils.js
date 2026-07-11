// colorUtils — tiny hex color helpers used to crossfade between worlds.

/** Parse "#rrggbb" into { r, g, b } (0-255 each). */
function hexToRgb(hex) {
  const value = hex.replace('#', '');
  return {
    r: parseInt(value.substring(0, 2), 16),
    g: parseInt(value.substring(2, 4), 16),
    b: parseInt(value.substring(4, 6), 16),
  };
}

/** Linear interpolation between two numbers. */
function lerp(a, b, t) {
  return a + (b - a) * t;
}

/**
 * Interpolate between two "#rrggbb" colors and return a CSS `rgb(...)`
 * string. `t` is clamped to [0, 1].
 */
export function lerpColor(hexA, hexB, t) {
  const clamped = Math.max(0, Math.min(1, t));
  const a = hexToRgb(hexA);
  const b = hexToRgb(hexB);

  const r = Math.round(lerp(a.r, b.r, clamped));
  const g = Math.round(lerp(a.g, b.g, clamped));
  const bl = Math.round(lerp(a.b, b.b, clamped));

  return `rgb(${r}, ${g}, ${bl})`;
}

/** Smooth ease used for color transitions — slow start/end, fast middle. */
export function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}
