# 独立审计交接：自足版本坐标（2026-07-12）

本文件供独立审计会话取用。描述树面合并收尾后的自足版本状态与验证证据。审计完成后可删。

## 版本坐标

- **main tip**：`bf9e5a1`（clean 树，`git status --porcelain` 零行）
- **领先 origin**：35 提交，**未 push**（推送节奏归架构/用户；审计通过后再定）
- **worktree**：唯一主树，无残留（早先 lint-probe 探测树已清）
- **分支**：无未合并分支（`git branch --no-merged main` 空）

## 机器门实测（clean 树，退出码保真——不经 `| tail` 吞码）

| 门 | 结果 |
|---|---|
| `pnpm -r run build`（全仓真实 tsc） | exit 0 |
| `pnpm --filter @courtwork/desktop exec tsc -b` | exit 0 |
| `pnpm test`（vitest 全仓） | 85 文件 / **734/734** |
| `pnpm --filter @courtwork/desktop test`（desktop 单测） | 20 文件 / **94/94** |
| `npx eslint .`（整仓真绿） | **exit 0** |
| 16 门禁 + Playwright（`test:e2e`） | **R1/R2 连续 186/186 exit 0** |
| floor（`assert-test-count`） | **182**（禁降史 …169→171→172→173→176→181→182） |
| `demo:s3` golden | PASS，预埋考点 7/7（RELEASE-1 已验，本轮未回归） |

## 树面合并收尾明细

会话全程守共享索引纪律（pathspec 提交），双线（FABLE-BASE 本线 + GPT-SCHEMA sol 线）改动交错在共享树。收尾时清点判归后合并：

- **真实净内容改动两处已收编**：
  1. `72827da` Panels.tsx 一处未用 `index` 参数清除（FABLE-BASE lint 清账遗留，标注"随他线收编"的一处）
  2. `bf9e5a1` docs/69 第 10 章 Emil Design skill 对拍裁决（**代 GPT-SCHEMA/sol 线收编**其完成态文档产出）
- **索引残骸已清（reset）**：sol 在 index 里 staged 但工作树已回退的净零中间态（PreviewHost/renderers 改动、schema-polish/schema-seams spec 删除、docs 48/53/55/90/93 幽灵删除）。工作树整体 == 会话全程门禁基线，reset 未丢任何工作树真实产出。
- **安全网**：清理前 index staged 全量（10 文件/429 行）备份至会话 scratchpad `index-staged-backup.patch`——若 sol 线需恢复其中间态，可从该 patch 取。

## 审计建议关注点（本会话自曝与留置，供审计核实）

1. **lint 假绿判例**：RELEASE-1 验收表"lint 零 error"为假绿（历史 `pnpm lint | tail` 吞退出码，143 errors 长期隐身）。本会话修至整仓 exit 0 并更正记录。**审计应独立复跑 `npx eslint .` 验退出码，勿信任何经管道尾命令的 lint 记录。**
2. **报裁五项已清**：测宽 760 / chat 隐式存入 / 默认 Model tab / Model 页英文去重 / Popover 撤 Provider——五项当场裁决全落地（ef861c1→a09d28b + af56b0a/99b1527），各带守护测试。
3. **词表归宿留置（非缺陷，如实标注）**：CredentialForm 的 F4 分型文案与钥匙串恢复指引仍中文；Model 页 chrome 律余项——词表归宿另裁未动。
4. **DBG-4 待用户 trace**：keychain 多弹 + 导入反馈怪象照预裁等真机 trace 回传，本会话未动。
5. **慢火池（task chip 已发）**：desktop 死代码/孤儿 CSS 清理专单（RELEASE-1 盘出，置信度分级见 ACCEPTANCE，statusbar 族须先核 rp1/rp2 断言方向）。

## 验收记录归档

完整逐单验收在 `apps/desktop/ACCEPTANCE.md`（RELEASE-1 / FABLE-BASE 底座修缮 / FABLE-BASE 五裁执行三节）。
