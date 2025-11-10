"use client";

import { Shield, Wrench } from "lucide-react";

/**
 * メンテナンスモードページ
 * 本番環境を一時的に閉じる際に表示
 */
export default function MaintenanceModePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center p-6">
      <div className="max-w-2xl w-full">
        <div className="bg-white rounded-3xl shadow-2xl p-8 md:p-12 text-center">
          {/* アイコン */}
          <div className="mx-auto w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mb-6">
            <Wrench className="w-10 h-10 text-blue-600" />
          </div>

          {/* メインメッセージ */}
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            メンテナンス中
          </h1>
          <p className="text-lg text-gray-600 mb-8">
            現在、システムのメンテナンスを実施しています。<br />
            しばらくお待ちください。
          </p>

          {/* 詳細情報 */}
          <div className="bg-blue-50 rounded-2xl p-6 mb-8 text-left">
            <div className="flex items-start gap-3">
              <Shield className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <h2 className="font-semibold text-gray-900 mb-2">お知らせ</h2>
                <ul className="text-sm text-gray-600 space-y-2">
                  <li>• より良いサービス提供のため、システムのアップデートを行っています</li>
                  <li>• メンテナンス中はすべての機能をご利用いただけません</li>
                  <li>• ご不便をおかけして申し訳ございません</li>
                </ul>
              </div>
            </div>
          </div>

          {/* 予定時刻（必要に応じて表示） */}
          <div className="text-sm text-gray-500 mb-6">
            <p>完了予定: 調整中</p>
            <p className="mt-1">最新情報は公式SNSをご確認ください</p>
          </div>

          {/* サポート情報 */}
          <div className="border-t border-gray-200 pt-6">
            <p className="text-sm text-gray-600">
              お問い合わせ:{" "}
              <a 
                href="mailto:support@garagelog.jp" 
                className="text-blue-600 hover:text-blue-700 font-medium"
              >
                support@garagelog.jp
              </a>
            </p>
          </div>
        </div>

        {/* フッター */}
        <div className="text-center mt-8 text-sm text-gray-500">
          <p>© {new Date().getFullYear()} garage log. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}

