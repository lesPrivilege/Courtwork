# namethatui.com：UI 词汇基准（2026-07-15）

来源：namethatui.com（UI 视觉词典：62 元素正名 + API 符号 + agent prompt，macOS/Web 双轨 + AppKit↔SwiftUI 翻译表）。调研原稿，不具约束力。

## 三个落点

1. **UI-SURFACE-1 对标清单的词汇基准**：清单逐项用其正名（popover vs dropdown vs tooltip、modal vs drawer vs sheet、badge/chip/pill/tag、segmented control、combo button、empty state、command palette、inspector、source list…），消除「那个小弹窗」式歧义——UL 纪律在 UI 层的直接应用。我们的现有面已可对号：右栏结构化工作面 = inspector、CaseRail = sidebar (source list)、Panels = split view、命令面板 = command palette、未开通态 = empty state 语义的控件级变体。
2. **词表与 VOICE-SPEC-1**：通用组件领域无关命名（principles.md §10）从此有参照词典；macOS 侧 NSPopover/sheet/panel 词汇有助于 Tauri 桌面质感的语义对齐（sheet 是窗口级模态、panel 是浮动辅助窗——我们的叠层语义可借其分类法自查）。
3. **DESIGN-MD-1 / 效果图管线**：courtwork-design.md 编译件中的组件名对齐正名后，喂给生成管线的 prompt 歧义更低（与 emil 的 animation-vocabulary 同一哲学：精确词汇 = 更好的 agent 输出）。

## 边界

只作词汇参照，不引入其组件实现或视觉；我们的三层表面/token/动效白名单不受影响。
