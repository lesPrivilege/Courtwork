# tokens 与规格可实现性审查

## 结论

`tokens.json` 是一份清晰的设计决策表，但不是可直接进入 Style Dictionary / Tokens Studio / CSS variables 生成链的标准 token 源。问题不在数值多少，而在结构、语义与运行时条件没有被分层。

## 真实工程里立不住的部分

### 1. JSON 结构不是统一可编译格式

- 有的叶子是 `{ "value": ... }`，有的是 `{ "fg", "bg" }`，`component.*` 又混用裸数字与字符串。
- `$meta`、`$description` 与自定义 `description` 混用；没有 `$type`。
- `semantic.revision.insert.decoration`、`motion.*.easing/iteration` 是复合对象，但没有说明生成目标。
- `radius.lg` 与 `radius.md` 同值 6px，命名暗示层级，实际没有差异。

建议保留当前文件作为“源决策文档”，另生成严格 DTCG 形状的 `tokens.source.json`，再产出 `tokens.css` / `tokens.ts`；不要让业务组件直接遍历当前 JSON。

### 2. `font-weight: 510` 没有可靠回退

系统栈并不保证变量字体。CSS 中直接写 `510` 时，Segoe UI、PingFang SC、微软雅黑如何映射由平台决定；文档说“非变量字体回退 500”，但没有可实现的检测或字体包策略。

建议 token 表达为 `medium: 500` 的跨平台基线；若未来打包明确的变量拉丁字体，再用 `@supports`/字体面单独启用 510。中文系统字体仍按 500 评审。

### 3. hairline 在 Windows/Tauri 缩放下不稳

`#EBEBEB` 对 `#FAFAFA` 为 `1.14:1`，对纯白为 `1.19:1`。它在高质量截图里克制，在 Windows 125%/150% 缩放、非整数 DPR 和低亮度显示器上可能断线或消失。贯穿网格是结构，不应依赖近乎不可见的颜色。

建议把“结构分隔线”和“容器细描边”拆为两个 token：前者至少过 3:1 非文本对比或通过双邻接底色验证；后者可以继续弱化。仍保持 1px、无影、冷灰，不触碰硬约束。

### 4. 语义小字对比度不成立

按 WCAG 相对亮度实测：

| 组合 | 对比度 |
|---|---:|
| 琥珀 `#D97706` / `#FCF6E8` | 2.96:1 |
| 绿色 `#16A34A` / `#F0FDF4` | 3.15:1 |
| 红色 `#DC2626` / `#FEF2F2` | 4.41:1 |
| 板岩 `#64748B` / `#F1F5F9` | 4.34:1 |
| 蓝色 `#2563EB` / `#EFF6FF` | 4.75:1 |

因此“均 ≥ 4.5:1”与“琥珀 4.54:1”的验收记录不成立。`#B45309` / `#FCF6E8` 实测 4.66:1，可作为琥珀替代候选，但整套 fg 应统一重算，不宜只修一个颜色。

### 5. spacing 纪律描述不可机械执行

原则写“一切 padding/gap/margin 取 8 的倍数，微尺寸内部对齐允许 4”，token 又提供 12/20，HTML 大量使用 12px。工程 lint 无法判断何为“微尺寸”。

建议改写为可检查规则：布局轨道只用 8n；组件内部可用 4n；文字基线与 1/2px 边框例外。这样 12/20 合法，页面级 12px 则会被 lint 拒绝。

### 6. 缺少桌面壳必需 token

当前缺少：

- 窗口最小宽高与 1280/1440/1920 列宽策略；
- resize gutter、拖拽区、标题栏平台安全区；
- z-index/overlay/scrim（即便阴影为零也要定义遮挡层级）；
- focus-visible、selection、error、read-only、loading/empty 的组件状态；
- hit target 与视觉高度分离规则；
- `prefers-reduced-motion` 降级；
- 字体缩放、125%/150% DPR 与中文 fallback 验收矩阵；
- scrollbars 的跨 WebView2/WebKit 策略。

### 7. 动效 token 只给时长，没有给实现边界

长任务 conic-gradient 用了新色 `#3E6FA8`；法理线折光也依赖未登记的“提亮 35%”结果色。若每个组件现场算色，会不断突破预算。

建议动效只引用既有线色并通过透明度变化实现，或把 glow 作为复合 token（color/alpha/length/falloff）。`prefers-reduced-motion` 下保留静态进度文字，停掉循环动画。

### 8. 生成与确定的视觉语法需兼顾中文阅读

“所有核验内容用 mono”对短编号、日期、金额成立；对 30–60 字中文原文引语不稳。系统等宽栈通常没有中文等宽字体，最终仍回退到 CJK sans；强行 mono 只改变拉丁字符，无法形成承诺的稳定区隔。

建议把底纹 + 引用标记作为主通道；mono 只用于编号/日期/金额/短 citation。长中文引语使用正文 CJK 字体，但保持 verifiedBg、引号与来源行。该调整仍满足“至少两种通道”，但需要架构确认是否改变既定硬规则。

## 建议的工程化产物链

```text
tokens.source.json（统一 DTCG）
  ├─ tokens.css（CSS variables）
  ├─ tokens.ts（类型安全访问）
  ├─ token-contract.test.ts（禁新色/禁新圆角/禁阴影）
  └─ visual-fixtures/（Windows 125%、macOS 2x、1280/1440/1920）
```

组件不得抄 hex；示例 HTML 也应消费同一份生成结果。B 阶段视觉回归应扫描 computed style，而不只比截图。
