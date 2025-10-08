# Smart Garage 仕様書

## 概要
Smart Garageは、車両のメンテナンス管理と整備計画機能を提供するWebアプリケーションです。ユーザーは車両情報の管理、メンテナンス履歴の記録、整備計画の設定・管理を行うことができます。

## 技術スタック
- **フロントエンド**: Next.js 15.5.3, React, TypeScript
- **バックエンド**: Firebase (Firestore, Authentication)
- **スタイリング**: Tailwind CSS
- **バリデーション**: Zod
- **デプロイ**: Vercel

## 機能仕様

### 1. 認証・ユーザー管理
- Firebase Authenticationを使用
- ユーザー情報表示（名前、プラン）
- ユーザー名の最初の文字をアイコンとして表示

### 2. ナビゲーション
#### メニュー構成
1. **ダッシュボード** - メイン画面
2. **車両** - 車両管理画面
3. **メンテナンス履歴** - 整備記録画面
4. **保険** - 保険管理画面
5. **エクスポート** - データ管理画面
6. **メンテナンス計画** - 整備計画管理画面

### 3. 車両管理
#### 車両情報
- 車両名
- メーカー・モデル・年式
- 走行距離（odoKm）
- 車検期限
- エンジンコード
- オイル仕様（粘度、API規格、容量）

#### 車両追加機能
- TypeaheadCarSelectorによる車種選択
- 車両データベースからの自動補完
- デフォルト画像選択機能
- 自動整備計画生成（オプション）

### 4. メンテナンス記録
#### 記録項目
- **タイトル**: 選択式（オイル交換、ブレーキフルード交換、タイヤローテーション、エアフィルター交換など）
- **説明**: 自由記述
- **費用**: 数値入力
- **走行距離**: 必須項目（現在の車両走行距離以上）
- **日付**: 日付選択
- **場所**: 自由記述

#### 自動機能
- メンテナンス記録追加時に車両の走行距離を自動更新
- オイル交換記録時に自動で整備計画生成（6ヶ月後）
- 走行距離の整合性チェック

### 5. 整備計画機能
#### 整備計画種類
- **時間ベース**: 日付での期限設定
- **距離ベース**: 走行距離での期限設定
- **オイル交換**: 特別な整備計画（購入候補、予約URL付き）

#### 整備計画管理
- 整備計画の追加・編集・削除
- 完了・スヌーズ・却下のアクション
- 期限切れ・今週期限の自動判定

#### オイル交換整備計画
- 6ヶ月後の自動生成
- 車種適合オイルの購入候補表示
- 予約サイトへのリンク
- アフィリエイトリンク対応

### 6. 保険管理
- 保険契約情報の管理
- 事故記録の管理
- 保険通知設定

### 7. データ管理
- メンテナンス履歴のCSVエクスポート
- 車両データのエクスポート
- データ統計表示

### 8. 通知設定
- メンテナンス整備計画の通知ON/OFF
- 車検整備計画の通知ON/OFF
- テスト通知機能

## データモデル

### 車両（cars）
```typescript
interface Car {
  id: string;
  name: string;
  modelCode?: string;
  year?: number;
  odoKm?: number;
  imagePath?: string;
  inspectionExpiry?: string;
  firstRegYm?: string;
  avgKmPerMonth?: number;
  engineCode?: string;
  oilSpec?: {
    viscosity: string;
    api: string;
    volumeL: number;
  };
  createdAt: Date;
  updatedAt: Date;
}
```

### メンテナンス記録（maintenance）
```typescript
interface MaintenanceRecord {
  id: string;
  carId: string;
  title: string;
  description?: string;
  cost?: number;
  mileage?: number; // 必須項目（現在の車両走行距離以上）
  date: Date;
  location?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

### 整備計画（reminders）
```typescript
interface Reminder {
  id: string;
  carId: string;
  kind: 'time' | 'distance' | 'both';
  title: string;
  dueDate?: Date;
  dueOdoKm?: number;
  baseEntryRef?: string;
  threshold: {
    months?: number;
    km?: number;
  };
  status: 'active' | 'done' | 'snoozed' | 'dismissed';
  notes?: string;
  type?: 'oil_change';
  purchaseCandidates?: PurchaseCandidate[];
  reservationUrl?: string;
  carName?: string;
  lastOilChangeAt?: Date;
  oilSpec?: {
    viscosity: string;
    api: string;
    volumeL: number;
  };
  createdAt: Date;
  updatedAt: Date;
}
```

## UI/UX仕様

### デザイン原則
- モダンでクリーンなデザイン
- レスポンシブ対応
- 直感的なナビゲーション
- 一貫性のあるカラーテーマ（青系）

### レイアウト
- サイドバーナビゲーション
- メインコンテンツエリア
- モーダルダイアログ
- カード形式の情報表示

### インタラクション
- フィルター機能（車両別、検索）
- 一括操作（削除など）
- リアルタイム更新
- エラーハンドリング

## ビジネスロジック

### 自動整備計画生成
- オイル交換記録 → 6ヶ月後の整備計画
- ブレーキフルード交換 → 24ヶ月後の整備計画
- タイヤローテーション → 10,000km後の整備計画
- エアフィルター交換 → 12ヶ月後 + 20,000km後の整備計画

### データ整合性
- 走行距離の整合性チェック（過去記録 ≤ 新規記録 ≤ 現在車両走行距離）
- 重複整備計画の防止
- 関連データの自動更新
- Zodスキーマによる型安全なバリデーション

### アフィリエイト機能
- Amazon/Rakutenへのリンク生成
- UTMパラメータ付与
- 車種適合商品の自動選択

## セキュリティ
- Firebase Authenticationによる認証
- ユーザー別データ分離
- 入力値の検証
- エラーハンドリング

## パフォーマンス
- Firestoreインデックスの最適化
- リアルタイムデータ同期
- 効率的なクエリ設計
- クライアントサイドキャッシュ

## プレミアム機能（月額480円）
### 無料プランの制限
- 車両登録: 1台まで
- 整備計画: 3件まで
- PDFエクスポート: 利用不可
- 履歴共有: 利用不可

### プレミアム機能
- 複数台の車両登録
- 高度な整備計画設定
- PDFエクスポート
- 履歴の共有
- 広告非表示
- 整備計画無制限スヌーズ
- 自動次回整備計画登録
- オイルフィルター表示
- 複数オイル候補レコメンド
- 領収書自動保存
- カスタムメンテナンス種別
- データバックアップ

## 実装済み機能
- ✅ 車両管理（CRUD）
- ✅ メンテナンス記録（CRUD）
- ✅ 整備計画機能（CRUD）
- ✅ オイル交換整備計画（自動生成）
- ✅ アフィリエイトリンク生成
- ✅ データエクスポート（CSV）
- ✅ 通知設定
- ✅ 保険管理
- ✅ データバリデーション（Zod）
- ✅ 走行距離整合性チェック
- ✅ 重複整備計画防止

## 開発・運用
- Git によるバージョン管理
- コミットID: b51b7dc（現在の安定版）
- 開発環境でのテストデータ対応
- 本番環境でのFirebase設定
- ESLint設定（警告レベルでの開発）
- TypeScript型安全性の確保

## 技術的改善
- ✅ Zodスキーマによるバリデーション
- ✅ 型安全なイベント追跡システム
- ✅ 証明性データ生成（ハッシュ化）
- ✅ プレミアム機能ガード
- ✅ メニュー名称の最適化
- ✅ 履歴スコア機能（削除済み）

---

*最終更新: 2025年9月*
*バージョン: 1.1.0*
