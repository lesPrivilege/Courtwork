# RELEASE-PLAN · SE Paper 阅读面候选 paper-v1 · 发布 owner 可复核步骤

作者：Claude（Fable 5.1）· 2026-09-11。**本文只写可复核方案；本轮未 push、未 workflow_dispatch、未部署。** 发布裁定与执行属 Astra / 用户。

## 0 · 对象与坐标

| 项 | 值 |
|---|---|
| 论文内容 | 9.6 · 2026-09-07 · SE `d78fd312955c1f594e59cbdcbb0d3074ac355940`（CourtWork `PAPER.md` 采用；本次不变） |
| 阅读面候选源 | SE `0f23ad1ebed4ff2ef42394a5b1744eaaff30dd75`（Astra 本地集成）+ 本包补丁 `patch/0001-*.patch`（reader.css：系统深色打印、forced-colors 映射） |
| 候选输出 | `papers/dist/schema-engineering-2026-09-07-reader-2026-09-11-paper-v1.html` 与 `-en.html`；当前入口 `index.html` / `index-en.html` 与之字节相同（hash 在 `release-manifest.json`） |
| 署名资产 | `papers/reader/signature.svg`@0f23ad1（几何 = CourtWork brand `mark.svg`@0227673）；**等待 Astra icon 收尾**，见 §4 |
| Pages workflow | SE `.github/workflows/pages.yml`：push 到 `main` 且路径命中 `papers/**`、README、CHANGELOG 或 workflow 时触发；也可 `workflow_dispatch`。build 步骤 = `python papers/build_en.py && python papers/build.py`，validate = `python papers/validate.py`，上传 `papers/dist` 全目录 |
| 线上入口 | `https://lesprivilege.github.io/Schema-Engineering/index.html`、`/index-en.html` |

候选与线上分开：线上现为 origin/main `8b2839a` 的 2026-09-10 reader（本地 main 领先 reader-controls、paper-v1 集成与本补丁）。

## 1 · 预检（发布前，本地干净 checkout）

```bash
git -C "<SE>" status --short            # 必须为空；不得携带他人未提交改动
git -C "<SE>" log --oneline -3          # 顶部应为 0f23ad1 之后的本补丁提交（或 Astra 等价集成）
git -C "<SE>" branch --contains codex/dsh-observation-20260910 | grep -q main && echo "DSH branch merged: STOP"   # 本轮不合并
python3 -m pip install -r papers/requirements.txt
python3 papers/check_translation_alignment.py --self-test
python3 papers/qa/test_translation_gate.py
python3 papers/qa/test_reader_assets.py
python3 papers/build_en.py && python3 papers/build.py && python3 papers/validate.py
```

再跑一次 build 并比较 `papers/dist/index.html`、`index-en.html` 的 sha256 与 `release-manifest.json` 的 `candidate_outputs` 相同（同一 markdown2 2.5.5 与源字节即应一致）。不一致即停止：说明源或依赖已漂移。

浏览器（可选但建议）：

```bash
python3 -m http.server 8962 --directory papers/dist &
node papers/qa/verify_reader.mjs --origin http://127.0.0.1:8962/ --out /tmp/se-reader-qa        # 期望 110/110
node <本包>/tools/verify_prepublish.mjs --origin http://127.0.0.1:8962/ --out /tmp/se-prepub    # 期望 50/50
```

## 2 · 候选到发布的路径处理

现行构建把候选写入带 `-paper-v1` 的独立文件，并把同一内容复制为 `index.html`/`index-en.html`（二者 gitignored，只由 workflow 生成）。因此**发布不需要去掉后缀或改写任何已跟踪 HTML**：push 后 workflow 重建，线上入口即候选内容，历史带日期文件保持字节不变。

两种可选处理，由 Astra 裁：

- **A（推荐，最小）**：保持 `READER_CANDIDATE = "paper-v1"`，发布带后缀文件与入口。回执把“paper-v1”记为 2026-09-11 阅读面修订的正式标识。
- **B**：新的唯一候选后缀（例如 `paper-v1-r2`）以区分 Astra 集成后再修的版本；只改 `build.py` 一个常量并重建。同样不删除、不覆盖既存文件。

禁止：去后缀写回 `schema-engineering-2026-09-07-reader-2026-09-11.html`（会覆盖已跟踪的 9/11 文件）。

CHANGELOG / README：发布面修订不改论文版本号；若需登记，只在 `papers/notes/publication-surface.md` 加一节“Reader candidate paper-v1 · 2026-09-11”，属 `docs:` 提交，仍会触发 Pages。

## 3 · 发布与线上字节核对

```bash
git -C "<SE>" push origin main                                         # 触发 "Publish papers"
gh run list -R lesPrivilege/Schema-Engineering --workflow pages.yml -L 1   # 取 run id
gh run watch <run-id> -R lesPrivilege/Schema-Engineering --exit-status
```

workflow 成功后核对线上字节（不信任缓存，用 `Cache-Control: no-cache`）：

```bash
for f in index.html index-en.html schema-engineering-2026-09-07-reader-2026-09-11-paper-v1.html schema-engineering-2026-09-07-reader-2026-09-11-paper-v1-en.html; do
  curl -sSL -H 'Cache-Control: no-cache' "https://lesprivilege.github.io/Schema-Engineering/$f" | shasum -a 256 | sed "s/-/$f/"
done
```

四个 hash 必须等于本地 `papers/dist` 对应文件与 `release-manifest.json`。另核 `<meta name="source-commit">`=`a0234bc4…`、`paper-edition`=`2026-09-07`、`reader-candidate`=`paper-v1`；历史文件（如 `schema-engineering-2026-09-07.html`）线上 hash 与仓内一致。核对通过后再写发布回执（run id、时间、四个 hash），CourtWork 侧只更新 `engineering/current.md` 与证据，不改 `PAPER.md` 采用 SHA。

## 4 · 待接点：Astra icon 收尾

若发布前资产已固定：核对 `brand/les-privilege/manifest.json` 的提交 + 路径 + hash → 只替换 `papers/reader/signature.svg` 中 `<path class="lp-l">` 与两条 `<rect class="lp-bar …">` 的几何（保留 `aria-hidden`、`focusable="false"`、`lp-mast-title`、class 钩子、`currentColor` 与彩色宗变量）→ 重建 → 重跑 `tools/icon-specimen.mjs` 与 `verify_prepublish.mjs`（含打印 / forced-colors）→ 更新 manifest 的 `signature` 段。

若资产未固定：按本包现状发布 0f23ad1 署名，manifest `signature.status = "awaiting-astra-icon-finalization"`；后续换 icon 是一次独立 reader 修订，不改论文版本。

## 5 · 失败回退

- **workflow 失败**：线上不变（deploy 未执行）。修复后重推；不要 `workflow_dispatch` 旧节点。
- **线上 hash 不一致**：多为 CDN 缓存或依赖漂移。先 `no-cache` 重取；仍不一致则查 Actions 日志中的 markdown2 版本与源 hash，不手改产物。
- **发布后需撤回**：`git revert` 本补丁与 `853af2f`/`0f23ad1`（反序）并 push；workflow 重建为 2017b824 的 2026-09-11 reader（入口指向 `schema-engineering-2026-09-07-reader-2026-09-11.html`）。带日期候选文件可保留在仓内，不影响入口。
- **不可用的回退**：不要 force-push、不要删除历史 dist 文件、不要改 `PAPER.md` 采用坐标。
