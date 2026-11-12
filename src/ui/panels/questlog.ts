/**
 * 任务面板：教程任务 / 每日任务 / 成就 三个标签页。
 */
import type { ActionResult, AchievementDef, GameState, QuestDef, QuestProgress } from '../../core/types';
import { achievementDef, allBeasts, allFish, allForage, allGame, itemDef, questDef } from '../../core/registry';
import {
  achievementSummary, achievementViews, claimAchievement, claimAllAchievements, claimQuest, questComplete,
} from '../../core/quests';
import { dailyOrders, deliverOrder, orderDone } from '../../core/orders';
import { claimRatingReward, RATING_REWARDS, RATING_XP, ratingInfo } from '../../core/rating';
import { itemCount } from '../../core/player';
import { t, tl } from '../../i18n';
import { h, clearChildren, spriteImg } from '../dom';
import { openPanel } from '../modal';

let activeTab = 'tutorial';
type AchFilter = 'all' | 'claimable' | 'progress' | 'done';
let achFilter: AchFilter = 'all';

export function openQuestLog(
  state: GameState,
  now: () => number,
  dispatch: (r: ActionResult) => void,
  tab?: string,
): void {
  if (tab) activeTab = tab;
  openPanel({
    title: t('panel.quests'),
    className: 'panel-wide',
    tabs: [
      { id: 'tutorial', label: t('panel.tutorial') },
      { id: 'daily', label: t('panel.daily') },
      { id: 'orders', label: t('panel.orders') },
      { id: 'rating', label: t('panel.rating') },
      { id: 'ach', label: t('panel.achievements') },
      { id: 'stats', label: t('panel.stats') },
    ],
    activeTab,
    onTab: (id) => openQuestLog(state, now, dispatch, id),
    body: (body) => renderTab(body, state, now, dispatch),
  });
}

function rewardLine(def: QuestDef): string {
  const r = def.reward;
  const parts: string[] = [];
  if (r.coins) parts.push(`${t('ui.coins')}+${r.coins}`);
  if (r.xp) parts.push(`${t('ui.xp')}+${r.xp}`);
  if (r.food) parts.push(`${t('ui.food')}+${r.food}`);
  if (r.energy) parts.push(`${t('ui.energy')}+${r.energy}`);
  if (r.reputation) parts.push(`${t('ui.reputation')}+${r.reputation}`);
  return parts.join(' · ');
}

function achRewardLine(r: AchievementDef['rewardPerTier']): string {
  const parts: string[] = [];
  if (r.coins) parts.push(`${t('ui.coins')}+${r.coins}`);
  if (r.xp) parts.push(`${t('ui.xp')}+${r.xp}`);
  if (r.food) parts.push(`${t('ui.food')}+${r.food}`);
  if (r.reputation) parts.push(`${t('ui.reputation')}+${r.reputation}`);
  return parts.join(' · ');
}

function questCard(
  qp: QuestProgress, state: GameState, now: () => number,
  dispatch: (r: ActionResult) => void, rerender: () => void, index = 0,
): HTMLElement {
  const def = questDef(qp.defId);
  const complete = questComplete(qp);
  const steps = def.steps.map((s, i) => {
    const cur = Math.min(qp.counts[i], s.count);
    const done = cur >= s.count;
    const pct = Math.min(100, (cur / s.count) * 100);
    return h('div', { class: `quest-step-row ${done ? 'done' : ''}` },
      h('span', { class: 'quest-step-mark' }, done ? '✓' : '○'),
      h('div', { class: 'quest-step-track' },
        h('div', { class: 'quest-step-progress', style: `width:${pct}%` })),
      h('span', { class: 'quest-step-count' }, `${cur}/${s.count}`),
    );
  });
  return h('article', { class: `quest-journal ${complete ? 'complete' : ''}` },
    h('div', { class: 'quest-journal-index' }, String(index).padStart(2, '0')),
    h('div', { class: 'quest-journal-main' },
      h('div', { class: 'quest-journal-head' },
        h('h4', {}, tl(def.name)),
        h('span', { class: complete ? 'quest-status ready' : 'quest-status' },
          complete ? t('quest.claimable') : t('quest.progress')),
      ),
      h('p', { class: 'quest-journal-desc' }, tl(def.desc)),
      h('div', { class: 'quest-step-list' }, ...steps),
      h('div', { class: 'quest-journal-foot' },
        h('span', { class: 'quest-journal-reward' }, `${t('quest.reward')} · ${rewardLine(def)}`),
        complete
          ? h('button', {
              class: 'btn btn-sm btn-primary',
              onclick: () => {
                dispatch(claimQuest(state, qp.defId, now()));
                rerender();
              },
            }, t('ui.claim'))
          : null,
      ),
    ),
  );
}

function journalHeader(
  kicker: string, title: string, sub: string, done: number, total: number, totalLabel: string,
): HTMLElement {
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  return h('div', { class: 'journal-banner' },
    h('div', { class: 'journal-banner-copy' },
      h('div', { class: 'market-kicker' }, kicker),
      h('h3', {}, title),
      h('p', {}, sub),
    ),
    h('div', { class: 'journal-progress' },
      h('div', { class: 'journal-progress-ring', style: `--pct:${pct}` },
        h('b', {}, String(done)), h('span', {}, `/ ${total}`)),
      h('small', {}, totalLabel),
    ),
  );
}

function renderTab(
  body: HTMLElement, state: GameState, now: () => number,
  dispatch: (r: ActionResult) => void,
): void {
  clearChildren(body);
  const rerender = (): void => renderTab(body, state, now, dispatch);

  if (activeTab === 'tutorial' || activeTab === 'daily') {
    const wantDaily = activeTab === 'daily';
    const quests = state.quests.active.filter((q) => !!questDef(q.defId).daily === wantDaily);
    const doneCount = quests.filter((q) => questComplete(q)).length;
    body.append(journalHeader(
      wantDaily ? 'DAILY NOTES' : 'ISLAND HANDBOOK',
      wantDaily ? t('quest.dailyTitle') : t('quest.tutorialTitle'),
      wantDaily ? t('quest.dailySub') : t('quest.tutorialSub'),
      doneCount,
      quests.length + (wantDaily ? state.quests.daily.completed.length : 0),
      t('quest.completedCount'),
    ));
    if (wantDaily) {
      body.append(h('div', { class: 'journal-note' }, t('quest.dailyRefresh')));
    }
    if (quests.length === 0 && !wantDaily) {
      body.append(h('div', { class: 'empty-note' }, t('quest.noneActive')));
    }
    const list = h('div', { class: 'quest-journal-list' });
    let index = 0;
    for (const qp of quests) {
      index += 1;
      list.append(questCard(qp, state, now, dispatch, rerender, index));
    }
    if (wantDaily) {
      for (const doneId of state.quests.daily.completed) {
        try {
          const def = questDef(doneId);
          index += 1;
          list.append(h('article', { class: 'quest-journal done' },
            h('div', { class: 'quest-journal-index' }, '✓'),
            h('div', { class: 'quest-journal-main' },
              h('div', { class: 'quest-journal-head' },
                h('h4', {}, tl(def.name)),
                h('span', { class: 'owned-mark' }, t('quest.done')),
              ),
            ),
          ));
        } catch { /* 池子变更后旧 id 容错 */ }
      }
    }
    if (list.childElementCount > 0) body.append(list);
  } else if (activeTab === 'orders') {
    const orders = dailyOrders(state, now());
    const doneCount = orders.filter((o) => orderDone(state, o.id)).length;
    body.append(journalHeader(
      'ISLAND REQUESTS', t('order.title'), t('order.note'), doneCount, orders.length,
      t('order.completedCount'),
    ));
    for (const [idx, order] of orders.entries()) {
      const def = itemDef(order.itemId);
      const have = itemCount(state, order.itemId);
      const done = orderDone(state, order.id);
      const can = !done && have >= order.qty;
      const pct = Math.min(100, (have / order.qty) * 100);
      body.append(h('div', { class: `order-ticket ${done ? 'done' : ''}` },
        h('div', { class: 'order-ticket-icon' },
          spriteImg(order.kind === 'fish' ? `fish:${order.itemId}` : `icon:${order.itemId}`, 'icon-lg')),
        h('div', { class: 'order-info' },
          h('div', { class: 'order-ticket-kicker' }, t('order.ticket', { n: idx + 1 })),
          h('div', { class: 'order-name' }, `${tl(def.name)} ×${order.qty}`),
          h('div', { class: 'order-track' },
            h('div', { class: 'order-track-fill', style: `width:${pct}%` })),
          h('div', { class: 'order-sub' },
            `${t('order.have', { n: have })} · ${t('order.reward', {
              coins: order.coins, rep: order.reputation, xp: order.xp,
            })}`),
        ),
        done
          ? h('span', { class: 'owned-mark' }, t('order.done'))
          : h('button', {
              class: `btn btn-sm ${can ? 'btn-primary' : 'disabled'}`,
              onclick: () => {
                if (!can) return;
                dispatch(deliverOrder(state, order.id, now()));
                rerender();
              },
            }, can ? t('order.deliver') : t('order.short', { n: order.qty - have })),
      ));
    }
  } else if (activeTab === 'rating') {
    const info = ratingInfo(state);
    const thresholds = [100, 300, 700, 1400, 2500];
    const prev = info.stars > 0 ? thresholds[info.stars - 1] : 0;
    const next = info.next ?? thresholds[thresholds.length - 1];
    const pct = next <= prev ? 100 : Math.min(100, ((info.score - prev) / (next - prev)) * 100);
    const stars = '★'.repeat(info.stars) + '☆'.repeat(5 - info.stars);
    const breakdown: Array<[string, number]> = [
      [t('rating.beauty'), info.breakdown.beauty],
      [t('rating.level'), info.breakdown.level],
      [t('rating.pets'), info.breakdown.pets],
      [t('rating.neighbors'), info.breakdown.neighbors],
      [t('rating.dex'), info.breakdown.dex],
      [t('rating.achievements'), info.breakdown.achievements],
    ];
    const grid = h('div', { class: 'stat-grid' });
    for (const [label, value] of breakdown) {
      grid.append(h('div', { class: 'stat-cell' },
        h('div', { class: 'stat-value' }, `+${value}`),
        h('div', { class: 'stat-label' }, label),
      ));
    }
    body.append(
      h('div', { class: 'rating-hero' },
        h('div', { class: 'rating-stars' }, stars),
        h('div', { class: 'rating-score' }, t('rating.score', { n: info.score })),
        h('div', { class: 'rating-next' },
          info.next === null ? t('rating.max') : t('rating.next', { n: info.next - info.score })),
        h('div', { class: 'ach-bar' },
          h('div', { class: 'ach-bar-fill', style: `width:${pct}%` })),
        info.canClaim
          ? h('button', {
              class: 'btn btn-primary',
              onclick: () => {
                dispatch(claimRatingReward(state));
                rerender();
              },
            }, t('rating.claim', { n: info.claimed + 1 }))
          : h('span', { class: info.claimed > 0 ? 'owned-mark' : 'locked-mark' },
              info.claimed > 0 ? t('rating.claimed') : t('rating.note')),
      ),
      h('div', { class: 'panel-note' }, t('rating.note')),
      h('div', { class: 'stat-section-title' }, t('rating.breakdown')),
      grid,
    );
    if (info.claimed < 5) {
      body.append(h('div', { class: 'rating-reward' },
        t('rating.reward', {
          coins: RATING_REWARDS[info.claimed],
          xp: RATING_XP[info.claimed],
        })));
    }
  } else if (activeTab === 'ach') {
    const summary = achievementSummary(state);
    const all = achievementViews(state);
    const isDone = (v: (typeof all)[number]): boolean =>
      v.claimed >= achievementDef(v.id).tiers.length;
    const counts = {
      all: all.length,
      claimable: all.filter((v) => v.tier > v.claimed).length,
      progress: all.filter((v) => v.tier <= v.claimed && !isDone(v)).length,
      done: all.filter((v) => isDone(v)).length,
    };

    const filterButtons = (['all', 'claimable', 'progress', 'done'] as AchFilter[]).map((id) =>
      h('button', {
        class: `btn btn-sm ${achFilter === id ? 'btn-primary' : ''}`,
        onclick: () => { achFilter = id; rerender(); },
      }, `${t(`ach.filter.${id}`)} (${counts[id]})`));

    const summaryBox = h('div', { class: 'ach-summary' },
      h('div', { class: 'ach-summary-top' },
        h('b', {}, t('ach.overview')),
        h('span', {}, t('ach.completed', {
          done: summary.completed, total: summary.totalAchievements,
        })),
      ),
      h('div', { class: 'ach-bar' },
        h('div', { class: 'ach-bar-fill', style: `width:${summary.percent}%` })),
      h('div', { class: 'ach-summary-meta' },
        h('span', {}, t('ach.stars', {
          claimed: summary.claimedTiers, total: summary.totalTiers,
        })),
        summary.claimable > 0
          ? h('button', {
              class: 'btn btn-sm btn-primary',
              onclick: () => {
                dispatch(claimAllAchievements(state));
                rerender();
              },
            }, t('ach.claimAll', { n: summary.claimable }))
          : h('span', { class: 'owned-mark' }, t('ach.allClaimed')),
      ),
    );

    const views = all
      .filter((v) => achFilter === 'all'
        || (achFilter === 'claimable' && v.tier > v.claimed)
        || (achFilter === 'progress' && v.tier <= v.claimed && !isDone(v))
        || (achFilter === 'done' && isDone(v)))
      .sort((a, b) => {
        const score = (v: typeof a): number => (v.tier > v.claimed ? 0 : isDone(v) ? 2 : 1);
        return score(a) - score(b) || a.id.localeCompare(b.id);
      });

    body.append(summaryBox, h('div', { class: 'ach-filters' }, ...filterButtons));
    if (views.length === 0) body.append(h('div', { class: 'empty-note' }, t('ach.empty')));

    for (const view of views) {
      const def = achievementDef(view.id);
      const claimable = view.tier > view.claimed;
      const done = isDone(view);
      const stars = '★'.repeat(view.claimed) + '☆'.repeat(def.tiers.length - view.claimed);
      const pct = done ? 100 : view.next === null ? 100 : Math.min(100, (view.current / view.next) * 100);
      body.append(h('div', { class: `ach-card ${claimable ? 'claimable' : ''} ${done ? 'done' : ''}` },
        h('div', { class: 'ach-card-head' },
          h('div', { class: 'ach-name' }, tl(def.name)),
          h('div', { class: 'ach-stars' }, stars),
        ),
        h('div', { class: 'ach-desc' },
          `${tl(def.desc)} · ${view.current}${view.next !== null ? ` / ${view.next}` : ` / ${def.tiers[def.tiers.length - 1]}`}`),
        h('div', { class: 'ach-bar' },
          h('div', { class: 'ach-bar-fill', style: `width:${pct}%` })),
        h('div', { class: 'ach-card-foot' },
          h('span', { class: 'ach-reward' }, `${t('ach.reward')}: ${achRewardLine(def.rewardPerTier)}`),
          claimable
            ? h('button', {
                class: 'btn btn-sm btn-primary',
                onclick: () => {
                  dispatch(claimAchievement(state, view.id));
                  rerender();
                },
              }, t('ui.claim'))
            : done
              ? h('span', { class: 'owned-mark' }, t('ach.done'))
              : h('span', { class: 'locked-mark' }, t('ach.next', { n: view.next ?? 0 })),
        ),
      ));
    }
  } else {
    // 统计
    const summary = achievementSummary(state);
    const stats: Array<[string, number | string]> = [
      [t('stat.days'), state.stats.daysPlayed],
      [t('stat.coinsEarned'), state.stats.coinsEarned],
      [t('stat.coinsSpent'), state.stats.coinsSpent],
      [t('stat.itemsSold'), state.stats.itemsSold],
      [t('stat.harvests'), state.stats.harvests],
      [t('stat.plantings'), state.stats.plantings],
      [t('stat.waterings'), state.stats.waterings],
      [t('stat.fish'), state.stats.fishCaught],
      [t('stat.rareFish'), state.stats.rareFishCaught],
      [t('stat.forages'), state.stats.forages],
      [t('stat.hunts'), state.stats.hunts],
      [t('stat.flowers'), state.stats.flowersHarvested],
      [t('stat.breeds'), state.stats.breeds],
      [t('stat.dishes'), state.stats.dishesCooked],
      [t('stat.baits'), state.stats.baitsUsed],
      [t('stat.gifts'), state.stats.giftsGiven],
      [t('stat.trainings'), state.stats.petTrainings],
      [t('stat.contests'), state.stats.petContests],
      [t('stat.beasts'), state.stats.beastsDefeated],
      [t('stat.quests'), state.stats.questsDone],
      [t('stat.expansions'), state.stats.expansions],
    ];

    const statGrid = h('div', { class: 'stat-grid' });
    for (const [label, value] of stats) {
      statGrid.append(h('div', { class: 'stat-cell' },
        h('div', { class: 'stat-value' }, String(value)),
        h('div', { class: 'stat-label' }, label),
      ));
    }

    const unique = (map: Record<string, number>): number =>
      Object.values(map).filter((n) => n > 0).length;
    const collections: Array<[string, number, number]> = [
      [t('stats.fishDex'), unique(state.collections.fish), allFish().length],
      [t('stats.forageDex'), unique(state.collections.forage), allForage().length],
      [t('stats.gameDex'), unique(state.collections.game), allGame().length],
      [t('stats.beastDex'), unique(state.collections.beasts), allBeasts().length],
    ];
    const colGrid = h('div', { class: 'stat-grid' });
    for (const [label, have, total] of collections) {
      colGrid.append(h('div', { class: 'stat-cell' },
        h('div', { class: 'stat-value' }, `${have} / ${total}`),
        h('div', { class: 'stat-label' }, label),
      ));
    }

    body.append(
      h('div', { class: 'ach-summary' },
        h('div', { class: 'ach-summary-top' },
          h('b', {}, t('stats.title')),
          h('span', {}, `Lv.${state.player.level}`),
        ),
        h('div', { class: 'stat-grid stat-grid-sm' },
          h('div', { class: 'stat-cell' },
            h('div', { class: 'stat-value' }, `${state.player.coins}`),
            h('div', { class: 'stat-label' }, t('ui.coins'))),
          h('div', { class: 'stat-cell' },
            h('div', { class: 'stat-value' }, `${summary.completed}/${summary.totalAchievements}`),
            h('div', { class: 'stat-label' }, t('stats.achievements'))),
          h('div', { class: 'stat-cell' },
            h('div', { class: 'stat-value' }, `${state.pets.length}`),
            h('div', { class: 'stat-label' }, t('stats.pets'))),
          h('div', { class: 'stat-cell' },
            h('div', { class: 'stat-value' }, `${state.neighbors.length}`),
            h('div', { class: 'stat-label' }, t('stats.neighbors'))),
        ),
      ),
      h('div', { class: 'stat-section-title' }, t('stats.lifetime')),
      statGrid,
      h('div', { class: 'stat-section-title' }, t('stats.collections')),
      colGrid,
    );
  }
}
