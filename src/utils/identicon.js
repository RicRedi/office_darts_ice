function fnv1aHash(str) {
  let hash = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

const GRID_SIZE = 5;
const CELL_SIZE = 20;

/**
 * Deterministic 5x5 symmetric identicon SVG generated from a seed string
 * (the player id, not the name, so renaming a player keeps their avatar).
 */
export function generateIdenticon(seed) {
  const hash = fnv1aHash(String(seed));
  const hue = hash % 360;
  const color = `hsl(${hue}, 65%, 45%)`;

  const rects = [];
  for (let row = 0; row < GRID_SIZE; row++) {
    for (let col = 0; col < 3; col++) {
      const bitIndex = row * 3 + col;
      const filled = ((hash >> bitIndex) & 1) === 1;
      if (!filled) continue;

      rects.push(rectAt(row, col, color));
      const mirrorCol = GRID_SIZE - 1 - col;
      if (mirrorCol !== col) {
        rects.push(rectAt(row, mirrorCol, color));
      }
    }
  }

  const size = GRID_SIZE * CELL_SIZE;
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}">` +
    `<rect width="100%" height="100%" fill="#e5e4e7" />` +
    rects.join('') +
    `</svg>`
  );
}

function rectAt(row, col, color) {
  return `<rect x="${col * CELL_SIZE}" y="${row * CELL_SIZE}" width="${CELL_SIZE}" height="${CELL_SIZE}" fill="${color}" />`;
}
