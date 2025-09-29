// src/lib/proof.ts
import { Car } from './cars';
import { MaintenanceRecord } from './maintenance';
import { Reminder } from './reminders';

// 証明性データの型定義
export interface ProofData {
  hash: string;
  generatedAt: Date;
  version: string;
  dataType: 'car' | 'maintenance' | 'reminder' | 'combined';
  recordCount?: number;
}

// データの整合性ハッシュを生成
export async function generateDataHash(data: any): Promise<string> {
  // データを正規化（ソート、不要なフィールドを除外）
  const normalizedData = normalizeDataForHash(data);
  
  // JSON文字列に変換
  const jsonString = JSON.stringify(normalizedData, null, 0);
  
  // SHA-256ハッシュを生成
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(jsonString);
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
  
  // 16進数文字列に変換
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  
  return hashHex.substring(0, 16); // 16文字に短縮
}

// ハッシュ生成用にデータを正規化
function normalizeDataForHash(data: any): any {
  if (Array.isArray(data)) {
    return data.map(item => normalizeDataForHash(item)).sort((a, b) => {
      // IDでソート（存在する場合）
      const aId = a.id || a.carId || '';
      const bId = b.id || b.carId || '';
      return aId.localeCompare(bId);
    });
  }
  
  if (data && typeof data === 'object') {
    const normalized: any = {};
    
    // 重要なフィールドのみを保持
    const importantFields = [
      'id', 'carId', 'name', 'title', 'date', 'mileage', 'cost', 
      'description', 'location', 'make', 'model', 'year', 'odoKm',
      'dueDate', 'dueOdoKm', 'status', 'createdAt', 'updatedAt'
    ];
    
    for (const field of importantFields) {
      if (data[field] !== undefined && data[field] !== null) {
        if (field === 'date' || field === 'dueDate' || field === 'createdAt' || field === 'updatedAt') {
          // 日付はISO文字列に変換
          normalized[field] = new Date(data[field]).toISOString();
        } else {
          normalized[field] = data[field];
        }
      }
    }
    
    return normalized;
  }
  
  return data;
}

// 車両データの証明性データを生成
export async function generateCarProof(car: Car): Promise<ProofData> {
  const hash = await generateDataHash(car);
  
  return {
    hash,
    generatedAt: new Date(),
    version: '1.0',
    dataType: 'car',
    recordCount: 1
  };
}

// メンテナンス記録の証明性データを生成
export async function generateMaintenanceProof(records: MaintenanceRecord[]): Promise<ProofData> {
  const hash = await generateDataHash(records);
  
  return {
    hash,
    generatedAt: new Date(),
    version: '1.0',
    dataType: 'maintenance',
    recordCount: records.length
  };
}

// リマインダーの証明性データを生成
export async function generateReminderProof(reminders: Reminder[]): Promise<ProofData> {
  const hash = await generateDataHash(reminders);
  
  return {
    hash,
    generatedAt: new Date(),
    version: '1.0',
    dataType: 'reminder',
    recordCount: reminders.length
  };
}

// 統合データの証明性データを生成
export async function generateCombinedProof(
  car: Car,
  maintenanceRecords: MaintenanceRecord[],
  reminders: Reminder[]
): Promise<ProofData> {
  const combinedData = {
    car,
    maintenanceRecords,
    reminders,
    metadata: {
      generatedAt: new Date().toISOString(),
      totalRecords: maintenanceRecords.length + reminders.length
    }
  };
  
  const hash = await generateDataHash(combinedData);
  
  return {
    hash,
    generatedAt: new Date(),
    version: '1.0',
    dataType: 'combined',
    recordCount: maintenanceRecords.length + reminders.length
  };
}

// 証明性データを検証
export async function verifyProofData(data: any, proof: ProofData): Promise<boolean> {
  try {
    const calculatedHash = await generateDataHash(data);
    return calculatedHash === proof.hash;
  } catch (error) {
    console.error('証明性データの検証に失敗:', error);
    return false;
  }
}

// 証明性バッジのテキストを生成
export function generateProofBadgeText(proof: ProofData): string {
  const dateStr = proof.generatedAt.toLocaleDateString('ja-JP');
  const timeStr = proof.generatedAt.toLocaleTimeString('ja-JP', { 
    hour: '2-digit', 
    minute: '2-digit' 
  });
  
  return `証明済み ${dateStr} ${timeStr} | ハッシュ: ${proof.hash}`;
}

// 証明性ステータスの説明文を生成
export function generateProofDescription(proof: ProofData): string {
  const typeMap = {
    'car': '車両情報',
    'maintenance': 'メンテナンス記録',
    'reminder': 'リマインダー',
    'combined': '統合データ'
  };
  
  const typeName = typeMap[proof.dataType] || 'データ';
  const recordText = proof.recordCount ? ` (${proof.recordCount}件)` : '';
  
  return `この${typeName}${recordText}は改ざん防止ハッシュにより証明されています。生成日時: ${proof.generatedAt.toLocaleString('ja-JP')}`;
}
