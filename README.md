# Penon Quiz (Artpen / Magnet)

GitHub Pages で公開できる、画像を見てタイトル（alt）を当てるクイズです。

- 対象: https://shop.penon.co.jp/view/category/artpen / https://shop.penon.co.jp/view/category/magnet
- 取得項目: `.c-item__img` の画像 URL と `alt` 文字列
- 方式: 事前スクレイピングで `site/data/items.json` を生成し、フロントは完全静的

## 開発・更新手順

1) 依存なしでスクレイピングしてデータ生成

```
node scripts/scrape.js
```

生成物: `site/data/items.json`

2) ローカルで確認（任意の静的サーバーなど）

```
# 例: Python の簡易サーバー
cd site
python3 -m http.server 8000
# http://localhost:8000 を開く
```

3) GitHub Pages で公開

- 本リポジトリの `site/` を Pages の公開ルートに設定（または `gh-pages` ブランチへ `site` の中身を配置）

## 補足

- 画像はクロスオリジンでも `<img>` 直参照で表示します（CORS 不要）。
- 同サイトのページ構造変更により、抽出が失敗する場合があります。必要に応じて `scripts/scrape.js` の正規表現を調整してください。
- カテゴリのページネーションには未対応です（1ページ想定）。必要なら拡張可能です。
