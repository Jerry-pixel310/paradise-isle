/**
 * 鱼塘投苗面板：选择背包中的鱼投入鱼塘。
 */
import type { ActionResult, GameState } from '../../core/types';
import { allFish, fishDef } from '../../core/registry';
import { itemCount } from '../../core/player';
import { pondInfo, stockPond } from '../../core/pond';
import { t, tl } from '../../i18n';
import { h, clearChildren, spriteImg } from '../dom';
import { closePanel, openPanel } from '../modal';

export interface PondCtx {
  state: GameState;
  uid: number;
  now: () => number;
  dispatch: (r: ActionResult) => void;
}

export function openPondStock(ctx: PondCtx): void {
  openPanel({
    title: t('pond.pick'),
    className: 'panel-wide',
    body: (body) => render(body, ctx),
  });
}

function render(body: HTMLElement, ctx: PondCtx): void {
  clearChildren(body);
  const info = pondInfo(ctx.state, ctx.uid, ctx.now());
  const pond = info.pond;
  const candidates = allFish().filter((f) => {
    if (itemCount(ctx.state, f.id) < 1) return false;
    return !pond || pond.fishId === f.id;
  });

  body.append(h('div', { class: 'collection-banner' },
    h('div', { class: 'journal-banner-copy' },
      h('div', { class: 'market-kicker' }, 'FISH POND'),
      h('h3', {}, t('pond.stockTitle')),
      h('p', {}, pond ? t('pond.stockMore') : t('pond.emptyNote')),
    ),
    h('div', { class: 'craft-count' },
      h('b', {}, String(candidates.length)),
      h('span', {}, t('pond.candidates')),
    ),
  ));

  if (candidates.length === 0) {
    body.append(h('div', { class: 'empty-note' }, t('pond.noFish')));
    return;
  }
  const grid = h('div', { class: 'picker-grid' });
  for (const f of candidates) {
    const count = itemCount(ctx.state, f.id);
    grid.append(h('article', { class: `picker-card rarity-${f.rarity}` },
      h('div', { class: 'picker-art' },
        spriteImg(`fish:${f.id}`, 'picker-img'),
        h('span', { class: 'picker-badge' }, t(`rarity.${f.rarity}`)),
      ),
      h('div', { class: 'picker-body' },
        h('div', { class: 'picker-name' }, tl(fishDef(f.id).name)),
        h('div', { class: 'picker-sub' }, `${t('pond.have', { n: count })} · ${t(`rarity.${f.rarity}`)}`),
      ),
      h('button', {
        class: 'btn btn-sm btn-primary picker-btn',
        onclick: () => {
          ctx.dispatch(stockPond(ctx.state, ctx.uid, f.id, ctx.now()));
          closePanel();
        },
      }, t('pond.stock')),
    ));
  }
  body.append(grid);
}
