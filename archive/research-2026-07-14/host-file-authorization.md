# 调研 B：宿主文件授权持久化——macOS security-scoped bookmark、Tauri v2、TCC

- 调研范围：`docs/decisions/ADR-004`、`ADR-005`、`archive/.../47-架构决定-文件操作分级.md`「sources 声明」一节、`ADR-010`（CASE-ROOT-1 → MATERIAL-INGRESS-1 前置）
- 调研日期：2026-07-14
- 纪律：取形不取码；置信度标注 ✓（本次实抓，注明 URL/日期）/ ※（训练语料，截至 2025-05，可能漂移，已明示）；查不到写「未能核实」，不冒充实抓
- 仓库现状核对方式：只读勘查（Explore agent），未修改仓库任何文件

---

## 0. 结论先行

**核心问题「用户选目录授权后，应用重启/系统重启后还能不能读？」的答案：能——但不是因为 bookmark，而是因为 Courtwork 现在根本不在 App Sandbox 里。**

Courtwork 当前分发形态（已核实于仓库）：`apps/desktop/src-tauri/tauri.conf.json` 的 `bundle.macOS.signingIdentity` 是 `"-"`（ad-hoc 签名），`capabilities/main.json` 里没有任何 `fs:*` 权限、`Cargo.toml` 里没有 `com.apple.security.app-sandbox` entitlement、仓库里没有任何 `.entitlements` 文件。这意味着 Courtwork 桌面进程**不是**沙盒进程。security-scoped bookmark 是 App Sandbox 用来解决"沙盒进程重启后看不见容器外文件"这个问题的机制；没有沙盒，这个问题本身不存在，bookmark 因此是可跳过的机制，不是必需品（✓ 见第 1 节）。重启后能不能读，退化成一个和十年前 Mac 软件一样朴素的问题：这个路径的 POSIX 权限允许不允许、这个目录是否在 TCC 保护类别里、TCC 是否已经同意过。

**但「注册一次免每次提醒」这条产品承诺目前不能被无条件兑现，卡点不在 bookmark，而在签名身份稳定性——这是本次调研最重要的发现。**

TCC（Desktop/Documents/Downloads/可移动卷/网络卷等类别）对非沙盒 app 的授权记忆是操作系统管的，按 app 的**代码签名身份**（Team ID / 设计需求）来记账，不需要 app 自己存任何 bookmark blob（✓ 第 3 节）。这本该让「选一次、免每次提醒」直接成立。问题是：**ad-hoc 签名（`codesign --sign -`，也就是 Courtwork 现在 `signingIdentity: "-"` 的配置）没有稳定身份，macOS 按二进制内容摘要（CDHash）识别应用，每次重新构建/发新版都被当成"新 app"**，此前的 TCC 授权大概率作废、需要用户重新走一遍选择器（✓ 第 1、3 节，多个独立三方来源交叉印证）。这条风险和 bookmark 完全无关，是 Courtwork 当前真实配置的现实，不是假设情景——只要产品线继续用纯 ad-hoc 签名发版，「注册一次免每次提醒」这条承诺在每次发新版后都会被打破一次。

**第三个发现同样重要且是本次勘查代码时顺带发现的**：`apps/desktop/src/case/NewCaseDialog.tsx` 当前用 HTML `<input type="file" webkitdirectory>` 取目录，这个输入类型在 WebView 里**原理上就拿不到绝对路径**（只有相对文件名 + File 对象），所以 `App.tsx` 的 `createCase()` 现在永远把 `folderPath` 写成 `undefined`——不是漏接，是这条路线本来就接不出宿主路径，也就不会触发 Powerbox 授权、不会落任何 `com.apple.macl` 记号。CASE-ROOT-1 要做的不是"给现有输入加一层持久化"，而是**换一条能拿到真实宿主路径、且经过系统选择器授权的输入通路**（原生 dialog 插件，或用仓库里已有的 `objc2-app-kit` 依赖直接调 NSOpenPanel）。

**Tauri v2 层面的结论（本次调研的第二个核心问题）**：`tauri-plugin-persisted-scope` 持久化的是 Tauri **自己**的内部 glob 路径允许/拒绝表（IPC 命令层的信任边界），和 macOS 操作系统级授权毫无关系；`@tauri-apps/plugin-fs` 虽然导出了 `startAccessingSecurityScopedResource`/`stopAccessingSecurityScopedResource`，但官方文档原文写明"Other platforms: does nothing"——在 macOS 上是空操作，只在 iOS 生效。Tauri 官方 issue #3716（专门请求 macOS security-scoped bookmark 支持）至今仍是打开状态。**这个区分对 Courtwork 目前无实际影响**（因为不沙盒），但如果未来做 MAS/沙盒分发，必须清楚：Tauri 不会替你做这件事，需要自己在 Rust 侧写。此外 Courtwork 的 `Cargo.toml` 里根本没有引入 `tauri-plugin-fs`/`tauri-plugin-dialog`，上述插件生态目前对本仓库是纯理论参照，不是已接入的依赖。

---

## 1. macOS security-scoped bookmark 的现实

### 1.1 非沙盒 vs App Sandbox 的行为差异

✓（GitHub `tauri-apps/tauri` issue #3716，2026-07-14 抓取；lapcatsoftware.com/articles/FullDiskAccess.html，2026-07-14 抓取；eclecticlight.co 2025-11-08 抓取，交叉印证一致）

| | 非沙盒（Courtwork 当前） | App Sandbox（MAS 或显式声明 `com.apple.security.app-sandbox`） |
|---|---|---|
| 内核层文件访问 | 与登录用户同权限，无 Seatbelt 容器限制 | 仅能访问自己容器 + 系统显式放行的极小集合，其余路径 `open()` 直接被内核拒绝 |
| 选目录后当次 session 能否用 | 能，全程可用 | 能，全程可用（Powerbox 授予的 security-scoped URL） |
| **重启后能否再用同一目录** | **能**——只要 POSIX 权限允许、TCC（如适用）已同意，不需要 app 存任何东西 | **不能**，除非 app 自己创建并持久化了 security-scoped bookmark，并在下次启动时 resolve + `startAccessingSecurityScopedResource()` |
| 是否受 TCC 影响 | 受影响（Desktop/Documents/Downloads/可移动卷/网络卷等类别，见第 3 节），但 TCC 的记忆是 OS 管的 | 同样受 TCC 影响，且叠加在 Sandbox 之上——两层都要过 |
| bookmark 是否必需 | **不是必需品，可跳过** | **是必需品**，否则每次重启都要重新弹选择器 |

社区原话（terreng，Tauri issue #3716）：「On macOS, to my knowledge, this restriction only applies to Mac App Store (MAS) builds, since the App Sandbox is required. By default, it doesn't apply to applications that are distributed outside of the App Store since the App Sandbox is not required.」——与 lapcatsoftware 对非沙盒 app 权限模型的独立描述一致。

### 1.2 两个 entitlement 各自何时必需

✓/存在冲突信息，如实呈现（appcoda.com、GetFolderAccessMacOS README 经 WebSearch 摘要交叉核实；Apple 官方 Entitlement Key Reference 页面本次抓取失败，见第 9 节说明）

- `com.apple.security.app-sandbox`：Tauri **默认不加**这个 entitlement；只有当开发者手工建 `Entitlements.plist` 并在 `tauri.conf.json` 里显式引用时才会启用（✓ 见 v2.tauri.app/distribute/app-store/ 摘要）。这是两个 entitlement 是否有意义的总开关。
- `com.apple.security.files.user-selected.read-write`：**仅在沙盒化前提下**才有效果——授权应用读写用户通过 Open/Save 面板选中的容器外文件/目录（当次 session）。非沙盒时声明这个键没有任何作用。
- `com.apple.security.files.bookmarks.app-scope`：**仅在沙盒化前提下**用于解析"跨 session 复用的 app-scoped bookmark"（例如重启后自动恢复上次选中的文件夹）。**注意**：搜索到的信息存在冲突——部分官方归档文档说需要显式声明该 entitlement 才能启用 app-scope bookmark；但也有开发者论坛帖子称"这个 entitlement 实际上不必要、没有效果"（可能是某个 macOS 版本后 Apple 放宽了要求）。本次未能进一步核实到底哪个是当前准确行为，如实标注为**未能完全核实**——建议 Courtwork 如果未来真的要做 MAS 分发，此处必须用真机在当前 macOS 版本上实测，不要凭本报告或任何二手资料假设。

结论：**在 Courtwork 当前的直接分发（非 MAS、非沙盒）形态下，这两个 entitlement 都不必要、声明了也不会生效。** 它们只有在评估未来是否上架 Mac App Store 时才需要重新拾起。

### 1.3 「直取形状 / 改造取形」标注

- Apple 的 bookmark 创建-持久化-解析-刷新流程（见第 4 节）是操作系统契约，不是可 vendor 的第三方库；标注为**不适用**（vendored 概念不适用于系统 API）。
- 对 Courtwork **当前**形态：整套机制**不适用**（不沙盒不需要）。
- 对 Courtwork **未来假设的 MAS 分发**：需要**改造取形**——照 Apple 文档描述的标准流程自己在 Rust 侧实现（create on pick → 用稳定 id 持久化 blob → 使用前 resolve + start/stopAccessingSecurityScopedResource → 检查 stale 标志 → stale 则用仍持有的访问权重新生成并覆盖旧 blob → 只有 resolve 彻底失败时才重新弹选择器），不建议整体引入某个第三方 crate（本次未核实 crates.io 上是否存在成熟维护的 "security-scoped-bookmark" crate，如需要应临时查一遍，不要假设没有或有）。

---

## 2. Tauri v2 提供到哪一层

### 2.1 三层各自的职责（均为本次直接读取源码/官方文档确认）

✓ `tauri-plugin-persisted-scope` 源码直读（`raw.githubusercontent.com/tauri-apps/plugins-workspace/v2/plugins/persisted-scope/src/lib.rs`，2026-07-14）：

该插件的全部逻辑是：监听 `tauri::fs::Scope` 的 `PathAllowed` 事件，把当前允许/拒绝的 glob 路径列表（`Scope { allowed_paths: Vec<String>, forbidden_patterns: Vec<String> }`）用 `bincode` 序列化写入 app data 目录下的 `.persisted-scope` 文件；启动时读回并逐条调用 `scope.allow_file()`/`allow_directory()` 重新灌回运行时 `Scope` 对象。**全程没有出现任何 `NSURL`、`bookmarkData`、`SecurityScoped` 相关代码，也没有任何 `#[cfg(target_os = "macos")]` 分支**——它是纯 Rust、跨平台完全一致的实现，操作的是 Tauri 自己发明的数据结构，不是操作系统提供的任何东西。

✓ `@tauri-apps/plugin-fs` JS API 官方参考（v2.tauri.app/reference/javascript/fs/，2026-07-14）原文（节选）：

> ## iOS security-scoped resources
> On iOS, the `fs` plugin automatically manages access to security-scoped resources when a file URL is accessed. This is required for files outside the app's sandbox (e.g., from file picker).
>
> ### startAccessingSecurityScopedResource()
> ...
> Platform-specific
> - **iOS:** Starts accessing the security-scoped resource.
> - **Other platforms:** does nothing.
>
> ### stopAccessingSecurityScopedResource()
> ...
> Platform-specific
> - **iOS:** Stops accessing the security-scoped resource.
> - **Other platforms:** does nothing.

这是**本次调研最关键的一手证据**：Tauri v2 官方文档明确写死，这两个函数在 macOS（"Other platforms"）上是空操作。fs 插件的 security-scoped 支持目前只覆盖 iOS。

✓ `tauri-apps/tauri` issue #3716（2022 年提出，2026-07-14 抓取时仍为 Open 状态，无合并 PR 关闭痕迹）与 `tauri-apps/plugins-workspace` issue #3030（经 WebSearch 摘要，2025-10-07 相关讨论）：负责该功能的开发者在贴子里坦承"能在 iOS 上复现需要 bookmark 的报错场景，但一直没能在 macOS 上复现出同样的报错"——说明连 Tauri 核心贡献者自己都还没把 macOS 这条路径的必要性/实现方式钉死，截至本次抓取，**没有证据表明 Tauri 官方生态已经有一个成熟、文档化、验证过的 macOS security-scoped bookmark 实现**。

### 2.2 分层结论

```
JS 前端 dialog.open()/fs 调用
        │
        ▼
Tauri capability & permission 系统（apps/desktop/src-tauri/capabilities/*.json）
   —— IPC 命令级白名单，决定"这条 command 允不允许被这个 window 调用"
   —— 纯 Tauri 内部信任边界，防的是"WebView 里被注入的恶意 JS"，与 OS 权限无关
        │
        ▼
tauri::fs::Scope（运行时 glob 路径 allow/deny 列表，可被 dialog 插件自动扩展）
   —— persisted-scope 插件持久化的就是这一层
   —— Tauri 认为"这个路径你可以碰"≠ 操作系统认为"这个进程可以碰这个路径"
        │
        ▼
操作系统实际 open()/read() syscall
   —— 非沙盒：ambient 权限 + TCC（如适用），与上面两层无关，Tauri 管不着也不用管
   —— 沙盒：还要过 Seatbelt，需要有效的 security-scoped URL（当次 Powerbox 或已 resolve 的 bookmark）
   —— Tauri 目前对这一层的 macOS 支持：iOS 有，macOS 官方声明是 no-op
```

对第 2 题的直接回答：**Tauri v2 的 scope 持久化只覆盖 Tauri 自己的路径 allowlist，不覆盖 macOS security-scoped bookmark。重启后 Tauri 认为你有权，操作系统层面认不认，取决于你是否沙盒——非沙盒时操作系统本来就没有"认不认"这道关卡（TCC 除外），所以现象上"能用"；沙盒时操作系统绝对不认，会直接在 syscall 层拒绝，而 Tauri 现在没有任何官方机制帮你补这一课。**

### 2.3 对仓库现状的核对

✓（Explore agent 只读勘查，2026-07-14）：`apps/desktop/src-tauri/Cargo.toml` 未引入 `tauri-plugin-fs`、`tauri-plugin-dialog`、`tauri-plugin-persisted-scope` 中的任何一个；`capabilities/main.json` 只有 `core:default` + `opener:allow-open-path` + `opener:allow-reveal-item-in-dir`，没有任何 `fs:*` 权限项。**以上整套 Tauri fs/scope/persisted-scope 生态目前对 Courtwork 是纯理论参照，代码库里一行都没有落地。** 这既是坏消息（CASE-ROOT-1 要从零设计）也是好消息（没有历史包袱，可以直接按第 7 节的建议设计，不需要迁移已有代码）。

### 2.4 「直取形状 / 改造取形」标注

- `tauri-plugin-persisted-scope`：**不建议直接引入**。理由见第 7 节——它解决的是"Tauri 自己的 IPC 路径白名单要不要跨重启记住"，而 ADR-010 决定四已经明确"绝对路径和授权只住 host"，Courtwork 的自定义 Tauri command 不会走通用 `@tauri-apps/plugin-fs` 的路径参数模式，这个插件的持久化对象（Tauri 内部 Scope）根本不会被填充。如果借鉴，只借鉴其"监听变更事件即时落盘、用带内容独立文件避免写冲突、bincode 原子替换"这几个实现细节的**形状**（改造取形），不建议把依赖本身接进来制造"第二套权限真相"。
- `@tauri-apps/plugin-dialog`（拿原生选择器路径字符串）：可以**直取**，功能单一、无额外黑盒持久化逻辑，风险低；或者用仓库里已经存在的 `objc2-app-kit` target 依赖（当前用于 macOS 窗口按钮同步）直接包 NSOpenPanel，两条路都合理，是团队偏好问题，不是本报告能替你们拍板的架构决定。

---

## 3. TCC 与目录类别

### 3.1 TCC 的性质与保护清单

✓（eclecticlight.co/2025/11/08/explainer-permissions-privacy-and-tcc/，2026-07-14 抓取，作者 Howard Oakley 是 macOS 内部机制领域公认的权威独立技术作者）

TCC 是独立于 App Sandbox 的第三层控制（第一层是文件系统 POSIX 权限/ACL，第二层是 SIP + Sandbox，第三层才是 TCC 隐私许可）。它**对沙盒和非沙盒 app 一视同仁**，只要访问的资源落在受保护类别里就会介入。截至该文（对应 macOS Tahoe）列出的受保护目录：

- `~/Desktop`
- `~/Documents`
- `~/Downloads`
- iCloud Drive
- 第三方云存储
- 可移动卷（USB/移动硬盘）
- 网络卷（SMB/AFP/NFS 等）
- Time Machine 备份

不在此列表、也不在 `~/Library/Application Support/com.apple.TCC` 这类系统级例外目录里的普通用户自建目录（例如 `~/CourtworkCases`），**对非沙盒 app 完全不受 TCC 管辖，读写永久畅通，不会弹窗，也不需要任何持久化机制**（✓ lapcatsoftware.com 独立验证同一结论：非沙盒 app 的权限本质上继承自 Terminal 的权限模型，未被专门列入隐私保护清单的目录不受限）。

### 3.2 「用户主动选目录」vs「代码直接读路径」的差别对待

✓（经 WebSearch 交叉核实多个来源，含 Apple Developer Forums、hacktricks.wiki 关于 `com.apple.macl` 机制的独立描述；※ 部分细节为训练语料，已明示）

- **代码直接构造路径读取**（例如硬编码 `~/Documents/xxx` 后直接 `readdir`/`open`）：如果落在 TCC 保护类别且此前未获得同意，**会触发系统弹窗**（"《App》想要访问您的《文稿》文件夹中的文件"），用户拒绝则 `Operation not permitted`。
- **通过系统选择器（NSOpenPanel/Powerbox）让用户主动选中该文件/目录**：**不会弹 TCC 提示**——用户点击"打开"这个动作本身就是显式同意（intent），系统会静默放行。这个隐式同意的落地机制是在被选中的文件/目录上打一个 `com.apple.macl` 扩展属性（记录被授权 app 的标识），使得后续该 app 对该具体条目的访问不再需要走 TCC 数据库问询。这与"Documents/Downloads 整个文件夹类别"的粗粒度授权是两套并存机制：前者精确到条目、随文件走；后者是类别级、随 app 身份走。
- 这正是「注册一次免每次提醒」承诺的技术基础——只要用户是**通过系统选择器**主动选的目录（而不是产品自己拼路径去扫），无论是精确到条目的 `com.apple.macl` 还是类别级 TCC 记忆，都**不需要 app 自己保存 bookmark**，OS 会记住。

### 3.3 「下载目录 / 邮件附件目录」两个例子的差别

- **下载目录（~/Downloads）**：标准 TCC 保护类别，走系统选择器选中一次、代码签名身份稳定的前提下，之后静默放行——「选一次免每次提醒」在此**可以兑现**（技术前提见 3.4）。
- **邮件附件目录（~/Library/Mail）**：✓（多个来源交叉印证，含 corelock.net、kolide.com/blog/macos-catalina-osquery）**不是标准的、可通过选择器豁免的 TCC 折叠类别**，Mail 数据被视为高敏感类别，非沙盒 app 想读它基本只有引导用户去系统设置手动开「完全磁盘访问权限」（Full Disk Access）一条路，选择器选中单个文件可能对该文件本身生效（`com.apple.macl`），但要稳定枚举整个附件目录大概率仍会撞见更严格的门槛。**这个来源类型不能直接套用"选一次就好"的产品文案**，需要单独设计降级提示（如实告知"需要在系统设置里额外开一次完全磁盘访问权限，且这一步系统不提供程序化探测方式，只能靠用户操作后重试确认"）。

### 3.4 「注册一次免每次提醒」能不能兑现——完整结论

**能，但有一个隐藏前提没被写进任何 ADR：app 的代码签名身份必须稳定。**

✓（evoleinik.com/posts/macos-dev-signing-preserve-permissions/，2025-12-21 发布，2026-07-14 抓取；GitHub `NousResearch/hermes-agent` issue #49110 标题与内容摘要独立印证同一结论；electron-builder issue #9529 标题"macOS Camera & Microphone broken with ad-hoc signing"从另一个 TCC 类别再次印证同一机制）：

> macOS ties permissions... to an app's code signature. When you sign with `codesign --sign -`（ad-hoc signing）, macOS generates a different signature each rebuild... macOS TCC identifies the app solely by its code digest (CDHash), which changes with every binary update.

以上验证的场景是 Accessibility/Input Monitoring/Camera/Microphone 这几类 TCC 权限，**Documents/Downloads/Desktop 这几类文件夹权限没有被同一批来源逐一单独测试**，但它们共享同一套 TCC 身份匹配底层机制，本报告据此**推断**（非直接实测验证，如实标注置信度）：ad-hoc 签名同样会让文件夹类 TCC 授权在每次重新构建后作废。**这一点建议 Courtwork 用真机做一次专项验证**（拿两个不同哈希的 ad-hoc 构建，测试第二个构建能否复用第一个构建换来的 Downloads 授权），本报告不能替代这个实测。

`apps/desktop/src-tauri/tauri.conf.json` 已核实 `bundle.macOS.signingIdentity: "-"`，`docs/status/current.md:31` 也已如实记录"构建为 ad-hoc 且未公证"这个边界——**说明团队已知晓签名策略的存在，但目前没有证据表明这个决定已经和「sources 声明・注册一次免每次提醒」这条产品承诺做过交叉评估**。这是本报告要回灌的第一优先级发现（见第 8 节）。

### 3.5 诚实降级形态

按项目"静默降级零容忍"不变量，TCC 缺配置/被拒绝时不能装作扫描成功返回空列表，必须显式呈现且可操作：

- 首次访问某来源目录前，先做一次轻量探测（如 `readdir` 或 stat 单个已知文件），失败时明确捕获 `EPERM`/`Operation not permitted`，映射为一个专门的状态（例如 `needs_reauth` / `denied`），不得吞掉异常降级成"来源为空"。
- 界面上明确告知"需要重新在弹出的系统对话框中选择《下载》目录"（对可通过选择器兑现的类别），或者"需要在系统设置 → 隐私与安全性 → 完全磁盘访问权限中手动开启"（对 Full Disk Access 类别，如邮件附件目录），两种降级路径的文案不能混用。
- 如果确认是签名身份变化导致的失效（例如版本号变化 + 之前记录过的 source 突然失败），可以在错误提示里额外提示"应用刚完成更新，请重新授权一次"，把工程债务转成对用户诚实的一句话，而不是让用户自己去猜。

---

## 4. 失效与重定位

### 4.1 bookmark 失效的触发条件

✓（Apple 官方"Enabling Security-Scoped Bookmark and URL Access"/"Using Bookmark Data" 页面本次因需要 JavaScript 渲染未能直接抓取正文，以下结论来自多个独立三方源的一致复述，交叉印证后置信度较高，但非本次逐字抓取官方原文，如实标注）：

- 目录/文件被**移动或重命名**：通常**不会**立即失效——bookmark 底层锚定的是文件系统对象标识（如 volume UUID + inode 一类信息），不是纯路径字符串，系统会尽力跟随移动/重命名后的新位置解析成功，但会把 `bookmarkDataIsStale` 标记为 `true`，提示调用方"这次解析成功了，但你存的旧 blob 已经过时，请用当前 URL 重新生成一份新 bookmark 并覆盖旧的"。
- **卷被卸载**（U 盘拔出、网络共享断开）：解析当场失败（不是 stale，是 resolve 直接抛错/返回 nil），卷重新挂载后通常能恢复。
- **系统升级/大版本更新**：有历史先例出现 bookmark 大规模失效需要重新走一遍选择器（尤其是跨大版本，如 10.x 到 11 的过渡期），当前版本是否仍有此风险未能核实，建议不要假设"过了这个坑"。
- **文件被真正删除后用同名重建**：大概率失效，因为底层锚定的对象标识已经不同。

### 4.2 检测与刷新

- 检测：resolve 时传入的 `bookmarkDataIsStale` out 参数（Swift 为 `inout Bool`）。
- 刷新：仍持有当次访问权时，直接对当前 resolve 出来的 URL 重新调用一次 `bookmarkData(options: .withSecurityScope, ...)` 生成新 blob 并覆盖旧的持久化记录；**不需要重新弹用户选择器**——这是 stale 和"彻底失败"最大的区别：stale 是"能用但要顺手续期"，彻底失败才是"必须打扰用户"。

### 4.3 与项目既定 content hash 重定位策略的关系：互补，不是重复

这一点是本题的关键判断，直接回答任务问题："两者是互补还是重复？"——**互补，且分工清晰，不建议用一个替代另一个**：

| | bookmark stale/resolve | content hash 重定位 |
|---|---|---|
| 回答的问题 | "操作系统还能不能帮我找到这个路径对应的东西" | "我现在打开的这个东西，是不是案件记录里那份原件（内容层面）" |
| 工作层级 | 文件系统对象标识（卷 UUID/inode 一类），操作系统内部实现，App 不可见细节 | 文件字节内容的密码学摘要，与文件系统实现无关 |
| 能不能证明"零字节变动" | 不能——bookmark 只管"找不找得到"，找到的东西内容被改过它也不知道 | 能——这正是它存在的目的 |
| 能不能跨越"系统层面已经找不到"的场景（比如换了台电脑、bookmark 彻底失效） | 不能，只能回退到重新选择器 | 能——只要还知道候选目录，可以扫描内容匹配重新定位，不依赖操作系统底层标识 |
| Courtwork 是否需要 | 仅在未来真做沙盒分发时才需要 | 已经是既定架构决定（ADR-004"原件红线精细化"），当前就需要 |

建议：**即使未来真的做了沙盒分发、引入了 bookmark，也不要让"bookmark resolve 成功"单独作为"文件存在且完好"的证据——resolve 成功之后，仍然要按既定策略做一次 content hash 复核，两层校验叠加，任何一层失败都要走既定的显式降级路径，不能因为 bookmark 层"能打开"就跳过 hash 校验。** 这与 ADR-010 决定四"provider 前重验原件/ReadingView hash；漂移、删除、需 OCR 或缺材料必须显式阻断"的既有纪律完全一致，bookmark 只是在这道复核之前，多一层"能不能拿到字节"的操作系统辅助定位，不改变复核本身要不要做。

---

## 5. 跨平台代价

### 5.1 Windows

✓（learn.microsoft.com UWP AccessCache 文档摘要；v2.tauri.app/distribute/windows-installer/ 摘要，2026-07-14）

Tauri 默认的 Windows 分发形态是 MSI（WiX）或 NSIS `-setup.exe`——都是传统 Win32 桌面安装，**不带任何 AppContainer/沙盒**，进程权限就是登录用户的 NTFS ACL 权限，选完目录之后天然永久可读写，**不需要任何等价于 security-scoped bookmark 的机制**。

等价机制只在 UWP/MSIX 打包（`Windows.Storage.AccessCache.StorageApplicationPermissions.FutureAccessList`，基于字符串 token、最多 1000 条、显式 `Add`/`GetItemAsync`）下才存在——这是 AppContainer 沙盒对应的 Windows 版"bookmark"，但只有 Tauri 明确走"Microsoft Store"打包路径时才可能涉及，当前不适用。

### 5.2 Linux

✓（flatpak.github.io/xdg-desktop-portal 文档摘要，2026-07-14）

Tauri 默认的 Linux 分发（deb/rpm/AppImage）同样不带沙盒，普通 Unix 权限即可，不需要等价机制。等价机制只在 **Flatpak** 打包下存在——`xdg-desktop-portal` 的 Document Portal + Permission Store（数据落在 `$XDG_DATA_HOME/flatpak/db`，按 app id 记录持久授权），概念上与 macOS bookmark、Windows FutureAccessList 是同一形状的三种平台实现。Tauri 官方 bundler 列表里没有 Flatpak（Snapcraft 有，✓ 见 v2.tauri.app/distribute/），Snapcraft 的 strict confinement 模式下也有自己的 interface 授权持久化（`home`/`removable-media` 等接口，由 snapd 记录连接状态），但本次未深入核实 Tauri Snapcraft 打包默认是否走 strict confinement——如实标注**未能核实**，不影响当前结论（Courtwork 现在的目标分发形态是 macOS deb/rpm/AppImage 都不涉及）。

### 5.3 抽象边界该切在哪

三个平台的共同点：这套"来源目录声明 → 持久授权 → 失效检测 → 重新授权"的**形状**是一致的（有沙盒才需要 token/bookmark 持久化，没有就是普通权限），但**实现细节完全平台私有**（macOS 是 NSURL bookmark，Windows 是 AccessCache token，Linux 是 D-Bus + Permission Store）。按项目纪律"Rust 只做受控宿主能力，不理解法律语义"，正确的边界应该是：

- 在 `apps/desktop/src-tauri/src/` 内部按 `cfg(target_os = ...)` 分支实现，三个平台各自处理自己的授权细节；
- 对 TS 侧暴露一个**平台无关**的 host port（可以是现有 `packages/tools/src/file-ops-host.ts` 里 `FileOpsHost` 的自然延伸，或一个新的 `CaseRootHost`），方法签名里不出现 `bookmark`/`token`/`portal` 这类平台词汇，只暴露语义化的动词，例如：

```ts
interface CaseRootHost {
  authorizeSource(kind: 'case-root' | 'inbox-source'): Promise<
    | { status: 'authorized'; sourceId: string; displayName: string }
    | { status: 'canceled' }
  >;
  verifySource(sourceId: string): Promise<'ok' | 'needs_reauth' | 'not_found'>;
}
```

- Rust 内部决定"needs_reauth"具体是因为 bookmark stale、TCC 拒绝、签名身份变了、还是卷没挂载——这些原因分类可以在错误 payload 里带一个平台无关的 reason 枚举，但绝不能把 `NSURL`/`FutureAccessList` 这类类型泄漏到 schema 或 TS 层，这与 ADR-010 决定四"绝对路径和授权只住 host"的既有纪律完全一致，只是把这条纪律显式扩展到"授权状态"本身，不只是"路径"。

---

## 6. 大文件哈希

### 6.1 没有找到"分块 hash 是行业惯例"这个说法的强证据——这里有必要拆开两个经常被混为一谈的概念

- **流式/增量哈希**（streaming/incremental）：✓（BLAKE3 官方仓库文档摘要，2026-07-14）任何现代哈希库（Rust `sha2`/`blake3`、Node `crypto`）都支持边读边喂（`update()` 循环），不需要把整个文件读进内存——这是**内存效率**手段，Courtwork 处理"整套扫描卷宗"这种大文件时必须用这个方式读取，但这跟下面的"分块"不是一回事。
- **内容定义分块**（content-defined chunking，rolling hash 分块，如 restic/Borg/rsync --checksum 的思路）：是为了**块级去重/断点续传**设计的——目的是"两份大文件有 90% 内容相同时，只需要传输/存储不同的那 10%"。Courtwork 目前的需求（"移动前后内容哈希比对留痕，证明证据零字节变动"+"找不到时靠 hash 重定位"）**不需要**这个复杂度：直接对整份文件做一次流式强哈希，一个文件一个哈希值，够用且实现简单，没有分块的必要性。
- **头尾 + size 的"快速哈希"**（partial hash，只取文件头部/尾部若干 KB 加文件大小）：※（训练语料）确实存在于一些通用去重/文件管理工具里，用作第一轮廉价预筛（配合更廉价的 size 比较），但**绝不能作为最终判定依据**——碰撞概率远高于全量强哈希，尤其法律证据"零字节变动"的举证场景不能走这个捷径。可以作为一个可选的性能优化前置步骤（"size 不一样直接排除，size 一样才算全量 hash"，这一步不需要动文件头尾，size 本身就是免费的元数据），但正式记录进 CaseFile/FileOpsPlan 的必须是全量强哈希。

### 6.2 建议采用的形状（※ 工程判断，非强来源支撑，已明示置信度）

- **算法**：SHA-256 是法律/取证场景事实标准（法院、公证处、鉴定机构普遍认可），即使 BLAKE3 更快，考虑到"这份哈希未来可能要拿给案外人验证"的场景，建议**至少保留 SHA-256 作为对外可验证的哈希**；如果性能确实是瓶颈（超大卷宗、频繁重扫），可以额外算一份 BLAKE3 做内部快速比对，两者不冲突，不建议用 BLAKE3 完全取代 SHA-256。
- **计算方式**：全量流式哈希，不分块，不做 content-defined chunking；relocate/去重场景先用 `(size)` 做免费预筛，size 相同才对候选文件算全量哈希。
- **超大文件的现实代价**：SHA-256 流式计算大致是 CPU 密集但线性的（几百 MB/s 量级，具体取决于硬件），对"一整套扫描卷宗"（通常几十到几百 MB 的 PDF/图片合集，很少见到单文件到 GB 级别的情况）不构成实际性能问题；如果未来真的出现 GB 级单文件，把哈希计算放到后台异步任务、避免阻塞 UI 即可，不需要改变算法或引入分块。

### 6.3 顺带核实到的仓库内契约漂移（不在本题范围但必须提出）

✓（Explore agent 只读勘查，2026-07-14）：`packages/tools/src/file-ops-host.ts` 里 `hashBytes()` 的实际实现是 **FNV-1a 64 位**（非加密、快速校验和），代码注释明确写"漂移/比对用途，非安全哈希"；但 `packages/legal/src/schemas/case-file.ts` 的 `CaseFileEntrySchema.contentHash` 和 `packages/schemas/src/file-ops-plan.ts` 的 `contentHashBefore/contentHashAfter` 字段注释都写的是"如 sha256 hex"。**schema 文档承诺的是 SHA-256，实际运行时用的是 FNV-1a，两者不是同一算法，也没有一个统一封装模块。** 按项目"契约先行"纪律（schema 变化必须同步所有生产者、消费者），这属于需要修正的漂移，已回灌到第 8 节。

---

## 7. 对 MATERIAL-INGRESS-1 的落地建议与风险

### 7.1 CASE-ROOT-1 要解决的真问题排序

1. **换掉 `NewCaseDialog.tsx` 的 `<input type="file" webkitdirectory>`**——这是当前唯一"完全不工作"的部分，不是优化项，是阻塞项。建议引入 `@tauri-apps/plugin-dialog` 的目录选择，或直接用已有 `objc2-app-kit` 依赖包一个自定义 Rust command 调 NSOpenPanel（`canChooseDirectories = true`）。两条路都能拿到真实绝对路径并触发系统层面的隐式授权（`com.apple.macl`/TCC 记忆），选哪条是团队对"多一个官方插件依赖"与"多写约百行 FFI"的偏好取舍，本报告不替你们决定。
2. **不要引入 `tauri-plugin-persisted-scope`**——它持久化的对象（Tauri 内部 `fs::Scope`）不会被 Courtwork 的自定义 command 模式填充，接了也不解决问题，还会制造"存在但没用的第二套配置文件"。case root 的授权状态应该进 Courtwork 自己的 host-side 持久层（很可能是 ADR-010 里已经规划的 opaque case/material id 体系的自然延伸，而不是新造一个）。
3. **签名策略必须和 CASE-ROOT-1 一起评估，不能拖到之后**——如果继续纯 ad-hoc 签名，"sources 声明·注册一次免每次提醒"这条承诺在真实发版节奏下会反复被打破，用户会感知为"这个软件记性差/前后不一致"，这对信任是负资产（尤其考虑项目自身"信任前提：误删一次 = 信任归零"这种高标准）。至少应该评估切换到稳定的 Developer ID 签名身份（不必须公证，公证解决的是 Gatekeeper 首次运行拦截，是另一个问题；稳定 Team ID 才是解决 TCC 记忆持续性的那个变量）。这是一个签发证书/工程流程决定，不是本报告能替你们拍板的，但必须显式列为 CASE-ROOT-1 的前置风险项。
4. **content hash 复核不能被"路径能打开"替代**——不管走不走系统授权持久化机制，MaterialRef/CaseFile 落地时都要照既定纪律做 hash 复核，且用全量 SHA-256（见第 6 节），不要复用 `FileOpsHost.hash()` 现有的 FNV-1a 实现（那是为"移动前后快速比对是否变了"设计的，语义上和"这是不是那份原件"这个更强的举证需求不一样，即使数值上恰好都是"hash"，含义不能混用）。
5. **诚实降级路径要覆盖三种失败**：TCC 拒绝/未决（第 3.5 节格式）、卷未挂载/找不到路径（复用既有的 content hash 重定位设计）、签名身份变化导致授权失效（第 3.4 节提示文案）。三种失败目前在 ADR-010 的验收下限里还没有分别列出触红条件，建议补上（见第 8 节）。

### 7.2 风险清单

| 风险 | 触发条件 | 影响 | 建议缓解 |
|---|---|---|---|
| ad-hoc 签名导致 TCC 记忆失效 | 每次发新版 | 用户在案件文件夹恰好落在 TCC 保护类别时被反复重新提示，违背"注册一次"承诺 | 评估切换稳定 Developer ID 签名身份；发版前预期性提示"本次更新后可能需要重新授权来源目录" |
| `<input type=file webkitdirectory>` 残留路径没被替换干净 | CASE-ROOT-1 实现时如果只是"加一层"而不是"换一条路" | `folderPath` 继续是 `undefined` 或者只有相对文件名，功能表面能跑但拿不到可靠绝对路径 | 明确把这个输入组件的替换列为 CASE-ROOT-1 验收项之一 |
| 邮件附件目录被当作"和下载目录一样简单"处理 | 产品文案/工单描述直接照抄"选一次" | 用户在 Full Disk Access 门槛前卡住，找不到问题出在哪 | 邮件附件类来源单独设计降级引导文案（见 3.3） |
| content hash 实现语义不一致（FNV-1a vs 承诺的 SHA-256） | MATERIAL-INGRESS-1 如果直接复用现有 `FileOpsHost.hash()` | "移动前后内容哈希比对留痕"的举证强度弱于文档承诺 | 统一到 SHA-256，`FileOpsHost.hash()` 的用途与举证用途分离或替换实现（见第 8 节） |
| 未来若做 MAS 分发，团队误以为 Tauri 会自动处理 bookmark | 团队后续查阅过时资料或误读 persisted-scope 插件描述 | 沙盒化后功能大范围失效（文件选一次、重启就没了），且难定位是 Tauri 没做还是自己没接 | 本报告已把这条区分讲清楚，建议归档留痕，未来评估 MAS 分发时先重读本报告第 2 节 |

---

## 8. 回灌建议

### 8.1 回灌 ADR-004（文档生命周期与文件操作）

- 现有条款"移动/重命名先生成 FileOpsPlan...移动前后内容哈希比对留痕"没有指定哈希算法强度。建议补充一句：**"比对留痕使用的内容哈希必须是密码学强哈希（SHA-256 或更强），不得使用校验和类算法（如 FNV/CRC）冒充举证用途的内容哈希；两者若在同一系统中并存，命名与用途必须在 schema 注释与实现里同时清楚区分，不得共用字段语义。"** 直接动因：`packages/tools/src/file-ops-host.ts` 的 `hashBytes()`（FNV-1a）与 `packages/legal/src/schemas/case-file.ts`/`packages/schemas/src/file-ops-plan.ts` 的字段注释（"sha256 hex"）当前不一致，属于契约漂移，按"契约先行"纪律应视为需要清理的技术债，不应该放任到 MATERIAL-INGRESS-1 阶段才发现。

### 8.2 回灌 ADR-005（状态、隐私与安全）

- 现有"不可信输入的 MVP 最小集"覆盖的是外部内容（OCR、web fetch 等）的显式降级，**没有覆盖"宿主自身权限缺失/被拒绝"这一类降级场景**。建议在第 3 节补一条：**"宿主文件系统授权（TCC、卷挂载、签名身份变化导致的失效等）缺失或被拒绝时，必须显式呈现具体原因并给出可操作的下一步，不得返回伪成功的空结果或空来源列表。"** 这是"静默降级零容忍"这条核心不变量在"宿主授权"这个此前从未被讨论过的面上的具体化，直接对应本次调研第 3.5 节。

### 8.3 回灌 ADR-010 / CASE-ROOT-1 工单验收标准

建议在 CASE-ROOT-1 的验收下限里显式加入（目前 ADR-010 整体验收下限没有单独覆盖这一层）：

- 目录选择必须经系统原生选择器完成，不得使用无法产出绝对路径的 Web 表单控件；
- TCC 拒绝、卷未挂载、签名身份变化导致的授权失效三种情形必须能分别注入反例触红，且各自呈现不同的用户可读提示；
- 授权状态的持久化必须落在 host 自己的存储里，不依赖/不引入 `tauri-plugin-persisted-scope`；
- 签名策略（是否继续 ad-hoc）作为本工单的前置风险项在工单描述中显式列出，不隐含假设"选一次就永久有效"。

### 8.4 是否挑战了「sources 声明·注册一次免每次提醒」这条产品承诺

**部分挑战，不是推翻。**

- 技术上，这条承诺在"非沙盒 + 稳定签名身份 + 来源目录落在可被系统选择器豁免的 TCC 类别（Desktop/Documents/Downloads/可移动卷/网络卷）"这个前提组合下，**是可以兑现的**，不需要额外发明持久化机制，操作系统本身就会记住——这一点原承诺是对的，不需要推翻。
- 但承诺文本本身没有写出它依赖"稳定签名身份"这个前提，而 Courtwork 当前恰好不满足这个前提（ad-hoc 签名）。**如果不显式处理签名策略，这条承诺在每次发版后都会被打破一次**，这是需要回灌进 ADR 或至少工程记录的新增认知，不是当初拍板时能预见到的细节。
- "邮件附件目录"这个具体例子的措辞需要修正——它不属于"选一次就好"能覆盖的类别，需要单独的 Full Disk Access 引导文案，原文档如果继续把它和"下载目录"并列举例，容易让实现者误以为两者走同一套流程。

---

## 9. 来源清单

| 来源 | URL | 抓取日期 | 置信度 |
|---|---|---|---|
| Tauri Persisted Scope 官方文档 | https://v2.tauri.app/plugin/persisted-scope/ | 2026-07-14 | ✓ 本次实抓 |
| `tauri-plugin-persisted-scope` 源码（v2 分支） | https://raw.githubusercontent.com/tauri-apps/plugins-workspace/v2/plugins/persisted-scope/src/lib.rs | 2026-07-14 | ✓ 本次实抓（源码直读） |
| `@tauri-apps/plugin-fs` JS API 参考（含 security-scoped 函数原文） | https://v2.tauri.app/reference/javascript/fs/ | 2026-07-14 | ✓ 本次实抓 |
| Tauri Command Scopes 官方文档 | https://v2.tauri.app/security/scope/ | 2026-07-14 | ✓ 本次实抓 |
| Tauri issue #3716（macOS/MAS security scoped resources，长期 Open） | https://github.com/tauri-apps/tauri/issues/3716 | 2026-07-14 | ✓ 本次实抓 |
| Tauri plugins-workspace issue #3030（iOS/macOS 实现进展） | https://github.com/tauri-apps/plugins-workspace/issues/3030 | 2026-07-14 | ※ 经 WebSearch 摘要，未逐字抓取全文 |
| Tauri App Store 分发文档（entitlements 配置方式） | https://v2.tauri.app/distribute/app-store/ | 2026-07-14 | ※ 经 WebSearch 摘要 |
| Tauri Windows Installer 文档 | https://v2.tauri.app/distribute/windows-installer/ | 2026-07-14 | ※ 经 WebSearch 摘要 |
| Apple「Accessing files from the macOS App Sandbox」 | https://developer.apple.com/documentation/security/accessing-files-from-the-macos-app-sandbox | 2026-07-14 | 抓取失败（页面需 JavaScript 渲染），未能核实正文 |
| Apple「Enabling Security-Scoped Bookmark and URL Access」 | https://developer.apple.com/documentation/professional-video-applications/enabling-security-scoped-bookmark-and-url-access | 2026-07-14 | 抓取失败（页面需 JavaScript 渲染），未能核实正文，内容经三方来源交叉复述 |
| Apple「Using Bookmark Data」 | https://developer.apple.com/documentation/professional-video-applications/using-bookmark-data | 2026-07-14 | 抓取失败（页面需 JavaScript 渲染），未能核实正文 |
| Eclectic Light Company「Explainer: Permissions, privacy and TCC」（Howard Oakley） | https://eclecticlight.co/2025/11/08/explainer-permissions-privacy-and-tcc/ | 2026-07-14 | ✓ 本次实抓，作者是 macOS 内部机制领域公认权威独立作者 |
| lapcatsoftware「Every unsandboxed app has Full Disk Access if Terminal does」（Jeff Johnson） | https://lapcatsoftware.com/articles/FullDiskAccess.html | 2026-07-14 | ✓ 本次实抓（原文发表于 2022，机制未过时） |
| evoleinik.com「Preserve macOS App Permissions Across Rebuilds with Self-Signed Certificates」 | https://evoleinik.com/posts/macos-dev-signing-preserve-permissions/ | 2026-07-14 | ✓ 本次实抓（2025-12-21 发表） |
| GitHub `NousResearch/hermes-agent` issue #49110（ad-hoc 签名与 TCC 稳定性另案印证） | https://github.com/NousResearch/hermes-agent/issues/49110 | 2026-07-14 | ※ 经 WebSearch 摘要 |
| electron-builder issue #9529（ad-hoc 签名破坏 Camera/Microphone TCC，另一 TCC 类别印证同一机制） | https://github.com/electron-userland/electron-builder/issues/9529 | 2026-07-14 | ※ 经 WebSearch 摘要（标题与上下文） |
| Microsoft Learn「StorageApplicationPermissions.FutureAccessList」 | https://learn.microsoft.com/en-us/uwp/api/windows.storage.accesscache.storageapplicationpermissions.futureaccesslist | 2026-07-14 | ※ 经 WebSearch 摘要 |
| xdg-desktop-portal 官方文档（Document Portal / Permission Store） | https://flatpak.github.io/xdg-desktop-portal/ 、 https://github.com/flatpak/xdg-desktop-portal/wiki/The-Permission-Store | 2026-07-14 | ※ 经 WebSearch 摘要 |
| BLAKE3 官方仓库 | https://github.com/BLAKE3-team/BLAKE3 | 2026-07-14 | ※ 经 WebSearch 摘要 |
| Courtwork 仓库现状（`apps/desktop/src-tauri/*`、`apps/desktop/src/case/*`、`packages/tools/src/file-ops-host.ts` 等） | 本地仓库只读勘查 | 2026-07-14 | ✓ 本次直接读取仓库文件 |

---

### 附：本次调研未能核实的问题（如实列出，不代入假设）

1. `com.apple.security.files.bookmarks.app-scope` entitlement 在当前 macOS 版本下是否仍需显式声明——存在冲突信息，未能裁定，建议未来真需要时用真机实测。
2. Rust 生态里是否已有成熟维护的 "security-scoped bookmark" crate 可直接复用（而不必手写 objc2 FFI）——未检索 crates.io，未能核实，不应假设有或没有。
3. Tauri Snapcraft 打包默认走 strict 还是 classic confinement——未深入核实，当前不影响 Courtwork（目标分发形态不涉及 Snapcraft）。
4. ad-hoc 签名导致 TCC 失效这一机制，是否对 Documents/Downloads/Desktop 这几类"文件夹级"权限与已验证的 Accessibility/Camera/Microphone 权限表现完全一致——本报告是同机制推断，非逐类目独立实测验证。
