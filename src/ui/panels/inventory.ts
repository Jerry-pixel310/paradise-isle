/**
 * 背包：按类别筛选的仓储式物品卡，显示可售价值与食用/出售操作。
 */
import type { ActionResult, GameState } from '../../core/types';
import { itemDef } from '../../core/registry';
import { sellItem } from '../../core/economy';
import { eatItem } from '../../core/items';
import { t, tl } from '../../i18n';
import { h, clearChildren, spriteImg } from '../dom';
import { openPanel } from '../modal';

let invFilter = 'all';

const CAT_LABEL: Record<string, string> = {
  produce: 'inv.cat.produce',
  fish: 'inv.cat.fish',
  forage: 'inv.cat.forage',
  game: 'inv.cat.game',
  material: 'inv.cat.material',
  dish: 'inv.cat.dish',
  seed: 'inv.cat.seed',
  animalGood: 'inv.cat.animal',
  bouquet: 'inv.cat.bouquet',
  bait: 'inv.cat.bait',
  special: 'inv.cat.special',
};

export function openInventory(state: GameState, dispatch: (r: ActionResult) => void): void {
  invFilter = 'all';
  openPanel({
    title: t('panel.inventory'),
    className: 'panel-wide inv-panel',
    body: (body) => renderBody(body, state, dispatch),
  });
}

function renderBody(body: HTMLElement, state: GameState, dispatch: (r: ActionResult) => void): void {
  clearChildren(body);
  const entries = Object.entries(state.inventory).filter(([, n]) => n > 0);
  if (entries.length === 0) {
    body.append(h('div', { class: 'empty-note' }, t('inv.empty')));
    return;
  }
  entries.sort(([a], [b]) => a.localeCompare(b));

  let totalValue = 0;
  const cats = new Set<string>();
  for (const [id, count] of entries) {
    try {
      const def = itemDef(id);
      totalValue += def.sell * count;
      cats.add(def.category);
    } catch { /* 旧存档里的未知物品跳过 */ }
  }

  const chips = h('div', { class: 'dex-filters inv-filters' },
    h('button', {
      class: `dex-filter ${invFilter === 'all' ? 'active' : ''}`,
      onclick: () => { invFilter = 'all'; renderBody(body, state, dispatch); },
    }, `${t('inv.filter.all')} ${entries.length}`),
    ...[...cats].sort().map((cat) => h('button', {
      class: `dex-filter ${invFilter === cat ? 'active' : ''}`,
      onclick: () => { invFilter = cat; renderBody(body, state, dispatch); },
    }, t(CAT_LABEL[cat] ?? 'inv.cat.special'))),
  );

  body.append(
    h('div', { class: 'collection-banner' },
      h('div', { class: 'journal-banner-copy' },
        h('div', { class: 'market-kicker' }, 'PANTRY & BAG'),
        h('h3', {}, t('inv.overview')),
        h('p', {}, t('inv.overviewSub')),
      ),
      h('div', { class: 'inv-total' },
        h('b', {}, String(totalValue)),
        h('span', {}, t('inv.totalValue')),
      ),
    ),
    chips,
  );

  const grid = h('div', { class: 'inv-grid' });
  for (const [id, count] of entries) {
    let def;
    try {
      def = itemDef(id);
    } catch {
      continue;
    }
    if (invFilter !== 'all' && def.category !== invFilter) continue;
    const canSell = def.sell > 0;
    const canEat = !!def.useEnergy || !!def.useFood;
    const actions = h('div', { class: 'inv-actions' });
    if (canEat) {
      actions.append(h('button', {
        class: 'btn btn-sm btn-primary',
        onclick: () => {
          dispatch(eatItem(state, id));
          renderBody(body, state, dispatch);
        },
      }, t('inv.eat', { n: def.useEnergy ?? 0 })));
    }
    if (canSell) {
      actions.append(h('button', {
        class: 'btn btn-sm',
        onclick: () => {
          dispatch(sellItem(state, id, 1));
          renderBody(body, state, dispatch);
        },
      }, t('ui.sell')));
      if (count > 1) {
        actions.append(h('button', {
          class: 'btn btn-sm',
          onclick: () => {
            dispatch(sellItem(state, id, count));
            renderBody(body, state, dispatch);
          },
        }, `${t('ui.sellAll')} ×${count}`));
      }
    }

    grid.append(h('article', { class: `inv-card ${canEat ? 'edible' : ''}` },
      h('div', { class: 'inv-art' },
        spriteImg(`icon:${id}`, 'inv-img'),
        h('span', { class: 'inv-count' }, `×${count}`),
      ),
      h('div', { class: 'inv-body' },
        h('div', { class: 'inv-name' }, tl(def.name)),
        h('div', { class: 'inv-cat' }, t(CAT_LABEL[def.category] ?? 'inv.cat.special')),
        canSell ? h('div', { class: 'inv-price' }, `🪙 ${def.sell}`) : null,
        actions,
      ),
    ));
  }
  if (grid.childElementCount === 0) body.append(h('div', { class: 'empty-note' }, t('inv.empty')));
  body.append(grid);
}
