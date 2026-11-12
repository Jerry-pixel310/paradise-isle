/**
 * 宠物系统：领养 → 喂食/玩耍养成 → 被动技能。
 * 技能：小狗驱兽 / 猫咪幸运钓鱼 / 兔子鼓舞(能量恢复+10%) / 每日寻宝。
 */
import type { ActionResult, GameEvent, GameState, PetInstance } from './types';
import { petDef } from './registry';
import {
  ENERGY_COST, PET_FEED_FOOD, PET_HUNGRY_AFTER_MS, PET_PLAY_COOLDOWN_MS,
  PET_SKILL_COOLDOWN_MS, PET_SKILL_LUCKY_MS,
  PET_TRAIN_COOLDOWN_MS, PET_TRAIN_XP_BASE, PET_TRAIN_XP_PER_HIT,
  PET_XP_FEED, PET_XP_PLAY, petLevel,
} from './balance';
import { addItem, gainEnergy, gainXp, nextUid, petHasSkill, spendCoins, spendEnergy, spendFood } from './player';
import { findFreeGrass, isOccupied, terrainAt } from './island';
import { roll, rollPick } from './rng';
import { fail } from './types';

export function petByUid(state: GameState, uid: number): PetInstance | undefined {
  return state.pets.find((p) => p.uid === uid);
}

export function adoptPet(state: GameState, defId: string, name: string, now: number): ActionResult {
  const def = petDef(defId);
  if (state.player.level < def.unlockLevel) return fail('msg.locked');
  if (state.pets.some((p) => p.defId === defId)) return fail('msg.owned');
  if (!spendCoins(state, def.price)) return fail('msg.noCoins');
  const spot = findFreeGrass(state, roll) ?? { x: 0, y: 0 };
  state.pets.push({
    uid: nextUid(state), defId, name: name || def.name.zh, adoptedAt: now,
    fedAt: now, playedAt: 0, xp: 0, skillUsedAt: 0, x: spot.x, y: spot.y,
  });
  return { ok: true, events: [{ type: 'adoptPet', target: defId, amount: 1 }] };
}

export function petHungry(pet: PetInstance, now: number): boolean {
  return now - pet.fedAt >= PET_HUNGRY_AFTER_MS;
}

export function petMood(pet: PetInstance, now: number): 'happy' | 'ok' | 'hungry' {
  if (petHungry(pet, now)) return 'hungry';
  return now - pet.playedAt < PET_PLAY_COOLDOWN_MS * 4 ? 'happy' : 'ok';
}

export function feedPet(state: GameState, uid: number, now: number): ActionResult {
  const pet = petByUid(state, uid);
  if (!pet) return fail('msg.notFound');
  if (!petHungry(pet, now)) return fail('msg.notHungry');
  if (!spendFood(state, PET_FEED_FOOD)) return fail('msg.noFood');
  pet.fedAt = now;
  pet.xp += PET_XP_FEED;
  return { ok: true, events: [{ type: 'feedPet', target: pet.defId, amount: 1 }] };
}

export function playPet(state: GameState, uid: number, now: number): ActionResult {
  const pet = petByUid(state, uid);
  if (!pet) return fail('msg.notFound');
  if (now - pet.playedAt < PET_PLAY_COOLDOWN_MS) return fail('msg.playCd');
  if (!spendEnergy(state, ENERGY_COST.playPet, now)) return fail('msg.noEnergy');
  pet.playedAt = now;
  pet.xp += PET_XP_PLAY;
  const levelEvents = gainXp(state, 2);
  return { ok: true, events: [{ type: 'playPet', target: pet.defId, amount: 1 }, ...levelEvents] };
}

export function petLevelOf(pet: PetInstance): number {
  return petLevel(pet.xp);
}

/**
 * 训练宠物：score 为小游戏命中数 0-3。
 * 消耗 1 能量，20 分钟冷却；经验 = 6 + 命中 × 8。
 */
export function trainPet(
  state: GameState, uid: number, score: number, now: number,
): ActionResult {
  const pet = petByUid(state, uid);
  if (!pet) return fail('msg.notFound');
  if (now - (pet.lastTrainedAt ?? 0) < PET_TRAIN_COOLDOWN_MS) return fail('msg.trainCd');
  if (!spendEnergy(state, ENERGY_COST.trainPet, now)) return fail('msg.noEnergy');

  const hits = Math.max(0, Math.min(3, Math.round(score)));
  const gained = PET_TRAIN_XP_BASE + hits * PET_TRAIN_XP_PER_HIT;
  const before = petLevel(pet.xp);
  pet.xp += gained;
  pet.lastTrainedAt = now;
  const after = petLevel(pet.xp);

  const events: GameEvent[] = [
    { type: 'trainPet', target: pet.defId, amount: 1 },
    { type: 'toast', target: 'msg.trainDone', amount: gained },
  ];
  if (after > before) events.push({ type: 'toast', target: 'msg.petLevelUp', amount: after });
  return { ok: true, events };
}

/** 主动使用宠物技能 */
export function usePetSkill(state: GameState, uid: number, now: number): ActionResult {
  const pet = petByUid(state, uid);
  if (!pet) return fail('msg.notFound');
  if (now - pet.skillUsedAt < PET_SKILL_COOLDOWN_MS) return fail('msg.skillCd');
  const def = petDef(pet.defId);
  const events: GameEvent[] = [{ type: 'petSkill', target: pet.defId, amount: 1 }];

  if (def.skill === 'scare_beast') {
    if (state.beasts.length === 0) return fail('msg.skillNoTarget');
    state.beasts.shift();
    events.push({ type: 'toast', target: 'msg.skillScare' });
  } else if (def.skill === 'lucky_fish') {
    state.buffs.luckyFishUntil = now + PET_SKILL_LUCKY_MS;
    events.push({ type: 'toast', target: 'msg.skillLucky' });
  } else if (def.skill === 'cheer') {
    gainEnergy(state, 15);
    events.push({ type: 'toast', target: 'msg.skillCheer' });
  } else {
    const gift = rollPick(GIFT_POOL);
    addItem(state, gift, 1);
    events.push({ type: 'toast', target: 'msg.skillGift', data: gift });
  }

  pet.skillUsedAt = now;
  return { ok: true, events };
}

export function petSkillReady(pet: PetInstance, now: number): boolean {
  return now - pet.skillUsedAt >= PET_SKILL_COOLDOWN_MS;
}
const GIFT_POOL = ['item_shell', 'item_pearl', 'item_bone', 'item_amber'];
export function tickPetGifts(state: GameState, now: number): string | null {
  for (const pet of state.pets) {
    if (!petHasSkill(state, pet.defId, 'find_gift')) continue;
    if (now - pet.skillUsedAt < 20 * 3600_000) continue;
    pet.skillUsedAt = now;
    const gift = rollPick(GIFT_POOL);
    addItem(state, gift, 1);
    return gift;
  }
  return null;
}

/**
 * 宠物跟随：离玩家太远时朝玩家挪一格，慢慢跟上来。
 * 只在陆地上走，不抢地块/建筑/动物占用的格子。
 */
export function tickPetsFollow(state: GameState, now: number): void {
  for (const pet of state.pets) {
    if (now < (pet.nextMoveAt ?? 0)) continue;
    pet.nextMoveAt = now + 900 + roll() * 900;
    const dx = state.player.px - pet.x;
    const dy = state.player.py - pet.y;
    if (Math.hypot(dx, dy) <= 2.2) continue;
    const sx = Math.sign(dx);
    const sy = Math.sign(dy);
    const candidates: Array<[number, number]> = [
      [sx, 0], [0, sy], [sx, sy], [sx, -sy], [-sx, sy],
    ];
    for (const [ax, ay] of candidates) {
      if (ax === 0 && ay === 0) continue;
      const nx = Math.round(pet.x) + ax;
      const ny = Math.round(pet.y) + ay;
      if (terrainAt(state, nx, ny) === 'water') continue;
      if (isOccupied(state, nx, ny)) continue;
      if (state.weeds.some((w) => w.x === nx && w.y === ny)) continue;
      pet.x = nx;
      pet.y = ny;
      break;
    }
  }
}
