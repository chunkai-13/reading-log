/**
 * 靜謐藏書閣 (Private Library Archive) - 視角渲染與彈窗模組
 * 包含：索書卡目錄（具備流光骨架屏與精裝封面降級）、年度與學科分析、系列專題套書與書目詳情彈窗
 */

// 渲染索書卡目錄 (Card Catalog View)
function renderCardCatalog() {
  const filtered = getFilteredBooks();
  if (filteredCount) filteredCount.textContent = filtered.length;
  if (favCountSpan) favCountSpan.textContent = favoriteBookIds.size;
  if (typeof renderActiveFilterPills === 'function') renderActiveFilterPills();

  if (!cardCatalogView) return;

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
    const hasCover = safeCoverUrl && safeCoverUrl !== '#';

    return `
      <article class="parchment-card rounded-md p-4 sm:p-5 flex flex-col justify-between hover:shadow-xl transition-all duration-200 group border border-[#dfd5c3]">
        <div class="flex flex-row gap-4 items-start">
          <!-- 左側：書籍封面圖 (支援流光骨架屏與燙金精裝降級) -->
          <div class="cover-container w-24 sm:w-28 flex-shrink-0 aspect-[2/3] rounded ${hasCover ? 'cover-shimmer' : ''} border border-[#d8c7af] shadow-sm overflow-hidden flex items-center justify-center relative cursor-pointer" onclick="openBookModal(${bookId})" title="點擊檢視典藏憑證">
            ${hasCover ? `
              <img 
                src="${safeCoverUrl}" 
                data-original-src="${safeCoverUrl}"
                alt="《${safeTitle}》封面" 
                referrerpolicy="no-referrer"
                class="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-300 relative z-10"
                loading="lazy"
                onload="this.parentElement.classList.remove('cover-shimmer');"
                onerror="handleCoverError(this, ${bookId})"
              >
              <div class="cover-fallback-wrapper hidden absolute inset-0 z-10 w-full h-full">
                ${generateCoverFallbackHtml(book)}
              </div>
            ` : `
              <div class="cover-fallback-wrapper w-full h-full">
                ${generateCoverFallbackHtml(book)}
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
            <p class="text-xs text-[#6e533d] mt-1 font-sans-ui truncate">
              著：${safeAuthor}
            </p>

            <!-- 標籤與系列標示 -->
            <div class="flex flex-wrap gap-1.5 mt-2.5">
              <span class="inline-block text-[11px] px-2 py-0.5 rounded bg-[#ebdcc4] text-[#4a301b] font-medium font-sans-ui border border-[#dbc6a7]">
                ${safeCategory}
              </span>
              ${safeSeries ? `
                <span class="inline-block text-[11px] px-2 py-0.5 rounded bg-[#dfcfb5] text-[#5c3e23] font-sans-ui border border-[#cfbd9f]">
                  ${safeSeries}
                </span>
              ` : ''}
            </div>

            <!-- 摘錄筆記提要 -->
            <p class="text-xs text-[#523d2e] mt-3 line-clamp-2 leading-relaxed bg-[#f2e6d3]/60 p-2 rounded border border-[#e5d8c3]/80 font-sans-ui">
              ${safeDesc}
            </p>
          </div>
        </div>

        <!-- 卡片底部狀態列 -->
        <div class="mt-4 pt-3 border-t border-[#e2d6c3] flex items-center justify-between text-xs font-sans-ui">
          <div class="text-[#7c5f46]">
            <span>${book.year} 年度</span>
            ${book.pages ? `<span class="mx-1">•</span><span>${book.pages} 頁</span>` : ''}
          </div>
          <div class="flex items-center gap-3">
            <a href="${safeBooksUrl}" target="_blank" rel="noopener noreferrer" class="text-[#754e2d] hover:text-[#2d1b0e] font-medium underline flex items-center gap-0.5">
              <span>${isEslite ? '誠品線上' : '博客來'}</span>
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

// 渲染統計年報分析 (Stats View)
function renderStats() {
  // 1. 渲染純 SVG 閱讀趨勢走勢圖
  if (typeof renderReadingTrendChart === 'function') {
    renderReadingTrendChart('readingTrendChartContainer');
  }

  // 2. 渲染純 SVG 十大學門分佈甜甜圈圖
  if (typeof renderCategoryDonutChart === 'function') {
    renderCategoryDonutChart('donutChartSvgContainer', 'donutCenterInfo');
  }

  // 3. 渲染學科分佈列表長條
  const categoryStatsList = document.getElementById('categoryStatsList');
  if (!categoryStatsList) return;

  const catCounts = {};
  categoriesDef.forEach(c => { catCounts[c.name] = 0; });
  booksDatabase.forEach(b => {
    if (catCounts[b.category] !== undefined) {
      catCounts[b.category]++;
    } else {
      catCounts[b.category] = 1;
    }
  });

  const total = booksDatabase.length || 1;
  const sortedCategories = [...categoriesDef].sort((a, b) => (catCounts[b.name] || 0) - (catCounts[a.name] || 0));

  categoryStatsList.innerHTML = sortedCategories.map(cat => {
    const count = catCounts[cat.name] || 0;
    const pct = ((count / total) * 100).toFixed(1);
    const colorTheme = categorySpineColors[cat.name] || { bg: '#5a3821', border: '#7a4f30' };
    const safeCatName = escapeHtml(cat.name);

    return `
      <div class="bg-[#f5ebd9] p-4 rounded-lg border border-[#dfcfb5] shadow-sm flex flex-col justify-between">
        <div>
          <div class="flex items-center justify-between">
            <span class="font-bold text-[#2a170a] text-sm">${safeCatName}</span>
            <span class="text-xs px-2 py-0.5 rounded font-mono font-bold" style="background: ${colorTheme.bg}; color: #fff;">${count} 冊</span>
          </div>
          <div class="w-full bg-[#e8dac5] rounded-full h-2 my-2.5 overflow-hidden border border-[#d2bea4]">
            <div class="h-full rounded-full" style="width: ${pct}%; background: ${colorTheme.bg};"></div>
          </div>
        </div>
        <div class="flex items-center justify-between text-xs text-[#705238] mt-1 font-sans-ui">
          <span>館藏佔比：${pct}%</span>
          <button onclick="filterByCategory('${safeCatName}')" class="text-[#802424] hover:underline font-medium">篩選此類 →</button>
        </div>
      </div>
    `;
  }).join('');
}

// 快捷自統計年報切換至分類
function filterByCategory(catName) {
  if (categoryFilter) categoryFilter.value = catName;
  setView('card');
  triggerFilterUpdate();
}

// 渲染成套系列叢書專題 (Series View)
function renderSeries() {
  const seriesStatsList = document.getElementById('seriesStatsList');
  if (!seriesStatsList) return;

  const validSeries = seriesDatabase || [];
  const cleanSeries = validSeries.filter(s => 
    s.name && !s.name.includes("【註】") && !s.name.includes("艾西莫夫全集總覽") && s.count > 1
  );

  function getSeriesCover(ser) {
    const preferredTitles = { "艾西莫夫：基地系列": "基地" };
    const targetTitle = ser.coverTitle || preferredTitles[ser.name];
    if (targetTitle) {
      const found = booksDatabase.find(b => b.title === targetTitle && b.coverUrl);
      if (found) return found;
    }
    if (Array.isArray(ser.books)) {
      for (const t of ser.books) {
        const cleanT = t.replace(/[《》\s]/g, '');
        for (const b of booksDatabase) {
          const cleanB = b.title.replace(/[《》\s]/g, '');
          if ((cleanB.includes(cleanT) || cleanT.includes(cleanB) || (cleanT.includes('第') && cleanB.includes(cleanT))) && b.coverUrl) {
            return b;
          }
        }
      }
    }
    for (const b of booksDatabase) {
      if ((b.series === ser.name || (b.series && ser.name.includes(b.series)) || (b.series && b.series.includes(ser.name))) && b.coverUrl) {
        return b;
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
    const hasCover = safeCoverUrl && safeCoverUrl !== '#';

    return `
      <div class="bg-[#f5ebd9] hover:bg-[#ede0ca] transition p-4 sm:p-5 rounded-lg border border-[#dfcfb5] shadow-sm flex flex-col justify-between group">
        <div class="flex flex-row gap-4 items-start">
          <!-- 左側系列封面圖 (支援流光骨架屏與降級) -->
          <div class="cover-container w-20 sm:w-24 flex-shrink-0 aspect-[2/3] rounded ${hasCover ? 'cover-shimmer' : ''} border border-[#d6c4a8] shadow-sm overflow-hidden flex items-center justify-center relative ${coverBook ? 'cursor-pointer' : ''}" ${coverBookId ? `onclick="openBookModal(${coverBookId})" title="調閱《${safeCoverTitle}》借閱卡"` : ''}>
            ${hasCover ? `
              <img 
                src="${safeCoverUrl}" 
                data-original-src="${safeCoverUrl}"
                alt="《${safeCoverTitle}》封面" 
                referrerpolicy="no-referrer"
                class="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-300 relative z-10"
                loading="lazy"
                onload="this.parentElement.classList.remove('cover-shimmer');"
                onerror="handleCoverError(this, ${coverBookId})"
              >
              <div class="cover-fallback-wrapper hidden absolute inset-0 z-10 w-full h-full">
                ${generateCoverFallbackHtml(coverBook)}
              </div>
            ` : `
              <div class="cover-fallback-wrapper w-full h-full">
                ${generateCoverFallbackHtml(coverBook || { title: ser.name, author: ser.author, category: '系列叢書', callNo: 'SER' })}
              </div>
            `}
          </div>

          <!-- 右側系列資訊 -->
          <div class="flex-1 min-w-0">
            <div class="flex items-baseline justify-between gap-2 border-b border-[#dfcfb5] pb-2 mb-2">
              <h3 class="text-base sm:text-lg font-bold text-[#24150b] font-serif truncate group-hover:text-[#6e411b] transition">
                ${safeName}
              </h3>
              <span class="text-xs px-2.5 py-0.5 rounded-full bg-[#ecdcc4] text-[#802424] font-bold border border-[#dfcca8] whitespace-nowrap font-mono">
                全套 ${safeCount} 冊
              </span>
            </div>
            <p class="text-xs text-[#705238] font-sans-ui font-medium">主要作者：${safeAuthor}</p>
            <p class="text-xs text-[#523824] leading-relaxed mt-2.5 line-clamp-3 bg-[#f2e6d3]/60 p-2.5 rounded border border-[#e5d8c3]/80 font-sans-ui">
              ${safeDesc}
            </p>
          </div>
        </div>

        <div class="mt-4 pt-3 border-t border-[#dfcfb5] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-sans-ui">
          <div class="text-[#7a5839] truncate max-w-md">
            <span class="font-bold text-[#5c3e23]">典藏涵蓋：</span>
            <span>${safeBooksList}</span>
          </div>
          <button onclick="filterBySeries('${safeName}')" class="text-[#802424] hover:underline font-bold whitespace-nowrap self-end sm:self-auto">
            檢索全套系列 →
          </button>
        </div>
      </div>
    `;
  }).join('');
}

// 快捷自系列卡切換至索書目錄篩選
function filterBySeries(seriesName) {
  if (seriesFilter) seriesFilter.value = seriesName;
  if (yearFilter) yearFilter.value = 'ALL';
  setView('card');
  triggerFilterUpdate();
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
          modalCoverPlaceholder.innerHTML = generateCoverFallbackHtml(book);
          modalCoverPlaceholder.classList.remove('hidden');
        }
      };
    } else {
      modalCoverImg.classList.add('hidden');
      modalCoverPlaceholder.innerHTML = generateCoverFallbackHtml(book);
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
  const bookModal = document.getElementById('bookModal');
  if (bookModal) bookModal.classList.remove('hidden');
}

function closeModal() {
  const bookModal = document.getElementById('bookModal');
  if (bookModal) bookModal.classList.add('hidden');
  currentActiveBook = null;
}

function updateModalFavBtnState() {
  if (!currentActiveBook) return;
  const isFav = favoriteBookIds.has(currentActiveBook.id);
  const text = document.getElementById('modalFavBtnText');
  if (text) text.textContent = isFav ? "已收藏（點擊取消）" : "加入珍藏標記";
}
