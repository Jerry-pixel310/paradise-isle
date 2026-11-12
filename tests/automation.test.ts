/** 农场自动化设施测试 */
import { describe, expect, it } from 'vitest';
import { makeGame, NOW } from './helpers';
import { scarecrowProtection, tickSprinklers } from '../src/core/automation';
import type { FarmPlot } from '../src/core/types';

function plotAt(uid: number, x: number, y: number): FarmPlot {
  return {
    uid, x, y,
    crop: { defId: 'crop_pumpkin', plantedAt: NOW, wateredBonusMs: 0, lastWateredAt: 0 },
  };
}

describe('洒水器', () => {
  it('自动浇灌周围 2 格内的作物，并遵守浇水冷却', () => {
    const state = makeGame();
    state.plots = [plotAt(1, 5, 5), plotAt(2, 5, 8)];
    state.placements.push({ uid: 900, defId: 'bld_sprinkler', x: 6, y: 5, rot: 0 });

    const first = tickSprinklers(state, NOW);
    expect(first).toBe(1); // 只有 (5,5) 在 2 格内
    expect(state.plots[0].crop!.wateredBonusMs).toBeGreaterThan(0);
    expect(state.plots[0].crop!.lastWateredAt).toBe(NOW);
    expect(state.plots[1].crop!.wateredBonusMs).toBe(0);

    expect(tickSprinklers(state, NOW + 1000)).toBe(0);
    expect(tickSprinklers(state, NOW + 10 * 60_000)).toBe(1);
  });
});

describe('稻草人', () => {
  it('每只降低 35% 刷新概率，最多 75%', () => {
    const state = makeGame();
    expect(scarecrowProtection(state)).toBe(0);
    state.placements.push({ uid: 1, defId: 'bld_scarecrow', x: 1, y: 1, rot: 0 });
    expect(scarecrowProtection(state)).toBeCloseTo(0.35);
    state.placements.push({ uid: 2, defId: 'bld_scarecrow', x: 3, y: 3, rot: 0 });
    expect(scarecrowProtection(state)).toBeCloseTo(0.7);
    state.placements.push({ uid: 3, defId: 'bld_scarecrow', x: 5, y: 5, rot: 0 });
    expect(scarecrowProtection(state)).toBeCloseTo(0.75);
  });
});
