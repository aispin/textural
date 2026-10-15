"use strict";(()=>{function B(o){let t=2166136261;for(let e=0;e<o.length;e++)t^=o.charCodeAt(e),t=Math.imul(t,16777619)>>>0;return t>>>0}function S(o){let t=o>>>0;return function(){t=t+1831565813>>>0;let e=t;return e=Math.imul(e^e>>>15,1|e),e=e+Math.imul(e^e>>>7,61|e)^e,((e^e>>>14)>>>0)/4294967296}}var L=null;function k(){if(L!==null)return L;try{let o=document.createElement("canvas");o.width=o.height=1;let t=o.getContext("2d");t.filter="blur(2px)",L=t.filter==="blur(2px)"}catch{L=!1}return L}var N=`
  attribute vec2 a_pos;
  varying vec2 v_uv;
  void main(){
    v_uv = a_pos * 0.5 + 0.5;
    gl_Position = vec4(a_pos, 0.0, 1.0);
  }
`,X=`
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
`,F={text:"\u7075\u611F",mode:"tile",theme:"light",hue:null,blur:.3,blurMaxRatio:.032,intensity:.6,scale:1,grain:.6,speed:1,animate:!0,seed:null,fontWeight:700,fontFamily:'system-ui, -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif',dprMax:2};function H(o){if(!o)return null;let t=o.match(/rgba?\(([^)]+)\)/);if(!t)return null;let e=t[1].split(",").map(i=>parseFloat(i));return e.length<3?null:{r:e[0],g:e[1],b:e[2],a:e.length>3?e[3]:1}}function q(o){let t=e=>(e/=255,e<=.03928?e/12.92:Math.pow((e+.055)/1.055,2.4));return .2126*t(o.r)+.7152*t(o.g)+.0722*t(o.b)}function Y(o){let t=o;for(;t&&t.nodeType===1;){let e=H(getComputedStyle(t).backgroundColor);if(e&&e.a>.05)return q(e)<.5;t=t.parentElement}return matchMedia("(prefers-color-scheme: dark)").matches}var $=class{constructor(t,e={}){this.canvas=null;this.base=null;this.textLayer=null;this.gl=null;this.fallbackCtx=null;this.seed=0;this.hue=0;this.theme="light";this.prog=null;this.tex=null;this.u={tex:null,res:null,time:null,grain:null,speed:null,soft:null};this.bctx=null;this.tctx=null;this._rnd=S(1);this._raf=null;this._ro=null;this._onWinResize=null;this._w=0;this._h=0;this._dpr=1;this._destroyed=!1;this._tick=t=>{this._destroyed||(this._raf=requestAnimationFrame(this._tick),!document.hidden&&this._draw(t*.001))};let i=typeof t=="string"?document.querySelector(t):t;if(!i)throw new Error("[Textural] container not found: "+t);this.el=i,this.opts=Object.assign({},F,e),this._mount(),this._setupGL(),this._bindResize(),this._resize(),this._maybeAnimate()}_mount(){let t=this.el,e=getComputedStyle(t);e.position==="static"&&(t.style.position="relative"),e.overflow==="visible"&&(t.style.overflow="hidden");let i=document.createElement("canvas");i.className="textural-canvas",Object.assign(i.style,{position:"absolute",inset:"0",width:"100%",height:"100%",display:"block",pointerEvents:"none",zIndex:"1"}),t.insertBefore(i,t.firstChild),this.canvas=i,Array.from(t.children).forEach(n=>{if(n===i)return;let r=getComputedStyle(n);r.position==="static"&&(n.style.position="relative"),r.zIndex==="auto"&&(n.style.zIndex="3")}),this.base=document.createElement("canvas"),this.bctx=this.base.getContext("2d"),this.textLayer=document.createElement("canvas"),this.tctx=this.textLayer.getContext("2d")}_setupGL(){let t=this.canvas,e=document.createElement("canvas");if(!!(e.getContext("webgl")||e.getContext("experimental-webgl"))){let n=t.getContext("webgl",{alpha:!1,antialias:!1,depth:!1,stencil:!1,premultipliedAlpha:!1,preserveDrawingBuffer:!1,powerPreference:"low-power"});if(n&&this._initGL(n)){this.gl=n;return}}this.gl=null,this.fallbackCtx=t.getContext("2d")}_initGL(t){let e=(s,d)=>{let u=t.createShader(s);return t.shaderSource(u,d),t.compileShader(u),t.getShaderParameter(u,t.COMPILE_STATUS)?u:(console.warn("[Textural] shader:",t.getShaderInfoLog(u)),t.deleteShader(u),null)},i=e(t.VERTEX_SHADER,N),n=e(t.FRAGMENT_SHADER,X);if(!i||!n)return!1;let r=t.createProgram();if(t.attachShader(r,i),t.attachShader(r,n),t.linkProgram(r),!t.getProgramParameter(r,t.LINK_STATUS))return console.warn("[Textural] link:",t.getProgramInfoLog(r)),!1;t.deleteShader(i),t.deleteShader(n);let a=t.createBuffer();t.bindBuffer(t.ARRAY_BUFFER,a),t.bufferData(t.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),t.STATIC_DRAW);let l=t.getAttribLocation(r,"a_pos");t.enableVertexAttribArray(l),t.vertexAttribPointer(l,2,t.FLOAT,!1,0,0),t.useProgram(r);let h=t.createTexture();return t.bindTexture(t.TEXTURE_2D,h),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_WRAP_S,t.CLAMP_TO_EDGE),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_WRAP_T,t.CLAMP_TO_EDGE),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_MIN_FILTER,t.LINEAR),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_MAG_FILTER,t.LINEAR),t.pixelStorei(t.UNPACK_FLIP_Y_WEBGL,!0),this.prog=r,this.tex=h,this.u={tex:t.getUniformLocation(r,"u_tex"),res:t.getUniformLocation(r,"u_res"),time:t.getUniformLocation(r,"u_time"),grain:t.getUniformLocation(r,"u_grain"),speed:t.getUniformLocation(r,"u_speed"),soft:t.getUniformLocation(r,"u_soft")},!0}_bindResize(){typeof ResizeObserver!="undefined"?(this._ro=new ResizeObserver(()=>this._resize()),this._ro.observe(this.el)):(this._onWinResize=()=>this._resize(),window.addEventListener("resize",this._onWinResize))}_resize(){if(this._destroyed)return;let t=this.el.getBoundingClientRect(),e=Math.max(1,Math.round(t.width)),i=Math.max(1,Math.round(t.height));if(e===this._w&&i===this._h)return;this._w=e,this._h=i;let n=Math.min(window.devicePixelRatio||1,this.opts.dprMax);this._dpr=n;let r=Math.round(e*n),a=Math.round(i*n),l=this.canvas,h=this.base,s=this.textLayer;l.width=r,l.height=a,h.width=r,h.height=a,s.width=r,s.height=a,this._computePalette(),this._renderBase(),this._uploadTexture(),this._draw(0)}_computePalette(){let t=this.opts,e=String(t.text||""),i=t.seed!=null?t.seed>>>0:B(e+"|"+t.mode+"|"+t.intensity);this.seed=i,this.theme=t.theme==="auto"?Y(this.el)?"dark":"light":t.theme;let n=t.hue;(n==null||isNaN(n))&&(n=Math.floor(S(i)()*360)),this.hue=(n%360+360)%360}_blurRadiusPx(){let t=Math.max(0,Math.min(1,Number(this.opts.blur)||0));return t<=.001?0:Math.min(this._w,this._h)*this.opts.blurMaxRatio*t*this._dpr}_renderBase(){let t=this.bctx,e=this.tctx,i=this.base,n=this.textLayer;if(!t||!e||!i||!n)return;let r=i.width,a=i.height;!r||!a||(this._rnd=S(this.seed),t.setTransform(1,0,0,1,0,0),t.globalAlpha=1,t.globalCompositeOperation="source-over",t.filter="none",t.clearRect(0,0,r,a),this._drawBackground(t,r,a),e.setTransform(1,0,0,1,0,0),e.globalAlpha=1,e.globalCompositeOperation="source-over",e.filter="none",e.clearRect(0,0,r,a),this._drawTextLayer(e,r,a),this._composite(t,r,a))}_composite(t,e,i){let n=this._blurRadiusPx(),r=this.textLayer;if(t.save(),t.globalAlpha=1,t.globalCompositeOperation="source-over",n<=.01)t.drawImage(r,0,0);else if(k())t.filter=`blur(${n.toFixed(2)}px)`,t.drawImage(r,0,0);else{let a=document.createElement("canvas"),l=Math.max(1,n/2);a.width=Math.max(1,Math.round(e/l)),a.height=Math.max(1,Math.round(i/l)),a.getContext("2d").drawImage(r,0,0,a.width,a.height),t.imageSmoothingQuality="high",t.globalAlpha=.75,t.drawImage(a,0,0,e,i),t.globalAlpha=1}t.restore()}_drawBackground(t,e,i){let n=this._rnd,r=this.theme==="light",a=this.hue;t.fillStyle=r?`hsl(${a},26%,98%)`:`hsl(${a},22%,7%)`,t.fillRect(0,0,e,i);for(let l=0;l<5;l++){let h=n()*e,s=n()*i,d=Math.max(e,i)*(.32+n()*.55),u=a+(n()-.5)*100,g=r?80+n()*14:11+n()*15,y=r?62:52,_=r?.5:.55,f=t.createRadialGradient(h,s,0,h,s,d);f.addColorStop(0,`hsla(${u},${y}%,${g}%,${_})`),f.addColorStop(1,`hsla(${u},${y}%,${g}%,0)`),t.fillStyle=f,t.fillRect(0,0,e,i)}}_drawTextLayer(t,e,i){let n=this.opts,r=String(n.text||"").replace(/\s+/g," ").trim();if(!r)return;let a=r.slice(0,12),l=this.theme==="light",h=this._rnd,s=this._dpr,d=Math.min(e,i),u=Math.max(12*s,d/9*n.scale),g=(l?.058:.072)*(n.intensity/.6),y=Math.max(0,Math.min(.32,g));if(t.save(),t.globalAlpha=y,t.fillStyle=l?`hsl(${this.hue},34%,20%)`:`hsl(${this.hue},26%,92%)`,t.textAlign="center",t.textBaseline="middle",t.font=`${n.fontWeight} ${u}px ${n.fontFamily}`,n.mode==="hero"){let m=d/Math.max(a.length,1)*1.05*n.scale;t.font=`${n.fontWeight} ${m}px ${n.fontFamily}`,t.globalAlpha=Math.min(.16,y*1.25),t.fillText(a,e/2,i*.53),t.restore();return}let f=Math.max(t.measureText(a).width,u*.6)*2.05,x=u*2.7,c=(h()*2-1)*.16;t.translate(e/2,i/2),t.rotate(c);let v=Math.hypot(e,i),T=Math.ceil(v/f)+1,M=Math.ceil(v/x)+1;for(let m=-M;m<=M;m++){let b=m%2===0?0:f*.5,w=m*x;for(let p=-T;p<=T;p++){let R=p*f+b,C=0;n.mode==="flow"&&(C=Math.sin(p*.62+m*.38)*x*.14),t.fillText(a,R,w+C)}}t.restore()}_uploadTexture(){let t=this.gl;t&&(t.bindTexture(t.TEXTURE_2D,this.tex),t.pixelStorei(t.UNPACK_FLIP_Y_WEBGL,!0),t.texImage2D(t.TEXTURE_2D,0,t.RGBA,t.RGBA,t.UNSIGNED_BYTE,this.base))}_draw(t){let e=this.gl,i=this.canvas;if(!e){this.fallbackCtx&&this.base&&this.base.width&&(this.fallbackCtx.clearRect(0,0,i.width,i.height),this.fallbackCtx.drawImage(this.base,0,0));return}let n=this.opts;e.viewport(0,0,i.width,i.height),e.useProgram(this.prog),e.activeTexture(e.TEXTURE0),e.bindTexture(e.TEXTURE_2D,this.tex),e.uniform1i(this.u.tex,0),e.uniform2f(this.u.res,i.width,i.height),e.uniform1f(this.u.time,t||0),e.uniform1f(this.u.grain,n.grain*.05),e.uniform1f(this.u.speed,n.speed),e.uniform1f(this.u.soft,Math.max(0,Math.min(1,Number(n.blur)||0))),e.drawArrays(e.TRIANGLES,0,3)}_maybeAnimate(){let t=matchMedia("(prefers-reduced-motion: reduce)").matches;!this.opts.animate||!this.gl||t||this._raf||(this._raf=requestAnimationFrame(this._tick))}_stopAnimate(){this._raf&&(cancelAnimationFrame(this._raf),this._raf=null)}update(t={}){return Object.assign(this.opts,t),this._computePalette(),this.base&&this.base.width&&(this._renderBase(),this._uploadTexture(),this._draw(0)),this.opts.animate&&this.gl?this._maybeAnimate():this._stopAnimate(),this}randomize(t={}){let e=(n,r)=>n+Math.random()*(r-n),i=["tile","flow","hero"];return this.update({mode:i[Math.floor(Math.random()*i.length)],hue:Math.floor(Math.random()*360),blur:e(.25,.75),intensity:e(.5,.8),scale:e(.95,1.35),grain:e(.4,.65),speed:e(.75,1.25),seed:Math.floor(Math.random()*4294967296),...t})}toDataURL(){return this._draw(0),this.canvas.toDataURL("image/png")}toSVG(t,e){let i=Math.max(1,Math.round(t!=null?t:this._w)),n=Math.max(1,Math.round(e!=null?e:this._h)),r=this.opts,a=this.theme==="light",l=this.hue,h=S(this.seed),s=c=>(Math.round(c*100)/100).toString(),d=c=>c.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"),u="",g=`<rect width="${i}" height="${n}" fill="hsl(${l},${a?26:22}%,${a?98:7}%)"/>`;for(let c=0;c<5;c++){let v=h()*i,T=h()*n,M=Math.max(i,n)*(.32+h()*.55),m=l+(h()-.5)*100,b=a?80+h()*14:11+h()*15,w=a?62:52,p=a?.5:.55;u+=`<radialGradient id="tbg${c}" gradientUnits="userSpaceOnUse" cx="${s(v)}" cy="${s(T)}" r="${s(M)}"><stop offset="0" stop-color="hsl(${s(m)},${w}%,${s(b)}%)" stop-opacity="${p}"/><stop offset="1" stop-color="hsl(${s(m)},${w}%,${s(b)}%)" stop-opacity="0"/></radialGradient>`,g+=`<rect width="${i}" height="${n}" fill="url(#tbg${c})"/>`}let _=String(r.text||"").replace(/\s+/g," ").trim().slice(0,12),f=this._blurRadiusFor(i,n),x="";if(_){let c=Math.min(i,n),v=Math.max(12,c/9*r.scale),T=Math.max(0,Math.min(.32,(a?.058:.072)*(r.intensity/.6))),M=a?`hsl(${l},34%,20%)`:`hsl(${l},26%,92%)`,m=`font-family="${d(r.fontFamily)}" font-weight="${r.fontWeight}" fill="${M}" text-anchor="middle" dominant-baseline="central"`;if(r.mode==="hero"){let b=c/Math.max(_.length,1)*1.05*r.scale;x=`<text x="${s(i/2)}" y="${s(n*.53)}" ${m} font-size="${s(b)}" fill-opacity="${s(Math.min(.16,T*1.25))}">${d(_)}</text>`}else{let b=document.createElement("canvas").getContext("2d");b.font=`${r.fontWeight} ${v}px ${r.fontFamily}`;let p=Math.max(b.measureText(_).width,v*.6)*2.05,R=v*2.7,C=(h()*2-1)*.16,G=Math.hypot(i,n),U=Math.ceil(G/p)+1,D=Math.ceil(G/R)+1,P="";for(let E=-D;E<=D;E++){let W=E%2===0?0:p*.5,I=E*R;for(let A=-U;A<=U;A++){let O=A*p+W,z=r.mode==="flow"?Math.sin(A*.62+E*.38)*R*.14:0;P+=`<text x="${s(O)}" y="${s(I+z)}">${d(_)}</text>`}}x=`<g ${m} font-size="${s(v)}" fill-opacity="${s(T)}" transform="translate(${s(i/2)} ${s(n/2)}) rotate(${s(C*180/Math.PI)})">${P}</g>`}f>.01&&(u+=`<filter id="tblur" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="${s(f)}"/></filter>`,x=`<g filter="url(#tblur)">${x}</g>`)}return u+='<radialGradient id="tvig" cx="0.5" cy="0.5" r="0.5"><stop offset="0.75" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.17"/></radialGradient>',`<svg xmlns="http://www.w3.org/2000/svg" width="${i}" height="${n}" viewBox="0 0 ${i} ${n}"><defs>${u}</defs>${g}${x}<rect width="${i}" height="${n}" fill="url(#tvig)"/></svg>`}_blurRadiusFor(t,e){let i=Math.max(0,Math.min(1,Number(this.opts.blur)||0));return i<=.001?0:Math.min(t,e)*this.opts.blurMaxRatio*i}destroy(){if(this._destroyed=!0,this._stopAnimate(),this._ro&&this._ro.disconnect(),this._onWinResize&&window.removeEventListener("resize",this._onWinResize),this.gl){let t=this.gl.getExtension("WEBGL_lose_context");t&&t.loseContext()}this.canvas&&this.canvas.parentNode&&this.canvas.parentNode.removeChild(this.canvas),this.canvas=this.base=this.bctx=null,this.textLayer=this.tctx=null}};$.defaults=F;globalThis.Textural=$;})();
