/**
 * 每日岛民订单：每天 3 个收购订单（作物/鱼/采摘物/料理），
 * 交货换金币、声望与经验。订单由 (seed, 日期) 确定性生成。
 */
import type { ActionResult, GameState } from './types';
import { allCrops, allFish, allForage, allRecipes, itemDef } from './registry';
import { gainCoins, gainReputation, gainXp, itemCount, removeItem } from './player';
import { dayKey } from './quests';
import { hashSeed, mulberry32, pick, randInt } from './rng';
import { fail } from './types';

export type OrderKind = 'crop' | 'fish' | 'forage' | 'dish';

export interface OrderDef {
  id: string;
  itemId: string;
  kind: OrderKind;
  qty: number;
  coins: number;
  reputation: number;
  xp: number;
}

interface PoolEntry {
  id: string;
  kind: OrderKind;
  sell: number;
}

function pool(): PoolEntry[] {
  const out: PoolEntry[] = [];
  for (const c of allCrops()) {
    const sell = itemDef(c.produceId).sell;
    if (sell > 0) out.push({ id: c.produceId, kind: 'crop', sell });
  }
  for (const f of allFish()) out.push({ id: f.id, kind: 'fish', sell: f.sellPrice });
  for (const f of allForage()) out.push({ id: f.itemId, kind: 'forage', sell: f.sell });
  for (const r of allRecipes()) {
    if (r.tab !== 'cook') continue;
    const sell = itemDef(r.outputId).sell;
    if (sell > 0) out.push({ id: r.outputId, kind: 'dish', sell });
  }
  return out;
}

function rangeFor(kind: OrderKind): [number, number] {
  if (kind === 'fish') return [1, 3];
  if (kind === 'dish') return [1, 2];
  if (kind === 'forage') return [2, 6];
  return [3, 8];
}

function generateOrders(state: GameState, day: string): OrderDef[] {
  const rng = mulberry32(hashSeed(`${state.seed}:orders:${day}`));
  const entries = pool();
  const used = new Set<string>();
  const orders: OrderDef[] = [];
  let guard = 0;
  while (orders.length < 3 && guard < 80 && entries.length > 0) {
    guard++;
    const entry = pick(rng, entries);
    if (used.has(entry.id)) continue;
    used.add(entry.id);
    const [lo, hi] = rangeFor(entry.kind);
    const qty = randInt(rng, lo, hi);
    const value = entry.sell * qty;
    orders.push({
      id: `order_${day}_${orders.length}`,
      itemId: entry.id,
      kind: entry.kind,
      qty,
      coins: Math.round(value * 1.5 + 40),
      reputation: Math.max(2, Math.min(8, Math.round(value / 120))),
      xp: Math.round(value * 0.15) + 10,
    });
  }
  return orders;
}

export function syncOrders(state: GameState, now: number): void {
  const day = dayKey(now);
  if (!state.orders || state.orders.day !== day) {
    state.orders = { day, done: [] };
  }
}

export function dailyOrders(state: GameState, now: number): OrderDef[] {
  syncOrders(state, now);
  return generateOrders(state, state.orders.day);
}

export function orderDone(state: GameState, orderId: string): boolean {
  return state.orders?.done.includes(orderId) ?? false;
}

export function deliverOrder(state: GameState, orderId: string, now: number): ActionResult {
  const orders = dailyOrders(state, now);
  const order = orders.find((o) => o.id === orderId);
  if (!order) return fail('msg.notFound');
  if (orderDone(state, orderId)) return fail('msg.orderDone');
  if (itemCount(state, order.itemId) < order.qty) return fail('msg.notEnough');

  removeItem(state, order.itemId, order.qty);
  gainCoins(state, order.coins);
  gainReputation(state, order.reputation);
  const levelEvents = gainXp(state, order.xp);
  state.orders.done.push(orderId);

  return {
    ok: true,
    events: [
      { type: 'order', target: order.itemId, amount: 1 },
      { type: 'toast', target: 'msg.orderDelivered', amount: order.coins },
      ...levelEvents,
    ],
  };
}
