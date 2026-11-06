/**
 * 靜謐藏書閣 (Private Library Archive) - 純 SVG 數據視覺化圖表模組
 * 包含：年度閱讀趨勢走勢圖 (Area/Line Chart)、十大學門分佈甜甜圈圖 (Donut Chart) 與互動 Tooltip
 */

// 渲染純 SVG 閱讀趨勢走勢圖
function renderReadingTrendChart(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const count2024 = booksDatabase.filter(b => b.year === 2024).length || 32;
  const count2025 = booksDatabase.filter(b => b.year === 2025).length || 38;
  const count2026 = booksDatabase.filter(b => b.year === 2026).length || 22;
  const reading2026 = booksDatabase.filter(b => b.year === 2026 && b.status === 'reading').length;
  const completed2026 = count2026 - reading2026;

  const data = [
    { label: "2024 年度", count: count2024, status: `完讀 ${count2024} 冊`, peak: false },
    { label: "2025 年度", count: count2025, status: `完讀 ${count2025} 冊 (歷史巔峰)`, peak: true },
    { label: "2026 年度", count: count2026, status: `完讀 ${completed2026} / 在讀 ${reading2026}`, peak: false }
  ];

  const width = 640;
  const height = 230;
  const padLeft = 55;
  const padRight = 55;
  const padTop = 50;
  const padBottom = 38;

  const maxVal = 40;
  const plotWidth = width - padLeft - padRight;
  const plotHeight = height - padTop - padBottom;

  const points = data.map((d, i) => {
    const x = padLeft + (i / (data.length - 1)) * plotWidth;
    const y = padTop + plotHeight - (d.count / maxVal) * plotHeight;
    return { x, y, ...d };
  });

  // 計算平滑貝茲曲線控制點
  const p0 = points[0];
  const p1 = points[1];
  const p2 = points[2];

  // 曲線路徑
  const cp1x = p0.x + (p1.x - p0.x) * 0.5;
  const cp1y = p0.y;
  const cp2x = p1.x - (p1.x - p0.x) * 0.3;
  const cp2y = p1.y;

  const cp3x = p1.x + (p2.x - p1.x) * 0.3;
  const cp3y = p1.y;
  const cp4x = p2.x - (p2.x - p1.x) * 0.5;
  const cp4y = p2.y;

  const pathLine = `M ${p0.x} ${p0.y} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p1.x} ${p1.y} C ${cp3x} ${cp3y}, ${cp4x} ${cp4y}, ${p2.x} ${p2.y}`;
  const pathArea = `${pathLine} L ${p2.x} ${padTop + plotHeight} L ${p0.x} ${padTop + plotHeight} Z`;

  // 網格線刻度
  const yTicks = [0, 10, 20, 30, 40];
  const gridLines = yTicks.map(val => {
    const y = padTop + plotHeight - (val / maxVal) * plotHeight;
    return `
      <line x1="${padLeft}" y1="${y}" x2="${width - padRight}" y2="${y}" stroke="#dfd2be" stroke-width="1" stroke-dasharray="3,3" opacity="0.6"/>
      <text x="${padLeft - 10}" y="${y + 4}" fill="#8c6b4b" font-size="10" font-family="ui-monospace, monospace" text-anchor="end">${val}</text>
    `;
  }).join('');

  // 節點標記 (文字與標籤嚴格垂直分層，徹底避免重疊)
  const nodeMarkers = points.map((p) => `
    <g class="trend-node-group" style="cursor: pointer;" onclick="filterByYear('${p.label.slice(0, 4)}')">
      <!-- 垂直輔助對齊虛線 -->
      <line x1="${p.x}" y1="${p.y}" x2="${p.x}" y2="${padTop + plotHeight}" stroke="#b8860b" stroke-width="1.5" stroke-dasharray="3,3" opacity="0.45"/>
      <!-- 資料圓點 -->
      <circle class="trend-point" cx="${p.x}" cy="${p.y}" r="6" stroke="#683d1c" stroke-width="2.5" fill="#fdf8ee" />
      
      <!-- 歷史巔峰標籤 (置於數值上方) -->
      ${p.peak ? `
        <rect x="${p.x - 30}" y="${p.y - 37}" width="60" height="15" rx="3" fill="#802424" />
        <text x="${p.x}" y="${p.y - 26}" fill="#ffffff" font-size="9" font-family="sans-serif" font-weight="bold" text-anchor="middle">歷史巔峰</text>
      ` : ''}

      <!-- 數量標籤 -->
      <text x="${p.x}" y="${p.y - 10}" fill="#24150b" font-size="13" font-family="serif" font-weight="bold" text-anchor="middle">
        ${p.count} 冊
      </text>

      <!-- X 軸年度標記 -->
      <text x="${p.x}" y="${height - 13}" fill="#3d2412" font-size="12" font-family="serif" font-weight="bold" text-anchor="middle">
        ${p.label}
      </text>
      <text x="${p.x}" y="${height - 1}" fill="#7d6044" font-size="9" font-family="sans-serif" text-anchor="middle">
        ${p.status}
      </text>
    </g>
  `).join('');

  container.innerHTML = `
    <svg viewBox="0 0 ${width} ${height}" width="100%" height="${height}" style="min-height: 200px; display: block;" class="w-full h-auto select-none" preserveAspectRatio="xMidYMid meet">
      <defs>
        <linearGradient id="trendAmberGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#8a5726" stop-opacity="0.32"/>
          <stop offset="60%" stop-color="#b8860b" stop-opacity="0.12"/>
          <stop offset="100%" stop-color="#ecd093" stop-opacity="0.0"/>
        </linearGradient>
      </defs>
      <!-- 背景格線與刻度 -->
      ${gridLines}
      <!-- 趨勢面積填充 -->
      <path d="${pathArea}" fill="url(#trendAmberGrad)" />
      <!-- 趨勢平滑曲線 -->
      <path d="${pathLine}" fill="none" stroke="#8a5726" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" class="trend-line" />
      <!-- 資料節點與標籤 -->
      ${nodeMarkers}
    </svg>
  `;
}

// 點擊趨勢節點快捷篩選年度
function filterByYear(yearStr) {
  if (yearFilter) yearFilter.value = yearStr;
  setView('card');
  triggerFilterUpdate();
}

// 渲染純 SVG 學門佔比甜甜圈環形圖
function renderCategoryDonutChart(containerId, centerId) {
  const container = document.getElementById(containerId);
  const centerInfo = document.getElementById(centerId);
  if (!container) return;

  const activeCategories = (typeof categoriesDef !== 'undefined' && Array.isArray(categoriesDef) && categoriesDef.length > 0)
    ? categoriesDef
    : Object.keys(categorySpineColors || {}).map(name => ({ name }));

  const catCounts = {};
  activeCategories.forEach(c => { catCounts[c.name] = 0; });
  booksDatabase.forEach(b => {
    if (catCounts[b.category] !== undefined) {
      catCounts[b.category]++;
    } else {
      catCounts[b.category] = 1;
    }
  });

  const total = booksDatabase.length || 1;
  const sortedCategories = [...activeCategories].sort((a, b) => (catCounts[b.name] || 0) - (catCounts[a.name] || 0));

  const size = 320;
  const cx = size / 2;
  const cy = size / 2;
  const rOuter = 138;
  const rInner = 88;

  let currentAngle = -Math.PI / 2; // 從正上方 12 點鐘方向開始
  const segments = [];

  sortedCategories.forEach(cat => {
    const count = catCounts[cat.name] || 0;
    if (count === 0) return;
    const fraction = count / total;
    const angleDelta = fraction * 2 * Math.PI;

    // 留微小扇面縫隙 (0.012 弧度)
    const gap = 0.012;
    const startA = currentAngle + gap;
    const endA = currentAngle + angleDelta - gap;

    const x1 = cx + rOuter * Math.cos(startA);
    const y1 = cy + rOuter * Math.sin(startA);
    const x2 = cx + rOuter * Math.cos(endA);
    const y2 = cy + rOuter * Math.sin(endA);

    const x3 = cx + rInner * Math.cos(endA);
    const y3 = cy + rInner * Math.sin(endA);
    const x4 = cx + rInner * Math.cos(startA);
    const y4 = cy + rInner * Math.sin(startA);

    const largeArc = (endA - startA) > Math.PI ? 1 : 0;
    const pathD = `M ${x1} ${y1} A ${rOuter} ${rOuter} 0 ${largeArc} 1 ${x2} ${y2} L ${x3} ${y3} A ${rInner} ${rInner} 0 ${largeArc} 0 ${x4} ${y4} Z`;

    const theme = categorySpineColors[cat.name] || { bg: '#4d3816', border: '#785133' };
    const pct = ((count / total) * 100).toFixed(1);

    // 自線性漸層字串中提取代表色彩
    let colorHex = '#785133';
    const matchHex = String(theme.bg).match(/#(?:[0-9a-fA-F]{6}|[0-9a-fA-F]{3})/);
    if (matchHex) colorHex = matchHex[0];

    segments.push({
      pathD,
      color: colorHex,
      border: theme.border || '#c5a059',
      catName: cat.name,
      count,
      pct
    });

    currentAngle += angleDelta;
  });

  const pathsSvg = segments.map((s, idx) => `
    <path 
      d="${s.pathD}" 
      fill="${s.color}" 
      stroke="${s.border}" 
      stroke-width="1.2" 
      class="donut-segment" 
      data-idx="${idx}"
      data-cat="${escapeHtml(s.catName)}"
      data-count="${s.count}"
      data-pct="${s.pct}"
    />
  `).join('');

  container.innerHTML = `
    <svg viewBox="0 0 ${size} ${size}" width="100%" height="100%" style="max-width: 300px; max-height: 300px; min-height: 260px; aspect-ratio: 1 / 1; display: block;" class="select-none mx-auto" preserveAspectRatio="xMidYMid meet">
      <g>
        ${pathsSvg}
      </g>
    </svg>
  `;

  // 重設中央預設資訊
  function resetCenterText() {
    if (!centerInfo) return;
    centerInfo.innerHTML = `
      <div class="text-[11px] font-sans-ui text-[#7d6044] tracking-wider uppercase font-semibold">館藏總冊數</div>
      <div class="text-3xl font-serif font-bold text-[#24150b] my-0.5">${total} <span class="text-xs font-normal">冊</span></div>
      <div class="text-[10px] font-sans-ui text-[#8c6b4b]">橫跨 10 大學術領域</div>
    `;
  }
  resetCenterText();

  // 綁定扇形懸停互動與點擊快速篩選
  const pathElements = container.querySelectorAll('.donut-segment');
  pathElements.forEach(el => {
    el.addEventListener('mouseenter', () => {
      const cat = el.getAttribute('data-cat');
      const count = el.getAttribute('data-count');
      const pct = el.getAttribute('data-pct');
      if (centerInfo) {
        centerInfo.innerHTML = `
          <div class="text-[10px] font-sans-ui text-[#802424] font-bold truncate max-w-[140px] mx-auto">${cat}</div>
          <div class="text-2xl font-serif font-bold text-[#24150b] my-0.5">${count} <span class="text-xs font-normal">冊</span></div>
          <div class="text-[11px] font-mono text-[#7d6044] font-semibold">${pct}% 佔比 (點擊篩選)</div>
        `;
      }
    });

    el.addEventListener('mouseleave', resetCenterText);

    el.addEventListener('click', () => {
      const cat = el.getAttribute('data-cat');
      if (cat) filterByCategory(cat);
    });
  });
}
