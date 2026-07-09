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

（空）
