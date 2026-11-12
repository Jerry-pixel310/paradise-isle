/**
 * 餐厅面板：设置两道菜单、预览营业额、每天营业一次。
 */
import type { ActionResult, GameState } from '../../core/types';
import { allRecipes, itemDef } from '../../core/registry';
import { itemCount } from '../../core/player';
import {
  MAX_MENU, restaurantAt, restaurantDoneToday, restaurantPreview, serveRestaurant, setRestaurantMenu,
} from '../../core/restaurant';
import { t, tl } from '../../i18n';
import { h, clearChildren, spriteImg } from '../dom';
import { openPanel } from '../modal';

export interface RestaurantCtx {
  state: GameState;
  uid: number;
  now: () => number;
  dispatch: (r: ActionResult) => void;
}

export function openRestaurant(ctx: RestaurantCtx): void {
  openPanel({
    title: t('restaurant.title'),
    className: 'panel-wide',
    body: (body) => render(body, ctx),
  });
}

function render(body: HTMLElement, ctx: RestaurantCtx): void {
  clearChildren(body);
  const state = ctx.state;
  const r = restaurantAt(state, ctx.uid);
  const menu = r?.menu ?? [null, null];
  const done = restaurantDoneToday(state, ctx.uid, ctx.now());
  const preview = restaurantPreview(state, ctx.uid);
  const rerender = (): void => render(body, ctx);

  // 今日菜单板
  const menuRow = h('div', { class: 'restaurant-menu' });
  for (let i = 0; i < MAX_MENU; i++) {
    const dishId = menu[i];
    menuRow.append(h('div', { class: `restaurant-slot ${dishId ? 'filled' : 'empty'}` },
      h('div', { class: 'restaurant-slot-label' }, t('restaurant.menuSlot', { n: i + 1 })),
      dishId
        ? h('div', { class: 'restaurant-slot-dish' },
            h('div', { class: 'restaurant-dish-art' }, spriteImg(`icon:${dishId}`, 'icon-lg')),
            h('div', { class: 'restaurant-dish-meta' },
              h('b', {}, tl(itemDef(dishId).name)),
              h('span', {}, t('restaurant.have', { n: itemCount(state, dishId) })),
            ))
        : h('div', { class: 'restaurant-slot-empty' }, t('restaurant.empty')),
    ));
  }

  const previewRows = h('div', { class: 'restaurant-preview-rows' },
    h('div', {}, h('span', {}, t('ui.coins')), h('b', {}, `+${preview.totalCoins}`)),
    h('div', {}, h('span', {}, t('ui.reputation')), h('b', {}, `+${preview.reputation}`)),
    h('div', {}, h('span', {}, t('ui.xp')), h('b', {}, `+${preview.xp}`)),
  );

  const serveBox = h('div', { class: 'restaurant-service' },
    h('div', { class: 'restaurant-service-head' },
      h('div', { class: 'market-kicker' }, 'TODAY’S SERVICE'),
      h('div', { class: `restaurant-status ${done ? 'done' : 'open'}` },
        done ? t('restaurant.done') : t('restaurant.open')),
    ),
    previewRows,
    done
      ? h('div', { class: 'restaurant-done-note' }, t('restaurant.doneNote'))
      : h('button', {
          class: `btn btn-primary ${preview.totalCoins <= 0 ? 'disabled' : ''}`,
          onclick: () => {
            if (preview.totalCoins <= 0) return;
            ctx.dispatch(serveRestaurant(state, ctx.uid, ctx.now()));
            rerender();
          },
        }, `${t('restaurant.serve')} · +${preview.totalCoins}🪙`),
  );

  const dishes = allRecipes().filter((recipe) => recipe.tab === 'cook');
  const list = h('div', { class: 'restaurant-dishes' });
  for (const recipe of dishes) {
    const dishId = recipe.outputId;
    const assigned = menu.includes(dishId);
    const def = itemDef(dishId);
    list.append(h('article', { class: `restaurant-dish ${assigned ? 'assigned' : ''}` },
      h('div', { class: 'restaurant-dish-top' },
        spriteImg(`icon:${dishId}`, 'icon-lg'),
        h('div', {},
          h('div', { class: 'restaurant-dish-name' }, tl(def.name)),
          h('div', { class: 'restaurant-dish-sub' },
            `${t('restaurant.have', { n: itemCount(state, dishId) })} · ${t('ui.sell')} ${def.sell}`),
        ),
      ),
      h('div', { class: 'restaurant-dish-actions' },
        h('button', {
          class: `btn btn-sm ${assigned ? 'disabled' : ''}`,
          onclick: () => {
            if (assigned) return;
            ctx.dispatch(setRestaurantMenu(state, ctx.uid, 0, dishId));
            rerender();
          },
        }, t('restaurant.menu1')),
        h('button', {
          class: `btn btn-sm ${assigned ? 'disabled' : ''}`,
          onclick: () => {
            if (assigned) return;
            ctx.dispatch(setRestaurantMenu(state, ctx.uid, 1, dishId));
            rerender();
          },
        }, t('restaurant.menu2')),
      ),
    ));
  }

  body.append(
    h('div', { class: 'collection-banner' },
      h('div', { class: 'journal-banner-copy' },
        h('div', { class: 'market-kicker' }, 'SEASIDE KITCHEN'),
        h('h3', {}, t('restaurant.kitchenTitle')),
        h('p', {}, t('restaurant.note')),
      ),
      h('div', { class: 'craft-count' },
        h('b', {}, done ? '✓' : '2'),
        h('span', {}, done ? t('restaurant.done') : t('restaurant.todayMenu')),
      ),
    ),
    h('div', { class: 'restaurant-board' },
      h('div', { class: 'restaurant-menu-board' },
        h('div', { class: 'market-kicker' }, 'TODAY’S MENU'),
        menuRow),
      serveBox,
    ),
    h('div', { class: 'stat-section-title' }, t('restaurant.pick')),
    list,
  );
}
