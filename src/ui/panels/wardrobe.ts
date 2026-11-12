/**
 * 造型室：大角色舞台 + 分类衣橱 + 穿搭评分拆解 + Lookbook 存档。
 */
import type { ActionResult, AvatarConfig, ClothingSlot, GameState } from '../../core/types';
import { allClothing } from '../../core/registry';
import { takeOffClothing, wearClothing } from '../../core/economy';
import { applyOutfit, clearOutfit, saveOutfit, styleInfo } from '../../core/style';
import { charKey, spriteDataUrl } from '../../render/sprites';
import { t, tl } from '../../i18n';
import { h, clearChildren, spriteImg } from '../dom';
import { openPanel } from '../modal';

const SLOTS: ClothingSlot[] = ['skin', 'hair', 'face', 'top', 'bottom', 'hat', 'accessory'];

let activeSlot: ClothingSlot = 'top';
let ownedOnly = false;

export function openWardrobe(state: GameState, dispatch: (r: ActionResult) => void, slot?: ClothingSlot): void {
  if (slot) activeSlot = slot;
  openPanel({
    title: t('panel.wardrobe'),
    className: 'panel-wide wd-panel',
    tabs: SLOTS.map((s) => ({ id: s, label: t(`wd.${s}`) })),
    activeTab: activeSlot,
    onTab: (id) => openWardrobe(state, dispatch, id as ClothingSlot),
    body: (body) => render(body, state, dispatch),
  });
}

function avatarImg(avatar: AvatarConfig, cls: string): HTMLImageElement {
  const img = spriteImg('fx:sparkle', cls);
  img.src = spriteDataUrl(charKey(avatar));
  return img;
}

function render(body: HTMLElement, state: GameState, dispatch: (r: ActionResult) => void): void {
  clearChildren(body);
  const rerender = (): void => render(body, state, dispatch);
  const avatar = state.player.avatar;
  const style = styleInfo(avatar);
  const complete = avatar.hat && avatar.accessory ? 10 : 0;
  const premium = style.premium * 8;

  const scoreRing = h('div', {
    class: 'wd-score-ring',
    style: `--score:${Math.min(100, style.score)}`,
  }, h('b', {}, String(style.score)), h('span', {}, '/ 100'));

  const breakdown = h('div', { class: 'wd-breakdown' },
    ...[
      [t('wd.base'), 30, 30],
      [t('wd.premium'), premium, 40],
      [t('wd.coordination'), style.coordination, 20],
      [t('wd.complete'), complete, 10],
    ].map(([label, value, max]) => h('div', { class: 'wd-bar-row' },
      h('span', {}, String(label)),
      h('div', { class: 'wd-bar' }, h('i', { style: `width:${Math.round((Number(value) / Number(max)) * 100)}%` })),
      h('b', {}, `+${value}`),
    )),
  );

  const stage = h('div', { class: 'wd-stage' },
    h('div', { class: 'wd-stage-top' },
      h('div', {},
        h('div', { class: 'wd-kicker' }, 'STYLE STUDIO'),
        h('div', { class: 'wd-stage-name' }, state.player.name),
        h('div', { class: 'wd-stage-title' }, t(`wd.style.${style.title}`)),
      ),
      scoreRing,
    ),
    h('div', { class: 'wd-figure' },
      h('div', { class: 'wd-halo' }),
      avatarImg(avatar, 'wd-figure-img'),
      h('div', { class: 'wd-palette' },
        ...style.colors.slice(0, 5).map((c) => h('span', { class: 'wd-style-dot', style: `background:${c}` }))),
    ),
    h('div', { class: 'wd-breakdown-label' }, t('wd.scoreBreakdown')),
    breakdown,
  );

  const avatarMap = avatar as unknown as Record<string, string | null>;
  const current = avatarMap[activeSlot];
  const all = allClothing().filter((c) => c.slot === activeSlot);
  const visible = all.filter((c) => !ownedOnly || state.player.wardrobe.includes(c.id));
  const ownedCount = all.filter((c) => state.player.wardrobe.includes(c.id)).length;

  const tools = h('div', { class: 'wd-tools' },
    h('button', {
      class: `wd-tool ${ownedOnly ? 'active' : ''}`,
      onclick: () => { ownedOnly = !ownedOnly; rerender(); },
    }, ownedOnly ? t('wd.ownedOnly') : t('wd.all')),
    h('button', {
      class: 'wd-tool',
      onclick: () => {
        const picks: ClothingSlot[] = ['hair', 'face', 'top', 'bottom', 'hat', 'accessory'];
        for (const slot of picks) {
          const owned = allClothing().filter((c) =>
            c.slot === slot && state.player.wardrobe.includes(c.id));
          if (owned.length === 0) continue;
          const pick = owned[Math.floor(Math.random() * owned.length)];
          dispatch(wearClothing(state, pick.id));
        }
        rerender();
      },
    }, `✦ ${t('wd.random')}`),
    (activeSlot === 'hat' || activeSlot === 'accessory') && current
      ? h('button', {
          class: 'wd-tool',
          onclick: () => {
            dispatch(takeOffClothing(state, activeSlot as 'hat' | 'accessory'));
            rerender();
          },
        }, t('wd.takeOff'))
      : null,
  );

  const grid = h('div', { class: 'wd-grid' });
  for (const c of visible) {
    const owned = state.player.wardrobe.includes(c.id);
    const isOn = current === c.id;
    const previewAvatar = { ...avatar, [activeSlot]: c.id } as AvatarConfig;
    const swatch = h('span', { class: 'wd-swatch' });
    swatch.style.background = c.paint.color ?? '#ccc';
    grid.append(h('button', {
      class: `wd-look ${isOn ? 'active' : ''} ${owned ? '' : 'disabled'}`,
      onclick: () => {
        if (!owned || isOn) return;
        dispatch(wearClothing(state, c.id));
        rerender();
      },
    },
      h('div', { class: 'wd-look-figure' }, avatarImg(previewAvatar, 'wd-look-img')),
      h('div', { class: 'wd-look-body' },
        h('div', { class: 'wd-look-name' }, tl(c.name)),
        h('div', { class: 'wd-look-meta' },
          swatch,
          owned
            ? h('span', {}, isOn ? t('wd.wearing') : t('wd.ownedTag'))
            : h('span', {}, `🪙 ${c.price}`),
        ),
      ),
      isOn ? h('span', { class: 'wd-look-check' }, '✓') : null,
    ));
  }
  if (visible.length === 0) {
    grid.append(h('div', { class: 'empty-note' }, t('wd.noItems')));
  }

  const closet = h('div', { class: 'wd-closet' },
    h('div', { class: 'wd-closet-head' },
      h('div', {},
        h('div', { class: 'wd-kicker' }, 'WARDROBE'),
        h('h3', {}, t(`wd.${activeSlot}`)),
        h('div', { class: 'wd-closet-count' }, t('wd.ownedCount', { a: ownedCount, b: all.length })),
      ),
      tools,
    ),
    grid,
  );

  // Lookbook：三套搭配存档
  const presetRow = h('div', { class: 'wd-presets' });
  for (let i = 0; i < 3; i++) {
    const preset = state.outfits?.[i] ?? null;
    if (!preset) {
      presetRow.append(h('div', { class: 'wd-polaroid empty' },
        h('div', { class: 'wd-polaroid-frame empty-frame' }, '+'),
        h('div', { class: 'wd-polaroid-name' }, t('wd.preset', { n: i + 1 })),
        h('button', {
          class: 'btn btn-sm',
          onclick: () => { dispatch(saveOutfit(state, i)); rerender(); },
        }, t('wd.saveLook')),
      ));
      continue;
    }
    presetRow.append(h('div', { class: 'wd-polaroid' },
      h('div', { class: 'wd-polaroid-frame' }, avatarImg(preset, 'wd-preset-img')),
      h('div', { class: 'wd-polaroid-name' }, t('wd.preset', { n: i + 1 })),
      h('div', { class: 'wd-polaroid-actions' },
        h('button', {
          class: 'btn btn-sm btn-primary',
          onclick: () => { dispatch(applyOutfit(state, i)); rerender(); },
        }, t('wd.apply')),
        h('button', {
          class: 'btn btn-sm',
          onclick: () => { dispatch(saveOutfit(state, i)); rerender(); },
        }, t('wd.overwrite')),
        h('button', {
          class: 'wd-mini',
          title: t('wd.clear'),
          onclick: () => { dispatch(clearOutfit(state, i)); rerender(); },
        }, '×'),
      ),
    ));
  }

  body.append(
    h('div', { class: 'wd-studio' }, stage, closet),
    h('div', { class: 'wd-lookbook' },
      h('div', { class: 'wd-lookbook-head' },
        h('span', { class: 'wd-kicker' }, 'LOOKBOOK'),
        h('span', {}, t('wd.lookbookSub')),
      ),
      presetRow,
    ),
  );
}
