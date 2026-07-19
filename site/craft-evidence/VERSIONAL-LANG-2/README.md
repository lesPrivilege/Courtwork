# VERSIONAL-LANG-2 证据索引

- 前置红证：`versional-language-contract.test.mjs` 在旧消费值上同时定点报出 `VL2-C01 / T01 / L01 / L02`。
- 档位账：见 [`PROPOSAL.md`](PROPOSAL.md) 与 `docs/design/r2-tier-ledger.json`。
- 前帧复用上一批已登记的深宗实页：`../VERSIONAL-LANG-1/after/pages-hero-1280x720.png`，SHA-256 `5b47d2f832252f0186794be68704e2d7fdd5412a7af1b6da368f86b36994bfd7`。
- 后帧由 Codex in-app Browser 访问本地真实 `site/`（`1440×900`）摄得：
  - `after-pages-hero-1440x900.png`，SHA-256 `0e7cfc6d7b983be664db4196b4c61e6ffbc17e1a18b89f0d3471b539fa3093dd`
  - `after-pages-evidence-1440x900.png`，SHA-256 `822094d39f0a8c96ac717ad65119bbfff2c519c6eec944866f8a928b5aae87f0`
- 计算样式：`1440×900` 下横向溢出 `0px`；Hero 为 `Noto Serif SC`、`font-weight:700`；根色阶为 `#F7F8FA / #F2F4F7 / #FFFFFF`，正文 `#232B38`，hairline `#D5DAE3`；四栏 `border-right:0px`、scenario 行 `border-top:0px`。`375×812` 下横向溢出仍为 `0px`，Hero 盒 `327px` 宽、左右各 `24px` 安全余量。
- `og.html` 同宗重渲为真实 `1200×630` PNG：`site/assets/og.png`，SHA-256 `a91c0120bb679c66e4c5f5dcb6ef2c9c1eb9a416b05d4bf716865e5c856fdc2a`。
- 新增概念：0。只更换既有 token 消费宗、字体既有字重和既有边线值；无新依赖、状态机、持久化格式或跨层接口。
