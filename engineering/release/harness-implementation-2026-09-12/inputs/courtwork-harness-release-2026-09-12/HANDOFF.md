# 给本地集成会话的接单指令

以 Courtwork 唯一 main 为产品线，先读取 AGENTS.md、engineering/current.md、下一 Harness 节点和本包。核对实际 cwd/branch/HEAD/worktree 与其他 writer。审阅基线为 `1ac28980c4877f4a86adf586aeb1b66980e23504`；已经前进则只对相关产品/合同路径做 diff，再判断本轮裁定仍适用的部分。不要 reset/stash 共享工作区，也不恢复 Fresh 为第二开发线。

## 本轮架构结论

采用锁定 Pi 0.85.1 的 reference runtime，先修 MCP 正确性，再抽 Runtime Port 和 WorkApplication/Core-free 组合。Work Core 保留正式权威。当前不启动完整自研 loop、Rust、第二 Session 数据库、全局资源平台或多 Agent scheduler。

## 第一张单

完成 P00：保存本包完整原件和实际 hashes，登记旧 24 HPRO 的当前处置与本包 P 卡调整，冻结 owner/允许路径/schema/基线。把 adopted 的内容回填 DEC-013/roadmap/下一节点，不改旧 received 原文。文档接受与产品实现分开。

随后按授权的实际施工范围，先做 P01 的真实安装 SDK loopback fixture，得到分页事实，再修产品；P02 处理 isError 的效果未知结算，P02b 补 content/structuredContent/error 保真。不要为了方便先做全仓搬目录，也不因探针失败立即换 runtime。

## 分工

Astra 或当前架构集成者：冻结契约、决定 schema/迁移、处理跨 owner 接缝、串行接收。一个后端 writer：实现当前有界卡片，禁止并行改 service/store/control。Luna 或其他非作者：先准备负例/来源核验，再在固定代码 SHA 上独立执行。既有前端 writer：只消费已冻结/已接通的局部 DTO，不重画全局布局。

作者可以修复自己的失败，但不能给自己的实现盖独立接受章。独立核验发现需改产品时，修订到新 SHA 后再验受影响范围。

## 运行前检查（示例命令，需在本地执行）

```sh
git rev-parse --show-toplevel
git status --short --branch
git rev-parse HEAD
git worktree list
node --version
python3 --version
```

在独立、合格 Node 环境按仓库指引安装和建立回归基线：

```sh
npm --prefix app ci --ignore-scripts
npm --prefix app test
npm --prefix app run smoke
```

本包没有执行这些命令。新增 hpr 测试只在文件真实存在后运行，接受矩阵须记录 P04a/P04b、P02b 和分期 UI 的新 case IDs，不能盲套旧 P12 文件列表。browser runner 必须有实际用例并拒绝零用例/skip 冒绿。不要仅凭 lint、文件存在或 build 成功交付行为改变。

## 单卡交付

实际 SHA、允许路径与 git diff、原始 test 输出、失败/未跑项、正反例、input/lock/fixture hashes、迁移/回退、作者与非作者关系、关闭与未关闭的门。未知效果和未决问题必须保留，不可通过创建新 Chat 或重试掩盖。

只 stage 明确路径，检查 staged 清单；不使用 git add . / -A，不改其他 writer 文件。一次接收一个共享 owner 的更改。部署、外部消息和真实 provider 消费依各自实际授权，不因收到本包自动执行。

## 这轮的停止边界

先收口正确性与两条解耦，再做第一列的输入/指令/前端/独立验证。P12-A 是有界工程节点，不自动关闭 G1–G5，更不冒称原 P12 全包完成。后续完整通用能力、DRT-03 第二 runtime、Spark 薄执行器按 03/04 文稿逐项消费。
