/* ==========================================================================
   Textural 核心 —— 把任意文字渲染成柔和、不抢镜的卡片背景
   零依赖：Canvas 2D 铺底 + 离屏画布写字 + WebGL 着色器做流动与颗粒
   ========================================================================== */

/** 排布模式：无缝网格 / 波浪流动 / 超大水印 */
export type TexturalMode = 'tile' | 'flow' | 'hero';

/** 明暗主题；auto 会跟随容器背景亮度 */
export type TexturalTheme = 'light' | 'dark' | 'auto';

export interface TexturalOptions {
  /** 要渲染的文字，最多 12 个字符 */
  text?: string;
  /** 排布模式：tile 无缝网格 / flow 波浪流动 / hero 超大水印 */
  mode?: TexturalMode;
  /** light / dark / auto，auto 会跟随容器背景亮度 */
  theme?: TexturalTheme;
  /** 色相 0–360；留空则由文字哈希自动推导 */
  hue?: number | null;
  /** 文字高斯模糊强度，0–1，越大越隐约 */
  blur?: number;
  /** 模糊半径相对容器短边的上限，默认 0.032 */
  blurMaxRatio?: number;
  /** 文字纹理不透明度，0–1 */
  intensity?: number;
  /** 字号倍率，相对于容器短边 */
  scale?: number;
  /** 胶片颗粒强度，0–1，用于消除渐变色带 */
  grain?: number;
  /** GLSL 流动动画速度 */
  speed?: number;
  /** 是否启用 GLSL 流动动画（自动尊重 prefers-reduced-motion） */
  animate?: boolean;
  /** 随机种子；相同种子产生相同底纹 */
  seed?: number | null;
  /** 字重 */
  fontWeight?: number;
  /** 字体族 */
  fontFamily?: string;
  /** devicePixelRatio 上限 */
  dprMax?: number;
}

/** 补齐默认值后的配置 */
export type TexturalResolvedOptions = Required<TexturalOptions>;

function hash32(str: string): number {
  let h = 2166136261 >>> 0;
  for(let i=0;i<str.length;i++){ h ^= str.charCodeAt(i); h = Math.imul(h,16777619)>>>0; }
  return h>>>0;
}
function mulberry32(seed: number): () => number {
  let a = seed>>>0;
  return function(){
    a = (a + 0x6D2B79F5)>>>0;
    let t = a;
    t = Math.imul(t ^ (t>>>15), 1|t);
    t = (t + Math.imul(t ^ (t>>>7), 61|t)) ^ t;
    return ((t ^ (t>>>14))>>>0) / 4294967296;
  };
}
let _filterOK: boolean | null = null;
function supportsCanvasFilter(): boolean {
  if(_filterOK !== null) return _filterOK;
  try{
    const c = document.createElement('canvas');
    c.width = c.height = 1;
    const g = c.getContext('2d')!;
    g.filter = 'blur(2px)';
    _filterOK = (g.filter === 'blur(2px)');
  }catch(e){ _filterOK = false; }
  return _filterOK;
}

const VERT_SRC = `
  attribute vec2 a_pos;
  varying vec2 v_uv;
  void main(){
    v_uv = a_pos * 0.5 + 0.5;
    gl_Position = vec4(a_pos, 0.0, 1.0);
  }
`;

const FRAG_SRC = `
  #ifdef GL_FRAGMENT_PRECISION_HIGH
    precision highp float;
  #else
    precision mediump float;
  #endif
  varying vec2 v_uv;
  uniform sampler2D u_tex;
  uniform vec2  u_res;
  uniform float u_time;
  uniform float u_grain;
  uniform float u_speed;
  uniform float u_soft;

  float hash21(vec2 p){
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }
  float vnoise(vec2 p){
    vec2 i = floor(p), f = fract(p);
    vec2 u = f*f*(3.0-2.0*f);
    float a = hash21(i);
    float b = hash21(i+vec2(1.0,0.0));
    float c = hash21(i+vec2(0.0,1.0));
    float d = hash21(i+vec2(1.0,1.0));
    return mix(mix(a,b,u.x), mix(c,d,u.x), u.y);
  }
  float fbm(vec2 p){
    float v=0.0, a=0.5;
    mat2 rot = mat2(0.80,0.60,-0.60,0.80);
    for(int i=0;i<3;i++){ v += a*vnoise(p); p = rot*p*2.03; a *= 0.5; }
    return v;
  }

  void main(){
    vec2 uv = v_uv;
    vec2 aspect = vec2(u_res.x/max(u_res.y,1.0), 1.0);
    vec2 p = uv * aspect;
    float t = u_time * u_speed;

    vec2 q = vec2(
      fbm(p*1.45 + vec2(0.0, t*0.32)),
      fbm(p*1.45 + vec2(5.2, -t*0.27))
    );
    vec2 warp = (q - 0.5) * 0.010;

    vec2 px = (1.2 + u_soft*3.0) / u_res;
    vec3 col = vec3(0.0);
    col += texture2D(u_tex, uv + warp).rgb * 0.40;
    col += texture2D(u_tex, uv + warp + vec2(px.x,0.0)).rgb * 0.15;
    col += texture2D(u_tex, uv + warp - vec2(px.x,0.0)).rgb * 0.15;
    col += texture2D(u_tex, uv + warp + vec2(0.0,px.y)).rgb * 0.15;
    col += texture2D(u_tex, uv + warp - vec2(0.0,px.y)).rgb * 0.15;

    float aurora = fbm(p*0.85 + vec2(t*0.13, -t*0.11) + q*0.55);
    col += (aurora - 0.5) * 0.035;

    float d = distance(v_uv, vec2(0.5)) * 1.38;
    col *= 1.0 - smoothstep(0.52, 1.0, d) * 0.17;

    float g = hash21(v_uv * u_res * 0.5 + fract(u_time)*137.0) - 0.5;
    col += g * u_grain;

    gl_FragColor = vec4(col, 1.0);
  }
`;

export const DEFAULTS: TexturalResolvedOptions = {
  text: '灵感',
  mode: 'tile',
  theme: 'light',
  hue: null,
  blur: 0.3,
  blurMaxRatio: 0.032,
  intensity: 0.6,
  scale: 1,
  grain: 0.6,
  speed: 1,
  animate: true,
  seed: null,
  fontWeight: 700,
  fontFamily: 'system-ui, -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif',
  dprMax: 2
};

interface RGB {
  r: number;
  g: number;
  b: number;
  a: number;
}

function parseColor(css: string): RGB | null {
  if(!css) return null;
  const m = css.match(/rgba?\(([^)]+)\)/);
  if(!m) return null;
  const p = m[1].split(',').map(v => parseFloat(v));
  if(p.length < 3) return null;
  return { r:p[0], g:p[1], b:p[2], a: p.length > 3 ? p[3] : 1 };
}
function relLuminance(c: RGB): number {
  const f = (v: number) => { v/=255; return v <= 0.03928 ? v/12.92 : Math.pow((v+0.055)/1.055, 2.4); };
  return 0.2126*f(c.r) + 0.7152*f(c.g) + 0.0722*f(c.b);
}
function isDarkContext(el: Element): boolean {
  let node: Element | null = el;
  while(node && node.nodeType === 1){
    const c = parseColor(getComputedStyle(node).backgroundColor);
    if(c && c.a > 0.05) return relLuminance(c) < 0.5;
    node = node.parentElement;
  }
  return matchMedia('(prefers-color-scheme: dark)').matches;
}

interface Uniforms {
  tex: WebGLUniformLocation | null;
  res: WebGLUniformLocation | null;
  time: WebGLUniformLocation | null;
  grain: WebGLUniformLocation | null;
  speed: WebGLUniformLocation | null;
  soft: WebGLUniformLocation | null;
}

export class Textural {
  static defaults: TexturalResolvedOptions = DEFAULTS;

  el: HTMLElement;
  opts: TexturalResolvedOptions;
  canvas: HTMLCanvasElement | null = null;
  base: HTMLCanvasElement | null = null;
  textLayer: HTMLCanvasElement | null = null;
  gl: WebGLRenderingContext | null = null;
  fallbackCtx: CanvasRenderingContext2D | null = null;
  seed = 0;
  hue = 0;
  theme: 'light' | 'dark' = 'light';

  private prog: WebGLProgram | null = null;
  private tex: WebGLTexture | null = null;
  private u: Uniforms = {
    tex:null, res:null, time:null, grain:null, speed:null, soft:null
  };
  private bctx: CanvasRenderingContext2D | null = null;
  private tctx: CanvasRenderingContext2D | null = null;
  private _rnd: () => number = mulberry32(1);
  private _raf: number | null = null;
  private _ro: ResizeObserver | null = null;
  private _onWinResize: (() => void) | null = null;
  private _w = 0;
  private _h = 0;
  private _dpr = 1;
  private _destroyed = false;

  constructor(target: string | HTMLElement, options: TexturalOptions = {}){
    const el = typeof target === 'string' ? document.querySelector<HTMLElement>(target) : target;
    if(!el) throw new Error('[Textural] container not found: ' + target);
    this.el = el;

    this.opts = Object.assign({}, DEFAULTS, options);

    this._mount();
    this._setupGL();
    this._bindResize();
    this._resize();
    this._maybeAnimate();
  }

  private _mount(): void {
    const el = this.el;
    const cs = getComputedStyle(el);
    if(cs.position === 'static') el.style.position = 'relative';
    if(cs.overflow === 'visible') el.style.overflow = 'hidden';

    const cvs = document.createElement('canvas');
    cvs.className = 'textural-canvas';
    Object.assign(cvs.style, {
      position:'absolute', inset:'0',
      width:'100%', height:'100%',
      display:'block', pointerEvents:'none', zIndex:'1'
    });
    el.insertBefore(cvs, el.firstChild);
    this.canvas = cvs;

    Array.from(el.children).forEach(child => {
      if(child === cvs) return;
      const s = getComputedStyle(child);
      if(s.position === 'static') (child as HTMLElement).style.position = 'relative';
      if(s.zIndex === 'auto') (child as HTMLElement).style.zIndex = '3';
    });

    this.base = document.createElement('canvas');
    this.bctx = this.base.getContext('2d');
    this.textLayer = document.createElement('canvas');
    this.tctx = this.textLayer.getContext('2d');
  }

  private _setupGL(): void {
    const canvas = this.canvas!;
    const probe = document.createElement('canvas');
    const hasGL = !!(probe.getContext('webgl') || probe.getContext('experimental-webgl'));
    if(hasGL){
      const gl = canvas.getContext('webgl', {
        alpha:false, antialias:false, depth:false, stencil:false,
        premultipliedAlpha:false, preserveDrawingBuffer:false,
        powerPreference:'low-power'
      });
      if(gl && this._initGL(gl)){ this.gl = gl; return; }
    }
    this.gl = null;
    this.fallbackCtx = canvas.getContext('2d');
  }

  private _initGL(gl: WebGLRenderingContext): boolean {
    const compile = (type: number, src: string): WebGLShader | null => {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if(!gl.getShaderParameter(s, gl.COMPILE_STATUS)){
        console.warn('[Textural] shader:', gl.getShaderInfoLog(s));
        gl.deleteShader(s);
        return null;
      }
      return s;
    };
    const vs = compile(gl.VERTEX_SHADER, VERT_SRC);
    const fs = compile(gl.FRAGMENT_SHADER, FRAG_SRC);
    if(!vs || !fs) return false;

    const prog = gl.createProgram()!;
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if(!gl.getProgramParameter(prog, gl.LINK_STATUS)){
      console.warn('[Textural] link:', gl.getProgramInfoLog(prog));
      return false;
    }
    gl.deleteShader(vs); gl.deleteShader(fs);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,3,-1,-1,3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, 'a_pos');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    gl.useProgram(prog);

    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);

    this.prog = prog;
    this.tex = tex;
    this.u = {
      tex:   gl.getUniformLocation(prog, 'u_tex'),
      res:   gl.getUniformLocation(prog, 'u_res'),
      time:  gl.getUniformLocation(prog, 'u_time'),
      grain: gl.getUniformLocation(prog, 'u_grain'),
      speed: gl.getUniformLocation(prog, 'u_speed'),
      soft:  gl.getUniformLocation(prog, 'u_soft')
    };
    return true;
  }

  private _bindResize(): void {
    if(typeof ResizeObserver !== 'undefined'){
      this._ro = new ResizeObserver(() => this._resize());
      this._ro.observe(this.el);
    } else {
      this._onWinResize = () => this._resize();
      window.addEventListener('resize', this._onWinResize);
    }
  }

  private _resize(): void {
    if(this._destroyed) return;
    const rect = this.el.getBoundingClientRect();
    const w = Math.max(1, Math.round(rect.width));
    const h = Math.max(1, Math.round(rect.height));
    if(w === this._w && h === this._h) return;
    this._w = w; this._h = h;

    const dpr = Math.min(window.devicePixelRatio || 1, this.opts.dprMax);
    this._dpr = dpr;
    const pw = Math.round(w * dpr);
    const ph = Math.round(h * dpr);

    const canvas = this.canvas!, base = this.base!, textLayer = this.textLayer!;
    canvas.width = pw; canvas.height = ph;
    base.width = pw; base.height = ph;
    textLayer.width = pw; textLayer.height = ph;

    this._computePalette();
    this._renderBase();
    this._uploadTexture();
    this._draw(0);
  }

  private _computePalette(): void {
    const o = this.opts;
    const text = String(o.text || '');
    const seed = o.seed != null ? (o.seed >>> 0) : hash32(text + '|' + o.mode + '|' + o.intensity);
    this.seed = seed;

    this.theme = o.theme === 'auto'
      ? (isDarkContext(this.el) ? 'dark' : 'light')
      : o.theme;

    let hue = o.hue;
    if(hue == null || isNaN(hue)) hue = Math.floor(mulberry32(seed)() * 360);
    this.hue = ((hue % 360) + 360) % 360;
  }

  private _blurRadiusPx(): number {
    const b = Math.max(0, Math.min(1, Number(this.opts.blur) || 0));
    if(b <= 0.001) return 0;
    return Math.min(this._w, this._h) * this.opts.blurMaxRatio * b * this._dpr;
  }

  private _renderBase(): void {
    const ctx = this.bctx, tctx = this.tctx;
    const base = this.base, textLayer = this.textLayer;
    if(!ctx || !tctx || !base || !textLayer) return;
    const w = base.width, h = base.height;
    if(!w || !h) return;

    this._rnd = mulberry32(this.seed);

    ctx.setTransform(1,0,0,1,0,0);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    ctx.filter = 'none';
    ctx.clearRect(0,0,w,h);
    this._drawBackground(ctx, w, h);

    tctx.setTransform(1,0,0,1,0,0);
    tctx.globalAlpha = 1;
    tctx.globalCompositeOperation = 'source-over';
    tctx.filter = 'none';
    tctx.clearRect(0,0,w,h);
    this._drawTextLayer(tctx, w, h);

    this._composite(ctx, w, h);
  }

  private _composite(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    const radius = this._blurRadiusPx();
    const textLayer = this.textLayer!;
    ctx.save();
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';

    if(radius <= 0.01){
      ctx.drawImage(textLayer, 0, 0);
    } else if(supportsCanvasFilter()){
      ctx.filter = `blur(${radius.toFixed(2)}px)`;
      ctx.drawImage(textLayer, 0, 0);
    } else {
      const tmp = document.createElement('canvas');
      const factor = Math.max(1, radius / 2);
      tmp.width = Math.max(1, Math.round(w / factor));
      tmp.height = Math.max(1, Math.round(h / factor));
      const t = tmp.getContext('2d')!;
      t.drawImage(textLayer, 0, 0, tmp.width, tmp.height);
      ctx.imageSmoothingQuality = 'high';
      ctx.globalAlpha = 0.75;
      ctx.drawImage(tmp, 0, 0, w, h);
      ctx.globalAlpha = 1;
    }
    ctx.restore();
  }

  private _drawBackground(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    const rnd = this._rnd;
    const light = this.theme === 'light';
    const hue = this.hue;

    ctx.fillStyle = light ? `hsl(${hue},26%,98%)` : `hsl(${hue},22%,7%)`;
    ctx.fillRect(0, 0, w, h);

    for(let i=0;i<5;i++){
      const cx = rnd()*w, cy = rnd()*h;
      const r = Math.max(w,h) * (0.32 + rnd()*0.55);
      const hh = hue + (rnd()-0.5)*100;
      const l = light ? 80 + rnd()*14 : 11 + rnd()*15;
      const sat = light ? 62 : 52;
      const a = light ? 0.5 : 0.55;
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
      g.addColorStop(0, `hsla(${hh},${sat}%,${l}%,${a})`);
      g.addColorStop(1, `hsla(${hh},${sat}%,${l}%,0)`);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    }
  }

  private _drawTextLayer(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    const o = this.opts;
    const raw = String(o.text || '').replace(/\s+/g, ' ').trim();
    if(!raw) return;

    const text = raw.slice(0, 12);
    const light = this.theme === 'light';
    const rnd = this._rnd;
    const dpr = this._dpr;
    const minSide = Math.min(w, h);

    const fontSize = Math.max(12*dpr, (minSide/9) * o.scale);
    const alphaBase = (light ? 0.058 : 0.072) * (o.intensity / 0.6);
    const alpha = Math.max(0, Math.min(0.32, alphaBase));

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = light ? `hsl(${this.hue},34%,20%)` : `hsl(${this.hue},26%,92%)`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `${o.fontWeight} ${fontSize}px ${o.fontFamily}`;

    if(o.mode === 'hero'){
      const size = (minSide / Math.max(text.length, 1)) * 1.05 * o.scale;
      ctx.font = `${o.fontWeight} ${size}px ${o.fontFamily}`;
      ctx.globalAlpha = Math.min(0.16, alpha * 1.25);
      ctx.fillText(text, w/2, h*0.53);
      ctx.restore();
      return;
    }

    const tw = Math.max(ctx.measureText(text).width, fontSize*0.6);
    const gapX = tw * 2.05;
    const gapY = fontSize * 2.7;
    const angle = (rnd()*2 - 1) * 0.16;
    ctx.translate(w/2, h/2);
    ctx.rotate(angle);

    const diag = Math.hypot(w, h);
    const cols = Math.ceil(diag/gapX) + 1;
    const rows = Math.ceil(diag/gapY) + 1;

    for(let j=-rows;j<=rows;j++){
      const rowOffset = (j % 2 === 0) ? 0 : gapX*0.5;
      const y = j * gapY;
      for(let i=-cols;i<=cols;i++){
        const x = i*gapX + rowOffset;
        let dy = 0;
        if(o.mode === 'flow') dy = Math.sin(i*0.62 + j*0.38) * gapY * 0.14;
        ctx.fillText(text, x, y + dy);
      }
    }
    ctx.restore();
  }

  private _uploadTexture(): void {
    const gl = this.gl;
    if(!gl) return;
    gl.bindTexture(gl.TEXTURE_2D, this.tex);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, this.base!);
  }

  private _draw(time: number): void {
    const gl = this.gl;
    const canvas = this.canvas!;
    if(!gl){
      if(this.fallbackCtx && this.base && this.base.width){
        this.fallbackCtx.clearRect(0, 0, canvas.width, canvas.height);
        this.fallbackCtx.drawImage(this.base, 0, 0);
      }
      return;
    }
    const o = this.opts;
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.useProgram(this.prog);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.tex);
    gl.uniform1i(this.u.tex, 0);
    gl.uniform2f(this.u.res, canvas.width, canvas.height);
    gl.uniform1f(this.u.time, time || 0);
    gl.uniform1f(this.u.grain, o.grain * 0.05);
    gl.uniform1f(this.u.speed, o.speed);
    gl.uniform1f(this.u.soft, Math.max(0, Math.min(1, Number(o.blur) || 0)));
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  private _maybeAnimate(): void {
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    if(!this.opts.animate || !this.gl || reduce) return;
    if(this._raf) return;
    this._raf = requestAnimationFrame(this._tick);
  }

  private _tick = (ts: number): void => {
    if(this._destroyed) return;
    this._raf = requestAnimationFrame(this._tick);
    if(document.hidden) return;
    this._draw(ts * 0.001);
  };

  private _stopAnimate(): void {
    if(this._raf){ cancelAnimationFrame(this._raf); this._raf = null; }
  }

  /** 运行时修改任意配置，会立即重绘（保留 WebGL context 与离屏画布） */
  update(options: TexturalOptions = {}): this {
    Object.assign(this.opts, options);
    this._computePalette();
    if(this.base && this.base.width){
      this._renderBase();
      this._uploadTexture();
      this._draw(0);
    }
    if(this.opts.animate && this.gl) this._maybeAnimate();
    else this._stopAnimate();
    return this;
  }

  /** 导出当前背景为 PNG data URL */
  toDataURL(): string {
    this._draw(0);
    return this.canvas!.toDataURL('image/png');
  }

  /** 释放 WebGL context、事件监听与挂载的 canvas */
  destroy(): void {
    this._destroyed = true;
    this._stopAnimate();
    if(this._ro) this._ro.disconnect();
    if(this._onWinResize) window.removeEventListener('resize', this._onWinResize);
    if(this.gl){
      const ext = this.gl.getExtension('WEBGL_lose_context');
      if(ext) ext.loseContext();
    }
    if(this.canvas && this.canvas.parentNode){
      this.canvas.parentNode.removeChild(this.canvas);
    }
    this.canvas = this.base = this.bctx = null;
    this.textLayer = this.tctx = null;
  }
}
