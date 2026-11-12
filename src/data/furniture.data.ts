/**
 * 家具表：小屋里按槽位摆放，共 12 件，分 8 个槽位。
 * 每个槽位只放一件；更好的家具提供更高美观度。
 */
import type { FurnitureDef, FurnitureSlot, RoomId } from '../core/types';

function furn(
  id: string, zh: string, en: string, slot: FurnitureSlot,
  price: number, unlockLevel: number, beauty: number,
  x: number, y: number, w: number, h: number, room?: RoomId,
): FurnitureDef {
  return {
    id: `furn_${id}`,
    name: { zh, en },
    slot, room, price, unlockLevel, beauty, x, y, w, h,
    sprite: `furn_${id}`,
  };
}

export const FURNITURE: FurnitureDef[] = [
  furn('bed_basic', '木床',     'Wooden Bed',    'bed',       350,  1, 18, 2, 1, 2, 2),
  furn('bed_lux',   '云朵大床', 'Cloud Bed',     'bed',      1400,  8, 36, 2, 1, 2, 2),
  furn('table_basic','木圆桌',  'Round Table',   'table',     200,  1, 10, 4, 3, 1, 1),
  furn('table_desk','书桌',     'Writing Desk',  'table',     650,  6, 20, 4, 3, 2, 1),
  furn('chair_basic','木椅',    'Wooden Chair',  'chair',     100,  1,  6, 6, 4, 1, 1),
  furn('chair_soft','软垫椅',   'Cushion Chair', 'chair',     420,  5, 14, 6, 4, 1, 1),
  furn('rug_basic', '草编地毯', 'Woven Rug',     'rug',       160,  1,  8, 4, 5, 2, 2),
  furn('rug_soft',  '绒花地毯', 'Plush Rug',     'rug',       600,  7, 22, 4, 5, 2, 2),
  furn('lamp_basic','落地灯',   'Floor Lamp',    'lamp',      300,  2, 12, 8, 5, 1, 1),
  furn('shelf_basic','书架',    'Bookshelf',     'shelf',     700,  4, 20, 8, 1, 1, 2),
  furn('plant_basic','盆栽',    'Potted Plant',  'plant',     120,  1,  8, 9, 6, 1, 1),
  furn('fireplace', '小壁炉',   'Fireplace',     'fireplace',1500, 10, 30, 0, 1, 1, 1),
  // ---- 客厅
  furn('sofa',      '布艺沙发', 'Fabric Sofa',   'sofa',      900,  6, 26, 1, 4, 2, 1, 'living'),
  furn('tv',        '电视柜',   'TV Stand',      'tv',       1200, 8, 18, 6, 1, 2, 1, 'living'),
  furn('coffee',    '茶几',     'Coffee Table',  'table',     320,  3, 12, 3, 3, 2, 1, 'living'),
  // ---- 卧室
  furn('wardrobe',  '衣柜',     'Wardrobe',      'wardrobe',  700,  4, 22, 8, 1, 1, 2, 'bedroom'),
  furn('vanity',    '梳妆台',   'Vanity',        'vanity',    650,  7, 16, 1, 4, 1, 1, 'bedroom'),
  furn('bedside',   '床头灯',   'Bedside Lamp',  'lamp',      180,  2,  8, 4, 2, 1, 1, 'bedroom'),
  // ---- 厨房
  furn('counter',   '料理台',   'Kitchen Counter', 'counter', 800,  6, 20, 2, 2, 2, 1, 'kitchen'),
  furn('stove',     '炉灶',     'Stove',         'stove',    1000,  8, 18, 5, 2, 1, 1, 'kitchen'),
  furn('fridge',    '冰箱',     'Fridge',        'fridge',   1200,  9, 16, 8, 1, 1, 1, 'kitchen'),
];
