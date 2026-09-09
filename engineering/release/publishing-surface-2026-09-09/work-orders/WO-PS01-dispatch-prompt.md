# WO-PS-01 派单提示词（Fable → Opus `opus-wo-medium`，2026-09-09）

你是 Claude Opus，执行一张有界工单：Courtwork 发布面站点 WO-PS-01。

工单：`<isolated-checkout>/engineering/release/publishing-surface-2026-09-09/work-orders/WO-PS-01-site.md`。先读它，再读同目录 `intake.md`（PS-1…PS-19）与 `public-copy-v2.md`（全部文案，逐字取用，不改；要改就记入交付的"待裁定"）。explore 回执在 `explore/`：ex-ps3（标本模块、数据源、捕获序列、7 处绝对路径、ABI）、ex-ps4（Eval 八问）、ex-ps2（素材映射）。体例：`<isolated-checkout>/engineering/mvp/execution/work-surface-kit/handoff-convention.md`。

工作树：`<isolated-checkout>`，分支 `claude/ps01-site`，基线 `main` `172130e`（已建好）。写权：`site/**`、`README.md`、`.github/workflows/pages.yml`。不得改 `app/**`、`brand/src/**`、`PAPER.md`、`engineering/**`（交付文件 `engineering/release/publishing-surface-2026-09-09/delivery-ps-01.md` 除外，写在你的树里）。端口 8907（站点预览）、8908（产品实例，用于标本与媒体捕获）；数据目录 `/private/tmp/se-agent-ps01-data`；benchmark 输出先到 `/private/tmp/se-agent-ps01-bench/`。

不得：站点独有颜色 / 阴影 / 圆角；任何外部请求（字体、脚本、统计、iframe 外链）；打字动画、假光标、自动播放、scroll reveal；页面上出现内部编号（WK / PS / BE / G）；把 fixture 或 loopback 运行写成真实模型；pricing / plan / enterprise / beta / coming soon。发明 ontology 或新增状态词也不得。

顺序建议：① 构建脚本与 token 抽取 → ② 捕获脚本（标本 JSON，含三层）→ ③ 复制产品纯模块并改写 7 处路径、写 manifest → ④ 标本壳与 iframe 页 → ⑤ 六段页面与 README → ⑥ 媒体捕获 M1–M7 → ⑦ benchmark 在基线 SHA 重跑并入 evidence → ⑧ workflow → ⑨ 验证清单与交付。每步提交一次，提交信息说明改了什么。

交付 `delivery-ps-01.md`：commit SHA、改动文件、每条验证命令与结果原文、未验证清单、"哪一像素改变了哪一判断"、五轮收敛表、待裁定。作者验证不等于独立验收；不要宣称已部署。完成后回报交付文件路径与分支头 SHA。
