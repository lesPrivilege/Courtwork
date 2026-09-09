# V7 恢复与本地运行

V7源码交付为 `../archives/framework-v7-source.tar.gz`，逐文件和包SHA-256见同名JSON；独立证据为 `../archives/framework-v7-evidence.tar.gz` 与同名JSON。源码包包含app、原有基础tests和当前docs；证据包包含本轮自检/独验/反例及来源消费材料。不要把旧V6的deferred目录覆盖进活动源码。

恢复到新目录，先验证包hash并逐成员与manifest核对，再解包。依赖不入包；需要Node >=22.19、Python 3、npm。运行检查使用Node25.9.0。

```sh
# 在新建目录内解包源码包后
cd app
npm ci --ignore-scripts
SE_RUNTIME_DATA_DIR=/absolute/path/to/new-v7-data PORT=8797 node server/index.mjs
```

数据目录必须是新的独立目录，不能用V5/V6旧数据作seed或让两个Host同时打开。Pi精确版本仍由package-lock锁定0.83.0，API仍为 `/api/v5`。bootstrap显示realProvider:false、local-fake、externalBrowser:false；没有真实key读取或外部provider自动回落。

本机便捷源码为 `<isolated-checkout>/app`，预览 `http://127.0.0.1:8797/`，纯合成数据 `/private/tmp/se-v7-preview-20260906`。这些临时入口可能失效，归档与恢复步骤才是交付依据。

## 复核

基本未改后端/原renderer测试可从app运行：

```sh
node --test tests/runtime.test.mjs ../tests/extension.test.mjs ../tests/extension-renderer.test.mjs ../tests/runtime-lock.test.mjs
```

本轮独立浏览器脚本随证据包提供，解包到同一个新目录，使 `evidence/**` 与 `app/` 并列。Playwright是验收环境工具，不是产品依赖；可通过 `PLAYWRIGHT_MODULE=/absolute/path/to/playwright/index.mjs` 选择本机已安装版本，浏览器需相应Chromium。脚本创建各自临时数据目录，不复用展示数据；具体最终命令/阶段hash见result.md和对应独验报告。历史基线反例应按对应V6源码运行，不把最终源码上的不同结果解释成历史报告失真。

`evidence/verify-boundary.py` 与 `evidence/package-v7.py` 是本机归档工具，包含固定持久工作树路径；移机使用时需按新的源码/文档根设置路径。运行产品与独立浏览器测试不依赖原参考仓，来源报告已包含机制/边界与hash。

## 能力边界

Preview是同源受信单槽renderer，不是安全sandbox或任意URL浏览器。SE内部renderer保持原V5接入样例；本轮没有完成extensions/experts、真实provider、Core重构、专业Review充分性、全量IME/a11y或Design Polish。总Run deadline包括waiting_user，已结束问题不能由前端重新变成可回答。网络回执不明确时核对历史；现有API没有跨断连/重启exactly-once承诺。
