// src/app/legal/privacy/page.tsx
import Link from "next/link";

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* ヘッダー */}
        <div className="mb-8">
          <Link href="/" className="text-blue-600 hover:text-blue-700 text-sm mb-4 inline-block">
            ← Smart Garageに戻る
          </Link>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            プライバシーポリシー
          </h1>
          <p className="text-gray-600">最終更新日: 2025年11月3日</p>
        </div>

        {/* 本文 */}
        <div className="bg-white rounded-2xl shadow-sm p-8 space-y-8">
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">1. はじめに</h2>
            <p className="text-gray-700 leading-relaxed">
              Smart Garage（以下「当サービス」）は、ユーザーの皆様のプライバシーを尊重し、個人情報の保護に最大限の注意を払います。
              本プライバシーポリシーは、当サービスがどのように個人情報を収集、使用、保護するかを説明します。
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">2. 収集する情報</h2>
            <div className="space-y-4 text-gray-700">
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">2.1 アカウント情報</h3>
                <ul className="list-disc pl-6 space-y-1">
                  <li>Googleアカウント情報（メールアドレス、名前、プロフィール画像）</li>
                  <li>ユーザーID（Firebase Authentication）</li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-2">2.2 車両・メンテナンス情報</h3>
                <ul className="list-disc pl-6 space-y-1">
                  <li>車両情報（車名、型式、年式、走行距離など）</li>
                  <li>メンテナンス記録（日付、内容、費用、画像など）</li>
                  <li>燃料給油記録</li>
                  <li>カスタマイズ履歴</li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-2">2.3 利用情報</h3>
                <ul className="list-disc pl-6 space-y-1">
                  <li>アクセスログ（IPアドレス、ブラウザ情報）</li>
                  <li>利用状況（機能の使用頻度、エラー情報）</li>
                  <li>決済情報（Stripe経由、当サービスでは保存しません）</li>
                </ul>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">3. 情報の使用目的</h2>
            <ul className="list-disc pl-6 space-y-2 text-gray-700">
              <li>サービスの提供・運営</li>
              <li>ユーザーサポート</li>
              <li>サービスの改善・新機能の開発</li>
              <li>セキュリティの維持・不正利用の防止</li>
              <li>統計分析（匿名化されたデータのみ）</li>
              <li>法令に基づく対応</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">4. 情報の共有</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              当サービスは、以下の場合を除き、ユーザーの個人情報を第三者に提供することはありません：
            </p>
            <ul className="list-disc pl-6 space-y-2 text-gray-700">
              <li>ユーザーの同意がある場合</li>
              <li>法令に基づく場合</li>
              <li>サービス提供に必要な範囲での委託先への提供（Firebase、Stripe、Sentry等）</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">5. データの保管</h2>
            <p className="text-gray-700 leading-relaxed">
              ユーザーデータは、Googleが運営するFirebase（クラウドファイアストア、クラウドストレージ）に保存されます。
              データは暗号化され、適切なセキュリティ対策の下で管理されます。
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">6. Cookie・トラッキング</h2>
            <div className="space-y-4 text-gray-700">
              <p>当サービスは、以下の目的でCookieを使用します：</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>ログイン状態の維持</li>
                <li>ユーザー設定の保存</li>
                <li>アクセス解析（匿名化）</li>
              </ul>
              <p>
                ブラウザの設定でCookieを無効にすることができますが、一部機能が制限される場合があります。
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">7. ユーザーの権利</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              ユーザーは、自身の個人情報について以下の権利を有します：
            </p>
            <ul className="list-disc pl-6 space-y-2 text-gray-700">
              <li>アクセス権：自身のデータを確認する権利</li>
              <li>訂正権：不正確なデータを訂正する権利</li>
              <li>削除権：データの削除を求める権利</li>
              <li>エクスポート権：データをダウンロードする権利</li>
            </ul>
            <p className="text-gray-700 mt-4">
              これらの権利を行使する場合は、サポートページからお問い合わせください。
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">8. データの削除</h2>
            <p className="text-gray-700 leading-relaxed">
              アカウントを削除すると、ユーザーの個人情報およびすべてのデータは完全に削除されます。
              ただし、法令により保管が義務付けられているデータや、匿名化された統計データは保持される場合があります。
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">9. 子供のプライバシー</h2>
            <p className="text-gray-700 leading-relaxed">
              当サービスは、13歳未満の子供から意図的に個人情報を収集することはありません。
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">10. ポリシーの変更</h2>
            <p className="text-gray-700 leading-relaxed">
              当サービスは、必要に応じて本プライバシーポリシーを変更することがあります。
              重要な変更がある場合は、サービス内で通知します。
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">11. お問い合わせ</h2>
            <p className="text-gray-700 leading-relaxed">
              プライバシーポリシーに関するご質問は、
              <Link href="/support" className="text-blue-600 hover:text-blue-700 font-medium">
                サポートページ
              </Link>
              からお問い合わせください。
            </p>
          </section>
        </div>

        {/* 関連リンク */}
        <div className="mt-8 flex gap-4 justify-center">
          <Link
            href="/legal/terms"
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            利用規約
          </Link>
          <Link
            href="/legal/tokusho"
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            特定商取引法表記
          </Link>
        </div>
      </div>
    </div>
  );
}
