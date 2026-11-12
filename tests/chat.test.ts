/** 邻居聊天测试 */
import { describe, expect, it } from 'vitest';
import { makeGame, NOW } from './helpers';
import { chatAvailable, chatWithNeighbor, simulateNeighbor } from '../src/core/social';
import { applyEvents, dayKey } from '../src/core/quests';
import { deserialize } from '../src/save/save';

describe('邻居聊天', () => {
  it('每天可聊一次，提升好友度并记录统计', () => {
    const state = makeGame();
    const ns = state.neighbors[0];
    const before = ns.friendship;
    expect(chatAvailable(ns)).toBe(true);

    const r = chatWithNeighbor(state, ns, 'crop', NOW);

    expect(r.ok).toBe(true);
    expect(r.chat).toBeDefined();
    expect(r.chat!.gain).toBe(3);
    expect(ns.friendship).toBe(before + 3);
    expect(ns.chattedToday).toBe(1);
    expect(chatAvailable(ns)).toBe(false);

    applyEvents(state, r.events!, NOW);
    expect(state.stats.neighborChats).toBe(1);

    const again = chatWithNeighbor(state, ns, 'island', NOW);
    expect(again.ok).toBe(false);
    expect(again.reason).toBe('msg.chatDone');
  });

  it('第二天可以再次聊天', () => {
    const state = makeGame();
    const ns = state.neighbors[0];
    expect(chatWithNeighbor(state, ns, 'joke', NOW).ok).toBe(true);
    const nextDay = NOW + 24 * 3600_000;
    simulateNeighbor(ns, nextDay);
    expect(chatAvailable(ns)).toBe(true);
    expect(chatWithNeighbor(state, ns, 'island', nextDay).ok).toBe(true);
    expect(ns.chattedToday).toBe(1);
  });

  it('聊天有本地化问候与回复', () => {
    const state = makeGame();
    const r = chatWithNeighbor(state, state.neighbors[0], 'crop', NOW);
    expect(r.chat!.greeting.zh.length).toBeGreaterThan(0);
    expect(r.chat!.reply.en.length).toBeGreaterThan(0);
    expect(r.chat!.reply.zh).toContain('香芋'); // 海棠婶喜欢香芋
  });
});

describe('聊天存档迁移', () => {
  it('v15 补齐 chattedToday 与 neighborChats', () => {
    const state = makeGame();
    const raw = JSON.parse(JSON.stringify(state)) as Record<string, unknown>;
    raw.version = 15;
    delete ((raw.neighbors as unknown as Array<Record<string, unknown>>)[0]).chattedToday;
    delete (raw.stats as unknown as Record<string, unknown>).neighborChats;

    const migrated = deserialize(JSON.stringify(raw), NOW);

    expect(migrated.version).toBe(31);
    expect(migrated.neighbors[0].chattedToday).toBe(0);
    expect(migrated.stats.neighborChats).toBe(0);
    expect(dayKey(NOW)).toBe(state.neighbors[0].helpDay);
  });
});
