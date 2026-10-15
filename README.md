# Textural

把任意文字渲染成柔和、不抢镜的卡片背景。零依赖，Canvas 2D + WebGL 三层渲染。

[![npm](https://img.shields.io/npm/v/@aiblaze/textural.svg)](https://www.npmjs.com/package/@aiblaze/textural)
[![license](https://img.shields.io/npm/l/@aiblaze/textural.svg)](./LICENSE)

- **4.71KB gzip**（IIFE 全量构建，真实测量见[体积](#体积)）
- **0 运行时依赖**
- **3 种排布**：`tile` 无缝网格 / `flow` 波浪流动 / `hero` 超大水印
- **TypeScript 类型随包发布**，`dist/index.d.ts` 与实现同源生成

在线 Demo：<https://aispin.github.io/textural/>

## 安装

```bash
npm i @aiblaze/textural
# pnpm add @aiblaze/textural / yarn add @aiblaze/textural
```

不想用打包器，直接引 IIFE 单文件（挂到 `window.Textural`）：

```html
<script src="https://unpkg.com/@aiblaze/textural/dist/textural.iife.min.js"></script>
<script>
  new Textural('#card', { text: '灵感' });
</script>
```

本包只发 **ESM + IIFE** 两种产物，没有 CJS 构建：它依赖真实的 DOM 与 canvas，本来就该在浏览器或打包器里跑（Node 里 `require()` 的读者请用动态 `import()`）。

## 快速开始

```ts
import { Textural } from '@aiblaze/textural';

const bg = new Textural('#card', {
  text: '灵感',   // 最多 12 个字符
  mode: 'tile',   // tile | flow | hero
  blur: 0.3,      // 0–1
  hue: 220,       // 留空 = 由文字哈希推导
  intensity: 0.6,
  grain: 0.6
});
```

容器需要有尺寸；库会自己补 `position: relative` 与 `overflow: hidden`，把 canvas 插到最底层，并把原有子元素抬到上层。

React：

```tsx
import { useEffect, useRef } from 'react';
import { Textural } from '@aiblaze/textural';

export function Card({ title }: { title: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const bg = useRef<Textural>(null);

  useEffect(() => {
    bg.current = new Textural(ref.current!, { text: title });
    return () => bg.current?.destroy();   // 卸载必须 destroy，否则泄漏 WebGL context
  }, []);

  useEffect(() => { bg.current?.update({ text: title }); }, [title]);

  return <div ref={ref} className="card">{/* 卡片内容 */}</div>;
}
```

Vue：

```vue
<script setup>
import { onMounted, onBeforeUnmount, ref } from 'vue';
import { Textural } from '@aiblaze/textural';

const el = ref(null);
let bg = null;
onMounted(() => { bg = new Textural(el.value, { text: '灵感' }); });
onBeforeUnmount(() => bg?.destroy());
</script>

<template><div ref="el" class="card" /></template>
```

## API

| 方法 | 说明 |
| --- | --- |
| `new Textural(target, options?)` | `target` 是选择器或元素；容器不存在时抛 `[Textural] container not found` |
| `bg.update(options)` | 增量改配置并立即重绘；复用已有 WebGL context 与离屏画布，返回 `this` |
| `bg.toDataURL()` | 导出当前背景为 PNG data URL |
| `bg.destroy()` | 释放 WebGL context、事件监听并摘掉 canvas |

可读属性：`bg.el`、`bg.opts`（补齐默认值后的配置）、`bg.theme`、`bg.hue`、`bg.seed`、`Textural.defaults`。

### 选项

| 选项 | 类型 | 默认 | 说明 |
| --- | --- | --- | --- |
| `text` | `string` | `'灵感'` | 要渲染的文字，最多 12 个字符 |
| `mode` | `'tile' \| 'flow' \| 'hero'` | `'tile'` | 排布模式：无缝网格 / 波浪流动 / 超大水印 |
| `theme` | `'light' \| 'dark' \| 'auto'` | `'light'` | `auto` 跟随容器背景亮度 |
| `blur` | `number` | `0.3` | 文字高斯模糊强度 0–1 |
| `blurMaxRatio` | `number` | `0.032` | 模糊半径相对容器短边的上限 |
| `hue` | `number \| null` | `null` | 色相 0–360；`null` = 由文字哈希推导 |
| `intensity` | `number` | `0.6` | 文字纹理不透明度 0–1 |
| `scale` | `number` | `1` | 字号倍率，相对于容器短边 |
| `grain` | `number` | `0.6` | 胶片颗粒强度 0–1 |
| `speed` | `number` | `1` | GLSL 流动动画速度 |
| `animate` | `boolean` | `true` | 是否启用流动动画（自动尊重 `prefers-reduced-motion`） |
| `seed` | `number \| null` | `null` | 随机种子；相同种子产生相同底纹 |
| `fontWeight` | `number` | `700` | 字重 |
| `fontFamily` | `string` | 系统字体栈 | 字体族 |
| `dprMax` | `number` | `2` | `devicePixelRatio` 上限 |

## 给 AI Agent 的使用说明

这一节是写给编码助手（Claude Code / Codex 等）的，人读也不亏。完整的可执行契约在 [`SKILL.md`](./SKILL.md)。

**什么时候用**：用户要把某个词/短语做成卡片、封面、Banner 的底纹或水印；不要用它做图片编辑、无限滚动背景、或需要 SSR 产出的场景（它要 DOM 和 canvas）。

**最短路径**：

```ts
const bg = new Textural('#card', { text: userText });   // 建
bg.update({ text: another });                           // 改
bg.destroy();                                           // 卸
```

**三个必须记住的约束**：

1. 容器没有尺寸（`width/height` 为 0，例如放在 `display:none` 里）时画布是 1×1，等它可见后需要 `update()` 触发一次重绘（库靠 `ResizeObserver` 自动补大部分场景）。
2. 每个实例占一个 WebGL context，浏览器上限约 8–16 个；列表里请只给可见项建实例，或干脆 `animate: false` + `toDataURL()` 出静态图复用。
3. `destroy()` 不是可选的。组件卸载、路由切走、列表回收时都要调，否则 context 会泄漏到浏览器报 `Too many active WebGL contexts`。

**自检命令**（改完代码跑这三步就够）：

```bash
npm run typecheck   # 类型
npm run build       # 产物 + 体积报告
npm run build:site  # 组装 site/ 后打开 demo 页面看效果
```

## 体积

`npm run build` 的真实输出（esbuild 0.25 / target es2019，本机实测）：

| 产物 | raw | gzip | brotli |
| --- | --- | --- | --- |
| `dist/index.js`（ESM，未压缩，交给使用方打包器） | 16.94KB | 5.74KB | 4.98KB |
| `dist/textural.iife.min.js`（IIFE，已压缩） | 11.56KB | **4.71KB** | 4.19KB |

对外口径的 “4.7KB gzip” 指第二行。类型声明不计入运行时体积。

## 开发

```bash
npm install
npm run typecheck   # tsc --noEmit
npm run build       # dist/：ESM + IIFE + d.ts，并打印体积
npm run build:site  # site/：demo 页面 + IIFE，本地预览用
```

源码在 `src/textural.ts`（唯一实现文件）；`demo/index.html` 是演示页，通过 `<script src="./textural.js">` 使用构建产物。

## 协议

[MIT](./LICENSE) · 自由商用。
