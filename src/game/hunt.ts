/**
 * 狩猎小游戏（DOM 覆盖层）：
 * 按住拉弓蓄力、松开放箭；指针在横条上往返，蓄力 60–90% 时最稳。
 * 命中扣 1 点猎物 hp，打空则猎物受惊逃走；两箭以上的猎物会越跑越快。
 */
import type { ActionResult, GameState } from '../core/types';
import { gameByUid, huntShot } from '../core/hunt';
import { gameDef, itemDef } from '../core/registry';
import { t, tl } from '../i18n';
import { h, clearChildren, spriteImg } from '../ui/dom';
import { sfx } from '../audio/sound';

const CHARGE_MS = 1100;

export function startHunt(
  state: GameState,
  uid: number,
  now: () => number,
  dispatch: (r: ActionResult) => void,
  onEnd: () => void,
): void {
  const animal = gameByUid(state, uid);
  if (!animal) return;
  const def = gameDef(animal.defId);

  const root = h('div', { class: 'minigame-overlay' });
  const box = h('div', { class: 'minigame-box hunt-box' });
  root.append(box);
  document.body.append(root);

  let raf = 0;
  let pos = Math.random();
  let dir = Math.random() < 0.5 ? -1 : 1;
  let speed = def.speed;
  let zoneW = def.zone;
  let zoneCenter = 0.3 + Math.random() * 0.4;
  let ended = false;
  let hp = animal.hp;
  let charging = false;
  let chargeStart = 0;
  let charge = 0;

  const clampCenter = (): void => {
    const half = zoneW / 2;
    zoneCenter = Math.min(1 - half, Math.max(half, zoneCenter));
  };
  clampCenter();

  const cleanup = (): void => {
    ended = true;
    cancelAnimationFrame(raf);
    window.removeEventListener('pointerup', onRelease);
    root.remove();
    onEnd();
  };

  const hpHearts = h('div', { class: 'battle-hp' });
  const feedback = h('div', { class: 'battle-feedback' }, t('hunt.hint'));

  const bar = h('div', { class: 'hunt-bar' });
  const zone = h('div', { class: 'hunt-zone' });
  const needle = h('div', { class: 'hunt-needle' });
  bar.append(zone, needle);

  const chargeFill = h('div', { class: 'charge-fill' });
  const chargeZone = h('div', { class: 'charge-zone' });
  const chargeLabel = h('div', { class: 'charge-label' }, t('hunt.charge'));
  const chargeBar = h('div', { class: 'charge-bar' }, chargeZone, chargeFill, chargeLabel);

  const renderHp = (): void => {
    clearChildren(hpHearts);
    for (let i = 0; i < def.hp; i++) {
      hpHearts.append(h('span', { class: `hp-heart ${i < hp ? '' : 'lost'}` }, i < hp ? '❤' : '🖤'));
    }
  };
  const renderZone = (): void => {
    clampCenter();
    zone.style.left = `${(zoneCenter - zoneW / 2) * 100}%`;
    zone.style.width = `${zoneW * 100}%`;
  };

  clearChildren(box);
  box.append(
    h('div', { class: 'minigame-title' }, t('hunt.title', { name: tl(def.name) })),
    spriteImg(`game:${def.id}`, 'hunt-game'),
    hpHearts,
    feedback,
    bar,
    chargeBar,
    h('button', {
      class: 'btn',
      onclick: (ev: Event) => { ev.stopPropagation(); cleanup(); },
    }, t('hunt.flee')),
  );
  renderHp();
  renderZone();

  function onRelease(ev: Event): void {
    if (!charging || ended) return;
    ev.stopPropagation?.();
    charging = false;
    box.classList.remove('charging');
    const held = performance.now() - chargeStart;
    if (held < 120) {
      charge = 0;
      feedback.textContent = t('hunt.holdFirst');
      feedback.className = 'battle-feedback';
      return;
    }
    charge = Math.min(1, held / CHARGE_MS);
    const aim = Math.max(0, 1 - Math.abs(pos - zoneCenter) * 2);
    const result = huntShot(state, uid, aim, now(), charge);
    dispatch(result);
    const shot = result.shot;
    if (!result.ok || !shot) { cleanup(); return; }

    chargeFill.style.width = '0%';
    if (shot.fled) {
      sfx('miss');
      feedback.textContent = t('hunt.miss');
      feedback.className = 'battle-feedback miss';
      clearChildren(hpHearts);
      setTimeout(cleanup, 900);
      return;
    }
    if (shot.defeated) {
      sfx('crit');
      feedback.textContent = t('hunt.win', { coins: shot.coins });
      feedback.className = 'battle-feedback win';
      hp = 0;
      renderHp();
      clearChildren(hpHearts);
      showLoot(box, shot);
      setTimeout(cleanup, 1500);
      return;
    }
    // 命中但没倒下
    hp -= 1;
    renderHp();
    sfx('hit');
    feedback.textContent = t('hunt.hurt');
    feedback.className = 'battle-feedback hit';
    speed *= 1.25;
    zoneW = Math.max(0.1, zoneW * 0.85);
    zoneCenter = 0.2 + Math.random() * 0.6;
    pos = Math.random();
    renderZone();
  }

  box.addEventListener('pointerdown', (ev) => {
    if (ended) return;
    const target = ev.target as HTMLElement;
    if (target.closest('button')) return;
    ev.preventDefault();
    charging = true;
    chargeStart = performance.now();
    charge = 0;
    box.classList.add('charging');
  });
  window.addEventListener('pointerup', onRelease);

  let last = performance.now();
  const step = (ts: number): void => {
    if (ended) return;
    const dt = Math.min(50, ts - last) / 1000;
    last = ts;
    const effSpeed = charging ? speed * 0.55 : speed;
    pos += dir * effSpeed * dt;
    if (pos >= 1) { pos = 1; dir = -1; }
    if (pos <= 0) { pos = 0; dir = 1; }
    needle.style.left = `${pos * 100}%`;
    if (charging) {
      charge = Math.min(1, (ts - chargeStart) / CHARGE_MS);
      chargeFill.style.width = `${charge * 100}%`;
      const good = charge >= 0.55 && charge <= 0.92;
      chargeFill.classList.toggle('good', good);
      needle.classList.toggle('steady', charge >= 0.55);
    }
    raf = requestAnimationFrame(step);
  };
  raf = requestAnimationFrame(step);
}

function showLoot(box: HTMLElement, shot: { meat: string | null; pelt: string | null }): void {
  const ids = [shot.meat, shot.pelt].filter((id): id is string => !!id);
  if (ids.length === 0) return;
  const row = h('div', { class: 'hunt-loot' },
    ...ids.map((id) => h('div', { class: 'hunt-loot-item' },
      spriteImg(`icon:${id}`, 'icon-lg'),
      h('span', {}, `+1 ${tl(itemDef(id).name)}`),
    )),
  );
  box.append(row);
}
