# in-app Browser computer-use 复核

浏览器类型：`iab`。复核由主实现会话在盲组织者锁分后执行；每组 C/D 在同一 Gate 终态、同一滚动位置和同一尺寸下校准，只作为真实可见面复核，不改变预评分。

有效帧：

- `sample-17-risklist-1280x720.png` — `08e9f74a5e0c72c6697bf60e85c9cc3cf947bff5d093a64331aa82cd9163d5b6`
- `sample-42-risklist-1280x720.png` — `ce371c8e211821a4faa9a757da9fbbb0ad5df54d928b1e6c20408c333fa922a2`
- `sample-17-settings-1440x900.png` — `5db5635bec2d93610286bdda6ba257edf306c52f0f93a4f5368d2d0db398f1a3`
- `sample-42-settings-1440x900.png` — `526d63b5465ddea2d79bf41e4d8c13aad1541d67d77edd54e1009258288e2c18`

无效诊断帧：

- `sample-42-risklist-2400x1000.png` — `987b3c7485c42e7a3b1f4c8b33453207443c50014de4fd988b04605c06997147`。iab 可绘区域小于请求视口，右侧与下侧出现大面积黑块；**不得作为 2400×1000 全帧、AA、布局或评分证据**。精确 2400 只认 Playwright 矩阵里的同名全帧；本件仅留失败边界。

有效两组复核未发现 D 新增截断、基线跳动或 12–13px 糊连。iab 未提供可封存的完整 user agent，也不是 Tauri WKWebView；故不取得 WebKit 权威放行权。
