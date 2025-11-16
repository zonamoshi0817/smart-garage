/**
 * カスタマーサポートページ
 */

"use client";
import { useState } from "react";

export default function SupportPage() {
  const [feedbackForm, setFeedbackForm] = useState({
    name: "",
    email: "",
    category: "bug",
    message: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<"idle" | "success" | "error">("idle");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus("idle");

    // メールto:リンクを使用した簡易実装
    const subject = encodeURIComponent(`[garage log] ${getCategoryLabel(feedbackForm.category)}`);
    const body = encodeURIComponent(
      `名前: ${feedbackForm.name}\nメール: ${feedbackForm.email}\n\n${feedbackForm.message}`
    );
    const mailtoLink = `mailto:support@smartgarage.jp?subject=${subject}&body=${body}`;

    // メールクライアントを開く
    window.location.href = mailtoLink;

    setTimeout(() => {
      setIsSubmitting(false);
      setSubmitStatus("success");
      setFeedbackForm({ name: "", email: "", category: "bug", message: "" });
    }, 1000);
  };

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      bug: "バグ報告",
      feature: "機能リクエスト",
      question: "質問",
      other: "その他",
    };
    return labels[category] || "お問い合わせ";
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">
          カスタマーサポート
        </h1>

        <div className="space-y-6">
          {/* フィードバック送信フォーム */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              📝 フィードバックを送信
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  お名前 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={feedbackForm.name}
                  onChange={(e) =>
                    setFeedbackForm({ ...feedbackForm, name: e.target.value })
                  }
                  className="w-full rounded-xl border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                  placeholder="山田太郎"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  メールアドレス <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={feedbackForm.email}
                  onChange={(e) =>
                    setFeedbackForm({ ...feedbackForm, email: e.target.value })
                  }
                  className="w-full rounded-xl border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                  placeholder="your@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  カテゴリ <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={feedbackForm.category}
                  onChange={(e) =>
                    setFeedbackForm({ ...feedbackForm, category: e.target.value })
                  }
                  className="w-full rounded-xl border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                >
                  <option value="bug">🐛 バグ報告</option>
                  <option value="feature">✨ 機能リクエスト</option>
                  <option value="question">❓ 質問</option>
                  <option value="other">📩 その他</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  メッセージ <span className="text-red-500">*</span>
                </label>
                <textarea
                  required
                  value={feedbackForm.message}
                  onChange={(e) =>
                    setFeedbackForm({ ...feedbackForm, message: e.target.value })
                  }
                  rows={6}
                  className="w-full rounded-xl border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 resize-none"
                  placeholder="詳細をご記入ください..."
                />
                <p className="text-sm text-gray-500 mt-1">
                  {feedbackForm.message.length} / 1000文字
                </p>
              </div>

              {submitStatus === "success" && (
                <div className="p-4 bg-green-50 border border-green-200 rounded-xl text-green-800">
                  ✅ メールクライアントが開きました。そのまま送信してください。
                </div>
              )}

              {submitStatus === "error" && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-800">
                  ❌ 送信に失敗しました。もう一度お試しください。
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-xl transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? "送信中..." : "フィードバックを送信"}
              </button>
            </form>
          </div>

          {/* お問い合わせ方法 */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              お問い合わせ方法
            </h2>
            
            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <div className="text-2xl">📧</div>
                <div>
                  <div className="font-bold text-gray-900">メール</div>
                  <a 
                    href="mailto:support@garagelog.jp" 
                    className="text-blue-600 hover:underline"
                  >
                    support@garagelog.jp
                  </a>
                </div>
              </div>

              {/* 電話サポートは準備中 */}
            </div>
          </div>

          {/* よくある質問 */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              よくある質問
            </h2>

            <div className="space-y-6">
              {/* 請求・支払い */}
              <div>
                <h3 className="font-bold text-gray-900 mb-3">💳 請求・支払いについて</h3>
                
                <div className="space-y-3 text-sm">
                  <details className="border-b border-gray-200 pb-3">
                    <summary className="font-medium text-gray-900 cursor-pointer">
                      クレジットカードの明細に「スマートガレージ」と表示されています
                    </summary>
                    <p className="mt-2 text-gray-600">
                      これは garage log プレミアムプランの月額または年額料金です。
                      ご登録いただいたクレジットカードから自動的に課金されます。
                    </p>
                  </details>

                  <details className="border-b border-gray-200 pb-3">
                    <summary className="font-medium text-gray-900 cursor-pointer">
                      解約したい
                    </summary>
                    <p className="mt-2 text-gray-600">
                      アプリ内の「設定」→「請求管理」→「請求情報を管理」から
                      カスタマーポータルにアクセスして、いつでも解約できます。
                      解約後は次回更新日以降、課金されません。
                    </p>
                  </details>

                  <details className="border-b border-gray-200 pb-3">
                    <summary className="font-medium text-gray-900 cursor-pointer">
                      無料プランに戻したら、2台目以降の車両はどうなりますか？
                    </summary>
                    <div className="mt-2 text-gray-600 space-y-2">
                      <p>
                        プレミアムプランから無料プランにダウングレードした場合、
                        <strong className="text-gray-900">最初に登録した1台のみ編集可能</strong>になります。
                      </p>
                      <p>
                        2台目以降の車両は<strong className="text-orange-600">「閲覧専用」</strong>になりますが、
                        以下の操作は引き続き可能です：
                      </p>
                      <ul className="list-disc list-inside space-y-1 ml-4">
                        <li>過去のメンテナンス履歴・給油記録の閲覧</li>
                        <li>PDF出力（プレミアム機能として利用可能）</li>
                        <li>共有URL生成（プレミアム機能として利用可能）</li>
                      </ul>
                      <p className="font-semibold text-blue-600 mt-3">
                        💡 プレミアムプランに再登録すると、すべての車両がすぐに編集可能になります。
                      </p>
                    </div>
                  </details>

                  <details className="border-b border-gray-200 pb-3">
                    <summary className="font-medium text-gray-900 cursor-pointer">
                      返金してほしい
                    </summary>
                    <p className="mt-2 text-gray-600">
                      デジタルサービスの性質上、原則として返金はできません。
                      ただし、無料トライアル期間中にキャンセルした場合は料金が発生しません。
                    </p>
                  </details>

                  <details className="border-b border-gray-200 pb-3">
                    <summary className="font-medium text-gray-900 cursor-pointer">
                      領収書が欲しい
                    </summary>
                    <p className="mt-2 text-gray-600">
                      カスタマーポータルから請求履歴を確認し、領収書をダウンロードできます。
                    </p>
                  </details>
                </div>
              </div>

              {/* 機能・使い方 */}
              <div>
                <h3 className="font-bold text-gray-900 mb-3">🔧 機能・使い方</h3>
                
                <div className="space-y-3 text-sm">
                  <details className="border-b border-gray-200 pb-3">
                    <summary className="font-medium text-gray-900 cursor-pointer">
                      プレミアム機能が使えない
                    </summary>
                    <p className="mt-2 text-gray-600">
                      サブスクリプションが正しく有効化されているか確認してください。
                      「請求管理」ページで現在のプラン状態を確認できます。
                      問題が解決しない場合は、サポートまでお問い合わせください。
                    </p>
                  </details>

                  <details className="border-b border-gray-200 pb-3">
                    <summary className="font-medium text-gray-900 cursor-pointer">
                      OCRスキャンがうまく動作しない
                    </summary>
                    <p className="mt-2 text-gray-600">
                      レシートや証券の画像が鮮明で、文字がはっきり読めることを確認してください。
                      また、画像が明るく、影がないことが重要です。
                    </p>
                  </details>

                  <details className="border-b border-gray-200 pb-3">
                    <summary className="font-medium text-gray-900 cursor-pointer">
                      データをエクスポートしたい
                    </summary>
                    <p className="mt-2 text-gray-600">
                      プレミアムプランでは、PDF出力機能を使ってメンテナンス履歴を
                      エクスポートできます。
                    </p>
                  </details>
                </div>
              </div>

              {/* アカウント */}
              <div>
                <h3 className="font-bold text-gray-900 mb-3">👤 アカウント</h3>
                
                <div className="space-y-3 text-sm">
                  <details className="border-b border-gray-200 pb-3">
                    <summary className="font-medium text-gray-900 cursor-pointer">
                      パスワードを忘れた
                    </summary>
                    <p className="mt-2 text-gray-600">
                      ログイン画面の「パスワードを忘れた方」からパスワードリセットを行ってください。
                    </p>
                  </details>

                  <details className="border-b border-gray-200 pb-3">
                    <summary className="font-medium text-gray-900 cursor-pointer">
                      アカウントを削除したい
                    </summary>
                    <p className="mt-2 text-gray-600">
                      サポートまでお問い合わせください。アカウント削除の手続きをいたします。
                      なお、削除されたデータは復元できませんのでご注意ください。
                    </p>
                  </details>
                </div>
              </div>
            </div>
          </div>

          {/* 既知の不具合 */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              ⚠️ 既知の不具合
            </h2>

            <div className="space-y-4">
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <h4 className="font-semibold text-gray-900 mb-2">
                  [修正予定] Safariでの画像アップロード
                </h4>
                <p className="text-sm text-gray-700 mb-2">
                  iOS SafariでHEIC形式の画像をアップロードすると、プレビューが表示されない場合があります。
                </p>
                <p className="text-sm text-gray-600">
                  <strong>回避策:</strong> 画像をJPEGまたはPNG形式で保存してからアップロードしてください。
                </p>
              </div>

              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="font-semibold text-gray-900 mb-2">
                  [進行中] オフライン時のデータ同期
                </h4>
                <p className="text-sm text-gray-700 mb-2">
                  オフライン時に入力したデータが、オンライン復帰時に自動同期されない場合があります。
                </p>
                <p className="text-sm text-gray-600">
                  <strong>回避策:</strong> 重要なデータは、ネットワーク接続が安定している状態で入力してください。
                </p>
              </div>

              <p className="text-sm text-gray-500 mt-4">
                最終更新: 2025年11月3日
              </p>
            </div>
          </div>

          {/* リンク */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              関連リンク
            </h2>

            <div className="space-y-2 text-sm">
              <a href="/legal/tokusho" className="block text-blue-600 hover:underline">
                特定商取引法に基づく表記
              </a>
              <a href="/legal/privacy" className="block text-blue-600 hover:underline">
                プライバシーポリシー
              </a>
              <a href="/legal/terms" className="block text-blue-600 hover:underline">
                利用規約
              </a>
              <a href="/settings/billing" className="block text-blue-600 hover:underline">
                請求管理
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

