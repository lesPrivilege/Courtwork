# WO-ATT-UI02 · Astra 集成裁决

2026-09-13。Claude候选 `667cd18`（实现 `93b9ec2`，基线 `93a8ac4`）与实际 main `24bd9545936dd19a498fc6b7eed5de106ac0d5e8` 在隔离工作树干净合流为 `edd853dc90d4419f008b5b68259401c989471ce1`。以下记录候选的非作者检查与 Astra 的集成修订；Astra接受完成修订的候选；Luna对集成修订的[独立复核](luna-review.md)已完成。最终源码逐文件固定在[哈希清单](evidence/source-manifest.json)。作者返回包保持原字节，不把其928项测试或Chrome录像重署为本次独立证据。

## 裁决与原 grammar

最近实现先例为 `attention.triage`（WK-156…158，`app/web/attention-view.mjs`）、Settings segmented、`setRequestLabel`、`.chat-row.is-current` 和既有 solid raised/sunken 材质。沿[前端连续性规范](../../agent-interface-2026-09-10/frontend-contract.md)、[Attention合同](../../../../docs/work-core/attention.md)与[验收要求](../acceptance.md)裁决。

用户补充要求以 Courtwork 原 grammar 合入、避免左侧衬线，并提出 task timeline 等编排方向。因此删除候选选中行与拒绝提示的2px inset竖线；选中态采用已有 selected 底色、原生焦点环和 aria-pressed。下一动作 kind 改为普通说明文字，删除 raised小牌的底色、圆角与阴影，防止被读成按钮。当前页按原因→下一步→动作→回执→按需出处组织，保留真实任务关系，不给每块静态信息附加假时间或阶段。

历史时间线是可行的独立增强方向：Core已提供按revision顺序的 `events`，含 `recorded_at` 和 `next_offset`，**不缺事件查询接口**。但现候选只有当前状态与出处，没有历史读取、分页/错误/过期投影行为。本轮不将静态判断块冒充历史时间线，不引入装饰点线；后续可在既有 Recorded context 下以事件行组织真实记录，沿 `.event-row` 的分隔/披露语法，需保持项目隔离和分页完整性。它与缺少日期范围/分组查询的Board/Time工作视图是两件事。用户此处提出编排选择，本轮选择原生任务顺序，未声称已交付历史时间线。

| 选择 | 裁决 | 理由 |
| --- | --- | --- |
| D-1 全局 Open Attention | 采用 | 真实整页打开独立全局助手，不将当前对象误绑定为会话scope。 |
| D-2 动作在Recorded context前 | 采用 | 原因、下一步、Resolve后果与错误维持L1；出处按需读取。 |
| D-3 查询视图即时 | 采用 | 六view是原查询，不是新状态、客户端排序或可拖动流程。 |
| D-4 已seen仍广告Mark as seen | 采用现合同 | seen与status分离，不自造隐藏动作规则；在途禁止重复发送。 |
| D-5 宽屏Back to items | 采用 | 保持进入后的焦点落点和返回原行。 |
| D-6 Resolve后果 | 采用 | 提交前可见，只记录该Attention决定。 |
| D-7 来源角色与freshness | 采用 | 投影inspect已有字段，非承重技术事实放L3；来源未知不伪造确认。 |
| D-8 窄屏隐藏查询栏 | 采用 | 返回后恢复scope/列表与焦点，无横向溢出。 |
| D-9 sticky阅读面 | 采用 | 沿实测整页容器；宽屏独立滚动、窄屏自然回流。 |
| D-10 Refresh文字 | 采用 | 沿现动作词，不新增图标消费者。 |

标题沿现有 `.file-heading h3` 的 `--text-scale` 倍率，修正候选固定px未响应文字偏好的问题；默认字号不变。真实设置Large（1.143）后h1=34.29px、h2=25.146px，1280无横向溢出，见截图22；测后恢复Medium。

1120px页面最大宽度、280–360px列表列宽、22px详情标题/24px窄屏标题、角落返回空间均作为本页编排数值接受，不升格为新token或全站grammar。控件尺寸、字阶角色、圆角与材质仍由现有样式控制。未引入依赖、primitive、后端接口或schema。

## 修订与责任

Astra修复了四组问题：

- 键盘Enter/Escape等也触发候选进入动效：组件记录输入方式，键盘不播放WAAPI，披露chevron也即时变化；pointerdown恢复原pointer动效。
- A事项动作的迟到回执/拒绝/恢复可清B事项草稿或写入B错误：局部反馈以project+attention身份匹配当前选择；settle在重读后检查generation，过期结果不刷新新scope或抢走新事项焦点。
- Luna独立探针发现两个settle重叠时共享boolean过早放行动效：改为进入增加/finally减少的计数，全部重读完成后才播放反馈。
- VERSION_CONFLICT在自动重读后仍叫人Reload：改为 “Review its current state before trying again.”，原真实Core回归断言同步更新；重读失败仍显示读取错误，不谎称已成功刷新。

以上是Astra作者修订；不称其为Astra对自己代码的独立接受。Luna复核另留记录。Core mutation/request_id/CAS形状不变。

## Motion findings

| Before | After | Why |
| --- | --- | --- |
| Enter打开对象/编辑器、Escape返回也播放进入动画 | 键盘路径即时；pointer路径保留120/180ms原token | 键盘高频操作不应被装饰动画打扰。 |
| 左侧竖线与下一动作raised小牌增加强调 | 原有selected填充、普通说明文字、原生焦点 | 用户明确要求沿既有grammar，避免装饰性衬线与伪动作。 |
| 冲突提示要求重复Reload | 直接引导检查当前状态再决定 | 提示必须反映实际自动重读流程。 |

候选其余动效只操作opacity/transform，使用现有 `--duration-fast`、`--duration`、`--ease-out`。不以动画结束判定成功；回执匹配与canonical读取先完成。节点重绘打断旧动画且新DOM已可操作；filter、J/K不动，键盘也不动。系统reduce及显式reduce分支保留。纯反馈淡入用于错误/回执可读性，非庆祝或假进度。Motion verdict：**Approve**，以本页非作者候选审阅、Luna独立修订复验及明确未测矩阵为范围。

## 本轮实际证据

- 隔离合流初始定向49/49：[日志](evidence/initial-targeted.txt)。Astra行为修正后全量950/950：[日志](evidence/full-suite.txt)。计数修正前的最终定向49/49：[日志](evidence/final-targeted.txt)。其后并发计数修正另由Luna定向复验；全量950不冒称该最后修正后的第二轮全量。迁入常规suite后最终组合定向53/53通过：[日志](evidence/final-integrated-targeted.txt)。Luna最终4/4延迟探针与25/25相邻定向通过；探针已机械迁入常规suite的 `app/tests/attention-ui02-concurrency.test.mjs`（仅改import路径）。Runtime smoke亦通过：[日志](evidence/runtime-smoke.txt)。
- 颜色、材质、交互、形状、对比度、文案、语义消费者检查通过。初次误用不存在的lint-copy/check-product-semantics文件名，失败日志保留；正确入口是check-product-copy/check-semantic-consumers，未将前者计为通过。
- 实际内置浏览器：候选冲突保留草稿且写出新Waiting/revision；真实应用Home读取、items接线、Core acknowledge只改seen且显示revision2回执；全局助手走真实Runtime+Local test合成模型收发至Completed，Escape关闭焦点回到Open Attention；窄屏返回原行、query恢复、宽度390无横向溢出；1280浅深、1440深色、390深色reduce、长文本与来源披露。
- 后续实际浏览器另覆盖空/不可用、丢失且未提交：焦点落Retry sending，无成功回执；键盘重试后Seen与revision5回执正确出现。720×450只验证小视口回流，不称原生200% zoom；最终1440浅色与无console warn/error见截图21。
- 截图01/02为修订过程，03为冲突，04/06为移除衬线后但下一动作小牌尚未删除的中间版本；07起为最终去牌grammar。08实际宽度1440（曾请求1280但目标非当前页，已按实测宽度更名），09/10实际1280，11/13/14为390。12是长文测试中返回列表后的中间图，不作为长文详情通过证据；17是测试面板遮挡动作后的中间图，真正unknown/retry证据是18/19。
- [真实整页](evidence/04-runtime-detail-1440-light.png)、[真实助手](evidence/05-runtime-assistant.png)、[最终窄屏](evidence/07-final-runtime-390-light.png)、[最终1440深色](evidence/08-final-1440-dark.png)、[最终1280浅色](evidence/09-final-1280-light.png)、[最终1280深色reduce](evidence/10-final-1280-dark-reduce.png)、[最终390深色reduce](evidence/11-final-390-dark-reduce.png)、[来源回流](evidence/14-final-390-sources-dark.png)。

源码与文档的 `git diff --check` 通过；原始测试失败日志保留Node输出的两行空白缩进，contrast日志保留末尾空行，不将它们改写为整理后的原始输出。

`runtime-fixture.mjs`使用项目既有boot helper启动隔离临时数据、真实Core及Local test；不使用个人workspace/credential或付费Provider。预览mock仍只在作者预览路径，不进入产品。

未实测浏览器原生200% zoom、VoiceOver实听、forced-colors截图、其他skin、Safari/Firefox、真实触控设备。系统reduce走源码/单元分支复核，本轮浏览器只操作显式reduce；不把作者两条reduce录像重署为独立实测。未关闭Release、真实Provider、完整可访问性矩阵或无关产品门；本轮不push/部署。
