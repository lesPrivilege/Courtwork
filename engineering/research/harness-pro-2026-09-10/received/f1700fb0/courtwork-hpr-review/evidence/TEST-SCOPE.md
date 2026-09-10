# 本次执行范围

记录时间：2026-09-10T14:11:33.171711+00:00。Node：v22.16.0。无产品依赖安装、无真实provider、无外部消息、无真实网络请求。

`baseline-byte-check.json`：从 GitHub 连接器返回文本保存固定源码，计算 `SHA1("blob " + byteLength + NUL + bytes)` 与返回 blob id 一致。只有这一个文件完成独立字节验证，不扩写成全repo或12input核验。

`baseline-mcp.tap`：4 tests，4 pass，0 fail/skip。使用 Node VM 将 **原文件** 的 MCP SDK import 换成测试桩；没有重写被测 manager。PASS 前两项表示缺口可复现，后两项为transport-error与success对照。

`reference-catalog.tap`：10 tests，10 pass，0 fail/skip。仅测试本包的 collectCatalog 参考函数。它限制已解码catalog，不限制SDK解析之前的网络内存分配，也未验证modern/legacy真实分页行为。

复现命令（在解包目录）：

```sh
node --experimental-vm-modules --test tests/baseline-mcp.test.mjs
node --test tests/reference-catalog.test.mjs
python3 verify-package.py
```

产品要求 Node >=22.19.0；当前容器版本不足，且未取得完整 checkout。产品 npm test、smoke、Core SQLite、GUI/browser、真实依赖SDK/传输、真模型与个人数据迁移均 **not-run**。原文引用的历史通过数字是上游记录，不是本次测量。

本包的固定基线源码与诊断探针是不可变研究证据。产品修复的接受测试必须另建于仓库并导入修复后的真实源码；不要改写这里的基线文件或期待哈希。
