import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  getDocs, 
  getDoc, 
  query, 
  where, 
  orderBy, 
  limit,
  Timestamp,
  writeBatch
} from 'firebase/firestore';
import { db } from './firebase';
import { 
  Customization, 
  CustomizationInput, 
  CustomizationMedia, 
  CustomizationMeta,
  CustomStatus,
  CustomCategory 
} from '@/types';
import { logAudit } from './auditLog';
import { logCustomizationCreated } from './analytics';
// 統一変換ヘルパーをインポート（唯一の経路）
import { toTimestamp, normalizeDeletedAt } from './converters';

const CUSTOMIZATIONS_COLLECTION = 'customizations';
const CUSTOMIZATION_MEDIA_COLLECTION = 'customization_media';
const CUSTOMIZATION_META_COLLECTION = 'customizations_meta';

// カスタマイズの追加
export async function addCustomization(
  userId: string, 
  carId: string, 
  customization: Omit<CustomizationInput, 'carId'>
): Promise<string> {
  try {
    console.log('Adding customization with data:', {
      userId,
      carId,
      customization: {
        ...customization,
        carId,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      }
    });

    // Firestoreのコレクションパスを構築
    const collectionPath = `users/${userId}/cars/${carId}/${CUSTOMIZATIONS_COLLECTION}`;
    console.log('Collection path:', collectionPath);

    // 統一変換ヘルパーを使用（唯一の経路）
    const cleanData: any = {
      ...customization,
      date: toTimestamp(customization.date),  // Date/Timestamp統一
      carId,
    };
    
    // undefinedをnullに変換
    Object.keys(cleanData).forEach(key => {
      if (cleanData[key] === undefined) {
        cleanData[key] = null;
      }
    });
    
    const cleanCustomization = {
      ...cleanData,
      userId: userId,       // セキュリティルールで必須
      ownerUid: userId,
      createdBy: userId,
      updatedBy: userId,
      deletedAt: null,      // 未削除はnullで統一
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };

    const docRef = await addDoc(
      collection(db, 'users', userId, 'cars', carId, CUSTOMIZATIONS_COLLECTION),
      cleanCustomization
    );
    
    console.log('Customization added successfully with ID:', docRef.id);
    
    // 監査ログを記録
    await logAudit({
      entityType: 'customization',
      entityId: docRef.id,
      action: 'create',
      after: cleanCustomization
    });
    
    // アナリティクスイベントを記録
    logCustomizationCreated(carId, customization.categories);
    
    // メタデータを更新（エラーが発生してもカスタマイズの保存は成功とする）
    try {
      await updateCustomizationMeta(userId, carId);
    } catch (metaError) {
      console.warn('Failed to update customization meta:', metaError);
    }
    
    return docRef.id;
  } catch (error) {
    console.error('Error adding customization:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      code: (error as any)?.code,
      stack: error instanceof Error ? error.stack : undefined
    });
    throw error;
  }
}

// カスタマイズの更新
export async function updateCustomization(
  userId: string,
  carId: string,
  customizationId: string,
  updates: Partial<CustomizationInput>
): Promise<void> {
  try {
    // 統一変換ヘルパーを使用（唯一の経路）
    const cleanData: any = {
      ...updates,
    };
    
    // dateフィールドがある場合は変換
    if (cleanData.date) {
      cleanData.date = toTimestamp(cleanData.date);
    }
    
    // undefinedをnullに変換
    Object.keys(cleanData).forEach(key => {
      if (cleanData[key] === undefined) {
        cleanData[key] = null;
      }
    });
    
    const cleanUpdates = {
      ...cleanData,
      userId: userId,       // セキュリティルールで必須
      updatedBy: userId,
      updatedAt: Timestamp.now(),
    };

    const docRef = doc(db, 'users', userId, 'cars', carId, CUSTOMIZATIONS_COLLECTION, customizationId);
    await updateDoc(docRef, cleanUpdates);
    
    // 監査ログを記録
    await logAudit({
      entityType: 'customization',
      entityId: customizationId,
      action: 'update',
      after: cleanUpdates
    });
    
    // メタデータを更新
    await updateCustomizationMeta(userId, carId);
  } catch (error) {
    console.error('Error updating customization:', error);
    throw error;
  }
}

// カスタマイズの削除（論理削除）
export async function deleteCustomization(
  userId: string,
  carId: string,
  customizationId: string
): Promise<void> {
  try {
    const docRef = doc(db, 'users', userId, 'cars', carId, CUSTOMIZATIONS_COLLECTION, customizationId);
    
    // 論理削除を実装
    await updateDoc(docRef, {
      userId: userId,       // セキュリティルールで必須
      deletedAt: Timestamp.now(),
      updatedBy: userId,
      updatedAt: Timestamp.now(),
    });
    
    // 監査ログを記録
    await logAudit({
      entityType: 'customization',
      entityId: customizationId,
      action: 'delete'
    });
    
    // 物理削除が必要な場合はコメントアウトを解除
    // await deleteDoc(docRef);
    
    // メタデータを更新
    await updateCustomizationMeta(userId, carId);
  } catch (error) {
    console.error('Error deleting customization:', error);
    throw error;
  }
}

// カスタマイズ一覧の取得
export async function getCustomizations(
  userId: string,
  carId: string,
  options?: {
    status?: CustomStatus;
    categories?: CustomCategory[];
    limitCount?: number;
  }
): Promise<Customization[]> {
  try {
    console.log('Getting customizations for:', { userId, carId, options });
    
    // まず基本的なクエリで取得（インデックスエラーを避けるため）
    let q = query(
      collection(db, 'users', userId, 'cars', carId, CUSTOMIZATIONS_COLLECTION)
    );

    // フィルタリングは後でクライアント側で行う
    const querySnapshot = await getDocs(q);
    console.log('Raw query result:', querySnapshot.docs.length, 'documents');
    
    let customizations = querySnapshot.docs
      .filter(doc => {
        // 論理削除されたレコードを除外
        return !doc.data().deletedAt;
      })
      .map(doc => ({
        id: doc.id,
        ...doc.data(),
        date: doc.data().date,  // Timestampをそのまま返す
        deletedAt: normalizeDeletedAt(doc.data().deletedAt),  // 統一ヘルパー使用
        createdAt: doc.data().createdAt,
        updatedAt: doc.data().updatedAt,
      })) as Customization[];

    // クライアント側でフィルタリングとソート（Timestampの秒数で比較）
    customizations = customizations.sort((a, b) => {
      const aSeconds = a.date?.seconds || 0;
      const bSeconds = b.date?.seconds || 0;
      return bSeconds - aSeconds;
    });

    if (options?.status) {
      customizations = customizations.filter(c => c.status === options.status);
    }

    if (options?.categories && options.categories.length > 0) {
      customizations = customizations.filter(c => 
        c.categories.some(category => options.categories!.includes(category))
      );
    }

    if (options?.limitCount) {
      customizations = customizations.slice(0, options.limitCount);
    }

    console.log('Filtered customizations:', customizations.length);
    return customizations;
  } catch (error) {
    console.error('Error getting customizations:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      code: (error as any)?.code,
      stack: error instanceof Error ? error.stack : undefined
    });
    throw error;
  }
}

// 特定のカスタマイズの取得
export async function getCustomization(
  userId: string,
  carId: string,
  customizationId: string
): Promise<Customization | null> {
  try {
    const docRef = doc(db, 'users', userId, 'cars', carId, CUSTOMIZATIONS_COLLECTION, customizationId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return {
        id: docSnap.id,
        ...docSnap.data(),
        date: docSnap.data().date,  // Timestampをそのまま返す
        deletedAt: docSnap.data().deletedAt || null,  // null統一
        createdAt: docSnap.data().createdAt,
        updatedAt: docSnap.data().updatedAt,
      } as Customization;
    }
    
    return null;
  } catch (error) {
    console.error('Error getting customization:', error);
    throw error;
  }
}

// カスタマイズメタデータの更新
export async function updateCustomizationMeta(
  userId: string,
  carId: string
): Promise<void> {
  try {
    const customizations = await getCustomizations(userId, carId);
    
    const totalCostJpy = customizations.reduce((sum, c) => {
      const partsCost = c.partsCostJpy || 0;
      const laborCost = c.laborCostJpy || 0;
      const otherCost = c.otherCostJpy || 0;
      return sum + partsCost + laborCost + otherCost;
    }, 0);

    const currentYear = new Date().getFullYear();
    const yearToDateCostJpy = customizations
      .filter(c => {
        // Timestamp → Date変換して年を取得
        const dateObj = c.date?.toDate ? c.date.toDate() : new Date();
        return dateObj.getFullYear() === currentYear;
      })
      .reduce((sum, c) => {
        const partsCost = c.partsCostJpy || 0;
        const laborCost = c.laborCostJpy || 0;
        const otherCost = c.otherCostJpy || 0;
        return sum + partsCost + laborCost + otherCost;
      }, 0);

    const countInstalled = customizations.filter(c => c.status === 'installed').length;

    // カテゴリ別費用の集計
    const categoryCosts: { [key: string]: number } = {};
    customizations.forEach(c => {
      c.categories.forEach(category => {
        const partsCost = c.partsCostJpy || 0;
        const laborCost = c.laborCostJpy || 0;
        const otherCost = c.otherCostJpy || 0;
        const totalCost = partsCost + laborCost + otherCost;
        
        categoryCosts[category] = (categoryCosts[category] || 0) + totalCost;
      });
    });

    const topCategories = Object.entries(categoryCosts)
      .map(([key, cost]) => ({ key, cost }))
      .sort((a, b) => b.cost - a.cost)
      .slice(0, 5);

    const metaData: CustomizationMeta = {
      carId,
      totalCostJpy,
      yearToDateCostJpy,
      countInstalled,
      topCategories,
    };

    const metaDocRef = doc(db, 'users', userId, 'cars', carId, CUSTOMIZATION_META_COLLECTION, 'meta');
    await updateDoc(metaDocRef, metaData as any).catch(async () => {
      // ドキュメントが存在しない場合は作成
      await addDoc(collection(db, 'users', userId, 'cars', carId, CUSTOMIZATION_META_COLLECTION), metaData as any);
    });
  } catch (error) {
    console.error('Error updating customization meta:', error);
    throw error;
  }
}

// カスタマイズメタデータの取得
export async function getCustomizationMeta(
  userId: string,
  carId: string
): Promise<CustomizationMeta | null> {
  try {
    const metaDocRef = doc(db, 'users', userId, 'cars', carId, CUSTOMIZATION_META_COLLECTION, 'meta');
    const docSnap = await getDoc(metaDocRef);
    
    if (docSnap.exists()) {
      return docSnap.data() as CustomizationMeta;
    }
    
    return null;
  } catch (error) {
    console.error('Error getting customization meta:', error);
    throw error;
  }
}

// カテゴリの日本語名マッピング
export const CATEGORY_LABELS: Record<CustomCategory, string> = {
  exterior: '外装',
  interior: '内装',
  intake: '吸気',
  exhaust: '排気',
  ecu: 'ECU/チューニング',
  suspension: '足回り(サス/アーム)',
  brake: 'ブレーキ',
  reinforcement: 'ボディ補強',
  drivetrain: '駆動系(クラッチ/デフ)',
  tire_wheel: 'タイヤ/ホイール',
  electrical: '電装(ライト/ドラレコ等)',
  audio: 'オーディオ/ナビ',
  safety: 'セーフティ',
  other: 'その他',
};

// ステータスの日本語名マッピング
export const STATUS_LABELS: Record<CustomStatus, string> = {
  planned: '計画中',
  ordered: '注文済',
  installed: '取付済',
  removed_temp: '一時取外し',
  removed: '完全撤去',
};

// ステータスの色マッピング
export const STATUS_COLORS: Record<CustomStatus, string> = {
  planned: 'bg-gray-100 text-gray-800',
  ordered: 'bg-blue-100 text-blue-800',
  installed: 'bg-green-100 text-green-800',
  removed_temp: 'bg-yellow-100 text-yellow-800',
  removed: 'bg-red-100 text-red-800',
};
