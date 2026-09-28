# 09 · 返回轨迹与对象命令共同语法

2026-09-16 · Fable 施工。沿 [FE-NAV-01…03](../../design/shell-control-plane-2026-09-12/navigation.md) 与 [Object Command grammar](../../design/object-command-grammar-20260914.md)；施工树 `claude-frontend-harness-20260916`。

## 裁定

| 项 | 裁定 | 依据 |
|---|---|---|
| 历史单位 | 地点只有两种：Home、某个 Chat（Session）。Settings、Chat 列表页、Attention 是画在地点之上的层，各自的返回控件先关它们；Back 不越过它们 | navigation.md §3（有可关闭 modal 先走其关闭） |
| 与浏览器 history / hash 的同步 | 冻结为**单栈**：Shell 栈只在本窗口内存；hash 仍只是 Settings 深链，不 pushState、不监听 popstate | navigation.md 首片须冻结同步策略；避免双回退 |
| 入口位置 | 侧栏 Home 行左端两个 32 方控件（`Back to <地名>` / `Forward to <地名>`），两端禁用；顶带左槽仍只放一个离开动作（侧栏开关 / Back to app） | interface-components「一个槽位一种离开动作」 |
| 恢复内容 | 离开 Chat 时记 `chat-reading` 的滚动锚点（只引用，不复制草稿）；返回时先经 `selectSession` 由真实 reader 重新读对象，渲染落位后再恢复锚点；焦点沿既有规则落在会话标题 / composer | navigation.md §4–§5 |
| 对象不可用 | reader 拒绝（404 / 其它）时：轨迹上该项标记 unavailable，视图落到 Home，控件下面一行 `<地名> no longer exists. Showing Home.`；项留在轨迹上可继续 Back，不换成同名对象 | navigation.md §6；packet §09「不回退成另一个看似相同的对象」 |
| 快捷键 | 未接。⌘[ / ⌘] 与 Alt+方向属宿主保留；两个控件可聚焦、可键盘操作 | navigation.md「快捷键可后置」 |
| 命令集合 | 只接真实通路：Chat → `Open`（导航）/ `Rename`（`PATCH /sessions/:id`）/ `Delete`（`DELETE /sessions/:id`）；Project → `New chat`（与行内 `+` 同一命令）；示例行无菜单。Pin / Archive / Move / Share / Fork 无 owner，不画 | grammar「无能力/不适用的动作隐藏；不新增 Planned 占位项」 |
| when 与 enablement | `when` 决定画不画（示例对象、目标种类），`enablement` 决定此刻能不能执行并给理由（已打开、活动 Run、Home 正在起草）；点下去时按当时上下文重新解析，菜单快照不是依据 | grammar「触发时重新解析目标与权限」 |
| 入口 | 右键（pointer 位置）、行右端 `More chat actions`（hover / focus / 触屏常显）、Menu 键 / Shift+F10（锚在行上）三者打开同一份菜单；只有真有菜单才拦截原生右键 | grammar「可见更多按钮提供相同命令；只有成功提供菜单时才拦截原生菜单」 |
| 菜单 primitive | `object-menu.mjs`：native popover，分组顺序 navigation / organization / lifecycle / interop / destructive，只在两侧都有行时画分隔线，破坏性最后；禁用行可聚焦带 `data-tooltip` 理由；方向键 / Home / End 环绕，Escape 回到行，Tab 关闭；选中后焦点先回行再执行 | grammar「键盘 Menu 键 / Shift+F10、方向键、Escape、焦点返回与触屏可达」 |
| 破坏性确认 | Delete 走对话框：对象名 + `The chat leaves your lists. Files in its workspace are kept.`；Host 409 `active_run` 原样成理由 | grammar「按实际对象后果走既有确认合同」；Host 注释 workspaceRetained |

## 交付

| 提交 | 内容 |
|---|---|
| `7d30d06` | vendor：同一 Lucide commit 钉 `arrow-left` / `arrow-right` / `pencil-line` / `trash`，sprite 与 icon-data 重建 |
| 本片 | `web/location-history.mjs`（有界内存栈：arrive 去重与前向截断、back / forward、remember、markUnavailable、retitle、forget）；`web/object-commands.mjs`（描述符、`commandsFor`、`groupCommands`、`createCommandDispatcher`）；`web/object-menu.mjs`；app.mjs：`leaveLocation` 在 goHome / selectSession / selectProject 三处离开点、`arriveLocation` 在 clearActiveSession 与 selectSession 成功路径、`traverseHistory`、`renderHistoryControls`、`attachObjectCommands`、rename / delete 对话框；index.html 控件、通知行、`#object-menu`、两个对话框；registry 五条（`nav.back` / `nav.forward` / `chat.open` / `chat.rename` / `chat.delete`）；文案 §3.4e；接口说明 PATCH / DELETE；interface-components 新节 |

## Dogfooding 修复（用户中途报告）

用户在 8805 真实 provider 上从 Home 发送后停留在首页而未进入 Chat。复现（8862 空数据目录，示例自动进入，fake provider）：Run 受理 → `leavePreview("established")` → `reloadWorld()` → `!state.activeProjectId` 对无 Project 的 Chat 为真 → `clearActiveSession()` 回 Home。修正：只有示例 Chat 或所属 Project 消失才清会话；无 Project 的 Chat 是真实地点。修正后同一路径视图停在 session、示例退出、Recent 与轨迹正确；`tests/navigation-history.test.mjs` 钉住该条件。

## 作者检查

| 检查 | 结果 |
|---|---|
| 定向 | `tests/location-history.test.mjs` 2、`tests/object-commands.test.mjs` 3（含 tiny-dom 菜单）、`tests/object-command-host.test.mjs` 1（PATCH / DELETE 与 400 / 404）、`tests/navigation-history.test.mjs` 4（源码合同）；相邻 entry-audit / static-web-manifest / shell-layout / settings-navigation / chat-page / home-presentation / chat-entry / projectless-chat / product-semantics / semantic-guards / product-icons 通过 |
| `npm test` | 1195/1195（Node 25.9，并发 4；09 片补钉 coordination / run-lineage / model-capability-adaptation / provider-schema12-pending / repository-binding / request-telemetry / review-provider-publication-migration / runtime 八套 schema fixture 后，`full-test-09b.log`） |
| lint | interaction / colors（去掉 Delete 主按钮的 danger 底色后）/ shapes / materials / product-copy / semantic-consumers / doc-links 通过 |
| 浏览器（Local test Host 8862，1280） | Home → 发送进 Chat：轨迹 [Home, Chat]，`Back to Home`；Back → Home（Forward 名带标题、焦点 composer）；Forward → 同一 Chat（焦点标题）。当前 Chat 行右键：菜单在指针处，`Open` 禁用带 "This chat is already open."，Rename / Delete 可用，两条分隔线；ArrowDown 跳过到 Rename，Escape 关闭焦点回行。另一行 `More chat actions` → 锚定菜单 → Rename 对话框预填标题、"No project" → PATCH 后行标题更新；右键 → Delete → 对话框对象名 → DELETE 后行消失、toast 说保留文件。删除当前 Chat → Home，轨迹标记；Back 到已删 Chat → "… no longer exists. Showing Home."，再 Back → Home 起点。375：抽屉内 Back / Forward 32×44、行右端 More 常显（hover: none）、菜单在视口内、无横向溢出 |

## 未完项

- 快捷键未接；暗色与 200% 未目验；非作者复核未做；真实 provider 未走。
- Project 行只有 New chat；Project 改名 / 删除无 Host 通路，不画。
- Chat 列表页（chat-page）与 Attention 里的 Chat 行未接同一菜单（那两处的行是导航按钮，本片只覆盖侧栏 Recent / Project 行）。
- 通知中心按 packet 进入 12。

## Independent review disposition · 2026-09-16

Baseline `f64c7e8f9fdb5eb28d8a43e4f9d8e52529878a17`. Luna independently reviewed source and ran five targeted suites; Astra adopts the findings below. **Acceptance withheld pending navigation fixes.** This does not withdraw the author's recorded checks or claim that the project-less Home fix failed.

| Finding | Disposition | Evidence / required correction |
|---|---|---|
| NAV-R1: traversal loses the departure anchor and can desynchronize the visible Chat and history | Adopt, P2, slice 09 owner | `app/web/app.mjs:1694` moves the cursor before `selectSession` calls `leaveLocation`; the identity guard at 1660 then skips saving the old Chat. Home→A→B→Back→Forward loses B's current reading anchor. If A's Back reader is pending and C is opened first, `arriveLocation(C)` at 1666–1674 is suppressed by traversal A; A's stale reader is subsequently discarded. Source-order replay with the real history helper produced `{activeSessionId:"c",historyCurrent:"a",bRestore:null}`. Save the departure state before moving the cursor and cancel/fence traversal when another navigation wins; add behavioral tests for both orderings. This replay was not a browser E2E test. |
| NAV-R2: preview Chat still exposes an Open menu | Adopt, P2, slice 09 owner | `app/web/object-commands.mjs:18–21` allows preview Open and `app/tests/object-commands.test.mjs:26` asserts it, contrary to this record and the object-command grammar's no-example-menu rule. Align implementation and test with the declared scope. |
| NAV-R3: disabled menu entries retain opening-time enablement | Adjust: bounded interaction issue, not an authorization bypass | `app/web/object-menu.mjs:38` returns before dispatch when the original entry was disabled. A Run ending while the menu remains open does not enable Delete until reopening. Either refresh enablement or document/reconcile this limitation; retain Host validation. |

Independent checks: `node --test --test-timeout=10000 app/tests/location-history.test.mjs app/tests/object-commands.test.mjs app/tests/object-command-host.test.mjs app/tests/navigation-history.test.mjs app/tests/projectless-chat.test.mjs` passed **14/14**, approximately 1.54s. Navigation integration tests include source-pattern assertions and do not establish anchor restoration or asynchronous navigation correctness. No independent browser, full-suite or real-provider pass is claimed. The project-less condition is supported by source review and related Host tests; the author's reloadWorld GUI path was not independently repeated.

## 复核回应（2026-09-16 · Luna 独立审查，基线 `f64c7e8`）

| 发现 | 处置 | 修正与证据 |
|---|---|---|
| NAV-R1 · 返回时丢失离开处的阅读锚点；异步返回期间打开另一 Chat 时界面与游标不一致 | 采纳，已修 | `traverseHistory` 先 `leaveLocation()` 再移动游标（此前游标先动，身份守卫因此跳过保存）；画面上没有行（层盖住 Chat、仍在加载）不再把已存锚点覆盖为空；`arriveLocation` 在返回未决时遇到另一处到达，放弃未决返回、按画面推进轨迹，只有「被拒绝对象后落到 Home」保持游标不动。浏览器（8861）：B 滚到 3000 → 去 A → Back 到 B 恢复到同一锚点；延迟 A 的读取、Back 后打开 C：轨迹 [A, C]、游标在 C、traversal 清空、标题是 C。`navigation-history.test.mjs` 钉住三处源码事实 |
| NAV-R2 · 示例 Chat 仍露出 Open 菜单 | 采纳，已修 | `chat.open` 的 `when` 同样排除示例；示例行完全无菜单，行自身点击仍打开；测试改为断言空列表 |
| NAV-R3 · 禁用项保留打开时的可执行性 | 采纳为交互问题，已修 | 菜单持有 dispatcher 的 `list`，`renderAll` 每次调用 `objectMenu.refresh()` 就地更新 `aria-disabled` 与理由；命令消失则关闭菜单；点击禁用行时再问一次 dispatcher，此刻可用才执行。tiny-dom 测试覆盖 Run 结束后 Delete 就地启用与命令消失关闭 |
| 08 维护 · `presentation.mjs` 校验正则含原始控制字节，Git 视为二进制 | 采纳，已修 | 改为 `\u0000-\u0008\u000B\u000C\u000E-\u001F` 转义，语义不变；presentation 5 项测试通过 |
| schema 指针不一致（store 18 / README 17 / AGENTS 与 architecture 15） | 采纳，已修 | README store 节改为 v18（写明 operations 与 17→18 只加空账本）、AGENTS.md 与 architecture.md 改 18；新增 `tests/schema18-upgrade.test.mjs`：17 升 18 一次、精确备份、其余字段不变、二次打开不再升级、伪造 operations 拒绝 |
| P 记录测试计数 5 / 实际 6 | 采纳，已改 | 记录改 6 |
| `full-test-09b.log` 不在交付树 | 采纳 | 日志在会话 scratchpad；本轮把全量摘要行写入 `evidence/09-full-test.txt` |
| 04/10 · 同一 Run 的中间 assistant 段各带 footer 与时间 | 采纳，归 10 片 | 未在本片改 |
| 展开缺共同锚点流程；流式表述；Back to latest / ask_user 选择 / Copy 反馈 | 采纳，归 10/11 片；流式登记文本属另一会话，本树不改 | 未在本片改 |
| 01–03 真实 coding 闭环未过 | 采纳，待办 | 需真实 provider 的 RuntimeLock 工单在固定 candidate 上重走读、改、测与回执；本会话无该凭据，留给 11 片与用户的 8805 环境 |

## 2026-09-28 · N-07 · Chat page rows (Claude, UX owner)

This record's open item "Chat 列表页（chat-page）与 Attention 里的 Chat 行未接同一菜单" was confirmed still open against current source during the [older-lead reconciliation](ux-polish-release-20260924.md). Product commit `36fdc01`.

- **Chat page: adopt.**
  - `createChatPage` takes an optional `attachCommands(row, ref)`, and `app.mjs` passes the same `attachObjectCommands` the sidebar uses. Each Continue row therefore gets the same right-click, Menu key / Shift+F10 and More control, with the same Open/Rename/Delete menu.
  - The `when`/`enablement` rules are unchanged, and the target is resolved again when a command is picked (this record's rulings).
  - A target with no command, such as an example chat, gets no menu and no inert More button.
  - Rows reuse the sidebar's `.session-row` anatomy (More revealed on hover/focus, always shown on touch). One scoped rule makes `.chat-row` fill the row.
- **Attention rows: adjust, not wired.**
  - Attention's conversation manager already has an owner-controlled Rename (`attention-agent-view.mjs` → `controller.rename`, the path corrected in AT-META-R1).
  - The shared menu's Rename goes through the app rename dialog, which would bypass the Attention controller's state. A second Rename path there would be inconsistent.
  - There's no Delete surface for Attention conversations today, so adding one would be a new capability, not parity. **Deferred** until there's a concrete need.

**Checks:**
- `chat-page.test.mjs`: rows hand their button and `{kind:"chat", id}` to the owner; rows with commands take `.session-row` plus More; a no-command target stays a plain row; with no owner there are no commands; the app passes `attachObjectCommands` (source assertion, as in the existing app-wiring test).
- The existing object-command, menu, dispatcher, navigation, shell, home and Attention suites pass 46/46 ([log](evidence/ux-n07-20260928/author-targeted-tests.log)). All lints and `git diff --check` pass.

**Capture needed from Parent:**
- Chat page with three or more chats at 538 and 1440: More reveal on hover/focus, and always visible under touch emulation.
- Right-click and Shift+F10 on a row.
- Open disabled on the current chat.
- Rename and Delete from the Chat page, with the list updating and focus returning to the row.
- An example row with no menu.

### N07-R1 · review return · adopt (Claude, UX owner)

Parent's independent review of `36fdc01` on a synthetic Host found two problems:
- **Rename** via Shift+F10 on the Chat page succeeded on the Host and in the sidebar/Recent, but the Chat page's Continue list kept the old title, and focus went back to the old row ([capture](/tmp/cw-ux-batch-review-20260928/rename-after.png), outside the repository).
- **Delete**, retried after Parent stopped its own pending fake Run, succeeded the same way while the Chat page kept the deleted row and focus returned to it ([capture](/tmp/cw-ux-batch-review-20260928/delete-success-stale.png)). The earlier active-run refusal is correct Host behaviour and not part of this finding.

**Adopt.** Fix: `16d5b94`.

**Cause.** `chatPage.open(...)` ran only in `openChatPage()`; `renderAll()` never redraws the page. The shared `attachObjectCommands` owner was right; the new consumer just wasn't redrawn after the command finished.

**Fix (`app.mjs`).**
- `refreshChatPage({ focusSession })` draws the page from the current session state (the same state the sidebar reads) and is used by opening, Rename and Delete.
- **Rename:** after the dialog closes, the page redraws and the renamed row takes focus.
- **Delete:** the neighbour is read from the page's own row order before the list update (next row, else previous). After the dialog closes the page redraws and focus goes to that neighbour, or to the page title when no rows remain; the empty state shows "No chats yet.".
- **Deleting the open chat** from the Chat page keeps the page open over Home: no jump away, and no "Return to" control for the deleted chat.
- Menus re-resolve their target on pick, as before. Rows from the redraw are live, so no menu opens against a removed row.

**Coverage.** New `app/scripts/chat-page-commands-browser.mjs` and `app/tests/chat-page-commands-browser.test.mjs` run the whole app in real headless Chrome against a disposable Host with four synthetic chats and no Runs. The test skips without Chrome.
- Steps: Shift+F10 → Rename; Delete the middle row; Delete the last row; open a chat, return to the Chat page and Delete that open chat; Delete the final row.
- **Before** (`cfa2f89`, [record](evidence/ux-n07-20260928/n07-r1-browser-before-cfa2f89.json)): the page keeps the old title and deleted rows while Recent updates; focus sits on stale rows; deleting the open chat leaves for Home; the next menu times out on a stale row.
- **After** ([record](evidence/ux-n07-20260928/n07-r1-browser-after.json)): at every step the page equals Recent, the page stays open and focus is live. Rename keeps focus on the row, Delete moves it to the next or previous row, and the final Delete leaves "No chats yet." with focus on the title.
- The existing source-pattern assertion in `navigation-history.test.mjs` (DELETE followed by the list update) now allows the neighbour read between them; its intent is unchanged.
- Adjacent suites, including both real-Chrome page tests, pass 39/39 with 0 skipped ([log](evidence/ux-n07-20260928/n07-r1-targeted-tests.log)). The interaction, copy and semantic lints and `git diff --check` pass.

Parent continues its own checks: Open disabled on the current chat, touch reveal, and the example row with no menu.

### N07-R2 · review return · adopt, sidebar included (Claude, UX owner)

Parent's touch evidence ([capture](/tmp/cw-ux-batch-review-20260928/chat-touch.png), outside the repository): with CDP touch emulation, `pointer: coarse` and `hover: none` both match and the Chat page's More is always visible, but it measures **32×32**. The visual-spatial grammar and icon contract require at least 44×44 for coarse targets. **Adopt.** Fix: `1a435fc`.

- **Cause:** `.session-row > .object-more { --control: 32px }` is a local fine-pointer size, and it overrode the coarse `:root { --control: 44px }`. Reusing the sidebar's anatomy brought that gap along.
- **Fix:** `@media (pointer: coarse) { .session-row > .object-more { --control: 44px } }`. It's selected by pointer capability, not viewport width (visual-spatial grammar: "Pointer capability and viewport width are different"). Fine pointers keep 32px with the hover/focus reveal, and the 16px glyph is unchanged.
- **Scope:** the sidebar's Recent/project chat rows use the same `.session-row` primitive, had the same 32px touch target, and get the same fix. Nothing else changes.
- **Coverage:** `chat-page-commands-browser.mjs` now measures the More targets on both surfaces with a fine pointer, then with touch emulation (restored afterwards), and `chat-page-commands-browser.test.mjs` asserts them.
  - **Before** (`497dc3f`, [targets](evidence/ux-n07-20260928/n07-r2-targets-before-497dc3f.json)): coarse 32×32 on both surfaces, opacity 1.
  - **After** ([record](evidence/ux-n07-20260928/n07-r2-browser-after.json)): fine 32×32, hidden until hover/focus; coarse 44×44, visible, on both surfaces.
- Adjacent suites, including both real-Chrome page tests, pass ([log](evidence/ux-n07-20260928/n07-r2-targeted-tests.log)). The spacing, interaction, shape, colour, material and copy lints and `git diff --check` pass.

Parent confirmed separately that Open is disabled on the current chat and that Shift+F10 and right-click open the same menu.

### N07-R3 · Chat page project naming · adopt, separate commit (Claude, UX owner)

Parent's acceptance replay of N07-R1/R2 passed: Rename showed the new title with focus on the live row; Delete removed the row with focus on a live neighbour; coarse 44×44 and fine 32. Parent also found a pre-existing truthfulness gap on the same page ([rename-fixed](/tmp/cw-ux-batch-review-20260928/rename-fixed.png), [delete-fixed](/tmp/cw-ux-batch-review-20260928/delete-fixed.png), outside the repository). After a reload with no active chat and the project collapsed in the sidebar, two real project chats read "No project", although the project exists and the API's `projectId` isn't empty. **Adopt.** Fix: `81dd965`.

- **Cause:** `openChatPage`, and so `refreshChatPage`, passed only `openProjectIds` plus the active project. The app always passes `recentSessions`, so the page lists Recent chats and uses `projects` only to name each chat's project; a collapsed project was therefore "not found".
- **Fix:** name from `state.projects`. Sidebar expansion is navigation state, not ownership. A chat whose `projectId` is null still reads "No project"; project-less semantics are unchanged.
- **Separate commit** because this is an inherited naming bug on the page, independent of the R1/R2 lifecycle and target fixes. It stays reviewable and revertible on its own. I'm not claiming it correct in this delivery; Parent's review decides.
- **Coverage:** `runChatPageProjectNamesBrowser` (real headless Chrome, disposable Host, one project with two chats plus one project-less chat). It reloads with no open chat, collapses the project in the sidebar (`aria-expanded="false"`, none of its chats listed), then reads each Chat-page row's project name.
  - **Before** (`e8fbf26`, [record](evidence/ux-n07-20260928/n07-r3-project-names-before-e8fbf26.json)): all three rows read "No project".
  - **After** ([record](evidence/ux-n07-20260928/n07-r3-project-names-after.json)): the two project chats read "UX batch synthetic project", and the project-less chat reads "No project".
  - The asserting test is in `chat-page-commands-browser.test.mjs`, alongside the unchanged R1/R2 focus and target test. Adjacent suites, including real Chrome, pass 36/36 with 0 skipped ([log](evidence/ux-n07-20260928/n07-r3-targeted-tests.log)). Lints pass.
- **Example row with no menu:** Parent reports that after opening the example and visiting an example chat, the Chat page's Continue still showed only the two real recent chats. So "example row has no menu" hasn't been observed on the Chat page in a browser. It stays covered only by the `chat-page.test.mjs` unit case (a target with no commands gets a plain row). No example Recent entry was forced for this.
