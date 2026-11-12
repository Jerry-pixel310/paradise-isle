/**
 * 入口：注册内容 → 标题界面（存档槽位）→ 进入游戏（含离线结算摘要）。
 */
import './data'; // 注册全部内容表
import type { AvatarConfig, GameState } from './core/types';
import { settleOffline, type OfflineSummary } from './core/offline';
import { itemDef } from './core/registry';
import { deleteSlot, loadFromSlot, newGameInSlot, slotInfos } from './save/save';
import { setLang, getLang, fmtDuration, t, tl } from './i18n';
import { h, clearChildren, spriteImg } from './ui/dom';
import { initToast } from './ui/toast';
import { initTooltip } from './ui/tooltip';
import { initModal, confirmDialog, infoDialog, promptDialog } from './ui/modal';
import { initActionMenu } from './ui/actionMenu';
import { charKey, spriteDataUrl } from './render/sprites';
import { App } from './game/app';
import { sfx } from './audio/sound';

let currentApp: App | null = null;

function canvasEl(): HTMLCanvasElement {
  return document.getElementById('game-canvas') as HTMLCanvasElement;
}

function showOfflineSummary(state: GameState, summary: OfflineSummary): void {
  infoDialog(t('off.title', { name: state.player.name }), (body) => {
    const lines: string[] = [t('off.away', { t: fmtDuration(summary.awayMs) })];
    if (summary.cropsReady > 0) lines.push(`🌾 ${t('off.crops', { n: summary.cropsReady })}`);
    if (summary.animalsReady > 0) lines.push(`🥚 ${t('off.animals', { n: summary.animalsReady })}`);
    if (summary.beastsArrived > 0) lines.push(`⚔ ${t('off.beasts', { n: summary.beastsArrived })}`);
    if (summary.weedsGrown > 0) lines.push(`🌿 ${t('off.weeds', { n: summary.weedsGrown })}`);
    if (summary.cropsTrampled > 0) lines.push(`💥 ${t('off.trampled', { n: summary.cropsTrampled })}`);
    if (summary.energyRestored > 0) lines.push(`⚡ ${t('off.energy', { n: summary.energyRestored })}`);
    if (summary.petGift) {
      try {
        lines.push(`🎁 ${t('off.gift', { name: tl(itemDef(summary.petGift).name) })}`);
      } catch { /* ignore */ }
    }
    for (const line of lines) body.append(h('div', { class: 'off-line' }, line));
  });
}

function startGame(state: GameState, slot: number, offline: OfflineSummary | null): void {
  // 默认开启无限体力；老存档未设置时自动补上
  if (state.settings.unlimited === undefined) state.settings.unlimited = true;
  // the language is a per-browser choice; saves just follow it
  state.settings.lang = getLang();
  const title = document.getElementById('title-screen');
  canvasEl().classList.remove('hidden');
  title?.classList.add('leaving');
  currentApp?.destroy();
  currentApp = new App(canvasEl(), state, slot, () => showTitle());
  window.setTimeout(() => title?.classList.add('hidden'), 420);
  if (offline) showOfflineSummary(state, offline);
}

function showTitle(): void {
  currentApp?.destroy();
  currentApp = null;
  canvasEl().classList.add('hidden');
  const title = document.getElementById('title-screen')!;
  title.classList.remove('hidden', 'leaving');
  renderTitle(title);
}

/** 开场插画：由代码绘制的黄昏海岛，不使用外部图片。 */
function titleScene(): HTMLElement {
  const wrap = h('div', { class: 'title-scene', 'aria-hidden': 'true' });
  wrap.innerHTML = `
<svg viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#0c2730"/>
      <stop offset="0.42" stop-color="#285c60"/>
      <stop offset="0.72" stop-color="#9c8166"/>
      <stop offset="1" stop-color="#d7a273"/>
    </linearGradient>
    <radialGradient id="sun" cx="50%" cy="50%" r="50%">
      <stop offset="0" stop-color="#ffe6b0" stop-opacity="0.95"/>
      <stop offset="0.45" stop-color="#f4c07e" stop-opacity="0.42"/>
      <stop offset="1" stop-color="#f4c07e" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="sea" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#3f7d7d"/>
      <stop offset="0.4" stop-color="#20545d"/>
      <stop offset="1" stop-color="#0a252d"/>
    </linearGradient>
    <linearGradient id="sand" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#d9c19a"/>
      <stop offset="1" stop-color="#a88f69"/>
    </linearGradient>
    <linearGradient id="grass" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#5f7f58"/>
      <stop offset="1" stop-color="#3e5d47"/>
    </linearGradient>
    <linearGradient id="scrim" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#071b21" stop-opacity="0.72"/>
      <stop offset="0.48" stop-color="#071b21" stop-opacity="0.18"/>
      <stop offset="1" stop-color="#071b21" stop-opacity="0.5"/>
    </linearGradient>
    <filter id="blur40"><feGaussianBlur stdDeviation="40"/></filter>
    <filter id="blur10"><feGaussianBlur stdDeviation="10"/></filter>
  </defs>

  <rect width="1440" height="900" fill="url(#sky)"/>
  <circle cx="1070" cy="300" r="210" fill="url(#sun)"/>
  <circle cx="1070" cy="300" r="86" fill="#ffe6b8" opacity="0.9"/>

  <g fill="#ffe9cf" opacity="0.14" filter="url(#blur10)">
    <path d="M80 210c40-36 100-36 142-4 26-20 76-18 96 8 54-8 84 18 92 42H58c2-18 8-32 22-46z"/>
    <path d="M760 150c34-26 84-24 112 2 28-16 66-12 82 10 42-4 64 16 70 34H734c2-14 10-30 26-46z"/>
  </g>

  <g opacity="0.55" fill="#163b40">
    <path d="M0 500c130-64 230-78 340-46 92 26 144 8 210-18 72-28 160-14 214 20 58 36 142 34 236 8v120H0z"/>
  </g>
  <rect y="500" width="1440" height="400" fill="url(#sea)"/>
  <g stroke="#b8d9cf" stroke-width="2" opacity="0.16" fill="none">
    <path d="M0 570c120 12 180 12 300 0s180-12 300 0 180 12 300 0 180-12 300 0 180 12 240 0"/>
    <path d="M0 650c120 12 180 12 300 0s180-12 300 0 180 12 300 0 180-12 300 0 180 12 240 0"/>
    <path d="M0 760c120 14 180 14 300 0s180-14 300 0 180 14 300 0 180-14 300 0 180 14 240 0"/>
  </g>

  <g>
    <ellipse cx="600" cy="660" rx="340" ry="118" fill="#0a232a" opacity="0.55" filter="url(#blur40)"/>
    <ellipse cx="600" cy="646" rx="320" ry="104" fill="url(#sand)"/>
    <path d="M320 638c34-74 130-136 270-140 142-4 238 48 286 106 22 26 30 54 16 72-20 26-92 38-174 40-88 2-182 8-258-6-58-10-92-30-104-44-8-8-6-18-36-28z" fill="url(#grass)"/>
    <path d="M340 652c52 26 150 36 252 34 110-2 200-12 258-38 18 18 6 34-18 48-40 22-126 34-240 34-118 0-210-12-252-46-8-6-8-22 0-32z" fill="#c7ad83" opacity="0.9"/>

    <g transform="translate(486 512)">
      <path d="M0 66l52-34 52 34v62H0z" fill="#d8c3a0"/>
      <path d="M-10 68L52 24l62 44-10 12L52 42 0 80z" fill="#8b4d3e"/>
      <rect x="14" y="82" width="18" height="46" fill="#6f4c35"/>
      <rect x="74" y="80" width="16" height="18" fill="#f0d49a"/>
      <rect x="46" y="16" width="10" height="20" fill="#6f4c35"/>
    </g>

    <g transform="translate(760 520)" fill="#2f5145">
      <path d="M6 126c10-48 4-96 18-142" stroke="#4a6b55" stroke-width="9" fill="none"/>
      <g>
        <path d="M22 0c-34 2-58 18-70 40 30 2 52-10 70-24z"/>
        <path d="M22 4c28-14 56-10 78 6-20 22-50 26-78 18z"/>
        <path d="M20 16c-26 10-40 30-42 54 26-6 42-24 50-44z"/>
        <path d="M24 20c26 6 44 22 52 44-28 2-48-12-60-32z"/>
      </g>
    </g>
    <g transform="translate(414 552)" fill="#28483e" opacity="0.92">
      <path d="M8 112c6-40 2-80 12-118" stroke="#41604b" stroke-width="7" fill="none"/>
      <path d="M20-2C-8 0-28 14-38 32c26 2 44-8 58-20z"/>
      <path d="M20 2C42-8 64-4 82 10 64 30 40 32 20 24z"/>
      <path d="M18 14C-4 22-16 38-18 58c22-4 36-20 44-36z"/>
    </g>

    <path d="M700 690l118-18v10l-118 20z" fill="#6f513b"/>
    <path d="M742 700v34M770 696v32M796 690v30" stroke="#6f513b" stroke-width="5"/>
  </g>

  <g stroke="#efd9bd" stroke-width="2" fill="none" opacity="0.55">
    <path d="M1110 200c8-8 16-8 24 0M1140 214c7-6 14-6 21 0"/>
    <path d="M240 300c7-7 14-7 21 0M266 312c6-5 12-5 18 0"/>
  </g>
  <rect width="1440" height="900" fill="url(#scrim)"/>
</svg>`;
  return wrap;
}

function renderTitle(root: HTMLElement): void {
  clearChildren(root);
  root.classList.add('title-v2');
  const slots = slotInfos();
  const recent = slots.reduce((best, info, i) =>
    info && (!best || info.savedAt > (slots[best]?.savedAt ?? 0)) ? i : best, -1 as number);
  const slotList = h('div', { class: 'slot-list' });

  slots.forEach((info, i) => {
    if (info) {
      const date = new Intl.DateTimeFormat(getLang() === 'zh' ? 'zh-CN' : 'en-US', {
        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
      }).format(new Date(info.savedAt));
      const thumb = spriteImg('fx:sparkle', 'save-avatar');
      if (info.avatar) thumb.src = spriteDataUrl(charKey(info.avatar as AvatarConfig));
      const card = h('div', {
        class: `save-card ${i === recent ? 'recent' : ''}`,
        role: 'button',
        tabindex: '0',
        onclick: () => {
          sfx('click');
          const now = Date.now();
          const state = loadFromSlot(i, now);
          if (!state) return;
          const offline = settleOffline(state, now);
          startGame(state, i, offline);
        },
        onkeydown: (e: Event) => {
          const key = (e as KeyboardEvent).key;
          if (key === 'Enter' || key === ' ') (e.currentTarget as HTMLElement).click();
        },
      },
        h('div', { class: 'save-thumb' }, thumb),
        h('div', { class: 'save-info' },
          h('div', { class: 'save-kicker' },
            i === recent ? t('title.recent') : t('title.slot', { n: i + 1 })),
          h('div', { class: 'save-name' }, info.name),
          h('div', { class: 'save-stats' },
            h('span', {}, `Lv.${info.level}`),
            h('span', {}, `🪙 ${info.coins}`),
            h('span', {}, t('title.days', { n: info.days })),
          ),
          h('div', { class: 'save-date' }, date),
        ),
        h('div', { class: 'save-go' }, '→'),
        h('button', {
          class: 'save-del',
          title: t('start.delete'),
          onclick: (e: Event) => {
            e.stopPropagation();
            confirmDialog(t('start.deleteConfirm'), () => {
              deleteSlot(i);
              renderTitle(root);
            });
          },
        }, '×'),
      );
      slotList.append(card);
    } else {
      slotList.append(h('div', {
        class: 'save-card empty',
        role: 'button',
        tabindex: '0',
        onclick: () => {
          sfx('click');
          promptDialog(t('start.namePrompt'), t('start.defaultName'), (name) => {
            const state = newGameInSlot(name.trim() || t('start.defaultName'), i, Date.now());
            startGame(state, i, null);
          });
        },
        onkeydown: (e: Event) => {
          const key = (e as KeyboardEvent).key;
          if (key === 'Enter' || key === ' ') (e.currentTarget as HTMLElement).click();
        },
      },
        h('div', { class: 'save-thumb plus' }, '+'),
        h('div', { class: 'save-info' },
          h('div', { class: 'save-kicker' }, t('title.emptyKicker')),
          h('div', { class: 'save-name' }, t('start.newGame')),
          h('div', { class: 'save-date' }, t('title.emptyHint')),
        ),
        h('div', { class: 'save-go' }, '→'),
      ));
    }
  });

  const hero = h('div', { class: 'title-hero' },
    h('div', { class: 'title-eyebrow' },
      h('span', {}, 'PARADISE ISLE'),
      h('i', {}),
      h('span', {}, t('title.eyebrow')),
    ),
    h('h1', { class: 'title-logo' }, t('start.title')),
    h('p', { class: 'title-sub' }, t('start.subtitle')),
    h('p', { class: 'title-tagline' }, t('start.tagline')),
    h('div', { class: 'title-chapters' },
      ...[
        ['01', t('title.chapter1')],
        ['02', t('title.chapter2')],
        ['03', t('title.chapter3')],
      ].map(([n, label]) => h('div', { class: 'title-chapter' },
        h('b', {}, n), h('span', {}, label))),
    ),
    h('div', { class: 'title-meta' },
      h('span', {}, t('title.edition')),
      h('span', {}, '·'),
      h('span', {}, t('title.madeBy')),
    ),
  );

  const journal = h('aside', { class: 'title-journal' },
    h('div', { class: 'journal-top' },
      h('span', { class: 'journal-kicker' }, 'ISLAND JOURNAL'),
      h('span', { class: 'journal-count' }, t('title.saves', { n: slots.filter(Boolean).length })),
    ),
    h('h2', {}, t('title.journal')),
    h('p', { class: 'journal-sub' }, t('title.journalSub')),
    slotList,
    h('div', { class: 'title-footer' },
      h('span', {}, t('start.footer')),
      h('a', { href: 'https://github.com/appleweiping/paradise-isle', target: '_blank', rel: 'noreferrer' }, 'GitHub'),
    ),
  );

  root.append(
    titleScene(),
    h('button', {
      class: 'btn btn-sm title-lang',
      title: t('start.langSwitchTitle'),
      onclick: () => {
        sfx('click');
        setLang(getLang() === 'zh' ? 'en' : 'zh');
        renderTitle(root);
      },
    }, t('start.langSwitch')),
    h('div', { class: 'title-screen-inner' }, hero, journal),
  );
}

function boot(): void {
  initToast();
  initModal();
  initActionMenu();
  initTooltip();
  setLang(getLang()); // sync <html lang> and the page title
  showTitle();
}

boot();
