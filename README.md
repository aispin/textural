# Textural

把任意文字渲染成柔和、不抢镜的卡片背景。零依赖，Canvas 2D + WebGL 三层渲染。

[![npm](https://img.shields.io/npm/v/@aifire/textural.svg)](https://www.npmjs.com/package/@aifire/textural)
[![license](https://img.shields.io/npm/l/@aifire/textural.svg)](./LICENSE)

- **4.8KB gzip**（IIFE 全量构建，实测 4.83KB，见[体积](#体积)）
- **0 运行时依赖**
- **3 种排布**：`tile` 无缝网格 / `flow` 波浪流动 / `hero` 超大水印
- **TypeScript 类型随包发布**，`dist/index.d.ts` 与实现同源生成

在线 Demo：<https://aispin.github.io/textural/> —— 可安装为 PWA（带 app icon / favicon），面板里能实时调参、把当前背景导出成任意宽高的 PNG；页面上还有一节讲怎么把 `SKILL.md` 接进编码助手。

## 安装

```bash
npm i @aifire/textural
# pnpm add @aifire/textural / yarn add @aifire/textural
```

不想用打包器，直接引 IIFE 单文件（挂到 `window.Textural`）：

```html
<script src="https://unpkg.com/@aifire/textural/dist/textural.iife.min.js"></script>
<script>
  new Textural('#card', { text: '灵感' });
</script>
```

本包只发 **ESM + IIFE** 两种产物，没有 CJS 构建：它依赖真实的 DOM 与 canvas，本来就该在浏览器或打包器里跑（Node 里 `require()` 的读者请用动态 `import()`）。

## 快速开始

```ts
import { Textural } from '@aifire/textural';

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
import { Textural } from '@aifire/textural';

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
import { Textural } from '@aifire/textural';

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
| `bg.randomize(locked?)` | 随机重排样式参数；`locked` 里的键被锁定不参与随机，返回 `this` |
| `bg.toDataURL()` | 导出当前背景为 PNG data URL |
| `bg.destroy()` | 释放 WebGL context、事件监听并摘掉 canvas |

可读属性：`bg.el`、`bg.opts`（补齐默认值后的配置）、`bg.theme`、`bg.hue`、`bg.seed`、`Textural.defaults`。

### randomize()

```ts
bg.randomize();                            // 样式全随机
bg.randomize({ text: '回声' });             // 换词，样式跟着随机
bg.randomize({ mode: 'hero', hue: 220 });  // 锁定排布与色相，其余随机
```

随机的范围：`mode`、`hue`、`blur`、`intensity`、`scale`、`grain`、`speed`、`seed`。
**不随机**的是 `text`（内容，不是样式）、`theme` / `animate` / `fontWeight` / `fontFamily`（暗色适配、动效偏好、字体——随机它们会破坏可访问性与品牌一致性）以及 `blurMaxRatio` / `dprMax`（技术参数）。要固定其中任意一项，或者干脆指定某个样式参数，都走 `locked` 入参。

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
bg.randomize({ text: another });                        // 换词 + 样式随机（想省事就用这个）
bg.destroy();                                           // 卸
```

**想给用户一个「换一个」按钮**：`bg.randomize({ text: 新词 })` 一行搞定；需要保持品牌色或排布时把 `hue` / `mode` 放进 `locked`。

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
| `dist/index.js`（ESM，未压缩，交给使用方打包器） | 17.92KB | 6.28KB | 5.39KB |
| `dist/textural.iife.min.js`（IIFE，已压缩） | 11.87KB | **4.83KB** | 4.30KB |

对外口径的 “4.8KB gzip” 指第二行。类型声明不计入运行时体积。

## 发版

发版只有一个动作：

```bash
git tag v1.0.0 && git push origin v1.0.0
```

CI（[publish.yml](./.github/workflows/publish.yml)）会校验 tag 与 `package.json` 版本一致 → 构建 → 发布 npm → 建 GitHub Release；版本对不上会直接失败，不产生半成品。

**不需要 NPM_TOKEN**：流水线走 npm 的 [Trusted Publishing](https://docs.npmjs.com/trusted-publishers)（OIDC），每次发布用 GitHub Actions 现场换一次性凭证，仓库里不存长期密钥，provenance 也自动生成。前提三条：

- npmjs.com → 该包 → Settings → Trusted Publisher 绑定 `aispin` / `textural` / `publish.yml`
- workflow 里有 `id-token: write`（已配置）
- npm CLI ≥ 11.5.1、Node ≥ 22.14.0（workflow 已用 Node 24 + 最新 npm）

首次发布是唯一例外：包还不存在时绑不了 Trusted Publisher，得先用传统方式（token 或网页上传）发出 1.0.0，绑好之后建议在 Settings → Publishing access 选 “Require two-factor authentication and disallow tokens”，把用过的 token 撤掉。

**想要人工放行**（每次发版都过一遍 2FA）：npm 的 [Staged publishing](https://docs.npmjs.com/staged-publishing) 能做，但它**不能替代凭证**——`npm stage publish` 只是把包放进暂存区，还要维护者用 2FA 批准才真正上线；同样要求包已存在（npm CLI ≥ 11.15.0）。把 workflow 里的 `npm publish` 换成 `npm stage publish`、并在 Trusted Publisher 的 Allowed actions 里只勾 staged 即可，具体写法见 workflow 顶部注释。

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
