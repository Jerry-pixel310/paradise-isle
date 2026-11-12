/**
 * 海岛手册：按主题整理操作、探索、农场、小屋、社交与成长说明。
 */
import { t } from '../../i18n';
import { h } from '../dom';
import { openPanel } from '../modal';

function block(title: string, lines: string[]): HTMLElement {
  return h('section', { class: 'help-card' },
    h('h4', {}, title),
    h('ul', { class: 'help-list' }, ...lines.map((line) => h('li', {}, line))),
  );
}

export function openHelp(): void {
  openPanel({
    title: t('help.title'),
    className: 'panel-wide',
    body: (body) => {
      body.append(
        h('div', { class: 'help-hero' },
          h('div', { class: 'market-kicker' }, 'ISLAND FIELD GUIDE'),
          h('h3', {}, t('help.heroTitle')),
          h('p', {}, t('help.heroSub')),
        ),
        h('div', { class: 'help-grid' },
          block(t('help.controls'), ['c1', 'c2', 'c3', 'c4', 'c5'].map((k) => t(`help.${k}`))),
          block(t('help.sec.explore'), ['s1', 's2', 's3', 's15'].map((k) => t(`help.${k}`))),
          block(t('help.sec.farm'), ['s4', 's5', 's17', 's22', 's24', 's25', 's27', 's32'].map((k) => t(`help.${k}`))),
          block(t('help.sec.home'), ['s6', 's8', 's28', 's16', 's29', 's21'].map((k) => t(`help.${k}`))),
          block(t('help.sec.social'), ['s7', 's9', 's10', 's11', 's12', 's13', 's14', 's19', 's23'].map((k) => t(`help.${k}`))),
          block(t('help.sec.growth'), ['s18', 's20', 's30', 's31'].map((k) => t(`help.${k}`))),
        ),
        h('div', { class: 'help-tip' }, t('help.tip')),
      );
    },
  });
}
