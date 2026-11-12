/**
 * 图鉴：把收藏做成一本海岛野外图鉴，带完成度、筛选与展签式卡片。
 */
import type { ActionResult, DexCategory, GameState } from '../../core/types';
import { allBeasts, allFish, allForage, allGame } from '../../core/registry';
import { claimDexReward, dexProgressAll, dexSummary, DEX_TIER_COINS } from '../../core/dex';
import { t, tl } from '../../i18n';
import { h, clearChildren, spriteImg } from '../dom';
import { openPanel } from '../modal';

let activeTab = 'fish';
let dexFilter: 'all' | 'known' | 'unknown' = 'all';

const DEX_META: Record<DexCategory, { icon: string; label: string }> = {
  fish: { icon: '🐟', label: 'dex.cat.fish' },
  forage: { icon: '🌿', label: 'dex.cat.forage' },
  game: { icon: '🏹', label: 'dex.cat.game' },
  beasts: { icon: '🐗', label: 'dex.cat.beasts' },
};

const RARITY_LABEL: Record<string, { zh: string; en: string }> = {
  common: { zh: '常见', en: 'Common' },
  uncommon: { zh: '少见', en: 'Uncommon' },
  rare: { zh: '稀有', en: 'Rare' },
  epic: { zh: '史诗', en: 'Epic' },
  legendary: { zh: '传说', en: 'Legendary' },
};

const WEATHER_ICON: Record<string, string> = {
  sunny: '☀️', cloudy: '☁️', rain: '🌧️', storm: '⛈️', snow: '❄️',
};

export function openCollections(state: GameState, dispatch: (r: ActionResult) => void, tab?: string): void {
  if (tab) activeTab = tab;
  openPanel({
    title: t('panel.collections'),
    className: 'panel-wide dex-panel',
    tabs: [
      { id: 'fish', label: t('panel.fishdex') },
      { id: 'forage', label: t('panel.foragedex') },
      { id: 'game', label: t('panel.gamedex') },
      { id: 'beasts', label: t('panel.beastdex') },
      { id: 'rewards', label: t('panel.dexRewards') },
    ],
    activeTab,
    onTab: (id) => openCollections(state, dispatch, id),
    body: (body) => render(body, state, dispatch),
  });
}

function collectionBanner(
  kicker: string, title: string, note: string, have: number, total: number,
): HTMLElement {
  const pct = total > 0 ? Math.round((have / total) * 100) : 0;
  return h('div', { class: 'collection-banner' },
    h('div', { class: 'journal-banner-copy' },
      h('div', { class: 'market-kicker' }, kicker),
      h('h3', {}, title),
      h('p', {}, note),
    ),
    h('div', { class: 'journal-progress' },
      h('div', { class: 'journal-progress-ring', style: `--pct:${pct}` },
        h('b', {}, String(have)), h('span', {}, `/ ${total}`)),
      h('small', {}, t('dex.completion')),
    ),
  );
}

function filterRow(known: number, total: number): HTMLElement {
  const items: Array<['all' | 'known' | 'unknown', string, number]> = [
    ['all', t('dex.filter.all'), total],
    ['known', t('dex.filter.known'), known],
    ['unknown', t('dex.filter.unknown'), total - known],
  ];
  return h('div', { class: 'dex-filters' },
    ...items.map(([id, label, count]) => h('button', {
      class: `dex-filter ${dexFilter === id ? 'active' : ''}`,
      onclick: () => { dexFilter = id; rerenderCurrent(); },
    }, `${label} ${count}`)),
  );
}

let rerenderCurrent: () => void = () => {};

function visible(known: boolean): boolean {
  return dexFilter === 'all' || (dexFilter === 'known' && known) || (dexFilter === 'unknown' && !known);
}

function render(body: HTMLElement, state: GameState, dispatch: (r: ActionResult) => void): void {
  clearChildren(body);
  rerenderCurrent = () => render(body, state, dispatch);
  if (activeTab === 'rewards') {
    renderRewards(body, state, dispatch);
    return;
  }

  if (activeTab === 'fish') {
    const fish = allFish();
    const caught = fish.filter((f) => (state.collections.fish[f.id] || 0) > 0).length;
    body.append(
      collectionBanner('FIELD NOTES · FISH', t('panel.fishdex'), t('dex.caught', { a: caught, b: fish.length }), caught, fish.length),
      filterRow(caught, fish.length),
    );
    const grid = h('div', { class: 'dex-grid' });
    for (const f of fish) {
      const n = state.collections.fish[f.id] || 0;
      const known = n > 0;
      if (!visible(known)) continue;
      const seasonText = f.seasons ? f.seasons.map((s) => t(`season.${s}`)).join(' · ') : t('dex.allYear');
      const env: string[] = [];
      if (f.weather) env.push(f.weather.map((w) => WEATHER_ICON[w] ?? '').join(''));
      if (f.time === 'night') env.push(`🌙 ${t('dex.night')}`);
      if (f.time === 'day') env.push(`☀ ${t('dex.day')}`);
      grid.append(h('article', { class: `dex-card rarity-${f.rarity} ${known ? '' : 'unknown'}` },
        h('div', { class: 'dex-art' },
          spriteImg(`fish:${f.id}`, `dex-img ${known ? '' : 'silhouette'}`),
          h('span', { class: 'dex-rarity' }, tl(RARITY_LABEL[f.rarity])),
          known ? h('span', { class: 'dex-count' }, `×${n}`) : null,
        ),
        h('div', { class: 'dex-card-body' },
          h('div', { class: 'dex-name' }, known ? tl(f.name) : t('dex.unknown')),
          known
            ? h('div', { class: 'dex-sub' }, `🗓 ${seasonText}`)
            : h('div', { class: 'dex-sub' }, t('dex.unknownHint')),
          known && env.length ? h('div', { class: 'dex-env' }, env.join(' ')) : null,
          known && f.desc ? h('div', { class: 'dex-desc' }, tl(f.desc)) : null,
        ),
      ));
    }
    body.append(grid);
  } else if (activeTab === 'forage') {
    const list = allForage();
    const got = list.filter((f) => (state.collections.forage[f.id] || 0) > 0).length;
    body.append(
      collectionBanner('FIELD NOTES · FORAGE', t('panel.foragedex'), t('dex.forageNote', { a: got, b: list.length }), got, list.length),
      filterRow(got, list.length),
    );
    const grid = h('div', { class: 'dex-grid' });
    for (const f of list) {
      const n = state.collections.forage[f.id] || 0;
      const known = n > 0;
      if (!visible(known)) continue;
      grid.append(h('article', { class: `dex-card ${known ? '' : 'unknown'}` },
        h('div', { class: 'dex-art' },
          spriteImg(`forage:${f.id}`, `dex-img ${known ? '' : 'silhouette'}`),
          known ? h('span', { class: 'dex-count' }, `×${n}`) : null,
        ),
        h('div', { class: 'dex-card-body' },
          h('div', { class: 'dex-name' }, known ? tl(f.name) : t('dex.unknown')),
          h('div', { class: 'dex-sub' }, known ? `${t('ui.sell')} ${f.sell}` : t('dex.unknownHint')),
        ),
      ));
    }
    body.append(grid);
  } else if (activeTab === 'game') {
    const list = allGame();
    const got = list.filter((g) => (state.collections.game[g.id] || 0) > 0).length;
    body.append(
      collectionBanner('FIELD NOTES · HUNT', t('panel.gamedex'), t('dex.gameNote', { a: got, b: list.length }), got, list.length),
      filterRow(got, list.length),
    );
    const grid = h('div', { class: 'dex-grid' });
    for (const g of list) {
      const n = state.collections.game[g.id] || 0;
      const known = n > 0;
      if (!visible(known)) continue;
      grid.append(h('article', { class: `dex-card ${known ? '' : 'unknown'}` },
        h('div', { class: 'dex-art' },
          spriteImg(`game:${g.id}`, `dex-img ${known ? '' : 'silhouette'}`),
          known ? h('span', { class: 'dex-count' }, `×${n}`) : null,
        ),
        h('div', { class: 'dex-card-body' },
          h('div', { class: 'dex-name' }, known ? tl(g.name) : t('dex.unknown')),
          h('div', { class: 'dex-sub' }, known ? `${t('ui.xp')} +${g.xp}` : t('dex.unknownHint')),
        ),
      ));
    }
    body.append(grid);
  } else {
    const list = allBeasts();
    const got = list.filter((b) => (state.collections.beasts[b.id] || 0) > 0).length;
    body.append(
      collectionBanner('FIELD NOTES · BEASTS', t('panel.beastdex'), t('dex.beastNote'), got, list.length),
      filterRow(got, list.length),
    );
    const grid = h('div', { class: 'dex-grid' });
    for (const b of list) {
      const n = state.collections.beasts[b.id] || 0;
      const known = n > 0;
      if (!visible(known)) continue;
      grid.append(h('article', { class: `dex-card ${b.rare ? 'rarity-epic' : ''} ${known ? '' : 'unknown'}` },
        h('div', { class: 'dex-art' },
          spriteImg(`beast:${b.id}`, `dex-img ${known ? '' : 'silhouette'}`),
          b.rare ? h('span', { class: 'dex-rarity' }, t('dex.rare')) : null,
          known ? h('span', { class: 'dex-count' }, `×${n}`) : null,
        ),
        h('div', { class: 'dex-card-body' },
          h('div', { class: 'dex-name' }, known ? tl(b.name) : t('dex.unknown')),
          h('div', { class: 'dex-sub' }, known ? '' : t('dex.unknownHint')),
        ),
      ));
    }
    body.append(grid);
  }
}

function renderRewards(body: HTMLElement, state: GameState, dispatch: (r: ActionResult) => void): void {
  const summary = dexSummary(state);
  body.append(h('div', { class: 'collection-banner' },
    h('div', { class: 'journal-banner-copy' },
      h('div', { class: 'market-kicker' }, 'COLLECTION MILESTONES'),
      h('h3', {}, t('panel.dexRewards')),
      h('p', {}, `${t('dex.rewardsNote')} · ${t('dex.summary', { a: summary.claimed, b: summary.total })}`),
    ),
    h('div', { class: 'journal-progress' },
      h('div', { class: 'journal-progress-ring', style: `--pct:${Math.round((summary.claimed / summary.total) * 100)}` },
        h('b', {}, String(summary.claimed)), h('span', {}, `/ ${summary.total}`)),
      h('small', {}, t('dex.claimed')),
    ),
  ));

  for (const p of dexProgressAll(state)) {
    const meta = DEX_META[p.category];
    const pct = p.total === 0 ? 0 : Math.round((p.have / p.total) * 100);
    const tiers = p.tiers.map((target, i) => {
      const claimed = i < p.claimed;
      const can = !claimed && i === p.claimed && p.have >= target;
      return h('div', { class: `dex-tier ${claimed ? 'done' : can ? 'ready' : ''}` },
        h('span', { class: 'dex-tier-target' }, `${target}`),
        h('span', { class: 'dex-tier-reward' }, `+${DEX_TIER_COINS[i]}`),
        claimed
          ? h('span', { class: 'owned-mark' }, '✓')
          : can
            ? h('button', {
                class: 'btn btn-sm btn-primary',
                onclick: () => {
                  dispatch(claimDexReward(state, p.category));
                  renderRewards(body, state, dispatch);
                },
              }, t('dex.claim'))
            : h('span', { class: 'locked-mark' }, `${p.have}/${target}`),
      );
    });

    body.append(h('div', { class: 'dex-reward-card' },
      h('div', { class: 'dex-reward-head' },
        h('span', { class: 'dex-reward-icon' }, meta.icon),
        h('span', { class: 'dex-reward-name' }, t(meta.label)),
        h('span', { class: 'dex-reward-count' }, `${p.have} / ${p.total}`),
      ),
      h('div', { class: 'ach-bar' },
        h('div', { class: 'ach-bar-fill', style: `width:${pct}%` })),
      h('div', { class: 'dex-tiers' }, ...tiers),
    ));
  }
}
