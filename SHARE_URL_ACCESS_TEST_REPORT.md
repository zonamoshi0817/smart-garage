# /s/{slug} シークレット閲覧テスト結果

## /s シークレット閲覧テスト結果

- **URL**: `/s/{slug}`
- **シークレットで閲覧可能**: **理論的にはYes**（コード分析による）
- **画面結果**: 正常表示（`visibility !== 'disabled'` の場合）

### 原因レイヤー分析

#### Next.jsガード: **無**
**根拠抜粋**:
```typescript
// src/app/(app)/s/[slug]/page.tsx:108-117
export default async function SalePublicPageRoute({ params }: PageProps) {
  const { slug } = await params;
  const saleProfile = await getSaleProfileBySlug(slug);
  
  // 存在しない、またはdisabledの場合は404
  if (!saleProfile || saleProfile.visibility === 'disabled') {
    notFound();
  }
  // 認証チェックなし、リダイレクトなし
}
```

- Server Component で実装されており、認証チェックやリダイレクト処理は存在しない
- `visibility === 'disabled'` の場合のみ `notFound()` を返す

#### Firestore Rules: **無（Admin SDK使用のためバイパス）**
**根拠抜粋**:
```typescript
// src/lib/saleProfile.ts:91-97
export async function getSaleProfileBySlug(slug: string): Promise<SaleProfile | null> {
  const db = getAdminFirestore(); // Firebase Admin SDK
  const snapshot = await db
    .collection('saleProfiles')
    .where('slug', '==', slug)
    .limit(1)
    .get();
  // ...
}
```

- `getSaleProfileBySlug()` は Firebase Admin SDK を使用しているため、Firestore Security Rules をバイパスする
- サーバーサイドで実行されるため、クライアントの認証状態に関係なくデータを取得可能

**参考: Firestore Rules（クライアントSDK用）**:
```javascript
// firestore.rules:200-203
match /saleProfiles/{saleProfileId} {
  // 公開読み取り: visibilityがpublicまたはunlistedの場合のみ、またはオーナーは常に読み取り可能
  allow read: if resource.data.visibility in ['public', 'unlisted']
              || (isSignedIn() && resource.data.ownerUid == request.auth.uid);
}
```

- クライアントSDK用のルールでは `visibility` が `'public'` または `'unlisted'` の場合、未ログインでも読み取り可能
- ただし、Admin SDKはこのルールをバイパスするため、`visibility` の値に関係なくサーバー側で読み取り可能

#### その他: **データ側条件**
- `saleProfile.visibility === 'disabled'` の場合は404を返す（115行目）
- `vehicle.activeShareProfileIds` と `saleProfile.id` の一致チェックがある（134-142行目）
- これらの条件を満たさない場合は404を返すが、認証は不要

## /c シークレット閲覧テスト結果（代替）

- **URL**: `/c/{carId}`
- **シークレットで閲覧可能**: **理論的にはNo**（コード分析による）
- **前提**: `car.isPublic = true` が必要だが、Firestore Rules でブロックされる可能性が高い

### 原因レイヤー分析

#### Next.jsガード: **無（ただしClient Component）**
**根拠抜粋**:
```typescript
// src/app/(app)/c/[carId]/page.tsx:9-49
export default function PublicCarPage() {
  // Client Component（'use client'）
  // 認証チェックなし、リダイレクトなし
  // ただし、getPublicCarData() がクライアントSDKを使用
}
```

- Client Component で実装されており、Next.js側の認証ガードはない
- ただし、データ取得はクライアントSDKを使用するため、Firestore Rules の影響を受ける

#### Firestore Rules: **有（クライアントSDK使用のため）**
**根拠抜粋**:
```typescript
// src/lib/publicCars.ts:38-48
const publicCarRef = doc(db, "publicCars", carId);
const publicCarSnap = await getDoc(publicCarRef); // クライアントSDK

// 元の車両データを取得
const carRef = doc(db, "users", publicCarData.userId, "cars", carId);
const carSnap = await getDoc(carRef); // クライアントSDK
```

- `getPublicCarData()` はクライアントSDKを使用しているため、Firestore Rules の影響を受ける
- `publicCars` コレクションのルールが `firestore.rules` に定義されていないため、デフォルトで拒否される可能性がある
- `users/{userId}/cars/{carId}` の読み取りは `isOwner(userId)` が必要（firestore.rules:57行目）

**Firestore Rules（該当箇所）**:
```javascript
// firestore.rules:56-67
match /cars/{carId} {
  allow read: if isOwner(userId); // isOwner() = isSignedIn() && request.auth.uid == userId
  // ...
}
```

- `isOwner(userId)` は `isSignedIn() && request.auth.uid == userId` を意味する
- 未ログイン状態では `isSignedIn()` が `false` になるため、読み取り不可

#### その他: **データ側条件**
- `car.isPublic === true` のチェックがある（58行目）
- ただし、Firestore Rules でブロックされるため、このチェックに到達する前にエラーになる可能性が高い

## 結論

### 共有URLの最優先として /s を採用できる: **Yes**

**理由**:
1. `/s/{slug}` は Server Component + Admin SDK を使用しているため、未ログインでも閲覧可能
2. Next.js側の認証ガードは存在しない
3. Firestore Rules をバイパスするため、`visibility` の値に関係なくサーバー側でデータを取得可能
4. ただし、`visibility === 'disabled'` の場合は404を返す（意図的な非公開設定）

### Noの場合の推奨（現状は不要だが、参考情報）

**案A: /s を公開閲覧可能にする（公開ShareProfileのみ）**
- 現状、`/s/{slug}` は既に公開閲覧可能（Admin SDK使用のため）
- `visibility === 'disabled'` の場合のみ404を返すため、意図的な非公開設定は機能している
- **推奨**: 現状の実装で問題なし

**案B: isPublic の場合は /c を優先し、/s はログイン向けにする**
- `/c/{carId}` は Firestore Rules でブロックされるため、未ログインでは使用不可
- `/s/{slug}` の方が確実に未ログインで閲覧可能
- **推奨**: 現状の優先順位（`/s/{slug}` を最優先）が適切

**案C: 共有時に公開ページ生成を必須にする（非推奨）**
- 現状、`activeShareProfileIds.normal` があれば `/s/{slug}` を生成可能
- 追加の実装は不要
- **推奨**: 現状の実装で問題なし

## 実テスト推奨事項

コード分析では `/s/{slug}` は未ログインで閲覧可能と判断されますが、以下の実テストを推奨します：

1. **シークレットウィンドウで `/s/{slug}` を開く**
   - 正常に表示されることを確認
   - コンソールエラーがないことを確認
   - ネットワークタブで Firestore アクセスエラーがないことを確認

2. **`visibility === 'disabled'` の ShareProfile でテスト**
   - 404が返されることを確認

3. **`visibility === 'unlisted'` の ShareProfile でテスト**
   - 正常に表示されることを確認（noindex設定も確認）

4. **`/c/{carId}` でテスト（参考）**
   - `permission-denied` エラーが発生することを確認（予想される動作）
