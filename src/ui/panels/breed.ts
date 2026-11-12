/**
 * 繁殖面板：选择同种成年动物作为配偶。
 */
import type { ActionResult, GameState } from '../../core/types';
import { animalDef } from '../../core/registry';
import { ANIMAL_BREED_COOLDOWN_MS } from '../../core/balance';
import { breedAnimals, isAnimalBaby } from '../../core/animals';
import { fmtDuration, t, tl } from '../../i18n';
import { h, clearChildren, spriteImg } from '../dom';
import { closePanel, openPanel } from '../modal';

export interface BreedCtx {
  state: GameState;
  uid: number;
  now: () => number;
  dispatch: (r: ActionResult) => void;
}

export function openBreedPanel(ctx: BreedCtx): void {
  openPanel({
    title: t('breed.title'),
    className: 'panel-wide',
    body: (body) => render(body, ctx),
  });
}

function render(body: HTMLElement, ctx: BreedCtx): void {
  clearChildren(body);
  const now = ctx.now();
  const source = ctx.state.animals.find((a) => a.uid === ctx.uid);
  if (!source) { body.append(h('div', { class: 'empty-note' }, t('breed.none'))); return; }
  const mates = ctx.state.animals.filter((a) =>
    a.uid !== source.uid && a.defId === source.defId && !isAnimalBaby(a, now));
  if (mates.length === 0) {
    body.append(h('div', { class: 'empty-note' }, t('breed.none')));
    return;
  }
  body.append(h('div', { class: 'collection-banner' },
    h('div', { class: 'journal-banner-copy' },
      h('div', { class: 'market-kicker' }, 'RANCH MATCH'),
      h('h3', {}, t('breed.matchTitle')),
      h('p', {}, t('breed.note')),
    ),
    h('div', { class: 'craft-count' },
      h('b', {}, String(mates.length)),
      h('span', {}, t('breed.candidates')),
    ),
  ));
  const grid = h('div', { class: 'picker-grid' });
  for (const mate of mates) {
    const cd = mate.lastBreedAt ? mate.lastBreedAt + ANIMAL_BREED_COOLDOWN_MS - now : 0;
    const ready = cd <= 0;
    grid.append(h('article', { class: `picker-card ${ready ? '' : 'cooling'}` },
      h('div', { class: 'picker-art' },
        spriteImg(`animal:${mate.defId}`, 'picker-img'),
        ready ? h('span', { class: 'picker-badge ok' }, t('breed.ready')) : null,
      ),
      h('div', { class: 'picker-body' },
        h('div', { class: 'picker-name' }, tl(animalDef(mate.defId).name)),
        h('div', { class: 'picker-sub' },
          ready ? t('breed.ready') : `${t('breed.cd')} ${fmtDuration(cd)}`),
      ),
      h('button', {
        class: `btn btn-sm picker-btn ${ready ? 'btn-primary' : 'disabled'}`,
        onclick: () => {
          if (!ready) return;
          ctx.dispatch(breedAnimals(ctx.state, ctx.uid, mate.uid, ctx.now()));
          closePanel();
        },
      }, t('breed.pick')),
    ));
  }
  body.append(grid);
}
