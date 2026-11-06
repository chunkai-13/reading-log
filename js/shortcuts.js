/**
 * 靜謐藏書閣 (Private Library Archive) - 鍵盤快捷鍵與互動導航控制器模組
 * 包含：全域快捷鍵監聽、借閱憑證連貫翻閱、指南彈窗與行動端面板控制
 */

// 彈窗內書目前後翻閱邏輯
function navigateModalBook(offset) {
  if (!currentActiveBook) return;
  const list = getFilteredBooks();
  if (list.length <= 1) return;

  const currentIndex = list.findIndex(b => b.id === currentActiveBook.id);
  if (currentIndex === -1) return;

  let targetIndex = currentIndex + offset;
  if (targetIndex < 0) targetIndex = list.length - 1; // 循環回到最後一冊
  if (targetIndex >= list.length) targetIndex = 0;    // 循環回到第一冊

  openBookModal(list[targetIndex].id);
}

// 彈窗上一冊 / 下一冊按鈕綁定
const modalPrevBtn = document.getElementById('modalPrevBtn');
const modalNextBtn = document.getElementById('modalNextBtn');
if (modalPrevBtn) modalPrevBtn.addEventListener('click', () => navigateModalBook(-1));
if (modalNextBtn) modalNextBtn.addEventListener('click', () => navigateModalBook(1));

// 快捷鍵指南彈窗控制
const shortcutsModal = document.getElementById('shortcutsModal');
const btnShortcutsHelp = document.getElementById('btnShortcutsHelp');
const shortcutsModalCloseBtn = document.getElementById('shortcutsModalCloseBtn');

function toggleShortcutsModal(open) {
  if (!shortcutsModal) return;
  if (open === undefined) {
    shortcutsModal.classList.toggle('hidden');
  } else if (open) {
    shortcutsModal.classList.remove('hidden');
  } else {
    shortcutsModal.classList.add('hidden');
  }
}

if (btnShortcutsHelp) btnShortcutsHelp.addEventListener('click', () => toggleShortcutsModal(true));
if (shortcutsModalCloseBtn) shortcutsModalCloseBtn.addEventListener('click', () => toggleShortcutsModal(false));
if (shortcutsModal) {
  shortcutsModal.addEventListener('click', (e) => {
    if (e.target === shortcutsModal) toggleShortcutsModal(false);
  });
}

// 全域鍵盤快捷鍵監聽
window.addEventListener('keydown', (e) => {
  const activeTag = document.activeElement ? document.activeElement.tagName.toLowerCase() : '';
  const isEditingText = activeTag === 'input' || activeTag === 'textarea';

  // 1. 按下 Esc 鍵關閉彈窗
  if (e.key === 'Escape') {
    if (shortcutsModal && !shortcutsModal.classList.contains('hidden')) {
      toggleShortcutsModal(false);
      return;
    }
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

  // 2. 借閱憑證彈窗開啟時的專屬快捷鍵 (不受打字限制，因彈窗內無文字輸入框)
  const isBookModalOpen = bookModal && !bookModal.classList.contains('hidden');
  if (isBookModalOpen) {
    if (e.key === 'ArrowLeft' || e.key.toLowerCase() === 'j') {
      e.preventDefault();
      navigateModalBook(-1);
      return;
    }
    if (e.key === 'ArrowRight' || e.key.toLowerCase() === 'k') {
      e.preventDefault();
      navigateModalBook(1);
      return;
    }
    if (e.key.toLowerCase() === 'f') {
      e.preventDefault();
      if (currentActiveBook) toggleFavorite(currentActiveBook.id);
      return;
    }
    if (e.key.toLowerCase() === 'c') {
      e.preventDefault();
      if (currentActiveBook) copyCitation(currentActiveBook.id);
      return;
    }
  }

  // 若使用者正在輸入框內編輯文字，停用下方單鍵快捷鍵
  if (isEditingText) return;

  // 3. 按下 ? 鍵開啟/關閉快捷鍵指南
  if (e.key === '?' || (e.shiftKey && e.key === '/')) {
    e.preventDefault();
    toggleShortcutsModal();
    return;
  }

  // 4. 按下 / 鍵聚焦檢索框
  if (e.key === '/') {
    e.preventDefault();
    if (searchInput) {
      searchInput.focus();
      searchInput.select();
    }
    return;
  }

  // 5. 按下 1、2、3、4 鍵快速切換四大視角
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

// 行動版檢索面板折疊與捲動自動收合控制
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
  if (sortFilter && sortFilter.value !== 'DEFAULT') count++;
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

// 監聽各項篩選異動更新行動版徽章
[searchInput, yearFilter, categoryFilter, seriesFilter, statusFilter, sortFilter].forEach(el => {
  if (el) {
    el.addEventListener('change', updateMobileFilterBadge);
    el.addEventListener('input', updateMobileFilterBadge);
  }
});
