# Video Matting to SVG

Chromakey video matting that runs entirely in your browser and exports animated SVG. No installation, no uploads — processing is fully local.

## Live Demo

https://video-matting-to-svg-040p3er30m46.gigass.deno.net/

## Highlights

- WebGL‑accelerated chroma key with interactive color picking (click or drag to sample)
- Fine‑tuning controls: Threshold, Softness, Spill Suppression, Sharpen, Pixelation
- Per‑clip mask painting to preserve original video regions in selected time ranges
- Background modes: Transparent or Solid; optional preview background image for the SVG preview area
- One‑click export to animated SVG with inline preview and direct download

## How It Works

1. The video is rendered with a GPU shader and keyed against a chosen color.
2. Optional per‑clip masks are composited to keep regions from being keyed out.
3. Frames are sampled at the chosen FPS and scale and encoded as WebP (or PNG if WebP is unavailable).
4. The SVG uses SMIL `<animate>` to toggle frame visibility for a seamless loop.

All computation happens locally; your media never leaves the browser.

## Quick Start

1) Open `index.html` in a modern browser (Chrome, Edge, Safari).
2) Load a video (button “选择视频” or drag & drop onto the stage).
3) Click “拾取键色” (Pick Key Color) and click/drag on the background region.
4) Adjust Threshold/Softness/Spill/Sharpen; optionally add clips and paint masks.
5) In “导出 SVG 动画”, set FPS, Scale, Frame Format (WebP/PNG) and Quality, then export.

## Basic Workflow (Step‑by‑Step)

1) Import a video
   - Click “选择视频” (Choose Video) or drag a file onto the stage.
   - The first frame appears; the status bar shows resolution and duration.
   - Use the player controls to play/pause or scrub to a frame.

2) Pick a key color (required)
   - Click “拾取键色” (Pick Key Color).
   - Method A: single‑click to sample a point color.
   - Method B: click‑drag a small rectangle to sample the average color (more robust).
   - Tip: sample a representative background area; avoid the subject.

3) Refine the key
   - Threshold: expands/reduces the range keyed out; too high may eat into the subject.
   - Softness: smooths edges to reduce hard cut lines.
   - Spill Suppression: reduces green/blue fringing on the subject.
   - Sharpen: subtle sharpening of the result.
   - Pixelation: for stylized preview; matched during export for consistent look.

4) Improve details with Exclude Regions (optional)
   - Add Clip: defines a time range to paint a mask for restoring original video.
   - Move/Resize: drag the clip or its handles in the timeline.
   - Brush+: paint areas to keep the original video (not keyed out).
   - Brush−: erase those painted areas to re‑apply the keying.
   - Reset: clears the mask of the selected clip.

5) Choose background preview (optional)
   - Transparent: checkerboard indicates transparency; exported SVG keeps alpha.
   - Solid: composite the result over a chosen color for preview and export.
   - Preview Background Image: set an image behind the SVG preview area only.

6) Export animated SVG
   - Set FPS, Scale, Frame Format (WebP/PNG), and Quality.
   - Optionally Include Background to embed the preview background in the SVG.
   - Start export; watch progress; preview and download the generated SVG.

## Export Settings

- FPS: 6–12 is typically smooth with reasonable output size.
- Scale: downscaling accelerates export and reduces file size.
- Frame Format: WebP (smaller, supports alpha) or PNG (fallback when WebP unsupported).
- Quality (WebP): 0.6–0.8 is a good balance of size and fidelity.
- Include Background: embed the preview background (image/solid) into the SVG; otherwise keep transparency.

Notes
- Frame count is capped for safety (currently 600). Long videos are truncated at the selected FPS.
- Exported SVGs loop indefinitely.

## Performance & Compatibility

- Requires WebGL. SMIL animation is supported by modern browsers; test your target environment if you embed the SVG elsewhere.
- Large/long videos: prefer lower FPS and smaller scale to keep memory and time under control.
- WebP support is auto‑detected; the app falls back to PNG when needed.

## Localization

- Full UI available in English and Simplified Chinese.
- Toggle language from the header; the preference is persisted per browser.

## Project Structure

- `index.html` — Application shell and markup
- `src/styles.css` — Styles (light theme, cards, timeline, preview background)
- `src/main.js` — Core logic (WebGL matting, color picking, timeline/masks, SVG export)

## Privacy

Processing is local‑only. No media is uploaded.

## License

MIT — see `LICENSE`.
# Video Matting to SVG · 视频抠图转 SVG

[English](#english) | [简体中文](#简体中文)

## Table of Contents | 目录

- English
  - [Overview](#en-overview)
  - [Live Demo](#en-live-demo)
  - [Highlights](#en-highlights)
  - [How It Works](#en-how)
  - [Quick Start](#en-quick-start)
  - [Basic Workflow (Step‑by‑Step)](#en-workflow)
  - [Export Settings](#en-export)
  - [Performance & Compatibility](#en-performance)
  - [Localization](#en-localization)
  - [Project Structure](#en-structure)
  - [Privacy](#en-privacy)
  - [License](#en-license)
- 简体中文
  - [概述](#zh-overview)
  - [在线预览](#zh-demo)
  - [主要特性](#zh-highlights)
  - [工作原理](#zh-how)
  - [快速开始](#zh-quick-start)
  - [基础工作流（一步步上手）](#zh-workflow)
  - [导出设置](#zh-export)
  - [性能与兼容性](#zh-performance)
  - [多语言](#zh-localization)
  - [项目结构](#zh-structure)
  - [隐私](#zh-privacy)
  - [许可](#zh-license)

---

## English

### Overview <a id="en-overview"></a>
Chromakey video matting that runs entirely in your browser and exports animated SVG. No installation, no uploads — processing is fully local.

### Live Demo <a id="en-live-demo"></a>
https://video-matting-to-svg-040p3er30m46.gigass.deno.net/

### Highlights <a id="en-highlights"></a>
- WebGL‑accelerated chroma key with interactive color picking (click or drag to sample)
- Fine‑tuning controls: Threshold, Softness, Spill Suppression, Sharpen, Pixelation
- Per‑clip mask painting to preserve original video regions in selected time ranges
- Background modes: Transparent or Solid; optional preview background image for the SVG preview area
- One‑click export to animated SVG with inline preview and direct download

### How It Works <a id="en-how"></a>
1. The video is rendered with a GPU shader and keyed against a chosen color.
2. Optional per‑clip masks are composited to keep regions from being keyed out.
3. Frames are sampled at the chosen FPS and scale and encoded as WebP (or PNG if WebP is unavailable).
4. The SVG uses SMIL `<animate>` to toggle frame visibility for a seamless loop.

All computation happens locally; your media never leaves the browser.

### Quick Start <a id="en-quick-start"></a>
1) Open `index.html` in a modern browser (Chrome, Edge, Safari).
2) Load a video (button “选择视频” or drag & drop onto the stage).
3) Click “拾取键色” (Pick Key Color) and click/drag on the background region.
4) Adjust Threshold/Softness/Spill/Sharpen; optionally add clips and paint masks.
5) In “导出 SVG 动画”, set FPS, Scale, Frame Format (WebP/PNG) and Quality, then export.

### Basic Workflow (Step‑by‑Step) <a id="en-workflow"></a>
1) Import a video
   - Click “选择视频” (Choose Video) or drag a file onto the stage.
   - The first frame appears; the status bar shows resolution and duration.
   - Use the player controls to play/pause or scrub to a frame.
2) Pick a key color (required)
   - Click “拾取键色” (Pick Key Color).
   - Method A: single‑click to sample a point color.
   - Method B: click‑drag a small rectangle to sample the average color (more robust).
3) Refine the key
   - Threshold expands/reduces the keyed‑out range; Softness smooths edges; Spill Suppression reduces color spill; Sharpen adds subtle detail; Pixelation stylizes preview (matched during export).
4) Improve details with Exclude Regions (optional)
   - Add clips for time ranges, paint with Brush+ to keep original video, Brush− to erase, Reset to clear the clip mask. Drag to move/resize clips in the timeline.
5) Choose background preview (optional)
   - Transparent keeps alpha; Solid composites to a chosen color; a preview background image can be applied behind the SVG preview only.
6) Export animated SVG
   - Set FPS/Scale/Format/Quality, optionally Include Background, start export, then preview and download.

### Export Settings <a id="en-export"></a>
- FPS: 6–12 is typically smooth with reasonable output size.
- Scale: downscaling accelerates export and reduces file size.
- Frame Format: WebP (smaller, supports alpha) or PNG (fallback when WebP unsupported).
- Quality (WebP): 0.6–0.8 is a good balance of size and fidelity.
- Include Background: embed the preview background (image/solid) into the SVG; otherwise keep transparency.

Notes
- Frame count is capped for safety (currently 600). Long videos are truncated at the selected FPS.
- Exported SVGs loop indefinitely.

### Performance & Compatibility <a id="en-performance"></a>
- Requires WebGL. SMIL animation is supported by modern browsers; test your target environment if you embed the SVG elsewhere.
- Large/long videos: prefer lower FPS and smaller scale to keep memory and time under control.
- WebP support is auto‑detected; the app falls back to PNG when needed.

### Localization <a id="en-localization"></a>
- Full UI available in English and Simplified Chinese.
- Toggle language from the header; the preference is persisted per browser.

### Project Structure <a id="en-structure"></a>
- `index.html` — Application shell and markup
- `src/styles.css` — Styles (light theme, cards, timeline, preview background)
- `src/main.js` — Core logic (WebGL matting, color picking, timeline/masks, SVG export)

### Privacy <a id="en-privacy"></a>
Processing is local‑only. No media is uploaded.

### License <a id="en-license"></a>
MIT — see `LICENSE`.

---

## 简体中文

### 概述 <a id="zh-overview"></a>
在浏览器中完成视频色度抠图，并导出为可循环播放的 SVG 动画。无需安装、无需上传，所有处理均在本地完成。

### 在线预览 <a id="zh-demo"></a>
https://video-matting-to-svg-040p3er30m46.gigass.deno.net/

### 主要特性 <a id="zh-highlights"></a>
- WebGL 加速抠像，支持点击/框选拾取键色
- 可调参数：阈值、柔化、溢色抑制、锐化、像素化
- 按时间片段进行掩膜绘制：保留原视频区域或擦除已保留区域
- 背景模式：透明/纯色；可为导出预览区域叠加“预览背景图”
- 一键导出 SVG 动画，内联预览与直接下载

### 工作原理 <a id="zh-how"></a>
1. 使用 GPU 着色器对视频与选定键色进行抠像。
2. 可选的“片段掩膜”在时间范围内叠加以保留原视频区域。
3. 按设定帧率与分辨率采样帧，编码为 WebP（或在不支持时回退 PNG）。
4. SVG 通过 SMIL `<animate>` 在多帧之间切换，实现无缝循环。

所有计算均在本地浏览器完成，媒体不会被上传。

### 快速开始 <a id="zh-quick-start"></a>
1) 用浏览器打开 `index.html`（Chrome/Edge/Safari 等现代浏览器）。
2) 点击“选择视频”或将视频拖拽到舞台区域。
3) 点击“拾取键色”，在画面上点击或拖拽框选背景区域。
4) 视情况调整“阈值/柔化/溢色抑制/锐化/像素化”，可添加片段并绘制掩膜。
5) 在“导出 SVG 动画”中设置帧率、分辨率、编码与质量，点击导出。

### 基础工作流（一步步上手） <a id="zh-workflow"></a>
1) 导入视频：选择或拖拽，状态栏显示分辨率与时长，可播放/定位。
2) 拾取键色：点击或框选取样，建议选择具有代表性的背景区域。
3) 调整参数：阈值控制范围，柔化平滑边缘，溢色抑制减少溢色，锐化提升细节，像素化用于风格化预览（导出匹配）。
4) 片段与掩膜（可选）：添加片段后，用画笔+保留原视频区域，画笔−擦除保留；可拖动/缩放片段并“重置”。
5) 预览背景（可选）：透明/纯色，可为导出预览叠加单独的背景图。
6) 导出 SVG：设置参数后导出，查看进度，预览并下载。

### 导出设置 <a id="zh-export"></a>
- 帧率：6–12 通常足够流畅且体积可控。
- 分辨率：适当降低可显著加快导出并减小体积。
- 编码：优先 WebP（体积更小且支持透明），不支持时回退 PNG。
- 质量（WebP）：0.6–0.8 通常是较好的平衡点。
- 包含背景：将预览背景（图像/纯色）一同写入 SVG；不勾选则保持透明。

说明
- 为安全起见限制最大帧数（当前 600 帧），更长的视频会按所选帧率截断。
- 导出的 SVG 默认循环播放。

### 性能与兼容性 <a id="zh-performance"></a>
- 需要 WebGL。SMIL 动画在现代浏览器有良好支持；若在目标环境嵌入，请先做兼容性验证。
- 大分辨率/长视频建议降低帧率与分辨率以控制内存与时间。
- 会自动检测 WebP 支持，若不支持则回退 PNG。

### 多语言 <a id="zh-localization"></a>
- 界面支持中文与英文；右上角可切换，浏览器会记住你的选择。

### 项目结构 <a id="zh-structure"></a>
- `index.html`：应用入口与页面结构
- `src/styles.css`：样式（浅色主题、卡片、时间轴、预览背景等）
- `src/main.js`：核心逻辑（WebGL 抠像、拾色、时间轴/掩膜、SVG 导出）

### 隐私 <a id="zh-privacy"></a>
所有处理均在本地完成，媒体文件不会被上传。

### 许可 <a id="zh-license"></a>
MIT，详见 `LICENSE`。
