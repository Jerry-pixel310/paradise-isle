/** 花卉基因 / 多代杂交测试 */
import { describe, expect, it } from 'vitest';
import { makeGame, NOW } from './helpers';
import { baseHue, crossFlowerGenes, flowerColorName, geneBonusRatio, randomFlowerGenes } from '../src/core/genes';
import { plant, harvest } from '../src/core/crops';
import { crossPollinate } from '../src/core/flower';

describe('花卉基因', () => {
  it('第一代基因靠近花种基色', () => {
    const state = makeGame();
    const g = randomFlowerGenes('crop_rose');
    expect(g.generation).toBe(1);
    expect(Math.abs(g.hue - baseHue('crop_rose'))).toBeLessThan(20);
    expect(g.vigor).toBeGreaterThan(0);
    void state;
  });

  it('杂交子代代数 +1，色相取双亲圆平均', () => {
    const child = crossFlowerGenes(
      { hue: 350, vigor: 0.5, generation: 2 },
      { hue: 20, vigor: 0.7, generation: 4 },
    );
    expect(child.generation).toBe(5);
    // 350° 与 20° 的圆平均在 5° 附近
    expect(Math.min(Math.abs(child.hue - 5), 360 - Math.abs(child.hue - 5))).toBeLessThan(25);
    expect(child.vigor).toBeGreaterThan(0.1);
  });

  it('颜色名称覆盖色相环', () => {
    expect(flowerColorName({ hue: 0, vigor: 0.5, generation: 1 }).zh).toBe('红');
    expect(flowerColorName({ hue: 120, vigor: 0.5, generation: 1 }).zh).toBe('绿');
    expect(flowerColorName({ hue: 220, vigor: 0.5, generation: 1 }).zh).toBe('蓝');
    expect(flowerColorName({ hue: 300, vigor: 0.5, generation: 1 }).zh).toBe('品红');
  });

  it('代数与活力越高，加成比例越高', () => {
    expect(geneBonusRatio({ hue: 0, vigor: 0.9, generation: 8 }))
      .toBeGreaterThan(geneBonusRatio({ hue: 0, vigor: 0.2, generation: 1 }));
  });
});

describe('带基因的花种', () => {
  it('种植时优先消耗 seedBank 里的基因种子', () => {
    const state = makeGame();
    state.player.level = 10;
    state.inventory.seed_rose = 1;
    state.seedBank.seed_rose = [{ hue: 123, vigor: 0.8, generation: 3 }];
    const plot = state.plots[0];

    expect(plant(state, plot.uid, 'crop_rose', NOW).ok).toBe(true);

    expect(plot.crop!.genes).toEqual({ hue: 123, vigor: 0.8, generation: 3 });
    expect(state.seedBank.seed_rose).toBeUndefined();
  });

  it('杂交会把子代基因存进 seedBank', () => {
    const state = makeGame();
    state.player.level = 10;
    state.inventory.seed_rose = 2;
    const [a, b] = state.plots;
    plant(state, a.uid, 'crop_rose', NOW);
    plant(state, b.uid, 'crop_rose', NOW);
    a.crop!.genes = { hue: 350, vigor: 0.6, generation: 2 };
    b.crop!.genes = { hue: 10, vigor: 0.7, generation: 3 };
    a.crop!.plantedAt = NOW - 3_600_000;
    b.crop!.plantedAt = NOW - 3_600_000;

    const r = crossPollinate(state, a.uid, b.uid, NOW);

    expect(r.ok).toBe(true);
    const banks = Object.values(state.seedBank);
    expect(banks.length).toBe(1);
    expect(banks[0][0].generation).toBe(4);
    expect(banks[0][0].hue).toBeGreaterThanOrEqual(0);
    expect(banks[0][0].hue).toBeLessThan(360);
  });

  it('花朵收获会按基因给额外金币', () => {
    const state = makeGame();
    state.player.level = 10;
    state.inventory.seed_rose = 1;
    const plot = state.plots[0];
    plant(state, plot.uid, 'crop_rose', NOW);
    plot.crop!.genes = { hue: 340, vigor: 1, generation: 10 };
    plot.crop!.plantedAt = NOW - 3_600_000;
    const coins = state.player.coins;

    const r = harvest(state, plot.uid, NOW);

    expect(r.ok).toBe(true);
    expect(state.player.coins).toBeGreaterThan(coins);
    expect(r.events?.some((e) => e.target === 'msg.flowerBonus')).toBe(true);
  });
});
