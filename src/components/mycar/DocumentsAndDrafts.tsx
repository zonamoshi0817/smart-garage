'use client';

interface OCRDraft {
  id: string;
  type: 'insurance' | 'receipt';
  status: 'pending' | 'confirmed';
  previewFields: { [key: string]: string };
  imageUrl?: string;
  createdAt: Date;
}

interface Document {
  id: string;
  type: 'insurance' | 'maintenance';
  title: string;
  imageUrl?: string;
  verificationId?: string;
  confirmedAt: Date;
}

interface DocumentsAndDraftsProps {
  drafts: OCRDraft[];
  documents: Document[];
  onConfirmDraft: (draftId: string) => void;
  onViewDocument: (documentId: string) => void;
  onViewVerification: (verificationId: string) => void;
}

export default function DocumentsAndDrafts({
  drafts,
  documents,
  onConfirmDraft,
  onViewDocument,
  onViewVerification
}: DocumentsAndDraftsProps) {
  
  const pendingDrafts = drafts.filter(d => d.status === 'pending');

  return (
    <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
      <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
        <span>📄</span>
        <span>ドキュメント & OCRドラフト</span>
      </h2>
      
      {/* 未確定ドラフト */}
      {pendingDrafts.length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <span className="bg-orange-500 text-white text-xs px-2 py-0.5 rounded-full">
              {pendingDrafts.length}
            </span>
            <span>未確定ドラフト</span>
          </h3>
          
          <div className="space-y-2">
            {pendingDrafts.map((draft) => (
              <div
                key={draft.id}
                className="flex items-center gap-3 p-3 bg-orange-50 border-2 border-orange-200 rounded-lg"
              >
                {/* アイコン */}
                <div className="flex-shrink-0 text-2xl">
                  {draft.type === 'insurance' ? '🛡️' : '🧾'}
                </div>
                
                {/* 情報 */}
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm text-gray-900 mb-1">
                    {draft.type === 'insurance' ? '保険証券' : 'レシート'}
                  </div>
                  <div className="text-xs text-gray-600 truncate">
                    {Object.entries(draft.previewFields)
                      .slice(0, 2)
                      .map(([key, value]) => `${key}: ${value}`)
                      .join(' / ')}
                  </div>
                </div>
                
                {/* アクションボタン */}
                <button
                  onClick={() => onConfirmDraft(draft.id)}
                  className="flex-shrink-0 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  囲って確定 →
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* 確定済みドキュメント */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-3">確定済みドキュメント</h3>
        
        {documents.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>まだドキュメントがありません</p>
            <p className="text-sm mt-2">OCRでレシートや証券を読み取ってみましょう</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-lg hover:shadow-md transition-shadow"
              >
                {/* アイコン */}
                <div className="flex-shrink-0 text-2xl">
                  {doc.type === 'insurance' ? '🛡️' : '🔧'}
                </div>
                
                {/* 情報 */}
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm text-gray-900 mb-1 truncate">
                    {doc.title}
                  </div>
                  <div className="flex gap-2 text-xs">
                    <button
                      onClick={() => onViewDocument(doc.id)}
                      className="text-indigo-600 hover:text-indigo-800 font-medium"
                    >
                      原本画像 →
                    </button>
                    {doc.verificationId && (
                      <>
                        <span className="text-gray-400">|</span>
                        <button
                          onClick={() => onViewVerification(doc.verificationId!)}
                          className="text-green-600 hover:text-green-800 font-medium"
                        >
                          検証ID ✓
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

