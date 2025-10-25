# UI/UX改善実装ドキュメント

## 概要
Smart GarageアプリケーションのUI/UXを大幅に改善するための実装ドキュメントです。

## 実装された改善点

### 1. ファーストCTAを一本化 ✅
**ファイル**: `src/components/UnifiedCTA.tsx`

- 上部の重複した「＋メンテナンスを記録」「＋給油を記録」を統合
- 右上にプライマリ「＋記録」ボタンを配置
- ドロップダウンメニューで「メンテナンス」「給油」「カスタム」「メモ」を選択
- 迷いをなくすための一本化されたインターフェース

### 2. 「次のやること」カードの統合 ✅

- ホームの主役としてメンテナンス記録を強調表示
- 優先度順でソート
- 進捗バーで視覚的な情報表示
- 最大3件の表示で情報を整理

### 3. 残り日数/距離の表現統一 ✅
**ファイル**: `src/components/RemainingTimeDisplay.tsx`

- 「車検期限 2026年7月31日」→「車検まで 残り 661日」に変更
- 日付はサブ表示として保持
- 「残り」表現で行動に直結する表示
- 複合表示（日数と距離の両方）をサポート

### 4. 車両スイッチャーの発見性アップ ✅
**ファイル**: `src/components/VehicleSwitcher.tsx`

- 右上ドロップダウンに加えて、車名カードの右肩にピル表示
- 「GDB｜FL5」形式で2台目がいる感を常時可視化
- 最大3台までピル表示、それ以上は「+N」表示
- 詳細ドロップダウンで車両情報を表示

### 5. 最近の履歴の改善 ✅
**ファイル**: `src/components/HistoryItem.tsx`

- タイトル横にアイコン（🛢オイル / 🛞ブレーキ等）を追加
- 行全体をクリック可能にして詳細へ遷移
- 右端の鉛筆アイコンはホバー時のみ表示
- メンテナンスタイプに応じたアイコン自動選択

### 6. プレミアムの場内アップセル ✅
**ファイル**: `src/components/InlineUpsell.tsx`

- サイドバナーを廃止し、場内でのアップセルに変更
- 「高解像度写真はプレミアムで保存できます 🔒」形式
- ロックアイコン付き機能にホバーで具体メリット表示
- ツールチップでプレミアム機能の詳細を説明

### 7. 空状態の一言ガイド ✅
**ファイル**: `src/components/EmptyStateGuide.tsx`

- 給油ログ0件時：「最初の登録はレシート撮影でもOK。金額・給油量を自動抽出（β）」
- 機能紹介と「今すぐ記録」ミニボタンを配置
- タイプ別（給油、メンテナンス、保険）のガイド

### 8. ボタン文言の具体化 ✅
**ファイル**: `src/components/SpecificActionButtons.tsx`

- 「予約する」→「近くの工場を探す」「ネット予約へ」
- 「オイルを買う」→「適合オイルを見る」（グレード・粘度をサブ表示）
- 外部遷移には↗アイコンを表示
- オイル適合性表示と工場検索結果コンポーネント

### 9. 情報密度の整理 ✅
**ファイル**: `src/components/ImprovedDashboard.tsx`

- 上段：車両カード（写真・基本スペック）＋ステータス3点
- 中段：次にやること（主役）
- 下段：最近の履歴、給油ログ
- カード間の余白を28-32pxに調整

### 10. テキストの微調整・表記統一 ✅
**ファイル**: `src/lib/textFormatting.ts`

- 「インプレッサWRX（GDB）」→「インプレッサ WRX（GDB）」語間スペース統一
- kmのカンマ区切り、日付はYYYY/MM/DDで統一
- 各種フォーマット関数を提供

### 11. マイクロインタラクション ✅
**ファイル**: `src/components/MicroInteractions.tsx`

- 記録完了時の「車歴スコア +1」や当月合計¥の増加アニメーション
- 期限接近カードの淡いパルス効果
- アニメーション付きカウンター、バウンス、フェードイン等

### 12. パフォーマンス体験 ✅
**ファイル**: `src/components/SkeletonLoaders.tsx`

- Firestore待ちのSkeletonを車両カード/やること/履歴に用意
- 体感速度の底上げ
- 各種コンポーネント用のスケルトンローダー

## 使用方法

### メインダッシュボードの統合
```tsx
import ImprovedDashboard from '@/components/ImprovedDashboard';

// 既存のpage.tsxで使用
<ImprovedDashboard
  cars={cars}
  activeCarId={activeCarId}
  maintenanceRecords={maintenanceRecords}
  fuelLogs={fuelLogs}
  carsLoading={carsLoading}
  maintenanceLoading={maintenanceLoading}
  fuelLoading={fuelLoading}
  onSelectCar={onSelectCar}
  onAddMaintenance={() => setShowMaintenanceModal(true)}
  onAddFuel={() => setShowFuelLogModal(true)}
  onEditMaintenance={handleEditMaintenance}
  onEditFuel={handleEditFuel}
  onUpgrade={handleUpgrade}
  isPremium={isPremium}
/>
```

### 個別コンポーネントの使用
```tsx
// 統一CTA
<UnifiedCTA
  onMaintenance={() => setShowMaintenanceModal(true)}
  onFuel={() => setShowFuelLogModal(true)}
/>

// 車両スイッチャー
<VehicleSwitcher
  cars={cars}
  activeCarId={activeCarId}
  onSelectCar={onSelectCar}
/>

// 残り時間表示
<RemainingTimeDisplay
  targetDate={car.inspectionExpiry}
  showDate={true}
  variant="detailed"
/>
```

## カスタマイズ

### カラーテーマ
各コンポーネントはTailwind CSSクラスを使用しているため、`tailwind.config.js`でカラーテーマをカスタマイズ可能です。

### アニメーション
マイクロインタラクションは`src/components/MicroInteractions.tsx`で定義されており、必要に応じて調整可能です。

### フォーマット
テキストフォーマットは`src/lib/textFormatting.ts`で一元管理されており、表示形式を統一できます。

## 今後の拡張

1. **ダークモード対応**: 各コンポーネントにダークモードクラスを追加
2. **国際化対応**: テキストをi18nライブラリで管理
3. **アクセシビリティ**: ARIA属性とキーボードナビゲーションの追加
4. **テーマカスタマイズ**: ユーザーがカラーテーマを選択可能

## パフォーマンス考慮

- スケルトンローダーで体感速度を向上
- コンポーネントの遅延読み込み
- 画像の最適化とプレースホルダー
- メモ化による不要な再レンダリング防止

この実装により、ユーザーエクスペリエンスが大幅に改善され、直感的で使いやすいインターフェースが提供されます。

