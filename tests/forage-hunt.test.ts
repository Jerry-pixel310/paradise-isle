/** 采摘 / 狩猎 / 花卉 新系统测试 */
import { describe, expect, it } from 'vitest';
import { makeGame, NOW } from './helpers';
import { gatherForage } from '../src/core/forage';
import { huntShot } from '../src/core/hunt';
import { cropDef, forageDef, gameDef } from '../src/core/registry';
import { plant } from '../src/core/crops';
import { beautyScore } from '../src/core/build';
import { deserialize } from '../src/save/save';

describe('采摘', () => {
  it('新岛开局就有野生资源', () => {
    const state = makeGame();
    expect(state.forage.length).toBeGreaterThan(0);
    expect(state.forage.length).toBeLessThanOrEqual(4);
    for (const spot of state.forage) {
      expect(forageDef(spot.defId).itemId).toMatch(/^item_forage_/);
    }
  });

  it('采摘消耗能量、获得物品并计入图鉴', () => {
    const state = makeGame();
    const spot = state.forage[0];
    const def = forageDef(spot.defId);
    const energy = state.player.energy;
    const food = state.player.food;

    const r = gatherForage(state, spot.uid, NOW);

    expect(r.ok).toBe(true);
    expect(state.inventory[def.itemId]).toBe(1);
    expect(state.collections.forage[def.id]).toBe(1);
    expect(state.player.energy).toBe(energy - 1);
    expect(state.player.food).toBe(food + def.food);
    expect(state.forage.some((f) => f.uid === spot.uid)).toBe(false);
  });

  it('能量不足时无法采摘', () => {
    const state = makeGame();
    state.player.energy = 0;
    state.player.energyUpdatedAt = NOW;
    const r = gatherForage(state, state.forage[0].uid, NOW);
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('msg.noEnergy');
  });
});

describe('狩猎', () => {
  it('满精度命中并猎获小型猎物', () => {
    const state = makeGame();
    const animal = state.game[0];
    const def = gameDef(animal.defId);
    expect(def.hp).toBe(1);

    const r = huntShot(state, animal.uid, 1, NOW);

    expect(r.ok).toBe(true);
    expect(r.shot?.hit).toBe(true);
    expect(r.shot?.defeated).toBe(true);
    expect(state.inventory[def.meatId]).toBe(1);
    expect(state.collections.game[def.id]).toBe(1);
    expect(state.game.some((g) => g.uid === animal.uid)).toBe(false);
  });

  it('射偏后猎物逃走', () => {
    const state = makeGame();
    const animal = state.game[0];
    const r = huntShot(state, animal.uid, 0, NOW);
    expect(r.shot?.hit).toBe(false);
    expect(r.shot?.fled).toBe(true);
    expect(state.game.some((g) => g.uid === animal.uid)).toBe(false);
  });

  it('两箭猎物第一箭只受伤', () => {
    const state = makeGame();
    const animal = state.game[0];
    animal.hp = 2; // 模拟中型猎物
    const r = huntShot(state, animal.uid, 1, NOW);
    expect(r.shot?.hit).toBe(true);
    expect(r.shot?.defeated).toBe(false);
    expect(state.game.find((g) => g.uid === animal.uid)?.hp).toBe(1);
  });
});

describe('花卉', () => {
  it('花卉种在田里会提升岛屿美观度', () => {
    const state = makeGame();
    state.player.level = 5;
    const plot = state.plots[0];
    state.inventory.seed_rose = 1;
    const before = beautyScore(state);

    const r = plant(state, plot.uid, 'crop_rose', NOW);

    expect(r.ok).toBe(true);
    expect(cropDef('crop_rose').isFlower).toBe(true);
    expect(beautyScore(state)).toBe(before + (cropDef('crop_rose').flowerBeauty ?? 0));
  });

  it('花卉与普通作物分属不同商店页', () => {
    expect(cropDef('crop_rose').isFlower).toBe(true);
    expect(cropDef('crop_carrot').isFlower).toBeFalsy();
    expect(cropDef('crop_apple').isTree).toBe(true);
  });
});

describe('旧存档迁移', () => {
  it('v3 存档补齐采摘/狩猎字段', () => {
    const state = makeGame();
    const raw = JSON.parse(JSON.stringify(state)) as Record<string, unknown>;
    raw.version = 3;
    delete raw.forage;
    delete raw.game;
    delete raw.nextForageAt;
    delete raw.nextGameAt;
    const collections = raw.collections as Record<string, unknown>;
    delete collections.forage;
    delete collections.game;

    const migrated = deserialize(JSON.stringify(raw), NOW);

    expect(migrated.version).toBe(31);
    expect(migrated.forage).toEqual([]);
    expect(migrated.game).toEqual([]);
    expect(migrated.collections.forage).toEqual({});
    expect(migrated.collections.game).toEqual({});
    expect(migrated.stats.forages).toBe(0);
    expect(migrated.stats.hunts).toBe(0);
    expect(migrated.stats.breeds).toBe(0);
    expect(migrated.settings.pixelate).toBe(false);
    expect(migrated.lastRainDay).toBe(-1);
    expect(migrated.interior).toEqual({
      owned: [],
      rooms: { living: [], bedroom: [], kitchen: [] },
      activeRoom: 'living',
    });
    expect(migrated.festival).toEqual({
      lastGiftDay: -1,
      activity: { season: 'spring', count: 0, claimed: 0 },
    });
  });
});
