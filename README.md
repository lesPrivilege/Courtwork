# Courtwork

面向中国律所与企业法务的本地优先工作代理：案件文件夹级协作、声明式场景、结构化产出、来源锚点和人工确认。

Courtwork 不把模型包装成会自主行动的 chatbot。它把模型放进可验证的工作秩序里：模型生成引语与判断，系统验证坐标、权限和契约，用户决定确认与定稿。

## 仓库结构

- `apps/desktop`：Tauri + React 产品壳；
- `packages/schemas`：领域无关基础契约；
- `packages/registry`：垂类包 ABI 与注册表；
- `packages/core`：harness、执行器、事件、门禁与 provider；
- `packages/legal`、`packages/pm`：垂类包；
- `packages/reading-view`、`packages/output`、`packages/tools`：确定性能力；
- `packages/demo-data`：虚构导览与测试语料；
- `eval`：评测与回归；
- `services/ingest`：OCR/分类/实体对齐服务（待实现）。

## 开始开发

```bash
corepack enable
pnpm install --frozen-lockfile
pnpm -r build
pnpm lint
pnpm test
```

desktop 的完整浏览器回归需自起隔离端口；具体命令与多 worktree 纪律见 [工程工作流](docs/engineering/workflow.md)。

## 文档

- [文档入口](docs/README.md)
- [产品定位](docs/product/vision.md)
- [系统架构](docs/architecture/system.md)
- [架构决定](docs/decisions/README.md)
- [当前基线](docs/status/current.md)

历史调研、工单与验收过程已归档，不参与现行规范。
