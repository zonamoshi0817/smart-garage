# マイカーページ v2.0

新しいマイカーページのコンポーネント群です。

## 概要

ユーザーの要望に基づき、以下の10セクションで構成された新しいマイカーページを実装しました：

1. **ヘッダー（車両カード・ミニヒーロー）** - `VehicleHeader.tsx`
2. **クイックアクション（横スクロールの丸ボタン）** - `QuickActions.tsx`
3. **車両ヘルスインジケータ** - `VehicleHealthIndicator.tsx`
4. **直近の活動タイムライン** - `ActivityTimeline.tsx`
5. **コスト & 燃費ミニダッシュボード** - `CostAndFuelDashboard.tsx`
6. **燃費・単価チャート** - `FuelAndPriceChart.tsx`
7. **メンテ & カスタムの次回提案カード** - `NextMaintenanceSuggestion.tsx`
8. **ドキュメント & OCRドラフト** - `DocumentsAndDrafts.tsx`
9. **共有 & PDF** - `ShareAndPDF.tsx`
10. **コンテキスト広告/アフィリ枠** - `ContextualAd.tsx`（無料ユーザーのみ）

すべてのコンポーネントを統合した `MyCarPage.tsx` が提供されています。

## 使い方

### 基本的な使用方法

\`\`\`tsx
import MyCarPage from '@/components/mycar/MyCarPage';

function App() {
  const [car, setCar] = useState<Car>(...);
  const [maintenanceRecords, setMaintenanceRecords] = useState<MaintenanceRecord[]>([]);
  const [fuelLogs, setFuelLogs] = useState<FuelLog[]>([]);
  const [customizations, setCustomizations] = useState<Customization[]>([]);
  const [insurancePolicies, setInsurancePolicies] = useState<InsurancePolicy[]>([]);

  const handleOpenModal = (modalType: string, data?: any) => {
    // モーダル表示処理
    console.log('Open modal:', modalType, data);
  };

  return (
    <MyCarPage
      car={car}
      maintenanceRecords={maintenanceRecords}
      fuelLogs={fuelLogs}
      customizations={customizations}
      insurancePolicies={insurancePolicies}
      onOpenModal={handleOpenModal}
    />
  );
}
\`\`\`

### 既存のpage.tsxとの統合

既存の `src/app/page.tsx` から新しいマイカーページを使うには：

\`\`\`tsx
// src/app/page.tsx の一部
import MyCarPage from '@/components/mycar/MyCarPage';

export default function Home() {
  // 既存のステート管理
  const [cars, setCars] = useState<Car[]>([]);
  const [activeCarId, setActiveCarId] = useState<string>();
  // ... その他のステート

  // アクティブな車両を取得
  const activeCar = useMemo(() => 
    cars.find(c => c.id === activeCarId),
    [cars, activeCarId]
  );

  // モーダル表示ハンドラー
  const handleOpenModal = (modalType: string, data?: any) => {
    switch (modalType) {
      case 'fuel':
        setShowFuelLogModal(true);
        break;
      case 'maintenance':
        setShowMaintenanceModal(true);
        // data.type で初期値を設定可能
        break;
      case 'insurance':
        setShowInsuranceModal(true);
        break;
      // その他のモーダル
    }
  };

  // マイカーページを表示
  if (activeCar && currentPage === 'my-car') {
    return (
      <MyCarPage
        car={activeCar}
        maintenanceRecords={maintenanceRecords}
        fuelLogs={fuelLogs}
        customizations={customizations}
        insurancePolicies={insurancePolicies}
        onOpenModal={handleOpenModal}
      />
    );
  }

  // 既存のレンダリング
  return (
    // ...
  );
}
\`\`\`

## コンポーネント詳細

### 1. VehicleHeader

車両の基本情報とステータスバッジを表示します。

**Props:**
- `car: Car` - 車両データ
- `latestMaintenance?: MaintenanceRecord` - 最新のメンテナンス記録
- `activeInsurance?: InsurancePolicy` - アクティブな保険証券
- `isPremium: boolean` - プレミアムユーザーかどうか
- `onImageChange: () => void` - 画像変更ハンドラー

**機能:**
- 車名、年式、型式、現在ODO、直近メンテ日の表示
- 車検期限・保険期限のバッジ（状態に応じて色替え）
- 車両画像の表示と変更CTA

### 2. QuickActions

横スクロール可能なクイックアクションボタンを表示します。

**Props:**
- `actions: QuickAction[]` - アクション定義
- `isPremium: boolean` - プレミアムユーザーかどうか
- `onLockedClick: (actionId: string) => void` - ロックされたアクションクリック時

**機能:**
- 横スクロール対応
- プレミアム機能は🔒付きで表示
- 左右のスクロールボタン

### 3. VehicleHealthIndicator

オイル、ブレーキ&タイヤ、バッテリーの状態を表示します。

**Props:**
- `car: Car` - 車両データ
- `maintenanceRecords: MaintenanceRecord[]` - メンテナンス履歴
- `onQuickAdd: (type: string) => void` - 1タップ追加ハンドラー

**機能:**
- オイル交換の推定残量（km/日）
- ブレーキ&タイヤの推定残量（km）
- バッテリーの経過月表示
- クリックで次回予定を1タップ追加

### 4. ActivityTimeline

直近30日間の活動を時系列で表示します。

**Props:**
- `maintenanceRecords: MaintenanceRecord[]`
- `fuelLogs: FuelLog[]`
- `customizations: Customization[]`
- `insurancePolicies: InsurancePolicy[]`
- `onViewDetails: (type: string, id: string) => void`
- `onDuplicate: (type: string, id: string) => void`

**機能:**
- 給油/メンテ/カスタム/保険を統合表示
- 相対日付表示（今日、昨日、○日前）
- 明細表示・複製ボタン

### 5. CostAndFuelDashboard

4枚のカードでコストと燃費の概要を表示します。

**Props:**
- `maintenanceRecords: MaintenanceRecord[]`
- `fuelLogs: FuelLog[]`
- `insurancePolicies: InsurancePolicy[]`

**機能:**
- 今月の維持費（燃料＋メンテ＋保険の按分）
- 過去90日の平均燃費（満タン基準）
- 今年の総コスト（前年比）
- 次の出費予測
- Rechartsのスパークライン

### 6. FuelAndPriceChart

燃費と単価のチャートをタブ切替で表示します。

**Props:**
- `fuelLogs: FuelLog[]`

**機能:**
- タブ1: 燃費(km/L)の時系列（満タン時のみ）
- タブ2: ガソリン単価(円/L)の時系列
- 目標ライン（自己ベストの80%）

### 7. NextMaintenanceSuggestion

次回推奨メンテナンスを提案します。

**Props:**
- `car: Car`
- `maintenanceRecords: MaintenanceRecord[]`
- `onCreateFromTemplate: (type: string) => void`

**機能:**
- オイル交換、オイルフィルター、タイヤローテーション等の提案
- 残り距離/期間の表示
- テンプレートから作成ボタン

### 8. DocumentsAndDrafts

OCRドラフトと確定済みドキュメントを表示します。

**Props:**
- `drafts: OCRDraft[]`
- `documents: Document[]`
- `onConfirmDraft: (draftId: string) => void`
- `onViewDocument: (documentId: string) => void`
- `onViewVerification: (verificationId: string) => void`

**機能:**
- 未確定ドラフトをバッジ付きで表示
- 確定済みドキュメントの原本画像・検証ID表示

### 9. ShareAndPDF

車両履歴のPDF出力と共有URLの管理をします。

**Props:**
- `carId: string`
- `shareLink?: ShareLink`
- `onGeneratePDF: () => void`
- `onGenerateShareLink: () => void`
- `onRevokeShareLink: () => void`
- `onViewVerificationPage: () => void`

**機能:**
- PDF発行（証跡付き）
- 共有URL発行（有効期限と失効ボタン）
- 検証ページへのリンク

### 10. ContextualAd

無料ユーザー向けのコンテキスト広告を表示します。

**Props:**
- `car: Car`
- `isPremium: boolean`

**機能:**
- 車種・スペック連動の関連商品表示
- プレミアムユーザーには非表示
- 事前高さ固定＋"広告"ラベル

## デザイン特徴

- **モダンなUI**: Tailwind CSSによるグラデーション、影、丸角を多用
- **レスポンシブ**: モバイル〜デスクトップまで対応
- **直感的な操作**: クリック可能な要素は明確にハイライト
- **視覚的フィードバック**: ホバー効果、トランジション
- **プレミアム差別化**: 無料/プレミアムで表示内容を変更

## 今後の拡張

- OCRドラフトの実データ連携
- 共有URLの実装
- PDF生成の実装
- アフィリエイトリンクの動的生成
- より詳細なメンテナンス推奨ロジック

## 注意事項

- 現在一部のデータはダミーデータを使用しています（dummyDrafts, dummyDocuments, dummyShareLink）
- 実際の運用前にFirestoreとの連携を完了させてください
- プレミアム機能のチェックロジックは既存の`usePremiumGuard`を使用しています

