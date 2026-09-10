# FE-05a 独立验收记录

日期：2026-09-10（Asia/Singapore）

固定交付产品提交：`463d57c1f3840ecde9c3bfa8577cd6d552d402af`；冻结说明与作者证据提交：`0b457f87259ea4ecd4ca27d7b5c6ffe475ac6dab`。验证在 detached tree `0b457f8` 上进行；没有修改产品源文件、作者树或共享整合 checkout。

## 环境与边界

- Node `v25.9.0`，npm `11.12.1`，应用依赖在验证树中以 `npm ci --prefix app` 安装。
- 应用使用独立 local-fake host：`127.0.0.1:8939`；合成数据目录：`/private/tmp/cw-fe05a-validation-data-20260910`；未配置或调用付费 provider，未读取个人凭据。
- 独立 headless Chrome CDP：`20170`；采样设置 `prefers-reduced-motion: reduce`，每个视口 1:1、device scale 1。
- 验证结束后已停止本次 host；旧 host / 其他 agent 进程未触碰。

## 独立结果

| 范围 | 结果 | 证据 |
|---|---:|---|
| M-15 / M-16 / M-17 基线断言 | **7 / 7** | `independent-baseline-checks.json`、`logs/baseline-checks.log` |
| Shape 运行时断言 | **8 / 8** | `independent-shape-checks.json`、`logs/shape-checks.log` |
| V1 字阶、阅读/正文不变、控件密度、按钮解剖、对比度、caps tracking | **7 / 7** | `independent-type-checks.json`、`logs/type-checks.log` |
| Shape 静态 lint | 通过；3 文件，10 个满弧登记 | `logs/lint-shapes.log` |
| Shape governance 单测 | **5 / 5** | `logs/shape-governance.test.log` |
| HOME-16 三档 | **3 / 3**；首屏余量 small/medium/large = 227/213/159px；overflow 均为 0 | `independent-home-text-scale.json`、`logs/home-text-scale.log` |
| 真实浏览器 bounded sample | **12 surfaces**：Settings 与 Work idle/cancel × 1440/390 × 浅/深；160 个非空角色样本；最低实测对比度 4.66；所有采样面水平 overflow = 0 | `independent-browser-measurements.json`、12 张 `*-independent-v1.png`、`logs/independent-browser-measure.log` |

M-15 的 1440 B 态头带与内容面均为 x=304，右缘均为 x=1392；1680 C 态保持阅读列 `740px`。390 Settings 的三个 `.segment` 均为 44px；Work/Settings 的 V1 角色在明暗两宗保持可见、非零几何。阅读字号实测 15px，正文字号实测 14px；桌面控制为 28px，窄屏控制为 44px。

静态 spot-check 查看了 Settings 1440 浅色、Work 1440 深色、Settings 390 浅色、Work cancel 390 深色四张独立截图；路线、窄屏换行与在跑态 Cancel 控件均可见。该 spot-check 不代替真机帧时间、触屏或用户视觉接受。

## 未完成项的准确记录

曾启动一次 `npm --prefix app test`，因最终组合阶段不需要重复等待而在 BG02-T3 后以 SIGINT 停止（exit 130）；输出保存在 `logs/npm-app-test-interrupted.log`，状态保存在 `logs/npm-app-test-interrupted.status`，不作为全量通过证据。全量应用测试由整合父任务在最终组合阶段统一执行。

验证树 `git diff --check` 通过；当前仅有本次浏览器采样生成的未跟踪 JSON/PNG，未产生产品源代码 diff。
