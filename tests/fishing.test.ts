/** 钓鱼系统测试 */
import { describe, expect, it } from 'vitest';
import { makeGame, NOW, seedRng } from './helpers';
import { castLine, catchTable, fishCollectionProgress, resolveCatch } from '../src/core/fishing';
import { allFish } from '../src/core/registry';
import { ENERGY_COST } from '../src/core/balance';
import { DAY_MS, calendarAt } from '../src/core/calendar';

describe('钓鱼', () => {
  it('甩竿消耗能量', () => {
    const state = makeGame();
    const e = state.player.energy;
    expect(castLine(state, NOW).ok).toBe(true);
    expect(state.player.energy).toBe(e - ENERGY_COST.fishCast);
  });

  it('概率表：低级竿钓不到高级鱼', () => {
    const state = makeGame();
    state.player.rodTier = 1;
    const { fish } = catchTable(state);
    expect(fish.every((f) => f.minRodTier <= 1)).toBe(true);
    state.player.rodTier = 3;
    const t3 = catchTable(state);
    expect(t3.fish.length).toBe(allFish().filter((f) => f.minRodTier <= 3).length);
    expect(t3.weights.every((w) => w > 0)).toBe(true);
  });

  it('高级竿显著提升稀有权重占比', () => {
    const state = makeGame();
    state.player.rodTier = 1;
    const t1 = catchTable(state);
    const rare1 = rareShare(t1);
    state.player.rodTier = 3;
    const t3 = catchTable(state);
    expect(rareShare(t3)).toBeGreaterThan(rare1);
  });

  it('收线质量差则脱钩，好则入包并进图鉴', () => {
    const state = makeGame();
    seedRng(5);
    const miss = resolveCatch(state, 0.2);
    expect(miss.catch?.fish).toBeNull();

    const hit = resolveCatch(state, 0.9);
    expect(hit.catch?.fish).not.toBeNull();
    const id = hit.catch!.fish!.id;
    expect(state.inventory[id]).toBe(1);
    expect(state.collections.fish[id]).toBe(1);
    expect(hit.catch!.isNew).toBe(true);
    expect(fishCollectionProgress(state).caught).toBe(1);
  });

  it('季节限定鱼只在对应季节出现', () => {
    const state = makeGame();
    state.player.rodTier = 3;

    const spring = catchTable(state, NOW);
    expect(spring.fish.some((f) => f.id === 'fish_ghostfish')).toBe(false);
    expect(spring.fish.every((f) => !f.seasons || f.seasons.includes('spring'))).toBe(true);

    const winterAt = NOW + 21 * DAY_MS + 1000;
    const winter = catchTable(state, winterAt);
    expect(winter.fish.some((f) => f.id === 'fish_goldkoi')).toBe(false);
    expect(winter.fish.every((f) => !f.seasons || f.seasons.includes('winter'))).toBe(true);
  });

  it('昼夜偏好过滤正确', () => {
    const state = makeGame();
    state.player.rodTier = 3;

    const day = catchTable(state, NOW);
    expect(day.fish.every((f) => f.time !== 'night')).toBe(true);

    const night = catchTable(state, NOW + 10 * 60_000);
    expect(night.fish.every((f) => f.time !== 'day')).toBe(true);
  });

  it('天气限定鱼只在对应天气出现', () => {
    const state = makeGame();
    state.player.rodTier = 3;
    const cal = calendarAt(state.createdAt, NOW, state.seed);
    const table = catchTable(state, NOW);
    for (const f of table.fish) {
      if (f.weather) expect(f.weather).toContain(cal.weather);
    }
  });
});

function rareShare(t: { fish: { rarity: string }[]; weights: number[] }): number {
  let rare = 0;
  let total = 0;
  t.fish.forEach((f, i) => {
    total += t.weights[i];
    if (f.rarity === 'rare' || f.rarity === 'epic' || f.rarity === 'legendary') rare += t.weights[i];
  });
  return rare / total;
}
