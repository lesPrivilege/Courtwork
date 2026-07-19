// SchemaParts 记号件库 · 壳侧单源消费点（SKIN-B4 回迁）
//
// **几何逐字取自站面件库**（`site/index.html` 的 `<svg class="schema-parts">`），不重绘、不改数。
// 「站/稿/壳共用单源」是就绪图的解耦预留之一，其可验形态就是两侧几何逐字相等——
// `assert-schema-parts.mjs` 逐枚比对；壳侧但凡自己动一笔，门当场红。
//
// 色一律 `currentColor`：记号不带宗，色由消费点的 CSS `color` 给，故换 theme 即换色、
// 记号本身不择纸温（C-4 记号契约，双主题渲染一致由 e2e 实测）。
//
// 记号不经 icon 门（B0 速裁：线级组不经 icon 门，扩门另拍板），故不住 `src/icons/custom/`。

export function SchemaParts() {
  return (
    <svg className="schema-parts" aria-hidden="true" style={{ display: 'none' }}>
      {/* 鱼尾（节标）：刻本版心的折叠标记，抽象为对称折带。壳侧职＝区段起首标 */}
      <symbol id="mark-fishtail" viewBox="0 0 16 8"><path d="M0 0 L8 4 L16 0 L16 2.4 L8 6.4 L0 2.4 Z" fill="currentColor"/></symbol>
      {/* 文武线界行（结构分隔·无彩）：粗 2 / 空 2 / 细 1，与 tokens.json rule.* 同规格 */}
      <symbol id="mark-rule" viewBox="0 0 5 24" preserveAspectRatio="none"><rect x="0" y="0" width="2" height="24" fill="currentColor"/><rect x="4" y="0" width="1" height="24" fill="currentColor"/></symbol>
      {/* 侧点圈点（强调）：评点传统标记要处的圈，抽象为空心环。**取墨系不取琥珀**——琥珀已被「仅风险」宣告占用 */}
      <symbol id="mark-emphasis" viewBox="0 0 8 8"><circle cx="4" cy="4" r="2.6" fill="none" stroke="currentColor" stroke-width="1.2"/></symbol>
      {/* 落定章框廓（朱）：方印外框。**纯几何无字**（裁定：UI 尺寸下印文即墨污；印文字形入品牌资产会带来许可与谱系两重纠缠） */}
      <symbol id="mark-seal-frame" viewBox="0 0 96 96"><rect x="3" y="3" width="90" height="90" fill="none" stroke="currentColor" stroke-width="2"/></symbol>
      {/* 骑缝齿痕（接缝完整） */}
      <symbol id="mark-seam" viewBox="0 0 72 24"><path d="M6 4v16M18 7v10M30 2v20M42 7v10M54 4v16M66 9v6" fill="none" stroke="currentColor" stroke-width="1"/></symbol>
    </svg>
  );
}
