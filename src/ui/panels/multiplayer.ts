/**
 * 好友同游面板：房主创建 P2P 房间，朋友输入房间码加入。
 */
import { t } from '../../i18n';
import { h } from '../dom';
import { closePanel, openPanel } from '../modal';
import { toast } from '../toast';

export interface MultiplayerCtx {
  hostCode: string | null;
  onCreateHost: () => Promise<string>;
  onJoin: (code: string) => Promise<void>;
  onStop: () => void;
}

export function openMultiplayer(ctx: MultiplayerCtx): void {
  let code = ctx.hostCode;
  let busy = false;
  let status = '';

  openPanel({
    title: t('mp.title'),
    className: 'panel-wide',
    body: (body) => {
      const render = (): void => {
        body.replaceChildren(
          h('div', { class: 'collection-banner' },
            h('div', { class: 'journal-banner-copy' },
              h('div', { class: 'market-kicker' }, 'FRIEND CO-OP'),
              h('h3', {}, t('mp.hero')),
              h('p', {}, t('mp.sub')),
            ),
            h('div', { class: 'craft-count' },
              h('b', {}, 'LIVE'),
              h('span', {}, t('mp.mode')),
            ),
          ),
          h('div', { class: 'mp-grid' },
            h('section', { class: 'mp-card' },
              h('div', { class: 'mp-kicker' }, t('mp.hostKicker')),
              h('div', { class: 'mp-title' }, t('mp.hostTitle')),
              h('p', { class: 'mp-desc' }, t('mp.hostDesc')),
              code
                ? h('div', { class: 'mp-code-box' },
                    h('div', { class: 'mp-code' }, code),
                    h('div', { class: 'mp-actions' },
                      h('button', {
                        class: 'btn btn-sm btn-primary',
                        onclick: () => {
                          void navigator.clipboard?.writeText(code!).then(
                            () => toast(t('mp.codeCopied'), 'good'),
                            () => toast(code!, 'info'),
                          );
                        },
                      }, `📋 ${t('mp.copy')}`),
                      h('button', {
                        class: 'btn btn-sm',
                        onclick: () => {
                          ctx.onStop();
                          code = null;
                          status = t('mp.stopped');
                          render();
                        },
                      }, t('mp.stop')),
                    ),
                  )
                : h('button', {
                    class: `btn btn-primary ${busy ? 'disabled' : ''}`,
                    onclick: async () => {
                      if (busy) return;
                      busy = true;
                      status = t('mp.creating');
                      render();
                      try {
                        code = await ctx.onCreateHost();
                        status = t('mp.waiting');
                      } catch {
                        status = t('mp.failed');
                      }
                      busy = false;
                      render();
                    },
                  }, `🏝 ${t('mp.create')}`),
              status ? h('div', { class: 'mp-status' }, status) : null,
              h('div', { class: 'mp-hint' }, t('mp.keepOpen')),
            ),
            h('section', { class: 'mp-card' },
              h('div', { class: 'mp-kicker' }, t('mp.joinKicker')),
              h('div', { class: 'mp-title' }, t('mp.joinTitle')),
              h('p', { class: 'mp-desc' }, t('mp.joinDesc')),
              h('input', { class: 'dialog-input mp-input', placeholder: t('mp.codePlaceholder'), maxlength: '40' }),
              h('button', {
                class: 'btn btn-primary',
                onclick: async (ev: Event) => {
                  const card = (ev.currentTarget as HTMLElement).closest('.mp-card');
                  const input = card?.querySelector<HTMLInputElement>('.mp-input');
                  const value = input?.value.trim() ?? '';
                  if (!value || busy) return;
                  busy = true;
                  status = t('mp.connecting');
                  render();
                  try {
                    await ctx.onJoin(value);
                    closePanel();
                  } catch {
                    busy = false;
                    status = t('mp.joinFailed');
                    render();
                  }
                },
              }, `🔗 ${t('mp.join')}`),
              status ? h('div', { class: 'mp-status' }, status) : null,
              h('div', { class: 'mp-hint' }, t('mp.joinHint')),
            ),
          ),
          h('div', { class: 'panel-note' }, t('mp.note')),
        );
      };
      render();
    },
  });
}
