/**
 * 鱼饵表：不同鱼饵改变不同稀有度鱼的权重。
 * 每次甩竿消耗 1 份；不用鱼饵也能钓，只是概率更平均。
 */
import type { BaitDef } from '../core/types';

export const BAIT: BaitDef[] = [
  {
    id: 'bait_worm',
    name: { zh: '蚯蚓饵', en: 'Worm Bait' },
    itemId: 'item_bait_worm',
    price: 6,
    desc: { zh: '最普通的鱼饵，常见鱼更容易上钩。', en: 'Plain bait — common fish bite more often.' },
  },
  {
    id: 'bait_shrimp',
    name: { zh: '鲜虾饵', en: 'Shrimp Bait' },
    itemId: 'item_bait_shrimp',
    price: 18,
    desc: { zh: '腥味十足，少见与稀有鱼更活跃。', en: 'Smelly and effective on uncommon and rare fish.' },
  },
  {
    id: 'bait_glow',
    name: { zh: '夜光饵', en: 'Glow Bait' },
    itemId: 'item_bait_glow',
    price: 45,
    desc: { zh: '夜里会发光，专钓史诗与传说鱼。', en: 'Glows at night — draws epic and legendary fish.' },
  },
  {
    id: 'bait_honey',
    name: { zh: '花蜜饵', en: 'Honey Bait' },
    itemId: 'item_bait_honey',
    price: 30,
    desc: { zh: '甜香四溢，稀有鱼更愿意靠近。', en: 'Sweet and fragrant — rare fish come closer.' },
  },
];
