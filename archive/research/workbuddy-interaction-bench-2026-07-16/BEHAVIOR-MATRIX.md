# WORKBUDDY-INTERACTION-BENCH 行為矩陣

日期：2026-07-16

研究對象：WorkBuddy macOS 5.2.2

性質：只讀研究台；不進 Courtwork 權威鏈

> WorkBuddy 只是行為語料源，不是正確性真源。本文件不複製其組件代碼；所有建議仍須經 Courtwork 的設計語言、數據區靜止原則與可逆交互門過濾。

## 1. 邊界與證據分級

- `LIVE`：在既有登入會話中實際觸發、截圖並反向回復；未發送任務、未切換既有私人任務、未改設定。
- `DOM`：在開發者工具中觀察活 DOM；可見多個 floating-ui portal，模態開啟時背景 portal 帶 inert / `aria-hidden=true`。
- `STATIC`：只讀枚舉已安裝 `app.asar` 的語義資產文件名，僅證明功能面存在，不證明其運行時行為正確。
- `GAP`：若必須發請求、改權限／設定、讀取私人任務內容或製造真實失敗才可驗證，保留為動態缺口，不以靜態存在性冒充實測。

初始窗口為 1200×800 pt（Retina 截圖 2400×1600 px）。首頁為兩區：左側 sidebar 約 264 pt，右側主區保持中心內容；composer 固定在主區下半部。一次窗口放大後，sidebar 寬度近似不變、主區吸收增量，composer 與內容中心重新排布，沒有出現水平溢出。

## 2. 全量表面枚舉

| ID | 表面 | 證據級別 | 六段摘要（觸發前 → 動作 → 過渡可操作性 → 終態 → 反向 → 回基線） | DOM／焦點／尺寸／滾動／overlay·aria／動畫觀察 | 壓力與缺口 |
|---|---|---|---|---|---|
| WB-SIDEBAR-01 | sidebar 與入口 | LIVE + DOM | 首頁雙區 → 點「更多」 → popover 出現且主區仍可見 → 五個資源入口終態 → Escape／外點 → 首頁雙區 | sidebar 寬度穩定；popover 覆蓋而不推動主區；頁面未滾動 | resize 實測通過；收斂按鈕未成功觸發，快速反向留 GAP |
| WB-TASK-01 | 新建／歷史 task | LIVE + STATIC | 首頁 → 點既有 task → 先 skeleton、約 12 秒後「暫無對話記錄」終態 → 250 ms 內點另一 task 再反向點新建任務 → 首頁空 composer 基線 | task 頁保留 sidebar、標題列與底部 composer；loading → empty 的替換沒有重複 skeleton；快速切案後未見前案標題、內容或 loading 殘留 | 切案快速反向已實測；該 task 無訊息，故長內容 scroll restore／運行中斷仍為 GAP；存在 `archived-tasks-*`、`task-preview-*` |
| WB-COMPOSER-01 | composer 加號與二級選單 | LIVE | 空 composer → `+` → 一級菜單立即可操作 → hover/click「模式」出二級菜單 → Escape → composer 完整回復 | 一級含添加文件／模式／專家／技能／連接器；二級向右展開，不改 composer 尺寸；未觀察到頁面滾動 | Escape 可逆；外點可逆；未選擇會改狀態的模式；快速連點／reduced-motion 為 GAP |
| WB-COMPOSER-02 | 模型 popover | LIVE | Auto → 點開 → 長清單可滾動 → Auto 帶選中標記 → 外點 → Auto 基線 | popover 向上展開並局部滾動，不推動 composer；主區尺寸不變 | 外點通過；未切模型，reclick／快速反向為 GAP |
| WB-COMPOSER-03 | 默認權限 popover | LIVE | 默認權限 → 點開 → 說明與 full-access toggle 可操作 → 保持 toggle 不變 → 外點 → 默認權限基線 | popover 向上覆蓋；無背景 dim；未觀察到主區滾動 | 外點通過；真實權限確認未觸發，見 WB-PERM-01 |
| WB-TABS-01 | 文件 tabs | STATIC | 功能存在性已枚舉；未打開私人文件，故不寫動態六段結論 | `FileTabs-*.js/css` 與 media-preview context 存在 | 新增／關閉／切換／快速反向／焦點與滾動保持全為 GAP |
| WB-PREVIEW-01 | preview | STATIC | 功能存在性已枚舉；未把私人文件送入 preview | 存在 docx、pdf、pptx、sheet、image、audio、video、drawio、excalidraw preview 語義資產 | 三區尺寸、tab 化、載入／失敗／中斷、Escape、reduced-motion 全為 GAP |
| WB-SETTINGS-01 | Settings modal | LIVE + DOM | 首頁 → Cmd+, → 背景 dim、Settings 大模態立即可操作 → 系統設定頁終態 → Escape → **仍停留在 Settings**；其後點背景 search 位置 → Settings 關閉且 search 被啟動 | 模態有獨立側欄與內部垂直滾動；背景視覺 dim；DOM 觀察到背景 inert/aria-hidden；窗口尺寸不變 | Escape 非 dismiss；外點發生「關閉 + 底層 search 同次啟動」的疑似 click-through，值得作 UI-RESIDUE-1 反例語料；X/reclick/快速反向未補測 |
| WB-POPOVER-01 | 更多／composer／模型／權限 popover 家族 | LIVE + DOM | 各自 anchor → 點擊／二級選單 → 浮層可操作 → 終態不改底層布局 → Escape 或外點 → 基線 | floating-ui portals 常駐容器；打開項以覆蓋呈現；未見 layout shift | dismiss 不一致：composer 菜單 Escape 有效，Settings Escape 無效（Settings 屬 modal）；需在 Courtwork 明確按 sheet/panel/popover 分類 |
| WB-MODAL-01 | 搜索與 Settings modal | LIVE + DOM | 首頁 → search／Cmd+, → 背景 dim + 前景容器 → 搜索列或設定內容 → Escape／外點 → 依表面不同 | 搜索模態置於主區中央；Settings 近全窗；背景 inert/aria-hidden 可見於 DevTools | 搜索在窗口放大後仍居中；Settings click-through 是反例；焦點去向未能從 AX 讀取，保留 GAP |
| WB-PERM-01 | 權限確認 | LIVE（入口）+ STATIC（確認面） | 默認權限入口已實開；為避免改權限及觸發工具執行，未進入真實確認面 | 入口 popover 說明沙箱／超範圍詢問許可；安裝包中另有 import-security-risk / join-request action 語義 | 確認／取消／Escape／中斷／拒絕後恢復全為 GAP，不聲稱已驗證 |
| WB-FAIL-01 | 失敗恢復 | STATIC | 未製造線上請求失敗；僅確認恢復面語義存在 | `acp-reconnect-retry-*`、`skill-import-errors-*`、`use-*-error-*` 存在 | Retry 必須以非末位失敗、連續重試、切案與中斷另做 live session；本輪不把存在性當正確性 |

## 3. LIVE 六段逐項記錄

### A. Composer 一級／二級選單

1. 觸發前：空 composer，標籤、模型、麥克風、send、workspace、默認權限均在基線位置。
2. 動作：點 `+`，再進入「模式」。
3. 過渡可操作性：一級選單出現後即可進入二級；沒有等待遮罩，也沒有推動 composer。
4. 終態：二級面板在一級右側，當前行有 hover/active 背景；底層仍可辨識。
5. 反向：按 Escape。
6. 回基線：兩層同時移除，composer 的 chip、尺寸與底欄位置復原。

### B. 默認權限 popover

1. 觸發前：底欄顯示「默認權限」。
2. 動作：點 anchor。
3. 過渡可操作性：說明文字及「允許完全訪問」toggle 立即可見。
4. 終態：popover 向上覆蓋，不使 composer 或頁面位移。
5. 反向：點遠離 popover 的空白區，未改 toggle。
6. 回基線：popover 移除，anchor 箭頭回復。

### C. 模型 popover

1. 觸發前：模型為 Auto。
2. 動作：點 Auto。
3. 過渡可操作性：清單立即可滾動，Auto 有 check。
4. 終態：較高 popover 向上展開，底部保留自定義模型入口。
5. 反向：外點，不選模型。
6. 回基線：清單移除，Auto 不變。

### D. Settings modal

1. 觸發前：首頁，沒有 modal。
2. 動作：Cmd+,。
3. 過渡可操作性：背景 dim，Settings 左側分類與右側內部滾動區立即可操作。
4. 終態：近全窗 modal；背景 DOM 在 DevTools 中呈 inert / aria-hidden。
5. 反向：Escape 不關閉；其後點背景 search 所在位置。
6. 回基線：Settings 關閉，但同一點擊也啟動了底層 search 狀態。這不是乾淨的「只 dismiss」回基線，作為反例保留。

### E. Resize

1. 觸發前：1200×800 pt 首頁。
2. 動作：macOS 綠色窗口控制放大。
3. 過渡可操作性：窗口動畫期間未執行額外點擊。
4. 終態：1470×923 pt；sidebar 近似定寬、主區吸收寬度，composer 無溢出。
5. 反向：退出搜索／關閉 DevTools，回到無 modal／popover 的首頁語義基線。
6. 回基線：內容狀態回復；窗口最後仍保持放大尺寸，故只聲稱「頁面狀態」回基線，不聲稱幾何回復。

## 4. 交叉壓力矩陣

| 維度 | 本輪結果 |
|---|---|
| Escape | composer 二級選單有效；Settings 無效；未把差異判成錯誤，但要求 Courtwork 每類明定契約 |
| 外點 | 權限與模型 popover 有效；Settings 外點伴隨底層 search 啟動，列反例 |
| 再點 anchor | 未形成可引用的逐幀證據，GAP |
| 快速反向 | task A → task B → 新建任務（B 僅停留約 250 ms）後回首頁，未見前案標題、內容或 skeleton 殘留；popover 快速連點仍為 GAP |
| resize | 1200×800 → 1470×923 實測；主區重排、sidebar 近似定寬、無可見水平殘留 |
| 切案 | 實開既有空 task：先 skeleton，約 12 秒後顯示「暫無對話記錄」；再做 250 ms 快速切案並回新建任務，終態乾淨 |
| 中斷 | 未送出任務，GAP |
| reduced-motion | 未更改 macOS 使用者輔助設定，也未啟動 DevTools media emulation，GAP |
| 焦點 | WebView AX 子樹未向本會話暴露；只記錄可見 active/hover，不聲稱 activeElement 去向 |
| 滾動 | 首頁在浮層開合時未移動；Settings 使用 modal 內部滾動；preview/task 的 scroll restore 為 GAP |

## 5. 只讀資產存在性清單（不含源碼）

從已安裝包只讀枚舉到以下語義文件族：

- task/chat：`agent-chat-pane-*`、`archived-tasks-*`、`colleague-chat-page-*`、`task-preview-*`；
- tabs/context：`FileTabs-*`、`MediaPreviewContext-*`；
- preview：docx、pdf、pptx、sheet、image、audio、video、drawio、excalidraw；
- modal/settings：`SettingsModal-*`、`FeedbackModal-*`、doc/netdrive selector modal；
- failure/recovery：`acp-reconnect-retry-*`、`skill-import-errors-*`、quota/upload error；
- file operations：file-open、file-save、file-path、file-utils。

這些名稱只用來補枚舉完整性，沒有任何一項因此被標成「動態通過」。

## 6. 餵給 UI-RESIDUE-1 的非權威語料

1. 把 dismiss 契約按 popover / panel / modal 分類，不能以「Escape 一律關閉」代替逐類定義。
2. 增加「外點 dismiss 不得把同一次 pointer 事件送到底層可操作控件」的 mutation 反例；Settings → search 是本輪最有價值的失敗語料。
3. 三區／兩區布局 resize 時，固定區與吸收區要有可測量不變量；只看終態截圖不足以證明快速反向無殘留。
4. tabs / preview / failure-recovery / permission confirm 必須在 Courtwork 自有 fixture 中生成，不依賴 WorkBuddy 私人任務或線上請求。
5. reduced-motion、焦點回送、scroll restore 與快速中斷仍是明確缺口，後續不可因本矩陣存在而視為閉合。
