/**
 * 靜謐藏書閣 (Private Library Archive) - 多維檢索、條件過濾與排序演算法模組
 * 包含：複合條件過濾、多維度書目排序、已生效條件膠囊標籤與下拉選項即時盤點
 */

// 資料篩選與排序核心邏輯
function getFilteredBooks() {
  const q = searchInput ? searchInput.value.trim().toLowerCase() : '';
  const yr = yearFilter ? yearFilter.value : 'ALL';
  const cat = categoryFilter ? categoryFilter.value : 'ALL';
  const ser = seriesFilter ? seriesFilter.value : 'ALL';
  const st = statusFilter ? statusFilter.value : 'ALL';
  const sortBy = sortFilter ? sortFilter.value : 'DEFAULT';

  // 第一階段：多維條件過濾
  const matched = booksDatabase.filter(book => {
    if (onlyShowFavorites && !favoriteBookIds.has(book.id)) return false;
    if (yr !== 'ALL' && book.year.toString() !== yr) return false;
    if (cat !== 'ALL' && book.category !== cat) return false;
    if (ser !== 'ALL' && book.series !== ser) return false;
    if (st !== 'ALL' && book.status !== st) return false;

    if (q) {
      const matchTitle = (book.title || '').toLowerCase().includes(q);
      const matchAuthor = (book.author || '').toLowerCase().includes(q);
      const matchDesc = (book.desc || '').toLowerCase().includes(q);
      const matchCallNo = (book.callNo || '').toLowerCase().includes(q);
      const matchSeries = (book.series || '').toLowerCase().includes(q);
      return matchTitle || matchAuthor || matchDesc || matchCallNo || matchSeries;
    }

    return true;
  });

  // 第二階段：多維度排序演算法 (防禦性處理缺失值)
  return matched.sort((a, b) => {
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
    // DEFAULT：維持典藏庫原始登錄序號
    return Number(a.id) - Number(b.id);
  });
}

// 動態渲染已生效條件膠囊標籤
function renderActiveFilterPills() {
  if (!activeFilterTags) return;

  const pills = [];

  // 1. 搜尋關鍵字
  const query = searchInput ? searchInput.value.trim() : '';
  if (query) {
    const displayQuery = query.length > 14 ? query.slice(0, 14) + '…' : query;
    pills.push({
      label: `檢索: 「${escapeHtml(displayQuery)}」`,
      onClear: () => {
        if (searchInput) searchInput.value = '';
        triggerFilterUpdate();
      }
    });
  }

  // 2. 閱讀年度
  if (yearFilter && yearFilter.value !== 'ALL') {
    pills.push({
      label: `${escapeHtml(yearFilter.value)} 年度`,
      onClear: () => {
        yearFilter.value = 'ALL';
        triggerFilterUpdate();
      }
    });
  }

  // 3. 學科分類
  if (categoryFilter && categoryFilter.value !== 'ALL') {
    pills.push({
      label: escapeHtml(categoryFilter.value),
      onClear: () => {
        categoryFilter.value = 'ALL';
        triggerFilterUpdate();
      }
    });
  }

  // 4. 系列叢書
  if (seriesFilter && seriesFilter.value !== 'ALL') {
    pills.push({
      label: `系列: ${escapeHtml(seriesFilter.value)}`,
      onClear: () => {
        seriesFilter.value = 'ALL';
        triggerFilterUpdate();
      }
    });
  }

  // 5. 流通狀態
  if (statusFilter && statusFilter.value !== 'ALL') {
    const statusText = statusFilter.value === 'reading' ? '現正借閱中' : '已完讀歸架';
    pills.push({
      label: statusText,
      onClear: () => {
        statusFilter.value = 'ALL';
        triggerFilterUpdate();
      }
    });
  }

  // 6. 排序維度標記 (若非預設)
  if (sortFilter && sortFilter.value !== 'DEFAULT') {
    const sortLabels = {
      'YEAR_DESC': '排序: 年度新至舊',
      'YEAR_ASC': '排序: 年度舊至新',
      'PAGES_DESC': '排序: 厚度由厚至薄',
      'TITLE_ASC': '排序: 書名筆劃 A-Z'
    };
    pills.push({
      label: sortLabels[sortFilter.value] || '自訂排序',
      onClear: () => {
        sortFilter.value = 'DEFAULT';
        triggerFilterUpdate();
      }
    });
  }

  // 7. 珍藏書目
  if (onlyShowFavorites) {
    pills.push({
      label: '僅看珍藏',
      onClear: () => {
        if (btnFavOnly) btnFavOnly.click();
      }
    });
  }

  if (pills.length === 0) {
    activeFilterTags.innerHTML = '';
    return;
  }

  let html = pills.map((p, idx) => `
    <span class="filter-pill inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[11px] font-sans-ui shadow-sm">
      <span class="text-[#f5ebd7]">${p.label}</span>
      <button type="button" data-pill-idx="${idx}" class="text-[#a4886e] hover:text-[#fff] p-0.5 rounded transition focus:outline-none" title="移除此條件" aria-label="移除此條件">
        <svg class="w-3 h-3 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
      </button>
    </span>
  `).join('');

  if (pills.length > 1) {
    html += `
      <button type="button" id="btnClearAllPills" class="text-[11px] text-[#e2c585] hover:text-[#fff] underline ml-1 font-sans-ui transition" title="清除所有生效條件">
        清除全部 (${pills.length})
      </button>
    `;
  }

  activeFilterTags.innerHTML = html;

  // 綁定個別條件移除按鈕
  pills.forEach((p, idx) => {
    const btn = activeFilterTags.querySelector(`button[data-pill-idx="${idx}"]`);
    if (btn) {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        p.onClear();
      });
    }
  });

  const clearAllBtn = document.getElementById('btnClearAllPills');
  if (clearAllBtn) {
    clearAllBtn.addEventListener('click', (e) => {
      e.preventDefault();
      resetAllFilters();
    });
  }
}

// 統一觸發篩選與視角重繪函式
function triggerFilterUpdate() {
  renderCardCatalog();
  if (bookshelfView && !bookshelfView.classList.contains('hidden')) renderBookshelves();
  updateMobileFilterBadge();
}

// 重設所有篩選與排序條件
function resetAllFilters() {
  if (searchInput) searchInput.value = '';
  if (yearFilter) yearFilter.value = 'ALL';
  if (categoryFilter) categoryFilter.value = 'ALL';
  if (seriesFilter) seriesFilter.value = 'ALL';
  if (statusFilter) statusFilter.value = 'ALL';
  if (sortFilter) sortFilter.value = 'DEFAULT';
  onlyShowFavorites = false;
  if (btnFavOnly) {
    btnFavOnly.className = "px-2.5 py-1.5 bg-[#170e08] hover:bg-[#311f14] border border-[#5a3a24] text-[#f2e6cf] rounded text-xs font-sans-ui flex items-center gap-1.5 shadow-sm";
    if (favIcon) favIcon.className = "w-3.5 h-3.5 text-[#8a6f52]";
  }
  renderCardCatalog();
  if (bookshelfView && !bookshelfView.classList.contains('hidden')) renderBookshelves();
  updateMobileFilterBadge();
  showToast('已重設所有檢索與排序條件', 'info');
}

// 篩選與排序變更事件綁定
if (btnResetFilter) btnResetFilter.addEventListener('click', resetAllFilters);

if (searchInput) {
  searchInput.addEventListener('input', () => {
    renderCardCatalog();
    if (bookshelfView && !bookshelfView.classList.contains('hidden')) renderBookshelves();
  });
}
if (yearFilter) {
  yearFilter.addEventListener('change', () => {
    renderCardCatalog();
    if (bookshelfView && !bookshelfView.classList.contains('hidden')) renderBookshelves();
  });
}
if (categoryFilter) {
  categoryFilter.addEventListener('change', () => {
    renderCardCatalog();
    if (bookshelfView && !bookshelfView.classList.contains('hidden')) renderBookshelves();
  });
}
if (seriesFilter) {
  seriesFilter.addEventListener('change', () => {
    if (seriesFilter.value !== 'ALL' && yearFilter) {
      yearFilter.value = 'ALL';
    }
    renderCardCatalog();
    if (bookshelfView && !bookshelfView.classList.contains('hidden')) renderBookshelves();
  });
}
if (statusFilter) {
  statusFilter.addEventListener('change', () => {
    renderCardCatalog();
    if (bookshelfView && !bookshelfView.classList.contains('hidden')) renderBookshelves();
  });
}
if (sortFilter) {
  sortFilter.addEventListener('change', () => {
    triggerFilterUpdate();
    const sortLabels = {
      'DEFAULT': '已恢復預設登錄排序',
      'YEAR_DESC': '已依閱讀年度 (新至舊) 排序',
      'YEAR_ASC': '已依閱讀年度 (舊至新) 排序',
      'PAGES_DESC': '已依冊本厚度 (頁數由多至少) 排序',
      'TITLE_ASC': '已依書名筆劃順序排序'
    };
    showToast(sortLabels[sortFilter.value] || '排序已更新', 'info');
  });
}

// 動態更新下拉選單數量與看板數據
function updateFilterCounts() {
  const total = booksDatabase.length;
  const completed = booksDatabase.filter(b => b.status === 'completed').length;
  const reading = booksDatabase.filter(b => b.status === 'reading').length;

  const statTotal = document.getElementById('statTotal');
  const statCompleted = document.getElementById('statCompleted');
  const statReading = document.getElementById('statReading');

  if (statTotal) statTotal.textContent = `${total} 冊`;
  if (statCompleted) statCompleted.textContent = `${completed} 冊`;
  if (statReading) statReading.textContent = `${reading} 冊`;

  const countsByYear = {};
  const countsByCategory = {};
  const countsBySeries = {};

  booksDatabase.forEach(b => {
    countsByYear[b.year] = (countsByYear[b.year] || 0) + 1;
    countsByCategory[b.category] = (countsByCategory[b.category] || 0) + 1;
    if (b.series) countsBySeries[b.series] = (countsBySeries[b.series] || 0) + 1;
  });

  if (yearFilter) {
    Array.from(yearFilter.options).forEach(opt => {
      if (opt.value === 'ALL') {
        opt.textContent = `全部年度 (${total} 冊)`;
      } else if (countsByYear[opt.value] !== undefined) {
        opt.textContent = `${opt.value} 年度 (${countsByYear[opt.value]} 冊)`;
      }
    });
  }

  if (categoryFilter) {
    const categoryLabels = {
      "科幻與奇幻小說": "科幻與奇幻小說",
      "哲學思辨、宗教與歷史社會": "哲學思辨、宗教與社會",
      "漫畫": "漫畫",
      "商業理財、自我成長與生活哲學": "商業理財與自我成長",
      "心理學、認知與決策思維": "心理學與思維認知",
      "海洋文學、鯨豚與自然生態": "海洋文學與生態自然",
      "繪本與圖文創作": "繪本與圖文創作",
      "世界文學、小說與傳記": "世界文學與傳記",
      "科普、物理天文與生命科學": "科普與物理天文",
      "親職教育與育兒家庭": "親職教育與家庭"
    };
    Array.from(categoryFilter.options).forEach(opt => {
      if (opt.value === 'ALL') {
        opt.textContent = `全部學科領域 (10 大類)`;
      } else if (countsByCategory[opt.value] !== undefined) {
        const label = categoryLabels[opt.value] || opt.value;
        opt.textContent = `${label} (${countsByCategory[opt.value]} 冊)`;
      }
    });
  }

  if (seriesFilter) {
    const seriesLabels = {
      "艾西莫夫：基地系列": "艾西莫夫：基地系列",
      "艾西莫夫：機器人系列": "艾西莫夫：機器人系列",
      "艾西莫夫：銀河帝國三部曲": "艾西莫夫：銀河帝國三部曲",
      "三體三部曲": "三體三部曲",
      "沙丘系列": "沙丘系列",
      "《地。-關於地球的運動-》": "《地。-關於地球的運動-》",
      "monpoké 皮卡丘幼兒繪本": "monpoké 皮卡丘繪本",
      "40堂公開課系列": "40堂公開課系列",
      "艾西莫夫科普教室": "艾西莫夫科普教室",
      "廖鴻基海洋尋鯨文學": "廖鴻基海洋尋鯨文學"
    };
    Array.from(seriesFilter.options).forEach(opt => {
      if (opt.value === 'ALL') {
        opt.textContent = `全部叢書系列 (10 大系列)`;
      } else if (countsBySeries[opt.value] !== undefined) {
        const label = seriesLabels[opt.value] || opt.value;
        opt.textContent = `${label} (${countsBySeries[opt.value]} 冊)`;
      }
    });
  }
}
