/**
 * 每日签到：连续签到奖励递增，7 天一个循环；断签重置连续天数。
 */
import type { ActionResult, GameState } from './types';
import { dayKey } from './quests';
import { addItem, gainCoins, gainFood } from './player';
import { fail } from './types';

export interface CheckinReward {
  coins: number;
  food?: number;
  items?: Record<string, number>;
}

export const CHECKIN_REWARDS: CheckinReward[] = [
  { coins: 100 },
  { coins: 150, food: 5 },
  { coins: 220, items: { item_bait_worm: 3 } },
  { coins: 300, items: { seed_corn: 2 } },
  { coins: 450, items: { item_bait_shrimp: 3 } },
  { coins: 600, food: 5 },
  { coins: 1000, items: { item_festival_ribbon: 1 } },
];

export interface CheckinInfo {
  claimedToday: boolean;
  streak: number;
  nextStreak: number;
  total: number;
  reward: CheckinReward;
  rewardIndex: number;
}

export function checkinInfo(state: GameState, now: number): CheckinInfo {
  const today = dayKey(now);
  const yesterday = dayKey(now - 24 * 3600_000);
  const c = state.checkin ?? { lastDay: '', streak: 0, total: 0 };
  const claimedToday = c.lastDay === today;
  const nextStreak = c.lastDay === yesterday ? c.streak + 1 : 1;
  const rewardIndex = (nextStreak - 1) % CHECKIN_REWARDS.length;
  return {
    claimedToday,
    streak: c.streak,
    nextStreak,
    total: c.total,
    reward: CHECKIN_REWARDS[rewardIndex],
    rewardIndex,
  };
}

export function claimCheckin(state: GameState, now: number): ActionResult {
  const info = checkinInfo(state, now);
  if (info.claimedToday) return fail('msg.checkinDone');
  const today = dayKey(now);
  const reward = info.reward;

  gainCoins(state, reward.coins);
  if (reward.food) gainFood(state, reward.food);
  for (const [id, n] of Object.entries(reward.items ?? {})) addItem(state, id, n);

  state.checkin = {
    lastDay: today,
    streak: info.nextStreak,
    total: info.total + 1,
  };
  return {
    ok: true,
    events: [
      { type: 'checkin', target: 'daily', amount: 1 },
      { type: 'toast', target: 'msg.checkinClaim', amount: reward.coins },
    ],
  };
}
