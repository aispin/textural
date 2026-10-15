# Textural

**English** · [简体中文](./README.zh-CN.md)

Turn any word into a soft, unobtrusive card background. Zero dependencies — a Canvas 2D base, an offscreen canvas for the text, and a WebGL shader for the flow and the grain.

[![npm version](https://img.shields.io/npm/v/@aifire/textural.svg)](https://www.npmjs.com/package/@aifire/textural)
[![license](https://img.shields.io/npm/l/@aifire/textural.svg)](./LICENSE)

- **4.8KB gzipped** (IIFE build, measured 4.83KB — see [Size](#size))
- **Zero runtime dependencies**
- **Three layouts**: `tile` seamless grid, `flow` flowing waves, `hero` giant watermark
- **TypeScript types included** — `dist/index.d.ts` is generated from the same source

Live demo: <https://aispin.github.io/textural/> — installable as a PWA. Its tuning panel renders a live copy of the background you are editing and exports it as a PNG at any width and height. The page also shows how to hand `SKILL.md` to a coding agent.

## Preview

| `tile` — seamless grid | `flow` — flowing waves | `hero` — giant watermark |
| --- | --- | --- |
| ![tile mode](./docs/screenshots/tile.jpg) | ![flow mode](./docs/screenshots/flow.jpg) | ![hero mode](./docs/screenshots/hero.jpg) |

## Install

```bash
npm i @aifire/textural
# pnpm add @aifire/textural / yarn add @aifire/textural
```

No bundler? Drop in the IIFE build (it exposes `window.Textural`):

```html
<script src="https://unpkg.com/@aifire/textural/dist/textural.iife.min.js"></script>
<script>
  new Textural('#card', { text: 'spark' });
</script>
```

The package ships **ESM + IIFE only**, no CJS build: it needs a real DOM and a canvas, so it belongs in a browser or a bundler (Node users should reach for a dynamic `import()`).

## Quick start

```ts
import { Textural } from '@aifire/textural';

const bg = new Textural('#card', {
  text: 'spark',   // up to 12 characters
  mode: 'tile',    // tile | flow | hero
  blur: 0.3,       // 0–1
  hue: 220,        // omit to derive it from the text
  intensity: 0.6,
  grain: 0.6
});
```

The container needs a size. The library adds `position: relative` and `overflow: hidden` itself, inserts its canvas underneath, and lifts the existing children above it.

React:

```tsx
import { useEffect, useRef } from 'react';
import { Textural } from '@aifire/textural';

export function Card({ title }: { title: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const bg = useRef<Textural>(null);

  useEffect(() => {
    bg.current = new Textural(ref.current!, { text: title });
    return () => bg.current?.destroy();   // destroy on unmount, or the WebGL context leaks
  }, []);

  useEffect(() => { bg.current?.update({ text: title }); }, [title]);

  return <div ref={ref} className="card">{/* card content */}</div>;
}
```

Vue:

```vue
<script setup>
import { onMounted, onBeforeUnmount, ref } from 'vue';
import { Textural } from '@aifire/textural';

const el = ref(null);
let bg = null;
onMounted(() => { bg = new Textural(el.value, { text: 'spark' }); });
onBeforeUnmount(() => bg?.destroy());
</script>

<template><div ref="el" class="card" /></template>
```

## API

| Method | Description |
| --- | --- |
| `new Textural(target, options?)` | `target` is a selector or an element; throws `[Textural] container not found` when it is missing |
| `bg.update(options)` | Merges options and redraws immediately, reusing the WebGL context and the offscreen canvases. Returns `this` |
| `bg.randomize(locked?)` | Randomizes the style options; keys in `locked` are pinned. Returns `this` |
| `bg.toDataURL()` | The current background as a PNG data URL |
| `bg.destroy()` | Releases the WebGL context, unbinds listeners, removes the canvas |

Readable properties: `bg.el`, `bg.opts` (defaults applied), `bg.theme`, `bg.hue`, `bg.seed`, and the static `Textural.defaults`.

### randomize()

```ts
bg.randomize();                            // every style option is random
bg.randomize({ text: 'echo' });            // new word, random style
bg.randomize({ mode: 'hero', hue: 220 });  // pin the layout and the hue, randomize the rest
```

It randomizes `mode`, `hue`, `blur`, `intensity`, `scale`, `grain`, `speed` and `seed`. It deliberately leaves `text` alone (that is content, not style), plus `theme` / `animate` / `fontWeight` / `fontFamily` (dark-mode adaptation, motion preference, typography) and `blurMaxRatio` / `dprMax` (technical knobs). Pass any of them in `locked` if you need them.

### Options

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `text` | `string` | `'灵感'` | Text to render, up to 12 characters |
| `mode` | `'tile' \| 'flow' \| 'hero'` | `'tile'` | Layout: seamless grid / flowing waves / giant watermark |
| `theme` | `'light' \| 'dark' \| 'auto'` | `'light'` | `auto` follows the container background brightness |
| `blur` | `number` | `0.3` | Gaussian blur strength, 0–1 |
| `blurMaxRatio` | `number` | `0.032` | Blur radius cap relative to the container's shorter side |
| `hue` | `number \| null` | `null` | Hue 0–360; `null` derives it from the text |
| `intensity` | `number` | `0.6` | Text texture opacity, 0–1 |
| `scale` | `number` | `1` | Font scale relative to the shorter side |
| `grain` | `number` | `0.6` | Film grain strength, 0–1 |
| `speed` | `number` | `1` | GLSL flow speed |
| `animate` | `boolean` | `true` | Enable the flow animation (respects `prefers-reduced-motion`) |
| `seed` | `number \| null` | `null` | Random seed; same seed produces the same texture |
| `fontWeight` | `number` | `700` | Font weight |
| `fontFamily` | `string` | system stack | Font family |
| `dprMax` | `number` | `2` | `devicePixelRatio` cap |

## Using it with coding agents

`SKILL.md` in the repo root is a contract written for coding agents: when to reach for this library, the minimal call, every option, six pitfalls that really bite, and the checks to run after an edit. You don't install it by hand — paste this line into your agent:

> Please install https://github.com/aispin/textural/blob/main/SKILL.md for me, and then tell me how to use it.

Claude Code reads project skills from `.claude/skills/<name>/SKILL.md` (personal: `~/.claude/skills/`); Codex scans `.agents/skills` from your working directory up to the repo root (personal: `~/.agents/skills/`); other assistants can take the Markdown as-is through `AGENTS.md`, `CLAUDE.md`, `.cursor/rules/*.mdc`, or straight in the chat.

Three constraints worth remembering:

1. A container without a size renders a 1×1 canvas — make it visible (the `ResizeObserver` covers most cases; otherwise call `update()`).
2. Each instance owns a WebGL context and browsers cap them around 8–16, so do not instantiate one per row in a long list. Use visible-only instances, or render once and reuse a `toDataURL()` image.
3. `destroy()` is not optional: skipping it leaks contexts until the browser logs `Too many active WebGL contexts`.

Self-check after a change:

```bash
npm run typecheck   # types
npm run build       # dist/ + a size report
npm run build:site  # assembles site/ (demo + IIFE) for a local look
```

## Size

Real output of `npm run build` (esbuild 0.28, target es2019, measured locally):

| Artifact | raw | gzip | brotli |
| --- | --- | --- | --- |
| `dist/index.js` (ESM, unminified, for your bundler) | 17.92KB | 6.28KB | 5.39KB |
| `dist/textural.iife.min.js` (IIFE, minified) | 11.87KB | **4.83KB** | 4.30KB |

The “4.8KB gzipped” figure refers to the second row. Type declarations are not part of the runtime size.

## Releasing

Versions are never edited by hand. [release-please](https://github.com/googleapis/release-please) derives them from [Conventional Commits](https://www.conventionalcommits.org/):

| Commit | Result |
| --- | --- |
| `fix: …` | patch release |
| `feat: …` | minor release |
| `feat!: …`, or `BREAKING CHANGE:` in the body | major release |
| `docs:` / `chore:` / `ci:` / `style:` / `refactor:` / `test:` | no release |

Every push to `main` runs [`publish.yml`](./.github/workflows/publish.yml):

1. release-please opens (or updates) a **Release PR** that already contains the next version in `package.json` and the new `CHANGELOG.md` entries.
2. You review and merge that PR.
3. The same workflow runs again, creates the tag and the GitHub Release, then publishes with `npm publish`.

Publishing is authenticated with npm [Trusted Publishing](https://docs.npmjs.com/trusted-publishers) (OIDC): the repository stores no long-lived token, and provenance attestations are generated automatically. One-time setup on the npm side — package → Settings → Trusted Publisher → GitHub, with `Organization or user: aispin`, `Repository: textural`, `Workflow filename: publish.yml`, `Allowed actions: npm publish`. If you rename the workflow file, update that field as well.

Prefer a manual gate on every release? Bind only `npm stage publish` and swap `npm publish` for `npm stage publish` in the workflow — each release then waits for a maintainer's 2FA approval on npmjs.com (note that staged publishing only works for a package that already exists).

## Development

```bash
npm install
npm run typecheck   # tsc --noEmit
npm run build       # dist/: ESM + IIFE + d.ts, prints sizes
npm run build:site  # site/: the demo page plus the IIFE, for local preview
```

The implementation lives in `src/textural.ts` (a single file). `demo/index.html` is the landing page; it consumes the built artifact through `<script src="./textural.js">`.

## License

[MIT](./LICENSE) · free for commercial use.
