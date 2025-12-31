/**
 * 売却用公開ページのUIコンポーネント
 */

'use client';

import { useEffect } from 'react';
import type { SalePublicViewModel } from '@/lib/saleProfile';
import ConsumablesTable from './ConsumablesTable';
import EvidenceGallery from './EvidenceGallery';
import CopyTemplateButton from './CopyTemplateButton';

interface SalePublicPageProps {
  viewModel: SalePublicViewModel;
  visibility: 'unlisted' | 'public' | 'disabled';
  analyticsEnabled: boolean;
  type?: 'normal' | 'sale' | 'appraisal'; // 用途種別（デフォルト: 'sale'）
}

// Feature flag: テンプレートブロックの表示制御
const SHOW_TEMPLATE_BLOCK = false;

export default function SalePublicPage({
  viewModel,
  visibility,
  analyticsEnabled,
  type = 'sale', // デフォルトは'sale'（後方互換性）
}: SalePublicPageProps) {
  const slug = viewModel.saleProfile.slug;
  
  // 用途別の表示内容を決定
  const isNormal = type === 'normal';
  const isSale = type === 'sale';
  const isAppraisal = type === 'appraisal';

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

  const formatMileage = (km?: number) => {
    if (!km) return '---';
    return `${km.toLocaleString()}km`;
  };

  const formatAmount = (yen?: number) => {
    if (yen === undefined) return '---';
    return `¥${yen.toLocaleString()}`;
  };

  // 査定士向け要点データを計算
  const latestMaintenance = viewModel.recent12MonthsSummary.length > 0 
    ? viewModel.recent12MonthsSummary[0]
    : null;
  
  const consumablesSummary = viewModel.consumables
    .filter(c => c.lastReplacedDate)
    .sort((a, b) => {
      const timeA = a.lastReplacedDate ? new Date(a.lastReplacedDate).getTime() : 0;
      const timeB = b.lastReplacedDate ? new Date(b.lastReplacedDate).getTime() : 0;
      return timeB - timeA;
    })
    .slice(0, 3); // 最新3件

  const evidenceCount = viewModel.evidences.length;

  // 用途別のサマリーセクション（最上段）
  const renderSummarySection = () => {
    if (isNormal) {
      // 通常: シンプルな車両サマリーのみ（体験重視）
      return null; // 通常は要点セクションを表示しない
    } else if (isSale) {
      // 売却: 直近整備/消耗品交換/総費用/管理指標
      const totalCost = viewModel.recent12MonthsSummary.reduce((sum, item) => sum + (item.amountYen || 0), 0);
      const maintenanceCount = viewModel.recent12MonthsSummary.length;
      const evidenceRate = maintenanceCount > 0 
        ? Math.round((evidenceCount / maintenanceCount) * 100) 
        : 0;
      
      // 継続記録期間を計算（最初の記録から最後の記録まで）
      let recordPeriod = '---';
      if (viewModel.recent12MonthsSummary.length > 0) {
        const sorted = [...viewModel.recent12MonthsSummary].sort((a, b) => 
          new Date(a.date).getTime() - new Date(b.date).getTime()
        );
        const firstDate = new Date(sorted[0].date);
        const lastDate = new Date(sorted[sorted.length - 1].date);
        const months = Math.round((lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24 * 30));
        recordPeriod = `${months}ヶ月`;
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
            <div className="bg-white rounded-lg p-4">
              <div className="text-sm font-medium text-gray-600 mb-2">直近整備</div>
              {latestMaintenance ? (
                <div>
                  <div className="font-semibold text-gray-900 text-sm">{latestMaintenance.title}</div>
                  <div className="text-xs text-gray-600 mt-1">
                    {formatDate(latestMaintenance.date)}
                  </div>
                </div>
              ) : (
                <div className="text-sm text-gray-500">記録なし</div>
              )}
            </div>

            {/* 消耗品交換の最新 */}
            <div className="bg-white rounded-lg p-4">
              <div className="text-sm font-medium text-gray-600 mb-2">消耗品交換</div>
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
                      <div key={item.type} className="text-xs">
                        <span className="font-medium">{typeLabels[item.type]}:</span>{' '}
                        {item.lastReplacedDate ? formatDate(item.lastReplacedDate).split('年')[0] + '年' : '---'}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-sm text-gray-500">記録なし</div>
              )}
            </div>

            {/* 管理指標 */}
            <div className="bg-white rounded-lg p-4">
              <div className="text-sm font-medium text-gray-600 mb-2">管理指標</div>
              <div className="space-y-1 text-xs">
                <div>記録期間: {recordPeriod}</div>
                <div>証憑率: {evidenceRate}%</div>
                <div>総費用: {formatAmount(totalCost)}</div>
                {inspectionDaysLeft !== null && (
                  <div>車検残: {inspectionDaysLeft > 0 ? `あと${inspectionDaysLeft}日` : `${Math.abs(inspectionDaysLeft)}日超過`}</div>
                )}
              </div>
            </div>

            {/* 証跡点数 */}
            <div className="bg-white rounded-lg p-4">
              <div className="text-sm font-medium text-gray-600 mb-2">証跡</div>
              <div className="text-2xl font-bold text-blue-600">{evidenceCount}</div>
              <div className="text-xs text-gray-600">マスク済み証跡</div>
            </div>
          </div>
        </section>
      );
    } else if (isAppraisal) {
      // 査定: 交換履歴一覧/検証ID（一覧性重視）
      return (
        <section className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl border-2 border-blue-200 p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">査定の要点</h2>
          <div className="grid md:grid-cols-2 gap-4">
            {/* 交換履歴一覧（全件） */}
            <div className="bg-white rounded-lg p-4">
              <div className="text-sm font-medium text-gray-600 mb-2">交換履歴一覧</div>
              {viewModel.consumables.filter(c => c.lastReplacedDate).length > 0 ? (
                <div className="space-y-1">
                  {viewModel.consumables
                    .filter(c => c.lastReplacedDate)
                    .map((item) => {
                      const typeLabels: { [key: string]: string } = {
                        oil: 'オイル',
                        tire: 'タイヤ',
                        brake: 'ブレーキ',
                        battery: 'バッテリー',
                        coolant: 'クーラント',
                      };
                      return (
                        <div key={item.type} className="text-xs">
                          <span className="font-medium">{typeLabels[item.type]}:</span>{' '}
                          {item.lastReplacedDate ? formatDate(item.lastReplacedDate) : '---'}
                          {item.lastReplacedKm && ` (${formatMileage(item.lastReplacedKm)})`}
                        </div>
                      );
                    })}
                </div>
              ) : (
                <div className="text-sm text-gray-500">記録なし</div>
              )}
            </div>

            {/* 証跡・検証ID */}
            <div className="bg-white rounded-lg p-4">
              <div className="text-sm font-medium text-gray-600 mb-2">証跡・検証</div>
              <div className="space-y-2">
                <div>
                  <div className="text-xs text-gray-500">証跡点数</div>
                  <div className="text-xl font-bold text-blue-600">{evidenceCount}</div>
                </div>
                <div className="text-xs text-gray-500">
                  改ざん防止: 有効（ブロックチェーン検証ID）
                </div>
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
                <div className="text-gray-500">年式</div>
                <div className="font-medium">{viewModel.vehicle.year}年</div>
              </div>
            )}
            {viewModel.vehicle.odoKm !== undefined && (
              <div>
                <div className="text-gray-500">走行距離</div>
                <div className="font-medium">{formatMileage(viewModel.vehicle.odoKm)}</div>
              </div>
            )}
            {viewModel.vehicle.inspectionExpiry && (
              <div>
                <div className="text-gray-500">車検満了</div>
                <div className="font-medium">
                  {formatDate(viewModel.vehicle.inspectionExpiry)}
                </div>
              </div>
            )}
            {viewModel.vehicle.modelCode && (
              <div>
                <div className="text-gray-500">型式</div>
                <div className="font-medium">{viewModel.vehicle.modelCode}</div>
              </div>
            )}
          </div>
          <div className="mt-4 text-xs text-gray-500">
            本情報は売主により提供されており、内容の正確性については保証いたしません。
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
          {viewModel.recent12MonthsSummary.length > 0 ? (
            <div className="space-y-3">
              {viewModel.recent12MonthsSummary.map((item, index) => (
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
          <ConsumablesTable consumables={viewModel.consumables} />
          {viewModel.recent12MonthsSummary.length > 0 && (
            <div className="mt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">主要整備履歴</h3>
              <div className="space-y-3">
                {viewModel.recent12MonthsSummary
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
          <ConsumablesTable consumables={viewModel.consumables} />
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
        {viewModel.evidences.length > 0 && visibility !== 'disabled' && (
          <section className="bg-white rounded-2xl border border-gray-200 p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              {isNormal ? 'メンテナンス証跡' : '証跡（マスク済み）'}
            </h2>
            <EvidenceGallery evidences={viewModel.evidences} />
          </section>
        )}

        {/* PDFダウンロード */}
        <section className="bg-white rounded-2xl border border-gray-200 p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">PDFダウンロード</h2>
          <div className="flex gap-4">
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
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              査定用PDF
            </a>
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
              className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              譲渡用PDF
            </a>
          </div>
        </section>

        {/* コピペ文生成（feature flagで非表示） */}
        {SHOW_TEMPLATE_BLOCK && (
          <section className="bg-white rounded-2xl border border-gray-200 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              査定依頼用メッセージ
            </h2>
            <CopyTemplateButton
              slug={slug}
              vehicle={viewModel.vehicle}
              analyticsEnabled={analyticsEnabled}
            />
          </section>
        )}

        {/* フッター（閲覧専用の明示） */}
        <div className="mt-8 pt-6 border-t border-gray-200 text-center">
          <p className="text-xs text-gray-500">
            このページは履歴閲覧用です。第三者の閲覧・改ざん防止機能により保護されています。
          </p>
        </div>
      </div>
    </div>
  );
}