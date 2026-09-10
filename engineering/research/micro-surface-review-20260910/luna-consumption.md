# Luna fast · Rename真实消费

Luna只读固定main `8798e81`，根随后核对关键源码；没有改产品或运行本轮浏览器/产品测试。外部来源核验未随此报告交付，仍保持原输入级别。

## 已有接缝

`app/web/attention-conversation.mjs`已发PATCH sessions title，`app/server/index.mjs`路由已存在；service校验对象/仅title/长度，store trim并持久化。现有`app/tests/attention-agent.test.mjs`覆盖成功、空白、超长、额外字段、未知session。无显式revision/ETag/CAS；当前UI不是已建立的optimistic协议。范围是Session rename，不把它泛化成任意card对象重命名。长度按实际JS字符串实现核验，不称grapheme限制。

## 候选 MICRO-RENAME-01（未派实现）

先复用既有入口，冻结当前非optimistic pending/成功/失败/草稿保留、重复提交和乱序响应的可观察行为；不先改成交互新primitive。验证sidebar/header/Attention等实际消费者，coordination是否持有创建时快照须按合同区分，不能强制改历史快照使其追随新标题。

评审字段：入口/动作、owner、canonicalization、validation、持久化风险、pending/重复提交、失败行为、响应乱序、跨面实时投影与历史快照区别、键盘/焦点、长文本/窄屏、真实HTTP及作者/非作者证据。接到现有frontend-contract，不创建第二规范。前端Claude单writer；后端仅发现真实合同缺口后由Astra单独授权，不能给同一张卡两位并行代码owner。

八组反例：空/全空白；长度边界；emoji/组合字符与UTF-16口径；额外字段/错误类型；对象缺席；网络失败及草稿；连续提交/乱序；各实际读面一致性与历史快照保持。使用独立合成数据与本地真实HTTP，不需要付费LLM。第一轮不宣称支持pin/archive/delete。

候选前端路径`app/web/attention-conversation.mjs`及必要`app/web/app.mjs`；测试沿现有同域测试，证据独立；service/store仅在另行核定后端缺口时成单，不默认修改。排在summary D1/D2及CI-B/F×CS组合固定后，EX-IC2中如已有同一动作应并入其C片，不重复派单。
