/**
 * 农场自动化设施：
 * - 洒水器：定时自动浇灌周围 2 格内的作物（不耗能量）
 * - 稻草人：降低野兽刷新与杂草生长概率
 */
import type { GameState } from './types';
import { cropView } from './crops';
import { WATER_COOLDOWN_MS, WATER_SPEEDUP_RATIO } from './balance';

export const SPRINKLER_ID = 'bld_sprinkler';
export const SCARECROW_ID = 'bld_scarecrow';
export const SPRINKLER_RADIUS = 2;

export function hasBuilding(state: GameState, id: string): boolean {
  return state.placements.some((p) => p.defId === id);
}

export function scarecrowProtection(state: GameState): number {
  const n = state.placements.filter((p) => p.defId === SCARECROW_ID).length;
  return Math.min(0.75, n * 0.35);
}

/** 自动浇灌；返回浇灌的地块数 */
export function tickSprinklers(state: GameState, now: number): number {
  const sprinklers = state.placements.filter((p) => p.defId === SPRINKLER_ID);
  if (sprinklers.length === 0) return 0;
  let watered = 0;
  for (const plot of state.plots) {
    const crop = plot.crop;
    if (!crop) continue;
    const near = sprinklers.some((s) =>
      Math.abs(s.x - plot.x) <= SPRINKLER_RADIUS && Math.abs(s.y - plot.y) <= SPRINKLER_RADIUS);
    if (!near) continue;
    if (now - crop.lastWateredAt < WATER_COOLDOWN_MS) continue;
    const view = cropView(crop, now);
    if (view.stage === 'ready' || view.stage === 'withered') continue;
    crop.wateredBonusMs += Math.round(view.etaMs * WATER_SPEEDUP_RATIO);
    crop.lastWateredAt = now;
    watered++;
  }
  return watered;
}
