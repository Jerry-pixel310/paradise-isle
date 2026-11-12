/** 宠物训练测试 */
import { describe, expect, it } from 'vitest';
import { makeGame, NOW } from './helpers';
import { adoptPet, trainPet } from '../src/core/pets';
import { applyEvents } from '../src/core/quests';
import { PET_TRAIN_COOLDOWN_MS } from '../src/core/balance';
import { deserialize } from '../src/save/save';

function withPet() {
  const state = makeGame();
  state.player.level = 30;
  state.player.coins = 9999;
  expect(adoptPet(state, 'pet_puppy', '旺财', NOW).ok).toBe(true);
  return { state, pet: state.pets[0] };
}

describe('宠物训练', () => {
  it('命中越多经验越多，并记录训练次数', () => {
    const { state, pet } = withPet();
    const r = trainPet(state, pet.uid, 3, NOW);

    expect(r.ok).toBe(true);
    expect(pet.xp).toBe(30); // 6 + 3 * 8
    expect(pet.lastTrainedAt).toBe(NOW);
    applyEvents(state, r.events!, NOW);
    expect(state.stats.petTrainings).toBe(1);
  });

  it('冷却期间不能重复训练', () => {
    const { state, pet } = withPet();
    expect(trainPet(state, pet.uid, 2, NOW).ok).toBe(true);
    const again = trainPet(state, pet.uid, 2, NOW + 1000);
    expect(again.ok).toBe(false);
    expect(again.reason).toBe('msg.trainCd');
    expect(trainPet(state, pet.uid, 1, NOW + PET_TRAIN_COOLDOWN_MS + 1).ok).toBe(true);
  });

  it('训练消耗 1 点能量', () => {
    const { state, pet } = withPet();
    state.player.energy = 0;
    const r = trainPet(state, pet.uid, 1, NOW);
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('msg.noEnergy');
  });
});

describe('训练存档迁移', () => {
  it('v13 补齐训练统计与宠物冷却字段', () => {
    const { state, pet } = withPet();
    const raw = JSON.parse(JSON.stringify(state)) as Record<string, unknown>;
    raw.version = 13;
    delete (raw.stats as unknown as Record<string, unknown>).petTrainings;
    delete ((raw.pets as Array<Record<string, unknown>>)[0]).lastTrainedAt;

    const migrated = deserialize(JSON.stringify(raw), NOW);

    expect(migrated.version).toBe(31);
    expect(migrated.stats.petTrainings).toBe(0);
    expect(migrated.pets[0].lastTrainedAt).toBe(0);
    void pet;
  });
});
