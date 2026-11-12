/**
 * 花卉杂交：两株相邻、同种、都已成熟的花 → 消耗掉并结出种子。
 * 基础花卉有概率结出杂交品种（蓝玫瑰 / 黑郁金香 / 彩虹绣球）。
 */
import type { ActionResult, GameState } from './types';
import { cropDef } from './registry';
import { cropView } from './crops';
import { ENERGY_COST } from './balance';
import { addItem, gainXp, spendEnergy } from './player';
import { crossFlowerGenes, randomFlowerGenes } from './genes';
import { roll } from './rng';
import { fail } from './types';

export const HYBRID_MAP: Record<string, string> = {
  crop_rose: 'crop_blue_rose',
  crop_tulip: 'crop_black_tulip',
  crop_hydrangea: 'crop_rainbow_hydrangea',
};

export function canCross(state: GameState, aUid: number, bUid: number, now = Date.now()): string | null {
  if (aUid === bUid) return 'msg.crossSame';
  const a = state.plots.find((p) => p.uid === aUid);
  const b = state.plots.find((p) => p.uid === bUid);
  if (!a?.crop || !b?.crop) return 'msg.noCrop';
  if (Math.abs(a.x - b.x) + Math.abs(a.y - b.y) !== 1) return 'msg.crossAdjacent';
  if (a.crop.defId !== b.crop.defId) return 'msg.crossSpecies';
  const def = cropDef(a.crop.defId);
  if (!def.isFlower) return 'msg.crossFlower';
  if (cropView(a.crop, now).stage !== 'ready' || cropView(b.crop, now).stage !== 'ready') {
    return 'msg.notReady';
  }
  return null;
}

export function crossPollinate(state: GameState, aUid: number, bUid: number, now: number): ActionResult {
  const err = canCross(state, aUid, bUid, now);
  if (err) return fail(err);
  const a = state.plots.find((p) => p.uid === aUid)!;
  const b = state.plots.find((p) => p.uid === bUid)!;
  const def = cropDef(a.crop!.defId);
  if (!spendEnergy(state, ENERGY_COST.craft, now)) return fail('msg.noEnergy');

  const hybridId = HYBRID_MAP[def.id];
  // 60% 出杂交种子，否则结回一颗普通种子（保底不亏）
  const hybrid = !!hybridId && roll() < 0.6;
  const seedId = cropDef(hybrid ? hybridId : def.id).seedId;
  const childGenes = crossFlowerGenes(
    a.crop!.genes ?? randomFlowerGenes(def.id),
    b.crop!.genes ?? randomFlowerGenes(def.id),
  );
  if (!state.seedBank) state.seedBank = {};
  const bank = state.seedBank[seedId] ?? [];
  state.seedBank[seedId] = [...bank, childGenes].slice(-20);
  a.crop = null;
  b.crop = null;
  addItem(state, seedId, 1);
  const levelEvents = gainXp(state, hybrid ? 30 : 12);
  return {
    ok: true,
    events: [
      { type: 'breed', target: def.id, amount: 1 },
      { type: 'toast', target: hybrid ? 'msg.crossNew' : 'msg.crossOk', data: seedId },
      { type: 'toast', target: 'msg.geneInherited', amount: childGenes.generation },
      ...levelEvents,
    ],
  };
}
