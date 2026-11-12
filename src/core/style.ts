/**
 * 穿搭评分与预设：根据服装稀有度、颜色协调与配饰完整度评分，
 * 并可保存 3 套搭配一键切换。
 */
import type { ActionResult, AvatarConfig, GameState } from './types';
import { clothingDef } from './registry';
import { fail } from './types';

export type StyleTitle = 'casual' | 'fresh' | 'fashion' | 'model';

export interface StyleInfo {
  score: number;
  title: StyleTitle;
  colors: string[];
  premium: number;
  coordination: number;
}

export function styleInfo(avatar: AvatarConfig): StyleInfo {
  const ids = [avatar.top, avatar.bottom, avatar.hat, avatar.accessory, avatar.hair].filter(Boolean) as string[];
  const defs = ids.map((id) => clothingDef(id));
  const premium = defs.filter((d) => d.price > 0).length;
  const colors = [...new Set(defs.map((d) => d.paint.color).filter(Boolean))];
  let coordination = 10;
  if (colors.length === 2) coordination = 20;
  else if (colors.length === 3) coordination = 16;
  else if (colors.length > 3) coordination = 8;
  const complete = avatar.hat && avatar.accessory ? 10 : 0;
  const score = 30 + premium * 8 + coordination + complete;
  const title: StyleTitle = score >= 90 ? 'model' : score >= 70 ? 'fashion' : score >= 45 ? 'fresh' : 'casual';
  return { score, title, colors, premium, coordination };
}

export function saveOutfit(state: GameState, index: number): ActionResult {
  if (index < 0 || index > 2) return fail('msg.notFound');
  if (!state.outfits) state.outfits = [null, null, null];
  state.outfits[index] = { ...state.player.avatar };
  return {
    ok: true,
    events: [
      { type: 'outfit', target: 'outfit', amount: 1 },
      { type: 'toast', target: 'msg.outfitSaved', amount: index + 1 },
    ],
  };
}

export function applyOutfit(state: GameState, index: number): ActionResult {
  const preset = state.outfits?.[index];
  if (!preset) return fail('msg.outfitEmpty');
  state.player.avatar = { ...preset };
  return { ok: true, events: [{ type: 'toast', target: 'msg.outfitApplied' }] };
}

export function clearOutfit(state: GameState, index: number): ActionResult {
  if (!state.outfits?.[index]) return fail('msg.outfitEmpty');
  state.outfits[index] = null;
  return { ok: true };
}
