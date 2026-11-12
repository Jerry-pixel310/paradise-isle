/**
 * 设置面板：语言、音效/音乐、存档导入导出、回到标题。
 */
import type { GameState } from '../../core/types';
import { exportSave, importSave, saveToSlot, activeSlot } from '../../save/save';
import { setLang, t } from '../../i18n';
import { setMusic, setSound } from '../../audio/sound';
import { h, clearChildren } from '../dom';
import { closePanel, confirmDialog, openPanel, promptDialog } from '../modal';
import { toast } from '../toast';
import { openHelp } from './help';
import { openTutorial } from './tutorial';

export interface SettingsCtx {
  state: GameState;
  now: () => number;
  /** 语言切换后需要整体刷新 UI */
  onLangChange: () => void;
  onImported: (state: GameState) => void;
  onBackToTitle: () => void;
  /** 像素滤镜开关（由 App 应用到渲染器） */
  onTogglePixel: (on: boolean) => void;
  /** 从教程卡片跳到对应面板 */
  onOpenPanel: (panel: string) => void;
}

export function openSettings(ctx: SettingsCtx): void {
  openPanel({
    title: t('panel.settings'),
    body: (body) => render(body, ctx),
  });
}

function toggleRow(label: string, hint: string, value: boolean, onChange: (v: boolean) => void): HTMLElement {
  const knob = h('span', { class: 'switch-knob' });
  const btn = h('button', {
    class: `switch ${value ? 'on' : ''}`,
    'aria-pressed': value ? 'true' : 'false',
    onclick: () => onChange(!value),
  }, knob);
  return settingRow(label, btn, hint);
}

function settingRow(label: string, control: HTMLElement, hint?: string): HTMLElement {
  return h('div', { class: 'set-row' },
    h('div', { class: 'set-copy' },
      h('div', { class: 'set-label' }, label),
      hint ? h('div', { class: 'set-hint' }, hint) : null,
    ),
    h('div', { class: 'set-control' }, control),
  );
}

function section(title: string, ...rows: HTMLElement[]): HTMLElement {
  return h('section', { class: 'set-section' },
    h('div', { class: 'set-section-title' }, title),
    h('div', { class: 'set-card' }, ...rows),
  );
}

function render(body: HTMLElement, ctx: SettingsCtx): void {
  clearChildren(body);
  const { state } = ctx;
  const rerender = (): void => render(body, ctx);

  const langBtn = h('button', {
    class: 'btn btn-sm',
    onclick: () => {
      state.settings.lang = state.settings.lang === 'zh' ? 'en' : 'zh';
      setLang(state.settings.lang);
      ctx.onLangChange();
      openSettings(ctx);
    },
  }, state.settings.lang === 'zh' ? '中文 / EN' : 'English / 中文');

  const appearance = section(t('set.appearance'),
    settingRow(t('set.lang'), langBtn, t('set.langHint')),
    toggleRow(t('set.pixel'), t('set.pixelHint'), !!state.settings.pixelate, (v) => {
      state.settings.pixelate = v;
      ctx.onTogglePixel(v);
      rerender();
    }),
  );

  const play = section(t('set.play'),
    toggleRow(t('set.unlimited'), t('set.unlimitedHint'), state.settings.unlimited === true, (v) => {
      state.settings.unlimited = v;
      toast(v ? t('set.unlimitedOn') : t('set.unlimitedOff'), v ? 'good' : 'info');
      rerender();
    }),
  );

  const audio = section(t('set.audio'),    toggleRow(t('set.sound'), t('set.soundHint'), state.settings.sound, (v) => {
      state.settings.sound = v;
      setSound(v);
      rerender();
    }),
    toggleRow(t('set.music'), t('set.musicHint'), state.settings.music, (v) => {
      state.settings.music = v;
      setMusic(v);
      rerender();
    }),
  );

  const saveActions = h('div', { class: 'set-actions' },
    h('button', {
      class: 'btn btn-sm',
      onclick: () => {
        const data = exportSave(state, ctx.now());
        void navigator.clipboard?.writeText(data).then(
          () => toast(t('set.exportDone'), 'good'),
          () => promptDialog(t('set.export'), data, () => {}),
        );
      },
    }, `⬆ ${t('set.export')}`),
    h('button', {
      class: 'btn btn-sm',
      onclick: () => {
        promptDialog(t('set.importPrompt'), '', (data) => {
          try {
            const imported = importSave(data, ctx.now());
            saveToSlot(imported, activeSlot(), ctx.now());
            toast(t('set.importDone'), 'good');
            closePanel();
            ctx.onImported(imported);
          } catch {
            toast(t('set.importBad'), 'bad');
          }
        });
      },
    }, `⬇ ${t('set.import')}`),
    h('button', {
      class: 'btn btn-sm',
      onclick: () => {
        closePanel();
        openTutorial({ onOpen: (panel) => ctx.onOpenPanel(panel) });
      },
    }, `📖 ${t('tut.title')}`),
    h('button', {
      class: 'btn btn-sm',
      onclick: () => openHelp(),
    }, `? ${t('help.title')}`),
  );

  const saveSection = section(t('set.save'),
    settingRow(t('set.saveHint'), saveActions),
    settingRow(t('set.reset'), h('button', {
      class: 'btn btn-sm',
      onclick: () => {
        confirmDialog(t('set.reset') + '?', () => {
          saveToSlot(state, activeSlot(), ctx.now());
          closePanel();
          ctx.onBackToTitle();
        });
      },
    }, `🏝 ${t('set.backTitle')}`), t('set.resetHint')),
  );

  body.append(
    h('div', { class: 'settings-hero' },
      h('div', { class: 'market-kicker' }, 'ISLAND SETTINGS'),
      h('h3', {}, t('set.heroTitle')),
      h('p', {}, t('set.sub')),
    ),
    appearance,
    play,
    audio,
    saveSection,
    h('div', { class: 'set-about' },
      h('div', {}, `${t('start.title')} v9.0 轻松畅玩版`),
      h('div', {}, t('set.aboutArt')),
    ),
  );
}
