/**
 * 手作：烹饪与花艺。消耗背包材料 → 产出料理/花束，消耗 1 点能量。
 */
import type { ActionResult, GameState, RecipeDef } from './types';
import { recipeDef } from './registry';
import { ENERGY_COST } from './balance';
import { addItem, gainXp, itemCount, removeItem, spendEnergy } from './player';
import { kitchenCraftBonus } from './interior';
import { fail } from './types';

export function canCraft(state: GameState, def: RecipeDef): boolean {
  return Object.entries(def.inputs).every(([id, n]) => itemCount(state, id) >= n);
}

export function craft(state: GameState, recipeId: string, now: number): ActionResult {
  const def = recipeDef(recipeId);
  if (!canCraft(state, def)) return fail('msg.notEnough');
  if (!spendEnergy(state, ENERGY_COST.craft, now)) return fail('msg.noEnergy');
  for (const [id, n] of Object.entries(def.inputs)) removeItem(state, id, n);
  addItem(state, def.outputId, def.outputCount);
  const xp = def.tab === 'cook' ? Math.round(def.xp * kitchenCraftBonus(state)) : def.xp;
  const levelEvents = gainXp(state, xp);
  return {
    ok: true,
    events: [
      { type: 'craft', target: def.id, amount: def.outputCount },
      { type: 'toast', target: 'msg.crafted', data: def.outputId },
      ...levelEvents,
    ],
  };
}
