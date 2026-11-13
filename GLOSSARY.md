# 靜謐藏書閣 領域模型術語表（Domain Model Glossary）

本文件記錄「靜謐藏書閣（Private Library Archive）」之核心領域術語、概念定義與實體模型，作為系統模組化設計與接縫劃分之唯一語境依據。

---

## 一、 核心概念與實體（Core Concepts & Entities）

### 1. 典藏書目（Archive Book）
* **定義**：圖書館藏書之基本單元，自 Obsidian 筆記解析導出之正規化資料結構。
* **主要屬性**：
  * `id`：全館唯一數字編號。
  * `callNo`：索書號（如 `PHI-2026-001`、`SF-2025-015`），前綴代表所屬學門縮寫。
  * `title`：書籍全名。
  * `author`：作者或譯者名稱。
  * `category`：所屬十大主題學門。
  * `series`：所屬系列專題套書名稱（若無則為空字串）。
  * `year`：閱讀歸檔年度（2024、2025、2026）。
  * `status`：流通狀態（`completed` 已完讀、`reading` 現正借閱中）。
  * `desc`：提要摘錄。
  * `coverUrl`：封面圖資外鏈。

### 2. 檢索條件矩陣（Query Criteria）
* **定義**：使用者於控制台發起檢索與篩選之複合條件封裝物件。
* **規格欄位**：
  * `text`：關鍵字比對字串（比對書名、作者、提要、索書號、系列名）。
  * `year`：特定年度或全部（`ALL` 或四位數字年份字串）。
  * `category`：學門領域字串或全部（`ALL` 或特定學門名稱）。
  * `series`：系列專題字串或全部（`ALL` 或特定系列名稱）。
  * `status`：流通狀態字串或全部（`ALL`、`completed`、`reading`）。
  * `sortBy`：排序演算法維度（`DEFAULT`、`YEAR_DESC`、`YEAR_ASC`、`PAGES_DESC`、`TITLE_ASC`）。
  * `favoriteIds`：已珍藏書目識別碼集合（`Set<number>`）。
  * `onlyFavorites`：是否僅檢索珍藏書目（布林值）。

### 3. 多面體盤點結果（Facet Counts）
* **定義**：根據書目母體資料或當前過濾範圍，動態統計各維度項目之冊數分佈，用於供應控制項下拉選單與看板徽章即時顯示。

---

## 二、 深模組架構術語（Deep Module Architecture）

### 1. 館藏檢索引擎（Catalog Query Engine）
* **角色**：深模組（Deep Module）。
* **接縫位置（Seam）**：`reading-log/js/query-engine.js`。
* **介面責任**：
  * 接收純資料 `Query Criteria`，傳回排序過濾後之書目清單陣列 `Book[]`。
  * 盤點計算各分類、年度與狀態之 `Facet Counts`。
* **隱藏實作**：字串正規化、多維度條件交集過濾、自訂排序權重矩陣、預處理索引。
* **適配器（Adapter）**：`reading-log/js/filters.js`（負責將 DOM 輸入事件轉換為 Criteria，並將結果投射至視角）。
