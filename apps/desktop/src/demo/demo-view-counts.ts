/**
 * 样板案页签计数（GENERIC-PACK-1 外提物）。
 *
 * 这四枚是**样板案展品**——硬编码的字符串，与真实产出无关，非 demo 案一律不显示。
 * 它们原先住 App.tsx 的 `viewCount`，按垂类工作面 id 逐条判等；壳因此在页签计数这条
 * 与渲染无关的路上也持有一份垂类枚举。迁到 demo 族后，壳侧只余通用两支
 * （结构化产出的有无、起草画布的定稿与否）。
 *
 * 键是宿主工作面 id（`HostWorkbenchView`），不是垂类 artifact type：计数挂在页签上，
 * 页签由宿主注册表定义。
 */
const DEMO_VIEW_COUNTS: Readonly<Record<string, string>> = Object.freeze({
  timeline: '47 件',
  graph: '14 · 15',
  matrix: '10 × 7',
  revision: '4 处',
});

export function demoViewCount(view: string): string | undefined {
  return DEMO_VIEW_COUNTS[view];
}
