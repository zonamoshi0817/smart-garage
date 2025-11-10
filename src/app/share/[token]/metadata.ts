import { Metadata } from 'next';

export async function generateMetadata({ params }: { params: { token: string } }): Promise<Metadata> {
  // トークンから基本情報を取得（簡易版）
  // 本来はサーバーサイドでFirestoreから車両情報を取得すべき
  
  return {
    title: 'メンテナンス履歴共有 | garage log',
    description: '車両のメンテナンス履歴を安全に共有。整備記録、費用、走行距離などを閲覧できます。',
    robots: {
      index: false, // 検索エンジンにインデックスさせない
      follow: false,
    },
    openGraph: {
      title: 'メンテナンス履歴共有 | garage log',
      description: '車両のメンテナンス履歴を安全に共有。整備記録、費用、走行距離などを閲覧できます。',
      type: 'website',
      siteName: 'garage log',
      images: [
        {
          url: '/car.jpg', // デフォルト画像
          width: 1200,
          height: 630,
          alt: 'garage log - 車両メンテナンス管理',
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: 'メンテナンス履歴共有 | garage log',
      description: '車両のメンテナンス履歴を安全に共有',
      images: ['/car.jpg'],
    },
  };
}

