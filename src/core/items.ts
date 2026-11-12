/**
 * 消耗品：料理/饮品可以食用，恢复能量与食物。
 */
import type { ActionResult, GameState } from './types';
import { itemDef } from './registry';
import { gainEnergy, gainFood, itemCount, removeItem } from './player';
import { fail } from './types';

export function eatItem(state: GameState, itemId: string): ActionResult {
  const def = itemDef(itemId);
  if (!def.useEnergy && !def.useFood) return fail('msg.cannotEat');
  if (itemCount(state, itemId) < 1) return fail('msg.notEnough');
  removeItem(state, itemId, 1);
  if (def.useEnergy) gainEnergy(state, def.useEnergy);
  if (def.useFood) gainFood(state, def.useFood);
  return { ok: true, events: [{ type: 'toast', target: 'msg.ate', data: itemId }] };
}
