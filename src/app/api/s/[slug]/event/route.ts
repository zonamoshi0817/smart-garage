/**
 * 売却ページ閲覧イベント記録API
 * /api/s/[slug]/event
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/lib/firebaseAdmin';
import { getSaleProfileBySlug } from '@/lib/saleProfile';
import { Timestamp } from 'firebase-admin/firestore';
import crypto from 'crypto';

export const runtime = 'nodejs';
export const maxDuration = 10;

/**
 * IPアドレスとUser-Agentからハッシュを生成（プライバシー保護）
 */
function hashIpUa(ip: string | null, userAgent: string | null): string {
  const combined = `${ip || 'unknown'}|${userAgent || 'unknown'}`;
  return crypto.createHash('sha256').update(combined).digest('hex').substring(0, 16);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const body = await req.json();
    const { event } = body;

    // イベント種類の検証
    const validEvents = ['page_view', 'pdf_download_assess', 'pdf_download_handover', 'copy_template'];
    if (!event || !validEvents.includes(event)) {
      return NextResponse.json(
        { error: 'Invalid event type' },
        { status: 400 }
      );
    }

    // SaleProfileの存在確認（analyticsが有効かどうかも確認）
    const saleProfile = await getSaleProfileBySlug(slug);
    if (!saleProfile) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    // analyticsが無効の場合は記録しない（でも200を返す）
    if (!saleProfile.analyticsEnabled) {
      return NextResponse.json({ success: true, recorded: false });
    }

    // リクエスト情報を取得
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || null;
    const userAgent = req.headers.get('user-agent') || null;
    const referrer = req.headers.get('referer') || null;

    // IP+UAをハッシュ化（プライバシー保護）
    const hashIpUaValue = hashIpUa(ip, userAgent);

    // Firestoreに記録
    const db = getAdminFirestore();
    await db.collection('salePageViews').add({
      saleProfileId: saleProfile.id!,
      timestamp: Timestamp.now(),
      hashIpUa: hashIpUaValue,
      referrer: referrer || null,
      event,
    });

    return NextResponse.json({ success: true, recorded: true });
  } catch (error: any) {
    console.error('Event recording error:', error);
    // エラーでも200を返す（ユーザー体験を損なわないため）
    return NextResponse.json({ success: false, error: error.message }, { status: 200 });
  }
}
