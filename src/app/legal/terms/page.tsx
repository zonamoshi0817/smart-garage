// src/app/legal/terms/page.tsx
import Link from "next/link";

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* ヘッダー */}
        <div className="mb-8">
          <Link href="/" className="text-blue-600 hover:text-blue-700 text-sm mb-4 inline-block">
            ← Smart Garageに戻る
          </Link>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            利用規約
          </h1>
          <p className="text-gray-600">最終更新日: 2025年11月3日</p>
        </div>

        {/* 本文 */}
        <div className="bg-white rounded-2xl shadow-sm p-8 space-y-8">
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">第1条（適用）</h2>
            <p className="text-gray-700 leading-relaxed">
              本規約は、Smart Garage（以下「当サービス」）の提供条件および当サービスの利用に関する当社とユーザーとの間の権利義務関係を定めることを目的とし、
              ユーザーと当社との間の当サービスの利用に関わる一切の関係に適用されます。
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">第2条（定義）</h2>
            <p className="text-gray-700 mb-3">本規約において使用する用語の定義は、次のとおりとします。</p>
            <ol className="list-decimal pl-6 space-y-2 text-gray-700">
              <li>「当サービス」とは、Smart Garageという名称のWebアプリケーションおよび関連サービスを意味します。</li>
              <li>「ユーザー」とは、当サービスを利用する個人または法人を意味します。</li>
              <li>「登録情報」とは、ユーザーが当サービスに登録した情報を意味します。</li>
              <li>「コンテンツ」とは、ユーザーが当サービスに投稿・アップロードした情報を意味します。</li>
            </ol>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">第3条（登録）</h2>
            <ol className="list-decimal pl-6 space-y-2 text-gray-700">
              <li>ユーザーは、Googleアカウントを使用して当サービスに登録するものとします。</li>
              <li>当サービスは、登録申請を承認しない場合があり、その理由を開示する義務を負いません。</li>
              <li>未成年者が当サービスを利用する場合、保護者の同意が必要です。</li>
            </ol>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">第4条（アカウント管理）</h2>
            <ol className="list-decimal pl-6 space-y-2 text-gray-700">
              <li>ユーザーは、アカウント情報を適切に管理する責任を負います。</li>
              <li>アカウント情報の使用により生じた損害は、ユーザーが責任を負うものとします。</li>
              <li>第三者による不正使用を発見した場合は、直ちに当社に通知してください。</li>
            </ol>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">第5条（プレミアムプラン）</h2>
            <ol className="list-decimal pl-6 space-y-2 text-gray-700">
              <li>当サービスは、無料プランとプレミアムプラン（有料）を提供します。</li>
              <li>プレミアムプランの料金は、980円/月または9,800円/年です。</li>
              <li>料金は、Stripeを通じて事前にクレジットカードで支払うものとします。</li>
              <li>プレミアムプランは自動更新されます。</li>
              <li>解約は、設定ページからいつでも可能です。解約後、次回更新日まではプレミアム機能を利用できます。</li>
              <li>返金は、サービスに重大な瑕疵があった場合を除き、原則として行いません。</li>
            </ol>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">第6条（禁止事項）</h2>
            <p className="text-gray-700 mb-3">ユーザーは、以下の行為を行ってはなりません：</p>
            <ol className="list-decimal pl-6 space-y-2 text-gray-700">
              <li>法令または公序良俗に違反する行為</li>
              <li>犯罪行為に関連する行為</li>
              <li>当サービスの運営を妨害する行為</li>
              <li>他のユーザーまたは第三者の権利を侵害する行為</li>
              <li>虚偽の情報を登録する行為</li>
              <li>不正アクセスまたはこれを試みる行為</li>
              <li>当サービスのリバースエンジニアリング</li>
              <li>営利目的での無断使用</li>
            </ol>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">第7条（知的財産権）</h2>
            <ol className="list-decimal pl-6 space-y-2 text-gray-700">
              <li>当サービスに関する知的財産権は、すべて当社に帰属します。</li>
              <li>ユーザーが投稿したコンテンツの知的財産権は、ユーザーに帰属します。</li>
              <li>ユーザーは、コンテンツの保存・表示・配信に必要な範囲で、当社に非独占的な使用許諾を付与するものとします。</li>
            </ol>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">第8条（免責事項）</h2>
            <ol className="list-decimal pl-6 space-y-2 text-gray-700">
              <li>当サービスは、現状有姿で提供されます。</li>
              <li>当社は、サービスの完全性、正確性、有用性等について保証しません。</li>
              <li>当社は、ユーザー間またはユーザーと第三者との間のトラブルについて責任を負いません。</li>
              <li>天災、戦争、暴動等の不可抗力による損害について、当社は責任を負いません。</li>
            </ol>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">第9条（サービスの変更・中断・終了）</h2>
            <ol className="list-decimal pl-6 space-y-2 text-gray-700">
              <li>当社は、ユーザーへの事前通知なく、サービス内容を変更できるものとします。</li>
              <li>当社は、メンテナンスやシステム障害により、サービスを一時的に中断できます。</li>
              <li>当社は、1ヶ月前の通知により、サービスを終了できるものとします。</li>
            </ol>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">第10条（利用停止・解除）</h2>
            <p className="text-gray-700 mb-3">
              当社は、ユーザーが以下に該当する場合、事前通知なくサービスの利用を停止またはアカウントを削除できます：
            </p>
            <ol className="list-decimal pl-6 space-y-2 text-gray-700">
              <li>本規約に違反した場合</li>
              <li>登録情報に虚偽があった場合</li>
              <li>6ヶ月以上サービスの利用がない場合</li>
              <li>その他、当社が不適切と判断した場合</li>
            </ol>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">第11条（準拠法・管轄）</h2>
            <p className="text-gray-700 leading-relaxed">
              本規約は日本法に準拠し、当サービスに関する紛争については、東京地方裁判所を第一審の専属的合意管轄裁判所とします。
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">第12条（規約の変更）</h2>
            <p className="text-gray-700 leading-relaxed">
              当社は、必要に応じて本規約を変更できるものとします。変更後の規約は、当サービス上に掲載した時点で効力を生じます。
            </p>
          </section>
        </div>

        {/* 関連リンク */}
        <div className="mt-8 flex gap-4 justify-center">
          <Link
            href="/legal/privacy"
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            プライバシーポリシー
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
