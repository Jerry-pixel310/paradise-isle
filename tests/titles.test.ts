/** 岛主称号测试 */
import { describe, expect, it } from 'vitest';
import { makeGame, NOW } from './helpers';
import { equipTitle, titleDef, titleUnlocked, unlockedTitles } from '../src/core/titles';
import { deserialize } from '../src/save/save';

describe('岛主称号', () => {
  it('初始只有新手称号，满足里程碑后解锁', () => {
    const state = makeGame();
    expect(state.title).toBe('title_novice');
    expect(titleUnlocked(state, 'title_novice')).toBe(true);
    expect(titleUnlocked(state, 'title_harvester')).toBe(false);
    expect(unlockedTitles(state).length).toBe(1);

    state.stats.harvests = 100;
    expect(titleUnlocked(state, 'title_harvester')).toBe(true);
    expect(unlockedTitles(state).length).toBe(2);
  });

  it('未解锁不能装备，解锁后可装备', () => {
    const state = makeGame();
    expect(equipTitle(state, 'title_harvester').reason).toBe('msg.titleLocked');
    expect(state.title).toBe('title_novice');

    state.stats.harvests = 100;
    expect(equipTitle(state, 'title_harvester').ok).toBe(true);
    expect(state.title).toBe('title_harvester');
    expect(titleDef(state.title).name.zh).toBe('收获大师');
  });

  it('博物馆/评级/签到也解锁称号', () => {
    const state = makeGame();
    state.museum.donated = Array.from({ length: 25 }, (_, i) => `fish_test_${i}`);
    state.ratingClaimed = 5;
    state.checkin.total = 30;
    expect(titleUnlocked(state, 'title_curator')).toBe(true);
    expect(titleUnlocked(state, 'title_star')).toBe(true);
    expect(titleUnlocked(state, 'title_regular')).toBe(true);
  });
});

describe('称号存档迁移', () => {
  it('v30 补齐 title', () => {
    const state = makeGame();
    const raw = JSON.parse(JSON.stringify(state)) as Record<string, unknown>;
    raw.version = 30;
    delete raw.title;

    const migrated = deserialize(JSON.stringify(raw), NOW);

    expect(migrated.version).toBe(31);
    expect(migrated.title).toBe('title_novice');
  });
});
