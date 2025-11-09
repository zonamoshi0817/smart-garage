# 本番環境を一時的に閉じる方法

## 方法1: Vercelパスワード保護（最も簡単・推奨）

### 手順
1. https://vercel.com/dashboard にアクセス
2. `smart-garage` プロジェクトを選択
3. **Settings** → **Deployment Protection** に移動
4. **Password Protection** を有効化
   - パスワードを設定（例: `smartgarage2024`）
   - **Production Only** を選択（mainブランチのみ保護）
5. **Save** をクリック

### メリット
- ✅ コード変更不要
- ✅ 即座に有効化
- ✅ パスワード共有で関係者はアクセス可能
- ✅ 簡単に解除可能

### デメリット
- ❌ ブラウザごとにパスワード入力が必要

---

## 方法2: メンテナンスモードページ（カスタマイズ可能）

### 手順

#### A. メンテナンスモードに切り替え
```bash
# mainブランチに移動
git checkout main

# ルートページをメンテナンスページに差し替え
cp src/app/page.tsx src/app/page.tsx.backup
cp src/app/maintenance-mode/page.tsx src/app/page.tsx

# コミット＆デプロイ
git add .
git commit -m "chore: メンテナンスモード有効化"
git push origin main
```

#### B. メンテナンス終了後、元に戻す
```bash
# バックアップから復元
mv src/app/page.tsx.backup src/app/page.tsx

# コミット＆デプロイ
git add .
git commit -m "chore: メンテナンスモード解除"
git push origin main
```

### メリット
- ✅ カスタムメッセージを表示できる
- ✅ ブランドイメージを保てる
- ✅ 予定時刻やサポート情報を掲載可能

### デメリット
- ❌ コード変更が必要
- ❌ デプロイに2-3分かかる

---

## 方法3: Vercelプロジェクトの一時停止

### 手順
1. https://vercel.com/dashboard にアクセス
2. `smart-garage` プロジェクトを選択
3. **Settings** → **General** に移動
4. 下部の **Pause Project** をクリック

### メリット
- ✅ 完全にオフライン化
- ✅ コスト節約（一時停止中は課金なし）

### デメリット
- ❌ 完全にアクセス不可（404エラー）
- ❌ DNS設定がリセットされる可能性
- ❌ 復旧に時間がかかる

---

## 方法4: Firestore Security Rules で制限

### 手順
```javascript
// firestore.rules を編集
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // メンテナンスモード: すべてのアクセスを拒否
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

```bash
# デプロイ
firebase deploy --only firestore:rules
```

### メリット
- ✅ UIは表示されるがデータアクセス不可
- ✅ 即座に有効化

### デメリット
- ❌ エラーメッセージが分かりにくい
- ❌ ユーザー体験が悪い

---

## 推奨アプローチ

### 開発段階（現在）
**方法1: Vercelパスワード保護**を推奨

理由:
- コード変更不要
- 即座に有効化・解除可能
- 関係者にパスワード共有で閲覧可能
- 開発作業に影響なし

### 本番リリース後
**方法2: メンテナンスモードページ**を推奨

理由:
- プロフェッショナルな印象
- ユーザーに安心感を与える
- サポート情報を提供できる

---

## 実装例：メンテナンスモードの有効化

### クイックスタート（方法1）
```bash
# 何もする必要なし！
# Vercelダッシュボードで設定するだけ
```

### コード変更（方法2）
既に `src/app/maintenance-mode/page.tsx` を作成済みです。

有効化する場合:
```bash
git checkout main
cp src/app/page.tsx src/app/page.tsx.backup
cp src/app/maintenance-mode/page.tsx src/app/page.tsx
git add .
git commit -m "chore: メンテナンスモード有効化"
git push origin main
```

---

## 参考リンク
- [Vercel Deployment Protection](https://vercel.com/docs/security/deployment-protection)
- [Firebase Security Rules](https://firebase.google.com/docs/rules)

---

**次のアクション**: どの方法で本番環境を保護しますか？
1. Vercelパスワード保護（推奨）
2. メンテナンスモードページ
3. プロジェクト一時停止

