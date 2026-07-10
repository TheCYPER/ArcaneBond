export function hashSeed(input) {
  const text = String(input || "arcane-bond");
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export class SeededRng {
  constructor(seed) {
    this.seed = hashSeed(seed);
    this.state = this.seed;
  }

  next() {
    this.state += 0x6d2b79f5;
    let value = this.state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  }

  integer(min, max) {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  pick(items) {
    return items[Math.floor(this.next() * items.length)];
  }

  shuffle(items) {
    const copy = [...items];
    for (let index = copy.length - 1; index > 0; index -= 1) {
      const swap = Math.floor(this.next() * (index + 1));
      [copy[index], copy[swap]] = [copy[swap], copy[index]];
    }
    return copy;
  }
}

export function createRunSeed(now = Date.now()) {
  return `${now.toString(36).toUpperCase()}-${Math.floor(Math.random() * 1679616)
    .toString(36)
    .padStart(4, "0")
    .toUpperCase()}`;
}
