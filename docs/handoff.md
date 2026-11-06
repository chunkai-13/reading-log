# 專案交接與架構決策手冊（Project Handoff & Architecture Decisions）

最後更新時間：2026-11-06

---

## 一、 專案概述

本專案為「靜謐藏書閣（Private Library Archive）」，旨在將 Obsidian 筆記庫中的閱讀記錄庫（[`Notes/Reading log.md`](file:///Users/ckchang/Library/Mobile%20Documents/iCloud~md~obsidian/Documents/Notes/Reading%20log.md)）自動轉化為具備古典圖書館原木質感、多維檢索、物理書架渲染與成套系列專題的可視化數位圖書館，並支援發布至 GitHub Pages。

專案現已完成單體結構拆分、全面資安防禦部署、專案目錄獨立封裝與中文維護手冊編撰。

---

## 二、 核心架構決策（Architecture Decision Records）

### 1. 模組化職責分離與程式碼長度管控規則
* **背景與問題**：
  原專案將所有 HTML、內嵌 CSS 與千行 JavaScript 集中於單一檔案（超過 2,700 行）。當 AI 協作或開發者進行微調時，極易引發上下文溢出（Context Overflow）與注意力稀釋（Attention Dilution）。
* **決策方案**：
  落實嚴格的程式碼長度監控機制（所有核心邏輯檔案行數嚴格控制於 600 行以內）。當單一檔案膨脹時，主動依功能邊界拆分獨立模組：
  1. 結構層：[`reading-log/index.html`](file:///Users/ckchang/Library/Mobile%20Documents/iCloud~md~obsidian/Documents/Notes/reading-log/index.html)（544 行）
  2. 樣式層：[`reading-log/css/style.css`](file:///Users/ckchang/Library/Mobile%20Documents/iCloud~md~obsidian/Documents/Notes/reading-log/css/style.css)（235 行）
  3. 資料層：[`reading-log/js/books-data.js`](file:///Users/ckchang/Library/Mobile%20Documents/iCloud~md~obsidian/Documents/Notes/reading-log/js/books-data.js)（1,336 行）
  4. 工具層：[`reading-log/js/utils.js`](file:///Users/ckchang/Library/Mobile%20Documents/iCloud~md~obsidian/Documents/Notes/reading-log/js/utils.js)（188 行，資安跳脫、Toast 與封面降級）
  5. 書架層：[`reading-log/js/bookshelf.js`](file:///Users/ckchang/Library/Mobile%20Documents/iCloud~md~obsidian/Documents/Notes/reading-log/js/bookshelf.js)（120 行，物理排架與抽出動態）
  6. 視角層：[`reading-log/js/views.js`](file:///Users/ckchang/Library/Mobile%20Documents/iCloud~md~obsidian/Documents/Notes/reading-log/js/views.js)（391 行，索書卡、年報、系列與彈窗）
  7. 控制層：[`reading-log/js/app.js`](file:///Users/ckchang/Library/Mobile%20Documents/iCloud~md~obsidian/Documents/Notes/reading-log/js/app.js)（600 行，狀態、多維篩選、快捷鍵與初始化）
* **成效**：
  AI 與開發者在每次維護時僅讀取特定單一功能模組，徹底解決上下文膨脹與注意力稀釋問題。

### 2. 資料注入策略：全域物件替代非同步 Fetch
* **背景與問題**：
  若將資料層獨立為 `books-data.json` 並於前端使用 `fetch('books-data.json')` 載入，當使用者在本地端直接透過瀏覽器雙擊或於 Obsidian 內以 `file://` 協議瀏覽時，會觸發瀏覽器的同源政策（CORS）阻擋，導致本地預覽失效。
* **決策方案**：
  使用 JavaScript 檔案 [`reading-log/js/books-data.js`](file:///Users/ckchang/Library/Mobile%20Documents/iCloud~md~obsidian/Documents/Notes/reading-log/js/books-data.js)，透過全域常數宣告 `window.BOOKS_DATABASE` 與 `window.CATEGORIES_DEF` 進行資料載入。
* **成效**：
  達成雙環境無縫相容：既支援 GitHub Pages 靜態託管，亦能直接在本地離線雙擊開啟。

### 3. 來源筆記保留於根目錄與動態向上定位
* **背景與問題**：
  若將 [`Reading log.md`](file:///Users/ckchang/Library/Mobile%20Documents/iCloud~md~obsidian/Documents/Notes/Reading%20log.md) 移入子目錄，會破壞 Obsidian 筆記庫內部其他筆記對此檔案的雙向反向連結（Backlinks）。
* **決策方案**：
  主來源筆記保留於 Obsidian 根目錄。子專案同步工具 [`reading-log/sync.py`](file:///Users/ckchang/Library/Mobile%20Documents/iCloud~md~obsidian/Documents/Notes/reading-log/sync.py) 採用動態相對路徑解析：
  ```python
  SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
  VAULT_ROOT = os.path.dirname(SCRIPT_DIR)
  MARKDOWN_FILE = os.path.join(VAULT_ROOT, "Reading log.md")
  OUTPUT_DATA_JS = os.path.join(SCRIPT_DIR, "js", "books-data.js")
  ```
* **成效**：
  維持筆記知識圖譜完整性，達成資料來源與前端呈現專案解耦。

### 4. 前端深度資安防禦體系
* **內容安全政策（CSP）**：
  於 `index.html` 配置 `<meta http-equiv="Content-Security-Policy">`，鎖定 `default-src 'none'`、`script-src 'self' 'unsafe-inline' https://cdn.tailwindcss.com https://fonts.googleapis.com`、`style-src 'self' 'unsafe-inline' https://fonts.googleapis.com`、`object-src 'none'`。
* **防點擊劫持（Anti-Clickjacking / Frame Busting）**：
  內聯防禦腳本強制檢測 `if (window.top !== window.self) { window.top.location = window.self.location; }`，杜絕惡意網站使用 iframe 嵌套。
* **嚴格 XSS 轉義（HTML Sanitization）**：
  自建 `escapeHtml` 函式處理所有插入 DOM 之文字，全面消毒 `&`, `<`, `>`, `"`, `'` 字元。
* **安全通訊協定白名單（URL Sanitization）**：
  封面圖與外部書籍連結經 `sanitizeUrl` 檢驗，僅允許 `http:`、`https:` 與合法 Data URI，嚴禁 `javascript:` 偽協議執行。
* **本地儲存格式檢驗（LocalStorage Validation）**：
  收藏清單字串強制以正規表達式 `^[a-zA-Z0-9_-]+$` 驗證 ID 合法性，防止透過本地儲存進行二次注入。

### 5. 專案獨立封裝與根目錄淨化
* **決策方案**：
  建立 `Notes/reading-log/` 子目錄，將所有代碼、樣式、資料庫、圖片與同步腳本收整於其中，並以獨立 Git 倉儲進行版本控制。
* **成效**：
  徹底清理 Obsidian 根目錄之散落檔案，避免不同專案資源互相干擾。

---

## 三、 已完成模組清單

| 模組名稱 | 檔案路徑 | 行數 | 核心職責與實現細節 |
| :--- | :--- | :--- | :--- |
| **頁面骨架層** | [`reading-log/index.html`](file:///Users/ckchang/Library/Mobile%20Documents/iCloud~md~obsidian/Documents/Notes/reading-log/index.html) | 662 | 1. 部署嚴格 CSP 與 Frame Busting 防禦腳本。<br>2. 語意化容器：抽屜卡台、原木書架、系列展架、數據牌匾、條件膠囊、Toast 通知、SVG 走勢圖、甜甜圈圖與快捷指南。<br>3. 典藏書目借閱憑證彈窗（支援連貫翻閱按鈕）與無障礙宣告。 |
| **樣式質感層** | [`reading-log/css/style.css`](file:///Users/ckchang/Library/Mobile%20Documents/iCloud~md~obsidian/Documents/Notes/reading-log/css/style.css) | 277 | 1. 古典圖書館視覺樣式、胡桃木紋材質、羊皮紙底色與黃銅金屬銘牌。<br>2. 物理書架演算樣式：抽出懸停微互動（`translateY(-24px) scale(1.03) rotate(-1deg)`）、原木層板倒角與深層縱深陰影。<br>3. 封面流光骨架屏（Shimmer）、典藏精裝燙金封面降級樣式與純 SVG 圖表微互動樣式（`.donut-segment`、`.trend-line`）。 |
| **靜態資料層** | [`reading-log/js/books-data.js`](file:///Users/ckchang/Library/Mobile%20Documents/iCloud~md~obsidian/Documents/Notes/reading-log/js/books-data.js) | 1,336 | 1. 包含由同步工具自 Markdown 解析導出的完整書籍資料陣列 `BOOKS_DATABASE`（共 92 冊）。<br>2. 定義十大主題學門與分類規則陣列 `CATEGORIES_DEF`。<br>3. 定義成套系列叢書資料結構 `SERIES_DATABASE`。 |
| **工具資安層** | [`reading-log/js/utils.js`](file:///Users/ckchang/Library/Mobile%20Documents/iCloud~md~obsidian/Documents/Notes/reading-log/js/utils.js) | 188 | 1. 嚴格 XSS 轉義（`escapeHtml`）與 URL 協定消毒（`sanitizeUrl`）。<br>2. LocalStorage 安全讀寫與格式驗證。<br>3. 全域浮動通知控制器（`showToast`）。<br>4. 典藏精裝燙金封面佔位符動態生成器（`generateCoverFallbackHtml`）與破圖降級處理（`handleCoverError`）。 |
| **書架排架層** | [`reading-log/js/bookshelf.js`](file:///Users/ckchang/Library/Mobile%20Documents/iCloud~md~obsidian/Documents/Notes/reading-log/js/bookshelf.js) | 120 | 1. 原木書架年度層板渲染（`renderBookshelves`）。<br>2. 書脊學科色彩映射、系列齊高（`seriesHeights`）、漫畫低矮與繪本輕薄厚度計算。 |
| **視覺圖表層** | [`reading-log/js/charts.js`](file:///Users/ckchang/Library/Mobile%20Documents/iCloud~md~obsidian/Documents/Notes/reading-log/js/charts.js) | 249 | 1. 純 SVG 歷年閱讀趨勢走勢圖（`renderReadingTrendChart`），具備平滑貝茲曲線與金色面積漸層。<br>2. 純 SVG 十大學門分佈甜甜圈環形圖（`renderCategoryDonutChart`），支援即時扇面懸停數值動態切換與點擊篩選。 |
| **視角渲染層** | [`reading-log/js/views.js`](file:///Users/ckchang/Library/Mobile%20Documents/iCloud~md~obsidian/Documents/Notes/reading-log/js/views.js) | 402 | 1. 索書卡目錄渲染（`renderCardCatalog`），整合流光載入與優雅降級。<br>2. 統計年報分析渲染（`renderStats`，調用趨勢圖與甜甜圈圖）。<br>3. 成套系列專題展架渲染（`renderSeries`）。<br>4. 書目借閱憑證彈窗控制（`openBookModal`、`closeModal`、`updateModalFavBtnState`）。 |
| **篩選排序層** | [`reading-log/js/filters.js`](file:///Users/ckchang/Library/Mobile%20Documents/iCloud~md~obsidian/Documents/Notes/reading-log/js/filters.js) | 349 | 1. 多維條件過濾（年度、學科、系列、流通狀態、關鍵字、珍藏）。<br>2. 多維度排序演算法（年度新舊、厚度頁數、書名筆劃 A-Z）。<br>3. 動態生效條件膠囊生成與個別撤銷（`renderActiveFilterPills`）。<br>4. 下拉選單冊數即時盤點與條件重設（`resetAllFilters`）。 |
| **快捷導覽層** | [`reading-log/js/shortcuts.js`](file:///Users/ckchang/Library/Mobile%20Documents/iCloud~md~obsidian/Documents/Notes/reading-log/js/shortcuts.js) | 210 | 1. 全域鍵盤監聽（`/` 檢索、`Esc` 關閉、`1~4` 切換視角、`?` 說明面板）。<br>2. 借閱憑證連貫翻閱控制器（`←/→`、`J/K` 翻閱、`F` 珍藏、`C` 引文）。<br>3. 行動端篩選面板折疊與捲動自動收合控制。 |
| **核心控制層** | [`reading-log/js/app.js`](file:///Users/ckchang/Library/Mobile%20Documents/iCloud~md~obsidian/Documents/Notes/reading-log/js/app.js) | 194 | 1. 全域狀態管理與 DOM 元素快取。<br>2. 視角切換狀態機（`setView`）。<br>3. 珍藏標記切換（`toggleFavorite`）、館員隨機薦讀、清單匯出。<br>4. 生命週期啟動與初始化協調。 |
| **自動同步器** | [`reading-log/sync.py`](file:///Users/ckchang/Library/Mobile%20Documents/iCloud~md~obsidian/Documents/Notes/reading-log/sync.py) | 369 | 1. 正則解析 [`Notes/Reading log.md`](file:///Users/ckchang/Library/Mobile%20Documents/iCloud~md~obsidian/Documents/Notes/Reading%20log.md) 之清單語法與 Frontmatter。<br>2. 欄位正規化並自動覆蓋寫入 `js/books-data.js`。<br>3. 整合 Git 變更偵測與自動提交命令。 |
| **中文說明書** | [`reading-log/README.md`](file:///Users/ckchang/Library/Mobile%20Documents/iCloud~md~obsidian/Documents/Notes/reading-log/README.md) | 144 | 完整繁體中文專案手冊，涵蓋系統架構、視覺規範、安全指南、維護流程與檔案結構。 |

---

## 四、 檔案變更歷程與清單

### 1. 新增與重構檔案
* [`reading-log/index.html`](file:///Users/ckchang/Library/Mobile%20Documents/iCloud~md~obsidian/Documents/Notes/reading-log/index.html)：新增排序選單、快捷鍵徽章、彈窗翻閱群、快捷指南彈窗，以及純 SVG 趨勢圖與甜甜圈圖容器。
* [`reading-log/css/style.css`](file:///Users/ckchang/Library/Mobile%20Documents/iCloud~md~obsidian/Documents/Notes/reading-log/css/style.css)：新增書脊抽取動態、原木層板深度、Shimmer、精裝佔位符與純 SVG 圖表微互動樣式。
* [`reading-log/js/charts.js`](file:///Users/ckchang/Library/Mobile%20Documents/iCloud~md~obsidian/Documents/Notes/reading-log/js/charts.js)：獨立純 SVG 視覺化圖表模組，封裝年度趨勢走勢圖與十大學門甜甜圈環形圖演算法。
* [`reading-log/js/utils.js`](file:///Users/ckchang/Library/Mobile%20Documents/iCloud~md~obsidian/Documents/Notes/reading-log/js/utils.js)：拆分通用資安與提示模組，封裝精裝封面生成器與圖片錯誤優雅降級。
* [`reading-log/js/bookshelf.js`](file:///Users/ckchang/Library/Mobile%20Documents/iCloud~md~obsidian/Documents/Notes/reading-log/js/bookshelf.js)：拆分原木書架排架運算與動態標籤生成。
* [`reading-log/js/views.js`](file:///Users/ckchang/Library/Mobile%20Documents/iCloud~md~obsidian/Documents/Notes/reading-log/js/views.js)：拆分三大視角（卡片、統計、系列）與彈窗控制，調用 SVG 圖表。
* [`reading-log/js/filters.js`](file:///Users/ckchang/Library/Mobile%20Documents/iCloud~md~obsidian/Documents/Notes/reading-log/js/filters.js)：獨立多維檢索、條件過濾、排序演算法與生效膠囊控制器。
* [`reading-log/js/shortcuts.js`](file:///Users/ckchang/Library/Mobile%20Documents/iCloud~md~obsidian/Documents/Notes/reading-log/js/shortcuts.js)：獨立全域鍵盤快捷鍵、彈窗連貫翻閱與行動端面板控制。
* [`reading-log/js/app.js`](file:///Users/ckchang/Library/Mobile%20Documents/iCloud~md~obsidian/Documents/Notes/reading-log/js/app.js)：收斂為主控制器，精簡至 194 行。
* [`reading-log/js/books-data.js`](file:///Users/ckchang/Library/Mobile%20Documents/iCloud~md~obsidian/Documents/Notes/reading-log/js/books-data.js)：純資料陣列，由同步腳本自動維護。
* [`reading-log/js/books-data.js`](file:///Users/ckchang/Library/Mobile%20Documents/iCloud~md~obsidian/Documents/Notes/reading-log/js/books-data.js)：純資料陣列，由同步腳本自動維護。
* [`reading-log/js/books-data.js`](file:///Users/ckchang/Library/Mobile%20Documents/iCloud~md~obsidian/Documents/Notes/reading-log/js/books-data.js)：純資料陣列，由同步腳本自動維護。
* [`reading-log/sync.py`](file:///Users/ckchang/Library/Mobile%20Documents/iCloud~md~obsidian/Documents/Notes/reading-log/sync.py)：修改來源檔案讀取路徑指向 `../Reading log.md`，輸出路徑指向 `./js/books-data.js`。
* [`reading-log/README.md`](file:///Users/ckchang/Library/Mobile%20Documents/iCloud~md~obsidian/Documents/Notes/reading-log/README.md)：新建完整專案繁體中文說明文件。
* [`reading-log/favicon.svg`](file:///Users/ckchang/Library/Mobile%20Documents/iCloud~md~obsidian/Documents/Notes/reading-log/favicon.svg) 與 [`reading-log/favicon.ico`](file:///Users/ckchang/Library/Mobile%20Documents/iCloud~md~obsidian/Documents/Notes/reading-log/favicon.ico)：圖示收整於專案內部。

### 2. 根目錄清除項目
為維持 Obsidian 筆記庫純淨，已自 `Notes/` 根目錄安全移除以下散落檔案：
* `Notes/reading_log_library.html`（舊單體 HTML）
* `Notes/index.html`（舊單體入口）
* `Notes/favicon.svg`（移入 `reading-log/`）
* `Notes/css/` 目錄（移入 `reading-log/css/`）
* `Notes/js/` 目錄（移入 `reading-log/js/`）

---

## 五、 維護作業流程（Runbook）

### 1. 更新筆記書籍資料
1. 開啟 Obsidian 編輯 [`Notes/Reading log.md`](file:///Users/ckchang/Library/Mobile%20Documents/iCloud~md~obsidian/Documents/Notes/Reading%20log.md)，依標準格式新增或調整書籍清單。
2. 開啟終端機進入專案目錄：
   ```bash
   cd "/Users/ckchang/Library/Mobile Documents/iCloud~md~obsidian/Documents/Notes/reading-log"
   ```
3. 執行同步腳本進行 Markdown 解析與資料更新：
   ```bash
   python3 sync.py
   ```
4. 驗證終端機輸出解析書籍數量（確認無解析錯誤）。

### 2. 部署至 GitHub Pages
1. 檢視檔案變更狀態：
   ```bash
   git status
   ```
2. 提交變更並推播至遠端倉儲：
   ```bash
   git add .
   git commit -m "docs: update library database and notes"
   git push origin main
   ```
3. 前往 GitHub Pages 確認自動部署完成。

---

## 六、 待辦事項與未來功能規劃（Backlog）

### 1. 檢索與篩選維度擴充
* [ ] **出版年份區間滑桿**：支援依據書籍出版年代區間進行雙向範圍篩選。
* [ ] **標籤多選聯集/交集切換**：提供多標籤勾選面板，支援「同時具備」或「符合任一」標籤之條件篩選。

### 2. 閱讀數據視覺化圖表
* [ ] **年度閱讀趨勢儀表板**：整合輕量化圖表庫（如 Chart.js 或純 SVG 折線圖），呈現各月份完讀冊數。
* [ ] **學門分佈甜甜圈圖**：以圖形化視覺呈現十大分類佔比，強化藏書分析趣味性。

### 3. 主題視覺客製化
* [ ] **典藏館配色切換**：支援「深色胡桃木（現行預設）」、「晨曦羊皮紙（明亮模式）」與「深夜檔案室」三種古典館藏主題風格。

### 4. 自動化發布管線
* [ ] **GitHub Actions 工作流**：建立 `.github/workflows/deploy.yml`，於偵測到筆記庫更新時自動觸發建置與部署。
