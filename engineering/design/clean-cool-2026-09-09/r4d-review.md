# r4d 设计接缝复读 · Astra

2026-09-09。实际main `0df2d492da63a85d77367fe2d63cdd87fdfc6532`，只读r4d固定头 `f5de8ad2d909e372940f39261783edef4a453145`。本次消费WK-111…114、两份EX-CC报告、FE-04提示词和misfit台账；核对当前provider-preview、surface identity及work-summary合同。未合入r4d、未改前端、未派第二位writer，也未删除其他工作树。

画布链接两次浏览器加载未成功，无法确认七画板实际像素、裁切与交互。下列为基于文档及代码的工程判断，**不是画布视觉验收，也不是代用户选向**。链接继续保留在r4d的dispatch记录，待可读取截图或导出后做视觉复核。

## 总体意见

- Work推荐B+C：正常桌面采用主次切换，宽屏容纳三面时并列；A图标导航后置。B应把“聊天与文档互斥可见”和“大圆角浮层/遮罩”分开裁定：前者解决宽度，后者不是必要结果。按用户的贯通方向，优先顶部chrome连接的主区视图，避免默认重新套模态卡。
- Home推荐D0-B：composer + 紧凑次级模块带。D0-C只有在保住composer宽度和视觉主位时才值得继续；本次不替用户作最终画布选择。
- CC-S结构已有用户明确指示，可以按队列成单；80×52安全区补Settings与折叠态验证。
- FE-04按已有派单继续；不因这次设计复读重启或另派作者。WK-111记录的是Fable非作者复核（228/228、延迟3/3、探测8/8、Models18/18）；本次没有再跑这些测试，不把它们重标为Astra本轮结果。

## 施工前需修订或澄清

| 项 | 发现 | 修订要求 |
|---|---|---|
| R4D-1 · BE-28 | `app/server/provider-preview.mjs`明确无store/credential依赖，输入是临时URL/key；ok仅指model-directory。r4d建议复用探测时间作为已保存连接健康时间，缺少同一配置的绑定 | 分开“配置快照读取新鲜度”与“端点检查”。仅做首页摘要不必先增加连接健康字段；若做健康记录，必须绑定被检查配置/凭据版本及check kind，配置变化后失效。不能由临时表单probe直接更新全局`lastVerifiedAt`，不能称模型已验证可推理 |
| R4D-2 · CC-D0依赖 | WK-114已列出无需新后端的shell/Today/Appearance范围，结尾又将整个CC-D0绑定BE-1/3 | 拆为D0外壳与现有事实投影、Activity接入两个切片；后者等待BE-1/3/25。若没有实质可用的新布局价值，可延后外壳，但理由是产品收益，不是不存在的技术依赖 |
| R4D-3 · 单实例滚动 | 第一段没有多文档，并不意味着固定类型tab切换、折叠/展开时可以丢位置或草稿；WK-113“共享阅读位置”易被如此执行 | 至少保存聊天与当前活动阅读面的滚动/草稿和返回焦点；复用原DOM可自然保留的状态。多文档位置map可以随BE-2后做；不得把该后置推广为基本导航恢复可丢失 |
| R4D-4 · identity/lifecycle | WK-113简写领域identity为sessionId/extensionId/generation，当前`sameSurfaceIdentity`另比较status/modulePath | tab显示key和renderer有效性判定分别保留；不得因简写删掉现有status/modulePath失效条件。scope不必新增统一字段，但复用的现有身份必须保留实际授权范围与读取版本 |
| R4D-5 · 断点与几何证据 | EX-CC1同时承认没有展开态几何断言，又称B不需新几何断言；报告中360+24写成392，实际为384 | 纠正算术笔误。B/C均补展开、返回、断点两侧、短高度、200%缩放和安全区验证；496/736为给定公式下的可分配宽度，扣完内边距后才是正文宽度。1680是起始产品配置，不保证任意缩放/文本密度下均可三面 |
| R4D-6 · Attention完整性 | work-summary完整投影的是既定三类运行/会话/问答集合，不是所有Core候选和专业工作义务 | 保留现有集合名，无需仅为免责新增coverage字段；但不能将此推导为“所有工作待办均已覆盖”。统计覆盖与领域未决覆盖是两个问题 |

## 邮件／日历的既有意向与后续授权

用户已经明确希望有一版包含邮件／日历等可解耦模块的首页，因此将两项保留为产品路线与只读来源合同研究即可，无需重复问“是否值得保留这个方向”。目前尚未选择具体账户、provider、同步方式和接入时间；这不等于授权连接真实账户、读取全部邮件、创建事件或对外发送。

BE-26/27可作为独立候选接缝保留，不阻塞CC-S/W/D0。实际接入前再解决具体来源与scope；发布首版是否包含这两项仍可由用户排期，不以本次设计表达冒充已授权实施完整集成。

## 追溯

固定r4d SHA下路径：

- `engineering/mvp/execution/work-surface-kit/intake-round-3.md` §4q–4s。
- `engineering/mvp/execution/work-surface-kit/explore/ex-cc1-three-pane-tabs.md`、`ex-cc2-home-modules.md`。
- `engineering/mvp/execution/work-surface-kit/backend-requests.md`、`work-orders/WO-FE04-dispatch-prompt.md`、`misfit-ledger.md`。

本轮代码依据：[临时探测](../../../app/server/provider-preview.mjs)、[宿主](../../../app/web/app.mjs)、[summary合同](../../../app/docs/work-summary-api.md)。前序用户方向：[shell-refinement](shell-refinement.md)。本文件为交接评审意见，待Fable在其工作树消费，不直接改写仍在运行的作者工单。
