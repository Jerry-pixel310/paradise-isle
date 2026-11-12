/** 餐厅经营测试 */
import { describe, expect, it } from 'vitest';
import { makeGame, NOW } from './helpers';
import {
  restaurantPreview, serveRestaurant, setRestaurantMenu,
} from '../src/core/restaurant';
import { allRecipes } from '../src/core/registry';
import { applyEvents } from '../src/core/quests';
import { deserialize } from '../src/save/save';

function setup() {
  const state = makeGame();
  state.placements.push({ uid: 700, defId: 'bld_restaurant', x: 8, y: 8, rot: 0 });
  const dish = allRecipes().find((r) => r.tab === 'cook')!.outputId;
  state.inventory[dish] = 8;
  return { state, dish };
}

describe('餐厅经营', () => {
  it('设置菜单并预览营业额', () => {
    const { state, dish } = setup();
    expect(setRestaurantMenu(state, 700, 0, dish).ok).toBe(true);
    const p = restaurantPreview(state, 700);
    expect(p.lines).toHaveLength(1);
    expect(p.lines[0].qty).toBe(5);
    expect(p.totalCoins).toBeGreaterThan(0);
    expect(p.reputation).toBeGreaterThan(0);
  });

  it('营业会消耗料理、发放金币，且每天一次', () => {
    const { state, dish } = setup();
    setRestaurantMenu(state, 700, 0, dish);
    const coins = state.player.coins;

    const r = serveRestaurant(state, 700, NOW);

    expect(r.ok).toBe(true);
    expect(state.inventory[dish]).toBe(3);
    expect(state.player.coins).toBeGreaterThan(coins);
    applyEvents(state, r.events!, NOW);
    expect(state.stats.restaurantServices).toBe(1);

    const again = serveRestaurant(state, 700, NOW);
    expect(again.ok).toBe(false);
    expect(again.reason).toBe('msg.restaurantDone');

    // 次日可继续营业（只剩 3 份）
    expect(serveRestaurant(state, 700, NOW + 24 * 3600_000).ok).toBe(true);
  });

  it('不能重复设置同一道菜，也不能用非料理', () => {
    const { state, dish } = setup();
    expect(setRestaurantMenu(state, 700, 0, dish).ok).toBe(true);
    expect(setRestaurantMenu(state, 700, 1, dish).reason).toBe('msg.menuDup');
    expect(setRestaurantMenu(state, 700, 1, 'produce_carrot').reason).toBe('msg.notDish');
  });

  it('没有菜单或没有料理时不能营业', () => {
    const { state, dish } = setup();
    expect(serveRestaurant(state, 700, NOW).reason).toBe('msg.restaurantNoMenu');
    state.inventory[dish] = 0;
    setRestaurantMenu(state, 700, 0, dish);
    expect(serveRestaurant(state, 700, NOW).reason).toBe('msg.restaurantNoDishes');
  });
});

describe('餐厅存档迁移', () => {
  it('v25 补齐 restaurants 与 restaurantServices', () => {
    const { state } = setup();
    const raw = JSON.parse(JSON.stringify(state)) as Record<string, unknown>;
    raw.version = 25;
    delete raw.restaurants;
    delete (raw.stats as unknown as Record<string, unknown>).restaurantServices;

    const migrated = deserialize(JSON.stringify(raw), NOW);

    expect(migrated.version).toBe(31);
    expect(migrated.restaurants).toEqual({});
    expect(migrated.stats.restaurantServices).toBe(0);
  });
});
