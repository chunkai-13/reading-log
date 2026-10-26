/**
 * 靜謐藏書閣 (Private Library Archive) - 前端核心業務邏輯模組
 * 包含：DOM 渲染、原木書架高度計算、進階多維度檢索、資安輸出防護與狀態管理
 */

// 依據學科學門分類之書脊經典色彩庫 (同類型書籍使用相同顏色)
const categorySpineColors = {
  "科幻與奇幻小說": {
    bg: "linear-gradient(180deg, #1c2c44 0%, #0e1724 100%)",
    text: "#e5c687",
    border: "#2b4162"
  },
  "哲學思辨、宗教與歷史社會": {
    bg: "linear-gradient(180deg, #42291a 0%, #24140a 100%)",
    text: "#eed4a6",
    border: "#5c3c28"
  },
  "漫畫": {
    bg: "linear-gradient(180deg, #5c2014 0%, #300c06 100%)",
    text: "#fed7c8",
    border: "#7d2e1f"
  },
  "商業理財、自我成長與生活哲學": {
    bg: "linear-gradient(180deg, #4d3816 0%, #261b09 100%)",
    text: "#fad896",
    border: "#6b4f23"
  },
  "心理學、認知與決策思維": {
    bg: "linear-gradient(180deg, #441f32 0%, #220d18 100%)",
    text: "#f0d3e2",
    border: "#612e49"
  },
  "海洋文學、鯨豚與自然生態": {
    bg: "linear-gradient(180deg, #14353d 0%, #091a1f 100%)",
    text: "#a8e5eb",
    border: "#204f5b"
  },
  "繪本與圖文創作": {
    bg: "linear-gradient(180deg, #593118 0%, #311809 100%)",
    text: "#fedbb8",
    border: "#7b4725"
  },
  "世界文學、小說與傳記": {
    bg: "linear-gradient(180deg, #242220 0%, #11100f 100%)",
    text: "#dfb76c",
    border: "#3e3b38"
  },
  "科普、物理天文與生命科學": {
    bg: "linear-gradient(180deg, #1a334f 0%, #0b1929 100%)",
    text: "#c4ddfc",
    border: "#294d75"
  },
  "親職教育與育兒家庭": {
    bg: "linear-gradient(180deg, #1b3821 0%, #0b1a0e 100%)",
    text: "#c8ebd0",
    border: "#2b5735"
  }
};

// 安全防禦輔助函式：HTML 實體跳脫防範 DOM-based XSS
function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// 安全防禦輔助函式：URL 協定白名單校驗
function sanitizeUrl(url) {
  if (!url) return '#';
  const trimmed = String(url).trim();
  if (/^(https?:|\/|#)/i.test(trimmed)) {
    return trimmed;
  }
  return '#';
}

// 安全防禦儲存函式：安全解析 localStorage 防止格式損毀或惡意污染
function getSafeFavoriteIds() {
  try {
    const raw = localStorage.getItem('lib_reading_favs');
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return new Set(
        parsed
          .map(x => Number(x))
          .filter(id => Number.isInteger(id) && id > 0 && id <= 100000)
      );
    }
  } catch (e) {
    console.warn('最愛紀錄解析失敗，重設為空集合。', e);
  }
  return new Set();
}

// 本地最愛儲存機制 (經安全防禦解析)
let favoriteBookIds = getSafeFavoriteIds();
let currentActiveBook = null;
let onlyShowFavorites = false;

// DOM 元素引用
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

const cardCatalogView = document.getElementById('cardCatalogView');
const bookshelfView = document.getElementById('bookshelfView');
const statsView = document.getElementById('statsView');

const viewCardBtn = document.getElementById('viewCardBtn');
const viewShelfBtn = document.getElementById('viewShelfBtn');
const viewStatsBtn = document.getElementById('viewStatsBtn');

const bookModal = document.getElementById('bookModal');
const modalCloseBtn = document.getElementById('modalCloseBtn');
const btnRandomPick = document.getElementById('btnRandomPick');
const btnExportList = document.getElementById('btnExportList');

// 視角切換控制
function setView(viewName) {
  cardCatalogView.classList.add('hidden');
  bookshelfView.classList.add('hidden');
  statsView.classList.add('hidden');
  if (seriesView) seriesView.classList.add('hidden');

  viewCardBtn.className = "px-2 sm:px-3 py-1 sm:py-1.5 text-[11px] sm:text-xs rounded transition flex items-center gap-1 sm:gap-1.5 text-[#a88d72] hover:text-[#f5ebd7]";
  viewShelfBtn.className = "px-2 sm:px-3 py-1 sm:py-1.5 text-[11px] sm:text-xs rounded transition flex items-center gap-1 sm:gap-1.5 text-[#a88d72] hover:text-[#f5ebd7]";
  viewStatsBtn.className = "px-2 sm:px-3 py-1 sm:py-1.5 text-[11px] sm:text-xs rounded transition flex items-center gap-1 sm:gap-1.5 text-[#a88d72] hover:text-[#f5ebd7]";
  if (viewSeriesBtn) viewSeriesBtn.className = "px-2 sm:px-3 py-1 sm:py-1.5 text-[11px] sm:text-xs rounded transition flex items-center gap-1 sm:gap-1.5 text-[#a88d72] hover:text-[#f5ebd7]";

  if (viewName === 'card') {
    cardCatalogView.classList.remove('hidden');
    viewCardBtn.className = "px-2 sm:px-3 py-1 sm:py-1.5 text-[11px] sm:text-xs rounded transition flex items-center gap-1 sm:gap-1.5 bg-[#4a2e1b] text-[#f5ebd7] font-medium shadow";
  } else if (viewName === 'shelf') {
    bookshelfView.classList.remove('hidden');
    viewShelfBtn.className = "px-2 sm:px-3 py-1 sm:py-1.5 text-[11px] sm:text-xs rounded transition flex items-center gap-1 sm:gap-1.5 bg-[#4a2e1b] text-[#f5ebd7] font-medium shadow";
    renderBookshelves();
  } else if (viewName === 'stats') {
    statsView.classList.remove('hidden');
    viewStatsBtn.className = "px-2 sm:px-3 py-1 sm:py-1.5 text-[11px] sm:text-xs rounded transition flex items-center gap-1 sm:gap-1.5 bg-[#4a2e1b] text-[#f5ebd7] font-medium shadow";
    renderStats();
  } else if (viewName === 'series') {
    if (seriesView) seriesView.classList.remove('hidden');
    if (viewSeriesBtn) viewSeriesBtn.className = "px-2 sm:px-3 py-1 sm:py-1.5 text-[11px] sm:text-xs rounded transition flex items-center gap-1 sm:gap-1.5 bg-[#4a2e1b] text-[#f5ebd7] font-medium shadow";
    renderSeries();
  }
}

viewCardBtn.addEventListener('click', () => setView('card'));
viewShelfBtn.addEventListener('click', () => setView('shelf'));
viewStatsBtn.addEventListener('click', () => setView('stats'));
if (viewSeriesBtn) viewSeriesBtn.addEventListener('click', () => setView('series'));

// 資料篩選核心邏輯
function getFilteredBooks() {
  const q = searchInput.value.trim().toLowerCase();
  const yr = yearFilter.value;
  const cat = categoryFilter.value;
  const ser = seriesFilter.value;
  const st = statusFilter.value;

  return booksDatabase.filter(book => {
    if (onlyShowFavorites && !favoriteBookIds.has(book.id)) return false;
    if (yr !== 'ALL' && book.year.toString() !== yr) return false;
    if (cat !== 'ALL' && book.category !== cat) return false;
    if (ser !== 'ALL' && book.series !== ser) return false;
    if (st !== 'ALL' && book.status !== st) return false;

    if (q) {
      const matchTitle = book.title.toLowerCase().includes(q);
      const matchAuthor = book.author.toLowerCase().includes(q);
      const matchDesc = book.desc.toLowerCase().includes(q);
      const matchCallNo = book.callNo.toLowerCase().includes(q);
      const matchSeries = (book.series || '').toLowerCase().includes(q);
      return matchTitle || matchAuthor || matchDesc || matchCallNo || matchSeries;
    }

    return true;
  });
}

// 渲染索書卡目錄 (Card Catalog View)
function renderCardCatalog() {
  const filtered = getFilteredBooks();
  filteredCount.textContent = filtered.length;
  favCountSpan.textContent = favoriteBookIds.size;

  if (filtered.length === 0) {
    cardCatalogView.innerHTML = `
      <div class="col-span-full py-16 text-center parchment-card rounded-lg p-8">
        <div class="text-3xl text-[#876543] mb-2 font-serif">無符合條件之藏書紀錄</div>
        <p class="text-sm text-[#735a43] font-sans-ui">請嘗試調整搜尋字詞、放寬學科或重設篩選條件。</p>
        <button onclick="resetAllFilters()" class="mt-4 px-4 py-2 bg-[#3b2516] text-[#f2e6cf] rounded text-xs font-sans-ui hover:bg-[#523521]">重設所有條件</button>
      </div>
    `;
    return;
  }

  cardCatalogView.innerHTML = filtered.map(book => {
    const isFav = favoriteBookIds.has(book.id);
    const isReading = book.status === 'reading';
    const safeTitle = escapeHtml(book.title);
    const safeAuthor = escapeHtml(book.author);
    const safeDesc = escapeHtml(book.desc);
    const safeCallNo = escapeHtml(book.callNo);
    const safeCategory = escapeHtml(book.category);
    const safeSeries = escapeHtml(book.series);
    const safeBooksUrl = sanitizeUrl(book.booksUrl);
    const safeCoverUrl = sanitizeUrl(book.coverUrl);
    const bookId = Number(book.id);
    const isEslite = safeBooksUrl.includes('eslite');

    return `
      <article class="parchment-card rounded-md p-4 sm:p-5 flex flex-col justify-between hover:shadow-xl transition-all duration-200 group border border-[#dfd5c3]">
        <div class="flex flex-row gap-4 items-start">
          <!-- 左側：書籍封面圖 -->
          <div class="w-24 sm:w-28 flex-shrink-0 aspect-[2/3] rounded bg-[#ecdcc4] border border-[#d8c7af] shadow-sm overflow-hidden flex items-center justify-center relative cursor-pointer" onclick="openBookModal(${bookId})">
            ${safeCoverUrl !== '#' ? `
              <img 
                src="${safeCoverUrl}" 
                alt="《${safeTitle}》封面" 
                referrerpolicy="no-referrer"
                class="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-300"
                loading="lazy"
                onerror="if(!this.dataset.triedProxy && this.src.startsWith('http')){this.dataset.triedProxy='1';this.src='https://images.weserv.nl/?url='+encodeURIComponent(this.src);}else{this.onerror=null;this.classList.add('hidden');this.nextElementSibling.classList.remove('hidden');}"
              >
              <div class="hidden flex-col items-center justify-center p-2 text-center text-[#8a6e55] w-full h-full bg-[#f4ecd8]">
                <svg class="w-8 h-8 opacity-60 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path>
                </svg>
                <span class="text-[10px] leading-tight font-serif text-[#785a3e]">私人館藏</span>
              </div>
            ` : `
              <div class="flex flex-col items-center justify-center p-2 text-center text-[#8a6e55] w-full h-full bg-[#f4ecd8]">
                <svg class="w-8 h-8 opacity-60 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path>
                </svg>
                <span class="text-[10px] leading-tight font-serif text-[#785a3e]">私人館藏</span>
              </div>
            `}
          </div>

          <!-- 右側：書籍資訊 -->
          <div class="flex-1 min-w-0 flex flex-col justify-between">
            <!-- 頂部：索書號與戳印 -->
            <div class="flex items-start justify-between gap-1.5 border-b border-[#e5dcce] pb-2 mb-2">
              <div class="font-mono text-xs font-bold text-[#5c3e23] tracking-wide bg-[#f0e6d6] px-2 py-0.5 rounded truncate">
                ${safeCallNo}
              </div>
              <div class="flex items-center gap-1.5 flex-shrink-0">
                ${isReading 
                  ? `<span class="library-stamp library-stamp-reading text-[11px] px-2 py-0.5 font-bold font-sans-ui whitespace-nowrap">借出閱覽</span>`
                  : `<span class="library-stamp text-[11px] px-2 py-0.5 font-bold font-sans-ui whitespace-nowrap">已完讀</span>`
                }
                <button onclick="toggleFavorite(${bookId})" title="${isFav ? '取消珍藏' : '加入珍藏'}" class="p-1 text-[#8f7457] hover:text-[#c48e35] transition">
                  <svg class="w-4 h-4 ${isFav ? 'text-[#c48e35] fill-current' : ''}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"></path>
                  </svg>
                </button>
              </div>
            </div>

            <!-- 書名與作者 -->
            <h3 class="text-base sm:text-lg font-bold text-[#22140a] group-hover:text-[#6e411b] transition leading-snug cursor-pointer font-serif line-clamp-2" onclick="openBookModal(${bookId})">
              ${safeTitle}
            </h3>
            <div class="text-xs text-[#6e5035] font-medium mt-1 font-sans-ui line-clamp-1">
              ${safeAuthor}
            </div>

            <!-- 學科標籤與系列 -->
            <div class="flex flex-wrap items-center gap-1.5 my-2.5 font-sans-ui text-[11px]">
              <span class="px-2 py-0.5 rounded bg-[#ebdcc4] text-[#4f3219] font-medium">
                ${safeCategory}
              </span>
              ${book.series ? `<span class="px-2 py-0.5 rounded bg-[#dfcfb5] text-[#3e2714] font-medium border border-[#cfbd9f] truncate max-w-[130px]">${safeSeries}</span>` : ''}
              <span class="text-[#8c745c] ml-auto font-mono text-[11px]">${Number(book.year)} 年錄</span>
            </div>

            <!-- 藏書摘要 -->
            <p class="text-xs text-[#4d3623] leading-relaxed line-clamp-2 bg-[#f5ede0] p-2 rounded border border-[#e4d6bf] italic">
              「${safeDesc}」
            </p>
          </div>
        </div>

        <!-- 卡片底欄操作 -->
        <div class="mt-4 pt-3 border-t border-[#dfd2be] flex items-center justify-between font-sans-ui text-xs">
          <button onclick="openBookModal(${bookId})" class="text-[#784e2a] hover:text-[#2d1b0f] font-semibold flex items-center gap-1">
            <span>調閱借閱紀錄卡</span>
            <span>→</span>
          </button>
          <div class="flex items-center gap-2">
            <a href="${safeBooksUrl}" target="_blank" rel="noopener noreferrer" class="px-2.5 py-1 rounded bg-[#7a4c28] hover:bg-[#5e381b] text-[#fbf6ed] text-[11px] font-medium inline-flex items-center gap-1 shadow-sm transition" title="${isEslite ? '前往誠品線上查看' : '前往博客來查看'}《${safeTitle}》詳細資料">
              <span>更多資訊</span>
              <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path>
              </svg>
            </a>
            <button onclick="copyCitation(${bookId})" class="text-[#8a6e55] hover:text-[#382313] text-[11px]">
              複製引文
            </button>
          </div>
        </div>
      </article>`;
  }).join('');
}

// 渲染典藏原木書架模式 (Bookshelf View)
function renderBookshelves() {
  const filtered = getFilteredBooks();
  const shelf2026 = document.getElementById('shelf2026');
  const shelf2025 = document.getElementById('shelf2025');
  const shelf2024 = document.getElementById('shelf2024');

  const byYear = { 2026: [], 2025: [], 2024: [] };
  filtered.forEach(book => {
    if (byYear[book.year]) byYear[book.year].push(book);
  });

  function generateShelfSpines(books) {
    if (books.length === 0) {
      return `<div class="text-sm text-[#8c6b4e] font-sans-ui italic p-6">此架暫無符合條件之藏書</div>`;
    }

    // 同系列高度對照表（同一個系列的書籍，使用相同高度）
    const seriesHeights = {
      "艾西莫夫：基地系列": 265,
      "艾西莫夫：機器人系列": 258,
      "艾西莫夫：銀河帝國三部曲": 262,
      "三體三部曲": 272,
      "沙丘系列": 275,
      "《地。-關於地球的運動-》": 215,
      "monpoké 皮卡丘幼兒繪本": 235,
      "40堂公開課系列": 252,
      "艾西莫夫科普教室": 248,
      "廖鴻基海洋尋鯨文學": 256,
    };

    return books.map((book) => {
      // 1. 同類型的書籍使用相同顏色表示
      const colorTheme = categorySpineColors[book.category] || {
        bg: "linear-gradient(180deg, #3d2516 0%, #1f120a 100%)",
        text: "#eed4a6",
        border: "#5a3a22"
      };

      // 2. 高度計算：同系列齊高、漫畫類較低（約215px）、其餘維持自然微參差
      let spineHeight;
      if (book.series && seriesHeights[book.series]) {
        spineHeight = seriesHeights[book.series];
      } else if (book.series) {
        let hash = 0;
        for (let i = 0; i < book.series.length; i++) hash = (hash * 31 + book.series.charCodeAt(i)) & 0xfff;
        spineHeight = book.category === '漫畫' ? 215 : (250 + (hash % 25));
      } else if (book.category === '漫畫') {
        spineHeight = 215; // 漫畫類高度較低
      } else if (book.category === '繪本與圖文創作') {
        spineHeight = 238; // 繪本高度
      } else {
        // 一般單行本自然參差感 (248px ~ 280px)
        spineHeight = 248 + ((book.id * 13) % 33);
      }

      // 3. 厚度（寬度）計算：繪本類的厚度較薄（約20~24px）
      let spineWidth;
      const isPictureBook = book.category === '繪本與圖文創作';
      if (isPictureBook) {
        spineWidth = 21 + ((book.id * 3) % 4); // 21px ~ 24px: 繪本類厚度較薄
      } else if (book.category === '漫畫') {
        spineWidth = 31 + ((book.id * 5) % 6); // 31px ~ 36px: 漫畫開本
      } else if (book.series) {
        spineWidth = 36 + ((book.id * 3) % 8); // 36px ~ 43px: 系列專題
      } else {
        spineWidth = 34 + ((book.id * 7) % 15); // 34px ~ 48px: 一般書籍厚度
      }

      const isReading = book.status === 'reading';
      const safeTitle = escapeHtml(book.title);
      const safeAuthor = escapeHtml(book.author);
      const safeCallPrefix = escapeHtml(book.callNo.split('-')[0]);
      const bookId = Number(book.id);

      return `
        <div class="book-spine" 
             onclick="openBookModal(${bookId})" 
             title="《${safeTitle}》- ${safeAuthor} (點擊抽閱)"
             style="width: ${spineWidth}px; height: ${spineHeight}px; background: ${colorTheme.bg}; color: ${colorTheme.text}; border-left: 1px solid ${colorTheme.border}; border-right: 1px solid ${colorTheme.border};">
          
          <!-- 頂部裝飾金線 -->
          <div class="w-full pt-1.5 sm:pt-2 flex flex-col items-center gap-1">
            <div class="spine-band"></div>
            <div class="spine-band"></div>
            ${isReading ? `<div class="w-full text-center py-0.5 bg-[#1a6e38] text-white text-[9px] font-sans-ui font-bold">在讀</div>` : ''}
          </div>

          <!-- 書脊垂直標題文字 -->
          <div class="py-2 ${isPictureBook ? 'text-[11px]' : 'text-xs'} font-serif font-bold tracking-wider leading-none text-center truncate max-h-[160px] overflow-hidden" style="text-shadow: 0 1px 2px rgba(0,0,0,0.8);">
            ${safeTitle}
          </div>

          <!-- 底部索書號標籤 -->
          <div class="w-full pb-2 flex flex-col items-center gap-1 font-mono text-[9px] text-center">
            <div class="spine-band"></div>
            <div class="bg-[#140e08]/85 text-[#e8caa0] px-0.5 py-0.5 rounded text-[8px] transform rotate-90 my-1 whitespace-nowrap">
              ${safeCallPrefix}
            </div>
          </div>

        </div>
      `;
    }).join('');
  }

  shelf2026.innerHTML = generateShelfSpines(byYear[2026]);
  shelf2025.innerHTML = generateShelfSpines(byYear[2025]);
  shelf2024.innerHTML = generateShelfSpines(byYear[2024]);
}

// 渲染統計年報分析 (Stats View)
function renderStats() {
  const categoryStatsList = document.getElementById('categoryStatsList');
  const seriesStatsList = document.getElementById('seriesStatsList');

  // 統計分類
  const catCount = {};
  booksDatabase.forEach(b => {
    catCount[b.category] = (catCount[b.category] || 0) + 1;
  });

  const total = booksDatabase.length;
  const sortedCats = Object.entries(catCount).sort((a,b) => b[1] - a[1]);

  const categoryMeta = {
    "科幻與奇幻小說": {
      icon: `<svg class="w-5 h-5 text-[#8b4f23]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"></path><path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"></path><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"></path><path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"></path></svg>`,
      desc: "艾西莫夫基地與機器人系列、三體三部曲、沙丘系列、太空漫遊",
      color: "from-[#8b4f23] to-[#c7824b]"
    },
    "哲學思辨、宗教與歷史社會": {
      icon: `<svg class="w-5 h-5 text-[#6c4826]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21h18M3 10h18M5 10v11M9 10v11M15 10v11M19 10v11M12 2L2 7h20L12 2z"></path></svg>`,
      desc: "40堂公開課系列、悲劇哲學家尼采、思辨讀本、武士道、臺灣歷史政治",
      color: "from-[#6c4826] to-[#a67448]"
    },
    "漫畫": {
      icon: `<svg class="w-5 h-5 text-[#b34728]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"></rect><path d="M3 9h18M9 21V9"></path></svg>`,
      desc: "《地。-關於地球的運動-》全8集手塚治虫文化大賞得獎名作",
      color: "from-[#b34728] to-[#e07148]"
    },
    "心理學、認知與決策思維": {
      icon: `<svg class="w-5 h-5 text-[#73432b]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 4.44-2.54z"></path><path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-4.44-2.54z"></path></svg>`,
      desc: "真確、思維誤判、莫非定律、象與騎象人、內向心理學、決策思維與認知",
      color: "from-[#73432b] to-[#b3704f]"
    },
    "商業理財、自我成長與生活哲學": {
      icon: `<svg class="w-5 h-5 text-[#7b521e]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M22 7 13.5 15.5 8.5 10.5 2 17"></path><polyline points="16 7 22 7 22 13"></polyline></svg>`,
      desc: "持續買進、致富心態、納瓦爾寶典、原則筆記、極簡生活與自我實現",
      color: "from-[#7b521e] to-[#ba8a45]"
    },
    "海洋文學、鯨豚與自然生態": {
      icon: `<svg class="w-5 h-5 text-[#245366]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12c1.5-2 3.5-3 5.5-3s4 1 5.5 3 3.5 3 5.5 3 4-1 5.5-3"></path><path d="M2 18c1.5-2 3.5-3 5.5-3s4 1 5.5 3 3.5 3 5.5 3 4-1 5.5-3"></path><path d="M2 6c1.5-2 3.5-3 5.5-3s4 1 5.5 3 3.5 3 5.5 3 4-1 5.5-3"></path></svg>`,
      desc: "廖鴻基海洋尋鯨系列、台灣π、白鯨記、52赫茲的鯨魚們、聲音生態學",
      color: "from-[#245366] to-[#48879e]"
    },
    "繪本與圖文創作": {
      icon: `<svg class="w-5 h-5 text-[#8c432a]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="13.5" cy="6.5" r=".5" fill="currentColor"></circle><circle cx="17.5" cy="10.5" r=".5" fill="currentColor"></circle><circle cx="8.5" cy="7.5" r=".5" fill="currentColor"></circle><circle cx="6.5" cy="12.5" r=".5" fill="currentColor"></circle><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"></path></svg>`,
      desc: "影子馬戲團、情緒大飯店、鯨鯊、牆外的牆、monpoké 皮卡丘繪本",
      color: "from-[#8c432a] to-[#c76f50]"
    },
    "世界文學、小說與傳記": {
      icon: `<svg class="w-5 h-5 text-[#543b27]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z"></path><path d="M6 6h10M6 10h10M6 14h6"></path></svg>`,
      desc: "強風吹拂、明日明日又明日、月亮與六便士、炒飯狙擊手、人物傳記",
      color: "from-[#543b27] to-[#8c674b]"
    },
    "科普、物理天文與生命科學": {
      icon: `<svg class="w-5 h-5 text-[#30536b]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="2" fill="currentColor"></circle><path d="M12 2v2M12 20v2M2 12h2M20 12h2"></path><ellipse cx="12" cy="12" rx="10" ry="4.5" transform="rotate(30 12 12)"></ellipse><ellipse cx="12" cy="12" rx="10" ry="4.5" transform="rotate(-30 12 12)"></ellipse></svg>`,
      desc: "我們為何相信、父產科男性生殖醫學、時間的形狀相對論、多重宇宙、薛丁格生命是什麼、艾西莫夫科普教室",
      color: "from-[#30536b] to-[#5a86a6]"
    },
    "親職教育與育兒家庭": {
      icon: `<svg class="w-5 h-5 text-[#2d5c39]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M7 20h10M12 20v-8M12 12c0-3.5 2.5-6 6-6-1 2.5-1 5-6 6ZM12 15c0-2.5-2-4.5-5-4.5.5 2 1.5 3.5 5 4.5Z"></path></svg>`,
      desc: "愛上當爸媽這件事、當我再次是個孩子、預備教育的未來、PBL",
      color: "from-[#2d5c39] to-[#559166]"
    }
  };

  const totalBadge = document.getElementById('statsCategoryTotalBadge');
  if (totalBadge) totalBadge.textContent = `總量：${total} 冊 (10 大領域)`;

  categoryStatsList.innerHTML = sortedCats.map(([cat, count]) => {
    const pct = ((count / total) * 100).toFixed(1);
    const meta = categoryMeta[cat] || {
      icon: `<svg class="w-5 h-5 text-[#6c4826]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z"></path></svg>`,
      desc: "",
      color: "from-[#7a4c28] to-[#b38848]"
    };

    return `
      <div class="bg-[#f7efe1] hover:bg-[#f2e6d3] transition p-3.5 sm:p-4 rounded-lg border border-[#e2d4be] shadow-sm flex flex-col gap-2.5">
        <div class="flex items-center gap-3">
          <!-- 學科專屬 Icon 標章 -->
          <div class="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-[#ebdcc4] border border-[#d6c4a8] flex items-center justify-center flex-shrink-0 shadow-inner">
            ${meta.icon}
          </div>
          
          <!-- 學科標題與代表典藏備註 -->
          <div class="flex-1 min-w-0">
            <div class="flex items-baseline justify-between gap-2">
              <h3 class="font-bold text-[#2a170a] text-sm sm:text-base font-serif truncate">
                ${cat}
              </h3>
              <span class="text-xs font-mono font-bold text-[#63452b] whitespace-nowrap">
                ${count} 冊 <span class="text-[#8c6b4b] font-normal">(${pct}%)</span>
              </span>
            </div>
            <div class="text-[11px] sm:text-xs text-[#70553c] mt-0.5 truncate">
              ${meta.desc}
            </div>
          </div>
        </div>

        <!-- 佔比進度條 -->
        <div class="w-full bg-[#e8dac5] rounded-full h-2.5 overflow-hidden border border-[#d2bea4]">
          <div class="bg-gradient-to-r ${meta.color} h-full rounded-full transition-all duration-500" style="width: ${pct}%;"></div>
        </div>
      </div>
    `;
  }).join('');

}

// 獨立渲染十大系列專題套書 (Series View)
function renderSeries() {
  const seriesStatsList = document.getElementById('seriesStatsList');
  if (!seriesStatsList) return;

  // 嚴格篩除年度項目，保留真正的 10 大專題
  const cleanSeries = seriesDatabase.filter(ser => 
    !['2024', '2025', '2026', '累計'].includes(ser.name)
  );

  // 取得系列代表封面函式
  function getSeriesCover(ser) {
    // 自訂優先代表封面（基地系列指定使用本傳首部曲《基地》取代前傳《基地前奏》）
    const preferredTitles = {
      "艾西莫夫：基地系列": "基地"
    };
    const targetTitle = ser.coverTitle || preferredTitles[ser.name];
    if (targetTitle) {
      const found = booksDatabase.find(b => b.title === targetTitle && b.coverUrl);
      if (found) return { coverUrl: found.coverUrl, title: found.title, id: found.id };
    }

    if (Array.isArray(ser.books)) {
      for (const t of ser.books) {
        const cleanT = t.replace(/[《》\s]/g, '');
        for (const b of booksDatabase) {
          const cleanB = b.title.replace(/[《》\s]/g, '');
          if ((cleanB.includes(cleanT) || cleanT.includes(cleanB) || (cleanT.includes('第') && cleanB.includes(cleanT))) && b.coverUrl) {
            return { coverUrl: b.coverUrl, title: b.title, id: b.id };
          }
        }
      }
    }
    for (const b of booksDatabase) {
      if ((b.series === ser.name || (b.series && ser.name.includes(b.series)) || (b.series && b.series.includes(ser.name))) && b.coverUrl) {
        return { coverUrl: b.coverUrl, title: b.title, id: b.id };
      }
    }
    return null;
  }

  seriesStatsList.innerHTML = cleanSeries.map(ser => {
    const coverBook = getSeriesCover(ser);
    const safeName = escapeHtml(ser.name);
    const safeAuthor = escapeHtml(ser.author);
    const safeDesc = escapeHtml(ser.desc);
    const safeBooksList = Array.isArray(ser.books) ? ser.books.map(b => escapeHtml(b)).join('、') : '';
    const coverBookId = coverBook ? Number(coverBook.id) : null;
    const safeCoverTitle = coverBook ? escapeHtml(coverBook.title) : '';
    const safeCoverUrl = coverBook ? sanitizeUrl(coverBook.coverUrl) : '';
    const safeCount = Number(ser.count);

    return `
      <div class="bg-[#f5ebd9] hover:bg-[#ede0ca] transition p-4 sm:p-5 rounded-lg border border-[#dfcfb5] shadow-sm flex flex-col justify-between group">
        <div class="flex flex-row gap-4 items-start">
          <!-- 左側系列封面圖 -->
          <div class="w-20 sm:w-24 flex-shrink-0 aspect-[2/3] rounded bg-[#ecdcc4] border border-[#d6c4a8] shadow-sm overflow-hidden flex items-center justify-center relative ${coverBook ? 'cursor-pointer' : ''}" ${coverBookId ? `onclick="openBookModal(${coverBookId})" title="調閱《${safeCoverTitle}》借閱卡"` : ''}>
            ${safeCoverUrl && safeCoverUrl !== '#' ? `
              <img 
                src="${safeCoverUrl}" 
                alt="《${safeCoverTitle}》封面" 
                class="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-300"
                loading="lazy"
                onerror="this.onerror=null; this.classList.add('hidden'); this.nextElementSibling.classList.remove('hidden');"
              >
              <div class="hidden flex-col items-center justify-center p-2 text-center text-[#8a6e55] w-full h-full bg-[#f4ecd8]">
                <svg class="w-8 h-8 opacity-60 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path></svg>
                <span class="text-[10px] font-serif text-[#785a3e]">專題套書</span>
              </div>
            ` : `
              <div class="flex flex-col items-center justify-center p-2 text-center text-[#8a6e55] w-full h-full bg-[#f4ecd8]">
                <svg class="w-8 h-8 opacity-60 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path></svg>
                <span class="text-[10px] font-serif text-[#785a3e]">專題套書</span>
              </div>
            `}
          </div>

          <!-- 右側系列資訊 -->
          <div class="flex-1 min-w-0">
            <div class="flex items-start justify-between gap-2">
              <h3 class="font-bold text-[#221307] text-base sm:text-lg font-serif">
                ${safeName}
              </h3>
              <span class="text-xs px-2 py-0.5 rounded bg-[#e0ceb1] font-mono text-[#52351c] font-bold whitespace-nowrap border border-[#cfbd9f]">
                ${safeCount} 冊全
              </span>
            </div>
            <div class="text-xs text-[#705238] mt-0.5 font-medium font-sans-ui">
              ${safeAuthor}
            </div>
            <p class="text-xs text-[#483321] mt-2 italic leading-relaxed bg-[#fbf6ed] p-2.5 rounded border border-[#e8dbc6]">
              ${safeDesc}
            </p>
          </div>
        </div>

        <div class="mt-3.5 pt-2.5 border-t border-[#dfcfb5] flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#78593f]">
          <div class="truncate flex-1 min-w-0">
            <span class="font-semibold text-[#5c3e23]">收錄書目：</span>${safeBooksList}
          </div>
          <button onclick="filterBySeries(this.dataset.seriesName)" data-series-name="${safeName}" class="text-[#784e2a] hover:text-[#2d1b0f] font-semibold text-xs flex items-center gap-1 flex-shrink-0 transition">
            <span>檢視套書目錄</span>
            <span>→</span>
          </button>
        </div>
      </div>
    `;
  }).join('');
}

// 快捷從系列卡切換至索書目錄篩選
function filterBySeries(seriesName) {
  if (seriesFilter) seriesFilter.value = seriesName;
  if (yearFilter) yearFilter.value = 'ALL';
  if (categoryFilter) categoryFilter.value = 'ALL';
  if (statusFilter) statusFilter.value = 'ALL';
  if (searchInput) searchInput.value = '';
  onlyShowFavorites = false;
  const favBtn = document.getElementById('filterFavBtn');
  if (favBtn) favBtn.classList.remove('bg-[#8b4f23]', 'text-[#fbf6ed]', 'border-[#8b4f23]');
  setView('card');
  renderCardCatalog();
}

// 書目彈窗 Modal 控制
function openBookModal(bookId) {
  const numericId = Number(bookId);
  const book = booksDatabase.find(b => b.id === numericId);
  if (!book) return;
  currentActiveBook = book;

  document.getElementById('modalCallNo').textContent = book.callNo;
  document.getElementById('modalCategory').textContent = book.category;
  document.getElementById('modalYear').textContent = `${book.year} 年度典藏`;
  document.getElementById('modalTitle').textContent = `《${book.title}》`;
  document.getElementById('modalAuthor').textContent = book.author;
  document.getElementById('modalDesc').textContent = book.desc;

  const modalBooksLink = document.getElementById('modalBooksLink');
  if (modalBooksLink) {
    const targetUrl = sanitizeUrl(book.booksUrl || `https://search.books.com.tw/search/query/key/${encodeURIComponent(book.title)}/cat/all`);
    modalBooksLink.href = targetUrl;
    const isEslite = targetUrl.includes('eslite');
    modalBooksLink.title = isEslite ? '前往誠品線上查看書籍完整資訊' : '前往博客來查看書籍完整資訊';
    const spanEl = modalBooksLink.querySelector('span');
    if (spanEl) spanEl.textContent = isEslite ? '更多資訊 (誠品線上)' : '更多資訊 (博客來)';
  }

  const modalCoverImg = document.getElementById('modalCoverImg');
  const modalCoverPlaceholder = document.getElementById('modalCoverPlaceholder');
  if (modalCoverImg && modalCoverPlaceholder) {
    modalCoverImg.dataset.triedProxy = '';
    const safeCoverUrl = sanitizeUrl(book.coverUrl);
    if (safeCoverUrl && safeCoverUrl !== '#') {
      modalCoverImg.src = safeCoverUrl;
      modalCoverImg.alt = `《${escapeHtml(book.title)}》封面`;
      modalCoverImg.referrerPolicy = 'no-referrer';
      modalCoverImg.classList.remove('hidden');
      modalCoverPlaceholder.classList.add('hidden');
      modalCoverImg.onerror = () => {
        if (!modalCoverImg.dataset.triedProxy && safeCoverUrl.startsWith('http')) {
          modalCoverImg.dataset.triedProxy = '1';
          modalCoverImg.src = 'https://images.weserv.nl/?url=' + encodeURIComponent(safeCoverUrl);
        } else {
          modalCoverImg.onerror = null;
          modalCoverImg.classList.add('hidden');
          modalCoverPlaceholder.classList.remove('hidden');
        }
      };
    } else {
      modalCoverImg.classList.add('hidden');
      modalCoverPlaceholder.classList.remove('hidden');
    }
  }

  const badge = document.getElementById('modalSeriesBadge');
  if (book.series) {
    badge.textContent = `所屬系列：${book.series}`;
    badge.classList.remove('hidden');
  } else {
    badge.classList.add('hidden');
  }

  const stamp = document.getElementById('modalStamp');
  const statusText = document.getElementById('modalStatusText');
  if (book.status === 'reading') {
    stamp.className = "library-stamp library-stamp-reading px-4 py-2 text-xs font-bold font-sans-ui";
    stamp.textContent = "BORROWED 借出中";
    statusText.textContent = "借閱中（預計持續研讀）";
    statusText.className = "font-bold text-[#1b6b3a]";
  } else {
    stamp.className = "library-stamp px-4 py-2 text-xs font-bold font-sans-ui";
    stamp.textContent = "RETURNED 完讀歸還";
    statusText.textContent = "完讀已歸架 (已登記)";
    statusText.className = "font-bold text-[#802424]";
  }

  updateModalFavBtnState();
  bookModal.classList.remove('hidden');
}

function closeModal() {
  bookModal.classList.add('hidden');
  currentActiveBook = null;
}

modalCloseBtn.addEventListener('click', closeModal);
bookModal.addEventListener('click', (e) => {
  if (e.target === bookModal) closeModal();
});

// 收藏書目邏輯 (具備嚴格整數型別校驗)
function toggleFavorite(bookId) {
  const numericId = Number(bookId);
  if (!Number.isInteger(numericId) || numericId <= 0) return;
  if (favoriteBookIds.has(numericId)) {
    favoriteBookIds.delete(numericId);
  } else {
    favoriteBookIds.add(numericId);
  }
  localStorage.setItem('lib_reading_favs', JSON.stringify([...favoriteBookIds]));
  favCountSpan.textContent = favoriteBookIds.size;
  renderCardCatalog();
  if (!bookshelfView.classList.contains('hidden')) renderBookshelves();
  if (currentActiveBook && currentActiveBook.id === numericId) updateModalFavBtnState();
}

function updateModalFavBtnState() {
  if (!currentActiveBook) return;
  const isFav = favoriteBookIds.has(currentActiveBook.id);
  const text = document.getElementById('modalFavBtnText');
  text.textContent = isFav ? "已收藏（點擊取消）" : "加入珍藏標記";
}

document.getElementById('modalFavBtn').addEventListener('click', () => {
  if (currentActiveBook) toggleFavorite(currentActiveBook.id);
});

// 只看已收藏切換
btnFavOnly.addEventListener('click', () => {
  onlyShowFavorites = !onlyShowFavorites;
  if (onlyShowFavorites) {
    btnFavOnly.className = "px-3 py-1.5 bg-[#6b4528] text-[#fbf6ed] border border-[#a87449] rounded text-sm font-sans-ui flex items-center gap-1.5 shadow";
    favIcon.className = "w-4 h-4 text-[#ffd17d] fill-current";
  } else {
    btnFavOnly.className = "px-3 py-1.5 bg-[#170e08] hover:bg-[#311f14] border border-[#5a3a24] text-[#f2e6cf] rounded text-sm font-sans-ui flex items-center gap-1.5";
    favIcon.className = "w-4 h-4 text-[#8a6f52]";
  }
  renderCardCatalog();
  if (!bookshelfView.classList.contains('hidden')) renderBookshelves();
});

// 館員隨機薦讀
btnRandomPick.addEventListener('click', () => {
  const candidates = getFilteredBooks();
  if (candidates.length === 0) return;
  const randomBook = candidates[Math.floor(Math.random() * candidates.length)];
  openBookModal(randomBook.id);
});

// 引文複製功能 (型別安全)
function copyCitation(bookId) {
  const numericId = Number(bookId);
  const book = booksDatabase.find(b => b.id === numericId);
  if (!book) return;
  const citation = `《${book.title}》（${book.author}）—— ${book.desc} [${book.category}，${book.year} 年度讀物]`;
  navigator.clipboard.writeText(citation).then(() => {
    alert(`已複製書目引文至剪貼簿：\n\n${citation}`);
  });
}

document.getElementById('modalCopyCitationBtn').addEventListener('click', () => {
  if (currentActiveBook) copyCitation(currentActiveBook.id);
});

// 匯出全部篩選書目清單
btnExportList.addEventListener('click', () => {
  const list = getFilteredBooks();
  let text = `# 私人藏書閣：書目匯出清單 (共 ${list.length} 冊)\n\n`;
  list.forEach((b, i) => {
    text += `${i+1}. 《${b.title}》（${b.author}）- ${b.category} (${b.year}年，狀態：${b.status === 'reading' ? '閱覽中' : '已完讀'})\n   提要：${b.desc}\n\n`;
  });
  navigator.clipboard.writeText(text).then(() => {
    alert(`已成功匯出當前篩選之 ${list.length} 冊書目清單至剪貼簿！`);
  });
});

// 重設篩選器
function resetAllFilters() {
  searchInput.value = '';
  yearFilter.value = 'ALL';
  categoryFilter.value = 'ALL';
  seriesFilter.value = 'ALL';
  statusFilter.value = 'ALL';
  onlyShowFavorites = false;
  btnFavOnly.className = "px-3 py-1.5 bg-[#170e08] hover:bg-[#311f14] border border-[#5a3a24] text-[#f2e6cf] rounded text-sm font-sans-ui flex items-center gap-1.5";
  favIcon.className = "w-4 h-4 text-[#8a6f52]";
  renderCardCatalog();
  if (!bookshelfView.classList.contains('hidden')) renderBookshelves();
}
btnResetFilter.addEventListener('click', resetAllFilters);

// 事件監聽
searchInput.addEventListener('input', () => {
  renderCardCatalog();
  if (!bookshelfView.classList.contains('hidden')) renderBookshelves();
});
yearFilter.addEventListener('change', () => {
  renderCardCatalog();
  if (!bookshelfView.classList.contains('hidden')) renderBookshelves();
});
categoryFilter.addEventListener('change', () => {
  renderCardCatalog();
  if (!bookshelfView.classList.contains('hidden')) renderBookshelves();
});
seriesFilter.addEventListener('change', () => {
  if (seriesFilter.value !== 'ALL') {
    if (yearFilter) yearFilter.value = 'ALL';
  }
  renderCardCatalog();
  if (!bookshelfView.classList.contains('hidden')) renderBookshelves();
});
statusFilter.addEventListener('change', () => {
  renderCardCatalog();
  if (!bookshelfView.classList.contains('hidden')) renderBookshelves();
});

// 行動版檢索面板折疊與捲動縮小邏輯
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

// 更新行動版啟動篩選計數標籤
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

// 往下滑動閱讀時自動縮小收合檢索區塊，避免遮擋螢幕
let lastScrollY = window.scrollY;
window.addEventListener('scroll', () => {
  const currentScrollY = window.scrollY;
  if (window.innerWidth < 1024) {
    // 向下滑動位移超過 25px 且離開頂部時，自動收合展開的檢索面板
    if (currentScrollY > lastScrollY + 25 && currentScrollY > 70) {
      if (filterControlsWrapper && filterControlsWrapper.classList.contains('mobile-expanded')) {
        setMobileFilterState(false);
      }
    }
  }
  lastScrollY = currentScrollY;
}, { passive: true });

// 視圖切換或點擊系列目錄時亦自動關閉行動版面板
const origSetView = setView;
setView = function(viewName) {
  origSetView(viewName);
  setMobileFilterState(false);
};

// 監聽各項篩選異動更新計數標籤
[searchInput, yearFilter, categoryFilter, seriesFilter, statusFilter].forEach(el => {
  if (el) {
    el.addEventListener('change', updateMobileFilterBadge);
    el.addEventListener('input', updateMobileFilterBadge);
  }
});
if (btnFavOnly) btnFavOnly.addEventListener('click', () => setTimeout(updateMobileFilterBadge, 50));
if (btnResetFilter) btnResetFilter.addEventListener('click', () => setTimeout(updateMobileFilterBadge, 50));

// 動態更新下拉選單數量與看板數據，確保各篩選項目永遠精確對齊資料庫
function updateFilterCounts() {
  const total = booksDatabase.length;
  const completed = booksDatabase.filter(b => b.status === 'completed').length;
  const reading = booksDatabase.filter(b => b.status === 'reading').length;
  const compRate = total > 0 ? ((completed / total) * 100).toFixed(1) : '0.0';

  // 1. 看板統計更新
  const statTotalEl = document.getElementById('statTotal');
  const statCompletedEl = document.getElementById('statCompleted');
  const statReadingEl = document.getElementById('statReading');
  if (statTotalEl) statTotalEl.textContent = `${total} 冊`;
  if (statCompletedEl) {
    statCompletedEl.textContent = `${completed} 冊`;
    const rateSub = statCompletedEl.nextElementSibling;
    if (rateSub) rateSub.textContent = `${compRate}% 完讀率`;
  }
  if (statReadingEl) statReadingEl.textContent = `${reading} 冊`;

  // 2. 年度下拉選單
  if (yearFilter) {
    const countsByYear = {};
    booksDatabase.forEach(b => countsByYear[b.year] = (countsByYear[b.year] || 0) + 1);
    Array.from(yearFilter.options).forEach(opt => {
      if (opt.value === 'ALL') {
        opt.textContent = `全部年度 (${total} 冊)`;
      } else if (countsByYear[opt.value] !== undefined) {
        opt.textContent = `${opt.value} 年度 (${countsByYear[opt.value]} 冊)`;
      }
    });
  }

  // 3. 流通狀態下拉選單
  if (statusFilter) {
    Array.from(statusFilter.options).forEach(opt => {
      if (opt.value === 'ALL') {
        opt.textContent = `全部流通狀態 (${total} 冊)`;
      } else if (opt.value === 'completed') {
        opt.textContent = `已完讀歸架 (${completed} 冊)`;
      } else if (opt.value === 'reading') {
        opt.textContent = `正在借閱中 (${reading} 冊)`;
      }
    });
  }

  // 4. 學科領域下拉選單
  if (categoryFilter) {
    const countsByCat = {};
    booksDatabase.forEach(b => countsByCat[b.category] = (countsByCat[b.category] || 0) + 1);
    const catLabels = {
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
      } else if (countsByCat[opt.value] !== undefined) {
        const label = catLabels[opt.value] || opt.value;
        opt.textContent = `${label} (${countsByCat[opt.value]} 冊)`;
      }
    });
  }

  // 5. 叢書系列下拉選單
  if (seriesFilter) {
    const countsBySeries = {};
    booksDatabase.forEach(b => {
      if (b.series) countsBySeries[b.series] = (countsBySeries[b.series] || 0) + 1;
    });
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

// 初始化渲染
updateFilterCounts();
renderCardCatalog();
updateMobileFilterBadge();
