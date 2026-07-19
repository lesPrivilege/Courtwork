# SKIN-R2-OVERFLOW-1 · 首行与 composer 溢出证据

状态：实现侧后帧；待独立验收。

权威签署投影：`../SKIN-R2-P2/OVERFLOW-SIGNATURE.md`

## 红证

| 对象 | 修前实测 | 失败性质 |
|---|---:|---|
| detached chrome / case title | `titleLeft=22`，`chromeRight+8=147` | 标题进入原生交通灯与应用按钮安全区 |
| composer disclaimer | `scrollWidth=551`，`clientWidth=396` | 视口宽度误代 composer 容器宽度，文字跨入右工作面 |

失败测试均在独立端口 `19521` 先红；误差不是截图目测推断，而是同一真实比较态 DOM 几何。

## 最小实现与后帧

- P2-L19：标题左内距由交通灯锚、两枚应用按钮、组内 gap 与 8px 内容净距计算；不写窗口绝对坐标。
- P2-L20：单行门改为 `.composer-stack` inline-size 的 `@container (min-width:576px)`；窄列保持正常换行。
- 独立端口 `19522` 上 P2-L17…L20 四条同跑全绿。
- 完整 317 条首跑触红旧 RP-2.5 的 viewport-based `nowrap` 断言；该旧约正是本缺陷根因，现改为
  1180/1240/1440/1600 四档均量 disclaimer 自身 scroll/client 宽度与 composer/chat 右界。
- 浏览器 1280×720 真帧：`after/browser-comparison-1280x720.png`，SHA-256
  `2b5f1c9cb72767564ccc5f2e9d6847cb0fe67f27ddc8a7d42aa4460e364a825b`。

后帧精确几何：`chromeRight=139`、`titleLeft=147`；composer stack `[8,428]`、disclaimer `[20,416]`，
`scrollWidth=clientWidth=396`，右工作面从 `456` 起。免责声明折成两行但留在自己的阅读列内。

## 边界

产品壳按中间档修正。零新色、字体、字重、阴影、圆角、状态、持久化或交互；Pages 截图不在本小批
提前替换，待 VERSIONAL-LANG-1 与两轮独立验收全部结束后重摄，避免把过渡帧写成发布真值。
