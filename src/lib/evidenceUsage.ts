/**
 * 証憑アップロード利用量管理
 * Firestoreのusers/{uid}/usage/{yyyyMM}コレクションで月次利用量を管理
 */

"use client";
import { db, auth } from "@/lib/firebase";
import {
  collection,
  doc,
  getDoc,
  setDoc,
  runTransaction,
  serverTimestamp,
} from "firebase/firestore";
import { PREMIUM_LIMITS } from "@/lib/premium";
import { isPremiumPlan } from "@/lib/plan";
import { EvidenceLimitExceededError } from "@/lib/errors";

/**
 * 現在月のyyyyMM形式の文字列を取得
 */
function getCurrentMonthId(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}${month}`;
}

/**
 * 証憑アップロード制限をチェック
 * @param userId ユーザーID
 * @param userPlan ユーザープラン
 * @param fileSize ファイルサイズ（バイト）
 * @param recordId 記録ID（1記録あたりの制限チェック用、将来対応）
 * @returns アップロード許可可否と理由
 */
export async function checkEvidenceUploadLimit(
  userId: string,
  userPlan: string,
  fileSize: number,
  recordId?: string
): Promise<{ allowed: boolean; reason?: string; limitType?: 'monthly' | 'per_record' | 'bytes' }> {
  // プレミアムユーザーは常に許可
  if (isPremiumPlan(userPlan)) {
    return { allowed: true };
  }

  // 認証チェック
  const u = auth.currentUser;
  if (!u || u.uid !== userId) {
    console.error('User authentication check failed:', { userId, currentUserId: u?.uid });
    return {
      allowed: false,
      reason: '認証エラーが発生しました。再度ログインしてください。',
      limitType: 'monthly'
    };
  }

  const limits = PREMIUM_LIMITS.FREE;
  const monthId = getCurrentMonthId();
  const usageRef = doc(db, 'users', userId, 'usage', monthId);

  try {
    const result = await runTransaction(db, async (transaction) => {
      const usageDoc = await transaction.get(usageRef);
      
      const currentCount = usageDoc.exists() ? (usageDoc.data().evidenceUploadsCount || 0) : 0;
      const currentBytes = usageDoc.exists() ? (usageDoc.data().evidenceTotalBytes || 0) : 0;

      // 月次アップロード数制限チェック
      if (limits.max_evidence_uploads_per_month !== -1) {
        if (currentCount >= limits.max_evidence_uploads_per_month) {
          return {
            allowed: false,
            reason: `今月の証憑アップロード上限（${limits.max_evidence_uploads_per_month}枚）に達しています。プレミアムプランにアップグレードすると無制限でアップロードできます。`,
            limitType: 'monthly' as const
          };
        }
      }

      // 1記録あたりの制限チェック（将来対応、現在は未実装）
      // if (limits.max_evidence_uploads_per_record !== -1 && recordId) {
      //   // 記録ごとの制限チェックロジック
      // }

      // 合計バイト数制限チェック（将来対応、現在は未実装）
      // if (limits.max_evidence_total_bytes !== -1) {
      //   if (currentBytes + fileSize > limits.max_evidence_total_bytes) {
      //     return {
      //       allowed: false,
      //       reason: `証憑の合計サイズ上限（${Math.round(limits.max_evidence_total_bytes / 1024 / 1024)}MB）に達しています`,
      //       limitType: 'bytes' as const
      //     };
      //   }
      // }

      return { allowed: true };
    });

    return result;
  } catch (error) {
    console.error('Failed to check evidence upload limit:', error);
    console.error('Error details:', {
      code: (error as any)?.code,
      message: error instanceof Error ? error.message : 'Unknown error',
      userId,
      monthId: getCurrentMonthId()
    });
    // エラー時は安全のため許可しない
    return {
      allowed: false,
      reason: '利用量の確認に失敗しました。しばらくしてから再度お試しください。',
      limitType: 'monthly'
    };
  }
}

/**
 * 証憑アップロード利用量を増分
 * @param userId ユーザーID
 * @param fileSize ファイルサイズ（バイト）
 */
export async function incrementEvidenceUsage(
  userId: string,
  fileSize: number
): Promise<void> {
  // 認証チェック
  const u = auth.currentUser;
  if (!u || u.uid !== userId) {
    console.error('User authentication check failed:', { userId, currentUserId: u?.uid });
    throw new Error('認証エラーが発生しました。再度ログインしてください。');
  }

  const monthId = getCurrentMonthId();
  const usageRef = doc(db, 'users', userId, 'usage', monthId);

  try {
    await runTransaction(db, async (transaction) => {
      const usageDoc = await transaction.get(usageRef);
      
      const currentCount = usageDoc.exists() ? (usageDoc.data().evidenceUploadsCount || 0) : 0;
      const currentBytes = usageDoc.exists() ? (usageDoc.data().evidenceTotalBytes || 0) : 0;

      if (usageDoc.exists()) {
        // 既存ドキュメントを更新
        transaction.update(usageRef, {
          evidenceUploadsCount: currentCount + 1,
          evidenceTotalBytes: currentBytes + fileSize,
          updatedAt: serverTimestamp(),
        });
      } else {
        // 新規ドキュメントを作成
        transaction.set(usageRef, {
          evidenceUploadsCount: 1,
          evidenceTotalBytes: fileSize,
          updatedAt: serverTimestamp(),
          createdAt: serverTimestamp(),
        });
      }
    });
  } catch (error) {
    console.error('Failed to increment evidence usage:', error);
    console.error('Error details:', {
      code: (error as any)?.code,
      message: error instanceof Error ? error.message : 'Unknown error',
      userId,
      monthId: getCurrentMonthId(),
      fileSize
    });
    // エラーを再スロー（呼び出し元で処理）
    throw new Error(`利用量の更新に失敗しました: ${error instanceof Error ? error.message : '不明なエラー'}`);
  }
}
