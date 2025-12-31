/**
 * 売却用公開ページ
 * /s/[slug]
 */

import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getSaleProfileBySlug, generateSalePublicViewModel, getVehicleByCarId, getMaintenanceRecords, getCustomizationsForPublic } from '@/lib/saleProfile';
import SalePublicPage from '@/components/SalePublicPage';
import SNSSharePublicPage from '@/components/SNSSharePublicPage';

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

  const shareProfileType = (saleProfile as any).type || 'sale';
  const vehicle = await getVehicleByCarId(saleProfile.ownerUid, saleProfile.vehicleId);
  
  // type="normal"の場合はSNS共有用のOG設定
  if (shareProfileType === 'normal' && vehicle) {
    const sns = (saleProfile as any).sns || {};
    const title = sns.conceptTitle 
      ? `${vehicle.name} | ${sns.conceptTitle} | GarageLog`
      : `${vehicle.name} | GarageLog`;
    
    const description = sns.conceptBody || `${vehicle.name}のビルドとメンテナンス履歴`;
    
    // ヒーロー画像（ギャラリーの最初の画像または車両画像）
    const heroImage = sns.gallery && sns.gallery.length > 0 
      ? sns.gallery[0].path 
      : vehicle.imageUrl;

    const metadata: Metadata = {
      title,
      description,
      openGraph: {
        title,
        description,
        type: 'website',
        ...(heroImage && { images: [{ url: heroImage }] }),
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description,
        ...(heroImage && { images: [heroImage] }),
      },
    };

    // unlistedの場合はnoindex
    if (saleProfile.visibility === 'unlisted') {
      metadata.robots = {
        index: false,
        follow: false,
      };
    } else {
      metadata.robots = {
        index: true,
        follow: true,
      };
    }

    return metadata;
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

  // type="normal"の場合はSNS共有ページを表示
  if (shareProfileType === 'normal') {
    // メンテナンス記録とカスタマイズを取得
    const maintenanceRecords = await getMaintenanceRecords(saleProfile.ownerUid, saleProfile.vehicleId, true);
    const customizations = await getCustomizationsForPublic(saleProfile.ownerUid, saleProfile.vehicleId);

    // Timestampをシリアライズ可能な形式に変換
    const serializeTimestamp = (ts: any): string | null => {
      if (!ts) return null;
      if (ts.toDate) return ts.toDate().toISOString();
      if (ts._seconds) return new Date(ts._seconds * 1000 + (ts._nanoseconds || 0) / 1000000).toISOString();
      if (ts instanceof Date) return ts.toISOString();
      return null;
    };

    // オブジェクト内のすべてのTimestampフィールドを再帰的にシリアライズ
    const serializeObject = (obj: any): any => {
      if (obj === null || obj === undefined) return obj;
      if (Array.isArray(obj)) {
        return obj.map(item => serializeObject(item));
      }
      if (typeof obj === 'object') {
        // Timestampオブジェクトのチェック
        if (obj.toDate || (obj._seconds !== undefined && obj._nanoseconds !== undefined)) {
          return serializeTimestamp(obj);
        }
        // 通常のオブジェクトの場合、再帰的に処理
        const serialized: any = {};
        for (const key in obj) {
          if (obj.hasOwnProperty(key)) {
            serialized[key] = serializeObject(obj[key]);
          }
        }
        return serialized;
      }
      return obj;
    };

    const serializeVehicle = (v: any) => serializeObject(v);
    const serializeMaintenanceRecords = (records: any[]) => serializeObject(records);
    const serializeCustomizations = (customs: any[]) => serializeObject(customs);
    const serializeShareProfile = (profile: any) => serializeObject(profile);

    return (
      <SNSSharePublicPage
        shareProfile={serializeShareProfile(saleProfile)}
        vehicle={serializeVehicle(vehicle)}
        maintenanceRecords={serializeMaintenanceRecords(maintenanceRecords)}
        customizations={serializeCustomizations(customizations)}
      />
    );
  }

  // ViewModelを生成（sale/appraisal用）
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