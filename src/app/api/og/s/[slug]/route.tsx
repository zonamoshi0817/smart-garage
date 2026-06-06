/**
 * OGP画像生成API
 * /api/og/s/[slug] → 車名＋GarageLogロゴ入りOG画像を返す
 */

import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';
import { getSaleProfileBySlug, getVehicleByCarId } from '@/lib/saleProfile';

export const runtime = 'nodejs';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  let vehicleName = 'GarageLog';
  let modelCode = '';
  let conceptBody = '';
  let highlightTags: string[] = [];
  let heroImageUrl: string | null = null;

  try {
    const profile = await getSaleProfileBySlug(slug);
    if (profile) {
      const vehicle = await getVehicleByCarId(profile.ownerUid, profile.vehicleId);
      if (vehicle) {
        vehicleName = vehicle.name;
        modelCode = vehicle.modelCode || '';
      }
      const sns = (profile as any).sns || {};
      conceptBody = sns.conceptBody || '';
      highlightTags = (sns.highlightParts || []).slice(0, 3).map((p: any) => p.value);

      // ヒーロー画像（Storageパスから直接URL生成）
      if (sns.gallery && sns.gallery.length > 0) {
        const path = sns.gallery[0].path;
        heroImageUrl = `https://firebasestorage.googleapis.com/v0/b/smart-garage-74ad1.firebasestorage.app/o/${encodeURIComponent(path)}?alt=media`;
      } else if ((vehicle as any)?.imageUrl) {
        heroImageUrl = (vehicle as any).imageUrl;
      }
    }
  } catch {
    // フォールバック: デフォルト画像を返す
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          background: '#1a1a18',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* 背景画像（ぼかし＋暗転） */}
        {heroImageUrl && (
          <img
            src={heroImageUrl}
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              opacity: 0.25,
            }}
          />
        )}

        {/* グラデーションオーバーレイ */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(135deg, rgba(26,26,24,0.9) 0%, rgba(26,26,24,0.5) 100%)',
          }}
        />

        {/* コンテンツ */}
        <div
          style={{
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            height: '100%',
            padding: '56px 64px',
          }}
        >
          {/* 上部：ロゴ */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontFamily: 'monospace', fontSize: 18, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(247,245,240,0.5)' }}>
              GarageLog
            </span>
          </div>

          {/* 中央：車名 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {conceptBody && (
              <p style={{ fontSize: 22, color: 'rgba(247,245,240,0.7)', margin: 0, lineHeight: 1.5, maxWidth: 700 }}>
                {conceptBody}
              </p>
            )}
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 16 }}>
              <span style={{ fontSize: 80, fontWeight: 700, color: '#f7f5f0', letterSpacing: '0.02em', lineHeight: 1 }}>
                {vehicleName}
              </span>
              {modelCode && (
                <span style={{ fontSize: 32, color: 'rgba(247,245,240,0.5)', fontFamily: 'monospace' }}>
                  {modelCode}
                </span>
              )}
            </div>

            {/* ハイライトタグ */}
            {highlightTags.length > 0 && (
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                {highlightTags.map((tag, i) => (
                  <span
                    key={i}
                    style={{
                      background: 'rgba(247,245,240,0.12)',
                      border: '1px solid rgba(247,245,240,0.25)',
                      borderRadius: 4,
                      padding: '4px 12px',
                      fontSize: 16,
                      color: 'rgba(247,245,240,0.8)',
                      fontFamily: 'monospace',
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                    }}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* 下部：URL hint */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontFamily: 'monospace', fontSize: 16, color: 'rgba(247,245,240,0.35)', letterSpacing: '0.06em' }}>
              garagelog.jp
            </span>
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
