const CARDINALS = new Set(["up", "down", "left", "right"]);

export function cardinalDirection(vector, fallback = "down") {
  const safeFallback = CARDINALS.has(fallback) ? fallback : "down";
  const x = Number(vector?.x) || 0;
  const y = Number(vector?.y) || 0;
  if (x === 0 && y === 0) return safeFallback;
  if (Math.abs(x) > Math.abs(y)) return x < 0 ? "left" : "right";
  return y < 0 ? "up" : "down";
}

