#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import os
import re
import json
import subprocess
import time

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
NOTES_DIR = os.path.dirname(SCRIPT_DIR) # Notes folder
MD_PATH = os.path.join(NOTES_DIR, "Reading log.md")
HTML_PATH = os.path.join(SCRIPT_DIR, "index.html")
DATA_PATH = os.path.join(SCRIPT_DIR, "js", "books-data.js")
OBSIDIAN_DATA_PATH = os.path.join(NOTES_DIR, "js", "books-data.js")

def parse_markdown():
    if not os.path.exists(MD_PATH):
        print(f"錯誤：找不到 Markdown 檔案：{MD_PATH}")
        return None, None

    with open(MD_PATH, "r", encoding="utf-8") as f:
        content = f.read()

    # 1. 解析分類統計表中的書目歸屬
    # 範例：| 🚀 **科幻與奇幻小說** | **28** | 31.1% | • **艾西莫夫系列...
    category_map = {}
    table_pattern = re.compile(r"\|\s*[^\|]*?\*\*([^\*]+)\*\*\s*\|\s*\*\*(\d+)\*\*\s*\|\s*([^\|]+)\|\s*([^\|]+)\|")
    
    # 提取書名的正規表示式
    for match in table_pattern.finditer(content):
        cat_name = match.group(1).strip()
        books_chunk = match.group(4).strip()
        # 尋找所有《書名》或以、分隔的書名
        titles_in_cat = re.findall(r"《([^》]+)》", books_chunk)
        if not titles_in_cat:
            # 純文字書名逗號/頓號分隔
            clean_chunk = re.sub(r"•.*?：", "", books_chunk)
            titles_in_cat = [t.strip() for t in re.split(r"[、，,]", clean_chunk) if t.strip()]
        
        for t in titles_in_cat:
            category_map[t] = cat_name

    # 2. 解析系列書籍專題統計
    # 範例：| **艾西莫夫：基地系列** | **7 本** | 艾薩克... | 《基地前奏》<br>... | 哈里·謝頓... |
    series_database = []
    series_map = {}
    series_pattern = re.compile(r"\|\s*\*\*([^\*]+)\*\*\s*\|\s*\*\*(\d+)\s*本\*\*\s*\|\s*([^\|]+)\|\s*([^\|]+)\|\s*([^\|]+)\|")
    
    for match in series_pattern.finditer(content):
        s_name = match.group(1).strip()
        if s_name in ['2024', '2025', '2026', '累計'] or '年度' in s_name:
            continue
        s_count = int(match.group(2).strip())
        s_author = match.group(3).strip().replace("<br>", " ").replace("*(", "(").replace(")*", ")")
        s_books_raw = match.group(4).strip()
        s_desc = match.group(5).strip()
        
        s_titles = re.findall(r"《([^》]+)》", s_books_raw)
        if not s_titles:
            s_titles = [t.strip() for t in re.split(r"<br>|[、，]", s_books_raw) if t.strip()]
        
        for t in s_titles:
            series_map[t] = s_name
            # 特殊比對：例如第 1 集比對地。
            if "第" in t and "集" in t:
                series_map[f"地。-關於地球的運動- ({t})"] = s_name

        cover_title = "基地" if "基地系列" in s_name else ""

        series_database.append({
            "name": s_name,
            "author": s_author,
            "count": s_count,
            "coverTitle": cover_title,
            "books": s_titles,
            "desc": s_desc
        })

    # 3. 解析年度書單
    # 格式：- [x] 1. 《書名》（作者）—— 簡介
    # 格式：- [ ] 21. 《書名》（作者）—— 📖 **在讀中**｜簡介
    lines = content.splitlines()
    books = []
    current_year = 2026
    year_pattern = re.compile(r"^##\s*📅\s*(\d{4})\s*年度")
    book_pattern = re.compile(r"^-\s*\[([ xX])\]\s*(\d+)\.\s*《([^》]+)》（([^）]+)）\s*——\s*(.*)$")

    book_id = 1
    for line in lines:
        line = line.strip()
        y_match = year_pattern.match(line)
        if y_match:
            current_year = int(y_match.group(1))
            continue

        b_match = book_pattern.match(line)
        if b_match:
            checked = b_match.group(1).lower() == 'x'
            orig_idx = int(b_match.group(2))
            title = b_match.group(3).strip()
            author = b_match.group(4).strip()
            desc = b_match.group(5).strip()
            
            status = "completed" if checked else "reading"
            if "在讀中" in desc or "借閱中" in desc:
                status = "reading"
                desc = re.sub(r"^[📖\s\*在讀中｜]*", "", desc).strip()

            # 智能匹配分類
            if "簡單生活" in title:
                category = "商業理財、自我成長與生活哲學"
            elif "再次是個孩子" in title:
                category = "親職教育與育兒家庭"
            elif "我們為何相信" in title:
                category = "科普、物理天文與生命科學"
            elif "父產科" in title:
                category = "科普、物理天文與生命科學"
            elif title == "我們" or title.startswith("我們："):
                category = "科幻與奇幻小說"
            elif "地。" in title:
                category = "漫畫"
            else:
                category = "世界文學、小說與傳記" # 預設
                for cat_title, cat_name in category_map.items():
                    if cat_title in ["我", "我們"] and title != cat_title:
                        continue
                    if len(cat_title) >= 2 and (cat_title in title or title in cat_title):
                        category = cat_name
                        break
                else:
                    # 關鍵字回退推斷
                    if any(k in title for k in ["基地", "機器人", "帝國", "三體", "沙丘", "太空", "獵魔士", "人生副本", "美麗新世界", "神也鬥不過愚蠢", "FINAL FANTASY"]):
                        category = "科幻與奇幻小說"
                    elif any(k in title for k in ["繪本", "皮卡丘", "影子馬戲團", "情緒大飯店", "鯨鯊", "牆外的牆"]):
                        category = "繪本與圖文創作"
                    elif any(k in title for k in ["鯨", "海", "女子山海"]):
                        category = "海洋文學、鯨豚與自然生態"
                    elif any(k in title for k in ["理財", "致富", "買進", "那瓦爾", "原則", "慢下來", "簡單生活", "第二座山", "大人"]):
                        category = "商業理財、自我成長與生活哲學"
                    elif any(k in title for k in ["心理", "思維", "真確", "魅力", "物質", "莫非定律", "象與騎象人"]):
                        category = "心理學、認知與決策思維"
                    elif any(k in title for k in ["哲學", "宗教", "尼采", "臺灣史", "政治", "武士道", "文明", "思辨讀本", "猶太"]):
                        category = "哲學思辨、宗教與歷史社會"
                    elif any(k in title for k in ["物理", "相對論", "生命是什麼", "宇宙", "科普"]):
                        category = "科普、物理天文與生命科學"
                    elif any(k in title for k in ["爸媽", "孩子", "教育", "PBL"]):
                        category = "親職教育與育兒家庭"

            # 系列判斷
            series = ""
            for s_title, s_name in series_map.items():
                if s_title in title or title in s_title:
                    series = s_name
                    break
            if not series:
                if "基地" in title: series = "艾西莫夫：基地系列"
                elif "機器人" in title or title == "我，機器人": series = "艾西莫夫：機器人系列"
                elif "銀河帝國" in title: series = "艾西莫夫：銀河帝國三部曲"
                elif "三體" in title: series = "三體三部曲"
                elif "沙丘" in title: series = "沙丘系列"
                elif "地。" in title: series = "《地。-關於地球的運動-》"
                elif "皮卡丘" in title: series = "monpoké 皮卡丘幼兒繪本"
                elif "40堂" in title: series = "40堂公開課系列"
                elif "科普教室" in title: series = "艾西莫夫科普教室"
                elif "尋鯨" in title or "赫連麼麼" in title: series = "廖鴻基海洋尋鯨文學"

            # 產生索書號
            cat_code = {
                "科幻與奇幻小說": "SF",
                "哲學思辨、宗教與歷史社會": "PHI",
                "漫畫": "COM",
                "心理學、認知與決策思維": "PSY",
                "商業理財、自我成長與生活哲學": "BIZ",
                "海洋文學、鯨豚與自然生態": "OCE",
                "繪本與圖文創作": "PIC",
                "世界文學、小說與傳記": "LIT",
                "科普、物理天文與生命科學": "SCI",
                "親職教育與育兒家庭": "EDU"
            }.get(category, "LIB")

            call_no = f"{cat_code}-{current_year}-{orig_idx:03d}"

            books.append({
                "id": book_id,
                "year": current_year,
                "callNo": call_no,
                "title": title,
                "author": author,
                "category": category,
                "series": series,
                "desc": desc,
                "status": status
            })
            book_id += 1

    return books, series_database

def update_html(books, series_database):
    if not os.path.exists(HTML_PATH):
        print(f"錯誤：找不到目標 HTML 檔案：{HTML_PATH}")
        return False

    with open(HTML_PATH, "r", encoding="utf-8") as f:
        html = f.read()

    # 保留現有書籍的 coverUrl 與 booksUrl (優先自 js/books-data.js 讀取)
    existing_map = {}
    source_to_check = DATA_PATH if os.path.exists(DATA_PATH) else HTML_PATH
    if os.path.exists(source_to_check):
        with open(source_to_check, "r", encoding="utf-8") as f_src:
            src_content = f_src.read()
        m_exist = re.search(r"const booksDatabase = (\[.*?\]);", src_content, re.DOTALL)
        if m_exist:
            try:
                for eb in json.loads(m_exist.group(1)):
                    existing_map[eb.get("title")] = eb
            except Exception:
                pass

    for b in books:
        t = b["title"]
        if t in existing_map:
            b["coverUrl"] = existing_map[t].get("coverUrl", "")
            b["booksUrl"] = existing_map[t].get("booksUrl", "")
        else:
            b["coverUrl"] = ""
            import urllib.parse
            clean_t = re.sub(r"（.*?）", "", t).split("：")[0].strip()
            b["booksUrl"] = f"https://search.books.com.tw/search/query/key/{urllib.parse.quote(clean_t)}/cat/all"

    # 1. 寫入獨立資料庫檔案 js/books-data.js
    books_json = json.dumps(books, ensure_ascii=False, indent=6)
    series_json = json.dumps(series_database, ensure_ascii=False, indent=6) if series_database else "[]"

    total_count = len(books)
    completed_count = sum(1 for b in books if b["status"] == "completed")
    reading_count = sum(1 for b in books if b["status"] == "reading")
    completion_rate = f"{(completed_count / total_count * 100):.1f}%" if total_count > 0 else "0.0%"

    count_2026 = sum(1 for b in books if b["year"] == 2026)
    count_2025 = sum(1 for b in books if b["year"] == 2025)
    count_2024 = sum(1 for b in books if b["year"] == 2024)
    series_total_count = sum(s.get("count", len(s.get("books", []))) for s in series_database) if series_database else 38

    books_data_content = f"""/**
 * 靜謐藏書閣 (Private Library Archive) - 典藏書目與系列專題套書數據庫
 * 此檔案由 sync.py 自「Reading log.md」自動同步生成，請勿手動直接編輯。
 */

// 完整 {total_count} 冊圖書數據庫 (2024: {count_2024}本, 2025: {count_2025}本, 2026: {count_2026}本)
const booksDatabase = {books_json};

// 系列套書專題數據
const seriesDatabase = {series_json};
"""

    os.makedirs(os.path.dirname(DATA_PATH), exist_ok=True)
    with open(DATA_PATH, "w", encoding="utf-8") as f:
        f.write(books_data_content)

    os.makedirs(os.path.dirname(OBSIDIAN_DATA_PATH), exist_ok=True)
    with open(OBSIDIAN_DATA_PATH, "w", encoding="utf-8") as f:
        f.write(books_data_content)

    # 2. 自動更新 HTML 輕量靜態看板與初始備用計數標籤

    html = re.sub(
        r'<div id="statTotal"[^>]*>.*?</div>',
        f'<div id="statTotal" class="text-2xl font-bold text-[#f5ebd7] mt-1 font-serif">{total_count} 冊</div>',
        html
    )
    html = re.sub(
        r'<div id="statCompleted"[^>]*>.*?</div>',
        f'<div id="statCompleted" class="text-2xl font-bold text-[#e6c587] mt-1 font-serif">{completed_count} 冊</div>',
        html
    )
    html = re.sub(
        r'<div id="statReading"[^>]*>.*?</div>',
        f'<div id="statReading" class="text-2xl font-bold text-[#62c082] mt-1 font-serif">{reading_count} 冊</div>',
        html
    )
    html = re.sub(
        r'<div class="text-\[11px\] text-\[#7d6751\] mt-0\.5">\d+(\.\d+)?% 完讀率</div>',
        f'<div class="text-[11px] text-[#7d6751] mt-0.5">{completion_rate} 完讀率</div>',
        html
    )
    html = re.sub(
        r'<div class="text-\[11px\] text-\[#7d6751\] mt-0\.5">共 \d+ 冊傳承脈絡</div>',
        f'<div class="text-[11px] text-[#7d6751] mt-0.5">共 {series_total_count} 冊傳承脈絡</div>',
        html
    )

    # 4. 自動更新靜態篩選下拉選單與看板計數
    html = re.sub(
        r'<option value="ALL">全部年度( \(\d+ 冊\))?</option>',
        f'<option value="ALL">全部年度 ({total_count} 冊)</option>',
        html
    )
    html = re.sub(
        r'<option value="2026">2026 年度( \(\d+ 冊\))?</option>',
        f'<option value="2026">2026 年度 ({count_2026} 冊)</option>',
        html
    )
    html = re.sub(
        r'<option value="2025">2025 年度( \(\d+ 冊\))?</option>',
        f'<option value="2025">2025 年度 ({count_2025} 冊)</option>',
        html
    )
    html = re.sub(
        r'<option value="2024">2024 年度( \(\d+ 冊\))?</option>',
        f'<option value="2024">2024 年度 ({count_2024} 冊)</option>',
        html
    )
    html = re.sub(
        r'<option value="ALL">全部流通狀態( \(\d+ 冊\))?</option>',
        f'<option value="ALL">全部流通狀態 ({total_count} 冊)</option>',
        html
    )
    html = re.sub(
        r'<option value="completed">已完讀歸架( \(\d+ 冊\))?</option>',
        f'<option value="completed">已完讀歸架 ({completed_count} 冊)</option>',
        html
    )
    html = re.sub(
        r'<option value="reading">正在借閱中( \(\d+ 冊\))?</option>',
        f'<option value="reading">正在借閱中 ({reading_count} 冊)</option>',
        html
    )
    html = re.sub(
        r'<span>2026 年度進行中藏書 \(共 \d+ 冊\)</span>',
        f'<span>2026 年度進行中藏書 (共 {count_2026} 冊)</span>',
        html
    )
    html = re.sub(
        r'共檢出 <span id="filteredCount"[^>]*>\d+</span> 冊符合條件',
        f'共檢出 <span id="filteredCount" class="font-bold text-[#f5ebd7] font-serif text-sm">{total_count}</span> 冊符合條件',
        html
    )
    html = re.sub(
        r'// 完整 \d+ 冊圖書數據庫.*',
        f'// 完整 {total_count} 冊圖書數據庫 (2024: {count_2024}本, 2025: {count_2025}本, 2026: {count_2026}本)',
        html
    )

    with open(HTML_PATH, "w", encoding="utf-8") as f:
        f.write(html)

    # 同步複製回 Obsidian 根目錄以保持雙向一致
    obsidian_html = os.path.join(NOTES_DIR, "reading_log_library.html")
    with open(obsidian_html, "w", encoding="utf-8") as f:
        f.write(html)

    print(f"✅ 典藏資料庫 (js/books-data.js) 與 HTML 更新成功！解析書籍總數：{total_count} 冊（完讀：{completed_count}，在讀：{reading_count}）。")
    return True

def push_to_github():
    print("🚀 正在檢查 Git 變更並同步至 GitHub Pages...")
    status = subprocess.run(["git", "status", "--porcelain"], cwd=SCRIPT_DIR, capture_output=True, text=True)
    if not status.stdout.strip():
        print("ℹ️ 無檔案內容變更，不需重新提交。")
        return True

    print("偵測到書目變更，執行 git commit 與 git push...")
    subprocess.run(["git", "add", "-A"], cwd=SCRIPT_DIR, check=True)
    msg = f"自動同步閱讀書目：{time.strftime('%Y-%m-%d %H:%M:%S')}"
    subprocess.run(["git", "commit", "-m", msg], cwd=SCRIPT_DIR, check=True)
    res = subprocess.run(["git", "push", "origin", "main"], cwd=SCRIPT_DIR)
    if res.returncode == 0:
        print("🎉 成功推播至 GitHub Pages！約 30 秒後手機造訪網頁即可顯示最新內容。")
        return True
    else:
        print("⚠️ 推播至 GitHub 時遇到問題，請確認網路或 GitHub 憑證權限。")
        return False

if __name__ == "__main__":
    books, series_db = parse_markdown()
    if books:
        if update_html(books, series_db):
            push_to_github()
