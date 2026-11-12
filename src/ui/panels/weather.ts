/**
 * 天气面板：当前天气、三日预报与今日鱼情。
 */
import type { FishRarity, GameState, L10n } from '../../core/types';
import { catchTable } from '../../core/fishing';
import { calendarAt, forecast, formatClock, isWetWeather } from '../../core/calendar';
import { t, tl } from '../../i18n';
import { h, clearChildren, spriteImg } from '../dom';
import { openPanel } from '../modal';

export interface WeatherCtx {
  state: GameState;
  now: () => number;
}

const ICON: Record<string, string> = {
  sunny: '☀️', cloudy: '☁️', rain: '🌧️', storm: '⛈️', snow: '❄️',
};

const RARITY: Record<FishRarity, L10n> = {
  common: { zh: '常见', en: 'Common' },
  uncommon: { zh: '少见', en: 'Uncommon' },
  rare: { zh: '稀有', en: 'Rare' },
  epic: { zh: '史诗', en: 'Epic' },
  legendary: { zh: '传说', en: 'Legendary' },
};

export function openWeather(ctx: WeatherCtx): void {
  openPanel({
    title: t('weather.title'),
    className: 'panel-wide',
    body: (body) => render(body, ctx),
  });
}

function render(body: HTMLElement, ctx: WeatherCtx): void {
  clearChildren(body);
  const { state } = ctx;
  const now = ctx.now();
  const cal = calendarAt(state.createdAt, now, state.seed);
  const days = forecast(state.seed, state.createdAt, now, 3);
  const effects: string[] = [];
  if (isWetWeather(cal.weather)) effects.push(t('weather.rainWater'));
  if (isWetWeather(cal.weather)) effects.push(t('weather.rareFish'));
  if (cal.weather === 'storm') effects.push(t('weather.stormEnergy'));
  if (cal.weather === 'snow') effects.push(t('weather.snowGrowth'));
  if (cal.weather === 'sunny') effects.push(t('weather.sunnyGood'));
  if (cal.weather === 'cloudy') effects.push(t('weather.cloudyCalm'));

  const hero = h('div', { class: `weather-stage weather-${cal.weather}` },
    h('div', { class: 'weather-symbol' }, ICON[cal.weather] ?? '☀️'),
    h('div', { class: 'weather-stage-copy' },
      h('div', { class: 'weather-kicker' }, 'ISLAND WEATHER'),
      h('h3', { class: 'weather-name' }, t(`weather.${cal.weather}`)),
      h('div', { class: 'weather-meta' },
        `${t(`season.${cal.season}`)} · ${t('cal.day', { n: cal.dayOfSeason + 1 })} · ${formatClock(cal)}`),
      h('div', { class: 'weather-desc' }, t(`weather.desc.${cal.weather}`)),
      h('div', { class: 'weather-chips' }, ...effects.map((e) => h('span', { class: 'weather-chip' }, e))),
    ),
  );

  const forecastRow = h('div', { class: 'forecast-row' });
  const labels = [t('weather.today'), t('weather.tomorrow'), t('weather.dayAfter')];
  days.forEach((d, i) => {
    forecastRow.append(h('div', { class: `forecast-card forecast-${d.weather}` },
      h('div', { class: 'forecast-label' }, labels[i] ?? `+${i}`),
      h('div', { class: 'forecast-icon' }, ICON[d.weather] ?? '☀️'),
      h('div', { class: 'forecast-weather' }, t(`weather.${d.weather}`)),
      h('div', { class: 'forecast-day' },
        `${t(`season.${d.season}`)} · ${t('cal.day', { n: d.dayOfSeason + 1 })}`),
    ));
  });

  const table = catchTable(state, now);
  const top = table.fish
    .map((fish, i) => ({ fish, weight: table.weights[i] ?? 0 }))
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 6);
  const fishList = h('div', { class: 'weather-fish-list' });
  for (const { fish } of top) {
    fishList.append(h('article', { class: `weather-fish rarity-card-${fish.rarity}` },
      h('div', { class: 'weather-fish-art' },
        spriteImg(`fish:${fish.id}`, 'icon-md')),
      h('div', { class: 'weather-fish-info' },
        h('div', { class: 'weather-fish-name' }, tl(fish.name)),
        h('div', { class: `weather-fish-rarity rarity-${fish.rarity}` }, tl(RARITY[fish.rarity])),
      ),
    ));
  }

  body.append(
    hero,
    h('div', { class: 'weather-section-head' },
      h('div', { class: 'market-kicker' }, 'THREE-DAY OUTLOOK'),
      h('div', { class: 'weather-section-title' }, t('weather.forecast'))),
    forecastRow,
    h('div', { class: 'weather-section-head' },
      h('div', { class: 'market-kicker' }, 'TODAY’S FISHING'),
      h('div', { class: 'weather-section-title' },
        `${t('weather.fishing')} · ${t('weather.fishCount', { n: table.fish.length })}`)),
    fishList,
    h('div', { class: 'weather-fish-note' }, t('weather.fishingNote')),
  );
}
