/**
 * 物品图标（32×32）与鱼类侧视图（48×32）：
 * 背包/商店/图鉴用。全部按 id 程序化绘制。
 */
import type { FishDef, ItemDef } from '../../core/types';
import { REG } from '../../core/registry';
import { circle, ellipse, hashColor, leafShape, PAL, rrect, shade, star, tri, type Ctx } from './common';

const C = 16; // 图标中心

/** 作物果实颜色（与 plants.ts 一致的映射，图标独立保存避免互相依赖阶段） */
const FRUIT_COLOR: Record<string, string> = {
  produce_carrot: '#f08030', produce_potato: '#c9a06a', produce_strawberry: '#e8425c',
  produce_corn: '#f2d049', produce_tomato: '#e85d4a', produce_cabbage: '#9fd66c',
  produce_pineapple: '#f0b23c', produce_eggplant: '#7a4a9c', produce_pumpkin: '#ec8b32',
  produce_chili: '#d8382e', produce_melon: '#4c9c48', produce_rice: '#e8dca0',
  produce_taro: '#b08bc0', produce_orchid: '#b465d8', produce_sugarcane: '#a8cc60',
  produce_cacao: '#a05c34', produce_ginseng: '#e0c48c', produce_starfruit: '#f2e04c',
  produce_banana: '#f2d049', produce_coconut: '#9c7048', produce_apple: '#e0473c',
  produce_lemon: '#f2dc3c', produce_mango: '#f2a03c', produce_lychee: '#e0506c',
  produce_peach: '#f2a0b4', produce_goldfruit: '#f2c018', produce_cherryblossom: '#f5b8c9',
  produce_rose: '#e84a6a', produce_tulip: '#f2a03c', produce_sunflower: '#f2c018',
  produce_lavender: '#9a7ad8', produce_hydrangea: '#7ab8e8', produce_moonflower: '#d8e4ff',
  produce_blue_rose: '#5a7ae0', produce_black_tulip: '#3a2a44', produce_rainbow_hydrangea: '#e86aa8',
};

const RARITY_COLOR: Record<string, string> = {
  common: '#9db4c0',
  uncommon: '#6cbf6c',
  rare: '#5a9ae0',
  epic: '#a86ad8',
  legendary: '#f0a03c',
};

export function paintFishSide(ctx: Ctx, def: FishDef): void {
  // 48×32 画布，鱼头朝右
  const cx = 24;
  const cy = 16;
  const base = RARITY_COLOR[def.rarity] || '#9db4c0';
  // 常见鱼也从一组可参与的十六进制色里取色；不能用 hsl 交给 shade()（它只解析 hex）
  const commonPalette = ['#9db4c0', '#7fa8a0', '#b8a67a', '#a8b88f', '#c0a0a0', '#8fa8c0'];
  let seed = 0;
  for (let i = 0; i < def.id.length; i++) seed = (seed * 31 + def.id.charCodeAt(i)) >>> 0;
  const body = commonPalette[seed % commonPalette.length];
  const main = def.rarity === 'common' ? body : base;
  const isLong = def.id.includes('eel') || def.id.includes('sword');
  const rx = isLong ? 17 : 13;
  const ry = def.id.includes('sunfish') || def.id.includes('puffer') ? 10 : 7;
  // 尾
  tri(ctx, cx - rx + 2, cy, cx - rx - 6, cy - 6, cx - rx - 6, cy + 6, shade(main, -0.15), shade(main, -0.35));
  // 身
  ellipse(ctx, cx, cy, rx, ry, main, shade(main, -0.35));
  // 肚
  ellipse(ctx, cx + 2, cy + ry * 0.35, rx * 0.6, ry * 0.45, shade(main, 0.3));
  // 背鳍
  tri(ctx, cx - 4, cy - ry + 1, cx + 5, cy - ry + 1, cx + 1, cy - ry - 5, shade(main, -0.2));
  // 眼
  circle(ctx, cx + rx * 0.55, cy - 1.5, 2, '#ffffff');
  circle(ctx, cx + rx * 0.55 + 0.5, cy - 1.5, 1.1, '#33281f');
  // 特征点缀
  if (def.id === 'fish_lionfish') {
    for (let i = -2; i <= 2; i++) {
      tri(ctx, cx + i * 3 - 1.4, cy - ry, cx + i * 3 + 1.4, cy - ry, cx + i * 3, cy - ry - 7, shade(main, -0.1));
    }
  }
  if (def.id === 'fish_kraken') {
    // 触手
    for (let i = 0; i < 3; i++) {
      ctx.strokeStyle = shade(main, -0.1);
      ctx.lineWidth = 2.4;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(cx - rx + 4 + i * 3, cy + ry - 2);
      ctx.quadraticCurveTo(cx - rx + i * 3, cy + ry + 6, cx - rx + 5 + i * 3, cy + ry + 5);
      ctx.stroke();
    }
  }
  if (def.rarity === 'legendary') {
    star(ctx, cx + 2, cy - ry - 4, 3.4, '#ffe97a');
  }
  if (def.id === 'fish_goldkoi') {
    circle(ctx, cx - 3, cy - 2, 2.4, '#e8425c');
    circle(ctx, cx + 5, cy + 1, 1.8, '#33281f');
  }
}

/** 32×32 物品图标 */
export function paintItemIcon(ctx: Ctx, itemId: string): void {
  const def: ItemDef | undefined = REG.items.get(itemId);
  const category = def?.category ?? 'special';

  if (category === 'seed') {
    // 种子袋
    const cropColor = FRUIT_COLOR[itemId.replace('seed_', 'produce_')] || hashColor(itemId);
    rrect(ctx, 6, 7, 20, 20, 3, '#f0e2c4', shade('#f0e2c4', -0.3));
    tri(ctx, 6, 10, 26, 10, 16, 4, '#e0c898', shade('#e0c898', -0.25));
    circle(ctx, C, 19, 5.5, cropColor, shade(cropColor, -0.3));
    leafShape(ctx, C + 3, 14, 5, 2, 0.7, PAL.leaf);
    return;
  }
  if (category === 'produce') {
    const color = FRUIT_COLOR[itemId] || hashColor(itemId);
    switch (itemId) {
      case 'produce_carrot':
        tri(ctx, 10, 10, 22, 10, 16, 28, color, shade(color, -0.25));
        leafShape(ctx, 14, 10, 7, 2.6, -0.5, PAL.leaf);
        leafShape(ctx, 18, 10, 7, 2.6, 0.5, PAL.leaf);
        break;
      case 'produce_corn':
        ellipse(ctx, C, 17, 6, 11, color, shade(color, -0.3));
        ctx.strokeStyle = shade(color, -0.25);
        ctx.lineWidth = 1;
        for (let i = -1; i <= 1; i++) {
          ctx.beginPath();
          ctx.moveTo(C + i * 3, 8);
          ctx.lineTo(C + i * 3, 26);
          ctx.stroke();
        }
        leafShape(ctx, C - 5, 24, 12, 3.4, -0.5, PAL.leaf);
        leafShape(ctx, C + 5, 24, 12, 3.4, 0.5, shade(PAL.leaf, -0.12));
        break;
      case 'produce_banana':
        ctx.strokeStyle = color;
        ctx.lineWidth = 6;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.arc(C, 12, 9, 0.15 * Math.PI, 0.85 * Math.PI);
        ctx.stroke();
        ctx.strokeStyle = shade(color, -0.35);
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.arc(C, 12, 9, 0.15 * Math.PI, 0.85 * Math.PI);
        ctx.stroke();
        break;
      case 'produce_strawberry':
        tri(ctx, 9, 14, 23, 14, 16, 27, color, shade(color, -0.25));
        circle(ctx, 12.5, 16.5, 0.8, '#fff4b8');
        circle(ctx, 19, 17.5, 0.8, '#fff4b8');
        circle(ctx, 16, 21, 0.8, '#fff4b8');
        leafShape(ctx, 13, 12, 6, 2.2, -0.9, PAL.leaf);
        leafShape(ctx, 19, 12, 6, 2.2, 0.9, PAL.leaf);
        break;
      default:
        // 通用圆果
        circle(ctx, C, 18, 9, color, shade(color, -0.3));
        ellipse(ctx, C - 3, 14.5, 2.6, 1.8, 'rgba(255,255,255,0.35)');
        ctx.strokeStyle = shade(color, -0.4);
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(C, 9.5);
        ctx.quadraticCurveTo(C + 2, 7, C + 4, 6.5);
        ctx.stroke();
        leafShape(ctx, C + 3, 8.5, 5.5, 2, 1.0, PAL.leaf);
    }
    return;
  }
  if (category === 'animalGood') {
    switch (itemId) {
      case 'good_chicken':
      case 'good_duck':
        ellipse(ctx, C, 17, 7.5, 9.5, itemId === 'good_duck' ? '#e8f2e0' : '#f7ecd4', shade('#e0d0a8', -0.1));
        ellipse(ctx, C - 2.4, 13.5, 2.2, 3, 'rgba(255,255,255,0.6)');
        break;
      case 'good_goat':
      case 'good_cow':
        // 奶瓶
        rrect(ctx, 10, 10, 12, 17, 3, '#eef6fa', shade('#c8dce8', -0.1));
        rrect(ctx, 12.5, 6, 7, 5, 1.5, '#c8dce8', shade('#c8dce8', -0.25));
        rrect(ctx, 11, 16, 10, 9, 2, '#ffffff');
        break;
      case 'good_rabbit':
      case 'good_sheep':
      case 'good_alpaca': {
        // 毛线团
        const c = itemId === 'good_rabbit' ? '#efe6f5' : itemId === 'good_alpaca' ? '#f2e6d0' : '#f6f3ea';
        circle(ctx, C, 17, 9.5, c, shade(c, -0.25));
        ctx.strokeStyle = shade(c, -0.2);
        ctx.lineWidth = 1.2;
        for (let i = -1; i <= 1; i++) {
          ctx.beginPath();
          ctx.arc(C, 17, 9.5, (0.2 + i * 0.28) * Math.PI, (0.8 + i * 0.28) * Math.PI);
          ctx.stroke();
        }
        break;
      }
      case 'good_pig':
        // 松露
        circle(ctx, C, 18, 8.5, '#6a5240', shade('#6a5240', -0.3));
        circle(ctx, C - 3, 15, 1.4, '#8a705a');
        circle(ctx, C + 3.4, 19, 1.4, '#8a705a');
        circle(ctx, C - 1, 21, 1.4, '#8a705a');
        break;
      default: {
        // 羽毛
        const fc = itemId === 'good_peacock' ? '#2d9e6c' : '#b5743c';
        leafShape(ctx, C, 27, 20, 6, 0.25, fc);
        ctx.strokeStyle = shade(fc, -0.3);
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(C, 27);
        ctx.lineTo(C + 4.5, 9);
        ctx.stroke();
        if (itemId === 'good_peacock') circle(ctx, C + 4, 11, 2.6, '#f2c018');
      }
    }
    return;
  }
  if (category === 'fish') {
    const fish = REG.fish.get(itemId);
    if (fish) {
      ctx.save();
      ctx.translate(-8, 0);
      paintFishSide(ctx, fish);
      ctx.restore();
    }
    return;
  }
  if (category === 'forage') {
    switch (itemId) {
      case 'item_forage_berry':
        circle(ctx, C - 5, 18, 5, '#c8324c', shade('#c8324c', -0.3));
        circle(ctx, C + 5, 19, 4.6, '#d8425c', shade('#d8425c', -0.3));
        circle(ctx, C, 12, 4.4, '#b02a44', shade('#b02a44', -0.3));
        leafShape(ctx, C + 2, 8, 7, 2.6, 0.6, PAL.leaf);
        break;
      case 'item_forage_mushroom':
        ctx.fillStyle = '#f0e6d0';
        ctx.fillRect(C - 2.5, 16, 5, 10);
        ellipse(ctx, C, 15, 11, 8, '#d84a3c', shade('#d84a3c', -0.3));
        circle(ctx, C - 4, 13, 1.8, '#f8ece0');
        circle(ctx, C + 3, 16, 1.4, '#f8ece0');
        break;
      case 'item_forage_herb':
        for (let i = 0; i < 3; i++) {
          leafShape(ctx, C, 25, 15, 4, -1.2 + i * 0.7, i % 2 ? PAL.leaf : shade(PAL.leaf, -0.12));
        }
        break;
      case 'item_forage_honey':
        for (const [dx, dy] of [[0, -6], [-6, 0], [6, 0], [0, 6]] as const) {
          ctx.beginPath();
          for (let k = 0; k < 6; k++) {
            const a = Math.PI / 6 + (k * Math.PI) / 3;
            const x = C + dx + Math.cos(a) * 5;
            const y = C + dy + Math.sin(a) * 5;
            if (k === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
          }
          ctx.closePath();
          ctx.fillStyle = '#f0b23c';
          ctx.fill();
          ctx.strokeStyle = shade('#f0b23c', -0.3);
          ctx.lineWidth = 1;
          ctx.stroke();
        }
        break;
      case 'item_forage_truffle':
        circle(ctx, C, 18, 9, '#5c4636', shade('#5c4636', -0.3));
        circle(ctx, C - 3, 15, 1.6, '#8a705a');
        circle(ctx, C + 3, 19, 1.4, '#8a705a');
        circle(ctx, C - 1, 21, 1.2, '#8a705a');
        break;
      case 'item_forage_shell':
        ctx.beginPath();
        ctx.moveTo(C - 10, 22);
        ctx.quadraticCurveTo(C, 4, C + 10, 22);
        ctx.quadraticCurveTo(C, 28, C - 10, 22);
        ctx.closePath();
        ctx.fillStyle = '#f5c7d5';
        ctx.fill();
        ctx.strokeStyle = shade('#f5c7d5', -0.3);
        ctx.lineWidth = 1.4;
        ctx.stroke();
        break;
      case 'item_forage_seaweed':
        for (let i = -1; i <= 1; i++) {
          ctx.strokeStyle = i === 0 ? '#3c7a4c' : '#4c9c5c';
          ctx.lineWidth = 3;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(C + i * 5, 26);
          ctx.quadraticCurveTo(C + i * 8, 16, C + i * 4, 6);
          ctx.stroke();
        }
        break;
      case 'item_forage_coconut':
        circle(ctx, C, 18, 9, '#8a6248', shade('#8a6248', -0.3));
        circle(ctx, C - 3, 15, 1.8, '#5c422e');
        circle(ctx, C + 3, 15, 1.8, '#5c422e');
        circle(ctx, C, 21, 1.8, '#5c422e');
        break;
      default:
        circle(ctx, C, 17, 8, hashColor(itemId), shade(hashColor(itemId), -0.3));
    }
    return;
  }
  if (category === 'meat') {
    // 带骨肉排
    ellipse(ctx, C - 2, 18, 8.5, 6.5, '#c8604c', shade('#c8604c', -0.3));
    ellipse(ctx, C - 4, 16, 4, 2.6, '#e8907c');
    ctx.strokeStyle = '#f2ead6';
    ctx.lineWidth = 3.4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(C + 5, 22);
    ctx.lineTo(C + 11, 26);
    ctx.stroke();
    circle(ctx, C + 11.5, 26, 2.6, '#f2ead6', shade('#f2ead6', -0.25));
    return;
  }
  if (category === 'pelt') {
    // 皮毛：带缝线
    rrect(ctx, 7, 9, 18, 16, 4, '#a87858', shade('#a87858', -0.25));
    ctx.strokeStyle = '#e8d8c0';
    ctx.lineWidth = 1.2;
    ctx.setLineDash([2, 2]);
    ctx.beginPath();
    ctx.moveTo(9, 17);
    ctx.lineTo(23, 17);
    ctx.stroke();
    ctx.setLineDash([]);
    for (const [x, y] of [[9, 9], [23, 9], [9, 25], [23, 25]] as const) {
      circle(ctx, x, y, 1.6, '#e8d8c0');
    }
    return;
  }
  if (category === 'dish') {
    // 盘子 + 料理
    ellipse(ctx, C, 19, 12, 7, '#f4f0e8', shade('#d8d0c0', -0.1));
    ellipse(ctx, C, 18, 9, 5, '#ffffff');
    const steam = itemId === 'dish_mushroom_soup' || itemId === 'dish_seafood_soup' || itemId === 'dish_flower_tea' || itemId === 'dish_hotcocoa';
    if (steam) {
      ellipse(ctx, C, 16, 8, 4, '#c98a5a', shade('#c98a5a', -0.2));
      ctx.strokeStyle = 'rgba(255,255,255,0.8)';
      ctx.lineWidth = 1.6;
      for (const dx of [-4, 0, 4]) {
        ctx.beginPath();
        ctx.moveTo(C + dx, 10);
        ctx.quadraticCurveTo(C + dx + 3, 6, C + dx, 3);
        ctx.stroke();
      }
    } else if (itemId === 'dish_grilled_fish') {
      ellipse(ctx, C, 17, 8, 3.6, '#d8a06c', shade('#d8a06c', -0.25));
      tri(ctx, C - 8, 17, C - 12, 14, C - 12, 20, shade('#d8a06c', -0.2));
      circle(ctx, C + 4, 16, 1.2, '#4a3626');
    } else if (itemId === 'dish_meat_skewer') {
      ctx.strokeStyle = '#c9a066';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(C - 9, 24);
      ctx.lineTo(C + 9, 10);
      ctx.stroke();
      for (let i = 0; i < 3; i++) {
        circle(ctx, C - 5 + i * 4, 20 - i * 4, 2.6, '#b85a44', shade('#b85a44', -0.25));
      }
    } else if (itemId === 'dish_egg_tart') {
      ellipse(ctx, C, 20, 9, 4, '#d8a05a', shade('#d8a05a', -0.25));
      ellipse(ctx, C, 18, 7, 3, '#f2c85a', shade('#f2c85a', -0.2));
      circle(ctx, C, 17, 1.6, '#e88a2a');
    } else if (itemId === 'dish_cheese_toast') {
      rrect(ctx, C - 9, 10, 18, 13, 3, '#d8a05a', shade('#d8a05a', -0.25));
      rrect(ctx, C - 7, 12, 14, 9, 2, '#f2c85a', shade('#f2c85a', -0.15));
      circle(ctx, C - 3, 16, 1.2, '#e8a02a');
      circle(ctx, C + 3, 18, 1.2, '#e8a02a');
    } else {
      // 派/甜点
      ctx.beginPath();
      ctx.moveTo(C - 9, 20);
      ctx.quadraticCurveTo(C, 10, C + 9, 20);
      ctx.closePath();
      ctx.fillStyle = '#e0b06a';
      ctx.fill();
      ctx.strokeStyle = shade('#e0b06a', -0.25);
      ctx.lineWidth = 1.2;
      ctx.stroke();
      circle(ctx, C - 3, 17, 1.6, '#c8324c');
      circle(ctx, C + 3, 18, 1.4, '#c8324c');
    }
    return;
  }
  if (category === 'bouquet') {
    // 包装纸
    ctx.beginPath();
    ctx.moveTo(C - 8, 26);
    ctx.lineTo(C - 5, 15);
    ctx.lineTo(C + 5, 15);
    ctx.lineTo(C + 8, 26);
    ctx.closePath();
    ctx.fillStyle = '#f0e2c4';
    ctx.fill();
    ctx.strokeStyle = shade('#f0e2c4', -0.25);
    ctx.lineWidth = 1.2;
    ctx.stroke();
    // 按花种换色，三朵花
    const BOUQUET_COLOR: Record<string, string> = {
      rose: '#e84a6a', tulip: '#f2a03c', sunflower: '#f2c018', lavender: '#9a7ad8',
      hydrangea: '#7ab8e8', moonflower: '#d8e4ff', blue_rose: '#5a7ae0',
      black_tulip: '#3a2a44', rainbow_hydrangea: '#e86aa8', mixed: '#e86aa8',
    };
    const main = BOUQUET_COLOR[itemId.replace('bouquet_', '')] ?? '#e84a6a';
    const colors = itemId === 'bouquet_mixed'
      ? [main, '#f2c018', '#7ab8e8']
      : [shade(main, 0.18), main, shade(main, -0.18)];
    for (const [dx, dy, color] of [[-6, 11, colors[0]], [0, 7, colors[1]], [6, 11, colors[2]]] as const) {
      for (let p = 0; p < 5; p++) {
        const a = (p / 5) * Math.PI * 2;
        circle(ctx, C + dx + Math.cos(a) * 3, dy + Math.sin(a) * 3, 2, color);
      }
      circle(ctx, C + dx, dy, 1.6, '#fff4b8');
    }
    ctx.strokeStyle = '#c8324c';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(C - 6, 20);
    ctx.lineTo(C + 6, 20);
    ctx.stroke();
    return;
  }
  if (category === 'bait') {
    switch (itemId) {
      case 'item_bait_worm':
        ctx.strokeStyle = '#e89aa8';
        ctx.lineWidth = 5;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(C - 8, 22);
        ctx.bezierCurveTo(C - 12, 12, C + 2, 18, C + 6, 10);
        ctx.stroke();
        ctx.strokeStyle = shade('#e89aa8', -0.25);
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(C - 8, 22);
        ctx.bezierCurveTo(C - 12, 12, C + 2, 18, C + 6, 10);
        ctx.stroke();
        break;
      case 'item_bait_shrimp':
        ctx.strokeStyle = '#f0a03c';
        ctx.lineWidth = 6;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.arc(C, 16, 7, 0.2, Math.PI * 1.3);
        ctx.stroke();
        tri(ctx, C + 7, 12, C + 12, 8, C + 12, 16, '#f0a03c');
        circle(ctx, C - 4, 13, 1.4, '#4a3626');
        break;
      case 'item_bait_glow': {
        rrect(ctx, C - 7, 12, 14, 14, 4, '#bfe6f2', shade('#bfe6f2', -0.3));
        rrect(ctx, C - 4, 8, 8, 4, 1, '#8a795c');
        circle(ctx, C, 19, 4.5, '#9ce8a8');
        circle(ctx, C, 19, 6.5, 'rgba(140, 240, 160, 0.25)');
        star(ctx, C + 8, 10, 3, '#fff4b8');
        break;
      }
      case 'item_bait_honey':
        ctx.beginPath();
        ctx.moveTo(C, 6);
        ctx.quadraticCurveTo(C + 10, 16, C, 26);
        ctx.quadraticCurveTo(C - 10, 16, C, 6);
        ctx.closePath();
        ctx.fillStyle = '#f2c018';
        ctx.fill();
        ctx.strokeStyle = shade('#f2c018', -0.3);
        ctx.lineWidth = 1.4;
        ctx.stroke();
        circle(ctx, C - 2, 15, 1.6, 'rgba(255,255,255,0.7)');
        break;
      default:
        circle(ctx, C, 16, 8, '#8a795c', shade('#8a795c', -0.3));
    }
    return;
  }
  if (category === 'material') {
    switch (itemId) {
      case 'item_bone':
        ctx.strokeStyle = '#f2ead6';
        ctx.lineWidth = 4.5;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(10, 22);
        ctx.lineTo(22, 10);
        ctx.stroke();
        for (const [x, y] of [[9, 21], [11, 23], [21, 9], [23, 11]] as const) {
          circle(ctx, x, y, 3, '#f2ead6', shade('#f2ead6', -0.25));
        }
        break;
      case 'item_scale':
      case 'item_dragonscale': {
        const c = itemId === 'item_dragonscale' ? '#7a68b8' : '#6c9c48';
        ctx.beginPath();
        ctx.moveTo(16, 6);
        ctx.quadraticCurveTo(26, 12, 16, 27);
        ctx.quadraticCurveTo(6, 12, 16, 6);
        ctx.closePath();
        ctx.fillStyle = c;
        ctx.fill();
        ctx.strokeStyle = shade(c, -0.3);
        ctx.lineWidth = 1.6;
        ctx.stroke();
        ellipse(ctx, 13.5, 13, 2, 3.4, 'rgba(255,255,255,0.3)');
        break;
      }
      case 'item_fang':
        tri(ctx, 11, 8, 21, 8, 16, 27, '#f6f0e0', shade('#f6f0e0', -0.25));
        rrect(ctx, 10, 5, 12, 4.5, 2, '#c9b48a', shade('#c9b48a', -0.25));
        break;
      case 'item_fur':
        rrect(ctx, 7, 10, 18, 15, 4, '#8a6248', shade('#8a6248', -0.3));
        ctx.strokeStyle = '#a8876c';
        ctx.lineWidth = 1.4;
        for (let i = 0; i < 4; i++) {
          ctx.beginPath();
          ctx.moveTo(9 + i * 4.5, 12);
          ctx.quadraticCurveTo(10 + i * 4.5, 17, 9 + i * 4.5, 23);
          ctx.stroke();
        }
        break;
      case 'good_butter':
        rrect(ctx, 8, 12, 16, 12, 2, '#f2d86a', shade('#f2d86a', -0.25));
        rrect(ctx, 8, 12, 16, 3, 2, '#fff0a8');
        break;
      case 'good_cheese':
      case 'good_goat_cheese': {
        const c = itemId === 'good_goat_cheese' ? '#fff6e6' : '#f2c85a';
        tri(ctx, 6, 24, 26, 24, 24, 10, c, shade(c, -0.3));
        circle(ctx, 14, 19, 1.8, shade(c, -0.2));
        circle(ctx, 20, 20, 1.4, shade(c, -0.2));
        circle(ctx, 18, 15, 1.2, shade(c, -0.2));
        break;
      }
      case 'good_yarn': {
        const c = '#e8a0b8';
        circle(ctx, C, 17, 9, c, shade(c, -0.25));
        ctx.strokeStyle = shade(c, -0.15);
        ctx.lineWidth = 1.2;
        for (let i = -1; i <= 1; i++) {
          ctx.beginPath();
          ctx.arc(C, 17, 9, (0.2 + i * 0.28) * Math.PI, (0.8 + i * 0.28) * Math.PI);
          ctx.stroke();
        }
        ctx.beginPath();
        ctx.moveTo(C + 8, 22);
        ctx.quadraticCurveTo(C + 14, 26, C + 12, 29);
        ctx.stroke();
        break;
      }
      case 'good_cloth':
        rrect(ctx, 6, 12, 20, 14, 3, '#7a9ac8', shade('#7a9ac8', -0.3));
        rrect(ctx, 9, 9, 14, 4, 2, '#a8c0e0', shade('#a8c0e0', -0.2));
        ctx.strokeStyle = 'rgba(255,255,255,0.4)';
        ctx.lineWidth = 1;
        for (let i = 0; i < 3; i++) {
          ctx.beginPath();
          ctx.moveTo(9, 16 + i * 3);
          ctx.lineTo(23, 16 + i * 3);
          ctx.stroke();
        }
        break;
      default: // coralcore
        circle(ctx, C, 17, 8, '#e88a9a', shade('#e88a9a', -0.3));
        star(ctx, C, 17, 4.5, '#fde4e0');
    }
    return;
  }
  // special / 兜底
  switch (itemId) {
    case 'item_shell':
      ctx.beginPath();
      ctx.moveTo(8, 22);
      ctx.quadraticCurveTo(16, 2, 24, 22);
      ctx.quadraticCurveTo(16, 28, 8, 22);
      ctx.closePath();
      ctx.fillStyle = '#f5c7d5';
      ctx.fill();
      ctx.strokeStyle = shade('#f5c7d5', -0.3);
      ctx.lineWidth = 1.6;
      ctx.stroke();
      for (const dx of [-4, 0, 4]) {
        ctx.beginPath();
        ctx.moveTo(16 + dx, 22 - Math.abs(dx) * 0.4);
        ctx.lineTo(16 + dx * 0.5, 10);
        ctx.strokeStyle = shade('#f5c7d5', -0.2);
        ctx.lineWidth = 1;
        ctx.stroke();
      }
      break;
    case 'item_pearl':
      circle(ctx, C, 17, 8, '#f2eef8', shade('#c8c0d8', -0.05));
      ellipse(ctx, 13, 13.5, 2.6, 1.8, '#ffffff');
      circle(ctx, C, 17, 8.5 + 2, 'rgba(200,190,230,0.0)');
      break;
    case 'item_amber':
      ctx.beginPath();
      ctx.moveTo(16, 5);
      ctx.lineTo(25, 13);
      ctx.lineTo(22, 26);
      ctx.lineTo(10, 26);
      ctx.lineTo(7, 13);
      ctx.closePath();
      ctx.fillStyle = '#f0a03c';
      ctx.fill();
      ctx.strokeStyle = shade('#f0a03c', -0.3);
      ctx.lineWidth = 1.6;
      ctx.stroke();
      circle(ctx, 15, 17, 2, 'rgba(120,70,20,0.5)');
      break;
    case 'item_firework':
      ctx.strokeStyle = '#c9a066';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(C, 26);
      ctx.lineTo(C, 12);
      ctx.stroke();
      tri(ctx, C - 4, 12, C + 4, 12, C, 5, '#e8425c', shade('#e8425c', -0.2));
      for (const [dx, dy, color] of [[-9, 8, '#f2c018'], [9, 8, '#5aa7e0'], [0, 2, '#8fd05e']] as const) {
        star(ctx, C + dx, dy, 3, color);
      }
      break;
    case 'item_harvest_basket':
      ctx.strokeStyle = '#c9a066';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(C, 12, 7, Math.PI, 0);
      ctx.stroke();
      rrect(ctx, C - 9, 13, 18, 11, 3, '#d8a86a', shade('#d8a86a', -0.3));
      circle(ctx, C - 4, 12, 3, '#e8425c');
      circle(ctx, C + 3, 11, 3, '#f2c018');
      circle(ctx, C, 15, 2.6, '#8fd05e');
      break;
    case 'item_festival_ribbon':
      for (const side of [-1, 1]) {
        tri(ctx, C, 16, C + side * 11, 8, C + side * 11, 24, '#f08bb1', shade('#f08bb1', -0.2));
      }
      circle(ctx, C, 16, 3.4, '#e86aa8', shade('#e86aa8', -0.2));
      tri(ctx, C - 3, 18, C - 1, 26, C - 5, 26, '#e86aa8');
      tri(ctx, C + 3, 18, C + 1, 26, C + 5, 26, '#e86aa8');
      break;
    case 'item_memory_photo':
      rrect(ctx, C - 11, 6, 22, 19, 2, '#fff4d8', '#c9a066');
      rrect(ctx, C - 8, 9, 16, 11, 1, '#bfe6f2');
      circle(ctx, C - 4, 18, 2.4, '#f2c018');
      circle(ctx, C - 4, 14, 1.4, '#f0a03c');
      circle(ctx, C - 4, 19, 2.4, '#e8a87c');
      rrect(ctx, C - 6, 21, 4, 4, 1, '#f08bb1');
      circle(ctx, C + 4, 19, 2.4, '#e8a87c');
      rrect(ctx, C + 2, 21, 4, 4, 1, '#5aa7e0');
      break;
    case 'item_birthday_cake':
      // 盘子
      ellipse(ctx, C, 26, 13, 3, '#e8e0d0', '#c9c0b0');
      // 蛋糕体
      rrect(ctx, C - 10, 15, 20, 10, 3, '#f7d9e6', '#d8a8bc');
      rrect(ctx, C - 8, 10, 16, 8, 3, '#f2b8cf', '#c98aa8');
      // 奶油
      for (const dx of [-7, 0, 7]) circle(ctx, C + dx, 18, 2.2, '#fff4f8');
      // 蜡烛
      rrect(ctx, C - 1.4, 4, 2.8, 7, 1, '#8fd0e0');
      tri(ctx, C - 2, 4, C + 2, 4, C, 0, '#f2c018');
      // 樱桃
      circle(ctx, C + 5, 9, 1.8, '#e8425c');
      break;
    default:
      circle(ctx, C, C, 9, hashColor(itemId), shade(hashColor(itemId), -0.3));
      star(ctx, C, C, 4, '#fff4b8');
  }
}
