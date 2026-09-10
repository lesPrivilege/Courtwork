# 2026-09-10 顺序交付整合

状态：五项交付均经 Luna 独立验收通过；产品合流固定为 `d0118ab356c541f0ff2dcd9bc867c438399d3e7d`。本回执与台账提交后快进并推送 main；远端同步以实际 Git 校验为准。

## 授权与基线

用户授权依次由 Luna 独立验收 ICON、FE-05a、FE-05 材质 specimen、ATT-FE-01、Spark；通过后合流、清账并 push main。产品基线为 `df9fc18b9f1a8374d72fa071c2b9c1e61e0010d1`，首次读取 origin/main 为 `2e9da09bd163ca128e3cd2f4c91ef61ceec2fc2f`。隔离整合分支为 `codex/delivery-rollup-20260910`；不切换或清理共享 UI checkout。Runtime 11 / Core 4 / app 5 与既有 SK-1…4、Q01/Q02 必须保留。

## ICON · 独立通过

固定作者 `ab09b0dee05f73e8e615c0a5f9107a8ba15ff697`，独立 Luna detached 检查：静态准入测试 5/5，24 图标的 UI allowlist / 源 / sprite / manifest 一致，Lucide 来源声明一致，五项输出哈希正确，vendor 重建无差异。交付按 WK-163 保留 Lucide，不执行整族迁移。合流 `e2ab3f5`；Astra 后续 `6169f01` 仅统一 specimen HTML 行尾空白及生成器输出，折叠空白后的内容相同，产品 vendor 字节不变。[独立日志](icon/logs/icon-parity-and-rebuild.log)。

## FE-05a · 独立通过

作者固定 `463d57c1f3840ecde9c3bfa8577cd6d552d402af`；作者尚未提交的交付说明与 192 份证据文件按显式路径冻结为 `0b457f87259ea4ecd4ca27d7b5c6ffe475ac6dab`，无产品改动。原工作树保持。文件清单与摘要见 [snapshot](fe05a/author-uncommitted-snapshot.json)。作者数字不替代本轮独立检查。Luna 固定独立树完成 baseline 7/7、Shape 8/8 + 治理 5/5、V1 类型 7/7、HOME-16 3/3；12 组真实合成界面、160 个角色样本最低对比度 4.66，均无横向溢出，见 [独立结论](fe05a/independent-verification.md)。合流为 `68b8d3d`，Astra 合流接缝测试通过见 [日志](integration/logs/fe05a-main-seams.log)。独立阶段全量测试中止，不计通过，最终组合另跑。

## FE-05 材质标本 · 修补后独立通过

原交付 `cd124d6` 的真实媒体条件被非作者 Luna 检出 cascade 缺陷：reduced-transparency 下 P2 仍采样，forced-colors 下 P2 与 transient Inspector 仍采样；页面 `data-a11y` 模拟开关通过不能替代真实媒体证据。Astra 独立修补分支 `66de3c4` / `93a641f` 提升真实回退选择器优先级，并补 unsupported-engine 实色覆盖。只改 specimen，原 capture / measurements 保留；Luna 对固定 `93a641f` 与 FE-05a 组合完成三宽明暗、真实 reduced/forced 与有界 CSSOM @supports 检查，回退均零采样/零mask/几何不变，见 [独立结论](material/independent-verification.md)。合流 `aa2c55b`；旧失败证据保留。不据此宣称新增生产材质或真机帧性能。

## Attention · 谱系修复后独立通过

原交付 `cd1326d8481e4965e96e8ee4f40cc531a67d4fef` 实际从 `a579929` 起，但首提交包含回退较新主线的大范围改动，不能整支合入。按作者声明的旧基线 `2e9da09` 至交付头提取 37 个实际交付文件，应用在 `a579929`，形成 `9db6fc4362a07dc8ff20e1914e2ac471f20b62c1`。两处接缝保留 SK-1 Review 类与主线 Home 测试，未改变现有后端写权。Astra 37/37 有界检查见 [日志](attention/logs/astra-scope-repair-tests.log)；这是作者检查，非独立接受。原分支保留为来源，不以其回退为合流输入。当前主线组合候选 `1097fd4` 无冲突，Astra 再跑 [37/37 接缝检查](attention/logs/astra-current-main-seams.log)。Luna 随后完成[独立 116/116 浏览器与 29/29 针对测试](attention/independent-verification.md)，实际 CAS、丢响应回执查询、同 request-id 重试与键盘窄屏通过；合流为 `055cffc`。All 沿服务端顺序的验证不关闭 BE-40@Attention 排序合同。

## Spark · 修补后独立通过

`0220d35` 接入固定 `4b1ac93` 的 BE-41 DTO、WO-SP1-FE 与 SP-10…12 裁决。用户允许先用合成数据交付前端；真实 host 在 BE-41 未实现期间必须显示 unimplemented，不显示合成数值。前端接受不等于 BE-41 交付或真实维护能力接受。

原候选 `20d8330` 为 FE-05a + 原交付 `63840a7` + Astra 集成修补：静态准入保留 skin-policy.js，修补 scope 切换旧数据、错 scope 接收、重试 offset/snapshot 丢失与重绘焦点；chip 消费同值 radius-pill token。Luna 独立复核原候选时，38/38 针对测试通过，但浏览器 20/21：绑定 Matter 路由选中了 owner Session，却未显示已有 Work 面。原始[失败结果](spark/independent-verify-20260910/browser-results.json)保留。

Astra 在 `936239dca9d7eac0cab859960f8b19950c760193` 修复导航 epoch 竞态、项目/Session/binding 重验及已有 Work preview 激活；新增六个实际函数反例，原实现 3/6 失败，修后 6/6。Luna 对固定修补头独立复验 **44/44 针对测试、22/22 真实 host 浏览器**；另有窄屏长标题/长候选 ID 与 200% 等效布局 5/5，见[最终独立结论](spark/independent-verify-repair-20260910/README.md)。真实 BE-41 404 显示 No source yet，不产生合成数值；无新建 Session、binding 或后台写入。最终合流 `d0118ab`。

## 最终组合与合流审计

最终产品全量 **643/643**，零失败、skip、cancel 或 timeout；[原始日志](integration/logs/full-suite-final.log)与[执行元数据](integration/logs/full-suite-final-result.json)固定测试提交 `1f8317a999abf04508b7fc9d65e758796374aafd`，沿 app/package.json 的两个测试 glob，test-concurrency=1，单测试 60s / 整体 600s。最终合流 `d0118ab` 的 app、tools、docs/work-core、docs/runtime-control、domains、brand 与该固定测试树逐字一致；材质 specimen 51 路径另在最终合流保留。先前 `4003c54` 的 637/637 是修补前历史组合结果，不替代本次结果。

两组 FE-05a 主线接缝 24/24 与 11/11；五项颜色/材质/交互/Shape/contrast 检查及 local-fake runtime smoke 通过。Pages 从冻结产品来源构建，build / links / material 通过，未部署。最终节点的复跑日志保存在 integration/logs 下的 final-* 文件。

Luna [合流审计](merge-audit/README.md)逐轮记录父节点、交付路径及 blob 保留，核对 SK、Q01/Q02、FE-05a、ICON、Attention 与 Spark 的共享文件不变量；原 Attention 非工单回退明确排除。历史原始证据的行尾空白保留，包含作者 before-failure 日志，不为 diff-check 通过而改写证据。

## 边界

独立验收、Astra 集成检查与历史作者证据分别记账。不运行付费 provider，不迁移个人数据；本轮 push 授权不含部署，不关闭 G1–G5。CC-I `41966b6` 的先前独立不通过结论保持，不因相邻交付合流而转为接受。
