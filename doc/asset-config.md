# 资源配置（带播放速度）

本文档描述单个可渲染资源项的配置字段，并在原有结构上新增播放速度字段 `playbackSpeed`。

## 示例

```json
{
  "id": "cat-run",
  "type": "png",
  "src": "svg/catrun.gif",
  "anchor": { "x": 500, "y": 70 },
  "anchorAlign": "bottomLeft",
  "scale": 0.2,
  "z": 10,
  "opacity": 1.0,
  "rotationDeg": 0,
  "playbackSpeed": 1.0
}
```

> 说明：`playbackSpeed` 为新增字段，用于控制动画类资源（如 GIF、APNG、WebP 动画或精灵图序列）的播放速度；对静态图无影响。

## 字段说明

- `id`：字符串，资源唯一标识。用于查找、复用或排序时的引用键。
- `type`：字符串，资源类型标记。示例用 `png`，也可按引擎约定使用 `image`/`gif`/`webp`/`sprite` 等，不影响本文新增字段的含义。
- `src`：字符串，资源路径或 URL。支持相对路径或绝对路径。
- `anchor`：对象，定位锚点的坐标（像素单位）。
  - `x`：水平坐标。
  - `y`：垂直坐标。
- `anchorAlign`：字符串，`anchor` 与内容的对齐方式。常见取值：`center`、`topLeft`、`topRight`、`bottomLeft`、`bottomRight`、`top`、`bottom`、`left`、`right`（实际可用值以引擎实现为准）。
- `scale`：数字，整体缩放比例（1 为原始大小，0.5 为等比缩小一半）。
- `z`：数字，渲染层级（越大越靠前）。
- `opacity`：数字，透明度，范围 0.0–1.0。
- `rotationDeg`：数字，顺时针旋转角度（单位：度）。
- `playbackSpeed`：数字，播放速度倍率（新增）。
  - 默认值：`1.0`（与资源原始速度一致）
  - 推荐范围：`0.1`–`4.0`
  - 取值语义：`2.0` 为 2 倍速，`0.5` 为半速。
  - 适用范围：对“可动画”的资源生效（GIF/APNG/WebP 动画、序列帧等）；静态图片可忽略。

## 行为与兼容性

- 对于带内置时间轴的动画（如 GIF/WebP 动画）：
  - 引擎应以 `playbackSpeed` 作为时间缩放因子，即 实际帧间隔 = 原帧间隔 / `playbackSpeed`。
  - 如底层不支持时间缩放，可采用“跳帧/补帧”策略近似实现。
- 对于基于固定基准帧率（如 `baseFPS`）的序列帧：
  - 实际帧率 = `baseFPS * playbackSpeed`。
  - 当与导出/渲染上限冲突时，应以引擎上限为准，并在 UI 或日志提示被限速的实际值。
- 当资源为静态图时：
  - 可忽略 `playbackSpeed`；为保持配置一致性仍允许保留该字段。

## 默认值策略

- 未提供 `playbackSpeed` 时，引擎应视为 `1.0`。
- 无效或越界数值建议钳制到推荐范围（例如 <0.1 视为 0.1，>4 视为 4）。

## 版本与变更

- v1.1：新增字段 `playbackSpeed`，不破坏已有字段；旧配置可不修改继续使用。
- v1.0：初版资源项字段（无播放速度）。

