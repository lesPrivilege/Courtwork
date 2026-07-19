# VERSIONAL-LANG-1 · 实现证据

实现基线：`main@01e74589285eab8c3db8564e41430f5a0bbe945c`。产品／架构签署、来源文件哈希与
20 条唯一档位行分别见 `ARCHITECTURE-SIGNATURE.md`、`SOURCE-HASHES.json`、`PROPOSAL.md`。

## 改造结论

- 字轨不另造：功能 UI 继续系统 sans，标题继续 `--font-title`，文书继续朱雀仿宋，数据继续 mono，
  Pages 写本拉丁仍只在 P5 四个既定消费点。标题只用 600，常用控件仍以 400/510 为主。
- 颜色不另造：Desktop 浅／深宗只消费 P4 token；Pages 沿既有磁青宗。零新增 hex、主题分支或局部补色。
- 线级有账地做减法：11 个获签 routine 消费点全部退场，达到签署范围 100%（门槛 40%）；旧 P1 行
  不删除，以 `decision=退`、`ruleClass=none`、`supersededBy=VL-*` 前向记账。逐行理由见
  `LINE-MIGRATION.json`。
- 结构／交互／语义线不参与配额：composer 外壳、输入与 focus、preview 外框、RiskList 主从线、
  台账组界、错误／gate／人工裁决边界原样保留。
- Pages 把 release truth 收为平框刊记；proof 与 ledger 只留外框或组界；设计边界改横向眉批。
  HTML 语义、真实 fixture、JS、数据字符与行为零改。

同一 1280×720 desktop comparison 状态中，可见带 border 元素由前帧 **45** 降至后帧 **29**；
数字只作可见噪声量化，不替代逐选择器分类与真帧裁决。

## TDD 与反例

- Desktop：先把四条获签运行时断言写入 `versional-language.spec.ts`；旧 CSS 下 4/4 定点红，最小
  CSS 消费值后 4/4 转绿。e2e floor `317 → 321`。
- 档位账：先扩签署闭集，缺 20 行转红；平铺投影后转绿。漏行、错档、重复绑定与退役线复活由
  ledger／rule grammar mutation 定点拒绝。
- Pages：契约锁平框刊记、proof/ledger 组界与眉批。竖格线复活、刊记锚丢失、眉批退回四周卡框
  三类注入均定点红。
- 机器门不生成布局，只核已签引用、旧账迁移、消费闭集与漂移。

## 后帧

| 文件 | 内容 | SHA-256 |
|---|---|---|
| `after/desktop-comparison-1280x720.png` | 比较态：标题轨、扁平台账、schema 最克制线级 | `f2bad3e87219153b9d472fedbc7c3ddd02756214e33f4dabd5d7d449fc2820ea` |
| `after/pages-hero-1280x720.png` | 抬头／卷次、写本拉丁与平框刊记 | `5b47d2f832252f0186794be68704e2d7fdd5412a7af1b6da368f86b36994bfd7` |
| `after/pages-scenario-1280x720.png` | proof 外部版框与留白分组 | `b76e932095ee6adad37015f5b543a3eb23196a422d844e13f599dbec60c5f184` |
| `after/pages-ledger-1280x720.png` | ledger 只留组界与末界 | `75c3e2b622713dedc6669e8b512bb8d6b72b287687339907586875bc712c6c30` |
| `after/tauri-wkwebview-window-1600x900.png` | 真实壳深宗欢迎面：交通灯、标题轨、composer 与免责声明 | `872230118791265b5fd3114eec475055b898e04417d4d62cb7579021a510725b` |
| `after/tauri-wkwebview-focus-1600x900.png` | 真实壳凭证面：输入 focus、disabled 与 modal 强边界 | `ef6c2889563d0ccffbee5d3124b1f5b1dd576a5c77801021d6854e395a304cb9` |

WKWebView 帧来自 macOS 26.5.2 (25F84)、arm64、Tauri CLI 2.11.4；配置窗口为 1600×900 CSS，
DPR 2。`screencapture -l` 保存整扇原生窗口（文件 3424×2024，含系统阴影；内容核为 3200×1800），
没有用 Chromium 包壳冒充。真壳中交通灯／应用按钮与标题无碰撞，composer 文案落在自身列内；
深宗标题／文书／功能／mono 四轨均真渲，focus 边界未被 routine 减法误删。

实现侧截图与自检不是独立放行；clean clone 的 mutation、全尺寸矩阵与真实 Tauri WKWebView 仍须
由异会话完成并回写 ACCEPTANCE。

## 首轮独立验收拒绝后的守卫修补

首轮报告 `acceptance-45fb395/README.md` 真实注入
`.composer-shell:focus-within { border-color: transparent; }`，发现原 `site:guard` 与四条 VL e2e
同时假绿。消费 CSS 本身正确，本修补不改视觉值；只把 VL-L05 升为双锁：Pages/VL 静态契约精确
要求既定 `var(--text-tertiary)` focus 色槽并带透明 mutation，运行时 e2e 切到可输入的 Chat composer，
真实聚焦 textarea 后核 computed 外壳边色。静态 mutation 先红后绿，定点 e2e 4/4 绿；等待不同
会话在 clean clone 复验，本文不把实现自证写成放行。

## 独立放行与 Pages 产品图

首轮独立验收在 `45fb395` 拒绝；修补提交 `b93796a` 随后由全新 clean clone 复验放行。完整裁决、
mutation、321 条 desktop e2e 与真实 Tauri/WKWebView 证据分别在
`acceptance-45fb395/README.md` 与 `reacceptance-b93796a/README.md`。最终 Pages 三幅产品图在
两轮独立验收后从 `main@16928c1` 重摄，来源哈希、状态和响应式映射见
`../SITE-SHOTS-VERSIONAL-1/README.md`；它们替换旧皮层图，不改站面文案或产品能力声称。
