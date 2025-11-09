// src/lib/pdfExport.ts
"use client";

import jsPDF from 'jspdf';
import 'jspdf-autotable';
import html2canvas from 'html2canvas';
import type { Car, MaintenanceRecord } from '@/types';
import { generateCombinedProof, ProofData } from './proof';
import { logPdfExported, logShareLinkCreated } from './analytics';
import { generatePdfExportToken, generateShareTokenSecure } from './cloudFunctions';
import { shortenSignature } from './signatureToken';

// 日本語フォントの設定
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

export interface PDFExportOptions {
  car: Car;
  maintenanceRecords: MaintenanceRecord[];
  includeImages?: boolean;
  dateRange?: {
    start: Date;
    end: Date;
  };
}

// 日付を安全にフォーマットする
function formatDate(date: any): string {
  if (!date) return '-';
  
  try {
    // Timestampオブジェクトの場合
    if (date && typeof date === 'object' && 'toDate' in date) {
      return date.toDate().toLocaleDateString('ja-JP');
    }
    // Dateオブジェクトの場合
    if (date instanceof Date) {
      return date.toLocaleDateString('ja-JP');
    }
    // 文字列やミリ秒の場合
    const dateObj = new Date(date);
    if (!isNaN(dateObj.getTime())) {
      return dateObj.toLocaleDateString('ja-JP');
    }
  } catch (error) {
    console.error('日付フォーマットエラー:', error);
  }
  
  return '-';
}

export async function generateMaintenancePDF(options: PDFExportOptions): Promise<Blob> {
  const { car, maintenanceRecords, includeImages = true, dateRange } = options;
  
  // フィルタリングされたメンテナンス記録
  let filteredRecords = maintenanceRecords;
  if (dateRange) {
    filteredRecords = maintenanceRecords.filter(record => {
      if (!record.date) return false;
      
      let recordDate: Date;
      const date = record.date as any;
      
      if (typeof date === 'object' && date !== null && 'toDate' in date && typeof date.toDate === 'function') {
        recordDate = date.toDate();
      } else if (date instanceof Date) {
        recordDate = date;
      } else {
        recordDate = new Date(date);
      }
      
      return recordDate >= dateRange.start && recordDate <= dateRange.end;
    });
  }

  // 証明性データを生成
  const proof = await generateCombinedProof(car, filteredRecords);
  
  // Cloud Functionsで署名付きトークンを生成
  const recordIds = filteredRecords.map(r => r.id || '').filter(Boolean);
  const tokenResponse = await generatePdfExportToken({
    carId: car.id || '',
    recordIds,
    options: { includeImages, dateRange }
  });
  
  const pdfSignature = {
    signature: tokenResponse.token.substring(0, 16), // 短縮トークン（互換性）
    metadata: {
      carId: car.id || '',
      recordIds,
      timestamp: Date.now(),
      version: '2.0-jwt'
    }
  };

  // HTMLコンテンツを生成
  const htmlContent = generateHTMLContent(car, filteredRecords, proof, pdfSignature);
  
  // 一時的なDOM要素を作成
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = htmlContent;
  tempDiv.style.position = 'absolute';
  tempDiv.style.left = '-9999px';
  tempDiv.style.top = '-9999px';
  tempDiv.style.width = '210mm'; // A4 width
  tempDiv.style.fontFamily = 'Arial, sans-serif';
  document.body.appendChild(tempDiv);

  try {
    // html2canvasでキャプチャ
    const canvas = await html2canvas(tempDiv, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff'
    });

    // jsPDFでPDFを生成
    const pdf = new jsPDF('p', 'mm', 'a4');
    const imgData = canvas.toDataURL('image/png');
    const imgWidth = 210; // A4 width in mm
    const pageHeight = 295; // A4 height in mm
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    let heightLeft = imgHeight;

    let position = 0;

    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;

    while (heightLeft >= 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }

    return pdf.output('blob');
  } finally {
    // 一時的なDOM要素を削除
    document.body.removeChild(tempDiv);
  }
}

function generateHTMLContent(
  car: Car, 
  records: MaintenanceRecord[], 
  proof?: ProofData,
  pdfSignature?: { signature: string; metadata: any }
): string {
  const totalCost = records.reduce((sum, record) => sum + (record.cost || 0), 0);
  const recordCount = records.length;
  const avgCost = recordCount > 0 ? Math.round(totalCost / recordCount) : 0;

  // 署名の短縮版（QRコード用）
  const shortSignature = pdfSignature ? shortenSignature(pdfSignature.signature) : '';

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body {
          font-family: 'Hiragino Sans', 'Yu Gothic', 'Meiryo', sans-serif;
          margin: 0;
          padding: 20px;
          background: white;
          color: #333;
          line-height: 1.6;
        }
        .header {
          text-align: center;
          margin-bottom: 30px;
          border-bottom: 2px solid #4285f4;
          padding-bottom: 20px;
        }
        .header h1 {
          font-size: 24px;
          margin: 0;
          color: #4285f4;
        }
        .vehicle-info {
          background: #f8f9fa;
          padding: 20px;
          border-radius: 8px;
          margin-bottom: 30px;
        }
        .vehicle-info h2 {
          font-size: 18px;
          margin: 0 0 15px 0;
          color: #333;
        }
        .info-row {
          display: flex;
          margin-bottom: 8px;
        }
        .info-label {
          font-weight: bold;
          width: 120px;
          color: #666;
        }
        .info-value {
          flex: 1;
        }
        .records-section {
          margin-bottom: 30px;
        }
        .records-section h2 {
          font-size: 18px;
          margin: 0 0 15px 0;
          color: #333;
        }
        .records-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 20px;
        }
        .records-table th,
        .records-table td {
          border: 1px solid #ddd;
          padding: 8px;
          text-align: left;
          font-size: 12px;
        }
        .records-table th {
          background-color: #4285f4;
          color: white;
          font-weight: bold;
        }
        .records-table tr:nth-child(even) {
          background-color: #f8f9fa;
        }
        .summary {
          background: #e8f0fe;
          padding: 20px;
          border-radius: 8px;
          margin-bottom: 20px;
        }
        .summary h3 {
          font-size: 16px;
          margin: 0 0 15px 0;
          color: #333;
        }
        .summary-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 8px;
        }
        .summary-label {
          font-weight: bold;
          color: #666;
        }
        .summary-value {
          color: #333;
        }
        .footer {
          text-align: center;
          margin-top: 30px;
          padding-top: 20px;
          border-top: 1px solid #ddd;
          font-size: 10px;
          color: #666;
        }
        .no-records {
          text-align: center;
          color: #666;
          font-style: italic;
          padding: 40px;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>メンテナンス履歴書</h1>
        <p>Maintenance History Report</p>
      </div>

      <div class="vehicle-info">
        <h2>車両情報</h2>
        <div class="info-row">
          <div class="info-label">車両名:</div>
          <div class="info-value">${car.name}</div>
        </div>
        ${car.modelCode ? `
        <div class="info-row">
          <div class="info-label">型式:</div>
          <div class="info-value">${car.modelCode}</div>
        </div>
        ` : ''}
        ${car.year ? `
        <div class="info-row">
          <div class="info-label">年式:</div>
          <div class="info-value">${car.year}年</div>
        </div>
        ` : ''}
        ${car.odoKm ? `
        <div class="info-row">
          <div class="info-label">走行距離:</div>
          <div class="info-value">${car.odoKm.toLocaleString()} km</div>
        </div>
        ` : ''}
        ${car.inspectionExpiry ? `
        <div class="info-row">
          <div class="info-label">車検期限:</div>
          <div class="info-value">${formatDate(car.inspectionExpiry)}</div>
        </div>
        ` : ''}
        <div class="info-row">
          <div class="info-label">出力日時:</div>
          <div class="info-value">${new Date().toLocaleString('ja-JP')}</div>
        </div>
      </div>

      <div class="records-section">
        <h2>メンテナンス履歴</h2>
        ${records.length === 0 ? `
          <div class="no-records">メンテナンス記録がありません。</div>
        ` : `
          <table class="records-table">
            <thead>
              <tr>
                <th>日付</th>
                <th>内容</th>
                <th>費用</th>
                <th>走行距離</th>
                <th>作業場所</th>
              </tr>
            </thead>
            <tbody>
              ${records.map(record => `
                <tr>
                  <td>${formatDate(record.date)}</td>
                  <td>${record.title}</td>
                  <td>${record.cost ? `¥${record.cost.toLocaleString()}` : '-'}</td>
                  <td>${record.mileage ? `${record.mileage.toLocaleString()} km` : '-'}</td>
                  <td>${record.location || '-'}</td>
                </tr>
                ${record.description ? `
                <tr>
                  <td colspan="5" style="background-color: #f0f0f0; font-size: 11px; color: #666;">
                    詳細: ${record.description}
                  </td>
                </tr>
                ` : ''}
              `).join('')}
            </tbody>
          </table>
        `}
      </div>

      ${records.length > 0 ? `
      <div class="summary">
        <h3>統計情報</h3>
        <div class="summary-row">
          <div class="summary-label">総記録数:</div>
          <div class="summary-value">${recordCount}件</div>
        </div>
        <div class="summary-row">
          <div class="summary-label">総費用:</div>
          <div class="summary-value">¥${totalCost.toLocaleString()}</div>
        </div>
        <div class="summary-row">
          <div class="summary-label">平均費用:</div>
          <div class="summary-value">¥${avgCost.toLocaleString()}</div>
        </div>
      </div>
      ` : ''}

      <div class="footer">
        <p>Smart Garage - 愛車の価値を履歴で残す</p>
        <p>Generated on ${new Date().toLocaleString('ja-JP')}</p>
        ${proof ? `
        <div class="proof-section" style="margin-top: 20px; padding: 15px; background: #f0f8ff; border: 1px solid #4285f4; border-radius: 8px;">
          <h4 style="margin: 0 0 10px 0; color: #4285f4; font-size: 14px;">🔒 データの証明性</h4>
          <div style="font-size: 12px; color: #666;">
            <div style="margin-bottom: 5px;">生成日時: ${proof.generatedAt.toLocaleString('ja-JP')}</div>
            <div style="margin-bottom: 5px;">整合性ハッシュ: <code style="background: #e8f0fe; padding: 2px 4px; border-radius: 3px;">${proof.hash}</code></div>
            <div style="margin-bottom: 5px;">記録数: ${proof.recordCount}件</div>
            <div style="font-size: 11px; color: #888; margin-top: 8px;">
              このデータは改ざん防止ハッシュにより証明されています。第三者による検証にご利用いただけます。
            </div>
          </div>
        </div>
        ` : ''}
        ${pdfSignature ? `
        <div class="signature-section" style="margin-top: 15px; padding: 12px; background: #f9f9f9; border: 1px solid #ddd; border-radius: 8px;">
          <h4 style="margin: 0 0 8px 0; color: #666; font-size: 13px;">📋 エクスポート署名</h4>
          <div style="font-size: 11px; color: #666;">
            <div style="margin-bottom: 4px;">署名ID: <code style="background: #fff; padding: 2px 4px; border-radius: 3px;">${shortSignature}</code></div>
            <div style="margin-bottom: 4px;">生成時刻: ${new Date(pdfSignature.metadata.timestamp).toLocaleString('ja-JP')}</div>
            <div style="font-size: 10px; color: #999; margin-top: 6px;">
              この署名により、エクスポート元の正当性と改ざんの有無を検証できます。
            </div>
          </div>
        </div>
        ` : ''}
      </div>
    </body>
    </html>
  `;
}

export async function downloadMaintenancePDF(options: PDFExportOptions): Promise<void> {
  try {
    const blob = await generateMaintenancePDF(options);
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `メンテナンス履歴_${options.car.name}_${new Date().toISOString().split('T')[0]}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    // アナリティクスイベントを記録
    if (options.car.id) {
      logPdfExported(options.car.id, options.maintenanceRecords.length);
    }
  } catch (error) {
    console.error('PDF生成エラー:', error);
    throw new Error('PDFの生成に失敗しました');
  }
}

export async function generateMaintenanceURL(car: Car, maintenanceRecords: MaintenanceRecord[]): Promise<string> {
  // Cloud Functionsで署名付きトークンを生成
  const tokenResponse = await generateShareTokenSecure({
    carId: car.id || '',
    scope: 'share:vehicle-history',
    expiresInDays: 30
  });
  
  // アナリティクスイベントを記録
  if (car.id) {
    logShareLinkCreated(car.id);
  }
  
  // Cloud Functions発行のセキュアなURLを返す
  return tokenResponse.shareUrl;
}
