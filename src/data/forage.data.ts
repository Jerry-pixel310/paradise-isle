/**
 * 采摘表：岛上自然生长的野生资源，按地形刷新，点击即可采集。
 * 采集消耗 1 点能量，产出可直接出售，也计入采集图鉴。
 */
import type { ForageDef } from '../core/types';

function forage(
  id: string, zh: string, en: string, itemId: string, sell: number,
  xp: number, food: number, terrain: 'grass' | 'sand', weight: number,
): ForageDef {
  return {
    id: `forage_${id}`,
    name: { zh, en },
    itemId,
    sell, xp, food, terrain, weight,
    sprite: `forage_${id}`,
  };
}

export const FORAGE: ForageDef[] = [
  forage('berry',    '野莓',   'Wild Berry',      'item_forage_berry',    12, 2, 3, 'grass', 10),
  forage('mushroom', '蘑菇',   'Forest Mushroom', 'item_forage_mushroom', 18, 3, 4, 'grass', 7),
  forage('herb',     '香草',   'Wild Herb',       'item_forage_herb',     26, 4, 1, 'grass', 6),
  forage('honey',    '野蜂巢', 'Wild Honeycomb',  'item_forage_honey',    55, 6, 6, 'grass', 3),
  forage('truffle',  '松露',   'Truffle',         'item_forage_truffle',  90, 8, 3, 'grass', 1.5),
  forage('shell',    '花贝壳', 'Beach Shell',     'item_forage_shell',    16, 2, 0, 'sand',  6),
  forage('seaweed',  '海藻',   'Sea Lettuce',     'item_forage_seaweed',  10, 2, 5, 'sand',  7),
  forage('coconut',  '落椰',   'Fallen Coconut',  'item_forage_coconut',  22, 3, 4, 'sand',  5),
];
