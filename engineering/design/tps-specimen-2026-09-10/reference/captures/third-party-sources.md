# 第三方原文来源清单

核验时读取的第三方原文不入库，只在这里记录固定出处与读取字节的 SHA-256。README 中的行号引用以这些字节为准；需要复核时按出处重新取回并比对哈希。2026-09-10 读取。

| 读取文件（未入库） | 出处 | 许可 | SHA-256 | 行数 |
|---|---|---|---|---|
| pi-pulse `docs/architecture.md` | https://github.com/codegiveness/pi-pulse @ `56a2819c795435e492b5cdef9ea13ad8c688fc23` | MIT | `5f3adb184cc75b09e6ddfba3e540484066394ac303093b670597e4036d61d53f` | 521 |
| pi-pulse `docs/metrics.md` | 同上 | MIT | `3bd51a510b5cdc0890fefdfb08a8576c140e772147ff81e9452e52f0c504e2e2` | 181 |
| Unsloth `studio/backend/core/inference/generation_timing.py` | https://github.com/unslothai/unsloth @ `6f443b5c` | 以仓库许可为准 | `ce734489a5bd7605f98035ff9fa5c705fc1542989cbd49646081721587cc4e65` | 140 |
| Unsloth `studio/frontend/src/components/assistant-ui/message-timing.tsx` | 同上 | 以仓库许可为准 | `d2e23d9ba6f7855289b752903391d99c29320fdeb34d374e14f7c09c493d4f6d` | 343 |
| PostHog Docs · Generations（Markdown 导出，经 https://posthog.com/llms.txt 索引） | posthog.com，未固定修订 | 以站点条款为准 | `763de4801172abec8d52f2ebd6c3b03e154ec8656e307f2897592e26f1d5dc4c` | 180 |

本目录保留的是本单自写的脚本、运行输出与短摘录；上表原文已从提交中移除。
