/** 图鉴里程碑测试 */
import { describe, expect, it } from 'vitest';
import { makeGame, NOW } from './helpers';
import { claimDexReward, dexProgress, dexSummary, dexTiers } from '../src/core/dex';
import { applyEvents } from '../src/core/quests';
import { deserialize } from '../src/save/save';

function fillFish(state: ReturnType<typeof makeGame>, n: number): void {
  for (let i = 0; i < n; i++) state.collections.fish[`fish_test_${i}`] = 1;
}

describe('图鉴里程碑', () => {
  it('按唯一收集数计算档位', () => {
    const state = makeGame();
    fillFish(state, 9);
    const p = dexProgress(state, 'fish');
    expect(p.have).toBe(9);
    expect(p.total).toBe(35);
    expect(p.tiers).toEqual([9, 18, 27, 35]);
    expect(p.canClaim).toBe(true);
    expect(dexTiers(8)).toEqual([2, 4, 6, 8]);
  });

  it('领取一档后需要更多收集才能领下一档', () => {
    const state = makeGame();
    fillFish(state, 9);
    const coins = state.player.coins;

    const r = claimDexReward(state, 'fish');

    expect(r.ok).toBe(true);
    expect(state.player.coins).toBe(coins + 250);
    expect(state.collections.claimed.fish).toBe(1);
    applyEvents(state, r.events!, NOW);
    expect(state.stats.dexRewards).toBe(1);

    const again = claimDexReward(state, 'fish');
    expect(again.ok).toBe(false);
    expect(again.reason).toBe('msg.notReady');
  });

  it('集满可连领四档，领完后不能再领', () => {
    const state = makeGame();
    fillFish(state, 35);
    for (let i = 0; i < 4; i++) {
      expect(claimDexReward(state, 'fish').ok).toBe(true);
    }
    expect(state.collections.claimed.fish).toBe(4);
    expect(dexSummary(state).claimed).toBe(4);
    expect(claimDexReward(state, 'fish').reason).toBe('msg.allClaimed');
  });
});

describe('图鉴里程碑存档迁移', () => {
  it('v17 补齐 claimed 与 dexRewards', () => {
    const state = makeGame();
    const raw = JSON.parse(JSON.stringify(state)) as Record<string, unknown>;
    raw.version = 17;
    delete (raw.collections as unknown as Record<string, unknown>).claimed;
    delete (raw.stats as unknown as Record<string, unknown>).dexRewards;

    const migrated = deserialize(JSON.stringify(raw), NOW);

    expect(migrated.version).toBe(31);
    expect(migrated.collections.claimed).toEqual({ fish: 0, forage: 0, game: 0, beasts: 0 });
    expect(migrated.stats.dexRewards).toBe(0);
  });
});
