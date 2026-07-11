// collision — tiny axis-aligned bounding box helpers shared by gameplay code.

/** True if two `{x, y, width, height}` rectangles overlap. */
export function rectsOverlap(a, b) {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}
