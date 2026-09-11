# Claude · Paper发布前串行施工单

2026-09-11。用户授权先发本单、Astra随后收尾icon、Luna规范新语义。**现可认领开工；完成发布前准备，不执行发布。** 沿既有Claude独立scratchpad交回，本文件不是已发送或已运行回执。无需等icon定稿或逐阶段批准。

## 输入与已裁选择

- CourtWork基线 `bf4b8081a1e4c6c3d680d388472f6f5c93092e62`；SE reader基线 `0f23ad1ebed4ff2ef42394a5b1744eaaff30dd75`。读取实际分支/HEAD/status，记录差异，使用隔离副本与独立端口。
- [v1接收与八项裁定](../../research/claude-paper-return-2026-09-11/v1/README.md)已经接受E1仅挂Canonical、章节sans／正文serif、宽屏details目录、黑宗默认与上横红彩宗并存。保留Astra的alt、元数据、资源失败与打印修补；不重开E1/E2/E3或页面构图选型。
- Paper内容仍固定9.6 / 2026-09-07 / d78fd312；不得改正文、译文、review manifest、论文作者与正式单位。不合并DSH观察分支，不把品牌背景写成论文命题。
- icon由Astra单独收尾：L为主体、双横减薄缩短并略下退、色彩鲜明而面积更小；数字以随后固定的资产manifest为准。Claude本单不画新几何，也不把旧9/26/gap8当不可更新的最终规格。

## 串行阶段

### 1 · 补齐阅读行为和可访问性证据

从v1的110项检查与明确未跑项开始，只补现有阅读面的实际缺口。验证浏览器back/forward、刷新与共享query/hash、长目录末项可达、键盘完整路径和焦点可见；中英三卷保持卷与章节。确认无脚本三卷、details可展开和无外部依赖。失败先修复，保留首次失败和修后证据；不要仅改断言。

测试真实浏览器200%缩放（若自动化只支持设备尺度，准确标模拟，不把DPR2称真实zoom）、系统深浅色、显式主题、reduced-motion、forced-colors。打印分别检查系统深色与显式深色、黑／彩署名和宽／紧凑封面；需要时修复SVG颜色映射，使结构在打印和高对比模式仍可辨。无法取得原生VoiceOver/IME或实体打印就清楚列未测，不模拟宣称通过；缺少这些环境不阻塞可做的准备。新UI控件不得增加。

### 2 · 形成可复现的发布候选

固定唯一release manifest：论文内容坐标、reader源码坐标、品牌资产版本/hash、候选输出/hash、命令、依赖、验证来源和未跑项。构建两次字节一致，核对全部既存src/translations/dist不变。保留独立-paper-v1或新唯一候选后缀；不能去后缀覆盖已跟踪历史HTML。校验默认中文/英文入口、真实静态链接、离线阅读和应用于SE基线的补丁。

此阶段可继续使用0f23ad1的现署名，manifest明确标记“等待Astra icon收尾”。除此以外的行为、排印、证据和打包全部完成；不得把等待一个SVG扩大为整单阻塞。

### 3 · 接入最终icon并一次返回

若Astra固定资产已到，核对明确提交+路径+hash，只替换同构的signature几何和已裁色值；保留宿主装饰性aria处理、单色currentColor、彩色宗类钩子。核验Paper实际署名尺寸与16/20/24/32明暗单色／彩色、1440/1280/390完整masthead，以及打印／forced-colors。若本次返回前资产尚未固定，交出其余完整包和唯一待接点，不猜测最终几何；Astra可在集成时消费确定资产。

提供可供发布owner执行的步骤：预检、候选至发布路径处理、准确workflow与线上字节核对、失败回退方案。这里只写可复核方案，不运行push、workflow_dispatch或部署，不将“准备完成”写成“已发布”。

## 交付与owner

Claude负责独立 `return-paper-prepublish-v1/`：RETURN.md、source-manifest.json、reader源与补丁、实际中英构建产物、verification原始结果及必要截图、RELEASE-PLAN.md。完整目录与ZIP逐文件一致，交明确本地路径、文件数、字节数、SHA-256。作者检查与非作者接受分开，测试模拟与原生检查分开，当前候选与线上版本分开。

你不是唯一作者。不得编辑共享CourtWork/SE checkout、checkout/stash/reset他人工作、读取凭据或运行付费provider；不创建产品工单于SE论文目录。原生SVG沿现有零依赖资产系统，品牌展示不产生review、authority或错误状态。

Astra拥有icon与跨仓集成、最终发布裁定；Luna负责新语义措辞与来源边界核对，不另立领域owner。Claude完成同范围后一次返回，不等重复批准。只有真实缺失输入或语义冲突需指出，同时继续独立可做的工作。

## Astra资产收尾补交 · 可直接消费

本单发出后的icon已固定为CourtWork `146e072ce0c4f7d52adeecbdf670ef2d15f31b56`、`brand/les-privilege/manifest.json` revision `optical-03`。Claude现已具备第三阶段输入，无需再等几何选型；这条固定引用优先于上文“若尚未到”的条件分支。必须从该提交读资产，不从后来浮动HEAD猜测。

采用L9、双横7×23、x24、y12/30、顶退4、水平间距7；红色浅底`#b4423b`、深底`#e9847b`。几何与色值由manifest和SVG字节持有；Paper当前0f23ad1尚未接入。黑宗默认／上横红彩宗并列，中横红／灰阶仍研究备选。Astra完成作者视觉收尾不等于Claude已接入、Luna已接受或线上已发布。
