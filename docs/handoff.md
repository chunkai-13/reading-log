# 專案交接與架構決策手冊（Project Handoff & Architecture Decisions）

最後更新時間：2026-11-06

---

## 一、 專案概述

本專案為「靜謐藏書閣（Private Library Archive）」，旨在將 Obsidian 筆記庫中的閱讀記錄庫（[`Notes/Reading log.md`](file:///Users/ckchang/Library/Mobile%20Documents/iCloud~md~obsidian/Documents/Notes/Reading%20log.md)）自動轉化為具備古典圖書館原木質感、多維檢索、物理書架渲染與成套系列專題的可視化數位圖書館，並支援發布至 GitHub Pages。

專案現已完成單體結構拆分、全面資安防禦部署、專案目錄獨立封裝與中文維護手冊編撰。

---

## 二、 核心架構決策（Architecture Decision Records）

### 1. 單體 HTML 拆分為四層模組化架構
* **背景與問題**：
  原專案將所有 HTML、內嵌 CSS 與千行 JavaScript 集中於單一檔案（超過 2,700 行）。當 AI 協作或開發者進行微調時，極易引發上下文溢出（Context Overflow）與注意力稀釋（Attention Dilution），且單一修改風險波及全域。
* **決策方案**：
  依據職責分離（Separation of Concerns, SoC）原則拆解為四個獨立檔案：
  1. 結構層：[`reading-log/index.html`](file:///Users/ckchang/Library/Mobile%20Documents/iCloud~md~obsidian/Documents/Notes/reading-log/index.html)（525 行）
  2. 樣式層：[`reading-log/css/style.css`](file:///Users/ckchang/Library/Mobile%20Documents/iCloud~md~obsidian/Documents/Notes/reading-log/css/style.css)（159 行）
  3. 資料層：[`reading-log/js/books-data.js`](file:///Users/ckchang/Library/Mobile%20Documents/iCloud~md~obsidian/Documents/Notes/reading-log/js/books-data.js)（1,336 行）
  4. 邏輯層：[`reading-log/js/app.js`](file:///Users/ckchang/Library/Mobile%20Documents/iCloud~md~obsidian/Documents/Notes/reading-log/js/app.js)（1,064 行）
* **成效**：
  單檔長度控制於 150 至 1,300 行之間，大幅提升維護性，AI 每次讀寫僅需鎖定單一專門檔案。

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
| **頁面骨架層** | [`reading-log/index.html`](file:///Users/ckchang/Library/Mobile%20Documents/iCloud~md~obsidian/Documents/Notes/reading-log/index.html) | 525 | 1. 部署嚴格 CSP 與 Frame Busting 防禦腳本。<br>2. 語意化標籤容器：檢索抽屜卡台、古典原木書架、系列專題展架、數據盤點牌匾。<br>3. 典藏書目詳細資訊彈窗（Modal）與無障礙宣告。 |
| **樣式質感層** | [`reading-log/css/style.css`](file:///Users/ckchang/Library/Mobile%20Documents/iCloud~md~obsidian/Documents/Notes/reading-log/css/style.css) | 159 | 1. 古典圖書館視覺樣式、胡桃木紋材質、羊皮紙底色與黃銅金屬銘牌。<br>2. 物理書架演算樣式：依學科分配主題色、依冊數調整書脊厚度、依漫畫/繪本調整書身高度與陰影。<br>3. 響應式佈局與古典襯線字體排版優化。 |
| **靜態資料層** | [`reading-log/js/books-data.js`](file:///Users/ckchang/Library/Mobile%20Documents/iCloud~md~obsidian/Documents/Notes/reading-log/js/books-data.js) | 1,336 | 1. 包含由同步工具自 Markdown 解析導出的完整書籍資料陣列 `BOOKS_DATABASE`（共 92 冊）。<br>2. 定義十大主題學門與分類規則陣列 `CATEGORIES_DEF`。<br>3. 定義成套系列叢書資料結構 `SERIES_DATABASE`。 |
| **核心邏輯層** | [`reading-log/js/app.js`](file:///Users/ckchang/Library/Mobile%20Documents/iCloud~md~obsidian/Documents/Notes/reading-log/js/app.js) | 1,064 | 1. 狀態管理與生命週期驅動。<br>2. 多維即時檢索篩選（年度、流通狀態、主題類別、關鍵字）。<br>3. 原木書架物理厚度排架演算法與系列套書聚合展示。<br>4. 館員隨機薦讀、格式化清單匯出、APA/MLA 學術引文生成。<br>5. 安全收藏機制（LocalStorage 驗證讀寫）與全面 XSS / URL 消毒。 |
| **自動同步器** | [`reading-log/sync.py`](file:///Users/ckchang/Library/Mobile%20Documents/iCloud~md~obsidian/Documents/Notes/reading-log/sync.py) | 393 | 1. 正則解析 [`Notes/Reading log.md`](file:///Users/ckchang/Library/Mobile%20Documents/iCloud~md~obsidian/Documents/Notes/Reading%20log.md) 之清單語法與 Frontmatter。<br>2. 欄位正規化：索書號分配、ISBN 識別、進度狀態解析與系列冊數判定。<br>3. 自動輸出並覆蓋寫入 `reading-log/js/books-data.js`。<br>4. 整合 Git 變更偵測與自動提交命令。 |
| **中文說明書** | [`reading-log/README.md`](file:///Users/ckchang/Library/Mobile%20Documents/iCloud~md~obsidian/Documents/Notes/reading-log/README.md) | 144 | 完整繁體中文專案手冊，涵蓋系統架構、視覺規範、安全指南、維護流程與檔案結構。 |

---

## 四、 檔案變更歷程與清單

### 1. 新增與重構檔案
* [`reading-log/index.html`](file:///Users/ckchang/Library/Mobile%20Documents/iCloud~md~obsidian/Documents/Notes/reading-log/index.html)：自單體拆出，外鏈引導載入；新增生效條件膠囊容器與全域古典質感浮動提示（Toast）元件。
* [`reading-log/css/style.css`](file:///Users/ckchang/Library/Mobile%20Documents/iCloud~md~obsidian/Documents/Notes/reading-log/css/style.css)：自單體提取自訂 CSS；新增 `.library-toast` 磨砂光影樣式與 `.filter-pill` 條件膠囊樣式。
* [`reading-log/js/books-data.js`](file:///Users/ckchang/Library/Mobile%20Documents/iCloud~md~obsidian/Documents/Notes/reading-log/js/books-data.js)：自單體提取資料陣列，作為全域常數載入點。
* [`reading-log/js/app.js`](file:///Users/ckchang/Library/Mobile%20Documents/iCloud~md~obsidian/Documents/Notes/reading-log/js/app.js)：自單體提取所有事件處理與渲染函式；新增 `showToast` 非阻塞提示通知、`renderActiveFilterPills` 動態膠囊生成與個別移除邏輯，全面取代原生 `alert`。
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
