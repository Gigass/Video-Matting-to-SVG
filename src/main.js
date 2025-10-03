(() => {
  const els = {
    fileInput: document.getElementById('fileInput'),
    dropZone: document.getElementById('dropZone'),
    video: document.getElementById('video'),
    canvas: document.getElementById('preview'),
    hint: document.getElementById('hint'),
    sampleCanvas: document.getElementById('sampleCanvas'),
    pickColorBtn: document.getElementById('pickColorBtn'),
    keySwatch: document.getElementById('keySwatch'),
    threshold: document.getElementById('threshold'),
    thresholdVal: document.getElementById('thresholdVal'),
    softness: document.getElementById('softness'),
    softnessVal: document.getElementById('softnessVal'),
    spill: document.getElementById('spill'),
    spillVal: document.getElementById('spillVal'),
    sharpen: document.getElementById('sharpen'),
    sharpenVal: document.getElementById('sharpenVal'),
    pixelSlider: document.getElementById('pixelSlider'),
    pixelVal: document.getElementById('pixelVal'),
    pickOverlay: document.getElementById('pickOverlay'),
    hoverSwatch: document.getElementById('hoverSwatch'),
    bgColor: document.getElementById('bgColor'),
    resetBtn: document.getElementById('resetBtn'),
    exportSvgAnimBtn: document.getElementById('exportSvgAnimBtn'),
    cancelSvgExportBtn: document.getElementById('cancelSvgExportBtn'),
    fpsInput: document.getElementById('fpsInput'),
    scaleSelect: document.getElementById('scaleSelect'),
    frameFormat: document.getElementById('frameFormat'),
    fmtSupport: document.getElementById('fmtSupport'),
    webpQuality: document.getElementById('webpQuality'),
    webpQVal: document.getElementById('webpQVal'),
    progress: document.getElementById('progress'),
    progressBar: document.getElementById('progressBar'),
    progressPct: document.getElementById('progressPct'),
    exportResult: document.getElementById('exportResult'),
    status: document.getElementById('status'),
  };

  const state = {
    hasVideo: false,
    picking: false,
    keyColor: [0.0, 1.0, 0.0], // default green in linear-ish space
    threshold: parseFloat(els.threshold.value),
    softness: parseFloat(els.softness.value),
    spill: parseFloat(els.spill.value),
    sharpen: parseFloat((document.getElementById('sharpen')||{value:'0'}).value) || 0,
    pixelSize: parseInt((document.getElementById('pixelSlider')||{value:'1'}).value, 10) || 1,
    bgMode: 'transparent',
    exporting: false,
    cancelExport: false,
    scale: parseFloat((document.getElementById('scaleSelect')||{value:'0.5'}).value) || 0.5,
    frameFormat: (document.getElementById('frameFormat')||{value:'webp'}).value || 'webp',
    webpQuality: parseFloat((document.getElementById('webpQuality')||{value:'0.4'}).value) || 0.4,
    previewKeyColor: null,
    previewBgUrl: null,
    previewBgDataUrl: null,
    includeBg: false,
  };

  const bgModeInputs = Array.from(document.querySelectorAll('input[name="bgMode"]'));

  // WebGL setup
  const gl = els.canvas.getContext('webgl', { premultipliedAlpha: false, preserveDrawingBuffer: true });
  if (!gl) {
    setStatus('当前浏览器不支持 WebGL，预览可能不可用');
    return;
  }

  const vertSrc = `
    attribute vec2 a_pos;
    attribute vec2 a_uv;
    varying vec2 v_uv;
    void main(){
      v_uv = a_uv;
      gl_Position = vec4(a_pos, 0.0, 1.0);
    }
  `;
  const fragSrc = `
    precision mediump float;
    varying vec2 v_uv;
    uniform sampler2D u_tex;
    uniform vec3 u_key;         // key color (linear-ish 0..1)
    uniform float u_thresh;     // threshold radius
    uniform float u_soft;       // softness of edge
    uniform float u_spill;      // spill suppression amount
    uniform int u_bgMode;       // 0 transparent, 1 solid
    uniform vec3 u_bgColor;     // bg solid color
    uniform vec2 u_viewSize;    // canvas size in pixels
    uniform float u_pixel;      // pixelation block size in output pixels
    uniform float u_sharpen;    // 0..1 amount

    // simple linearization for sRGB
    vec3 toLinear(vec3 c) {
      return pow(c, vec3(2.2));
    }
    vec3 toSRGB(vec3 c) {
      return pow(c, vec3(1.0/2.2));
    }

    void main(){
      // pixelation: quantize uv based on output pixel blocks
      vec2 stepUV = vec2(max(1.0, u_pixel)) / max(u_viewSize, vec2(1.0));
      vec2 uvq = floor(v_uv / stepUV) * stepUV + stepUV * 0.5;
      vec4 src = texture2D(u_tex, uvq);
      vec3 col = toLinear(src.rgb);
      // simple unsharp mask in linear space (4-neighbor)
      vec2 texel = 1.0 / max(u_viewSize, vec2(1.0));
      vec3 nb1 = toLinear(texture2D(u_tex, uvq + vec2(texel.x, 0.0)).rgb);
      vec3 nb2 = toLinear(texture2D(u_tex, uvq + vec2(-texel.x, 0.0)).rgb);
      vec3 nb3 = toLinear(texture2D(u_tex, uvq + vec2(0.0, texel.y)).rgb);
      vec3 nb4 = toLinear(texture2D(u_tex, uvq + vec2(0.0, -texel.y)).rgb);
      vec3 blur = (col*4.0 + nb1 + nb2 + nb3 + nb4) / 8.0;
      vec3 colSharpen = clamp(col + (col - blur) * (1.5 * u_sharpen), 0.0, 1.0);
      col = mix(col, colSharpen, u_sharpen);
      // distance in RGB linear space
      float d = distance(col, u_key);
      // alpha via smoothstep: near key color -> 0 alpha
      float alpha = smoothstep(u_thresh - u_soft, u_thresh + u_soft, d);

      // spill suppression: reduce contribution of key color channel
      // compute per-channel towards neutral based on key dominance
      vec3 kN = normalize(u_key + 1e-6);
      float kDominance = max(max(kN.r, kN.g), kN.b);
      vec3 spillFixed = col;
      if (kDominance > 0.0) {
        // project color onto key direction
        float proj = dot(col, normalize(u_key));
        vec3 keyComp = proj * normalize(u_key);
        vec3 rest = col - keyComp;
        spillFixed = mix(col, rest, u_spill * (1.0 - alpha));
      }

      vec3 outRGB = spillFixed;
      vec4 outColor = vec4(toSRGB(outRGB), alpha);

      if (u_bgMode == 1) {
        // composite over solid bg in linear space
        vec3 bg = toSRGB(u_bgColor);
        outColor.rgb = outColor.rgb * outColor.a + bg * (1.0 - outColor.a);
        outColor.a = 1.0;
      }
      gl_FragColor = outColor;
    }
  `;

  const program = createProgram(gl, vertSrc, fragSrc);
  const attribs = {
    a_pos: gl.getAttribLocation(program, 'a_pos'),
    a_uv: gl.getAttribLocation(program, 'a_uv'),
  };
  const uniforms = {
    u_tex: gl.getUniformLocation(program, 'u_tex'),
    u_key: gl.getUniformLocation(program, 'u_key'),
    u_thresh: gl.getUniformLocation(program, 'u_thresh'),
    u_soft: gl.getUniformLocation(program, 'u_soft'),
    u_spill: gl.getUniformLocation(program, 'u_spill'),
    u_bgMode: gl.getUniformLocation(program, 'u_bgMode'),
    u_bgColor: gl.getUniformLocation(program, 'u_bgColor'),
    u_viewSize: gl.getUniformLocation(program, 'u_viewSize'),
    u_pixel: gl.getUniformLocation(program, 'u_pixel'),
    u_sharpen: gl.getUniformLocation(program, 'u_sharpen'),
  };

  // fullscreen quad
  const vao = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vao);
  const quad = new Float32Array([
    // x, y,  u, v
    -1, -1,  0, 1,
     1, -1,  1, 1,
    -1,  1,  0, 0,
    -1,  1,  0, 0,
     1, -1,  1, 1,
     1,  1,  1, 0,
  ]);
  gl.bufferData(gl.ARRAY_BUFFER, quad, gl.STATIC_DRAW);

  // texture for video frame
  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

  let rafId = 0;
  let pixelOverride = null; // 在导出时覆盖像素块大小（按最终导出尺寸匹配预览块感）
  let rvfcSupported = 'requestVideoFrameCallback' in HTMLVideoElement.prototype;

  function setStatus(msg) { els.status.textContent = msg; }
  function setKeySwatch(rgb) {
    const [r,g,b] = rgb.map(x => Math.max(0, Math.min(255, Math.round(x*255))));
    els.keySwatch.style.background = `rgb(${r}, ${g}, ${b})`;
  }
  function srgbToLinear01(c) { return Math.pow(c, 2.2); }
  function linearToSrgb01(c) { return Math.pow(c, 1/2.2); }

  function fitCanvasToVideo() {
    const vw = els.video.videoWidth || 1280;
    const vh = els.video.videoHeight || 720;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    // size canvas CSS to contain within stage while preserving aspect ratio
    const rect = els.dropZone.getBoundingClientRect();
    const maxW = rect.width - 16; // padding/margins
    const maxH = rect.height - 16;
    let cw = maxW, ch = (vw? maxW*vh/vw : maxH);
    if (ch > maxH) { ch = maxH; cw = maxH*vw/vh; }
    els.canvas.style.width = `${cw|0}px`;
    els.canvas.style.height = `${ch|0}px`;
    els.canvas.width = Math.round(cw * dpr);
    els.canvas.height = Math.round(ch * dpr);
    gl.viewport(0, 0, els.canvas.width, els.canvas.height);
  }

  function renderFrame() {
    if (!state.hasVideo) return;
    gl.useProgram(program);
    gl.bindBuffer(gl.ARRAY_BUFFER, vao);
    gl.enableVertexAttribArray(attribs.a_pos);
    gl.vertexAttribPointer(attribs.a_pos, 2, gl.FLOAT, false, 16, 0);
    gl.enableVertexAttribArray(attribs.a_uv);
    gl.vertexAttribPointer(attribs.a_uv, 2, gl.FLOAT, false, 16, 8);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, tex);
    try {
      // 使用不翻转上传，UV 已按未翻转布局设置，避免倒置
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, els.video);
    } catch (e) {
      // Some browsers need dimensions first
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, els.video.videoWidth||1, els.video.videoHeight||1, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, els.video);
    }

    gl.uniform1i(uniforms.u_tex, 0);
    const key = (state.picking && state.previewKeyColor) ? state.previewKeyColor : state.keyColor;
    gl.uniform3fv(uniforms.u_key, new Float32Array(key));
    gl.uniform1f(uniforms.u_thresh, state.threshold);
    gl.uniform1f(uniforms.u_soft, Math.max(0.0001, state.softness));
    gl.uniform1f(uniforms.u_spill, state.spill);
    const bgModeInt = state.bgMode === 'solid' ? 1 : 0;
    gl.uniform1i(uniforms.u_bgMode, bgModeInt);
    const bg = hexToRgb01(els.bgColor.value);
    gl.uniform3fv(uniforms.u_bgColor, new Float32Array(bg.map(srgbToLinear01)));
    gl.uniform2f(uniforms.u_viewSize, els.canvas.width, els.canvas.height);
    const px = Math.max(1, (pixelOverride != null ? pixelOverride : state.pixelSize) || 1);
    gl.uniform1f(uniforms.u_pixel, px);
    gl.uniform1f(uniforms.u_sharpen, Math.max(0.0, Math.min(1.0, state.sharpen || 0)));

    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }

  function loopRAF() {
    renderFrame();
    rafId = requestAnimationFrame(loopRAF);
  }

  function loopRVFC() {
    const cb = () => {
      renderFrame();
      els.video.requestVideoFrameCallback(loopRVFC);
    };
    return cb;
  }

  // Event bindings
  els.fileInput.addEventListener('change', onFile);
  setupDnd(els.dropZone, file => loadVideo(file));
  bgModeInputs.forEach(r => r.addEventListener('change', () => {
    state.bgMode = bgModeInputs.find(x => x.checked).value;
    renderFrame();
  }));
  els.bgColor.addEventListener('change', () => { renderFrame(); });

  els.threshold.addEventListener('input', () => {
    state.threshold = parseFloat(els.threshold.value);
    els.thresholdVal.textContent = state.threshold.toFixed(2);
    renderFrame();
  });
  els.softness.addEventListener('input', () => {
    state.softness = parseFloat(els.softness.value);
    els.softnessVal.textContent = state.softness.toFixed(2);
    renderFrame();
  });
  els.spill.addEventListener('input', () => {
    state.spill = parseFloat(els.spill.value);
    els.spillVal.textContent = state.spill.toFixed(2);
    renderFrame();
  });
  if (els.sharpen) els.sharpen.addEventListener('input', () => {
    state.sharpen = parseFloat(els.sharpen.value);
    if (els.sharpenVal) els.sharpenVal.textContent = state.sharpen.toFixed(2);
    renderFrame();
  });
  if (els.pixelSlider) els.pixelSlider.addEventListener('input', () => {
    state.pixelSize = Math.max(1, Math.min(64, parseInt(els.pixelSlider.value||'1',10)));
    if (els.pixelVal) els.pixelVal.textContent = String(state.pixelSize);
    renderFrame();
  });

  els.pickColorBtn.addEventListener('click', () => {
    state.picking = !state.picking;
    els.pickColorBtn.classList.toggle('active', state.picking);
    els.canvas.classList.toggle('picking', state.picking);
    setStatus(state.picking ? '点击或拖拽选择区域以取样键色' : '准备就绪');
  });

  // Color pick (click or drag rectangle to average)
  let dragStart = null;
  els.canvas.addEventListener('mousedown', (e) => {
    if (!state.picking || !state.hasVideo) return;
    dragStart = getCanvasPos(e);
    showPickOverlay(dragStart, dragStart);
    e.preventDefault();
  });
  window.addEventListener('mousemove', (e) => {
    if (!state.picking || !state.hasVideo) return;
    const pos = getCanvasPos(e);
    if (dragStart == null) {
      // hover preview (small region)
      const a = {x: Math.max(0,pos.x-2), y: Math.max(0,pos.y-2)};
      const b = {x: Math.min(els.video.videoWidth-1,pos.x+2), y: Math.min(els.video.videoHeight-1,pos.y+2)};
      updatePickPreview(a,b,pos);
    } else {
      // drag rectangle preview
      updatePickPreview(dragStart, pos, pos);
    }
    e.preventDefault();
  });
  window.addEventListener('mouseup', (e) => {
    if (!state.picking || dragStart == null) return;
    const start = dragStart; dragStart = null;
    const end = getCanvasPos(e);
    pickFromRegion(start, end);
    state.picking = false;
    els.pickColorBtn.classList.remove('active');
    els.canvas.classList.remove('picking');
    hidePickOverlay();
    state.previewKeyColor = null;
  });
  els.canvas.addEventListener('click', (e) => {
    if (!state.picking || !state.hasVideo) return;
    const p = getCanvasPos(e);
    pickFromRegion(p, p);
    state.picking = false;
    els.pickColorBtn.classList.remove('active');
    els.canvas.classList.remove('picking');
    hidePickOverlay();
    state.previewKeyColor = null;
    renderFrame();
  });

  els.resetBtn.addEventListener('click', () => {
    state.keyColor = [0.0, 1.0, 0.0]; setKeySwatch(state.keyColor.map(linearToSrgb01));
    els.threshold.value = '1'; els.threshold.dispatchEvent(new Event('input'));
    els.softness.value = '1'; els.softness.dispatchEvent(new Event('input'));
    els.spill.value = '0.3'; els.spill.dispatchEvent(new Event('input'));
    bgModeInputs.find(x => x.value==='transparent').checked = true; state.bgMode='transparent';
    els.bgColor.value = '#000000';
    renderFrame();
  });

  els.exportSvgAnimBtn.addEventListener('click', startExportSvgAnimation);
  els.cancelSvgExportBtn.addEventListener('click', cancelExportSvg);
  if (els.scaleSelect) els.scaleSelect.addEventListener('change', ()=>{ state.scale = Math.max(0.1, Math.min(1, parseFloat(els.scaleSelect.value)||0.5)); });
  if (els.pixelSlider) els.pixelSlider.addEventListener('input', ()=>{ state.pixelSize = Math.max(1, Math.min(64, parseInt(els.pixelSlider.value||'1',10))); if (els.pixelVal) els.pixelVal.textContent = String(state.pixelSize); renderFrame(); });
  // 预览背景上传/清除
  const bgInput = document.getElementById('previewBgInput');
  const bgClear = document.getElementById('clearPreviewBgBtn');
  if (bgInput) bgInput.addEventListener('change', () => {
    const f = bgInput.files && bgInput.files[0];
    if (!f) return;
    if (state.previewBgUrl) URL.revokeObjectURL(state.previewBgUrl);
    state.previewBgUrl = URL.createObjectURL(f);
    const fr = new FileReader();
    fr.onload = () => { state.previewBgDataUrl = String(fr.result||''); };
    try { fr.readAsDataURL(f); } catch(_) {}
    applyPreviewBg();
  });
  if (bgClear) bgClear.addEventListener('click', () => {
    if (state.previewBgUrl) URL.revokeObjectURL(state.previewBgUrl);
    state.previewBgUrl = null;
    state.previewBgDataUrl = null;
    applyPreviewBg();
  });
  const includeBgCheck = document.getElementById('includeBgCheck');
  if (includeBgCheck) includeBgCheck.addEventListener('change', ()=>{ state.includeBg = includeBgCheck.checked; });
  if (els.frameFormat) els.frameFormat.addEventListener('change', ()=>{ state.frameFormat = els.frameFormat.value; updateFmtSupport(); updateWebPUI(); });
  if (els.webpQuality) els.webpQuality.addEventListener('input', ()=>{ state.webpQuality = parseFloat(els.webpQuality.value); if (els.webpQVal) els.webpQVal.textContent = state.webpQuality.toFixed(2); });
  updateFmtSupport();
  updateWebPUI();

  window.addEventListener('resize', fitCanvasToVideo);

  function onFile(ev) {
    const f = ev.target.files && ev.target.files[0];
    if (f) loadVideo(f);
  }

  function loadVideo(file) {
    stopLoops();
    URL.revokeObjectURL(els.video.src);
    const url = URL.createObjectURL(file);
    els.video.src = url;
    els.video.load();
    els.video.addEventListener('loadedmetadata', onLoadedMetadata, { once: true });
    els.video.addEventListener('error', () => setStatus('视频加载失败'), { once: true });
  }

  function onLoadedMetadata() {
    state.hasVideo = true;
    els.hint.style.display = 'none';
    fitCanvasToVideo();
    setStatus(`已加载 ${els.video.videoWidth}×${els.video.videoHeight}, 时长 ${(els.video.duration||0).toFixed(2)}s`);
    els.pickColorBtn.disabled = false;
    els.resetBtn.disabled = false;
    els.exportSvgAnimBtn.disabled = false;

    // prepare sample canvas for pixel read
    els.sampleCanvas.width = els.video.videoWidth;
    els.sampleCanvas.height = els.video.videoHeight;

    // start render loop
    if (rvfcSupported) {
      els.video.pause();
      const tick = loopRVFC();
      els.video.requestVideoFrameCallback(tick);
      // keep video playing muted in background to advance frames during preview
      els.video.play().catch(()=>{});
    } else {
      rafId = requestAnimationFrame(loopRAF);
      els.video.play().catch(()=>{});
    }

    // 自动预取一帧以估算建议键色，保证未拾色前也有预览
    setTimeout(()=>{ try { autoDetectKeyColor(); renderFrame(); } catch(_){} }, 120);
  }

  function stopLoops() {
    cancelAnimationFrame(rafId);
  }

  function getCanvasPos(e) {
    const rect = els.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    // map to video pixel space
    const sx = x / rect.width;
    const sy = y / rect.height;
    const vx = Math.max(0, Math.min(els.video.videoWidth-1, Math.round(sx * els.video.videoWidth)));
    const vy = Math.max(0, Math.min(els.video.videoHeight-1, Math.round(sy * els.video.videoHeight)));
    return { x: vx, y: vy };
  }

  function pickFromRegion(a, bPt) {
    const x0 = Math.min(a.x, bPt.x), x1 = Math.max(a.x, bPt.x);
    const y0 = Math.min(a.y, bPt.y), y1 = Math.max(a.y, bPt.y);
    const w = Math.max(1, x1 - x0 + 1);
    const h = Math.max(1, y1 - y0 + 1);
    const ctx = els.sampleCanvas.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(els.video, 0, 0, els.sampleCanvas.width, els.sampleCanvas.height);
    const img = ctx.getImageData(x0, y0, w, h).data;
    let r=0,g=0,b=0, n = w*h;
    for (let i=0;i<n;i++) {
      r += img[i*4+0]/255; g += img[i*4+1]/255; b += img[i*4+2]/255;
    }
    r/=n; g/=n; b/=n;
    // convert sRGB avg to linear for shader
    state.keyColor = [srgbToLinear01(r), srgbToLinear01(g), srgbToLinear01(b)];
    setKeySwatch([r,g,b]);
    setStatus(`已设置键色 rgb(${(r*255)|0}, ${(g*255)|0}, ${(b*255)|0})`);
  }

  // 尝试自动检测一个“较显眼”的键色：在缩小网格中寻找高饱和度像素
  function autoDetectKeyColor() {
    const vw = els.video.videoWidth|0, vh = els.video.videoHeight|0;
    if (!vw || !vh) return;
    const ctx = els.sampleCanvas.getContext('2d', { willReadFrequently: true });
    els.sampleCanvas.width = vw; els.sampleCanvas.height = vh;
    ctx.drawImage(els.video, 0, 0, vw, vh);
    const step = Math.max(2, Math.floor(Math.min(vw, vh) / 64));
    let best = { s: -1, r:0,g:0,b:0, x:0,y:0 };
    for (let y=0; y<vh; y+=step) {
      const row = ctx.getImageData(0, y, vw, 1).data;
      for (let x=0; x<vw; x+=step) {
        const i = x*4;
        const r = row[i]/255, g = row[i+1]/255, b = row[i+2]/255;
        const hsv = rgbToHsv(r,g,b);
        if (hsv.s > best.s && hsv.v > 0.1) { best = { s:hsv.s, r, g, b, x, y }; }
      }
    }
    if (best.s >= 0) {
      // 在该点周围小范围平均，降低噪声
      const x0 = Math.max(0, best.x-2), x1 = Math.min(vw-1, best.x+2);
      const y0 = Math.max(0, best.y-2), y1 = Math.min(vh-1, best.y+2);
      const w = x1-x0+1, h = y1-y0+1;
      const img = ctx.getImageData(x0,y0,w,h).data;
      let r=0,g=0,bl=0,n=w*h; for (let i=0;i<n;i++){ r+=img[i*4]/255; g+=img[i*4+1]/255; bl+=img[i*4+2]/255; }
      r/=n; g/=n; bl/=n;
      state.keyColor = [srgbToLinear01(r), srgbToLinear01(g), srgbToLinear01(bl)];
      setKeySwatch([r,g,bl]);
    }
  }

  function rgbToHsv(r,g,b){
    const max = Math.max(r,g,b), min = Math.min(r,g,b);
    const d = max - min;
    let h = 0;
    if (d !== 0) {
      if (max === r) h = ((g-b)/d) % 6;
      else if (max === g) h = (b-r)/d + 2;
      else h = (r-g)/d + 4;
      h /= 6; if (h<0) h+=1;
    }
    const s = max === 0 ? 0 : d/max;
    const v = max;
    return { h,s,v };
  }

  function updatePickPreview(a,bPt,pos){
    const x0 = Math.min(a.x, bPt.x), x1 = Math.max(a.x, bPt.x);
    const y0 = Math.min(a.y, bPt.y), y1 = Math.max(a.y, bPt.y);
    const w = Math.max(1, x1 - x0 + 1);
    const h = Math.max(1, y1 - y0 + 1);
    const ctx = els.sampleCanvas.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(els.video, 0, 0, els.sampleCanvas.width, els.sampleCanvas.height);
    const img = ctx.getImageData(x0, y0, w, h).data;
    let r=0,g=0,bl=0, n = w*h;
    for (let i=0;i<n;i++){ r+=img[i*4]/255; g+=img[i*4+1]/255; bl+=img[i*4+2]/255; }
    r/=n; g/=n; bl/=n;
    state.previewKeyColor = [srgbToLinear01(r), srgbToLinear01(g), srgbToLinear01(bl)];
    if (els.hoverSwatch) els.hoverSwatch.style.background = `rgb(${(r*255)|0}, ${(g*255)|0}, ${(bl*255)|0})`;
    showPickOverlay({x:x0,y:y0},{x:x1,y:y1}, pos);
    renderFrame();
  }

  function showPickOverlay(a,b,pos){
    if (!els.pickOverlay) return;
    els.pickOverlay.hidden = false;
    const rect = els.canvas.getBoundingClientRect();
    const sx = rect.width / (els.video.videoWidth||1);
    const sy = rect.height / (els.video.videoHeight||1);
    const x = Math.min(a.x,b.x)*sx, y = Math.min(a.y,b.y)*sy;
    const w = (Math.abs(b.x-a.x)+1)*sx, h = (Math.abs(b.y-a.y)+1)*sy;
    const box = els.pickOverlay.querySelector('.box');
    if (box){ box.style.left = `${x}px`; box.style.top = `${y}px`; box.style.width = `${w}px`; box.style.height = `${h}px`; }
    const sw = els.hoverSwatch;
    if (sw && pos){ sw.style.left = `${pos.x*sx}px`; sw.style.top = `${pos.y*sy}px`; }
  }
  function hidePickOverlay(){ if (els.pickOverlay) els.pickOverlay.hidden = true; }

  // 导出为 SVG 动画（透明背景），逐帧采样并在 SVG 中用 SMIL 切换显示
  async function startExportSvgAnimation() {
    if (!state.hasVideo || state.exporting) return;
    const fps = Math.max(1, Math.min(24, parseInt(els.fpsInput?.value || '8', 10) || 8));
    const duration = Math.max(0, els.video.duration || 0);
    if (!duration) { setStatus('无法获取视频时长'); return; }

    state.exporting = true;
    state.cancelExport = false;
    els.exportSvgAnimBtn.disabled = true;
    els.cancelSvgExportBtn.disabled = false;
    els.pickColorBtn.disabled = true;
    els.exportResult.innerHTML = '';
    setStatus('正在生成 SVG 动画...');
    updateProgress(0);

    const wasPlaying = !els.video.paused;
    try { els.video.pause(); } catch(_) {}

    const prevBgMode = state.bgMode;
    state.bgMode = 'transparent';

    // 提升到源分辨率渲染
    const prevCssW = els.canvas.style.width;
    const prevCssH = els.canvas.style.height;
    const prevW = els.canvas.width, prevH = els.canvas.height;
    const srcW = els.video.videoWidth, srcH = els.video.videoHeight;
    els.canvas.style.width = `${srcW}px`;
    els.canvas.style.height = `${srcH}px`;
    els.canvas.width = srcW; els.canvas.height = srcH;
    gl.viewport(0, 0, srcW, srcH);

    const totalFrames = Math.max(1, Math.floor(duration * fps));
    const maxFrames = 600; // 安全上限
    const N = Math.min(totalFrames, maxFrames);
    if (N < totalFrames) setStatus(`帧数较多，限制导出至 ${N} 帧（${fps}fps 上限 ${maxFrames}）`);

    const images = [];
    // 输出尺寸（按缩放）
    const scale = Math.max(0.1, Math.min(1, state.scale || 0.5));
    const outW = Math.max(1, Math.round(srcW * scale));
    const outH = Math.max(1, Math.round(srcH * scale));
    // 输出帧画布
    const outCanvas = document.createElement('canvas');
    outCanvas.width = outW; outCanvas.height = outH;
    const outCtx = outCanvas.getContext('2d');
    const seekTo = (t) => new Promise((res, rej) => {
      const onSeeked = () => { els.video.removeEventListener('seeked', onSeeked); res(); };
      els.video.addEventListener('seeked', onSeeked, { once: true });
      try { els.video.currentTime = Math.min(duration, Math.max(0, t)); } catch (e) { els.video.removeEventListener('seeked', onSeeked); rej(e); }
    });

    const epsilon = 1e-4;
    // 为了让导出块大小与最终尺寸一致，按缩放比例调整像素块
    const exportPixel = Math.max(1, Math.round((state.pixelSize || 1) * (srcW / Math.max(1, Math.round(srcW * scale)))));
    pixelOverride = exportPixel;

    for (let i = 0; i < N; i++) {
      if (state.cancelExport) break;
      const t = Math.min(duration - epsilon, i / fps);
      await seekTo(t);
      renderFrame();
      // 由着色器完成像素化，这里仅缩放到输出尺寸并保留块感
      outCtx.clearRect(0, 0, outW, outH);
      outCtx.imageSmoothingEnabled = false;
      outCtx.drawImage(els.canvas, 0, 0, srcW, srcH, 0, 0, outW, outH);
      const url = await encodeFrame(outCanvas, state.frameFormat, state.webpQuality);
      images.push(url);
      updateProgress((i+1)/N);
      await new Promise(r => setTimeout(r, 0));
    }

    // 还原尺寸与背景模式
    els.canvas.style.width = prevCssW;
    els.canvas.style.height = prevCssH;
    els.canvas.width = prevW; els.canvas.height = prevH;
    gl.viewport(0, 0, prevW, prevH);
    pixelOverride = null;
    state.bgMode = prevBgMode;

    if (state.cancelExport) { finishSvgExport(true); setStatus('已取消导出'); if (wasPlaying) els.video.play().catch(()=>{}); return; }

    const totalDur = N / fps;
    const header = `<?xml version="1.0" encoding="UTF-8"?>\n` +
      `<svg xmlns="http://www.w3.org/2000/svg" version="1.1" width="${outW}" height="${outH}" viewBox="0 0 ${outW} ${outH}">\n`;
    const footer = `\n</svg>`;
    let body = '';
    if (state.includeBg) {
      if (state.previewBgDataUrl) {
        body += `<image href=\"${state.previewBgDataUrl}\" x=\"0\" y=\"0\" width=\"${outW}\" height=\"${outH}\" preserveAspectRatio=\"xMidYMid meet\"/>\n`;
      } else if (state.bgMode === 'solid') {
        const hex = (els.bgColor?.value || '#000000');
        body += `<rect x=\"0\" y=\"0\" width=\"${outW}\" height=\"${outH}\" fill=\"${hex}\"/>\n`;
      }
    }
    for (let i = 0; i < N; i++) {
      const start = (i / N).toFixed(6);
      const end = ((i+1) / N).toFixed(6);
      const href = images[i];
      body += `<image x=\"0\" y=\"0\" width=\"${outW}\" height=\"${outH}\" opacity=\"0\" href=\"${href}\">` +
              `<animate attributeName=\"opacity\" begin=\"0s\" dur=\"${totalDur}s\" repeatCount=\"indefinite\" ` +
              `keyTimes=\"0;${start};${start};${end};${end};1\" values=\"0;0;1;1;0;0\"/>` +
              `</image>\n`;
    }
    const svg = header + body + footer;
    const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    // 直接预览 + 下载链接
    const a = document.createElement('a');
    a.href = url; a.download = 'chroma-keyed.svg'; a.textContent = '下载 SVG 动画';
    const img = document.createElement('img');
    img.src = url; img.alt = 'SVG 预览';
    const wrap = document.createElement('div');
    wrap.className = 'svg-preview';
    wrap.appendChild(img);
    els.exportResult.innerHTML = '';
    els.exportResult.appendChild(wrap);
    applyPreviewBg();
    els.exportResult.appendChild(a);
    setStatus(`SVG 生成完成并预览，帧数 ${N}，时长 ${totalDur.toFixed(2)}s`);
    finishSvgExport();
    if (wasPlaying) els.video.play().catch(()=>{});
    setTimeout(()=>URL.revokeObjectURL(url), 30000);
  }

  function cancelExportSvg() { state.cancelExport = true; }

  function finishSvgExport(canceled=false) {
    state.exporting = false;
    els.cancelSvgExportBtn.disabled = true;
    els.exportSvgAnimBtn.disabled = !state.hasVideo;
    els.pickColorBtn.disabled = !state.hasVideo;
    if (canceled) updateProgress(0);
  }




  // 旧的视频录制导出已移除

  function updateProgress(p) {
    const pct = Math.round(p*100);
    els.progressBar.style.width = `${pct}%`;
    els.progressPct.textContent = `${pct}%`;
  }

  // 编码单帧：优先 WebP（支持透明），回退 PNG
  async function encodeFrame(canvas, fmt, q) {
    const wantWebP = fmt === 'webp';
    if (wantWebP && supportsWebP()) {
      try {
        const url = canvas.toDataURL('image/webp', Math.max(0.4, Math.min(0.95, q||0.75)));
        if (url.startsWith('data:image/webp')) return url;
      } catch (_) {}
    }
    return canvas.toDataURL('image/png');
  }

  function supportsWebP() {
    try {
      const c = document.createElement('canvas');
      const u = c.toDataURL('image/webp');
      return u.startsWith('data:image/webp');
    } catch (_) { return false; }
  }

  function updateFmtSupport() {
    if (!els.fmtSupport) return;
    const ok = state.frameFormat === 'webp' ? supportsWebP() : true;
    els.fmtSupport.textContent = ok ? '' : '此浏览器不支持 WebP，已回退 PNG';
  }

  function updateWebPUI() {
    if (!els.webpQuality || !els.webpQVal) return;
    const on = state.frameFormat === 'webp';
    els.webpQuality.disabled = !on;
    els.webpQVal.textContent = state.webpQuality.toFixed(2);
  }

  function applyPreviewBg() {
    const wrap = els.exportResult.querySelector('.svg-preview');
    if (!wrap) return;
    if (state.previewBgUrl) {
      wrap.style.backgroundImage = `url('${state.previewBgUrl}')`;
    } else {
      wrap.style.backgroundImage = '';
    }
  }

  // 当前帧导出功能已移除（仅保留 SVG 动画导出）

  // utils
  function setupDnd(el, onFile) {
    el.addEventListener('dragover', (e)=>{ e.preventDefault(); el.classList.add('dragover'); });
    el.addEventListener('dragleave', ()=> el.classList.remove('dragover'));
    el.addEventListener('drop', (e)=>{
      e.preventDefault(); el.classList.remove('dragover');
      const f = e.dataTransfer.files && e.dataTransfer.files[0];
      if (f) onFile(f);
    });
  }
  function createProgram(gl, vsSrc, fsSrc) {
    const vs = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vs, vsSrc); gl.compileShader(vs);
    if (!gl.getShaderParameter(vs, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(vs));
    const fs = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fs, fsSrc); gl.compileShader(fs);
    if (!gl.getShaderParameter(fs, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(fs));
    const prog = gl.createProgram();
    gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
    return prog;
  }
  function hexToRgb01(hex) {
    const m = /^#?([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec(hex);
    if (!m) return [0,0,0];
    return [parseInt(m[1],16)/255, parseInt(m[2],16)/255, parseInt(m[3],16)/255];
  }

  // pickMime 移除
})();
