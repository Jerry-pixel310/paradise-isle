/** 博物馆捐赠测试 */
import { describe, expect, it } from 'vitest';
import { makeGame, NOW } from './helpers';
import {
  claimMuseumMilestone, donateToMuseum, museumCatalog, museumInfo,
} from '../src/core/museum';
import { applyEvents } from '../src/core/quests';
import { deserialize } from '../src/save/save';

function withFish(n: number) {
  const state = makeGame();
  const fish = museumCatalog().filter((s) => s.kind === 'fish').slice(0, n);
  for (const f of fish) state.collections.fish[f.id] = 1;
  return { state, fish };
}

describe('博物馆捐赠', () => {
  it('只能捐赠已发现且未捐过的物种', () => {
    const { state, fish } = withFish(1);
    expect(donateToMuseum(state, fish[0].id).ok).toBe(true);
    expect(donateToMuseum(state, fish[0].id).reason).toBe('msg.museumAlready');
    expect(donateToMuseum(state, 'fish_marlin').reason).toBe('msg.museumUndiscovered');
    expect(museumInfo(state).donated).toBe(1);
  });

  it('达到 5 件可领取第一档里程碑', () => {
    const { state, fish } = withFish(5);
    for (const f of fish) donateToMuseum(state, f.id);
    expect(museumInfo(state).donated).toBe(5);
    expect(museumInfo(state).canClaim).toBe(true);

    const coins = state.player.coins;
    const r = claimMuseumMilestone(state);
    expect(r.ok).toBe(true);
    expect(state.player.coins).toBe(coins + 1000);
    expect(state.museum.claimed).toBe(1);

    expect(claimMuseumMilestone(state).ok).toBe(false);
  });

  it('捐赠事件计入统计', () => {
    const { state, fish } = withFish(1);
    const r = donateToMuseum(state, fish[0].id);
    applyEvents(state, r.events!, NOW);
    expect(state.stats.museumDonations).toBe(1);
  });
});

describe('博物馆存档迁移', () => {
  it('v28 补齐 museum 与 museumDonations', () => {
    const state = makeGame();
    const raw = JSON.parse(JSON.stringify(state)) as Record<string, unknown>;
    raw.version = 28;
    delete raw.museum;
    delete (raw.stats as unknown as Record<string, unknown>).museumDonations;

    const migrated = deserialize(JSON.stringify(raw), NOW);

    expect(migrated.version).toBe(31);
    expect(migrated.museum).toEqual({ donated: [], claimed: 0 });
    expect(migrated.stats.museumDonations).toBe(0);
  });
});
