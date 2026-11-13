/**
 * HUD：顶部资源栏（头像/等级/经验条/金币/食物/能量/声望）+ 底部功能按钮 + 任务提示条。
 */
import type { GameState } from '../core/types';
import { maxEnergy, xpForNextLevel } from '../core/balance';
import { energyEta } from '../core/player';
import { questDef } from '../core/registry';
import { questComplete } from '../core/quests';
import { calendarAt, formatClock, type Weather } from '../core/calendar';
import { titleDef } from '../core/titles';
import { charKey, spriteDataUrl } from '../render/sprites';
import { fmtDuration, t, tl } from '../i18n';
import { h, spriteImg } from './dom';

export interface HudCallbacks {
  onOpen: (panel: 'inventory' | 'shop' | 'quests' | 'collections' | 'wardrobe' | 'neighbors' | 'settings' | 'crafting' | 'festival' | 'checkin' | 'tutorial') => void;
  onToggleEdit: () => void;
  onGoHome: () => void;
  onToggleInterior: () => void;
  onOpenWeather: () => void;
  onOpenProfile: () => void;
}

const WEATHER_ICON: Record<Weather, string> = {
  sunny: '☀️', cloudy: '☁️', rain: '🌧️', storm: '⛈️', snow: '❄️',
};

export class Hud {
  private root: HTMLElement;
  private avatarImg: HTMLImageElement;
  private levelEl: HTMLElement;
  private xpFill: HTMLElement;
  private coinsEl: HTMLElement;
  private foodEl: HTMLElement;
  private energyEl: HTMLElement;
  private energyEtaEl: HTMLElement;
  private repEl: HTMLElement;
  private nameEl: HTMLElement;
  private titleEl: HTMLElement;
  private questHint: HTMLElement;
  private visitBanner: HTMLElement;
  private editBtn: HTMLButtonElement;
  private homeBtn: HTMLButtonElement;
  private houseBtn: HTMLButtonElement;
  private clockEl: HTMLElement;
  private clockWeather: HTMLElement;
  private clockSeason: HTMLElement;
  private clockDay: HTMLElement;
  private clockTime: HTMLElement;
  private lastAvatarKey = '';

  constructor(cb: HudCallbacks) {
    this.avatarImg = spriteImg('fx:sparkle', 'hud-avatar');
    this.levelEl = h('span', { class: 'hud-level' }, '1');
    this.xpFill = h('div', { class: 'xp-fill' });
    this.nameEl = h('span', { class: 'hud-name' }, '');
    this.titleEl = h('span', { class: 'hud-title' }, '');
    this.coinsEl = h('span', {}, '0');
    this.foodEl = h('span', {}, '0');
    this.energyEl = h('span', {}, '0');
    this.energyEtaEl = h('span', { class: 'energy-eta' }, '');
    this.repEl = h('span', {}, '0');

    this.clockWeather = h('span', { class: 'clock-weather' }, '☀️');
    this.clockSeason = h('span', { class: 'clock-season' }, '');
    this.clockDay = h('span', { class: 'clock-day' }, '');
    this.clockTime = h('span', { class: 'clock-time' }, '');
    this.clockEl = h('div', {
      class: 'hud-clock',
      role: 'button',
      title: t('weather.clockHint'),
      onclick: () => cb.onOpenWeather(),
    },
      this.clockWeather,
      h('div', { class: 'clock-main' },
        this.clockSeason,
        this.clockDay,
        this.clockTime,
      ),
    );

    const topBar = h('div', { class: 'hud-top' },
      h('div', {
        class: 'hud-portrait',
        role: 'button',
        title: t('profile.open'),
        onclick: () => cb.onOpenProfile(),
      },
        this.avatarImg,
        h('div', { class: 'hud-level-badge' }, this.levelEl),
      ),
      h('div', { class: 'hud-info', onclick: () => cb.onOpenProfile() },
        this.nameEl,
        this.titleEl,
        h('div', { class: 'xp-bar' }, this.xpFill),
      ),
      this.clockEl,
      h('div', { class: 'hud-res' },
        h('span', { class: 'res-badge', title: t('ui.coins') }, spriteImg('fx:coin', 'icon-sm'), this.coinsEl),
        h('span', { class: 'res-badge', title: t('ui.food') }, spriteImg('icon:produce_carrot', 'icon-sm'), this.foodEl),
        h('span', { class: 'res-badge', title: t('ui.reputation') }, spriteImg('fx:sparkle', 'icon-sm'), this.repEl),
        h('span', { class: 'res-badge energy', title: t('ui.energy') },
          spriteImg('fx:heart', 'icon-sm'), this.energyEl, this.energyEtaEl),
      ),
    );

    this.editBtn = h('button', { class: 'hud-btn', onclick: () => cb.onToggleEdit() },
      spriteImg('icon:item_amber', 'icon-md'), h('span', {}, t('hud.edit'))) as HTMLButtonElement;
    this.homeBtn = h('button', { class: 'hud-btn hidden', onclick: () => cb.onGoHome() },
      spriteImg('fx:heart', 'icon-md'), h('span', {}, t('hud.home'))) as HTMLButtonElement;
    this.houseBtn = h('button', { class: 'hud-btn', onclick: () => cb.onToggleInterior() },
      spriteImg('bld:bld_hut', 'icon-md icon-bld'), h('span', {}, t('hud.house'))) as HTMLButtonElement;

    const sep = (): HTMLElement => h('span', { class: 'hud-sep' });
    const bottomBar = h('div', { class: 'hud-bottom' },
      this.homeBtn,
      this.mkBtn('icon:seed_carrot', t('hud.bag'), () => cb.onOpen('inventory')),
      this.mkBtn('icon:dish_grilled_fish', t('hud.craft'), () => cb.onOpen('crafting')),
      this.mkBtn('fx:coin', t('hud.shop'), () => cb.onOpen('shop')),
      this.mkBtn('fx:sparkle', t('hud.festival'), () => cb.onOpen('festival')),
      this.mkBtn('fx:ready', t('hud.quests'), () => cb.onOpen('quests')),
      this.mkBtn('fx:sparkle', t('hud.checkin'), () => cb.onOpen('checkin')),
      sep(),
      this.mkBtn('fish:fish_goldkoi', t('hud.collections'), () => cb.onOpen('collections')),
      this.mkBtn('icon:item_shell', t('hud.wardrobe'), () => cb.onOpen('wardrobe')),
      sep(),
      this.houseBtn,
      this.mkBtn('fx:heart', t('hud.neighbors'), () => cb.onOpen('neighbors')),
      sep(),
      this.editBtn,
      this.mkBtn('fx:sparkle', t('hud.tutorial'), () => cb.onOpen('tutorial')),
      this.mkBtn('fx:sleep', t('hud.settings'), () => cb.onOpen('settings')),
    );

    this.questHint = h('div', { class: 'quest-hint hidden' });
    this.questHint.addEventListener('click', () => cb.onOpen('quests'));
    this.visitBanner = h('div', { class: 'visit-banner hidden' });

    this.root = h('div', { class: 'hud-root' }, topBar, bottomBar, this.questHint, this.visitBanner);
    document.body.append(this.root);
    // On narrow screens the top bar wraps onto two rows; keep the quest hint below it.
    if (typeof ResizeObserver !== 'undefined') {
      new ResizeObserver(() => {
        this.root.style.setProperty('--hud-top-bottom', `${Math.round(topBar.getBoundingClientRect().bottom)}px`);
      }).observe(topBar);
    }
  }

  private mkBtn(icon: string, label: string, onClick: () => void): HTMLButtonElement {
    return h('button', { class: 'hud-btn', onclick: onClick },
      spriteImg(icon, 'icon-md'), h('span', {}, label)) as HTMLButtonElement;
  }

  setEditActive(active: boolean): void {
    this.editBtn.classList.toggle('active', active);
  }

  destroy(): void {
    this.root.remove();
  }

  setInterior(active: boolean): void {
    this.houseBtn.classList.toggle('active', active);
  }

  setVisiting(name: string | null, snapshotNote: boolean): void {
    this.homeBtn.classList.toggle('hidden', !name);
    this.editBtn.classList.toggle('hidden', !!name);
    if (name) {
      this.visitBanner.textContent = snapshotNote
        ? t('nb.snapshotNote', { name })
        : t('nb.visiting', { name });
      this.visitBanner.classList.remove('hidden');
    } else {
      this.visitBanner.classList.add('hidden');
    }
  }

  update(state: GameState, now: number): void {
    const p = state.player;
    const ak = charKey(p.avatar);
    if (ak !== this.lastAvatarKey) {
      this.lastAvatarKey = ak;
      this.avatarImg.src = spriteDataUrl(ak);
    }
    this.nameEl.textContent = p.name;
    this.titleEl.textContent = tl(titleDef(state.title).name);
    this.levelEl.textContent = String(p.level);
    this.xpFill.style.width = `${Math.min(100, (p.xp / xpForNextLevel(p.level)) * 100)}%`;
    this.coinsEl.textContent = state.settings.infiniteCoins ? '∞' : String(p.coins);
    this.foodEl.textContent = String(p.food);
    this.repEl.textContent = String(p.reputation);
    if (state.settings.unlimited) {
      this.energyEl.textContent = '∞';
      this.energyEtaEl.textContent = t('hud.unlimited');
    } else {
      this.energyEl.textContent = `${p.energy}/${maxEnergy(p.level)}`;
      const eta = energyEta(state, now);
      this.energyEtaEl.textContent = eta > 0 ? t('hud.nextEnergy', { t: fmtDuration(eta) }) : '';
    }

    // 游戏内日历 + 天气
    const cal = calendarAt(state.createdAt, now, state.seed);
    this.clockEl.className = `hud-clock season-${cal.season} weather-${cal.weather}`;
    this.clockWeather.textContent = WEATHER_ICON[cal.weather];
    this.clockSeason.textContent = t(`season.${cal.season}`);
    this.clockDay.textContent = t('cal.day', { n: cal.dayOfSeason + 1 });
    this.clockTime.textContent = formatClock(cal);
    this.clockEl.title = `${t(`season.${cal.season}`)} · ${t(`weather.${cal.weather}`)}`;

    // 教程提示：第一条未完成的教程任务
    const active = state.quests.active.filter((q) => !questDef(q.defId).daily);
    if (active.length > 0) {
      const q = active[0];
      const def = questDef(q.defId);
      const done = questComplete(q);
      this.questHint.textContent = `${t('tut.hint')}: ${tl(def.name)}${done ? ' ✓' : ''} — ${tl(def.desc)}`;
      this.questHint.classList.toggle('done', done);
      this.questHint.classList.remove('hidden');
    } else {
      this.questHint.classList.add('hidden');
    }
  }
}
