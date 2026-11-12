/**
 * 狩猎系统：野生动物会自己走动，玩家靠近时会受惊逃跑，并在地上留下脚印。
 * 核心只做结算：UI 层把瞄准精度 aim 与拉弓蓄力 charge 传进来。
 */
import type { ActionResult, GameAnimalInstance, GameState } from './types';
import { allGame, gameDef } from './registry';
import { ENERGY_COST, GAME_INTERVAL_MS, MAX_GAME } from './balance';
import { addItem, gainCoins, gainXp, nextUid, spendEnergy } from './player';
import { findFreeTerrain, isOccupied, terrainAt } from './island';
import { roll, rollChance, rollInt, rollWeighted } from './rng';
import { fail } from './types';

const TRAIL_TTL_MS = 3 * 60_000;
const FLEE_RADIUS = 2.3;

function scheduleNext(state: GameState, base: number): void {
  const [lo, hi] = GAME_INTERVAL_MS;
  state.nextGameAt = base + lo + roll() * (hi - lo);
}

export function gameByUid(state: GameState, uid: number): GameAnimalInstance | undefined {
  return state.game.find((g) => g.uid === uid);
}

const STEPS: Array<[number, number]> = [
  [1, 0], [-1, 0], [0, 1], [0, -1],
  [1, 1], [-1, -1], [1, -1], [-1, 1],
];

function canStand(state: GameState, x: number, y: number): boolean {
  if (terrainAt(state, x, y) !== 'grass') return false;
  if (isOccupied(state, x, y)) return false;
  if (state.weeds.some((w) => w.x === x && w.y === y)) return false;
  return true;
}

/** 走一步；away=true 时优先选离玩家更远的方向 */
function stepAnimal(state: GameState, a: GameAnimalInstance, now: number, away: boolean): boolean {
  const options = STEPS.filter(([dx, dy]) => canStand(state, a.x + dx, a.y + dy));
  if (options.length === 0) return false;
  let pick = options[Math.floor(roll() * options.length)];
  if (away) {
    const dist = (d: [number, number]): number =>
      Math.hypot(a.x + d[0] - state.player.px, a.y + d[1] - state.player.py);
    pick = options.reduce((best, o) => (dist(o) > dist(best) ? o : best), options[0]);
  }
  a.trail = [...(a.trail ?? []), { x: a.x, y: a.y, at: now }].slice(-6);
  a.x += pick[0];
  a.y += pick[1];
  return true;
}

function makeAnimal(
  state: GameState, defId: string, x: number, y: number, hp: number, spawnedAt: number, now: number,
): GameAnimalInstance {
  return {
    uid: nextUid(state), defId, x, y, hp, spawnedAt,
    trail: [], fleeCount: 0, nextMoveAt: now + 1800 + roll() * 2200,
  };
}

/** 推进野生动物刷新与移动；返回新增数量 */
export function tickGame(state: GameState, now: number): number {
  let spawned = 0;
  if (state.nextGameAt === 0) scheduleNext(state, now);
  let guard = 0;
  while (now >= state.nextGameAt && guard < 8) {
    guard++;
    if (state.game.length < MAX_GAME) {
      const pool = allGame().filter((g) => state.player.level >= g.minLevel);
      if (pool.length > 0) {
        const weights = pool.map((g) => Math.max(1, 10 - g.minLevel * 0.5));
        const def = rollWeighted(pool, weights);
        const spot = findFreeTerrain(state, roll, ['grass']);
        if (spot) {
          state.game.push(makeAnimal(state, def.id, spot.x, spot.y, def.hp, state.nextGameAt, now));
          spawned++;
        }
      }
    }
    scheduleNext(state, state.nextGameAt);
  }

  // 移动 / 受惊逃跑
  const survivors: GameAnimalInstance[] = [];
  for (const a of state.game) {
    if (!a.trail) a.trail = [];
    if (a.fleeCount === undefined) a.fleeCount = 0;
    if (!a.nextMoveAt) a.nextMoveAt = now + 1500 + roll() * 2000;
    if (now >= a.nextMoveAt) {
      const dist = Math.hypot(a.x - state.player.px, a.y - state.player.py);
      if (dist <= FLEE_RADIUS) {
        a.fleeCount += 1;
        stepAnimal(state, a, now, true);
        if (a.fleeCount >= 3) continue; // 彻底逃掉
      } else if (roll() < 0.55) {
        stepAnimal(state, a, now, false);
      }
      a.nextMoveAt = now + 2200 + roll() * 2600;
    }
    a.trail = a.trail.filter((t) => now - t.at < TRAIL_TTL_MS).slice(-6);
    survivors.push(a);
  }
  state.game = survivors;
  return spawned;
}

/** 新岛开局先放一只小猎物 */
export function seedGame(state: GameState, now: number, count: number): void {
  for (let i = 0; i < count; i++) {
    const pool = allGame().filter((g) => state.player.level >= g.minLevel);
    if (pool.length === 0) break;
    const def = pool[Math.floor(roll() * pool.length)];
    const spot = findFreeTerrain(state, roll, ['grass']);
    if (spot) {
      state.game.push(makeAnimal(state, def.id, spot.x, spot.y, def.hp, now, now));
    }
  }
  state.nextGameAt = now + GAME_INTERVAL_MS[0] + roll() * (GAME_INTERVAL_MS[1] - GAME_INTERVAL_MS[0]);
}

export interface HuntShot {
  hit: boolean;
  /** 猎物被猎获 */
  defeated: boolean;
  /** 射偏后猎物逃走 */
  fled: boolean;
  coins: number;
  meat: string | null;
  pelt: string | null;
  xp: number;
}

/** 拉弓蓄力对精度的影响：太轻箭会飘，拉太满手会抖 */
export function chargeFactor(charge: number): number {
  if (charge < 0.55) return 0.55;
  if (charge <= 0.92) return 1;
  return 0.82;
}

/**
 * 射一箭。aim 是瞄准精度（1=正中靶心），charge 是拉弓蓄力 0-1。
 * 命中判定：aim × chargeFactor(charge) >= 1 - zone；射偏则猎物受惊逃走。
 */
export function huntShot(
  state: GameState, uid: number, aim: number, now: number, charge = 0.8,
): ActionResult & { shot?: HuntShot } {
  const idx = state.game.findIndex((g) => g.uid === uid);
  if (idx < 0) return fail('msg.notFound');
  const animal = state.game[idx];
  const def = gameDef(animal.defId);
  if (!spendEnergy(state, ENERGY_COST.huntShot, now)) return fail('msg.noEnergy');

  const shot: HuntShot = {
    hit: false, defeated: false, fled: false, coins: 0, meat: null, pelt: null, xp: 0,
  };

  const eff = Math.max(0, Math.min(1, aim)) * chargeFactor(charge);
  const hit = eff >= 1 - def.zone;
  if (!hit) {
    // 射偏：猎物逃走，本次狩猎结束
    state.game.splice(idx, 1);
    shot.fled = true;
    return { ok: true, shot };
  }

  shot.hit = true;
  animal.hp -= 1;
  if (animal.hp > 0) {
    // 受伤后受惊，立刻往远处窜一段
    stepAnimal(state, animal, now, true);
    return { ok: true, shot };
  }

  // 猎获
  shot.defeated = true;
  shot.coins = rollInt(def.coinMin, def.coinMax);
  gainCoins(state, shot.coins);
  addItem(state, def.meatId, 1);
  shot.meat = def.meatId;
  if (def.peltId && rollChance(def.peltChance ?? 0)) {
    addItem(state, def.peltId, 1);
    shot.pelt = def.peltId;
  }
  const levelEvents = gainXp(state, def.xp);
  shot.xp = def.xp;
  const prevHunt = state.collections.game[def.id] || 0;
  state.collections.game[def.id] = prevHunt + 1;
  state.game.splice(idx, 1);

  const events: NonNullable<ActionResult['events']> = [
    { type: 'hunt', target: def.id, amount: 1 },
    ...levelEvents,
  ];
  if (prevHunt === 0) {
    gainCoins(state, 25);
    events.push({ type: 'toast', target: 'msg.dexReward', amount: 25 });
  }

  return { ok: true, shot, events };
}
