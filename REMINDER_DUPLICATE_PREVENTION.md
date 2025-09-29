# リマインダー重複防止仕様

## 概要
同一車両に対して同種のリマインダーが重複して作成されることを防ぐための仕様。

## 重複判定条件

### 1. 基本条件
- **同一車両** (`carId` が同じ)
- **同一タイトル** (完全一致)
- **アクティブ状態** (`status === 'active'`)

### 2. 近接条件（時間ベース）
- **±7日以内** の既存リマインダーがある場合
- 例: 2024-01-01に「オイル交換」リマインダーがある場合、2024-01-08以前の新しい「オイル交換」リマインダーは作成しない

### 3. 近接条件（距離ベース）
- **±500km以内** の既存リマインダーがある場合
- 例: 50,000kmで「タイヤローテーション」リマインダーがある場合、49,500km〜50,500kmの新しい「タイヤローテーション」リマインダーは作成しない

### 4. 特別ルール（オイル交換）
- **同一車両** + **type: 'oil_change'** の組み合わせで重複判定
- 時間ベースのみ（6ヶ月間隔）
- 既存のオイル交換リマインダーがある場合、新しいものは作成せず既存を更新

## 実装ロジック

### 重複チェック関数
```typescript
async function checkDuplicateReminder(
  carId: string,
  title: string,
  dueDate?: Date,
  dueOdoKm?: number,
  type?: string
): Promise<{ isDuplicate: boolean; existingReminderId?: string }>
```

### 処理フロー
1. **既存リマインダー検索**
   - 同一車両 + 同一タイトル + アクティブ状態で検索
   
2. **近接条件チェック**
   - 時間ベース: `Math.abs(newDate - existingDate) <= 7日`
   - 距離ベース: `Math.abs(newOdo - existingOdo) <= 500km`
   
3. **重複判定**
   - 近接条件に該当する既存リマインダーがある場合 → 重複
   - 該当しない場合 → 新規作成可能

4. **重複時の処理**
   - **オイル交換**: 既存リマインダーを更新（期限を延長）
   - **その他**: 既存リマインダーを「done」にマークして新規作成

## 例外ケース

### 1. 手動リマインダー
- ユーザーが明示的に作成したリマインダーは重複チェックをスキップ
- `baseEntryRef` が存在しない場合

### 2. 異なる種類のリマインダー
- タイトルが異なる場合は重複とみなさない
- 例: 「オイル交換」と「エンジンオイル交換」は別物として扱う

### 3. 非アクティブリマインダー
- `status` が 'done', 'snoozed', 'dismissed' の場合は重複チェック対象外

## エラーハンドリング

### 重複検出時
```typescript
// オイル交換の場合
if (type === 'oil_change' && existingReminder) {
  // 既存リマインダーの期限を更新
  await updateReminder(existingReminder.id, { dueDate: newDueDate });
  return { success: true, action: 'updated', reminderId: existingReminder.id };
}

// その他の場合
if (existingReminder) {
  // 既存リマインダーを完了にして新規作成
  await markReminderDone(existingReminder.id);
  // 新規リマインダーを作成
  return { success: true, action: 'replaced', reminderId: newReminderId };
}
```

### ログ出力
```typescript
console.log('Duplicate reminder detected:', {
  carId,
  title,
  existingReminderId: existingReminder?.id,
  action: 'updated' | 'replaced' | 'created'
});
```

## テストケース

### 1. 正常ケース
- 異なる車両の同種リマインダー → 作成可能
- 7日以上離れた同種リマインダー → 作成可能
- 500km以上離れた同種リマインダー → 作成可能

### 2. 重複ケース
- 同一車両 + 同一タイトル + 7日以内 → 重複
- 同一車両 + 同一タイトル + 500km以内 → 重複
- オイル交換 + 既存オイル交換リマインダー → 更新

### 3. 境界値
- ちょうど7日後 → 作成可能
- ちょうど500km後 → 作成可能
- 6日23時間59分後 → 重複
- 499km後 → 重複

## パフォーマンス考慮

### インデックス要件
```typescript
// Firestore インデックス
{
  collection: 'reminders',
  fields: [
    { field: 'carId', order: 'ASC' },
    { field: 'title', order: 'ASC' },
    { field: 'status', order: 'ASC' },
    { field: 'dueDate', order: 'ASC' }
  ]
}
```

### クエリ最適化
- 複合クエリで一度に検索
- クライアントサイドでの近接条件チェック
- 必要最小限のフィールドのみ取得

---

*この仕様は、リマインダー生成関数の実装時に参照し、コードコメントとしても活用する*
