# CourtWork Symbol & Motion · CW-BRAND-01

独立的 SVG 与 Web component 包，包含符号几何、状态样板、材质、导出与预览。原始图形来源为 Courtwork 固定提交 `f9ade85b72e5abcdc64c3a6c43ed3a13a2292476`，见 [来源清单](sources/legacy-provenance.json)。

**品牌方向：CourtWork · Your work. With you in it. / 人在其中，工作继续。** Court 指有机协作与正式编排共同构成的工作场合。人的意图、判断与返回路径属于工作关系的一部分；“在场”不要求持续在线或亲自执行每一步。这一抽象理念不是角色扮演或律师工作流，不新增Court领域实体，也不宣称完整多Runtime编排已实现。图形仍只展示宿主给定的在场、活动和留存事实，不自行产生权限或正式接受。详见[叙事裁定](../engineering/release/work-first-narrative-2026-09-11/DECISION.md)。

## 交付与阅读

- [原生交互样板](index.html)：八个语义样板、五种材质、16/20/24/32/48/64 px、深浅色与减少动态。
- [canonical geometry](geometry/mark.svg)：竖线与长/长/短三行；从冻结的 512 SVG 平移与等比缩放，保留全部比例与圆角。`src/geometry.generated.mjs` 与 `exports/` 均为派生物。
- [40 个静态 SVG](exports/manifest.json)：八样板 × 五材质，原生可编辑，无 raster `<image>` 或外链资源。
- [Web component](src/court-symbol.mjs) 与 [纯 SVG renderer](src/symbol.mjs)：无运行时依赖，不导入应用状态库。
- [视觉来源索引](sources/visual-runtime-index.json)：10 项本轮核实来源与附件候选，明确许可、版本未知和消费边界。
- [语义与接入契约](CONTRACT.md)、[迁移交接](HANDOFF.md)、[参考图及生成提示](references/README.md)。

```sh
# 在 Courtwork 仓库根目录；无需安装 npm 包
node brand/scripts/build.mjs
python3 -m http.server 8842 --bind 127.0.0.1 --directory brand
# 打开 http://127.0.0.1:8842/
node brand/scripts/query-index.mjs --surface icon --status verified
```

品牌预览是独立的素材检验页，不修改 CourtWork 应用 UI，也不部署站点。线上接入须由应用静态资源 allowlist 明确准入本包模块，不能为了预览而开放任意路径。

## 使用

```html
<script type="module" src="/brand/src/court-symbol.mjs"></script>
<court-symbol id="reasoning" concept="write" material="glass" size="48"
  presence="present" authority="none" activity="thinking"
  label="正在生成工作记录"></court-symbol>
```

```js
// 宿主先决定状态；组件只展示宿主给定事实。
const symbol = document.querySelector('#reasoning');
symbol.play('write'); // 产品反馈一次，最多 220ms；不循环
symbol.stop();        // 中断、卸载、数据到达均可立即停止

// 解释性品牌样板才使用较长的 440ms + 100ms stagger。
symbol.play('write', { explanatory: true });

// 已收到宿主离场事实：记录保持，参与者退场。
symbol.setAttribute('presence', 'absent');
symbol.play('withdraw');
```

全局主题不会暗中推断：宿主传 `theme="light|dark"`。`material` 可为 `mono|hierarchical|glass|depth|luminous`。尺寸≤24时三种表现材质自动降为无滤镜的 hierarchical；静态 SVG 按导出尺寸生成，如需 16px standalone 导出，用 `renderSymbol({size:16,…})`，不能把 128px glass SVG 当作光学小号。

宿主取色支持 `--cw-ink` / `--cw-record` 等公共 CSS token，见 [BR-1 接入契约](CONTRACT.md#host-color-tokens--br-1)；[16/20px 深浅色验证页](tests/host-colors.html)展示默认与宿主取色。

`renderSymbol()` 支持 Node 构建；默认每次生成独立 ID，确定性导出应传唯一 `idPrefix`。标签会转义，concept/material/state只接受枚举，尺寸限制为12–1024。无网络、脚本注入、字体或图片依赖。

## 接受范围

本包验证的是品牌图形、动效和显示契约，不包括新 Runtime UI、真实 provider、Matter/Review 产品闭环或 main takeover。作者视觉证据及独立验收分别保存在 `evidence/`；验收记录以实际执行为准。

Imagegen 用于材质参考；没有把生成位图描摹成 geometry，也没有把 Apple/Figma/Rive 的资产或源码纳入包。外部项目状态按来源索引的访问日记录，不保证其未来版本。

## 拟设厂商署名

[les Privilege](les-privilege/README.md)是独立的厂商署名登记与零依赖 SVG 包，源于产品图标母题。它不是 CourtWork 核心几何的替代版本。
