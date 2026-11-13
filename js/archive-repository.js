/**
 * 靜謐藏書閣 (Private Library Archive) - 典藏儲存庫深模組 (Archive Repository)
 * 職責：作為全館書目與系列專題的單一真實來源 (Single Source of Truth)，
 * 封裝 O(1) 索引化查找、珍藏狀態 LocalStorage 安全持久化，並委託檢索引擎執行複合查詢。
 */

function createArchiveRepository(config = {}) {
  const rawBooks = Array.isArray(config.books) ? config.books : [];
  const rawSeries = Array.isArray(config.series) ? config.series : [];
  const STORAGE_KEY = config.storageKey || 'lib_reading_favs';

  // 1. 內部建立 O(1) 索引查找表
  const byIdIndex = new Map();
  const byCallNoIndex = new Map();

  rawBooks.forEach(book => {
    if (book && typeof book.id !== 'undefined') {
      const numId = Number(book.id);
      byIdIndex.set(numId, book);
      if (book.callNo) {
        byCallNoIndex.set(String(book.callNo).trim().toUpperCase(), book);
      }
    }
  });

  // 2. 封裝 LocalStorage 珍藏狀態安全讀取與校驗（支援舊鍵遷移）
  function loadSafeFavorites() {
    try {
      if (typeof window === 'undefined' || !window.localStorage) return new Set();
      let raw = window.localStorage.getItem(STORAGE_KEY);
      // 若標準鍵尚無資料，嘗試相容讀取舊鍵並完成平滑遷移
      if (!raw) {
        const legacy = window.localStorage.getItem('favoriteBookIds');
        if (legacy) {
          raw = legacy;
          window.localStorage.setItem(STORAGE_KEY, legacy);
        }
      }
      if (!raw) return new Set();
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return new Set();

      // 嚴格型別校驗：僅收整合法正整數，杜絕髒資料注入
      const safeIds = parsed
        .map(Number)
        .filter(n => Number.isInteger(n) && n > 0 && byIdIndex.has(n));
      return new Set(safeIds);
    } catch {
      return new Set();
    }
  }

  function persistFavorites(favSet) {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const arr = Array.from(favSet);
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(arr));
      }
    } catch {
      // 靜默降級或於控制台記錄
    }
  }

  let favoriteIds = loadSafeFavorites();

  // 3. 內部直接整合或委託 CatalogQueryEngine
  const queryEngine = (typeof createCatalogQueryEngine === 'function')
    ? createCatalogQueryEngine(rawBooks)
    : null;

  // --- 外部公開窄介面 (Public Interface) ---

  /**
   * 依 ID 取得單一書目 (O(1))
   */
  function getBook(id) {
    return byIdIndex.get(Number(id)) || null;
  }

  /**
   * 依索書號取得單一書目 (O(1))
   */
  function getBookByCallNo(callNo) {
    if (!callNo) return null;
    return byCallNoIndex.get(String(callNo).trim().toUpperCase()) || null;
  }

  /**
   * 取得全館書目副本
   */
  function getAllBooks() {
    return [...rawBooks];
  }

  /**
   * 取得系列專題清單副本
   */
  function getAllSeries() {
    return [...rawSeries];
  }

  /**
   * 查詢書目是否已被珍藏
   */
  function isFavorite(id) {
    return favoriteIds.has(Number(id));
  }

  /**
   * 切換書目珍藏狀態並立即持久化
   * @param {number|string} id
   * @returns {{ isFavorite: boolean, count: number }} 切換後之狀態與總數
   */
  function toggleFavorite(id) {
    const numId = Number(id);
    if (!byIdIndex.has(numId)) {
      return { isFavorite: false, count: favoriteIds.size };
    }

    let isFavNow = false;
    if (favoriteIds.has(numId)) {
      favoriteIds.delete(numId);
      isFavNow = false;
    } else {
      favoriteIds.add(numId);
      isFavNow = true;
    }

    persistFavorites(favoriteIds);
    return { isFavorite: isFavNow, count: favoriteIds.size };
  }

  /**
   * 取得當前珍藏 ID 集合副本
   */
  function getFavoriteIds() {
    return new Set(favoriteIds);
  }

  /**
   * 取得當前珍藏總數
   */
  function getFavoriteCount() {
    return favoriteIds.size;
  }

  /**
   * 委託檢索引擎執行複合多維查詢
   */
  function query(criteria = {}) {
    if (queryEngine) {
      // 自動合併當前之珍藏識別碼集合
      const mergedCriteria = {
        favoriteIds,
        ...criteria
      };
      return queryEngine.query(mergedCriteria);
    }
    return [...rawBooks];
  }

  /**
   * 委託檢索引擎取得多面體統計
   */
  function getFacetCounts(criteria = null) {
    if (queryEngine) {
      return queryEngine.getFacetCounts(criteria);
    }
    return {
      total: rawBooks.length,
      completed: 0,
      reading: 0,
      byYear: {},
      byCategory: {},
      bySeries: {}
    };
  }

  /**
   * 取得總體數據摘要
   */
  function getSummaryStats() {
    const counts = getFacetCounts();
    return {
      total: counts.total,
      completed: counts.completed,
      reading: counts.reading,
      favorites: favoriteIds.size
    };
  }

  return {
    getBook,
    getBookByCallNo,
    getAllBooks,
    getAllSeries,
    isFavorite,
    toggleFavorite,
    getFavoriteIds,
    getFavoriteCount,
    query,
    getFacetCounts,
    getSummaryStats,
    size: rawBooks.length
  };
}

// 支援全域掛載與單例預設實例化
if (typeof window !== 'undefined') {
  window.createArchiveRepository = createArchiveRepository;
  if (typeof booksDatabase !== 'undefined' && Array.isArray(booksDatabase)) {
    window.archiveRepository = createArchiveRepository({
      books: booksDatabase,
      series: typeof seriesDatabase !== 'undefined' ? seriesDatabase : []
    });
  }
}
