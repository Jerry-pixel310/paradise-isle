/**
 * 花卉基因：色相 + 活力 + 代数。
 * 杂交时子代色相取双亲的圆平均并带小幅突变，代数 +1；
 * 活力影响收获时的金币加成。
 */
import type { FlowerGenes, L10n } from './types';
import { roll } from './rng';

const BASE_HUE: Record<string, number> = {
  crop_rose: 350,
  crop_tulip: 25,
  crop_sunflower: 48,
  crop_lavender: 272,
  crop_hydrangea: 210,
  crop_moonflower: 225,
  crop_blue_rose: 235,
  crop_black_tulip: 285,
  crop_rainbow_hydrangea: 315,
};

export function normalizeHue(h: number): number {
  return ((h % 360) + 360) % 360;
}

export function baseHue(defId: string): number {
  return BASE_HUE[defId] ?? 330;
}

export function randomFlowerGenes(defId: string): FlowerGenes {
  return {
    hue: normalizeHue(baseHue(defId) + (roll() - 0.5) * 28),
    vigor: 0.35 + roll() * 0.3,
    generation: 1,
  };
}

export function crossFlowerGenes(a: FlowerGenes, b: FlowerGenes): FlowerGenes {
  const rad = (h: number): number => (h * Math.PI) / 180;
  const x = Math.cos(rad(a.hue)) + Math.cos(rad(b.hue));
  const y = Math.sin(rad(a.hue)) + Math.sin(rad(b.hue));
  const base = x === 0 && y === 0 ? a.hue : (Math.atan2(y, x) * 180) / Math.PI;
  return {
    hue: normalizeHue(base + (roll() - 0.5) * 24),
    vigor: Math.max(0.1, Math.min(1, (a.vigor + b.vigor) / 2 + (roll() - 0.5) * 0.12)),
    generation: Math.max(a.generation, b.generation) + 1,
  };
}

/** 收获时的金币加成比例（0.08 - 0.55） */
export function geneBonusRatio(g: FlowerGenes): number {
  return Math.min(0.55, 0.08 + g.vigor * 0.25 + Math.min(10, g.generation) * 0.015);
}

const COLOR_NAMES: Array<{ max: number; name: L10n }> = [
  { max: 20, name: { zh: '红', en: 'Red' } },
  { max: 45, name: { zh: '橙', en: 'Orange' } },
  { max: 70, name: { zh: '黄', en: 'Yellow' } },
  { max: 160, name: { zh: '绿', en: 'Green' } },
  { max: 200, name: { zh: '青', en: 'Cyan' } },
  { max: 250, name: { zh: '蓝', en: 'Blue' } },
  { max: 290, name: { zh: '紫', en: 'Purple' } },
  { max: 330, name: { zh: '品红', en: 'Magenta' } },
  { max: 360, name: { zh: '红', en: 'Red' } },
];

export function flowerColorName(g: FlowerGenes): L10n {
  const hue = normalizeHue(g.hue);
  for (const c of COLOR_NAMES) {
    if (hue < c.max) return c.name;
  }
  return COLOR_NAMES[0].name;
}

/** 给绘制用的 HSL 颜色 */
export function flowerHsl(g: FlowerGenes, lightness = 62, saturation = 72): string {
  return `hsl(${Math.round(normalizeHue(g.hue))}, ${saturation}%, ${lightness}%)`;
}
