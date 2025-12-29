/**
 * 売却用PDF生成API
 * /api/s/[slug]/pdf?type=assess|handover
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSaleProfileBySlug, generateSalePublicViewModel } from '@/lib/saleProfile';
import jsPDF from 'jspdf';
import { Timestamp } from 'firebase-admin/firestore';

export const runtime = 'nodejs';
export const maxDuration = 30;

function formatDate(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(dateObj);
}

function formatMileage(km?: number): string {
  if (!km) return '---';
  return `${km.toLocaleString()}km`;
}

function formatAmount(yen?: number): string {
  if (yen === undefined) return '---';
  return `¥${yen.toLocaleString()}`;
}

// 日本語フォントを追加する関数
async function setupJapaneseFont(pdf: jsPDF) {
  try {
    // フォントファイルが準備されている場合は読み込む
    try {
      const { NotoSansJPBase64, NotoSansJPName } = await import('@/lib/fonts/notoSansJP');
      pdf.addFileToVFS('NotoSansJP-Regular.ttf', NotoSansJPBase64);
      pdf.addFont('NotoSansJP-Regular.ttf', NotoSansJPName, 'normal');
      pdf.setFont(NotoSansJPName);
      return true;
    } catch (fontError) {
      // フォントファイルが準備されていない場合は、デフォルトフォントを使用
      console.warn('Japanese font not available, using default font:', fontError);
      pdf.setFont('helvetica');
      return false;
    }
  } catch (error) {
    console.error('Failed to setup Japanese font:', error);
    pdf.setFont('helvetica');
    return false;
  }
}

async function generateAssessPDF(viewModel: any): Promise<Buffer> {
  const pdf = new jsPDF('p', 'mm', 'a4');
  await setupJapaneseFont(pdf);
  let y = 20;

  // タイトル（日本語フォントが設定されていない場合は文字化けする可能性がある）
  pdf.setFontSize(18);
  pdf.text('査定用 車両情報', 105, y, { align: 'center' });
  y += 10;

  // 未分類レコードの注記
  if (viewModel.unclassifiedCount > 0) {
    pdf.setFontSize(9);
    pdf.setTextColor(200, 0, 0);
    pdf.text(`※未分類のメンテナンス記録${viewModel.unclassifiedCount}件は除外しています`, 20, y);
    pdf.setTextColor(0, 0, 0);
    y += 5;
  }
  y += 5;

  // 車両概要
  pdf.setFontSize(14);
  pdf.text('【車両概要】', 20, y);
  y += 8;

  pdf.setFontSize(11);
  const vehicleInfo = [
    `車名: ${viewModel.vehicle.name}`,
    viewModel.vehicle.year ? `年式: ${viewModel.vehicle.year}年` : '',
    viewModel.vehicle.modelCode ? `型式: ${viewModel.vehicle.modelCode}` : '',
    viewModel.vehicle.odoKm !== undefined ? `走行距離: ${formatMileage(viewModel.vehicle.odoKm)}` : '',
    viewModel.vehicle.inspectionExpiry ? `車検満了: ${formatDate(viewModel.vehicle.inspectionExpiry)}` : '',
  ].filter(Boolean);

  vehicleInfo.forEach((line) => {
    pdf.text(line, 25, y);
    y += 6;
  });

  // 売りポイント（自動生成）
  y += 5;
  pdf.setFontSize(14);
  pdf.text('【売りポイント】', 20, y);
  y += 8;

  pdf.setFontSize(11);
  const sellingPoints = [
    '定期的なメンテナンスを実施',
    '整備記録が詳細に残されている',
    '消耗品交換履歴が明確',
  ];

  sellingPoints.forEach((point, index) => {
    pdf.text(`${index + 1}. ${point}`, 25, y);
    y += 6;
  });

  // 直近12ヶ月サマリー
  if (viewModel.recent12MonthsSummary.length > 0) {
    if (y > 250) {
      pdf.addPage();
      y = 20;
    }

    y += 5;
    pdf.setFontSize(14);
    pdf.text('【直近12ヶ月サマリー】', 20, y);
    y += 8;

    pdf.setFontSize(10);
    viewModel.recent12MonthsSummary.slice(0, 10).forEach((item: any) => {
      if (y > 280) {
        pdf.addPage();
        y = 20;
      }

      const dateStr = formatDate(item.date);
      const mileageStr = formatMileage(item.mileageKm);
      const amountStr = item.amountYen !== undefined ? formatAmount(item.amountYen) : '';
      
      pdf.text(`${dateStr}`, 25, y);
      pdf.text(`${item.title}`, 70, y);
      if (amountStr) {
        pdf.text(amountStr, 150, y);
      }
      y += 6;
    });
  }

  // 消耗品交換一覧
  if (y > 250) {
    pdf.addPage();
    y = 20;
  }

  y += 5;
  pdf.setFontSize(14);
  pdf.text('【消耗品交換一覧】', 20, y);
  y += 8;

  pdf.setFontSize(10);
  const typeLabels: { [key: string]: string } = {
    oil: 'エンジンオイル',
    tire: 'タイヤ',
    brake: 'ブレーキ',
    battery: 'バッテリー',
    coolant: 'クーラント',
  };

  viewModel.consumables.forEach((item: any) => {
    if (y > 280) {
      pdf.addPage();
      y = 20;
    }

    const label = typeLabels[item.type] || item.type;
    const dateStr = item.lastReplacedDate ? formatDate(item.lastReplacedDate) : '---';
    const mileageStr = formatMileage(item.lastReplacedMileageKm);

    pdf.text(`${label}`, 25, y);
    pdf.text(`${dateStr}`, 80, y);
    pdf.text(`${mileageStr}`, 130, y);
    y += 6;
  });

  // 証跡（includeEvidence=trueの場合）
  if (viewModel.evidences.length > 0) {
    if (y > 250) {
      pdf.addPage();
      y = 20;
    }

    y += 5;
    pdf.setFontSize(14);
    pdf.text('【証跡】', 20, y);
    y += 8;

    pdf.setFontSize(10);
    pdf.text('※証跡画像はWebページでご確認ください', 25, y);
    y += 6;
    pdf.text(`証跡数: ${viewModel.evidences.length}件`, 25, y);
  }

  // 未分類レコードの注記（最終ページに追加）
  if (viewModel.unclassifiedCount > 0) {
    if (y > 270) {
      pdf.addPage();
      y = 20;
    }
    y += 5;
    pdf.setFontSize(9);
    pdf.setTextColor(200, 0, 0);
    pdf.text(`※未分類のメンテナンス記録${viewModel.unclassifiedCount}件は除外しています`, 20, y);
    pdf.setTextColor(0, 0, 0);
  }

  return Buffer.from(pdf.output('arraybuffer'));
}

async function generateHandoverPDF(viewModel: any): Promise<Buffer> {
  const pdf = new jsPDF('p', 'mm', 'a4');
  await setupJapaneseFont(pdf);
  let y = 20;

  // タイトル（日本語フォントが設定されていない場合は文字化けする可能性がある）
  pdf.setFontSize(18);
  pdf.text('譲渡用 車両情報', 105, y, { align: 'center' });
  y += 10;

  // 未分類レコードの注記
  if (viewModel.unclassifiedCount > 0) {
    pdf.setFontSize(9);
    pdf.setTextColor(200, 0, 0);
    pdf.text(`※未分類のメンテナンス記録${viewModel.unclassifiedCount}件は除外しています`, 20, y);
    pdf.setTextColor(0, 0, 0);
    y += 5;
  }
  y += 5;

  // 車両概要
  pdf.setFontSize(14);
  pdf.text('【車両概要】', 20, y);
  y += 8;

  pdf.setFontSize(11);
  const vehicleInfo = [
    `車名: ${viewModel.vehicle.name}`,
    viewModel.vehicle.year ? `年式: ${viewModel.vehicle.year}年` : '',
    viewModel.vehicle.modelCode ? `型式: ${viewModel.vehicle.modelCode}` : '',
    viewModel.vehicle.odoKm !== undefined ? `走行距離: ${formatMileage(viewModel.vehicle.odoKm)}` : '',
    viewModel.vehicle.inspectionExpiry ? `車検満了: ${formatDate(viewModel.vehicle.inspectionExpiry)}` : '',
  ].filter(Boolean);

  vehicleInfo.forEach((line) => {
    pdf.text(line, 25, y);
    y += 6;
  });

  // 次回推奨（自動生成）
  y += 5;
  pdf.setFontSize(14);
  pdf.text('【次回推奨メンテナンス】', 20, y);
  y += 8;

  pdf.setFontSize(11);
  const recommendations = [
    '定期的なオイル交換',
    'タイヤ交換時期の確認',
    '車検時の点検項目確認',
  ];

  recommendations.forEach((rec, index) => {
    pdf.text(`${index + 1}. ${rec}`, 25, y);
    y += 6;
  });

  // 重要整備履歴（主要カテゴリ中心）
  if (viewModel.recent12MonthsSummary.length > 0) {
    const majorCategoryRecords = viewModel.recent12MonthsSummary.filter((item: any) => {
      const majorCategories = ['oil', 'tire', 'brake', 'battery', 'coolant'];
      return item.category && majorCategories.includes(item.category);
    });

    if (majorCategoryRecords.length > 0) {
      if (y > 250) {
        pdf.addPage();
        y = 20;
      }

      y += 5;
      pdf.setFontSize(14);
      pdf.text('【重要整備履歴】', 20, y);
      y += 8;

      pdf.setFontSize(10);
      majorCategoryRecords.slice(0, 10).forEach((item: any) => {
        if (y > 280) {
          pdf.addPage();
          y = 20;
        }

        const dateStr = formatDate(item.date);
        const mileageStr = formatMileage(item.mileageKm);
        
        pdf.text(`${dateStr}`, 25, y);
        pdf.text(`${item.title}`, 70, y);
        pdf.text(`${mileageStr}`, 150, y);
        y += 6;
      });
    }
  }

  // 消耗品交換一覧 + 推奨時期
  if (y > 250) {
    pdf.addPage();
    y = 20;
  }

  y += 5;
  pdf.setFontSize(14);
  pdf.text('【消耗品交換一覧・推奨時期】', 20, y);
  y += 8;

  pdf.setFontSize(10);
  const typeLabels: { [key: string]: string } = {
    oil: 'エンジンオイル',
    tire: 'タイヤ',
    brake: 'ブレーキ',
    battery: 'バッテリー',
    coolant: 'クーラント',
  };

  const recommendationsMap: { [key: string]: string } = {
    oil: '5,000km / 6ヶ月',
    tire: '10,000km / 12ヶ月',
    brake: '10,000km / 12ヶ月',
    battery: '2年',
    coolant: '2年',
  };

  viewModel.consumables.forEach((item: any) => {
    if (y > 280) {
      pdf.addPage();
      y = 20;
    }

    const label = typeLabels[item.type] || item.type;
    const dateStr = item.lastReplacedDate ? formatDate(item.lastReplacedDate) : '---';
    const mileageStr = formatMileage(item.lastReplacedMileageKm);
    const recommendation = recommendationsMap[item.type] || '---';

    pdf.text(`${label}`, 25, y);
    pdf.text(`${dateStr}`, 80, y);
    pdf.text(`${mileageStr}`, 120, y);
    pdf.text(`推奨: ${recommendation}`, 150, y);
    y += 6;
  });

  // 未分類レコードの注記（最終ページに追加）
  if (viewModel.unclassifiedCount > 0) {
    if (y > 270) {
      pdf.addPage();
      y = 20;
    }
    y += 5;
    pdf.setFontSize(9);
    pdf.setTextColor(200, 0, 0);
    pdf.text(`※未分類のメンテナンス記録${viewModel.unclassifiedCount}件は除外しています`, 20, y);
    pdf.setTextColor(0, 0, 0);
  }

  return Buffer.from(pdf.output('arraybuffer'));
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const searchParams = req.nextUrl.searchParams;
    const type = searchParams.get('type') || 'assess';

    if (type !== 'assess' && type !== 'handover') {
      return NextResponse.json(
        { error: 'Invalid type parameter. Must be "assess" or "handover".' },
        { status: 400 }
      );
    }

    // SaleProfileを取得
    const saleProfile = await getSaleProfileBySlug(slug);
    if (!saleProfile || saleProfile.visibility === 'disabled') {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    // ViewModelを生成
    const viewModel = await generateSalePublicViewModel(saleProfile);
    if (!viewModel) {
      return NextResponse.json({ error: 'Vehicle not found' }, { status: 404 });
    }

    // PDFを生成
    const pdfBuffer = type === 'assess'
      ? await generateAssessPDF(viewModel)
      : await generateHandoverPDF(viewModel);

    // レスポンスを返す
    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="vehicle_${type}_${slug}.pdf"`,
      },
    });
  } catch (error: any) {
    console.error('PDF generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate PDF', details: error.message },
      { status: 500 }
    );
  }
}
