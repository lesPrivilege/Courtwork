# 候选来源与锁版

- 候选：Sarasa Gothic `v1.0.40`，功能轨取 `SarasaUiSC`，数据轨取 `SarasaMonoSC`。
- 上游：https://github.com/be5invis/sarasa-gothic
- Release：https://github.com/be5invis/sarasa-gothic/releases/tag/v1.0.40
- 许可：SIL Open Font License 1.1（上游仓与 release 许可文件；此证据批不把字体资产写入产品消费层）。
- `SarasaUiSC.7z`：`bb9891c8be805cd0dae942a07472b3031db2510741b7cde42e9591f74a186f6a`
- `SarasaMonoSC.7z`：`4ff5dcbc3f8c6990aaf93dfc87aca5f6c79bcdc66f8027139a1c340c0023faf4`
- 盲测子集字符来源：desktop / demo-data / legal / pm 的实际 TS/TSX/JSON/Markdown 内容，共 `1489` codepoints、`1329` Han；子集只供实验加载与包体估算，不构成产品 subset manifest。
- `SarasaUiSC-Regular-blind.woff2`：`2ce5e02328a8f1cd031f11593ae51d6ec2ebf5ee89c553a97f50f01fa1e94015`
- `SarasaUiSC-SemiBold-blind.woff2`：`4f61c753b02531b34dd1724c5ff8165c573b0146418ad81d95d55188f7385cb4`
- `SarasaMonoSC-Regular-blind.woff2`：`d06afd9cdd70db2e95583626918b9e3149458e90acbbe5893530e2a1d512049a`

实验 CSS 只在 Playwright page 内以 data URL 注入。`apps/desktop/src/**`、`docs/design/tokens.json`、现行 `@font-face`、subset manifest 与 SOURCE 链均未改。
