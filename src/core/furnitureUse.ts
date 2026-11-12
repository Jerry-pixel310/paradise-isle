/**
 * 家具互动：床/沙发/壁炉/电视每天可使用一次，恢复能量。
 */
import type { ActionResult, GameState, RoomId } from './types';
import { furnitureDef } from './registry';
import { roomPlacements } from './interior';
import { dayKey } from './quests';
import { gainEnergy } from './player';
import { maxEnergy } from './balance';
import { fail } from './types';

export const FURNITURE_EFFECT: Record<string, number> = {
  bed: 30,
  sofa: 10,
  fireplace: 8,
  tv: 5,
};

export function furnitureUsedToday(state: GameState, uid: number, now: number): boolean {
  return state.furnitureUses?.[String(uid)] === dayKey(now);
}

export function useFurniture(
  state: GameState, room: RoomId, uid: number, now: number,
): ActionResult {
  const placement = roomPlacements(state, room).find((p) => p.uid === uid);
  if (!placement) return fail('msg.notFound');
  const def = furnitureDef(placement.defId);
  const effect = FURNITURE_EFFECT[def.slot];
  if (!effect) return fail('msg.noUse');
  if (furnitureUsedToday(state, uid, now)) return fail('msg.furnitureUsed');
  if (state.player.energy >= maxEnergy(state.player.level)) return fail('msg.energyFull');

  const before = state.player.energy;
  gainEnergy(state, effect);
  const gained = state.player.energy - before;
  if (!state.furnitureUses) state.furnitureUses = {};
  state.furnitureUses[String(uid)] = dayKey(now);
  return {
    ok: true,
    events: [
      { type: 'furniture', target: def.slot, amount: 1 },
      { type: 'toast', target: 'msg.furnitureUse', amount: gained },
    ],
  };
}
