import { db, auth } from './firebase';
import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  onSnapshot, 
  query, 
  orderBy, 
  where,
  serverTimestamp,
  DocumentReference,
  Timestamp
} from 'firebase/firestore';

// 保険契約の型定義
export interface InsurancePolicy {
  id?: string;
  provider: string; // 保険会社名
  policyNumber: string; // 証券番号
  carId: string; // 車両ID
  startDate: Date;
  endDate: Date; // 満期日
  paymentCycle: 'annual' | 'monthly';
  premiumAmount: number; // 保険料（税込円）
  coverages: {
    bodilyInjury: { limit: string }; // 対人無制限等
    propertyDamage: { limit: string }; // 対物無制限等
    personalInjury: { limit: string }; // 人身傷害
    vehicle: { 
      type: 'AG' | 'AC' | 'NONE'; // AG: 車両保険、AC: 車両保険（免責あり）、NONE: なし
      deductible: string; // 免責金額
    };
    riders: string[]; // 特約（弁護士特約等）
  };
  drivers: {
    ageLimit: string; // 年齢制限
    familyOnly: boolean; // 家族限定
  };
  usage: {
    purpose: 'private' | 'business'; // 使用目的
    annualMileageKm: number; // 年間走行距離
  };
  notes: string;
  createdAt: Date;
  updatedAt: Date;
}

// 事故記録の型定義
export interface InsuranceClaim {
  id?: string;
  policyId: string; // 保険契約ID
  occurredAt: Date; // 事故発生日時
  location: string; // 事故場所
  description: string; // 事故状況
  policeReportNo: string; // 警察届出番号
  insurer: string; // 保険会社
  handler: string; // 担当者
  status: 'reported' | 'investigating' | 'paid' | 'denied'; // 進捗ステータス
  paidAmount: number; // 支払金額
  photos: string[]; // 写真URL配列
  notes: string;
  createdAt: Date;
  updatedAt: Date;
}

// 通知設定の型定義
export interface InsuranceNotification {
  id?: string;
  policyId: string;
  type: 'policy_expiry';
  sendAt: Date;
  sent: boolean;
  createdAt: Date;
}

// 証券ファイルの型定義
export interface InsuranceFile {
  id?: string;
  policyId: string;
  url: string; // Storage URL
  mimeType: string;
  size: number;
  createdAt: Date;
}

// 保険契約の作成
export async function addInsurancePolicy(policy: Omit<InsurancePolicy, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  const user = auth.currentUser;
  if (!user) throw new Error('ユーザーが認証されていません');

  const policyData = {
    ...policy,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const docRef = await addDoc(collection(db, 'users', user.uid, 'policies'), policyData);
  
  // 通知を生成
  try {
    const { generatePolicyExpiryNotifications } = await import('./insuranceNotifications');
    const newPolicy = { ...policy, id: docRef.id } as InsurancePolicy;
    await generatePolicyExpiryNotifications(newPolicy);
  } catch (error) {
    console.error('Error generating notifications for new policy:', error);
  }
  
  return docRef.id;
}

// 保険契約の更新
export async function updateInsurancePolicy(
  policyId: string, 
  updates: Partial<Omit<InsurancePolicy, 'id' | 'createdAt' | 'updatedAt'>>
): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error('ユーザーが認証されていません');

  const updateData = {
    ...updates,
    updatedAt: serverTimestamp(),
  };

  await updateDoc(doc(db, 'users', user.uid, 'policies', policyId), updateData);
  
  // 満期日が変更された場合は通知を再生成
  if (updates.endDate) {
    try {
      const { updatePolicyNotifications } = await import('./insuranceNotifications');
      const updatedPolicy = { id: policyId, endDate: updates.endDate } as InsurancePolicy;
      await updatePolicyNotifications(updatedPolicy);
    } catch (error) {
      console.error('Error updating notifications for policy:', error);
    }
  }
}

// 保険契約の削除
export async function removeInsurancePolicy(policyId: string): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error('ユーザーが認証されていません');

  // 関連する通知を削除
  try {
    const { deletePolicyNotifications } = await import('./insuranceNotifications');
    await deletePolicyNotifications(policyId);
  } catch (error) {
    console.error('Error deleting notifications for policy:', error);
  }

  await deleteDoc(doc(db, 'users', user.uid, 'policies', policyId));
}

// 保険契約の監視
export function watchInsurancePolicies(callback: (policies: InsurancePolicy[]) => void): () => void {
  const user = auth.currentUser;
  if (!user) {
    console.log('No user found, cannot watch insurance policies');
    return () => {};
  }

  console.log('Setting up insurance policies watcher for user:', user.uid);
  
  const q = query(
    collection(db, 'users', user.uid, 'policies'),
    orderBy('endDate', 'asc')
  );

  return onSnapshot(q, (snapshot) => {
    console.log('Insurance policies snapshot received:', snapshot.size, 'policies');
    
    const policies: InsurancePolicy[] = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      policies.push({
        id: doc.id,
        ...data,
        startDate: data.startDate?.toDate() || new Date(),
        endDate: data.endDate?.toDate() || new Date(),
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
      } as InsurancePolicy);
    });
    
    console.log('Processed insurance policies:', policies.length);
    callback(policies);
  }, (error) => {
    console.error('Error watching insurance policies:', error);
  });
}

// 特定車両の保険契約を取得
export function watchInsurancePoliciesByCar(
  carId: string, 
  callback: (policies: InsurancePolicy[]) => void
): () => void {
  const user = auth.currentUser;
  if (!user) {
    console.log('No user found, cannot watch insurance policies by car');
    return () => {};
  }

  console.log('Setting up insurance policies watcher for car:', carId);
  
  const q = query(
    collection(db, 'users', user.uid, 'policies'),
    where('carId', '==', carId),
    orderBy('endDate', 'asc')
  );

  return onSnapshot(q, (snapshot) => {
    console.log('Insurance policies by car snapshot received:', snapshot.size, 'policies');
    
    const policies: InsurancePolicy[] = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      policies.push({
        id: doc.id,
        ...data,
        startDate: data.startDate?.toDate() || new Date(),
        endDate: data.endDate?.toDate() || new Date(),
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
      } as InsurancePolicy);
    });
    
    console.log('Processed insurance policies by car:', policies.length);
    callback(policies);
  }, (error) => {
    console.error('Error watching insurance policies by car:', error);
  });
}

// 事故記録の作成
export async function addInsuranceClaim(claim: Omit<InsuranceClaim, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  const user = auth.currentUser;
  if (!user) throw new Error('ユーザーが認証されていません');

  const claimData = {
    ...claim,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const docRef = await addDoc(collection(db, 'users', user.uid, 'claims'), claimData);
  return docRef.id;
}

// 事故記録の更新
export async function updateInsuranceClaim(
  claimId: string, 
  updates: Partial<Omit<InsuranceClaim, 'id' | 'createdAt' | 'updatedAt'>>
): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error('ユーザーが認証されていません');

  const updateData = {
    ...updates,
    updatedAt: serverTimestamp(),
  };

  await updateDoc(doc(db, 'users', user.uid, 'claims', claimId), updateData);
}

// 事故記録の削除
export async function removeInsuranceClaim(claimId: string): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error('ユーザーが認証されていません');

  await deleteDoc(doc(db, 'users', user.uid, 'claims', claimId));
}

// 事故記録の監視
export function watchInsuranceClaims(callback: (claims: InsuranceClaim[]) => void): () => void {
  const user = auth.currentUser;
  if (!user) {
    console.log('No user found, cannot watch insurance claims');
    return () => {};
  }

  console.log('Setting up insurance claims watcher for user:', user.uid);
  
  const q = query(
    collection(db, 'users', user.uid, 'claims'),
    orderBy('occurredAt', 'desc')
  );

  return onSnapshot(q, (snapshot) => {
    console.log('Insurance claims snapshot received:', snapshot.size, 'claims');
    
    const claims: InsuranceClaim[] = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      claims.push({
        id: doc.id,
        ...data,
        occurredAt: data.occurredAt?.toDate() || new Date(),
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
      } as InsuranceClaim);
    });
    
    console.log('Processed insurance claims:', claims.length);
    callback(claims);
  }, (error) => {
    console.error('Error watching insurance claims:', error);
  });
}

// 特定保険契約の事故記録を取得
export function watchInsuranceClaimsByPolicy(
  policyId: string, 
  callback: (claims: InsuranceClaim[]) => void
): () => void {
  const user = auth.currentUser;
  if (!user) {
    console.log('No user found, cannot watch insurance claims by policy');
    return () => {};
  }

  console.log('Setting up insurance claims watcher for policy:', policyId);
  
  const q = query(
    collection(db, 'users', user.uid, 'claims'),
    where('policyId', '==', policyId),
    orderBy('occurredAt', 'desc')
  );

  return onSnapshot(q, (snapshot) => {
    console.log('Insurance claims by policy snapshot received:', snapshot.size, 'claims');
    
    const claims: InsuranceClaim[] = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      claims.push({
        id: doc.id,
        ...data,
        occurredAt: data.occurredAt?.toDate() || new Date(),
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
      } as InsuranceClaim);
    });
    
    console.log('Processed insurance claims by policy:', claims.length);
    callback(claims);
  }, (error) => {
    console.error('Error watching insurance claims by policy:', error);
  });
}

// 保険料の月次集計
export function calculateMonthlyInsuranceCosts(policies: InsurancePolicy[]): { [key: string]: number } {
  const monthlyCosts: { [key: string]: number } = {};
  
  policies.forEach(policy => {
    const year = policy.startDate.getFullYear();
    const month = policy.startDate.getMonth() + 1;
    const monthKey = `${year}-${String(month).padStart(2, '0')}`;
    
    if (policy.paymentCycle === 'annual') {
      // 年払いの場合、月次に換算
      monthlyCosts[monthKey] = (monthlyCosts[monthKey] || 0) + (policy.premiumAmount / 12);
    } else {
      // 月払いの場合
      monthlyCosts[monthKey] = (monthlyCosts[monthKey] || 0) + policy.premiumAmount;
    }
  });
  
  return monthlyCosts;
}

// 満期までの日数を計算
export function getDaysUntilExpiry(endDate: Date): number {
  const now = new Date();
  const diffTime = endDate.getTime() - now.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

// 満期ステータスを取得
export function getExpiryStatus(endDate: Date): 'normal' | 'warning' | 'danger' | 'expired' {
  const daysUntilExpiry = getDaysUntilExpiry(endDate);
  
  if (daysUntilExpiry < 0) return 'expired';
  if (daysUntilExpiry <= 7) return 'danger';
  if (daysUntilExpiry <= 30) return 'warning';
  return 'normal';
}

// 保険会社のロゴURLを取得（将来的に実装）
export function getInsuranceProviderLogo(provider: string): string {
  // 実際の実装では、保険会社のロゴを管理する仕組みが必要
  return '/default-insurance-logo.png';
}
