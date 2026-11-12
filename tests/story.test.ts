/** 邻居好感剧情测试 */
import { describe, expect, it } from 'vitest';
import { makeGame, NOW } from './helpers';
import {
  availableNeighborStory, neighborStoryPages, playNeighborStory,
} from '../src/core/social';
import { applyEvents } from '../src/core/quests';
import { deserialize } from '../src/save/save';

describe('好感剧情', () => {
  it('好友度 Lv.4 解锁第一段剧情并发放奖励', () => {
    const state = makeGame();
    const ns = state.neighbors[0];
    ns.friendship = 160; // Lv.4
    const coins = state.player.coins;

    expect(availableNeighborStory(ns)).toEqual({ tier: 1, level: 4 });
    expect(neighborStoryPages(ns, 1)).toHaveLength(3);

    const r = playNeighborStory(state, ns);

    expect(r.ok).toBe(true);
    expect(ns.storyTier).toBe(1);
    expect(state.player.coins).toBe(coins + 300);
    expect(state.inventory.item_memory_photo).toBe(1);
    applyEvents(state, r.events!, NOW);
    expect(state.stats.neighborStories).toBe(1);
    expect(availableNeighborStory(ns)).toBeNull();
  });

  it('好友度 Lv.8 解锁第二段剧情', () => {
    const state = makeGame();
    const ns = state.neighbors[0];
    ns.storyTier = 1;
    ns.friendship = 640; // Lv.8
    const coins = state.player.coins;

    expect(availableNeighborStory(ns)).toEqual({ tier: 2, level: 8 });
    expect(neighborStoryPages(ns, 2)).toHaveLength(3);
    expect(playNeighborStory(state, ns).ok).toBe(true);
    expect(state.player.coins).toBe(coins + 800);
    expect(ns.storyTier).toBe(2);
  });

  it('好友度不够时不能观看剧情', () => {
    const state = makeGame();
    const ns = state.neighbors[0];
    ns.friendship = 40; // Lv.2
    expect(availableNeighborStory(ns)).toBeNull();
    const r = playNeighborStory(state, ns);
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('msg.notReady');
    expect(ns.storyTier).toBe(0);
  });
});

describe('剧情存档迁移', () => {
  it('v16 补齐 storyTier 与 neighborStories', () => {
    const state = makeGame();
    const raw = JSON.parse(JSON.stringify(state)) as Record<string, unknown>;
    raw.version = 16;
    delete ((raw.neighbors as unknown as Array<Record<string, unknown>>)[0]).storyTier;
    delete (raw.stats as unknown as Record<string, unknown>).neighborStories;

    const migrated = deserialize(JSON.stringify(raw), NOW);

    expect(migrated.version).toBe(31);
    expect(migrated.neighbors[0].storyTier).toBe(0);
    expect(migrated.stats.neighborStories).toBe(0);
  });
});
