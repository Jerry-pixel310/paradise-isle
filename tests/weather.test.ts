/** 天气预报测试 */
import { describe, expect, it } from 'vitest';
import { makeGame, NOW } from './helpers';
import { calendarAt, DAYS_PER_SEASON, forecast } from '../src/core/calendar';
import { catchTable } from '../src/core/fishing';

describe('天气预报', () => {
  it('返回今天起的三天，首日与当前天气一致', () => {
    const state = makeGame();
    const cal = calendarAt(state.createdAt, NOW, state.seed);
    const days = forecast(state.seed, state.createdAt, NOW, 3);

    expect(days).toHaveLength(3);
    expect(days[0].dayIndex).toBe(cal.dayIndex);
    expect(days[0].weather).toBe(cal.weather);
    expect(days[1].dayIndex).toBe(cal.dayIndex + 1);
    expect(days[2].dayIndex).toBe(cal.dayIndex + 2);
    for (const d of days) {
      expect(['sunny', 'cloudy', 'rain', 'storm', 'snow']).toContain(d.weather);
      expect(d.dayOfSeason).toBe(d.dayIndex % DAYS_PER_SEASON);
    }
  });

  it('同一天气种子生成相同预报', () => {
    const state = makeGame();
    const a = forecast(state.seed, state.createdAt, NOW, 3);
    const b = forecast(state.seed, state.createdAt, NOW, 3);
    expect(a).toEqual(b);
  });

  it('天气面板可取得当前可钓鱼种', () => {
    const state = makeGame();
    const table = catchTable(state, NOW);
    expect(table.fish.length).toBeGreaterThan(0);
    expect(table.weights.length).toBe(table.fish.length);
    expect(table.weights.every((w) => w > 0)).toBe(true);
  });
});
