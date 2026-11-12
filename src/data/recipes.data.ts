/**
 * 手作表：烹饪（消耗鱼/肉/采摘物）+ 花艺（把三朵同种花扎成花束）。
 * 料理可直接食用恢复能量，花束可插进花瓶或高价出售。
 */
import type { ItemDef, RecipeDef } from '../core/types';
import { CROPS } from './crops.data';

export const DISH_GOODS: ItemDef[] = [  {
    id: 'dish_grilled_fish', name: { zh: '炭烤鱼', en: 'Grilled Fish' },
    category: 'dish', sell: 32, useEnergy: 8,
    desc: { zh: '外焦里嫩，恢复 8 点能量。', en: 'Crisp outside, juicy inside. +8 energy.' },
  },
  {
    id: 'dish_mushroom_soup', name: { zh: '蘑菇浓汤', en: 'Mushroom Soup' },
    category: 'dish', sell: 48, useEnergy: 12,
    desc: { zh: '暖胃的森林味道，恢复 12 点能量。', en: 'A warm forest broth. +12 energy.' },
  },
  {
    id: 'dish_berry_pie', name: { zh: '野莓派', en: 'Berry Pie' },
    category: 'dish', sell: 64, useEnergy: 15, useFood: 10,
    desc: { zh: '甜到心里，恢复 15 能量并 +10 食物。', en: 'Sweet and filling. +15 energy, +10 food.' },
  },
  {
    id: 'dish_meat_skewer', name: { zh: '烤肉串', en: 'Meat Skewer' },
    category: 'dish', sell: 78, useEnergy: 20,
    desc: { zh: '猎人的午餐，恢复 20 点能量。', en: 'A hunter’s lunch. +20 energy.' },
  },
  {
    id: 'dish_seafood_soup', name: { zh: '海鲜汤', en: 'Seafood Soup' },
    category: 'dish', sell: 58, useEnergy: 14,
    desc: { zh: '海风的味道，恢复 14 点能量。', en: 'Tastes like the sea. +14 energy.' },
  },
  {
    id: 'dish_flower_tea', name: { zh: '花茶', en: 'Flower Tea' },
    category: 'dish', sell: 44, useEnergy: 10,
    desc: { zh: '花瓣在杯里舒展开，恢复 10 点能量。', en: 'Petals unfurl in the cup. +10 energy.' },
  },
  {
    id: 'dish_hotcocoa', name: { zh: '热可可', en: 'Hot Cocoa' },
    category: 'dish', sell: 70, useEnergy: 15,
    desc: { zh: '冬夜限定，喝一口从头暖到脚。', en: 'Winter-only comfort in a cup. +15 energy.' },
  },
];

const short = (id: string): string => id.replace('crop_', '');

/** 牧场加工品：奶制品/毛线/布料 + 两道牧场料理 */
export const RANCH_GOODS: ItemDef[] = [
  { id: 'good_butter', name: { zh: '黄油', en: 'Butter' }, category: 'material', sell: 260, desc: { zh: '牛奶慢慢搅出的金色香气。', en: 'Golden richness churned from milk.' } },
  { id: 'good_cheese', name: { zh: '奶酪', en: 'Cheese' }, category: 'material', sell: 480, desc: { zh: '熟成后的浓郁奶香。', en: 'Rich, aged dairy flavor.' } },
  { id: 'good_goat_cheese', name: { zh: '羊奶酪', en: 'Goat Cheese' }, category: 'material', sell: 420, desc: { zh: '带一点山野的微酸。', en: 'A tangy hint of the hills.' } },
  { id: 'good_yarn', name: { zh: '毛线', en: 'Yarn' }, category: 'material', sell: 380, desc: { zh: '绕成团，织东西正合适。', en: 'A neat ball, ready for knitting.' } },
  { id: 'good_cloth', name: { zh: '羊毛布料', en: 'Wool Cloth' }, category: 'material', sell: 920, desc: { zh: '柔软厚实，能卖上好价钱。', en: 'Soft, thick and valuable.' } },
  { id: 'dish_egg_tart', name: { zh: '蛋挞', en: 'Egg Tart' }, category: 'dish', sell: 150, useEnergy: 10, desc: { zh: '酥皮里是嫩滑的蛋奶心，恢复 10 能量。', en: 'Flaky crust, silky custard. +10 energy.' } },
  { id: 'dish_cheese_toast', name: { zh: '芝士吐司', en: 'Cheese Toast' }, category: 'dish', sell: 240, useEnergy: 18, desc: { zh: '烤到拉丝的奶酪吐司，恢复 18 能量。', en: 'Grilled cheese on toast. +18 energy.' } },
];

export const RANCH_RECIPES: RecipeDef[] = [
  { id: 'recipe_butter', name: { zh: '搅打黄油', en: 'Churn Butter' }, tab: 'ranch', inputs: { good_cow: 1 }, outputId: 'good_butter', outputCount: 1, xp: 10 },
  { id: 'recipe_cheese', name: { zh: '熟成奶酪', en: 'Age Cheese' }, tab: 'ranch', inputs: { good_cow: 2 }, outputId: 'good_cheese', outputCount: 1, xp: 14 },
  { id: 'recipe_goat_cheese', name: { zh: '制作羊奶酪', en: 'Make Goat Cheese' }, tab: 'ranch', inputs: { good_goat: 2 }, outputId: 'good_goat_cheese', outputCount: 1, xp: 12 },
  { id: 'recipe_yarn', name: { zh: '纺毛线', en: 'Spin Yarn' }, tab: 'ranch', inputs: { good_sheep: 2 }, outputId: 'good_yarn', outputCount: 1, xp: 12 },
  { id: 'recipe_cloth', name: { zh: '织羊毛布', en: 'Weave Wool Cloth' }, tab: 'ranch', inputs: { good_sheep: 2, good_yarn: 1 }, outputId: 'good_cloth', outputCount: 1, xp: 20 },
  { id: 'recipe_egg_tart', name: { zh: '烤蛋挞', en: 'Bake Egg Tarts' }, tab: 'ranch', inputs: { good_chicken: 2, good_cow: 1 }, outputId: 'dish_egg_tart', outputCount: 1, xp: 16 },
  { id: 'recipe_cheese_toast', name: { zh: '做芝士吐司', en: 'Make Cheese Toast' }, tab: 'ranch', inputs: { good_cheese: 1, produce_corn: 1 }, outputId: 'dish_cheese_toast', outputCount: 1, xp: 18 },
];

/** 每种花都能扎成一束，另有一束三色混合花束 */
export const BOUQUET_GOODS: ItemDef[] = [
  ...CROPS.filter((c) => c.isFlower).map((c) => ({
    id: `bouquet_${short(c.id)}`,
    name: {
      zh: `${c.name.zh}花束`,
      en: `${c.name.en} Bouquet`,
    },
    category: 'bouquet' as const,
    sell: Math.round(c.sellPrice * 3 * 1.35),
    desc: { zh: '可以插进花瓶，也可以送给邻居。', en: 'Put it in a vase or give it to a neighbor.' },
  })),
  {
    id: 'bouquet_mixed',
    name: { zh: '三色花束', en: 'Tricolor Bouquet' },
    category: 'bouquet',
    sell: 280,
    desc: { zh: '三种颜色扎在一起，热闹又好看。', en: 'Three colors tied together.' },
  },
];

const flowerRecipes: RecipeDef[] = CROPS.filter((c) => c.isFlower).map((c) => ({
  id: `recipe_bouquet_${short(c.id)}`,
  name: { zh: `扎一束${c.name.zh}`, en: `Tie a ${c.name.en} Bouquet` },
  tab: 'flower' as const,
  inputs: { [c.produceId]: 3 },
  outputId: `bouquet_${short(c.id)}`,
  outputCount: 1,
  xp: 10 + (c.isHybrid ? 10 : 0),
}));

export const RECIPES: RecipeDef[] = [
  ...RANCH_RECIPES,
  ...flowerRecipes,
  {
    id: 'recipe_bouquet_mixed',
    name: { zh: '扎一束三色花束', en: 'Tie a Tricolor Bouquet' },
    tab: 'flower',
    inputs: { produce_rose: 1, produce_tulip: 1, produce_sunflower: 1 },
    outputId: 'bouquet_mixed',
    outputCount: 1,
    xp: 18,
  },
  // ---- 料理
  {
    id: 'recipe_grilled_fish',
    name: { zh: '炭烤鱼', en: 'Grill a Fish' },
    tab: 'cook',
    inputs: { fish_sardine: 2 },
    outputId: 'dish_grilled_fish',
    outputCount: 1,
    xp: 8,
  },
  {
    id: 'recipe_mushroom_soup',
    name: { zh: '蘑菇浓汤', en: 'Cook Mushroom Soup' },
    tab: 'cook',
    inputs: { item_forage_mushroom: 2, item_forage_herb: 1 },
    outputId: 'dish_mushroom_soup',
    outputCount: 1,
    xp: 12,
  },
  {
    id: 'recipe_berry_pie',
    name: { zh: '野莓派', en: 'Bake a Berry Pie' },
    tab: 'cook',
    inputs: { item_forage_berry: 3, produce_corn: 1 },
    outputId: 'dish_berry_pie',
    outputCount: 1,
    xp: 16,
  },
  {
    id: 'recipe_meat_skewer',
    name: { zh: '烤肉串', en: 'Grill a Meat Skewer' },
    tab: 'cook',
    inputs: { item_meat_rabbit: 1, produce_chili: 1 },
    outputId: 'dish_meat_skewer',
    outputCount: 1,
    xp: 18,
  },
  {
    id: 'recipe_seafood_soup',
    name: { zh: '海鲜汤', en: 'Cook Seafood Soup' },
    tab: 'cook',
    inputs: { fish_sardine: 1, item_forage_seaweed: 1 },
    outputId: 'dish_seafood_soup',
    outputCount: 1,
    xp: 12,
  },
  {
    id: 'recipe_flower_tea',
    name: { zh: '泡一壶花茶', en: 'Brew Flower Tea' },
    tab: 'cook',
    inputs: { produce_rose: 1, item_forage_herb: 1 },
    outputId: 'dish_flower_tea',
    outputCount: 1,
    xp: 10,
  },
];
