/**
 * 狩猎表：岛上出没的野生动物。
 * 瞄准小游戏命中 hp 次即可猎获；射偏则猎物受惊逃走。
 */
import type { GameDef } from '../core/types';

function game(
  id: string, zh: string, en: string, minLevel: number,
  hp: number, zone: number, speed: number,
  meatId: string, peltId: string | undefined, peltChance: number,
  coinMin: number, coinMax: number, xp: number,
): GameDef {
  return {
    id: `game_${id}`,
    name: { zh, en },
    minLevel, hp, zone, speed,
    meatId, peltId, peltChance,
    coinMin, coinMax, xp,
    sprite: `game_${id}`,
  };
}

export const GAME: GameDef[] = [
  // 小型猎物：一箭即中，瞄准区宽，适合上手
  game('rabbit',   '野兔',   'Wild Rabbit',   1, 1, 0.30, 0.75,
    'item_meat_rabbit',   'item_pelt_rabbit',   0.45,  8,  18,  8),
  game('pheasant', '山鸡',   'Pheasant',      1, 1, 0.26, 1.05,
    'item_meat_pheasant', 'item_feather_pheasant', 0.55, 10, 22, 10),
  // 中型猎物：需要两箭，射偏就逃
  game('deer',     '梅花鹿', 'Sika Deer',     4, 2, 0.22, 1.15,
    'item_meat_venison',  'item_pelt_deer',     0.60, 25, 45, 18),
  game('boar',     '野猪',   'Wild Boar',     8, 2, 0.18, 1.30,
    'item_meat_boar',     'item_tusk_boar',     0.50, 35, 65, 26),
  game('goat',     '野山羊', 'Wild Goat',    12, 3, 0.16, 1.25,
    'item_meat_goat',     'item_pelt_goat',     0.65, 50, 90, 34),
];

/** 狩猎产出的物品（肉/皮毛），由 data/index 注册 */
export const GAME_GOODS = [
  { id: 'item_meat_rabbit',       name: { zh: '兔肉',   en: 'Rabbit Meat' },   category: 'meat' as const, sell: 18 },
  { id: 'item_meat_pheasant',     name: { zh: '禽肉',   en: 'Pheasant Meat' }, category: 'meat' as const, sell: 24 },
  { id: 'item_meat_venison',      name: { zh: '鹿肉',   en: 'Venison' },       category: 'meat' as const, sell: 48 },
  { id: 'item_meat_boar',         name: { zh: '野猪肉', en: 'Boar Meat' },      category: 'meat' as const, sell: 62 },
  { id: 'item_meat_goat',         name: { zh: '山羊肉', en: 'Goat Meat' },      category: 'meat' as const, sell: 85 },
  { id: 'item_pelt_rabbit',       name: { zh: '兔皮',   en: 'Rabbit Pelt' },    category: 'pelt' as const, sell: 26 },
  { id: 'item_feather_pheasant',  name: { zh: '山鸡羽', en: 'Pheasant Feather' }, category: 'pelt' as const, sell: 30 },
  { id: 'item_pelt_deer',         name: { zh: '鹿皮',   en: 'Deer Hide' },      category: 'pelt' as const, sell: 95 },
  { id: 'item_tusk_boar',         name: { zh: '野猪牙', en: 'Boar Tusk' },      category: 'pelt' as const, sell: 70 },
  { id: 'item_pelt_goat',         name: { zh: '山羊皮', en: 'Goat Hide' },      category: 'pelt' as const, sell: 110 },
];

