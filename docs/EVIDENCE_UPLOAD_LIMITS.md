# 証憑アップロード制限仕様

## 概要

メンテナンス記録およびカスタマイズ記録の証憑（領収書等）アップロード機能において、無料プランユーザーには月次制限を設け、上限到達時にプレミアムプランへのアップグレードを促す仕組みを実装しています。

## 制限値

### 無料プラン

- **月次アップロード上限**: 5枚/月
- **1記録あたりの上限**: 1枚（将来対応）
- **合計ファイルサイズ上限**: 100MB（将来対応）

### プレミアムプラン

- **月次アップロード上限**: 無制限
- **1記録あたりの上限**: 無制限
- **合計ファイルサイズ上限**: 無制限

## 実装詳細

### 1. 制限値の定義

**ファイル**: `src/lib/premium.ts`

```typescript
export const PREMIUM_LIMITS = {
  FREE: {
    max_evidence_uploads_per_month: 5,
    max_evidence_uploads_per_record: 1,
    max_evidence_total_bytes: 100 * 1024 * 1024 // 100MB
  },
  PREMIUM: {
    max_evidence_uploads_per_month: -1, // 無制限
    max_evidence_uploads_per_record: -1, // 無制限
    max_evidence_total_bytes: -1 // 無制限
  }
}
```

### 2. 利用量管理

**ファイル**: `src/lib/evidenceUsage.ts`

#### Firestoreスキーマ

```
users/{uid}/usage/{yyyyMM}
  - evidenceUploadsCount: number (今月のアップロード数)
  - evidenceTotalBytes: number (今月の合計ファイルサイズ)
  - updatedAt: Timestamp
  - createdAt: Timestamp
```

#### 主要関数

**`checkEvidenceUploadLimit(userId, userPlan, fileSize, recordId?)`**

- アップロード前に制限をチェック
- Firestore transactionを使用して原子性を担保
- プレミアムユーザーは常に許可
- 戻り値: `{ allowed: boolean; reason?: string; limitType?: 'monthly' | 'per_record' | 'bytes' }`

**`incrementEvidenceUsage(userId, fileSize)`**

- アップロード成功後に利用量を増分
- Firestore transactionを使用して原子性を担保
- エラー時はロールバック

### 3. アップロード処理の統合

**ファイル**: `src/lib/storage.ts`

#### `uploadMaintenanceImage` / `uploadCustomizationImage`

1. アップロード前に`checkEvidenceUploadLimit`を呼び出し
2. 制限超過時は`EvidenceLimitExceededError`をthrow
3. アップロード成功後に`incrementEvidenceUsage`を呼び出し

### 4. エラーハンドリング

**ファイル**: `src/lib/errors.ts`

```typescript
export class EvidenceLimitExceededError extends Error {
  constructor(
    public limitType: 'monthly' | 'per_record' | 'bytes',
    public reason: string,
    message?: string
  )
}
```

### 5. UI統合

**ファイル**: 
- `src/components/modals/MaintenanceModal.tsx`
- `src/components/modals/CustomizationModal.tsx`

#### 動作フロー

1. ユーザーが証憑画像を選択
2. フォーム送信時に`uploadMaintenanceImage` / `uploadCustomizationImage`を呼び出し
3. `EvidenceLimitExceededError`が発生した場合:
   - PaywallModalを`variant='minimal'`で表示
   - アナリティクスイベント`evidence_upload_blocked`を記録
4. アップロード成功時:
   - アナリティクスイベント`evidence_upload_success`を記録

### 6. アナリティクスイベント

**ファイル**: `src/lib/analytics.ts`

#### `evidence_upload_blocked`

制限超過時に記録されるイベント:

```typescript
{
  reason: string,           // エラーメッセージ
  limit_type: string,       // 'monthly' | 'per_record' | 'bytes'
  feature: string          // 'maintenance' | 'customization'
}
```

#### `evidence_upload_success`

アップロード成功時に記録されるイベント:

```typescript
{
  feature: string,         // 'maintenance' | 'customization'
  file_size: number,       // ファイルサイズ（バイト）
  file_type: string        // MIMEタイプ（例: 'image/jpeg'）
}
```

#### `upgrade_from_evidence`

PaywallModalからアップグレードを開始した際に記録されるイベント:

```typescript
{
  paywall_variant: string, // 'minimal' | 'default' | 'hero'
  feature: string         // 'maintenance' | 'customization'
}
```

## セキュリティ

### Firestore Rules

**ファイル**: `firestore.rules`

```javascript
match /users/{userId}/usage/{monthId} {
  allow read: if isOwner(userId);
  allow write: if isOwner(userId);
}
```

### 注意事項

- プレミアムユーザーは制限チェックをスキップ（`isPremiumPlan`で判定）
- transactionで原子性を担保（競合状態を防止）
- 月の切り替えは`yyyyMM`形式で自動処理（例: `202601`）
- アップロード開始前のチェックで、無駄なアップロードを防止

## 月次リセット

利用量は`yyyyMM`形式の月IDで管理されるため、月が変わると自動的に新しい月のドキュメントが作成されます。

例:
- 2026年1月: `users/{uid}/usage/202601`
- 2026年2月: `users/{uid}/usage/202602`

## 実装の優先順位

### Phase 1（現在実装済み）

- ✅ 月次アップロード数制限（5枚/月）
- ✅ 制限超過時のPaywallModal表示
- ✅ アナリティクスイベント記録

### Phase 2（将来対応）

- ⏳ 1記録あたり1枚制限
- ⏳ 合計100MB制限
- ⏳ Storage Rulesでのファイルサイズ制限強化

## テストシナリオ

### 無料ユーザーの動作確認

1. **制限内でのアップロード**
   - 月5枚未満: アップロード成功
   - 利用量が正しくカウントされる

2. **制限超過時の動作**
   - 月5枚目: アップロード成功
   - 月6枚目: `EvidenceLimitExceededError`発生 → PaywallModal表示
   - アナリティクスイベント`evidence_upload_blocked`が記録される

3. **月の切り替え**
   - 翌月1日: 新しい月のドキュメントが作成され、制限がリセットされる

### プレミアムユーザーの動作確認

1. **無制限アップロード**
   - 制限チェックをスキップ
   - 無制限でアップロード可能

## 関連ファイル

- `src/lib/premium.ts` - 制限値定義
- `src/lib/evidenceUsage.ts` - 利用量管理
- `src/lib/storage.ts` - アップロード処理
- `src/lib/errors.ts` - エラークラス
- `src/lib/analytics.ts` - アナリティクス
- `src/components/modals/MaintenanceModal.tsx` - メンテナンスモーダル
- `src/components/modals/CustomizationModal.tsx` - カスタマイズモーダル
- `src/components/modals/PaywallModal.tsx` - ペイウォールモーダル
- `firestore.rules` - Firestoreセキュリティルール

## 更新履歴

- 2026-01-25: 初版作成（月次5枚制限を実装）
