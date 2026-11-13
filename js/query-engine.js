/**
 * 靜謐藏書閣 (Private Library Archive) - 館藏檢索引擎深模組 (Catalog Query Engine)
 * 職責：封裝書目複合過濾、多維度排序演算與多面體維度統計，提供純粹之無 DOM 依賴介面。
 */

function createCatalogQueryEngine(books = []) {
  // 防禦性拷貝並預先建立搜尋字串快取，大幅提升過濾效能
  const sourceBooks = Array.isArray(books) ? [...books] : [];
  const searchCorpus = [];

  sourceBooks.forEach(book => {
    // 預先拼接正規化檢索文字，大幅提升模糊比對效能
    const corpusStr = [
      book.title || '',
      book.author || '',
      book.desc || '',
      book.callNo || '',
      book.series || '',
      book.category || ''
    ].join(' ').toLowerCase();

    searchCorpus.push({ book, corpusStr });
  });

  /**
   * 複合多維檢索與排序核心介面
   * @param {Object} criteria - 查詢條件封裝物件
   * @returns {Array} 符合條件且排序完成之書目陣列
   */
  function query(criteria = {}) {
    // 1. 條件防禦性正規化
    const q = String(criteria.text || '').trim().toLowerCase();
    const yr = criteria.year !== undefined ? String(criteria.year) : 'ALL';
    const cat = criteria.category || 'ALL';
    const ser = criteria.series || 'ALL';
    const st = criteria.status || 'ALL';
    const sortBy = criteria.sortBy || 'DEFAULT';
    const onlyFav = Boolean(criteria.onlyFavorites);

    let favSet;
    if (criteria.favoriteIds instanceof Set) {
      favSet = criteria.favoriteIds;
    } else if (Array.isArray(criteria.favoriteIds)) {
      favSet = new Set(criteria.favoriteIds.map(Number));
    } else {
      favSet = new Set();
    }

    // 2. 第一階段：多維複合條件過濾
    const filtered = searchCorpus.filter(({ book, corpusStr }) => {
      if (onlyFav && !favSet.has(Number(book.id))) return false;
      if (yr !== 'ALL' && String(book.year) !== yr) return false;
      if (cat !== 'ALL' && book.category !== cat) return false;
      if (ser !== 'ALL' && book.series !== ser) return false;
      if (st !== 'ALL' && book.status !== st) return false;

      if (q) {
        // 支援多關鍵字以空白切分之交集比對（AND 邏輯，所有關鍵字皆須吻合）
        const terms = q.split(/\s+/).filter(Boolean);
        const matchAll = terms.every(term => corpusStr.includes(term));
        if (!matchAll) return false;
      }

      return true;
    }).map(item => item.book);

    // 3. 第二階段：多維度排序演算
    return filtered.sort((a, b) => {
      if (sortBy === 'YEAR_DESC') {
        const yearDiff = Number(b.year) - Number(a.year);
        return yearDiff !== 0 ? yearDiff : Number(b.id) - Number(a.id);
      }
      if (sortBy === 'YEAR_ASC') {
        const yearDiff = Number(a.year) - Number(b.year);
        return yearDiff !== 0 ? yearDiff : Number(a.id) - Number(b.id);
      }
      if (sortBy === 'PAGES_DESC') {
        const pA = Number(a.pages) || 0;
        const pB = Number(b.pages) || 0;
        return pB !== pA ? pB - pA : Number(a.id) - Number(b.id);
      }
      if (sortBy === 'TITLE_ASC') {
        return (a.title || '').localeCompare(b.title || '', 'zh-Hant');
      }
      // DEFAULT：維持典藏庫登錄順序
      return Number(a.id) - Number(b.id);
    });
  }

  /**
   * 取得維度聚合盤點數據 (Facet Counts)
   * @param {Object} [filterCriteria] - 若傳入則基於該條件進行篩選盤點，若無則統計母體
   * @returns {Object} 結構化之聚合統計結果
   */
  function getFacetCounts(filterCriteria = null) {
    const targetSet = filterCriteria ? query(filterCriteria) : sourceBooks;

    const summary = {
      total: targetSet.length,
      completed: 0,
      reading: 0,
      byYear: {},
      byCategory: {},
      bySeries: {}
    };

    targetSet.forEach(book => {
      if (book.status === 'completed') summary.completed++;
      if (book.status === 'reading') summary.reading++;

      if (book.year) {
        const yStr = String(book.year);
        summary.byYear[yStr] = (summary.byYear[yStr] || 0) + 1;
      }

      if (book.category) {
        summary.byCategory[book.category] = (summary.byCategory[book.category] || 0) + 1;
      }

      if (book.series) {
        summary.bySeries[book.series] = (summary.bySeries[book.series] || 0) + 1;
      }
    });

    return summary;
  }

  return {
    query,
    getFacetCounts,
    size: sourceBooks.length
  };
}

// 支援瀏覽器環境與模組化匯出
if (typeof window !== 'undefined') {
  window.createCatalogQueryEngine = createCatalogQueryEngine;
  // 若 booksDatabase 已先行載入，自動初始化全域預設實例
  if (typeof booksDatabase !== 'undefined' && Array.isArray(booksDatabase)) {
    window.catalogEngine = createCatalogQueryEngine(booksDatabase);
  }
}
