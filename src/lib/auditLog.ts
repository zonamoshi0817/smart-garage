// src/lib/auditLog.ts
"use client";

import { db, auth } from "./firebase";
import {
  collection,
  addDoc,
  serverTimestamp,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  Timestamp
} from "firebase/firestore";

/**
 * 監査証跡（Audit Log）
 * すべての重要な操作を記録し、証明性と信頼性を担保
 */

export type EntityType = 'car' | 'maintenance' | 'fuelLog' | 'customization' | 'insurance';
export type AuditAction = 'create' | 'update' | 'delete' | 'export' | 'share';

export interface AuditLog {
  id?: string;
  entityType: EntityType;      // エンティティタイプ
  entityId: string;            // エンティティID
  action: AuditAction;         // 操作種別
  diff?: Record<string, any>;  // 変更差分（before/after）
  actorUid: string;            // 操作者UID
  actorEmail?: string;         // 操作者メール（デバッグ用）
  metadata?: {                 // メタデータ
    ip?: string;               // IPアドレス（将来対応）
    userAgent?: string;        // User Agent
    location?: string;         // 地理的位置（将来対応）
  };
  timestamp: Date;             // 操作日時
}

/**
 * 監査ログを記録
 */
export async function logAudit(params: {
  entityType: EntityType;
  entityId: string;
  action: AuditAction;
  before?: Record<string, any>;  // 変更前の値
  after?: Record<string, any>;   // 変更後の値
}): Promise<string> {
  const user = auth.currentUser;
  if (!user) {
    console.warn('No authenticated user, skipping audit log');
    return '';
  }

  try {
    const diff: Record<string, any> = {};
    
    // 変更差分を計算（update時）
    if (params.action === 'update' && params.before && params.after) {
      for (const key of Object.keys(params.after)) {
        if (JSON.stringify(params.before[key]) !== JSON.stringify(params.after[key])) {
          diff[key] = {
            before: params.before[key],
            after: params.after[key]
          };
        }
      }
    }

    const auditData = {
      entityType: params.entityType,
      entityId: params.entityId,
      action: params.action,
      diff: Object.keys(diff).length > 0 ? diff : null,
      actorUid: user.uid,
      actorEmail: user.email || null,
      metadata: {
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
      },
      timestamp: serverTimestamp(),
    };

    const docRef = await addDoc(
      collection(db, 'users', user.uid, 'auditLogs'),
      auditData
    );

    console.log(`Audit log created: ${params.action} ${params.entityType} ${params.entityId}`);
    return docRef.id;
  } catch (error) {
    console.error('Error creating audit log:', error);
    // 監査ログの失敗は本体の操作を阻害しない
    return '';
  }
}

/**
 * 特定エンティティの監査ログを取得
 */
export async function getAuditLogs(
  entityType: EntityType,
  entityId: string,
  limitCount: number = 50
): Promise<AuditLog[]> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('ユーザーが認証されていません');
  }

  try {
    const q = query(
      collection(db, 'users', user.uid, 'auditLogs'),
      where('entityType', '==', entityType),
      where('entityId', '==', entityId),
      orderBy('timestamp', 'desc'),
      limit(limitCount)
    );

    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      timestamp: doc.data().timestamp?.toDate() || new Date(),
    })) as AuditLog[];
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    return [];
  }
}

/**
 * すべての監査ログを取得（管理者用）
 */
export async function getAllAuditLogs(
  limitCount: number = 100
): Promise<AuditLog[]> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('ユーザーが認証されていません');
  }

  try {
    const q = query(
      collection(db, 'users', user.uid, 'auditLogs'),
      orderBy('timestamp', 'desc'),
      limit(limitCount)
    );

    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      timestamp: doc.data().timestamp?.toDate() || new Date(),
    })) as AuditLog[];
  } catch (error) {
    console.error('Error fetching all audit logs:', error);
    return [];
  }
}

/**
 * PDF生成時の証明情報を取得
 */
export async function getLastModifiedInfo(
  entityType: EntityType,
  entityId: string
): Promise<{ lastModified: Date; modifiedBy: string } | null> {
  const logs = await getAuditLogs(entityType, entityId, 1);
  
  if (logs.length === 0) return null;
  
  const latestLog = logs[0];
  return {
    lastModified: latestLog.timestamp,
    modifiedBy: latestLog.actorEmail || latestLog.actorUid
  };
}

