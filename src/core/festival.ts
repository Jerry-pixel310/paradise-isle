/**
 * 四季节日：随季节自动切换，提供限定商品和每日礼物。
 */
import type { ActionResult, FestivalActivityDef, GameEvent, GameState } from './types';
import { cropDef, festivalDef } from './registry';
import { calendarAt, DAYS_PER_SEASON, type CalendarInfo } from './calendar';
import { addItem, gainCoins, gainXp, spendCoins } from './player';
import { fail } from './types';

export interface FestivalNow {
  cal: CalendarInfo;
  def: ReturnType<typeof festivalDef>;
  daysLeft: number;
}

export function currentFestival(state: GameState, now: number): FestivalNow {
  const cal = calendarAt(state.createdAt, now, state.seed);
  return {
    cal,
    def: festivalDef(cal.season),
    daysLeft: DAYS_PER_SEASON - cal.dayOfSeason,
  };
}

export function festivalGiftClaimed(state: GameState, now: number): boolean {
  const { cal } = currentFestival(state, now);
  return state.festival?.lastGiftDay === cal.dayIndex;
}

export function claimFestivalGift(state: GameState, now: number): ActionResult {
  const { cal, def } = currentFestival(state, now);
  if (!state.festival) {
    state.festival = {
      lastGiftDay: -1,
      activity: { season: cal.season, count: 0, claimed: 0 },
    };
  }
  if (state.festival.lastGiftDay === cal.dayIndex) return fail('msg.giftClaimed');
  state.festival.lastGiftDay = cal.dayIndex;
  gainCoins(state, def.gift.coins);
  for (const [id, n] of Object.entries(def.gift.items)) addItem(state, id, n);
  return { ok: true, events: [{ type: 'toast', target: 'msg.giftGot', amount: def.gift.coins }] };
}

export function buyFestivalOffer(state: GameState, offerId: string, now: number): ActionResult {
  const { def } = currentFestival(state, now);
  const offer = def.offers.find((o) => o.id === offerId);
  if (!offer) return fail('msg.notFound');
  if (!spendCoins(state, offer.price)) return fail('msg.noCoins');
  addItem(state, offer.itemId, offer.qty);
  return { ok: true, events: [{ type: 'toast', target: 'msg.festivalBought', data: offer.itemId }] };
}

// ---------------------------------------------------------------- 节日活动

function syncActivity(state: GameState, cal: CalendarInfo) {
  if (!state.festival) {
    state.festival = { lastGiftDay: -1, activity: { season: cal.season, count: 0, claimed: 0 } };
  }
  if (!state.festival.activity || state.festival.activity.season !== cal.season) {
    state.festival.activity = { season: cal.season, count: 0, claimed: 0 };
  }
  return state.festival.activity;
}

export interface FestivalActivityNow {
  def: FestivalActivityDef;
  count: number;
  claimed: number;
  next: number | null;
}

export function festivalActivity(state: GameState, now: number): FestivalActivityNow {
  const { cal, def } = currentFestival(state, now);
  const a = syncActivity(state, cal);
  return {
    def: def.activity,
    count: a.count,
    claimed: a.claimed,
    next: def.activity.tiers[a.claimed] ?? null,
  };
}

/** 由 applyEvents 调用：只统计当前季节对应的活动指标 */
export function trackFestivalEvent(state: GameState, ev: GameEvent, now: number): void {
  const { cal, def } = currentFestival(state, now);
  const a = syncActivity(state, cal);
  const metric = def.activity.metric;
  let matches = false;
  if (metric === 'fish') matches = ev.type === 'fishCatch';
  else if (metric === 'forage') matches = ev.type === 'forage';
  else if (metric === 'crop') matches = ev.type === 'harvest';
  else if (metric === 'flower' && ev.type === 'harvest' && ev.target) {
    try { matches = !!cropDef(ev.target).isFlower; } catch { matches = false; }
  }
  if (matches) a.count += ev.amount ?? 1;
}

export function claimFestivalTier(state: GameState, now: number): ActionResult {
  const { cal, def } = currentFestival(state, now);
  const a = syncActivity(state, cal);
  const tiers = def.activity.tiers;
  const idx = a.claimed;
  if (idx >= tiers.length) return fail('msg.allClaimed');
  if (a.count < tiers[idx]) return fail('msg.notReady');
  const reward = def.activity.rewards[idx];
  a.claimed += 1;
  gainCoins(state, reward.coins);
  const levelEvents = gainXp(state, reward.xp);
  for (const [id, n] of Object.entries(reward.items ?? {})) addItem(state, id, n);
  return {
    ok: true,
    events: [
      { type: 'toast', target: 'msg.activityClaimed', amount: reward.coins },
      ...levelEvents,
    ],
  };
}
