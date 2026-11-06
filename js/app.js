/**
 * 靜謐藏書閣 (Private Library Archive) - 主應用控制器
 * 包含：全域狀態定義、視角導覽狀態機、珍藏與薦讀業務行為、生命週期啟動
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
const sortFilter = document.getElementById('sortFilter');

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

// 視角切換控制狀態機
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

  // 切換視角時若在行動版，自動收合選單
  if (typeof setMobileFilterState === 'function') {
    setMobileFilterState(false);
  }
}

if (viewCardBtn) viewCardBtn.addEventListener('click', () => setView('card'));
if (viewShelfBtn) viewShelfBtn.addEventListener('click', () => setView('shelf'));
if (viewStatsBtn) viewStatsBtn.addEventListener('click', () => setView('stats'));
if (viewSeriesBtn) viewSeriesBtn.addEventListener('click', () => setView('series'));

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
    if (typeof updateMobileFilterBadge === 'function') updateMobileFilterBadge();
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

// 彈窗關閉綁定
if (modalCloseBtn) modalCloseBtn.addEventListener('click', closeModal);
if (bookModal) {
  bookModal.addEventListener('click', (e) => {
    if (e.target === bookModal) closeModal();
  });
}

// 應用程式初始化 (預先渲染各視角內容，杜絕延遲與未定義狀態)
updateFilterCounts();
renderCardCatalog();
if (typeof renderStats === 'function') renderStats();
if (typeof renderSeries === 'function') renderSeries();
if (typeof updateMobileFilterBadge === 'function') {
  updateMobileFilterBadge();
}
