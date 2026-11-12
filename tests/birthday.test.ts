/** 邻居生日测试 */
import { describe, expect, it } from 'vitest';
import { makeGame, NOW } from './helpers';
import { birthdayInfo, giftToNeighbor } from '../src/core/social';
import { applyEvents } from '../src/core/quests';
import { DAY_MS } from '../src/core/calendar';
import { deserialize } from '../src/save/save';

/** 海棠婶生日：春 第3天（dayOfSeason = 2） */
const BIRTHDAY_NOW = NOW - 2 * DAY_MS;

describe('邻居生日', () => {
  it('生日当天送礼好友度翻倍并获得生日回礼', () => {
    const state = makeGame();
    state.createdAt = BIRTHDAY_NOW;
    state.player.coins = 500;
    // 让邻居的生日与当前游戏日对齐
    const ns = state.neighbors[0];
    const info = birthdayInfo(state, ns, NOW);
    expect(info.isBirthday).toBe(true);
    expect(info.canGift).toBe(true);

    state.inventory.bouquet_rose = 1;
    const coins = state.player.coins;
    const before = ns.friendship;
    const r = giftToNeighbor(state, ns, 'bouquet_rose', NOW);

    expect(r.ok).toBe(true);
    expect(ns.friendship - before).toBe(22); // 普通 11 × 生日 2
    expect(state.inventory.item_birthday_cake).toBe(1);
    expect(state.player.coins).toBeGreaterThanOrEqual(coins + 150);
    applyEvents(state, r.events!, NOW);
    expect(state.stats.birthdayGifts).toBe(1);
    expect(birthdayInfo(state, ns, NOW).canGift).toBe(false);
  });

  it('生日回礼一年只发一次', () => {
    const state = makeGame();
    state.createdAt = BIRTHDAY_NOW;
    const ns = state.neighbors[0];
    state.inventory.bouquet_rose = 2;
    expect(giftToNeighbor(state, ns, 'bouquet_rose', NOW).ok).toBe(true);
    expect(state.inventory.item_birthday_cake).toBe(1);

    expect(giftToNeighbor(state, ns, 'bouquet_rose', NOW).ok).toBe(true);
    expect(state.inventory.item_birthday_cake).toBe(1); // 没有第二块蛋糕
  });

  it('非生日没有生日回礼', () => {
    const state = makeGame();
    const ns = state.neighbors[0];
    state.inventory.bouquet_rose = 1;
    const info = birthdayInfo(state, ns, NOW);
    expect(info.isBirthday).toBe(false);
    expect(giftToNeighbor(state, ns, 'bouquet_rose', NOW).ok).toBe(true);
    expect(state.inventory.item_birthday_cake).toBeUndefined();
  });
});

describe('生日存档迁移', () => {
  it('v23 补齐 lastBirthdayYear 与 birthdayGifts', () => {
    const state = makeGame();
    const raw = JSON.parse(JSON.stringify(state)) as Record<string, unknown>;
    raw.version = 23;
    delete ((raw.neighbors as unknown as Array<Record<string, unknown>>)[0]).lastBirthdayYear;
    delete (raw.stats as unknown as Record<string, unknown>).birthdayGifts;

    const migrated = deserialize(JSON.stringify(raw), NOW);

    expect(migrated.version).toBe(31);
    expect(migrated.neighbors[0].lastBirthdayYear).toBe(-1);
    expect(migrated.stats.birthdayGifts).toBe(0);
  });
});
