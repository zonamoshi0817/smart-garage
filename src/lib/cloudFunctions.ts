// src/lib/cloudFunctions.ts
"use client";

import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from './firebase';

/**
 * Cloud Functions インスタンス
 * リージョン: asia-northeast1（東京）
 */
const functions = getFunctions(app, 'asia-northeast1');

/**
 * PDF署名付きエクスポートトークン発行
 * 
 * クライアントHMAC問題を解決:
 * - サーバーサイドで署名生成
 * - 短命JWT（7日）
 * - kid付きで鍵ローテーション対応
 */
export interface PdfExportTokenRequest {
  carId: string;
  recordIds?: string[];
  options?: any;
}

export interface PdfExportTokenResponse {
  token: string;
  expiresAt: number;
  downloadUrl: string;
}

export async function generatePdfExportToken(
  request: PdfExportTokenRequest
): Promise<PdfExportTokenResponse> {
  const callable = httpsCallable<PdfExportTokenRequest, PdfExportTokenResponse>(
    functions,
    'generatePdfExportToken'
  );

  const result = await callable(request);
  return result.data;
}

/**
 * 共有URL署名付きトークン発行
 * 
 * 機能:
 * - scope指定（share:car / share:vehicle-history）
 * - 有効期限設定（デフォルト30日）
 * - 失効機能（revokedAt）
 */
export interface ShareTokenRequest {
  carId: string;
  scope: 'share:car' | 'share:vehicle-history';
  expiresInDays?: number;
}

export interface ShareTokenResponse {
  token: string;
  tokenId: string;
  expiresAt: number;
  shareUrl: string;
}

export async function generateShareTokenSecure(
  request: ShareTokenRequest
): Promise<ShareTokenResponse> {
  const callable = httpsCallable<ShareTokenRequest, ShareTokenResponse>(
    functions,
    'generateShareToken'
  );

  const result = await callable(request);
  return result.data;
}

/**
 * 共有トークンの検証
 */
export interface VerifyShareTokenRequest {
  token: string;
}

export interface VerifyShareTokenResponse {
  valid: boolean;
  userId?: string;
  carId?: string;
  scope?: string;
  expiresAt?: number;
}

export async function verifyShareTokenSecure(
  token: string
): Promise<VerifyShareTokenResponse> {
  const callable = httpsCallable<VerifyShareTokenRequest, VerifyShareTokenResponse>(
    functions,
    'verifyShareToken'
  );

  const result = await callable({ token });
  return result.data;
}

/**
 * 共有トークンの失効
 */
export interface RevokeShareTokenRequest {
  tokenId: string;
}

export interface RevokeShareTokenResponse {
  success: boolean;
  revokedAt: string;
}

export async function revokeShareTokenSecure(
  tokenId: string
): Promise<RevokeShareTokenResponse> {
  const callable = httpsCallable<RevokeShareTokenRequest, RevokeShareTokenResponse>(
    functions,
    'revokeShareToken'
  );

  const result = await callable({ tokenId });
  return result.data;
}

/**
 * PDFエクスポートトークンの検証
 */
export interface VerifyPdfExportTokenRequest {
  token: string;
}

export interface VerifyPdfExportTokenResponse {
  valid: boolean;
  userId?: string;
  carId?: string;
  recordIds?: string[];
  options?: any;
  expiresAt?: number;
}

export async function verifyPdfExportTokenSecure(
  token: string
): Promise<VerifyPdfExportTokenResponse> {
  const callable = httpsCallable<VerifyPdfExportTokenRequest, VerifyPdfExportTokenResponse>(
    functions,
    'verifyPdfExportToken'
  );

  const result = await callable({ token });
  return result.data;
}

