---
name: textural
description: 用 @aifire/textural 给容器生成"文字底纹"背景（卡片 / 封面 / Banner / 水印）。当用户要求把某个词或短语做成卡片背景、底纹、纹理、水印，或提到 Textural 时使用。
---

# Textural —— 把文字变成卡片背景

给任意容器铺一层柔和的文字底纹。零依赖，Canvas 2D 铺底 + 离屏画布写字 + WebGL 着色器做流动与颗粒。

在线 Demo：<https://aispin.github.io/textural/> · 源码与完整选项表：<https://github.com/aispin/textural>

## 何时用 / 何时不用

**用**：用户要把一个词做成卡片、封面、Banner 的底纹；给水印、占位图、空状态配一个像样的背景；需要一张可导出的 PNG 底图。

**不用**：

- 需要服务端渲染出图（无 DOM / canvas）——换 node-canvas 之类的方案。
- 无限滚动、跟随页面的大背景——那是 CSS/CSS Houdini 的活。
- 用户只想改颜色/渐变，没有"文字"这个要素。

## 安装

```bash
npm i @aifire/textural
```

或在 HTML 里直接引 IIFE（挂 `window.Textural`，无需打包器）：

```html
<script src="https://unpkg.com/@aifire/textural/dist/textural.iife.min.js"></script>
```

## 最小可用用法

```ts
import { Textural } from '@aifire/textural';

// 容器要有尺寸；库会补 position:relative / overflow:hidden 并插入底层 canvas
const bg = new Textural('#card', { text: '灵感' });

// 改文案（最常见需求）
bg.update({ text: '专注' });

// 「换一个」按钮：换词 + 样式随机；不想让排布乱跳就锁定它
bg.randomize({ text: '远行', mode: 'tile' });

// 卸载必须释放，否则泄漏 WebGL context
bg.destroy();
```

React / Vue 的挂载与清理范例见 [README](./README.md#快速开始)。

## API

| 方法 | 返回 | 说明 |
| --- | --- | --- |
| `new Textural(target, options?)` | `Textural` | `target` 为选择器或元素；找不到容器抛 `[Textural] container not found: <target>` |
| `update(options)` | `this` | 增量改配置并立即重绘，复用 WebGL context 与离屏画布 |
| `randomize(locked?)` | `this` | 随机重排样式参数；`locked` 里的键锁定不随机，不传 = 样式全随机 |
| `toDataURL()` | `string` | 当前背景的 PNG data URL |
| `toSVG(width?, height?)` | `string` | 当前背景的矢量 SVG；文字是可编辑的 `<text>`，但不含 WebGL 的颗粒与扭曲（与 PNG 接近、非逐像素一致） |
| `destroy()` | `void` | 释放 context、解绑 ResizeObserver、摘掉 canvas |

属性：`el`、`opts`（补齐默认值后的配置）、`theme`、`hue`、`seed`、静态 `Textural.defaults`。

`randomize()` 随机的只有样式参数：`mode`、`hue`、`blur`、`intensity`、`scale`、`grain`、`speed`、`seed`。`text` / `theme` / `animate` / `fontWeight` / `fontFamily` / `blurMaxRatio` / `dprMax` **不会被随机**——要改就在入参里显式给出（这些键同样会被锁定）：

```ts
bg.randomize({ text: '回声' });             // 换词，样式随机
bg.randomize({ mode: 'tile', hue: 220 });  // 锁定排布与品牌色
```

## 选项速查（15 项，全部可热更新）

| 选项 | 类型 | 默认 | 说明 |
| --- | --- | --- | --- |
| `text` | `string` | `'灵感'` | 最多 12 个字符，超出截断 |
| `mode` | `'tile' \| 'flow' \| 'hero'` | `'tile'` | 网格 / 波浪流动 / 超大水印 |
| `theme` | `'light' \| 'dark' \| 'auto'` | `'light'` | `auto` 跟随容器背景亮度 |
| `blur` | `number` | `0.3` | 0–1，越大越隐约 |
| `blurMaxRatio` | `number` | `0.032` | 模糊半径相对容器短边的上限 |
| `hue` | `number \| null` | `null` | 0–360；`null` 由文字哈希推导 |
| `intensity` | `number` | `0.6` | 0–1，文字不透明度 |
| `scale` | `number` | `1` | 字号倍率（相对容器短边） |
| `grain` | `number` | `0.6` | 0–1，胶片颗粒，消色带 |
| `speed` | `number` | `1` | 流动动画速度 |
| `animate` | `boolean` | `true` | 自动尊重 `prefers-reduced-motion` |
| `seed` | `number \| null` | `null` | 相同种子 = 相同底纹 |
| `fontWeight` | `number` | `700` | 字重 |
| `fontFamily` | `string` | 系统字体栈 | 字体族 |
| `dprMax` | `number` | `2` | devicePixelRatio 上限 |

## 配方

```ts
// 安静的大标题底纹
new Textural('#hero', { text: '抵达', mode: 'hero', blur: 0.5, intensity: 0.45 });

// 可复现的配色：固定 seed 与 hue
new Textural('.card', { text: '回声', seed: 42, hue: 280 });

// 静态图：关掉动画并导出，用来给列表项复用（省 context）
const bg = new Textural('#thumb', { text: '梗概', animate: false });
const png = bg.toDataURL();
bg.destroy();

// 主题跟随：外层容器换色后同步
bg.update({ theme: document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light' });
```

## 坑（都会真实咬人）

1. **容器没尺寸** → 画布 1×1，什么都看不见。显隐切换（`display:none` → 可见）后 `ResizeObserver` 会补一次重绘，但若父级尺寸没变则不会触发，需要手动 `bg.update({})`。
2. **WebGL context 有上限**（约 8–16 个/页）。长列表不要一项一个实例：优先给可见项建实例，或干脆静态化（见配方）。
3. **忘记 `destroy()`** → context 泄漏，最终控制台报 `Too many active WebGL contexts`，最老的实例静默变黑。
4. **`text` 超 12 字符会被截断**，这是设计（底纹不是标题）。
5. **不支持 WebGL 的环境自动降级**到 Canvas 2D 只画底色（还好看，但没有流动与颗粒）；不要假设 `bg.gl` 一定非空。
6. **`animate: true` 是常态**，但在 `prefers-reduced-motion: reduce` 下会被自动关掉——这是刻意的，别去绕过它。

## 自检（改完代码请跑）

```bash
npm run typecheck   # tsc --noEmit，类型
npm run build       # dist/：ESM + IIFE + d.ts，并打印体积
npm run build:site  # site/：组装 demo（index.html + textural.js）
```

改完源码后，用 `npm run build:site` 产出的 `site/` 在浏览器里打开验证：容器出现了 canvas、`new Textural('#x')` 不抛错、`update()` 后画面变化、`destroy()` 后 canvas 被移除且页面无 `Too many active WebGL contexts` 警告。

本仓库只改了 `src/textural.ts` 就一定要重跑 `npm run build`——`demo/` 用的是构建产物，不跑构建看不到任何变化。
