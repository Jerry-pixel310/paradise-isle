/**
 * 宠物训练小游戏：3 次飞盘投掷机会，指针进入绿区时点击接住。
 * 命中数 0-3 交给 core/pets.trainPet 结算经验。
 */
import type { ActionResult, GameState } from '../core/types';
import { trainPet } from '../core/pets';
import { petDef } from '../core/registry';
import { t } from '../i18n';
import { h, clearChildren, spriteImg } from '../ui/dom';
import { sfx } from '../audio/sound';

export function startPetTraining(
  state: GameState,
  uid: number,
  now: () => number,
  dispatch: (r: ActionResult) => void,
  onEnd: () => void,
): void {
  const pet = state.pets.find((p) => p.uid === uid);
  if (!pet) return;
  const def = petDef(pet.defId);

  const root = h('div', { class: 'minigame-overlay' });
  const box = h('div', { class: 'minigame-box train-box' });
  root.append(box);
  document.body.append(root);

  let raf = 0;
  let ended = false;
  let round = 0;
  let hits = 0;
  let pos = Math.random();
  let dir = 1;
  let speed = 0.9;
  let zoneW = 0.3;
  let zoneCenter = 0.3 + Math.random() * 0.4;

  const cleanup = (): void => {
    ended = true;
    cancelAnimationFrame(raf);
    root.remove();
    onEnd();
  };

  const feedback = h('div', { class: 'battle-feedback' }, t('train.hint'));
  const bar = h('div', { class: 'train-bar' });
  const zone = h('div', { class: 'train-zone' });
  const needle = h('div', { class: 'train-needle' });
  bar.append(zone, needle);
  const counter = h('div', { class: 'train-counter' }, `0 / 3`);

  const clampZone = (): void => {
    const half = zoneW / 2;
    zoneCenter = Math.min(1 - half, Math.max(half, zoneCenter));
  };
  const renderZone = (): void => {
    clampZone();
    zone.style.left = `${(zoneCenter - zoneW / 2) * 100}%`;
    zone.style.width = `${zoneW * 100}%`;
  };

  clearChildren(box);
  box.append(
    h('div', { class: 'minigame-title' }, t('train.title', { name: pet.name })),
    spriteImg(`pet:${def.id}`, 'train-pet'),
    feedback,
    bar,
    counter,
    h('button', { class: 'btn', onclick: () => cleanup() }, t('train.giveUp')),
  );
  renderZone();

  const finish = (): void => {
    if (ended) return;
    cancelAnimationFrame(raf);
    const result = trainPet(state, uid, hits, now());
    dispatch(result);
    if (!result.ok) { cleanup(); return; }
    feedback.textContent = t('train.done', { n: hits });
    feedback.className = 'battle-feedback win';
    counter.textContent = `${hits} / 3`;
    setTimeout(cleanup, 1300);
  };

  const throwDisc = (ev: Event): void => {
    ev.stopPropagation();
    if (ended) return;
    const aim = 1 - Math.abs(pos - zoneCenter) * 2;
    const hit = aim >= 1 - zoneW;
    if (hit) { hits += 1; sfx('happy'); } else { sfx('miss'); }
    feedback.textContent = hit ? t('train.hit') : t('train.miss');
    feedback.className = `battle-feedback ${hit ? 'hit' : 'miss'}`;
    counter.textContent = `${hits} / ${round + 1}`;
    round += 1;
    if (round >= 3) { finish(); return; }
    speed = 0.9 + round * 0.25;
    zoneW = 0.3 - round * 0.03;
    zoneCenter = 0.2 + Math.random() * 0.6;
    pos = Math.random();
    renderZone();
  };

  bar.addEventListener('pointerdown', throwDisc);

  let last = performance.now();
  const step = (ts: number): void => {
    if (ended) return;
    const dt = Math.min(50, ts - last) / 1000;
    last = ts;
    pos += dir * speed * dt;
    if (pos >= 1) { pos = 1; dir = -1; }
    if (pos <= 0) { pos = 0; dir = 1; }
    needle.style.left = `${pos * 100}%`;
    raf = requestAnimationFrame(step);
  };
  raf = requestAnimationFrame(step);
}
