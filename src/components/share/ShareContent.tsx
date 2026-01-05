"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth, db, storage } from "@/lib/firebase";
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { downloadMaintenancePDF } from "@/lib/pdfExport";
import { timestampToDate } from "@/lib/converters";
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
  const [activeTab, setActiveTab] = useState<'normal' | 'sale'>('normal');
  // 送付先セグメント（売却タブ内）
  const [saleRecipient, setSaleRecipient] = useState<'buyer' | 'appraiser'>('buyer');
  // 用途別ShareProfileを管理
  const [shareProfiles, setShareProfiles] = useState<{
    normal?: any;
    sale_buyer?: any;
    sale_appraiser?: any;
    // 後方互換性のため
    sale?: any;
    appraisal?: any;
  }>({});
  const [loadingProfiles, setLoadingProfiles] = useState(false);
  const [copiedLinks, setCopiedLinks] = useState<{
    normal?: boolean;
    sale_buyer?: boolean;
    sale_appraiser?: boolean;
    // 後方互換性のため
    sale?: boolean;
    appraisal?: boolean;
  }>({});
  const [updatingLinks, setUpdatingLinks] = useState<{
    normal?: boolean;
    sale_buyer?: boolean;
    sale_appraiser?: boolean;
    // 後方互換性のため
    sale?: boolean;
    appraisal?: boolean;
  }>({});
  const [pageViewCounts, setPageViewCounts] = useState<{
    normal?: number | null;
    sale_buyer?: number | null;
    sale_appraiser?: number | null;
    // 後方互換性のため
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
          const types: Array<'normal' | 'sale_buyer' | 'sale_appraiser'> = ['normal', 'sale_buyer', 'sale_appraiser'];
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
  const handleCreateLink = async (type: 'normal' | 'sale_buyer' | 'sale_appraiser') => {
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

  // 売却用リンクを作成（買い手向けと査定会社向けの2リンクを同時に作成）
  const handleCreateSaleLinks = async () => {
    if (!activeCarId || !auth.currentUser) return;
    
    try {
      setUpdatingLinks({ ...updatingLinks, sale_buyer: true, sale_appraiser: true });
      const { createShareProfile } = await import('@/lib/saleProfileManager');
      
      // 買い手向けリンクを作成
      const buyerProfileId = await createShareProfile(activeCarId, 'sale_buyer', {
        includeEvidence: true,
        includeAmounts: false,
        maskPolicy: 'strict',
      });

      // 査定会社向けリンクを作成
      const appraiserProfileId = await createShareProfile(activeCarId, 'sale_appraiser', {
        includeEvidence: true,
        includeAmounts: false,
        maskPolicy: 'strict',
      });

      // ShareProfileを再取得
      const [buyerDoc, appraiserDoc] = await Promise.all([
        getDoc(doc(db, 'saleProfiles', buyerProfileId)),
        getDoc(doc(db, 'saleProfiles', appraiserProfileId))
      ]);

      const updatedProfiles = { ...shareProfiles };
      if (buyerDoc.exists()) {
        updatedProfiles.sale_buyer = { id: buyerDoc.id, ...buyerDoc.data() };
      }
      if (appraiserDoc.exists()) {
        updatedProfiles.sale_appraiser = { id: appraiserDoc.id, ...appraiserDoc.data() };
      }
      setShareProfiles(updatedProfiles);
    } catch (error: any) {
      console.error('Failed to create sale links:', error);
      alert(`共有リンクの作成に失敗しました: ${error.message}`);
    } finally {
      setUpdatingLinks({ ...updatingLinks, sale_buyer: false, sale_appraiser: false });
    }
  };

  // リンクをコピー（用途別）
  const handleCopyLink = async (type: 'normal' | 'sale_buyer' | 'sale_appraiser') => {
    const profile = shareProfiles[type];
    if (!profile?.slug) return;
    
    const url = `${typeof window !== 'undefined' ? window.location.origin : ''}/s/${profile.slug}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedLinks({ ...copiedLinks, [type]: true });
      // トースト表示（簡易実装）
      const toast = document.createElement('div');
      toast.textContent = '✓ コピーしました';
      toast.className = 'fixed top-4 right-4 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg z-50 transition-opacity';
      document.body.appendChild(toast);
      setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => document.body.removeChild(toast), 300);
      }, 2000);
      // 3秒後にボタンテキストを元に戻す
      setTimeout(() => setCopiedLinks({ ...copiedLinks, [type]: false }), 3000);
    } catch (error) {
      console.error('Failed to copy link:', error);
      alert('リンクのコピーに失敗しました');
    }
  };

  // リンクを停止/再開（用途別）
  const handleToggleLinkStatus = async (type: 'normal' | 'sale_buyer' | 'sale_appraiser', currentStatus: 'active' | 'disabled') => {
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
  const getShareLinkInfo = (type: 'normal' | 'sale_buyer' | 'sale_appraiser') => {
    const profile = shareProfiles[type];
    if (!profile) {
      return { status: 'not_created' as const, url: null };
    }
    const status = (profile.status || profile.visibility) === 'disabled' ? 'stopped' as const : 'active' as const;
    const url = profile.slug ? `${typeof window !== 'undefined' ? window.location.origin : ''}/s/${profile.slug}` : null;
    return { status, url, profile };
  };

  // リンクを再発行
  const handleRegenerateSlug = async (type: 'normal' | 'sale_buyer' | 'sale_appraiser') => {
    const profile = shareProfiles[type];
    if (!profile || !activeCarId || !auth.currentUser) return;
    
    if (!confirm('リンクを再発行すると、現在のURLは無効になります。新しいURLが生成されます。よろしいですか？')) {
      return;
    }

    try {
      setUpdatingLinks({ ...updatingLinks, [type]: true });
      const { regenerateShareProfileSlug } = await import('@/lib/saleProfileManager');
      await regenerateShareProfileSlug(profile.id);
      
      // ShareProfileを再取得
      const profileDoc = await getDoc(doc(db, 'saleProfiles', profile.id));
      if (profileDoc.exists()) {
        setShareProfiles({
          ...shareProfiles,
          [type]: { id: profileDoc.id, ...profileDoc.data() }
        });
      }
      alert('リンクを再発行しました。新しいURLをコピーしてください。');
    } catch (error: any) {
      console.error(`Failed to regenerate ${type} link:`, error);
      alert(`リンクの再発行に失敗しました: ${error.message}`);
    } finally {
      setUpdatingLinks({ ...updatingLinks, [type]: false });
    }
  };

  // 公開設定を更新
  const handleUpdateVisibility = async (type: 'normal' | 'sale_buyer' | 'sale_appraiser', visibility: 'unlisted' | 'public' | 'disabled') => {
    const profile = shareProfiles[type];
    if (!profile || !activeCarId || !auth.currentUser) return;

    try {
      setUpdatingLinks({ ...updatingLinks, [type]: true });
      const { updateShareProfileVisibility } = await import('@/lib/saleProfileManager');
      await updateShareProfileVisibility(profile.id, visibility);
      
      // ShareProfileを再取得
      const profileDoc = await getDoc(doc(db, 'saleProfiles', profile.id));
      if (profileDoc.exists()) {
        setShareProfiles({
          ...shareProfiles,
          [type]: { id: profileDoc.id, ...profileDoc.data() }
        });
      }
    } catch (error: any) {
      console.error(`Failed to update ${type} visibility:`, error);
      alert(`公開設定の更新に失敗しました: ${error.message}`);
    } finally {
      setUpdatingLinks({ ...updatingLinks, [type]: false });
    }
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
          {/* タブ */}
          <div className="bg-white rounded-2xl border border-gray-200 p-1">
            <div className="flex gap-1">
              <button
                onClick={() => setActiveTab('normal')}
                className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === 'normal'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                SNS（紹介）
              </button>
              <button
                onClick={() => setActiveTab('sale')}
                className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === 'sale'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                取引（売却・査定）
              </button>
            </div>
          </div>

          {/* タブに応じたコンテンツ表示 */}
          {activeTab === 'normal' && (
            <ShareLinkCard
              type="normal"
              title="SNS紹介リンク"
              description="SNSで車を紹介するページ"
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
          )}

          {activeTab === 'sale' && (
            <SaleLinkCard
              saleRecipient={saleRecipient}
              setSaleRecipient={setSaleRecipient}
              shareProfiles={shareProfiles}
              pageViewCounts={pageViewCounts}
              copiedLinks={copiedLinks}
              updatingLinks={updatingLinks}
              loadingProfiles={loadingProfiles}
              getShareLinkInfo={getShareLinkInfo}
              handleCreateSaleLinks={handleCreateSaleLinks}
              handleCopyLink={handleCopyLink}
              handleToggleLinkStatus={handleToggleLinkStatus}
              handleRegenerateSlug={handleRegenerateSlug}
              handleUpdateVisibility={handleUpdateVisibility}
              activeCarId={activeCarId}
              router={router}
              car={car}
              maintenanceRecords={maintenanceRecords}
              customizations={customizations}
            />
          )}
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
  const [showPricesInDetails, setShowPricesInDetails] = useState(profile?.sns?.settings?.showPricesInDetails || false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [draggedImageId, setDraggedImageId] = useState<string | null>(null);
  const [dragOverImageId, setDragOverImageId] = useState<string | null>(null);
  
  // SNS編集用の状態
  const [snsData, setSnsData] = useState({
    conceptTitle: profile?.sns?.conceptTitle || '',
    conceptBody: profile?.sns?.conceptBody || '',
    highlightParts: profile?.sns?.highlightParts || [],
    gallery: profile?.sns?.gallery || [],
    socialLinks: profile?.sns?.socialLinks || { youtube: '', instagram: '', x: '', web: '' },
    build: profile?.sns?.build || { featured: [], categories: [] },
    settings: profile?.sns?.settings || { showPricesInDetails: false },
  });
  
  // 初期状態を保存（変更検知用）
  const [initialSnsData, setInitialSnsData] = useState(snsData);
  
  // 変更を検知して未保存状態を更新
  useEffect(() => {
    const hasChanges = JSON.stringify(snsData) !== JSON.stringify(initialSnsData);
    setHasUnsavedChanges(hasChanges);
  }, [snsData, initialSnsData]);

  // ギャラリー画像のプレビューURLを読み込み（リトライ付き）
  useEffect(() => {
    const loadGalleryPreviews = async () => {
      if (!snsData.gallery || snsData.gallery.length === 0) {
        setGalleryPreviewUrls({});
        return;
      }
      
      // 認証状態を確認
      if (!auth.currentUser) {
        console.warn('User not authenticated, cannot load gallery images');
        return;
      }
      
      // リトライ付きでURLを取得（エラーは静かに処理）
      const getDownloadURLWithRetry = async (storagePath: string, maxRetries = 2): Promise<string | null> => {
        for (let i = 0; i <= maxRetries; i++) {
          try {
            const storageRef = ref(storage, storagePath);
            const url = await getDownloadURL(storageRef);
            return url;
          } catch (error: any) {
            // エラーは静かに処理（ログを出力しない）
            if (i < maxRetries) {
              // 指数バックオフ: 0.5秒、1秒、2秒
              await new Promise(resolve => setTimeout(resolve, 500 * (i + 1)));
            } else {
              // 最後のリトライでも失敗した場合は null を返す（ログなし）
              return null;
            }
          }
        }
        return null;
      };
      
      const urls: Record<string, string> = {};
      // 各画像の読み込みを並列実行し、エラーが発生したものはスキップ
      const results = await Promise.allSettled(snsData.gallery.map(async (img: { id: string; path: string; caption?: string }) => {
        const url = await getDownloadURLWithRetry(img.path);
        if (url) {
          urls[img.id] = url;
        }
        return { id: img.id, url };
      }));
      
      // 失敗した画像の数をログに出力
      const failedCount = results.filter(r => r.status === 'rejected').length;
      if (failedCount > 0) {
        console.warn(`Failed to load ${failedCount} out of ${snsData.gallery.length} gallery images`);
      }
      
      setGalleryPreviewUrls(urls);
    };

    loadGalleryPreviews();
  }, [snsData.gallery]);

  // プロフィールが変更されたときに状態を更新
  useEffect(() => {
    if (profile?.sns) {
      const newSnsData = {
        conceptTitle: profile.sns.conceptTitle || '',
        conceptBody: profile.sns.conceptBody || '',
        highlightParts: profile.sns.highlightParts || [],
        gallery: profile.sns.gallery || [],
        socialLinks: profile.sns.socialLinks || { youtube: '', instagram: '', x: '', web: '' },
        build: profile.sns.build || { featured: [], categories: [] },
        settings: profile.sns.settings || { showPricesInDetails: false },
      };
      setSnsData(newSnsData);
      setInitialSnsData(newSnsData);
      setShowPricesInDetails(profile.sns.settings?.showPricesInDetails || false);
      setHasUnsavedChanges(false);
      // 最終保存時刻を設定（プロフィールのupdatedAtから）
      if (profile.updatedAt) {
        const updatedAt = profile.updatedAt.toDate ? profile.updatedAt.toDate() : new Date(profile.updatedAt);
        setLastSavedAt(updatedAt);
      }
    }
  }, [profile?.id, profile?.sns, profile?.sns?.settings]);

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

  // ドラッグ&ドロップハンドラー
  const handleDragStart = (e: React.DragEvent, imageId: string) => {
    setDraggedImageId(imageId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', imageId);
    // ドラッグ中の画像を半透明に
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = '0.5';
    }
  };

  const handleDragEnd = (e: React.DragEvent) => {
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = '1';
    }
    setDraggedImageId(null);
    setDragOverImageId(null);
  };

  const handleDragOver = (e: React.DragEvent, imageId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (draggedImageId && draggedImageId !== imageId) {
      setDragOverImageId(imageId);
    }
  };

  const handleDragLeave = () => {
    setDragOverImageId(null);
  };

  const handleDrop = (e: React.DragEvent, targetImageId: string) => {
    e.preventDefault();
    setDragOverImageId(null);

    if (!draggedImageId || draggedImageId === targetImageId) {
      return;
    }

    const currentGallery = [...snsData.gallery];
    const draggedIndex = currentGallery.findIndex((img: { id: string }) => img.id === draggedImageId);
    const targetIndex = currentGallery.findIndex((img: { id: string }) => img.id === targetImageId);

    if (draggedIndex === -1 || targetIndex === -1) {
      return;
    }

    // 順序を変更
    const [removed] = currentGallery.splice(draggedIndex, 1);
    currentGallery.splice(targetIndex, 0, removed);

    setSnsData({
      ...snsData,
      gallery: currentGallery,
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

  // 共有される内容の定義（用途別）
  const getSharedContents = () => {
    if (type === 'appraisal') {
      return [
        '車両概要（年式/走行距離/車検）',
        '整備履歴（一覧）',
        '消耗品交換一覧',
        '証跡（個人情報は自動マスク）',
        '検証ID（改ざん防止）'
      ];
    } else if (type === 'sale') {
      return [
        '車両概要',
        '整備履歴',
        'カスタマイズ履歴',
        '証跡（個人情報は自動マスク）'
      ];
    } else {
      return [
        '車両情報',
        '整備履歴',
        'カスタマイズ履歴'
      ];
    }
  };

  // CTAボタンの文言（用途別）
  const getCreateButtonText = () => {
    if (type === 'appraisal') {
      return '査定用リンクを発行';
    } else if (type === 'sale') {
      return '売却用リンクを発行';
    } else {
      return '共有リンクを作成';
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6 max-w-3xl mx-auto">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
        <p className="text-xs text-gray-500 mt-1">{description}</p>
      </div>

      {/* 共有される内容（査定・売却タブのみ） */}
      {(type === 'appraisal' || type === 'sale') && (
        <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-100">
          <p className="text-xs font-medium text-gray-700 mb-2">共有される内容</p>
          <ul className="space-y-1">
            {getSharedContents().map((content, index) => (
              <li key={index} className="text-xs text-gray-600 flex items-start gap-2">
                <span className="text-blue-600 mt-0.5">•</span>
                <span>{content}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ステータス表示 */}
      <div className="mb-3">
        {status === 'not_created' && (
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <span className="w-2 h-2 rounded-full bg-gray-400"></span>
              <span className="font-medium">リンク未作成</span>
            </div>
            <p className="text-xs text-gray-500 ml-4">作成するとURLが発行されます。いつでも停止できます。</p>
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

      {/* 相手が見るプレビュー（空状態でも表示） */}
      {status === 'not_created' && (
        <div className="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <p className="text-xs font-medium text-gray-700 mb-2">相手が見る画面</p>
          <div className="bg-white rounded border border-gray-200 p-4 min-h-[200px] flex items-center justify-center">
            <div className="text-center text-gray-400">
              <svg className="w-12 h-12 mx-auto mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              <p className="text-xs">作成すると、{type === 'appraisal' ? '査定会社' : type === 'sale' ? '買い手' : '相手'}はこのページを閲覧できます</p>
            </div>
          </div>
        </div>
      )}

      {/* Primary Action */}
      {status === 'not_created' ? (
        <div className="mb-4">
          <button
            onClick={() => handleCreateLink(type)}
            disabled={updating || loadingProfiles}
            className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium"
          >
            {updating ? '作成中...' : getCreateButtonText()}
          </button>
          <p className="text-xs text-gray-500 mt-2 text-center">発行後に公開範囲・停止・再発行ができます</p>
        </div>
      ) : status === 'active' && url ? (
        <div className="mb-4">
          {/* Primary CTA: リンクをコピー（大ボタン） */}
          <div className="mb-2">
            <p className="text-xs text-gray-500 mb-1">共有リンク</p>
            <p className="text-sm text-gray-900 truncate font-mono bg-gray-50 p-2 rounded border border-gray-200">
              {url}
            </p>
          </div>
          <button
            onClick={() => handleCopyLink(type)}
            className={`w-full px-6 py-3 rounded-lg text-base font-medium transition-colors ${
              copied
                ? 'bg-green-600 text-white'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {copied ? '✓ コピー済み' : 'リンクをコピー'}
          </button>
        </div>
      ) : null}

      {/* Secondary Actions */}
      {status === 'active' && url && (
        <div className="mb-3">
          <button
            onClick={() => window.open(url, '_blank')}
            className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm"
          >
            公開ページを見る
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
              {/* 保存状態表示 */}
              <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200">
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                    hasUnsavedChanges 
                      ? 'bg-yellow-100 text-yellow-700' 
                      : 'bg-green-100 text-green-700'
                  }`}>
                    {hasUnsavedChanges ? '未保存' : '保存済み'}
                  </span>
                  {lastSavedAt && (
                    <span className="text-xs text-gray-500">
                      最終保存: {new Intl.DateTimeFormat('ja-JP', { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      }).format(lastSavedAt)}
                    </span>
                  )}
                </div>
              </div>
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
                  {Math.max(0, snsData.conceptBody.length)}/200字
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
                <p className="text-xs text-gray-500 mb-2">
                  最初の画像がヒーロー画像として表示されます。ドラッグ&ドロップで順序を変更できます。
                </p>
                {snsData.gallery.length > 0 && (
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    {snsData.gallery.map((img: { id: string; path: string; caption?: string }, index: number) => {
                      const previewUrl = galleryPreviewUrls[img.id];
                      const isDragging = draggedImageId === img.id;
                      const isDragOver = dragOverImageId === img.id;
                      const isHero = index === 0;
                      return (
                        <div
                          key={img.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, img.id)}
                          onDragEnd={handleDragEnd}
                          onDragOver={(e) => handleDragOver(e, img.id)}
                          onDragLeave={handleDragLeave}
                          onDrop={(e) => handleDrop(e, img.id)}
                          className={`relative aspect-square rounded-lg overflow-hidden bg-gray-200 group cursor-move transition-all ${
                            isDragging ? 'opacity-50 scale-95' : ''
                          } ${
                            isDragOver ? 'ring-2 ring-blue-500 ring-offset-2 scale-105' : ''
                          } ${
                            isHero ? 'ring-2 ring-yellow-400 ring-offset-1' : ''
                          }`}
                        >
                          {previewUrl ? (
                            <img 
                              src={previewUrl} 
                              alt={img.caption || 'Gallery image'}
                              className="w-full h-full object-cover pointer-events-none"
                              draggable={false}
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
                              読み込み中...
                            </div>
                          )}
                          {isHero && (
                            <div className="absolute top-1 left-1 bg-yellow-400 text-yellow-900 text-xs font-bold px-2 py-0.5 rounded">
                              ヒーロー
                            </div>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleImageDelete(img.id);
                            }}
                            className="absolute top-1 right-1 w-6 h-6 bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-xs z-10"
                            title="画像を削除"
                          >
                            ×
                          </button>
                          {img.caption && (
                            <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs p-1 truncate">
                              {img.caption}
                            </div>
                          )}
                          {/* ドラッグ中のインジケーター */}
                          {isDragging && (
                            <div className="absolute inset-0 bg-blue-500/20 flex items-center justify-center">
                              <div className="bg-blue-600 text-white px-3 py-1 rounded text-xs font-medium">
                                移動中...
                              </div>
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
                {/* 価格表示のON/OFFスイッチ */}
                <div className="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showPricesInDetails}
                      onChange={(e) => setShowPricesInDetails(e.target.checked)}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium text-gray-700">参考価格を表示する</span>
                  </label>
                  <p className="text-xs text-gray-500 mt-1 ml-6">公開ページのDetailsセクションを開いた時のみ表示されます。「参考価格」として表示され、時点により変動する可能性があります。</p>
                </div>

                {/* 2カラムレイアウト：左（一覧）、右（詳細編集） */}
                <div className="grid md:grid-cols-2 gap-4">
                  {/* 左カラム：主要パーツ一覧 */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-2">
                      主要パーツ（最大30件）
                    </label>
                    {safeCustomizations.length > 0 ? (
                      <div className="space-y-2 max-h-[500px] overflow-y-auto border border-gray-200 rounded-lg p-3">
                        {safeCustomizations.map((custom) => {
                          const isSelected = snsData.build.featured.some(
                            (f: { label: string; value: string }) => f.label === (custom.brand || '') && f.value === custom.title
                          );
                          const isMaxReached = snsData.build.featured.length >= 30;
                          
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
                                    if (snsData.build.featured.length >= 30) return;
                                    
                                    // カスタマイズの価格情報を取得
                                    const totalCost = (custom.partsCostJpy || 0) + (custom.laborCostJpy || 0) + (custom.otherCostJpy || 0);
                                    
                                    // 価格の種類を判定（工賃があればINSTALLED、なければPARTS_ONLY）
                                    const priceKind = custom.laborCostJpy && custom.laborCostJpy > 0 ? 'INSTALLED' : (totalCost > 0 ? 'PARTS_ONLY' : undefined);
                                    
                                    // 日付をYYYY-MM形式に変換
                                    let priceAsOf: string | undefined;
                                    if (custom.date) {
                                      try {
                                        const dateObj = timestampToDate(custom.date);
                                        if (dateObj) {
                                          priceAsOf = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}`;
                                        }
                                      } catch (error) {
                                        console.warn('Failed to parse date:', error);
                                      }
                                    }
                                    
                                    const newFeatured = [...snsData.build.featured, {
                                      label: custom.brand || custom.categories?.[0] || 'カスタム',
                                      value: custom.title,
                                      ...(totalCost > 0 && {
                                        priceAmount: totalCost,
                                        priceCurrency: 'JPY' as const,
                                        ...(priceKind && { priceKind }),
                                        ...(priceAsOf && { priceAsOf }),
                                      }),
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
                  </div>

                  {/* 右カラム：選択中パーツの詳細編集 */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-2">
                      選択中のパーツ（{snsData.build.featured.length}/30）
                    </label>
                    {snsData.build.featured.length > 0 ? (
                      <div className="space-y-3 max-h-[500px] overflow-y-auto">
                        {snsData.build.featured.map((part: any, index: number) => (
                          <div key={index} className="bg-white rounded-lg p-3 border border-gray-200">
                            <div className="flex items-center justify-between mb-3">
                              <div>
                                <div className="text-sm font-medium text-gray-900">{part.label}</div>
                                <div className="text-xs text-gray-600">{part.value}</div>
                              </div>
                              <button
                                onClick={() => {
                                  if (confirm('このパーツを削除しますか？')) {
                                    const newFeatured = snsData.build.featured.filter((_: any, i: number) => i !== index);
                                    setSnsData({ ...snsData, build: { ...snsData.build, featured: newFeatured } });
                                  }
                                }}
                                className="p-1.5 text-gray-400 hover:text-red-600 transition-colors"
                                title="削除"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </div>
                            <div className="space-y-3">
                              {/* 価格種別（先に選択） */}
                              <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">価格種別</label>
                                <select
                                  value={part.priceKind || ''}
                                  onChange={(e) => {
                                    const newFeatured = [...snsData.build.featured];
                                    const value = e.target.value as 'PARTS_ONLY' | 'INSTALLED' | 'MARKET' | '';
                                    if (value === '') {
                                      delete newFeatured[index].priceKind;
                                    } else {
                                      newFeatured[index] = { ...newFeatured[index], priceKind: value };
                                    }
                                    setSnsData({ ...snsData, build: { ...snsData.build, featured: newFeatured } });
                                  }}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                  <option value="">選択してください</option>
                                  <option value="PARTS_ONLY">部品代のみ</option>
                                  <option value="INSTALLED">取付込み（工賃込）</option>
                                  <option value="MARKET">中古購入価格 / 新品購入価格</option>
                                </select>
                              </div>
                              {/* 参考価格（3桁カンマ表示） */}
                              <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">参考価格（円）</label>
                                <input
                                  type="text"
                                  value={part.priceAmount ? part.priceAmount.toLocaleString() : ''}
                                  onChange={(e) => {
                                    const newFeatured = [...snsData.build.featured];
                                    // カンマを除去して数値に変換
                                    const numericValue = e.target.value.replace(/,/g, '');
                                    const value = numericValue ? parseInt(numericValue, 10) : undefined;
                                    newFeatured[index] = { ...newFeatured[index], priceAmount: value };
                                    setSnsData({ ...snsData, build: { ...snsData.build, featured: newFeatured } });
                                  }}
                                  placeholder="例: 70,000"
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                              </div>
                              {/* 時点（年月ピッカー） */}
                              <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">時点（YYYY-MM）</label>
                                <input
                                  type="month"
                                  value={part.priceAsOf || ''}
                                  onChange={(e) => {
                                    const newFeatured = [...snsData.build.featured];
                                    const value = e.target.value || undefined;
                                    if (value) {
                                      newFeatured[index] = { ...newFeatured[index], priceAsOf: value };
                                    } else {
                                      delete newFeatured[index].priceAsOf;
                                    }
                                    setSnsData({ ...snsData, build: { ...snsData.build, featured: newFeatured } });
                                  }}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-xs text-gray-500 p-3 bg-gray-50 rounded-lg border border-gray-200 text-center">
                        パーツを選択してください
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* 保存ボタン（下部固定） */}
              <div className="sticky bottom-0 bg-white border-t border-gray-200 p-4 -mx-4 -mb-4 mt-6 flex gap-2">
                <button
                  onClick={async () => {
                    if (!profile?.id) return;
                    setSavingSNS(true);
                    try {
                      const { updateShareProfileSNS } = await import('@/lib/saleProfileManager');
                      // galleryのpathをそのまま保存（画像は既にアップロード済み）
                      await updateShareProfileSNS(profile.id, {
                        ...snsData,
                        settings: { showPricesInDetails },
                      });
                      // 保存成功時の処理
                      setLastSavedAt(new Date());
                      setHasUnsavedChanges(false);
                      setInitialSnsData(snsData);
                      // トースト表示
                      const toast = document.createElement('div');
                      toast.textContent = '✓ 保存しました';
                      toast.className = 'fixed top-4 right-4 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg z-50 transition-opacity';
                      document.body.appendChild(toast);
                      setTimeout(() => {
                        toast.style.opacity = '0';
                        setTimeout(() => document.body.removeChild(toast), 300);
                      }, 2000);
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
                  disabled={savingSNS || !hasUnsavedChanges}
                  className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    hasUnsavedChanges
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
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

// 売却用リンクカードコンポーネント（2リンク表示）
function SaleLinkCard({
  saleRecipient,
  setSaleRecipient,
  shareProfiles,
  pageViewCounts,
  copiedLinks,
  updatingLinks,
  loadingProfiles,
  getShareLinkInfo,
  handleCreateSaleLinks,
  handleCopyLink,
  handleToggleLinkStatus,
  handleRegenerateSlug,
  handleUpdateVisibility,
  activeCarId,
  router,
  car,
  maintenanceRecords,
  customizations
}: {
  saleRecipient: 'buyer' | 'appraiser';
  setSaleRecipient: (recipient: 'buyer' | 'appraiser') => void;
  shareProfiles: { normal?: any; sale_buyer?: any; sale_appraiser?: any; sale?: any; appraisal?: any };
  pageViewCounts: { normal?: number | null; sale_buyer?: number | null; sale_appraiser?: number | null; sale?: number | null; appraisal?: number | null };
  copiedLinks: { normal?: boolean; sale_buyer?: boolean; sale_appraiser?: boolean; sale?: boolean; appraisal?: boolean };
  updatingLinks: { normal?: boolean; sale_buyer?: boolean; sale_appraiser?: boolean; sale?: boolean; appraisal?: boolean };
  loadingProfiles: boolean;
  getShareLinkInfo: (type: 'normal' | 'sale_buyer' | 'sale_appraiser') => { status: string; url: string | null; profile?: any };
  handleCreateSaleLinks: () => Promise<void>;
  handleCopyLink: (type: 'normal' | 'sale_buyer' | 'sale_appraiser') => Promise<void>;
  handleToggleLinkStatus: (type: 'normal' | 'sale_buyer' | 'sale_appraiser', currentStatus: 'active' | 'disabled') => Promise<void>;
  handleRegenerateSlug: (type: 'normal' | 'sale_buyer' | 'sale_appraiser') => Promise<void>;
  handleUpdateVisibility: (type: 'normal' | 'sale_buyer' | 'sale_appraiser', visibility: 'unlisted' | 'public' | 'disabled') => Promise<void>;
  activeCarId?: string;
  router: any;
  car?: Car | null;
  maintenanceRecords?: MaintenanceRecord[];
  customizations?: Customization[];
}) {
  // 売却用リンクは1つに統合（sale_buyerを使用、sale_appraiserは後方互換性のため残す）
  const saleInfo = getShareLinkInfo('sale_buyer');
  const saleCreated = saleInfo.status !== 'not_created';
  const creating = updatingLinks.sale_buyer || updatingLinks.sale_appraiser;

  // リンクカードの状態管理
  const [showMenu, setShowMenu] = useState(false);
  const [showVisibilitySettings, setShowVisibilitySettings] = useState(false);

  // ステータスバッジの表示
  const getStatusBadge = (info: { status: string; profile?: any }) => {
    if (info.status === 'not_created') {
      return null;
    }
    if (info.status === 'stopped') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
          <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
          停止中
        </span>
      );
    }
    // activeの場合、visibilityに応じて表示
    const visibility = info.profile?.visibility || 'unlisted';
    if (visibility === 'public') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
          公開中（公開）
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
        <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
        公開中（限定公開）
      </span>
    );
  };

  // 単一リンクカードのレンダリング
  const renderLinkCard = (
    type: 'sale_buyer' | 'sale_appraiser',
    info: { status: string; url: string | null; profile?: any },
    title: string,
    description: string,
    sharedContents: string[],
    showMenu: boolean,
    setShowMenu: (show: boolean) => void,
    showVisibilitySettings: boolean,
    setShowVisibilitySettings: (show: boolean) => void
  ) => {
    const copied = copiedLinks[type];
    const updating = updatingLinks[type];
    const currentVisibility = info.profile?.visibility || 'unlisted';

    // 最終更新日と閲覧回数を取得
    const lastUpdated = info.profile?.updatedAt 
      ? (info.profile.updatedAt.toDate ? info.profile.updatedAt.toDate() : new Date(info.profile.updatedAt))
      : null;
    const viewCount = pageViewCounts[type] ?? info.profile?.viewCount ?? 0;

    return (
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="mb-3 flex items-start justify-between">
          <div className="flex-1">
            <h3 className="text-base font-semibold text-gray-900 mb-1">{title}</h3>
            <p className="text-xs text-gray-500 mb-2">{description}</p>
            {/* 追加情報：対象車両名、最終更新日、閲覧回数 */}
            <div className="flex flex-wrap gap-3 text-xs text-gray-500">
              {car && (
                <span>対象車両: {car.name}</span>
              )}
              {lastUpdated && (
                <span>最終更新: {new Intl.DateTimeFormat('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(lastUpdated)}</span>
              )}
              {viewCount !== null && (
                <span>閲覧回数: {viewCount}</span>
              )}
            </div>
          </div>
          {info.status === 'active' && (
            <div className="relative">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                type="button"
              >
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                </svg>
              </button>
              {showMenu && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)}></div>
                  <div className="absolute right-0 mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
                    <button
                      onClick={() => {
                        setShowMenu(false);
                        setShowVisibilitySettings(true);
                      }}
                      className="w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 text-left"
                    >
                      リンク設定
                    </button>
                    <button
                      onClick={() => {
                        setShowMenu(false);
                        handleRegenerateSlug(type);
                      }}
                      className="w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 text-left"
                    >
                      リンクを再生成
                    </button>
                    <div className="border-t border-gray-200 my-1"></div>
                    <button
                      onClick={() => {
                        setShowMenu(false);
                        if (confirm('リンクを停止すると閲覧できなくなります。本当に停止しますか？\n\n停止後も再開できます。')) {
                          handleToggleLinkStatus(type, 'active');
                        }
                      }}
                      className="w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 text-left"
                    >
                      リンクを停止（無効化）
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* 共有される内容（要点バッジ＋詳細アコーディオン） */}
        <div className="mb-3">
          {/* 要点バッジ */}
          <div className="flex flex-wrap gap-2 mb-2">
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
              個人情報マスク
            </span>
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
              改ざん防止
            </span>
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
              消耗品一覧
            </span>
          </div>
          {/* 詳細アコーディオン */}
          <details className="group">
            <summary className="cursor-pointer text-xs text-gray-600 hover:text-gray-900 flex items-center gap-1">
              <span>共有される内容（詳細）</span>
              <svg className="w-3 h-3 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </summary>
            <ul className="mt-2 space-y-1 p-3 bg-blue-50 rounded-lg border border-blue-100">
              {sharedContents.map((content, index) => (
                <li key={index} className="text-xs text-gray-600 flex items-start gap-2">
                  <span className="text-blue-600 mt-0.5">•</span>
                  <span>{content}</span>
                </li>
              ))}
            </ul>
          </details>
        </div>

        {/* ステータスバッジ */}
        {info.status !== 'not_created' && (
          <div className="mb-3">
            {getStatusBadge(info)}
          </div>
        )}

        {/* 未作成の場合 */}
        {info.status === 'not_created' ? (
          <div className="text-center py-4">
            <p className="text-sm text-gray-500 mb-2">リンク未作成</p>
            <p className="text-xs text-gray-400 mb-3">作成するとURLが発行されます。いつでも停止できます。</p>
            <button
              onClick={handleCreateSaleLinks}
              disabled={creating || loadingProfiles}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors text-sm font-medium"
            >
              {creating ? '作成中...' : '共有リンクを作成'}
            </button>
            <p className="text-xs text-gray-500 mt-2">発行後に公開範囲・停止・再発行ができます</p>
          </div>
        ) : info.status === 'active' && info.url ? (
          <>
            {/* Primary CTA: リンクをコピー（大ボタン） */}
            <div className="mb-3">
              <div className="mb-2">
                <p className="text-xs text-gray-500 mb-1">公開URL</p>
                <p className="text-sm text-gray-900 truncate font-mono bg-gray-50 p-2 rounded border border-gray-200">
                  {info.url}
                </p>
              </div>
              <button
                onClick={() => handleCopyLink(type)}
                className={`w-full px-6 py-3 rounded-lg text-base font-medium transition-colors ${
                  copied
                    ? 'bg-green-600 text-white'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {copied ? '✓ コピー済み' : 'リンクをコピー'}
              </button>
            </div>

            {/* Secondary Actions */}
            <div className="mb-3">
              <button
                onClick={() => window.open(info.url!, '_blank')}
                className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm"
              >
                公開ページを見る
              </button>
            </div>

            {/* Tertiary: 公開設定（折りたたみ） */}
            {showVisibilitySettings && (
              <details open className="mb-3">
                <summary className="cursor-pointer list-none p-3 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">公開設定</span>
                    <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </summary>
                <div className="mt-3 p-4 bg-gray-50 rounded-lg border border-gray-200 space-y-3">
                  <div className="space-y-2">
                    <button
                      onClick={() => handleUpdateVisibility(type, 'unlisted')}
                      disabled={updating || currentVisibility === 'unlisted'}
                      className={`w-full px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        currentVisibility === 'unlisted'
                          ? 'bg-blue-600 text-white'
                          : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      限定公開（推奨）
                    </button>
                    <button
                      onClick={() => handleUpdateVisibility(type, 'public')}
                      disabled={updating || currentVisibility === 'public'}
                      className={`w-full px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        currentVisibility === 'public'
                          ? 'bg-blue-600 text-white'
                          : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      公開（検索に出る可能性）
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    限定公開：リンクを知っている人だけがアクセスできます（推奨）。検索エンジンにはインデックスされません。
                  </p>
                </div>
              </details>
            )}
          </>
        ) : info.status === 'stopped' ? (
          <>
            {/* 停止状態の場合のUI */}
            <div className="mb-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <p className="text-sm text-gray-600 mb-3">このリンクは現在停止されています。再開するとURLが有効になります。</p>
              <button
                onClick={() => handleToggleLinkStatus(type, 'disabled')}
                disabled={updating}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors text-sm font-medium flex items-center justify-center gap-2"
              >
                {updating ? (
                  '処理中...'
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                    リンクを再開
                  </>
                )}
              </button>
            </div>
          </>
        ) : null}
      </div>
    );
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* 送付先セグメント（まだ未使用、将来の拡張用） */}
      {/* <div className="bg-white rounded-xl border border-gray-200 p-1">
        <div className="flex gap-1">
          <button
            onClick={() => setSaleRecipient('buyer')}
            className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              saleRecipient === 'buyer'
                ? 'bg-blue-600 text-white'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            買い手向け
          </button>
          <button
            onClick={() => setSaleRecipient('appraiser')}
            className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              saleRecipient === 'appraiser'
                ? 'bg-blue-600 text-white'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            査定会社向け
          </button>
        </div>
      </div> */}

      {/* 売却用リンクカード（1つに統合） */}
      <div className="max-w-2xl mx-auto">
        {renderLinkCard(
          'sale_buyer',
          saleInfo,
          '売却用共有リンク',
          '買い手・査定会社向けに履歴を共有',
          [
            '車両概要（年式/走行距離/車検）',
            '整備履歴（一覧）',
            '消耗品交換一覧',
            '証跡（個人情報は自動マスク）',
            '検証ID（改ざん防止）'
          ],
          showMenu,
          setShowMenu,
          showVisibilitySettings,
          setShowVisibilitySettings
        )}
      </div>
    </div>
  );
}

