/**
 * 场景渲染器：地形 → 地块 → 按深度排序的实体 → 徽章 → 日夜色调。
 * 支持渲染玩家自己的岛、NPC 邻居岛、好友快照岛（三者都归一成 RenderScene）。
 */
import type {
  AnimalInstance, AvatarConfig, BeastInstance, FarmPlot, ForageSpot, FurnitureDef,
  GameAnimalInstance, GameState, Placement, RoomId, Terrain,
} from '../core/types';
import { buildTerrain } from '../core/island';
import { buildingDef } from '../core/registry';
import { cropView } from '../core/crops';
import { animalPhase } from '../core/animals';
import { WATER_COOLDOWN_MS } from '../core/balance';
import { calendarAt, type Season, type Weather } from '../core/calendar';
import { Camera } from './camera';
import { isoX, isoY, TILE_H, TILE_W } from './iso';
import { charKey, drawSprite } from './sprites';

export interface SceneActor {
  avatar: AvatarConfig;
  x: number;   // 格坐标（浮点）
  y: number;
  walking: boolean;
  name?: string;
}

/** 渲染层看到的统一场景描述 */
export interface RenderScene {
  seed: number;
  islandTier: number;
  /** 存档创建时间，用于推导季节/天气/时间 */
  createdAt: number;
  plots: FarmPlot[];
  placements: Placement[];
  animals: AnimalInstance[];
  beasts: BeastInstance[];
  forage: ForageSpot[];
  game: GameAnimalInstance[];
  weeds: { uid: number; x: number; y: number }[];
  pets: { defId: string; x: number; y: number }[];
  actors: SceneActor[];
  /** 悬停格与可否操作提示 */
  hover: { tx: number; ty: number; ok: boolean } | null;
  /** 编辑/摆放模式下的虚影 */
  ghost: { defId: string; tx: number; ty: number; ok: boolean } | null;
  /** 被追踪的猎物位置（脚印追踪后高亮） */
  tracked?: { x: number; y: number } | null;
}

export interface InteriorScene {
  room: RoomId;
  furniture: { def: FurnitureDef; x: number; y: number; rot: 0 | 1 }[];
  avatar: AvatarConfig;
  name?: string;
}

const ROOM_THEME: Record<RoomId, {
  wallTop: string; wallBottom: string; wallLeft: string; floor: 'wood' | 'tile';
}> = {
  living: { wallTop: '#efdcbc', wallBottom: '#e2c9a2', wallLeft: '#dcc19a', floor: 'wood' },
  bedroom: { wallTop: '#f1e0e8', wallBottom: '#e3cbd8', wallLeft: '#dcc0ce', floor: 'wood' },
  kitchen: { wallTop: '#e8f2e8', wallBottom: '#d2e2d4', wallLeft: '#c4d6c8', floor: 'tile' },
};

export function sceneFromState(state: GameState): RenderScene {
  return {
    seed: state.seed,
    islandTier: state.islandTier,
    createdAt: state.createdAt,
    plots: state.plots,
    placements: state.placements,
    animals: state.animals,
    beasts: state.beasts,
    forage: state.forage,
    game: state.game,
    weeds: state.weeds,
    pets: state.pets.map((p) => ({ defId: p.defId, x: p.x, y: p.y })),
    actors: [],
    hover: null,
    ghost: null,
  };
}

interface DrawItem {
  depth: number;
  draw: () => void;
}

/** 一天中的光照：按游戏内小时返回夜色覆盖透明度 0(白天)~0.45(深夜) */
export function nightAlpha(hour: number): number {
  if (hour >= 7 && hour <= 17) return 0;
  if (hour > 17 && hour < 20) return ((hour - 17) / 3) * 0.42;
  if (hour >= 20 || hour < 5) return 0.42;
  return (1 - (hour - 5) / 2) * 0.42; // 5-7 点渐亮
}

const SEASON_TINT: Record<Season, string> = {
  spring: 'rgba(196, 214, 170, 0.05)',
  summer: 'rgba(255, 226, 150, 0.06)',
  autumn: 'rgba(216, 142, 70, 0.11)',
  winter: 'rgba(196, 220, 236, 0.18)',
};

export class Renderer {
  readonly canvas: HTMLCanvasElement;
  readonly ctx: CanvasRenderingContext2D;
  readonly camera = new Camera();
  private dpr = 1;
  /** 像素滤镜：内部渲染分辨率倍率（0.5 = 半分辨率 + 最近邻放大） */
  private pixelScale = 1;
  private lastWeather: Weather | null = null;
  private weatherChangedAt = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.resize();
  }

  setPixelation(on: boolean): void {
    this.pixelScale = on ? 0.5 : 1;
    this.canvas.classList.toggle('pixelated', on);
    this.resize();
  }

  resize(): void {
    this.dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = this.canvas.clientWidth || window.innerWidth;
    const h = this.canvas.clientHeight || window.innerHeight;
    this.canvas.width = Math.round(w * this.dpr * this.pixelScale);
    this.canvas.height = Math.round(h * this.dpr * this.pixelScale);
    this.camera.resize(w, h);
  }

  /** 主绘制入口 */
  render(scene: RenderScene, now: number): void {
    const { ctx, camera } = this;
    const zoom = camera.zoom;
    const cal = calendarAt(scene.createdAt, now, scene.seed);
    ctx.setTransform(this.dpr * this.pixelScale, 0, 0, this.dpr * this.pixelScale, 0, 0);

    // 海洋底色：与地形的海松蓝保持一致，上浅下深
    const sea = ctx.createLinearGradient(0, 0, 0, camera.viewH);
    sea.addColorStop(0, '#4c8992');
    sea.addColorStop(0.55, '#3b747e');
    sea.addColorStop(1, '#2c5962');
    ctx.fillStyle = sea;
    ctx.fillRect(0, 0, camera.viewW, camera.viewH);

    const terrain = buildTerrain(scene.seed, scene.islandTier);
    const size = terrain.length;

    // 可视格范围粗裁剪
    const pad = 3;
    const corners = [
      camera.tileAt(0, 0), camera.tileAt(camera.viewW, 0),
      camera.tileAt(0, camera.viewH), camera.tileAt(camera.viewW, camera.viewH),
    ];
    const minTx = Math.max(0, Math.min(...corners.map((c) => c.tx)) - pad);
    const maxTx = Math.min(size - 1, Math.max(...corners.map((c) => c.tx)) + pad);
    const minTy = Math.max(0, Math.min(...corners.map((c) => c.ty)) - pad);
    const maxTy = Math.min(size - 1, Math.max(...corners.map((c) => c.ty)) + pad);

    // ---- 地形
    const waterPhase = Math.floor(now / 700) % 3;
    for (let ty = minTy; ty <= maxTy; ty++) {
      for (let tx = minTx; tx <= maxTx; tx++) {
        const t: Terrain = terrain[ty][tx];
        const sx = camera.sx(isoX(tx, ty));
        const sy = camera.sy(isoY(tx, ty));
        const variant = (tx * 7 + ty * 13) % 4;
        if (t === 'water') {
          // 岸边浅水 / 远处深水
          let foamMask = 0;
          if (ty > 0 && terrain[ty - 1][tx] !== 'water') foamMask |= 1;
          if (tx > 0 && terrain[ty][tx - 1] !== 'water') foamMask |= 2;
          if (tx < size - 1 && terrain[ty][tx + 1] !== 'water') foamMask |= 4;
          if (ty < size - 1 && terrain[ty + 1][tx] !== 'water') foamMask |= 8;
          const nearLand = foamMask !== 0;
          drawSprite(ctx, `tile:water:${(variant + waterPhase) % 4}:${nearLand ? 'shallow' : 'deep'}`, sx, sy, zoom);
        } else {
          drawSprite(ctx, `tile:${t}:${variant}`, sx, sy, zoom);
          // 冬天：用柔和雪斑铺一层薄雪，避免整块菱形造成棋盘感
          if (cal.season === 'winter') {
            ctx.fillStyle = 'rgba(248, 251, 255, 0.2)';
            for (let k = 0; k < 3; k++) {
              const ox = ((tx * 13 + ty * 7 + k * 11) % 16) - 8;
              const oy = ((tx * 5 + ty * 17 + k * 7) % 10) - 4;
              ctx.beginPath();
              ctx.ellipse(sx + ox * zoom, sy + (TILE_H / 2 + oy) * zoom, (9 + k * 2) * zoom, (4 + k) * zoom, 0, 0, Math.PI * 2);
              ctx.fill();
            }
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
            ctx.lineWidth = 1;
            for (let k = 0; k < 2; k++) {
              const ox = ((tx * 11 + ty * 3 + k * 9) % 16) - 8;
              const oy = ((tx * 5 + ty * 13 + k * 5) % 10) - 4;
              ctx.beginPath();
              ctx.moveTo(sx + (ox - 4) * zoom, sy + (TILE_H / 2 + oy) * zoom);
              ctx.quadraticCurveTo(sx + ox * zoom, sy + (TILE_H / 2 + oy - 3) * zoom, sx + (ox + 4) * zoom, sy + (TILE_H / 2 + oy) * zoom);
              ctx.stroke();
            }
            ctx.fillStyle = 'rgba(255,255,255,0.7)';
            for (let k = 0; k < 3; k++) {
              const ox = ((tx * 13 + ty * 7 + k * 11) % 18) - 9;
              const oy = ((tx * 5 + ty * 17 + k * 7) % 12) - 6;
              ctx.beginPath();
              ctx.arc(sx + ox * zoom, sy + oy * zoom, 1.2 * zoom, 0, Math.PI * 2);
              ctx.fill();
            }
          }
        }
      }
    }

    // ---- 海岸浪花：在地形之后统一绘制，避免被相邻沙地盖住
    for (let ty = minTy; ty <= maxTy; ty++) {
      for (let tx = minTx; tx <= maxTx; tx++) {
        if (terrain[ty][tx] !== 'water') continue;
        let foamMask = 0;
        if (ty > 0 && terrain[ty - 1][tx] !== 'water') foamMask |= 1;
        if (tx > 0 && terrain[ty][tx - 1] !== 'water') foamMask |= 2;
        if (tx < size - 1 && terrain[ty][tx + 1] !== 'water') foamMask |= 4;
        if (ty < size - 1 && terrain[ty + 1][tx] !== 'water') foamMask |= 8;
        if (!foamMask) continue;
        drawSprite(ctx, `tile:foam:${foamMask}`, camera.sx(isoX(tx, ty)), camera.sy(isoY(tx, ty)), zoom);
      }
    }

    // ---- 地块（贴地，先于实体）
    for (const plot of scene.plots) {
      const sx = camera.sx(isoX(plot.x, plot.y));
      const sy = camera.sy(isoY(plot.x, plot.y));
      const wet = !!plot.crop && now - plot.crop.lastWateredAt < WATER_COOLDOWN_MS;
      drawSprite(ctx, `tile:plot:${wet ? 'wet' : 'dry'}`, sx, sy, zoom);
    }
    // 道路也贴地
    for (const pl of scene.placements) {
      const def = buildingDef(pl.defId);
      if (def.category !== 'path') continue;
      const sx = camera.sx(isoX(pl.x, pl.y));
      const sy = camera.sy(isoY(pl.x, pl.y));
      drawSprite(ctx, `bld:${pl.defId}`, sx, sy + (TILE_H / 2) * zoom, zoom);
    }

    // ---- 悬停高亮
    if (scene.hover) {
      const sx = camera.sx(isoX(scene.hover.tx, scene.hover.ty));
      const sy = camera.sy(isoY(scene.hover.tx, scene.hover.ty));
      drawSprite(ctx, `hl:${scene.hover.ok ? 'ok' : 'bad'}`, sx, sy, zoom);
    }

    // ---- 实体深度排序
    const items: DrawItem[] = [];
    const bob = Math.sin(now / 350) * 1.6;

    for (const plot of scene.plots) {
      if (!plot.crop) continue;
      const crop = plot.crop;
      const view = cropView(crop, now);
      const sx = camera.sx(isoX(plot.x, plot.y));
      const sy = camera.sy(isoY(plot.x, plot.y) + TILE_H / 2);
      const hueBucket = crop.genes ? Math.round(crop.genes.hue / 10) * 10 : undefined;
      const cropKey = hueBucket !== undefined
        ? `crop:${crop.defId}:${view.stage}:${hueBucket}`
        : `crop:${crop.defId}:${view.stage}`;
      items.push({
        depth: plot.x + plot.y,
        draw: () => {
          drawSprite(ctx, cropKey, sx, sy, zoom);
          if (view.stage === 'ready') {
            // 成熟作物上的细小露光
            const tw = 0.35 + 0.25 * Math.sin(now / 520 + plot.x * 1.7 + plot.y);
            ctx.fillStyle = `rgba(255, 246, 196, ${tw})`;
            for (const [ox, oy, rr] of [
              [-9, -20, 1.3],
              [7, -30, 1.1],
              [2, -13, 0.9],
            ] as const) {
              ctx.beginPath();
              ctx.arc(sx + ox * zoom, sy + oy * zoom, rr * zoom, 0, Math.PI * 2);
              ctx.fill();
            }
            drawSprite(ctx, 'fx:ready', sx, sy - 52 * zoom + bob * zoom, zoom);
          } else if (view.stage === 'withered') {
            drawSprite(ctx, 'fx:hungry', sx, sy - 40 * zoom + bob * zoom, zoom);
          }
        },
      });
    }

    for (const pl of scene.placements) {
      const def = buildingDef(pl.defId);
      if (def.category === 'path') continue;
      const cx = pl.x + (def.w - 1) / 2;
      const cy = pl.y + (def.h - 1) / 2;
      const sx = camera.sx(isoX(cx, cy));
      const sy = camera.sy(isoY(cx, cy) + TILE_H / 2);
      items.push({
        depth: pl.x + def.w - 1 + pl.y + def.h - 1,
        draw: () => {
          if (pl.rot === 1) {
            ctx.save();
            ctx.translate(sx, 0);
            ctx.scale(-1, 1);
            drawSprite(ctx, `bld:${pl.defId}`, 0, sy, zoom);
            ctx.restore();
          } else {
            drawSprite(ctx, `bld:${pl.defId}`, sx, sy, zoom);
          }
          if (pl.variant) {
            drawSprite(ctx, `icon:${pl.variant}`, sx, sy - 34 * zoom, zoom * 0.95);
          }
        },
      });
    }

    for (const a of scene.animals) {
      const sx = camera.sx(isoX(a.x, a.y));
      const sy = camera.sy(isoY(a.x, a.y) + TILE_H / 2);
      const phase = animalPhase(a, now);
      items.push({
        depth: a.x + a.y,
        draw: () => {
          drawSprite(ctx, `animal:${a.defId}`, sx, sy + Math.abs(Math.sin(now / 400 + a.uid)) * -2 * zoom, zoom);
          if (phase === 'baby') drawSprite(ctx, 'fx:heart', sx, sy - 46 * zoom + bob * zoom, zoom);
          else if (phase === 'hungry') drawSprite(ctx, 'fx:hungry', sx, sy - 46 * zoom + bob * zoom, zoom);
          else if (phase === 'ready') drawSprite(ctx, 'fx:ready', sx, sy - 46 * zoom + bob * zoom, zoom);
        },
      });
    }

    for (const b of scene.beasts) {
      const sx = camera.sx(isoX(b.x, b.y));
      const sy = camera.sy(isoY(b.x, b.y) + TILE_H / 2);
      items.push({
        depth: b.x + b.y,
        draw: () => {
          const shake = Math.sin(now / 90 + b.uid) * 1.2 * zoom;
          drawSprite(ctx, `beast:${b.defId}`, sx + shake, sy, zoom);
          drawSprite(ctx, 'fx:beast', sx, sy - 48 * zoom + bob * zoom, zoom);
        },
      });
    }

    for (const w of scene.weeds) {
      const sx = camera.sx(isoX(w.x, w.y));
      const sy = camera.sy(isoY(w.x, w.y));
      items.push({ depth: w.x + w.y, draw: () => drawSprite(ctx, 'weed', sx, sy, zoom) });
    }

    for (const f of scene.forage) {
      const sx = camera.sx(isoX(f.x, f.y));
      const sy = camera.sy(isoY(f.x, f.y) + TILE_H / 2);
      items.push({
        depth: f.x + f.y,
        draw: () => drawSprite(ctx, `forage:${f.defId}`, sx, sy, zoom),
      });
    }

    for (const g of scene.game) {
      // 脚印先画，压在猎物下面
      for (const t of g.trail ?? []) {
        const age = now - t.at;
        if (age > 3 * 60_000) continue;
        const tx = camera.sx(isoX(t.x, t.y));
        const ty = camera.sy(isoY(t.x, t.y) + TILE_H / 2);
        items.push({
          depth: t.x + t.y - 0.01,
          draw: () => {
            ctx.globalAlpha = Math.max(0.28, 0.7 * (1 - age / (3 * 60_000)));
            drawSprite(ctx, 'tracks', tx, ty, zoom * 1.15);
            ctx.globalAlpha = 1;
          },
        });
      }
      const sx = camera.sx(isoX(g.x, g.y));
      const sy = camera.sy(isoY(g.x, g.y) + TILE_H / 2);
      items.push({
        depth: g.x + g.y,
        draw: () => {
          drawSprite(ctx, `game:${g.defId}`, sx, sy + Math.abs(Math.sin(now / 500 + g.uid)) * -1.6 * zoom, zoom);
          drawSprite(ctx, 'fx:beast', sx, sy - 44 * zoom + bob * zoom, zoom);
        },
      });
    }

    for (const p of scene.pets) {
      const sx = camera.sx(isoX(p.x, p.y));
      const sy = camera.sy(isoY(p.x, p.y) + TILE_H / 2);
      items.push({
        depth: p.x + p.y,
        draw: () => drawSprite(ctx, `pet:${p.defId}`, sx, sy + Math.abs(Math.sin(now / 300 + p.x)) * -2.4 * zoom, zoom),
      });
    }

    for (const actor of scene.actors) {
      const sx = camera.sx(isoX(actor.x, actor.y));
      const sy = camera.sy(isoY(actor.x, actor.y) + TILE_H / 2);
      const frame = actor.walking ? Math.floor(now / 90) % 8 : -1;
      items.push({
        depth: actor.x + actor.y + 0.01,
        draw: () => {
          drawSprite(ctx, charKey(actor.avatar, frame), sx, sy, zoom);
          if (actor.name) {
            ctx.font = `${Math.round(11 * zoom)}px "Segoe UI", sans-serif`;
            ctx.textAlign = 'center';
            const tw = ctx.measureText(actor.name).width;
            ctx.fillStyle = 'rgba(40, 34, 28, 0.55)';
            ctx.fillRect(sx - tw / 2 - 4, sy - 76 * zoom, tw + 8, 14 * zoom);
            ctx.fillStyle = '#fff';
            ctx.fillText(actor.name, sx, sy - 76 * zoom + 11 * zoom);
            ctx.textAlign = 'start';
          }
        },
      });
    }

    // 摆放虚影
    if (scene.ghost) {
      const def = buildingDef(scene.ghost.defId);
      const g = scene.ghost;
      for (let dy = 0; dy < def.h; dy++) {
        for (let dx = 0; dx < def.w; dx++) {
          const sx = camera.sx(isoX(g.tx + dx, g.ty + dy));
          const sy = camera.sy(isoY(g.tx + dx, g.ty + dy));
          drawSprite(ctx, `hl:${g.ok ? 'ok' : 'bad'}`, sx, sy, zoom);
        }
      }
      const cx = g.tx + (def.w - 1) / 2;
      const cy = g.ty + (def.h - 1) / 2;
      items.push({
        depth: 9999,
        draw: () => {
          ctx.globalAlpha = 0.65;
          drawSprite(ctx, `bld:${g.defId}`, camera.sx(isoX(cx, cy)), camera.sy(isoY(cx, cy) + TILE_H / 2), zoom);
          ctx.globalAlpha = 1;
        },
      });
    }

    items.sort((a, b) => a.depth - b.depth);
    for (const item of items) item.draw();

    // ---- 被追踪猎物的高亮
    if (scene.tracked) {
      const sx = camera.sx(isoX(scene.tracked.x, scene.tracked.y));
      const sy = camera.sy(isoY(scene.tracked.x, scene.tracked.y));
      drawSprite(ctx, 'hl:ok', sx, sy, zoom);
      drawSprite(ctx, 'fx:ready', sx, sy - 58 * zoom + bob * zoom, zoom);
    }

    // ---- 夏日蜻蜓：水边低空悬停
    if (cal.weather === 'sunny' && cal.season === 'summer') {
      for (let i = 0; i < 4; i++) {
        const tx = (i * 17 + 5) % size;
        const ty = (i * 11 + 7) % size;
        if (terrain[ty][tx] === 'water') continue;
        const sx = camera.sx(isoX(tx, ty)) + Math.sin(now / 1100 + i * 2.1) * 8 * zoom;
        const sy = camera.sy(isoY(tx, ty)) - 26 * zoom + Math.sin(now / 620 + i) * 3 * zoom;
        ctx.save();
        ctx.translate(sx, sy);
        // 四片透明翅膀
        ctx.fillStyle = 'rgba(220, 240, 245, 0.45)';
        for (const [dx, dy, rot] of [[-4, -3, -0.5], [4, -3, 0.5], [-3, 2, -1.1], [3, 2, 1.1]] as const) {
          ctx.save();
          ctx.translate(dx * zoom, dy * zoom);
          ctx.rotate(rot + Math.sin(now / 260 + i) * 0.12);
          ctx.beginPath();
          ctx.ellipse(0, 0, 4.8 * zoom, 1.9 * zoom, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
        // 细长身体
        ctx.strokeStyle = 'rgba(70, 120, 130, 0.9)';
        ctx.lineWidth = 1.8 * zoom;
        ctx.beginPath();
        ctx.moveTo(0, -3.5 * zoom);
        ctx.lineTo(0, 5.5 * zoom);
        ctx.stroke();
        ctx.fillStyle = 'rgba(90, 150, 160, 0.95)';
        ctx.beginPath();
        ctx.arc(0, -4 * zoom, 1.9 * zoom, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }

    // ---- 晴天蝴蝶：春/夏在草地上低飞
    if (cal.weather === 'sunny' && (cal.season === 'spring' || cal.season === 'summer')) {
      const small = camera.viewW < 560;
      for (let i = 0; i < (small ? 4 : 6); i++) {
        const tx = (i * 13 + 4) % size;
        const ty = (i * 9 + 6) % size;
        if (terrain[ty][tx] === 'water') continue;
        const sx = camera.sx(isoX(tx, ty)) + Math.sin(now / 1800 + i * 1.4) * 9 * zoom;
        const sy = camera.sy(isoY(tx, ty)) - 16 * zoom + Math.sin(now / 700 + i) * 4 * zoom;
        const wing = 0.55 + Math.abs(Math.sin(now / 190 + i * 1.1)) * 0.65;
        ctx.save();
        ctx.translate(sx, sy);
        ctx.rotate(Math.sin(now / 900 + i) * 0.25);
        ctx.fillStyle = cal.season === 'spring'
          ? (i % 2 ? 'rgba(245, 190, 205, 0.9)' : 'rgba(250, 244, 220, 0.9)')
          : (i % 2 ? 'rgba(240, 196, 90, 0.9)' : 'rgba(150, 200, 220, 0.9)');
        ctx.beginPath();
        ctx.ellipse(-3.2 * zoom, -1 * zoom, 3.4 * zoom, 2.4 * zoom * wing, -0.5, 0, Math.PI * 2);
        ctx.ellipse(3.2 * zoom, -1 * zoom, 3.4 * zoom, 2.4 * zoom * wing, 0.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(80, 66, 50, 0.55)';
        ctx.lineWidth = 0.9 * zoom;
        ctx.beginPath();
        ctx.moveTo(0, -2 * zoom);
        ctx.lineTo(0, 3 * zoom);
        ctx.stroke();
        ctx.restore();
      }
    }

    // ---- 季节色调
    ctx.fillStyle = SEASON_TINT[cal.season];
    ctx.fillRect(0, 0, camera.viewW, camera.viewH);

    // ---- 日夜色调
    const na = nightAlpha(cal.hour);
    const deepNight = cal.hour >= 19 || cal.hour < 5;
    if (na > 0.01) {
      ctx.fillStyle = `rgba(24, 34, 76, ${na})`;
      ctx.fillRect(0, 0, camera.viewW, camera.viewH);
      // 晴夜/多云夜：月亮与星点
      if (deepNight && (cal.weather === 'sunny' || cal.weather === 'cloudy')) {
        const mx = camera.viewW * 0.82;
        const my = camera.viewH * 0.16;
        const halo = ctx.createRadialGradient(mx, my, 6, mx, my, 92);
        halo.addColorStop(0, `rgba(255, 244, 206, ${na * 0.22})`);
        halo.addColorStop(1, 'rgba(255, 244, 206, 0)');
        ctx.fillStyle = halo;
        ctx.fillRect(mx - 92, my - 92, 184, 184);
        ctx.fillStyle = `rgba(255, 246, 214, ${Math.min(0.92, na + 0.25)})`;
        ctx.beginPath();
        ctx.arc(mx, my, 17, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(228, 214, 178, 0.35)';
        ctx.beginPath();
        ctx.arc(mx - 5, my - 4, 3.4, 0, Math.PI * 2);
        ctx.arc(mx + 5, my + 5, 2.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = `rgba(255, 248, 222, ${na * 0.7})`;
        for (let i = 0; i < 22; i++) {
          const x = ((i * 137 + 43) % 1000) / 1000 * camera.viewW;
          const y = ((i * 71 + 19) % 380) / 380 * camera.viewH * 0.42;
          if (Math.hypot(x - mx, y - my) < 70) continue;
          ctx.beginPath();
          ctx.arc(x, y, i % 4 === 0 ? 1.4 : 0.9, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      // 房屋窗口暖光
      for (const pl of scene.placements) {
        if (buildingDef(pl.defId).category !== 'house') continue;
        const def = buildingDef(pl.defId);
        const cx = pl.x + (def.w - 1) / 2;
        const cy = pl.y + (def.h - 1) / 2;
        const sx = camera.sx(isoX(cx, cy));
        const sy = camera.sy(isoY(cx, cy) + TILE_H / 2);
        const r = 24 * zoom;
        const glow = ctx.createRadialGradient(sx, sy - 20 * zoom, 2, sx, sy - 20 * zoom, r);
        glow.addColorStop(0, `rgba(255, 206, 122, ${na * 0.3})`);
        glow.addColorStop(1, 'rgba(255, 206, 122, 0)');
        ctx.fillStyle = glow;
        ctx.fillRect(sx - r, sy - 20 * zoom - r, r * 2, r * 2);
      }
      // 路灯/篝火光晕
      for (const pl of scene.placements) {
        if (pl.defId !== 'bld_streetlamp' && pl.defId !== 'bld_bonfire' && pl.defId !== 'bld_lighthouse') continue;
        const sx = camera.sx(isoX(pl.x, pl.y));
        const sy = camera.sy(isoY(pl.x, pl.y));
        const r = (pl.defId === 'bld_lighthouse' ? 110 : 70) * zoom;
        // 地面光池
        const pool = ctx.createRadialGradient(sx, sy + 4, 2, sx, sy + 4, r * 0.65);
        pool.addColorStop(0, `rgba(255, 216, 130, ${na * 0.28})`);
        pool.addColorStop(1, 'rgba(255, 216, 130, 0)');
        ctx.fillStyle = pool;
        ctx.fillRect(sx - r * 0.7, sy - r * 0.3, r * 1.4, r * 0.9);
        // 空中光晕
        const grad = ctx.createRadialGradient(sx, sy - 30 * zoom, 6, sx, sy - 30 * zoom, r);
        grad.addColorStop(0, `rgba(255, 224, 130, ${na * 0.75})`);
        grad.addColorStop(1, 'rgba(255, 224, 130, 0)');
        ctx.fillStyle = grad;
        ctx.fillRect(sx - r, sy - 30 * zoom - r, r * 2, r * 2);
      }
    }

    // ---- 夜晚萤火虫（晴朗/多云夜）
    if (deepNight && na > 0.18 && (cal.weather === 'sunny' || cal.weather === 'cloudy')) {
      ctx.save();
      for (let i = 0; i < (cal.season === 'summer' ? 24 : 18); i++) {
        const tx = (i * 7 + 3) % size;
        const ty = (i * 11 + 5) % size;
        if (terrain[ty][tx] === 'water') continue;
        const sx = camera.sx(isoX(tx, ty)) + Math.sin(now / 1600 + i * 1.7) * 10 * zoom;
        const sy = camera.sy(isoY(tx, ty)) - 18 * zoom + Math.cos(now / 2100 + i) * 7 * zoom;
        const glow = 0.55 + 0.25 * Math.sin(now / 900 + i * 2.1);
        ctx.shadowColor = '#ffe27a';
        ctx.shadowBlur = 13 * zoom;
        ctx.fillStyle = `rgba(255, 230, 130, ${glow})`;
        ctx.beginPath();
        ctx.arc(sx, sy, 2.1 * zoom, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    // ---- 天气粒子：切换天气时淡入，避免突然出现
    if (this.lastWeather && this.lastWeather !== cal.weather) this.weatherChangedAt = now;
    this.lastWeather = cal.weather;
    const weatherFade = this.weatherChangedAt
      ? Math.min(1, (now - this.weatherChangedAt) / 1400)
      : 1;
    ctx.save();
    ctx.globalAlpha = weatherFade;
    this.drawWeather(ctx, cal.season, cal.weather, now);
    ctx.restore();
  }

  /** 季节/天气的可视化：雨、雪、云影、花瓣、落叶 */
  private drawWeather(
    ctx: CanvasRenderingContext2D, season: Season, weather: Weather, now: number,
  ): void {
    const { viewW: w, viewH: h } = this.camera;
    const t = now / 1000;
    const small = w < 560;
    if (weather === 'rain' || weather === 'storm') {
      // 暴风雨：低垂云层
      if (weather === 'storm') {
        ctx.fillStyle = 'rgba(38, 52, 68, 0.22)';
        for (let i = 0; i < 3; i++) {
          const cx = ((t * 9 + i * 520) % (w + 520)) - 260;
          ctx.beginPath();
          ctx.ellipse(cx, h * 0.1 + i * 34, 210, 62, 0, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      // 雨天整体压暗 + 轻微雨雾
      ctx.fillStyle = weather === 'storm' ? 'rgba(18, 30, 44, 0.16)' : 'rgba(70, 90, 105, 0.06)';
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = weather === 'storm' ? 'rgba(170, 190, 205, 0.08)' : 'rgba(170, 190, 205, 0.05)';
      ctx.fillRect(0, 0, w, h);
      const n = weather === 'storm' ? (small ? 90 : 150) : (small ? 55 : 85);
      ctx.strokeStyle = weather === 'storm' ? 'rgba(200, 230, 255, 0.65)' : 'rgba(210, 235, 255, 0.5)';
      ctx.lineWidth = weather === 'storm' ? 1.6 : 1.1;
      ctx.beginPath();
      for (let i = 0; i < n; i++) {
        const x = ((i * 137 + t * 420) % (w + 100)) - 50;
        const y = ((i * 83 + t * 640) % (h + 60)) - 30;
        ctx.moveTo(x, y);
        ctx.lineTo(x - 5, y + 16);
      }
      ctx.stroke();
      // 地面/水面上的雨滴涟漪
      for (let i = 0; i < (small ? 16 : 26); i++) {
        const phase = ((t * 1.8 + i * 0.37) % 1);
        const x = ((i * 173 + 29) % w);
        const y = h * 0.3 + ((i * 97 + 41) % Math.max(1, h * 0.66));
        const r = 2 + phase * (weather === 'storm' ? 8 : 5.5);
        ctx.strokeStyle = `rgba(225, 240, 246, ${(1 - phase) * 0.22})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.ellipse(x, y, r, r * 0.34, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
      if (weather === 'storm') {
        const flash = Math.max(0, Math.sin(t * 7.3) - 0.985) * 6;
        if (flash > 0) {
          ctx.fillStyle = `rgba(255,255,255,${Math.min(0.18, flash)})`;
          ctx.fillRect(0, 0, w, h);
        }
      }
      return;
    }
    if (weather === 'snow') {
      // 地面积雪雾
      const haze = ctx.createLinearGradient(0, h * 0.62, 0, h);
      haze.addColorStop(0, 'rgba(248, 251, 255, 0)');
      haze.addColorStop(1, 'rgba(248, 251, 255, 0.14)');
      ctx.fillStyle = haze;
      ctx.fillRect(0, h * 0.62, w, h * 0.38);
      // 远层细雪
      ctx.fillStyle = 'rgba(255,255,255,0.86)';
      for (let i = 0; i < (small ? 60 : 90); i++) {
        const x = (((i * 97 + Math.sin(t * 0.6 + i) * 26) % w) + w) % w;
        const y = ((i * 61 + t * 42) % h + h) % h;
        ctx.beginPath();
        ctx.arc(x, y, 1.2 + (i % 3) * 0.6, 0, Math.PI * 2);
        ctx.fill();
      }
      // 近层大雪花（更慢、更亮）
      ctx.fillStyle = 'rgba(255,255,255,0.72)';
      for (let i = 0; i < (small ? 16 : 26); i++) {
        const x = (((i * 151 + Math.sin(t * 0.35 + i) * 40) % w) + w) % w;
        const y = ((i * 113 + t * 24) % h + h) % h;
        ctx.beginPath();
        ctx.arc(x, y, 2.2 + (i % 4) * 0.55, 0, Math.PI * 2);
        ctx.fill();
      }
      return;
    }
    if (weather === 'cloudy') {
      ctx.fillStyle = 'rgba(110, 130, 150, 0.06)';
      for (let i = 0; i < 3; i++) {
        const x = ((t * 12 + i * 480) % (w + 480)) - 240;
        ctx.beginPath();
        ctx.ellipse(x, h * 0.18 + i * 70, 150, 46, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    // 晴天：鸟群 + 夏天浮尘 / 春天花瓣 / 秋天落叶
    if (weather === 'sunny') {
      // 远处鸟群
      ctx.strokeStyle = 'rgba(64, 74, 72, 0.34)';
      ctx.lineWidth = 1.3;
      ctx.lineCap = 'round';
      for (let i = 0; i < 4; i++) {
        const bx = ((i * 263 + t * 13) % (w + 140)) - 70;
        const by = h * 0.14 + i * 21 + Math.sin(t * 0.5 + i) * 5;
        const flap = Math.sin(t * 3.2 + i * 1.8) * 3;
        ctx.beginPath();
        ctx.moveTo(bx - 6, by);
        ctx.quadraticCurveTo(bx - 2.5, by - 3 - flap, bx, by);
        ctx.quadraticCurveTo(bx + 2.5, by - 3 - flap, bx + 6, by);
        ctx.stroke();
      }
      if (season === 'summer') {
        ctx.fillStyle = 'rgba(255, 232, 160, 0.38)';
        for (let i = 0; i < 18; i++) {
          const x = ((i * 191 + t * 9 + Math.sin(t * 0.5 + i) * 18) % (w + 40)) - 20;
          const y = ((i * 73 + t * 12) % (h + 40)) - 20;
          ctx.beginPath();
          ctx.arc(x, y, 1 + (i % 3) * 0.4, 0, Math.PI * 2);
          ctx.fill();
        }
        return;
      }
      const pink = season === 'spring';
      const orange = season === 'autumn';
      if (!pink && !orange) return;
      ctx.fillStyle = pink ? 'rgba(245, 180, 200, 0.75)' : 'rgba(230, 150, 60, 0.75)';
      for (let i = 0; i < 26; i++) {
        const x = ((i * 173 + t * 26 + Math.sin(t * 0.8 + i) * 30) % (w + 40)) - 20;
        const y = ((i * 91 + t * 34) % (h + 40)) - 20;
        ctx.beginPath();
        ctx.ellipse(x, y, pink ? 3 : 4.2, pink ? 2 : 2.6, t + i, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  centerOnIsland(scene: RenderScene): void {
    const size = buildTerrain(scene.seed, scene.islandTier).length;
    this.camera.centerOnTile(size / 2 - 0.5, size / 2 - 0.5);
  }

  /** 小屋室内：两面上墙 + 木地板 + 家具 + 角色 */
  renderInterior(scene: InteriorScene, now: number): void {
    const { ctx, camera } = this;
    const zoom = camera.zoom;
    const theme = ROOM_THEME[scene.room];
    ctx.setTransform(this.dpr * this.pixelScale, 0, 0, this.dpr * this.pixelScale, 0, 0);

    // 背景
    const bg = ctx.createLinearGradient(0, 0, 0, camera.viewH);
    bg.addColorStop(0, theme.wallTop);
    bg.addColorStop(1, theme.wallBottom);
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, camera.viewW, camera.viewH);

    const sx = (x: number, y: number): number => camera.sx(isoX(x, y));
    const sy = (x: number, y: number): number => camera.sy(isoY(x, y));
    const W = 10;
    const H = 8;
    const wallH = 170 * zoom;

    const ax = sx(0, 0);
    const ay = sy(0, 0);
    const bx = sx(W, 0);
    const by = sy(W, 0);
    const dx = sx(0, H);
    const dy = sy(0, H);

    // 后墙（y=0）
    ctx.beginPath();
    ctx.moveTo(ax, ay);
    ctx.lineTo(bx, by);
    ctx.lineTo(bx, by - wallH);
    ctx.lineTo(ax, ay - wallH);
    ctx.closePath();
    const back = ctx.createLinearGradient(0, ay - wallH, 0, ay);
    back.addColorStop(0, theme.wallTop);
    back.addColorStop(1, theme.wallBottom);
    ctx.fillStyle = back;
    ctx.fill();
    ctx.strokeStyle = 'rgba(150, 115, 75, 0.25)';
    ctx.lineWidth = 1;
    for (let i = 1; i < 10; i++) {
      const t = i / 10;
      ctx.beginPath();
      ctx.moveTo(ax + (bx - ax) * t, ay + (by - ay) * t);
      ctx.lineTo(ax + (bx - ax) * t, ay + (by - ay) * t - wallH);
      ctx.stroke();
    }

    // 左墙（x=0）
    ctx.beginPath();
    ctx.moveTo(ax, ay);
    ctx.lineTo(dx, dy);
    ctx.lineTo(dx, dy - wallH);
    ctx.lineTo(ax, ay - wallH);
    ctx.closePath();
    ctx.fillStyle = theme.wallLeft;
    ctx.fill();
    ctx.strokeStyle = 'rgba(130, 95, 60, 0.22)';
    for (let i = 1; i < 8; i++) {
      const t = i / 8;
      ctx.beginPath();
      ctx.moveTo(ax + (dx - ax) * t, ay + (dy - ay) * t);
      ctx.lineTo(ax + (dx - ax) * t, ay + (dy - ay) * t - wallH);
      ctx.stroke();
    }

    // 窗户（后墙）
    const wx = ax + (bx - ax) * 0.62;
    const wy = ay + (by - ay) * 0.62 - wallH * 0.72;
    ctx.fillStyle = '#bfe6f2';
    ctx.strokeStyle = '#a88a5c';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.roundRect(wx - 30 * zoom, wy - 26 * zoom, 60 * zoom, 52 * zoom, 4);
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = '#a88a5c';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(wx, wy - 26 * zoom); ctx.lineTo(wx, wy + 26 * zoom);
    ctx.moveTo(wx - 30 * zoom, wy); ctx.lineTo(wx + 30 * zoom, wy);
    ctx.stroke();
    // 窗外云
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.beginPath();
    ctx.ellipse(wx - 10 * zoom, wy - 8 * zoom, 12 * zoom, 6 * zoom, 0, 0, Math.PI * 2);
    ctx.ellipse(wx + 6 * zoom, wy - 10 * zoom, 9 * zoom, 5 * zoom, 0, 0, Math.PI * 2);
    ctx.fill();

    // 窗户透进来的体积光：从窗台铺到地板
    const lightTop = wy + 26 * zoom;
    const lamp = ctx.createLinearGradient(wx, lightTop, wx + 20 * zoom, lightTop + 170 * zoom);
    lamp.addColorStop(0, 'rgba(255, 238, 196, 0.28)');
    lamp.addColorStop(0.55, 'rgba(255, 232, 184, 0.12)');
    lamp.addColorStop(1, 'rgba(255, 232, 184, 0)');
    ctx.fillStyle = lamp;
    ctx.beginPath();
    ctx.moveTo(wx - 28 * zoom, lightTop);
    ctx.lineTo(wx + 28 * zoom, lightTop);
    ctx.lineTo(wx + 86 * zoom, lightTop + 172 * zoom);
    ctx.lineTo(wx - 8 * zoom, lightTop + 188 * zoom);
    ctx.closePath();
    ctx.fill();
    // 窗口周围的柔光
    const winGlow = ctx.createRadialGradient(wx, wy, 4, wx, wy, 78 * zoom);
    winGlow.addColorStop(0, 'rgba(255, 240, 200, 0.16)');
    winGlow.addColorStop(1, 'rgba(255, 240, 200, 0)');
    ctx.fillStyle = winGlow;
    ctx.fillRect(wx - 78 * zoom, wy - 78 * zoom, 156 * zoom, 156 * zoom);

    // 地板
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        drawSprite(ctx, `floor:${(x * 3 + y) % 3}:${theme.floor}`, sx(x, y), sy(x, y), zoom);
      }
    }

    // 踢脚线
    ctx.strokeStyle = 'rgba(120, 85, 50, 0.5)';
    ctx.lineWidth = 3 * zoom;
    ctx.beginPath();
    ctx.moveTo(ax, ay);
    ctx.lineTo(bx, by);
    ctx.moveTo(ax, ay);
    ctx.lineTo(dx, dy);
    ctx.stroke();

    // 家具（地毯先画，其它按深度排序）
    const items = [...scene.furniture].sort((a, b) => {
      const ar = a.def.slot === 'rug' ? 0 : 1;
      const br = b.def.slot === 'rug' ? 0 : 1;
      if (ar !== br) return ar - br;
      return (a.x + a.y) - (b.x + b.y);
    });
    for (const item of items) {
      const def = item.def;
      const cx = item.x + (def.w - 1) / 2;
      const cy = item.y + (def.h - 1) / 2;
      const fx = sx(cx, cy);
      const fy = sy(cx, cy) + (TILE_H / 2) * zoom;
      if (item.rot === 1) {
        ctx.save();
        ctx.translate(fx, 0);
        ctx.scale(-1, 1);
        drawSprite(ctx, `furn:${def.id}`, 0, fy, zoom);
        ctx.restore();
      } else {
        drawSprite(ctx, `furn:${def.id}`, fx, fy, zoom);
      }
    }

    // 角色
    const px = sx(5, 7.2);
    const py = sy(5, 7.2) + (TILE_H / 2) * zoom;
    drawSprite(ctx, charKey(scene.avatar), px, py, zoom);
    if (scene.name) {
      ctx.font = `${Math.round(11 * zoom)}px "Segoe UI", sans-serif`;
      ctx.textAlign = 'center';
      const tw = ctx.measureText(scene.name).width;
      ctx.fillStyle = 'rgba(60, 45, 30, 0.55)';
      ctx.fillRect(px - tw / 2 - 4, py - 76 * zoom, tw + 8, 14 * zoom);
      ctx.fillStyle = '#fff';
      ctx.fillText(scene.name, px, py - 76 * zoom + 11 * zoom);
      ctx.textAlign = 'start';
    }

    // 暖色暗角
    const vig = ctx.createRadialGradient(
      camera.viewW / 2, camera.viewH / 2, Math.min(camera.viewW, camera.viewH) * 0.28,
      camera.viewW / 2, camera.viewH / 2, Math.max(camera.viewW, camera.viewH) * 0.72,
    );
    vig.addColorStop(0, 'rgba(80, 50, 30, 0)');
    vig.addColorStop(1, 'rgba(80, 50, 30, 0.28)');
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, camera.viewW, camera.viewH);

    // 壁炉暖光
    const fire = scene.furniture.find((f) => f.def.slot === 'fireplace');
    if (fire) {
      const fx = sx(fire.x + (fire.def.w - 1) / 2, fire.y + (fire.def.h - 1) / 2);
      const fy = sy(fire.x + (fire.def.w - 1) / 2, fire.y + (fire.def.h - 1) / 2);
      const r = 120 * zoom;
      const glow = ctx.createRadialGradient(fx, fy, 6, fx, fy, r);
      glow.addColorStop(0, 'rgba(255, 190, 100, 0.28)');
      glow.addColorStop(1, 'rgba(255, 190, 100, 0)');
      ctx.fillStyle = glow;
      ctx.fillRect(fx - r, fy - r, r * 2, r * 2);
    }
    void now;
  }
}

export { TILE_W };
