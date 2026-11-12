/**
 * 签到面板：7 天循环奖励与连续天数。
 */
import type { ActionResult, GameState } from '../../core/types';
import { itemDef } from '../../core/registry';
import { CHECKIN_REWARDS, checkinInfo, claimCheckin } from '../../core/checkin';
import { t, tl } from '../../i18n';
import { h, clearChildren } from '../dom';
import { openPanel } from '../modal';

export interface CheckinCtx {
  state: GameState;
  now: () => number;
  dispatch: (r: ActionResult) => void;
}

export function openCheckin(ctx: CheckinCtx): void {
  openPanel({
    title: t('checkin.title'),
    body: (body) => render(body, ctx),
  });
}

function rewardText(reward: (typeof CHECKIN_REWARDS)[number]): string {
  const parts = [`+${reward.coins}💰`];
  if (reward.food) parts.push(`+${reward.food}🍖`);
  for (const [id, n] of Object.entries(reward.items ?? {})) {
    parts.push(`${tl(itemDef(id).name)}×${n}`);
  }
  return parts.join(' · ');
}

function render(body: HTMLElement, ctx: CheckinCtx): void {
  clearChildren(body);
  const info = checkinInfo(ctx.state, ctx.now());
  const rerender = (): void => render(body, ctx);
  const cycleDone = info.claimedToday ? info.rewardIndex + 1 : info.rewardIndex;

  const strip = h('div', { class: 'checkin-strip' });
  CHECKIN_REWARDS.forEach((reward, i) => {
    const isNext = i === info.rewardIndex && !info.claimedToday;
    const done = i < cycleDone;
    strip.append(h('div', { class: `checkin-day ${isNext ? 'next' : ''} ${done ? 'done' : ''}` },
      h('div', { class: 'checkin-day-label' }, t('checkin.day', { n: i + 1 })),
      h('div', { class: 'checkin-day-reward' }, rewardText(reward)),
      done ? h('span', { class: 'checkin-stamp' }, '✓') : null,
    ));
  });

  body.append(
    h('div', { class: 'checkin-hero' },
      h('div', { class: 'checkin-streak' },
        h('b', {}, String(info.streak)),
        h('span', {}, t('checkin.days')),
      ),
      h('div', { class: 'checkin-copy' },
        h('div', { class: 'market-kicker' }, 'DAILY CHECK-IN'),
        h('h3', {}, t('checkin.streak', { n: info.streak })),
        h('p', {}, t('checkin.total', { n: info.total })),
      ),
      info.claimedToday
        ? h('span', { class: 'owned-mark' }, t('checkin.done'))
        : h('button', {
            class: 'btn btn-primary',
            onclick: () => {
              ctx.dispatch(claimCheckin(ctx.state, ctx.now()));
              rerender();
            },
          }, `${t('checkin.claim')} · ${rewardText(info.reward)}`),
    ),
    h('div', { class: 'panel-note' }, t('checkin.note')),
    strip,
  );
}
