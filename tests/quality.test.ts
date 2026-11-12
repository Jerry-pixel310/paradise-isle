/** 作物品质测试 */
import { describe, expect, it } from 'vitest';
import { makeGame, NOW } from './helpers';
import { classifyQuality, qualityBonusCoins, qualityChances } from '../src/core/quality';
import { harvest } from '../src/core/crops';
import { setGameplayRng } from '../src/core/rng';
import { mulberry32 } from '../src/core/rng';
import { deserialize } from '../src/save/save';
import type { PlantedCrop } from '../src/core/types';

function crop(watered = false): PlantedCrop {
  return {
    defId: 'crop_carrot',
    plantedAt: NOW - 3600_000,
    wateredBonusMs: 0,
    lastWateredAt: watered ? NOW - 60_000 : 0,
  };
}

describe('作物品质', () => {
  it('浇水与美观度会提高银/金概率', () => {
    const state = makeGame();
    const dry = qualityChances(state, crop(false));
    const wet = qualityChances(state, crop(true));
    expect(wet.silver).toBeGreaterThan(dry.silver);
    expect(wet.gold).toBeGreaterThan(dry.gold);

    state.placements.push({ uid: 1, defId: 'bld_villa', x: 5, y: 5, rot: 0 });
    const pretty = qualityChances(state, crop(true));
    expect(pretty.silver).toBeGreaterThanOrEqual(wet.silver);
  });

  it('按随机值划分品质', () => {
    const chances = { silver: 0.2, gold: 0.06 };
    expect(classifyQuality(0.01, chances)).toBe('gold');
    expect(classifyQuality(0.1, chances)).toBe('silver');
    expect(classifyQuality(0.9, chances)).toBe('normal');
    expect(qualityBonusCoins('gold', 100, 2)).toBe(100);
    expect(qualityBonusCoins('silver', 100, 2)).toBe(40);
    expect(qualityBonusCoins('normal', 100, 2)).toBe(0);
  });

  it('金品质收获增加金币并记录统计', () => {
    const state = makeGame();
    state.plots[0].crop = { ...crop(false), plantedAt: NOW - 6 * 60_000 };
    const coins = state.player.coins;
    setGameplayRng(() => 0.001);
    try {
      const r = harvest(state, state.plots[0].uid, NOW);
      expect(r.ok).toBe(true);
      expect(state.stats.goldHarvests).toBe(1);
      expect(state.player.coins).toBeGreaterThan(coins);
      expect(r.events?.some((e) => e.target === 'msg.qualityGold')).toBe(true);
      expect(r.events?.find((e) => e.type === 'harvest')?.data).toBe('gold');
    } finally {
      setGameplayRng(mulberry32(12345));
    }
  });
});

describe('品质存档迁移', () => {
  it('v22 补齐 goldHarvests / silverHarvests', () => {
    const state = makeGame();
    const raw = JSON.parse(JSON.stringify(state)) as Record<string, unknown>;
    raw.version = 22;
    delete (raw.stats as unknown as Record<string, unknown>).goldHarvests;
    delete (raw.stats as unknown as Record<string, unknown>).silverHarvests;

    const migrated = deserialize(JSON.stringify(raw), NOW);

    expect(migrated.version).toBe(31);
    expect(migrated.stats.goldHarvests).toBe(0);
    expect(migrated.stats.silverHarvests).toBe(0);
  });
});
