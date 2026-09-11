# Presence · 设计收敛与合并交接

2026-09-12。用户最终确认：静默态优先`」`类语义，thinking可用斜下垂嘟嘴；完成设计收敛后由另一session合并。Astra本轮只在 `codex/agent-presence-convergence-20260912` 从 `ca91a78` 施工。最新固定提交见交接消息/Git历史；本轮不合main、不push、不改生产App。

## 已收敛

- 默认候选键 **JP**，稳定资产ID `presence-corner-pout`。双横眼不变。
- 静默嘴：直立右笔、底部向左回折、微圆转角，去掉旧A上方回折；使用`」`拓扑，非字体字形。
- Thinking嘴：较小上瓣、较重下瓣，入口向右下倾，腰部过渡柔和。借用用户描述的松弛/嘟嘴结构，原创路径；无角色脸轮廓、无直接描摹，旧B的平盖/直斜`Ʒ`不作终稿。
- 每态13点、4段三次曲线，沿原geometry同拓扑插值。180ms可中断接续、局部thinking压展、reduced-motion静态策略保持；不另加旋转/漂浮。
- 主用16px flat，导出16/20/24/32/64两态共10枚新SVG。放当前assistant消息/Run工作块下方，详情随消息展开；不在每条消息后复制，不放composer角落。旧AB/A/B/C与soft/hard保留为历史/材质对照。
- 静默是形态名，不创建新的Run状态。无细分活动的running使用静默嘴并显示Working；无Run的idle仍不显示状态行。thinking嘴与词轮播仍须明确活动事实，不能由reasoning配置/耗时/无工具推导。

几何源在 [geometry.mjs](src/geometry.mjs)，候选/默认在 [Chat driver](src/chat-scene.mjs) 和 [比较面](index.html)；[manifest](assets/manifest.json) version2记录默认路线和尺寸。导出仅来自geometry，不能手改SVG后遗失来源。

## 另一session的接收步骤

1. 读取当前实际branch/HEAD/status及本文件。源分支为 `codex/agent-presence-convergence-20260912`，共同基线ca91a78已含Claude原返件7fbbda6、Astra消息下落位/刮条修复26eb8bb。只需接本轮增量，不重复拿旧返件覆盖。
2. 审查本分支diff：新增corner/pout与JP；新增10SVG及manifest；默认比较/Chat选择JP；本文件、README、current和本轮证据。旧8SVG字节保持。不得按历史decision.md里的AB/line推荐回退。
3. source/asset/fixture hash与定向测试通过后按实际共享writer状态合并；保留其他session当前修改，尤其current的其他记录。无需重做外部Design Scout sweep。
4. 本次合并的是Design/specimen。生产接线沿同一Run的事实投影与消息尾行；源DTO不能直接使用specimen fixture。当前thinking_delta仅用于首输出计时，尚无活动投影。blocked仍fixture，取消请求需区分client pending/server stopping/actual terminal；断连不覆写已知terminal。七项gap详见[上一轮裁决](../../../../evidence/agent-presence-review-20260912/README.md)。
5. 若该session同时负责生产UI接线，先消费当前UI writer返回与真实Run工作块结构，再安排对应定向/真实浏览器检查；不要把合并Design当成生产实现已完成。

## 运行与证据

在该分支worktree根目录运行：

```sh
node engineering/design/agent-presence-2026-09-11/return-v1/tools/serve.mjs --port 8917
```

比较页路径为 `/engineering/design/agent-presence-2026-09-11/return-v1/`；独立场景 `chat.html?candidate=JP&placement=message&state=thinking&t=1400&theme=dark`。无candidate参数默认JP。8917是本轮独立端口；占用时换空闲端口，不终止他人的server。

[本轮真实CUA证据](../../../../evidence/agent-presence-convergence-20260912/README.md)固定静默/嘟嘴与消息位置，作者检查和Luna有界非作者复核分开。新截图是收敛候选记录，不是全产品golden。原17项测试/四序列与19probe被复用；无真实provider、生产schema或App改动。
