/**
 * 品牌思考指示（#26.3 icon 本体动画的 chat 面落地,2026-07-12 用户定调）：
 * 左＝藏青竖线（品牌线，静止立定——非法理之线，处置语义不外借）；
 * 右＝三条横杠依次写开（transform:scaleX，motion 白名单），写完短驻后循环。
 * 纪律：数据区静止（本件是等待骨架非数据）；内容到达即整体卸载（0ms 硬切）。
 */
export function BrandThinking() {
  return <span className="brand-thinking" aria-hidden="true">
    <span className="brand-thinking-stem" />
    <span className="brand-thinking-lines">
      <span className="brand-thinking-line" />
      <span className="brand-thinking-line" />
      <span className="brand-thinking-line" />
    </span>
  </span>;
}
