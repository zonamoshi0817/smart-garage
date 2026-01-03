/**
 * 売却用公開ページのUIコンポーネント
 */

'use client';

import { useEffect } from 'react';
import type { SalePublicViewModel } from '@/lib/saleProfile';
import ConsumablesTable from './ConsumablesTable';
import EvidenceGallery from './EvidenceGallery';

interface SalePublicPageProps {
  viewModel: SalePublicViewModel;
  visibility: 'unlisted' | 'public' | 'disabled';
  analyticsEnabled: boolean;
  type?: 'normal' | 'sale' | 'appraisal' | 'sale_buyer' | 'sale_appraiser'; // 用途種別（デフォルト: 'sale'）
}

export default function SalePublicPage({
  viewModel,
  visibility,
  analyticsEnabled,
  type = 'sale', // デフォルトは'sale'（後方互換性）
}: SalePublicPageProps) {
  const slug = viewModel.saleProfile.slug;
  
  // 用途別の表示内容を決定
  const isNormal = type === 'normal';
  const isSale = type === 'sale' || type === 'sale_buyer';
  const isAppraisal = type === 'appraisal' || type === 'sale_appraiser';
  const isBuyer = type === 'sale_buyer';
  const isAppraiser = type === 'sale_appraiser';

  // ページビューイベントを記録
  useEffect(() => {
    if (analyticsEnabled) {
      fetch(`/api/s/${slug}/event`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event: 'page_view' }),
      }).catch(() => {
        // エラーは無視
      });
    }
  }, [slug, analyticsEnabled]);

  const formatDate = (date: Date | string) => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return new Intl.DateTimeFormat('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(dateObj);
  };

  // PR2: YYYY/MM/DD形式の日付フォーマット
  const formatDateShort = (date: Date | string) => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return new Intl.DateTimeFormat('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(dateObj);
  };

  const formatMileage = (km?: number) => {
    if (!km) return '---';
    return `${km.toLocaleString()}km`;
  };

  const formatAmount = (yen?: number) => {
    if (yen === undefined) return '---';
    return `¥${yen.toLocaleString()}`;
  };

  // 査定士向け要点データを計算（安全なデフォルト値を使用）
  const recent12MonthsSummary = viewModel.recent12MonthsSummary || [];
  const consumables = viewModel.consumables || [];
  const evidences = viewModel.evidences || [];
  
  const latestMaintenance = recent12MonthsSummary.length > 0 
    ? recent12MonthsSummary[0]
    : null;
  
  const consumablesSummary = consumables
    .filter(c => c && c.lastReplacedDate)
    .sort((a, b) => {
      const timeA = a.lastReplacedDate ? new Date(a.lastReplacedDate).getTime() : 0;
      const timeB = b.lastReplacedDate ? new Date(b.lastReplacedDate).getTime() : 0;
      return timeB - timeA;
    })
    .slice(0, 3); // 最新3件

  const evidenceCount = evidences.length;

  // 用途別のサマリーセクション（最上段）
  const renderSummarySection = () => {
    if (isNormal) {
      // 通常: シンプルな車両サマリーのみ（体験重視）
      return null; // 通常は要点セクションを表示しない
    } else if (isSale || isBuyer) {
      // 買い手向け: 直近整備/消耗品交換/総費用/管理指標（見栄えと安心中心）
      const totalCost = recent12MonthsSummary.reduce((sum, item) => sum + (item?.amountYen || 0), 0);
      const maintenanceCount = recent12MonthsSummary.length;
      const evidenceRate = maintenanceCount > 0 
        ? Math.round((evidenceCount / maintenanceCount) * 100) 
        : 0;
      
      // 継続記録期間を計算（最初の記録から最後の記録まで）
      let recordPeriod = '---';
      if (recent12MonthsSummary.length > 0) {
        const sorted = [...recent12MonthsSummary].filter(item => item?.date).sort((a, b) => 
          new Date(a.date).getTime() - new Date(b.date).getTime()
        );
        if (sorted.length > 0) {
          const firstDate = new Date(sorted[0].date);
          const lastDate = new Date(sorted[sorted.length - 1].date);
          const months = Math.round((lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24 * 30));
          recordPeriod = `${months}ヶ月`;
        }
      }

      // 車検残日数を計算
      let inspectionDaysLeft: number | null = null;
      if (viewModel.vehicle.inspectionExpiry) {
        const expiryDate = new Date(viewModel.vehicle.inspectionExpiry);
        const today = new Date();
        inspectionDaysLeft = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      }

      return (
        <section className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl border-2 border-blue-200 p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">査定の要点</h2>
          <div className="grid md:grid-cols-4 gap-4">
            {/* 直近整備 */}
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <div className="text-sm font-medium text-gray-700 mb-2">直近整備</div>
              {latestMaintenance ? (
                <div>
                  <div className="font-semibold text-gray-900 text-sm">{latestMaintenance.title}</div>
                  <div className="text-xs text-gray-700 mt-1">
                    {formatDate(latestMaintenance.date)}
                  </div>
                </div>
              ) : (
                <div className="text-sm text-gray-700">記録なし</div>
              )}
            </div>

            {/* 消耗品交換の最新 */}
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <div className="text-sm font-medium text-gray-700 mb-2">消耗品交換</div>
              {consumablesSummary.length > 0 ? (
                <div className="space-y-1">
                  {consumablesSummary.slice(0, 2).map((item) => {
                    const typeLabels: { [key: string]: string } = {
                      oil: 'オイル',
                      tire: 'タイヤ',
                      brake: 'ブレーキ',
                      battery: 'バッテリー',
                      coolant: 'クーラント',
                    };
                    return (
                      <div key={item.type} className="text-xs text-gray-900">
                        <span className="font-medium">{typeLabels[item.type]}:</span>{' '}
                        {item.lastReplacedDate ? formatDate(item.lastReplacedDate).split('年')[0] + '年' : '---'}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-sm text-gray-700">記録なし</div>
              )}
            </div>

            {/* 管理指標 */}
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <div className="text-sm font-medium text-gray-700 mb-2">管理指標</div>
              <div className="space-y-1 text-xs text-gray-900">
                <div>記録期間: {recordPeriod}</div>
                <div>証憑率: {evidenceRate}%</div>
                <div>総費用: {formatAmount(totalCost)}</div>
                {inspectionDaysLeft !== null && (
                  <div>車検残: {inspectionDaysLeft > 0 ? `あと${inspectionDaysLeft}日` : `${Math.abs(inspectionDaysLeft)}日超過`}</div>
                )}
              </div>
            </div>

            {/* 証跡点数 */}
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <div className="text-sm font-medium text-gray-700 mb-2">証跡</div>
              <div className="text-2xl font-bold text-blue-600">{evidenceCount}</div>
              <div className="text-xs text-gray-700">マスク済み証跡</div>
            </div>
          </div>
        </section>
      );
    } else if (isAppraisal || isAppraiser) {
      // PR2: 査定会社向け - 4カード構成（査定判断に直結するKPI）
      
      // A. 直近整備のデータ
      const latestMaintenanceDate = latestMaintenance 
        ? formatDateShort(latestMaintenance.date)
        : null;
      const latestMaintenanceMileage = latestMaintenance?.mileageKm;
      
      // B. 記録件数
      const maintenanceCount = viewModel.recordCounts?.maintenance || 0;
      const fuelCount = viewModel.recordCounts?.fuel || 0;
      const customizationCount = viewModel.recordCounts?.customization || 0;
      
      // C. 証跡（マスク済）
      const evidenceBreakdown = evidences.length > 0 
        ? '領収書・明細等' // 簡易表示（将来的に内訳を追加可能）
        : '';
      
      // D. 消耗品（登録済/未登録）
      const consumablesRegistered = consumables.filter(c => c && c.lastReplacedDate).length;
      const consumablesTotal = consumables.length; // 固定5項目（oil, tire, brake, battery, coolant）
      const consumablesUnregistered = consumablesTotal - consumablesRegistered;
      
      return (
        <section className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl border-2 border-blue-200 p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">査定の要点</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* A. 直近整備 */}
            <div className={`bg-white rounded-lg p-4 border ${latestMaintenance ? 'border-gray-200' : 'border-gray-100 bg-gray-50'}`}>
              <div className="text-sm font-medium text-gray-700 mb-2">直近整備</div>
              {latestMaintenance ? (
                <div>
                  <div className="text-xs text-gray-600 mb-1">最終整備日</div>
                  <div className="font-semibold text-gray-900 text-sm mb-2">{latestMaintenanceDate}</div>
                  {latestMaintenanceMileage !== undefined && (
                    <>
                      <div className="text-xs text-gray-600 mb-1">整備時走行距離</div>
                      <div className="font-semibold text-gray-900 text-sm">{formatMileage(latestMaintenanceMileage)}</div>
                    </>
                  )}
                </div>
              ) : (
                <div className="text-sm text-gray-700">未登録（入力なし）</div>
              )}
            </div>

            {/* B. 記録件数 */}
            <div className={`bg-white rounded-lg p-4 border ${maintenanceCount + fuelCount + customizationCount > 0 ? 'border-gray-200' : 'border-gray-100 bg-gray-50'}`}>
              <div className="text-sm font-medium text-gray-700 mb-2">記録件数</div>
              <div className="space-y-1 text-sm">
                <div className="text-gray-900">整備 <span className="font-semibold">{maintenanceCount}</span>件</div>
                <div className="text-gray-900">給油 <span className="font-semibold">{fuelCount}</span>件</div>
                <div className="text-gray-900">カスタム <span className="font-semibold">{customizationCount}</span>件</div>
              </div>
            </div>

            {/* C. 証跡（マスク済） */}
            <div className={`bg-white rounded-lg p-4 border ${evidenceCount > 0 ? 'border-gray-200' : 'border-gray-100 bg-gray-50'}`}>
              <div className="text-sm font-medium text-gray-700 mb-2">証跡（マスク済）</div>
              <div className="text-2xl font-bold text-blue-600 mb-1">{evidenceCount}</div>
              <div className="text-xs text-gray-700">件</div>
              {evidenceBreakdown && (
                <div className="text-xs text-gray-600 mt-1">{evidenceBreakdown}</div>
              )}
              {evidenceCount === 0 && (
                <div className="text-xs text-gray-700 mt-1">証跡なし</div>
              )}
            </div>

            {/* D. 消耗品 */}
            <div className={`bg-white rounded-lg p-4 border ${consumablesRegistered > 0 ? 'border-gray-200' : 'border-gray-100 bg-gray-50'}`}>
              <div className="text-sm font-medium text-gray-700 mb-2">消耗品</div>
              <div className="space-y-1 text-sm">
                <div className="text-gray-900">登録済 <span className="font-semibold">{consumablesRegistered}</span> / {consumablesTotal}</div>
                <div className="text-gray-900">未登録 <span className="font-semibold">{consumablesUnregistered}</span> / {consumablesTotal}</div>
              </div>
            </div>
          </div>
        </section>
      );
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* 用途別サマリーセクション（最上段） */}
        {renderSummarySection()}

        {/* 車両サマリー */}
        <section className="bg-white rounded-2xl border border-gray-200 p-6 mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            {viewModel.vehicle.name}
          </h1>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            {viewModel.vehicle.year && (
              <div>
                <div className="text-gray-600">年式</div>
                <div className="font-medium text-gray-900">{viewModel.vehicle.year}年</div>
              </div>
            )}
            {viewModel.vehicle.odoKm !== undefined && (
              <div>
                <div className="text-gray-600">走行距離</div>
                <div className="font-medium text-gray-900">{formatMileage(viewModel.vehicle.odoKm)}</div>
              </div>
            )}
            {viewModel.vehicle.inspectionExpiry && (
              <div>
                <div className="text-gray-600">車検満了</div>
                <div className="font-medium text-gray-900">
                  {formatDate(viewModel.vehicle.inspectionExpiry)}
                </div>
              </div>
            )}
            {viewModel.vehicle.modelCode && (
              <div>
                <div className="text-gray-600">型式</div>
                <div className="font-medium text-gray-900">{viewModel.vehicle.modelCode}</div>
              </div>
            )}
          </div>
          <div className="mt-4 text-xs text-gray-600 leading-relaxed">
            <p className="mb-1">
              本ページはオーナーの入力および証跡（領収書等）に基づき作成されています。証跡の有無により情報の信頼度が異なります。
            </p>
            <p className="text-gray-500">
              記載内容の正確性については、オーナーの入力データに依存するため、完全な保証はできかねます。
            </p>
          </div>
        </section>

        {/* 直近12ヶ月サマリー（通常・売却のみ表示、査定では一覧性重視のため非表示） */}
        {!isAppraisal && (
        <section className="bg-white rounded-2xl border border-gray-200 p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            {isNormal ? '最近のメンテナンス履歴' : '直近12ヶ月サマリー'}
          </h2>
          {viewModel.unclassifiedCount > 0 && (
            <div className="mb-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800">
                未分類のメンテナンス記録が{viewModel.unclassifiedCount}件あります（売却資料には含めていません）
              </p>
            </div>
          )}
          {recent12MonthsSummary.length > 0 ? (
            <div className="space-y-3">
              {recent12MonthsSummary.map((item, index) => (
                <div
                  key={index}
                  className="border-b border-gray-100 pb-3 last:border-b-0"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900">{item.title}</span>
                        {item.category && (
                          <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded">
                            {item.category}
                          </span>
                        )}
                        {item.isPreventive && (
                          <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded">
                            予防整備
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-gray-600 mt-1">
                        {formatDate(item.date)} / {formatMileage(item.mileageKm)}
                      </div>
                    </div>
                    {item.amountYen !== undefined && (
                      <div className="text-sm font-medium text-gray-900">
                        {formatAmount(item.amountYen)}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-gray-500 text-sm">記録がありません</div>
          )}
        </section>
        )}

        {/* 査定用: 交換履歴一覧（時系列より一覧性重視） */}
        {isAppraisal && (
        <section className="bg-white rounded-2xl border border-gray-200 p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            交換履歴一覧
          </h2>
          <ConsumablesTable consumables={consumables} />
          {recent12MonthsSummary.length > 0 && (
            <div className="mt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">主要整備履歴</h3>
              <div className="space-y-3">
                {recent12MonthsSummary
                  .filter(item => {
                    // 大きな修理・重要カスタムを抽出
                    const categories = ['エンジン', 'トランスミッション', 'サスペンション', 'ブレーキ', 'ボディ', '冷却', '電気'];
                    return categories.some(cat => item.category?.includes(cat));
                  })
                  .map((item, index) => (
                    <div key={index} className="border-b border-gray-100 pb-3 last:border-b-0">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-900">{item.title}</span>
                            {item.category && (
                              <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded">
                                {item.category}
                              </span>
                            )}
                          </div>
                          <div className="text-sm text-gray-600 mt-1">
                            {formatDate(item.date)} / {formatMileage(item.mileageKm)}
                          </div>
                        </div>
                        {item.amountYen !== undefined && (
                          <div className="text-sm font-medium text-gray-900">
                            {formatAmount(item.amountYen)}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </section>
        )}

        {/* 消耗品交換一覧（通常・売却のみ、査定では上で表示済み） */}
        {!isAppraisal && (
        <section className="bg-white rounded-2xl border border-gray-200 p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            消耗品交換一覧
          </h2>
          <ConsumablesTable consumables={consumables} />
        </section>
        )}

        {/* 予防整備一覧（通常・売却のみ） */}
        {!isAppraisal && viewModel.preventiveMaintenance.length > 0 && (
          <section className="bg-white rounded-2xl border border-gray-200 p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              予防整備一覧
            </h2>
            <div className="space-y-3">
              {viewModel.preventiveMaintenance.map((item, index) => (
                <div
                  key={index}
                  className="border-b border-gray-100 pb-3 last:border-b-0"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">{item.title}</div>
                      <div className="text-sm text-gray-600 mt-1">
                        {formatDate(item.date)} / {formatMileage(item.mileageKm)}
                      </div>
                    </div>
                    {item.category && (
                      <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded">
                        {item.category}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* 証跡（includeEvidenceがtrueの場合のみ） */}
        {/* visibility='disabled'の場合は証跡を表示しない（既に404だが、念のため） */}
        {evidences.length > 0 && visibility !== 'disabled' && (
          <section className="bg-white rounded-2xl border border-gray-200 p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              {isNormal ? 'メンテナンス証跡' : '証跡（マスク済み）'}
            </h2>
            <EvidenceGallery evidences={evidences} />
          </section>
        )}

        {/* PDFダウンロード */}
        <section className="bg-white rounded-2xl border border-gray-200 p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">PDFダウンロード</h2>
          <div className="space-y-6">
            {/* 査定用PDF */}
            <div>
              <a
                href={`/api/s/${slug}/pdf?type=assess`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => {
                  if (analyticsEnabled) {
                    fetch(`/api/s/${slug}/event`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ event: 'pdf_download_assess' }),
                    }).catch(() => {});
                  }
                }}
                className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                査定用PDF
              </a>
              <div className="mt-2 text-xs text-gray-600">
                マスク済み証跡 + 検証ID + 消耗品一覧 + 直近12ヶ月サマリー
              </div>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  const details = document.getElementById('assess-pdf-details');
                  if (details) {
                    details.classList.toggle('hidden');
                  }
                }}
                className="mt-1 text-xs text-blue-600 hover:text-blue-800 underline"
              >
                含まれる内容を詳しく見る
              </button>
              <div id="assess-pdf-details" className="hidden mt-2 p-3 bg-gray-50 rounded border border-gray-200 text-xs text-gray-700">
                <ul className="list-disc list-inside space-y-1">
                  <li>車両概要</li>
                  <li>売りポイント（自動生成）</li>
                  <li>直近12ヶ月サマリー</li>
                  <li>消耗品交換一覧</li>
                  {evidences.length > 0 && <li>証跡（マスク済み）</li>}
                  <li>検証ID（ブロックチェーン検証ID）</li>
                </ul>
              </div>
            </div>

            {/* 譲渡用PDF */}
            <div>
              <a
                href={`/api/s/${slug}/pdf?type=handover`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => {
                  if (analyticsEnabled) {
                    fetch(`/api/s/${slug}/event`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ event: 'pdf_download_handover' }),
                    }).catch(() => {});
                  }
                }}
                className="inline-block px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
              >
                譲渡用PDF
              </a>
              <div className="mt-2 text-xs text-gray-600">
                整備履歴（詳細） + 消耗品一覧 + {evidences.length > 0 ? '証跡一覧' : '（証跡なし）'}
              </div>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  const details = document.getElementById('handover-pdf-details');
                  if (details) {
                    details.classList.toggle('hidden');
                  }
                }}
                className="mt-1 text-xs text-green-600 hover:text-green-800 underline"
              >
                含まれる内容を詳しく見る
              </button>
              <div id="handover-pdf-details" className="hidden mt-2 p-3 bg-gray-50 rounded border border-gray-200 text-xs text-gray-700">
                <ul className="list-disc list-inside space-y-1">
                  <li>車両概要</li>
                  <li>次回推奨メンテナンス（自動生成）</li>
                  <li>重要整備履歴（主要カテゴリ中心）</li>
                  <li>消耗品交換一覧（推奨交換時期付き）</li>
                  {evidences.length > 0 && <li>証跡一覧</li>}
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* フッター（PR5: 発行日時・検証ID・改ざん防止の説明） */}
        <div className="mt-8 pt-6 border-t border-gray-200">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs text-gray-500">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
              {viewModel.saleProfile.issuedAt && (
                <div>
                  発行日時: <span className="text-gray-700">{formatDateShort(viewModel.saleProfile.issuedAt)}</span>
                </div>
              )}
              {viewModel.saleProfile.lastUpdatedAt && viewModel.saleProfile.lastUpdatedAt !== viewModel.saleProfile.issuedAt && (
                <div>
                  最終更新: <span className="text-gray-700">{formatDateShort(viewModel.saleProfile.lastUpdatedAt)}</span>
                </div>
              )}
              {viewModel.saleProfile.verificationId && (
                <div className="flex items-center gap-2">
                  検証ID: <span className="text-gray-700 font-mono">{viewModel.saleProfile.verificationId}</span>
                  <button
                    onClick={(e) => {
                      navigator.clipboard.writeText(viewModel.saleProfile.verificationId || '');
                      // 簡易的なフィードバック（必要に応じてトーストに変更可能）
                      const btn = e.currentTarget;
                      const svg = btn.querySelector('svg');
                      if (svg) {
                        const originalHTML = svg.outerHTML;
                        btn.innerHTML = '<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>';
                        setTimeout(() => {
                          btn.innerHTML = originalHTML;
                        }, 1000);
                      }
                    }}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                    title="検証IDをコピー"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </button>
                </div>
              )}
            </div>
            <div className="text-gray-400">
              <button
                onClick={(e) => {
                  e.preventDefault();
                  const details = document.getElementById('integrity-details');
                  if (details) {
                    details.classList.toggle('hidden');
                  }
                }}
                className="hover:text-gray-600 underline"
              >
                改ざん防止について
              </button>
              <div id="integrity-details" className="hidden mt-2 p-2 bg-gray-50 rounded border border-gray-200 text-left">
                <p className="text-xs text-gray-600">
                  このページは第三者の閲覧・改ざん防止機能により保護されています。検証IDにより情報の整合性を確認できます。
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}