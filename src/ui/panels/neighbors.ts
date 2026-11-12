/**
 * 邻居面板：NPC 邻居列表（好友度/拜访/雇佣）+ 好友码分享与参观。
 */
import type { ActionResult, GameState, NeighborState } from '../../core/types';
import { itemDef, neighborDef } from '../../core/registry';
import {
  availableNeighborStory, birthdayInfo, chatAvailable, chatWithNeighbor, claimNeighborReward, giftToNeighbor,
  giftableItems, hireNeighbor, neighborStoryPages, nextNeighborReward, playNeighborStory,
  simulateNeighbor, type ChatTopic,
} from '../../core/social';
import {
  friendshipLevel, GIFT_PER_NEIGHBOR_PER_DAY, HELP_PER_NEIGHBOR_PER_DAY, HIRE_COST, NEIGHBOR_STORY_COINS,
  PRANK_PER_NEIGHBOR_PER_DAY,
} from '../../core/balance';
import { beautyScore } from '../../core/build';
import { encodeFriendCode, decodeFriendCode, takeSnapshot, type IslandSnapshot } from '../../social/friendcode';
import { charKey, spriteDataUrl } from '../../render/sprites';
import { t, tl } from '../../i18n';
import { h, clearChildren, spriteImg } from '../dom';
import { closePanel, infoDialog, openPanel, promptDialog } from '../modal';
import { toast } from '../toast';

export interface NeighborPanelCtx {
  state: GameState;
  now: () => number;
  dispatch: (r: ActionResult) => void;
  onVisit: (npcId: string) => void;
  onVisitSnapshot: (snap: IslandSnapshot) => void;
}

export function openNeighbors(ctx: NeighborPanelCtx): void {
  openPanel({
    title: t('panel.neighbors'),
    className: 'panel-wide',
    body: (body) => render(body, ctx),
  });
}

function render(body: HTMLElement, ctx: NeighborPanelCtx): void {
  clearChildren(body);
  const { state } = ctx;

  // ---- 页头与好友码
  body.append(h('div', { class: 'collection-banner' },
    h('div', { class: 'journal-banner-copy' },
      h('div', { class: 'market-kicker' }, 'ISLAND NEIGHBOURS'),
      h('h3', {}, t('nb.guide')),
      h('p', {}, t('nb.guideSub')),
    ),
    h('div', { class: 'journal-progress' },
      h('div', { class: 'journal-progress-ring', style: '--pct:100' },
        h('b', {}, String(state.neighbors.length)), h('span', {}, '')),
      h('small', {}, t('nb.people')),
    ),
  ));
  const codeRow = h('div', { class: 'friendcode-bar' },
    h('span', { class: 'friendcode-note' }, t('nb.friendCode')),
    h('button', {
      class: 'btn btn-sm',
      onclick: () => {
        const code = encodeFriendCode(takeSnapshot(state, beautyScore(state), ctx.now()));
        void navigator.clipboard?.writeText(code).then(
          () => toast(t('nb.codeCopied'), 'good'),
          () => {
            promptDialog(t('nb.myCode'), code, () => {});
          },
        );
      },
    }, `📋 ${t('nb.myCode')}`),
    h('button', {
      class: 'btn btn-sm',
      onclick: () => {
        promptDialog(t('nb.codePrompt'), '', (code) => {
          try {
            const snap = decodeFriendCode(code);
            closePanel();
            ctx.onVisitSnapshot(snap);
          } catch {
            toast(t('nb.codeBad'), 'bad');
          }
        });
      },
    }, `🔍 ${t('nb.visitCode')}`),
  );
  body.append(codeRow);

  // ---- NPC 明信片
  const grid = h('div', { class: 'nb-grid' });
  for (const ns of state.neighbors) {
    simulateNeighbor(ns, ctx.now());
    const persona = neighborDef(ns.defId);
    const fl = friendshipLevel(ns.friendship);
    const prev = fl * fl * 10;
    const next = (fl + 1) * (fl + 1) * 10;
    const pct = Math.min(100, ((ns.friendship - prev) / Math.max(1, next - prev)) * 100);
    const img = document.createElement('img');
    img.src = spriteDataUrl(charKey(persona.avatar));
    img.className = 'nb-portrait';
    const helpsLeft = Math.max(0, HELP_PER_NEIGHBOR_PER_DAY - ns.helpedToday);
    const pranksLeft = Math.max(0, PRANK_PER_NEIGHBOR_PER_DAY - ns.prankedToday);
    const giftsLeft = Math.max(0, GIFT_PER_NEIGHBOR_PER_DAY - (ns.giftedToday ?? 0));
    const chatted = (ns.chattedToday ?? 0) > 0;
    const story = availableNeighborStory(ns);
    const bday = birthdayInfo(state, ns, ctx.now());
    const reward = nextNeighborReward(ns);
    const rewardReady = !!reward && friendshipLevel(ns.friendship) >= reward.level;

    grid.append(h('article', { class: 'nb-postcard' },
      h('div', { class: 'nb-portrait-wrap' },
        img,
        h('span', { class: 'nb-lv' }, `Lv.${fl}`),
      ),
      h('div', { class: 'nb-main' },
        h('div', { class: 'nb-head' },
          h('h4', {}, tl(persona.name)),
          h('span', { class: `nb-birthday ${bday.isBirthday ? 'today' : ''}` },
            bday.isBirthday ? t('nb.birthdayToday')
              : `🎂 ${t(`season.${bday.season}`)} ${bday.day + 1}`),
        ),
        h('div', { class: 'nb-friend-row' },
          h('div', { class: 'nb-friend-bar' }, h('i', { style: `width:${pct}%` })),
          h('span', {}, `${t('nb.friendship')} ${ns.friendship}`),
        ),
        h('div', { class: 'nb-chips' },
          h('span', {}, t('nb.helpLeft', { n: helpsLeft })),
          h('span', {}, t('nb.giftLeft', { n: giftsLeft })),
          h('span', {}, t('nb.prankLeft', { n: pranksLeft })),
        ),
        h('div', { class: 'nb-actions' },
          h('button', {
            class: 'btn btn-primary btn-sm',
            onclick: () => {
              closePanel();
              ctx.onVisit(ns.defId);
            },
          }, t('nb.visit')),
          h('button', {
            class: 'btn btn-sm',
            onclick: () => openGiftPicker(ctx, ns),
          }, bday.isBirthday ? t('nb.giftBirthday') : t('nb.gift')),
          h('button', {
            class: `btn btn-sm ${chatted ? 'disabled' : ''}`,
            onclick: () => { if (!chatted) openChat(ctx, ns); },
          }, chatted ? t('nb.chatted') : t('nb.chat')),
          story
            ? h('button', {
                class: 'btn btn-sm btn-primary',
                onclick: () => openStory(ctx, ns),
              }, t('nb.story'))
            : null,
          rewardReady
            ? h('button', {
                class: 'btn btn-sm btn-primary',
                onclick: () => {
                  ctx.dispatch(claimNeighborReward(ctx.state, ns));
                  render(body, ctx);
                },
              }, t('nb.reward', { coins: reward.coins }))
            : null,
          h('button', {
            class: `btn btn-sm ${state.player.coins < HIRE_COST ? 'disabled' : ''}`,
            title: t('nb.hireDesc'),
            onclick: () => {
              if (state.player.coins < HIRE_COST) return;
              ctx.dispatch(hireNeighbor(state, ns, ctx.now()));
              render(body, ctx);
            },
          }, t('nb.hire', { coins: HIRE_COST })),
        ),
      ),
    ));
  }
  body.append(grid);
}

function openStory(ctx: NeighborPanelCtx, ns: NeighborState): void {
  const story = availableNeighborStory(ns);
  if (!story) return;
  const persona = neighborDef(ns.defId);
  const pages = neighborStoryPages(ns, story.tier);
  let page = 0;

  infoDialog(t('story.title', { name: tl(persona.name) }), (body) => {
    const next = (): void => {
      if (page < pages.length - 1) {
        page += 1;
        draw();
        return;
      }
      const r = playNeighborStory(ctx.state, ns);
      ctx.dispatch(r);
      clearChildren(body);
      if (r.ok) {
        const coins = NEIGHBOR_STORY_COINS[story.tier - 1];
        body.append(h('div', { class: 'story-reward' },
          t('story.reward', { coins, item: tl(itemDef('item_memory_photo').name) })));
      } else {
        body.append(h('div', { class: 'empty-note' }, t('story.notReady')));
      }
    };

    const draw = (): void => {
      clearChildren(body);
      body.append(
        h('div', { class: 'story-page' }, `「${tl(pages[page])}」`),
        h('div', { class: 'story-nav' },
          h('button', { class: 'btn btn-primary', onclick: next },
            page < pages.length - 1 ? t('story.next') : t('story.finish'))),
      );
    };
    draw();
  }, () => openNeighbors(ctx));
}

function openChat(ctx: NeighborPanelCtx, ns: NeighborState): void {
  const persona = neighborDef(ns.defId);
  infoDialog(t('chat.title', { name: tl(persona.name) }), (body) => {
    clearChildren(body);
    const greeting = persona.greetings[0];
    body.append(h('div', { class: 'chat-greeting' }, `「${tl(greeting)}」`));
    if (!chatAvailable(ns)) {
      body.append(h('div', { class: 'chat-done' }, t('chat.doneToday')));
      return;
    }
    const topics: ChatTopic[] = ['crop', 'island', 'joke'];
    body.append(h('div', { class: 'chat-topics' },
      ...topics.map((topic) => h('button', {
        class: 'btn btn-sm',
        onclick: () => {
          const r = chatWithNeighbor(ctx.state, ns, topic, ctx.now());
          ctx.dispatch(r);
          if (!r.ok || !r.chat) return;
          clearChildren(body);
          body.append(
            h('div', { class: 'chat-greeting' }, `「${tl(r.chat.greeting)}」`),
            h('div', { class: 'chat-reply' }, `「${tl(r.chat.reply)}」`),
            h('div', { class: 'chat-gain' }, t('chat.gain', { n: r.chat.gain })),
          );
        },
      }, t(`chat.topic.${topic}`))),
    ));
  }, () => openNeighbors(ctx));
}

function openGiftPicker(ctx: NeighborPanelCtx, ns: NeighborState): void {
  const persona = neighborDef(ns.defId);
  openPanel({
    title: t('gift.title', { name: tl(persona.name) }),
    body: (body) => {
      clearChildren(body);
      const items = giftableItems(ctx.state);
      if (items.length === 0) {
        body.append(h('div', { class: 'empty-note' }, t('gift.empty')));
        return;
      }
      const left = Math.max(0, GIFT_PER_NEIGHBOR_PER_DAY - (ns.giftedToday ?? 0));
      const bday = birthdayInfo(ctx.state, ns, ctx.now());
      body.append(h('div', { class: 'panel-note' },
        bday.isBirthday ? t('gift.birthdayNote') : t('gift.left', { n: left })));
      const list = h('div', { class: 'shop-list' });
      for (const it of items) {
        const def = itemDef(it.id);
        list.append(h('div', { class: 'shop-card' },
          spriteImg(`icon:${it.id}`, 'icon-lg'),
          h('div', { class: 'shop-card-info' },
            h('div', { class: 'shop-card-name' }, tl(def.name)),
            h('div', { class: 'shop-card-sub' }, `${t('ui.sell')} ${it.sell} · ×${it.count}`),
          ),
          h('div', { class: 'shop-card-buy' },
            h('button', {
              class: `btn btn-sm ${left <= 0 ? 'disabled' : 'btn-primary'}`,
              onclick: () => {
                if (left <= 0) return;
                ctx.dispatch(giftToNeighbor(ctx.state, ns, it.id, ctx.now()));
                closePanel();
                openNeighbors(ctx);
              },
            }, t('gift.send')),
          ),
        ));
      }
      body.append(list);
    },
  });
}
