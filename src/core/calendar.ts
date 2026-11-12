/**
 * 游戏内日历：季节 → 天气 → 时间。
 * 1 个游戏日 = 12 分钟真实时间，7 天一个季节，4 季循环。
 * 全部由存档创建时间推导，离线期间也会自然推进，不额外占存档字段。
 */
import { hashSeed, mulberry32 } from './rng';

export const DAY_MS = 12 * 60_000;
export const DAYS_PER_SEASON = 7;

export const SEASONS = ['spring', 'summer', 'autumn', 'winter'] as const;
export type Season = (typeof SEASONS)[number];

export type Weather = 'sunny' | 'cloudy' | 'rain' | 'storm' | 'snow';
export type WeatherIcon = Weather;

export interface CalendarInfo {
  /** 开局以来的第几天（0 起） */
  dayIndex: number;
  season: Season;
  seasonIndex: number;
  /** 季节内第几天（0 起） */
  dayOfSeason: number;
  /** 0-24 的小时（含小数） */
  hour: number;
  /** 0-59 的分 */
  minute: number;
  weather: Weather;
}

const WEATHER_POOL: Record<Season, Weather[]> = {
  spring: ['sunny', 'sunny', 'rain', 'rain', 'cloudy', 'sunny', 'rain'],
  summer: ['sunny', 'sunny', 'sunny', 'cloudy', 'storm', 'rain', 'sunny'],
  autumn: ['sunny', 'cloudy', 'cloudy', 'rain', 'sunny', 'rain', 'sunny'],
  winter: ['cloudy', 'snow', 'snow', 'sunny', 'cloudy', 'snow', 'sunny'],
};

export function seasonOf(dayIndex: number): Season {
  const idx = Math.floor(dayIndex / DAYS_PER_SEASON) % SEASONS.length;
  return SEASONS[idx];
}

/** 天气由 (存档种子, 天数) 确定，同一天刷新页面不会变 */
export function weatherFor(seed: number, dayIndex: number, season: Season): Weather {
  const rng = mulberry32(hashSeed(`${seed}:day:${dayIndex}`));
  const pool = WEATHER_POOL[season];
  return pool[Math.floor(rng() * pool.length)];
}

export function calendarAt(createdAt: number, now: number, seed: number): CalendarInfo {
  const elapsed = Math.max(0, now - createdAt);
  const dayIndex = Math.floor(elapsed / DAY_MS);
  const dayFrac = (elapsed % DAY_MS) / DAY_MS;
  const hour = 6 + dayFrac * 18; // 每天 06:00 → 24:00
  const season = seasonOf(dayIndex);
  return {
    dayIndex,
    season,
    seasonIndex: Math.floor(dayIndex / DAYS_PER_SEASON) % SEASONS.length,
    dayOfSeason: dayIndex % DAYS_PER_SEASON,
    hour,
    minute: Math.floor((hour % 1) * 60),
    weather: weatherFor(seed, dayIndex, season),
  };
}

/** 多日天气预报（确定性天气，预报 100% 准确） */
export interface ForecastDay {
  dayIndex: number;
  season: Season;
  dayOfSeason: number;
  weather: Weather;
}

export function forecast(seed: number, createdAt: number, now: number, days = 3): ForecastDay[] {
  const cal = calendarAt(createdAt, now, seed);
  const out: ForecastDay[] = [];
  for (let i = 0; i < days; i++) {
    const dayIndex = cal.dayIndex + i;
    const season = seasonOf(dayIndex);
    out.push({
      dayIndex,
      season,
      dayOfSeason: dayIndex % DAYS_PER_SEASON,
      weather: weatherFor(seed, dayIndex, season),
    });
  }
  return out;
}

/** 季节对生长速度的影响（冬天明显变慢） */
export function seasonGrowth(season: Season): number {
  if (season === 'winter') return 0.7;
  if (season === 'autumn') return 0.95;
  return 1;
}

/** 是否下雨/暴风雨（会自动浇灌作物、加快野生资源刷新） */
export function isWetWeather(w: Weather): boolean {
  return w === 'rain' || w === 'storm';
}

/** 户外干活是否会被天气影响：暴风雪时能量消耗 +1 */
export function weatherEnergyPenalty(w: Weather): number {
  return w === 'storm' ? 1 : 0;
}

export function formatClock(cal: CalendarInfo): string {
  const h = Math.floor(cal.hour) % 24;
  const m = Math.floor(cal.minute);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}
