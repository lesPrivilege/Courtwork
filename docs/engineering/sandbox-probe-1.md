# SANDBOX-PROBE-1 · macOS Seatbelt 真机探测报告

**工单坐标**：`docs/architecture/implementation-readiness.md:305`；立票依据 `ADR-017` 修订三「隔离前置链」与 `ADR-018` 未决 1、未决 3。
**性质**：证据记录 + 门的读取面。第五节的三条越界反例登记被 `assert-isolation-binding.mjs` 的 R2 判据读取，故本文档是现行工程文档，不入归档；等级晋升或反例登记迁移时，本节与门同批改。第一、四、六节的机器实测锚定固定环境与固定仓库坐标，那部分不随后续提交演进。
**本票不执行**：`EXEC-SCRIPT-1` 的任何执行面；`ADR-017`／`ADR-018` 正文一字未改；探测脚本与 profile 样例不入生产白名单，只以原文引在本报告内。

**结论：部分成立。** 主体一项成立并携三类双向反例——在当前发行形态（ad-hoc 签名 + hardened runtime 的 Tauri v2 `.app`）内，由 Rust 侧 `std::process::Command` spawn `/usr/bin/sandbox-exec` 加运行时生成的 Seatbelt profile 可行，读、写、网络三类越界均被内核拒绝，且拒绝可归因于策略本身。未测边界三项逐条列在第八节，均不作通过宣称。**当期隔离等级仍为 `none`，本票不改 `ADR-018` 状态行**——按决定五的顺序纪律，等级晋升须随实现同批取得反例，另裁。

---

## 一、环境登记

| 项 | 值 | 取值方式 |
|---|---|---|
| macOS | 26.5.2（build 25F84） | `sw_vers` |
| 内核 | Darwin 25.5.0，`xnu-12377.121.10~1`，`RELEASE_ARM64_T8112` | `uname -a` |
| 芯片 | Apple M2（arm64） | `sysctl machdep.cpu.brand_string` |
| Rust | rustc 1.97.0 / cargo 1.97.0 | `rustc --version` |
| Node / pnpm | v25.9.0 / 9.15.0 | `node -v` |
| `sandbox-exec` | `/usr/bin/sandbox-exec` 在位 | `ls` |

签名形态两份，形制一致：

| 包 | Identifier | CodeDirectory flags | entitlements | TeamIdentifier |
|---|---|---|---|---|
| 发行包 `Courtwork.app` | `cn.courtwork.desktop` | `0x10002(adhoc,runtime)` | 空 | not set |
| 探测包 `CourtworkSandboxProbe.app` | `cn.courtwork.sandboxprobe` | `0x10002(adhoc,runtime)` | 空 | not set |

`runtime` 位即 hardened runtime。案头报告将「hardened runtime 形态无一手成败记录」列为真机风险第 2 条；本票实测该条的前半——**hardened runtime 已在场，不阻碍 spawn `sandbox-exec`**。后半（notarized）无 Developer ID 不可测，见第八节。

`entitlements` 两份皆空，`App Sandbox` 未开启。**复述确认：App Sandbox entitlement 永不开启**（嵌套沙箱冲突，发行线红线，`ADR-018` 案头裁点二）。

探测包由生产 `src-tauri` 全量复制到会话 scratch 目录后构建，仅改三处：去掉 `beforeDevCommand`／`beforeBuildCommand`、换 `identifier`／`productName`、`main.rs` 增一行探测入口。另需在 scratch 内复刻 `apps/desktop/src-tauri` 的仓库相对位置——`lib.rs` 有三处 `include_str!`／`include_bytes!` 指向 `../../../../packages/…`，crate 脱离该层级即编译失败。生产树未被改动。

---

## 二、`sandbox-exec` 的废弃形态

废弃只出现在文档，不出现在运行时。

`man sandbox-exec` 首行 `sandbox-exec - execute within a sandbox (DEPRECATED)`，正文 `The sandbox-exec command is DEPRECATED.  Developers who wish to sandbox an app should instead adopt the App Sandbox feature`，落款 `Mac OS X / March 9, 2017`。

运行时 stderr 零字节：

```
$ /usr/bin/sandbox-exec -f trivial.sb /bin/echo hello 2>err.txt >/dev/null
exit=0
stderr bytes: 0
```

`.app` 内六条用例的 `stderr` 亦无任何废弃横幅（见第四节原始输出）。Apple 指向的替代品是 App Sandbox，而 App Sandbox 恰是发行线红线所禁——两者不可兼得，这一点决定了本仓只能停在 `sandbox-exec` 一路，其存续风险按案头清单第 8 条逐大版本回归兜底。

---

## 三、自举底座：一处静默失败悬崖

收窄 profile 的第一个障碍不是策略写错，是**profile 少一条时被包裹进程直接 SIGABRT 且零诊断输出**。

| 试验 | profile 读面 | 结果 |
|---|---|---|
| C1 | `(subpath "/")` | `hi`，exit 0 |
| M | `(subpath "/usr")(subpath "/System")(subpath "/bin")` | exit 134，stdout/stderr 皆空 |
| L | 同上 **加 `(literal "/")`** | `hi`，exit 0 |

差量只有一条：对根目录自身的读权限。`subpath "/usr"` 不蕴含 `/` 的读权限，路径解析需要它。缺失时 exit 134（SIGABRT），无 stderr，无统一日志条目——`log show` 以 `deny(` 与 `sandbox` 为谓词均零命中；SBPL 的 `(trace "file")` 在本版本不产生输出文件。同类问题在解释器路径上重现一次：`(subpath "/Library/Frameworks/Python.framework")` 不蕴含 `/Library` 与 `/Library/Frameworks` 的读权限，`realpath` 报 `Operation not permitted`，须逐级补 `(literal ...)`。

这一条是裁点一的直接输入：**自研 profile 生成的成本不在 SBPL 语法，在这类只能靠试错取得、且失败时不给线索的底座知识**。

本票实测所得的最小底座：

```scheme
(version 1)
(deny default)
(allow process-exec)
(allow sysctl-read)
(allow file-read*
  (literal "/")        ; 缺这一条即静默 SIGABRT
  (subpath "/usr")
  (subpath "/System")
  (subpath "/bin"))
```

---

## 四、件一：`.app` 内主测（正例三条）

探测代码在 `main()` 内于 `run()` 之前执行，写 profile 到磁盘，再以 `std::process::Command::new("/usr/bin/sandbox-exec")` 逐条 spawn，参数经 `-D` 注入。两条启动路径各跑一轮：

- 直接执行 bundle 内主二进制（pid 35041）；
- `open -n --env …` 经 LaunchServices 启动（pid 35123）。

两轮各自落一份报告，把 pid 与 fixture 根路径归一后 `diff` 无输出——六条用例的 exit、stdout、stderr 逐字相同。

装载的 profile（由 Rust 在运行时写出，参数留 `(param)` 位）：

```scheme
(version 1)
(deny default)
(allow process-exec)
(allow process-fork)
(allow sysctl-read)
(allow file-read*
  (literal "/") (subpath "/usr") (subpath "/System") (subpath "/bin"))
(allow file-read*  (subpath (param "ALLOW_READ")))
(allow file-read*  (subpath (param "ALLOW_WRITE")))
(allow file-write* (subpath (param "ALLOW_WRITE")))
(allow network-outbound (remote tcp (param "ALLOW_TCP")))
```

原始输出（`.app` 内，路径按 `<root>` 缩写）：

```
## P1 读白名单路径 （期望：成功）
argv = ["/bin/cat", "<root>/allowed/input.txt"]
exit = Some(0)
stdout = "ALLOWED-CONTENT-OK\n"
stderr = ""

## P2 写指定 scratch 路径 （期望：成功）
argv = ["/bin/cp", "<root>/allowed/input.txt", "<root>/scratch/out.txt"]
exit = Some(0)
stderr = ""

## P3 连策略内端口 （期望：成功）
argv = ["/usr/bin/nc", "-vz", "-w", "2", "127.0.0.1", "18443"]
exit = Some(0)
stderr = "Connection to 127.0.0.1 port 18443 [tcp/*] succeeded!\n"

## 宿主侧核对
scratch/out.txt 内容 = "ALLOWED-CONTENT-OK\n"
```

**网络那一条须按其真实粒度读**：票面说的「访问允许域名」在 Seatbelt 里不可表达。SBPL 的 `network-outbound` 只认 `remote ip` / `remote tcp` 的地址与端口，没有域名过滤原语。P3 因此写成端口级放行。这不是取巧，是机制边界，也正是 srt 要在宿主侧挂一整套代理的根因（第七节）。域名级准入若成为需求，须另立网络层票，不属本票范围。

### 代表性工作负载：脚本执行与子进程继承

`ADR-017` 修订三启封的场景是 kit 型脚本流水，故另跑一轮解释器负载。脚本读入料、写产出，再连起两个子进程去够策略外的文件：

```
W1 /bin/sh -c "cat <allowed>/input.txt; /bin/cat <outside>/secret.txt"
    ALLOWED-CONTENT-OK
    cat: <outside>/secret.txt: Operation not permitted

W2 python3 <allowed>/pipeline.py
    STAGE-1-OK PIPELINE-PROCESSED:ALLOWED-CONTENT-OK
    STAGE-2 子进程读策略外 exit= 1 stderr= cat: <outside>/secret.txt: Operation not permitted
    STAGE-3 子进程写策略外 exit= 1 stderr= cp: <outside>/child-breach.txt: Operation not permitted

宿主侧核对：scratch/pipeline-out.txt = PIPELINE-PROCESSED:ALLOWED-CONTENT-OK
             outside/child-breach.txt 不存在
```

**约束随 `fork`/`exec` 继承**：被包裹进程派生的子进程同受策略约束，无须逐层重新包裹。这一条对脚本执行是决定性的——流水线内部的 `subprocess` 调用不构成逃逸口。

### 继承 fd 的写入同受约束

宿主把子进程的 stdout 接到哪里，结果三分：

| 试验 | stdout 去向 | 结果 |
|---|---|---|
| V1 | 管道 | 正常输出，exit 0 |
| V2 | 策略内文件（`scratch/v2.txt`） | 正常写入，exit 0 |
| V3 | 策略外文件（`outside/v3.txt`） | `cat: stdout: Operation not permitted`，exit 1 |

三例的 profile 与命令完全相同，只有重定向目标不同。**`file-write*` 的检查发生在 `write` 时，不只在 `open` 时**——宿主预先打开一个策略外文件再把 fd 交给子进程，并不能绕开策略。srt 的 README 把「继承 fd 不受限」列为已知限制（转述级）；就**普通文件**而言本票实测不支持该表述，V3 被拒。两者可并存：管道与 socket 不带路径，本就不在 `file-write*` 的判定面内（V1 即此），而这也意味着「子进程经宿主给的管道把数据送到策略外」在机制上确实不受策略约束——该口子归宿主自己的输出接线管，不归 Seatbelt。

另一处附带观察，记录不修：被包裹进程的 `cwd` 若在策略外，`getcwd` 失败，shell 报 `shell-init: error retrieving current directory`。启动脚本前把 `cwd` 设进策略内即可回避。

---

## 五、件二：越界反例证伪（双向）

### 拒得住

三类越界均被内核拒绝，`errno` 为 `EPERM`：

```
## N1 读策略外路径 （期望：须被拒）
exit = Some(1)
stderr = "cat: <root>/outside/secret.txt: Operation not permitted"

## N2 写策略外路径 （期望：须被拒）
exit = Some(1)
stderr = "cp: <root>/outside/breach.txt: Operation not permitted"

## N3 连策略外端口 （期望：须被拒）
exit = Some(1)
stderr = "nc: connectx to 127.0.0.1 port 18080 (tcp) failed: Operation not permitted"

## 宿主侧核对
outside/breach.txt 存在？ false
```

按 `ADR-018` 决定一末条的登记口径：

- **读策略外路径：被拒**（`EPERM`，`cat` exit 1）
- **写策略外路径：被拒**（`EPERM`，`cp` exit 1，宿主侧核对文件未落地）
- **连策略外地址：被拒**（`EPERM`，`connectx` 失败，exit 1）

### 测得出

只有「被拒」不足以归因——被拒也可能来自文件权限、来自端口无人监听。故立两道对照：

**对照一（负载在位）**：18443 与 18080 两个回环端口全程各有一个监听器。沙箱外基线两端口皆通（`Connection to 127.0.0.1 port 18443 … succeeded!` / `… port 18080 … succeeded!`，exit 皆 0）。沙箱内一通一拒，差量只在策略。

**对照二（变异）**：profile 正文一字不改，只把 `-D` 注入的参数放宽——`ALLOW_READ`／`ALLOW_WRITE` 指向原策略外目录、`ALLOW_TCP` 指向原策略外端口。三条反例全部翻绿：

```
N1' 读原策略外路径   SECRET-MUST-NOT-BE-READ            exit 0
N2' 写原策略外路径   breach.txt 存在——写通了            exit 0
N3' 连原策略外端口   Connection to 127.0.0.1 port 18080 [tcp/*] succeeded!   exit 0
```

同一份策略文本、同一批命令，只改注入参数即红绿反转。三条反例的红因此归于策略，不归于环境。

---

## 六、件三：TCC 叠加

**Seatbelt 的 `allow` 不能覆盖 TCC，且两者的拒绝在 `errno` 与文案层面完全不可区分。**

| 试验 | 策略对目标路径 | TCC 对本进程 | 输出 | exit |
|---|---|---|---|---|
| T1 | 放行 `~/Library/Safari` | 无授权 | `ls: …/Library/Safari: Operation not permitted` | 1 |
| T2 | 不放行同一路径 | 无授权 | `ls: …/Library/Safari: Operation not permitted` | 1 |
| T3 | 放行 `~/Library/Preferences`（非 TCC 面） | 不适用 | 正常列出 | 0 |

T1 与 T2 的 stderr 逐字相同。T3 证明 T1 的 `allow` 写法本身有效，故 T1 的红只能来自 TCC。

**对失败归因的直接后果**：`ADR-018` 决定四要求隔离失败 fail closed 并显式。「显式」不能靠 `errno` 区分成因——`EPERM` 在策略拒绝与 TCC 拒绝下同形。若将来要向用户说明「为什么这一步没做成」，须由宿主在策略侧自行判定路径是否在策略内，再据此分流文案，不得把系统 `errno` 直接投影成原因。

`~/Desktop` 与 `~/Documents` 在两条启动路径下均可列出，无弹窗。**此结果不可外推**：两轮启动都源自一个已持有该两处 TCC 授权的终端会话，macOS 的 responsible-process 归因使被启动进程沿用该授权。Finder 双击、无既有授权的 `.app` 首次触达 TCC 保护目录时的弹窗归因与文案，本票未测（第八节）。

---

## 七、件四：srt 评估与裁点一

### 一手核实的事实

`@anthropic-ai/sandbox-runtime` v0.0.67（案头报告记 v0.0.64，已前进），Apache-2.0。

| 项 | 值 |
|---|---|
| `engines.node` | `>=20.11.0` |
| `bin` | `srt` → `dist/cli.js` |
| `main` | `./dist/index.js` |
| 运行时依赖 | `zod`、`commander`、`node-forge`、`@pondwader/socks5-server` |
| `dist.unpackedSize` | 8,287,186 字节（约 8.29 MB） |
| `dist.fileCount` | 153 |

**Node 运行时假定成立，且不是可绕过的形式依赖**：`engines` 显式要求 Node ≥ 20.11.0；网络层由 `@pondwader/socks5-server`（SOCKS5 服务端）与 `node-forge`（证书生成）实现，两者都是进程内的 Node 组件。README 自述 macOS 路径「代理监听在特定 localhost 端口，profile 只放行这些端口」（转述级）。由该前提可推：**代理须在被包裹进程的整个生命周期内存活**，即 Node 进程须常驻，不是「生成一份 profile 就退场」的一次性工具。此推论未经真机复核（本票未安装 srt），但它是上述机制的必然结果，不属猜测。

源码规模（GitHub tree API 取值，字节）：

| 文件 | 字节 | 职责 |
|---|---:|---|
| `src/sandbox/sandbox-manager.ts` | 80,201 | 沙箱生命周期 |
| `src/sandbox/sandbox-config.ts` | 59,065 | 策略配置与 profile 生成 |
| `src/sandbox/macos-sandbox-utils.ts` | 37,801 | macOS Seatbelt 专有面 |
| `src/sandbox/http-proxy.ts` | 24,610 | 网络代理 |
| `src/sandbox/tls-terminate-proxy.ts` | 23,837 | TLS 终结 |
| `src/sandbox/mitm-ca.ts` | 22,907 | 中间证书签发 |
| `src/sandbox/parent-proxy.ts` | 17,010 | 上游代理 |
| `src/sandbox/mux-proxy.ts` / `socks-proxy.ts` / `mitm-leaf.ts` | 8,993 / 5,722 / 5,037 | 复用、SOCKS、叶证书 |

网络一族七个文件合计约 108 KB，是 macOS Seatbelt 面（37.8 KB）的近三倍。

README 自述限制（转述级）：网络过滤只到域名粒度、不作流量检查，域前置可绕；`allowUnixSockets` 经 Docker 一类服务可提权；对可执行目录或 shell 配置的写权限等同代码执行；`enableWeakerNetworkIsolation` 为 Go 的 TLS 校验而削弱 macOS 网络隔离；`allowAppleEvents` 直接移除代码执行隔离。macOS 侧另需经 Homebrew 安装 `ripgrep`（转述级，README 前置条件节）。项目自标 Beta Research Preview。

### 裁点一：两路代价

两路要解决的问题不对称，这一点先于代价表：`ADR-018` 决定五在 `os_confined` 档给出的能力是「策略内的受限写入」，**没有域名级网络准入**。srt 的一多半重量（代理、TLS 终结、MITM CA）服务的是域名级网络过滤，本仓当期的绑定表并不需要它。

| 维度 | 甲：Node sidecar 嵌 srt | 乙：Rust 侧自研 profile 生成 |
|---|---|---|
| 分发体积 | 解包 8.29 MB / 153 文件，另加 Node 运行时本身（Tauri 主进程是 Rust，当前发行包不含 Node） | 零新增二进制；profile 是运行时生成的文本 |
| 新增运行时依赖 | Node ≥ 20.11.0 + 四个 npm 包（含 SOCKS5 服务端与证书库） | 零（`std::process` 与 `std::fs` 已在用） |
| 签名与公证链 | sidecar（`externalBin`）须与主 bundle 嵌套签名，公证流程较脆（`tauri#11992`，转述级）；Node 二进制随包分发另需自行处理其签名 | 不动签名链：`/usr/bin/sandbox-exec` 是平台二进制，**本票已实测在 adhoc+hardened runtime 下可 spawn**，不需 sidecar、不需额外 entitlement |
| 进程模型 | Node 进程须在被包裹进程全生命周期常驻（代理在其中）；端口分配、端口冲突、进程回收都进宿主生命周期 | 一次 `spawn` 一个子进程，无常驻件 |
| 外部前置 | macOS 侧另需 `ripgrep`（Homebrew，转述级）——桌面产品不能要求终端用户 `brew install` | 无 |
| profile 维护成本 | 由上游承担；上游自标 Beta Research Preview，API 未稳 | 自担。本票实测的底座知识（第三节）即其一部分：静默 SIGABRT 悬崖、逐级 `(literal)` 补路径解析 |
| 维护面的实际大小 | 全量 macOS 面 37.8 KB TS，覆盖任意程序 | **受 `ADR-017` 决定三收窄**：白名单是 `argv[0]` + 参数形状约束的闭集，须支撑的程序集有限，profile 不必覆盖任意程序 |
| 网络能力 | 域名级准入（代理 + TLS 终结） | 只到 ip/port（Seatbelt 机制上限）。当前绑定表不要求域名级 |
| 逃逸面 | 增一个常驻 Node 进程与一套 MITM 证书链；README 自述的域前置、Unix socket、可执行目录写入诸条同样适用 | 逃逸面等于 Seatbelt 自身；README 所列与代理相关的几条不适用 |
| 供应链面 | 四个 npm 传递依赖 + Node 本体 | 无新增 |

### 施工期落地的 `ADR-022` 改动了上表一行的前提

本票施工期间（2026-07-27），`ADR-022`（pi lane）转 `Accepted` 并入图（`main` @ `296c047`、`69cd989`）。其决定一明记通用 agent loop 线**以 Node sidecar 承载 `pi-agent-core` 库**，`PI-LANE-1` 已入票表。该 ADR 未决 4 直接点名本票：「Node sidecar 的签名/公证链影响（与 `SANDBOX-PROBE-1` 裁点一共用一个 sidecar 的可行性）」。

据此订正上表一行，其余各行不变：

- **分发体积**一行原写「另加 Node 运行时本身（当前发行包不含 Node）」。若 `PI-LANE-1` 落地，Node sidecar 已在发行包内，甲路的**增量**成本降为 8.29 MB 解包体积 + 四个 npm 传递依赖，Node 运行时本身不再计入本票账下。
- **签名与公证链**一行同理：sidecar 嵌套签名的代价由 `PI-LANE-1` 先付，本票不重复计。ADR-022 未决 4 问的正是这份代价能否一份两用——本报告给出的输入是：乙路完全不需要 sidecar（`/usr/bin/sandbox-exec` 是平台二进制，本票已实测在 adhoc + hardened runtime 下可 spawn），故「共用 sidecar」只在选甲路时才是问题。
- **不受影响的两条**：srt 的常驻代理进程模型（Node 须在被包裹进程全生命周期存活）；`os_confined` 档不要求域名级网络准入。甲路的重量分布因此不变——变的只是其中「Node 运行时」那一块由谁记账。

另须并置：`ADR-022` 决定「ADR-017 的受控脚本执行（argv 三段式）与 pi lane 的 bash 是两条能力面……两者互不豁免对方的前置」。第九节的能力登记册按能力逐条记等级，恰能承载这两条并存——各自一行、各自的 `requiredLevel`，不共用档位。

**不预裁。** 两路的分界不在实现难度，在是否需要域名级网络准入：需要则甲路的重量有对应收益，不需要则甲路的绝大部分重量落在本仓用不上的能力上。此判断连同上表与本节订正携回架构。

---

## 八、件五：gondolin 对照，以及未测边界

### gondolin

Apache-2.0；guest 仅 Alpine；QEMU **不随包分发**，官方前置为 `brew install qemu node`；guest 资产（kernel/initramfs/rootfs 及可选 krun 构件）约 200MB+ 本地缓存；文档未给冷启动与内存数值。Homebrew 侧 `qemu` 稳定版 11.0.3，**许可证 GPL-2.0-only**，必需依赖 15 个、含传递依赖 29 个。

**分发结论：不成立。** 三条各自独立即足以否定「随 app 分发」：许可证为 GPL-2.0-only；须终端用户自行安装且 Homebrew 依赖面达 29 个；guest 资产另有 200MB+。案头报告已将其降为参考架构，本票的证据与该定位一致。

**冷启动与内存：未实测。** 实测前提是本机安装 QEMU（约 1GB 下载 + 200MB+ guest 资产），2026-07-27 经产品负责人裁定不装。两个数字登记为未测边界，不作任何量级宣称。分发结论不依赖这两个数字，故本件的可裁性未受影响。

### 未测边界（逐条，均不作通过宣称）

1. **hardened runtime + notarized 形态**：无 Developer ID 账号，公证链不可跑。已测的是 ad-hoc + hardened runtime（当前发行形态本身，见 `ADR-020` 发行真相），notarized 一侧空白。取得 Developer ID 后须重跑本报告第四、五节。
2. **TCC 首次授权弹窗的归因与文案**：本票两条启动路径均继承了终端会话既有的 Desktop/Documents 授权，未触发弹窗。Finder 双击启动、无既有授权的 `.app` 首次触达时的弹窗归因（归 app 还是归被包裹的子进程）与错误码形态未测。已测且确定的部分是：TCC 拒绝与 Seatbelt 拒绝在 `errno` 与文案上同形（第六节）。
3. **gondolin 冷启动与常驻内存**：见上。

### 已知坑的命中情况（遇到即登记，不修）

- **Go 系 TLS 在 Seatbelt 下校验失败**：本票工作负载为 `/bin/cat`、`/bin/cp`、`/usr/bin/nc`、`/bin/sh`、CPython，未跑 Go 程序，未命中。srt 为此提供的开关是 `enableWeakerNetworkIsolation`（削弱网络隔离），走乙路则无代理、不涉此开关。
- **Apple Events 默认封锁（`-600`）**：本票未调 Apple Events，未命中。srt 的 `allowAppleEvents` 按其 README 自述会直接移除代码执行隔离——若将来有此需求，属能力面扩张，须另裁。
- **网络域名过滤不可得**：Seatbelt 机制上限为 ip/port，非坑而是边界，已在第四节记明。

---

## 九、件六：等级—能力绑定表升机器可读门

`ADR-018` 未决 3 的触发条件（首个申请超出 `none` 能力面的票）已到，随本票落地。

### 形态（`[需架构拍板]`）

三件套，沿 `release/scripts`／`skin-r2-ledger` 已有体例，落在 `apps/desktop/scripts/`（`ADR-018` 决定四把隔离归 Rust 宿主层，被扫描面即宿主源码）：

| 文件 | 职责 |
|---|---|
| `isolation-binding-lib.mjs` | 纯函数：解析 ADR、校验登记册 |
| `assert-isolation-binding.mjs` | CLI：读真文件、非零退出 |
| `assert-isolation-binding.test.mjs` | 红绿证 12 例 |

接线两处：`lint:isolation-binding` 单跑入口；`test:e2e` 链内挂两处（`node --test` 清单加测试文件，assert 链在 `assert-test-count` 前加 CLI）。

**真源单一**：等级闭集（决定一表）、等级—能力绑定（决定五表）、当期等级（文件头声明）三者一律从 `ADR-018` 正文解析，门内不留第二份副本。

**本批新增概念恰一个：能力登记册**（`capabilityLedger`）。它登记宿主生产码里每一个「把 argv 交给 OS 执行」的原语属哪条能力、要求哪个隔离等级。当前一条：

```js
{ capability: 'host-codesign-probe', program: 'codesign', requiredLevel: 'none',
  anchor: 'apps/desktop/src-tauri/src/lib.rs' }
```

登记册住代码而非运行时配置，依 `ADR-017` 决定三「白名单变更是代码变更，走 review 与门禁」。不引入新持久化格式、不引入新依赖、不引入状态机。

### 三条判据

- **R1 契约自洽**：当期等级须在决定一闭集内；决定一与决定五两表的等级集合须同集同序。
- **R2 无反例即无等级**（决定一末条）：当期等级高于最低档时，`docs/engineering/sandbox-probe-1.md` 内须逐类登记越界反例——门检三条字面标记「读策略外路径：被拒」「写策略外路径：被拒」「连策略外地址：被拒」，缺哪类报哪类。本报告第五节已按此口径写入三条。
- **R3 能力面不得越档**：登记册与生产码双向锁——生产码出现未登记的 spawn 触红，登记册留着生产码里已不存在的 spawn 亦触红；且每条能力所需等级不得高于当期等级。生产码取值时每份 `.rs` 在首个 `#[cfg(test)]` 处截断，测试块不计入能力面。

### 红绿证

单测 12 例全过（`node --test scripts/assert-isolation-binding.test.mjs`）：绿证两例（构造契约、仓内真 ADR + 真宿主源码），注入八例（越档、未登记原语、登记册脱节、两表不对齐、等级不在闭集、升档无反例、升档缺一类反例、缺档外等级值），另两例锁「三类反例齐全时放行」与「测试块截断有效」——后者防的是判据恒红。

CLI 在干净仓库为绿：

```
isolation-binding passed（当期等级 `none`；闭集 none < process < os_confined < container；扫描 6 份宿主源码）
```

端到端红证两轮，在真仓库注入后跑真 CLI，跑毕由备份还原（还原后 `shasum` 与注入前逐字节相同，`git status` 只余三个新增未跟踪文件）：

```
# 轮一：生产码插入 std::process::Command::new("sandbox-exec")
isolation-binding failed (1):
- 生产码出现未登记的执行原语：spawn `sandbox-exec`（apps/desktop/src-tauri/src/material_store.rs）——先在能力登记册立项并给出所需隔离等级
exit=1

# 轮二：把它登记进册，requiredLevel 写 os_confined（票面点名的那条反例）
isolation-binding failed (1):
- 能力面超出当前隔离等级：「controlled-script-exec」（spawn `sandbox-exec`）要求 `os_confined`，当期只有 `none`——当期允许的最高档是「只读、无副作用；一切写入与外发仍走既有 gate/confirmation」
exit=1
```

第二轮即 `ADR-018` 门禁条「能力面超出当前隔离等级所允许的最高档必须触红」的实证。

---

## 十、若 Seatbelt 不可行的降档路线

主测成立，故降档路线**当期不需要启用**。其证据链一并记下，供 Seatbelt 在后续 macOS 大版本失效时直接取用：

`process` 级的判据是「独立 OS 进程，崩溃与内存不互穿；仍共享文件系统与网络」（`ADR-018` 决定一）。它零额外分发成本，本票的 spawn 路径已证 `.app` 内起子进程无障碍。但 `process` 级在决定五绑定表里只到「ADR-004 定义的无损级动作」，**够不到脚本执行所需的写入面**——降档路线因此不能只降隔离等级，须同时把写入面收成「专用 scratch 分区 + 产物经 FileOpsPlan／无损级门准入案内」，即以准入控制补隔离之不足。`ADR-018` 决定二明记准入控制不等于隔离，故该路线一旦启用，能力声明只能写 `process`，不得借 scratch 分区之名声称 `os_confined`。此路线是否成立**不由本票预授**，须在启用时另裁。

---

## 十一、待架构裁决

1. **裁点一**：Node sidecar 嵌 srt vs Rust 自研 profile 生成。代价表见第七节，其中一行的前提已被同日落地的 `ADR-022` 改写（该节末已订正）。分界在是否需要域名级网络准入。`ADR-022` 未决 4「与本票裁点一共用一个 sidecar 的可行性」的输入一并在该节给出：乙路不需要 sidecar，共用问题只在选甲路时成立。`[需架构拍板]`
2. **绑定表门的形态**：三件套位置、能力登记册作为唯一新增概念、R1–R3 三条判据的口径。`[需架构拍板]`
3. **`EXEC-SCRIPT-1` 是否排产**、走 Seatbelt 还是降档：凭本报告另裁。本票不自行清账。
4. **`ADR-018` 当期等级不动**：`none` 保持。等级晋升须随实现同批取得反例（决定五顺序纪律），本报告的反例只证原语可行与判据可满足，不证本仓已具备该等级。

---

## 来源

- 立票依据：`docs/decisions/ADR-017-controlled-command-execution.md`「2026-07-26 重启裁定」「隔离前置链」两节；`docs/decisions/ADR-018-execution-isolation-and-sandbox.md` 决定一、二、四、五与未决 1、3；票表行 `docs/architecture/implementation-readiness.md:305`（本报告成文时的行号，仓库固定坐标见下）。
- 施工期新增依据：`docs/decisions/ADR-022-pi-lane.md` 决定一与未决 4（2026-07-27 转 `Accepted`，`main` @ `296c047`、`69cd989`，本票施工期间落地）。
- 仓库固定坐标：本报告的门与结论锚定 `main` @ `69cd989`（`docs(architecture): pi lane 立线入图`）。
- 案头对照（史料线索，本票未重做）：`archive/research-2026-07-27-parallel-survey/sandbox-desk-survey.md`。
- srt 一手取值：npm registry `@anthropic-ai/sandbox-runtime@0.0.67` 元数据；`github.com/anthropic-experimental/sandbox-runtime` 的 `package.json`、README 与 git tree（文件字节数）。
- gondolin 与 QEMU 取值：`github.com/earendil-works/gondolin` README；`brew info qemu`、`brew deps qemu`。
- 本机取值：`sw_vers`、`uname -a`、`sysctl`、`codesign -dv --verbose=4`、`man sandbox-exec`。
