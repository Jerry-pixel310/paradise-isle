/**
 * 存档：localStorage 槽位 + JSON 导出/导入 + schema 版本迁移。
 * core 层不依赖本模块；测试直接调用 serialize/deserialize/migrate。
 */
import type { GameState } from '../core/types';
import { SAVE_VERSION, createNewGame, emptyStats } from '../core/state';
import { initNeighbors } from '../core/social';
import { furnitureDef } from '../core/registry';

export const SLOT_COUNT = 3;
const KEY_PREFIX = 'paradise-isle:save:';
const KEY_ACTIVE = 'paradise-isle:activeSlot';

export function serialize(state: GameState, now: number): string {
  state.savedAt = now;
  return JSON.stringify(state);
}

/**
 * 版本迁移链：每个函数把 vN 提升到 vN+1。
 * v1 → v2：补 pets/collections；v2 → v3：补 stats 新字段与 neighbors；
 * v3 → v4：补采摘/狩猎；v4 → v5：补天气/像素滤镜/野生动物行为字段。
 */
type Migrator = (raw: Record<string, unknown>) => void;

const MIGRATIONS: Record<number, Migrator> = {
  1: (raw) => {
    if (!raw.pets) raw.pets = [];
    if (!raw.collections) raw.collections = { fish: {}, beasts: {} };
    raw.version = 2;
  },
  2: (raw) => {
    const stats = (raw.stats ?? {}) as Record<string, unknown>;
    const full = emptyStats() as unknown as Record<string, unknown>;
    for (const k of Object.keys(full)) {
      if (!(k in stats)) stats[k] = full[k];
    }
    raw.stats = stats;
    if (!raw.neighbors) raw.neighbors = [];
    raw.version = 3;
  },
  3: (raw) => {
    if (!Array.isArray(raw.forage)) raw.forage = [];
    if (!Array.isArray(raw.game)) raw.game = [];
    if (typeof raw.nextForageAt !== 'number') raw.nextForageAt = 0;
    if (typeof raw.nextGameAt !== 'number') raw.nextGameAt = 0;
    const collections = (raw.collections ?? {}) as Record<string, unknown>;
    if (!collections.forage) collections.forage = {};
    if (!collections.game) collections.game = {};
    raw.collections = collections;
    const stats = (raw.stats ?? {}) as Record<string, unknown>;
    if (typeof stats.forages !== 'number') stats.forages = 0;
    if (typeof stats.hunts !== 'number') stats.hunts = 0;
    if (typeof stats.flowersHarvested !== 'number') stats.flowersHarvested = 0;
    raw.stats = stats;
    raw.version = 4;
  },
  4: (raw) => {
    const settings = (raw.settings ?? {}) as Record<string, unknown>;
    if (typeof settings.pixelate !== 'boolean') settings.pixelate = false;
    if (settings.lang !== 'zh' && settings.lang !== 'en') settings.lang = 'zh';
    if (typeof settings.sound !== 'boolean') settings.sound = true;
    if (typeof settings.music !== 'boolean') settings.music = true;
    raw.settings = settings;
    if (typeof raw.lastRainDay !== 'number') raw.lastRainDay = -1;
    const game = (raw.game ?? []) as Array<Record<string, unknown>>;
    for (const g of game) {
      if (!Array.isArray(g.trail)) g.trail = [];
      if (typeof g.fleeCount !== 'number') g.fleeCount = 0;
      if (typeof g.nextMoveAt !== 'number') g.nextMoveAt = 0;
    }
    raw.game = game;
    const stats = (raw.stats ?? {}) as Record<string, unknown>;
    if (typeof stats.breeds !== 'number') stats.breeds = 0;
    if (typeof stats.dishesCooked !== 'number') stats.dishesCooked = 0;
    if (typeof stats.bouquetsMade !== 'number') stats.bouquetsMade = 0;
    raw.stats = stats;
    raw.version = 5;
  },
  5: (raw) => {
    if (!raw.interior || typeof raw.interior !== 'object') {
      raw.interior = { owned: [], placements: [] };
    } else {
      const interior = raw.interior as Record<string, unknown>;
      if (!Array.isArray(interior.owned)) interior.owned = [];
      if (!Array.isArray(interior.placements)) interior.placements = [];
    }
    raw.version = 6;
  },
  6: (raw) => {
    const interior = (raw.interior ?? {}) as Record<string, unknown>;
    if (!Array.isArray(interior.placements)) interior.placements = [];
    // v6 的 placed 是 slot -> furnitureId，转成自由摆放坐标
    const legacy = interior.placed as Record<string, string> | undefined;
    if (legacy) {
      let uid = Number(raw.uidCounter ?? 0);
      for (const id of Object.values(legacy)) {
        try {
          const def = furnitureDef(id);
          uid += 1;
          (interior.placements as Array<Record<string, unknown>>).push({
            uid, defId: id, x: def.x, y: def.y, rot: 0,
          });
        } catch { /* 内容未注册时跳过 */ }
      }
      raw.uidCounter = uid;
      delete interior.placed;
    }
    raw.interior = interior;
    raw.version = 7;
  },
  7: (raw) => {
    const stats = (raw.stats ?? {}) as Record<string, unknown>;
    if (typeof stats.baitsUsed !== 'number') stats.baitsUsed = 0;
    raw.stats = stats;
    raw.version = 8;
  },
  8: (raw) => {
    if (!raw.seedBank || typeof raw.seedBank !== 'object') raw.seedBank = {};
    raw.version = 9;
  },
  9: (raw) => {
    const interior = (raw.interior ?? {}) as Record<string, unknown>;
    if (!interior.rooms || typeof interior.rooms !== 'object') {
      const legacy = Array.isArray(interior.placements) ? interior.placements : [];
      interior.rooms = { living: legacy, bedroom: [], kitchen: [] };
    }
    const rooms = interior.rooms as Record<string, unknown>;
    for (const id of ['living', 'bedroom', 'kitchen']) {
      if (!Array.isArray(rooms[id])) rooms[id] = [];
    }
    if (interior.activeRoom !== 'bedroom' && interior.activeRoom !== 'kitchen') {
      interior.activeRoom = 'living';
    }
    delete interior.placements;
    raw.interior = interior;
    raw.version = 10;
  },
  10: (raw) => {
    const festival = (raw.festival ?? {}) as Record<string, unknown>;
    if (typeof festival.lastGiftDay !== 'number') festival.lastGiftDay = -1;
    raw.festival = festival;
    raw.version = 11;
  },
  11: (raw) => {
    const festival = (raw.festival ?? {}) as Record<string, unknown>;
    if (typeof festival.lastGiftDay !== 'number') festival.lastGiftDay = -1;
    const activity = (festival.activity ?? {}) as Record<string, unknown>;
    if (activity.season !== 'spring' && activity.season !== 'summer'
      && activity.season !== 'autumn' && activity.season !== 'winter') {
      activity.season = 'spring';
    }
    if (typeof activity.count !== 'number') activity.count = 0;
    if (typeof activity.claimed !== 'number') activity.claimed = 0;
    festival.activity = activity;
    raw.festival = festival;
    raw.version = 12;
  },
  12: (raw) => {
    const neighbors = (raw.neighbors ?? []) as Array<Record<string, unknown>>;
    for (const n of neighbors) {
      if (typeof n.giftedToday !== 'number') n.giftedToday = 0;
      if (typeof n.rewardTier !== 'number') n.rewardTier = 0;
    }
    raw.neighbors = neighbors;
    const stats = (raw.stats ?? {}) as Record<string, unknown>;
    if (typeof stats.giftsGiven !== 'number') stats.giftsGiven = 0;
    raw.stats = stats;
    raw.version = 13;
  },
  13: (raw) => {
    const stats = (raw.stats ?? {}) as Record<string, unknown>;
    if (typeof stats.petTrainings !== 'number') stats.petTrainings = 0;
    raw.stats = stats;
    const pets = (raw.pets ?? []) as Array<Record<string, unknown>>;
    for (const p of pets) {
      if (typeof p.lastTrainedAt !== 'number') p.lastTrainedAt = 0;
    }
    raw.pets = pets;
    raw.version = 14;
  },
  14: (raw) => {
    const stats = (raw.stats ?? {}) as Record<string, unknown>;
    if (typeof stats.petContests !== 'number') stats.petContests = 0;
    raw.stats = stats;
    raw.version = 15;
  },
  15: (raw) => {
    const neighbors = (raw.neighbors ?? []) as Array<Record<string, unknown>>;
    for (const n of neighbors) {
      if (typeof n.chattedToday !== 'number') n.chattedToday = 0;
    }
    raw.neighbors = neighbors;
    const stats = (raw.stats ?? {}) as Record<string, unknown>;
    if (typeof stats.neighborChats !== 'number') stats.neighborChats = 0;
    raw.stats = stats;
    raw.version = 16;
  },
  16: (raw) => {
    const neighbors = (raw.neighbors ?? []) as Array<Record<string, unknown>>;
    for (const n of neighbors) {
      if (typeof n.storyTier !== 'number') n.storyTier = 0;
    }
    raw.neighbors = neighbors;
    const stats = (raw.stats ?? {}) as Record<string, unknown>;
    if (typeof stats.neighborStories !== 'number') stats.neighborStories = 0;
    raw.stats = stats;
    raw.version = 17;
  },
  17: (raw) => {
    const collections = (raw.collections ?? {}) as Record<string, unknown>;
    const claimed = (collections.claimed ?? {}) as Record<string, unknown>;
    for (const id of ['fish', 'forage', 'game', 'beasts']) {
      if (typeof claimed[id] !== 'number') claimed[id] = 0;
    }
    collections.claimed = claimed;
    raw.collections = collections;
    const stats = (raw.stats ?? {}) as Record<string, unknown>;
    if (typeof stats.dexRewards !== 'number') stats.dexRewards = 0;
    raw.stats = stats;
    raw.version = 18;
  },
  18: (raw) => {
    const orders = (raw.orders ?? {}) as Record<string, unknown>;
    if (typeof orders.day !== 'string') orders.day = '';
    if (!Array.isArray(orders.done)) orders.done = [];
    raw.orders = orders;
    const stats = (raw.stats ?? {}) as Record<string, unknown>;
    if (typeof stats.ordersDone !== 'number') stats.ordersDone = 0;
    raw.stats = stats;
    raw.version = 19;
  },
  19: (raw) => {
    const buffs = (raw.buffs ?? {}) as Record<string, unknown>;
    if (typeof buffs.luckyFishUntil !== 'number') buffs.luckyFishUntil = 0;
    raw.buffs = buffs;
    const stats = (raw.stats ?? {}) as Record<string, unknown>;
    if (typeof stats.petSkillsUsed !== 'number') stats.petSkillsUsed = 0;
    raw.stats = stats;
    raw.version = 20;
  },
  20: (raw) => {
    if (typeof raw.ratingClaimed !== 'number') raw.ratingClaimed = 0;
    const stats = (raw.stats ?? {}) as Record<string, unknown>;
    if (typeof stats.ratingClaims !== 'number') stats.ratingClaims = 0;
    raw.stats = stats;
    raw.version = 21;
  },
  21: (raw) => {
    const outfits = raw.outfits;
    if (!Array.isArray(outfits) || outfits.length !== 3) raw.outfits = [null, null, null];
    const stats = (raw.stats ?? {}) as Record<string, unknown>;
    if (typeof stats.outfitsSaved !== 'number') stats.outfitsSaved = 0;
    raw.stats = stats;
    raw.version = 22;
  },
  22: (raw) => {
    const stats = (raw.stats ?? {}) as Record<string, unknown>;
    if (typeof stats.goldHarvests !== 'number') stats.goldHarvests = 0;
    if (typeof stats.silverHarvests !== 'number') stats.silverHarvests = 0;
    raw.stats = stats;
    raw.version = 23;
  },
  23: (raw) => {
    const neighbors = (raw.neighbors ?? []) as Array<Record<string, unknown>>;
    for (const n of neighbors) {
      if (typeof n.lastBirthdayYear !== 'number') n.lastBirthdayYear = -1;
    }
    raw.neighbors = neighbors;
    const stats = (raw.stats ?? {}) as Record<string, unknown>;
    if (typeof stats.birthdayGifts !== 'number') stats.birthdayGifts = 0;
    raw.stats = stats;
    raw.version = 24;
  },
  24: (raw) => {
    if (!raw.fishPonds || typeof raw.fishPonds !== 'object') raw.fishPonds = {};
    const stats = (raw.stats ?? {}) as Record<string, unknown>;
    if (typeof stats.pondHarvests !== 'number') stats.pondHarvests = 0;
    raw.stats = stats;
    raw.version = 25;
  },
  25: (raw) => {
    if (!raw.restaurants || typeof raw.restaurants !== 'object') raw.restaurants = {};
    const stats = (raw.stats ?? {}) as Record<string, unknown>;
    if (typeof stats.restaurantServices !== 'number') stats.restaurantServices = 0;
    raw.stats = stats;
    raw.version = 26;
  },
  26: (raw) => {
    const stats = (raw.stats ?? {}) as Record<string, unknown>;
    if (typeof stats.animalsBred !== 'number') stats.animalsBred = 0;
    raw.stats = stats;
    const animals = (raw.animals ?? []) as Array<Record<string, unknown>>;
    for (const a of animals) {
      if (a.birthAt === null) delete a.birthAt;
    }
    raw.animals = animals;
    raw.version = 27;
  },
  27: (raw) => {
    if (!raw.furnitureUses || typeof raw.furnitureUses !== 'object') raw.furnitureUses = {};
    const stats = (raw.stats ?? {}) as Record<string, unknown>;
    if (typeof stats.furnitureUses !== 'number') stats.furnitureUses = 0;
    raw.stats = stats;
    raw.version = 28;
  },
  28: (raw) => {
    const museum = (raw.museum ?? {}) as Record<string, unknown>;
    if (!Array.isArray(museum.donated)) museum.donated = [];
    if (typeof museum.claimed !== 'number') museum.claimed = 0;
    raw.museum = museum;
    const stats = (raw.stats ?? {}) as Record<string, unknown>;
    if (typeof stats.museumDonations !== 'number') stats.museumDonations = 0;
    raw.stats = stats;
    raw.version = 29;
  },
  29: (raw) => {
    const checkin = (raw.checkin ?? {}) as Record<string, unknown>;
    if (typeof checkin.lastDay !== 'string') checkin.lastDay = '';
    if (typeof checkin.streak !== 'number') checkin.streak = 0;
    if (typeof checkin.total !== 'number') checkin.total = 0;
    raw.checkin = checkin;
    const stats = (raw.stats ?? {}) as Record<string, unknown>;
    if (typeof stats.checkins !== 'number') stats.checkins = 0;
    raw.stats = stats;
    raw.version = 30;
  },
  30: (raw) => {
    if (typeof raw.title !== 'string' || !raw.title) raw.title = 'title_novice';
    raw.version = 31;
  },
};

export function migrate(raw: Record<string, unknown>): GameState {
  let v = Number(raw.version ?? 1);
  if (v > SAVE_VERSION) throw new Error(`save version ${v} is newer than game (${SAVE_VERSION})`);
  while (v < SAVE_VERSION) {
    const step = MIGRATIONS[v];
    if (!step) throw new Error(`no migration from v${v}`);
    step(raw);
    v = Number(raw.version);
  }
  return raw as unknown as GameState;
}

export function deserialize(json: string, now: number): GameState {
  const raw = JSON.parse(json) as Record<string, unknown>;
  if (typeof raw !== 'object' || raw === null || !raw.player) {
    throw new Error('not a valid save');
  }
  const state = migrate(raw);
  // 邻居为空（老档/异常）时重建
  initNeighbors(state, now);
  return state;
}

// ---------------------------------------------------------------- localStorage 封装

function storageAvailable(): boolean {
  return typeof localStorage !== 'undefined';
}

export function saveToSlot(state: GameState, slot: number, now: number): void {
  if (!storageAvailable()) return;
  localStorage.setItem(KEY_PREFIX + slot, serialize(state, now));
  localStorage.setItem(KEY_ACTIVE, String(slot));
}

export function loadFromSlot(slot: number, now: number): GameState | null {
  if (!storageAvailable()) return null;
  const json = localStorage.getItem(KEY_PREFIX + slot);
  if (!json) return null;
  try {
    return deserialize(json, now);
  } catch (err) {
    console.error('save corrupted:', err);
    return null;
  }
}

export interface SlotInfo {
  slot: number;
  name: string;
  level: number;
  coins: number;
  savedAt: number;
  days: number;
  avatar: GameState['player']['avatar'] | null;
}

export function slotInfos(): (SlotInfo | null)[] {
  if (!storageAvailable()) return Array.from({ length: SLOT_COUNT }, () => null);
  return Array.from({ length: SLOT_COUNT }, (_, i) => {
    const json = localStorage.getItem(KEY_PREFIX + i);
    if (!json) return null;
    try {
      const raw = JSON.parse(json) as GameState;
      return {
        slot: i,
        name: raw.player?.name ?? '?',
        level: raw.player?.level ?? 1,
        coins: raw.player?.coins ?? 0,
        savedAt: raw.savedAt ?? 0,
        days: raw.stats?.daysPlayed ?? 1,
        avatar: raw.player?.avatar ?? null,
      };
    } catch {
      return null;
    }
  });
}

export function activeSlot(): number {
  if (!storageAvailable()) return 0;
  return Number(localStorage.getItem(KEY_ACTIVE) ?? 0);
}

export function deleteSlot(slot: number): void {
  if (!storageAvailable()) return;
  localStorage.removeItem(KEY_PREFIX + slot);
}

export function newGameInSlot(name: string, slot: number, now: number): GameState {
  const seed = (Math.floor(Math.random() * 0xffffffff) ^ now) >>> 0;
  const state = createNewGame(name, seed, now);
  saveToSlot(state, slot, now);
  return state;
}

/** 导出为可分享的 base64 字符串 */
export function exportSave(state: GameState, now: number): string {
  const json = serialize(state, now);
  const bytes = new TextEncoder().encode(json);
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

export function importSave(b64: string, now: number): GameState {
  const bin = atob(b64.trim());
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  const json = new TextDecoder().decode(bytes);
  return deserialize(json, now);
}
