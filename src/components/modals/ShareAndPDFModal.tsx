'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Car, MaintenanceRecord, Customization } from '@/types';
import { downloadMaintenancePDF, downloadBuildSheetPDF } from '@/lib/pdfExport';
import { updateCar } from '@/lib/cars';

interface ShareAndPDFModalProps {
  car: Car;
  maintenanceRecords: MaintenanceRecord[];
  customizations?: Customization[];
  onClose: () => void;
  onCarUpdated?: () => void;
}

/**
 * 共有用データの作成・公開設定モーダル
 * 車両履歴のPDF作成と公開マイカーページの設定を提供
 */
export default function ShareAndPDFModal({ 
  car, 
  maintenanceRecords, 
  customizations = [],
  onClose,
  onCarUpdated
}: ShareAndPDFModalProps) {
  const router = useRouter();
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState<'pdf' | 'public'>('pdf');
  
  // 公開設定の状態
  const [isPublic, setIsPublic] = useState(car.isPublic || false);
  const [publicTagline, setPublicTagline] = useState(car.publicTagline || '');
  const [ownerHandle, setOwnerHandle] = useState(car.ownerHandle || '');
  const [ownerRegion, setOwnerRegion] = useState(car.ownerRegion || '');
  const [ownerPicks, setOwnerPicks] = useState<string[]>(car.ownerPicks || []);
  const [isSaving, setIsSaving] = useState(false);

  // 公開設定されているカスタマイズのみを取得
  const publicCustomizations = customizations.filter(c => c.isPublic);

  const handleSavePublicSettings = async () => {
    if (!car.id) return;
    
    setIsSaving(true);
    try {
      await updateCar(car.id, {
        isPublic,
        publicTagline: publicTagline || undefined,
        ownerHandle: ownerHandle || undefined,
        ownerRegion: ownerRegion || undefined,
        ownerPicks: ownerPicks.length > 0 ? ownerPicks : undefined,
      });
      
      if (onCarUpdated) {
        onCarUpdated();
      }
      
      alert('✅ 公開設定を保存しました！');
    } catch (error) {
      console.error('公開設定の保存エラー:', error);
      alert('公開設定の保存に失敗しました。');
    } finally {
      setIsSaving(false);
    }
  };

  const toggleOwnerPick = (customizationId: string) => {
    if (ownerPicks.includes(customizationId)) {
      setOwnerPicks(ownerPicks.filter(id => id !== customizationId));
    } else {
      if (ownerPicks.length < 3) {
        setOwnerPicks([...ownerPicks, customizationId]);
      } else {
        alert('OWNER\'S PICKは最大3件まで選択できます。');
      }
    }
  };

  const handleGeneratePDF = async (type: 'maintenance' | 'buildsheet') => {
    setIsGenerating(true);
    try {
      if (type === 'maintenance') {
        if (maintenanceRecords.length === 0) {
          alert('メンテナンス履歴がありません。先にメンテナンス記録を追加してください。');
          setIsGenerating(false);
          return;
        }
        await downloadMaintenancePDF({
          car,
          maintenanceRecords
        });
        alert('✅ メンテナンス履歴PDFを作成しました！');
      } else {
        // ビルドシートPDF
        const publicUrl = car.id ? `${window.location.origin}/c/${car.id}` : undefined;
        await downloadBuildSheetPDF({
          car,
          customizations: customizations || [],
          maintenanceRecords,
          publicUrl
        });
        alert('✅ ビルドシートPDFを作成しました！');
      }
    } catch (error) {
      console.error('PDF生成エラー:', error);
      alert('PDF生成中にエラーが発生しました。');
    } finally {
      setIsGenerating(false);
    }
  };



  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ヘッダー */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 rounded-t-2xl">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <span>📄</span>
                <span>共有用データの作成</span>
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                {car.name}{car.modelCode ? ` (${car.modelCode})` : ''}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-300 hover:text-gray-500 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          {/* タブ */}
          <div className="flex gap-2 border-b border-gray-200">
            <button
              onClick={() => setActiveTab('pdf')}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === 'pdf'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              PDF作成
            </button>
            <button
              onClick={() => setActiveTab('public')}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === 'public'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              公開設定
            </button>
          </div>
        </div>

        {/* コンテンツ */}
        <div className="p-6 space-y-6">
          {activeTab === 'pdf' && (
            <>
              {/* メンテナンス履歴PDF */}
              <div className="p-5 bg-gradient-to-r from-indigo-50 to-blue-50 rounded-xl border border-indigo-200">
                <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                  <span>📄</span>
                  <span>車両履歴PDF</span>
                </h3>
                <p className="text-xs text-gray-600 mb-2">
                  対象：メンテナンス・給油・証跡
                </p>
                <p className="text-sm text-gray-600 mb-3">
                  全メンテナンス履歴・給油記録を証跡付きPDFで作成します
                </p>
                {maintenanceRecords.length > 0 ? (
                  <p className="text-xs text-indigo-700 mb-3">
                    📊 {maintenanceRecords.length}件のメンテナンス記録をPDFに含めます
                  </p>
                ) : (
                  <div className="text-xs text-orange-700 mb-3 space-y-1">
                    <p className="font-medium">
                      ⚠️ 記録がありません。先に記録を追加してください。
                  </p>
                    {car.id && (
                      <button
                        onClick={() => {
                          onClose();
                          router.push(`/maintenance?car=${car.id}`);
                        }}
                        className="text-indigo-600 hover:text-indigo-700 underline"
                      >
                        メンテナンスを追加 →
                      </button>
                    )}
                  </div>
                )}
                <div className="flex gap-3">
                  <button
                    onClick={() => handleGeneratePDF('maintenance')}
                    disabled={isGenerating || maintenanceRecords.length === 0}
                    className="flex-1 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors shadow-md flex items-center justify-center gap-2"
                  >
                    <span>📥</span>
                    <span>{isGenerating ? 'PDF生成中...' : maintenanceRecords.length === 0 ? '履歴を追加してPDFを作成' : 'PDFを作成'}</span>
                  </button>
                </div>
              </div>

              {/* ビルドシートPDF */}
              <div className="p-5 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl border border-blue-200">
                <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                  <span>🏎️</span>
                  <span>ビルドシートPDF</span>
                </h3>
                <p className="text-xs text-gray-600 mb-2">
                  対象：カスタマイズ
                </p>
                <p className="text-sm text-gray-600 mb-3">
                  カスタマイズ情報を中心としたビルドシート形式のPDFを作成します
                </p>
                {customizations && customizations.length > 0 ? (
                  <p className="text-xs text-blue-700 mb-3">
                    🎨 {customizations.length}件のカスタマイズ記録をPDFに含めます
                  </p>
                ) : (
                  <div className="text-xs text-orange-700 mb-3 space-y-1">
                    <p className="font-medium">
                    ⚠️ カスタマイズ記録がありません。先に記録を追加してください。
                  </p>
                    {car.id && (
                      <button
                        onClick={() => {
                          onClose();
                          router.push(`/customizations?car=${car.id}`);
                        }}
                        className="text-blue-600 hover:text-blue-700 underline"
                      >
                        カスタマイズを追加 →
                      </button>
                    )}
                  </div>
                )}
                <div className="flex gap-3">
                  <button
                    onClick={() => handleGeneratePDF('buildsheet')}
                    disabled={isGenerating || !customizations || customizations.length === 0}
                    className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors shadow-md flex items-center justify-center gap-2"
                  >
                    <span>📥</span>
                    <span>{isGenerating ? 'PDF生成中...' : (!customizations || customizations.length === 0) ? 'カスタマイズを追加してPDFを作成' : 'PDFを作成'}</span>
                  </button>
                </div>
              </div>
          
              {/* 証跡について */}
              <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                <div className="flex items-start gap-3">
                  <span className="flex-shrink-0 text-2xl">ℹ️</span>
                  <div className="text-sm text-gray-600 space-y-2">
                    <p className="font-medium text-gray-900">改ざん防止について</p>
                    <p>
                      PDFには検証用IDが含まれ、第三者が改ざんの有無を確認できます。
                    </p>
                    <details className="text-xs">
                      <summary className="cursor-pointer text-blue-600 hover:text-blue-700">
                        詳しく見る
                      </summary>
                      <p className="mt-2 text-gray-600">
                        データはブロックチェーン技術で保護され、検証IDにより改ざんの有無を確認できます。
                    </p>
                    </details>
                  </div>
                </div>
              </div>
            </>
          )}

          {activeTab === 'public' && (
            <div className="space-y-6">
              {/* 公開設定 */}
              <div className="p-5 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200">
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <span>🌐</span>
                  <span>公開マイカーページ設定</span>
                </h3>
                
                <div className="space-y-4">
                  {/* 公開ON/OFF */}
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isPublic}
                      onChange={(e) => setIsPublic(e.target.checked)}
                      className="mr-3 w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium text-gray-900">公開マイカーページを有効にする</span>
                  </label>

                  {isPublic && (
                    <>
                      {/* キャッチコピー */}
                      <div>
                        <label className="block text-sm font-medium text-gray-800 mb-2">
                          一言キャッチコピー（任意）
                        </label>
                        <input
                          type="text"
                          value={publicTagline}
                          onChange={(e) => setPublicTagline(e.target.value)}
                          placeholder="例：週末サーキットと通勤を両立するFL5"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          maxLength={100}
                        />
                      </div>

                      {/* オーナー情報 */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-800 mb-2">
                            オーナーハンドルネーム
                          </label>
                          <input
                            type="text"
                            value={ownerHandle}
                            onChange={(e) => setOwnerHandle(e.target.value)}
                            placeholder="例：Ken"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            maxLength={50}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-800 mb-2">
                            地域（都道府県）
                          </label>
                          <input
                            type="text"
                            value={ownerRegion}
                            onChange={(e) => setOwnerRegion(e.target.value)}
                            placeholder="例：東京都"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            maxLength={20}
                          />
                        </div>
                      </div>

                      {/* OWNER'S PICK */}
                      {publicCustomizations.length > 0 && (
                        <div>
                          <label className="block text-sm font-medium text-gray-800 mb-2">
                            OWNER'S PICK（最大3件）
                          </label>
                          <p className="text-xs text-gray-600 mb-3">
                            公開ページで特に見せたいカスタムを選択してください
                          </p>
                          <div className="space-y-2 max-h-60 overflow-y-auto">
                            {publicCustomizations.map((custom) => {
                              const isSelected = ownerPicks.includes(custom.id || '');
                              return (
                                <label
                                  key={custom.id}
                                  className={`flex items-center p-3 border rounded-lg cursor-pointer transition-colors ${
                                    isSelected
                                      ? 'border-blue-500 bg-blue-50'
                                      : 'border-gray-200 hover:border-gray-300'
                                  }`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => toggleOwnerPick(custom.id || '')}
                                    disabled={!isSelected && ownerPicks.length >= 3}
                                    className="mr-3 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                  />
                                  <div className="flex-1">
                                    <div className="font-medium text-sm text-gray-900">
                                      {custom.brand && `${custom.brand} `}
                                      {custom.title}
                                    </div>
                                    <div className="text-xs text-gray-600">
                                      {custom.categories.join(' / ')}
                                    </div>
                                  </div>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* 公開URL */}
                      {car.id && (
                        <div className="p-3 bg-white rounded-lg border border-gray-200">
                          <div className="text-xs text-gray-500 mb-1">公開URL</div>
                          <div className="text-sm font-mono text-blue-600 break-all">
                            {typeof window !== 'undefined' && `${window.location.origin}/c/${car.id}`}
                          </div>
                        </div>
                      )}

                      {/* 保存ボタン */}
                      <button
                        onClick={handleSavePublicSettings}
                        disabled={isSaving}
                        className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors shadow-md"
                      >
                        {isSaving ? '保存中...' : '公開設定を保存'}
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* フッター */}
        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 rounded-b-2xl">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-white border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
}


