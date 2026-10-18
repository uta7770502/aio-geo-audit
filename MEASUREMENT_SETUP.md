# AI検索ヒット測定：定期実行の運用設定

この機能はコード追加だけでは稼働しません。Vercelのビルド成功後、次の環境変数を設定します。

- OPENAI_API_KEY: OpenAI APIキー
- KV_REST_API_URL / KV_REST_API_TOKEN: Upstash Redis RESTの接続情報
- CRON_SECRET: Vercel Cron認証用のランダムな秘密文字列
- MEASURE_ADMIN_SECRET: 管理者専用の登録API認証文字列

Vercel Cron: 毎日 03:00 UTC（日本時間12:00）に /api/cron/hit-measure を実行。実行ごとに最大1件のWeb検索API呼び出し。ジョブ登録は管理者だけが POST /api/hit-measure/jobs にBearerトークン付きで行います。

登録JSON例:
{
  "site":"https://example.jp",
  "company":"株式会社サンプル",
  "questions":["質問1","質問2","質問3","質問4","質問5"],
  "months":3,
  "aliases":[],
  "competitors":[]
}

注意:
- 自動実行はVercelプランのCron仕様・デプロイ状況に依存します。
- 質問を1日1件ずつ順次測定します。5〜10質問を毎日すべて測る仕組みではありません。
- 現段階では登録用の一般ユーザーUIやサーバー保存履歴の閲覧UIはありません。
- APIキーや管理者トークンをブラウザに埋め込まないでください。
- 本番運用前に権限、API費用、結果の整合性、ジョブの停止・削除を検証してください。
