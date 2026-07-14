# SPEC: site

状态：SITE-1 已上线；SITE-2A 结构与 SITE-2B 真机证据已经独立验收；v0.1.1 Release 真值切换、独立验收与部署复核均已完成。

## SITE-GEN-1 · 多场景泛化台账（待 VISUAL-KIT/PM fixture）

保留 Evidence Line Hero，不改成场景卡片目录。在既有连续台账后增加“同一底座，换的是判断”三段：

1. 合同审查：原句 → 风险 → 修订 → 人工确认，标记为已验收工作链；
2. 卷宗阅卷：20 份卷宗材料 → 47 个事件 → 14 个主体节点 → 8 个矛盾事件，全部计数由 Legal fixture 校验；“矛盾事件”只按 Timeline 的 `markers.includes('contradiction')` 统计，不与 4 处矛盾点或 2 条图谱矛盾边混算；
3. PM 决策：PRD 原句 → 缺陷维度 → 修改建议 → 人工处置。只有 `PM-FIXTURE-1` 与 host renderer 通过独立验收后才上线；scenario 未接通期间必须显示 `Schema catalog preview / 尚未接通运行链`，不得暗示 live。排序提案继续等待 `PM-SCHEMA-1`，本单不以假分数、PriorityScore、RICE、排名或公式补位。

三段仍使用连续行、分割线和真实局部裁片，不新增等权 feature card 或重复 Mac window。站点构建/guard 必须读取权威 fixture，锁定计数、引语、状态、“无公式/无 PriorityScore”事实与 live/catalog 标签；截图必须来自 VISUAL-KIT 独立验收后的 main 经真机操作。

### SITE-GEN-1 字段与构建门

- 卷宗四个可见计数使用固定 key：`dossier-materials=20`、`timeline-events=47`、`party-nodes=14`、`contradiction-events=8`。构建门必须同时核对 CaseFile 文件集合与 `dossier/*.md` 集合完全相等；不得从说明文案或中文关键词反推数字。
- PM 固定消费权威 fixture `prd-finding-05`：原句“所有成员都能编辑路线图，但路线图只有负责人可以修改。”、缺陷 `conflicting-requirement / 冲突需求`、建议“区分评论、提议和正式修改，并给出唯一权限矩阵。”、状态 `pending / 待确认`。构建门必须复验锚点文件、UTF-16 区间、全文 hash 与逐字切片闭合。
- 站点脚本共享一个无副作用 fixture-claim validator；`build` 在清空 `site-dist` 前先校验，`guard` 复用同一 validator。计数漂移、锚点偏移、状态被改为 confirmed、catalog 标签缺失/伪装 live、出现 PriorityScore/排序/公式任一情况都必须触红。
- 合同审查复用既有已验收 Evidence Line 与截图；SITE-GEN 不新增对垂类 `/testing` 修订草稿的生产消费，也不把测试草稿升级为官网真值。
- 新区块全部是静态语义内容：关闭 JS 仍完整；不新增可点击假控件或 `tabindex`；窄屏 DOM 顺序即阅读顺序；reduced-motion 不引入新动画。

### SITE-GEN-1 实现留痕（2026-07-14，待独立验收）

- 泛化台账已落在既有工作台账与产品边界之间；合同审查只复用上方已验收证据链语义，卷宗四个可见计数来自 Legal artifact，PM 只展示 `prd-finding-05` 的权威原句、缺陷维度、建议与待确认状态。
- `fixture-claims.mjs` 从 CaseFile、Timeline、PartyGraph、PM PrdReview、PRD 原文、PM manifest 与 descriptor/presentation 真源计算 claim；build 在清空产物前先校验，deslop guard 复用同一实现。
- 八类反例锁定 46 事件、删除矛盾 marker、15 主体、错误“矛盾”单位、PM UTF-16 偏移、confirmed 漂移、伪 live 与 PriorityScore 注入。本单没有修改 `main.js`、Hero、下载真值或截图，也没有新增卡片、第二个 Mac window、假控件或动画；本记录不构成验收结论。

## SITE-2 · Evidence Line：首页约束链

目标：在不重写整站、不虚构材料的前提下，把首页从平均分配截图的产品介绍，推进为“一个结论如何被证明”的连续叙事。

## 叙事契约

首屏主命题保持“模型只生成，不裁决”。产品链固定为：

```text
原件 → 引语 → 结论 → 人工确认
```

四个节点必须消费样板案真实 fixture 与当前工作台截图：原件展示真实合同句子；引语可回到页码、段落或文本坐标；结论对应真实风险或修订建议；确认展示确认、驳回、修正之一。动效只解释节点间因果，不作装饰。

## 实现边界

- Hero 只保留一张完整工作台，其余视觉使用真实局部裁片，不重复套多个 Mac window。
- 三段能力使用连续台账与分割线，不新增 feature card 网格：从散材料到卷宗、从句子到坐标、从建议到确认。
- 保留四项硬承诺：不改原件、不自动送出、不把无锚引语落格、不替用户确认。
- CTA 使用完整中文产品语言，并展示真实版本、真实提交与真实下载目标。
- 禁止随机法律碎片、假数据、3D 设备模型、glow、渐变、装饰坐标、`01/02/03` 脚手架与单字母场景标记。
- 颜色、排版、法理之线与动效仍只消费 `docs/design/` 的现行契约；活动源码和文档不得引用历史竞稿。

## 验收标准

1. JS 关闭时核心叙事、承诺与下载信息仍完整；滚动增强不是内容前提。
2. reduced-motion 下四节点直接成立，无位移动画；普通模式下每个动画都对应证据链状态变化。
3. 真实 fixture 文案与截图来源可追溯，版本、SHA、下载链接通过构建门生成或校验。
4. 通过 `site:guard`、站点构建、响应式视觉审计与键盘/对比度检查；由不同会话独立验收。

## SITE-2B · 已验收主树真机证据（2026-07-14）

- 截图源为 `main@ce09110` 冷启动后，由 Codex 内置浏览器真实点击样板案、通用交互卡、来源锚点与确认选项得到；启动环境未设置 `VITE_COURTWORK_E2E`，不消费测试 stream hook。
- Hero 使用“交互已记录 + 原件精确高亮”的完整工作台；坐标与确认台账分别复用同源局部裁片，不新增第二个 `.mac-window` 或装饰卡。
- 原始真机帧为 1280×720；站点只派生 1280 / 720 两档 WebP。alt 必须说明交互快照、原件高亮与人工确认关系，不得把截图描述为模型自动裁决。
- DeepSeek 首启凭证面另有真机验收帧，但不进入首页主叙事；provider 配置不是证据链的视觉主角。
- `assets/og.png` 由现行 `og.html` 重新渲染为 1200×630；wordmark 直接消费四路径核心 SVG，文字左侧不再残留旧版底盘。

## RELEASE-1 · v0.1.1 下载真值

- 下载 URL 固定为 `releases/download/v0.1.1/Courtwork_0.1.1_aarch64.dmg`，与待创建 GitHub Release 的 tag / asset 同名。
- 页面同时呈现本趟 DMG 的 64 位 SHA-256 与 `Apple Silicon 开发构建 · ad-hoc 签名 · 未公证`，不得只展示“下载”而隐藏 Gatekeeper 边界。
- 发布前本节只构成同批候选；当前 asset 可下载、SHA 匹配、Pages workflow success 与部署页复核四项条件均已成立。

## RELEASE-1 · 部署实录（2026-07-14）

- annotated tag `v0.1.1` 指向 `main@39555d6`；GitHub Release 已发布，DMG 与 SHA 文件均为公开资产。
- 从 GitHub Release 重新下载 DMG 后独立复算：`37792b767fe08119edab3cc6b793e59cd4511758110f8b42e6242e80a023db7e`，大小 `4,667,331` bytes，与页面、校验文件及独立验收报告一致。
- Pages workflow `29301065279` 在 `39555d6` 上成功；部署首页 HTTP 200。macOS Safari 真机页复核可见四项硬承诺、下载 CTA 与“Apple Silicon 开发构建 · 未公证”边界。
- 完整外部证据与链接见 [`release/DEPLOYMENT.md`](../release/DEPLOYMENT.md)。
