# Firestoreパーミッションエラーの修正ガイド

## 🐛 エラー内容

```
FirebaseError: Missing or insufficient permissions.
```

**発生箇所**: 車両管理ページで平均走行距離などを更新時

## ✅ 修正済み

### コード修正（完了）

すべての`updateCar()`、`updateMaintenanceRecord()`などの関数で、Firestoreセキュリティルールが要求する`userId`フィールドを含めるように修正済みです。

**修正ファイル**:
- `src/lib/cars.ts`
- `src/lib/maintenance.ts`

**コミット**: `135d7f2`

## 🔧 トラブルシューティング

### 1. ブラウザのキャッシュをクリア（最優先）

修正後もエラーが出る場合は、ブラウザが古いJavaScriptをキャッシュしている可能性があります。

#### Chrome/Edge
1. **ハードリロード**: `Cmd + Shift + R` (Mac) / `Ctrl + Shift + R` (Windows)
2. **開発者ツール**: `Cmd + Option + I` → Network タブ → "Disable cache" にチェック
3. **完全なキャッシュクリア**: 設定 → プライバシーとセキュリティ → 閲覧履歴データの削除

#### Safari
1. **ハードリロード**: `Cmd + Option + R`
2. **キャッシュクリア**: 開発 → キャッシュを空にする

#### Firefox
1. **ハードリロード**: `Cmd + Shift + R` (Mac) / `Ctrl + Shift + R` (Windows)
2. **キャッシュクリア**: 設定 → プライバシーとセキュリティ → Cookieとサイトデータ

### 2. 開発サーバーの再起動

```bash
# サーバーを停止（Ctrl + C）
# 次に再起動
npm run dev
```

### 3. Next.jsのキャッシュをクリア

```bash
# .nextディレクトリを削除して再ビルド
rm -rf .next
npm run dev
```

### 4. node_modulesの再インストール（最終手段）

```bash
rm -rf node_modules package-lock.json
npm install
npm run dev
```

## 🔍 エラーが続く場合の確認事項

### コンソールでエラーの詳細を確認

ブラウザの開発者ツール（Console）で以下を確認：

```javascript
// どの関数でエラーが出ているか
Error updating car: FirebaseError: Missing or insufficient permissions.
  at ...updateCar... // ← この行を確認
```

### Firestoreセキュリティルールを確認

Firebase Console → Firestore Database → ルール

```javascript
// cars コレクションの更新ルール
allow update: if isOwner(userId)
              && request.resource.data.userId == userId  // ← この行
              && isWithinSizeLimit(100000);
```

`request.resource.data.userId`が正しく含まれているか確認してください。

### ローカルとFirestoreのデータを確認

1. **Firebase Console**でデータを確認
   - users/{userId}/cars/{carId} のドキュメント
   - `userId`フィールドが存在するか

2. **既存データに`userId`がない場合**
   ```javascript
   // Firestore Consoleで手動で userId フィールドを追加
   // または、既存の車両を一度削除して再作成
   ```

## 📝 修正内容の詳細

### src/lib/cars.ts

#### updateCar()
```typescript
await updateDoc(doc(db, "users", u.uid, "cars", carId), {
  ...firestoreData,
  userId: u.uid,        // ← 追加
  updatedBy: u.uid,
  updatedAt: serverTimestamp(),
});
```

#### updateCarMileage()
```typescript
await updateDoc(carRef, {
  userId: u.uid,        // ← 追加
  odoKm: newMileage,
  updatedAt: serverTimestamp()
});
```

#### markCarAsSold()
```typescript
const updateData: any = {
  userId: u.uid,        // ← 追加
  status: 'sold',
  soldDate: soldData.soldDate,
  // ...
};
```

#### restoreCarToActive()
```typescript
await updateDoc(carRef, {
  userId: u.uid,        // ← 追加
  status: 'active',
  // ...
});
```

#### removeCar()
```typescript
await updateDoc(doc(db, "users", u.uid, "cars", carId), {
  userId: u.uid,        // ← 追加
  deletedAt: serverTimestamp(),
  // ...
});
```

### src/lib/maintenance.ts

#### updateMaintenanceRecord()
```typescript
const updateData: any = {
  userId: u.uid,        // ← 追加
  updatedBy: u.uid,
  updatedAt: serverTimestamp(),
};
```

#### deleteMaintenanceRecord()
```typescript
await updateDoc(doc(db, "users", u.uid, "maintenance", recordId), {
  userId: u.uid,        // ← 追加
  deletedAt: serverTimestamp(),
  // ...
});
```

## ✅ 確認済み動作

修正後、以下の操作が正常に動作することを確認してください：

- [ ] 車両管理での平均走行距離の更新
- [ ] 車両情報（名前、年式、ODOなど）の編集
- [ ] 車両の売却
- [ ] 車両の復元（売却済み→現在保有中）
- [ ] メンテナンス記録の編集
- [ ] メンテナンス記録の削除
- [ ] 給油時の走行距離自動更新

## 🚀 デプロイ

### 本番環境への適用

1. **コードをプッシュ**
```bash
git push origin development
```

2. **Vercelで自動デプロイ**
   - developmentブランチのプッシュで自動的にデプロイされます
   - デプロイ完了後、ブラウザのキャッシュをクリアしてください

3. **Firestore Rulesは変更不要**
   - 既存のルールのまま動作します

---

**最終更新**: 2025年11月10日  
**コミット**: `135d7f2`

