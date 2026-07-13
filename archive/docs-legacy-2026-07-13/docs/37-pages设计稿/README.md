# docs/37-pages设计稿（FD-1 交付）

Fable @ Design · 2026-07-11。对照权威：docs/32 全包 · docs/59 采纳表 · docs/54 · docs/92/53（结论层，机制不出稿）· docs/49 十二章 · docs/11 SITE-1 骨架。

## 清单

| 件 | 文件 | 说明 |
|---|---|---|
| ① 单页站设计稿 | `Courtwork官网.dc.html` | Hero / 三招牌场景 / 信任区 / 工艺区 / 联系。法理之线滚动点亮为唯一微交互（CSS scroll-timeline，reduced-motion 降级为静止终态）；Mac 窗框 CSS 手绘 + 截图占位，真图 RP-2.11 后替换 |
| ② OG 卡 | `OG卡-1200x630.dc.html` | 1200×630。线母题 + wordmark + 定位句，无假指标无渐变字 |
| ③ 投递展品页 | `投递展品页.dc.html` | 合同审查矩阵 vs PRD 评审矩阵并排（同凡例、异枚举）+ 底座零 diff 证明（commit 清单为示意，落版时以真实清单替换） |
| ④ UI review | `UI-review观察清单.md` | 14 条观察，登记不实施 |
| ⑤ 六轴自评 | 本文 §下 | — |

## tokens 落版说明

三稿全部只消费 docs/32/tokens.json 数值（bg #EDEDED/#FAFAFA/#FFF，ink #0A2540，文字三层 #425466/#6E8098，hairline #EBEBEB，语义五色图形/文字双轨，radius ≤6 控件 / 12 大容器壳，阴影全站 none，字重 400/510，mono 编号，tabular-nums）。落版为静态 HTML 时请镜像为 `:root` 变量、禁裸 hex（docs/59 §5.2）；本稿为设计稿载体，色值即 token 值。

营销档超出产品档的仅两处，均在 docs/59 §5.2 授权内：H1 48px / H2 30px（营销字阶 40–56 档）；hero 签名线以品牌 ink 点亮（品牌母题非处置语义，五色封闭集不破）。

## 反 tell 自查（docs/59 §5.4）

无渐变/gradient text/aurora ✓ 无奶油+衬线第二默认 ✓ 无三等分 icon-tile 卡 ✓ 无装饰编号与 scroll cue ✓ 无假指标（版本真实、SHA 声明随构建发布、邮箱明示占位、展品 commit 明示示意）✓ 系统字栈零 webfont ✓ 无 emoji 图标 ✓ 中文无「赋能/打造/一站式」✓ 窗框为工单授权的截图占位框（非假 UI 冒充真图，占位批注可由 Tweaks 关闭预览成稿观感）✓

## 六轴自评（Hallmark pre-emit，1–5）

- **Philosophy 4** ——「模型只生成，不裁决」直接做 H1；页面结构即论纲（场景=能力证据，信任=承诺，工艺=品味自证）。扣 1：合作区叙事对上游/律所双受众各让了一步，锋利度略降。
- **Hierarchy 4** —— 单列叙事、每屏一个主角；字阶 48/30/22/15/13/12 严格递降；信任区靠白浮面+画布带切换承重。
- **Execution 4** —— 全稿零投影、hairline 划界、0ms 心智贯穿文案与标本；mono/tabular 纪律全落。扣 1：占位图区块的最终观感取决于真机截图质量，本稿只能兜到窗框。
- **Specificity 5** —— 五态标本、徽章字母表、真实版本号、样板案案名、u r t 彩蛋：每一块都只有 Courtwork 能用。
- **Restraint 4** —— 唯一微交互一处；数字行仅 3 个且含「0」；彩色只在五态标本与展品矩阵出现。扣 1：工艺区信息密度已接近营销页上限。
- **Variety 4** —— 三场景同构不 zigzag，节奏靠画布带与浮面切换而非布局翻新；在克制纪律内属有意收窄。

## 遗留与替换清单

1. 六处截图占位 → RP-2.11 后以真机图替换（各占位框内已注明参照 visual-audit 文件名；S6 成卷待摄）。
2. SHA-256 / 联系邮箱 / 展品 commit 清单 → 发布前以真值替换（稿内均已明示占位）。
3. 落版工程项（不在设计稿范围）：og:image 等 metadata 字段、Lighthouse 90+、`prefers-reduced-motion` 已给 CSS 方案随稿。
