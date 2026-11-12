/** 鱼饵系统测试 */
import { describe, expect, it } from 'vitest';
import { makeGame, NOW } from './helpers';
import { baitWeight, castLine, catchTable } from '../src/core/fishing';
import { buyBait } from '../src/core/economy';
import { baitDef } from '../src/core/registry';
import { ENERGY_COST } from '../src/core/balance';
import { DAY_MS } from '../src/core/calendar';
import type { FishRarity } from '../src/core/types';

function rareShare(t: { fish: { rarity: string }[]; weights: number[] }): number {
  let rare = 0;
  let total = 0;
  t.fish.forEach((f, i) => {
    total += t.weights[i];
    if (f.rarity === 'rare' || f.rarity === 'epic' || f.rarity === 'legendary') rare += t.weights[i];
  });
  return rare / total;
}

describe('鱼饵', () => {
  it('甩竿消耗鱼饵并触发统计事件', () => {
    const state = makeGame();
    state.inventory.item_bait_worm = 2;
    const e = state.player.energy;

    const r = castLine(state, NOW, 'bait_worm');

    expect(r.ok).toBe(true);
    expect(state.inventory.item_bait_worm).toBe(1);
    expect(state.player.energy).toBe(e - ENERGY_COST.fishCast);
    expect(r.events?.some((ev) => ev.type === 'bait')).toBe(true);
  });

  it('没有鱼饵时无法使用该鱼饵', () => {
    const state = makeGame();
    const r = castLine(state, NOW, 'bait_glow');
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('msg.noBait');
  });

  it('夜光饵在夜间显著提升稀有鱼权重', () => {
    const state = makeGame();
    state.player.rodTier = 3;
    // 夏天夜里才有可钓的稀有鱼（狮子鱼等）
    const night = NOW + 7 * DAY_MS + 10 * 60_000;

    const plain = catchTable(state, night);
    const glow = catchTable(state, night, 'bait_glow');
    expect(rareShare(glow)).toBeGreaterThan(rareShare(plain));
  });

  it('蚯蚓饵提升常见鱼权重、降低传说鱼权重', () => {
    expect(baitWeight('bait_worm', 'common', false)).toBeGreaterThan(1);
    expect(baitWeight('bait_worm', 'legendary', false)).toBeLessThan(1);
    expect(baitWeight(undefined, 'legendary', false)).toBe(1);
    const rarities: FishRarity[] = ['common', 'rare', 'legendary'];
    for (const r of rarities) expect(baitWeight('bait_shrimp', r, false)).toBeGreaterThan(0);
  });

  it('商店购买鱼饵会扣钱并进背包', () => {
    const state = makeGame();
    const coins = state.player.coins;
    const def = baitDef('bait_honey');

    const r = buyBait(state, 'bait_honey', 5);

    expect(r.ok).toBe(true);
    expect(state.inventory[def.itemId]).toBe(5);
    expect(state.player.coins).toBe(coins - def.price * 5);
  });
});
