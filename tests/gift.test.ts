/** 邻居送礼与好友回礼测试 */
import { describe, expect, it } from 'vitest';
import { makeGame, NOW } from './helpers';
import {
  claimNeighborReward, giftToNeighbor, giftableItems, isGiftableItem, nextNeighborReward,
} from '../src/core/social';
import { deserialize } from '../src/save/save';
import type { GameState } from '../src/core/types';

describe('邻居送礼', () => {
  it('送出花束会消耗物品并提升好友度', () => {
    const state = makeGame();
    const ns = state.neighbors[0];
    state.inventory.bouquet_rose = 1;
    const before = ns.friendship;

    const r = giftToNeighbor(state, ns, 'bouquet_rose', NOW);

    expect(r.ok).toBe(true);
    expect(ns.friendship).toBeGreaterThan(before);
    expect(ns.giftedToday).toBe(1);
    expect(state.inventory.bouquet_rose).toBeUndefined();
    expect(r.events?.some((e) => e.type === 'gift')).toBe(true);
  });

  it('每个邻居每天最多送 3 次', () => {
    const state = makeGame();
    const ns = state.neighbors[0];
    state.inventory.bouquet_rose = 5;

    expect(giftToNeighbor(state, ns, 'bouquet_rose', NOW).ok).toBe(true);
    expect(giftToNeighbor(state, ns, 'bouquet_rose', NOW).ok).toBe(true);
    expect(giftToNeighbor(state, ns, 'bouquet_rose', NOW).ok).toBe(true);
    const fourth = giftToNeighbor(state, ns, 'bouquet_rose', NOW);
    expect(fourth.ok).toBe(false);
    expect(fourth.reason).toBe('msg.giftLimit');
  });

  it('种子和普通材料不能送人', () => {
    const state = makeGame();
    const ns = state.neighbors[0];
    state.inventory.seed_carrot = 1;
    expect(isGiftableItem('seed_carrot')).toBe(false);
    const r = giftToNeighbor(state, ns, 'seed_carrot', NOW);
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('msg.notGiftable');
    expect(giftableItems(state).some((i) => i.id === 'seed_carrot')).toBe(false);
  });

  it('好友度达到等级可领取一次回礼', () => {
    const state = makeGame();
    const ns = state.neighbors[0];
    ns.friendship = 40; // Lv.2
    const coins = state.player.coins;
    expect(nextNeighborReward(ns)?.level).toBe(2);

    const r = claimNeighborReward(state, ns);

    expect(r.ok).toBe(true);
    expect(state.player.coins).toBe(coins + 150);
    expect(ns.rewardTier).toBe(1);
    // 下一档需要 Lv.4
    expect(claimNeighborReward(state, ns).ok).toBe(false);
  });
});

describe('送礼存档迁移', () => {
  it('v12 邻居补齐送礼与回礼字段', () => {
    const state = makeGame();
    const raw = JSON.parse(JSON.stringify(state)) as GameState & Record<string, unknown>;
    raw.version = 12;
    const neighbors = raw.neighbors as unknown as Array<Record<string, unknown>>;
    delete neighbors[0].giftedToday;
    delete neighbors[0].rewardTier;
    delete (raw.stats as unknown as Record<string, unknown>).giftsGiven;

    const migrated = deserialize(JSON.stringify(raw), NOW);

    expect(migrated.version).toBe(31);
    expect(migrated.neighbors[0].giftedToday).toBe(0);
    expect(migrated.neighbors[0].rewardTier).toBe(0);
    expect(migrated.stats.giftsGiven).toBe(0);
  });
});
