# Schema Engineering

Schema engineering 是 Courtwork 的核心方法：把领域判断编译成模型可写、系统可验、人可读改签的契约。

## 一、三位一体

一个 schema 同时是：

- 限定：规定模型可以表达什么、不能表达什么；
- 界面：决定人看到什么、如何核对和修正；
- 载体：承载事件、投影、存储、评测与跨系统交换。

字段不是数据容器，而是业务判断的形状。字段名、枚举、确认策略、证据要求和渲染方式必须共同设计。

## 二、双后端编译

每个可注册 artifact 必须能编译到两个后端：

1. 模型后端：提示词段、输出 schema、目标地址和交互动词；
2. 人类后端：renderer、词表、状态、来源展开和确认动作。

只有模型能写而人无法有效复核的 schema 不完整；只有 UI 表单而模型输出无约束的 schema 同样不完整。

## 三、Descriptor 最小集

artifact descriptor 至少声明：

- namespaced type id 与 schema；
- 字段词表与枚举文案；
- rehydration projection；
- renderer / ui template；
- confirmation policy；
- 来源与引用要求；
- 缺失 renderer 时的通用只读结构兜底。

## 四、渐进完备与交互语义

数组型 artifact 逐条校验：合法单元入库，失败单元携具体错误做定点重试；预算耗尽后必须显示部分成功和 coverage 缺口。不得因一项失败丢弃全部，也不得静默省略失败项。

交互不直接拼进下一轮 prompt。确认、驳回与修正先写 RevisionEvent，再更新 artifact，最后由确定性投影进入续行上下文。用户修正是最高优先级事实，默认不触发自动重推理。

## 五、零编码暴露

wire id、字段名、枚举值、绝对路径、hash 和 provider 错误码只进入诊断层。普通界面必须通过 descriptor 词表、相对路径和领域文案投影；词表不全时拒载或显式降级，不回落机器字段名。

## 六、经济性

prompt 措辞与模型怪癖会折旧；领域字段、验证器、词表、数据源和确认规则会复利。模型变强会提高填表质量，却不会取代法规更新、来源公证、门禁维护和 schema 演进的职权。
