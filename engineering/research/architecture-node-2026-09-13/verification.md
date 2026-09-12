# 验证与裁决记录

## 架构与来源

Astra撰写五层架构、公式、工作区治理地图及Runtime替换矩阵；Luna分别完成[实现/架构复核](explore/implementation.md)、[既往裁决清账](explore/decisions.md)和[治理探索/非作者复核](explore/workspace-governance.md)。代码基线为 `273ad12a9796aa0547d65e4811a6c56baa5c6a49`，各历史交付保留其本来SHA，不冒充本节点重跑。

Astra采用并修正：公式中的Candidate可选性；必需能力全包含才能执行；profile不冒充Expert；Pi生态不冒充当前自动发现；Work治理范围是Astra研究方向而非用户已要求的全量功能；正式effect的提交owner与获准执行者分开；新增重要风险的独立升级路径；获准目录覆盖oracle和实际assignment/Run回执。原件归档[字节核对](archive/provenance.json)通过。活动Core/runtime合同与README的schema号同步为实际Host13/Core4/app5。

## 产品回归（Astra执行）

没有运行新的真实Provider、个人数据迁移或第二Runtime试验。架构提交的应用改动仅为Spark文件头陈旧注释；随后UI审计修复Files滚动容器、Settings入口ARIA和Home Attention返回焦点，未修改运行/审批/工作状态owner。

| 检查 | 结果与解释 |
|---|---|
| `npm --prefix app test`，Node25.9.0 | [首次全量](evidence/full-suite.log)：912项，911通过，1失败；Core lifecycle case在2秒ready阶段超时，不能称首次全绿 |
| `node --test app/tests/review-core-client-lifecycle.test.mjs` | [独立重跑](evidence/core-lifecycle-rerun.log)：13/13通过；只证明单独运行结果，不冒充根因证明 |
| 在app目录执行`node --test --test-concurrency=4 tests/*.test.mjs ../tests/*.test.mjs` | [完整低并发回归](evidence/full-suite-concurrency4.log)：912/912通过，214.847秒。首次超时作为负载敏感的测试观察保留，本轮不改超时或生产行为 |
| `node tools/check-doc-links.mjs` | [路径检查](evidence/doc-links.json)通过；不等于语义接受，最终合流前再次核对新增链接 |
| `node tools/lint-interaction.mjs` | [41文件登记规则](evidence/interaction-lint.log)通过；不证明全部交互/视觉一致 |

## UI修复检查

Files复用Attention长内容弹层的固定header、独立body滚动先例；Settings保持页面返回语法并移除错误的`aria-haspopup="dialog"`。现有Settings导航/偏好、Intake UI和Chat Sources四文件[51/51通过](evidence/ui-regression.log)，interaction lint再次通过。全量912/912是UI修复前基线；此次针对低影响HTML/CSS/ARIA修复只重跑相关检查。Luna最终浏览器175%缩放滚动、可见X点击关闭、Escape关闭、入口焦点恢复及未提交草稿重开保留通过（[截图50](ui/50-files-175-scrolled.jpg)）；补充入口审计后的Home Attention焦点修复复用显式点击trigger与Home焦点键，相关Home/Settings/shell/Attention回归[33/33通过](evidence/focus-regression.log)。完整覆盖范围与未测状态见[UI审计](ui/audit.md)。

## 公开静态站

既有capture-ready、material、figures、public-data/capture-plan测试与子路径检查通过：5/5公开数据测试，161文件/296个本地引用。两次构建的[161文件hash](evidence/site-reproducible.json)一致。媒体来源仍固定既有manifest与其生产SHA，不重标为本节点新截图；runtime UI审计图是本节点独立合成证据，不替换公开产品录制。部署实际run、SHA及线上核验待最终发布回执，构建成功不冒称已部署。
