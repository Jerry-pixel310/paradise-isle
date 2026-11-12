/** 宠物主动技能测试 */
import { describe, expect, it } from 'vitest';
import { makeGame, NOW } from './helpers';
import { adoptPet, usePetSkill } from '../src/core/pets';
import { applyEvents } from '../src/core/quests';
import { catchTable } from '../src/core/fishing';
import { allBeasts, itemDef } from '../src/core/registry';
import { PET_SKILL_COOLDOWN_MS } from '../src/core/balance';
import { DAY_MS } from '../src/core/calendar';
import { deserialize } from '../src/save/save';

function withPet(defId = 'pet_kitten', name = '咪咪') {
  const state = makeGame();
  state.player.level = 30;
  state.player.coins = 9999;
  state.player.rodTier = 3;
  expect(adoptPet(state, defId, name, NOW).ok).toBe(true);
  return { state, pet: state.pets[0] };
}

function highWeights(state: ReturnType<typeof makeGame>): number {
  const table = catchTable(state, NOW);
  return table.fish.reduce((sum, f, i) =>
    f.rarity !== 'common' && f.rarity !== 'uncommon' ? sum + table.weights[i] : sum, 0);
}

describe('宠物主动技能', () => {
  it('猫咪幸运钓鱼提升稀有鱼权重并进入冷却', () => {
    const { state, pet } = withPet();
    // 调到夏季夜晚，确保有稀有鱼可钓
    state.createdAt = NOW - 7 * DAY_MS - 11 * 60_000;
    const before = highWeights(state);
    expect(before).toBeGreaterThan(0);
    const r = usePetSkill(state, pet.uid, NOW);
    expect(r.ok).toBe(true);
    expect(state.buffs.luckyFishUntil).toBeGreaterThan(NOW);
    expect(highWeights(state)).toBeGreaterThan(before);
    expect(pet.skillUsedAt).toBe(NOW);

    const again = usePetSkill(state, pet.uid, NOW + 1000);
    expect(again.ok).toBe(false);
    expect(again.reason).toBe('msg.skillCd');
    expect(usePetSkill(state, pet.uid, NOW + PET_SKILL_COOLDOWN_MS + 1).ok).toBe(true);
  });

  it('小狗驱兽：有野兽时赶走一只，没有时失败', () => {
    const { state, pet } = withPet('pet_puppy', '旺财');
    const beast = allBeasts()[0];
    state.beasts.push({ uid: 1, defId: beast.id, x: 5, y: 5, hp: beast.hp, spawnedAt: NOW });

    expect(usePetSkill(state, pet.uid, NOW).ok).toBe(true);
    expect(state.beasts).toHaveLength(0);

    pet.skillUsedAt = 0;
    const r = usePetSkill(state, pet.uid, NOW + 1);
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('msg.skillNoTarget');
  });

  it('兔子鼓舞恢复能量，寻宝宠物带回礼物', () => {
    const { state, pet } = withPet('pet_bunny', '糖糖');
    state.player.energy = 5;
    expect(usePetSkill(state, pet.uid, NOW).ok).toBe(true);
    expect(state.player.energy).toBe(20);

    const pig = withPet('pet_piglet', '圆圆');
    const before = Object.keys(pig.state.inventory).length;
    expect(usePetSkill(pig.state, pig.pet.uid, NOW).ok).toBe(true);
    expect(Object.keys(pig.state.inventory).length).toBeGreaterThan(before);
    const added = Object.keys(pig.state.inventory)[0];
    expect(itemDef(added).sell).toBeGreaterThan(0);
    void state;
  });

  it('主动技能计入统计', () => {
    const { state, pet } = withPet();
    const r = usePetSkill(state, pet.uid, NOW);
    applyEvents(state, r.events!, NOW);
    expect(state.stats.petSkillsUsed).toBe(1);
  });
});

describe('技能存档迁移', () => {
  it('v19 补齐 buffs 与 petSkillsUsed', () => {
    const { state } = withPet();
    const raw = JSON.parse(JSON.stringify(state)) as Record<string, unknown>;
    raw.version = 19;
    delete raw.buffs;
    delete (raw.stats as unknown as Record<string, unknown>).petSkillsUsed;

    const migrated = deserialize(JSON.stringify(raw), NOW);

    expect(migrated.version).toBe(31);
    expect(migrated.buffs).toEqual({ luckyFishUntil: 0 });
    expect(migrated.stats.petSkillsUsed).toBe(0);
  });
});
