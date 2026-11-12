/** 牧场加工测试 */
import { describe, expect, it } from 'vitest';
import { makeGame, NOW } from './helpers';
import { craft } from '../src/core/craft';
import { allRecipes, itemDef } from '../src/core/registry';

describe('牧场加工', () => {
  it('牛奶可做黄油与奶酪', () => {
    const state = makeGame();
    state.inventory.good_cow = 3;
    const energy = state.player.energy;

    expect(craft(state, 'recipe_butter', NOW).ok).toBe(true);
    expect(state.inventory.good_butter).toBe(1);
    expect(state.inventory.good_cow).toBe(2);

    expect(craft(state, 'recipe_cheese', NOW).ok).toBe(true);
    expect(state.inventory.good_cheese).toBe(1);
    expect(state.inventory.good_cow ?? 0).toBe(0);
    expect(state.player.energy).toBe(energy - 2);
    expect(itemDef('good_cheese').sell).toBeGreaterThan(itemDef('good_cow').sell);
  });

  it('羊毛纺线再织布', () => {
    const state = makeGame();
    state.inventory.good_sheep = 4;
    expect(craft(state, 'recipe_yarn', NOW).ok).toBe(true);
    expect(state.inventory.good_yarn).toBe(1);
    expect(craft(state, 'recipe_cloth', NOW).ok).toBe(true);
    expect(state.inventory.good_cloth).toBe(1);
    expect(state.inventory.good_sheep ?? 0).toBe(0);
    expect(state.inventory.good_yarn ?? 0).toBe(0);
  });

  it('鸡蛋与牛奶可做蛋挞', () => {
    const state = makeGame();
    state.inventory.good_chicken = 2;
    state.inventory.good_cow = 1;
    expect(craft(state, 'recipe_egg_tart', NOW).ok).toBe(true);
    expect(state.inventory.dish_egg_tart).toBe(1);
  });

  it('牧场加工配方都已注册且可制作', () => {
    const ranch = allRecipes().filter((r) => r.tab === 'ranch');
    expect(ranch.length).toBe(7);
    for (const r of ranch) {
      expect(() => itemDef(r.outputId)).not.toThrow();
      for (const id of Object.keys(r.inputs)) expect(() => itemDef(id)).not.toThrow();
    }
  });
});
