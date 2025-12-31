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
}

// Feature flag: テンプレートブロックの表示制御
const SHOW_TEMPLATE_BLOCK = false;

export default function SalePublicPage({
  viewModel,
  visibility,
  analyticsEnabled,
}: SalePublicPageProps) {
  const slug = viewModel.saleProfile.slug;

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

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* 査定士向け要点（最上段） */}
        <section className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl border-2 border-blue-200 p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">査定の要点</h2>
          <div className="grid md:grid-cols-3 gap-4">
            {/* 直近整備の要点 */}
            <div className="bg-white rounded-lg p-4">
              <div className="text-sm font-medium text-gray-600 mb-2">直近整備</div>
              {latestMaintenance ? (
                <div>
                  <div className="font-semibold text-gray-900 text-sm">{latestMaintenance.title}</div>
                  <div className="text-xs text-gray-600 mt-1">
                    {formatDate(latestMaintenance.date)}
                  </div>
                  {latestMaintenance.mileageKm && (
                    <div className="text-xs text-gray-600">
                      走行距離: {formatMileage(latestMaintenance.mileageKm)}
                    </div>
                  )}
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
                  {consumablesSummary.map((item) => {
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
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-sm text-gray-500">記録なし</div>
              )}
            </div>

            {/* 証跡点数 */}
            <div className="bg-white rounded-lg p-4">
              <div className="text-sm font-medium text-gray-600 mb-2">証跡</div>
              <div className="text-2xl font-bold text-blue-600">{evidenceCount}</div>
              <div className="text-xs text-gray-600">マスク済み証跡</div>
            </div>
          </div>
        </section>

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

        {/* 直近12ヶ月サマリー */}
        <section className="bg-white rounded-2xl border border-gray-200 p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            直近12ヶ月サマリー
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

        {/* 消耗品交換一覧 */}
        <section className="bg-white rounded-2xl border border-gray-200 p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            消耗品交換一覧
          </h2>
          <ConsumablesTable consumables={viewModel.consumables} />
        </section>

        {/* 予防整備一覧 */}
        {viewModel.preventiveMaintenance.length > 0 && (
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

        {/* 証跡 */}
        {/* visibility='disabled'の場合は証跡を表示しない（既に404だが、念のため） */}
        {viewModel.evidences.length > 0 && visibility !== 'disabled' && (
          <section className="bg-white rounded-2xl border border-gray-200 p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">証跡</h2>
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