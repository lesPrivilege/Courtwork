# Attention：来源 Astra 非作者反例与集成审阅

2026-09-09。基线main `fa90763a4da1cdede47778b6487c801c0acb74cc`；被审初始产品 `de38eff022b1eea4eb705de51fe988eba3da12bd`，修复产品 `d37704e2e4f9c7bac7e982d9ddd26b795dfb8574`。来源Astra在独立工作树审阅Core Attention状态/事件/回执、披露与查询、HTTP身份构造、Runtime adapter、迁移及作者测试。产品作者是另一Astra任务；来源Astra未修改产品代码。

## 独立发现与修复

[备份链接反例](backup-symlink-probe.py)由来源Astra独立编写，分别git提取旧Core1/app2、最终ES及指定Attention四个Python文件到临时目录，不通过工作树内容冒充被测SHA。

初始 `de38eff` 的旧Core1/app2 → ES前置迁移对 `.pre-file-core-v2-app-v3.bak` 使用 `Path.exists()`；悬空符号链接被视为不存在，后续SQLite沿链接创建目标并把原数据库升级至Core3。独立结果是opened/version3、原库hash改变、链接仍在、目标文件被创建，违反备份已存在即拒绝的合同。相同ES → Attention备份反例已经正确拒绝。

来源Astra将具体路径、复现和无改写断言交回作者。作者 `d37704e` 将两段迁移统一为lexists预检及O_CREAT|O_EXCL创建，不再调用会unlink的通用backup_to。用原独立脚本加 `ATTENTION_EXPECT_FIXED=1` 重跑最终SHA，两段均SCHEMA_INVALID、数据库逐字hash不变、原链接保留且目标未创建。本反例关闭；不声称防御拥有目录任意写权的恶意并发进程。

## 独立披露与状态反例

[HTTP/Runtime探针](disclosure-probe.mjs)同样由来源Astra编写。它从当前隔离checkout导入真实服务，使用local-fake、独立合成数据和port0，输出关键产品文件hash；初始/修复版本各执行一次，五组均passed：

| 组 | 反例与观察 |
|---|---|
| 隐藏未知schema/分页/字段 | 隐藏对象夹在可见对象之间，故障注入隐藏对象schema77；visible count/offset/结果不变。registry-only不暴露summary/reason/source/relation/policy，也不能使用grep或relation过滤器 |
| 项目与请求身份 | 同一attention/request ID在另一project独立建立；跨project Session引用404；changed replay冲突，原create replay仍返回revision1 |
| signal与授权撤回 | signal只增加观察和revision/freshness，不改status/seen/reason/next action/policy/正式refs；精确重放无重复，改内容冲突，Runtime resolve拒绝；revoke后旧signal replay和receipt查询均拒绝 |
| CAS与Run结束 | 同一expected_revision的两个动作仅一项成功，另一项VERSION_CONFLICT，事件连续1/2/3；Run完成后adapter拒绝且Attention快照不变 |
| HTTP认证 | 无token的registry请求401 |

此处验证的是本地project及对象/adapter披露合同，不是跨用户ACL。故障注入只动临时SQLite中的隐藏对象schema；没有访问个人数据、调用真实provider或外部系统。

## 复用作者检查与合流

作者已补写的Luna初稿不记作独立接受。来源Astra另外复跑作者15项定向Core/HTTP/SIGKILL检查与固定SHA迁移矩阵；后者覆盖Core1/app1、Core1/app2、Core2/app3升级/备份恢复、旧host拒绝、残缺schema与备份拒绝。上述复跑与来源Astra新设计的反例分别归因。

最终全量、smoke、机器输出和日志hash见[结果](results.json)。产品未发生集成补丁，最终交付证据和main接收状态以[当前状态](../../engineering/current.md)为准。全部验证限后端/合成路径；Attention UI、自动调度、Pi工具安装、ATT-RT兼容矩阵、真实provider和G1–G5未由本单关闭。Core3/app4、Runtime4；回退用匹配旧host和独立数据目录。

复跑命令（仓库根目录，独立合成数据）：

```sh
ATTENTION_CODE_SHA=d37704e2e4f9c7bac7e982d9ddd26b795dfb8574 ATTENTION_EXPECT_FIXED=1 python3 evidence/attention-independent-20260909/backup-symlink-probe.py
node evidence/attention-independent-20260909/disclosure-probe.mjs
ATTENTION_CODE_SHA=d37704e2e4f9c7bac7e982d9ddd26b795dfb8574 node evidence/attention-backend-20260909/migration-probe.mjs
```

交付头 `ae595ed5e0a585117b2642b3125a0c7a7e01fa23` 相对被测产品仅追加作者证据；来源合流又仅增加本包及current/后端台账。最终305/305、smoke与迁移结果不套用旧de38作者结果。
