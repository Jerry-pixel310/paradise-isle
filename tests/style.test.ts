/** 穿搭评分与预设测试 */
import { describe, expect, it } from 'vitest';
import { makeGame, NOW } from './helpers';
import { applyOutfit, clearOutfit, saveOutfit, styleInfo } from '../src/core/style';
import { applyEvents } from '../src/core/quests';
import { deserialize } from '../src/save/save';

describe('穿搭评分', () => {
  it('更完整的搭配分数更高', () => {
    const state = makeGame();
    const base = styleInfo(state.player.avatar);
    const fancy = {
      ...state.player.avatar,
      top: 'cl_top_tang',
      bottom: 'cl_bottom_skirt',
      hat: 'cl_hat_flower',
      accessory: 'cl_acc_scarf',
      hair: 'cl_hair_pony_gold',
    };
    const strong = styleInfo(fancy);
    expect(strong.score).toBeGreaterThan(base.score);
    expect(strong.premium).toBeGreaterThan(base.premium);
    expect(['casual', 'fresh', 'fashion', 'model']).toContain(strong.title);
  });

  it('颜色数量会影响协调分', () => {
    const state = makeGame();
    const a = styleInfo({ ...state.player.avatar, top: 'cl_top_tang', bottom: 'cl_bottom_skirt', hat: null, accessory: null });
    expect(a.colors.length).toBeGreaterThan(0);
    expect(a.coordination).toBeGreaterThan(0);
  });
});

describe('穿搭预设', () => {
  it('保存、覆盖、应用与清空', () => {
    const state = makeGame();
    const original = { ...state.player.avatar };

    const r = saveOutfit(state, 0);
    expect(r.ok).toBe(true);
    expect(state.outfits[0]).toEqual(original);
    applyEvents(state, r.events!, NOW);
    expect(state.stats.outfitsSaved).toBe(1);

    state.player.avatar.top = 'cl_top_tee_coral';
    expect(applyOutfit(state, 0).ok).toBe(true);
    expect(state.player.avatar.top).toBe(original.top);

    expect(applyOutfit(state, 1).ok).toBe(false); // 空槽
    expect(clearOutfit(state, 0).ok).toBe(true);
    expect(state.outfits[0]).toBeNull();
  });
});

describe('穿搭存档迁移', () => {
  it('v21 补齐 outfits 与 outfitsSaved', () => {
    const state = makeGame();
    const raw = JSON.parse(JSON.stringify(state)) as Record<string, unknown>;
    raw.version = 21;
    delete raw.outfits;
    delete (raw.stats as unknown as Record<string, unknown>).outfitsSaved;

    const migrated = deserialize(JSON.stringify(raw), NOW);

    expect(migrated.version).toBe(31);
    expect(migrated.outfits).toEqual([null, null, null]);
    expect(migrated.stats.outfitsSaved).toBe(0);
  });
});
