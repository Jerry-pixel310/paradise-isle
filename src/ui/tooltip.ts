/**
 * 场景内悬浮提示：鼠标停在资源/猎物/作物/建筑上时显示名称与状态。
 */
import { h } from './dom';

let root: HTMLElement | null = null;

export function initTooltip(): void {
  root = h('div', { class: 'world-tooltip hidden' });
  document.body.append(root);
}

export function showTooltip(text: string, sx: number, sy: number): void {
  if (!root) return;
  if (root.textContent !== text) root.textContent = text;
  root.classList.remove('hidden');
  const rect = root.getBoundingClientRect();
  const x = Math.min(window.innerWidth - rect.width - 8, Math.max(8, sx + 16));
  const y = Math.min(window.innerHeight - rect.height - 8, Math.max(8, sy + 18));
  root.style.left = `${x}px`;
  root.style.top = `${y}px`;
}

export function hideTooltip(): void {
  root?.classList.add('hidden');
}
