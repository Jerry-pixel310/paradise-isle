/**
 * 核心类型契约 —— 整个游戏的数据模型。
 * core/ 层是确定性的纯逻辑：不依赖 DOM，所有时间都以毫秒时间戳显式传入，
 * 因此可以在 Node (Vitest) 里完整测试，也天然支持离线进度结算。
 */
import type { Season, Weather } from './calendar';

// ---------------------------------------------------------------- 基础

/** 双语文案：数据表内联中英文，运行时按语言取用 */
export interface L10n {
  zh: string;
  en: string;
}

export type Lang = 'zh' | 'en';

export type ItemCategory =
  | 'seed'        // 种子（含树苗）
  | 'produce'     // 作物产出
  | 'animalGood'  // 动物产出
  | 'fish'        // 鱼
  | 'forage'      // 采摘的野生资源
  | 'meat'        // 狩猎获得的肉
  | 'pelt'        // 狩猎获得的皮毛
  | 'bait'        // 鱼饵
  | 'material'    // 野兽掉落等材料
  | 'dish'        // 烹饪料理（可食用）
  | 'bouquet'     // 花束（可插花瓶/送礼）
  | 'tool'        // 鱼竿等工具
  | 'special';    // 礼物/宝箱等

export interface ItemDef {
  id: string;
  name: L10n;
  category: ItemCategory;
  /** 出售单价（金币）；0 = 不可出售 */
  sell: number;
  desc?: L10n;
  /** 食用后恢复能量 */
  useEnergy?: number;
  /** 食用后增加食物资源 */
  useFood?: number;
}

// ---------------------------------------------------------------- 作物

export interface CropDef {
  id: string;              // crop_xxx
  name: L10n;
  seedId: string;          // 对应种子物品
  produceId: string;       // 对应产出物品
  unlockLevel: number;
  seedPrice: number;       // 种子买价（金币）
  sellPrice: number;       // 产出卖价（金币/个）
  xp: number;              // 收获经验
  foodYield: number;       // 收获获得的食物资源
  growMs: number;          // 总生长时长
  witherMs: number;        // 成熟后多久枯萎（树不枯萎）
  yieldMin: number;
  yieldMax: number;
  isTree: boolean;
  /** 花卉：种子单独上架"花卉"页，收获时计入花卉统计 */
  isFlower?: boolean;
  /** 杂交品种：不出现在商店，只能通过花卉杂交获得 */
  isHybrid?: boolean;
  /** 节日限定：不在普通商店出售 */
  festivalOnly?: boolean;
  /** 花卉种在田里时为岛屿提供的固定美观值 */
  flowerBeauty?: number;
  regrowMs?: number;       // 树：重复结果周期
  sprite: string;          // paint key
}

/** 作物实例上的生长速度倍率（种植时按季节写入） */
export interface FlowerGenes {
  /** 色相 0-360 */
  hue: number;
  /** 活力 0-1，影响出售加成 */
  vigor: number;
  /** 第几代 */
  generation: number;
}

export interface PlantedCrop {
  defId: string;
  plantedAt: number;
  /** 浇水累计缩短的生长时间（毫秒）。浇一次水减少剩余时间的一部分。 */
  wateredBonusMs: number;
  /** 最近一次浇水时间（限制浇水频率 & 视觉湿润效果） */
  lastWateredAt: number;
  /** 种植时的季节生长倍率（冬天更慢） */
  speedMul?: number;
  /** 花卉基因（花色/活力/代数） */
  genes?: FlowerGenes;
  /** 树专用：上次采收时间（首次成熟按 plantedAt+growMs 计） */
  lastHarvestAt?: number;
}

export type CropStage = 'seedling' | 'growing' | 'mature' | 'ready' | 'withered';

export interface FarmPlot {
  uid: number;
  x: number;
  y: number;
  crop: PlantedCrop | null;
}

// ---------------------------------------------------------------- 动物

export interface AnimalDef {
  id: string;              // animal_xxx
  name: L10n;
  unlockLevel: number;
  buyPrice: number;        // 金币
  produceId: string;
  produceMs: number;       // 喂食后到产出的时长
  feedCost: number;        // 每次喂食消耗食物
  xp: number;              // 收取产出经验
  produceMin: number;
  produceMax: number;
  sprite: string;
}

export interface AnimalInstance {
  uid: number;
  defId: string;
  x: number;
  y: number;
  /** null = 饥饿待喂食；否则为喂食时间戳 */
  fedAt: number | null;
  /** 幼崽出生时间；不填 = 成年 */
  birthAt?: number;
  /** 上次繁殖时间 */
  lastBreedAt?: number;
}

// ---------------------------------------------------------------- 野兽

export interface BeastDef {
  id: string;              // beast_xxx
  name: L10n;
  minLevel: number;        // 玩家达到该等级后才会出现
  hp: number;              // 需要命中的次数（基准）
  atk: number;             // 每次反击破坏作物的概率权重
  coinMin: number;
  coinMax: number;
  xp: number;
  dropId?: string;         // 材料掉落
  dropChance?: number;     // 0-1
  rare: boolean;
  sprite: string;
}

export interface BeastInstance {
  uid: number;
  defId: string;
  x: number;
  y: number;
  hp: number;              // 剩余命中数
  spawnedAt: number;
}

// ---------------------------------------------------------------- 采摘

export interface ForageDef {
  id: string;              // forage_xxx
  name: L10n;
  itemId: string;          // 收获物
  sell: number;            // 收获物单价
  xp: number;
  food: number;
  /** 只会刷在这种地形上 */
  terrain: 'grass' | 'sand';
  /** 刷新权重 */
  weight: number;
  sprite: string;
}

export interface ForageSpot {
  uid: number;
  defId: string;
  x: number;
  y: number;
  spawnedAt: number;
}

// ---------------------------------------------------------------- 狩猎

export interface GameDef {
  id: string;              // game_xxx
  name: L10n;
  minLevel: number;
  /** 需要命中几次 */
  hp: number;
  /** 瞄准区宽度（0-1），越小越难 */
  zone: number;
  /** 指针往返速度（每秒来回比例） */
  speed: number;
  meatId: string;
  peltId?: string;
  peltChance?: number;
  coinMin: number;
  coinMax: number;
  xp: number;
  sprite: string;
}

export interface GameAnimalInstance {
  uid: number;
  defId: string;
  x: number;
  y: number;
  hp: number;
  spawnedAt: number;
  /** 最近留下的脚印（渲染 + 追踪用），最多保留 6 个 */
  trail?: { x: number; y: number; at: number }[];
  /** 被玩家惊跑的累计次数，到 3 次就彻底逃掉 */
  fleeCount?: number;
  /** 下次移动/逃跑判定的时间 */
  nextMoveAt?: number;
}

// ---------------------------------------------------------------- 钓鱼

export type FishRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

export interface FishDef {
  id: string;              // fish_xxx
  name: L10n;
  rarity: FishRarity;
  sellPrice: number;
  xp: number;
  minRodTier: number;      // 需要的最低鱼竿等级 1-3
  /** 出现季节；不填 = 全年 */
  seasons?: Season[];
  /** 出现天气；不填 = 不限 */
  weather?: Weather[];
  /** 昼夜偏好；不填 = 全天 */
  time?: 'day' | 'night';
  sprite: string;
  desc?: L10n;
}

// ---------------------------------------------------------------- 鱼饵

export interface BaitDef {
  id: string;
  name: L10n;
  itemId: string;
  /** 单份价格 */
  price: number;
  desc: L10n;
}

// ---------------------------------------------------------------- 建筑装饰

export type BuildCategory = 'house' | 'decor' | 'path' | 'nature' | 'functional';

export interface BuildingDef {
  id: string;              // bld_xxx
  name: L10n;
  category: BuildCategory;
  price: number;
  unlockLevel: number;
  w: number;               // 占地宽（格）
  h: number;
  beauty: number;          // 美观值
  xp: number;              // 首次摆放经验
  sprite: string;
  desc?: L10n;
}

export interface Placement {
  uid: number;
  defId: string;
  x: number;               // 左上角格坐标
  y: number;
  rot: 0 | 1;              // 0 正常 / 1 镜像
  /** 花瓶等容器里插的花束 item id */
  variant?: string;
}

// ---------------------------------------------------------------- 换装

export type ClothingSlot = 'skin' | 'hair' | 'face' | 'top' | 'bottom' | 'hat' | 'accessory';

export interface ClothingDef {
  id: string;              // cl_xxx
  name: L10n;
  slot: ClothingSlot;
  price: number;           // 0 = 初始拥有
  unlockLevel: number;
  /** 绘制参数：颜色等，交给纸娃娃 painter 解释 */
  paint: Record<string, string>;
}

export interface AvatarConfig {
  skin: string;            // ClothingDef id per slot
  hair: string;
  face: string;
  top: string;
  bottom: string;
  hat: string | null;
  accessory: string | null;
}

// ---------------------------------------------------------------- 宠物

export interface PetDef {
  id: string;              // pet_xxx
  name: L10n;
  price: number;
  unlockLevel: number;
  /** 被动技能标识：scare_beast / find_gift / cheer(能量回复加速) / lucky_fish */
  skill: 'scare_beast' | 'find_gift' | 'cheer' | 'lucky_fish';
  skillDesc: L10n;
  sprite: string;
}

export interface PetInstance {
  uid: number;
  defId: string;
  name: string;
  adoptedAt: number;
  /** 上次喂食（决定饥饿度，惰性计算） */
  fedAt: number;
  /** 上次玩耍 */
  playedAt: number;
  xp: number;              // 宠物成长经验（喂食/玩耍累积）
  /** 技能上次触发时间（如小狗驱兽 CD） */
  skillUsedAt: number;
  x: number;
  y: number;
  /** 宠物跟随玩家的下一次移动时间 */
  nextMoveAt?: number;
  /** 上次训练时间（冷却） */
  lastTrainedAt?: number;
  /** 上次参加宠物大赛的游戏日（YYYY-MM-DD） */
  lastContestDay?: string;
}

// ---------------------------------------------------------------- 节日

export interface FestivalOffer {
  id: string;
  itemId: string;
  qty: number;
  price: number;
}

export interface FestivalReward {
  coins: number;
  xp: number;
  items?: Record<string, number>;
}

export interface FestivalActivityDef {
  /** 统计口径：采花 / 钓鱼 / 收作物 / 采摘 */
  metric: 'flower' | 'fish' | 'crop' | 'forage';
  name: L10n;
  desc: L10n;
  /** 三档目标 */
  tiers: number[];
  rewards: FestivalReward[];
}

export interface FestivalDef {
  season: Season;
  name: L10n;
  desc: L10n;
  color: string;
  offers: FestivalOffer[];
  gift: {
    coins: number;
    items: Record<string, number>;
  };
  activity: FestivalActivityDef;
}

export interface FestivalActivityState {
  season: Season;
  count: number;
  /** 已领取到第几档（0 = 还没领） */
  claimed: number;
}

export type DexCategory = 'fish' | 'forage' | 'game' | 'beasts';

export interface OrderState {
  /** YYYY-MM-DD */
  day: string;
  done: string[];
}

export interface CollectionsState {
  fish: Record<string, number>;
  beasts: Record<string, number>;
  forage: Record<string, number>;
  game: Record<string, number>;
  /** 已领取的图鉴里程碑档位 */
  claimed: Record<DexCategory, number>;
}

export type FurnitureSlot = 'bed' | 'table' | 'chair' | 'rug' | 'lamp' | 'shelf' | 'plant' | 'fireplace' | 'sofa' | 'tv' | 'counter' | 'stove' | 'fridge' | 'wardrobe' | 'vanity';

/** 小屋房间 */
export type RoomId = 'living' | 'bedroom' | 'kitchen';

export interface FurnitureDef {
  id: string;
  name: L10n;
  slot: FurnitureSlot;
  /** 只允许放在指定房间；不填 = 所有房间 */
  room?: RoomId;
  price: number;
  unlockLevel: number;
  beauty: number;
  /** 房间内占位（格） */
  x: number;
  y: number;
  w: number;
  h: number;
  sprite: string;
}

export interface InteriorPlacement {
  uid: number;
  defId: string;
  x: number;
  y: number;
  rot: 0 | 1;
}

export interface InteriorState {
  /** 已购买的家具 id */
  owned: string[];
  /** 每个房间自由摆放的家具 */
  rooms: Record<RoomId, InteriorPlacement[]>;
  /** 上次所在的房间 */
  activeRoom: RoomId;
}

// ---------------------------------------------------------------- 手作

export interface RecipeDef {
  id: string;
  name: L10n;
  tab: 'cook' | 'flower' | 'ranch';
  /** 消耗物品 → 数量 */
  inputs: Record<string, number>;
  outputId: string;
  outputCount: number;
  xp: number;
}

// ---------------------------------------------------------------- 任务成就

export type QuestEventType =
  | 'harvest'       // 收获作物 target=cropId 或 '*'
  | 'plant'
  | 'water'
  | 'feedAnimal'
  | 'collectAnimal'
  | 'fishCatch'     // target=rarity 或 '*'
  | 'forage'        // 采摘 target=forageId 或 '*'
  | 'hunt'          // 狩猎 target=gameId 或 '*'
  | 'breed'         // 花卉杂交
  | 'craft'         // 烹饪/花艺制作 target=recipeId
  | 'bait'          // 使用鱼饵
  | 'gift'          // 给邻居送礼
  | 'trainPet'      // 训练宠物
  | 'petContest'    // 参加宠物大赛
  | 'chat'          // 和邻居聊天
  | 'story'         // 观看邻居好感剧情
  | 'dex'           // 领取图鉴里程碑
  | 'order'         // 完成岛民订单
  | 'petSkill'      // 主动使用宠物技能
  | 'rating'        // 领取岛屿评级奖励
  | 'outfit'        // 保存穿搭预设
  | 'birthday'      // 领取生日回礼
  | 'pond'          // 鱼塘收获
  | 'restaurant'    // 餐厅营业
  | 'breedAnimal'   // 动物繁殖
  | 'furniture'     // 使用家具
  | 'museum'        // 博物馆捐赠
  | 'checkin'       // 每日签到
  | 'beastKill'
  | 'place'         // 摆放建筑 target=buildingId 或 '*' 或 category:xxx
  | 'buyClothing'
  | 'wear'
  | 'adoptPet'
  | 'feedPet'
  | 'playPet'
  | 'visit'
  | 'helpNeighbor'  // 帮工（浇水/除草/驱兽合计）
  | 'prank'
  | 'hire'
  | 'clearWeed'
  | 'sell'
  | 'expand'
  | 'reachLevel'    // count=目标等级
  | 'earnCoins'     // 累计获得金币
  | 'tillPlot';

export interface QuestStep {
  type: QuestEventType;
  target?: string;         // 未填 = 任意
  count: number;
}

export interface QuestReward {  coins?: number;
  xp?: number;
  food?: number;
  energy?: number;
  reputation?: number;
  items?: Record<string, number>;
}

export interface QuestDef {
  id: string;
  name: L10n;
  desc: L10n;
  steps: QuestStep[];
  reward: QuestReward;
  /** 前置任务（教程链） */
  after?: string;
  /** daily 池任务 */
  daily?: boolean;
  minLevel?: number;
}

export interface QuestProgress {
  defId: string;
  counts: number[];        // 与 steps 对齐
  startedAt: number;
}

export interface AchievementDef {
  id: string;
  name: L10n;
  desc: L10n;
  stat: string;            // 对应 state.stats 里的键
  tiers: number[];         // 阶梯目标
  rewardPerTier: QuestReward;
}

// ---------------------------------------------------------------- 邻居（NPC）

export interface NeighborPersona {
  id: string;              // npc_xxx
  name: L10n;
  avatar: AvatarConfig;
  islandSeed: number;
  /** 性格文案组 */
  greetings: L10n[];
  thanks: L10n[];
  angry: L10n[];
  favoriteCrop: string;
  /** 生日：季节 + 季节内第几天（0-6） */
  birthday: { season: Season; day: number };
}

/** 邻居岛的持久化状态（作物等随时间演化，惰性推进） */
export interface NeighborState {
  defId: string;
  friendship: number;      // 好友度
  plots: FarmPlot[];
  weeds: { uid: number; x: number; y: number }[];
  beasts: BeastInstance[];
  placements: Placement[];
  /** 上次惰性演化时间 */
  simulatedAt: number;
  /** 今日已在该邻居处执行的帮工/捣蛋/送礼次数（按天重置） */
  helpedToday: number;
  prankedToday: number;
  giftedToday: number;
  /** 今日是否已经聊过天（0/1） */
  chattedToday: number;
  /** 已领取的好友回礼档位 */
  rewardTier: number;
  /** 已观看的好感剧情档位（0/1/2） */
  storyTier: number;
  /** 上次领取生日回礼的年份 */
  lastBirthdayYear?: number;
  helpDay: string;         // YYYY-MM-DD
}

// ---------------------------------------------------------------- 岛屿

export type Terrain = 'water' | 'sand' | 'grass';

export interface WeedInstance {
  uid: number;
  x: number;
  y: number;
  spawnedAt: number;
}

// ---------------------------------------------------------------- 统计（成就依赖）

export interface Stats {
  harvests: number;
  plantings: number;
  waterings: number;
  animalsCollected: number;
  animalsFed: number;
  fishCaught: number;
  rareFishCaught: number;  // rare 及以上
  forages: number;         // 采摘次数
  hunts: number;           // 狩猎成功次数
  baitsUsed: number;       // 使用鱼饵次数
  giftsGiven: number;      // 给邻居送礼次数
  petTrainings: number;    // 宠物训练次数
  petContests: number;     // 宠物大赛参赛次数
  neighborChats: number;   // 和邻居聊天次数
  neighborStories: number; // 观看邻居好感剧情次数
  dexRewards: number;      // 领取图鉴里程碑次数
  ordersDone: number;      // 完成岛民订单次数
  petSkillsUsed: number;   // 主动使用宠物技能次数
  ratingClaims: number;    // 领取岛屿评级奖励次数
  outfitsSaved: number;    // 保存穿搭预设次数
  goldHarvests: number;    // 金品质收获次数
  silverHarvests: number;  // 银品质收获次数
  birthdayGifts: number;   // 领取生日回礼次数
  pondHarvests: number;    // 鱼塘收获次数
  restaurantServices: number; // 餐厅营业次数
  animalsBred: number;     // 动物繁殖次数
  furnitureUses: number;   // 家具互动次数
  museumDonations: number; // 博物馆捐赠次数
  checkins: number;        // 每日签到次数
  flowersHarvested: number; // 收获花卉次数
  breeds: number;          // 花卉杂交次数
  dishesCooked: number;    // 烹饪次数
  bouquetsMade: number;    // 花束制作次数
  beastsDefeated: number;
  weedsCleared: number;
  buildingsPlaced: number;
  clothesBought: number;
  petsAdopted: number;
  petFeeds: number;
  petPlays: number;
  visits: number;
  helps: number;
  pranks: number;
  hires: number;
  coinsEarned: number;
  coinsSpent: number;
  itemsSold: number;
  expansions: number;
  questsDone: number;
  daysPlayed: number;
  lastPlayDay: string;
  [key: string]: number | string;
}

// ---------------------------------------------------------------- 总状态

export interface PlayerState {
  name: string;
  level: number;
  xp: number;              // 当前等级内经验
  coins: number;
  food: number;
  reputation: number;
  energy: number;
  energyUpdatedAt: number; // 能量惰性恢复基准点
  avatar: AvatarConfig;
  /** 已拥有的服装 id */
  wardrobe: string[];
  rodTier: number;         // 鱼竿 1-3
  /** 玩家形象在岛上的位置（格坐标，浮点） */
  px: number;
  py: number;
}

export interface DailyState {
  day: string;             // YYYY-MM-DD
  questIds: string[];      // 今日刷出的每日任务
  completed: string[];
}

export interface GameState {
  version: number;
  createdAt: number;
  savedAt: number;
  uidCounter: number;
  seed: number;            // 世界种子（邻居岛/地形生成）
  player: PlayerState;
  islandTier: number;      // 1-5
  plots: FarmPlot[];
  placements: Placement[];
  animals: AnimalInstance[];
  pets: PetInstance[];
  beasts: BeastInstance[];
  forage: ForageSpot[];
  game: GameAnimalInstance[];
  weeds: WeedInstance[];
  nextBeastAt: number;
  nextWeedAt: number;
  nextForageAt: number;
  nextGameAt: number;
  inventory: Record<string, number>;
  quests: {
    tutorialDone: string[];
    active: QuestProgress[];
    daily: DailyState;
  };
  achievements: Record<string, number>;  // id -> 已领取的 tier 数
  collections: CollectionsState;
  neighbors: NeighborState[];
  interior: InteriorState;
  /** 带基因的花种：seedId -> 基因列表（种植时取第一个） */
  seedBank: Record<string, FlowerGenes[]>;
  /** 每日岛民订单完成记录 */
  orders: OrderState;
  /** 临时增益 */
  buffs: { luckyFishUntil: number };
  /** 已领取的岛屿评级星级 */
  ratingClaimed: number;
  /** 3 套穿搭预设（null = 空槽） */
  outfits: (AvatarConfig | null)[];
  /** 鱼塘：placement uid -> 养殖状态 */
  fishPonds: Record<string, { fishId: string; count: number; stockedAt: number }>;
  /** 餐厅：placement uid -> 菜单与营业日 */
  restaurants: Record<string, { menu: (string | null)[]; lastDay: string }>;
  /** 家具每日使用记录：placement uid -> YYYY-MM-DD */
  furnitureUses: Record<string, string>;
  /** 博物馆捐赠：物种 id 列表 + 已领取里程碑 */
  museum: { donated: string[]; claimed: number };
  /** 每日签到 */
  checkin: { lastDay: string; streak: number; total: number };
  /** 当前装备的称号 id */
  title: string;
  /** 节日状态：上次领取礼物的游戏日 + 当季活动进度 */
  festival: {
    lastGiftDay: number;
    activity: FestivalActivityState;
  };
  stats: Stats;
  /** 最近一次雨天自动浇灌的游戏日（避免同一天重复生效） */
  lastRainDay?: number;
  settings: {
    lang: Lang;
    sound: boolean;
    music: boolean;
    /** 像素滤镜：低分辨率渲染 + 最近邻放大 */
    pixelate?: boolean;
    /** 无限体力：不消耗、不等待恢复（默认由 UI 开启） */
    unlimited?: boolean;
  };
}

// ---------------------------------------------------------------- 事件

/** 游戏动作产生的领域事件，任务/成就/音效/飘字都订阅它 */
export interface GameEvent {
  type: QuestEventType | 'levelUp' | 'coins' | 'toast' | 'achievement';
  target?: string;
  amount?: number;
  data?: unknown;
}

export type EventSink = (ev: GameEvent) => void;

/** 动作函数的统一结果 */
export interface ActionResult {
  ok: boolean;
  /** i18n key 或内联文案，失败原因 */
  reason?: string;
  events?: GameEvent[];
}

export const OK: ActionResult = { ok: true };

export function fail(reason: string): ActionResult {
  return { ok: false, reason };
}
