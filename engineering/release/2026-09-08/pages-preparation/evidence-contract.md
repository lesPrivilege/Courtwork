# 发布内容与产品证据契约

用途：P2/P3 实施输入，不是第二份工程状态清单。快照基线 `b0173deab477b9be577df75a712f446d14e3c356`；后续发布须用实际发布 SHA 重新取证。

用户后续指定的收尾输入为 `bcbca1b3b6b848f8976a12e697e0972cf975b3bf`（继承上述快照，app 与 delivery 所引 `0bc416b` 一致）。它是 fresh Astra 联调起点，不是通过真实链验证的发布 SHA；媒体仍等联调实际交付后绑定最终版本。

## 声称到来源

| 可编写的内容 | 核验入口（相对仓根） | 允许支持的范围 |
|---|---|---|
| Web UI、本地 runtime、可检查的工具活动 | README.md；engineering/current.md；app/ | 实验候选的具体已支持路径；不等同云托管服务或正式桌面发行 |
| Runtime policy / MCP 的真实控制 | docs/runtime-control/api.md；evidence/node2-independent/README.md | 固定节点本地 fixture 与后端/浏览器证据；不外推真实 provider 全链 |
| Review / commit 的职责区别 | engineering/design/work-surface-boundaries.md；engineering/mvp/execution/work-surface-kit/contracts/review-projection.md | permission/question/outcome 的当前边界；outcome 不宣称为专业成果已接受 |
| 品牌语义与材质 | brand/CONTRACT.md；brand/evidence/ACCEPTANCE.md | 图形语义与组件验证；不支持产品能力声明 |
| Schema Engineering | PAPER.md | 采用 9.6 / d78fd312955c1f594e59cbdcbb0d3074ac355940（2026-09-08 发布，DEC-012）；最新阅读页单独链接 |
| 历史桌面发布与测试 | engineering/migration/2026-09-08/README.md 指定的 frozen legacy SHA | 历史版本单列；不复用旧 v0.1.2 或测试总数作 fresh 的发行/质量 badge |

以上路径在固定快照存在不意味着都已公开可访问。发布时逐条核实远端；本地证据若尚未进入公开载荷，只能准备经过筛选的公开摘要，不能给读者坏链接。

## 每一份产品媒体必须携带

`id, kind, source_sha, capture_date, viewport, theme, data_kind, setup_steps, displayed_path, evidence_path, asset_path, sha256, claim_ids, limitations`。

kind 区分 product-screenshot / product-recording / interactive-fixture / design-prototype；data_kind 区分 synthetic / public-example，实测使用真实 provider 时另记 provider_mode，不写入密钥。状态文本必须与截图所属同一运行/对象一致。图注至少显示版本、数据性质与演示范围。

没有真实 provider 的录像可以证明界面与确定性 fixture 回路，不能命名为真实模型端到端演示。失败/取消/未知效果应显示实际回执，不能以剪辑或动画变成成功。

## 发布 manifest（后续生成）

字段：`source_sha, site_sha, built_at, locale_content_hashes, media_manifest, evidence_links, supported_platforms, download_assets, known_limits`。

source_sha 指产品证据版本；site_sha 指页面源版本，可不同但关系必须明确。download_assets 为空时不出现可下载按钮；有包时记录版本、平台、SHA-256 与实际 release URL。语言切换保持相同事实和版本，hash 校验不替代语义复核。

## 视觉与交互验收

桌面建议 1440×900，窄屏 390×844，另查 200% 缩放、键盘顺序、可见焦点、触摸与 reduced-motion。媒体读得清、没有横向溢出、页面滚动可中断，反向滚动不留下失效叠层。动画关闭或 JS 不可用仍能到达全部核心信息。截图及验收结果来自实际页面，不以本契约声明为通过。

## 两个交付面的数据边界

发布页读取公开产品证据。career-kit 可通过固定 SHA 与相同 claim 核实简历，但联系人、内部面谈、企业材料、个人投递包不复制到 CourtWork。简历中的 ownership 与产品运行/质量数字分别核对，不把仓库总量或上游成果转成个人贡献。
