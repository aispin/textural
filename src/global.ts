import { Textural } from './textural.js';

declare global {
  // IIFE 构建：`<script src="...">` 之后直接用 `window.Textural`
  // eslint-disable-next-line no-var
  var Textural: typeof import('./textural.js').Textural;
}

globalThis.Textural = Textural;
