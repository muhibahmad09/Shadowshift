---
name: Canvas2D fake bloom technique
description: How to fake a WebGL-style bloom post-effect on a raw Canvas 2D context without tanking frame rate, and the intensity pitfall to avoid.
---

## Technique
Render only the glowing shapes (halos, neon strips, coin/obstacle accents) into a small offscreen canvas (a fraction of real resolution, e.g. 0.3-0.4x). Blur that tiny canvas with `ctx.filter = 'blur(Npx)'` (cheap, because the canvas is small) and composite it back onto the main canvas with `globalCompositeOperation = 'lighter'` scaled up. This reads as soft neon bloom without a full-resolution blur every frame — fine for 60 FPS on modest hardware.

## Pitfall: additive blend blows out fast
`'lighter'` composite clips to white once overlapping channels saturate. Drawing the *same* full-opacity shape a second time into the bloom source (on top of the already-opaque real shape drawn on the main canvas) reads as a flat white blob with no visible structure, not a glow.

**Why:** discovered while adding bloom to ShadowShift's obstacles/player — using the same alpha (~0.75-0.9) and full-size shapes as the real draw produced a solid white rectangle instead of an edge glow.

**How to apply:** keep bloom-source shape alpha low (~0.3-0.45), inset the shape smaller than the real drawn shape (so it reads as edge glow, not a re-fill), and keep the final `composite()` alpha moderate (~0.5-0.6) on top of that.
