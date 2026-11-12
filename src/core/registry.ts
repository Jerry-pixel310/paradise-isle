/**
 * 内容注册表：data/ 层在模块加载时把所有内容表注入这里，
 * core/ 层只依赖本注册表，避免 core → data 的循环依赖。
 */
import type {
  AchievementDef, AnimalDef, BaitDef, BeastDef, BuildingDef, ClothingDef, CropDef,
  FestivalDef, FishDef, ForageDef, FurnitureDef, GameDef, ItemDef, NeighborPersona, PetDef, QuestDef, RecipeDef,
} from './types';

export const REG = {
  items: new Map<string, ItemDef>(),
  crops: new Map<string, CropDef>(),
  animals: new Map<string, AnimalDef>(),
  beasts: new Map<string, BeastDef>(),
  fish: new Map<string, FishDef>(),
  bait: new Map<string, BaitDef>(),
  forage: new Map<string, ForageDef>(),
  game: new Map<string, GameDef>(),
  recipes: new Map<string, RecipeDef>(),
  furniture: new Map<string, FurnitureDef>(),
  festivals: new Map<string, FestivalDef>(),
  buildings: new Map<string, BuildingDef>(),
  clothing: new Map<string, ClothingDef>(),
  pets: new Map<string, PetDef>(),
  quests: new Map<string, QuestDef>(),
  achievements: new Map<string, AchievementDef>(),
  neighbors: new Map<string, NeighborPersona>(),
};

function must<T>(map: Map<string, T>, id: string, kind: string): T {
  const d = map.get(id);
  if (!d) throw new Error(`unknown ${kind}: ${id}`);
  return d;
}

export const itemDef = (id: string) => must(REG.items, id, 'item');
export const cropDef = (id: string) => must(REG.crops, id, 'crop');
export const animalDef = (id: string) => must(REG.animals, id, 'animal');
export const beastDef = (id: string) => must(REG.beasts, id, 'beast');
export const fishDef = (id: string) => must(REG.fish, id, 'fish');
export const baitDef = (id: string) => must(REG.bait, id, 'bait');
export const forageDef = (id: string) => must(REG.forage, id, 'forage');
export const gameDef = (id: string) => must(REG.game, id, 'game');
export const recipeDef = (id: string) => must(REG.recipes, id, 'recipe');
export const furnitureDef = (id: string) => must(REG.furniture, id, 'furniture');
export const festivalDef = (season: string) => must(REG.festivals, season, 'festival');
export const buildingDef = (id: string) => must(REG.buildings, id, 'building');
export const clothingDef = (id: string) => must(REG.clothing, id, 'clothing');
export const petDef = (id: string) => must(REG.pets, id, 'pet');
export const questDef = (id: string) => must(REG.quests, id, 'quest');
export const achievementDef = (id: string) => must(REG.achievements, id, 'achievement');
export const neighborDef = (id: string) => must(REG.neighbors, id, 'neighbor');

export function allCrops(): CropDef[] { return [...REG.crops.values()]; }
export function allAnimals(): AnimalDef[] { return [...REG.animals.values()]; }
export function allBeasts(): BeastDef[] { return [...REG.beasts.values()]; }
export function allFish(): FishDef[] { return [...REG.fish.values()]; }
export function allBait(): BaitDef[] { return [...REG.bait.values()]; }
export function allForage(): ForageDef[] { return [...REG.forage.values()]; }
export function allGame(): GameDef[] { return [...REG.game.values()]; }
export function allRecipes(): RecipeDef[] { return [...REG.recipes.values()]; }
export function allFurniture(): FurnitureDef[] { return [...REG.furniture.values()]; }
export function allBuildings(): BuildingDef[] { return [...REG.buildings.values()]; }
export function allClothing(): ClothingDef[] { return [...REG.clothing.values()]; }
export function allPets(): PetDef[] { return [...REG.pets.values()]; }
export function allQuests(): QuestDef[] { return [...REG.quests.values()]; }
export function allAchievements(): AchievementDef[] { return [...REG.achievements.values()]; }
export function allNeighbors(): NeighborPersona[] { return [...REG.neighbors.values()]; }

function fill<T extends { id: string }>(map: Map<string, T>, defs: readonly T[], kind: string): void {
  for (const d of defs) {
    if (map.has(d.id)) throw new Error(`duplicate ${kind} id: ${d.id}`);
    map.set(d.id, d);
  }
}

export interface ContentBundle {
  items?: readonly ItemDef[];
  crops?: readonly CropDef[];
  animals?: readonly AnimalDef[];
  beasts?: readonly BeastDef[];
  fish?: readonly FishDef[];
  bait?: readonly BaitDef[];
  forage?: readonly ForageDef[];
  game?: readonly GameDef[];
  recipes?: readonly RecipeDef[];
  furniture?: readonly FurnitureDef[];
  festivals?: readonly FestivalDef[];
  buildings?: readonly BuildingDef[];
  clothing?: readonly ClothingDef[];
  pets?: readonly PetDef[];
  quests?: readonly QuestDef[];
  achievements?: readonly AchievementDef[];
  neighbors?: readonly NeighborPersona[];
}

export function registerContent(bundle: ContentBundle): void {
  if (bundle.items) fill(REG.items, bundle.items, 'item');
  if (bundle.crops) fill(REG.crops, bundle.crops, 'crop');
  if (bundle.animals) fill(REG.animals, bundle.animals, 'animal');
  if (bundle.beasts) fill(REG.beasts, bundle.beasts, 'beast');
  if (bundle.fish) fill(REG.fish, bundle.fish, 'fish');
  if (bundle.bait) fill(REG.bait, bundle.bait, 'bait');
  if (bundle.forage) fill(REG.forage, bundle.forage, 'forage');
  if (bundle.game) fill(REG.game, bundle.game, 'game');
  if (bundle.recipes) fill(REG.recipes, bundle.recipes, 'recipe');
  if (bundle.furniture) fill(REG.furniture, bundle.furniture, 'furniture');
  if (bundle.festivals) {
    for (const f of bundle.festivals) REG.festivals.set(f.season, f);
  }
  if (bundle.buildings) fill(REG.buildings, bundle.buildings, 'building');
  if (bundle.clothing) fill(REG.clothing, bundle.clothing, 'clothing');
  if (bundle.pets) fill(REG.pets, bundle.pets, 'pet');
  if (bundle.quests) fill(REG.quests, bundle.quests, 'quest');
  if (bundle.achievements) fill(REG.achievements, bundle.achievements, 'achievement');
  if (bundle.neighbors) fill(REG.neighbors, bundle.neighbors, 'neighbor');
}
