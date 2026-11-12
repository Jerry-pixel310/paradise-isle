/**
 * 地形瓦片：草地/沙滩/海水菱形 + 农田土壤 + 高亮框。
 * 瓦片画布 64×48：上半是菱形面，下缘留 16px 画"崖边"厚度。
 */
import { TILE_H, TILE_W, diamondPath } from '../iso';
import { PAL, shade, type Ctx } from './common';
import { mulberry32 } from '../../core/rng';

export const TILE_SPRITE_H = TILE_H + 16;

function tileBase(ctx: Ctx, top: string, side: string, variantSeed: number, speckle?: string): void {
  const cx = TILE_W / 2;
  const cy = TILE_H / 2;
  // 崖边厚度
  ctx.beginPath();
  ctx.moveTo(0, cy);
  ctx.lineTo(cx, TILE_H);
  ctx.lineTo(TILE_W, cy);
  ctx.lineTo(TILE_W, cy + 10);
  ctx.lineTo(cx, TILE_H + 10);
  ctx.lineTo(0, cy + 10);
  ctx.closePath();
  ctx.fillStyle = side;
  ctx.fill();
  // 菱形面
  diamondPath(ctx, cx, cy);
  ctx.fillStyle = top;
  ctx.fill();
  // 细碎点缀
  if (speckle) {
    const rng = mulberry32(variantSeed);
    ctx.fillStyle = speckle;
    for (let i = 0; i < 5; i++) {
      const dx = (rng() - 0.5) * TILE_W * 0.6;
      const dy = (rng() - 0.5) * TILE_H * 0.55;
      ctx.beginPath();
      ctx.ellipse(cx + dx, cy + dy, 1.6, 1, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

export function paintGrassTile(ctx: Ctx, variant: number): void {
  tileBase(ctx, variant % 2 === 0 ? PAL.grass : shade(PAL.grass, 0.05), PAL.grassEdge, 100 + variant, PAL.grassDark);
  const cx = TILE_W / 2;
  const cy = TILE_H / 2;
  const rng = mulberry32(400 + variant);
  // 细草叶：让草地不是纯色菱形
  ctx.strokeStyle = 'rgba(74, 105, 62, 0.45)';
  ctx.lineWidth = 1;
  ctx.lineCap = 'round';
  for (let i = 0; i < 4; i++) {
    const x = cx + (rng() - 0.5) * TILE_W * 0.5;
    const y = cy + (rng() - 0.5) * TILE_H * 0.42;
    const lean = (rng() - 0.5) * 3;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x + lean, y - 3, x + lean * 1.6, y - 5.5);
    ctx.stroke();
  }
  // 偶尔一朵极小野花
  if (variant % 9 === 1) {
    const x = cx + 8;
    const y = cy - 4;
    ctx.fillStyle = 'rgba(246, 239, 214, 0.9)';
    ctx.beginPath();
    ctx.arc(x, y, 1.25, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#c6a15a';
    ctx.beginPath();
    ctx.arc(x, y, 0.55, 0, Math.PI * 2);
    ctx.fill();
  }
}

export function paintSandTile(ctx: Ctx, variant: number): void {
  tileBase(ctx, variant % 2 === 0 ? PAL.sand : shade(PAL.sand, 0.04), PAL.sandDark, 200 + variant, shade(PAL.sand, -0.12));
  const cx = TILE_W / 2;
  const cy = TILE_H / 2;
  const rng = mulberry32(500 + variant);
  ctx.strokeStyle = 'rgba(150, 118, 76, 0.16)';
  ctx.lineWidth = 1;
  for (let i = 0; i < 2; i++) {
    const x = cx + (rng() - 0.5) * TILE_W * 0.45;
    const y = cy + (rng() - 0.5) * TILE_H * 0.4;
    ctx.beginPath();
    ctx.moveTo(x - 5, y);
    ctx.quadraticCurveTo(x, y + 1.8, x + 5, y);
    ctx.stroke();
  }
}

export function paintWaterTile(ctx: Ctx, variant: number, deep: boolean): void {
  const cx = TILE_W / 2;
  const cy = TILE_H / 2;
  diamondPath(ctx, cx, cy);
  ctx.fillStyle = deep ? PAL.waterDeep : PAL.water;
  ctx.fill();
  // 波光
  const rng = mulberry32(300 + variant);
  ctx.strokeStyle = 'rgba(255,255,255,0.26)';
  ctx.lineWidth = 1.2;
  for (let i = 0; i < 2; i++) {
    const x = cx + (rng() - 0.5) * TILE_W * 0.5;
    const y = cy + (rng() - 0.5) * TILE_H * 0.5;
    ctx.beginPath();
    ctx.moveTo(x - 5, y);
    ctx.quadraticCurveTo(x, y - 2.2, x + 5, y);
    ctx.stroke();
  }
}

/** 农田：深色土壤 + 犁沟；wet = 刚浇过水 */
export function paintPlotTile(ctx: Ctx, wet: boolean): void {
  const cx = TILE_W / 2;
  const cy = TILE_H / 2;
  diamondPath(ctx, cx, cy, TILE_W - 6, TILE_H - 4);
  ctx.fillStyle = wet ? '#6d4a33' : '#8a6142';
  ctx.fill();
  ctx.strokeStyle = wet ? '#573a27' : '#6f4d34';
  ctx.lineWidth = 1.4;
  ctx.stroke();
  // 田埂受光边
  ctx.strokeStyle = 'rgba(255, 238, 206, 0.16)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(cx - 18, cy + 2);
  ctx.lineTo(cx, cy - 8);
  ctx.stroke();
  // 小石子
  ctx.fillStyle = 'rgba(70, 48, 32, 0.25)';
  ctx.beginPath();
  ctx.arc(cx + 12, cy + 6, 1.1, 0, Math.PI * 2);
  ctx.arc(cx - 8, cy + 9, 0.9, 0, Math.PI * 2);
  ctx.fill();
  // 犁沟（沿菱形短轴三道）
  ctx.strokeStyle = wet ? 'rgba(46,30,19,0.5)' : 'rgba(87,58,39,0.5)';
  ctx.lineWidth = 2;
  for (let i = -1; i <= 1; i++) {
    const ox = i * 9;
    const oy = i * 4.5;
    ctx.beginPath();
    ctx.moveTo(cx - 16 + ox, cy + 8 + oy - 4.5 * i * 0);
    ctx.lineTo(cx + 2 + ox, cy - 1 + oy);
    ctx.stroke();
  }
}

/** 岸边浪花：mask 1=上 2=左 4=右 8=下，只画与陆地共享的边 */
export function paintFoam(ctx: Ctx, mask: number): void {
  const cx = TILE_W / 2;
  const cy = TILE_H / 2;
  const top: [number, number] = [cx, 0];
  const right: [number, number] = [TILE_W, cy];
  const bottom: [number, number] = [cx, TILE_H];
  const left: [number, number] = [0, cy];
  const edges: Array<[[number, number], [number, number]]> = [];
  if (mask & 1) edges.push([top, right]);
  if (mask & 2) edges.push([left, top]);
  if (mask & 4) edges.push([right, bottom]);
  if (mask & 8) edges.push([bottom, left]);
  ctx.lineCap = 'round';
  for (const [a, b] of edges) {
    ctx.strokeStyle = 'rgba(255, 253, 242, 0.62)';
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(a[0], a[1]);
    ctx.lineTo(b[0], b[1]);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255, 253, 242, 0.2)';
    ctx.lineWidth = 5;
    ctx.stroke();
    // 浪花碎点
    const mx = (a[0] + b[0]) / 2;
    const my = (a[1] + b[1]) / 2;
    ctx.fillStyle = 'rgba(255, 253, 242, 0.7)';
    ctx.beginPath();
    ctx.arc(mx, my, 1.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(mx + (a[0] - b[0]) * 0.14, my + (a[1] - b[1]) * 0.14, 1, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** 悬停高亮 / 可放置提示 */
export function paintHighlight(ctx: Ctx, ok: boolean): void {
  const cx = TILE_W / 2;
  const cy = TILE_H / 2;
  diamondPath(ctx, cx, cy);
  ctx.fillStyle = ok ? 'rgba(255, 255, 180, 0.30)' : 'rgba(240, 80, 60, 0.30)';
  ctx.fill();
  ctx.strokeStyle = ok ? 'rgba(255, 240, 120, 0.95)' : 'rgba(240, 80, 60, 0.9)';
  ctx.lineWidth = 2;
  ctx.stroke();
}

/** 杂草：一丛乱蓬蓬的深草 */
export function paintWeed(ctx: Ctx): void {
  const cx = TILE_W / 2;
  const base = TILE_H / 2 + 6;
  ctx.strokeStyle = '#4c8636';
  ctx.lineWidth = 2.4;
  ctx.lineCap = 'round';
  for (let i = -3; i <= 3; i++) {
    ctx.beginPath();
    ctx.moveTo(cx + i * 3, base);
    ctx.quadraticCurveTo(cx + i * 5.5, base - 9, cx + i * 7, base - 13 - Math.abs(i));
    ctx.stroke();
  }
  ctx.strokeStyle = '#63a94a';
  for (let i = -2; i <= 2; i++) {
    ctx.beginPath();
    ctx.moveTo(cx + i * 3.4, base);
    ctx.quadraticCurveTo(cx + i * 4.5, base - 7, cx + i * 5, base - 10 - Math.abs(i));
    ctx.stroke();
  }
}
