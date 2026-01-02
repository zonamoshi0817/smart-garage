"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth, db, storage } from "@/lib/firebase";
import { doc, getDoc } from 'firebase/firestore';
import { ref, uploadBytes, getBlob } from "firebase/storage";
import { downloadMaintenancePDF } from "@/lib/pdfExport";
import type { Car, MaintenanceRecord, Customization } from "@/types";

export interface ShareContentProps {
  cars: Car[];
  activeCarId?: string;
  car?: Car;
  maintenanceRecords: MaintenanceRecord[];
  customizations: Customization[];
}

export default function ShareContent({
  cars,
  activeCarId,
  car,
  maintenanceRecords,
  customizations
}: ShareContentProps) {
  const router = useRouter();
  // 用途別ShareProfileを管理
  const [shareProfiles, setShareProfiles] = useState<{
    normal?: any;
    sale?: any;
    appraisal?: any;
  }>({});
  const [loadingProfiles, setLoadingProfiles] = useState(false);
  const [copiedLinks, setCopiedLinks] = useState<{
    normal?: boolean;
    sale?: boolean;
    appraisal?: boolean;
  }>({});
  const [updatingLinks, setUpdatingLinks] = useState<{
    normal?: boolean;
    sale?: boolean;
    appraisal?: boolean;
  }>({});
  const [pageViewCounts, setPageViewCounts] = useState<{
    normal?: number | null;
    sale?: number | null;
    appraisal?: number | null;
  }>({});

  // 用途別ShareProfileを取得
  useEffect(() => {
    if (!activeCarId || !auth.currentUser) return;
    
    const loadShareProfiles = async () => {
      setLoadingProfiles(true);
      try {
        const carDoc = await getDoc(doc(db, 'users', auth.currentUser!.uid, 'cars', activeCarId));
        if (carDoc.exists()) {
          const carData = carDoc.data();
          const activeIds = carData.activeShareProfileIds || {};
          const profiles: typeof shareProfiles = {};
          const counts: typeof pageViewCounts = {};

          // 各用途のShareProfileを取得
          const types: Array<'normal' | 'sale' | 'appraisal'> = ['normal', 'sale', 'appraisal'];
          await Promise.all(types.map(async (type) => {
            const profileId = activeIds[type];
            if (profileId) {
              try {
                const profileDoc = await getDoc(doc(db, 'saleProfiles', profileId));
                if (profileDoc.exists()) {
                  profiles[type] = { id: profileDoc.id, ...profileDoc.data() };
                  
                  // 閲覧回数を取得（ShareProfileのviewCountフィールドから）
                  try {
                    const profileData = profileDoc.data();
                    counts[type] = profileData.viewCount || 0;
                  } catch (error) {
                    console.error(`Failed to load page views for ${type}:`, error);
                    counts[type] = null;
                  }
                }
              } catch (error) {
                console.error(`Failed to load ${type} profile:`, error);
              }
            }
          }));

          setShareProfiles(profiles);
          setPageViewCounts(counts);
        }
      } catch (error) {
        console.error('Failed to load share profiles:', error);
      } finally {
        setLoadingProfiles(false);
      }
    };

    loadShareProfiles();
  }, [activeCarId]);

  // 共有リンクを作成（用途別）
  const handleCreateLink = async (type: 'normal' | 'sale' | 'appraisal') => {
    if (!activeCarId || !auth.currentUser) return;
    
    try {
      setUpdatingLinks({ ...updatingLinks, [type]: true });
      const { createShareProfile } = await import('@/lib/saleProfileManager');
      const shareProfileId = await createShareProfile(activeCarId, type, {
        includeEvidence: type !== 'normal',
        includeAmounts: false,
        maskPolicy: type !== 'normal' ? 'strict' : 'auto',
      });

      // ShareProfileを再取得
      const profileDoc = await getDoc(doc(db, 'saleProfiles', shareProfileId));
      if (profileDoc.exists()) {
        setShareProfiles({
          ...shareProfiles,
          [type]: { id: profileDoc.id, ...profileDoc.data() }
        });
      }
    } catch (error: any) {
      console.error(`Failed to create ${type} link:`, error);
      alert(`共有リンクの作成に失敗しました: ${error.message}`);
    } finally {
      setUpdatingLinks({ ...updatingLinks, [type]: false });
    }
  };

  // リンクをコピー（用途別）
  const handleCopyLink = async (type: 'normal' | 'sale' | 'appraisal') => {
    const profile = shareProfiles[type];
    if (!profile?.slug) return;
    
    const url = `${typeof window !== 'undefined' ? window.location.origin : ''}/s/${profile.slug}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedLinks({ ...copiedLinks, [type]: true });
      // 3秒後に元に戻す
      setTimeout(() => setCopiedLinks({ ...copiedLinks, [type]: false }), 3000);
    } catch (error) {
      console.error('Failed to copy link:', error);
      alert('リンクのコピーに失敗しました');
    }
  };

  // リンクを停止/再開（用途別）
  const handleToggleLinkStatus = async (type: 'normal' | 'sale' | 'appraisal', currentStatus: 'active' | 'disabled') => {
    const profile = shareProfiles[type];
    if (!profile || !activeCarId || !auth.currentUser) return;
    
    const newStatus = currentStatus === 'active' ? 'disabled' : 'active';
    
    if (newStatus === 'disabled' && !confirm('リンクを無効化するとURLは閲覧できません。再開するまで有効になりません。よろしいですか？')) {
      return;
    }

    try {
      setUpdatingLinks({ ...updatingLinks, [type]: true });
      const { updateShareProfileStatus } = await import('@/lib/saleProfileManager');
      await updateShareProfileStatus(profile.id, newStatus);
      
      // ShareProfileを再取得
      const profileDoc = await getDoc(doc(db, 'saleProfiles', profile.id));
      if (profileDoc.exists()) {
        setShareProfiles({
          ...shareProfiles,
          [type]: { id: profileDoc.id, ...profileDoc.data() }
        });
      }
    } catch (error: any) {
      console.error(`Failed to toggle ${type} link status:`, error);
      alert(`リンクの${newStatus === 'active' ? '有効化' : '停止'}に失敗しました: ${error.message}`);
    } finally {
      setUpdatingLinks({ ...updatingLinks, [type]: false });
    }
  };

  // 用途別のステータスとURLを取得するヘルパー関数
  const getShareLinkInfo = (type: 'normal' | 'sale' | 'appraisal') => {
    const profile = shareProfiles[type];
    if (!profile) {
      return { status: 'not_created' as const, url: null };
    }
    const status = (profile.status || profile.visibility) === 'disabled' ? 'stopped' as const : 'active' as const;
    const url = profile.slug ? `${typeof window !== 'undefined' ? window.location.origin : ''}/s/${profile.slug}` : null;
    return { status, url, profile };
  };

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">共有</h1>
        <p className="text-sm text-gray-600">履歴をURLまたはPDFで渡せます</p>
      </div>

      {!car ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center">
          <p className="text-gray-500 mb-4">車両を選択してください</p>
          <p className="text-xs text-gray-400">右上のドロップダウンから車両を選択できます</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* 用途別カード: 通常共有リンク */}
          <ShareLinkCard
            type="normal"
            title="共有リンク（通常）"
            description="家族・友人向けに履歴を共有"
            shareProfiles={shareProfiles}
            pageViewCounts={pageViewCounts}
            copiedLinks={copiedLinks}
            updatingLinks={updatingLinks}
            loadingProfiles={loadingProfiles}
            getShareLinkInfo={getShareLinkInfo}
            handleCreateLink={handleCreateLink}
            handleCopyLink={handleCopyLink}
            handleToggleLinkStatus={handleToggleLinkStatus}
            activeCarId={activeCarId}
            router={router}
            car={car}
            maintenanceRecords={maintenanceRecords}
            customizations={customizations}
          />

          {/* 用途別カード: 売却用リンク */}
          <ShareLinkCard
            type="sale"
            title="売却用リンク"
            description="買い手向けに履歴を共有（直近整備・消耗品交換・証憑（マスク））"
            shareProfiles={shareProfiles}
            pageViewCounts={pageViewCounts}
            copiedLinks={copiedLinks}
            updatingLinks={updatingLinks}
            loadingProfiles={loadingProfiles}
            getShareLinkInfo={getShareLinkInfo}
            handleCreateLink={handleCreateLink}
            handleCopyLink={handleCopyLink}
            handleToggleLinkStatus={handleToggleLinkStatus}
            activeCarId={activeCarId}
            router={router}
            car={car}
            maintenanceRecords={maintenanceRecords}
            customizations={customizations}
          />

          {/* 用途別カード: 査定用リンク */}
          <ShareLinkCard
            type="appraisal"
            title="査定用リンク"
            description="査定会社向けに履歴を共有（交換履歴一覧・検証ID・証憑（マスク））"
            shareProfiles={shareProfiles}
            pageViewCounts={pageViewCounts}
            copiedLinks={copiedLinks}
            updatingLinks={updatingLinks}
            loadingProfiles={loadingProfiles}
            getShareLinkInfo={getShareLinkInfo}
            handleCreateLink={handleCreateLink}
            handleCopyLink={handleCopyLink}
            handleToggleLinkStatus={handleToggleLinkStatus}
            activeCarId={activeCarId}
            router={router}
            car={car}
            maintenanceRecords={maintenanceRecords}
            customizations={customizations}
          />

        </div>
      )}
    </div>
  );
}

// 用途別共有リンクカードコンポーネント
function ShareLinkCard({
  type,
  title,
  description,
  shareProfiles,
  pageViewCounts,
  copiedLinks,
  updatingLinks,
  loadingProfiles,
  getShareLinkInfo,
  handleCreateLink,
  handleCopyLink,
  handleToggleLinkStatus,
  activeCarId,
  router,
  car,
  maintenanceRecords,
  customizations
}: {
  type: 'normal' | 'sale' | 'appraisal';
  title: string;
  description: string;
  shareProfiles: { normal?: any; sale?: any; appraisal?: any };
  pageViewCounts: { normal?: number | null; sale?: number | null; appraisal?: number | null };
  copiedLinks: { normal?: boolean; sale?: boolean; appraisal?: boolean };
  updatingLinks: { normal?: boolean; sale?: boolean; appraisal?: boolean };
  loadingProfiles: boolean;
  getShareLinkInfo: (type: 'normal' | 'sale' | 'appraisal') => { status: string; url: string | null; profile?: any };
  handleCreateLink: (type: 'normal' | 'sale' | 'appraisal') => Promise<void>;
  handleCopyLink: (type: 'normal' | 'sale' | 'appraisal') => Promise<void>;
  handleToggleLinkStatus: (type: 'normal' | 'sale' | 'appraisal', currentStatus: 'active' | 'disabled') => Promise<void>;
  activeCarId?: string;
  router: any;
  car?: Car | null;
  maintenanceRecords?: MaintenanceRecord[];
  customizations?: Customization[];
}) {
  const { status, url, profile } = getShareLinkInfo(type);
  const pageViewCount = pageViewCounts[type];
  const copied = copiedLinks[type];
  const updating = updatingLinks[type];
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  
  // customizationsがundefinedの場合のデフォルト値
  const safeCustomizations = customizations || [];
  const [showSNSEditor, setShowSNSEditor] = useState(false);
  const [savingSNS, setSavingSNS] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [galleryPreviewUrls, setGalleryPreviewUrls] = useState<Record<string, string>>({});
  
  // SNS編集用の状態
  const [snsData, setSnsData] = useState({
    conceptTitle: profile?.sns?.conceptTitle || '',
    conceptBody: profile?.sns?.conceptBody || '',
    highlightParts: profile?.sns?.highlightParts || [],
    gallery: profile?.sns?.gallery || [],
    socialLinks: profile?.sns?.socialLinks || { youtube: '', instagram: '', x: '', web: '' },
    build: profile?.sns?.build || { featured: [], categories: [] },
  });

  // ギャラリー画像のプレビューURLを読み込み
  useEffect(() => {
    const loadGalleryPreviews = async () => {
      if (!snsData.gallery || snsData.gallery.length === 0) return;
      
      const urls: Record<string, string> = {};
      await Promise.all(snsData.gallery.map(async (img: { id: string; path: string; caption?: string }) => {
        try {
          const storageRef = ref(storage, img.path);
          const blob = await getBlob(storageRef);
          const url = URL.createObjectURL(blob);
          urls[img.id] = url;
        } catch (error) {
          console.error(`Failed to load preview for ${img.id}:`, error);
        }
      }));
      setGalleryPreviewUrls(urls);
    };

    loadGalleryPreviews();

    // クリーンアップ
    return () => {
      Object.values(galleryPreviewUrls).forEach(url => {
        try {
          URL.revokeObjectURL(url);
        } catch (e) {
          // 既に解放済みの場合は無視
        }
      });
    };
  }, [snsData.gallery]);

  // プロフィールが変更されたときに状態を更新
  useEffect(() => {
    if (profile?.sns) {
      setSnsData({
        conceptTitle: profile.sns.conceptTitle || '',
        conceptBody: profile.sns.conceptBody || '',
        highlightParts: profile.sns.highlightParts || [],
        gallery: profile.sns.gallery || [],
        socialLinks: profile.sns.socialLinks || { youtube: '', instagram: '', x: '', web: '' },
        build: profile.sns.build || { featured: [], categories: [] },
      });
    }
  }, [profile?.id, profile?.sns]);

  // 画像アップロードハンドラー
  const handleImageUpload = async (files: FileList) => {
    if (!profile?.id || !auth.currentUser) return;
    
    setUploadingImages(true);
    try {
      const uploadPromises = Array.from(files).slice(0, 12 - snsData.gallery.length).map(async (file, index) => {
        const imageId = `img_${Date.now()}_${index}_${Math.random().toString(36).substring(7)}`;
        const storagePath = `share/${profile.id}/gallery/${imageId}.jpg`;
        const storageRef = ref(storage, storagePath);
        
        // メタデータにownerUidを追加
        const metadata = {
          customMetadata: {
            ownerUid: auth.currentUser!.uid,
            uploadedAt: new Date().toISOString()
          }
        };
        
        await uploadBytes(storageRef, file, metadata);
        
        // プレビューURLを生成
        const previewUrl = URL.createObjectURL(file);
        setGalleryPreviewUrls(prev => ({ ...prev, [imageId]: previewUrl }));
        
        return { id: imageId, path: storagePath, caption: '' };
      });

      const newImages = await Promise.all(uploadPromises);
      setSnsData({
        ...snsData,
        gallery: [...snsData.gallery, ...newImages]
      });
    } catch (error: any) {
      console.error('Failed to upload images:', error);
      alert(`画像のアップロードに失敗しました: ${error.message}`);
    } finally {
      setUploadingImages(false);
    }
  };

  // 画像削除ハンドラー
  const handleImageDelete = (imageId: string) => {
    // プレビューURLを解放
    if (galleryPreviewUrls[imageId]) {
      try {
        URL.revokeObjectURL(galleryPreviewUrls[imageId]);
      } catch (e) {
        // 既に解放済みの場合は無視
      }
      setGalleryPreviewUrls(prev => {
        const newUrls = { ...prev };
        delete newUrls[imageId];
        return newUrls;
      });
    }
    
    setSnsData({
      ...snsData,
      gallery: snsData.gallery.filter((img: { id: string; path: string; caption?: string }) => img.id !== imageId)
    });
  };

  // PDF生成ハンドラー
  const handleGeneratePDF = async () => {
    if (!car) return;
    
    setIsGeneratingPDF(true);
    try {
      if (type === 'sale' || type === 'appraisal') {
        // 売却/査定用PDF: メンテナンス履歴PDF
        if (!maintenanceRecords || maintenanceRecords.length === 0) {
          alert('メンテナンス履歴がありません。先にメンテナンス記録を追加してください。');
          setIsGeneratingPDF(false);
          return;
        }
        await downloadMaintenancePDF({
          car,
          maintenanceRecords: maintenanceRecords || []
        });
        alert('✅ メンテナンス履歴PDFを作成しました！');
      }
    } catch (error) {
      console.error('PDF生成エラー:', error);
      alert('PDF生成中にエラーが発生しました。');
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
        <p className="text-xs text-gray-500 mt-1">{description}</p>
      </div>

      {/* ステータス表示 */}
      <div className="mb-4">
        {status === 'not_created' && (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <span className="w-2 h-2 rounded-full bg-gray-400"></span>
            <span>未作成</span>
          </div>
        )}
        {status === 'active' && (
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm text-green-600">
              <span className="w-2 h-2 rounded-full bg-green-500"></span>
              <span>公開中</span>
              {pageViewCount !== null && pageViewCount !== undefined && (
                <span className="text-xs text-gray-500 ml-2">（閲覧回数: {pageViewCount}）</span>
              )}
            </div>
            {profile?.updatedAt && (
              <div className="text-xs text-gray-500 ml-4">
                最終更新: {new Date(profile.updatedAt.toMillis?.() || profile.updatedAt._seconds * 1000).toLocaleDateString('ja-JP', {
                  year: 'numeric',
                  month: '2-digit',
                  day: '2-digit'
                })}
              </div>
            )}
          </div>
        )}
        {status === 'stopped' && (
          <div className="flex items-center gap-2 text-sm text-red-600">
            <span className="w-2 h-2 rounded-full bg-red-500"></span>
            <span>停止中</span>
          </div>
        )}
      </div>

      {/* Primary Action */}
      {status === 'not_created' ? (
        <div className="mb-4">
          <button
            onClick={() => handleCreateLink(type)}
            disabled={updating || loadingProfiles}
            className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium"
          >
            {updating ? '作成中...' : '共有リンクを作成'}
          </button>
        </div>
      ) : status === 'active' && url ? (
        <div className="mb-4">
          {/* 共有リンク表示とコピーボタン */}
          <div 
            className={`flex items-center gap-2 mb-3 p-3 rounded-lg border transition-colors ${
              copied 
                ? 'bg-blue-50 border-blue-300' 
                : 'bg-gray-50 border-gray-200'
            }`}
          >
            <div className="flex-1 min-w-0">
              <p className="text-xs text-gray-500 mb-1">共有リンク</p>
              <p className="text-sm text-gray-900 truncate font-mono">
                {url}
              </p>
            </div>
            <button
              onClick={() => handleCopyLink(type)}
              className={`flex-shrink-0 px-3 py-1.5 rounded text-sm transition-colors ${
                copied
                  ? 'bg-green-600 text-white'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {copied ? '✓ コピー済み' : 'コピー'}
            </button>
          </div>
        </div>
      ) : null}

      {/* Secondary Actions */}
      {status === 'active' && url && (
        <div className="flex gap-2 mb-3">
          <button
            onClick={() => window.open(url, '_blank')}
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm"
          >
            公開ページを見る
          </button>
          <button
            onClick={() => router.push(`/vehicles/${activeCarId}/sale-mode`)}
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm"
          >
            共有設定
          </button>
        </div>
      )}

      {/* PDF生成（売却/査定用のみ） */}
      {(type === 'sale' || type === 'appraisal') && status === 'active' && (
        <div className="mb-3 pt-3 border-t border-gray-200">
          <button
            onClick={handleGeneratePDF}
            disabled={isGeneratingPDF || !maintenanceRecords || maintenanceRecords.length === 0}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors text-sm font-medium"
          >
            {isGeneratingPDF 
              ? 'PDF生成中...' 
              : (!maintenanceRecords || maintenanceRecords.length === 0)
                ? '履歴を追加してPDFを作成'
                : type === 'sale' ? '売却用PDFを作成' : '査定用PDFを作成'
            }
          </button>
          {maintenanceRecords && maintenanceRecords.length > 0 && (
            <p className="text-xs text-gray-500 mt-2 text-center">
              {maintenanceRecords.length}件の記録を含みます
            </p>
          )}
        </div>
      )}

      {/* SNS共有ページ編集（通常リンクのみ） */}
      {type === 'normal' && status === 'active' && profile && (
        <div className="mb-3 pt-3 border-t border-gray-200">
          <button
            onClick={() => setShowSNSEditor(!showSNSEditor)}
            className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm flex items-center justify-center gap-2"
          >
            <span>SNS共有ページを編集</span>
            <svg 
              className={`w-4 h-4 transition-transform ${showSNSEditor ? 'rotate-180' : ''}`}
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          
          {showSNSEditor && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  コンセプトタイトル（任意）
                </label>
                <input
                  type="text"
                  value={snsData.conceptTitle}
                  onChange={(e) => setSnsData({ ...snsData, conceptTitle: e.target.value })}
                  placeholder="例：街乗り仕様"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  maxLength={60}
                />
              </div>
              
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  紹介文（30〜200字）
                </label>
                <textarea
                  value={snsData.conceptBody}
                  onChange={(e) => setSnsData({ ...snsData, conceptBody: e.target.value })}
                  placeholder="例：週末サーキットと通勤を両立するFL5。メンテナンスを徹底して、長く楽しめる状態をキープしています。"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={4}
                  maxLength={200}
                />
                <p className="text-xs text-gray-500 mt-1">
                  {snsData.conceptBody.length}/200字
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-2">
                  ハイライト（最大6件）
                </label>
                <div className="space-y-2">
                  {snsData.highlightParts.map((part: { label: string; value: string }, index: number) => (
                    <div key={index} className="flex gap-2">
                      <input
                        type="text"
                        value={part.label}
                        onChange={(e) => {
                          const newParts = [...snsData.highlightParts];
                          newParts[index] = { ...part, label: e.target.value };
                          setSnsData({ ...snsData, highlightParts: newParts });
                        }}
                        placeholder="ラベル"
                        className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                      <input
                        type="text"
                        value={part.value}
                        onChange={(e) => {
                          const newParts = [...snsData.highlightParts];
                          newParts[index] = { ...part, value: e.target.value };
                          setSnsData({ ...snsData, highlightParts: newParts });
                        }}
                        placeholder="値"
                        className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                      <button
                        onClick={() => {
                          const newParts = snsData.highlightParts.filter((_: { label: string; value: string }, i: number) => i !== index);
                          setSnsData({ ...snsData, highlightParts: newParts });
                        }}
                        className="px-2 py-1 text-red-600 hover:bg-red-50 rounded text-sm"
                      >
                        削除
                      </button>
                    </div>
                  ))}
                  {snsData.highlightParts.length < 6 && (
                    <button
                      onClick={() => {
                        setSnsData({
                          ...snsData,
                          highlightParts: [...snsData.highlightParts, { label: '', value: '' }]
                        });
                      }}
                      className="text-xs text-blue-600 hover:text-blue-700"
                    >
                      + 追加
                    </button>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-2">
                  ギャラリー画像（最大12枚）
                </label>
                {snsData.gallery.length > 0 && (
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    {snsData.gallery.map((img: { id: string; path: string; caption?: string }) => {
                      const previewUrl = galleryPreviewUrls[img.id];
                      return (
                        <div key={img.id} className="relative aspect-square rounded-lg overflow-hidden bg-gray-200 group">
                          {previewUrl ? (
                            <img 
                              src={previewUrl} 
                              alt={img.caption || 'Gallery image'}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
                              読み込み中...
                            </div>
                          )}
                          <button
                            onClick={() => handleImageDelete(img.id)}
                            className="absolute top-1 right-1 w-6 h-6 bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-xs"
                          >
                            ×
                          </button>
                          {img.caption && (
                            <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs p-1 truncate">
                              {img.caption}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
                {snsData.gallery.length < 12 && (
                  <label className="block w-full px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 cursor-pointer transition-colors text-center text-sm text-gray-600">
                    {uploadingImages ? 'アップロード中...' : '画像を選択（最大12枚）'}
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={(e) => e.target.files && handleImageUpload(e.target.files)}
                      disabled={uploadingImages}
                      className="hidden"
                    />
                  </label>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-2">
                  SNSリンク
                </label>
                <div className="space-y-2">
                  <input
                    type="url"
                    value={snsData.socialLinks.youtube || ''}
                    onChange={(e) => setSnsData({
                      ...snsData,
                      socialLinks: { ...snsData.socialLinks, youtube: e.target.value }
                    })}
                    placeholder="YouTube URL"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    type="url"
                    value={snsData.socialLinks.instagram || ''}
                    onChange={(e) => setSnsData({
                      ...snsData,
                      socialLinks: { ...snsData.socialLinks, instagram: e.target.value }
                    })}
                    placeholder="Instagram URL"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    type="url"
                    value={snsData.socialLinks.x || ''}
                    onChange={(e) => setSnsData({
                      ...snsData,
                      socialLinks: { ...snsData.socialLinks, x: e.target.value }
                    })}
                    placeholder="X (Twitter) URL"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-2">
                  主要パーツ（最大6件）
                </label>
                {(() => {
                  // デバッグ: customizationsの内容を確認
                  console.log('[ShareLinkCard] customizations:', customizations);
                  console.log('[ShareLinkCard] safeCustomizations:', safeCustomizations);
                  console.log('[ShareLinkCard] customizations length:', customizations?.length);
                  console.log('[ShareLinkCard] safeCustomizations length:', safeCustomizations.length);
                  if (safeCustomizations.length > 0) {
                    console.log('[ShareLinkCard] First customization:', safeCustomizations[0]);
                  }
                  return null;
                })()}
                {safeCustomizations.length > 0 ? (
                  <div className="space-y-2 max-h-60 overflow-y-auto border border-gray-200 rounded-lg p-3">
                    {safeCustomizations.map((custom) => {
                      const isSelected = snsData.build.featured.some(
                        (f: { label: string; value: string }) => f.label === (custom.brand || '') && f.value === custom.title
                      );
                      const isMaxReached = snsData.build.featured.length >= 6;
                      
                      return (
                        <label
                          key={custom.id}
                          className={`flex items-start gap-2 p-2 rounded border cursor-pointer transition-colors ${
                            isSelected
                              ? 'bg-blue-50 border-blue-300'
                              : isMaxReached
                                ? 'bg-gray-50 border-gray-200 opacity-50 cursor-not-allowed'
                                : 'bg-white border-gray-200 hover:bg-gray-50'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => {
                              if (e.target.checked) {
                                if (snsData.build.featured.length >= 6) return;
                                const newFeatured = [...snsData.build.featured, {
                                  label: custom.brand || custom.categories?.[0] || 'カスタム',
                                  value: custom.title
                                }];
                                setSnsData({ ...snsData, build: { ...snsData.build, featured: newFeatured } });
                              } else {
                                const newFeatured = snsData.build.featured.filter(
                                  (f: { label: string; value: string }) => !(f.label === (custom.brand || '') && f.value === custom.title)
                                );
                                setSnsData({ ...snsData, build: { ...snsData.build, featured: newFeatured } });
                              }
                            }}
                            disabled={isMaxReached && !isSelected}
                            className="mt-1 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          />
                          <div className="flex-1">
                            <div className="text-sm font-medium text-gray-900">
                              {custom.brand && `${custom.brand} `}
                              {custom.title}
                            </div>
                            {custom.categories && custom.categories.length > 0 && (
                              <div className="text-xs text-gray-500 mt-0.5">
                                {custom.categories.join(' / ')}
                              </div>
                            )}
                          </div>
                        </label>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-xs text-gray-500 p-3 bg-gray-50 rounded-lg border border-gray-200">
                    カスタマイズ記録がありません。先にカスタマイズを追加してください。
                  </div>
                )}
                {snsData.build.featured.length > 0 && (
                  <div className="mt-3 p-2 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="text-xs font-medium text-blue-900 mb-1">選択中のパーツ（{snsData.build.featured.length}/6）</div>
                    <div className="space-y-1">
                      {snsData.build.featured.map((part: { label: string; value: string }, index: number) => (
                        <div key={index} className="flex items-center justify-between text-xs text-blue-800">
                          <span>{part.label}: {part.value}</span>
                          <button
                            onClick={() => {
                              const newFeatured = snsData.build.featured.filter((_: { label: string; value: string }, i: number) => i !== index);
                              setSnsData({ ...snsData, build: { ...snsData.build, featured: newFeatured } });
                            }}
                            className="text-red-600 hover:text-red-700"
                          >
                            削除
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={async () => {
                    if (!profile?.id) return;
                    setSavingSNS(true);
                    try {
                      const { updateShareProfileSNS } = await import('@/lib/saleProfileManager');
                      // galleryのpathをそのまま保存（画像は既にアップロード済み）
                      await updateShareProfileSNS(profile.id, {
                        ...snsData,
                        gallery: snsData.gallery.map((img: { id: string; path: string; caption?: string }) => ({
                          id: img.id,
                          path: img.path,
                          caption: img.caption || undefined
                        }))
                      });
                      alert('✅ SNS共有設定を保存しました！');
                      // ShareProfileを再取得
                      const profileDoc = await getDoc(doc(db, 'saleProfiles', profile.id));
                      if (profileDoc.exists()) {
                        // 親コンポーネントに反映させるため、ページをリロード
                        window.location.reload();
                      }
                    } catch (error: any) {
                      console.error('Failed to save SNS settings:', error);
                      alert(`SNS設定の保存に失敗しました: ${error.message}`);
                    } finally {
                      setSavingSNS(false);
                    }
                  }}
                  disabled={savingSNS}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors text-sm font-medium"
                >
                  {savingSNS ? '保存中...' : '保存'}
                </button>
                <button
                  onClick={() => window.open(url || '', '_blank')}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm"
                >
                  プレビュー
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Danger Action（小さく、右寄せ） */}
      {status !== 'not_created' && (
        <div className="pt-3 border-t border-gray-200 flex justify-end">
          <button
            onClick={() => handleToggleLinkStatus(type, status === 'stopped' ? 'disabled' : 'active')}
            disabled={updating}
            className="flex items-center gap-1 text-xs text-gray-600 hover:text-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {status === 'stopped' ? (
              <>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
                リンクを再開
              </>
            ) : (
              <>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                リンクを無効化
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}

