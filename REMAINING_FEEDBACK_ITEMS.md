# 残りのフィードバック項目

**日付**: 2025-11-10  
**全16項目のうち対応済み7項目、残り9項目**

---

## 📊 対応状況サマリー

| ステータス | 件数 | 割合 |
|-----------|------|------|
| ✅ 実装完了 | 4項目 | 25% |
| 📝 ガイド作成 | 3項目 | 19% |
| ⏭️ 未対応 | 9項目 | 56% |
| **合計** | **16項目** | **100%** |

---

## ⏭️ 未対応フィードバック（9項目）

### 🔴 優先度：高（即座に対応すべき）

#### 2. プレミアム訴求が"あと出し値段"に見えやすい（プロダクト面）

**指摘内容:**
- 「OCR成功→自動入力はPremium」はCVR的には強いが、**体験的にはベイトに見えやすい**

**提案:**
- 初回のみ"1件フルオート入力＋編集可"で価値を確実に体験
- 保存時にペイウォール
- ドラフト"閲覧のみ"は不満の種

**現状:**
- OCRは既にプレミアム化済み
- ただし初回無料体験の実装はない

**実装案:**
```typescript
// src/lib/premium.ts
export async function checkOCRQuota(userId: string): Promise<{
  hasQuota: boolean;
  usedCount: number;
  maxFree: number;
}> {
  const usage = await getOCRUsage(userId);
  const isPremium = await checkPremiumStatus(userId);
  
  if (isPremium) {
    return { hasQuota: true, usedCount: usage, maxFree: Infinity };
  }
  
  // 無料ユーザー: 初回1件のみ無料
  const MAX_FREE_OCR = 1;
  return {
    hasQuota: usage < MAX_FREE_OCR,
    usedCount: usage,
    maxFree: MAX_FREE_OCR,
  };
}
```

**優先度**: 🔥🔥 CVR直撃

---

#### 7. 保険OCRは個人情報の塊（リスク高）（ビジネス面）

**指摘内容:**
- 氏名・住所・車台番号レベルは**漏えい時の被害が大**

**提案:**
- デフォルト**非保存**（フィールド選択保存）
- 保存時に**明示同意**（トグル＋短文）
- 画像保存の**自動有効期限**（90日）＋削除ジョブ

**現状:**
- 保険OCR機能は実装済み
- 画像の自動削除機構はなし

**実装案:**
```typescript
// functions/src/index.ts
exports.deleteExpiredInsuranceImages = functions.pubsub
  .schedule('every 24 hours')
  .onRun(async (context) => {
    const now = admin.firestore.Timestamp.now();
    const ninetyDaysAgo = new admin.firestore.Timestamp(
      now.seconds - (90 * 24 * 60 * 60),
      now.nanoseconds
    );
    
    // 90日以上古い保険画像を削除
    const oldImages = await admin.firestore()
      .collectionGroup('insurancePolicies')
      .where('documentUploadedAt', '<', ninetyDaysAgo)
      .where('documentUrl', '!=', null)
      .get();
    
    for (const doc of oldImages.docs) {
      const data = doc.data();
      if (data.documentUrl) {
        // Storage画像を削除
        await admin.storage().bucket().file(data.documentUrl).delete();
        
        // Firestoreのフィールドをクリア
        await doc.ref.update({
          documentUrl: admin.firestore.FieldValue.delete(),
          documentDeletedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }
    }
  });
```

**優先度**: 🔥🔥🔥 法務/セキュリティリスク

---

#### 12. セキュリティ仕様の"穴"（技術面）

**指摘内容:**
- 共有トークン30日のみ。**即時失効/スコープ/One-time**が未定義

**提案:**
- スコープ（`share:vehicle`/`share:pdf`）とAudience（carId必須）
- **revokedAt**参照、**閲覧回数上限**
- **IPおおまか記録**（個人特定しない）
- ルールは**userId厳格**＋Storageメタデータ`ownerUid`検証を**二重化**

**現状:**
- 共有トークンは実装済み
- 失効機構・閲覧回数上限はなし

**実装案:**
```typescript
// src/types/index.ts
export interface ShareToken {
  id: string;
  userId: string;
  carId: string;
  scope: 'share:vehicle' | 'share:pdf';  // スコープ追加
  expiresAt: Timestamp;
  revokedAt?: Timestamp;  // 即時失効用
  accessCount: number;  // 閲覧回数
  maxAccessCount?: number;  // 上限（One-time = 1）
  lastAccessedAt?: Timestamp;
  lastAccessIpHash?: string;  // IPのハッシュ（個人特定しない）
  createdAt: Timestamp;
}

// src/lib/shareTokens.ts
export async function revokeShareToken(tokenId: string): Promise<void> {
  await updateDoc(doc(db, 'shareTokens', tokenId), {
    revokedAt: Timestamp.now(),
  });
}

export async function checkShareTokenValidity(token: ShareToken): Promise<{
  valid: boolean;
  reason?: string;
}> {
  // 失効チェック
  if (token.revokedAt) {
    return { valid: false, reason: 'このリンクは無効化されました' };
  }
  
  // 閲覧回数上限チェック
  if (token.maxAccessCount && token.accessCount >= token.maxAccessCount) {
    return { valid: false, reason: 'このリンクは閲覧回数の上限に達しました' };
  }
  
  // 有効期限チェック
  if (token.expiresAt.toMillis() < Date.now()) {
    return { valid: false, reason: 'このリンクは期限切れです' };
  }
  
  return { valid: true };
}
```

**優先度**: 🔥🔥 セキュリティ強化

---

### 🟡 優先度：中（計画的に対応）

#### 4. 無料×広告×有料の三層が競合（プロダクト面）

**指摘内容:**
- 広告が"整備計画UI"を汚染しうる

**提案:**
- 広告はダッシュボードの"全車横断"だけに限定
- マイカー（意思決定面）は常時クリーン（Premium優先）

**現状:**
- マイカーページにも広告セクションあり（`ContextualAd.tsx`）

**実装案:**
```typescript
// src/components/mycar/MyCarPage.tsx
// ❌ 削除
{!isPremium && <ContextualAd car={car} />}

// または条件付き非表示
const showAdsOnMyCarPage = false;  // 設定で制御
```

**優先度**: 🔥 体験改善

---

#### 11. PWA/オフライン同期の衝突予兆（技術面）

**指摘内容:**
- 将来PWA化予定なのに、**重い画像/OCR/集約**が先に入る

**提案:**
- 先に**差分同期戦略**（楽観ロック、マージポリシー、offline queue）を最小実装
- 画像は**アップロード予約→成功時差し替え**の2段階

**現状:**
- PWA対応は「実装予定」ステータス
- オフライン同期機構はなし

**実装案:**
```typescript
// src/lib/offlineQueue.ts
interface QueuedOperation {
  id: string;
  type: 'create' | 'update' | 'delete';
  collection: string;
  data: any;
  timestamp: Timestamp;
  retryCount: number;
}

export async function queueOfflineOperation(op: QueuedOperation) {
  // IndexedDBに保存
  const db = await openIndexedDB();
  await db.put('offline_queue', op);
}

export async function syncOfflineQueue() {
  const db = await openIndexedDB();
  const queue = await db.getAll('offline_queue');
  
  for (const op of queue) {
    try {
      await executeOperation(op);
      await db.delete('offline_queue', op.id);
    } catch (error) {
      // リトライカウント更新
      op.retryCount++;
      await db.put('offline_queue', op);
    }
  }
}
```

**優先度**: 🔥 PWA対応の土台

---

#### 14. E2Eの通過率が"仕様の信頼性"を削る（技術面）

**指摘内容:**
- 「失敗21・スキップ25」は"赤信号が点いたまま走る"状態

**提案:**
- 認証依存を**test double**化
- **CIで緑が当たり前**に
- 最低でも"ダッシュ→深リンク→モーダル起動→保存→集約反映"のHappy Pathは常に緑

**現状:**
- 75件のE2Eテスト実装
- 29件成功、21件失敗（認証依存）、25件スキップ

**実装案:**
```typescript
// tests/e2e/fixtures/auth.ts
export async function setupMockAuth(page: Page) {
  // Firebaseの認証をモック
  await page.addInitScript(() => {
    window.__TEST_USER__ = {
      uid: 'test-user-123',
      email: 'test@example.com',
      displayName: 'Test User',
    };
    
    // Firebase Authをモック
    window.firebase = {
      auth: () => ({
        currentUser: window.__TEST_USER__,
        onAuthStateChanged: (callback) => {
          callback(window.__TEST_USER__);
          return () => {};
        },
      }),
    };
  });
}

// tests/e2e/dashboard.spec.ts
test('ダッシュボード→マイカー→メンテ追加のHappy Path', async ({ page }) => {
  await setupMockAuth(page);
  
  await page.goto('/dashboard');
  await page.click('text=マイカーを見る');
  await page.click('text=メンテを追加');
  
  // フォーム入力
  await page.fill('input[name="title"]', 'オイル交換');
  await page.fill('input[name="cost"]', '5000');
  await page.click('button:has-text("保存")');
  
  // 集約反映確認
  await expect(page.locator('text=オイル交換')).toBeVisible();
});
```

**優先度**: 🔥 CI/CD品質向上

---

### 🟢 優先度：低（リソースがあれば）

#### 5. 価格と原価の検証が甘い（480円/月）（ビジネス面）

**指摘内容:**
- 画像Storage＋Sentry＋Firestore reads＋将来CF集約で、**画像多用ユーザのARPU不足**が懸念

**提案:**
- 年額4,800円は据え置き、**月額は580〜680円**も視野に
- 代わりに確実な"初回フルOCR無料"を提供
- 画像点数上限/画質圧縮を強化

**現状:**
- 月額480円/年額4,800円で設定済み
- 画像圧縮: 1600px、85%品質、最大800KB

**実装案:**
- Stripeの価格設定変更
- 画像上限の実装（Premium: 100枚/車など）

**優先度**: 🟢 収益最適化

---

#### 6. Stripe運用の細目が未定義（ビジネス面）

**指摘内容:**
- 適格請求書（消費税処理）、日割り課金、解約・再加入の扱い、**Webhookの冪等性**が仕様で未言及

**提案:**
- Webhook: すべての`invoice.payment_succeeded`/`customer.subscription.updated`で**idempotency key**を採用
- 税: 税率・内税表記・領収書の但し書きを仕様に固定
- 返金ポリシー：クーリングオフ相当の運用をFAQ/規約に明記

**現状:**
- Stripe統合は実装済み
- Webhook処理あり（idempotency keyは未実装）

**実装案:**
```typescript
// src/app/api/stripe/webhook/route.ts
export async function POST(req: Request) {
  const sig = req.headers.get('stripe-signature');
  const event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  
  // Idempotency Key で重複処理を防止
  const idempotencyKey = event.id;  // Stripeのevent.idを使用
  
  const processed = await db.collection('webhook_log').doc(idempotencyKey).get();
  if (processed.exists) {
    console.log('Already processed event:', idempotencyKey);
    return new Response('OK', { status: 200 });
  }
  
  // 処理実行
  await handleWebhookEvent(event);
  
  // 処理済みマーク
  await db.collection('webhook_log').doc(idempotencyKey).set({
    eventType: event.type,
    processedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  
  return new Response('OK', { status: 200 });
}
```

**優先度**: 🟢 運用安定性

---

#### 8. リブランディングのSEO/法務ハンドリング不足（ビジネス面）

**指摘内容:**
- "garage log"へ統一は良いが、**旧Smart Garage資産への301設計**・表記監視が薄い

**提案:**
- 旧URL→新URLの恒久リダイレクト表（サイトマップ）
- アプリ内テキスト・OG・アプリ名・ストア名の**一括置換リスト**
- 商標/ドメイン表記の一貫（"garage log"小文字二語）を**lint**で機械チェック

**現状:**
- 製品名は"garage log"に統一済み（v2.4.0）
- `PRODUCT_NAME_CHANGE_IMPACT.md`に影響範囲記録

**実装案:**
```typescript
// next.config.ts
module.exports = {
  async redirects() {
    return [
      {
        source: '/smart-garage/:path*',
        destination: '/garage-log/:path*',
        permanent: true,  // 301リダイレクト
      },
    ];
  },
};

// .eslintrc.js（カスタムルール）
module.exports = {
  rules: {
    'no-restricted-syntax': [
      'error',
      {
        selector: 'Literal[value=/Smart Garage/i]',
        message: 'Use "garage log" instead of "Smart Garage"',
      },
    ],
  },
};
```

**優先度**: 🟢 SEO/ブランド統一

---

#### 15. 章重複/名称ゆらぎがレビュアー時間を食う（運用面）

**指摘内容:**
- "3.6"重複・ページ名ゆらぎは**PRレビューコスト**を上げる

**提案:**
- ドキュメントLinter（簡易スクリプト）で章番号と用語を**機械検査**
- PRテンプレに"用語差分チェックを通すこと"を追加

**現状:**
- SPECIFICATION.mdに「3.6」が2回出現（line 139, 190）

**実装案:**
```bash
#!/bin/bash
# scripts/lint-docs.sh

# 章番号の重複チェック
echo "Checking for duplicate section numbers..."
grep -Eo '^#{2,3} [0-9]+\.[0-9]+' SPECIFICATION.md | sort | uniq -d

# 用語の一貫性チェック
echo "Checking for naming inconsistencies..."
grep -i "Smart Garage" SPECIFICATION.md && echo "❌ Found 'Smart Garage' - use 'garage log' instead"
grep "マイカーページ\|車両データページ" SPECIFICATION.md | wc -l

# 出力
if [ $? -eq 0 ]; then
  echo "✅ Documentation linting passed"
else
  echo "❌ Documentation linting failed"
  exit 1
fi
```

**優先度**: 🟢 レビュー効率化

---

#### 16. 変更の可観測性（リリース判定）（運用面）

**指摘内容:**
- "やって良かったか"のKPIはあるが、**ダッシュボード深リンクのクリック→保存まで**など**一連のファネル**が欠ける

**提案:**
- `dash_deeplink_clicked → modal_opened → form_saved → proposal_resolved`で**1本のファネル**に

**現状:**
- アナリティクスイベントは実装済み
- ファネル追跡は部分的

**実装案:**
```typescript
// src/lib/analytics.ts
export function logDashboardDeepLinkClicked(from: string, to: string, carId: string) {
  logEvent('dash_deeplink_clicked', { from, to, carId, timestamp: Date.now() });
}

export function logModalOpened(modalType: string, source: string, carId: string) {
  logEvent('modal_opened', { modalType, source, carId, timestamp: Date.now() });
}

export function logFormSaved(formType: string, source: string, carId: string, sessionId: string) {
  logEvent('form_saved', { formType, source, carId, sessionId, timestamp: Date.now() });
}

export function logProposalResolved(proposalId: string, carId: string, sessionId: string) {
  logEvent('proposal_resolved', { proposalId, carId, sessionId, timestamp: Date.now() });
}

// ファネル追跡用のセッションID生成
export function createFunnelSession(): string {
  return `funnel_${Date.now()}_${Math.random().toString(36).substring(7)}`;
}
```

**優先度**: 🟢 データドリブン意思決定

---

### 🔵 優先度：検討中（ビジネス判断必要）

#### 3. メンテ提案の"信頼度"がブラックボックス（プロダクト面）

**ステータス**: 📝 **完全UIコード作成済み**（FEEDBACK_IMPLEMENTATION_PLAN.md参照）

**次のアクション**: UIコンポーネント実装（NextMaintenanceSuggestion.tsx更新）

---

#### 1. 価値の一次体験が分散している（プロダクト面）

**ステータス**: 📝 **完全実装ガイド作成済み**（FEEDBACK_IMPLEMENTATION_PLAN.md参照）

**次のアクション**: オンボーディングページ作成（`src/app/onboarding/page.tsx`）

---

#### 10. Firestoreトリガの書き込み爆発（技術面）

**ステータス**: 📝 **完全Cloud Functions例作成済み**（FEEDBACK_IMPLEMENTATION_PLAN.md参照）

**次のアクション**: Cloud Functions実装（`functions/src/index.ts`更新）

---

## 📋 優先度別アクションプラン

### 今週中（🔥 高優先度）

1. **保険OCR画像の90日自動削除**
   - Cloud Scheduler設定
   - 削除ジョブ実装
   - 影響度: セキュリティリスク削減

2. **OCR初回無料体験の実装**
   - クォータチェック追加
   - ペイウォール発火タイミング調整
   - 影響度: CVR向上

3. **共有トークン失効機構**
   - revokedAt、accessCount追加
   - 閲覧回数上限実装
   - 影響度: セキュリティ強化

---

### 来週（🟡 中優先度）

4. **マイカーページの広告非表示**
   - 設定ファイル1行変更
   - 影響度: 意思決定面のクリーン化

5. **E2Eテストのモック化**
   - 認証モック実装
   - Happy Path緑化
   - 影響度: CI/CD品質向上

---

### 計画的に（🟢 低優先度）

6. **ドキュメントLinter**
   - 章番号重複チェック
   - 用語一貫性チェック

7. **ファネル追跡強化**
   - セッションID連携
   - ファネルイベント追加

8. **Stripe運用細目**
   - Webhook冪等性
   - 税率設定明記

9. **PWAオフライン同期基盤**
   - IndexedDBキュー
   - 楽観ロック

---

## 🎯 次に着手すべき項目（推奨順）

| 順位 | 項目 | 理由 |
|------|------|------|
| 1️⃣ | **保険OCR画像90日自動削除** | セキュリティリスク、GDPR対応 |
| 2️⃣ | **OCR初回無料体験** | CVR直撃、ベイト感削減 |
| 3️⃣ | **共有トークン失効機構** | セキュリティ強化、One-time対応 |
| 4️⃣ | **マイカー広告非表示** | 意思決定面クリーン化（1行変更） |
| 5️⃣ | **E2Eモック化** | CI/CD品質向上 |

---

**最終更新:** 2025-11-10  
**残タスク:** 9項目  
**うち高優先度:** 3項目（#2, #7, #12）


