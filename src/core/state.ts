/**
 * 存档工厂与主 tick：创建新游戏、每帧/离线统一推进世界。
 */
import type { AvatarConfig, GameState, Stats } from './types';
import { STARTING, maxEnergy } from './balance';
import { islandSize } from './island';
import { initNeighbors } from './social';
import { refreshDaily, syncTutorialQuests } from './quests';
import { tickBeastMischief, tickBeasts } from './beasts';
import { tickWeeds } from './weeds';
import { tickSprinklers } from './automation';
import { seedForage, tickForage } from './forage';
import { seedGame, tickGame } from './hunt';
import { tickPetGifts, tickPetsFollow } from './pets';
import { updateEnergy } from './player';
import { calendarAt, isWetWeather } from './calendar';
import { cropDef } from './registry';

export const SAVE_VERSION = 31;

export function defaultAvatar(): AvatarConfig {
  return {
    skin: 'cl_skin_fair',
    hair: 'cl_hair_short_brown',
    face: 'cl_face_smile',
    top: 'cl_top_tee_blue',
    bottom: 'cl_bottom_shorts',
    hat: null,
    accessory: null,
  };
}

export function emptyStats(): Stats {
  return {
    harvests: 0, plantings: 0, waterings: 0,
    animalsCollected: 0, animalsFed: 0,
    fishCaught: 0, rareFishCaught: 0,
    forages: 0, hunts: 0, flowersHarvested: 0, baitsUsed: 0, giftsGiven: 0, petTrainings: 0, petContests: 0, neighborChats: 0, neighborStories: 0, dexRewards: 0, ordersDone: 0, petSkillsUsed: 0, ratingClaims: 0, outfitsSaved: 0, goldHarvests: 0, silverHarvests: 0, birthdayGifts: 0, pondHarvests: 0, restaurantServices: 0, animalsBred: 0, furnitureUses: 0, museumDonations: 0, checkins: 0,
    breeds: 0, dishesCooked: 0, bouquetsMade: 0,
    beastsDefeated: 0, weedsCleared: 0,
    buildingsPlaced: 0, clothesBought: 0,
    petsAdopted: 0, petFeeds: 0, petPlays: 0,
    visits: 0, helps: 0, pranks: 0, hires: 0,
    coinsEarned: 0, coinsSpent: 0, itemsSold: 0,
    expansions: 0, questsDone: 0,
    daysPlayed: 0, lastPlayDay: '',
  };
}

export function createNewGame(name: string, seed: number, now: number): GameState {
  const state: GameState = {
    version: SAVE_VERSION,
    createdAt: now,
    savedAt: now,
    uidCounter: 0,
    seed,
    player: {
      name: name || '岛主',
      level: 1,
      xp: 0,
      coins: STARTING.coins,
      food: STARTING.food,
      reputation: STARTING.reputation,
      energy: maxEnergy(1),
      energyUpdatedAt: now,
      avatar: defaultAvatar(),
      wardrobe: [
        'cl_skin_fair', 'cl_skin_tan', 'cl_skin_deep',
        'cl_hair_short_brown', 'cl_hair_long_black',
        'cl_face_smile', 'cl_face_wink',
        'cl_top_tee_blue', 'cl_bottom_shorts',
      ],
      rodTier: 1,
      px: 0,
      py: 0,
    },
    islandTier: 1,
    plots: [],
    placements: [],
    animals: [],
    pets: [],
    beasts: [],
    forage: [],
    game: [],
    weeds: [],
    nextBeastAt: 0,
    nextWeedAt: 0,
    nextForageAt: 0,
    nextGameAt: 0,
    inventory: { seed_carrot: 4 },
    quests: {
      tutorialDone: [],
      active: [],
      daily: { day: '', questIds: [], completed: [] },
    },
    achievements: {},
    collections: {
      fish: {}, beasts: {}, forage: {}, game: {},
      claimed: { fish: 0, forage: 0, game: 0, beasts: 0 },
    },
    neighbors: [],
    interior: { owned: [], rooms: { living: [], bedroom: [], kitchen: [] }, activeRoom: 'living' },
    seedBank: {},
    orders: { day: '', done: [] },
    buffs: { luckyFishUntil: 0 },
    ratingClaimed: 0,
    outfits: [null, null, null],
    fishPonds: {},
    restaurants: {},
    furnitureUses: {},
    museum: { donated: [], claimed: 0 },
    checkin: { lastDay: '', streak: 0, total: 0 },
    title: 'title_novice',
    festival: {
      lastGiftDay: -1,
      activity: { season: 'spring', count: 0, claimed: 0 },
    },
    stats: emptyStats(),
    lastRainDay: -1,
    settings: { lang: 'zh', sound: true, music: true, pixelate: false },
  };
  // 玩家出生在岛中心
  const c = Math.floor(islandSize(1) / 2);
  state.player.px = c;
  state.player.py = c + 2;
  // 初始 4 块已开垦农田（教程直接可种）
  const startPlots: Array<[number, number]> = [
    [c - 2, c - 1], [c - 1, c - 1], [c - 2, c], [c - 1, c],
  ];
  for (const [x, y] of startPlots) {
    state.uidCounter += 1;
    state.plots.push({ uid: state.uidCounter, x, y, crop: null });
  }
  initNeighbors(state, now);
  // 开局送几处野生资源与一只小猎物，采摘/狩猎不用等刷新
  seedForage(state, now, 4);
  seedGame(state, now, 1);
  syncTutorialQuests(state, now);
  refreshDaily(state, now);
  return state;
}

export interface TickSummary {
  beastsArrived: number;
  weedsGrown: number;
  cropsTrampled: number;
  forageGrown: number;
  gameArrived: number;
  petGift: string | null;
  rained: boolean;
  sprinkled: number;
}

/** 雨天自动浇灌：每个游戏日一次，给所有作物补 5% 生长进度 */
function applyRain(state: GameState, now: number): boolean {
  const cal = calendarAt(state.createdAt, now, state.seed);
  if (!isWetWeather(cal.weather)) return false;
  if (state.lastRainDay === cal.dayIndex) return false;
  state.lastRainDay = cal.dayIndex;
  for (const plot of state.plots) {
    const crop = plot.crop;
    if (!crop) continue;
    const def = cropDef(crop.defId);
    const total = def.isTree ? (def.regrowMs ?? def.growMs) : def.growMs;
    const speed = crop.speedMul && crop.speedMul > 0 ? crop.speedMul : 1;
    crop.wateredBonusMs += Math.round((total / speed) * 0.05);
    crop.lastWateredAt = now;
  }
  return true;
}

/** 世界推进：能量、天气、野兽、杂草、采摘、狩猎、宠物技能、每日刷新（每帧或加载时调用） */
export function tickWorld(state: GameState, now: number): TickSummary {
  updateEnergy(state, now);
  const rained = applyRain(state, now);
  const sprinkled = tickSprinklers(state, now);
  refreshDaily(state, now);
  const beastsArrived = tickBeasts(state, now);
  const cropsTrampled = tickBeastMischief(state, now);
  const weedsGrown = tickWeeds(state, now);
  const forageGrown = tickForage(state, now);
  const gameArrived = tickGame(state, now);
  tickPetsFollow(state, now);
  const petGift = tickPetGifts(state, now);
  return { beastsArrived, weedsGrown, cropsTrampled, forageGrown, gameArrived, petGift, rained, sprinkled };
}
