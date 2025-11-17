# 車検証QRコードから読み取れる情報まとめ

## 現在実装されている情報 ✅

1. **車台番号（chassisNumber）** - 読み取り可能、ただしCar型に保存されていない
2. **車検期限（inspectionExpiry）** - 読み取り可能、Car型に保存可能 ✅
3. **初度登録年月（firstRegYm）** - 読み取り可能、Car型に保存可能 ✅
4. **型式（modelCode）** - 読み取り可能、Car型に保存可能 ✅
5. **年式（year）** - 読み取り可能、Car型に保存可能 ✅

## 車検証QRコードに含まれる可能性があるが未対応の情報 ⚠️

### 1. 登録番号（ナンバープレート番号）
- **例**: "品川500 あ1234"、"横浜300 さ5678"
- **用途**: 車両の識別、売却時の証明
- **Car型への追加**: `registrationNumber?: string;`
- **優先度**: 中（売却時に有用）

### 2. 車体の形状（bodyType）
- **例**: "セダン"、"SUV"、"ワゴン"、"軽自動車"
- **用途**: 車種クラスの自動判定、デフォルト画像の選択
- **Car型への追加**: `bodyType?: 'sedan' | 'hatchback' | 'suv' | 'wagon' | 'coupe' | 'convertible' | 'pickup' | 'minivan' | 'sports' | 'other';`
- **優先度**: 中（既にvehicleClassがあるが、より詳細な情報）

### 3. 車体重量（weight）
- **例**: "1500kg"、"980kg"
- **用途**: 燃費計算、車検費用の目安
- **Car型への追加**: `weight?: number;` (kg単位)
- **優先度**: 低（使用頻度が低い）

### 4. 所有者・使用者情報
- **例**: 氏名、住所
- **用途**: 個人情報のため、アプリに保存する必要は低い
- **Car型への追加**: 不要（個人情報保護の観点から）
- **優先度**: 不要

## 不足している機能・データベース 🔍

### 1. 車台番号の保存
- **現状**: QRコードから読み取れるが、Car型に保存されていない
- **対応**: Car型に`chassisNumber?: string;`を追加
- **優先度**: 高（車両の一意な識別子として重要）

### 2. 型式（modelCode）から車名の自動判定
- **現状**: modelCodeは読み取れるが、車名（name）は手動入力が必要
- **対応**: `carDatabase.ts`のデータベースと照合して、modelCodeから車名を自動入力
- **優先度**: 高（ユーザー体験の向上）

### 3. 車体形状の自動判定
- **現状**: QRコードから読み取れない
- **対応**: modelCodeとcarDatabaseを照合して、bodyTypeを自動設定
- **優先度**: 中（vehicleClassの自動設定に有用）

### 4. 登録番号の読み取りと保存
- **現状**: 未対応
- **対応**: QRコードパース処理に登録番号の抽出を追加、Car型に保存
- **優先度**: 中（売却時の証明に有用）

## 推奨される改善案

### 優先度：高
1. ✅ Car型に`chassisNumber`フィールドを追加
2. ✅ QRコードから読み取ったmodelCodeでcarDatabaseを検索し、車名を自動入力
3. ✅ QRコードパース処理に登録番号の抽出を追加

### 優先度：中
4. ✅ 車体形状（bodyType）の読み取りと保存
5. ✅ modelCodeからbodyTypeを自動判定してvehicleClassを設定

### 優先度：低
6. 車体重量の読み取りと保存（使用頻度が低いため）

## 実装例

### Car型への追加フィールド
```typescript
export interface Car extends BaseEntity {
  // ... 既存のフィールド
  chassisNumber?: string;        // 車台番号（QRコードから）
  registrationNumber?: string;   // 登録番号（ナンバープレート）
  bodyType?: 'sedan' | 'hatchback' | 'suv' | 'wagon' | 'coupe' | 'convertible' | 'pickup' | 'minivan' | 'sports' | 'other';
  weight?: number;               // 車体重量（kg）
}
```

### QRコードパース処理の拡張
```typescript
interface ParsedQRData {
  chassisNumber?: string;
  registrationNumber?: string;  // 追加
  inspectionExpiry?: string;
  firstRegYm?: string;
  modelCode?: string;
  year?: number;
  bodyType?: string;            // 追加
  weight?: number;              // 追加
}
```

