/**
 * 特定商取引法に基づく表記
 */

export default function TokushoPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">
          特定商取引法に基づく表記
        </h1>

        <div className="bg-white rounded-xl shadow-sm p-8 space-y-8">
          {/* 販売事業者 */}
          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">販売事業者</h2>
            <p className="text-gray-700">【事業者名を記載】</p>
          </section>

          {/* 運営統括責任者 */}
          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">運営統括責任者</h2>
            <p className="text-gray-700">【責任者名を記載】</p>
          </section>

          {/* 所在地 */}
          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">所在地</h2>
            <p className="text-gray-700">【住所を記載】</p>
          </section>

          {/* 連絡先 */}
          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">連絡先</h2>
            <p className="text-gray-700">
              電話番号: 090-7320-0064<br />
              メールアドレス: support@smartgarage.jp<br />
              受付時間: 平日 10:00 - 18:00（土日祝除く）
            </p>
          </section>

          {/* サービス内容 */}
          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">サービス内容</h2>
            <p className="text-gray-700">
              Smart Garage プレミアムプラン<br />
              車両メンテナンス管理サービス
            </p>
          </section>

          {/* 販売価格 */}
          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">販売価格</h2>
            <div className="text-gray-700">
              <p className="mb-2">月額プラン: 480円（税込）/ 月</p>
              <p>年額プラン: 4,800円（税込）/ 年</p>
            </div>
          </section>

          {/* 支払方法 */}
          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">支払方法</h2>
            <p className="text-gray-700">
              クレジットカード決済（Stripe 経由）<br />
              対応カード: Visa、Mastercard、American Express、JCB、Diners Club、Discover
            </p>
          </section>

          {/* 支払時期 */}
          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">支払時期</h2>
            <div className="text-gray-700">
              <p className="mb-2">• 月額プラン: 毎月の更新日に自動課金</p>
              <p className="mb-2">• 年額プラン: 毎年の更新日に自動課金</p>
              <p>• 初回: 7日間の無料トライアル終了後に課金開始</p>
            </div>
          </section>

          {/* サービス提供時期 */}
          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">サービス提供時期</h2>
            <p className="text-gray-700">
              お申し込み後、即座にご利用いただけます。
            </p>
          </section>

          {/* 返品・キャンセル */}
          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">返品・キャンセルについて</h2>
            <div className="text-gray-700">
              <p className="mb-2">
                デジタルサービスの性質上、お客様都合による返品・返金には応じかねます。
              </p>
              <p className="mb-2">
                サブスクリプションはいつでもキャンセル可能です。キャンセル後は次回更新日以降、課金されません。
              </p>
              <p>
                無料トライアル期間中にキャンセルした場合、料金は一切発生しません。
              </p>
            </div>
          </section>

          {/* 解約方法 */}
          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">解約方法</h2>
            <div className="text-gray-700">
              <p className="mb-2">
                アプリ内の「請求管理」ページから、カスタマーポータルにアクセスして解約できます。
              </p>
              <p>
                または、サポートまでお問い合わせください。
              </p>
            </div>
          </section>

          {/* 不良品・誤配送 */}
          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">不良品・サービス不具合について</h2>
            <p className="text-gray-700">
              サービスに不具合がある場合は、サポートまでご連絡ください。迅速に対応いたします。
            </p>
          </section>

          {/* 個人情報の取り扱い */}
          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">個人情報の取り扱い</h2>
            <p className="text-gray-700">
              お客様の個人情報は、当社の
              <a href="/legal/privacy" className="text-blue-600 hover:underline">
                プライバシーポリシー
              </a>
              に基づき適切に管理いたします。
            </p>
          </section>

          {/* 決済代行会社 */}
          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">決済代行会社</h2>
            <div className="text-gray-700">
              <p className="mb-2">Stripe, Inc.</p>
              <p className="text-sm">
                決済はStripe社の安全なシステムを通じて処理されます。<br />
                カード情報は当社サーバーに保存されず、Stripe社が厳重に管理します。
              </p>
            </div>
          </section>
        </div>

        {/* 更新日 */}
        <div className="mt-8 text-center text-sm text-gray-500">
          最終更新日: 2025年11月3日
        </div>
      </div>
    </div>
  );
}

