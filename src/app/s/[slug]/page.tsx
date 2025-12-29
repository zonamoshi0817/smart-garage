/**
 * 売却用公開ページ
 * /s/[slug]
 */

import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getSaleProfileBySlug, generateSalePublicViewModel, getVehicleByCarId } from '@/lib/saleProfile';
import SalePublicPage from '@/components/SalePublicPage';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const saleProfile = await getSaleProfileBySlug(slug);

  if (!saleProfile || saleProfile.visibility === 'disabled') {
    return {
      title: 'ページが見つかりません',
    };
  }

  // unlistedの場合はnoindex
  if (saleProfile.visibility === 'unlisted') {
    return {
      title: '車両情報',
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  return {
    title: '車両情報',
    robots: {
      index: true,
      follow: true,
    },
  };
}

export default async function SalePublicPageRoute({ params }: PageProps) {
  const { slug } = await params;

  // SaleProfileを取得
  const saleProfile = await getSaleProfileBySlug(slug);

  // 存在しない、またはdisabledの場合は404
  if (!saleProfile || saleProfile.visibility === 'disabled') {
    notFound();
  }

  // 車両のactiveSaleProfileIdをチェック
  const vehicle = await getVehicleByCarId(saleProfile.ownerUid, saleProfile.vehicleId);
  if (!vehicle || vehicle.activeSaleProfileId !== saleProfile.id) {
    // activeSaleProfileIdが一致しない、またはvehicleが存在しない場合は404
    notFound();
  }

  // ViewModelを生成
  const viewModel = await generateSalePublicViewModel(saleProfile);

  if (!viewModel) {
    notFound();
  }

  // ページビューイベントを記録（非同期、エラーは無視）
  // 注意: ここでは記録のみ。実際のイベント記録はクライアント側で行う

  return (
    <SalePublicPage 
      viewModel={viewModel}
      visibility={saleProfile.visibility}
      analyticsEnabled={saleProfile.analyticsEnabled}
    />
  );
}