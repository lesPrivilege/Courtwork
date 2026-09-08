# CourtWork main 谱系接管

2026-09-08。用户明确授权先切换本地/远端 main，并恢复原 Courtwork 目录；旧实现冻结后由 Luna 做只读索引，后续按需召回。此裁定调整旧 T3/T4 时序，不是宣称其产品验收条件已满足。

## 固定来源

- 当前实现来源：`34a87c2b92dc5819798ccac64b859fd9810da42e`。产品 app/tests/brand 与此前146/146及远端独立clone版本一致。
- Legacy 父节点：`f9ade85b72e5abcdc64c3a6c43ed3a13a2292476`。
- 冻结 tag：`archive/courtwork-pre-takeover`（annotated tag，peeled SHA 为上述legacy）；浏览分支：`archive/courtwork-main`。两者均已核验远端。
- 接管为单个 replacement commit，直接继承冻结节点；原候选历史仍由已有 refs 保持可达。无 force push，无旧源码复制进新工作树。

## 目录与证据边界

唯一开发入口为 `Courtwork`，检出 `main`。旧主工作树整体保留为 `Courtwork-legacy-frozen`，包括未跟踪和ignored内容；共享Git元数据随其保存，其他工作树登记通过 repair 修复。Git对象库的存储位置不构成产品运行时依赖。原 `Courtwork-current` 工作树移入 `Courtwork`；旧 `Courtwork-fresh` 等历史工作树不作为开发入口，不删除其他writer的文件。

产品数据、凭据、旧node_modules不迁入新实现。真实provider、Review完整纵切、辅助技术/IME/触控、桌面发行和数据回退演练仍未由本次操作验证。恢复旧Git树不能让旧host读取schema 4数据。

## 只读来源索引

Luna 已完成 [15条只读来源索引](../../engineering/ecosystem/legacy-recall-index.md)，15/15固定路径解析通过，输出位于 `engineering/ecosystem/legacy-recall-index.md`，只按冻结commit/path记录对象、用途、可借鉴范围和不可外推结论；不运行旧代码、不改变冻结文件，不把索引等同采用或独立产品验收。

## 执行证据

接管提交 `d20fbc3c9da983e1e7620fc28274fdebf51cbd4d` 已非force推送到远端 main，父节点为冻结legacy；GitHub远端默认HEAD仍为main。实际SHA、远端核对、目录与源码一致性检查见 [verification.json](verification.json)。

迁目录后的 `npm --prefix app run smoke` 通过，覆盖材料读取、工具写入、artifact持久化、runtime关闭重开、session续跑、修订与历史字节；见 [runtime-smoke.txt](runtime-smoke.txt)。使用local-fake，不验证真实provider。所有15个已登记worktree均可解析HEAD，旧树tracked内容未改，原未跟踪项保留。后续索引/回执提交是该接管提交的文档后继，不改变产品源码。
