/**
 * 宠物大赛面板：每只宠物每天一次，按得分拿 S/A/B/C 排名奖励。
 */
import type { ActionResult, GameState } from '../../core/types';
import { petDef } from '../../core/registry';
import { petLevel } from '../../core/balance';
import { contestDoneToday, enterPetContest } from '../../core/petContest';
import { t, tl } from '../../i18n';
import { h, clearChildren, spriteImg } from '../dom';
import { infoDialog, openPanel } from '../modal';

export interface ContestCtx {
  state: GameState;
  now: () => number;
  dispatch: (r: ActionResult) => void;
}

export function openPetContest(ctx: ContestCtx): void {
  openPanel({
    title: t('contest.title'),
    body: (body) => render(body, ctx),
  });
}

function render(body: HTMLElement, ctx: ContestCtx): void {
  clearChildren(body);
  const { state } = ctx;
  const now = ctx.now();

  if (state.pets.length === 0) {
    body.append(h('div', { class: 'empty-note' }, t('contest.noPets')));
    return;
  }

  body.append(h('div', { class: 'collection-banner' },
    h('div', { class: 'journal-banner-copy' },
      h('div', { class: 'market-kicker' }, 'SHOW RING'),
      h('h3', {}, t('contest.showRing')),
      h('p', {}, t('contest.note')),
    ),
    h('div', { class: 'journal-progress' },
      h('div', { class: 'journal-progress-ring', style: '--pct:100' },
        h('b', {}, String(state.pets.length)), h('span', {}, '')),
      h('small', {}, t('contest.pets'))),
  ));

  body.append(h('div', { class: 'contest-ranks' },
    ...['S', 'A', 'B', 'C'].map((rank) => h('span', { class: `contest-rank-chip rank-${rank}` }, rank)),
    h('span', { class: 'contest-ranks-note' }, t('contest.rankNote')),
  ));

  const list = h('div', { class: 'contest-grid' });
  for (const pet of state.pets) {
    const def = petDef(pet.defId);
    const done = contestDoneToday(pet, now);
    const img = spriteImg(`pet:${def.id}`, 'contest-pet-img');
    list.append(h('article', { class: `contest-pet ${done ? 'done' : ''}` },
      h('div', { class: 'contest-pet-art' }, img),
      h('div', { class: 'contest-pet-body' },
        h('div', { class: 'contest-pet-name' }, pet.name),
        h('div', { class: 'contest-pet-meta' }, `Lv.${petLevel(pet.xp)} · ${tl(def.name)}`),
        h('div', { class: 'contest-pet-skill' }, `${t('contest.skill')} · ${tl(def.skillDesc)}`),
      ),
      h('div', { class: 'contest-pet-foot' },
        done
          ? h('span', { class: 'owned-mark' }, t('contest.done'))
          : h('button', {
              class: 'btn btn-sm btn-primary',
              onclick: () => {
                const r = enterPetContest(state, pet.uid, ctx.now());
                ctx.dispatch(r);
                if (!r.ok || !r.contest) return;
                const result = r.contest;
                infoDialog(t('contest.resultTitle'), (box) => {
                  box.append(
                    h('div', { class: 'contest-result' },
                      h('div', { class: `contest-rank rank-${result.rank}` }, result.rank),
                      h('div', { class: 'contest-score' }, t('contest.score', { n: result.score })),
                      h('div', { class: 'contest-reward' },
                        t('contest.reward', { coins: result.coins, xp: result.xp })),
                    ),
                  );
                }, () => openPetContest(ctx));
              },
            }, t('contest.enter')),
      ),
    ));
  }
  body.append(list);
}
