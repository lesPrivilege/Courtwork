# FE-04 合流复验与CC-S交接

2026-09-09，Astra非作者复验。接单main `015fac9331c1bcaaa368df746f2da23e434a494d`；按序合入FE-04 `4ac5ac9`与r4d `e8a950b`，组合产品HEAD `ed9584eb9f9276b525add20888bff7275615f47e`。无冲突；main已有研究及r4d-review完整保留，无集成产品代码补丁，无新增依赖/allowlist，server/runtime/core/domains/brand无差异。

[交付与Fable复核](../../engineering/mvp/execution/work-surface-kit/delivery-fe04.md)、[primitive canon](../../engineering/mvp/execution/work-surface-kit/contracts/primitive-canon.md)、[WK-111…115](../../engineering/mvp/execution/work-surface-kit/intake-round-3.md)。作者原证据evidence/fe04不覆写；Fable独验结果按其交付记录，不重标为本轮结果。

## 本轮实际结果

- [全量237/237](tests.log)、[colors](lint-colors.log)、[materials](lint-materials.log)、[contrast](contrast.log)、[smoke](smoke.log)通过。
- [primitive 11/11](primitive-checks.json)：送出与生效分开、cancel requested不冒充stopped、授权回执与执行结果分开、工具失败如实显示、授权动作闭集、Question失败alert与重试语义。
- [FE-T07 6/6](fe-t07.json)：迟到读取、折叠/展开保留草稿、不重发命令；surface读取≤2沿WK-115事实接受。

脚本逐字复制evidence/fe04的browser/primitive-seed/primitive-checks/work-seed/fe-t07。独立新仓外目录，primitive端口8941，T07端口8942；CDP19941/19942。全程local-fake/loopback，无真实provider或凭据读取。用环境变量改端口，断言不改。未重跑作者全部RC/几何/Models套件，未作全面视觉或读屏/触控验收。

```sh
npm --prefix app ci
npm --prefix app test
node tools/lint-colors.mjs
node tools/lint-materials.mjs
node tools/contrast-report.mjs
npm --prefix app run smoke
npm --prefix app start -- --data-dir <fresh-primitive-data> --port 8941
# 另一个进程及独立目录：
npm --prefix app start -- --data-dir <fresh-t07-data> --port 8942
APP_URL=http://127.0.0.1:8941 node evidence/fe04-main-integration-20260909/primitive-seed.mjs
APP_URL=http://127.0.0.1:8941 WK6_CDP_PORT=19941 node evidence/fe04-main-integration-20260909/primitive-checks.mjs
WK10B2_BASE=http://127.0.0.1:8942 node evidence/fe04-main-integration-20260909/work-seed.mjs
APP_URL=http://127.0.0.1:8942 WK6_CDP_PORT=19942 node evidence/fe04-main-integration-20260909/fe-t07.mjs
```

## 交接边界

WK-111使Astra补丁4b6aef4的非作者复核闭合；WK-115接受FE-04有界交付。Unknown、Inbox Home/End与两条列表role仍是CC-S第0项，不误记已实现。BE-30…33未交付。

CC-S可从最终main提交派Low，Fable登记WK-116并显式修订Settings旧约；本次不代派。CC-W/D0选向仍待用户；[已有接缝评审](../../engineering/design/clean-cool-2026-09-09/r4d-review.md) R4D-1…6必须消费。已给backend-requests与CC工单补入限定：临时probe不可更新全局健康；D0外壳与Activity分片；保留导航恢复与renderer实际失效条件。邮件/日历保留既有路线意向，具体账户与接入scope不由合流授权。

共享main原有WK98 JSON未提交修改原样保留；从提交建清洁树，不称共享目录干净。FE-04树干净且已合入后可删除；FE-01按实际存在与干净状态核验，不强删。r4d保留。public-copy与G1–G5不关闭，无推送或部署。
