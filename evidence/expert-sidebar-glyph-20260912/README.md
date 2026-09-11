# Expert sidebar · 工作中验证回执

基线1b8bd3c。Astra在隔离数据与端口8927运行真实App；所有截图均为本轮CUA实际捕获，before为原主线，after为Expert初接版本，iteration-home-row为Home/New合行后的中间版本。用户随后要求仅横向扩大hover范围；最终合并候选会另拍，以上均非最终产品golden。

已运行并观察：product-icons/product-semantics/static-web-manifest组合19/19；chat-entry两项通过；color/interaction/material、semantic-consumers、product-copy通过；contrast-report生成成功（现有roles）；源/生成/静态允许表一致。新增Expert为DIV、tabIndex=-1、无内部interactive children，Tab从Spark进入搜索，Escape关闭窄屏drawer并返回Toggle navigation；Home保留独立合成草稿，New chat无项目时打开New project，Escape返回New chat。此次不运行真实provider。

[检查记录](checks.json)是接收session按已观察输出登记的摘要，不伪称原始日志。已有命令原输出留在本次会话；[导航测试日志](chat-entry.log)和[原contrast报告](contrast.log)直接保存命令输出。完整最终证据将在合并候选冻结后更新。

Luna只读核对源/manifest/registry/allowlist/无后端与CSS边界；指出施工中缺receipt与旧尺寸描述，root在本次提交补齐。不是Luna作者代码，不以结构检查替代最终视觉接受。真实200%缩放、forced-colors与全产品native行为本小片尚未检查，不声称通过。
