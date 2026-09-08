# V6 恢复与本地运行

源码包保留 V5 backend/runtime 的原版本与 API `/api/v5`，仅更新通用 Web UI 与预览宿主兼容层；evidence-memo renderer 保持 V5 原字节。包内历史 app/README.md、runtime proposal 属于 V5 底座；当前范围以包内 docs/scope-correction-v6.md 为准；完整变化与验收记录见证据包 docs/framework-v6-result.md。

解包到新的独立目录，使用 Node >=22.19 与 Python 3，在 app 下运行 `npm ci`；精确依赖锁固定 Pi 0.83.0。不要复用 V5 数据目录或同时启动两个 host 访问同一数据目录。包不包含 node_modules、数据、浏览器存储、密钥或用户历史。

可从 app 运行：

```sh
SE_RUNTIME_DATA_DIR=/absolute/path/to/new-v6-data PORT=8796 node server/index.mjs
```

把数据路径替换为自己的新目录。程序入口见 app/server/index.mjs 与 app/README.md；使用导出的 `startServer({dataDir,port})` 可显式指定新数据目录。证据包里的 evidence/preview.mjs 是本轮示例 launcher，硬编码的 /private/tmp 路径仅适用于本机临时验收，移机需改成新的本地路径。

真实 provider 能力仍为 false；普通聊天、工具和候选生成用真实 Pi loop 调本地 fake HTTP，不能用于判断真实模型质量。SE 扩展内部表单仍是 V5 接入样例；草稿/Review UX 增强已按用户纠偏推迟下一轮。浏览器只保存选择项目/会话等非秘密 UI 标识。
