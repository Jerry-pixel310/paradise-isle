/** 家具互动测试 */
import { describe, expect, it } from 'vitest';
import { makeGame, NOW } from './helpers';
import { furnitureUsedToday, useFurniture } from '../src/core/furnitureUse';
import { applyEvents } from '../src/core/quests';
import { deserialize } from '../src/save/save';

function withBed() {
  const state = makeGame();
  state.player.energy = 0;
  state.interior.rooms.bedroom.push({
    uid: 400, defId: 'furn_bed_basic', x: 2, y: 1, rot: 0,
  });
  return state;
}

describe('家具互动', () => {
  it('床每天休息一次恢复能量', () => {
    const state = withBed();
    const r = useFurniture(state, 'bedroom', 400, NOW);

    expect(r.ok).toBe(true);
    expect(state.player.energy).toBeGreaterThan(0);
    expect(furnitureUsedToday(state, 400, NOW)).toBe(true);
    applyEvents(state, r.events!, NOW);
    expect(state.stats.furnitureUses).toBe(1);

    const again = useFurniture(state, 'bedroom', 400, NOW + 1000);
    expect(again.ok).toBe(false);
    expect(again.reason).toBe('msg.furnitureUsed');

    state.player.energy = 0;
    expect(useFurniture(state, 'bedroom', 400, NOW + 24 * 3600_000).ok).toBe(true);
  });

  it('没有互动效果的家具会失败', () => {
    const state = makeGame();
    state.interior.rooms.living.push({
      uid: 401, defId: 'furn_rug_basic', x: 4, y: 3, rot: 0,
    });
    const r = useFurniture(state, 'living', 401, NOW);
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('msg.noUse');
  });

  it('能量已满时不浪费每日次数', () => {
    const state = withBed();
    state.player.energy = 999;
    const r = useFurniture(state, 'bedroom', 400, NOW);
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('msg.energyFull');
    expect(furnitureUsedToday(state, 400, NOW)).toBe(false);
  });
});

describe('家具互动存档迁移', () => {
  it('v27 补齐 furnitureUses 与统计', () => {
    const state = withBed();
    const raw = JSON.parse(JSON.stringify(state)) as Record<string, unknown>;
    raw.version = 27;
    delete raw.furnitureUses;
    delete (raw.stats as unknown as Record<string, unknown>).furnitureUses;

    const migrated = deserialize(JSON.stringify(raw), NOW);

    expect(migrated.version).toBe(31);
    expect(migrated.furnitureUses).toEqual({});
    expect(migrated.stats.furnitureUses).toBe(0);
  });
});
