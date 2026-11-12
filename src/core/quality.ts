/**
 * 作物品质：普通 / 银 / 金。
 * 浇水、美观度与花卉基因会提高银/金概率；品质只影响收获时的额外金币与经验。
 */
import type { GameState, PlantedCrop } from './types';
import { beautyScore } from './build';
import { roll } from './rng';

export type CropQuality = 'normal' | 'silver' | 'gold';

export interface QualityChances {
  silver: number;
  gold: number;
}

export function qualityChances(state: GameState, crop: PlantedCrop): QualityChances {
  let silver = 0.22;
  let gold = 0.06;
  if (crop.lastWateredAt > 0) {
    silver += 0.1;
    gold += 0.03;
  }
  const beauty = beautyScore(state);
  silver += Math.min(0.12, beauty / 6000);
  gold += Math.min(0.06, beauty / 12000);
  if (crop.genes) {
    silver += crop.genes.vigor * 0.08;
    gold += crop.genes.vigor * 0.04;
  }
  silver = Math.min(0.6, silver);
  gold = Math.min(0.35, silver - 0.01, gold);
  return { silver, gold };
}

export function classifyQuality(value: number, chances: QualityChances): CropQuality {
  if (value < chances.gold) return 'gold';
  if (value < chances.gold + chances.silver) return 'silver';
  return 'normal';
}

export function rollCropQuality(state: GameState, crop: PlantedCrop): CropQuality {
  return classifyQuality(roll(), qualityChances(state, crop));
}

export function qualityBonusCoins(quality: CropQuality, sellPrice: number, amount: number): number {
  if (quality === 'gold') return Math.round(sellPrice * amount * 0.5);
  if (quality === 'silver') return Math.round(sellPrice * amount * 0.2);
  return 0;
}
