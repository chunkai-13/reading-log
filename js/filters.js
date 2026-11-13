/**
 * 靜謐藏書閣 (Private Library Archive) - 多維檢索 UI 控制與條件膠囊適配器模組 (Filters UI Adapter)
 * 職責：負責將 DOM 輸入事件轉換為查詢參數物件，調用 CatalogQueryEngine，並更新視角與膠囊標籤。
 */

// 資料篩選與排序轉發適配器 (呼叫 ArchiveRepository / CatalogQueryEngine 深模組)
function getFilteredBooks() {
  const repo = window.archiveRepository;
  const criteria = {
    text: searchInput ? searchInput.value : '',
    year: yearFilter ? yearFilter.value : 'ALL',
    category: categoryFilter ? categoryFilter.value : 'ALL',
    series: seriesFilter ? seriesFilter.value : 'ALL',
    status: statusFilter ? statusFilter.value : 'ALL',
    sortBy: sortFilter ? sortFilter.value : 'DEFAULT',
    onlyFavorites: typeof onlyShowFavorites !== 'undefined' ? onlyShowFavorites : false
  };

  if (repo) {
    return repo.query(criteria);
  }
  if (window.catalogEngine) {
    return window.catalogEngine.query(criteria);
  }
  return typeof booksDatabase !== 'undefined' ? [...booksDatabase] : [];
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
  if (typeof onlyShowFavorites !== 'undefined' && onlyShowFavorites) {
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

  activeFilterTags.innerHTML = `
    <div class="flex items-center gap-1.5 flex-wrap font-sans-ui text-xs">
      <span class="text-[#8c6b4b] text-[11px] font-medium mr-1 flex items-center gap-1">
        <svg class="w-3 h-3 text-[#c5a059]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"></path></svg>
        <span>已套用條件：</span>
      </span>
      ${pills.map((p, idx) => `
        <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#311f14] text-[#f2e6cf] border border-[#6b472a] shadow-sm text-[11px] animate-fadeIn">
          <span>${p.label}</span>
          <button type="button" data-pill-idx="${idx}" class="pill-remove-btn text-[#a88a6d] hover:text-[#f8d794] transition-colors ml-0.5" aria-label="移除此條件">
            <svg class="w-3 h-3 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </span>
      `).join('')}
      <button type="button" onclick="resetAllFilters()" class="text-[11px] text-[#c5a059] hover:text-[#f3e3ba] hover:underline ml-1">
        全部清空
      </button>
    </div>
  `;

  // 綁定個別撤除事件
  activeFilterTags.querySelectorAll('.pill-remove-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const idx = Number(btn.getAttribute('data-pill-idx'));
      if (pills[idx] && typeof pills[idx].onClear === 'function') {
        pills[idx].onClear();
      }
    });
  });
}

// 重設所有檢索與排序條件
function resetAllFilters() {
  if (searchInput) searchInput.value = '';
  if (yearFilter) yearFilter.value = 'ALL';
  if (categoryFilter) categoryFilter.value = 'ALL';
  if (seriesFilter) seriesFilter.value = 'ALL';
  if (statusFilter) statusFilter.value = 'ALL';
  if (sortFilter) sortFilter.value = 'DEFAULT';
  if (typeof onlyShowFavorites !== 'undefined') onlyShowFavorites = false;

  if (btnFavOnly) {
    btnFavOnly.className = "px-2.5 py-1.5 bg-[#170e08] hover:bg-[#311f14] border border-[#5a3a24] text-[#f2e6cf] rounded text-xs font-sans-ui flex items-center gap-1.5 shadow-sm";
    if (favIcon) favIcon.className = "w-3.5 h-3.5 text-[#8a6f52]";
  }
  renderCardCatalog();
  if (bookshelfView && !bookshelfView.classList.contains('hidden')) renderBookshelves();
  updateMobileFilterBadge();
  showToast('已重設所有檢索與排序條件', 'info');
}

// 統一觸發篩選與視角重繪函式
function triggerFilterUpdate() {
  renderCardCatalog();
  if (bookshelfView && !bookshelfView.classList.contains('hidden')) renderBookshelves();
  updateMobileFilterBadge();
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

// 動態更新下拉選單數量與看板數據 (自 ArchiveRepository / CatalogQueryEngine 提取標準盤點結果)
function updateFilterCounts() {
  const repo = window.archiveRepository || window.catalogEngine;
  if (!repo) return;

  const summary = repo.getFacetCounts();

  const statTotal = document.getElementById('statTotal');
  const statCompleted = document.getElementById('statCompleted');
  const statReading = document.getElementById('statReading');

  if (statTotal) statTotal.textContent = `${summary.total} 冊`;
  if (statCompleted) statCompleted.textContent = `${summary.completed} 冊`;
  if (statReading) statReading.textContent = `${summary.reading} 冊`;

  if (yearFilter) {
    Array.from(yearFilter.options).forEach(opt => {
      if (opt.value === 'ALL') {
        opt.textContent = `全部年度 (${summary.total} 冊)`;
      } else if (summary.byYear[opt.value] !== undefined) {
        opt.textContent = `${opt.value} 年度 (${summary.byYear[opt.value]} 冊)`;
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
      } else if (summary.byCategory[opt.value] !== undefined) {
        const label = categoryLabels[opt.value] || opt.value;
        opt.textContent = `${label} (${summary.byCategory[opt.value]} 冊)`;
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
      } else if (summary.bySeries[opt.value] !== undefined) {
        const label = seriesLabels[opt.value] || opt.value;
        opt.textContent = `${label} (${summary.bySeries[opt.value]} 冊)`;
      }
    });
  }
}
