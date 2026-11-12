/**
 * 纸娃娃角色：Q 版三头身，画布 48×68，锚点底部中心 (24, 64)。
 * 分层绘制：身体(肤色) → 下装 → 上装 → 头 → 表情 → 头发 → 帽子 → 配饰。
 * 每层的样式与颜色来自 ClothingDef.paint。
 */
import type { AvatarConfig } from '../../core/types';
import { clothingDef } from '../../core/registry';
import { circle, dotEye, ellipse, leafShape, PAL, rrect, shade, softShadow, tri, type Ctx } from './common';

const AX = 24;
const AY = 64;
// 身体比例：约 3.2 头身，修长但保留故事书感
const HEAD_R = 8.2;
const HEAD_CY = AY - 45;
const BODY_TOP = AY - 34;
const BODY_H = 22;
const LEG_H = 14;

function paintOf(id: string | null): Record<string, string> {
  if (!id) return {};
  try {
    return clothingDef(id).paint;
  } catch {
    return {};
  }
}

export function paintCharacter(ctx: Ctx, avatar: AvatarConfig, opts: { walk?: number } = {}): void {
  const skin = paintOf(avatar.skin).color ?? '#ffe0c2';
  const hairP = paintOf(avatar.hair);
  const faceP = paintOf(avatar.face);
  const topP = paintOf(avatar.top);
  const bottomP = paintOf(avatar.bottom);
  const hatP = avatar.hat ? paintOf(avatar.hat) : null;
  const accP = avatar.accessory ? paintOf(avatar.accessory) : null;

  const walkPhase = opts.walk ?? -1;
  const legSwing = walkPhase >= 0 ? Math.sin(walkPhase * Math.PI * 2) * 3 : 0;
  const bodyBob = walkPhase >= 0 ? Math.abs(Math.sin(walkPhase * Math.PI * 2)) * 1.2 : 0;

  softShadow(ctx, AX, AY, 11, 4);

  // ---- 腿（下装颜色的短腿）
  const legColor = bottomP.color ?? '#d9c49a';
  ctx.lineCap = 'round';
  ctx.strokeStyle = legColor;
  ctx.lineWidth = 4.8;
  ctx.beginPath();
  ctx.moveTo(AX - 3.6, AY - LEG_H - 2);
  ctx.quadraticCurveTo(AX - 4.2 + legSwing * 0.4, AY - LEG_H * 0.5, AX - 3.6 + legSwing, AY - 1);
  ctx.moveTo(AX + 3.6, AY - LEG_H - 2);
  ctx.quadraticCurveTo(AX + 4.2 - legSwing * 0.4, AY - LEG_H * 0.5, AX + 3.6 - legSwing, AY - 1);
  ctx.stroke();
  // 膝盖阴影
  ctx.strokeStyle = 'rgba(80, 55, 38, 0.14)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(AX - 5.2, AY - LEG_H * 0.55);
  ctx.lineTo(AX - 2.2, AY - LEG_H * 0.55);
  ctx.moveTo(AX + 2.2, AY - LEG_H * 0.55);
  ctx.lineTo(AX + 5.2, AY - LEG_H * 0.55);
  ctx.stroke();
  // 鞋：鞋面 + 鞋底 + 高光
  for (const [sx, swing] of [[AX - 3.6, legSwing], [AX + 3.6, -legSwing]] as const) {
    ellipse(ctx, sx + swing, AY - 0.8, 2.9, 2.0, '#7a563a', '#5c3f2a');
    ellipse(ctx, sx + swing, AY + 0.2, 3.0, 0.6, 'rgba(45, 30, 20, 0.35)');
    ellipse(ctx, sx + swing - 0.7, AY - 1.4, 1.0, 0.45, 'rgba(255, 240, 214, 0.35)');
  }

  // 走路时上半身轻微起伏，脚步仍贴地
  ctx.save();
  ctx.translate(0, -bodyBob);

  // 颈部与锁骨
  rrect(ctx, AX - 1.8, BODY_TOP - 3.2, 3.6, 3.6, 1.8, shade(skin, -0.05), shade(skin, -0.28));
  ctx.strokeStyle = 'rgba(150, 95, 72, 0.16)';
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(AX - 3.4, BODY_TOP + 1.4);
  ctx.quadraticCurveTo(AX, BODY_TOP + 2.8, AX + 3.4, BODY_TOP + 1.4);
  ctx.stroke();

  // ---- 下装（短裤/裙）
  const bottomStyle = avatar.bottom.includes('skirt') || avatar.bottom.includes('grass') ? 'skirt' : 'shorts';
  if (bottomStyle === 'skirt') {
    tri(ctx, AX - 9, BODY_TOP + BODY_H, AX + 9, BODY_TOP + BODY_H, AX, BODY_TOP + 6, legColor, shade(legColor, -0.25));
    if (avatar.bottom.includes('grass')) {
      ctx.strokeStyle = shade(legColor, -0.3);
      ctx.lineWidth = 1.4;
      for (let i = -3; i <= 3; i++) {
        ctx.beginPath();
        ctx.moveTo(AX + i * 2.4, BODY_TOP + 10);
        ctx.lineTo(AX + i * 2.8, BODY_TOP + BODY_H);
        ctx.stroke();
      }
    }
  } else {
    rrect(ctx, AX - 7.5, BODY_TOP + BODY_H - 6, 15, 6, 2.5, legColor, shade(legColor, -0.25));
  }

  // ---- 上身
  const topColor = topP.color ?? '#5aa7e0';
  const accent = topP.accent ?? '#ffffff';
  const topStyle = topP.style ?? 'tee';
  ctx.beginPath();
  ctx.moveTo(AX - 8, BODY_TOP + 2.2);
  ctx.quadraticCurveTo(AX - 8.6, BODY_TOP + 1, AX - 6.4, BODY_TOP);
  ctx.lineTo(AX + 6.4, BODY_TOP);
  ctx.quadraticCurveTo(AX + 8.6, BODY_TOP + 1, AX + 8, BODY_TOP + 2.2);
  ctx.lineTo(AX + 6.8, BODY_TOP + BODY_H - 5);
  ctx.quadraticCurveTo(AX, BODY_TOP + BODY_H - 2.5, AX - 6.8, BODY_TOP + BODY_H - 5);
  ctx.closePath();
  ctx.fillStyle = topColor;
  ctx.fill();
  ctx.strokeStyle = shade(topColor, -0.26);
  ctx.lineWidth = 0.9;
  ctx.stroke();
  // 领口露出一点皮肤（小 V 领，而不是一圈肉色）
  tri(ctx, AX - 2.5, BODY_TOP + 0.2, AX + 2.5, BODY_TOP + 0.2, AX, BODY_TOP + 3.2, shade(skin, 0.02), shade(skin, -0.2));
  // 肩线/腰线：让上衣有剪裁而不是一块圆角矩形
  ctx.strokeStyle = shade(topColor, -0.2);
  ctx.lineWidth = 0.9;
  ctx.beginPath();
  ctx.moveTo(AX - 6.4, BODY_TOP + 3);
  ctx.quadraticCurveTo(AX, BODY_TOP + 5.2, AX + 6.4, BODY_TOP + 3);
  ctx.stroke();
  rrect(ctx, AX - 7, BODY_TOP + BODY_H - 7, 14, 2.2, 1, shade(topColor, -0.14));
  // 手臂
  ctx.strokeStyle = topColor;
  ctx.lineWidth = 4.4;
  ctx.beginPath();
  ctx.moveTo(AX - 7.4, BODY_TOP + 4);
  ctx.quadraticCurveTo(AX - 10.2, BODY_TOP + 10, AX - 9.6 - legSwing * 0.5, BODY_TOP + 15);
  ctx.moveTo(AX + 7.4, BODY_TOP + 4);
  ctx.quadraticCurveTo(AX + 10.2, BODY_TOP + 10, AX + 9.6 + legSwing * 0.5, BODY_TOP + 15);
  ctx.stroke();
  // 袖口
  ctx.strokeStyle = shade(topColor, -0.28);
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(AX - 10.4 - legSwing * 0.5, BODY_TOP + 14.2);
  ctx.lineTo(AX - 8.8 - legSwing * 0.5, BODY_TOP + 15.6);
  ctx.moveTo(AX + 10.4 + legSwing * 0.5, BODY_TOP + 14.2);
  ctx.lineTo(AX + 8.8 + legSwing * 0.5, BODY_TOP + 15.6);
  ctx.stroke();
  // 手
  ellipse(ctx, AX - 9.4 - legSwing * 0.5, BODY_TOP + 16.2, 1.7, 2.1, skin, shade(skin, -0.25));
  ellipse(ctx, AX + 9.4 + legSwing * 0.5, BODY_TOP + 16.2, 1.7, 2.1, skin, shade(skin, -0.25));
  // 上装风格细节
  switch (topStyle) {
    case 'tang':
      ctx.strokeStyle = accent;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(AX, BODY_TOP + 1);
      ctx.lineTo(AX, BODY_TOP + BODY_H - 5);
      ctx.stroke();
      for (const dy of [3, 7]) {
        ctx.beginPath();
        ctx.moveTo(AX - 3.4, BODY_TOP + dy);
        ctx.lineTo(AX + 3.4, BODY_TOP + dy);
        ctx.stroke();
      }
      break;
    case 'school':
      // 水手领
      tri(ctx, AX - 7, BODY_TOP, AX + 7, BODY_TOP, AX, BODY_TOP + 6.5, accent, shade(topColor, -0.3));
      rrect(ctx, AX - 1.4, BODY_TOP + 4, 2.8, 4.5, 1, '#d1574d');
      break;
    case 'suit':
      tri(ctx, AX - 5, BODY_TOP, AX + 5, BODY_TOP, AX, BODY_TOP + 7, accent);
      rrect(ctx, AX - 1.2, BODY_TOP + 1, 2.4, 6, 1, '#c9473c');
      circle(ctx, AX - 4, BODY_TOP + 7, 0.8, shade(topColor, -0.4));
      break;
    case 'swim':
      for (const [dx, dy] of [[-4, 4], [3, 7], [-1, 9]] as const) {
        circle(ctx, AX + dx, BODY_TOP + dy, 1.2, accent);
      }
      break;
    case 'hawaii':
      for (const [dx, dy] of [[-4, 3], [4, 5], [-2, 8], [5, 9]] as const) {
        circle(ctx, AX + dx, BODY_TOP + dy, 1.8, accent);
        circle(ctx, AX + dx, BODY_TOP + dy, 0.8, '#fef8ec');
      }
      break;
    case 'hoodie':
      // 兜帽绳与口袋
      ctx.strokeStyle = accent;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(AX - 2.4, BODY_TOP + 1);
      ctx.lineTo(AX - 2.4, BODY_TOP + 5);
      ctx.moveTo(AX + 2.4, BODY_TOP + 1);
      ctx.lineTo(AX + 2.4, BODY_TOP + 5);
      ctx.stroke();
      rrect(ctx, AX - 4.5, BODY_TOP + 7.5, 9, 4, 1.6, shade(topColor, -0.1), shade(topColor, -0.3));
      break;
    case 'pirate':
      // 交叉皮带 + 金扣
      ctx.strokeStyle = accent;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(AX - 7, BODY_TOP + 1);
      ctx.lineTo(AX + 7, BODY_TOP + BODY_H - 6);
      ctx.stroke();
      circle(ctx, AX, BODY_TOP + 6, 1.6, '#f2c018');
      break;
    case 'kimono': {
      // 衣襟 + 腰带
      ctx.strokeStyle = shade(topColor, -0.25);
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(AX - 4, BODY_TOP);
      ctx.lineTo(AX + 3, BODY_TOP + 8);
      ctx.stroke();
      rrect(ctx, AX - 8.5, BODY_TOP + 7, 17, 3.6, 1, topP.accent ?? '#a24a63');
      circle(ctx, AX - 5, BODY_TOP + 3, 1.4, '#fef8ec');
      break;
    }
    case 'royal':
      rrect(ctx, AX - 8.5, BODY_TOP, 17, 3.4, 1.6, accent);
      for (const dx of [-5, 0, 5]) circle(ctx, AX + dx, BODY_TOP + 8, 1.2, accent);
      break;
    default: // tee
      ctx.strokeStyle = accent;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(AX - 4, BODY_TOP + 2.4);
      ctx.quadraticCurveTo(AX, BODY_TOP + 4.6, AX + 4, BODY_TOP + 2.4);
      ctx.stroke();
  }

  // ---- 上装明暗：右侧阴影 + 左侧柔光，让衣服不再是一块平色
  rrect(ctx, AX + 3.2, BODY_TOP + 1.6, 4.4, BODY_H - 7, 2, 'rgba(45, 34, 24, 0.09)');
  rrect(ctx, AX - 7.4, BODY_TOP + 1.8, 3.4, BODY_H - 8, 1.6, 'rgba(255, 248, 232, 0.14)');

  // ---- 头：椭圆脸 + 收窄下巴
  ctx.beginPath();
  ctx.moveTo(AX - 8.1, HEAD_CY - 2);
  ctx.bezierCurveTo(AX - 8.1, HEAD_CY + 5.8, AX - 4.6, HEAD_CY + 9.2, AX, HEAD_CY + 9.2);
  ctx.bezierCurveTo(AX + 4.6, HEAD_CY + 9.2, AX + 8.1, HEAD_CY + 5.8, AX + 8.1, HEAD_CY - 2);
  ctx.bezierCurveTo(AX + 8.1, HEAD_CY - 9.2, AX - 8.1, HEAD_CY - 9.2, AX - 8.1, HEAD_CY - 2);
  ctx.closePath();
  ctx.fillStyle = skin;
  ctx.fill();
  ctx.strokeStyle = shade(skin, -0.22);
  ctx.lineWidth = 1;
  ctx.stroke();
  // 面部柔光 + 腮红
  ellipse(ctx, AX - 3.4, HEAD_CY - 3.2, 4.4, 3.1, 'rgba(255, 249, 236, 0.2)');
  ellipse(ctx, AX - 5.8, HEAD_CY + 3.4, 2.0, 1.0, 'rgba(210, 120, 100, 0.08)');
  ellipse(ctx, AX + 5.8, HEAD_CY + 3.4, 2.0, 1.0, 'rgba(210, 120, 100, 0.08)');
  // 脸颊轮廓 / 下颌阴影，增加立体感
  ellipse(ctx, AX - 6.4, HEAD_CY + 1.6, 1.5, 3.6, 'rgba(150, 95, 75, 0.05)');
  ellipse(ctx, AX + 6.4, HEAD_CY + 1.6, 1.5, 3.6, 'rgba(150, 95, 75, 0.05)');
  ellipse(ctx, AX, HEAD_CY + 7.4, 3.8, 1.0, 'rgba(150, 95, 75, 0.05)');
  // 鼻梁与唇
  ctx.strokeStyle = 'rgba(150, 90, 70, 0.3)';
  ctx.lineWidth = 0.7;
  ctx.beginPath();
  ctx.moveTo(AX - 0.2, HEAD_CY + 1.8);
  ctx.quadraticCurveTo(AX + 0.7, HEAD_CY + 2.4, AX + 0.2, HEAD_CY + 2.7);
  ctx.stroke();
  ellipse(ctx, AX, HEAD_CY + 4.5, 0.9, 0.22, 'rgba(178, 92, 82, 0.14)');

  // ---- 表情
  const faceStyle = faceP.style ?? 'smile';
  const eyeY = HEAD_CY + 0.7;
  switch (faceStyle) {
    case 'wink':
      prettyEye(ctx, AX - 3.3, eyeY, -1);
      ctx.strokeStyle = '#3a2a22';
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.moveTo(AX + 1.4, eyeY);
      ctx.quadraticCurveTo(AX + 3.4, eyeY - 1.6, AX + 5.4, eyeY);
      ctx.stroke();
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(AX + 5.0, eyeY - 0.2);
      ctx.lineTo(AX + 6.4, eyeY - 1.2);
      ctx.stroke();
      smileMouth(ctx);
      break;
    case 'happy': {
      arcEye(ctx, AX - 3.4, eyeY);
      arcEye(ctx, AX + 3.4, eyeY);
      ctx.beginPath();
      ctx.arc(AX, HEAD_CY + 4.6, 2.4, 0, Math.PI);
      ctx.closePath();
      ctx.fillStyle = '#8a4a42';
      ctx.fill();
      break;
    }
    case 'cool':
      prettyEye(ctx, AX - 3.4, eyeY, -1, true);
      prettyEye(ctx, AX + 3.4, eyeY, 1, true);
      ctx.strokeStyle = '#4a3328';
      ctx.lineWidth = 1.0;
      ctx.beginPath();
      ctx.moveTo(AX - 5.8, eyeY - 4.0);
      ctx.lineTo(AX - 1.6, eyeY - 2.9);
      ctx.moveTo(AX + 5.8, eyeY - 4.0);
      ctx.lineTo(AX + 1.6, eyeY - 2.9);
      ctx.stroke();
      flatMouth(ctx);
      break;
    case 'shy':
      prettyEye(ctx, AX - 3.3, eyeY, -1);
      prettyEye(ctx, AX + 3.3, eyeY, 1);
      ellipse(ctx, AX - 5.6, HEAD_CY + 3.6, 2.0, 1.1, 'rgba(240, 120, 120, 0.36)');
      ellipse(ctx, AX + 5.6, HEAD_CY + 3.6, 2.0, 1.1, 'rgba(240, 120, 120, 0.36)');
      smallMouth(ctx);
      break;
    case 'cat': {
      prettyEye(ctx, AX - 3.3, eyeY, -1);
      prettyEye(ctx, AX + 3.3, eyeY, 1);
      ctx.strokeStyle = '#8a4a42';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(AX - 1.5, HEAD_CY + 4.5, 1.4, 0.15 * Math.PI, 0.85 * Math.PI);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(AX + 1.5, HEAD_CY + 4.5, 1.4, 0.15 * Math.PI, 0.85 * Math.PI);
      ctx.stroke();
      break;
    }
    default:
      prettyEye(ctx, AX - 3.3, eyeY, -1);
      prettyEye(ctx, AX + 3.3, eyeY, 1);
      smileMouth(ctx);
  }

  // ---- 头发
  const hairColor = hairP.color ?? '#7a4a2b';
  const hairStyle = hairP.style ?? 'short';
  paintHair(ctx, hairStyle, hairColor);

  // ---- 帽子
  if (hatP) paintHat(ctx, hatP.style ?? 'straw', hatP.color ?? '#e0c27e');

  // ---- 配饰
  if (accP) paintAccessory(ctx, accP.style ?? 'scarf', accP.color ?? '#cf4a3f');

  ctx.restore();
}

function prettyEye(ctx: Ctx, x: number, y: number, side: number, serious = false): void {
  // 眉
  ctx.strokeStyle = '#96765a';
  ctx.lineWidth = 0.35;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x - 2.0 * side, y - (serious ? 3.8 : 3.4));
  ctx.quadraticCurveTo(x, y - (serious ? 4.2 : 3.9), x + 2.1 * side, y - (serious ? 3.9 : 3.6));
  ctx.stroke();
  // 眼白
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(side * 0.05);
  ellipse(ctx, 0, 0, 2.0, 1.5, '#fffdf8');
  ellipse(ctx, 0.1 * side, 0.05, 0.78, 0.9, '#7a563d');
  circle(ctx, 0.1 * side, 0.1, 0.36, '#2d211b');
  circle(ctx, -0.24 * side, -0.32, 0.25, 'rgba(255, 255, 255, 0.95)');
  // 细上眼线
  ctx.strokeStyle = '#5a4030';
  ctx.lineWidth = 0.4;
  ctx.beginPath();
  ctx.ellipse(0, 0, 2.0, 1.5, 0, Math.PI * 1.08, Math.PI * 1.92);
  ctx.stroke();
  // 眼睑褶皱 + 下睫毛
  ctx.strokeStyle = 'rgba(120, 82, 62, 0.22)';
  ctx.lineWidth = 0.3;
  ctx.beginPath();
  ctx.ellipse(0, -0.4, 1.7, 1.2, 0, Math.PI * 1.18, Math.PI * 1.82);
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(0, 0.2, 1.75, 1.2, 0, Math.PI * 0.15, Math.PI * 0.55);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(1.8 * side, -0.65);
  ctx.lineTo(2.35 * side, -1.0);
  ctx.stroke();
  ctx.restore();
}

function smileMouth(ctx: Ctx): void {
  ctx.strokeStyle = '#a86a60';
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.arc(AX, HEAD_CY + 3.7, 1.9, 0.2 * Math.PI, 0.8 * Math.PI);
  ctx.stroke();
}

function smallMouth(ctx: Ctx): void {
  ctx.strokeStyle = '#8a4a42';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(AX, HEAD_CY + 4.2, 1.4, 0.2 * Math.PI, 0.8 * Math.PI);
  ctx.stroke();
}

function flatMouth(ctx: Ctx): void {
  ctx.strokeStyle = '#8a4a42';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(AX - 2, HEAD_CY + 5);
  ctx.lineTo(AX + 2.4, HEAD_CY + 5);
  ctx.stroke();
}

function arcEye(ctx: Ctx, x: number, y: number): void {
  ctx.strokeStyle = '#33281f';
  ctx.lineWidth = 1.7;
  ctx.beginPath();
  ctx.arc(x, y + 1, 2.2, 1.15 * Math.PI, 1.85 * Math.PI);
  ctx.stroke();
}

function paintHair(ctx: Ctx, style: string, color: string): void {
  const dark = shade(color, -0.2);
  switch (style) {
    case 'long':
      // 披肩长发
      ctx.beginPath();
      ctx.arc(AX, HEAD_CY - 1.5, HEAD_R + 1.2, Math.PI * 0.95, Math.PI * 2.05);
      ctx.quadraticCurveTo(AX + HEAD_R + 3, HEAD_CY + 12, AX + HEAD_R - 3, HEAD_CY + 15);
      ctx.lineTo(AX + HEAD_R - 7, HEAD_CY + 6);
      ctx.lineTo(AX - HEAD_R + 7, HEAD_CY + 6);
      ctx.lineTo(AX - HEAD_R + 3, HEAD_CY + 15);
      ctx.quadraticCurveTo(AX - HEAD_R - 3, HEAD_CY + 12, AX - HEAD_R - 1.2, HEAD_CY - 1.5);
      ctx.closePath();
      ctx.fillStyle = color;
      ctx.fill();
      ctx.strokeStyle = dark;
      ctx.lineWidth = 1.4;
      ctx.stroke();
      hairShine(ctx, color);
      fringe(ctx, color);
      break;
    case 'pony': {
      capHair(ctx, color, dark);
      // 高马尾
      ellipse(ctx, AX + HEAD_R - 1, HEAD_CY - 8, 3.4, 4, color, dark);
      ctx.beginPath();
      ctx.moveTo(AX + HEAD_R - 1, HEAD_CY - 6);
      ctx.quadraticCurveTo(AX + HEAD_R + 6, HEAD_CY + 2, AX + HEAD_R + 2, HEAD_CY + 12);
      ctx.quadraticCurveTo(AX + HEAD_R - 2, HEAD_CY + 6, AX + HEAD_R - 3, HEAD_CY - 2);
      ctx.closePath();
      ctx.fillStyle = color;
      ctx.fill();
      ctx.strokeStyle = dark;
      ctx.stroke();
      break;
    }
    case 'curly':
      capHair(ctx, color, dark);
      for (const [dx, dy] of [[-HEAD_R + 1, 2], [HEAD_R - 1, 2], [-HEAD_R + 3, 7], [HEAD_R - 3, 7]] as const) {
        circle(ctx, AX + dx, HEAD_CY + dy, 3.2, color, dark);
      }
      break;
    case 'spiky':
      capHair(ctx, color, dark);
      for (let i = -2; i <= 2; i++) {
        tri(ctx, AX + i * 4 - 2.4, HEAD_CY - HEAD_R + 2, AX + i * 4 + 2.4, HEAD_CY - HEAD_R + 2,
          AX + i * 5, HEAD_CY - HEAD_R - 5 - (2 - Math.abs(i)), color, dark);
      }
      break;
    case 'buns':
      capHair(ctx, color, dark);
      circle(ctx, AX - HEAD_R + 1, HEAD_CY - HEAD_R + 3, 4.2, color, dark);
      circle(ctx, AX + HEAD_R - 1, HEAD_CY - HEAD_R + 3, 4.2, color, dark);
      break;
    default: // short
      capHair(ctx, color, dark);
      fringe(ctx, color);
  }
}

/** 基础发盖 */
function capHair(ctx: Ctx, color: string, dark: string): void {
  // 侧分短发：露出额头，一边长一边短
  ctx.beginPath();
  ctx.moveTo(AX - 8.5, HEAD_CY - 1.4);
  ctx.bezierCurveTo(AX - 9.2, HEAD_CY - 10.2, AX + 4.2, HEAD_CY - 10.6, AX + 8.5, HEAD_CY - 3.0);
  ctx.quadraticCurveTo(AX + 6.8, HEAD_CY - 5.4, AX + 4.4, HEAD_CY - 6.2);
  ctx.quadraticCurveTo(AX + 0.8, HEAD_CY - 7.4, AX - 1.6, HEAD_CY - 5.2);
  ctx.quadraticCurveTo(AX - 5.0, HEAD_CY - 4.4, AX - 8.5, HEAD_CY - 1.4);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  ctx.strokeStyle = dark;
  ctx.lineWidth = 1.2;
  ctx.stroke();
  hairShine(ctx, color);
}

/** 头发高光：一条柔和的弧线，避免整块死色 */
function hairShine(ctx: Ctx, color: string): void {
  ctx.strokeStyle = shade(color, 0.12);
  ctx.lineWidth = 0.75;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(AX - 1.5, HEAD_CY - 3.5, HEAD_R - 2.4, Math.PI * 1.08, Math.PI * 1.5);
  ctx.stroke();
}

/** 刘海小尖 + 侧扫发丝 */
function fringe(ctx: Ctx, color: string): void {
  // 一侧斜扫的刘海，避免锅盖头
  ctx.beginPath();
  ctx.moveTo(AX - 8.2, HEAD_CY - 2.2);
  ctx.quadraticCurveTo(AX - 6.2, HEAD_CY - 7.2, AX - 1.2, HEAD_CY - 7.0);
  ctx.quadraticCurveTo(AX + 3.4, HEAD_CY - 6.8, AX + 6.6, HEAD_CY - 4.2);
  ctx.quadraticCurveTo(AX + 2.4, HEAD_CY - 5.0, AX - 0.6, HEAD_CY - 3.8);
  ctx.quadraticCurveTo(AX - 4.4, HEAD_CY - 3.0, AX - 8.2, HEAD_CY - 2.2);
  ctx.closePath();
  ctx.fillStyle = shade(color, 0.02);
  ctx.fill();
  ctx.strokeStyle = shade(color, -0.2);
  ctx.lineWidth = 0.6;
  ctx.stroke();
  // 发丝
  ctx.strokeStyle = shade(color, 0.24);
  ctx.lineWidth = 0.55;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(AX - 6.0, HEAD_CY - 5.6);
  ctx.quadraticCurveTo(AX - 2.8, HEAD_CY - 5.4, AX - 0.2, HEAD_CY - 4.0);
  ctx.moveTo(AX + 3.6, HEAD_CY - 5.6);
  ctx.quadraticCurveTo(AX + 2.2, HEAD_CY - 4.8, AX + 1.2, HEAD_CY - 3.8);
  ctx.stroke();
  // 脸侧碎发，柔化脸型
  ctx.strokeStyle = color;
  ctx.lineWidth = 0.55;
  ctx.beginPath();
  ctx.moveTo(AX - 7.6, HEAD_CY - 2.4);
  ctx.quadraticCurveTo(AX - 7.9, HEAD_CY + 0.8, AX - 6.8, HEAD_CY + 3.2);
  ctx.moveTo(AX + 7.6, HEAD_CY - 2.4);
  ctx.quadraticCurveTo(AX + 7.9, HEAD_CY + 0.8, AX + 6.8, HEAD_CY + 3.0);
  ctx.stroke();
  // 顶部层次，避免头盔感
  ctx.strokeStyle = shade(color, 0.1);
  ctx.lineWidth = 0.35;
  ctx.beginPath();
  ctx.moveTo(AX - 4.6, HEAD_CY - 8.2);
  ctx.quadraticCurveTo(AX - 1.6, HEAD_CY - 9.0, AX + 1.4, HEAD_CY - 8.6);
  ctx.stroke();
}

function paintHat(ctx: Ctx, style: string, color: string): void {
  const dark = shade(color, -0.25);
  const topY = HEAD_CY - HEAD_R;
  switch (style) {
    case 'straw':
      ellipse(ctx, AX, topY + 2, HEAD_R + 6, 4.5, color, dark);
      ctx.beginPath();
      ctx.arc(AX, topY + 1.5, HEAD_R - 2.5, Math.PI, Math.PI * 2);
      ctx.closePath();
      ctx.fillStyle = color;
      ctx.fill();
      ctx.strokeStyle = dark;
      ctx.stroke();
      rrect(ctx, AX - (HEAD_R - 2.5), topY - 1, (HEAD_R - 2.5) * 2, 2.6, 1, '#d1574d');
      break;
    case 'cap':
      ctx.beginPath();
      ctx.arc(AX, topY + 2.5, HEAD_R - 1, Math.PI, Math.PI * 2);
      ctx.closePath();
      ctx.fillStyle = color;
      ctx.fill();
      ctx.strokeStyle = dark;
      ctx.lineWidth = 1.4;
      ctx.stroke();
      ellipse(ctx, AX + HEAD_R - 3, topY + 3, 6, 2, color, dark);
      circle(ctx, AX, topY - 4.5, 1.6, dark);
      break;
    case 'flower':
      for (let i = 0; i < 7; i++) {
        const a = Math.PI + (i / 6) * Math.PI;
        const px = AX + Math.cos(a) * (HEAD_R - 0.5);
        const py = topY + 4 + Math.sin(a) * 4;
        circle(ctx, px, py, 2.4, i % 2 ? color : '#fef8ec');
        circle(ctx, px, py, 1, '#f2c018');
      }
      break;
    case 'pirate':
      ctx.beginPath();
      ctx.moveTo(AX - HEAD_R - 5, topY + 4);
      ctx.quadraticCurveTo(AX, topY - 10, AX + HEAD_R + 5, topY + 4);
      ctx.quadraticCurveTo(AX + HEAD_R + 1, topY + 1, AX, topY + 1.5);
      ctx.quadraticCurveTo(AX - HEAD_R - 1, topY + 1, AX - HEAD_R - 5, topY + 4);
      ctx.closePath();
      ctx.fillStyle = color;
      ctx.fill();
      ctx.strokeStyle = dark;
      ctx.lineWidth = 1.4;
      ctx.stroke();
      // 骷髅标志（可爱版：圆点+叉）
      circle(ctx, AX, topY - 2, 2.2, '#fef8ec');
      break;
    case 'crown':
      ctx.beginPath();
      ctx.moveTo(AX - 6, topY + 2);
      ctx.lineTo(AX - 6, topY - 4);
      ctx.lineTo(AX - 3, topY - 1);
      ctx.lineTo(AX, topY - 5.5);
      ctx.lineTo(AX + 3, topY - 1);
      ctx.lineTo(AX + 6, topY - 4);
      ctx.lineTo(AX + 6, topY + 2);
      ctx.closePath();
      ctx.fillStyle = color;
      ctx.fill();
      ctx.strokeStyle = dark;
      ctx.lineWidth = 1.2;
      ctx.stroke();
      circle(ctx, AX, topY - 0.5, 1.2, '#e8425c');
      break;
    case 'shark': {
      // 鲨鱼头套
      ctx.beginPath();
      ctx.arc(AX, HEAD_CY - 2, HEAD_R + 2.4, Math.PI * 0.85, Math.PI * 2.15);
      ctx.closePath();
      ctx.fillStyle = color;
      ctx.fill();
      ctx.strokeStyle = dark;
      ctx.lineWidth = 1.4;
      ctx.stroke();
      tri(ctx, AX - 3, topY - 3, AX + 3, topY - 3, AX, topY - 11, color, dark);
      // 牙
      for (const dx of [-7, -2.5, 2, 6.5]) {
        tri(ctx, AX + dx, HEAD_CY - 5, AX + dx + 3, HEAD_CY - 5, AX + dx + 1.5, HEAD_CY - 1.5, '#fef8ec');
      }
      break;
    }
  }
}

function paintAccessory(ctx: Ctx, style: string, color: string): void {
  switch (style) {
    case 'scarf':
      rrect(ctx, AX - 8, BODY_TOP - 2.4, 16, 4.6, 2, color, shade(color, -0.25));
      rrect(ctx, AX + 2, BODY_TOP + 1, 4.5, 9, 2, color, shade(color, -0.25));
      break;
    case 'glasses':
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.arc(AX - 4.2, HEAD_CY + 0.5, 3.4, 0, Math.PI * 2);
      ctx.moveTo(AX + 7.6, HEAD_CY + 0.5);
      ctx.arc(AX + 4.2, HEAD_CY + 0.5, 3.4, 0, Math.PI * 2);
      ctx.moveTo(AX - 0.8, HEAD_CY + 0.5);
      ctx.lineTo(AX + 0.8, HEAD_CY + 0.5);
      ctx.stroke();
      break;
    case 'necklace':
      ctx.strokeStyle = '#c9b48a';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(AX, BODY_TOP - 1, 5.5, 0.15 * Math.PI, 0.85 * Math.PI);
      ctx.stroke();
      tri(ctx, AX - 2, BODY_TOP + 3.4, AX + 2, BODY_TOP + 3.4, AX, BODY_TOP + 7, color, shade(color, -0.25));
      break;
    case 'wings':
      for (const side of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(AX + side * 8, BODY_TOP + 2);
        ctx.quadraticCurveTo(AX + side * 20, BODY_TOP - 8, AX + side * 16, BODY_TOP + 8);
        ctx.quadraticCurveTo(AX + side * 12, BODY_TOP + 10, AX + side * 8, BODY_TOP + 6);
        ctx.closePath();
        ctx.fillStyle = color;
        ctx.globalAlpha = 0.85;
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.strokeStyle = shade(color, -0.2);
        ctx.lineWidth = 1.2;
        ctx.stroke();
      }
      break;
    case 'parrot':
      // 肩上小鹦鹉
      ellipse(ctx, AX + 11, BODY_TOP - 1, 4, 5, color, shade(color, -0.3));
      circle(ctx, AX + 11, BODY_TOP - 7, 3.2, color, shade(color, -0.3));
      tri(ctx, AX + 13.5, BODY_TOP - 7.5, AX + 13.5, BODY_TOP - 5.5, AX + 16, BODY_TOP - 6.5, '#f0a03c');
      dotEye(ctx, AX + 10, BODY_TOP - 7.5, 1.2);
      leafShape(ctx, AX + 8, BODY_TOP + 2, 6, 2, 2.6, '#e8425c');
      break;
  }
}

export { PAL };
