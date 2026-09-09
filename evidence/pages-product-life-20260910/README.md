# Pages product-life surfaces

2026-09-10，Astra实现；从Pages polish `f617a6c`接续，分支`codex/pages-polish-20260910`。消费用户本轮六件套review；Luna只读核媒体、固定快照Models/数据边界/历史，Astra裁决与实现。共享产品Home与服务没有改动。

## 六个入口

- `tour.html`：十类状态索引、六张现有完整截图、逐图caption/manifest/哈希。Matter接完整回放；running/stop、独立MCP、Settings其余面缺图明确待补。旧Home注明9e5384f，沿前轮授权等待新版完工再拍，不声称已经交齐十张新实机图。
- `get.html`：概念桌面分发与真实source install并列。Download preview打开原生dialog，说明未分发桌面包；没有虚构DMG、大小、签名或架构支持。源码命令checkout完整证据SHA、忽略安装脚本、使用仓库外专属数据目录，复制失败保留手动选择。
- `cli.html`：七个离线命令（help/status/open nda/review/provenance/models/clear）。数字、来源摘要、候选与状态版本来自录制。输入仅textContent，绝不执行shell、provider或decide；Review/Models/来源跳转可实际使用。无JavaScript保留回放入口。
- `changelog.html`：四条真实提交（Home、Settings、Models、provider目录探测），不假装binary release。
- `models.html`：固定runtime目录OpenAI/DeepSeek/local fake，真实provider未取证；compatible只做目录探测，不暗示任意连接可保存/执行或key验证成功。
- `data.html`：本地Core/dataDir、请求provider、credentials.json权限、工具效果、静态网站的独立边界。没有认证、零日志、系统钥匙串或“所有数据永不离机”假承诺。

首页只增加导航与页脚入口。0.1.0从固定SHA的app/package.json读取并标source preview；machine provenance保持9e5384f。build manifest列出六页与source_preview_version，download_assets仍为空。静态icon使用同一canonical四矩形和浅灰横栏。

## 检查

新增`site/scripts/verify-product-pages.mjs`涵盖六页深浅主题对比度/同源资源、390px与200%重排、dialog/Escape、剪贴板拒绝回退、CLI真实数值与来源/XSS输入/跳转/无外部请求、tour缺席态和无JS。沿用首页18项回归。`check-links`增加六页固定SHA路径/真实changelog提交核验；保留subpath检查。`check-material`禁止新CSS重定义产品语义token。两次构建需字节一致；public-data测试继续执行。

初轮修正页脚caption与深底对比度；下载Escape测试使用真实键码而非不产生默认动作的CDP事件。后发现浏览器会隐式请求根路径favicon，增加同源subpath SVG icon。所有这些属于作者验证，不冒充独立产品接受。

## 接续

Home完工后按现有同SHA取证合同统一更新媒体、标本、benchmark，禁止仅替换PNG。新页面可本地预览；本单不部署，不把前一版发布回执套给本版。不改变产品schema、G1–G5或品牌glyph选向。

作者验证结果：子页36/36、首页18/18、公开数据3/3、固定来源/子路径链接与材质守卫通过。六页1440深浅主题、390/200%均无横向溢出；两次构建manifest一致。CLI无JS隐藏form并禁用命令按钮，避免原生GET意外提交输入。
