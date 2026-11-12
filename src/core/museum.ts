/**
 * 博物馆：把已发现的鱼类/野生/猎物/野兽捐进展柜。
 * 每个物种只能捐一次，不消耗背包物品；按捐赠总数领取里程碑奖励。
 */
import type { ActionResult, GameState, L10n } from './types';
import { allBeasts, allFish, allForage, allGame, itemDef } from './registry';
import { gainCoins, gainXp } from './player';
import { fail } from './types';

export const MUSEUM_ID = 'bld_museum';
export const MUSEUM_MILESTONES = [5, 15, 30, 50, 51] as const;
export const MUSEUM_COINS = [1000, 2500, 5000, 9000, 15000] as const;

export type MuseumKind = 'fish' | 'forage' | 'game' | 'beasts';

export interface MuseumSpecies {
  id: string;
  kind: MuseumKind;
  name: L10n;
}

export function museumCatalog(): MuseumSpecies[] {
  return [
    ...allFish().map((f) => ({ id: f.id, kind: 'fish' as const, name: f.name })),
    ...allForage().map((f) => ({ id: f.id, kind: 'forage' as const, name: f.name })),
    ...allGame().map((g) => ({ id: g.id, kind: 'game' as const, name: g.name })),
    ...allBeasts().map((b) => ({ id: b.id, kind: 'beasts' as const, name: b.name })),
  ];
}

export function speciesEncountered(state: GameState, id: string): boolean {
  return (state.collections.fish[id] ?? 0) > 0
    || (state.collections.forage[id] ?? 0) > 0
    || (state.collections.game[id] ?? 0) > 0
    || (state.collections.beasts[id] ?? 0) > 0;
}

export function museumDonated(state: GameState, id: string): boolean {
  return state.museum?.donated.includes(id) ?? false;
}

export interface MuseumInfo {
  donated: number;
  total: number;
  claimed: number;
  next: number | null;
  canClaim: boolean;
}

export function museumInfo(state: GameState): MuseumInfo {
  const donated = state.museum?.donated.length ?? 0;
  const claimed = state.museum?.claimed ?? 0;
  return {
    donated,
    total: museumCatalog().length,
    claimed,
    next: claimed < MUSEUM_MILESTONES.length ? MUSEUM_MILESTONES[claimed] : null,
    canClaim: claimed < MUSEUM_MILESTONES.length && donated >= MUSEUM_MILESTONES[claimed],
  };
}

export function donateToMuseum(state: GameState, id: string): ActionResult {
  const species = museumCatalog().find((s) => s.id === id);
  if (!species) return fail('msg.notFound');
  if (!speciesEncountered(state, id)) return fail('msg.museumUndiscovered');
  if (!state.museum) state.museum = { donated: [], claimed: 0 };
  if (state.museum.donated.includes(id)) return fail('msg.museumAlready');
  state.museum.donated.push(id);
  return {
    ok: true,
    events: [
      { type: 'museum', target: id, amount: 1 },
      { type: 'toast', target: 'msg.museumDonated', data: id },
    ],
  };
}

export function claimMuseumMilestone(state: GameState): ActionResult {
  const info = museumInfo(state);
  if (info.claimed >= MUSEUM_MILESTONES.length) return fail('msg.allClaimed');
  if (info.donated < MUSEUM_MILESTONES[info.claimed]) return fail('msg.notReady');
  const idx = info.claimed;
  state.museum.claimed += 1;
  gainCoins(state, MUSEUM_COINS[idx]);
  const levelEvents = gainXp(state, Math.round(MUSEUM_COINS[idx] / 5));
  return {
    ok: true,
    events: [
      { type: 'toast', target: 'msg.museumMilestone', amount: MUSEUM_COINS[idx] },
      ...levelEvents,
    ],
  };
}

export function museumItemName(id: string): L10n {
  return itemDef(id).name;
}