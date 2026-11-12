/** 岛屿评级测试 */
import { describe, expect, it } from 'vitest';
import { makeGame, NOW } from './helpers';
import { claimRatingReward, ratingBreakdown, ratingInfo, ratingScore, ratingStars } from '../src/core/rating';
import { applyEvents } from '../src/core/quests';
import { deserialize } from '../src/save/save';

describe('岛屿评级', () => {
  it('初始岛未达一星，升到 30 级后有两星', () => {
    const state = makeGame();
    const before = ratingInfo(state);
    expect(before.score).toBeGreaterThan(0);
    expect(before.stars).toBe(0);
    expect(claimRatingReward(state).ok).toBe(false);

    state.player.level = 30;
    const after = ratingInfo(state);
    expect(after.score).toBeGreaterThanOrEqual(600);
    expect(after.stars).toBeGreaterThanOrEqual(2);
    expect(after.canClaim).toBe(true);
  });

  it('评分由多个系统构成', () => {
    const state = makeGame();
    const b = ratingBreakdown(state);
    expect(b.level).toBe(20);
    expect(b.beauty).toBe(0);
    expect(b.pets).toBe(0);
    state.player.level = 10;
    expect(ratingBreakdown(state).level).toBe(200);
    expect(ratingScore(state)).toBeGreaterThan(0);
    expect(ratingStars(2500)).toBe(5);
  });

  it('按星级领取一次性奖励', () => {
    const state = makeGame();
    state.player.level = 30; // 2 星
    const stars = ratingInfo(state).stars;
    const coins = state.player.coins;
    const first = claimRatingReward(state);
    expect(first.ok).toBe(true);
    expect(state.player.coins).toBe(coins + 500);
    expect(state.ratingClaimed).toBe(1);
    applyEvents(state, first.events!, NOW);
    expect(state.stats.ratingClaims).toBe(1);

    if (stars >= 2) expect(claimRatingReward(state).ok).toBe(true);
    expect(claimRatingReward(state).ok).toBe(false);
  });
});

describe('评级存档迁移', () => {
  it('v20 补齐 ratingClaimed 与 ratingClaims', () => {
    const state = makeGame();
    const raw = JSON.parse(JSON.stringify(state)) as Record<string, unknown>;
    raw.version = 20;
    delete raw.ratingClaimed;
    delete (raw.stats as unknown as Record<string, unknown>).ratingClaims;

    const migrated = deserialize(JSON.stringify(raw), NOW);

    expect(migrated.version).toBe(31);
    expect(migrated.ratingClaimed).toBe(0);
    expect(migrated.stats.ratingClaims).toBe(0);
  });
});
