/**
 * 每日宠物大赛：每只宠物每天可参赛一次。
 * 得分 = 等级 × 12 + 经验尾数 + 技能加成 + 当天运气（0–25），
 * 按 S/A/B/C 发金币与宠物经验。
 */
import type { ActionResult, GameState, PetInstance } from './types';
import { petDef } from './registry';
import { gainCoins } from './player';
import { petLevel } from './balance';
import { dayKey } from './quests';
import { hashSeed, mulberry32 } from './rng';
import { fail } from './types';

export type ContestRank = 'S' | 'A' | 'B' | 'C';

export interface ContestResult {
  day: string;
  score: number;
  rank: ContestRank;
  coins: number;
  xp: number;
}

export interface ContestActionResult extends ActionResult {
  contest?: ContestResult;
}

const SKILL_BONUS: Record<string, number> = {
  scare_beast: 10,
  lucky_fish: 10,
  cheer: 8,
  find_gift: 12,
};

const RANK_COINS: Record<ContestRank, number> = { S: 800, A: 400, B: 180, C: 60 };
const CONTEST_XP = 12;

export function contestScore(pet: PetInstance, now: number): number {
  const def = petDef(pet.defId);
  const day = dayKey(now);
  const rng = mulberry32(hashSeed(`contest:${pet.uid}:${day}`));
  const luck = Math.round(rng() * 25);
  const level = petLevel(pet.xp);
  const tail = Math.min(30, pet.xp % 40) / 2;
  return Math.round(level * 12 + tail + (SKILL_BONUS[def.skill] ?? 0) + luck);
}

export function contestRank(score: number): ContestRank {
  if (score >= 90) return 'S';
  if (score >= 65) return 'A';
  if (score >= 35) return 'B';
  return 'C';
}

export function contestDoneToday(pet: PetInstance, now: number): boolean {
  return pet.lastContestDay === dayKey(now);
}

export function enterPetContest(state: GameState, uid: number, now: number): ContestActionResult {
  const pet = state.pets.find((p) => p.uid === uid);
  if (!pet) return fail('msg.notFound');
  const day = dayKey(now);
  if (pet.lastContestDay === day) return fail('msg.contestDone');

  const score = contestScore(pet, now);
  const rank = contestRank(score);
  const coins = RANK_COINS[rank];
  pet.lastContestDay = day;
  pet.xp += CONTEST_XP;
  gainCoins(state, coins);

  return {
    ok: true,
    contest: { day, score, rank, coins, xp: CONTEST_XP },
    events: [
      { type: 'petContest', target: pet.defId, amount: 1 },
      { type: 'toast', target: 'msg.contestResult', amount: score, data: rank },
    ],
  };
}
