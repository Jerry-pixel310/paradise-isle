/** 成就总览 / 一键领取测试 */
import { describe, expect, it } from 'vitest';
import { makeGame } from './helpers';
import {
  achievementSummary, achievementViews, claimAchievement, claimAllAchievements,
} from '../src/core/quests';

describe('成就总览', () => {
  it('统计已领取层级与完成数量', () => {
    const state = makeGame();
    const before = achievementSummary(state);
    expect(before.totalAchievements).toBeGreaterThan(20);
    expect(before.claimedTiers).toBe(0);
    expect(before.percent).toBe(0);

    state.stats.harvests = 50;
    expect(claimAchievement(state, 'ach_harvest').ok).toBe(true);

    const after = achievementSummary(state);
    expect(after.claimedTiers).toBe(1);
    expect(after.percent).toBeGreaterThan(0);
    expect(after.claimable).toBeGreaterThanOrEqual(1); // 收获 50 已到第二档
  });

  it('一键领取会领取所有已达成层级', () => {
    const state = makeGame();
    state.stats.harvests = 60; // 两档达成
    const coins = state.player.coins;

    const r = claimAllAchievements(state);

    expect(r.ok).toBe(true);
    expect(state.achievements.ach_harvest).toBe(2);
    expect(state.player.coins).toBeGreaterThan(coins);
    expect(r.events?.some((e) => e.type === 'achievement')).toBe(true);

    const again = claimAllAchievements(state);
    expect(again.ok).toBe(false);
  });

  it('未达成时一键领取返回不可领取', () => {
    const state = makeGame();
    const r = claimAllAchievements(state);
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('msg.allClaimed');
    expect(achievementViews(state).length).toBe(achievementSummary(state).totalAchievements);
  });
});
