/**
 * 小屋装修面板：购买家具，选择「摆放」后点击房间地面自由放置。
 */
import type { ActionResult, FurnitureDef, GameState, RoomId } from '../../core/types';
import { allFurniture } from '../../core/registry';
import { buyFurniture, roomOfFurniture } from '../../core/interior';
import { t, tl } from '../../i18n';
import { h, clearChildren, spriteImg } from '../dom';
import { openPanel } from '../modal';

export interface FurnitureCtx {
  state: GameState;
  room: RoomId;
  dispatch: (r: ActionResult) => void;
  onChange: () => void;
  /** 选中家具，关闭面板并进入摆放模式 */
  onPlace: (id: string) => void;
}

export function openFurniture(ctx: FurnitureCtx): void {
  openPanel({
    title: t('furn.title'),
    className: 'panel-wide',
    body: (body) => render(body, ctx),
  });
}

function render(body: HTMLElement, ctx: FurnitureCtx): void {
  clearChildren(body);
  const items = allFurniture()
    .filter((f) => !f.room || f.room === ctx.room)
    .sort((a, b) => a.unlockLevel - b.unlockLevel || a.price - b.price);
  const grid = h('div', { class: 'furn-grid' });
  for (const def of items) grid.append(card(def, ctx));
  body.append(
    h('div', { class: 'collection-banner' },
      h('div', { class: 'journal-banner-copy' },
        h('div', { class: 'market-kicker' }, 'INTERIOR CATALOG'),
        h('h3', {}, t(`room.${ctx.room}`)),
        h('p', {}, t('furn.catalogSub')),
      ),
      h('div', { class: 'craft-count' },
        h('b', {}, String(items.length)),
        h('span', {}, t('furn.catalogItems')),
      ),
    ),
    grid,
  );
}

function card(def: FurnitureDef, ctx: FurnitureCtx): HTMLElement {
  const { state, dispatch } = ctx;
  const owned = state.interior.owned.includes(def.id);
  const placedHere = (state.interior.rooms[ctx.room] ?? []).some((p) => p.defId === def.id);
  const placedRoom = roomOfFurniture(state, def.id);
  const locked = state.player.level < def.unlockLevel;
  const poor = state.player.coins < def.price;
  const rerender = (): void => { ctx.onChange(); openFurniture(ctx); };

  let action: HTMLElement;
  if (placedHere) {
    action = h('span', { class: 'owned-mark' }, t('furn.placed'));
  } else if (placedRoom) {
    action = h('span', { class: 'locked-mark' }, t('furn.otherRoom', { room: t(`room.${placedRoom}`) }));
  } else if (owned) {
    action = h('button', {
      class: 'btn btn-sm btn-primary',
      onclick: () => ctx.onPlace(def.id),
    }, t('furn.place'));
  } else if (locked) {
    action = h('span', { class: 'locked-mark' }, t('ui.lvRequire', { lv: def.unlockLevel }));
  } else {
    action = h('button', {
      class: `btn btn-sm ${poor ? 'disabled' : 'btn-primary'}`,
      onclick: () => {
        if (poor) return;
        const r = buyFurniture(state, def.id);
        dispatch(r);
        if (r.ok) ctx.onPlace(def.id);
        else rerender();
      },
    }, t('ui.buy'));
  }

  return h('article', { class: `furn-card ${locked ? 'locked' : ''} ${placedHere ? 'placed' : ''}` },
    h('div', { class: 'furn-art' },
      spriteImg(`furn:${def.id}`, 'furn-img'),
      h('span', { class: 'furn-slot' }, t(`furn.slot.${def.slot}`)),
    ),
    h('div', { class: 'furn-body' },
      h('div', { class: 'furn-name' }, tl(def.name)),
      h('div', { class: 'furn-meta' }, t('shop.beauty', { n: def.beauty })),
    ),
    h('div', { class: 'furn-foot' },
      h('span', { class: 'furn-price' }, owned ? t('ui.owned') : `🪙 ${def.price}`),
      action,
    ),
  );
}
