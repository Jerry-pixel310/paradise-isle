/**
 * 鱼塘养殖：在鱼塘建筑中投放鱼苗，2 小时后收获更多同种鱼。
 * 每个鱼塘同时只能养一种鱼，最多 3 条；收获后保留鱼苗并重新计时。
 */
import type { ActionResult, GameState } from './types';
import { addItem, itemCount, removeItem } from './player';
import { fishDef } from './registry';
import { fail } from './types';

export const FISH_POND_ID = 'bld_fishpond';
export const POND_GROW_MS = 2 * 3600_000;
export const POND_MAX_STOCK = 3;

export interface PondState {
  fishId: string;
  count: number;
  stockedAt: number;
}

export function pondInfo(state: GameState, placementUid: number, now = Date.now()): {
  pond: PondState | null;
  remaining: number;
  ready: boolean;
} {
  const pond = state.fishPonds?.[String(placementUid)] ?? null;
  if (!pond) return { pond: null, remaining: 0, ready: false };
  const remaining = Math.max(0, pond.stockedAt + POND_GROW_MS - now);
  return { pond, remaining, ready: remaining <= 0 };
}

function isPond(state: GameState, uid: number): boolean {
  return state.placements.some((p) => p.uid === uid && p.defId === FISH_POND_ID);
}

export function stockPond(
  state: GameState, placementUid: number, fishId: string, now: number,
): ActionResult {
  if (!isPond(state, placementUid)) return fail('msg.notFound');
  fishDef(fishId);
  if (itemCount(state, fishId) < 1) return fail('msg.notEnough');
  if (!state.fishPonds) state.fishPonds = {};
  const pond = state.fishPonds[String(placementUid)];
  if (pond && pond.fishId !== fishId) return fail('msg.pondSpecies');
  if (pond && pond.count >= POND_MAX_STOCK) return fail('msg.pondFull');

  removeItem(state, fishId, 1);
  if (pond) {
    pond.count += 1;
    pond.stockedAt = now;
  } else {
    state.fishPonds[String(placementUid)] = { fishId, count: 1, stockedAt: now };
  }
  return {
    ok: true,
    events: [
      { type: 'toast', target: 'msg.pondStocked', data: fishId },
    ],
  };
}

export function harvestPond(state: GameState, placementUid: number, now: number): ActionResult {
  const pond = state.fishPonds?.[String(placementUid)];
  if (!pond) return fail('msg.pondEmpty');
  if (now - pond.stockedAt < POND_GROW_MS) return fail('msg.pondNotReady');
  const amount = pond.count + 1;
  addItem(state, pond.fishId, amount);
  pond.stockedAt = now;
  return {
    ok: true,
    events: [
      { type: 'pond', target: pond.fishId, amount: 1 },
      { type: 'toast', target: 'msg.pondHarvest', amount, data: pond.fishId },
    ],
  };
}

export function clearPond(state: GameState, placementUid: number): ActionResult {
  if (!state.fishPonds?.[String(placementUid)]) return fail('msg.pondEmpty');
  delete state.fishPonds[String(placementUid)];
  return { ok: true };
}
