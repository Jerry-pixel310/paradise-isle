/** v1.1 新系统：日历天气 / 烹饪 / 食用 / 花卉杂交 / 蓄力弓 */
import { describe, expect, it } from 'vitest';
import { makeGame, NOW } from './helpers';
import {
  calendarAt, DAY_MS, seasonGrowth, seasonOf, weatherFor,
} from '../src/core/calendar';
import { craft } from '../src/core/craft';
import { eatItem } from '../src/core/items';
import { canCross, crossPollinate } from '../src/core/flower';
import { chargeFactor, huntShot } from '../src/core/hunt';
import { cropDef, itemDef } from '../src/core/registry';
import { plant } from '../src/core/crops';
import { tickWorld } from '../src/core/state';
import { gatherForage } from '../src/core/forage';
import { storePlacement } from '../src/core/build';
import { tickPetsFollow } from '../src/core/pets';
import { isWetWeather } from '../src/core/calendar';
import { beautyScore } from '../src/core/build';
import {
  buyFurniture, kitchenCraftBonus, moveFurniture, placeFurniture, removeFurniture, rotateFurniture,
} from '../src/core/interior';
import { furnitureDef } from '../src/core/registry';
import { deserialize } from '../src/save/save';

describe('日历与天气', () => {
  it('开局是春天第 1 天', () => {
    const cal = calendarAt(NOW, NOW, 1);
    expect(cal.dayIndex).toBe(0);
    expect(cal.season).toBe('spring');
    expect(cal.dayOfSeason).toBe(0);
  });

  it('时间会推进到下一天/下一季', () => {
    expect(calendarAt(NOW, NOW + DAY_MS, 1).dayIndex).toBe(1);
    expect(seasonOf(7)).toBe('summer');
    expect(seasonOf(14)).toBe('autumn');
    expect(seasonOf(21)).toBe('winter');
    expect(seasonOf(28)).toBe('spring');
  });

  it('天气由种子和日期确定，同一天不会变', () => {
    for (const season of ['spring', 'summer', 'autumn', 'winter'] as const) {
      expect(weatherFor(123, 5, season)).toBe(weatherFor(123, 5, season));
    }
  });

  it('冬天生长更慢', () => {
    expect(seasonGrowth('winter')).toBeLessThan(seasonGrowth('spring'));
  });
});

describe('烹饪与食用', () => {
  it('烤鱼消耗 2 条沙丁鱼并产出料理', () => {
    const state = makeGame();
    state.inventory.fish_sardine = 2;
    const energy = state.player.energy;

    const r = craft(state, 'recipe_grilled_fish', NOW);

    expect(r.ok).toBe(true);
    expect(state.inventory.fish_sardine).toBeUndefined();
    expect(state.inventory.dish_grilled_fish).toBe(1);
    expect(state.player.energy).toBe(energy - 1);
  });

  it('材料不足时不能制作', () => {
    const state = makeGame();
    const r = craft(state, 'recipe_grilled_fish', NOW);
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('msg.notEnough');
  });

  it('料理可以食用恢复能量', () => {
    const state = makeGame();
    state.inventory.dish_grilled_fish = 1;
    state.player.energy = 5;
    state.player.energyUpdatedAt = NOW;

    const r = eatItem(state, 'dish_grilled_fish');

    expect(r.ok).toBe(true);
    expect(state.inventory.dish_grilled_fish).toBeUndefined();
    expect(state.player.energy).toBe(13);
  });

  it('花束配方产出花束', () => {
    const state = makeGame();
    state.inventory.produce_rose = 3;
    const r = craft(state, 'recipe_bouquet_rose', NOW);
    expect(r.ok).toBe(true);
    expect(state.inventory.bouquet_rose).toBe(1);
    expect(itemDef('bouquet_rose').category).toBe('bouquet');
  });
});

describe('花卉杂交', () => {
  it('两株相邻同种成熟花可以杂交，并获得种子', () => {
    const state = makeGame();
    state.player.level = 10;
    state.inventory.seed_rose = 2;
    const [a, b] = state.plots;
    expect(plant(state, a.uid, 'crop_rose', NOW).ok).toBe(true);
    expect(plant(state, b.uid, 'crop_rose', NOW).ok).toBe(true);
    a.crop!.plantedAt = NOW - 60 * 60_000;
    b.crop!.plantedAt = NOW - 60 * 60_000;

    expect(canCross(state, a.uid, b.uid, NOW)).toBeNull();
    const r = crossPollinate(state, a.uid, b.uid, NOW);

    expect(r.ok).toBe(true);
    expect(a.crop).toBeNull();
    expect(b.crop).toBeNull();
    const gained = (state.inventory.seed_blue_rose ?? 0) + (state.inventory.seed_rose ?? 0);
    expect(gained).toBeGreaterThanOrEqual(1);
  });

  it('不同种或不相邻的花不能杂交', () => {
    const state = makeGame();
    state.player.level = 10;
    state.inventory.seed_rose = 1;
    state.inventory.seed_tulip = 1;
    const [a, b] = state.plots;
    plant(state, a.uid, 'crop_rose', NOW);
    plant(state, b.uid, 'crop_tulip', NOW);
    expect(canCross(state, a.uid, b.uid, NOW)).toBe('msg.crossSpecies');
    expect(canCross(state, a.uid, a.uid, NOW)).toBe('msg.crossSame');
  });
});

describe('蓄力弓', () => {
  it('蓄力区间影响精度', () => {
    expect(chargeFactor(0.2)).toBeLessThan(1);
    expect(chargeFactor(0.75)).toBe(1);
    expect(chargeFactor(0.99)).toBeLessThan(1);
  });

  it('瞄得准但蓄力太轻会射偏', () => {
    const state = makeGame();
    const animal = state.game[0];
    const r = huntShot(state, animal.uid, 1, NOW, 0.2);
    expect(r.shot?.hit).toBe(false);
    expect(r.shot?.fled).toBe(true);
  });
});

describe('杂交花卉数据', () => {
  it('杂交品种不在普通商店出售', () => {
    expect(cropDef('crop_blue_rose').isHybrid).toBe(true);
    expect(cropDef('crop_blue_rose').isFlower).toBe(true);
  });
});

describe('雨天与图鉴奖励', () => {
  it('雨天会自动给作物补水（每个游戏日一次）', () => {
    let rainSeed = -1;
    for (let s = 1; s < 5000; s++) {
      if (isWetWeather(weatherFor(s, 0, 'spring'))) { rainSeed = s; break; }
    }
    expect(rainSeed).toBeGreaterThan(0);
    const state = makeGame(rainSeed);
    const plot = state.plots[0];
    expect(plant(state, plot.uid, 'crop_carrot', NOW).ok).toBe(true);
    const before = plot.crop!.wateredBonusMs;

    const tick = tickWorld(state, NOW + 1000);

    expect(tick.rained).toBe(true);
    expect(plot.crop!.wateredBonusMs).toBeGreaterThan(before);
    expect(state.lastRainDay).toBe(0);
  });

  it('首次采摘新资源奖励 20 金币，重复采摘不再奖励', () => {
    const state = makeGame();
    const coins = state.player.coins;
    const first = state.forage[0];
    const firstDef = first.defId;
    gatherForage(state, first.uid, NOW);
    expect(state.player.coins).toBe(coins + 20);
    const other = state.forage.find((f) => f.defId !== firstDef);
    if (other) {
      gatherForage(state, other.uid, NOW);
      expect(state.player.coins).toBe(coins + 40);
    }
    // 再采一次同种资源：不再奖励
    state.forage.push({ uid: 90001, defId: firstDef, x: 0, y: 0, spawnedAt: NOW });
    gatherForage(state, 90001, NOW);
    expect(state.player.coins).toBe(coins + (other ? 40 : 20));
  });

  it('收纳花瓶会把花束退回背包', () => {
    const state = makeGame();
    state.placements.push({ uid: 777, defId: 'bld_vase', x: 2, y: 2, rot: 0, variant: 'bouquet_rose' });
    storePlacement(state, 777);
    expect(state.inventory.bouquet_rose).toBe(1);
    expect(state.placements.some((p) => p.uid === 777)).toBe(false);
  });

  it('宠物会朝玩家靠近', () => {
    const state = makeGame();
    state.pets.push({
      uid: 888, defId: 'pet_puppy', name: '旺财', adoptedAt: NOW, fedAt: NOW,
      playedAt: 0, xp: 0, skillUsedAt: 0,
      x: Math.round(state.player.px) + 4, y: Math.round(state.player.py),
    });
    const before = Math.hypot(state.pets[0].x - state.player.px, state.pets[0].y - state.player.py);
    for (let i = 0; i < 3; i++) tickPetsFollow(state, NOW + i * 1000);
    const after = Math.hypot(state.pets[0].x - state.player.px, state.pets[0].y - state.player.py);
    expect(after).toBeLessThan(before);
  });
});

describe('室内装修', () => {
  it('购买并摆放家具会提升美观度，移动/旋转/收纳生效', () => {
    const state = makeGame();
    state.player.coins = 5000;
    state.player.level = 10;
    const before = beautyScore(state);

    expect(buyFurniture(state, 'furn_bed_basic').ok).toBe(true);
    expect(placeFurniture(state, 'bedroom', 'furn_bed_basic', 2, 1).ok).toBe(true);
    expect(state.interior.rooms.bedroom).toHaveLength(1);
    expect(beautyScore(state)).toBe(before + furnitureDef('furn_bed_basic').beauty);

    const uid = state.interior.rooms.bedroom[0].uid;
    expect(moveFurniture(state, 'bedroom', uid, 5, 3).ok).toBe(true);
    expect(state.interior.rooms.bedroom[0].x).toBe(5);
    expect(rotateFurniture(state, 'bedroom', uid).ok).toBe(true);
    expect(state.interior.rooms.bedroom[0].rot).toBe(1);
    expect(removeFurniture(state, 'bedroom', uid).ok).toBe(true);
    expect(state.interior.rooms.bedroom).toHaveLength(0);
  });

  it('没买过的家具不能摆放，重叠位置不能放', () => {
    const state = makeGame();
    state.player.coins = 5000;
    state.player.level = 10;
    expect(placeFurniture(state, 'living', 'furn_bed_lux', 2, 1).ok).toBe(false);

    buyFurniture(state, 'furn_bed_basic');
    buyFurniture(state, 'furn_chair_basic');
    expect(placeFurniture(state, 'living', 'furn_bed_basic', 2, 1).ok).toBe(true);
    expect(placeFurniture(state, 'living', 'furn_chair_basic', 2, 1).ok).toBe(false);
    expect(placeFurniture(state, 'living', 'furn_chair_basic', 6, 4).ok).toBe(true);
  });

  it('地毯可以垫在其它家具下面', () => {
    const state = makeGame();
    state.player.coins = 5000;
    state.player.level = 10;
    buyFurniture(state, 'furn_rug_basic');
    buyFurniture(state, 'furn_table_basic');
    expect(placeFurniture(state, 'living', 'furn_rug_basic', 4, 3).ok).toBe(true);
    expect(placeFurniture(state, 'living', 'furn_table_basic', 4, 3).ok).toBe(true);
  });

  it('房间限制与厨房加成', () => {
    const state = makeGame();
    state.player.coins = 5000;
    state.player.level = 10;
    buyFurniture(state, 'furn_stove');
    expect(placeFurniture(state, 'living', 'furn_stove', 2, 2).ok).toBe(false);
    expect(placeFurniture(state, 'kitchen', 'furn_stove', 2, 2).ok).toBe(true);
    expect(kitchenCraftBonus(state)).toBeCloseTo(1.2);
    expect(kitchenCraftBonus(makeGame())).toBe(1);
  });

  it('v6 固定槽位存档会迁移成自由摆放', () => {
    const state = makeGame();
    const raw = JSON.parse(JSON.stringify(state)) as Record<string, unknown>;
    raw.version = 6;
    raw.uidCounter = 10;
    raw.interior = { owned: ['furn_bed_basic'], placed: { bed: 'furn_bed_basic' } };

    const migrated = deserialize(JSON.stringify(raw), NOW);

    expect(migrated.version).toBe(31);
    expect(migrated.interior.rooms.living).toHaveLength(1);
    expect(migrated.interior.rooms.living[0]).toMatchObject({ defId: 'furn_bed_basic', x: 2, y: 1, rot: 0 });
    expect((migrated.interior as unknown as Record<string, unknown>).placements).toBeUndefined();
    expect(migrated.festival.lastGiftDay).toBe(-1);
    expect(migrated.festival.activity).toEqual({ season: 'spring', count: 0, claimed: 0 });
  });
});
