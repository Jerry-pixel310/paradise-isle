/** 鱼竿升级与深海鱼测试 */
import { describe, expect, it } from 'vitest';
import { makeGame, NOW } from './helpers';
import { upgradeRod } from '../src/core/economy';
import { catchTable } from '../src/core/fishing';
import { allFish } from '../src/core/registry';

const DEEP = ['fish_abysslantern', 'fish_crystalray', 'fish_aurorafish'];
const ABYSS = ['fish_leviathan', 'fish_voidwhale'];

describe('鱼竿升级', () => {
  it('可以升到 5 级，价格递增，满级后失败', () => {
    const state = makeGame();
    state.player.coins = 100000;
    const prices: number[] = [];
    for (let i = 0; i < 4; i++) {
      const before = state.player.coins;
      expect(upgradeRod(state).ok).toBe(true);
      prices.push(before - state.player.coins);
    }
    expect(state.player.rodTier).toBe(5);
    expect(prices).toEqual([800, 5000, 15000, 40000]);
    expect(upgradeRod(state).ok).toBe(false);
    expect(upgradeRod(state).reason).toBe('msg.maxRod');
  });
});

describe('深海鱼', () => {
  it('鱼竿等级会过滤深海鱼', () => {
    const state = makeGame();
    expect(allFish().filter((f) => f.minRodTier >= 4).length).toBe(5);

    state.player.rodTier = 3;
    const at3 = catchTable(state, NOW).fish.map((f) => f.id);
    expect(at3.some((id) => DEEP.includes(id) || ABYSS.includes(id))).toBe(false);

    state.player.rodTier = 4;
    const at4 = catchTable(state, NOW).fish.map((f) => f.id);
    expect(at4.some((id) => ABYSS.includes(id))).toBe(false);

    state.player.rodTier = 5;
    const all = allFish().filter((f) => f.minRodTier <= 5);
    expect(all.length).toBe(35);
  });
});
