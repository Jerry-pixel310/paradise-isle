/** 内容表完整性校验：引用一致、数值健康、无占位数据 */
import { describe, expect, it } from 'vitest';
import '../src/data';
import {
  allAchievements, allAnimals, allBait, allBeasts, allBuildings, allClothing, allCrops,
  allFish, allFurniture, allNeighbors, allPets, allQuests, allRecipes, itemDef, REG,
} from '../src/core/registry';
import { FESTIVALS } from '../src/data/festivals.data';

describe('内容表完整性', () => {
  it('规模达标：作物≥24 动物≥10 野兽≥8 鱼≥24 建筑≥40 服装≥40 宠物≥8 邻居≥8', () => {
    expect(allCrops().length).toBeGreaterThanOrEqual(24);
    expect(allAnimals().length).toBeGreaterThanOrEqual(10);
    expect(allBeasts().length).toBeGreaterThanOrEqual(8);
    expect(allFish().length).toBeGreaterThanOrEqual(35);
    expect(allBuildings().length).toBeGreaterThanOrEqual(40);
    expect(allClothing().length).toBeGreaterThanOrEqual(40);
    expect(allPets().length).toBeGreaterThanOrEqual(8);
    expect(allNeighbors().length).toBeGreaterThanOrEqual(8);
    expect(allQuests().filter((q) => !q.daily).length).toBeGreaterThanOrEqual(15);
    expect(allQuests().filter((q) => q.daily).length).toBeGreaterThanOrEqual(10);
    expect(allAchievements().length).toBeGreaterThanOrEqual(20);
  });

  it('作物的种子与产出物品都已注册且定价合理', () => {
    for (const c of allCrops()) {
      expect(itemDef(c.seedId).category).toBe('seed');
      expect(itemDef(c.produceId).category).toBe('produce');
      expect(itemDef(c.produceId).sell).toBe(c.sellPrice);
      expect(c.sellPrice * c.yieldMin).toBeGreaterThan(0);
      // 期望收益为正：田地作物一次收成即回本；果树按 10 次采收摊销树苗价
      const avgYield = (c.yieldMin + c.yieldMax) / 2;
      if (c.isTree) {
        expect(c.sellPrice * avgYield * 10).toBeGreaterThan(c.seedPrice);
      } else {
        expect(c.sellPrice * avgYield).toBeGreaterThan(c.seedPrice * 0.9);
      }
      expect(c.growMs).toBeGreaterThan(0);
      if (c.isTree) expect(c.regrowMs).toBeGreaterThan(0);
      else expect(c.witherMs).toBeGreaterThan(0);
      expect(c.name.zh.length).toBeGreaterThan(0);
      expect(c.name.en.length).toBeGreaterThan(0);
    }
  });

  it('动物产出物品已注册且喂养有利润', () => {
    for (const a of allAnimals()) {
      const good = itemDef(a.produceId);
      expect(good.category).toBe('animalGood');
      expect(good.sell * a.produceMin).toBeGreaterThan(a.feedCost); // 食物1≈金币1的宽松下界
    }
  });

  it('野兽掉落物已注册', () => {
    for (const b of allBeasts()) {
      if (b.dropId) expect(itemDef(b.dropId).sell).toBeGreaterThan(0);
      expect(b.hp).toBeGreaterThan(0);
      expect(b.coinMax).toBeGreaterThanOrEqual(b.coinMin);
    }
  });

  it('家具表完整且槽位合法', () => {
    expect(allFurniture().length).toBeGreaterThanOrEqual(8);
    const slots = new Set([
      'bed', 'table', 'chair', 'rug', 'lamp', 'shelf', 'plant', 'fireplace',
      'sofa', 'tv', 'counter', 'stove', 'fridge', 'wardrobe', 'vanity',
    ]);
    for (const f of allFurniture()) {
      expect(slots.has(f.slot)).toBe(true);
      expect(f.price).toBeGreaterThan(0);
      expect(f.beauty).toBeGreaterThan(0);
      expect(f.w).toBeGreaterThan(0);
      expect(f.h).toBeGreaterThan(0);
    }
  });

  it('鱼饵物品已注册且价格合理', () => {    expect(allBait().length).toBeGreaterThanOrEqual(4);
    for (const b of allBait()) {
      const item = itemDef(b.itemId);
      expect(item.category).toBe('bait');
      expect(b.price).toBeGreaterThan(0);
      expect(item.sell).toBeGreaterThan(0);
    }
  });

  it('节日商品与礼物物品都已注册', () => {
    expect(FESTIVALS).toHaveLength(4);
    for (const f of FESTIVALS) {
      expect(f.offers.length).toBeGreaterThan(0);
      for (const o of f.offers) expect(() => itemDef(o.itemId)).not.toThrow();
      for (const id of Object.keys(f.gift.items)) expect(() => itemDef(id)).not.toThrow();
      expect(f.gift.coins).toBeGreaterThan(0);
      expect(f.activity.tiers.length).toBe(3);
      expect(f.activity.rewards.length).toBe(3);
      for (let i = 1; i < f.activity.tiers.length; i++) {
        expect(f.activity.tiers[i]).toBeGreaterThan(f.activity.tiers[i - 1]);
      }
    }
  });

  it('手作配方引用的材料与产物都已注册', () => {
    expect(allRecipes().length).toBeGreaterThanOrEqual(10);
    for (const r of allRecipes()) {
      expect(() => itemDef(r.outputId)).not.toThrow();
      for (const id of Object.keys(r.inputs)) expect(() => itemDef(id)).not.toThrow();
      expect(r.outputCount).toBeGreaterThan(0);
    }
  });

  it('鱼按稀有度定价递增（组内均值）', () => {    const avg = (r: string): number => {
      const group = allFish().filter((f) => f.rarity === r);
      return group.reduce((s, f) => s + f.sellPrice, 0) / group.length;
    };
    expect(avg('uncommon')).toBeGreaterThan(avg('common'));
    expect(avg('rare')).toBeGreaterThan(avg('uncommon'));
    expect(avg('epic')).toBeGreaterThan(avg('rare'));
    expect(avg('legendary')).toBeGreaterThan(avg('epic'));
  });

  it('服装每个槽位至少有可穿的初始项', () => {
    for (const slot of ['skin', 'hair', 'face', 'top', 'bottom'] as const) {
      const free = allClothing().filter((c) => c.slot === slot && c.price === 0);
      expect(free.length).toBeGreaterThan(0);
    }
  });

  it('任务链前置引用有效且奖励非空', () => {
    for (const q of allQuests()) {
      if (q.after) expect(REG.quests.has(q.after)).toBe(true);
      const r = q.reward;
      expect((r.coins ?? 0) + (r.xp ?? 0) + (r.food ?? 0) + (r.energy ?? 0) + (r.reputation ?? 0) +
        Object.keys(r.items ?? {}).length).toBeGreaterThan(0);
      for (const step of q.steps) expect(step.count).toBeGreaterThan(0);
    }
    // 任务奖励物品有效
    for (const q of allQuests()) {
      for (const id of Object.keys(q.reward.items ?? {})) {
        expect(() => itemDef(id)).not.toThrow();
      }
    }
  });

  it('成就对应的统计键存在于 Stats 初始值', () => {
    const statKeys = new Set([
      'harvests', 'plantings', 'waterings', 'animalsCollected', 'animalsFed', 'fishCaught',
      'rareFishCaught', 'beastsDefeated', 'forages', 'hunts', 'flowersHarvested',
      'breeds', 'dishesCooked', 'bouquetsMade', 'baitsUsed', 'giftsGiven', 'petTrainings', 'petContests', 'neighborChats', 'neighborStories', 'dexRewards', 'ordersDone', 'petSkillsUsed', 'ratingClaims', 'outfitsSaved', 'goldHarvests', 'silverHarvests', 'birthdayGifts', 'pondHarvests', 'restaurantServices', 'animalsBred', 'furnitureUses', 'museumDonations', 'checkins',
      'weedsCleared', 'buildingsPlaced', 'clothesBought',
      'petsAdopted', 'petFeeds', 'petPlays', 'visits', 'helps', 'pranks', 'hires', 'coinsEarned',
      'coinsSpent', 'itemsSold', 'expansions', 'questsDone', 'daysPlayed',
    ]);
    for (const a of allAchievements()) {
      expect(statKeys.has(a.stat)).toBe(true);
      // 阶梯递增
      for (let i = 1; i < a.tiers.length; i++) {
        expect(a.tiers[i]).toBeGreaterThan(a.tiers[i - 1]);
      }
    }
  });

  it('NPC 邻居人设完整：偏好作物有效、有台词、服装引用有效', () => {
    for (const n of allNeighbors()) {
      expect(REG.crops.has(n.favoriteCrop)).toBe(true);
      expect(n.greetings.length).toBeGreaterThan(0);
      expect(n.thanks.length).toBeGreaterThan(0);
      expect(n.angry.length).toBeGreaterThan(0);
      expect(REG.clothing.has(n.avatar.top)).toBe(true);
      expect(REG.clothing.has(n.avatar.hair)).toBe(true);
    }
  });
});
