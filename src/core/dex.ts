/**
 * 图鉴里程碑：鱼类 / 野生 / 猎物 / 野兽按唯一收集数分四档发奖。
 */
import type { ActionResult, CollectionsState, DexCategory, GameState } from './types';
import { allBeasts, allFish, allForage, allGame } from './registry';
import { gainCoins, gainXp } from './player';
import { fail } from './types';

export const DEX_CATEGORIES: DexCategory[] = ['fish', 'forage', 'game', 'beasts'];
export const DEX_TIER_COINS = [250, 600, 1200, 2500] as const;
export const DEX_TIER_XP = [50, 100, 200, 400] as const;

function totals(): Record<DexCategory, number> {
  return {
    fish: allFish().length,
    forage: allForage().length,
    game: allGame().length,
    beasts: allBeasts().length,
  };
}

function bucket(state: GameState, category: DexCategory): Record<string, number> {
  const c: CollectionsState = state.collections;
  if (category === 'fish') return c.fish;
  if (category === 'forage') return c.forage;
  if (category === 'game') return c.game;
  return c.beasts;
}

export function dexTiers(total: number): number[] {
  return [0.25, 0.5, 0.75, 1].map((r) => Math.ceil(total * r));
}

export interface DexProgress {
  category: DexCategory;
  have: number;
  total: number;
  tiers: number[];
  claimed: number;
  next: number | null;
  canClaim: boolean;
}

export function dexProgress(state: GameState, category: DexCategory): DexProgress {
  const total = totals()[category];
  const held = bucket(state, category);
  const have = Object.values(held).filter((n) => n > 0).length;
  const tiers = dexTiers(total);
  const claimed = state.collections.claimed?.[category] ?? 0;
  const next = claimed < tiers.length ? tiers[claimed] : null;
  return {
    category,
    have,
    total,
    tiers,
    claimed,
    next,
    canClaim: next !== null && have >= next,
  };
}

export function dexProgressAll(state: GameState): DexProgress[] {
  return DEX_CATEGORIES.map((c) => dexProgress(state, c));
}

export function dexSummary(state: GameState): { claimed: number; total: number } {
  const list = dexProgressAll(state);
  return {
    claimed: list.reduce((a, p) => a + p.claimed, 0),
    total: list.length * 4,
  };
}

export function claimDexReward(state: GameState, category: DexCategory): ActionResult {
  const p = dexProgress(state, category);
  if (p.claimed >= p.tiers.length) return fail('msg.allClaimed');
  if (p.have < p.tiers[p.claimed]) return fail('msg.notReady');
  const idx = p.claimed;
  state.collections.claimed[category] = idx + 1;
  gainCoins(state, DEX_TIER_COINS[idx]);
  const levelEvents = gainXp(state, DEX_TIER_XP[idx]);
  return {
    ok: true,
    events: [
      { type: 'dex', target: category, amount: 1 },
      { type: 'toast', target: 'msg.dexMilestone', amount: DEX_TIER_COINS[idx] },
      ...levelEvents,
    ],
  };
}
