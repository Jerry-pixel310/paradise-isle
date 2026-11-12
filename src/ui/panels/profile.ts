/**
 * 岛主名片：等级/称号/评级/成就一览，并装备已解锁称号。
 */
import type { ActionResult, GameState } from '../../core/types';
import { achievementSummary } from '../../core/quests';
import { ratingInfo } from '../../core/rating';
import { equipTitle, TITLES, titleDef, titleUnlocked } from '../../core/titles';
import { charKey, spriteDataUrl } from '../../render/sprites';
import { t, tl } from '../../i18n';
import { h, clearChildren, spriteImg } from '../dom';
import { openPanel } from '../modal';

export interface ProfileCtx {
  state: GameState;
  dispatch: (r: ActionResult) => void;
}

export function openProfile(ctx: ProfileCtx): void {
  openPanel({
    title: t('profile.title'),
    className: 'panel-wide',
    body: (body) => render(body, ctx),
  });
}

function render(body: HTMLElement, ctx: ProfileCtx): void {
  clearChildren(body);
  const { state } = ctx;
  const avatar = spriteImg('fx:sparkle', 'profile-avatar');
  avatar.src = spriteDataUrl(charKey(state.player.avatar));
  const rating = ratingInfo(state);
  const summary = achievementSummary(state);
  const current = titleDef(state.title);
  const rerender = (): void => render(body, ctx);

  const head = h('div', { class: 'profile-hero' },
    h('div', { class: 'profile-portrait' }, avatar),
    h('div', { class: 'profile-info' },
      h('div', { class: 'market-kicker' }, 'ISLANDER CARD'),
      h('div', { class: 'profile-name' }, state.player.name),
      h('div', { class: 'profile-title' }, tl(current.name)),
      h('div', { class: 'profile-chips' },
        h('span', {}, `Lv.${state.player.level}`),
        h('span', {}, t('profile.rating', { n: rating.stars })),
        h('span', {}, t('profile.days', { n: state.stats.daysPlayed })),
        h('span', {}, t('profile.pets', { n: state.pets.length })),
      ),
    ),
    h('div', { class: 'profile-score' },
      h('div', { class: 'profile-score-ring', style: `--pct:${Math.min(100, (summary.completed / Math.max(1, summary.totalAchievements)) * 100)}` },
        h('b', {}, String(summary.completed)), h('span', {}, `/ ${summary.totalAchievements}`)),
      h('small', {}, t('profile.achievements', { a: summary.completed, b: summary.totalAchievements })),
    ),
  );

  const list = h('div', { class: 'profile-titles' });
  for (const def of TITLES) {
    const unlocked = titleUnlocked(state, def.id);
    const equipped = state.title === def.id;
    list.append(h('article', { class: `title-card ${unlocked ? '' : 'locked'} ${equipped ? 'equipped' : ''}` },
      h('div', { class: 'title-emblem' }, tl(def.name).slice(0, 1)),
      h('div', { class: 'title-copy' },
        h('div', { class: 'title-name' }, tl(def.name)),
        h('div', { class: 'title-desc' }, tl(def.desc)),
      ),
      equipped
        ? h('span', { class: 'title-state' }, '✓')
        : unlocked
          ? h('button', {
              class: 'btn btn-sm',
              onclick: () => {
                ctx.dispatch(equipTitle(state, def.id));
                rerender();
              },
            }, t('profile.equip'))
          : h('span', { class: 'locked-mark' }, t('profile.locked')),
    ));
  }

  body.append(
    head,
    h('div', { class: 'stat-section-title' }, t('profile.titles')),
    h('div', { class: 'profile-title-note' }, t('profile.titlesHint')),
    list,
  );
}
