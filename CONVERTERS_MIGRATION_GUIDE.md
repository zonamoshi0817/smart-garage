# Converters統一変換ヘルパー 移行ガイド

## 📌 概要

このドキュメントは、`src/lib/converters.ts`の統一変換ヘルパーを使用して、全CRUDファイルでTimestamp/Fuel単位を統一するための実装ガイドです。

## ✅ 完了済みファイル

- ✅ `src/lib/converters.ts` - 統一変換ヘルパー（新規作成）
- ✅ `src/lib/fuelLogs.ts` - Timestamp/Fuel単位統一完了
- ✅ `src/lib/cars.ts` - Timestamp統一完了

## 🚧 未完了ファイル（要対応）

以下のファイルは、同じパターンで統一変換ヘルパーを適用する必要があります：

1. **`src/lib/maintenance.ts`** - 優先度：高
2. **`src/lib/customizations.ts`** - 優先度：高
3. **`src/lib/insurance.ts`** - 優先度：中

---

## 🔧 実装パターン

### ステップ1: インポート追加

```typescript
// ❌ 削除または最小化
import { Timestamp } from "firebase/firestore";

// ✅ 追加
import {
  toTimestamp,
  normalizeDeletedAt,
  // その他必要なヘルパー
} from "./converters";
```

### ステップ2: 追加/作成関数の修正

**❌ 修正前（手動変換）:**

```typescript
export async function addMaintenanceRecord(data: MaintenanceInput) {
  // ...
  
  // Timestamp型への変換
  let dateField = data.date;
  if (data.date instanceof Date) {
    dateField = Timestamp.fromDate(data.date);
  }
  
  const docRef = await addDoc(ref, {
    ...data,
    date: dateField,
    userId: u.uid,
    createdAt: serverTimestamp(),
    // ...
  });
}
```

**✅ 修正後（統一ヘルパー）:**

```typescript
export async function addMaintenanceRecord(data: MaintenanceInput) {
  // ...
  
  // 統一変換ヘルパーを使用（唯一の経路）
  const cleanData: any = {
    ...data,
    date: toTimestamp(data.date),  // Date/Timestamp統一
  };
  
  // undefinedをnullに変換
  Object.keys(cleanData).forEach(key => {
    if (cleanData[key] === undefined) {
      cleanData[key] = null;
    }
  });
  
  const docRef = await addDoc(ref, {
    ...cleanData,
    userId: u.uid,
    deletedAt: null,  // 未削除はnullで統一
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    // ...
  });
}
```

### ステップ3: 更新関数の修正

**❌ 修正前:**

```typescript
export async function updateMaintenanceRecord(id: string, data: Partial<MaintenanceInput>) {
  // ...
  
  const updateData: any = {};
  for (const [key, value] of Object.entries(data)) {
    if (value === undefined) {
      updateData[key] = null;
    } else if (key === 'date' && value instanceof Date) {
      updateData[key] = Timestamp.fromDate(value);
    } else {
      updateData[key] = value;
    }
  }
  
  await updateDoc(docRef, {
    ...updateData,
    updatedAt: serverTimestamp(),
  });
}
```

**✅ 修正後:**

```typescript
export async function updateMaintenanceRecord(id: string, data: Partial<MaintenanceInput>) {
  // ...
  
  const cleanData: any = {
    ...data,
  };
  
  // date フィールドがある場合は変換
  if (cleanData.date) {
    cleanData.date = toTimestamp(cleanData.date);
  }
  
  // undefinedをnullに変換
  Object.keys(cleanData).forEach(key => {
    if (cleanData[key] === undefined) {
      cleanData[key] = null;
    }
  });
  
  await updateDoc(docRef, {
    ...cleanData,
    userId: u.uid,  // セキュリティルールで必須
    updatedBy: u.uid,
    updatedAt: serverTimestamp(),
  });
}
```

### ステップ4: 監視/取得関数の修正

**❌ 修正前（Date変換）:**

```typescript
export function watchMaintenanceRecords(carId: string, callback: (records: MaintenanceRecord[]) => void) {
  // ...
  
  return onSnapshot(q, (snapshot) => {
    const records: MaintenanceRecord[] = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        date: data.date?.toDate() || new Date(),  // ❌ Dateに変換
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
      } as MaintenanceRecord;
    });
    callback(records);
  });
}
```

**✅ 修正後（Timestampのまま）:**

```typescript
export function watchMaintenanceRecords(carId: string, callback: (records: MaintenanceRecord[]) => void) {
  // ...
  
  return onSnapshot(q, (snapshot) => {
    const records: MaintenanceRecord[] = snapshot.docs
      .filter((doc) => {
        // 論理削除されたレコードを除外
        const data = doc.data();
        return !data.deletedAt;
      })
      .map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          // Timestampはそのまま保持
          date: data.date,
          deletedAt: normalizeDeletedAt(data.deletedAt),  // null統一
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
        } as MaintenanceRecord;
      });
    callback(records);
  });
}
```

---

## 📝 maintenance.ts の具体的な修正箇所

### 1. `addMaintenanceRecord` (line 77-)

```typescript
// 修正箇所: line 98-103
// ❌ 削除
let dateField = data.date;
if (data.date instanceof Date) {
  dateField = Timestamp.fromDate(data.date);
}

// ✅ 追加
const cleanData: any = {
  ...data,
  date: toTimestamp(data.date),
};

Object.keys(cleanData).forEach(key => {
  if (cleanData[key] === undefined) {
    cleanData[key] = null;
  }
});

// 修正箇所: addDoc呼び出し
const docRef = await addDoc(ref, {
  ...cleanData,  // ✅ dataではなくcleanDataを使用
  userId: u.uid,
  ownerUid: u.uid,
  createdBy: u.uid,
  updatedBy: u.uid,
  deletedAt: null,  // ✅ null統一
  createdAt: serverTimestamp(),
  updatedAt: serverTimestamp(),
});
```

### 2. `updateMaintenanceRecord`

同様のパターンで修正

### 3. `watchMaintenanceRecords`

監視関数内で`date: data.date?.toDate()`を削除し、`date: data.date`に変更

### 4. `getExistingMaintenanceRecords` (line 35-)

**注意:** このヘルパー関数は`validateMileageConsistency`のために**Date型**を返す必要があります。
ここは例外的に`timestampToDate()`（表示用ヘルパー）を使用してください。

```typescript
// ✅ この関数のみ例外的にDate型を使用（バリデーション用）
import { timestampToDate } from "./converters";

const date = timestampToDate(data.date) || new Date();
records.push({
  mileage: data.mileage,
  date: date  // Date型を返す
});
```

---

## 📝 customizations.ts の具体的な修正箇所

### 1. `addCustomization`

```typescript
// date フィールドの変換
const cleanData: any = {
  ...data,
  date: toTimestamp(data.date),
};
```

### 2. `updateCustomization`

同様のパターン

### 3. `watchCustomizations`

```typescript
// Timestampはそのまま保持
date: data.date,
deletedAt: normalizeDeletedAt(data.deletedAt),
```

---

## 📝 insurance.ts の具体的な修正箇所

### 1. `addInsurancePolicy`

```typescript
// 複数の日付フィールドを変換
const cleanData: any = {
  ...data,
  startDate: toTimestamp(data.startDate),
  endDate: toTimestamp(data.endDate),
  contractDate: toTimestamp(data.contractDate),
};
```

### 2. その他の関数

同様のパターンで全ての日付フィールドに`toTimestamp()`を適用

---

## ✅ チェックリスト

各ファイルを修正する際は、以下を確認してください：

- [ ] `import { toTimestamp, normalizeDeletedAt } from "./converters";` を追加
- [ ] 全ての`addDoc`呼び出しで日付フィールドに`toTimestamp()`を適用
- [ ] 全ての`updateDoc`呼び出しで日付フィールドに`toTimestamp()`を適用
- [ ] `deletedAt`は常に`null`または`Timestamp`（`normalizeDeletedAt()`使用）
- [ ] 監視関数でTimestamp→Date変換を削除（Timestampのまま返す）
- [ ] `undefined`を`null`に変換する処理を追加
- [ ] `userId`フィールドを全ての書き込み操作に追加（セキュリティルール対応）

---

## 🧪 テスト方法

修正後は以下を確認：

1. **追加操作**: 新規レコードが正常に保存される
2. **更新操作**: 既存レコードが正常に更新される
3. **削除操作**: 論理削除が正常に機能する
4. **監視操作**: リアルタイム更新が正常に動作する
5. **後方互換性**: 旧形式のデータも正常に表示される

---

## 📚 参考資料

- **統一変換ヘルパー**: `src/lib/converters.ts`
- **完了例**: `src/lib/fuelLogs.ts`, `src/lib/cars.ts`
- **型定義**: `src/types/index.ts`

---

**最終更新:** 2025-11-10  
**実装者:** AI Assistant  
**レビュー:** 要確認


