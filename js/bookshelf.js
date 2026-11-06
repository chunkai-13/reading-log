/**
 * 靜謐藏書閣 (Private Library Archive) - 原木書架物理排架模組
 * 包含：各年度原木層板渲染、書脊物理厚度與齊平高度演算、觸覺抽取動態微互動
 */

// 渲染典藏原木書架模式 (Bookshelf View)
function renderBookshelves() {
  const filtered = getFilteredBooks();
  const shelf2026 = document.getElementById('shelf2026');
  const shelf2025 = document.getElementById('shelf2025');
  const shelf2024 = document.getElementById('shelf2024');

  if (!shelf2026 || !shelf2025 || !shelf2024) return;

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
             tabindex="0"
             role="button"
             aria-label="調閱《${safeTitle}》"
             style="width: ${spineWidth}px; height: ${spineHeight}px; background: ${colorTheme.bg}; color: ${colorTheme.text}; border-left: 1px solid ${colorTheme.border}; border-right: 1px solid ${colorTheme.border};">
          
          <!-- 頂部裝飾金線 -->
          <div class="w-full pt-1.5 sm:pt-2 flex flex-col items-center gap-1 pointer-events-none">
            <div class="spine-band"></div>
            <div class="spine-band"></div>
            ${isReading ? `<div class="w-full text-center py-0.5 bg-[#1a6e38] text-white text-[9px] font-sans-ui font-bold shadow-sm">在讀</div>` : ''}
          </div>

          <!-- 書脊垂直標題文字 -->
          <div class="py-2 ${isPictureBook ? 'text-[11px]' : 'text-xs'} font-serif font-bold tracking-wider leading-none text-center truncate max-h-[160px] overflow-hidden pointer-events-none" style="text-shadow: 0 1px 2px rgba(0,0,0,0.85);">
            ${safeTitle}
          </div>

          <!-- 底部索書號標籤 -->
          <div class="w-full pb-2 flex flex-col items-center gap-1 font-mono text-[9px] text-center pointer-events-none">
            <div class="spine-band"></div>
            <div class="bg-[#140e08]/85 text-[#e8caa0] px-0.5 py-0.5 rounded text-[8px] transform rotate-90 my-1 whitespace-nowrap shadow-inner">
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
