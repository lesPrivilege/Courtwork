# 前端入口五处接线边界 · 后续审阅消费

本轮从独立分支 `923998dc0488bb49344af36d8be0bc1622b28342` 接续；实读共享main为 `b087e9fa14c700a38ae200a412194a891c060c0c`，有其他writer未提交内容。本轮继续原独立树，不合并或改写后端施工。

用户后续审阅以历史 `1ac28980…` 为参考，要求保留入口主体与顺序，补通道能力、编辑语义、动作显隐范围、返回连续性与owner冻结时点。Astra在本轮实际分支核对：user footer确实包含时间；上片CSS与验证脚本把整个footer作为显隐目标，错误扩大了范围。原[验证记录](verification.md)和browser目录保留为上片历史，不能用于证明时间常显与指针安全；本记录及browser-v2取代该两项接受判断。

## 合同采用

所有条款直接补入[原前端入口](../frontend-plan.md)，不另起总架构或路线图：

1. CW托管、Provider原生入口、保留资料投影分别消费自己的能力；共享控件不继承控制权。四类空态分开；不自动选择最近项目/账号/Attention身份。
2. 显隐仅针对消息次级动作组；时间、来源与反馈不隐藏。Edit-as-new仍将不可变消息带回草稿；复制对象不改义，保留资料不伪装可编辑上游。
3. 默认可见，适合hover时才收起；关闭透明动作指针命中，保留Tab与即时显示。消费现菜单展开、确认、busy和反馈，不引入新状态机。混合输入保守可达。
4. 瞬时关闭与访问位置切换分别消费现路径；保留锚点、展开、草稿和对象/版本，拒绝晚到污染；关闭不改变Run、授权或工作事项。
5. 绘制前记录owner/责任缺口，绘制后冻结最小字段与查询/动作/错误映射。三个specimen补主路径与缺失/拒绝反例；无owner不接生产，来源变化不复制Attention inbox。

本轮不创建三个页面specimen、不接reader或新来源详情。这里的返回连续性是下一片可操作specimen的验收要求，不宣称本次已实现。

## 官方参考核对

本轮读取用户给出的公开参考，限于交互规则，不作上游产品政策判断。透明元素仍可参与指针命中与Tab顺序，故收起时须分别处理命中与focus：[MDN opacity](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/opacity)。设备可能同时有不同指针精度，保守分支读取any-pointer：[MDN any-pointer](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@media/any-pointer)。菜单按钮展开状态与焦点入口沿[WAI菜单按钮](https://www.w3.org/WAI/ARIA/apg/patterns/menu-button/)；未来来源详情若采用modal，焦点、背景与返回行为沿[WAI模态对话框](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/)。不因引用这些模式引入通用toolbar或新的导航系统。

## 实现与检查

Luna拥有CSS及必要的无状态用户动作分组；Astra持有合同与有界非作者浏览器验证。调用点覆盖普通Chat的 `renderMessageStream`、Attention的assistant消息与共享 `renderUserMessage`，以及后者的无adapter旧调用形态。当前Edit-as-new文案由原语义注册表持有，本轮不改注册表或adapter。

修订检查用[verify-hover-v2.mjs](verify-hover-v2.mjs)，与上片脚本分开保留。检查对象改为action row，并增加时间/Source可见、隐藏按钮elementFromPoint与pointer-events、真实Tab到达后的即时显示、显隐前后几何、菜单移出消息DOM且焦点移出后的展开状态、Escape返回及回执/错误/确认/busy。当前受核产品blob：styles.css `f330093af3ecd7387f1153fa28fbfcc3bb652c09`；user-message.mjs `79f8eac1337f20248ad38fb138a7de469d64bfd5`。消息action row移除transition，键盘/hover/交互状态变化即时呈现；无新增动效或token。

- Astra定向 `node --test app/tests/attention-agent.test.mjs app/tests/chat-actions.test.mjs`：15/15，[原始结果](tests-v2.txt)。覆盖现消息能力与Attention接缝；未修改后端或动作语义。
- `node tools/lint-interaction.mjs`：[通过](lint-v2.txt)；`git diff --check`通过。
- 浏览器[结果](browser-v2/results.json)：1440/1280/390 × light/dark六配置全部通过；1440使用正常motion设置，1280/390使用reduced-motion。测透明按钮的实际elementFromPoint、Tab即时显现、时间与Source、legacy无adapter动作、原文copy与Edit-as-new对象、菜单挂载到消息DOM外且焦点转移后保持、反馈和布局。含长文本与200% CSS zoom。触屏为Chrome emulation；混合指针分支用浏览器实际CSS规则的合成激活验证，单独标注，未声称真实混合硬件验收。
- Astra实读[桌面收起](browser-v2/light-1440.png)与[深色触屏](browser-v2/dark-390.png)：时间保留，动作收起不移动正文，触屏入口仍可见。截图仍为组件候选证据，不是全产品baseline。
- 作者Luna还报告全量 `npm --prefix app test`退出成功；终端回执截断，未保留完整计数/耗时，故不以它报告固定全量测试数，也未为补计数重复运行。
- [文档链接](checks-v2.json)最终通过。首次v2浏览器运行捕获正常motion下opacity淡入延迟，移除action row transition后重跑通过；失败不计入成功。

本轮没有生产来源详情、会话切换/晚到请求或数据桥接施工；这些测试保留在下一片specimen。未调用真实Provider、迁移个人数据、接入账户、push或部署。本分支仍未合main。
