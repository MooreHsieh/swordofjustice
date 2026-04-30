# Sword of Justice (Frontend + Supabase Auth)

此專案為純前端，部署目標是 GitHub Pages，先完成最小登入功能（Email/Password）。

## 1) Supabase 設定

1. 在 Supabase 建立專案。
2. 到 `Authentication -> Providers -> Email`，啟用 Email provider。
3. 到 `Project Settings -> API`，取得：
   - `Project URL`
   - `anon public key`

## 2) 前端設定

1. 編輯 `config.js`，填入你的 Supabase URL 與 anon key。
2. `config.example.js` 是範本檔，可保留做參考。

說明：Supabase 的 `anon public key` 本來就是前端可公開使用，真正敏感的是 `service_role` key，不能放前端。

## 3) GitHub Pages 部署

1. 將程式推到 GitHub。
2. Repository `Settings -> Pages`。
3. `Build and deployment` 選 `Deploy from a branch`。
4. Branch 選 `main`（或你的預設分支），Folder 選 `/ (root)`。
5. 儲存後等部署完成，打開 GitHub Pages 網址。

## 4) Supabase 網域白名單

到 Supabase：`Authentication -> URL Configuration`

- `Site URL` 填 GitHub Pages 網址，例如：
  - `https://<your-github-name>.github.io/<repo-name>/`
- `Redirect URLs` 也可加入同網址（之後若要做 OAuth 會用到）。

## 5) 目前功能

- 註冊（Email/Password）
- 登入（Email/Password）
- Google OAuth 登入
- Discord OAuth 登入
- 登出
- 顯示登入狀態

如果你開啟了 Email 驗證，註冊後需要先收信驗證再登入。

## 6) OAuth 額外設定（Google / Discord）

到 Supabase：`Authentication -> Providers`

1. 啟用 `Google` 並填入 Google OAuth client id/secret。
2. 啟用 `Discord` 並填入 Discord OAuth client id/secret。
3. 在兩邊 OAuth 平台都要把 callback URL 設成 Supabase 提供的 redirect URL。
