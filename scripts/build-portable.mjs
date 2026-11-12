/**
 * 把 dist 打包成单个可双击打开的 HTML（无外部依赖、无服务器）。
 * 用法：npm run build && node scripts/build-portable.mjs
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

const root = process.cwd();
const dist = join(root, 'dist');
let html = readFileSync(join(dist, 'index.html'), 'utf8');

const cssTag = html.match(/<link[^>]+rel="stylesheet"[^>]*>/i);
const jsTag = html.match(/<script[^>]+src="[^"]+"[^>]*><\/script>/i);
if (!cssTag || !jsTag) throw new Error('dist/index.html 缺少 CSS 或 JS 资源标签');

const assetPath = (tag) => {
  const m = tag.match(/(?:href|src)="([^"]+)"/);
  if (!m) throw new Error('资源标签缺少路径');
  return resolve(dist, m[1].replace(/^\//, ''));
};

const css = readFileSync(assetPath(cssTag[0]), 'utf8');
let js = readFileSync(assetPath(jsTag[0]), 'utf8')
  .replace(/\/\/# sourceMappingURL=.*$/gm, '')
  .replace(/<\/script/gi, '<\\/script');

html = html.replace(cssTag[0], `<style>\n${css}\n</style>`);
html = html.replace(jsTag[0], '');
html = html.replace(/\s+crossorigin(?=[\s>])/gi, '');
html = html.replace('</body>', `<script>\n${js}\n</script>\n</body>`);

mkdirSync(join(root, 'release'), { recursive: true });
const out = join(root, 'release', 'ParadiseIsle.html');
writeFileSync(out, html, 'utf8');
console.log(`portable written: ${out} (${(Buffer.byteLength(html) / 1024).toFixed(0)} KB)`);
