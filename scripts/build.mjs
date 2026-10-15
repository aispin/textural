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
import { copyFileSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
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
  copyFileSync(at('demo/index.html'), at('site/index.html'));
  copyFileSync(at('dist/textural.iife.min.js'), at('site/textural.js'));
  writeFileSync(at('site/.nojekyll'), '');
  console.log('site/ 已组装（index.html + textural.js）');
}
