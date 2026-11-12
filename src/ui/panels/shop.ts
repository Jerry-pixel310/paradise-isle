/**
 * 岛屿商店：从长列表改为杂志式货架，每个分类有导语、商品卡与大图预览。
 */
import type { ActionResult, GameState } from '../../core/types';
import { allAnimals, allBait, allBuildings, allClothing, allCrops, allPets } from '../../core/registry';
import { buyAnimal } from '../../core/animals';
import { buyBait, buyClothing, buySeed, ROD_PRICES, upgradeRod } from '../../core/economy';
import { adoptPet } from '../../core/pets';
import { expandIsland } from '../../core/build';
import { ISLAND_TIERS } from '../../core/balance';
import { charKey, spriteDataUrl } from '../../render/sprites';
import { fmtDuration, t, tl } from '../../i18n';
import { h, clearChildren, spriteImg } from '../dom';
import { openPanel, promptDialog } from '../modal';

export interface ShopContext {
  state: GameState;
  now: () => number;
  dispatch: (r: ActionResult) => void;
  /** 购买建筑后进入摆放模式 */
  onPlaceBuilding: (defId: string) => void;
}

let activeTab = 'seeds';

export function openShop(ctx: ShopContext, tab?: string): void {
  if (tab) activeTab = tab;
  openPanel({
    title: t('panel.shop'),
    className: 'panel-wide market-panel',
    tabs: [
      { id: 'seeds', label: t('shop.seeds') },
      { id: 'flowers', label: t('shop.flowers') },
      { id: 'trees', label: t('shop.trees') },
      { id: 'animals', label: t('shop.animals') },
      { id: 'buildings', label: t('shop.buildings') },
      { id: 'clothing', label: t('shop.clothing') },
      { id: 'pets', label: t('shop.pets') },
      { id: 'tools', label: t('shop.tools') },
    ],
    activeTab,
    onTab: (id) => openShop(ctx, id),
    body: (body) => renderTab(body, ctx),
  });
}

interface Entry {
  icon: HTMLElement;
  name: string;
  lines: string[];
  price: number;
  unlockLevel: number;
  buyLabel: string;
  onBuy: () => void;
  owned?: boolean;
}

function marketCard(e: Entry, ctx: ShopContext): HTMLElement {
  const p = ctx.state.player;
  const locked = p.level < e.unlockLevel;
  const cantAfford = p.coins < e.price;
  const action = e.owned
    ? h('span', { class: 'owned-mark' }, t('ui.owned'))
    : locked
      ? h('span', { class: 'locked-mark' }, t('ui.lvRequire', { lv: e.unlockLevel }))
      : h('button', {
          class: `btn btn-sm ${cantAfford ? 'disabled' : 'btn-primary'}`,
          onclick: () => { if (!cantAfford) e.onBuy(); },
        }, e.price > 0 ? e.buyLabel : t('ui.free'));

  return h('article', { class: `market-card ${locked ? 'locked' : ''} ${e.owned ? 'owned' : ''}` },
    h('div', { class: 'market-icon' }, e.icon),
    h('div', { class: 'market-body' },
      h('div', { class: 'market-name' }, e.name),
      ...e.lines.map((line, i) => h('div', { class: i === 0 ? 'market-line' : 'market-sub' }, line)),
    ),
    h('div', { class: 'market-foot' },
      h('span', { class: 'market-price' },
        e.price > 0 ? `🪙 ${e.price}` : t('ui.free')),
      action,
    ),
  );
}

function clothingIcon(state: GameState, id: string, slot: string): HTMLElement {
  const avatar = { ...state.player.avatar, [slot]: id };
  const img = spriteImg('fx:sparkle', 'market-cloth-img');
  img.src = spriteDataUrl(charKey(avatar));
  return h('div', { class: 'market-cloth' }, img);
}

function renderTab(body: HTMLElement, ctx: ShopContext): void {
  clearChildren(body);
  const { state, dispatch } = ctx;
  const p = state.player;
  const entries: Entry[] = [];

  if (activeTab === 'seeds' || activeTab === 'flowers' || activeTab === 'trees') {
    const crops = allCrops()
      .filter((c) => (activeTab === 'trees' ? c.isTree : activeTab === 'flowers' ? !!c.isFlower : !c.isTree && !c.isFlower))
      .filter((c) => !c.isHybrid && !c.festivalOnly)
      .sort((a, b) => a.unlockLevel - b.unlockLevel);
    for (const c of crops) {
      entries.push({
        icon: spriteImg(`icon:${c.seedId}`, 'market-img'),
        name: tl(c.name),
        lines: [
          t('shop.grow', { t: fmtDuration(c.growMs) }),
          `${t('ui.sell')} ${c.sellPrice} × ${c.yieldMin}-${c.yieldMax} · ${t('ui.xp')}+${c.xp}`,
        ],
        price: c.seedPrice,
        unlockLevel: c.unlockLevel,
        buyLabel: t('ui.buy'),
        onBuy: () => { dispatch(buySeed(state, c.id, 1)); renderTab(body, ctx); },
      });
    }
  } else if (activeTab === 'animals') {
    for (const a of allAnimals().sort((x, y) => x.unlockLevel - y.unlockLevel)) {
      entries.push({
        icon: spriteImg(`animal:${a.id}`, 'market-img'),
        name: tl(a.name),
        lines: [
          t('shop.produce', { t: fmtDuration(a.produceMs) }),
          t('shop.feedCost', { n: a.feedCost }),
        ],
        price: a.buyPrice,
        unlockLevel: a.unlockLevel,
        buyLabel: t('ui.buy'),
        onBuy: () => { dispatch(buyAnimal(state, a.id, ctx.now())); renderTab(body, ctx); },
      });
    }
  } else if (activeTab === 'buildings') {
    for (const b of allBuildings().sort((x, y) => x.unlockLevel - y.unlockLevel || x.price - y.price)) {
      const lines = [t('shop.beauty', { n: b.beauty })];
      if (b.id === 'bld_sprinkler') lines.push(t('shop.sprinklerDesc'));
      if (b.id === 'bld_scarecrow') lines.push(t('shop.scarecrowDesc'));
      if (b.id === 'bld_fishpond') lines.push(t('shop.fishpondDesc'));
      if (b.id === 'bld_restaurant') lines.push(t('shop.restaurantDesc'));
      if (b.id === 'bld_museum') lines.push(t('shop.museumDesc'));
      entries.push({
        icon: spriteImg(`bld:${b.id}`, 'market-img'),
        name: tl(b.name),
        lines,
        price: b.price,
        unlockLevel: b.unlockLevel,
        buyLabel: t('ui.buy'),
        onBuy: () => ctx.onPlaceBuilding(b.id),
      });
    }
  } else if (activeTab === 'clothing') {
    for (const c of allClothing().filter((c) => c.price > 0).sort((x, y) => x.unlockLevel - y.unlockLevel)) {
      entries.push({
        icon: clothingIcon(state, c.id, c.slot),
        name: tl(c.name),
        lines: [t(`wd.${c.slot}`)],
        price: c.price,
        unlockLevel: c.unlockLevel,
        buyLabel: t('ui.buy'),
        onBuy: () => { dispatch(buyClothing(state, c.id)); renderTab(body, ctx); },
        owned: p.wardrobe.includes(c.id),
      });
    }
  } else if (activeTab === 'pets') {
    for (const pet of allPets().sort((x, y) => x.unlockLevel - y.unlockLevel)) {
      const owned = state.pets.some((i) => i.defId === pet.id);
      entries.push({
        icon: spriteImg(`pet:${pet.id}`, 'market-img'),
        name: tl(pet.name),
        lines: [tl(pet.skillDesc)],
        price: pet.price,
        unlockLevel: pet.unlockLevel,
        buyLabel: t('ui.buy'),
        onBuy: () => {
          promptDialog(t('shop.adoptName'), tl(pet.name), (name) => {
            ctx.dispatch(adoptPet(state, pet.id, name.trim() || tl(pet.name), ctx.now()));
            renderTab(body, ctx);
          });
        },
        owned,
      });
    }
  } else if (activeTab === 'tools') {
    for (const b of allBait()) {
      entries.push({
        icon: spriteImg(`icon:${b.itemId}`, 'market-img'),
        name: tl(b.name),
        lines: [tl(b.desc)],
        price: b.price * 5,
        unlockLevel: 1,
        buyLabel: t('shop.buyBait', { n: 5 }),
        onBuy: () => { dispatch(buyBait(state, b.id, 5)); renderTab(body, ctx); },
      });
    }
    const next = ISLAND_TIERS.find((ti) => ti.tier === state.islandTier + 1);
    if (next) {
      entries.push({
        icon: spriteImg('tile:grass:0', 'market-img'),
        name: t('shop.expand'),
        lines: [t('shop.expandDesc', { size: next.size, lv: next.minLevel })],
        price: next.price,
        unlockLevel: next.minLevel,
        buyLabel: t('ui.buy'),
        onBuy: () => { dispatch(expandIsland(state, ctx.now())); renderTab(body, ctx); },
      });
    }
    const rodNames = [
      t('shop.rodT1'), t('shop.rodT2'), t('shop.rodT3'), t('shop.rodT4'), t('shop.rodT5'),
    ];
    if (p.rodTier < 5) {
      entries.push({
        icon: spriteImg('fish:fish_sardine', 'market-img'),
        name: t('shop.rodUpgradeTo', { name: rodNames[p.rodTier] }),
        lines: [t('shop.rodDesc')],
        price: ROD_PRICES[p.rodTier],
        unlockLevel: 1,
        buyLabel: t('ui.buy'),
        onBuy: () => { dispatch(upgradeRod(state)); renderTab(body, ctx); },
      });
    }
  }

  const tabName = t(`shop.${activeTab === 'tools' ? 'tools' : activeTab}`);
  const descKey = `shop.desc.${activeTab}`;
  const grid = h('div', { class: 'market-grid' });
  for (const entry of entries) grid.append(marketCard(entry, ctx));

  body.append(
    h('div', { class: 'market-head' },
      h('div', { class: 'market-title-wrap' },
        h('div', { class: 'market-kicker' }, 'ISLAND MARKET'),
        h('h3', { class: 'market-title' }, tabName),
        h('p', { class: 'market-desc' }, t(descKey)),
      ),
      h('div', { class: 'market-wallet' },
        h('span', {}, '🪙'),
        h('b', {}, String(p.coins)),
        h('small', {}, t('ui.coins')),
      ),
    ),
    grid,
  );
  if (entries.length === 0) body.append(h('div', { class: 'empty-note' }, t('shop.soldOut')));
}
