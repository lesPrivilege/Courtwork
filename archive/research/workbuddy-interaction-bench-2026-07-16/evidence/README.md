# Evidence index

本目錄是 `WORKBUDDY-INTERACTION-BENCH` 的只讀截圖／逐幀證據。截圖來自 WorkBuddy 5.2.2 的既有本地會話；未發送任務、未改模型、權限或 Settings toggle。畫面中的既有任務名稱只是背景上下文，不構成研究結論，也未進行內容讀取。

| 文件 | 用途 |
|---|---|
| `01-baseline.png` | 初始窗口 + docked DevTools；證明產品版本與 floating-ui portal 活 DOM |
| `03-welcome-full.png` | 關閉 DevTools 後 1200×800 pt 首頁基線 |
| `05-composer-plus-open.png` | composer 一級選單終態 |
| `06-composer-nested-menu.png` | 「模式」二級選單終態 |
| `07-composer-escape-baseline.png` | Escape 後選單移除、composer 回復 |
| `08-permission-popover.png` | 默認權限 popover；toggle 未改動 |
| `09-model-popover.png` | 模型清單；Auto 維持選中 |
| `10-more-menu.png` | sidebar「更多」popover |
| `11-settings.png` | Settings modal、背景 dim、內部 scroll |
| `12-settings-escape-baseline.png` | Escape 後畫面；與 11 的 hash 相同，證明 Escape 未 dismiss |
| `13-search-modal.png` | 點 Settings 背景 search 位置後的 search active 狀態 |
| `14-resize-maximized.png` | 放大窗口後首頁 + DevTools 活 DOM |
| `15-search-modal-maximized.png` | 放大窗口中的搜索 modal |
| `16-resize-return.png` | 清除搜索後的放大窗口狀態 |
| `17-final-baseline.png` | 關閉 DevTools／浮層後的最終頁面語義基線；窗口仍為放大尺寸 |
| `18-task-open.png` | 既有 task 初開的 skeleton 過渡態 |
| `19-task-terminal.png` | 約 12 秒後 empty 終態「暫無對話記錄」 |
| `20-task-rapid-switch-baseline.png` | task A → task B（約 250 ms）→ 新建任務後，首頁空 composer 回基線 |

注意：截圖是逐幀視覺證據，不單獨證明鍵盤焦點或 reduced-motion 等價；這些缺口已在行為矩陣標明。
