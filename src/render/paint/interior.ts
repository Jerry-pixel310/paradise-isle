/**
 * 室内绘制：木地板、家具。
 * 家具画布按占地缩放，锚点底部中心。
 */
import type { FurnitureDef } from '../../core/types';
import { circle, ellipse, leafShape, PAL, rrect, shade, softShadow, tri, type Ctx } from './common';

export function furnitureCanvasSize(def: FurnitureDef): { w: number; h: number; ax: number; ay: number } {
  const w = (def.w + def.h) * 30 + 20;
  const h = 64 + (def.w + def.h) * 12;
  return { w, h, ax: w / 2, ay: h - 8 };
}

/** 木地板 / 厨房瓷砖菱形（64×32） */
export function paintFloorTile(ctx: Ctx, variant: number, style: 'wood' | 'tile' = 'wood'): void {
  if (style === 'tile') {
    const base = variant % 2 === 0 ? '#d4ded8' : '#c2d0c8';
    ctx.beginPath();
    ctx.moveTo(32, 0);
    ctx.lineTo(64, 16);
    ctx.lineTo(32, 32);
    ctx.lineTo(0, 16);
    ctx.closePath();
    ctx.fillStyle = base;
    ctx.fill();
    ctx.strokeStyle = shade(base, -0.18);
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.strokeStyle = shade(base, -0.08);
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(16, 8);
    ctx.lineTo(48, 24);
    ctx.moveTo(48, 8);
    ctx.lineTo(16, 24);
    ctx.stroke();
    return;
  }
  const colors = ['#d8b07a', '#d2a872', '#ddb884'];
  const base = colors[variant % colors.length];
  ctx.beginPath();
  ctx.moveTo(32, 0);
  ctx.lineTo(64, 16);
  ctx.lineTo(32, 32);
  ctx.lineTo(0, 16);
  ctx.closePath();
  ctx.fillStyle = base;
  ctx.fill();
  ctx.strokeStyle = shade(base, -0.18);
  ctx.lineWidth = 1;
  ctx.stroke();
  // 木纹
  ctx.strokeStyle = shade(base, -0.1);
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(10, 14);
  ctx.lineTo(32, 25);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(32, 7);
  ctx.lineTo(52, 18);
  ctx.stroke();
}

function bed(ctx: Ctx, def: FurnitureDef, ax: number, ay: number): void {
  const W = (def.w + def.h) * 26;
  const lux = def.id === 'furn_bed_lux';
  softShadow(ctx, ax, ay, W * 0.55, 9);
  // 床架
  rrect(ctx, ax - W / 2, ay - 30, W, 26, 5, lux ? '#f0e6f4' : PAL.wood, shade(lux ? '#f0e6f4' : PAL.wood, -0.3));
  // 床垫
  rrect(ctx, ax - W / 2 + 4, ay - 34, W - 8, 18, 6, '#fef8ec', shade('#e8dcc8', -0.1));
  // 被子
  rrect(ctx, ax - W / 2 + 4, ay - 26, W - 8, 12, 5, lux ? '#c8b8e8' : '#8fd0e0', shade(lux ? '#c8b8e8' : '#8fd0e0', -0.25));
  // 枕头
  rrect(ctx, ax - W / 2 + 8, ay - 35, W * 0.28, 8, 4, '#ffffff', shade('#e8e0d0', -0.2));
  // 床头
  rrect(ctx, ax - W / 2 - 3, ay - 44, 7, 40, 3, lux ? '#b8a0d8' : PAL.woodDark, shade(lux ? '#b8a0d8' : PAL.woodDark, -0.3));
  if (lux) {
    circle(ctx, ax + W * 0.3, ay - 30, 3, '#f2c018');
  }
}

function table(ctx: Ctx, def: FurnitureDef, ax: number, ay: number): void {
  const W = def.slot === 'table' && def.w > 1 ? 58 : 38;
  softShadow(ctx, ax, ay, W * 0.6, 6);
  // 桌面
  ellipse(ctx, ax, ay - 26, W / 2, 9, PAL.wood, shade(PAL.wood, -0.3));
  ellipse(ctx, ax, ay - 28, W / 2 - 2, 7, shade(PAL.wood, 0.08));
  // 桌腿
  ctx.strokeStyle = shade(PAL.wood, -0.35);
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  for (const dx of [-W * 0.32, W * 0.32]) {
    ctx.beginPath();
    ctx.moveTo(ax + dx, ay - 22);
    ctx.lineTo(ax + dx, ay - 2);
    ctx.stroke();
  }
  // 桌上小物
  circle(ctx, ax - 5, ay - 31, 3.4, '#8fd0e0', shade('#8fd0e0', -0.2));
  if (def.w > 1) {
    rrect(ctx, ax + 6, ay - 36, 10, 7, 1.5, '#fef8ec', shade('#e0d0b0', -0.2));
  }
}

function chair(ctx: Ctx, def: FurnitureDef, ax: number, ay: number): void {
  const soft = def.id === 'furn_chair_soft';
  softShadow(ctx, ax, ay, 16, 5);
  ctx.strokeStyle = shade(PAL.wood, -0.35);
  ctx.lineWidth = 3.4;
  ctx.lineCap = 'round';
  for (const [dx, dy] of [[-10, 0], [10, 0], [-10, -16], [10, -16]] as const) {
    ctx.beginPath();
    ctx.moveTo(ax + dx, ay + dy);
    ctx.lineTo(ax + dx, ay);
    ctx.stroke();
  }
  rrect(ctx, ax - 13, ay - 22, 26, 7, 3, soft ? '#f0c8d8' : PAL.wood, shade(soft ? '#f0c8d8' : PAL.wood, -0.3));
  rrect(ctx, ax - 12, ay - 40, 24, 20, 4, soft ? '#f0c8d8' : shade(PAL.wood, 0.05), shade(soft ? '#f0c8d8' : PAL.wood, -0.3));
  if (soft) circle(ctx, ax, ay - 31, 4, '#fde4ec');
}

function rug(ctx: Ctx, def: FurnitureDef, ax: number, ay: number): void {
  const W = (def.w + def.h) * 20;
  const soft = def.id === 'furn_rug_soft';
  ctx.beginPath();
  ctx.moveTo(ax, ay - 40);
  ctx.lineTo(ax + W, ay - 24);
  ctx.lineTo(ax, ay - 8);
  ctx.lineTo(ax - W, ay - 24);
  ctx.closePath();
  ctx.fillStyle = soft ? '#d89ab0' : '#c8a06a';
  ctx.fill();
  ctx.strokeStyle = shade(soft ? '#d89ab0' : '#c8a06a', -0.3);
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.strokeStyle = shade(soft ? '#d89ab0' : '#c8a06a', -0.2);
  ctx.lineWidth = 2;
  for (let i = 1; i <= 2; i++) {
    ctx.beginPath();
    ctx.moveTo(ax - W * (i / 3), ay - 24);
    ctx.lineTo(ax, ay - 24 + (W * (i / 3)) / 2);
    ctx.lineTo(ax + W * (i / 3), ay - 24);
    ctx.stroke();
  }
}

function lamp(ctx: Ctx, _def: FurnitureDef, ax: number, ay: number): void {
  softShadow(ctx, ax, ay, 12, 4);
  ctx.strokeStyle = '#8a795c';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(ax, ay);
  ctx.lineTo(ax, ay - 40);
  ctx.stroke();
  ellipse(ctx, ax, ay - 2, 9, 3, '#8a795c');
  // 灯罩
  ctx.beginPath();
  ctx.moveTo(ax - 12, ay - 40);
  ctx.lineTo(ax + 12, ay - 40);
  ctx.lineTo(ax + 8, ay - 56);
  ctx.lineTo(ax - 8, ay - 56);
  ctx.closePath();
  ctx.fillStyle = '#f2d98a';
  ctx.fill();
  ctx.strokeStyle = shade('#f2d98a', -0.3);
  ctx.lineWidth = 1.4;
  ctx.stroke();
  circle(ctx, ax, ay - 44, 4, '#fff4b8');
}

function shelf(ctx: Ctx, def: FurnitureDef, ax: number, ay: number): void {
  const H = (def.h + 1) * 25;
  softShadow(ctx, ax, ay, 18, 5);
  rrect(ctx, ax - 16, ay - H, 32, H, 3, PAL.wood, shade(PAL.wood, -0.35));
  ctx.strokeStyle = shade(PAL.wood, -0.3);
  ctx.lineWidth = 2;
  for (let i = 1; i <= 3; i++) {
    ctx.beginPath();
    ctx.moveTo(ax - 14, ay - H + (H / 4) * i);
    ctx.lineTo(ax + 14, ay - H + (H / 4) * i);
    ctx.stroke();
  }
  const colors = ['#e8425c', '#5aa7e0', '#f2c018', '#8fd05e', '#b465d8'];
  for (let r = 0; r < 3; r++) {
    for (let b = 0; b < 4; b++) {
      const bx = ax - 12 + b * 6;
      const by = ay - H + (H / 4) * r + 4;
      rrect(ctx, bx, by, 4, H / 4 - 8, 1, colors[(r * 4 + b) % colors.length]);
    }
  }
}

function plant(ctx: Ctx, _def: FurnitureDef, ax: number, ay: number): void {
  softShadow(ctx, ax, ay, 10, 4);
  ctx.beginPath();
  ctx.moveTo(ax - 7, ay);
  ctx.lineTo(ax - 5, ay - 12);
  ctx.lineTo(ax + 5, ay - 12);
  ctx.lineTo(ax + 7, ay);
  ctx.closePath();
  ctx.fillStyle = '#c98a5a';
  ctx.fill();
  ctx.strokeStyle = shade('#c98a5a', -0.3);
  ctx.lineWidth = 1.4;
  ctx.stroke();
  for (let i = 0; i < 5; i++) {
    const a = -Math.PI / 2 + (i - 2) * 0.4;
    leafShape(ctx, ax, ay - 12, 18, 4.5, a, i % 2 ? PAL.leaf : shade(PAL.leaf, -0.12));
  }
}

function fireplace(ctx: Ctx, _def: FurnitureDef, ax: number, ay: number): void {
  softShadow(ctx, ax, ay, 20, 6);
  rrect(ctx, ax - 18, ay - 34, 36, 34, 4, PAL.stone, shade(PAL.stone, -0.35));
  // 炉口
  ctx.beginPath();
  ctx.arc(ax, ay - 14, 10, Math.PI, 0);
  ctx.lineTo(ax + 10, ay - 2);
  ctx.lineTo(ax - 10, ay - 2);
  ctx.closePath();
  ctx.fillStyle = '#3c2c24';
  ctx.fill();
  // 火焰
  tri(ctx, ax - 6, ay - 4, ax + 6, ay - 4, ax, ay - 20, '#f0a03c');
  tri(ctx, ax - 3, ay - 4, ax + 3, ay - 4, ax, ay - 14, '#ffe97a');
  // 壁炉台
  rrect(ctx, ax - 20, ay - 38, 40, 6, 2, shade(PAL.stone, 0.1), shade(PAL.stone, -0.3));
  circle(ctx, ax - 12, ay - 41, 2.4, '#e8425c');
}

function sofa(ctx: Ctx, def: FurnitureDef, ax: number, ay: number): void {
  const W = (def.w + def.h) * 20;
  softShadow(ctx, ax, ay, W * 0.55, 7);
  // 底座
  rrect(ctx, ax - W / 2, ay - 22, W, 20, 5, '#7a9ec8', shade('#7a9ec8', -0.3));
  // 靠背
  rrect(ctx, ax - W / 2, ay - 40, W, 20, 6, '#8fb4d8', shade('#8fb4d8', -0.3));
  // 坐垫
  rrect(ctx, ax - W / 2 + 6, ay - 24, W - 12, 10, 4, '#b8d4e8', shade('#b8d4e8', -0.2));
  // 扶手
  for (const side of [-1, 1]) {
    rrect(ctx, ax + side * (W / 2 - 5) - 4, ay - 38, 9, 34, 4, '#6f92bc', shade('#6f92bc', -0.3));
  }
  // 抱枕
  rrect(ctx, ax - W * 0.24, ay - 36, 12, 10, 3, '#f2d98a', shade('#f2d98a', -0.2));
  rrect(ctx, ax + W * 0.08, ay - 36, 12, 10, 3, '#f08bb1', shade('#f08bb1', -0.2));
}

function tv(ctx: Ctx, _def: FurnitureDef, ax: number, ay: number): void {
  softShadow(ctx, ax, ay, 24, 6);
  rrect(ctx, ax - 22, ay - 18, 44, 16, 3, PAL.wood, shade(PAL.wood, -0.3));
  rrect(ctx, ax - 18, ay - 36, 36, 22, 3, '#3c4a5a', shade('#3c4a5a', -0.3));
  rrect(ctx, ax - 15, ay - 33, 30, 16, 2, '#8fd0e0', shade('#8fd0e0', -0.2));
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.fillRect(ax - 12, ay - 31, 8, 3);
  // 支脚
  ctx.strokeStyle = '#4a3b32';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(ax - 10, ay - 2);
  ctx.lineTo(ax - 10, ay + 2);
  ctx.moveTo(ax + 10, ay - 2);
  ctx.lineTo(ax + 10, ay + 2);
  ctx.stroke();
}

function counter(ctx: Ctx, def: FurnitureDef, ax: number, ay: number): void {
  const W = (def.w + def.h) * 20;
  softShadow(ctx, ax, ay, W * 0.55, 6);
  rrect(ctx, ax - W / 2, ay - 26, W, 24, 3, '#d8c8a8', shade('#d8c8a8', -0.3));
  rrect(ctx, ax - W / 2 - 2, ay - 30, W + 4, 7, 2, '#8a9a78', shade('#8a9a78', -0.3));
  // 柜门
  ctx.strokeStyle = shade('#d8c8a8', -0.25);
  ctx.lineWidth = 1.4;
  for (let i = 1; i < 3; i++) {
    const x = ax - W / 2 + (W / 3) * i;
    ctx.beginPath();
    ctx.moveTo(x, ay - 24);
    ctx.lineTo(x, ay - 4);
    ctx.stroke();
  }
  // 水槽
  ellipse(ctx, ax + W * 0.2, ay - 28, 7, 3, '#bfe6f2', shade('#bfe6f2', -0.2));
  circle(ctx, ax + W * 0.2, ay - 30, 1.4, '#8a9a78');
}

function stove(ctx: Ctx, _def: FurnitureDef, ax: number, ay: number): void {
  softShadow(ctx, ax, ay, 18, 5);
  rrect(ctx, ax - 16, ay - 30, 32, 28, 3, '#c8ccd0', shade('#c8ccd0', -0.3));
  // 灶台
  rrect(ctx, ax - 17, ay - 33, 34, 6, 2, '#4a4e54', shade('#4a4e54', -0.3));
  for (const dx of [-7, 7]) {
    ellipse(ctx, ax + dx, ay - 31, 5, 1.8, '#2c2e32');
    ellipse(ctx, ax + dx, ay - 31, 3, 1, '#e85d4a');
  }
  // 烤箱门
  rrect(ctx, ax - 11, ay - 20, 22, 12, 2, '#3c4046', shade('#3c4046', -0.3));
  rrect(ctx, ax - 8, ay - 17, 16, 6, 1, '#7a8288');
  // 旋钮
  for (const dx of [-6, 0, 6]) circle(ctx, ax + dx, ay - 24, 1.4, '#f2c018');
}

function fridge(ctx: Ctx, _def: FurnitureDef, ax: number, ay: number): void {
  softShadow(ctx, ax, ay, 16, 5);
  rrect(ctx, ax - 14, ay - 46, 28, 44, 4, '#eef2f4', shade('#c8d2d8', -0.2));
  ctx.strokeStyle = '#b8c2c8';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(ax - 14, ay - 28);
  ctx.lineTo(ax + 14, ay - 28);
  ctx.stroke();
  // 把手
  rrect(ctx, ax + 8, ay - 40, 2.4, 8, 1, '#8a9298');
  rrect(ctx, ax + 8, ay - 24, 2.4, 10, 1, '#8a9298');
  // 磁贴
  circle(ctx, ax - 6, ay - 38, 2, '#f08bb1');
  circle(ctx, ax - 1, ay - 35, 1.6, '#f2c018');
}

function wardrobe(ctx: Ctx, def: FurnitureDef, ax: number, ay: number): void {
  const H = (def.h + 1) * 24;
  softShadow(ctx, ax, ay, 18, 5);
  rrect(ctx, ax - 18, ay - H, 36, H, 3, PAL.wood, shade(PAL.wood, -0.35));
  ctx.strokeStyle = shade(PAL.wood, -0.3);
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(ax, ay - H + 4);
  ctx.lineTo(ax, ay - 4);
  ctx.stroke();
  for (const side of [-1, 1]) {
    circle(ctx, ax + side * 3, ay - H / 2, 1.6, '#f2c018');
    rrect(ctx, ax + side * 9 - 6, ay - H + 10, 12, H - 18, 2, shade(PAL.wood, 0.04), shade(PAL.wood, -0.3));
  }
}

function vanity(ctx: Ctx, _def: FurnitureDef, ax: number, ay: number): void {
  softShadow(ctx, ax, ay, 16, 5);
  // 镜子
  ellipse(ctx, ax, ay - 40, 12, 16, '#c8dce8', shade('#c8dce8', -0.3));
  ellipse(ctx, ax, ay - 40, 9, 13, '#bfe6f2');
  // 桌面
  rrect(ctx, ax - 16, ay - 24, 32, 5, 2, PAL.wood, shade(PAL.wood, -0.3));
  ctx.strokeStyle = shade(PAL.wood, -0.35);
  ctx.lineWidth = 3;
  for (const dx of [-12, 12]) {
    ctx.beginPath();
    ctx.moveTo(ax + dx, ay - 22);
    ctx.lineTo(ax + dx, ay - 2);
    ctx.stroke();
  }
  // 化妆品
  circle(ctx, ax - 6, ay - 27, 2, '#f08bb1');
  circle(ctx, ax + 2, ay - 26, 1.6, '#f2c018');
}

export function paintFurniture(ctx: Ctx, def: FurnitureDef): void {
  const { ax, ay } = furnitureCanvasSize(def);
  switch (def.slot) {
    case 'bed': bed(ctx, def, ax, ay); break;
    case 'table': table(ctx, def, ax, ay); break;
    case 'chair': chair(ctx, def, ax, ay); break;
    case 'rug': rug(ctx, def, ax, ay); break;
    case 'lamp': lamp(ctx, def, ax, ay); break;
    case 'shelf': shelf(ctx, def, ax, ay); break;
    case 'plant': plant(ctx, def, ax, ay); break;
    case 'fireplace': fireplace(ctx, def, ax, ay); break;
    case 'sofa': sofa(ctx, def, ax, ay); break;
    case 'tv': tv(ctx, def, ax, ay); break;
    case 'counter': counter(ctx, def, ax, ay); break;
    case 'stove': stove(ctx, def, ax, ay); break;
    case 'fridge': fridge(ctx, def, ax, ay); break;
    case 'wardrobe': wardrobe(ctx, def, ax, ay); break;
    case 'vanity': vanity(ctx, def, ax, ay); break;
    default: break;
  }
}
