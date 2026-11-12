/** 动物繁殖测试 */
import { describe, expect, it } from 'vitest';
import { makeGame, NOW } from './helpers';
import {
  animalPhase, breedAnimals, collectAnimal, feedAnimal, isAnimalBaby,
} from '../src/core/animals';
import { ANIMAL_BREED_COOLDOWN_MS, ANIMAL_GROW_MS } from '../src/core/balance';
import { applyEvents } from '../src/core/quests';
import { deserialize } from '../src/save/save';

function setup() {
  const state = makeGame();
  state.player.food = 30;
  state.player.energy = 30;
  state.animals.push(
    { uid: 1, defId: 'animal_chicken', x: 5, y: 5, fedAt: null },
    { uid: 2, defId: 'animal_chicken', x: 6, y: 5, fedAt: null },
  );
  return state;
}

describe('动物繁殖', () => {
  it('两只同种成年动物可繁殖出幼崽', () => {
    const state = setup();
    const r = breedAnimals(state, 1, 2, NOW);

    expect(r.ok).toBe(true);
    expect(state.animals).toHaveLength(3);
    const baby = state.animals[2];
    expect(baby.birthAt).toBe(NOW);
    expect(isAnimalBaby(baby, NOW)).toBe(true);
    expect(animalPhase(baby, NOW)).toBe('baby');
    expect(state.player.food).toBe(22);
    applyEvents(state, r.events!, NOW);
    expect(state.stats.animalsBred).toBe(1);
  });

  it('幼崽不能喂食/收取，长大后恢复', () => {
    const state = setup();
    breedAnimals(state, 1, 2, NOW);
    const baby = state.animals[2];
    expect(feedAnimal(state, baby.uid, NOW).ok).toBe(false);
    expect(collectAnimal(state, baby.uid, NOW).ok).toBe(false);
    expect(animalPhase(baby, NOW + ANIMAL_GROW_MS + 1)).toBe('hungry');
  });

  it('有繁殖冷却，且必须同种', () => {
    const state = setup();
    expect(breedAnimals(state, 1, 2, NOW).ok).toBe(true);
    const again = breedAnimals(state, 1, 2, NOW + 1000);
    expect(again.ok).toBe(false);
    expect(again.reason).toBe('msg.breedCd');

    state.animals[1].lastBreedAt = 0;
    state.animals[0].lastBreedAt = 0;
    state.animals[1].defId = 'animal_duck';
    expect(breedAnimals(state, 1, 2, NOW)).toBeTruthy();
    const mixed = breedAnimals(state, 1, 2, NOW);
    expect(mixed.reason).toBe('msg.breedSame');
    void ANIMAL_BREED_COOLDOWN_MS;
  });
});

describe('动物繁殖存档迁移', () => {
  it('v26 补齐 animalsBred', () => {
    const state = setup();
    const raw = JSON.parse(JSON.stringify(state)) as Record<string, unknown>;
    raw.version = 26;
    delete (raw.stats as unknown as Record<string, unknown>).animalsBred;

    const migrated = deserialize(JSON.stringify(raw), NOW);

    expect(migrated.version).toBe(31);
    expect(migrated.stats.animalsBred).toBe(0);
  });
});
