/**
 * 鱼类图鉴：35 种，5 档稀有度。
 * minRodTier 限制：高级鱼需要更好的鱼竿才可能钓到。
 * seasons 限制：只在指定季节出现，不填则全年可钓。
 */
import type { FishDef, FishRarity } from '../core/types';
import type { Season, Weather } from '../core/calendar';

function fish(
  id: string, zh: string, en: string, rarity: FishRarity,
  sellPrice: number, xp: number, minRodTier: number,
  descZh?: string, descEn?: string,
): FishDef {
  return {
    id: `fish_${id}`,
    name: { zh, en },
    rarity, sellPrice, xp, minRodTier,
    sprite: `fish_${id}`,
    desc: descZh ? { zh: descZh, en: descEn || '' } : undefined,
  };
}

export const FISH_BASE: FishDef[] = [
  // common ×8
  fish('sardine',   '小沙丁',   'Sardine',      'common', 6,  2, 1),
  fish('anchovy',   '银凤尾',   'Anchovy',      'common', 8,  2, 1),
  fish('mackerel',  '花青鲭',   'Mackerel',     'common', 10, 3, 1),
  fish('crucian',   '白鲫',     'Crucian Carp', 'common', 12, 3, 1),
  fish('goby',      '滩虎鱼',   'Goby',         'common', 9,  2, 1),
  fish('smelt',     '冰湖胡瓜鱼', 'Smelt',      'common', 11, 3, 1),
  fish('shrimp',    '玻璃虾',   'Glass Shrimp', 'common', 7,  2, 1),
  fish('clam',      '月牙蛤',   'Moon Clam',    'common', 8,  2, 1),
  // uncommon ×6
  fish('seabream',  '红鲷',     'Sea Bream',    'uncommon', 25, 5, 1),
  fish('flounder',  '沙比目',   'Flounder',     'uncommon', 30, 6, 1),
  fish('squid',     '荧光鱿',   'Glow Squid',   'uncommon', 35, 6, 1),
  fish('pufferfish','气球鲀',   'Pufferfish',   'uncommon', 40, 7, 2),
  fish('lobster',   '青壳龙虾', 'Blue Lobster', 'uncommon', 48, 8, 2),
  fish('eel',       '海岛鳗',   'Isle Eel',     'uncommon', 42, 7, 2),
  // rare ×5
  fish('grouper',   '石斑王',   'King Grouper', 'rare', 90, 12, 2),
  fish('swordfish', '银剑鱼',   'Swordfish',    'rare', 120, 15, 2),
  fish('turtle',    '玳瑁龟',   'Hawksbill',    'rare', 150, 18, 2, '它背上的花纹像一张藏宝图。', 'Its shell looks like a treasure map.'),
  fish('rayfish',   '紫斑鳐',   'Violet Ray',   'rare', 135, 16, 3),
  fish('lionfish',  '狮子鱼',   'Lionfish',     'rare', 160, 18, 3),
  // epic ×3
  fish('marlin',    '碧海枪鱼', 'Azure Marlin', 'epic', 400, 32, 3),
  fish('sunfish',   '翻车太阳鱼', 'Ocean Sunfish', 'epic', 500, 38, 3, '慢吞吞地晒太阳，钓上来要花大力气。', 'It sunbathes lazily; reeling it in is a workout.'),
  fish('ghostfish', '幽灵灯鱼', 'Ghost Lantern', 'epic', 650, 45, 3),
  // legendary ×2
  fish('kraken',    '小海怪',   'Kraken Jr.',   'legendary', 2000, 90, 3, '传说中的深海之主……的幼体。', 'The legendary lord of the deep... as a baby.'),
  fish('goldkoi',   '鎏金锦鲤', 'Gilded Koi',   'legendary', 2600, 110, 3, '见到它的人会交好运，钓到它的人已经在走运了。', 'Seeing one brings luck. Catching one means you already have it.'),
  // 季节/天气/昼夜专属 ×6
  fish('sakuracarp', '樱花鲤',   'Sakura Carp',  'rare',      180, 20, 2, '只在春天晴朗的日子浮上水面。', 'Rises only on clear spring days.'),
  fish('starsnapper','星点鲷',   'Star Snapper', 'uncommon',   70,  9, 2, '入夜后鳞片会映出星光。', 'Its scales catch the stars after dark.'),
  fish('mapletrout', '枫叶鳟',   'Maple Trout',  'rare',      200, 22, 3, '秋雨里逆流而上的鳟鱼。', 'Swims upstream through autumn rain.'),
  fish('icefish',    '冰晶鱼',   'Ice Crystal Fish', 'epic',  700, 50, 3, '雪天才会出现的半透明小鱼。', 'A translucent fish that appears in snow.'),
  fish('moonjelly',  '月光水母', 'Moon Jelly',   'rare',      240, 26, 2, '月光下像一盏漂浮的灯。', 'Drifts like a lantern under the moon.'),
  fish('thundereel', '雷电鳗',   'Thunder Eel',  'epic',      650, 48, 3, '暴风雨里带着电光游动。', 'Crackles with lightning in storms.'),
  // 深海 ×5（需要 4/5 级鱼竿）
  fish('abysslantern', '深渊提灯鱼', 'Abyss Lantern', 'legendary', 3200, 130, 4, '在不见光的海沟里提着一盏小灯。', 'Carries a tiny lamp through the lightless trench.'),
  fish('crystalray',   '水晶鳐',     'Crystal Ray',   'epic',       850,  60, 4, '冬日晴空下，翅膀像冰一样透亮。', 'Its wings look like ice under a clear winter sky.'),
  fish('aurorafish',   '极光鱼',     'Aurora Fish',   'epic',       900,  65, 4, '雪夜水面会浮起极光般的鳞光。', 'Aurora-like scales rise to the surface on snowy nights.'),
  fish('leviathan',    '利维坦',     'Leviathan',     'legendary', 5000, 180, 5, '暴风雨夜里，海面下传来古老的低鸣。', 'On stormy nights an ancient rumble rises from below.'),
  fish('voidwhale',    '虚空鲸',     'Void Whale',    'legendary', 6000, 200, 5, '雪夜才浮上来的巨影，仿佛游在星海之间。', 'A giant that surfaces on snowy nights, swimming through stars.'),
];

/** 季节限定鱼；没列出的鱼全年可钓 */
const SEASON_MAP: Record<string, Season[]> = {
  fish_smelt: ['winter'],
  fish_seabream: ['spring', 'autumn'],
  fish_flounder: ['autumn', 'winter'],
  fish_squid: ['summer', 'autumn'],
  fish_pufferfish: ['winter', 'spring'],
  fish_lobster: ['summer'],
  fish_eel: ['summer'],
  fish_grouper: ['autumn', 'winter'],
  fish_swordfish: ['summer'],
  fish_turtle: ['summer', 'autumn'],
  fish_rayfish: ['winter'],
  fish_lionfish: ['summer'],
  fish_marlin: ['summer', 'autumn'],
  fish_sunfish: ['summer'],
  fish_ghostfish: ['winter'],
  fish_kraken: ['winter'],
  fish_goldkoi: ['spring'],
  fish_sakuracarp: ['spring'],
  fish_starsnapper: ['summer'],
  fish_mapletrout: ['autumn'],
  fish_icefish: ['winter'],
  fish_moonjelly: ['spring', 'summer', 'autumn', 'winter'],
  fish_thundereel: ['summer'],
  fish_abysslantern: ['winter'],
  fish_crystalray: ['winter'],
  fish_aurorafish: ['winter'],
  fish_leviathan: ['summer'],
  fish_voidwhale: ['winter'],
};

/** 天气限定鱼；没列出的鱼不限天气 */
const WEATHER_MAP: Record<string, Weather[]> = {
  fish_eel: ['rain', 'storm'],
  fish_squid: ['cloudy', 'rain', 'storm'],
  fish_pufferfish: ['cloudy', 'rain'],
  fish_ghostfish: ['cloudy', 'rain', 'storm'],
  fish_kraken: ['storm'],
  fish_marlin: ['sunny'],
  fish_sunfish: ['sunny'],
  fish_lobster: ['sunny'],
  fish_turtle: ['sunny', 'cloudy'],
  fish_goldkoi: ['sunny', 'cloudy'],
  fish_rayfish: ['cloudy', 'storm'],
  fish_seabream: ['sunny', 'cloudy'],
  fish_sakuracarp: ['sunny'],
  fish_starsnapper: ['sunny', 'cloudy'],
  fish_mapletrout: ['rain', 'storm'],
  fish_icefish: ['snow'],
  fish_moonjelly: ['sunny', 'cloudy'],
  fish_thundereel: ['storm'],
  fish_abysslantern: ['cloudy', 'storm'],
  fish_crystalray: ['sunny', 'cloudy'],
  fish_aurorafish: ['snow'],
  fish_leviathan: ['storm'],
  fish_voidwhale: ['snow', 'storm'],
};

/** 昼伏夜出的鱼；没列出的全天可钓 */
const TIME_MAP: Record<string, 'day' | 'night'> = {
  fish_ghostfish: 'night',
  fish_kraken: 'night',
  fish_eel: 'night',
  fish_goldkoi: 'day',
  fish_sunfish: 'day',
  fish_marlin: 'day',
  fish_turtle: 'day',
  fish_sakuracarp: 'day',
  fish_starsnapper: 'night',
  fish_mapletrout: 'day',
  fish_icefish: 'day',
  fish_moonjelly: 'night',
  fish_thundereel: 'day',
  fish_abysslantern: 'night',
  fish_crystalray: 'day',
  fish_aurorafish: 'night',
  fish_leviathan: 'night',
  fish_voidwhale: 'night',
};

export const FISH: FishDef[] = FISH_BASE.map((f) => ({
  ...f,
  seasons: SEASON_MAP[f.id],
  weather: WEATHER_MAP[f.id],
  time: TIME_MAP[f.id],
}));
