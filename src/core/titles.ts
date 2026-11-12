/**
 * 岛主称号：由成就/评级/签到等里程碑解锁，可装备并显示在 HUD 与名片上。
 */
import type { ActionResult, GameState, L10n } from './types';
import { fail } from './types';

export interface TitleDef {
  id: string;
  name: L10n;
  desc: L10n;
  unlock: (state: GameState) => boolean;
}

export const TITLES: TitleDef[] = [
  {
    id: 'title_novice',
    name: { zh: '新手岛主', en: 'New Islander' },
    desc: { zh: '每个人都是从第一天开始的。', en: 'Everyone starts on day one.' },
    unlock: () => true,
  },
  {
    id: 'title_harvester',
    name: { zh: '收获大师', en: 'Harvest Master' },
    desc: { zh: '累计收获 100 次作物。', en: 'Harvest 100 crops.' },
    unlock: (s) => s.stats.harvests >= 100,
  },
  {
    id: 'title_angler',
    name: { zh: '钓鱼佬', en: 'Angler' },
    desc: { zh: '累计钓到 50 条鱼。', en: 'Catch 50 fish.' },
    unlock: (s) => s.stats.fishCaught >= 50,
  },
  {
    id: 'title_forager',
    name: { zh: '采集专家', en: 'Forager' },
    desc: { zh: '累计采摘 30 次野生资源。', en: 'Forage 30 wild plants.' },
    unlock: (s) => s.stats.forages >= 30,
  },
  {
    id: 'title_hunter',
    name: { zh: '岛屿猎手', en: 'Island Hunter' },
    desc: { zh: '累计猎获 20 只野生动物。', en: 'Hunt 20 game animals.' },
    unlock: (s) => s.stats.hunts >= 20,
  },
  {
    id: 'title_chef',
    name: { zh: '岛主厨师', en: 'Island Chef' },
    desc: { zh: '累计烹饪 15 道料理。', en: 'Cook 15 dishes.' },
    unlock: (s) => s.stats.dishesCooked >= 15,
  },
  {
    id: 'title_florist',
    name: { zh: '花艺师', en: 'Florist' },
    desc: { zh: '累计收获 20 次花卉。', en: 'Harvest 20 flowers.' },
    unlock: (s) => s.stats.flowersHarvested >= 20,
  },
  {
    id: 'title_breeder',
    name: { zh: '育种家', en: 'Breeder' },
    desc: { zh: '累计杂交 5 次花卉。', en: 'Crossbreed flowers 5 times.' },
    unlock: (s) => s.stats.breeds >= 5,
  },
  {
    id: 'title_rancher',
    name: { zh: '牧场主', en: 'Rancher' },
    desc: { zh: '累计繁殖 10 只动物。', en: 'Breed 10 animals.' },
    unlock: (s) => s.stats.animalsBred >= 10,
  },
  {
    id: 'title_designer',
    name: { zh: '岛屿设计师', en: 'Isle Designer' },
    desc: { zh: '累计摆放 25 个建筑装饰。', en: 'Place 25 buildings/decorations.' },
    unlock: (s) => s.stats.buildingsPlaced >= 25,
  },
  {
    id: 'title_curator',
    name: { zh: '博物馆馆长', en: 'Museum Curator' },
    desc: { zh: '向博物馆捐赠 25 件展品。', en: 'Donate 25 museum exhibits.' },
    unlock: (s) => s.museum.donated.length >= 25,
  },
  {
    id: 'title_star',
    name: { zh: '五星岛主', en: 'Five-Star Islander' },
    desc: { zh: '领取全部 5 个岛屿评级奖励。', en: 'Claim all 5 island rating rewards.' },
    unlock: (s) => s.ratingClaimed >= 5,
  },
  {
    id: 'title_regular',
    name: { zh: '签到元老', en: 'Check-in Veteran' },
    desc: { zh: '累计签到 30 天。', en: 'Check in 30 days.' },
    unlock: (s) => s.checkin.total >= 30,
  },
  {
    id: 'title_tycoon',
    name: { zh: '金币大亨', en: 'Coin Tycoon' },
    desc: { zh: '累计赚取 100,000 金币。', en: 'Earn 100,000 coins.' },
    unlock: (s) => s.stats.coinsEarned >= 100_000,
  },
];

const TITLE_MAP = new Map(TITLES.map((t) => [t.id, t]));

export function titleDef(id: string): TitleDef {
  return TITLE_MAP.get(id) ?? TITLES[0];
}

export function titleUnlocked(state: GameState, id: string): boolean {
  const def = TITLE_MAP.get(id);
  return !!def && def.unlock(state);
}

export function unlockedTitles(state: GameState): TitleDef[] {
  return TITLES.filter((t) => t.unlock(state));
}

export function equipTitle(state: GameState, id: string): ActionResult {
  const def = TITLE_MAP.get(id);
  if (!def) return fail('msg.notFound');
  if (!def.unlock(state)) return fail('msg.titleLocked');
  state.title = id;
  return {
    ok: true,
    events: [
      { type: 'toast', target: 'msg.titleEquipped', data: id },
    ],
  };
}
