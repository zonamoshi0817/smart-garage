// src/lib/pdfExport.ts
"use client";

import jsPDF from 'jspdf';
import 'jspdf-autotable';
import html2canvas from 'html2canvas';
import { Car } from './cars';
import { MaintenanceRecord } from './maintenance';

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

export async function generateMaintenancePDF(options: PDFExportOptions): Promise<Blob> {
  const { car, maintenanceRecords, includeImages = true, dateRange } = options;
  
  // フィルタリングされたメンテナンス記録
  let filteredRecords = maintenanceRecords;
  if (dateRange) {
    filteredRecords = maintenanceRecords.filter(record => {
      const recordDate = record.date;
      return recordDate >= dateRange.start && recordDate <= dateRange.end;
    });
  }

  // HTMLコンテンツを生成
  const htmlContent = generateHTMLContent(car, filteredRecords);
  
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

function generateHTMLContent(car: Car, records: MaintenanceRecord[]): string {
  const totalCost = records.reduce((sum, record) => sum + (record.cost || 0), 0);
  const recordCount = records.length;
  const avgCost = recordCount > 0 ? Math.round(totalCost / recordCount) : 0;

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
          <div class="info-value">${new Date(car.inspectionExpiry).toLocaleDateString('ja-JP')}</div>
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
                <th>種類</th>
                <th>内容</th>
                <th>費用</th>
                <th>走行距離</th>
                <th>作業場所</th>
              </tr>
            </thead>
            <tbody>
              ${records.map(record => `
                <tr>
                  <td>${record.date.toLocaleDateString('ja-JP')}</td>
                  <td>${record.type}</td>
                  <td>${record.title}</td>
                  <td>${record.cost ? `¥${record.cost.toLocaleString()}` : '-'}</td>
                  <td>${record.mileage ? `${record.mileage.toLocaleString()} km` : '-'}</td>
                  <td>${record.location || '-'}</td>
                </tr>
                ${record.description ? `
                <tr>
                  <td colspan="6" style="background-color: #f0f0f0; font-size: 11px; color: #666;">
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
  } catch (error) {
    console.error('PDF生成エラー:', error);
    throw new Error('PDFの生成に失敗しました');
  }
}

export function generateMaintenanceURL(car: Car, maintenanceRecords: MaintenanceRecord[]): string {
  // 簡単なURL共有機能（実際の実装では、サーバーサイドでデータを保存してURLを生成）
  const data = {
    car,
    records: maintenanceRecords,
    generatedAt: new Date().toISOString()
  };
  
  // Base64エンコードしてURLパラメータに含める（簡易実装）
  const encodedData = btoa(JSON.stringify(data));
  return `${window.location.origin}/shared/${encodedData}`;
}
