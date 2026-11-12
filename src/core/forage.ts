/**
 * 采摘系统：野生资源按地形随机刷新 → 点击采集（耗 1 能量）→ 获得食材/材料。
 * 资源会随时间自动补充，离线期间也会继续生长。
 */
import type { ActionResult, GameState } from './types';
import { allForage, forageDef } from './registry';
import { ENERGY_COST, FORAGE_INTERVAL_MS, MAX_FORAGE } from './balance';
import { addItem, gainCoins, gainFood, gainXp, nextUid, spendEnergy } from './player';
import { findFreeTerrain } from './island';
import { calendarAt, isWetWeather } from './calendar';
import { roll, rollWeighted } from './rng';
import { fail } from './types';

function scheduleNext(state: GameState, base: number): void {
  const [lo, hi] = FORAGE_INTERVAL_MS;
  const cal = calendarAt(state.createdAt, base, state.seed);
  // 雨天长得快，冬天长得慢
  const mul = isWetWeather(cal.weather) ? 0.65 : cal.season === 'winter' ? 1.35 : 1;
  state.nextForageAt = base + (lo + roll() * (hi - lo)) * mul;
}

function pickDef() {
  const pool = allForage();
  return rollWeighted(pool, pool.map((f) => f.weight));
}

/** 推进野生资源刷新；返回新增数量 */
export function tickForage(state: GameState, now: number): number {
  let grown = 0;
  if (state.nextForageAt === 0) scheduleNext(state, now);
  let guard = 0;
  while (now >= state.nextForageAt && guard < 12) {
    guard++;
    if (state.forage.length < MAX_FORAGE) {
      const def = pickDef();
      const spot = findFreeTerrain(state, roll, [def.terrain]);
      if (spot) {
        state.forage.push({
          uid: nextUid(state), defId: def.id, x: spot.x, y: spot.y,
          spawnedAt: state.nextForageAt,
        });
        grown++;
      }
    }
    scheduleNext(state, state.nextForageAt);
  }
  return grown;
}

/** 新岛开局先撒几处野生资源，让玩家一上来就能采摘 */
export function seedForage(state: GameState, now: number, count: number): void {
  for (let i = 0; i < count; i++) {
    const def = pickDef();
    const spot = findFreeTerrain(state, roll, [def.terrain]);
    if (spot) {
      state.forage.push({
        uid: nextUid(state), defId: def.id, x: spot.x, y: spot.y, spawnedAt: now,
      });
    }
  }
  state.nextForageAt = now + FORAGE_INTERVAL_MS[0] + roll() * (FORAGE_INTERVAL_MS[1] - FORAGE_INTERVAL_MS[0]);
}

export function forageByUid(state: GameState, uid: number) {
  return state.forage.find((f) => f.uid === uid);
}

/** 采摘一处野生资源 */
export function gatherForage(state: GameState, uid: number, now: number): ActionResult {
  const idx = state.forage.findIndex((f) => f.uid === uid);
  if (idx < 0) return fail('msg.notFound');
  const spot = state.forage[idx];
  const def = forageDef(spot.defId);
  if (!spendEnergy(state, ENERGY_COST.gather, now)) return fail('msg.noEnergy');

  state.forage.splice(idx, 1);
  addItem(state, def.itemId, 1);
  gainFood(state, def.food);
  const prev = state.collections.forage[def.id] || 0;
  state.collections.forage[def.id] = prev + 1;
  const levelEvents = gainXp(state, def.xp);
  const events: NonNullable<ActionResult['events']> = [
    { type: 'forage', target: def.id, amount: 1 },
    { type: 'toast', target: 'msg.forageGathered', data: def.itemId },
  ];
  if (prev === 0) {
    gainCoins(state, 20);
    events.push({ type: 'toast', target: 'msg.dexReward', amount: 20 });
  }
  return {
    ok: true,
    events: [...events, ...levelEvents],
  };
}
