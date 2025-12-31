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

  // 車両のactiveShareProfileIdsをチェック（後方互換性のためactiveSaleProfileIdもチェック）
  const vehicle = await getVehicleByCarId(saleProfile.ownerUid, saleProfile.vehicleId);
  if (!vehicle) {
    notFound();
  }
  
  // ShareProfileのtypeを取得（後方互換性のため、typeがなければ'sale'とみなす）
  const shareProfileType = (saleProfile as any).type || 'sale';
  
  // activeShareProfileIdsまたはactiveSaleProfileIdをチェック
  const activeIds = vehicle.activeShareProfileIds || {};
  const isActive = 
    (activeIds[shareProfileType] === saleProfile.id) ||
    (vehicle.activeSaleProfileId === saleProfile.id); // 後方互換
  
  if (!isActive) {
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
      type={shareProfileType as 'normal' | 'sale' | 'appraisal'}
    />
  );
}