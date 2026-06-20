# Nova Chat - Premium AI SaaS Workspace (頂級 AI SaaS 工作區)

Nova Chat 是一個從零開始打造、具備完整響應式設計的商用級 AI 對話 SaaS 平台。本專案模擬了 ChatGPT 的多對話管理介面，並支援 Token 串流傳輸（Streaming）、歷史紀錄重新命名與刪除（含自訂確認 Modal）、使用者訊息編輯與分支歷史紀錄（Branching History）、AI 回答重新生成（Regenerate）、Toast 提示泡泡、全域快捷鍵，以及精緻的毛玻璃（Glassmorphism）UI 視覺風格。

---

## 🚀 核心功能特色 (Key Features)

### 1. 多對話管理 (Multi-Conversation Management)
- **資料庫歷史紀錄持久化**：使用 PostgreSQL 進行資料儲存，建立 `conversations` 與 `messages` 資料表，並配置外鍵串聯刪除（ON DELETE CASCADE）。
- **互動式側邊欄**：包含歷史對話清單、即時搜尋欄（Client-side 欄位過濾）、當前對話高亮框，以及點擊 `⋯` 觸發的對話操作選單。
- **行內重新命名與刪除 Modal**：支援直接在側邊欄進行標題編輯（Enter 儲存、Esc 取消），並配有精美的自訂確認刪除彈出視窗（Modal），免去瀏覽器預設 Prompt 彈窗。
- **無刷新 AJAX 頁面切換**：切換對話時，前端透過 AJAX 載入訊息歷史，並搭配 HTML5 `pushState` 更新瀏覽器網址列，實現單頁應用般的流暢體驗。

### 2. 頂級 AI SaaS 介面設計 (Premium AI SaaS UI/UX)
- **毛玻璃效果 (Glassmorphism)**：側邊欄與上方標題列採用半透明背景顏色，結合 `backdrop-filter: blur(20px)` 與微光邊框線條 (`rgba(255, 255, 255, 0.06)`)，營造多層次的現代科技感。
- **專業字型搭配**：標題、Logo 和 UI 控制項使用幾何字型 **Outfit**，對話內文與輸入框則使用高易讀性的 **Inter**。
- **懸浮式輸入區 (Floating Composer)**：輸入框置底懸浮於對話區域之上（最大寬度 `900px`），具備圓角設計、毛玻璃背景、陰影效果，以及送出訊息時會旋轉的動畫按鈕。
- **響應式行動端抽屜 (Mobile Drawer)**：在行動裝置與平板上，側邊欄會自動隱藏，可透過標題列的漢堡選單按鈕（點擊後會動畫變形成「X」）來拉出側邊欄，並配有深色遮罩層。
- **推薦提示詞空白狀態 (Suggested Prompts Empty State)**：新對話空白時，畫面上會顯示發光的 AI Logo、問候標題以及 2x2 的推薦字卡（"Explain Docker", "Teach me Python", "Build a Flask app", "Create a SQL query"），點擊後會自動填入並送出。
- **Toast 動畫提示泡泡**：在執行複製（**Copied!**）、儲存（**Saved**）、刪除（**Deleted**）與重新命名（**Renamed**）等動作時，畫面下方會滑出精美的提示動畫。

### 3. 進階對話體驗與 Markdown 渲染 (Advanced Chat & Markdown)
- **Token 串流傳輸**：後端透過 Server-Sent Events (SSE) 協定，將 Groq API 回傳的 Token 即時串流傳輸至前端渲染。
- **微光載入骨架屏 (Pulsing Skeletons)**：在等待 AI 第一個 Token 回傳期間，畫面會顯示現代感的三行波浪微光骨架屏，取代傳統的打字點點動畫。
- **智慧自動捲動鎖定 (Smart Auto-Scroll Lock)**：串流期間畫面會自動向下捲動；但若使用者手動向上滾動查看歷史訊息，系統會立即解鎖並停止強制捲動，直到使用者再次拉到最底部時才會重新啟用。
- **高保真 Markdown 渲染**：利用 `marked.js` 完整支援標題（H1、H2、H3）、清單、行內程式碼、引用區塊、表格及程式碼區塊。
- **程式碼工具列與語法高亮**：程式碼區塊使用 `highlight.js` 進行高亮，外層包覆 ChatGPT/Claude 風格的深色容器，頂部工具列標示語言並配有複製按鈕。
- **多功能互動按鈕 (Action Buttons)**：
  - **複製功能**：可複製單一程式碼區塊或整篇對話內容（自動過濾掉工具列與複製按鈕的文字）。
  - **編輯使用者訊息**：點擊 `✏ Edit` 會將訊息框轉換為 Textarea，儲存後會發送 PUT 請求更新資料庫並刪除此訊息之後的所有歷史（分支歷史紀錄），隨後重新觸發 AI 串流。
  - **重新生成 AI 回答**：點擊 `↻ Regenerate` 會刪除最後一筆 AI 訊息，並針對現有歷史重新向伺服器請求串流回覆。
- **全域快捷鍵**：支援 `Ctrl + N`（新對話）、`Ctrl + K`（聚焦側邊欄搜尋）與 `Esc`（關閉 Modal 與選單）。

---

## 🛠️ 技術棧 (Tech Stack)
- **Backend Framework**: Flask (Python)
- **AI Integration**: Groq API (OpenAI client)
- **Database**: PostgreSQL (psycopg2)
- **Frontend**: HTML5, CSS3, JavaScript (SSE, Event Delegation, DOM)
- **Markdown & Syntax Highlighting**: marked.js, highlight.js

---

## 📁 專案目錄結構 (Project Structure)

```bash
chatgpt-api-practice/
│
├── app.py                  # Flask 主伺服器，處理 API 路由與 SSE 串流
├── db.py                   # PostgreSQL 連線控制與資料庫邏輯查詢
├── schema.sql              # 資料庫初始化 Schema SQL 腳本
├── docker-compose.yml      # 用於啟動 PostgreSQL 本地容器的 Docker 配置
├── .env                    # 系統環境變數配置 (資料庫帳密、Groq API 金鑰)
│
├── static/
│   ├── script.js           # 前端互動邏輯 (AJAX 切換、SSE 串流、複製、編輯、快捷鍵)
│   └── styles.css          # 全域設計系統、毛玻璃樣式、動畫效果與骨架屏樣式
│
└── templates/
    └── index.html          # 主頁面 Jinja2 模板，包含側邊欄、對話框與 Modal 結構
```

---

## 📦 安裝與啟動步驟 (Getting Started)

### 1. 啟動資料庫 (Database Setup)
透過 Docker Compose 啟動本地 PostgreSQL 容器：
```bash
docker-compose up -d
```
或者是手動設定現有的 PostgreSQL，並在 `.env` 中調整連線埠與帳密。

### 2. 環境變數配置 (Environment Configurations)
在專案根目錄下建立 `.env` 檔案，並填入以下內容：
```env
DB_HOST=127.0.0.1
DB_PORT=5432
DB_NAME=chatdb
DB_USER=postgres
DB_PASSWORD=postgres
GROQ_API_KEY=your_groq_api_key_here
```

### 3. 安裝依賴並執行 (Run the Application)
安裝必要 Python 庫，初始化資料表並啟動 Flask：
```bash
pip install flask psycopg2-binary python-dotenv openai
python app.py
```
啟動後在瀏覽器中開啟 `http://127.0.0.1:5000/` 即可開始使用。

---

## 📝 協作開發變更紀錄 (Collaborative Changelog)

以下為我們在 Pair-programming 協作過程中完成的開發紀錄：

### 第一階段：多對話歷史紀錄 (ChatGPT-Style Multi-Conversation)
- 設計並實現 PostgreSQL 的 `conversations` 與 `messages` 資料表關聯。
- 前端改用非同步 AJAX 載入各對話歷史。
- 實現側邊欄即時搜尋與欄位過濾。
- 建立對話重新命名（Enter 儲存、Esc 取消）與彈出式刪除 Modal。

### 第二階段：Token 串流傳輸 (SSE Streaming Response)
- 在 `app.py` 中新增 Server-Sent Events 端點，將 Groq API 以 Chunks 傳輸。
- 前端利用 `EventSource` 接收 Token，並使用 `marked.js` 即時解析與展示。

### 第三階段：進階動作與智慧滾動 (Advanced Interaction & Scroll-Lock)
- 在 `db.py` 新增編輯更新與刪除後續訊息的 `edit_message` 方法，實現分支歷史功能。
- 在 `app.py` 新增 `/api/conversations/<id>/regenerate` 重新生成接口。
- 前端加入 **編輯**、**複製** 和 **重新生成** 對話控制按鈕。
- 建立 **Smart Auto-scroll lock**，監測手動向上滾動時解鎖自動置底，拉回底部時自動鎖定置底。
- 綁定 `Ctrl+N`（新對話）、`Ctrl+K`（搜尋聚焦）、`Esc`（關閉 Modal）等全域快捷鍵。

### 第四階段：UI/UX 毛玻璃重構與骨架屏 (SaaS Redesign & Skeletons)
- 改用幾何字型 **Outfit** 與易讀字型 **Inter** 進行整體排版。
- 採用 **Glassmorphism 毛玻璃特效**，加入模糊面板、光感邊框與卡片懸停陰影。
- 建立 **微光載入骨架屏 (Shimmer Skeletons)**，等待回覆時自動閃爍。
- 建立 **行動端漢堡選單與抽屜式側邊欄**，完美適應各種螢幕大小。
- 建立 **新對話空白狀態 (Empty State)**，點擊推薦提示詞即可直接填入送出。
- 新增 **Toast 動畫提示泡泡**，在複製、重新命名、儲存和刪除時提供良好的視覺回饋。
