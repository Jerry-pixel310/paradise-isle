/**
 * 岛屿评级：综合美观度、岛主等级、宠物、邻居好友度、图鉴与成就，
 * 计算 1-5 星评分，并按星级领取一次性奖励。
 */
import type { ActionResult, GameState } from './types';
import { beautyScore } from './build';
import { achievementSummary } from './quests';
import { friendshipLevel } from './balance';
import { allBeasts, allFish, allForage, allGame } from './registry';
import { gainCoins, gainXp } from './player';
import { fail } from './types';

export const RATING_THRESHOLDS = [100, 300, 700, 1400, 2500] as const;
export const RATING_REWARDS = [500, 1000, 2000, 3500, 6000] as const;
export const RATING_XP = [80, 150, 250, 400, 700] as const;

export interface RatingBreakdown {
  beauty: number;
  level: number;
  pets: number;
  neighbors: number;
  dex: number;
  achievements: number;
}

function unique(map: Record<string, number>): number {
  return Object.values(map).filter((n) => n > 0).length;
}

export function ratingBreakdown(state: GameState): RatingBreakdown {
  const achievementTiers = achievementSummary(state).claimedTiers;
  const neighborPoints = state.neighbors.reduce((sum, n) => sum + friendshipLevel(n.friendship) * 20, 0);
  const dexCount = unique(state.collections.fish) + unique(state.collections.forage)
    + unique(state.collections.game) + unique(state.collections.beasts);
  return {
    beauty: beautyScore(state),
    level: state.player.level * 20,
    pets: state.pets.length * 25,
    neighbors: neighborPoints,
    dex: dexCount * 8,
    achievements: achievementTiers * 10,
  };
}

export function ratingScore(state: GameState): number {
  return Object.values(ratingBreakdown(state)).reduce((a, b) => a + b, 0);
}

export function ratingStars(score: number): number {
  let stars = 0;
  for (const t of RATING_THRESHOLDS) if (score >= t) stars++;
  return stars;
}

export interface RatingInfo {
  score: number;
  stars: number;
  next: number | null;
  breakdown: RatingBreakdown;
  claimed: number;
  canClaim: boolean;
}

export function ratingInfo(state: GameState): RatingInfo {
  const breakdown = ratingBreakdown(state);
  const score = Object.values(breakdown).reduce((a, b) => a + b, 0);
  const stars = ratingStars(score);
  return {
    score,
    stars,
    next: stars < RATING_THRESHOLDS.length ? RATING_THRESHOLDS[stars] : null,
    breakdown,
    claimed: state.ratingClaimed ?? 0,
    canClaim: (state.ratingClaimed ?? 0) < stars,
  };
}

export function claimRatingReward(state: GameState): ActionResult {
  const info = ratingInfo(state);
  if (info.claimed >= RATING_THRESHOLDS.length) return fail('msg.allClaimed');
  if (info.claimed >= info.stars) return fail('msg.notReady');
  const idx = info.claimed;
  state.ratingClaimed = idx + 1;
  gainCoins(state, RATING_REWARDS[idx]);
  const levelEvents = gainXp(state, RATING_XP[idx]);
  return {
    ok: true,
    events: [
      { type: 'rating', target: 'island', amount: 1 },
      { type: 'toast', target: 'msg.ratingClaim', amount: RATING_REWARDS[idx] },
      ...levelEvents,
    ],
  };
}

export function totalDexCounts(): number {
  return allFish().length + allForage().length + allGame().length + allBeasts().length;
}
