# Textural

[English](./README.md) · **简体中文**

把任意文字渲染成柔和、不抢镜的卡片背景。零依赖——Canvas 2D 铺底、离屏画布写字、WebGL 着色器负责流动与颗粒。

[![npm version](https://img.shields.io/npm/v/@aifire/textural.svg)](https://www.npmjs.com/package/@aifire/textural)
[![license](https://img.shields.io/npm/l/@aifire/textural.svg)](./LICENSE)

- **5.8KB gzip**（IIFE 构建，实测 5.80KB，见[体积](#体积)）
- **0 运行时依赖**
- **3 种排布**：`tile` 无缝网格 / `flow` 波浪流动 / `hero` 超大水印
- **TypeScript 类型随包发布**，`dist/index.d.ts` 与实现同源生成

在线 Demo：<https://aispin.github.io/textural/> —— 可安装为 PWA。面板里会实时渲染一份"正在调的那张背景"的副本，并且能按任意宽高把它导出成 PNG；页面上还有一节讲怎么把 `SKILL.md` 交给编码助手。

## 效果

| `tile` 无缝网格 | `flow` 波浪流动 | `hero` 超大水印 |
| --- | --- | --- |
| ![tile 模式](./docs/screenshots/tile.jpg) | ![flow 模式](./docs/screenshots/flow.jpg) | ![hero 模式](./docs/screenshots/hero.jpg) |

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

本包只发 **ESM + IIFE** 两种产物，没有 CJS 构建：它依赖真实的 DOM 与 canvas，本来就该在浏览器或打包器里跑（Node 里请用动态 `import()`）。

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

容器需要有尺寸。库会自己补 `position: relative` 与 `overflow: hidden`，把 canvas 插到最底层，并把原有子元素抬到上层。

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
| `bg.toSVG(width?, height?)` | 导出当前背景为**矢量** SVG 字符串（默认取容器尺寸） |
| `bg.destroy()` | 释放 WebGL context、事件监听并摘掉 canvas |

可读属性：`bg.el`、`bg.opts`（补齐默认值后的配置）、`bg.theme`、`bg.hue`、`bg.seed`、静态 `Textural.defaults`。

`toSVG()` 用真正的矢量还原同一套配色与文字排布——水印仍然是可编辑的 `<text>`，能直接丢进 Figma / Illustrator 改。它装不下 WebGL 独有的那几步（fbm 扭曲、极光噪声、逐像素颗粒），所以和 PNG 导出非常接近、但并非逐像素一致；要颗粒感就导 PNG。

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

## 交给编码助手使用

仓库根目录的 `SKILL.md` 是写给编码助手的契约：什么时候该用、最小调用、全部选项、六个真会咬人的坑、改完代码要跑的自检命令。你不需要手动安装，把这句话发给你的助手就行：

> 请帮我安装 https://github.com/aispin/textural/blob/main/SKILL.md，并且告诉我怎么用。

Claude Code 从 `.claude/skills/<name>/SKILL.md` 读项目技能（个人级 `~/.claude/skills/`）；Codex 会从工作目录一路扫到仓库根的 `.agents/skills`（个人级 `~/.agents/skills/`）；其它助手可以直接吃这份 Markdown——写进 `AGENTS.md`、`CLAUDE.md`、`.cursor/rules/*.mdc`，或者干脆贴在对话里。

三条值得记住的约束：

1. 容器没有尺寸时画布是 1×1，先让它可见（`ResizeObserver` 能补大部分场景，否则手动 `update()`）。
2. 每个实例占一个 WebGL context，浏览器上限约 8–16 个；长列表不要一项一个实例，优先只给可见项建，或者出一次 `toDataURL()` 当静态图复用。
3. `destroy()` 不是可选的：不调用就会一路泄漏到浏览器报 `Too many active WebGL contexts`。

改完代码的自检：

```bash
npm run typecheck   # 类型
npm run build       # dist/ + 体积报告
npm run build:site  # 组装 site/（demo + IIFE）本地看效果
```

## 体积

`npm run build` 的真实输出（esbuild 0.28 / target es2019，本机实测）：

| 产物 | raw | gzip | brotli |
| --- | --- | --- | --- |
| `dist/index.js`（ESM，未压缩，交给使用方打包器） | 22.63KB | 7.67KB | 6.55KB |
| `dist/textural.iife.min.js`（IIFE，已压缩） | 14.45KB | **5.80KB** | 5.14KB |

对外口径的 “5.8KB gzip” 指第二行。类型声明不计入运行时体积。

## 发版

版本号从不手动改，由 [release-please](https://github.com/googleapis/release-please) 依据 [Conventional Commits](https://www.conventionalcommits.org/) 推导：

| commit | 结果 |
| --- | --- |
| `fix: …` | patch |
| `feat: …` | minor |
| `feat!: …`，或 body 里写 `BREAKING CHANGE:` | major |
| `docs:` / `chore:` / `ci:` / `style:` / `refactor:` / `test:` | 不发版 |

每次推 `main` 都会跑 [`publish.yml`](./.github/workflows/publish.yml)：

1. release-please 开（或更新）一个 **Release PR**，里面已经把 `package.json` 版本号、`CHANGELOG.md` 条目和 manifest 改好；
2. 你 review 之后点 **Merge**；
3. 这次运行接着打 tag、建 GitHub Release、发 npm —— 认证走 npm [Trusted Publishing](https://docs.npmjs.com/trusted-publishers)（OIDC），仓库里不存任何令牌，provenance 自动生成。

npm 侧只需配置一次：包 → Settings → Trusted Publisher → GitHub，填 `Organization or user: aispin`、`Repository: textural`、`Workflow filename: publish.yml`、`Allowed actions: npm publish`。

### 为什么还留着这一次「合并」点击

试过把它去掉，两条自动化路线都被 GitHub 挡住：

1. **GitHub 原生 auto-merge**：没有分支保护规则的分支不允许启用，报 `Protected branch rules not configured for this branch`；
2. **workflow 用 `GITHUB_TOKEN` 自己合并**：这种 push 不触发下游 workflow（防递归），而且同一个 workflow 无法再给它创建 Release —— `403 Resource not accessible by integration`，而 token 权限确实是 `contents: write`。

`skip-github-pull-request: true` 也不是出路：那个模式只负责"收尾已合并的 Release PR"，不会从裸提交直接发版（实测它永远判定"没有可发版本"）。

想彻底零点击：给仓库配一个 PAT 或 GitHub App token 来执行合并（属于长期凭证，请自行权衡），或者把 Trusted Publisher 设置成只允许 `npm stage publish`、每次发版去 npmjs.com 手工过 2FA。

如果 tag 建好了但 npm 发布失败：Actions → Release → Run workflow，勾上 `publish_current_version` 重新构建并发布。


## 开发

```bash
npm install
npm run typecheck   # tsc --noEmit
npm run build       # dist/：ESM + IIFE + d.ts，并打印体积
npm run build:site  # site/：demo 页面 + IIFE，本地预览用
```

实现只有 `src/textural.ts` 一个文件；`demo/index.html` 是落地页，通过 `<script src="./textural.js">` 使用构建产物。

## 协议

[MIT](./LICENSE) · 自由商用。
