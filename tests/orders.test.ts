/** 每日岛民订单测试 */
import { describe, expect, it } from 'vitest';
import { makeGame, NOW } from './helpers';
import { dailyOrders, deliverOrder, orderDone } from '../src/core/orders';
import { addItem, itemCount } from '../src/core/player';
import { applyEvents } from '../src/core/quests';
import { deserialize } from '../src/save/save';

describe('每日订单', () => {
  it('每天生成 3 个确定性订单', () => {
    const state = makeGame();
    const a = dailyOrders(state, NOW);
    const b = dailyOrders(state, NOW);
    expect(a).toHaveLength(3);
    expect(new Set(a.map((o) => o.id)).size).toBe(3);
    expect(a).toEqual(b);
    for (const o of a) {
      expect(o.qty).toBeGreaterThan(0);
      expect(o.coins).toBeGreaterThan(0);
      expect(o.xp).toBeGreaterThan(0);
    }
  });

  it('交货消耗物品并发放奖励，订单只能交一次', () => {
    const state = makeGame();
    const order = dailyOrders(state, NOW)[0];
    addItem(state, order.itemId, order.qty);
    const coins = state.player.coins;

    const r = deliverOrder(state, order.id, NOW);

    expect(r.ok).toBe(true);
    expect(state.player.coins).toBe(coins + order.coins);
    expect(itemCount(state, order.itemId)).toBe(0);
    expect(orderDone(state, order.id)).toBe(true);
    applyEvents(state, r.events!, NOW);
    expect(state.stats.ordersDone).toBe(1);

    const again = deliverOrder(state, order.id, NOW);
    expect(again.ok).toBe(false);
    expect(again.reason).toBe('msg.orderDone');
  });

  it('物品不足时不能交货', () => {
    const state = makeGame();
    const order = dailyOrders(state, NOW)[1];
    const r = deliverOrder(state, order.id, NOW);
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('msg.notEnough');
  });

  it('跨天会刷新订单与完成记录', () => {
    const state = makeGame();
    const order = dailyOrders(state, NOW)[0];
    addItem(state, order.itemId, order.qty);
    deliverOrder(state, order.id, NOW);
    expect(state.orders.done).toHaveLength(1);

    const next = dailyOrders(state, NOW + 24 * 3600_000);
    expect(next).toHaveLength(3);
    expect(state.orders.done).toHaveLength(0);
  });
});

describe('订单存档迁移', () => {
  it('v18 补齐 orders 与 ordersDone', () => {
    const state = makeGame();
    const raw = JSON.parse(JSON.stringify(state)) as Record<string, unknown>;
    raw.version = 18;
    delete raw.orders;
    delete (raw.stats as unknown as Record<string, unknown>).ordersDone;

    const migrated = deserialize(JSON.stringify(raw), NOW);

    expect(migrated.version).toBe(31);
    expect(migrated.orders).toEqual({ day: '', done: [] });
    expect(migrated.stats.ordersDone).toBe(0);
  });
});
