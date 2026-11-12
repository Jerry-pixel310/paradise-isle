/** 每日签到测试 */
import { describe, expect, it } from 'vitest';
import { makeGame, NOW } from './helpers';
import { checkinInfo, claimCheckin } from '../src/core/checkin';
import { applyEvents } from '../src/core/quests';
import { deserialize } from '../src/save/save';

describe('每日签到', () => {
  it('每天只能领一次，连续签到奖励递增', () => {
    const state = makeGame();
    const coins = state.player.coins;
    expect(checkinInfo(state, NOW).claimedToday).toBe(false);

    const first = claimCheckin(state, NOW);
    expect(first.ok).toBe(true);
    expect(state.checkin.streak).toBe(1);
    expect(state.player.coins).toBe(coins + 100);
    applyEvents(state, first.events!, NOW);
    expect(state.stats.checkins).toBe(1);

    const again = claimCheckin(state, NOW);
    expect(again.ok).toBe(false);
    expect(again.reason).toBe('msg.checkinDone');

    const food = state.player.food;
    const next = claimCheckin(state, NOW + 24 * 3600_000);
    expect(next.ok).toBe(true);
    expect(state.checkin.streak).toBe(2);
    expect(state.player.food).toBe(food + 5);
  });

  it('断签会重置连续天数', () => {
    const state = makeGame();
    claimCheckin(state, NOW);
    const skipped = claimCheckin(state, NOW + 3 * 24 * 3600_000);
    expect(skipped.ok).toBe(true);
    expect(state.checkin.streak).toBe(1);
  });

  it('第 3 天给鱼饵', () => {
    const state = makeGame();
    claimCheckin(state, NOW);
    claimCheckin(state, NOW + 24 * 3600_000);
    claimCheckin(state, NOW + 2 * 24 * 3600_000);
    expect(state.inventory.item_bait_worm).toBe(3);
    expect(state.checkin.streak).toBe(3);
  });
});

describe('签到存档迁移', () => {
  it('v29 补齐 checkin 与 checkins', () => {
    const state = makeGame();
    const raw = JSON.parse(JSON.stringify(state)) as Record<string, unknown>;
    raw.version = 29;
    delete raw.checkin;
    delete (raw.stats as unknown as Record<string, unknown>).checkins;

    const migrated = deserialize(JSON.stringify(raw), NOW);

    expect(migrated.version).toBe(31);
    expect(migrated.checkin).toEqual({ lastDay: '', streak: 0, total: 0 });
    expect(migrated.stats.checkins).toBe(0);
  });
});
