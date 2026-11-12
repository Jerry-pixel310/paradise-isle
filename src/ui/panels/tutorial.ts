/**
 * 新手教程：把每个模块的最短上手路径集中在一页，并可直接跳转。
 */
import type { L10n } from '../../core/types';
import { t, tl } from '../../i18n';
import { h, spriteImg } from '../dom';
import { closePanel, openPanel } from '../modal';

export interface TutorialCtx {
  onOpen: (panel: string) => void;
}

interface Lesson {
  icon: string;
  title: L10n;
  goal: L10n;
  steps: L10n[];
  panel?: string;
}

const LESSONS: Lesson[] = [
  {
    icon: 'icon:seed_carrot',
    title: { zh: '农场', en: 'Farming' },
    goal: { zh: '种下并收获第一颗胡萝卜', en: 'Plant and harvest your first carrot' },
    steps: [
      { zh: '点底部「商店」买种子；初始会送胡萝卜种子。', en: 'Open Shop and buy seeds; you start with carrot seeds.' },
      { zh: '点空地开垦，再点田块选择种子播种。', en: 'Tap grass to till, then tap the plot and choose a seed.' },
      { zh: '点田块浇水，成熟后会出现 ✓，再点收获。', en: 'Water the plot; when ✓ appears, tap to harvest.' },
    ],
    panel: 'shop',
  },
  {
    icon: 'fish:fish_sardine',
    title: { zh: '钓鱼 / 打猎 / 采摘', en: 'Fishing / Hunting / Foraging' },
    goal: { zh: '获取野外资源', en: 'Gather resources in the wild' },
    steps: [
      { zh: '钓鱼：点岸边水面，选鱼饵或空钩；咬钩后连点，让指针停在绿区。', en: 'Fishing: tap water by the shore, pick bait; tap rapidly and keep the marker in the green zone.' },
      { zh: '打猎：跟着脚印找到猎物，按住蓄力到 60–90% 再放箭。', en: 'Hunting: follow tracks, hold to draw to 60–90%, then release.' },
      { zh: '采摘：草地和沙滩会刷新野莓、蘑菇、贝壳，直接点。', en: 'Foraging: tap berries, mushrooms and shells on grass or sand.' },
    ],
  },
  {
    icon: 'animal:animal_cow',
    title: { zh: '牧场', en: 'Ranch' },
    goal: { zh: '养动物并收取产出', en: 'Raise animals and collect produce' },
    steps: [
      { zh: '在商店买动物和饲料，动物会出现在草地上。', en: 'Buy animals and feed in the Shop; they appear on the grass.' },
      { zh: '点动物喂食，等产出后会出现 ✓，再点收取。', en: 'Tap an animal to feed; when ✓ appears, tap to collect.' },
      { zh: '两只同种成年动物可以繁殖，幼崽长大后可继续养。', en: 'Two adult animals of the same species can breed; babies grow up.' },
    ],
    panel: 'shop',
  },
  {
    icon: 'pet:pet_puppy',
    title: { zh: '宠物', en: 'Pets' },
    goal: { zh: '领养并训练第一只宠物', en: 'Adopt and train your first pet' },
    steps: [
      { zh: '商店领养宠物，宠物会跟在你身边。', en: 'Adopt a pet in the Shop; it will follow you.' },
      { zh: '点宠物喂食、玩耍、训练；训练是接飞盘小游戏。', en: 'Tap the pet to feed, play or train; training is a frisbee mini-game.' },
      { zh: '技能与宠物大赛也在宠物菜单里，大赛按等级/技能评 S/A/B/C。', en: 'Skills and the pet contest are in the pet menu; contests rank S/A/B/C.' },
    ],
    panel: 'shop',
  },
  {
    icon: 'bld:bld_hut',
    title: { zh: '建造', en: 'Building' },
    goal: { zh: '放下第一栋建筑', en: 'Place your first building' },
    steps: [
      { zh: '在商店买建筑，购买后会进入摆放状态。', en: 'Buy a building in the Shop; placement mode starts.' },
      { zh: '点一块空地放下；红色表示不能放。', en: 'Tap open ground to place; red means blocked.' },
      { zh: '点底部「布置」可以移动、旋转或回收建筑。', en: 'Use Decorate to move, rotate or recover buildings.' },
    ],
    panel: 'shop',
  },
  {
    icon: 'furn:furn_bed_basic',
    title: { zh: '室内 / 家具', en: 'Home / Furniture' },
    goal: { zh: '布置小屋并和家具互动', en: 'Furnish your home and use furniture' },
    steps: [
      { zh: '有房屋后点底部「小屋」进入室内。', en: 'With a house, tap House to go inside.' },
      { zh: '顶部切换客厅/卧室/厨房，家具目录购买并摆放。', en: 'Switch living room / bedroom / kitchen, buy and place furniture.' },
      { zh: '点床、沙发、壁炉、电视可以每日恢复体力。', en: 'Tap bed, sofa, fireplace or TV for a daily energy boost.' },
    ],
  },
  {
    icon: 'icon:dish_grilled_fish',
    title: { zh: '手作 / 餐厅 / 鱼塘', en: 'Crafting / Restaurant / Pond' },
    goal: { zh: '把原料变成金币', en: 'Turn materials into coins' },
    steps: [
      { zh: '打开「手作」，做料理、花束或牧场加工。', en: 'Open Crafting to cook dishes, bouquets or ranch goods.' },
      { zh: '餐厅：设 2 道菜单，每天营业一次换金币/声望。', en: 'Restaurant: set 2 dishes, serve once a day for coins/reputation.' },
      { zh: '鱼塘：投苗，2 小时后收获更多同种鱼。', en: 'Pond: stock fish, harvest more of the same fish after 2 hours.' },
    ],
    panel: 'crafting',
  },
  {
    icon: 'fx:coin',
    title: { zh: '商店 / 背包', en: 'Shop / Bag' },
    goal: { zh: '买对东西，卖掉多余物资', en: 'Buy the right things and sell extras' },
    steps: [
      { zh: '商店分种子、工具、建筑、服装等页签。', en: 'Shop tabs cover seeds, tools, buildings and clothing.' },
      { zh: '背包按类别筛选，可食用、出售或全部出售。', en: 'Filter the Bag, then eat, sell or sell all.' },
      { zh: '金币不够就做订单或卖鱼/作物。', en: 'Short on coins? Fill orders or sell fish/crops.' },
    ],
    panel: 'inventory',
  },
  {
    icon: 'fx:ready',
    title: { zh: '任务 / 图鉴', en: 'Quests / Field Guide' },
    goal: { zh: '知道下一步该做什么', en: 'Know what to do next' },
    steps: [
      { zh: '任务日志：新手任务、日常、订单、评级、成就。', en: 'Quest log: tutorial, daily, orders, rating and achievements.' },
      { zh: '图鉴记录鱼/野物/野兽，按收集数领奖励。', en: 'Field guide tracks fish, forage and beasts, with collection rewards.' },
      { zh: '评级页按美观/等级/宠物/邻居/图鉴评星。', en: 'Rating page scores beauty, level, pets, neighbours and collection.' },
    ],
    panel: 'quests',
  },
  {
    icon: 'fx:heart',
    title: { zh: '邻居 / 节日 / 签到', en: 'Neighbours / Festivals / Check-in' },
    goal: { zh: '每天领资源和提升好感', en: 'Claim daily rewards and build friendships' },
    steps: [
      { zh: '邻居：送礼、聊天、生日当天送礼翻倍。', en: 'Neighbours: gift, chat; birthday gifts are doubled.' },
      { zh: '节日：每天领礼物，买当季限定，做活动挑战。', en: 'Festivals: daily gift, seasonal offers and challenges.' },
      { zh: '签到：连续签到奖励递增，断签会重置。', en: 'Check-in: streak rewards grow; missing a day resets it.' },
    ],
    panel: 'neighbors',
  },
  {
    icon: 'icon:item_shell',
    title: { zh: '换装 / 名片', en: 'Wardrobe / Profile' },
    goal: { zh: '搭配造型并装备称号', en: 'Style your islander and equip a title' },
    steps: [
      { zh: '「换装」选肤色、发型、表情、衣帽和配饰。', en: 'Wardrobe: skin, hair, face, clothes, hats and accessories.' },
      { zh: '顶部有搭配评分，可保存 3 套常用搭配。', en: 'The score ring rates looks; save up to 3 outfits.' },
      { zh: '点左上角头像打开名片，解锁并装备称号。', en: 'Tap the portrait for Profile; unlock and equip titles.' },
    ],
    panel: 'wardrobe',
  },
  {
    icon: 'bld:bld_museum',
    title: { zh: '博物馆', en: 'Museum' },
    goal: { zh: '捐出已发现的物种', en: 'Donate discovered species' },
    steps: [
      { zh: '在商店买博物馆并放到岛上。', en: 'Buy the Museum in the Shop and place it.' },
      { zh: '点博物馆，把图鉴里已发现的物种捐进展柜。', en: 'Tap the Museum and donate species you have discovered.' },
      { zh: '按捐赠数量领里程碑奖励。', en: 'Claim milestone rewards by donation count.' },
    ],
    panel: 'collections',
  },
  {
    icon: 'fx:sleep',
    title: { zh: '设置 / 存档 / 无限体力', en: 'Settings / Saves / Unlimited' },
    goal: { zh: '保护进度，按自己的节奏玩', en: 'Protect progress and play at your pace' },
    steps: [
      { zh: '无限体力默认开启，爱心显示 ∞，不再等待恢复。', en: 'Unlimited energy is on by default; the heart shows ∞ and never waits.' },
      { zh: '重要进度用「设置 → 导出存档」备份，新电脑可导入。', en: 'Back up with Settings → Export save; import on another device.' },
      { zh: '设置里还能切换语言、音乐、音效和像素滤镜。', en: 'Settings also has language, music, sound and pixel filter.' },
    ],
    panel: 'settings',
  },
];

export function openTutorial(ctx: TutorialCtx): void {
  openPanel({
    title: t('tut.title'),
    className: 'panel-wide',
    body: (body) => {
      body.append(
        h('div', { class: 'tut-hero' },
          h('div', { class: 'market-kicker' }, 'ISLAND START GUIDE'),
          h('h3', {}, t('tut.hero')),
          h('p', {}, t('tut.sub')),
          h('div', { class: 'tut-badge' }, `∞ ${t('tut.unlimited')}`),
        ),
        h('div', { class: 'tut-grid' },
          ...LESSONS.map((lesson, i) => {
            const card = h('article', { class: 'tut-card' },
              h('div', { class: 'tut-card-top' },
                h('div', { class: 'tut-index' }, String(i + 1).padStart(2, '0')),
                spriteImg(lesson.icon, 'tut-icon'),
                h('div', {}, h('div', { class: 'tut-name' }, tl(lesson.title)), h('div', { class: 'tut-goal' }, tl(lesson.goal))),
              ),
              h('ol', { class: 'tut-steps' }, ...lesson.steps.map((s) => h('li', {}, tl(s)))),
            );
            if (lesson.panel) {
              card.append(h('button', {
                class: 'btn btn-sm tut-open',
                onclick: () => {
                  closePanel();
                  ctx.onOpen(lesson.panel as string);
                },
              }, `${t('tut.open')} →`));
            }
            return card;
          }),
        ),
        h('div', { class: 'panel-note' }, t('tut.note')),
      );
    },
  });
}
