# SOL-FINALE 发布清单

日期：2026-07-13

## LAUNCH-FIX 放行

- [x] 独立 clean worktree 验收 `origin/codex/launch-fix@559d8d9`
- [x] 遥测关闭后三发射点 sink `0/3`；拔门变异 `2/2` 必红，恢复后 `2/2` 绿
- [x] output 真路径拒绝宏 / XXE / zip bomb `3/3`；联合安全回归 `25/25`
- [x] UI 确认 → 真实 DOCX 落案件 `产出` → 存在性派生冻结；删除后 focus 重查解冻
- [x] 越界路径（穿越 / 子路径 / 绝对路径）拒绝；Rust 真实 37,601-byte DOCX 落盘、逐字节、删除 `18/18`
- [x] 全量：Vitest `850/850`，desktop `106/106`，Playwright `192/192`（4 workers）与 `192/192`（1 worker），lint / 全仓 build 绿
- [x] 验收 tip `a823bf6` 合流；`origin/main@0e39fc2` 对齐且祖先核验为真

## 快门与站点

- [x] 旧 visual-audit 退役；终版 7 帧重截，`manifest.json` 记录 commit / 1440×900@1x / 隔离端口
- [x] 六处演出照：首装欢迎、继续区、样板案 Preview、修订法理之线、未核验不入批量、Chat 真回复思考折叠
- [x] docs/37 编排骨架 × docs/70 文案落版；CSS Mac 窗框，无位图 mockup / 3D
- [x] 法理之线为唯一主微交互；`prefers-reduced-motion` 静止终态
- [x] OG `1200×630`
- [x] deslop 首跑因发布哈希占位 exit 1；真值回填后 exit 0
- [x] Lighthouse（mobile）Performance `100` / Accessibility `95` / Best Practices `100` / SEO `100`；LCP `1.4s`

## 构建、公开与承诺

- [x] v0.1.1 Apple Silicon DMG：4,619,716 bytes；`hdiutil verify` VALID；ad-hoc codesign 验证通过
- [x] SHA-256：`65e05db7fca017c8b4580a0050744c6168062d285eb5b0caf7a056c0dad856f7`
- [ ] 增量史秘密终扫与工作树密钥样式扫描
- [ ] 用户一键确认把 `lesPrivilege/Courtwork` 从 private 改为 public
- [ ] GitHub Pages 就地启用并验证站点
- [ ] GitHub Release `v0.1.1` 挂 dmg + `.sha256`
- [x] 三项承诺护栏最终复核：遥测门禁 `2/2` + desktop output `3/3`；DOCX 同源安全 `25/25`；Rust 真盘/越界 `18/18`；Word 接线 E2E `5/5`

仓库：https://github.com/lesPrivilege/Courtwork

产品站：https://lesprivilege.github.io/Courtwork/
