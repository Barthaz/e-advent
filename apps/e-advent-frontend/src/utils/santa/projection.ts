import { MAP_HEIGHT, MAP_WIDTH } from '../../data/worldPath';

export function project(lat: number, lon: number, width = MAP_WIDTH, height = MAP_HEIGHT): [number, number] {
  const x = ((lon + 180) / 360) * width;
  const y = ((90 - lat) / 180) * height;
  return [x, y];
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function lerpPoint(
  a: [number, number],
  b: [number, number],
  t: number,
): [number, number] {
  return [lerp(a[0], b[0], t), lerp(a[1], b[1], t)];
}
