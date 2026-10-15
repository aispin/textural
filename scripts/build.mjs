#!/usr/bin/env node
/**
 * 构建脚本：
 *   dist/index.js              ESM 包（npm 用户 import 的就是它）
 *   dist/textural.iife.min.js  IIFE 包（<script src> 直接用，挂 window.Textural）
 *   dist/*.d.ts                类型声明（tsc 生成）
 *
 * 加 --site 额外组装 site/（demo 页面 + IIFE），用于 GitHub Pages。
 */
import { build } from 'esbuild';
import { execFileSync } from 'node:child_process';
import { copyFileSync, cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { brotliCompressSync, gzipSync } from 'node:zlib';

const withSite = process.argv.includes('--site');
const root = new URL('..', import.meta.url).pathname;
const at = (p) => root + p;

const shared = {
  bundle: true,
  platform: 'browser',
  target: 'es2019',
  legalComments: 'none',
  logLevel: 'warning'
};

rmSync(at('dist'), { recursive: true, force: true });

await build({ ...shared, entryPoints: [at('src/index.ts')], format: 'esm', outfile: at('dist/index.js') });
await build({
  ...shared,
  entryPoints: [at('src/global.ts')],
  format: 'iife',
  minify: true,
  outfile: at('dist/textural.iife.min.js')
});

execFileSync(at('node_modules/.bin/tsc'), [], { cwd: root, stdio: 'inherit' });

const kb = (n) => `${(n / 1024).toFixed(2)}KB`;
for (const file of ['dist/index.js', 'dist/textural.iife.min.js']) {
  const buf = readFileSync(at(file));
  console.log(
    `${file.padEnd(28)} ${kb(buf.length).padStart(9)}  gzip ${kb(gzipSync(buf, { level: 9 }).length).padStart(9)}` +
      `  brotli ${kb(brotliCompressSync(buf).length).padStart(9)}`
  );
}

if (withSite) {
  rmSync(at('site'), { recursive: true, force: true });
  mkdirSync(at('site'), { recursive: true });

  // 落地页顶部的版本号从 package.json 注入，避免手写死：
  // （site/ 是部署产物，改这里的源码才能生效 —— 所以改完要重跑本命令）
  const { version } = JSON.parse(readFileSync(at('package.json'), 'utf8'));
  const html = readFileSync(at('demo/index.html'), 'utf8');
  const versionTag = /(<span class="pill" id="hero-version">)[^<]*(<\/span>)/;
  // 只校验「占位符在不在」：注入值正好等于占位符（版本没变）也是合法情况
  if (!versionTag.test(html)) throw new Error('注入版本号失败：demo/index.html 里找不到 #hero-version');
  const stamped = html
    .replace(versionTag, (_m, open, close) => `${open}v${version}${close}`)
    // 结构化数据里的 softwareVersion 也一起注入，别写死
    .replaceAll('__BUILD_VERSION__', version);
  writeFileSync(at('site/index.html'), stamped);

  copyFileSync(at('dist/textural.iife.min.js'), at('site/textural.js'));
  // PWA：manifest / service worker 必须在站点根，静态资源放 assets/
  copyFileSync(at('demo/manifest.webmanifest'), at('site/manifest.webmanifest'));
  // sw.js 里注入版本号当缓存名 → 每次发版自动作废旧缓存
  const sw = readFileSync(at('demo/sw.js'), 'utf8');
  if (!sw.includes('__BUILD_VERSION__')) throw new Error('注入 SW 缓存版本失败：demo/sw.js 里找不到 __BUILD_VERSION__');
  writeFileSync(at('site/sw.js'), sw.replace('__BUILD_VERSION__', version));
  cpSync(at('demo/assets'), at('site/assets'), { recursive: true });
  writeFileSync(at('site/.nojekyll'), '');
  console.log(`site/ 已组装（index.html + textural.js + PWA 资源，版本号 v${version}）`);
}
