/**
 * 証跡ギャラリー（サムネ→モーダル拡大）
 */

'use client';

import { useState, useEffect } from 'react';
import { storage } from '@/lib/firebase';
import { ref, getBlob } from 'firebase/storage';

interface Evidence {
  id: string;
  storagePath: string;
  maskedStoragePath: string;
}

interface EvidenceGalleryProps {
  evidences: Evidence[];
}

export default function EvidenceGallery({ evidences }: EvidenceGalleryProps) {
  const [selectedEvidence, setSelectedEvidence] = useState<Evidence | null>(null);
  const [imageUrls, setImageUrls] = useState<{ [key: string]: string }>({});
  const [loadingErrors, setLoadingErrors] = useState<{ [key: string]: boolean }>({});

  // ObjectURLのメモリリーク対策
  // 1. コンポーネントアンマウント時に全URLをrevoke
  useEffect(() => {
    return () => {
      Object.values(imageUrls).forEach(url => {
        if (typeof url === 'string' && url.startsWith('blob:')) {
          URL.revokeObjectURL(url);
        }
      });
    };
  }, []); // アンマウント時のみ実行

  // 2. 証跡が削除された場合の個別クリーンアップ
  useEffect(() => {
    const currentEvidenceIds = new Set(evidences.map(e => e.id));
    const revokedUrls: string[] = [];
    
    Object.entries(imageUrls).forEach(([evidenceId, url]) => {
      if (!currentEvidenceIds.has(evidenceId) && typeof url === 'string' && url.startsWith('blob:')) {
        URL.revokeObjectURL(url);
        revokedUrls.push(evidenceId);
      }
    });

    if (revokedUrls.length > 0) {
      setImageUrls(prev => {
        const newUrls = { ...prev };
        revokedUrls.forEach(id => delete newUrls[id]);
        return newUrls;
      });
    }
  }, [evidences.map(e => e.id).join(',')]); // evidencesのIDリストが変更された時のみ

  const loadImageUrl = async (storagePath: string, evidenceId: string) => {
    if (imageUrls[evidenceId]) {
      return imageUrls[evidenceId];
    }

    if (loadingErrors[evidenceId]) {
      return null;
    }

    try {
      // getBlob()を使用してStorage rulesが効く状態で取得
      // visibility='disabled'に変更したら即座にエラーになる
      const storageRef = ref(storage, storagePath);
      const blob = await getBlob(storageRef);
      
      // BlobからObjectURLを生成
      const objectUrl = URL.createObjectURL(blob);
      setImageUrls(prev => ({ ...prev, [evidenceId]: objectUrl }));
      return objectUrl;
    } catch (error: any) {
      console.error('Failed to load image:', error);
      // Storage rulesで拒否された場合（visibility='disabled'など）
      setLoadingErrors(prev => ({ ...prev, [evidenceId]: true }));
      
      // 古いObjectURLがあればクリーンアップ（エラー時に確実にrevoke）
      const oldUrl = imageUrls[evidenceId];
      if (oldUrl && typeof oldUrl === 'string' && oldUrl.startsWith('blob:')) {
        URL.revokeObjectURL(oldUrl);
        setImageUrls(prev => {
          const newUrls = { ...prev };
          delete newUrls[evidenceId];
          return newUrls;
        });
      }
      
      return null;
    }
  };

  const openModal = async (evidence: Evidence) => {
    setSelectedEvidence(evidence);
    await loadImageUrl(evidence.maskedStoragePath, evidence.id);
  };

  const closeModal = () => {
    setSelectedEvidence(null);
  };

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {evidences.map((evidence) => {
          // サムネイル読み込みを開始（表示時）
          if (!imageUrls[evidence.id] && !loadingErrors[evidence.id]) {
            loadImageUrl(evidence.maskedStoragePath, evidence.id);
          }

          return (
            <button
              key={evidence.id}
              onClick={() => openModal(evidence)}
              className="relative aspect-square bg-gray-100 rounded-lg overflow-hidden hover:opacity-80 transition-opacity"
            >
              {loadingErrors[evidence.id] ? (
                <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
                  読み込み不可
                </div>
              ) : imageUrls[evidence.id] ? (
                <img
                  src={imageUrls[evidence.id]}
                  alt="証跡"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400">
                  読み込み中...
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* モーダル */}
      {selectedEvidence && (
        <div
          className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4"
          onClick={closeModal}
        >
          <div className="relative max-w-4xl max-h-full">
            <button
              onClick={closeModal}
              className="absolute top-4 right-4 text-white bg-black bg-opacity-50 rounded-full p-2 hover:bg-opacity-75 z-10"
            >
              ✕
            </button>
            {loadingErrors[selectedEvidence.id] ? (
              <div className="w-full h-96 flex items-center justify-center text-white">
                画像を読み込めませんでした（公開設定を確認してください）
              </div>
            ) : imageUrls[selectedEvidence.id] ? (
              <img
                src={imageUrls[selectedEvidence.id]}
                alt="証跡（拡大）"
                className="max-w-full max-h-[90vh] object-contain"
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <div className="w-full h-96 flex items-center justify-center text-white">
                読み込み中...
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}