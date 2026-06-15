# 英文文章閱讀與單字紀錄

這是一個前端可部署於 GitHub Pages 的靜態網頁範例，後端使用 Google Apps Script 對 Google Sheets 進行單字點擊紀錄與查詢。

## 主要功能
- 上傳 `.txt` 或 `.pdf` 英文文章
- 顯示文章內容並讓學生閱讀
- 語音播放文章內容，並在逐句播放時同步反白
- 單字點擊查詢發音與中文翻譯
- 將點擊的單字紀錄寫入 Google Sheets
- 查詢 Google Sheets 中的單字紀錄

## 部署步驟

1. 在 Google Drive 建立一份 Google Sheets 檔案。
2. 開啟 Google Apps Script 編輯器，建立新專案。
3. 將 `Code.gs` 內容貼入 Apps Script。
4. 修改 `Code.gs` 中的 `YOUR_SHEET_ID` 為你的 Google Sheets 檔案 ID。
5. 部署為網頁應用程式：
   - 選擇「部署」>「新版本部署」
   - 設定「執行應用程式的使用者」為 `我自己`
   - 設定「應用程式存取者」為 `任何人` 或 `任何人，即使匿名使用者`
   - 取得部署後的網頁應用程式 URL。
6. 將前端的 `script.js` 檔案裡的 `SCRIPT_URL` 改成你取得的 Apps Script URL。

## GitHub Pages 部署
1. 將 `index.html`、`styles.css`、`script.js` 上傳到 GitHub 儲存庫。
2. 在 GitHub 儲存庫設定中啟用 GitHub Pages，選擇 `main` 或 `master` 分支的根目錄。
3. 打開 GitHub Pages 提供的網址，即可在瀏覽器中使用此工具。

## 注意事項
- 若瀏覽器不支援 Web Speech API，語音播放功能可能無法正常使用。
- 使用 `.pdf` 檔案時，程式會嘗試讀取所有頁面的文字內容。
- 若 Apps Script Web App 的存取權限未設定為「任何人」，前端無法成功寫入或查詢 Google Sheets。
