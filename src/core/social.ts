/**
 * 邻居社交：每个 NPC 邻居有自己的持久化小岛（作物/杂草/野兽），
 * 随时间惰性演化。玩家可拜访、帮工（浇水/除草/驱兽 → 声望+好友度）、
 * 捣蛋（恶作剧 → 声望+但掉好友度）、雇佣（金币 → 邻居来你岛干活）。
 */
import type { ActionResult, GameEvent, GameState, L10n, NeighborPersona, NeighborState } from './types';
import { allCrops, allNeighbors, cropDef, itemDef, neighborDef } from './registry';
import {
  ENERGY_COST, GIFT_PER_NEIGHBOR_PER_DAY, HELP_COIN, HELP_FRIENDSHIP_GAIN, HELP_PER_NEIGHBOR_PER_DAY,
  HELP_REPUTATION, HELP_XP, HIRE_COST, HIRE_FRIENDSHIP_GAIN, NEIGHBOR_REWARDS, NEIGHBOR_STORY_COINS,
  NEIGHBOR_STORY_LEVELS, PRANK_PER_NEIGHBOR_PER_DAY, PRANK_REPUTATION, PRANK_FRIENDSHIP_LOSS,
  WATER_COOLDOWN_MS, WATER_SPEEDUP_RATIO, friendshipLevel,
} from './balance';
import { addItem, gainCoins, gainReputation, gainXp, itemCount, removeItem, spendCoins, spendEnergy } from './player';
import { cropView } from './crops';
import { clearWeed as clearOwnWeed } from './weeds';
import { dayKey } from './quests';
import { calendarAt, DAYS_PER_SEASON } from './calendar';
import { hashSeed, mulberry32, pick, randInt, roll } from './rng';
import { fail } from './types';

let neighborUid = 1_000_000; // 邻居岛内部 uid，与玩家岛区分开
function nUid(): number {
  return ++neighborUid;
}

/** 邻居可种的作物池（按低等级作物为主） */
function npcCropPool(): string[] {
  return allCrops().filter((c) => !c.isTree && c.unlockLevel <= 12).map((c) => c.id);
}

export function generateNeighborState(persona: NeighborPersona, now: number): NeighborState {
  const rng = mulberry32(persona.islandSeed);
  const pool = npcCropPool();
  const plots: NeighborState['plots'] = [];
  const plotCount = randInt(rng, 6, 10);
  // 地块排成靠中心的小田字块
  const baseX = 7 + randInt(rng, 0, 2);
  const baseY = 7 + randInt(rng, 0, 2);
  for (let i = 0; i < plotCount; i++) {
    const x = baseX + (i % 4);
    const y = baseY + Math.floor(i / 4);
    const defId = persona.favoriteCrop && rng() < 0.35 ? persona.favoriteCrop : pick(rng, pool);
    const def = cropDef(defId);
    plots.push({
      uid: nUid(), x, y,
      crop: {
        defId,
        plantedAt: now - Math.floor(rng() * def.growMs * 1.2),
        wateredBonusMs: 0,
        lastWateredAt: 0,
      },
    });
  }
  const weeds: NeighborState['weeds'] = [];
  const weedCount = randInt(rng, 2, 4);
  for (let i = 0; i < weedCount; i++) {
    weeds.push({ uid: nUid(), x: baseX - 2 - (i % 2), y: baseY + i });
  }
  return {
    defId: persona.id,
    friendship: 0,
    plots,
    weeds,
    beasts: [],
    placements: [],
    simulatedAt: now,
    helpedToday: 0,
    prankedToday: 0,
    giftedToday: 0,
    chattedToday: 0,
    rewardTier: 0,
    storyTier: 0,
    lastBirthdayYear: -1,
    helpDay: dayKey(now),
  };
}

export function initNeighbors(state: GameState, now: number): void {
  if (state.neighbors.length > 0) return;
  state.neighbors = allNeighbors().map((p) => generateNeighborState(p, now));
}

export function neighborByDefId(state: GameState, defId: string): NeighborState | undefined {
  return state.neighbors.find((n) => n.defId === defId);
}

/**
 * 惰性演化邻居岛：NPC 会收获成熟很久的作物并补种；杂草缓慢生长。
 */
export function simulateNeighbor(ns: NeighborState, now: number): void {
  const persona = neighborDef(ns.defId);
  const rng = mulberry32(hashSeed(`${persona.islandSeed}:${Math.floor(now / 3600_000)}`));
  const pool = npcCropPool();
  const HARVEST_LAG = 2 * 3600_000;
  for (const plot of ns.plots) {
    if (!plot.crop) {
      // 空地隔段时间补种
      if (rng() < 0.8) {
        const defId = rng() < 0.3 ? persona.favoriteCrop : pick(rng, pool);
        plot.crop = { defId, plantedAt: now - Math.floor(rng() * 60_000), wateredBonusMs: 0, lastWateredAt: 0 };
      }
      continue;
    }
    const view = cropView(plot.crop, now);
    if (view.stage === 'ready' || view.stage === 'withered') {
      const def = cropDef(plot.crop.defId);
      const readyTime = plot.crop.plantedAt + def.growMs - plot.crop.wateredBonusMs;
      if (now - readyTime > HARVEST_LAG) {
        const defId = pick(rng, pool);
        plot.crop = { defId, plantedAt: now - Math.floor(rng() * 30 * 60_000), wateredBonusMs: 0, lastWateredAt: 0 };
      }
    }
  }
  // 杂草：每 4 小时一株，上限 6
  const hours = Math.floor((now - ns.simulatedAt) / (4 * 3600_000));
  for (let i = 0; i < hours && ns.weeds.length < 6; i++) {
    ns.weeds.push({ uid: nUid(), x: 5 + randInt(rng, 0, 8), y: 5 + randInt(rng, 0, 8) });
  }
  ns.simulatedAt = now;
  // 按日重置互动次数
  const day = dayKey(now);
  if (ns.helpDay !== day) {
    ns.helpDay = day;
    ns.helpedToday = 0;
    ns.prankedToday = 0;
    ns.giftedToday = 0;
    ns.chattedToday = 0;
  }
}

function friendshipGain(state: GameState, ns: NeighborState, amount: number): GameEvent[] {
  const before = friendshipLevel(ns.friendship);
  ns.friendship = Math.max(0, ns.friendship + amount);
  const after = friendshipLevel(ns.friendship);
  const events: GameEvent[] = [];
  if (after > before) {
    // 好友度升级：邻居送礼
    const gift = 50 * after;
    events.push(...gainCoins(state, gift));
    events.push({ type: 'toast', target: 'msg.friendGift', amount: gift, data: ns.defId });
  }
  return events;
}

function helpGuard(ns: NeighborState, now: number): string | null {
  simulateNeighbor(ns, now);
  if (ns.helpedToday >= HELP_PER_NEIGHBOR_PER_DAY) return 'msg.helpLimit';
  return null;
}

function applyHelpReward(state: GameState, ns: NeighborState): GameEvent[] {
  ns.helpedToday += 1;
  gainReputation(state, HELP_REPUTATION);
  const events: GameEvent[] = [
    { type: 'helpNeighbor', target: ns.defId, amount: 1 },
    ...gainCoins(state, HELP_COIN),
    ...gainXp(state, HELP_XP),
    ...friendshipGain(state, ns, HELP_FRIENDSHIP_GAIN),
  ];
  return events;
}

/** 帮邻居浇水 */
export function helpWater(state: GameState, ns: NeighborState, plotUid: number, now: number): ActionResult {
  const guard = helpGuard(ns, now);
  if (guard) return fail(guard);
  const plot = ns.plots.find((p) => p.uid === plotUid);
  if (!plot || !plot.crop) return fail('msg.noCrop');
  const view = cropView(plot.crop, now);
  if (view.stage === 'ready' || view.stage === 'withered') return fail('msg.noNeedWater');
  if (now - plot.crop.lastWateredAt < WATER_COOLDOWN_MS) return fail('msg.waterCd');
  if (!spendEnergy(state, ENERGY_COST.helpNeighbor, now)) return fail('msg.noEnergy');
  plot.crop.wateredBonusMs += Math.round(view.etaMs * WATER_SPEEDUP_RATIO);
  plot.crop.lastWateredAt = now;
  return { ok: true, events: applyHelpReward(state, ns) };
}

/** 帮邻居除草 */
export function helpWeed(state: GameState, ns: NeighborState, weedUid: number, now: number): ActionResult {
  const guard = helpGuard(ns, now);
  if (guard) return fail(guard);
  const idx = ns.weeds.findIndex((w) => w.uid === weedUid);
  if (idx < 0) return fail('msg.notFound');
  if (!spendEnergy(state, ENERGY_COST.helpNeighbor, now)) return fail('msg.noEnergy');
  ns.weeds.splice(idx, 1);
  return { ok: true, events: applyHelpReward(state, ns) };
}

/** 帮邻居驱赶野兽（邻居岛的野兽一键驱逐） */
export function helpChaseBeast(state: GameState, ns: NeighborState, beastUid: number, now: number): ActionResult {
  const guard = helpGuard(ns, now);
  if (guard) return fail(guard);
  const idx = ns.beasts.findIndex((b) => b.uid === beastUid);
  if (idx < 0) return fail('msg.notFound');
  if (!spendEnergy(state, ENERGY_COST.helpNeighbor, now)) return fail('msg.noEnergy');
  ns.beasts.splice(idx, 1);
  return { ok: true, events: applyHelpReward(state, ns) };
}

/** 捣蛋：往邻居岛丢一株杂草，赚声望但掉好友度（原版特色：捣蛋得声望） */
export function prankNeighbor(state: GameState, ns: NeighborState, now: number): ActionResult {
  simulateNeighbor(ns, now);
  if (ns.prankedToday >= PRANK_PER_NEIGHBOR_PER_DAY) return fail('msg.prankLimit');
  if (!spendEnergy(state, ENERGY_COST.prank, now)) return fail('msg.noEnergy');
  ns.prankedToday += 1;
  ns.weeds.push({ uid: nUid(), x: 6 + Math.floor(Math.random() * 6), y: 6 + Math.floor(Math.random() * 6) });
  ns.friendship = Math.max(0, ns.friendship - PRANK_FRIENDSHIP_LOSS);
  gainReputation(state, PRANK_REPUTATION);
  return {
    ok: true,
    events: [{ type: 'prank', target: ns.defId, amount: 1 }],
  };
}

/** 雇佣邻居来自己岛干活：浇水全部 + 除草全部 + 驱兽全部（不耗能量） */
export function hireNeighbor(state: GameState, ns: NeighborState, now: number): ActionResult {
  simulateNeighbor(ns, now);
  const day = dayKey(now);
  if (ns.helpDay === day && ns.helpedToday >= HELP_PER_NEIGHBOR_PER_DAY && ns.prankedToday >= PRANK_PER_NEIGHBOR_PER_DAY) {
    // 不额外限制雇佣，仅金币成本
  }
  if (!spendCoins(state, HIRE_COST)) return fail('msg.noCoins');
  let works = 0;
  for (const plot of state.plots) {
    if (!plot.crop) continue;
    const view = cropView(plot.crop, now);
    if (view.stage !== 'ready' && view.stage !== 'withered' && now - plot.crop.lastWateredAt >= WATER_COOLDOWN_MS) {
      plot.crop.wateredBonusMs += Math.round(view.etaMs * WATER_SPEEDUP_RATIO);
      plot.crop.lastWateredAt = now;
      works++;
    }
  }
  while (state.weeds.length > 0) {
    state.weeds.pop();
    works++;
  }
  while (state.beasts.length > 0) {
    state.beasts.pop();
    works++;
  }
  const events: GameEvent[] = [
    { type: 'hire', target: ns.defId, amount: 1 },
    ...friendshipGain(state, ns, HIRE_FRIENDSHIP_GAIN),
    { type: 'toast', target: 'msg.hireDone', amount: works },
  ];
  return { ok: true, events };
}

/** 进入邻居岛（拜访事件） */
export function visitNeighbor(state: GameState, defId: string, now: number): ActionResult {
  const ns = neighborByDefId(state, defId);
  if (!ns) return fail('msg.notFound');
  simulateNeighbor(ns, now);
  return { ok: true, events: [{ type: 'visit', target: defId, amount: 1 }] };
}

// ---------------------------------------------------------------- 送礼与回礼

/** 可以送人的物品：花束、料理、节日物品、花卉产出 */
export function isGiftableItem(itemId: string): boolean {
  const def = itemDef(itemId);
  if (def.sell <= 0) return false;
  if (def.category === 'bouquet' || def.category === 'dish' || def.category === 'special') return true;
  if (def.category === 'produce') {
    try {
      return !!cropDef(itemId.replace('produce_', 'crop_')).isFlower;
    } catch { return false; }
  }
  return false;
}

export interface GiftableEntry {
  id: string;
  count: number;
  sell: number;
}

export function giftableItems(state: GameState): GiftableEntry[] {
  return Object.entries(state.inventory)
    .filter(([id, n]) => n > 0 && isGiftableItem(id))
    .map(([id, n]) => ({ id, count: n, sell: itemDef(id).sell }))
    .sort((a, b) => b.sell - a.sell);
}

export function giftToNeighbor(
  state: GameState, ns: NeighborState, itemId: string, now: number,
): ActionResult {
  simulateNeighbor(ns, now);
  if (ns.giftedToday >= GIFT_PER_NEIGHBOR_PER_DAY) return fail('msg.giftLimit');
  if (!isGiftableItem(itemId)) return fail('msg.notGiftable');
  if (itemCount(state, itemId) < 1) return fail('msg.notEnough');

  const persona = neighborDef(ns.defId);
  const def = itemDef(itemId);
  removeItem(state, itemId, 1);
  ns.giftedToday += 1;
  let gain = Math.max(2, Math.min(12, Math.round(def.sell / 15)));
  // 送对方最喜欢的作物产出，好感额外 +50%
  try {
    if (cropDef(persona.favoriteCrop).produceId === itemId) gain = Math.round(gain * 1.5);
  } catch { /* 忽略 */ }
  const bday = birthdayInfo(state, ns, now);
  const events: GameEvent[] = [];
  if (bday.canGift) {
    gain *= 2;
    ns.lastBirthdayYear = bday.year;
    addItem(state, 'item_birthday_cake', 1);
    gainCoins(state, 150);
    events.push(
      { type: 'birthday', target: ns.defId, amount: 1 },
      { type: 'toast', target: 'msg.birthdayGift', amount: 150, data: 'item_birthday_cake' },
    );
  }
  events.push(
    { type: 'gift', target: ns.defId, amount: 1, data: itemId },
    { type: 'toast', target: 'msg.giftGiven', amount: gain, data: itemId },
    ...friendshipGain(state, ns, gain),
  );
  return { ok: true, events };
}

export interface BirthdayInfo {
  isBirthday: boolean;
  canGift: boolean;
  year: number;
  season: 'spring' | 'summer' | 'autumn' | 'winter';
  day: number;
}

export function birthdayInfo(state: GameState, ns: NeighborState, now: number): BirthdayInfo {
  const persona = neighborDef(ns.defId);
  const cal = calendarAt(state.createdAt, now, state.seed);
  const year = Math.floor(cal.dayIndex / (DAYS_PER_SEASON * 4));
  const isBirthday = cal.season === persona.birthday.season && cal.dayOfSeason === persona.birthday.day;
  return {
    isBirthday,
    canGift: isBirthday && (ns.lastBirthdayYear ?? -1) !== year,
    year,
    season: persona.birthday.season,
    day: persona.birthday.day,
  };
}

export function nextNeighborReward(ns: NeighborState) {
  return NEIGHBOR_REWARDS[ns.rewardTier] ?? null;
}

// ---------------------------------------------------------------- 每日聊天

export type ChatTopic = 'crop' | 'island' | 'joke';

export interface ChatReply {
  topic: ChatTopic;
  greeting: L10n;
  reply: L10n;
  gain: number;
}

export interface ChatActionResult extends ActionResult {
  chat?: ChatReply;
}

export function chatAvailable(ns: NeighborState): boolean {
  return (ns.chattedToday ?? 0) < 1;
}

export function chatWithNeighbor(
  state: GameState, ns: NeighborState, topic: ChatTopic, now: number,
): ChatActionResult {  simulateNeighbor(ns, now);
  if (!chatAvailable(ns)) return fail('msg.chatDone');
  const persona = neighborDef(ns.defId);
  const cropName = cropDef(persona.favoriteCrop).name;
  const greeting = pick(roll, persona.greetings);

  let reply: L10n;
  let gain: number;
  if (topic === 'crop') {
    reply = {
      zh: `说到${cropName.zh}，我可有一手。下次送你几颗。`,
      en: `When it comes to ${cropName.en}, I know my stuff. I'll save you some.`,
    };
    gain = 3;
  } else if (topic === 'island') {
    reply = {
      zh: '最近岛上越来越热闹了，都是你的功劳。',
      en: 'The island has been so lively lately — that is your doing.',
    };
    gain = 2;
  } else {
    reply = pick(roll, [
      { zh: '哈哈哈，这个笑话我记下了，下次讲给别人听。', en: "Ha! I'm saving that joke for the next person." },
      { zh: '……冷死了，但我还是笑了。', en: '...That was terrible. But I laughed.' },
    ]);
    gain = roll() < 0.5 ? 4 : 1;
  }

  ns.chattedToday = 1;
  return {
    ok: true,
    chat: { topic, greeting, reply, gain },
    events: [
      { type: 'chat', target: ns.defId, amount: 1 },
      ...friendshipGain(state, ns, gain),
    ],
  };
}

export function claimNeighborReward(state: GameState, ns: NeighborState): ActionResult {
  const reward = nextNeighborReward(ns);
  if (!reward) return fail('msg.allClaimed');
  if (friendshipLevel(ns.friendship) < reward.level) return fail('msg.notReady');
  ns.rewardTier += 1;
  const events: GameEvent[] = [...gainCoins(state, reward.coins)];
  events.push({ type: 'toast', target: 'msg.neighborReward', amount: reward.coins });
  return { ok: true, events };
}

// ---------------------------------------------------------------- 好感剧情

export function availableNeighborStory(ns: NeighborState): { tier: number; level: number } | null {
  const tier = ns.storyTier ?? 0;
  if (tier >= NEIGHBOR_STORY_LEVELS.length) return null;
  const level = NEIGHBOR_STORY_LEVELS[tier];
  if (friendshipLevel(ns.friendship) < level) return null;
  return { tier: tier + 1, level };
}

export function neighborStoryPages(ns: NeighborState, tier: number): L10n[] {
  const persona = neighborDef(ns.defId);
  const cropName = cropDef(persona.favoriteCrop).name;
  if (tier === 1) {
    return [
      { zh: '最近总麻烦你照看我的岛，进屋坐坐吧。', en: 'You have been helping my island a lot lately. Come in and sit for a while.' },
      { zh: `桌上摆着刚收的${cropName.zh}，还有一壶热茶。`, en: `The table is set with fresh ${cropName.en} and a pot of hot tea.` },
      { zh: '以后这片岛，也算有你一份。', en: 'From now on, this island is partly yours too.' },
    ];
  }
  return [
    { zh: '陪我去海边走走吧，有样东西想给你。', en: 'Walk with me to the shore — I have something for you.' },
    { zh: '这个给你——是我留着很久的东西。', en: 'Here, take this. I have kept it for a long time.' },
    { zh: '谢谢你一直都在。', en: 'Thank you for always being here.' },
  ];
}

export function playNeighborStory(state: GameState, ns: NeighborState): ActionResult {
  const tier = ns.storyTier ?? 0;
  if (tier >= NEIGHBOR_STORY_LEVELS.length) return fail('msg.allClaimed');
  const level = NEIGHBOR_STORY_LEVELS[tier];
  if (friendshipLevel(ns.friendship) < level) return fail('msg.notReady');

  ns.storyTier = tier + 1;
  const coins = NEIGHBOR_STORY_COINS[tier];
  gainCoins(state, coins);
  addItem(state, 'item_memory_photo', 1);
  return {
    ok: true,
    events: [
      { type: 'story', target: ns.defId, amount: 1 },
      { type: 'toast', target: 'msg.storyReward', amount: coins },
    ],
  };
}

export { clearOwnWeed };