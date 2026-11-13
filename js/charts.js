/**
 * 靜謐藏書閣 (Private Library Archive) - 純幾何 SVG 圖表渲染引擎 (SVG Chart Engine)
 * 職責：
 * 1. 底層：無副作用之純幾何 SVG 生成函式 (三次貝茲曲線、極座標三角函數圓弧扇面)。
 * 2. 中層：DOM 掛載與游標懸停/點擊微互動適配器。
 * 3. 頂層：向後相容之藏書閣業務視覺適配器 (自動對接 ArchiveRepository)。
 */

// ==========================================
// 一、 底層：純幾何 SVG 路徑與字串生成器 (無 DOM 依賴)
// ==========================================

/**
 * 生成平滑走勢折線與面積 SVG 字串
 * @param {Array<{label: string, value: number, subtext?: string, peak?: boolean}>} pointsData
 * @param {Object} [opts]
 * @returns {string} 完整純 SVG 標記字串
 */
function generateTrendChartSvg(pointsData = [], opts = {}) {
  const width = opts.width || 640;
  const height = opts.height || 230;
  const padLeft = opts.padLeft || 55;
  const padRight = opts.padRight || 55;
  const padTop = opts.padTop || 50;
  const padBottom = opts.padBottom || 38;
  const maxVal = opts.maxVal || 40;

  const plotWidth = width - padLeft - padRight;
  const plotHeight = height - padTop - padBottom;

  if (pointsData.length === 0) {
    return `<svg viewBox="0 0 ${width} ${height}" class="w-full h-auto select-none"></svg>`;
  }

  const computedPoints = pointsData.map((d, i) => {
    const divisor = pointsData.length > 1 ? pointsData.length - 1 : 1;
    const x = padLeft + (i / divisor) * plotWidth;
    const y = padTop + plotHeight - (Math.min(d.value, maxVal) / maxVal) * plotHeight;
    return { x, y, ...d };
  });

  // 計算平滑三次貝茲曲線路徑
  let pathLine = '';
  if (computedPoints.length === 1) {
    pathLine = `M ${computedPoints[0].x} ${computedPoints[0].y}`;
  } else if (computedPoints.length === 2) {
    const [p0, p1] = computedPoints;
    pathLine = `M ${p0.x} ${p0.y} L ${p1.x} ${p1.y}`;
  } else {
    const [p0, p1, p2] = computedPoints;
    const cp1x = p0.x + (p1.x - p0.x) * 0.5;
    const cp1y = p0.y;
    const cp2x = p1.x - (p1.x - p0.x) * 0.3;
    const cp2y = p1.y;

    const cp3x = p1.x + (p2.x - p1.x) * 0.3;
    const cp3y = p1.y;
    const cp4x = p2.x - (p2.x - p1.x) * 0.5;
    const cp4y = p2.y;

    pathLine = `M ${p0.x} ${p0.y} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p1.x} ${p1.y} C ${cp3x} ${cp3y}, ${cp4x} ${cp4y}, ${p2.x} ${p2.y}`;
  }

  const lastP = computedPoints[computedPoints.length - 1];
  const firstP = computedPoints[0];
  const pathArea = `${pathLine} L ${lastP.x} ${padTop + plotHeight} L ${firstP.x} ${padTop + plotHeight} Z`;

  // 刻度水平線
  const yTicks = [0, 10, 20, 30, 40];
  const gridLines = yTicks.map(val => {
    const y = padTop + plotHeight - (val / maxVal) * plotHeight;
    return `
      <line x1="${padLeft}" y1="${y}" x2="${width - padRight}" y2="${y}" stroke="#dfd2be" stroke-width="1" stroke-dasharray="3,3" opacity="0.6"/>
      <text x="${padLeft - 10}" y="${y + 4}" fill="#8c6b4b" font-size="10" font-family="ui-monospace, monospace" text-anchor="end">${val}</text>
    `;
  }).join('');

  // 節點與標籤標記
  const nodeMarkers = computedPoints.map((p, idx) => `
    <g class="trend-node-group" style="cursor: pointer;" data-point-idx="${idx}">
      <line x1="${p.x}" y1="${p.y}" x2="${p.x}" y2="${padTop + plotHeight}" stroke="#b8860b" stroke-width="1.5" stroke-dasharray="3,3" opacity="0.45"/>
      <circle class="trend-point" cx="${p.x}" cy="${p.y}" r="6" stroke="#683d1c" stroke-width="2.5" fill="#fdf8ee" />
      ${p.peak ? `
        <rect x="${p.x - 30}" y="${p.y - 37}" width="60" height="15" rx="3" fill="#802424" />
        <text x="${p.x}" y="${p.y - 26}" fill="#ffffff" font-size="9" font-family="sans-serif" font-weight="bold" text-anchor="middle">歷史巔峰</text>
      ` : ''}
      <text x="${p.x}" y="${p.y - 10}" fill="#24150b" font-size="13" font-family="serif" font-weight="bold" text-anchor="middle">
        ${p.value} 冊
      </text>
      <text x="${p.x}" y="${height - 13}" fill="#3d2412" font-size="12" font-family="serif" font-weight="bold" text-anchor="middle">
        ${p.label}
      </text>
      ${p.subtext ? `
        <text x="${p.x}" y="${height - 1}" fill="#7d6044" font-size="9" font-family="sans-serif" text-anchor="middle">
          ${p.subtext}
        </text>
      ` : ''}
    </g>
  `).join('');

  return `
    <svg viewBox="0 0 ${width} ${height}" width="100%" height="${height}" style="min-height: 200px; display: block;" class="w-full h-auto select-none" preserveAspectRatio="xMidYMid meet">
      <defs>
        <linearGradient id="trendAmberGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#8a5726" stop-opacity="0.32"/>
          <stop offset="60%" stop-color="#b8860b" stop-opacity="0.12"/>
          <stop offset="100%" stop-color="#ecd093" stop-opacity="0.0"/>
        </linearGradient>
      </defs>
      ${gridLines}
      <path d="${pathArea}" fill="url(#trendAmberGrad)" />
      <path d="${pathLine}" fill="none" stroke="#8a5726" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" class="trend-line" />
      ${nodeMarkers}
    </svg>
  `;
}

/**
 * 生成純 SVG 甜甜圈環形圖字串
 * @param {Array<{label: string, value: number, color?: string, border?: string}>} segmentsData
 * @param {Object} [opts]
 * @returns {string} 純 SVG 標記字串
 */
function generateDonutChartSvg(segmentsData = [], opts = {}) {
  const size = opts.size || 320;
  const rOuter = opts.rOuter || 138;
  const rInner = opts.rInner || 88;
  const gap = opts.gap !== undefined ? opts.gap : 0.012;
  const cx = size / 2;
  const cy = size / 2;

  const total = segmentsData.reduce((sum, s) => sum + (Number(s.value) || 0), 0) || 1;
  let currentAngle = -Math.PI / 2;

  const paths = segmentsData.map((seg, idx) => {
    const val = Number(seg.value) || 0;
    if (val <= 0) return '';
    const fraction = val / total;
    const angleDelta = fraction * 2 * Math.PI;

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

    const color = seg.color || '#785133';
    const border = seg.border || '#c5a059';
    const pct = ((val / total) * 100).toFixed(1);

    currentAngle += angleDelta;

    return `
      <path 
        d="${pathD}" 
        fill="${color}" 
        stroke="${border}" 
        stroke-width="1.2" 
        class="donut-segment" 
        data-idx="${idx}"
        data-label="${seg.label}"
        data-value="${val}"
        data-pct="${pct}"
      />
    `;
  }).filter(Boolean).join('');

  return `
    <svg viewBox="0 0 ${size} ${size}" width="100%" height="100%" style="max-width: 300px; max-height: 300px; min-height: 260px; aspect-ratio: 1 / 1; display: block;" class="select-none mx-auto" preserveAspectRatio="xMidYMid meet">
      <g>
        ${paths}
      </g>
    </svg>
  `;
}

// ==========================================
// 二、 中層：DOM 掛載與互動適配器
// ==========================================

function mountTrendChart(containerOrId, pointsData, opts = {}) {
  const container = typeof containerOrId === 'string' ? document.getElementById(containerOrId) : containerOrId;
  if (!container) return;

  container.innerHTML = generateTrendChartSvg(pointsData, opts);

  if (typeof opts.onPointClick === 'function') {
    const groups = container.querySelectorAll('.trend-node-group');
    groups.forEach(g => {
      g.addEventListener('click', () => {
        const idx = Number(g.getAttribute('data-point-idx'));
        if (pointsData[idx]) opts.onPointClick(pointsData[idx]);
      });
    });
  }
}

function mountDonutChart(containerOrId, segmentsData, opts = {}) {
  const container = typeof containerOrId === 'string' ? document.getElementById(containerOrId) : containerOrId;
  if (!container) return;

  container.innerHTML = generateDonutChartSvg(segmentsData, opts);

  const centerInfo = opts.centerId ? document.getElementById(opts.centerId) : null;
  const total = segmentsData.reduce((sum, s) => sum + (Number(s.value) || 0), 0);

  function resetCenter() {
    if (!centerInfo) return;
    centerInfo.innerHTML = `
      <div class="text-[11px] font-sans-ui text-[#7d6044] tracking-wider uppercase font-semibold">館藏總冊數</div>
      <div class="text-3xl font-serif font-bold text-[#24150b] my-0.5">${total} <span class="text-xs font-normal">冊</span></div>
      <div class="text-[10px] font-sans-ui text-[#8c6b4b]">橫跨 ${segmentsData.length} 大學術領域</div>
    `;
  }
  resetCenter();

  const paths = container.querySelectorAll('.donut-segment');
  paths.forEach(el => {
    el.addEventListener('mouseenter', () => {
      const label = el.getAttribute('data-label');
      const val = el.getAttribute('data-value');
      const pct = el.getAttribute('data-pct');
      if (centerInfo) {
        centerInfo.innerHTML = `
          <div class="text-[10px] font-sans-ui text-[#802424] font-bold truncate max-w-[140px] mx-auto">${label}</div>
          <div class="text-2xl font-serif font-bold text-[#24150b] my-0.5">${val} <span class="text-xs font-normal">冊</span></div>
          <div class="text-[11px] font-mono text-[#7d6044] font-semibold">${pct}% 佔比 (點擊篩選)</div>
        `;
      }
    });

    el.addEventListener('mouseleave', resetCenter);

    if (typeof opts.onSegmentClick === 'function') {
      el.addEventListener('click', () => {
        const label = el.getAttribute('data-label');
        opts.onSegmentClick(label);
      });
    }
  });
}

// ==========================================
// 三、 頂層：藏書閣業務視覺向後相容入口
// ==========================================

function renderReadingTrendChart(containerId) {
  const repo = window.archiveRepository;
  const books = repo ? repo.getAllBooks() : (typeof booksDatabase !== 'undefined' ? booksDatabase : []);

  const count2024 = books.filter(b => b.year === 2024).length || 32;
  const count2025 = books.filter(b => b.year === 2025).length || 38;
  const count2026 = books.filter(b => b.year === 2026).length || 22;
  const reading2026 = books.filter(b => b.year === 2026 && b.status === 'reading').length;
  const completed2026 = count2026 - reading2026;

  const points = [
    { label: "2024 年度", value: count2024, subtext: `完讀 ${count2024} 冊`, peak: false },
    { label: "2025 年度", value: count2025, subtext: `完讀 ${count2025} 冊 (歷史巔峰)`, peak: true },
    { label: "2026 年度", value: count2026, subtext: `完讀 ${completed2026} / 在讀 ${reading2026}`, peak: false }
  ];

  mountTrendChart(containerId, points, {
    onPointClick: (p) => filterByYear(p.label.slice(0, 4))
  });
}

function renderCategoryDonutChart(containerId, centerId) {
  const repo = window.archiveRepository;
  const facets = repo ? repo.getFacetCounts() : null;

  const activeCats = (typeof categoriesDef !== 'undefined' && Array.isArray(categoriesDef) && categoriesDef.length > 0)
    ? categoriesDef
    : Object.keys(typeof categorySpineColors !== 'undefined' ? categorySpineColors : {}).map(name => ({ name }));

  const segments = activeCats.map(cat => {
    let count = 0;
    if (facets && facets.byCategory[cat.name] !== undefined) {
      count = facets.byCategory[cat.name];
    } else if (typeof booksDatabase !== 'undefined') {
      count = booksDatabase.filter(b => b.category === cat.name).length;
    }

    const theme = (typeof categorySpineColors !== 'undefined' && categorySpineColors[cat.name])
      ? categorySpineColors[cat.name]
      : { bg: '#4d3816', border: '#785133' };

    let colorHex = '#785133';
    const matchHex = String(theme.bg).match(/#(?:[0-9a-fA-F]{6}|[0-9a-fA-F]{3})/);
    if (matchHex) colorHex = matchHex[0];

    return {
      label: cat.name,
      value: count,
      color: colorHex,
      border: theme.border || '#c5a059'
    };
  }).filter(s => s.value > 0).sort((a, b) => b.value - a.value);

  mountDonutChart(containerId, segments, {
    centerId,
    onSegmentClick: (label) => filterByCategory(label)
  });
}

function filterByYear(yearStr) {
  const yr = document.getElementById('yearFilter');
  if (yr) yr.value = yearStr;
  setView('card');
  triggerFilterUpdate();
}

// 匯出純幾何繪圖引擎至全域
if (typeof window !== 'undefined') {
  window.SvgChartEngine = {
    generateTrendChartSvg,
    generateDonutChartSvg,
    mountTrendChart,
    mountDonutChart
  };
}
