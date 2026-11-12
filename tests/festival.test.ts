/** 四季节日测试 */
import { describe, expect, it } from 'vitest';
import { makeGame, NOW } from './helpers';
import {
  buyFestivalOffer, claimFestivalGift, claimFestivalTier, currentFestival,
  festivalActivity, festivalGiftClaimed, trackFestivalEvent,
} from '../src/core/festival';
import { DAY_MS } from '../src/core/calendar';

describe('四季节日', () => {
  it('季节决定当前节日', () => {
    const state = makeGame();
    const spring = currentFestival(state, NOW);
    expect(spring.def.season).toBe('spring');
    expect(spring.daysLeft).toBe(7);

    const winter = currentFestival(state, NOW + 21 * DAY_MS + 1000);
    expect(winter.def.season).toBe('winter');
  });

  it('每日礼物只能领一次', () => {
    const state = makeGame();
    const coins = state.player.coins;
    expect(festivalGiftClaimed(state, NOW)).toBe(false);

    const first = claimFestivalGift(state, NOW);
    expect(first.ok).toBe(true);
    expect(state.player.coins).toBe(coins + 60);
    expect(state.inventory.seed_rose).toBe(2);
    expect(state.festival.lastGiftDay).toBe(0);
    expect(festivalGiftClaimed(state, NOW)).toBe(true);

    const second = claimFestivalGift(state, NOW);
    expect(second.ok).toBe(false);
    expect(second.reason).toBe('msg.giftClaimed');
  });

  it('节日限定商品按季节出售', () => {
    const state = makeGame();
    const coins = state.player.coins;

    const ok = buyFestivalOffer(state, 'spring_cherry', NOW);
    expect(ok.ok).toBe(true);
    expect(state.player.coins).toBe(coins - 320);
    expect(state.inventory.seed_cherryblossom).toBe(1);

    // 夏季商品在春天买不到
    const bad = buyFestivalOffer(state, 'summer_glow', NOW);
    expect(bad.ok).toBe(false);
    expect(bad.reason).toBe('msg.notFound');
  });

  it('冬天礼物是热可可', () => {
    const state = makeGame();
    const at = NOW + 21 * DAY_MS + 1000;
    const r = claimFestivalGift(state, at);
    expect(r.ok).toBe(true);
    expect(state.inventory.dish_hotcocoa).toBe(1);
  });

  it('春季活动只统计采花', () => {
    const state = makeGame();
    trackFestivalEvent(state, { type: 'harvest', target: 'crop_rose', amount: 2 }, NOW);
    trackFestivalEvent(state, { type: 'fishCatch', target: 'common', amount: 1 }, NOW);
    expect(festivalActivity(state, NOW).count).toBe(2);
  });

  it('活动奖励按档位领取，不能跳档或重复领', () => {
    const state = makeGame();
    expect(claimFestivalTier(state, NOW).ok).toBe(false);

    trackFestivalEvent(state, { type: 'harvest', target: 'crop_rose', amount: 5 }, NOW);
    const coins = state.player.coins;
    const first = claimFestivalTier(state, NOW);
    expect(first.ok).toBe(true);
    expect(state.player.coins).toBe(coins + 150);
    expect(state.festival.activity.claimed).toBe(1);

    // 第二档需要 15 次，现在只有 5 次
    expect(claimFestivalTier(state, NOW).ok).toBe(false);
  });

  it('换季后活动进度重置', () => {
    const state = makeGame();
    trackFestivalEvent(state, { type: 'harvest', target: 'crop_rose', amount: 6 }, NOW);
    expect(festivalActivity(state, NOW).count).toBe(6);

    const winter = NOW + 21 * DAY_MS + 1000;
    trackFestivalEvent(state, { type: 'forage', target: 'forage_berry', amount: 1 }, winter);
    const act = festivalActivity(state, winter);
    expect(act.def.name.zh).toContain('雪灯');
    expect(act.count).toBe(1);
    expect(act.claimed).toBe(0);
  });
});
