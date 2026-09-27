# まちぽ

作品（ドラマ・アニメ・映画）と地域を選ぶと、聖地を巡る順番と移動時間の目安を作れるまち歩きコース作成アプリです。仕様は [docs/seichi_requirements.md](docs/seichi_requirements.md) を参照してください。

## 開発

```bash
npm install
npm run dev     # http://localhost:3000
npm test        # データ・分類・経路計算のテスト
npm run lint
```

## 環境変数

| 変数 | 用途 | 置き場所 |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | 作品・聖地データベース | `.env.local` |
| `NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY` / `NEXT_PUBLIC_GOOGLE_MAP_ID` | 聖地マップの表示。未設定時は OpenStreetMap を表示 | `.env.local` |
| `GOOGLE_ROUTES_API_KEY` | 地点間の移動時間の計算（サーバー専用） | `.env` |
| `GEMINI_API_KEY` / `GEMINI_MODEL` | 候補コースの選択（サーバー専用、任意） | `.env` |

Supabase が使えないときは、同梱の調査データ（`app/_data/*-preview.json`）で作品一覧を表示します。調査データの取り込み手順は [docs/research-csv-import.md](docs/research-csv-import.md) にあります。
