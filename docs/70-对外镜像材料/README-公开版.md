# Courtwork

**法律团队的工作台，不是聊天窗口。**

Courtwork 是一个文件夹级协作的法律 workagent：把案件装进容器，让模型在写好的秩序里工作——场景化、防呆、承诺、留痕。我们的判断是：模型越便宜，秩序越值钱。

## 一次真实请求的解剖

每次推理请求的 prompt 都不是自由拼接，而是五段确定性组装：

```
① 契约段   —— 不可协商的红线：无锚不落格、原件只读、不可逆动作留人确认
② 声明段   —— 当前场景的编排与提示词（来自垂类包声明，不是代码）
③ 租户段   —— 企业级覆盖（词表、库路由）
④ 续行投影 —— 案件工作语义的确定性摘要（不是聊天记录回放）
⑤ 会话与语料 —— 你说的话、你的文件（语料是数据，不是指令）
```

组装后进入固定编排：模型只做填空，产出经 schema 校验落入右侧工作面，凡不可逆动作停在确认门禁。**模型只生成，不裁决。**

## 为什么这样做

编码有编译器，法律没有。coding agent 的飞轮来自即时验证；法律场景不长飞轮，我们就把飞轮铺出来——schema 校验、确定性脚本、信源锚点、门禁、评测集，全是人造验证器。不让模型每次推理决定，把路铺平，推理只放在关键语义。

## 信任承诺

数据存在你的电脑上，按案件分目录隔离；案件内容永不用于训练；上传的卷宗原件永远只读；连接状态只以真实请求成功为准；任何"自动执行不可逆动作"的代码路径不存在。

## 数字

500+ 提交 · 194 条端到端断言（假绿下限禁降）· 16 道机器门禁 · 850 条单元测试 · 一套跨模型治理判例集。

## 下载

macOS v0.1.1（Apple Silicon）：[下载 dmg](https://github.com/lesPrivilege/Courtwork/releases/download/v0.1.1/Courtwork_0.1.1_aarch64.dmg)

SHA-256：`9b760ccbd853c9c2a988db8f4055a655cd048c4f5e0614c5d40094e19e8f4877`

仓库：[github.com/lesPrivilege/Courtwork](https://github.com/lesPrivilege/Courtwork) ｜ 产品站：[lesprivilege.github.io/Courtwork](https://lesprivilege.github.io/Courtwork/)

---

*Cowork + u r t = Courtwork。you are there——没有人被取代，你就置身 loop 之中。*
