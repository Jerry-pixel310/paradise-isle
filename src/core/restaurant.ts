/**
 * 餐厅经营：给餐厅设置最多 2 道料理菜单，每天营业一次，
 * 自动消耗背包里的菜单料理（每道最多 5 份），按售价加成换成金币、声望与经验。
 */
import type { ActionResult, GameState } from './types';
import { allRecipes, itemDef } from './registry';
import { dayKey } from './quests';
import { gainCoins, gainReputation, gainXp, itemCount, removeItem } from './player';
import { fail } from './types';

export const RESTAURANT_ID = 'bld_restaurant';
export const MAX_MENU = 2;
export const SERVE_PER_DISH = 5;
export const DISH_MARKUP = 1.5;

export interface RestaurantState {
  menu: (string | null)[];
  lastDay: string;
}

export function isCookDish(id: string): boolean {
  return allRecipes().some((r) => r.tab === 'cook' && r.outputId === id);
}

function ensure(state: GameState, uid: number): RestaurantState {
  if (!state.restaurants) state.restaurants = {};
  const key = String(uid);
  if (!state.restaurants[key]) state.restaurants[key] = { menu: [null, null], lastDay: '' };
  return state.restaurants[key];
}

function isRestaurant(state: GameState, uid: number): boolean {
  return state.placements.some((p) => p.uid === uid && p.defId === RESTAURANT_ID);
}

export function restaurantAt(state: GameState, uid: number): RestaurantState | null {
  return state.restaurants?.[String(uid)] ?? null;
}

export function restaurantDoneToday(state: GameState, uid: number, now: number): boolean {
  return restaurantAt(state, uid)?.lastDay === dayKey(now);
}

export function setRestaurantMenu(
  state: GameState, uid: number, slot: number, dishId: string,
): ActionResult {
  if (!isRestaurant(state, uid)) return fail('msg.notFound');
  if (slot < 0 || slot >= MAX_MENU) return fail('msg.notFound');
  if (!isCookDish(dishId)) return fail('msg.notDish');
  const r = ensure(state, uid);
  if (r.menu[1 - slot] === dishId) return fail('msg.menuDup');
  r.menu[slot] = dishId;
  return { ok: true, events: [{ type: 'toast', target: 'msg.menuUpdated', data: dishId }] };
}

export interface RestaurantPreview {
  lines: Array<{ dishId: string; qty: number; coins: number }>;
  totalCoins: number;
  reputation: number;
  xp: number;
}

export function restaurantPreview(state: GameState, uid: number): RestaurantPreview {
  const r = restaurantAt(state, uid);
  if (!r) return { lines: [], totalCoins: 0, reputation: 0, xp: 0 };
  const lines = [];
  let totalCoins = 0;
  let totalDishes = 0;
  for (const dishId of r.menu) {
    if (!dishId) continue;
    const qty = Math.min(SERVE_PER_DISH, itemCount(state, dishId));
    if (qty <= 0) continue;
    const coins = Math.round(itemDef(dishId).sell * qty * DISH_MARKUP);
    lines.push({ dishId, qty, coins });
    totalCoins += coins;
    totalDishes += qty;
  }
  return {
    lines,
    totalCoins,
    reputation: Math.min(8, 1 + Math.floor(totalDishes / 3)),
    xp: totalDishes * 6,
  };
}

export function serveRestaurant(state: GameState, uid: number, now: number): ActionResult {
  if (!isRestaurant(state, uid)) return fail('msg.notFound');
  const r = ensure(state, uid);
  if (r.menu.every((m) => !m)) return fail('msg.restaurantNoMenu');
  const day = dayKey(now);
  if (r.lastDay === day) return fail('msg.restaurantDone');

  const preview = restaurantPreview(state, uid);
  if (preview.totalCoins <= 0) return fail('msg.restaurantNoDishes');

  for (const line of preview.lines) removeItem(state, line.dishId, line.qty);
  gainCoins(state, preview.totalCoins);
  gainReputation(state, preview.reputation);
  const levelEvents = gainXp(state, preview.xp);
  r.lastDay = day;
  return {
    ok: true,
    events: [
      { type: 'restaurant', target: 'island', amount: 1 },
      { type: 'toast', target: 'msg.restaurantServe', amount: preview.totalCoins },
      ...levelEvents,
    ],
  };
}
