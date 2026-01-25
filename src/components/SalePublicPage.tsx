/**
 * 売却用公開ページのUIコンポーネント
 */

'use client';

import { useEffect } from 'react';
import type { SalePublicViewModel } from '@/lib/saleProfile';
import ConsumablesTable from './ConsumablesTable';
import EvidenceGallery from './EvidenceGallery';
import EvidenceReliabilityBadge from './EvidenceReliabilityBadge';

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
  // 全証跡数（maskStatusに関係なく）を使用
  const evidenceCount = viewModel.totalEvidenceCount || 0;
  
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

  // 用途別のサマリーセクション（最上段）
  const renderSummarySection = () => {
    // 要点セクションは不要のため常に非表示
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
                            {item.hasEvidence !== undefined && (
                              <EvidenceReliabilityBadge hasEvidence={item.hasEvidence} />
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

        {/* ビルド（カスタマイズパーツ） */}
        {viewModel.customizations && viewModel.customizations.length > 0 && (
          <section className="bg-white rounded-2xl border border-gray-200 p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              ビルド
            </h2>
            <div className="space-y-4">
              {viewModel.customizations.map((customization) => (
                <div
                  key={customization.id}
                  className="border-b border-gray-100 pb-4 last:border-b-0 last:pb-0"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold text-gray-900">
                          {customization.title}
                        </h3>
                        {customization.brand && (
                          <span className="text-sm text-gray-600">
                            ({customization.brand}
                            {customization.modelCode && ` ${customization.modelCode}`})
                          </span>
                        )}
                        {customization.hasEvidence !== undefined && (
                          <EvidenceReliabilityBadge hasEvidence={customization.hasEvidence} />
                        )}
                      </div>
                      {customization.categories && customization.categories.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-2">
                          {customization.categories.map((category, idx) => (
                            <span
                              key={idx}
                              className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded"
                            >
                              {category}
                            </span>
                          ))}
                        </div>
                      )}
                      <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                        {customization.date && (
                          <span>
                            実施日: {formatDate(customization.date)}
                          </span>
                        )}
                        {customization.odoKm !== undefined && (
                          <span>
                            走行距離: {formatMileage(customization.odoKm)}
                          </span>
                        )}
                        {customization.vendorName && (
                          <span>
                            施工店: {customization.vendorName}
                          </span>
                        )}
                      </div>
                      {customization.memo && (
                        <div className="text-sm text-gray-600 mt-2">
                          {customization.memo}
                        </div>
                      )}
                      {customization.link && (
                        <a
                          href={customization.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-blue-600 hover:underline mt-2 inline-block"
                        >
                          詳細を見る →
                        </a>
                      )}
                    </div>
                    {!isBuyer && (customization.partsCostJpy !== undefined ||
                      customization.laborCostJpy !== undefined ||
                      customization.otherCostJpy !== undefined) && (
                      <div className="text-right">
                        <div className="text-sm text-gray-600 mb-1">費用</div>
                        <div className="font-semibold text-gray-900">
                          {formatAmount(
                            (customization.partsCostJpy || 0) +
                            (customization.laborCostJpy || 0) +
                            (customization.otherCostJpy || 0)
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
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


        {/* フッター（PR5: 発行日時・検証ID・改ざん防止の説明） */}
        <div className="mt-8 pt-6 border-t border-gray-200">
          <div className="flex flex-col gap-4 text-xs text-gray-500">
            {/* 上段: 発行日時・検証ID・改ざん防止 */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
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
    </div>
  );
}