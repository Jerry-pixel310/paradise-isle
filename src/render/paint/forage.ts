/**
 * 采摘物精灵：野莓、蘑菇、香草、蜂巢、松露、贝壳、海藻、落椰。
 * 画布 48×56，锚点底部中心 (24, 52)，整体矮小、贴地。
 */
import { circle, ellipse, leafShape, PAL, shade, softShadow, tri, type Ctx } from './common';

const AX = 24;
const AY = 52;

function berry(ctx: Ctx): void {
  softShadow(ctx, AX, AY, 12);
  circle(ctx, AX - 6, AY - 9, 6, PAL.leaf, shade(PAL.leaf, -0.15));
  circle(ctx, AX + 6, AY - 8, 6, shade(PAL.leaf, -0.08), shade(PAL.leaf, -0.2));
  circle(ctx, AX, AY - 15, 7, PAL.leaf, shade(PAL.leaf, -0.18));
  for (const [dx, dy] of [[-7, -10], [6, -8], [-1, -18], [8, -16]] as const) {
    circle(ctx, AX + dx, AY + dy, 2.6, '#c8324c', shade('#c8324c', -0.3));
  }
  leafShape(ctx, AX, AY - 4, 8, 2.6, -0.6, PAL.leafDark);
}

function mushroom(ctx: Ctx): void {
  softShadow(ctx, AX, AY, 11);
  for (const [dx, s] of [[-6, 0.85], [7, 0.65]] as const) {
    const stemH = 12 * s;
    ctx.fillStyle = '#f0e6d0';
    ctx.fillRect(AX + dx - 2, AY - stemH, 4, stemH);
    ellipse(ctx, AX + dx, AY - stemH - 2, 8 * s, 6 * s, '#d84a3c', shade('#d84a3c', -0.3));
    circle(ctx, AX + dx - 3 * s, AY - stemH - 3, 1.5 * s, '#f8ece0');
    circle(ctx, AX + dx + 2 * s, AY - stemH - 1, 1.2 * s, '#f8ece0');
  }
}

function herb(ctx: Ctx): void {
  softShadow(ctx, AX, AY, 10);
  for (let i = 0; i < 4; i++) {
    const a = -1.5 + i * 0.42;
    leafShape(ctx, AX - 6 + i * 4, AY - 2, 16, 3.2, a, i % 2 ? PAL.leaf : shade(PAL.leaf, -0.12));
  }
  circle(ctx, AX - 2, AY - 16, 2, '#a8d878');
  circle(ctx, AX + 5, AY - 12, 2, '#a8d878');
}

function honey(ctx: Ctx): void {
  softShadow(ctx, AX, AY, 10);
  // 挂蜂巢的树枝
  ctx.strokeStyle = PAL.woodDark;
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(AX - 1, AY - 26);
  ctx.lineTo(AX - 14, AY - 22);
  ctx.stroke();
  ctx.strokeStyle = PAL.wood;
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(AX - 1, AY - 26);
  ctx.lineTo(AX - 1, AY - 21);
  ctx.stroke();
  // 蜂巢主体：椭圆 + 横向蜜纹
  ellipse(ctx, AX - 1, AY - 13, 9, 11, '#e8a83c', shade('#e8a83c', -0.3));
  ctx.strokeStyle = shade('#e8a83c', -0.25);
  ctx.lineWidth = 1.4;
  for (let i = 0; i < 4; i++) {
    ctx.beginPath();
    ctx.ellipse(AX - 1, AY - 21 + i * 5, 7.6, 1.6, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  // 巢门
  circle(ctx, AX - 1, AY - 6, 2.6, '#7a5228');
  // 小蜜蜂
  circle(ctx, AX + 9, AY - 24, 2, '#f2c018');
  ellipse(ctx, AX + 9, AY - 26, 2, 1.2, 'rgba(255,255,255,0.7)');
  ctx.strokeStyle = '#33281f';
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(AX + 9, AY - 24); ctx.lineTo(AX + 9, AY - 22);
  ctx.stroke();
}

function truffle(ctx: Ctx): void {
  softShadow(ctx, AX, AY, 10);
  ellipse(ctx, AX, AY - 4, 9, 4, '#6a5240', shade('#6a5240', -0.3));
  circle(ctx, AX, AY - 9, 7.5, '#5c4636', shade('#5c4636', -0.3));
  circle(ctx, AX - 3, AY - 11, 1.3, '#8a705a');
  circle(ctx, AX + 3, AY - 8, 1.1, '#8a705a');
  circle(ctx, AX + 1, AY - 6, 1, '#8a705a');
  leafShape(ctx, AX - 7, AY - 6, 6, 2, -0.4, '#6c9c48');
}

function shell(ctx: Ctx): void {
  softShadow(ctx, AX, AY, 9);
  ctx.beginPath();
  ctx.moveTo(AX - 9, AY - 4);
  ctx.quadraticCurveTo(AX, AY - 22, AX + 9, AY - 4);
  ctx.quadraticCurveTo(AX, AY + 2, AX - 9, AY - 4);
  ctx.closePath();
  ctx.fillStyle = '#f5c7d5';
  ctx.fill();
  ctx.strokeStyle = shade('#f5c7d5', -0.3);
  ctx.lineWidth = 1.4;
  ctx.stroke();
  for (const dx of [-5, 0, 5]) {
    ctx.beginPath();
    ctx.moveTo(AX + dx, AY - 5);
    ctx.lineTo(AX + dx * 0.4, AY - 16);
    ctx.strokeStyle = shade('#f5c7d5', -0.2);
    ctx.lineWidth = 1;
    ctx.stroke();
  }
}

function seaweed(ctx: Ctx): void {
  softShadow(ctx, AX, AY, 11);
  for (let i = 0; i < 4; i++) {
    ctx.strokeStyle = i % 2 ? '#3c7a4c' : '#4c9c5c';
    ctx.lineWidth = 3.2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(AX - 6 + i * 4, AY);
    ctx.quadraticCurveTo(AX - 9 + i * 5, AY - 14, AX - 3 + i * 4, AY - 22 - (i % 2) * 3);
    ctx.stroke();
  }
}

function coconut(ctx: Ctx): void {
  softShadow(ctx, AX, AY, 10);
  circle(ctx, AX, AY - 8, 8, '#8a6248', shade('#8a6248', -0.3));
  circle(ctx, AX - 2, AY - 10, 2, '#5c422e');
  circle(ctx, AX + 2, AY - 10, 2, '#5c422e');
  leafShape(ctx, AX + 6, AY - 14, 12, 3.4, -0.7, PAL.leaf);
  leafShape(ctx, AX + 6, AY - 14, 12, 3.4, -0.1, shade(PAL.leaf, -0.12));
}

const PAINTERS: Record<string, (ctx: Ctx) => void> = {
  forage_berry: berry,
  forage_mushroom: mushroom,
  forage_herb: herb,
  forage_honey: honey,
  forage_truffle: truffle,
  forage_shell: shell,
  forage_seaweed: seaweed,
  forage_coconut: coconut,
};

export function paintForage(ctx: Ctx, defId: string): void {
  const paint = PAINTERS[defId];
  if (paint) paint(ctx);
  else tri(ctx, AX - 5, AY, AX + 5, AY, AX, AY - 10, '#9ccc6c', shade('#9ccc6c', -0.3));
}
