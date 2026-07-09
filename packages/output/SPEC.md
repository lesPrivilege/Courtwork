# SPEC: packages/output（W4）

状态：未开工（依赖 W1 schemas）

## 职责

产出管线：md/JSON 修改指令集 → 带修订痕迹（tracked changes）与批注（附法条/判例依据）的 .docx。这是面向用户的交付格式——用户认 Office，不认 md。

## 要点

- 输入契约：原 docx + 修改指令集（JSON：定位（文本锚/段落路径）+ 操作（替换/插入/删除）+ 批注文本 + 依据引用）
- 技术基线二选一（先 spike 后定）：Python-Redlines（原生 track changes）或 docx4j
- **WPS 兼容是自研加固点**：修订与批注在 WPS 打开必须正常渲染（国内律所/政企大量用 WPS），这是验收标准不是加分项
- 定位鲁棒性：文档被用户轻改后指令集仍能定位（模糊锚点匹配）

## 验收

Golden files 快照测试；Word + WPS 双端渲染核验清单；定位失败时报错并跳过（不错插）。

## TODO（跨层放入区）

- [架构拍板 2026-07-09] **字体规则**：产出 docx 遵循法律文书惯例——正文宋体（公文类仿宋_GB2312）、标题黑体、西文/数字 Times New Roman，**不用微软雅黑**（屏幕 UI 字体，违背文书惯例）。防错乱的硬性要求：管线写出的每个 run 显式声明完整 `w:rFonts`（ascii + eastAsia + hAnsi），不依赖文档默认回退——缺 eastAsia 声明是中文渲染错乱的主要病根。Word/WPS 双端核验清单增加字体渲染核对项。字体不随包嵌入分发（授权原因），仅按名引用。UI 层字体（系统字体栈，Windows 落雅黑）属 W9，与本层无关。

- [架构拍板 2026-07-09] 本层的"修改指令集 JSON 契约"**必须以新 artifact 类型的形式在 `packages/schemas` 内提案落地**（暂名 `RevisionInstructionSet`，含 `ArtifactTypeEnum` 增量扩展），过架构 review 后合入，本层只做消费方——不许把契约私藏在本包内。背景：W2 场景注册表的 S4（文书起草）产物引用等着这个类型（现以 label-only 确认门禁过渡），契约落地后 S4 声明同步更新。依据引用字段复用 schemas 的 `SourceAnchor`。
