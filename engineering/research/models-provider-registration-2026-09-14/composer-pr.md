# PR 登记 · Composer 模型连接引导与 effort 快选

2026-09-14 · Astra登记；状态：本地 PR 工单/正文，待实现，未创建远端 PR。基线 `main@7e1a1ff047721e1ca6c871deba7f367ccea55a06`，沿[Models 原任务](README.md)，保留其他 writer 在途文档。

## 问题与用户结果

用户在 composer 选模型时，应能自然进入 Settings → Models 登记对应 API 连接，配置后返回原 Chat 继续输入。当前模型卡的截图没有直接配置入口；effort 仅能在二级 Model 卡中的原生下拉框调整。用户要求将可视化档位放到 composer 附近，减少展开层级。

输入：[当前 Model 卡](composer-inputs/current-model-picker.png)、[effort 交互参考](composer-inputs/effort-reference.png)；原字节哈希见[清单](composer-inputs/manifest.json)。第二图只提供紧凑档位交互方向，不采纳其中模型名、六档数量、颜色或能力主张。

## 责任与最近先例

- Host connection/config owner 保有连接、凭据引用、revision 与 future Run 配置；provider adapter 的 `model-capabilities.mjs` 提供当前 connection/model/API/endpoint 对应的能力枚举与来源。前端不推测档位，也不另建能力表。
- `app/web/model-picker.mjs`、`provider-config.mjs`、`settings-view.mjs` 为最近实现先例；沿 `reasoningCapabilityOf` / `supportedEffortsOf` / `projectProviderConfig` 共用投影与保存。导航接既有 Settings 返回上下文，composer 仅作展示与意图入口。
- 拟写权：Model picker、composer 接线、Settings Models 定位/返回与对应样式/测试；施工时指定一名产品 writer。只有现有导航不能携带连接定位与返回草稿时补该接缝，不能复制凭据表单、配置 store 或改变 Core。

## 交互合同

1. Composer 的模型选择入口提供可发现的“配置模型连接”动作，直达 Settings → Models 中对应 connection；没有连接时落到新增连接。缺 key/配置不可用时在相关动作附近提供同一修复路径，状态依据 Host 的配置事实，不能从模型是否在 catalog 猜测已配置。保留消息、附件、workspace、Chat身份与返回焦点；取消配置也能返回。导航不自动发送或调用模型。
2. Composer 一级显示当前 effort 名称与紧凑离散档位快选；模型/连接详细信息继续按需展开。优先候选为有文字标签的离散分段控件；档位多时用紧凑当前值及就近横向档位面。视觉参考的滑轨不是已采用控件：若实现为 slider，必须先证明有序枚举及键盘/触屏语义，完成现有控件登记，不能当连续数值或等距算力。
3. 可选值精确来自 adapter 能力快照；不得写死 low/medium/high 或六档。Provider default 是省略参数的独立选择，不当最低算力档。unknown、unsupported、单一显式档位、用户声明来源分别处理；无合法档位时不绘制假阶梯。来源/验证范围可在详情查询，不能将 user-declared 标为已验证。
4. 选择后按既有 scope 保存并给出反馈；当前全局配置影响所有 Chat 的未来 Run，不能将更近的控件伪装成仅当前 Chat override。若后续要求 Chat scope，须单独补 Host 合同。活动 Run 的冻结限制照旧；不改变历史 Run binding。
5. 切换 connection/model/API/endpoint 后重新取合法集合；失效旧值明确提示并允许回到 Provider default。保存失败保留草稿，过期回执不覆盖较新选择；键盘、触屏、焦点和窄屏均可完成选择，不依赖 hover 或只有颜色区别。

## 切片与退出证据

同一 PR 两个可独立检查的实现片：A 为 composer → 精确 Models 配置 → 原草稿返回；B 为 adapter 驱动的 effort 快选 → 保存 → 下次 Run 实际 binding。先复用已有能力 DTO，不新增 schema；Astra裁定控件与跨层边界，Luna有界探索/实现或非作者复验，关键完整页面由Astra真实目验。

定向检查：连接定位及返回状态、至少两组不同枚举、unknown/unsupported、Provider default、省略参数、失效值、失败/迟到回执及活动 Run 冻结。真实 Host/GUI 路径检查配置保存和下次 Run binding，mock adapter 可以验证前端枚举消费但不宣称真实 provider 行为。新调用需按原 dogfooding 授权范围执行。

视觉检查完整 composer 与 Settings 返回路径，覆盖桌面/390px、明暗、长模型名、键盘与200%缩放；观察层级、点击目标、档位标签与焦点，按实际记录通过/未测。遵循 UX Grammar、frontend-contract 与 precedent index 的 Model + effort 条目；仅文档登记不运行产品全量测试。

本次未实现产品、未改用户配置、未操作其正在配置的浏览器。登记不代表独立验收或真实模型能力通过。
