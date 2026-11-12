/**
 * 节日面板：当前季节的节日、每日礼物与限定商品。
 */
import type { ActionResult, GameState } from '../../core/types';
import { itemDef } from '../../core/registry';
import { buyFestivalOffer, claimFestivalGift, claimFestivalTier, currentFestival, festivalActivity, festivalGiftClaimed } from '../../core/festival';
import { t, tl } from '../../i18n';
import { h, clearChildren, spriteImg } from '../dom';
import { openPanel } from '../modal';

export interface FestivalCtx {
  state: GameState;
  now: () => number;
  dispatch: (r: ActionResult) => void;
}

export function openFestival(ctx: FestivalCtx): void {
  openPanel({
    title: t('fest.title'),
    className: 'panel-wide',
    body: (body) => render(body, ctx),
  });
}

function giftText(state: GameState, def: ReturnType<typeof currentFestival>['def']): string {
  const parts: string[] = [`+${def.gift.coins} ${t('ui.coins')}`];
  for (const [id, n] of Object.entries(def.gift.items)) {
    parts.push(`${tl(itemDef(id).name)} ×${n}`);
  }
  return parts.join(' · ');
}

function render(body: HTMLElement, ctx: FestivalCtx): void {
  clearChildren(body);
  const { state } = ctx;
  const now = ctx.now();
  const { def, daysLeft, cal } = currentFestival(state, now);
  const rerender = (): void => openFestival(ctx);

  const claimed = festivalGiftClaimed(state, now);
  const giftBtn = h('button', {
    class: `btn ${claimed ? 'disabled' : 'btn-primary'}`,
    onclick: () => {
      if (claimed) return;
      ctx.dispatch(claimFestivalGift(state, ctx.now()));
      rerender();
    },
  }, claimed ? t('fest.giftDone') : t('fest.gift'));

  const header = h('div', { class: 'fest-hero', style: `--fest:${def.color}` },
    h('div', { class: 'fest-hero-copy' },
      h('div', { class: 'market-kicker' }, `SEASONAL FESTIVAL · ${t(`season.${cal.season}`)}`),
      h('h3', { class: 'fest-heading' }, tl(def.name)),
      h('p', { class: 'fest-desc' }, tl(def.desc)),
      h('div', { class: 'fest-meta' }, t('fest.daysLeft', { n: daysLeft })),
    ),
    h('div', { class: 'fest-gift-card' },
      h('div', { class: 'fest-gift-label' }, t('fest.todayGift')),
      h('div', { class: 'fest-gift-text' }, giftText(state, def)),
      giftBtn,
    ),
  );

  const offers = h('div', { class: 'fest-offers' });
  for (const offer of def.offers) {
    const item = itemDef(offer.itemId);
    const poor = state.player.coins < offer.price;
    offers.append(h('article', { class: 'fest-offer' },
      h('div', { class: 'fest-offer-art' },
        spriteImg(`icon:${offer.itemId}`, 'icon-lg')),
      h('div', { class: 'fest-offer-body' },
        h('div', { class: 'fest-offer-name' }, `${tl(item.name)} ×${offer.qty}`),
        h('div', { class: 'fest-offer-sub' }, t('fest.limited')),
      ),
      h('div', { class: 'fest-offer-foot' },
        h('span', { class: 'fest-offer-price' }, `🪙 ${offer.price}`),
        h('button', {
          class: `btn btn-sm ${poor ? 'disabled' : 'btn-primary'}`,
          onclick: () => {
            if (poor) return;
            ctx.dispatch(buyFestivalOffer(state, offer.id, ctx.now()));
            rerender();
          },
        }, t('ui.buy')),
      ),
    ));
  }

  // 节日活动
  const act = festivalActivity(state, now);
  const maxTier = act.def.tiers[act.def.tiers.length - 1];
  const pct = Math.min(100, (act.count / maxTier) * 100);
  const tiers = act.def.tiers.map((target, i) => {
    const reward = act.def.rewards[i];
    const claimed = i < act.claimed;
    const can = !claimed && i === act.claimed && act.count >= target;
    return h('div', { class: `fest-tier ${claimed ? 'done' : can ? 'ready' : ''}` },
      h('span', { class: 'fest-tier-index' }, `0${i + 1}`),
      h('span', { class: 'fest-tier-target' }, t('fest.tier', { n: i + 1, target })),
      h('span', { class: 'fest-tier-reward' }, `+${reward.coins}💰 +${reward.xp}XP`),
      claimed
        ? h('span', { class: 'owned-mark' }, t('fest.claimed'))
        : can
          ? h('button', {
              class: 'btn btn-sm btn-primary',
              onclick: () => {
                ctx.dispatch(claimFestivalTier(state, ctx.now()));
                rerender();
              },
            }, t('fest.claim'))
          : h('span', { class: 'locked-mark' }, t('fest.locked', { n: target })),
    );
  });
  const activityBox = h('div', { class: 'fest-activity' },
    h('div', { class: 'fest-activity-head' },
      h('div', {},
        h('div', { class: 'market-kicker' }, 'FESTIVAL CHALLENGE'),
        h('div', { class: 'fest-act-title' }, tl(act.def.name)),
        h('div', { class: 'fest-act-desc' }, tl(act.def.desc)),
      ),
      h('div', { class: 'fest-act-score' }, h('b', {}, String(act.count)), h('span', {}, `/ ${maxTier}`)),
    ),
    h('div', { class: 'fest-act-bar' }, h('div', { class: 'fest-act-fill', style: `width:${pct}%` })),
    h('div', { class: 'fest-tiers' }, ...tiers),
  );

  body.append(
    header,
    h('div', { class: 'stat-section-title' }, t('fest.offers')),
    offers,
    activityBox,
  );
}
