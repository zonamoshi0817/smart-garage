# 開発環境ガイド

## ブランチ戦略

### main（本番環境）
- **URL**: https://garagelog.jp/
- **用途**: 本番リリース版のみ
- **デプロイ**: Vercel Production
- **ルール**: 
  - テスト済み・安定版のみマージ
  - Force pushは緊急時のみ
  - LPなどの大きな変更は避ける

### development（開発環境）
- **URL**: https://smart-garage-git-development-[your-vercel-slug].vercel.app
- **用途**: 新機能開発・テスト
- **デプロイ**: Vercel Preview
- **ルール**:
  - 自由に開発・テスト可能
  - Force push OK
  - 本番環境に影響なし

### feature/[name]（機能ブランチ）
- **用途**: 大きな機能開発
- **デプロイ**: Vercel Preview
- **ルール**:
  - development からブランチ
  - 完成後 development にマージ
  - テスト完了後 main にマージ

## 現在の設定

### ブランチ構成
```
main (18ad2f1)          → 本番環境（LP実装前の安定版）
└── development (d841bb5) → 開発環境（LP実装済み）
```

### デプロイURL
- **本番**: https://garagelog.jp/ (main ブランチ)
- **プレビュー**: Vercelが自動生成 (development ブランチ)

## 開発フロー

### 1. 新機能開発時
```bash
# developmentブランチで作業
git checkout development

# 開発・コミット
git add .
git commit -m "feat: 新機能"

# プレビュー環境にデプロイ
git push origin development

# → Vercelが自動でプレビューURLを生成
```

### 2. プレビュー環境で確認
- VercelダッシュボードでプレビューURLを確認
- 機能テスト・動作確認
- 問題があれば修正・再デプロイ

### 3. 本番リリース時
```bash
# テスト完了後、mainにマージ
git checkout main
git merge development
git push origin main

# → 本番環境 (garagelog.jp) にデプロイ
```

## 環境変数の管理

### 本番環境 (main)
```env
NEXT_PUBLIC_APP_URL=https://garagelog.jp
STRIPE_SECRET_KEY=[本番キー]
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=[本番公開キー]
```

### 開発環境 (development)
```env
NEXT_PUBLIC_APP_URL=http://localhost:3000
STRIPE_SECRET_KEY=[テストキー]
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=[テスト公開キー]
```

**注意**: Vercelの環境変数設定で、ブランチごとに異なる値を設定可能

## Vercel設定

### プレビューデプロイの有効化
1. Vercel Dashboard → Project Settings
2. Git → Branches
3. "Preview Deployments" を有効化
4. "development" ブランチを追加

### プレビューURL形式
```
https://smart-garage-[git-hash]-[vercel-slug].vercel.app
https://smart-garage-git-development-[vercel-slug].vercel.app
```

## 現在の作業ブランチ

```bash
# 確認
git branch
# * development  ← 現在ここ
#   main
```

今後の開発は **development** ブランチで行い、プレビュー環境で確認してください。

## トラブルシューティング

### プレビューURLが見つからない
1. Vercel Dashboard → Deployments
2. "development" ブランチの最新デプロイを探す
3. "Visit" ボタンでプレビューURLにアクセス

### 本番に誤ってデプロイしてしまった
```bash
# mainを安定版に戻す
git checkout main
git reset --hard [安定版のコミットID]
git push origin main --force
```

### developmentを最新のmainと同期
```bash
git checkout development
git merge main
git push origin development
```

## 参考リンク
- [Vercel Preview Deployments](https://vercel.com/docs/deployments/preview-deployments)
- [Git Branch Strategy](https://nvie.com/posts/a-successful-git-branching-model/)

