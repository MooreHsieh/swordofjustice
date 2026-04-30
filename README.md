# Sword of Justice (Frontend + Supabase)

此專案為純前端（GitHub Pages），使用 Supabase 做社群登入與資料儲存。

## 功能

- Google / Discord OAuth 登入
- 幫會聯賽建立（雙方幫會、日期、場次）
- 個人戰績 CSV 匯入（可多檔）

## 1) Supabase 基本設定

1. `Project Settings -> API` 取得：
   - `Project URL`
   - `anon public key`
2. 編輯 [config.js](/Users/xiemenghuan/Documents/GitHub/swordofjustice/config.js) 填入上述兩個值。

## 2) OAuth 設定

1. `Authentication -> Providers` 啟用 `Google` 與 `Discord`。
2. `Authentication -> URL Configuration`：
   - `Site URL`: `https://moorehsieh.github.io/swordofjustice/`
   - `Redirect URLs`: 至少包含 `https://moorehsieh.github.io/swordofjustice/`

## 3) 建立資料表

在 Supabase SQL Editor 執行：

- [supabase_schema.sql](/Users/xiemenghuan/Documents/GitHub/swordofjustice/supabase_schema.sql)

會建立兩張表：
- `guild_leagues`：幫會聯賽主檔
- `personal_records`：個人戰績明細

## 4) 使用流程

1. 先建立一筆幫會聯賽（幫會 A/B、日期、場次）。
2. 選擇對應聯賽。
3. 上傳戰績 CSV（可多檔）。
4. 系統會解析每個檔案內雙方幫會區塊並寫入 `personal_records`。

## CSV 說明

- 檔名格式若是 `時間_幫會A_幫會B.csv`，頁面會嘗試自動帶入幫會名稱。
- 檔案內容可包含兩段幫會資料（中間可有空行與重複表頭），系統會自動解析。
