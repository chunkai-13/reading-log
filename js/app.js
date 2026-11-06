/**
 * 靜謐藏書閣 (Private Library Archive) - 應用程式核心控制器
 * 包含：全域狀態管理、DOM 參考、多維檢索篩選、視角導覽切換、鍵盤快捷鍵與事件監聽
 */

// 全域狀態管理
let favoriteBookIds = getSafeFavoriteIds();
let currentActiveBook = null;
let onlyShowFavorites = false;

// DOM 元素引用快取
const searchInput = document.getElementById('searchInput');
const yearFilter = document.getElementById('yearFilter');
const categoryFilter = document.getElementById('categoryFilter');
const seriesFilter = document.getElementById('seriesFilter');
const statusFilter = document.getElementById('statusFilter');
const btnFavOnly = document.getElementById('btnFavOnly');
const btnResetFilter = document.getElementById('btnResetFilter');
const filteredCount = document.getElementById('filteredCount');
const favCountSpan = document.getElementById('favCount');
const favIcon = document.getElementById('favIcon');
const activeFilterTags = document.getElementById('activeFilterTags');

const cardCatalogView = document.getElementById('cardCatalogView');
const bookshelfView = document.getElementById('bookshelfView');
const statsView = document.getElementById('statsView');
const seriesView = document.getElementById('seriesView');

const viewCardBtn = document.getElementById('viewCardBtn');
const viewShelfBtn = document.getElementById('viewShelfBtn');
const viewStatsBtn = document.getElementById('viewStatsBtn');
const viewSeriesBtn = document.getElementById('viewSeriesBtn');

const bookModal = document.getElementById('bookModal');
const modalCloseBtn = document.getElementById('modalCloseBtn');
const btnRandomPick = document.getElementById('btnRandomPick');
const btnExportList = document.getElementById('btnExportList');
const modalFavBtn = document.getElementById('modalFavBtn');
const modalCopyCitationBtn = document.getElementById('modalCopyCitationBtn');

// 視角切換控制
function setView(viewName) {
  if (cardCatalogView) cardCatalogView.classList.add('hidden');
  if (bookshelfView) bookshelfView.classList.add('hidden');
  if (statsView) statsView.classList.add('hidden');
  if (seriesView) seriesView.classList.add('hidden');

  const inactiveBtnClass = "px-2 sm:px-3 py-1 sm:py-1.5 text-[11px] sm:text-xs rounded transition flex items-center gap-1 sm:gap-1.5 text-[#a88d72] hover:text-[#f5ebd7]";
  const activeBtnClass = "px-2 sm:px-3 py-1 sm:py-1.5 text-[11px] sm:text-xs rounded transition flex items-center gap-1 sm:gap-1.5 bg-[#4a2e1b] text-[#f5ebd7] font-medium shadow";

  if (viewCardBtn) viewCardBtn.className = inactiveBtnClass;
  if (viewShelfBtn) viewShelfBtn.className = inactiveBtnClass;
  if (viewStatsBtn) viewStatsBtn.className = inactiveBtnClass;
  if (viewSeriesBtn) viewSeriesBtn.className = inactiveBtnClass;

  if (viewName === 'card') {
    if (cardCatalogView) cardCatalogView.classList.remove('hidden');
    if (viewCardBtn) viewCardBtn.className = activeBtnClass;
    renderCardCatalog();
  } else if (viewName === 'shelf') {
    if (bookshelfView) bookshelfView.classList.remove('hidden');
    if (viewShelfBtn) viewShelfBtn.className = activeBtnClass;
    renderBookshelves();
  } else if (viewName === 'stats') {
    if (statsView) statsView.classList.remove('hidden');
    if (viewStatsBtn) viewStatsBtn.className = activeBtnClass;
    renderStats();
  } else if (viewName === 'series') {
    if (seriesView) seriesView.classList.remove('hidden');
    if (viewSeriesBtn) viewSeriesBtn.className = activeBtnClass;
    renderSeries();
  }
}

if (viewCardBtn) viewCardBtn.addEventListener('click', () => setView('card'));
if (viewShelfBtn) viewShelfBtn.addEventListener('click', () => setView('shelf'));
if (viewStatsBtn) viewStatsBtn.addEventListener('click', () => setView('stats'));
if (viewSeriesBtn) viewSeriesBtn.addEventListener('click', () => setView('series'));

// 資料篩選核心邏輯
function getFilteredBooks() {
  const q = searchInput ? searchInput.value.trim().toLowerCase() : '';
  const yr = yearFilter ? yearFilter.value : 'ALL';
  const cat = categoryFilter ? categoryFilter.value : 'ALL';
  const ser = seriesFilter ? seriesFilter.value : 'ALL';
  const st = statusFilter ? statusFilter.value : 'ALL';

  return booksDatabase.filter(book => {
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

  // 6. 珍藏書目
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
      <button type="button" data-pill-idx="${idx}" class="text-[#a4886e] hover:text-[#fff] p-0.5 rounded transition focus:outline-none" title="移除此篩選條件" aria-label="移除此篩選條件">
        <svg class="w-3 h-3 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
      </button>
    </span>
  `).join('');

  if (pills.length > 1) {
    html += `
      <button type="button" id="btnClearAllPills" class="text-[11px] text-[#e2c585] hover:text-[#fff] underline ml-1 font-sans-ui transition" title="清除所有生效篩選">
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

// 統一觸發篩選更新函式
function triggerFilterUpdate() {
  renderCardCatalog();
  if (bookshelfView && !bookshelfView.classList.contains('hidden')) renderBookshelves();
  updateMobileFilterBadge();
}

// 收藏書目邏輯 (具備嚴格整數型別校驗)
function toggleFavorite(bookId) {
  const numericId = Number(bookId);
  if (!Number.isInteger(numericId) || numericId <= 0) return;
  const book = booksDatabase.find(b => b.id === numericId);
  const bookTitle = book ? `《${book.title}》` : '此書目';

  if (favoriteBookIds.has(numericId)) {
    favoriteBookIds.delete(numericId);
    showToast(`已將 ${bookTitle} 自珍藏名單移除`, 'info');
  } else {
    favoriteBookIds.add(numericId);
    showToast(`已將 ${bookTitle} 收入珍藏典藏`, 'success');
  }
  localStorage.setItem('lib_reading_favs', JSON.stringify([...favoriteBookIds]));
  if (favCountSpan) favCountSpan.textContent = favoriteBookIds.size;
  renderCardCatalog();
  if (bookshelfView && !bookshelfView.classList.contains('hidden')) renderBookshelves();
  if (currentActiveBook && currentActiveBook.id === numericId) updateModalFavBtnState();
}

if (modalFavBtn) {
  modalFavBtn.addEventListener('click', () => {
    if (currentActiveBook) toggleFavorite(currentActiveBook.id);
  });
}

// 只看已收藏切換
if (btnFavOnly) {
  btnFavOnly.addEventListener('click', () => {
    onlyShowFavorites = !onlyShowFavorites;
    if (onlyShowFavorites) {
      btnFavOnly.className = "px-2.5 py-1.5 bg-[#6b4528] text-[#fbf6ed] border border-[#a87449] rounded text-xs font-sans-ui flex items-center gap-1.5 shadow";
      if (favIcon) favIcon.className = "w-3.5 h-3.5 text-[#ffd17d] fill-current";
      showToast('已切換為僅顯示珍藏書目', 'info');
    } else {
      btnFavOnly.className = "px-2.5 py-1.5 bg-[#170e08] hover:bg-[#311f14] border border-[#5a3a24] text-[#f2e6cf] rounded text-xs font-sans-ui flex items-center gap-1.5 shadow-sm";
      if (favIcon) favIcon.className = "w-3.5 h-3.5 text-[#8a6f52]";
    }
    renderCardCatalog();
    if (bookshelfView && !bookshelfView.classList.contains('hidden')) renderBookshelves();
    updateMobileFilterBadge();
  });
}

// 館員隨機薦讀
if (btnRandomPick) {
  btnRandomPick.addEventListener('click', () => {
    const candidates = getFilteredBooks();
    if (candidates.length === 0) {
      showToast('當前篩選條件下無符合之書目可推薦', 'info');
      return;
    }
    const randomBook = candidates[Math.floor(Math.random() * candidates.length)];
    openBookModal(randomBook.id);
    showToast(`館員為您薦讀：《${randomBook.title}》`, 'info');
  });
}

// 引文複製功能 (型別安全)
function copyCitation(bookId) {
  const numericId = Number(bookId);
  const book = booksDatabase.find(b => b.id === numericId);
  if (!book) return;
  const citation = `《${book.title}》（${book.author}）—— ${book.desc} [${book.category}，${book.year} 年度讀物]`;
  navigator.clipboard.writeText(citation).then(() => {
    showToast(`已複製《${book.title}》引文至剪貼簿！`, 'success');
  }).catch(() => {
    showToast('複製失敗，請手動複製文字。', 'info');
  });
}

if (modalCopyCitationBtn) {
  modalCopyCitationBtn.addEventListener('click', () => {
    if (currentActiveBook) copyCitation(currentActiveBook.id);
  });
}

// 匯出全部篩選書目清單
if (btnExportList) {
  btnExportList.addEventListener('click', () => {
    const list = getFilteredBooks();
    let text = `# 私人藏書閣：書目匯出清單 (共 ${list.length} 冊)\n\n`;
    list.forEach((b, i) => {
      text += `${i+1}. 《${b.title}》（${b.author}）- ${b.category} (${b.year}年，狀態：${b.status === 'reading' ? '閱覽中' : '已完讀'})\n   提要：${b.desc}\n\n`;
    });
    navigator.clipboard.writeText(text).then(() => {
      showToast(`已成功匯出當前篩選之 ${list.length} 冊書目清單至剪貼簿！`, 'success');
    }).catch(() => {
      showToast('匯出失敗，請手動複製文字。', 'info');
    });
  });
}

// 重設篩選器
function resetAllFilters() {
  if (searchInput) searchInput.value = '';
  if (yearFilter) yearFilter.value = 'ALL';
  if (categoryFilter) categoryFilter.value = 'ALL';
  if (seriesFilter) seriesFilter.value = 'ALL';
  if (statusFilter) statusFilter.value = 'ALL';
  onlyShowFavorites = false;
  if (btnFavOnly) {
    btnFavOnly.className = "px-2.5 py-1.5 bg-[#170e08] hover:bg-[#311f14] border border-[#5a3a24] text-[#f2e6cf] rounded text-xs font-sans-ui flex items-center gap-1.5 shadow-sm";
    if (favIcon) favIcon.className = "w-3.5 h-3.5 text-[#8a6f52]";
  }
  renderCardCatalog();
  if (bookshelfView && !bookshelfView.classList.contains('hidden')) renderBookshelves();
  updateMobileFilterBadge();
  showToast('已重設所有檢索與篩選條件', 'info');
}

if (btnResetFilter) btnResetFilter.addEventListener('click', resetAllFilters);

// 彈窗關閉綁定
if (modalCloseBtn) modalCloseBtn.addEventListener('click', closeModal);
if (bookModal) {
  bookModal.addEventListener('click', (e) => {
    if (e.target === bookModal) closeModal();
  });
}

// 篩選事件監聽
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

// 行動版檢索面板折疊與過渡控制
const mobileFilterToggleBtn = document.getElementById('mobileFilterToggleBtn');
const filterControlsWrapper = document.getElementById('filterControlsWrapper');
const mobileFilterChevron = document.getElementById('mobileFilterChevron');
const mobileActiveBadge = document.getElementById('mobileActiveBadge');
const btnMobileCollapse = document.getElementById('btnMobileCollapse');

function setMobileFilterState(open) {
  if (window.innerWidth >= 1024 || !filterControlsWrapper) return;
  if (open) {
    filterControlsWrapper.classList.remove('mobile-collapsed');
    filterControlsWrapper.classList.add('mobile-expanded');
    if (mobileFilterChevron) mobileFilterChevron.classList.add('rotate-180');
  } else {
    filterControlsWrapper.classList.add('mobile-collapsed');
    filterControlsWrapper.classList.remove('mobile-expanded');
    if (mobileFilterChevron) mobileFilterChevron.classList.remove('rotate-180');
  }
}

if (mobileFilterToggleBtn) {
  mobileFilterToggleBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const isOpen = filterControlsWrapper.classList.contains('mobile-expanded');
    setMobileFilterState(!isOpen);
  });
}

if (btnMobileCollapse) {
  btnMobileCollapse.addEventListener('click', () => {
    setMobileFilterState(false);
  });
}

function updateMobileFilterBadge() {
  if (!mobileActiveBadge) return;
  let count = 0;
  if (searchInput && searchInput.value.trim()) count++;
  if (yearFilter && yearFilter.value !== 'ALL') count++;
  if (categoryFilter && categoryFilter.value !== 'ALL') count++;
  if (seriesFilter && seriesFilter.value !== 'ALL') count++;
  if (statusFilter && statusFilter.value !== 'ALL') count++;
  if (onlyShowFavorites) count++;

  if (count > 0) {
    mobileActiveBadge.textContent = count;
    mobileActiveBadge.classList.remove('hidden');
    if (mobileFilterToggleBtn) {
      mobileFilterToggleBtn.classList.add('border-[#e2c585]', 'text-[#f5ebd7]');
    }
  } else {
    mobileActiveBadge.classList.add('hidden');
    if (mobileFilterToggleBtn) {
      mobileFilterToggleBtn.classList.remove('border-[#e2c585]', 'text-[#f5ebd7]');
    }
  }
}

let lastScrollY = window.scrollY;
window.addEventListener('scroll', () => {
  const currentScrollY = window.scrollY;
  if (window.innerWidth < 1024) {
    if (currentScrollY > lastScrollY + 25 && currentScrollY > 70) {
      if (filterControlsWrapper && filterControlsWrapper.classList.contains('mobile-expanded')) {
        setMobileFilterState(false);
      }
    }
  }
  lastScrollY = currentScrollY;
}, { passive: true });

// 監聽各項篩選異動更新計數標籤
[searchInput, yearFilter, categoryFilter, seriesFilter, statusFilter].forEach(el => {
  if (el) {
    el.addEventListener('change', updateMobileFilterBadge);
    el.addEventListener('input', updateMobileFilterBadge);
  }
});
if (btnFavOnly) btnFavOnly.addEventListener('click', () => setTimeout(updateMobileFilterBadge, 50));
if (btnResetFilter) btnResetFilter.addEventListener('click', () => setTimeout(updateMobileFilterBadge, 50));

// 全域鍵盤快捷鍵支援
window.addEventListener('keydown', (e) => {
  const activeTag = document.activeElement ? document.activeElement.tagName.toLowerCase() : '';
  const isEditingText = activeTag === 'input' || activeTag === 'textarea';

  // 1. 按下 Esc 鍵關閉彈窗
  if (e.key === 'Escape') {
    if (bookModal && !bookModal.classList.contains('hidden')) {
      closeModal();
      return;
    }
    if (isEditingText && searchInput) {
      searchInput.value = '';
      triggerFilterUpdate();
      searchInput.blur();
    }
    return;
  }

  // 若使用者正在輸入文字，停用單鍵快捷鍵
  if (isEditingText) return;

  // 2. 按下 / 鍵聚焦檢索框
  if (e.key === '/') {
    e.preventDefault();
    if (searchInput) {
      searchInput.focus();
      searchInput.select();
    }
    return;
  }

  // 3. 按下 1、2、3、4 鍵快速切換四大視角
  if (e.key === '1') {
    setView('card');
  } else if (e.key === '2') {
    setView('shelf');
  } else if (e.key === '3') {
    setView('stats');
  } else if (e.key === '4') {
    setView('series');
  }
});

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

// 應用程式初始化
updateFilterCounts();
renderCardCatalog();
updateMobileFilterBadge();
