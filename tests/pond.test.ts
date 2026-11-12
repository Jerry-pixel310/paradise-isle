/** 鱼塘养殖测试 */
import { describe, expect, it } from 'vitest';
import { makeGame, NOW } from './helpers';
import { harvestPond, POND_GROW_MS, pondInfo, stockPond } from '../src/core/pond';
import { applyEvents } from '../src/core/quests';
import { deserialize } from '../src/save/save';

function withPond() {
  const state = makeGame();
  state.placements.push({ uid: 500, defId: 'bld_fishpond', x: 5, y: 5, rot: 0 });
  state.inventory.fish_sardine = 2;
  return state;
}

describe('鱼塘养殖', () => {
  it('投苗、等待、收获更多同种鱼', () => {
    const state = withPond();
    expect(stockPond(state, 500, 'fish_sardine', NOW).ok).toBe(true);
    expect(stockPond(state, 500, 'fish_sardine', NOW).ok).toBe(true);
    const info = pondInfo(state, 500, NOW);
    expect(info.pond?.count).toBe(2);
    expect(info.ready).toBe(false);

    const early = harvestPond(state, 500, NOW + 1000);
    expect(early.ok).toBe(false);
    expect(early.reason).toBe('msg.pondNotReady');

    const r = harvestPond(state, 500, NOW + POND_GROW_MS + 1);
    expect(r.ok).toBe(true);
    expect(state.inventory.fish_sardine).toBe(3); // 2 - 2 + 3
    applyEvents(state, r.events!, NOW);
    expect(state.stats.pondHarvests).toBe(1);
  });

  it('不能混养，且最多 3 条', () => {
    const state = withPond();
    state.inventory.fish_anchovy = 1;
    expect(stockPond(state, 500, 'fish_sardine', NOW).ok).toBe(true);
    const wrong = stockPond(state, 500, 'fish_anchovy', NOW);
    expect(wrong.ok).toBe(false);
    expect(wrong.reason).toBe('msg.pondSpecies');

    state.inventory.fish_sardine = 3;
    expect(stockPond(state, 500, 'fish_sardine', NOW).ok).toBe(true);
    expect(stockPond(state, 500, 'fish_sardine', NOW).ok).toBe(true);
    const full = stockPond(state, 500, 'fish_sardine', NOW);
    expect(full.ok).toBe(false);
    expect(full.reason).toBe('msg.pondFull');
  });

  it('空鱼塘不能收获', () => {
    const state = withPond();
    expect(harvestPond(state, 500, NOW).reason).toBe('msg.pondEmpty');
  });
});

describe('鱼塘存档迁移', () => {
  it('v24 补齐 fishPonds 与 pondHarvests', () => {
    const state = makeGame();
    const raw = JSON.parse(JSON.stringify(state)) as Record<string, unknown>;
    raw.version = 24;
    delete raw.fishPonds;
    delete (raw.stats as unknown as Record<string, unknown>).pondHarvests;

    const migrated = deserialize(JSON.stringify(raw), NOW);

    expect(migrated.version).toBe(31);
    expect(migrated.fishPonds).toEqual({});
    expect(migrated.stats.pondHarvests).toBe(0);
  });
});
