# Settings 空间层级 · M1 施工与裁决

2026-09-13，Astra 作者与选型；Luna 源码探索及非作者复核。基线 `11cfe4a5b5e9012a5d21c369ad2808703f37e5d2`，分支 `codex/ui-hierarchy-polish-20260913`。沿[原层级登记](../hierarchy-polish-registration.md) IA-2 施工；不宣告全站 IA 完成。

## 选型与范围

实际浏览器先检查 Home、Chat/Work rail、General 和 Developer/Runtime。Home 已有主输入锚点与差异化模块；Chat 已有 raised composer 和独立消息滚动；Attention UI02 已完成，因此本片不重复抬高这些面。Luna 两份源码探索均确认这些关系。唯一采用候选是 Settings 的 M1 连续实色配置面。

M0：General/Runtime 的多个 settings-block 各有完整边框和圆角，和页面同底；组标题随内容滚出。M1：settings-sections 保持原滚动 owner，在原820px measure内承担实色、边界和圆角；内部块以平整 divider 分组。当前组标题随滚动保留，搜索显示多组时回到普通流。容器不加阴影或blur，避免把持久配置页误作浮层；无M2用途，不制作Glass版本。

最近先例：基线内 [Attention reading](../../../../app/web/styles.css) 的 contained solid plane、[Work rail](../../../../app/web/surface-layout.css) 的外容器/平整内部关系。只复用关系，不复制rail浮动几何。依据[frontend-contract](../../agent-interface-2026-09-10/frontend-contract.md)及[material grammar](../../home-composition-2026-09-10/material-grammar.md)。官方[Atlassian elevation](https://atlassian.design/foundations/elevation)于本日定向读取，其稀疏强调、用边界表达滚动裁切的建议只作参考，不导入其token或z-index。

## 合同与实现

唯一产品改动为 [styles.css](../../../../app/web/styles.css) Settings规则。Semantic、projection、control及权限owner不变；配置请求值/有效值/历史bound值保留，Runtime mounts和scrollTop恢复仍由原控制器持有。无新词、颜色、token、依赖、状态或blur消费者。Review/danger/selected/focus继续各自语义。

- 组标题 sticky 复用现有层叠值1与实色背景；scroll-padding给键盘目标预留标题空间。
- 多组结果用可见tabpanel关系取消sticky，不新增搜索状态源。
- 面板键盘焦点由可见scroll plane画完整内缩环，避免长tabpanel轮廓离开屏幕或被标题覆盖。
- 窄屏导航行auto、内容行minmax(0,1fr)，保持短页与搜索空态的阅读面从导航下面开始。
- 组内表格的横向滚动、配置行控件与字段不动。

## 合成环境与操作

独立worktree安装现有app依赖后运行 `node engineering/design/attention-ui-handoff-2026-09-13/astra-acceptance/runtime-fixture.mjs`。该现有fixture通过boot创建独立临时数据与本地fake provider，端口动态分配，不调用付费provider或个人数据。本轮浏览器端口56310；只用于本地预览，不是持久服务。首页输入并发送 `Summarize the next three review steps for this synthetic hierarchy check.`，等待fake响应。点击Settings进入General；Developer或Work rail的Open runtime进入Runtime。重载后须重新打开该Chat以匹配This chat/Session数据。

1. 1440×900 light/medium：General及Developer固定同一Chat前后截图，检查入口、原控件和分组。
2. Developer的Refresh控件按PageDown：scrollTop达到714，标题保持内容面顶部；Runtime内容仍由原容器滚动。
3. 390×844 dark/large与1280×900 dark/large：检查导航下拉、长说明、读写范围标签、配置面不横溢。
4. 搜索file：General、Models、Tools & Integrations、Developer四标题均为static；Escape清除查询并保留Settings。
5. 搜索zzhierarchynomatch：无结果提示在导航正下方；Escape恢复。早期候选空态位置错误已修正。
6. 桌面General tab按End：仅焦点移到Developer，Enter后进入Developer tabpanel。长tabpanel焦点轮廓问题已修正为可见容器环。

截图为作者候选证据，非自动golden；before文件固定基线，after文件依据最终验证轮刷新。Luna复核另列[luna-review.md](luna-review.md)，不能将其源码检查称作非作者浏览器接受。

## 验证边界

颜色、材质、交互、形状检查通过；对比度报告通过；Settings navigation/preferences定向测试35/35。完整浏览器检查收尾后记录在下文。没有更改服务状态或动作，因此不运行全量runtime suite或付费provider。未做原生200% zoom、系统forced-colors/reduced-transparency、读屏、真实失败/在途Runtime状态；本片无新增blur或motion，不能把现有回退lint当成系统实测。窄屏与大字偏好不能替代原生zoom。最终1440和390明色截图以final前缀为准；dark/large截图早于最后一项焦点环修正，未据其声称新焦点环暗色实测。

## 剩余队列

本片只收敛Settings空间编排；Runtime信息预算、Home/Chat剩余差额和其他IA节点继续沿原队列，不因本片完成而关闭。独立tree交付，不push、不部署、不自动合入main。

## 最终作者回执

最终键盘验证：End仅移动tab焦点，Enter后activeElement为settings-developer；可见容器outline为2px focus，整圈完整。PageDown后标题仍固定，Tab回到Session控件时控件顶部370.34px、标题底137px，无遮挡。390窄屏document宽390，配置面起点180px，无文档横向溢出。跨组搜索四标题均static；Escape保留设置页。1440 General基线/最终图在同一次图像输入内并列检查，字段、控件顺序、三个分组完整；接受实色连续面方向。

| 场景 | 基线 | 候选 |
| --- | --- | --- |
| General，同一Chat | [M0](before-general-1440.png) | [最终M1](final-general-1440-light.png) |
| Runtime，同一Chat | [M0](before-runtime-1440.png) | [完整焦点环](final-runtime-focus-1440-light.png)、[长页滚动](final-runtime-scrolled-1440-light.png) |
| 390窄屏 | 本片未保存窄屏M0 | [最终light](final-runtime-390-light.png)、[dark/large](after-runtime-390-dark-large.png)、[搜索空态修复](after-empty-390-dark-large.png) |
| 1280桌面 | 本片未保存1280 M0 | [dark/large](after-runtime-1280-dark-large.png)、[多组搜索](after-search-1280-dark-large.png) |

最终另通过 `node tools/check-product-copy.mjs`、`node tools/check-semantic-consumers.mjs`、`git diff --check`；CSS末次修正后重跑colors/materials/interaction/shapes均通过。35项定向测试运行后没有JS改动。

静态输出与最终CSS SHA-256见[checks.json](checks.json)。
