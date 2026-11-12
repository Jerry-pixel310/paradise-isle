/**
 * 手作面板：料理 / 花艺 / 牧场加工三个标签页，直接消耗背包材料制作。
 */
import type { ActionResult, GameState, RecipeDef } from '../../core/types';
import { allRecipes, itemDef } from '../../core/registry';
import { canCraft, craft } from '../../core/craft';
import { kitchenCraftBonus } from '../../core/interior';
import { t, tl } from '../../i18n';
import { h, clearChildren, spriteImg } from '../dom';
import { openPanel } from '../modal';

let activeTab: RecipeDef['tab'] = 'cook';

export interface CraftCtx {
  state: GameState;
  now: () => number;
  dispatch: (r: ActionResult) => void;
}

export function openCrafting(ctx: CraftCtx, tab?: 'cook' | 'flower' | 'ranch'): void {
  if (tab) activeTab = tab;
  openPanel({
    title: t('craft.title'),
    className: 'panel-wide',
    tabs: [
      { id: 'cook', label: t('craft.cook') },
      { id: 'flower', label: t('craft.flower') },
      { id: 'ranch', label: t('craft.ranch') },
    ],
    activeTab,
    onTab: (id) => openCrafting(ctx, id as 'cook' | 'flower' | 'ranch'),
    body: (body) => render(body, ctx),
  });
}

function render(body: HTMLElement, ctx: CraftCtx): void {
  clearChildren(body);
  const { state } = ctx;
  const recipes = allRecipes().filter((r) => r.tab === activeTab);
  const bonus = activeTab === 'cook' && kitchenCraftBonus(state) > 1;
  const descriptions: Record<RecipeDef['tab'], string> = {
    cook: t('craft.desc.cook'),
    flower: t('craft.desc.flower'),
    ranch: t('craft.desc.ranch'),
  };
  body.append(h('div', { class: 'collection-banner' },
    h('div', { class: 'journal-banner-copy' },
      h('div', { class: 'market-kicker' }, 'CRAFT KITCHEN'),
      h('h3', {}, t(`craft.${activeTab}`)),
      h('p', {}, `${descriptions[activeTab]}${bonus ? ` · ${t('craft.kitchenBonus')}` : ''}`),
    ),
    h('div', { class: 'craft-count' },
      h('b', {}, String(recipes.length)),
      h('span', {}, t('craft.recipes')),
    ),
  ));
  const grid = h('div', { class: 'craft-grid' });
  for (const r of recipes) grid.append(card(r, state, ctx));
  body.append(grid);
}

function card(r: RecipeDef, state: GameState, ctx: CraftCtx): HTMLElement {
  const out = itemDef(r.outputId);
  const ok = canCraft(state, r);
  const inputs = h('div', { class: 'craft-materials' });
  for (const [id, n] of Object.entries(r.inputs)) {
    const have = state.inventory[id] || 0;
    inputs.append(h('span', { class: `craft-material ${have >= n ? '' : 'missing'}` },
      spriteImg(`icon:${id}`, 'icon-sm'),
      `${tl(itemDef(id).name)} ${have}/${n}`,
    ));
  }
  const effect: string[] = [];
  if (out.useEnergy) effect.push(`+${out.useEnergy} ${t('ui.energy')}`);
  if (out.useFood) effect.push(`+${out.useFood} ${t('ui.food')}`);
  if (out.sell > 0) effect.push(`${t('ui.sell')} ${out.sell}`);

  return h('article', { class: `craft-recipe ${ok ? '' : 'locked'}` },
    h('div', { class: 'craft-art' },
      spriteImg(`icon:${r.outputId}`, 'craft-img'),
      h('span', { class: 'craft-output' }, `×${r.outputCount}`),
    ),
    h('div', { class: 'craft-recipe-body' },
      h('div', { class: 'craft-name' }, tl(out.name)),
      inputs,
      h('div', { class: 'craft-effects' },
        ...effect.map((e) => h('span', {}, e)),
        h('span', {}, `${t('ui.xp')} +${r.xp}`)),
    ),
    h('div', { class: 'craft-recipe-foot' },
      h('span', { class: 'craft-energy' }, t('craft.energy')),
      h('button', {
        class: `btn btn-sm ${ok ? 'btn-primary' : 'disabled'}`,
        onclick: () => {
          if (!ok) return;
          ctx.dispatch(craft(state, r.id, ctx.now()));
          openCrafting(ctx);
        },
      }, ok ? t('craft.make') : t('craft.missing')),
    ),
  );
}
