/**
 * 钓鱼系统：甩竿（耗能量）→ 咬钩时机 → 收线小游戏 → 按稀有度出鱼。
 * 概率表由鱼竿等级决定；猫宠物（lucky_fish）提升稀有概率。
 */
import type { ActionResult, FishDef, FishRarity, GameState } from './types';
import { allFish, baitDef, fishDef } from './registry';
import { ENERGY_COST } from './balance';
import { addItem, gainCoins, gainXp, petHasSkill, removeItem, spendEnergy } from './player';
import { calendarAt, isWetWeather } from './calendar';
import { roll, rollWeighted } from './rng';
import { fail } from './types';

/** 稀有度基础权重（乘以鱼竿修正） */
const RARITY_WEIGHT: Record<FishRarity, number> = {
  common: 100,
  uncommon: 40,
  rare: 12,
  epic: 3,
  legendary: 0.6,
};

/** 鱼竿等级对高稀有度的放大 */
function rodBoost(rodTier: number, rarity: FishRarity): number {
  const idx = ['common', 'uncommon', 'rare', 'epic', 'legendary'].indexOf(rarity);
  return Math.pow(1 + (rodTier - 1) * 0.35, idx);
}

/** 鱼饵对稀有度的权重修正 */
export function baitWeight(baitId: string | undefined, rarity: FishRarity, night: boolean): number {
  if (!baitId) return 1;
  switch (baitId) {
    case 'bait_worm':
      if (rarity === 'common') return 1.7;
      if (rarity === 'uncommon') return 1.15;
      if (rarity === 'rare') return 0.85;
      return 0.8;
    case 'bait_shrimp':
      if (rarity === 'uncommon') return 1.7;
      if (rarity === 'rare') return 1.4;
      if (rarity === 'common') return 0.9;
      return 1.05;
    case 'bait_glow':
      if (rarity === 'epic') return night ? 1.9 : 0.9;
      if (rarity === 'legendary') return night ? 1.6 : 0.85;
      if (rarity === 'rare') return night ? 1.2 : 0.9;
      return 0.75;
    case 'bait_honey':
      if (rarity === 'rare' || rarity === 'epic' || rarity === 'legendary') return 1.3;
      return 1.05;
    default:
      return 1;
  }
}

/**
 * 当前可钓的鱼与权重。
 * 传入 now 时按季节/天气/昼夜过滤，并按天气与鱼饵给稀有鱼加权；不传则返回全部（兼容旧调用/测试）。
 */
export function catchTable(
  state: GameState, now?: number, baitId?: string,
): { fish: FishDef[]; weights: number[] } {
  const luckyBonus = state.pets.some((p) => petHasSkill(state, p.defId, 'lucky_fish')) ? 1.15 : 1;
  const cal = now === undefined ? null : calendarAt(state.createdAt, now, state.seed);
  const wet = cal ? isWetWeather(cal.weather) : false;
  const night = cal ? cal.hour >= 20 || cal.hour < 6 : false;
  const buffed = now !== undefined && (state.buffs?.luckyFishUntil ?? 0) > now;
  const fish = allFish().filter((f) => {
    if (f.minRodTier > state.player.rodTier) return false;
    if (!cal) return true;
    if (f.seasons && !f.seasons.includes(cal.season)) return false;
    if (f.weather && !f.weather.includes(cal.weather)) return false;
    if (f.time === 'night' && !night) return false;
    if (f.time === 'day' && night) return false;
    return true;
  });
  const weights = fish.map((f) => {
    let w = RARITY_WEIGHT[f.rarity] * rodBoost(state.player.rodTier, f.rarity);
    if (f.rarity !== 'common' && f.rarity !== 'uncommon') {
      w *= luckyBonus;
      if (buffed) w *= 1.25; // 猫咪主动技能：幸运钓鱼
      if (wet) w *= 1.35; // 雨天稀有鱼更活跃
    }
    w *= baitWeight(baitId, f.rarity, night);
    return w;
  });
  return { fish, weights };
}

/** 甩竿：扣能量、消耗鱼饵，成功与否由收线小游戏决定 */
export function castLine(state: GameState, now: number, baitId?: string): ActionResult {
  if (baitId) {
    const bait = baitDef(baitId);
    if ((state.inventory[bait.itemId] || 0) < 1) return fail('msg.noBait');
  }
  if (!spendEnergy(state, ENERGY_COST.fishCast, now)) return fail('msg.noEnergy');
  if (baitId) {
    const bait = baitDef(baitId);
    removeItem(state, bait.itemId, 1);
    return { ok: true, events: [{ type: 'bait', target: baitId, amount: 1 }] };
  }
  return { ok: true };
}

export interface CatchResult {
  fish: FishDef | null;   // null = 跑掉了
  isNew: boolean;
  amountXp: number;
}

/**
 * 收线结算。quality ∈ [0,1]：收线小游戏保持在区间内的时间占比。
 * <0.45 鱼跑掉；否则按概率表出鱼，quality 高时再往上顶一档稀有度。
 */
export function resolveCatch(
  state: GameState, quality: number, now?: number, baitId?: string,
): ActionResult & { catch?: CatchResult } {
  if (quality < 0.45) {
    return { ok: true, catch: { fish: null, isNew: false, amountXp: 0 } };
  }
  const { fish, weights } = catchTable(state, now, baitId);
  if (fish.length === 0) return fail('msg.noFish');
  let caught = rollWeighted(fish, weights);
  // 高质量收线：30% 概率在同稀有度里换成更贵的鱼
  if (quality > 0.85 && roll() < 0.3) {
    const better = fish.filter((f) => f.rarity === caught.rarity && f.sellPrice > caught.sellPrice);
    if (better.length > 0) caught = better[Math.floor(roll() * better.length)];
  }
  const prev = state.collections.fish[caught.id] || 0;
  state.collections.fish[caught.id] = prev + 1;
  addItem(state, caught.id, 1);
  const levelEvents = gainXp(state, caught.xp);
  const events: NonNullable<ActionResult['events']> = [
    { type: 'fishCatch', target: caught.rarity, amount: 1, data: caught.id },
    ...levelEvents,
  ];
  if (prev === 0) {
    gainCoins(state, 30);
    events.push({ type: 'toast', target: 'msg.dexReward', amount: 30 });
  }
  return {
    ok: true,
    catch: { fish: caught, isNew: prev === 0, amountXp: caught.xp },
    events,
  };
}

/** 图鉴完成度 */
export function fishCollectionProgress(state: GameState): { caught: number; total: number } {
  const total = allFish().length;
  const caught = Object.keys(state.collections.fish).filter((id) => {
    try { return fishDef(id) && (state.collections.fish[id] || 0) > 0; } catch { return false; }
  }).length;
  return { caught, total };
}
