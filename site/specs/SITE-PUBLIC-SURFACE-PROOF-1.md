# SITE-PUBLIC-SURFACE-PROOF-1 · Pages 产品入口与证据路径收束

状态：**架构冻结，待实现与独立验收**。冻结基线：
`main@f8dc25e954ff0cee95e828c0332937d991f4cc9b`（2026-08-20）。

权威：`CLAUDE.md`、`AGENTS.md`、`docs/status/current.md`、
`docs/product/roadmap.md`、`docs/design/site-evidence-line.md`、
`docs/architecture/implementation-readiness.md`、`site/SPEC.md` 与本票。

## 一、问题与决定

当前 Pages 已诚实分开产品定位、scripted GUI、PI external gate 与 v0.1.2 历史制品，但公开路径仍有
四处断裂：Hero 由 Legal CSS 微演示占据；首要按钮交付的历史 v0.1.2 不含页面所展示的当前 Work；
导航不能直达 Work 与发布事实；三张 provenance 已绑定的 Work 帧没有就近的证据档案出口。成熟度缺口
是“页面所见、点击所得、证据来源”没有闭合，不是色板、字体或装饰不足。

本票将 Pages 从“展览册”收束为“产品入口”，不新增产品能力：

1. Hero 以既有 `PUBLIC-SURFACE-REAL-1-proposal-{1440,720}.webp` 为唯一主产品画面，明确标作
   `scripted 验收帧`，并就近链接 provenance 档案；删除 Hero 内 `.schema-demo` 及其看似按钮的
   `确认此项／驳回／修正` 静态 span。Legal 的真实材料因果链仍由卷一 Evidence Line 承载。
2. Hero 主 CTA 改为页内 `查看已验收 Work 流程`（`#work`）；次 CTA 为 GitHub 上的源码／本地运行
   路径。历史 DMG 不再作为主产品行动，所有仍保留的下载链接必须写明
   `下载历史 v0.1.2（不含当前 Work）`，URL、版本、SHA、Apple Silicon、ad-hoc、未公证真值不变。
3. Hero 下增加紧凑、静态的状态条，逐字表达 `Stage 0`、`本地优先 · 单人工作区`、
   `当前 main · scripted GUI`、`PI 总验 · external-validated blocked`。它不是 badge 墙，不新增计数、
   在线状态、spinner 或假实时数据。
4. 导航固定为 `产品`、`工作方式`、`证据`、`发布状态`、`GitHub`；375px 不得隐藏工作方式、证据或
   发布状态，可换行或采用紧凑间距，但不得用无效菜单壳代替。
5. `work-ledger` 取得 `id="work"`。三行继续是
   `真实本地容器 → 写入提案先由人决定 → 结果只读核验`，每行增加同一 provenance 档案的紧凑
   `查看证据档案` 链接；链接文案相邻保留 `scripted`，不得暗示真实 DeepSeek/Tauri/AX。
6. 产品边界四项保留；站面设计方法的三段内部说明压成一句和一个 `设计门禁与证据` 出口。不得用
   内部 CI 叙事抢过产品工作线的主焦点。

## 二、成熟范式消费与复杂度结论

- Wiredge 只借“定位 → 证据 → FAQ → 单一行动”的信息顺序，不借客户 logo、testimonial、稀缺名额、
  价格数字或第三方预约嵌入：<https://wiredge.studio/book-call>。
- Whatships 只借“标题／类别／日期／来源／详情／原始出处”的可追溯记录模型，不借搜索、分页、视频
  目录、计数或 X 依赖：<https://whatships.com/>。
- Vercel AI Gateway 与 Paper Snapshot／Build Log 只借“价值之后立刻给机制／quickstart／变更事实”的
  行为范式：<https://vercel.com/ai-gateway>、<https://paper.design/snapshot-extension>、
  <https://paper.design/build-log>。

工程四选一结论：**借行为或源码范式**。不直接依赖任何新库；不复制第三方源码或视觉皮肤；现有静态
HTML/CSS/JS 足够，新增依赖、持久化、状态机、网络请求与第三方 embed 均为零。

## 三、设计档位与视觉边界

唯一档位：**Pages 克制产品化档**，沿 `SITE-CRAFT-2` 已签 Pages 语言做减法。

- 继续消费现有 token、冷白／冷灰浅宗、磁青／深宗、标题／正文轨、线级、按钮与 screenshot 资产。
- 不新增颜色、渐变、阴影、glow、圆角、卡片网格、图标、字体、依赖或动效。
- 不重摄、不改写 PNG/WebP/OG、manifest、productSha 或 capture 脚本；现有 provenance R1 实物保持
  逐字节不变。
- Hero 产品图只可使用已绑定完整 product SHA
  `5187c797c6ced84188c0b4e8ae7b00ecb8e50922` 的 proposal WebP。不得把 browser scripted capture
  写成真实 Tauri/WKWebView、真实 DeepSeek、发布制品或 product-live。
- 现有 Typer/Ghosty/reduced-motion 契约可删除不再需要的 Hero demo CSS；不得新增动画。按钮 press
  feedback 继续只动 `transform`，焦点态不得弱化。

## 四、允许与禁止范围

允许修改：

- `site/index.html`
- `site/styles.css`
- `site/scripts/deslop-scan-lib.mjs`
- `site/scripts/deslop-scan.test.mjs`
- `site/scripts/versional-language-contract.test.mjs`
- `site/SPEC.md`（实现回执）

仅在实现确证旧规则已无消费时，可删除 `site/styles.css` 中只服务旧 `.schema-demo` 的样式；不得做无关
CSS 整理。

禁止修改：

- `README.md`、`docs/**`、`site/ACCEPTANCE.md`
- `site/assets/**`、`site/craft-evidence/PUBLIC-SURFACE-REAL-1/**`
- `apps/desktop/**`、packages、schema、runtime、provider、identity、ACL、release、版本、tag、Release、
  Pages workflow
- team/member/avatar/Owner/RBAC/dashboard、公共分享、搜索/筛选/分页、客户 logo、评价、指标、价格、
  scarcity、假 spinner／通知／在线状态、无效按钮或 autoplay 视频

## 五、TDD 与机器门

实现会话必须先在冻结基线上增加测试并观察旧页面失败，再做最小实现。至少锁定：

1. Hero 的主 CTA 精确指向 `#work`，GitHub 为次路径；Hero 不再以历史 DMG 为主行动。
2. 所有历史 DMG 链接保留原 URL，并逐字带 `历史 v0.1.2` 与 `不含当前 Work`；删边界或改成包含
   current main 必须红。
3. Hero 使用 proposal WebP，alt／caption 带 `scripted`，并有 provenance 档案链接；替换为未登记
   asset、删 scripted、删档案链接必须红。
4. Hero DOM 零 `.schema-demo`、`.demo-actions`、假 button role/tabindex；重新注入旧微演示壳必须红。
5. 状态条四项逐字存在；删 `Stage 0` 或 `external-validated blocked` 必须红。
6. 导航五入口与 `#work/#evidence/#facts` 目标均存在；移动 CSS 不得隐藏三项核心入口。
7. 三个 Work row 均有 provenance 链接，三张现有 WebP bytes/SHA 与完整 productSha 仍由既有门锁定。
8. 新色、新动效、新依赖与禁用成熟度／enterprise 词继续由 `site:guard` 拒绝。

最低实现证据：focused Node 测试、`pnpm site:guard`、`pnpm site:build`、`pnpm lint`、
`pnpm -r build`、`git diff --check`。本票零产品代码，不要求 Cargo 或 desktop E2E。

## 六、独立验收

验收者必须是与实现者不同的新 Luna 会话，在独立 clean worktree、独立端口，不采信实现截图。

- 实际注入并恢复至少六类反例：历史 CTA 冒充当前、删 scripted、换未登记 Hero asset、删 external gate、
  恢复假控件壳、删三行任一证据出口；每枚必须观察对应门变红。
- 复算 Hero／Work WebP 与 provenance manifest 的 bytes/SHA/productSha；不得只信实现自述。
- 复摄 1440×900 与 375×812 的 light/dark、JS-off、reduced-motion；核对无横向溢出、破图、遮挡，
  Hero→Work→证据→发布路径清楚，移动导航保留核心入口，键盘焦点可见。
- 验收结论只追加 `site/ACCEPTANCE.md`；实现级小缺陷可用 `fix-by-acceptance`，契约级问题退回架构。

## 七、成熟度与发布边界

本票不更新 `docs/status/current.md`，不改变 Stage 0、`PI-BASE-GUI-ACCEPT = external-validated blocked`、
v0.1.2 历史制品、tag/Release 或 product-live 状态。实现与验收完成只证明公开面产品路径与证据语义
收束；是否 merge、push、部署由架构角色在独立验收后另行决定。
