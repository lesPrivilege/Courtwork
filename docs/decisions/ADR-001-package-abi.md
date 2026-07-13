# ADR-001：包 ABI 与依赖边界

- 状态：Accepted
- 日期：2026-07-13
- 来源：`77ba9b5`、`6589c76`、`a9549e1`、`7391cd9`、`83d6867`、`a566705`

## 上下文

早期“所有依赖只能指向 schemas”的表述无法准确描述 core 组合 tools/output、垂类包使用 registry、desktop 承载 renderer 的真实需要，也掩盖了合法装配边与非法领域渗漏的区别。

## 决定

采用三层边界：

1. 契约层：schemas 与 registry，稳定、无领域运行逻辑；
2. 机器层：core、tools、reading-view、output，领域盲；
3. 绑定层：vertical package manifest、composition、acceptance 与 desktop host。

依赖必须无环并朝稳定层收敛。跨域依赖仅能出现在绑定层；领域包不得反向依赖 desktop/core 实现；desktop 不得复制领域类型路由和词表。

demo-data 只可由明确的 demo/测试装配消费，真实执行链必须有反向污染守卫。

## 后果

- 新垂类以 package manifest 接入，不修改 core 领域分支；
- package admission 校验 namespaced id、descriptor、renderer、projection 与 confirmation policy；
- 依赖审计必须同时看 manifest 和生产 import，不能只看 `package.json`。
