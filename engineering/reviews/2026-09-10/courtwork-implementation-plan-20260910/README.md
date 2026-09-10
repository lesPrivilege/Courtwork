# Courtwork 本地agent实现派工包

基线 `0c60f4ffe0e4d939712df3910d2404c226e8bfdf` · 2026-09-10 · 33张工单，27主线/6条件。

先读 [IMPLEMENTATION-PLAN.md](IMPLEMENTATION-PLAN.md)，再执行 [RV26-00](work-orders/RV26-00.md)。不要一次性执行全部工单。原BE/ME/AM/LG/BG请求的保留、复用与后置关系见 [BACKLOG-DISPOSITION.md](BACKLOG-DISPOSITION.md)。机器依赖与完整任务字段在 [tickets.json](tickets.json)；建议DTO在 [contracts/PROPOSED-DTOS.md](contracts/PROPOSED-DTOS.md)；源头范围在 [SOURCE-INDEX.md](SOURCE-INDEX.md)。

## 当前已完成什么

已经完成固定源码/文档审查、实现方案、工单与依赖检查；精确CoreClient副本的两项故障已隔离复现。**没有修改GitHub仓库或运行完整产品测试。** [evidence说明](evidence/README.md)列明Node版本限制、实测和未检项。

## 本地开工

在独立checkout内执行（替换绝对路径，不将本包覆盖仓库根）：

```bash
bash /path/to/this-package/scripts/preflight.sh /path/to/Courtwork
```

先完成RV26-00的差异/写权登记；后续安装和测试使用项目已有命令：

```bash
cd /path/to/isolated-Courtwork/app
npm ci
npm test
npm run smoke
cd ..
node tools/check-doc-links.mjs
```

不向这些步骤提供真实模型credential，不在个人dataDir测试。上述全量命令**本轮未运行**。目标Node最低版本以app/package.json为准（本基线>=22.19.0）。

## 缺陷基线探针

```bash
node /path/to/this-package/scripts/core-client-lifecycle.mjs \
  /path/to/isolated-Courtwork/app/core/client.mjs
```

**此脚本退出0表示基线缺陷被复现，不表示产品健康。** 修复后应在Q01中写相反的正向回归断言；不要将这份脚本原样作为健康检查加入CI。它创建/强制清理自己的临时worker，不调用真实Core数据库。

每单交付按其末尾YAML模板记录；不要把作者自测称为独验。对于已在新main完成的内容，记录代码/证据并标superseded，不能重复实施。
