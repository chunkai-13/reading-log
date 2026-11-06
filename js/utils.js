/**
 * 靜謐藏書閣 (Private Library Archive) - 通用工具與資安輔助模組
 * 包含：色彩配置、HTML 轉義、URL 消毒、LocalStorage 驗證、Toast 浮動提示與精裝封面降級佔位
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

// 館藏十大學科領域標準定義清單
const categoriesDef = [
  { name: "科幻與奇幻小說" },
  { name: "哲學思辨、宗教與歷史社會" },
  { name: "漫畫" },
  { name: "商業理財、自我成長與生活哲學" },
  { name: "心理學、認知與決策思維" },
  { name: "海洋文學、鯨豚與自然生態" },
  { name: "繪本與圖文創作" },
  { name: "世界文學、小說與傳記" },
  { name: "科普、物理天文與生命科學" },
  { name: "親職教育與育兒家庭" }
];

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

// 全域古典質感浮動提示 (Toast Notification)
let toastTimeoutId = null;
function showToast(message, type = 'success') {
  const libraryToast = document.getElementById('libraryToast');
  const toastMessage = document.getElementById('toastMessage');
  const toastIcon = document.getElementById('toastIcon');
  if (!libraryToast || !toastMessage) return;

  if (toastTimeoutId) {
    clearTimeout(toastTimeoutId);
    toastTimeoutId = null;
  }

  toastMessage.textContent = message;

  if (type === 'info') {
    if (toastIcon) {
      toastIcon.innerHTML = `<svg class="w-4 h-4 text-[#e2c585]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>`;
    }
  } else {
    if (toastIcon) {
      toastIcon.innerHTML = `<svg class="w-4 h-4 text-[#78d197]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>`;
    }
  }

  libraryToast.classList.remove('opacity-0', '-translate-y-4', 'pointer-events-none');
  libraryToast.classList.add('opacity-100', 'translate-y-0');

  toastTimeoutId = setTimeout(() => {
    libraryToast.classList.remove('opacity-100', 'translate-y-0');
    libraryToast.classList.add('opacity-0', '-translate-y-4', 'pointer-events-none');
    toastTimeoutId = null;
  }, 2600);
}

// 產生典藏精裝燙金封面降級佔位符 (Hardcover Fallback Placeholder)
function generateCoverFallbackHtml(book) {
  if (!book) return '';
  const colorTheme = categorySpineColors[book.category] || {
    bg: "linear-gradient(180deg, #382013 0%, #1c0e07 100%)",
    text: "#eed4a6",
    border: "#5c3c28"
  };
  const safeTitle = escapeHtml(book.title);
  const safeAuthor = escapeHtml(book.author);
  const safeCallPrefix = escapeHtml((book.callNo || '').split('-')[0]);

  return `
    <div class="book-cover-fallback" style="background: ${colorTheme.bg}; color: ${colorTheme.text};">
      <div class="cover-inner-frame">
        <div class="w-full flex justify-between items-center text-[8px] font-mono opacity-70 border-b border-current pb-1">
          <span>PRIVATE ARCHIVE</span>
          <span>${safeCallPrefix}</span>
        </div>
        <div class="my-auto py-1 px-0.5">
          <div class="text-[11px] sm:text-xs font-serif font-bold leading-tight tracking-wider line-clamp-3" style="text-shadow: 0 1px 2px rgba(0,0,0,0.85);">
            ${safeTitle}
          </div>
          <div class="text-[9px] font-sans-ui opacity-80 mt-1.5 truncate max-w-[90px] mx-auto">
            ${safeAuthor}
          </div>
        </div>
        <div class="w-full text-center text-[7.5px] tracking-widest font-serif opacity-60 border-t border-current pt-1">
          典藏精選
        </div>
      </div>
    </div>
  `;
}

// 圖片載入失敗優雅降級處理函式
function handleCoverError(imgEl, bookId) {
  if (!imgEl) return;
  const safeProxyUrl = imgEl.dataset.originalSrc;
  // 第一階段：嘗試經由安全圖片轉發代理快取
  if (!imgEl.dataset.triedProxy && safeProxyUrl && safeProxyUrl.startsWith('http')) {
    imgEl.dataset.triedProxy = '1';
    imgEl.src = 'https://images.weserv.nl/?url=' + encodeURIComponent(safeProxyUrl);
    return;
  }
  // 第二階段：代理亦失敗或無圖，隱藏圖片節點並啟動精裝燙金封面
  imgEl.onerror = null;
  imgEl.classList.add('hidden');
  const container = imgEl.closest('.cover-container');
  if (container) {
    const fallbackEl = container.querySelector('.cover-fallback-wrapper');
    if (fallbackEl) fallbackEl.classList.remove('hidden');
  }
}
