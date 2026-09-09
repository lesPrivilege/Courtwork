# WO-WK10b 第二段 · 作者证据

2026-09-08，Opus。基线 main `62556b7f65170ecf30efb2869447ae85fe69d721`，工作树 `<isolated-checkout>`，分支 `claude/wk10b-second`（未 push）。服务器 `--port 8874`，数据目录 `/private/tmp/se-agent-wk10b2-data`（每次完整跑之前删除重建）。provider 为宿主 loopback 假 provider，`capabilities.mode = "local-fake"`（见 `seed.json`）；**真实 provider not_run**，全程未配置也未读取任何凭据文件。CDP 端口 19660 / 19662 / 19664 / 19668，各自新建浏览器 profile。

结论见 [delivery-wk10b-2](../../delivery-wk10b-2.md)。本页只登记跑法与产物。

## 顺序

```
rm -rf /private/tmp/se-agent-wk10b2-data
npm --prefix app start -- --data-dir /private/tmp/se-agent-wk10b2-data --port 8874
node seed.mjs                                              # 真实 HTTP + Pi + Core，无写库旁路
node checks.mjs                                            # 26 / 26，CDP 19660
WK10B2_CDP_PORT=19662 node fallbacks.mjs                   # 11 / 11
WK10B2_CDP_PORT=19664 WK10B2_TAG=after node shoot.mjs      # 截图与几何 / 动效 / 键盘量测
```

`before` 一组：把 `app/extensions/inbound-nda/renderer.mjs` 暂移开、`git stash push -- app/web` 回到基线 `62556b7`，同一台服务器、同一份数据、同一具浏览器跑
`WK10B2_CDP_PORT=19668 WK10B2_TAG=before WK10B2_ONLY=fallback node shoot.mjs`，随后 `git stash pop` 与还原文件。

## 脚本

| 文件 | 做什么 |
|---|---|
| `harness.mjs` | CDP 连接（自 wk10b-1 复制，改端口与环境变量前缀） |
| `seed.mjs` | 通过产品自己的 HTTP 路由装载扩展、建绑定、跑真实 Run 提交候选；四个 NDA 会话（完整 / 未决 / 冲突 / 待续行）与另一 project 的一个会话 |
| `checks.mjs` | 逐规则视图、决定、回执、修订、续行、释放绑定 |
| `fallbacks.mjs` | FE-T11（换源后读旧候选与历史字节）、active Run 冻结、FE-T08 三种缺席 |
| `shoot.mjs` | 同条件截图 + 命中区 / 横向溢出 / reduced-motion / 真实 Tab 遍历量测 |

## 读数

| 产物 | 内容 |
|---|---|
| `checks.json` / `checks.log` | 26 / 26 |
| `fallbacks.json` / `fallbacks.log` | 11 / 11 |
| `viewport-after.json` | 每个视口的控件数、低于 32 / 44 的控件（0）、横向溢出（0）、无名控件（0）、reduced-motion 运行中动画（0）、真实 Tab 可达 9 / 9 且全部有名 |
| `tests.log` / `tests-baseline.log` | 178 / 178（基线 174 / 174） |
| `lint.log` · `contrast.md` | `lint-colors` 通过；对比度表全部通过 |
| `seed.json` | 本次种子的 project / session / candidate / matter id、两个 packet 的 `humanActions` enum 与逐规则状态词 |

## 截图

同一台服务器、同一份数据、同一具浏览器。

| 前缀 | 状态 |
|---|---|
| `review-<宽>-<宗>` | 逐规则候选视图与它被声明的决定 |
| `review-rule-<宽>-<宗>` | 展开一条规则：reason、锚点、冻结引文 |
| `revision-<宽>-<宗>` | 人工修订表单 |
| `receipt-<宽>-<宗>` | Chat Flow 里的只读决定回执 |
| `binding-<宽>-<宗>` / `binding-continue-…` / `binding-empty-…` | 绑定面两段；续行列表；空态一句 |
| `readonly-<宽>-<宗>-{before,after}` | producer 卸载后的只读历史，**前后同条件** |
| `review-200pct-light-{before,after}` · `review-1440-reduced-motion-{before,after}` | 200 % 缩放与 reduced-motion |

`before` 组只包含基线也存在的状态；逐规则视图、决定、修订、回执与续行在基线不存在，故无 `before`。
