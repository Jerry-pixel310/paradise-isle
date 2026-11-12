/**
 * 四季节日：每个季节一个节日，提供限定商品与每日礼物。
 * 节日随季节自动切换，不需要手动开启。
 */
import type { FestivalDef } from '../core/types';

export const FESTIVALS: FestivalDef[] = [
  {
    season: 'spring',
    name: { zh: '春日花市', en: 'Spring Flower Market' },
    desc: { zh: '春风把花市吹到了岛上。限定樱花树苗、花种与节日缎带都在这里。', en: 'The spring flower market has arrived. Cherry saplings, seeds and festival ribbons are here.' },
    color: '#f08bb1',
    offers: [
      { id: 'spring_cherry', itemId: 'seed_cherryblossom', qty: 1, price: 320 },
      { id: 'spring_rose', itemId: 'seed_rose', qty: 2, price: 45 },
      { id: 'spring_ribbon', itemId: 'item_festival_ribbon', qty: 1, price: 120 },
    ],
    gift: { coins: 60, items: { seed_rose: 2 } },
    activity: {
      metric: 'flower',
      name: { zh: '春日花艺评比', en: 'Spring Floral Contest' },
      desc: { zh: '花市期间收获花卉，按数量分三档领奖。', en: 'Harvest flowers during the market and claim three tiers of rewards.' },
      tiers: [5, 15, 30],
      rewards: [
        { coins: 150, xp: 30 },
        { coins: 400, xp: 70 },
        { coins: 900, xp: 150 },
      ],
    },
  },
  {
    season: 'summer',
    name: { zh: '夏夜海灯节', en: 'Summer Sea Lantern Night' },
    desc: { zh: '海风、烟花和夜光饵。夏夜的海边比白天更热闹。', en: 'Sea breeze, fireworks and glow bait. The shore is livelier at night.' },
    color: '#5aa7e0',
    offers: [
      { id: 'summer_glow', itemId: 'item_bait_glow', qty: 3, price: 120 },
      { id: 'summer_firework', itemId: 'item_firework', qty: 1, price: 200 },
      { id: 'summer_shrimp', itemId: 'item_bait_shrimp', qty: 3, price: 45 },
    ],
    gift: { coins: 80, items: { item_bait_shrimp: 3 } },
    activity: {
      metric: 'fish',
      name: { zh: '夏夜钓鱼大赛', en: 'Summer Fishing Derby' },
      desc: { zh: '海灯节点亮时，钓上来的鱼都算成绩。', en: 'Every fish you catch during the lantern night counts.' },
      tiers: [3, 10, 25],
      rewards: [
        { coins: 180, xp: 40 },
        { coins: 500, xp: 90 },
        { coins: 1200, xp: 200 },
      ],
    },
  },
  {
    season: 'autumn',
    name: { zh: '秋日丰收祭', en: 'Autumn Harvest Fair' },
    desc: { zh: '南瓜、苹果和装满果实的篮子。丰收祭只卖当季最好的东西。', en: 'Pumpkins, apples and baskets full of fruit. The harvest fair sells the best of the season.' },
    color: '#f0a03c',
    offers: [
      { id: 'autumn_apple', itemId: 'seed_apple', qty: 1, price: 280 },
      { id: 'autumn_basket', itemId: 'item_harvest_basket', qty: 1, price: 220 },
      { id: 'autumn_pumpkin', itemId: 'produce_pumpkin', qty: 3, price: 180 },
    ],
    gift: { coins: 100, items: { produce_apple: 3 } },
    activity: {
      metric: 'crop',
      name: { zh: '秋日丰收挑战', en: 'Autumn Harvest Challenge' },
      desc: { zh: '丰收祭期间收获作物，收得越多奖励越高。', en: 'Harvest crops during the fair — the more the better.' },
      tiers: [10, 30, 70],
      rewards: [
        { coins: 200, xp: 40 },
        { coins: 600, xp: 100 },
        { coins: 1500, xp: 220 },
      ],
    },
  },
  {
    season: 'winter',
    name: { zh: '冬夜雪灯节', en: 'Winter Snow Lantern Festival' },
    desc: { zh: '雪夜里的一杯热可可，和一盏小灯。冬天也有温柔的一面。', en: 'A cup of hot cocoa and a little lantern on a snowy night. Winter can be gentle too.' },
    color: '#8fb4d8',
    offers: [
      { id: 'winter_cocoa', itemId: 'dish_hotcocoa', qty: 2, price: 120 },
      { id: 'winter_glow', itemId: 'item_bait_glow', qty: 3, price: 120 },
      { id: 'winter_ribbon', itemId: 'item_festival_ribbon', qty: 1, price: 120 },
    ],
    gift: { coins: 120, items: { dish_hotcocoa: 1 } },
    activity: {
      metric: 'forage',
      name: { zh: '冬夜雪灯收集', en: 'Snow Lantern Collection' },
      desc: { zh: '雪夜里采摘野生资源，为雪灯添一份光。', en: 'Forage wild plants in the snow to light the lanterns.' },
      tiers: [8, 20, 50],
      rewards: [
        { coins: 180, xp: 40 },
        { coins: 450, xp: 90 },
        { coins: 1000, xp: 200 },
      ],
    },
  },
];
