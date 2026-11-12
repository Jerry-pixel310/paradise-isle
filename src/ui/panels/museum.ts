/**
 * 博物馆面板：按类别展示已发现物种，捐赠后领取里程碑奖励。
 */
import type { ActionResult, GameState } from '../../core/types';
import {
  claimMuseumMilestone, donateToMuseum, MUSEUM_COINS, MUSEUM_MILESTONES,
  museumCatalog, museumDonated, museumInfo, speciesEncountered, type MuseumKind,
} from '../../core/museum';
import { t, tl } from '../../i18n';
import { h, clearChildren, spriteImg } from '../dom';
import { openPanel } from '../modal';

export interface MuseumCtx {
  state: GameState;
  dispatch: (r: ActionResult) => void;
}

const KINDS: MuseumKind[] = ['fish', 'forage', 'game', 'beasts'];
const ICON_PREFIX: Record<MuseumKind, string> = {
  fish: 'fish', forage: 'forage', game: 'game', beasts: 'beast',
};

export function openMuseum(ctx: MuseumCtx): void {
  openPanel({
    title: t('museum.title'),
    className: 'panel-wide',
    body: (body) => render(body, ctx),
  });
}

function render(body: HTMLElement, ctx: MuseumCtx): void {
  clearChildren(body);
  const info = museumInfo(ctx.state);
  const rerender = (): void => render(body, ctx);

  const claim = info.canClaim
    ? h('button', {
        class: 'btn btn-primary',
        onclick: () => {
          ctx.dispatch(claimMuseumMilestone(ctx.state));
          rerender();
        },
      }, t('museum.claim', { coins: MUSEUM_COINS[info.claimed] }))
    : h('span', { class: info.claimed > 0 ? 'owned-mark' : 'locked-mark' },
        info.next === null ? t('ui.max') : t('museum.next', { n: info.next - info.donated }));

  const hero = h('div', { class: 'collection-banner' },
    h('div', { class: 'journal-banner-copy' },
      h('div', { class: 'market-kicker' }, 'ISLAND MUSEUM'),
      h('h3', {}, t('museum.wingTitle')),
      h('p', {}, t('museum.note')),
    ),
    h('div', { class: 'museum-progress' },
      h('div', { class: 'journal-progress-ring', style: `--pct:${Math.round((info.donated / info.total) * 100)}` },
        h('b', {}, String(info.donated)), h('span', {}, `/ ${info.total}`)),
      h('small', {}, t('museum.milestones', { a: info.claimed, b: MUSEUM_MILESTONES.length })),
      claim,
    ),
  );

  body.append(hero);
  const catalog = museumCatalog();
  for (const kind of KINDS) {
    const list = catalog.filter((s) => s.kind === kind && speciesEncountered(ctx.state, s.id));
    if (list.length === 0) continue;
    body.append(h('div', { class: 'stat-section-title' }, `${t(`dex.cat.${kind}`)} · ${list.length}`));
    const grid = h('div', { class: 'museum-grid' });
    for (const species of list) {
      const donated = museumDonated(ctx.state, species.id);
      grid.append(h('article', { class: `museum-card ${donated ? 'donated' : ''}` },
        h('div', { class: 'museum-art' },
          spriteImg(`${ICON_PREFIX[kind]}:${species.id}`, 'museum-img'),
          donated ? h('span', { class: 'museum-stamp' }, '✓') : null,
        ),
        h('div', { class: 'museum-body' },
          h('div', { class: 'museum-name' }, tl(species.name)),
          h('div', { class: 'museum-kind' }, t(`dex.cat.${kind}`)),
        ),
        donated
          ? h('span', { class: 'museum-donated' }, t('museum.donated'))
          : h('button', {
              class: 'btn btn-sm btn-primary',
              onclick: () => {
                ctx.dispatch(donateToMuseum(ctx.state, species.id));
                rerender();
              },
            }, t('museum.donate')),
      ));
    }
    body.append(grid);
  }
}
