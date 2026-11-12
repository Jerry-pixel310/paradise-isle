/**
 * 室内装修：购买家具 → 在三个房间（客厅/卧室/厨房）自由摆放、移动、旋转、收纳。
 * 房间 10×8 网格；部分家具只能放在指定房间；地毯可以和其它家具叠放。
 */
import type { ActionResult, GameState, InteriorPlacement, RoomId } from './types';
import { furnitureDef } from './registry';
import { nextUid, spendCoins } from './player';
import { fail } from './types';

export const ROOM_W = 10;
export const ROOM_H = 8;
export const ROOMS: RoomId[] = ['living', 'bedroom', 'kitchen'];

function isRug(id: string): boolean {
  try { return furnitureDef(id).slot === 'rug'; } catch { return false; }
}

function overlap(
  a: { x: number; y: number; w: number; h: number },
  b: { x: number; y: number; w: number; h: number },
): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

export function roomPlacements(state: GameState, room: RoomId): InteriorPlacement[] {
  if (!state.interior.rooms) {
    state.interior.rooms = { living: [], bedroom: [], kitchen: [] };
  }
  if (!state.interior.rooms[room]) state.interior.rooms[room] = [];
  return state.interior.rooms[room];
}

export function canPlaceFurniture(
  state: GameState, room: RoomId, id: string, x: number, y: number, ignoreUid?: number,
): boolean {
  const def = furnitureDef(id);
  if (def.room && def.room !== room) return false;
  if (x < 0 || y < 0 || x + def.w > ROOM_W || y + def.h > ROOM_H) return false;
  for (const p of roomPlacements(state, room)) {
    if (p.uid === ignoreUid) continue;
    const other = furnitureDef(p.defId);
    if (isRug(id) || isRug(p.defId)) continue;
    if (overlap({ x, y, w: def.w, h: def.h }, { x: p.x, y: p.y, w: other.w, h: other.h })) {
      return false;
    }
  }
  return true;
}

export function buyFurniture(state: GameState, id: string): ActionResult {
  const def = furnitureDef(id);
  if (state.interior.owned.includes(id)) return fail('msg.owned');
  if (state.player.level < def.unlockLevel) return fail('msg.locked');
  if (!spendCoins(state, def.price)) return fail('msg.noCoins');
  state.interior.owned.push(id);
  return { ok: true, events: [{ type: 'toast', target: 'msg.furnitureBought', data: id }] };
}

export function placeFurniture(
  state: GameState, room: RoomId, id: string, x: number, y: number, rot: 0 | 1 = 0,
): ActionResult {
  if (!state.interior.owned.includes(id)) return fail('msg.notOwned');
  if (state.interior.owned.includes(id) && isPlacedAnywhere(state, id)) return fail('msg.owned');
  if (!canPlaceFurniture(state, room, id, x, y)) return fail('msg.cannotPlaceFurniture');
  roomPlacements(state, room).push({ uid: nextUid(state), defId: id, x, y, rot });
  return { ok: true, events: [{ type: 'toast', target: 'msg.furniturePlaced', data: id }] };
}

export function moveFurniture(
  state: GameState, room: RoomId, uid: number, x: number, y: number,
): ActionResult {
  const p = roomPlacements(state, room).find((v) => v.uid === uid);
  if (!p) return fail('msg.notFound');
  if (!canPlaceFurniture(state, room, p.defId, x, y, uid)) return fail('msg.cannotPlaceFurniture');
  p.x = x;
  p.y = y;
  return { ok: true };
}

export function rotateFurniture(state: GameState, room: RoomId, uid: number): ActionResult {
  const p = roomPlacements(state, room).find((v) => v.uid === uid);
  if (!p) return fail('msg.notFound');
  p.rot = p.rot === 0 ? 1 : 0;
  return { ok: true };
}

export function removeFurniture(state: GameState, room: RoomId, uid: number): ActionResult {
  const list = roomPlacements(state, room);
  const idx = list.findIndex((v) => v.uid === uid);
  if (idx < 0) return fail('msg.notFound');
  list.splice(idx, 1);
  return { ok: true };
}

export function furnitureAt(state: GameState, room: RoomId, x: number, y: number): InteriorPlacement | undefined {
  return roomPlacements(state, room).find((p) => {
    const def = furnitureDef(p.defId);
    return x >= p.x && x < p.x + def.w && y >= p.y && y < p.y + def.h;
  });
}

export function isPlacedAnywhere(state: GameState, id: string): boolean {
  return ROOMS.some((room) => roomPlacements(state, room).some((p) => p.defId === id));
}

export function roomOfFurniture(state: GameState, id: string): RoomId | null {
  for (const room of ROOMS) {
    if (roomPlacements(state, room).some((p) => p.defId === id)) return room;
  }
  return null;
}

export function interiorBeauty(state: GameState): number {
  let total = 0;
  for (const room of ROOMS) {
    for (const p of roomPlacements(state, room)) {
      total += furnitureDef(p.defId).beauty;
    }
  }
  return total;
}

export interface PlacedFurniture {
  placement: InteriorPlacement;
  def: ReturnType<typeof furnitureDef>;
}

export function placedFurniture(state: GameState, room: RoomId): PlacedFurniture[] {
  return roomPlacements(state, room).map((placement) => ({
    placement,
    def: furnitureDef(placement.defId),
  }));
}

/** 厨房有炉灶时烹饪经验 +20% */
export function kitchenCraftBonus(state: GameState): number {
  return roomPlacements(state, 'kitchen').some((p) => furnitureDef(p.defId).slot === 'stove') ? 1.2 : 1;
}
