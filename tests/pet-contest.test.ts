/** 每日宠物大赛测试 */
import { describe, expect, it } from 'vitest';
import { makeGame, NOW } from './helpers';
import { adoptPet } from '../src/core/pets';
import { contestDoneToday, contestRank, contestScore, enterPetContest } from '../src/core/petContest';
import { applyEvents, dayKey } from '../src/core/quests';
import { deserialize } from '../src/save/save';

function withPet() {
  const state = makeGame();
  state.player.level = 30;
  state.player.coins = 9999;
  expect(adoptPet(state, 'pet_puppy', '旺财', NOW).ok).toBe(true);
  return { state, pet: state.pets[0] };
}

describe('宠物大赛', () => {
  it('每只宠物每天只能参赛一次，按排名发金币与经验', () => {
    const { state, pet } = withPet();
    const coins = state.player.coins;

    const first = enterPetContest(state, pet.uid, NOW);

    expect(first.ok).toBe(true);
    expect(first.contest).toBeDefined();
    expect(['S', 'A', 'B', 'C']).toContain(first.contest!.rank);
    expect(first.contest!.coins).toBeGreaterThan(0);
    expect(state.player.coins).toBe(coins + first.contest!.coins);
    expect(pet.xp).toBe(12);
    expect(pet.lastContestDay).toBe(dayKey(NOW));
    expect(contestDoneToday(pet, NOW)).toBe(true);

    const second = enterPetContest(state, pet.uid, NOW);
    expect(second.ok).toBe(false);
    expect(second.reason).toBe('msg.contestDone');
  });

  it('同一天同一只宠物的得分是确定的', () => {
    const { pet } = withPet();
    expect(contestScore(pet, NOW)).toBe(contestScore(pet, NOW));
  });

  it('等级越高越容易拿高排名', () => {
    const { pet } = withPet();
    pet.xp = 4000;
    expect(contestScore(pet, NOW)).toBeGreaterThan(90);
    expect(contestRank(contestScore(pet, NOW))).toBe('S');
  });

  it('参赛事件会计入统计', () => {
    const { state, pet } = withPet();
    const r = enterPetContest(state, pet.uid, NOW);
    applyEvents(state, r.events!, NOW);
    expect(state.stats.petContests).toBe(1);
  });
});

describe('大赛存档迁移', () => {
  it('v14 补齐 petContests 统计', () => {
    const { state } = withPet();
    const raw = JSON.parse(JSON.stringify(state)) as Record<string, unknown>;
    raw.version = 14;
    delete (raw.stats as unknown as Record<string, unknown>).petContests;

    const migrated = deserialize(JSON.stringify(raw), NOW);

    expect(migrated.version).toBe(31);
    expect(migrated.stats.petContests).toBe(0);
  });
});
