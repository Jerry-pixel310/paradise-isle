/**
 * 生物精灵：动物（10 种）、野兽（8 种）、宠物（8 只）。
 * 画布 56×64，锚点底部中心 (28, 58)。统一 Q 版配方：
 * 圆身体 + 圆头 + 物种特征件（耳/角/喙/壳……），豆豆眼。
 */
import { circle, dotEye, ellipse, leafShape, shade, softShadow, tri, type Ctx } from './common';

const AX = 28;
const AY = 58;

interface CritterCfg {
  body: string;         // 主色
  belly?: string;       // 肚皮色
  size?: number;        // 体型 0.7~1.4
  feet?: boolean;       // 是否画两只小脚（鸟/蛇/海豚关闭）
  feature: (ctx: Ctx, s: number, body: string) => void;
}

type BodyShape = 'round' | 'long' | 'tall' | 'bird' | 'fish' | 'serpent';

const BODY_SHAPE: Record<string, BodyShape> = {
  animal_chicken: 'bird', animal_duck: 'bird', animal_turkey: 'bird', animal_peacock: 'bird',
  animal_cow: 'long', animal_goat: 'long', animal_sheep: 'long', animal_pig: 'long',
  animal_alpaca: 'tall',
  beast_boar: 'long', beast_wolf: 'long', beast_croc: 'long',
  beast_bear: 'tall', beast_monkey: 'tall', beast_golem: 'tall', beast_dragon: 'tall',
  beast_snake: 'serpent',
  pet_fox: 'long', pet_parrot: 'bird', pet_dolphin: 'fish',
};

/** 通用小动物身体：s 为缩放，shape 决定物种轮廓 */
function critterBase(ctx: Ctx, cfg: CritterCfg, shape: BodyShape = 'round'): void {
  const s = cfg.size ?? 1;
  const bw = 15 * s;
  softShadow(ctx, AX, AY, bw * 1.1);

  // 蛇：盘绕的身体 + 抬起的头
  if (shape === 'serpent') {
    ctx.strokeStyle = cfg.body;
    ctx.lineWidth = bw * 0.42;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(AX, AY - bw * 0.35, bw * 0.62, Math.PI * 0.15, Math.PI * 1.85);
    ctx.stroke();
    ctx.strokeStyle = shade(cfg.body, -0.22);
    ctx.lineWidth = bw * 0.12;
    ctx.beginPath();
    ctx.arc(AX, AY - bw * 0.35, bw * 0.7, Math.PI * 0.2, Math.PI * 1.5);
    ctx.stroke();
    const hy = AY - bw * 1.45;
    circle(ctx, AX + bw * 0.45, hy, bw * 0.5, cfg.body, shade(cfg.body, -0.3));
    dotEye(ctx, AX + bw * 0.28, hy - 1.5, 1.9);
    dotEye(ctx, AX + bw * 0.62, hy - 1.5, 1.9);
    cfg.feature(ctx, s, cfg.body);
    return;
  }

  const long = shape === 'long';
  const tall = shape === 'tall';
  const bird = shape === 'bird';
  const fish = shape === 'fish';
  const rx = long ? bw * 1.22 : tall ? bw * 0.86 : bird ? bw * 0.94 : fish ? bw * 1.24 : bw;
  const ry = long ? bw * 0.7 : tall ? bw * 1.0 : bird ? bw * 0.95 : fish ? bw * 0.66 : bw * 0.82;
  const bcy = long ? AY - bw * 0.68 : tall ? AY - bw * 0.9 : fish ? AY - bw * 0.7 : AY - bw * 0.8;

  // 尾巴/尾羽先画在身体后面
  if (bird) {
    tri(ctx, AX + bw * 0.45, AY - bw * 0.7, AX + bw * 1.35, AY - bw * 0.52, AX + bw * 1.05, AY - bw * 0.18, shade(cfg.body, -0.12), shade(cfg.body, -0.3));
  } else if (fish) {
    tri(ctx, AX + bw * 1.0, AY - bw * 0.85, AX + bw * 1.5, AY - bw * 0.45, AX + bw * 1.5, AY - bw * 1.05, shade(cfg.body, -0.1), shade(cfg.body, -0.3));
  }

  ellipse(ctx, AX, bcy, rx, ry, cfg.body, shade(cfg.body, -0.3));
  // 两只小脚
  if (cfg.feet !== false) {
    ellipse(ctx, AX - bw * 0.42, AY + 0.4, bw * 0.2, bw * 0.11, shade(cfg.body, -0.34), shade(cfg.body, -0.5));
    ellipse(ctx, AX + bw * 0.42, AY + 0.4, bw * 0.2, bw * 0.11, shade(cfg.body, -0.34), shade(cfg.body, -0.5));
  }
  // 身体柔光
  ellipse(ctx, AX - rx * 0.28, bcy - ry * 0.35, rx * 0.3, ry * 0.42, 'rgba(255, 250, 238, 0.14)');
  if (cfg.belly) {
    ellipse(ctx, AX, bcy + ry * 0.18, rx * 0.52, ry * 0.42, cfg.belly);
  }
  // 头
  const hy = AY - bw * 1.7;
  circle(ctx, AX, hy, bw * 0.72, cfg.body, shade(cfg.body, -0.3));
  ellipse(ctx, AX - bw * 0.22, hy - bw * 0.24, bw * 0.24, bw * 0.17, 'rgba(255, 250, 238, 0.16)');
  dotEye(ctx, AX - bw * 0.28, hy - 1, 2);
  dotEye(ctx, AX + bw * 0.28, hy - 1, 2);
  // 鼻口与小腮红
  ellipse(ctx, AX, hy + bw * 0.18, 1.5, 1.1, shade(cfg.body, -0.45));
  ellipse(ctx, AX - bw * 0.52, hy + bw * 0.22, bw * 0.14, bw * 0.08, 'rgba(210, 120, 100, 0.18)');
  ellipse(ctx, AX + bw * 0.52, hy + bw * 0.22, bw * 0.14, bw * 0.08, 'rgba(210, 120, 100, 0.18)');
  cfg.feature(ctx, s, cfg.body);
}

// ---------------------------------------------------------------- 动物

const ANIMAL_CFG: Record<string, CritterCfg> = {
  animal_chicken: {
    body: '#f5ead2', size: 0.85, feet: false,
    feature: (ctx, s) => {
      const hy = AY - 13 * s * 1.7;
      tri(ctx, AX - 2, hy + 3.5, AX + 2, hy + 3.5, AX, hy + 7, '#f0a03c'); // 喙
      circle(ctx, AX - 2.5, hy - 9, 2.6, '#e04a3c'); // 鸡冠
      circle(ctx, AX + 0.5, hy - 10, 2.6, '#e04a3c');
      circle(ctx, AX + 3.5, hy - 9, 2.6, '#e04a3c');
    },
  },
  animal_duck: {
    body: '#fdfdf6', size: 0.9, feet: false,
    feature: (ctx, s) => {
      const hy = AY - 13.5 * s * 1.7;
      ellipse(ctx, AX, hy + 4, 5, 2.6, '#f0a03c', shade('#f0a03c', -0.25)); // 扁喙
      ellipse(ctx, AX - 9 * s, AY - 10 * s, 4.5, 6, '#eeeadf'); // 翅膀
      ellipse(ctx, AX + 9 * s, AY - 10 * s, 4.5, 6, '#eeeadf');
    },
  },
  animal_rabbit: {
    body: '#efe6f5', belly: '#fbf7ff', size: 0.85,
    feature: (ctx, s, body) => {
      const hy = AY - 13 * s * 1.7;
      ellipse(ctx, AX - 5, hy - 12, 3.2, 9, body, shade(body, -0.25));
      ellipse(ctx, AX + 5, hy - 12, 3.2, 9, body, shade(body, -0.25));
      ellipse(ctx, AX - 5, hy - 11, 1.6, 6, '#f5c7d5');
      ellipse(ctx, AX + 5, hy - 11, 1.6, 6, '#f5c7d5');
    },
  },
  animal_goat: {
    body: '#e8e2d4', belly: '#f6f2e8',
    feature: (ctx, s, body) => {
      const hy = AY - 15 * s * 1.7;
      // 弯角
      ctx.strokeStyle = '#b0977a';
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(AX - 6, hy - 8);
      ctx.quadraticCurveTo(AX - 12, hy - 14, AX - 8, hy - 17);
      ctx.moveTo(AX + 6, hy - 8);
      ctx.quadraticCurveTo(AX + 12, hy - 14, AX + 8, hy - 17);
      ctx.stroke();
      // 山羊胡
      tri(ctx, AX - 2, hy + 8, AX + 2, hy + 8, AX, hy + 13, shade(body, -0.15));
    },
  },
  animal_pig: {
    body: '#f5c7c2', belly: '#fbdfdb', size: 1.05,
    feature: (ctx, s) => {
      const hy = AY - 15.75 * s * 1.7;
      ellipse(ctx, AX, hy + 3, 4.6, 3.4, '#eba59e', shade('#eba59e', -0.2)); // 猪鼻
      circle(ctx, AX - 1.6, hy + 3, 0.9, '#c97b73');
      circle(ctx, AX + 1.6, hy + 3, 0.9, '#c97b73');
      tri(ctx, AX - 9, hy - 8, AX - 3, hy - 10, AX - 7, hy - 14, '#eba59e'); // 耳
      tri(ctx, AX + 9, hy - 8, AX + 3, hy - 10, AX + 7, hy - 14, '#eba59e');
    },
  },
  animal_sheep: {
    body: '#f6f3ea', size: 1.05,
    feature: (ctx, s) => {
      const bw = 15 * s;
      const hy = AY - bw * 1.7;
      // 毛团
      for (const [dx, dy] of [[-10, -6], [10, -6], [-6, -12], [6, -12], [0, -14], [0, -4]] as const) {
        circle(ctx, AX + dx * s * 0.8, hy + dy * 0.55 - 2, 4.6, '#fbf9f2');
      }
      circle(ctx, AX, hy + 1, bw * 0.5, '#e8ddca'); // 脸
      dotEye(ctx, AX - 3.4, hy, 1.8);
      dotEye(ctx, AX + 3.4, hy, 1.8);
    },
  },
  animal_cow: {
    body: '#f8f6ef', belly: '#fefdf8', size: 1.15,
    feature: (ctx, s, body) => {
      const hy = AY - 17.25 * s * 1.7 + 4;
      // 花斑
      ellipse(ctx, AX - 8, AY - 16, 5.5, 4, '#5b5048');
      ellipse(ctx, AX + 7, AY - 10, 4.5, 3.4, '#5b5048');
      // 口鼻
      ellipse(ctx, AX, hy + 4.5, 5.5, 3.6, '#f0c9b8', shade('#f0c9b8', -0.2));
      // 短角与耳朵
      tri(ctx, AX - 7, hy - 8, AX - 3, hy - 9, AX - 6, hy - 13, '#d8c49a');
      tri(ctx, AX + 7, hy - 8, AX + 3, hy - 9, AX + 6, hy - 13, '#d8c49a');
      ellipse(ctx, AX - 10, hy - 5, 3.4, 2.2, body, shade(body, -0.25));
      ellipse(ctx, AX + 10, hy - 5, 3.4, 2.2, body, shade(body, -0.25));
    },
  },
  animal_turkey: {
    body: '#8a5c46', belly: '#a8765c', size: 1.0,
    feature: (ctx, s) => {
      const hy = AY - 15 * s * 1.7;
      // 尾羽扇
      for (let i = -2; i <= 2; i++) {
        ellipse(ctx, AX + i * 6, AY - 26, 3.6, 10, i % 2 ? '#b5743c' : '#8f5430', shade('#8f5430', -0.2));
      }
      tri(ctx, AX - 2, hy + 3, AX + 2, hy + 3, AX, hy + 7, '#f0a03c');
      ctx.strokeStyle = '#d84a3c';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(AX, hy + 4);
      ctx.quadraticCurveTo(AX + 2, hy + 8, AX + 1, hy + 10);
      ctx.stroke();
    },
  },
  animal_alpaca: {
    body: '#f2e6d0', belly: '#faf3e5', size: 1.05,
    feature: (ctx, s, body) => {
      const hy = AY - 15.75 * s * 1.7;
      // 长脖子
      ellipse(ctx, AX, hy + 6, 6, 10, body, shade(body, -0.25));
      circle(ctx, AX, hy - 4, 8, body, shade(body, -0.25));
      circle(ctx, AX, hy - 10, 5.5, '#faf3e5'); // 头顶毛
      dotEye(ctx, AX - 3, hy - 4, 1.8);
      dotEye(ctx, AX + 3, hy - 4, 1.8);
      ellipse(ctx, AX - 6, hy - 12, 2, 4, body);
      ellipse(ctx, AX + 6, hy - 12, 2, 4, body);
    },
  },
  animal_peacock: {
    body: '#3c7ab8', belly: '#5c9ad0', size: 0.95,
    feature: (ctx, s) => {
      const hy = AY - 14.25 * s * 1.7;
      // 尾屏
      for (let i = -3; i <= 3; i++) {
        const a = i * 0.32;
        const ex = AX + Math.sin(a) * 22;
        const ey = AY - 24 - Math.cos(a) * 10;
        ellipse(ctx, ex, ey, 4.2, 8, '#2d9e6c', shade('#2d9e6c', -0.2));
        circle(ctx, ex, ey - 2, 2, '#f2c018');
      }
      tri(ctx, AX - 1.6, hy + 3, AX + 1.6, hy + 3, AX, hy + 6, '#f0a03c');
      ctx.strokeStyle = '#2d9e6c';
      ctx.lineWidth = 1.4;
      for (let i = -1; i <= 1; i++) {
        ctx.beginPath();
        ctx.moveTo(AX + i * 2, hy - 8);
        ctx.lineTo(AX + i * 3, hy - 13);
        ctx.stroke();
        circle(ctx, AX + i * 3, hy - 13, 1.2, '#f2c018');
      }
    },
  },
};

export function paintAnimal(ctx: Ctx, defId: string): void {
  const cfg = ANIMAL_CFG[defId];
  if (cfg) critterBase(ctx, cfg, BODY_SHAPE[defId] ?? 'round');
  else critterBase(ctx, { body: '#cccccc', feature: () => {} });
}

// ---------------------------------------------------------------- 野兽

function angryEyes(ctx: Ctx, cx: number, cy: number, spread: number): void {
  ctx.strokeStyle = '#33281f';
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(cx - spread - 3, cy - 4);
  ctx.lineTo(cx - spread + 2, cy - 1.5);
  ctx.moveTo(cx + spread + 3, cy - 4);
  ctx.lineTo(cx + spread - 2, cy - 1.5);
  ctx.stroke();
  dotEye(ctx, cx - spread, cy + 1, 2);
  dotEye(ctx, cx + spread, cy + 1, 2);
}

const BEAST_CFG: Record<string, CritterCfg> = {
  beast_boar: {
    body: '#8a6a52', belly: '#a8876c', size: 1.0,
    feature: (ctx, s) => {
      const hy = AY - 15 * s * 1.7;
      ellipse(ctx, AX, hy + 4, 5, 3.4, '#6f523c', shade('#6f523c', -0.2));
      // 獠牙
      tri(ctx, AX - 6, hy + 4, AX - 3, hy + 4, AX - 5.5, hy + 8.5, '#f6f0e0');
      tri(ctx, AX + 6, hy + 4, AX + 3, hy + 4, AX + 5.5, hy + 8.5, '#f6f0e0');
      angryEyes(ctx, AX, hy - 1, 4.5);
      // 背鬃
      ctx.strokeStyle = '#5c422e';
      ctx.lineWidth = 2.4;
      for (let i = -1; i <= 1; i++) {
        ctx.beginPath();
        ctx.moveTo(AX + i * 4, hy - 9);
        ctx.lineTo(AX + i * 5, hy - 14);
        ctx.stroke();
      }
    },
  },
  beast_monkey: {
    body: '#a07850', belly: '#d8b48c', size: 0.85,
    feature: (ctx, s, body) => {
      const hy = AY - 12.75 * s * 1.7;
      circle(ctx, AX - 8, hy, 3.6, '#d8b48c', shade(body, -0.2));
      circle(ctx, AX + 8, hy, 3.6, '#d8b48c', shade(body, -0.2));
      angryEyes(ctx, AX, hy - 1, 4);
      // 卷尾
      ctx.strokeStyle = body;
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(AX + 11, AY - 8);
      ctx.quadraticCurveTo(AX + 20, AY - 14, AX + 17, AY - 21);
      ctx.stroke();
    },
  },
  beast_snake: {
    body: '#6c9c48', size: 1.0, feet: false,
    feature: () => {},
  },
  beast_wolf: {
    body: '#7d8a99', belly: '#aeb9c4', size: 1.05,
    feature: (ctx, s, body) => {
      const hy = AY - 15.75 * s * 1.7;
      tri(ctx, AX - 8, hy - 6, AX - 2, hy - 9, AX - 7, hy - 15, body, shade(body, -0.3));
      tri(ctx, AX + 8, hy - 6, AX + 2, hy - 9, AX + 7, hy - 15, body, shade(body, -0.3));
      angryEyes(ctx, AX, hy - 1, 4.5);
      ellipse(ctx, AX, hy + 4.5, 4, 3, shade(body, -0.35));
      tri(ctx, AX - 3.5, hy + 6.5, AX - 1.5, hy + 6.5, AX - 2.8, hy + 9.5, '#f6f0e0');
      tri(ctx, AX + 3.5, hy + 6.5, AX + 1.5, hy + 6.5, AX + 2.8, hy + 9.5, '#f6f0e0');
    },
  },
  beast_croc: {
    body: '#5f9c50', belly: '#a8cc8a', size: 1.1,
    feature: (ctx, s, body) => {
      const hy = AY - 16.5 * s * 1.7 + 3;
      // 大嘴
      ellipse(ctx, AX, hy + 6, 10, 4, shade(body, -0.1), shade(body, -0.3));
      ctx.strokeStyle = '#f6f0e0';
      ctx.lineWidth = 2;
      ctx.setLineDash([2.5, 2.5]);
      ctx.beginPath();
      ctx.moveTo(AX - 9, hy + 6);
      ctx.lineTo(AX + 9, hy + 6);
      ctx.stroke();
      ctx.setLineDash([]);
      angryEyes(ctx, AX, hy - 3, 4.5);
      // 背棘
      for (let i = -1; i <= 1; i++) {
        tri(ctx, AX + i * 6 - 2.4, AY - 18, AX + i * 6 + 2.4, AY - 18, AX + i * 6, AY - 23, shade(body, -0.25));
      }
    },
  },
  beast_bear: {
    body: '#8a6248', belly: '#b08a68', size: 1.25,
    feature: (ctx, s, body) => {
      const hy = AY - 18.75 * s * 1.7 + 6;
      circle(ctx, AX - 8, hy - 9, 4, body, shade(body, -0.3));
      circle(ctx, AX + 8, hy - 9, 4, body, shade(body, -0.3));
      ellipse(ctx, AX, hy + 3.5, 5, 3.6, '#d8b48c');
      circle(ctx, AX, hy + 2.5, 1.6, '#4a3626');
      angryEyes(ctx, AX, hy - 2, 5);
    },
  },
  beast_golem: {
    body: '#e88a9a', belly: '#f5b8c2', size: 1.2,
    feature: (ctx, s, body) => {
      const hy = AY - 18 * s * 1.7 + 5;
      // 珊瑚枝角
      ctx.strokeStyle = shade(body, -0.25);
      ctx.lineWidth = 3.4;
      ctx.lineCap = 'round';
      for (const side of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(AX + side * 6, hy - 8);
        ctx.lineTo(AX + side * 9, hy - 16);
        ctx.moveTo(AX + side * 9, hy - 16);
        ctx.lineTo(AX + side * 13, hy - 19);
        ctx.moveTo(AX + side * 9, hy - 16);
        ctx.lineTo(AX + side * 6, hy - 21);
        ctx.stroke();
      }
      angryEyes(ctx, AX, hy - 1, 4.5);
      // 石纹
      ctx.strokeStyle = shade(body, -0.3);
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(AX - 6, AY - 14);
      ctx.lineTo(AX - 2, AY - 10);
      ctx.moveTo(AX + 4, AY - 18);
      ctx.lineTo(AX + 8, AY - 13);
      ctx.stroke();
      // 珊瑚裂缝里的暖光
      ctx.strokeStyle = 'rgba(255, 214, 150, 0.55)';
      ctx.lineWidth = 0.9;
      ctx.beginPath();
      ctx.moveTo(AX - 5, AY - 13);
      ctx.lineTo(AX - 2.4, AY - 10.6);
      ctx.moveTo(AX + 4.6, AY - 17);
      ctx.lineTo(AX + 7, AY - 13.6);
      ctx.stroke();
    },
  },
  beast_dragon: {
    body: '#7a68b8', belly: '#a89ad8', size: 1.3,
    feature: (ctx, s, body) => {
      const hy = AY - 19.5 * s * 1.7 + 7;
      // 角
      tri(ctx, AX - 7, hy - 8, AX - 3, hy - 10, AX - 9, hy - 18, '#e8d8f8', shade(body, -0.2));
      tri(ctx, AX + 7, hy - 8, AX + 3, hy - 10, AX + 9, hy - 18, '#e8d8f8', shade(body, -0.2));
      angryEyes(ctx, AX, hy - 1, 5);
      // 小翅膀 + 翼骨
      for (const side of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(AX + side * 14, AY - 20);
        ctx.quadraticCurveTo(AX + side * 26, AY - 30, AX + side * 22, AY - 14);
        ctx.closePath();
        ctx.fillStyle = shade(body, -0.15);
        ctx.fill();
        ctx.strokeStyle = shade(body, 0.18);
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(AX + side * 14, AY - 20);
        ctx.quadraticCurveTo(AX + side * 21, AY - 24, AX + side * 22, AY - 14);
        ctx.moveTo(AX + side * 18, AY - 22);
        ctx.lineTo(AX + side * 20, AY - 16);
        ctx.stroke();
      }
      // 尾刺
      tri(ctx, AX + 12, AY - 10, AX + 22, AY - 8, AX + 17, AY - 2, shade(body, -0.1), shade(body, -0.3));
      // 雾气
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      circle(ctx, AX - 12, AY - 4, 3.4, 'rgba(255,255,255,0.35)');
      circle(ctx, AX + 13, AY - 6, 2.8, 'rgba(255,255,255,0.3)');
    },
  },
};

/** 蛇特殊画法（盘蛇） */
function paintSnake(ctx: Ctx): void {
  softShadow(ctx, AX, AY, 15);
  const body = '#6c9c48';
  ellipse(ctx, AX, AY - 5, 14, 6.5, body, shade(body, -0.3));
  ellipse(ctx, AX, AY - 11, 10, 5, shade(body, 0.06), shade(body, -0.3));
  // 花斑
  circle(ctx, AX - 6, AY - 5, 2, shade(body, -0.28));
  circle(ctx, AX + 5, AY - 6, 2, shade(body, -0.28));
  // 头
  const hy = AY - 19;
  ellipse(ctx, AX + 4, hy, 6.5, 5, body, shade(body, -0.3));
  angryEyes(ctx, AX + 4, hy - 1, 2.8);
  // 信子
  ctx.strokeStyle = '#d84a5c';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(AX + 10.5, hy + 1);
  ctx.lineTo(AX + 15, hy + 1);
  ctx.moveTo(AX + 15, hy + 1);
  ctx.lineTo(AX + 17, hy - 1);
  ctx.moveTo(AX + 15, hy + 1);
  ctx.lineTo(AX + 17, hy + 3);
  ctx.stroke();
}

export function paintBeast(ctx: Ctx, defId: string): void {
  if (defId === 'beast_snake') {
    paintSnake(ctx);
    return;
  }
  const cfg = BEAST_CFG[defId];
  if (cfg) critterBase(ctx, cfg, BODY_SHAPE[defId] ?? 'round');
  else critterBase(ctx, { body: '#888888', feature: () => {} });
}

// ---------------------------------------------------------------- 猎物（狩猎）

const GAME_CFG: Record<string, CritterCfg> = {
  game_rabbit: {
    body: '#d8c4a8', belly: '#f0e2cc', size: 0.8,
    feature: (ctx, s, body) => {
      const hy = AY - 12 * s * 1.7;
      ellipse(ctx, AX - 5, hy - 11, 2.8, 8, body, shade(body, -0.2));
      ellipse(ctx, AX + 5, hy - 11, 2.8, 8, body, shade(body, -0.2));
      ellipse(ctx, AX - 5, hy - 10, 1.4, 5.4, '#f0c8d0');
      ellipse(ctx, AX + 5, hy - 10, 1.4, 5.4, '#f0c8d0');
      circle(ctx, AX + 10, AY - 8, 4, '#f6ede0', shade('#f6ede0', -0.15)); // 棉花尾
    },
  },
  game_pheasant: {
    body: '#b5743c', belly: '#d8a06c', size: 0.9,
    feature: (ctx, s, body) => {
      const hy = AY - 13.5 * s * 1.7;
      // 三根长尾羽，向左后方铺开
      leafShape(ctx, AX - 8, AY - 13, 19, 3.2, Math.PI - 0.22, '#8a5430');
      leafShape(ctx, AX - 8, AY - 11, 22, 3.4, Math.PI, '#a06a3c');
      leafShape(ctx, AX - 8, AY - 9, 19, 3.2, Math.PI + 0.22, '#8a5430');
      // 红色脸颊
      circle(ctx, AX + 1, hy + 2, 3.2, '#d84a3c');
      // 冠羽
      ctx.strokeStyle = '#d84a3c';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(AX, hy - 9);
      ctx.lineTo(AX + 2, hy - 15);
      ctx.stroke();
      // 喙
      tri(ctx, AX + 6, hy, AX + 10, hy + 2, AX + 6, hy + 4, '#f0b23c');
    },
  },
  game_deer: {
    body: '#b08a5c', belly: '#d8bc94', size: 1.05,
    feature: (ctx, s, body) => {
      const hy = AY - 15.75 * s * 1.7;
      // 鹿角
      ctx.strokeStyle = '#8a6a46';
      ctx.lineWidth = 2.6;
      ctx.lineCap = 'round';
      for (const side of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(AX + side * 5, hy - 8);
        ctx.lineTo(AX + side * 9, hy - 18);
        ctx.moveTo(AX + side * 9, hy - 18);
        ctx.lineTo(AX + side * 15, hy - 20);
        ctx.moveTo(AX + side * 9, hy - 18);
        ctx.lineTo(AX + side * 7, hy - 24);
        ctx.stroke();
      }
      // 白色斑点
      circle(ctx, AX - 8, AY - 14, 1.6, '#f0e2c8');
      circle(ctx, AX - 4, AY - 18, 1.4, '#f0e2c8');
      circle(ctx, AX + 6, AY - 12, 1.4, '#f0e2c8');
      ellipse(ctx, AX, hy + 4, 3.4, 2.2, '#7a5a3a');
    },
  },
  game_boar: {
    body: '#6a5240', belly: '#8a6a52', size: 1.1,
    feature: (ctx, s, body) => {
      const hy = AY - 16.5 * s * 1.7;
      ellipse(ctx, AX, hy + 4, 4.6, 3.2, '#4c3a2c', shade('#4c3a2c', -0.2));
      // 獠牙
      tri(ctx, AX - 6, hy + 4, AX - 3, hy + 4, AX - 5.5, hy + 9, '#f6f0e0');
      tri(ctx, AX + 6, hy + 4, AX + 3, hy + 4, AX + 5.5, hy + 9, '#f6f0e0');
      // 背鬃
      ctx.strokeStyle = '#4c3a2c';
      ctx.lineWidth = 2;
      for (let i = -1; i <= 1; i++) {
        ctx.beginPath();
        ctx.moveTo(AX + i * 4, hy - 9);
        ctx.lineTo(AX + i * 5, hy - 14);
        ctx.stroke();
      }
    },
  },
  game_goat: {
    body: '#d8d0c0', belly: '#f0ece2', size: 1.0,
    feature: (ctx, s, body) => {
      const hy = AY - 15 * s * 1.7;
      // 后弯角
      ctx.strokeStyle = '#b0977a';
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(AX - 6, hy - 8);
      ctx.quadraticCurveTo(AX - 13, hy - 15, AX - 8, hy - 20);
      ctx.moveTo(AX + 6, hy - 8);
      ctx.quadraticCurveTo(AX + 13, hy - 15, AX + 8, hy - 20);
      ctx.stroke();
      // 山羊胡
      tri(ctx, AX - 2, hy + 7, AX + 2, hy + 7, AX, hy + 13, '#e8e0d0');
    },
  },
};

export function paintGame(ctx: Ctx, defId: string): void {
  const cfg = GAME_CFG[defId];
  if (cfg) critterBase(ctx, cfg);
  else critterBase(ctx, { body: '#b09070', size: 0.9, feature: () => {} });
}

// ---------------------------------------------------------------- 宠物

const PET_CFG: Record<string, CritterCfg> = {
  pet_puppy: {
    body: '#d8b48c', belly: '#f0dcc0', size: 0.8,
    feature: (ctx, s, body) => {
      const hy = AY - 12 * s * 1.7;
      ellipse(ctx, AX - 7, hy - 6, 3.4, 6, shade(body, -0.2)); // 垂耳
      ellipse(ctx, AX + 7, hy - 6, 3.4, 6, shade(body, -0.2));
      circle(ctx, AX, hy + 3, 2, '#4a3626'); // 鼻
      // 摇尾巴
      ctx.strokeStyle = body;
      ctx.lineWidth = 3.4;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(AX + 10, AY - 8);
      ctx.quadraticCurveTo(AX + 17, AY - 12, AX + 16, AY - 18);
      ctx.stroke();
    },
  },
  pet_kitten: {
    body: '#e8e2d8', belly: '#f8f4ec', size: 0.75,
    feature: (ctx, s, body) => {
      const hy = AY - 11.25 * s * 1.7;
      tri(ctx, AX - 7, hy - 6, AX - 2, hy - 8, AX - 6, hy - 13, body, shade(body, -0.25));
      tri(ctx, AX + 7, hy - 6, AX + 2, hy - 8, AX + 6, hy - 13, body, shade(body, -0.25));
      // 胡须
      ctx.strokeStyle = shade(body, -0.35);
      ctx.lineWidth = 1;
      for (const side of [-1, 1]) {
        for (let i = 0; i < 2; i++) {
          ctx.beginPath();
          ctx.moveTo(AX + side * 6, hy + 2 + i * 2);
          ctx.lineTo(AX + side * 12, hy + 1 + i * 3);
          ctx.stroke();
        }
      }
      // 尾巴
      ctx.strokeStyle = body;
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(AX - 9, AY - 6);
      ctx.quadraticCurveTo(AX - 16, AY - 10, AX - 14, AY - 17);
      ctx.stroke();
    },
  },
  pet_bunny: {
    body: '#f5d5dd', belly: '#fdeef2', size: 0.72,
    feature: (ctx, s, body) => {
      const hy = AY - 10.8 * s * 1.7;
      ellipse(ctx, AX - 4, hy - 11, 2.8, 8, body, shade(body, -0.2));
      ellipse(ctx, AX + 4, hy - 11, 2.8, 8, body, shade(body, -0.2));
      circle(ctx, AX, hy + 2.5, 1.4, '#d87a8a');
    },
  },
  pet_piglet: {
    body: '#f5c7c2', belly: '#fbdfdb', size: 0.75,
    feature: (ctx, s) => {
      const hy = AY - 11.25 * s * 1.7;
      ellipse(ctx, AX, hy + 2.5, 3.6, 2.6, '#eba59e', shade('#eba59e', -0.2));
      circle(ctx, AX - 1.3, hy + 2.5, 0.7, '#c97b73');
      circle(ctx, AX + 1.3, hy + 2.5, 0.7, '#c97b73');
      tri(ctx, AX - 7, hy - 6, AX - 2, hy - 8, AX - 5, hy - 12, '#eba59e');
      tri(ctx, AX + 7, hy - 6, AX + 2, hy - 8, AX + 5, hy - 12, '#eba59e');
    },
  },
  pet_parrot: {
    body: '#e8504a', belly: '#f2d049', size: 0.72, feet: false,
    feature: (ctx, s, body) => {
      const hy = AY - 10.8 * s * 1.7;
      tri(ctx, AX - 1.8, hy + 1, AX + 1.8, hy + 1, AX, hy + 5.5, '#f0a03c');
      // 翅膀彩条
      ellipse(ctx, AX - 8, AY - 9, 3.4, 6, '#3c7ab8');
      ellipse(ctx, AX + 8, AY - 9, 3.4, 6, '#2d9e6c');
      // 头羽
      ctx.strokeStyle = body;
      ctx.lineWidth = 2.4;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(AX, hy - 8);
      ctx.quadraticCurveTo(AX + 3, hy - 13, AX + 6, hy - 12);
      ctx.stroke();
    },
  },
  pet_turtle: {
    body: '#8ac088', size: 0.8, feet: false,
    feature: (ctx, s, body) => {
      // 壳
      ellipse(ctx, AX, AY - 11, 12, 9, '#5f8a50', shade('#5f8a50', -0.25));
      ctx.strokeStyle = shade('#5f8a50', -0.3);
      ctx.lineWidth = 1.4;
      for (const [dx, dy] of [[-4, -2], [4, -2], [0, 3], [0, -7]] as const) {
        ctx.beginPath();
        ctx.arc(AX + dx, AY - 11 + dy, 3, 0, Math.PI * 2);
        ctx.stroke();
      }
      // 头
      const hy = AY - 22;
      circle(ctx, AX, hy, 5.5, body, shade(body, -0.25));
      dotEye(ctx, AX - 2.2, hy - 1, 1.6);
      dotEye(ctx, AX + 2.2, hy - 1, 1.6);
    },
  },
  pet_fox: {
    body: '#f6f2ec', belly: '#fdfbf7', size: 0.8,
    feature: (ctx, s, body) => {
      const hy = AY - 12 * s * 1.7;
      tri(ctx, AX - 8, hy - 5, AX - 2, hy - 8, AX - 7, hy - 14, body, shade(body, -0.15));
      tri(ctx, AX + 8, hy - 5, AX + 2, hy - 8, AX + 7, hy - 14, body, shade(body, -0.15));
      tri(ctx, AX - 6.5, hy - 7, AX - 3.5, hy - 8.5, AX - 6, hy - 12, '#f5c7d5');
      tri(ctx, AX + 6.5, hy - 7, AX + 3.5, hy - 8.5, AX + 6, hy - 12, '#f5c7d5');
      circle(ctx, AX, hy + 2.5, 1.6, '#4a3626');
      // 大尾巴
      ellipse(ctx, AX + 12, AY - 10, 5, 9, body, shade(body, -0.15));
      ellipse(ctx, AX + 12, AY - 15, 3, 4, '#e8dcd0');
    },
  },
  pet_dolphin: {
    body: '#7db8d8', belly: '#c8e4f0', size: 0.85, feet: false,
    feature: (ctx, s, body) => {
      // 背鳍与尾
      tri(ctx, AX - 3, AY - 22, AX + 3, AY - 22, AX, AY - 28, body, shade(body, -0.2));
      tri(ctx, AX + 10, AY - 6, AX + 17, AY - 3, AX + 15, AY - 10, body, shade(body, -0.2));
      // 吻部
      const hy = AY - 12.75 * s * 1.7 + 2;
      ellipse(ctx, AX, hy + 3.5, 4.5, 2.4, shade(body, 0.1), shade(body, -0.2));
    },
  },
};

export function paintPet(ctx: Ctx, defId: string): void {
  const cfg = PET_CFG[defId];
  if (cfg) critterBase(ctx, cfg, BODY_SHAPE[defId] ?? 'round');
  else critterBase(ctx, { body: '#cccccc', size: 0.75, feature: () => {} });
}
