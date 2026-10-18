# 顧客別認証・履歴APIの設定

本機能はAPI基盤の初期実装です。ログイン画面や測定ページとの自動同期は未実装です。

## 必須環境変数
- MEASURE_SESSION_SECRET: 十分長いランダムな秘密文字列（32バイト以上推奨）
- MEASURE_TENANTS_JSON: 顧客IDをキーとするJSON。例：
  {"client001":{"password":"REPLACE_WITH_LONG_UNIQUE_PASSWORD","hosts":["example.com"]}}
- KV_REST_API_URL / KV_REST_API_TOKEN または UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN

## API
- POST /api/hit-measure/session : {"tenantId":"client001","password":"..."}
- GET /api/hit-measure/session : ログイン状態
- DELETE /api/hit-measure/session : ログアウト
- GET /api/hit-measure/tenant-history?site=https%3A%2F%2Fexample.com
- PUT /api/hit-measure/tenant-history : {"url":"https://example.com","history":[]}

履歴の書き込みは同一Originのブラウザリクエストに限定。認証CookieはHttpOnly・SameSite Strictで、productionではSecure属性を使用。

## 商用公開前に必要
- 現方式は環境変数にパスワードを保持する暫定実装。パスワードハッシュ、ログイン試行回数制限、管理者によるユーザー発行・失効、監査ログを追加する。
- 顧客のブラウザ画面との同期、認証画面、既存ローカル履歴の安全な移行を実装する。
- 既存の管理者専用履歴APIは別系統。顧客向けAPIには管理者キーを渡さない。
- テナント認証をAI検索実行APIやジョブ登録にも適用し、顧客別の費用枠を設ける。
- 実環境で認証・アクセス制御・Cookie・セキュリティをテストする。
