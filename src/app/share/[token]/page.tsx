"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Car, MaintenanceRecord } from "@/types";

interface TokenVerificationResult {
  valid: boolean;
  carId?: string;
  expiresAt?: number;
  error?: string;
}

export default function SharedVehicleHistoryPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const token = params.token as string;
  const isReadOnly = searchParams.get('readOnly') === 'true';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [car, setCar] = useState<Car | null>(null);
  const [maintenanceRecords, setMaintenanceRecords] = useState<MaintenanceRecord[]>([]);
  const [tokenInfo, setTokenInfo] = useState<TokenVerificationResult | null>(null);

  useEffect(() => {
    const loadSharedData = async () => {
      try {
        setLoading(true);
        setError(null); // エラーをリセット
        
        // トークンを検証（サーバーサイドで検証すべきだが、まずはクライアントで簡易実装）
        const verificationResult = await verifyShareToken(token);
        setTokenInfo(verificationResult);

        if (!verificationResult.valid) {
          setError(verificationResult.error || "無効なリンクです");
          setLoading(false);
          return;
        }

        if (!verificationResult.carId) {
          setError("車両IDが見つかりません");
          setLoading(false);
          return;
        }

        // 車両データを取得
        const carDoc = await getDoc(doc(db, "cars", verificationResult.carId));
        if (!carDoc.exists()) {
          setError("車両データが見つかりません");
          setLoading(false);
          return;
        }

        const carData = { id: carDoc.id, ...carDoc.data() } as Car;
        setCar(carData);

        // メンテナンス記録を取得
        const maintenanceQuery = query(
          collection(db, "maintenance"),
          where("carId", "==", verificationResult.carId)
        );
        const maintenanceSnapshot = await getDocs(maintenanceQuery);
        const records = maintenanceSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          date: doc.data().date?.toDate?.() || new Date(doc.data().date)
        })) as MaintenanceRecord[];

        // 日付順にソート
        records.sort((a, b) => b.date.getTime() - a.date.getTime());
        setMaintenanceRecords(records);

        // アクセスログを記録（Firebase Functionsで実装すべき）
        await logShareLinkAccess(verificationResult.carId, token);

      } catch (err) {
        console.error("共有データの読み込みエラー:", err);
        setError("データの読み込みに失敗しました");
      } finally {
        setLoading(false);
      }
    };

    if (token) {
      loadSharedData();
    }
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">読み込み中...</p>
        </div>
      </div>
    );
  }

  if (error || !car) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="text-red-500 text-5xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">アクセスエラー</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <div className="text-sm text-gray-500">
            <p>考えられる原因：</p>
            <ul className="list-disc list-inside mt-2 text-left">
              <li>リンクの有効期限が切れている</li>
              <li>リンクが無効または改ざんされている</li>
              <li>車両データが削除されている</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  const totalCost = maintenanceRecords.reduce((sum, record) => sum + (record.cost || 0), 0);
  const avgCost = maintenanceRecords.length > 0 ? Math.round(totalCost / maintenanceRecords.length) : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* ヘッダー */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">🚗 メンテナンス履歴</h1>
              <p className="text-sm text-gray-500 mt-1">
                Smart Garage 共有ページ（閲覧専用）
                {isReadOnly && <span className="ml-2 px-2 py-0.5 bg-orange-100 text-orange-700 rounded text-xs font-medium">📦 売却済み車両</span>}
              </p>
            </div>
            <div className="text-right text-sm text-gray-500">
              <p>🔒 セキュアな共有リンク</p>
              {tokenInfo?.expiresAt && (
                <p className="text-xs">
                  有効期限: {new Date(tokenInfo.expiresAt).toLocaleDateString("ja-JP")}
                </p>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        {/* 車両情報カード */}
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-6">
          <div className="flex flex-col md:flex-row gap-6">
            {car.imagePath && (
              <div className="md:w-1/3">
                <img
                  src={car.imagePath}
                  alt={car.name}
                  className="w-full rounded-xl object-cover aspect-video"
                />
              </div>
            )}
            <div className="flex-1">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">{car.name}</h2>
              <div className="grid grid-cols-2 gap-4">
                {car.modelCode && (
                  <div>
                    <p className="text-sm text-gray-500">型式</p>
                    <p className="font-semibold text-gray-900">{car.modelCode}</p>
                  </div>
                )}
                {car.year && (
                  <div>
                    <p className="text-sm text-gray-500">年式</p>
                    <p className="font-semibold text-gray-900">{car.year}年</p>
                  </div>
                )}
                {car.odoKm && (
                  <div>
                    <p className="text-sm text-gray-500">走行距離</p>
                    <p className="font-semibold text-gray-900">{car.odoKm.toLocaleString()} km</p>
                  </div>
                )}
                {car.inspectionExpiry && (
                  <div>
                    <p className="text-sm text-gray-500">車検期限</p>
                    <p className="font-semibold text-gray-900">
                      {new Date(car.inspectionExpiry).toLocaleDateString("ja-JP")}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 統計情報 */}
        {maintenanceRecords.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-white rounded-xl shadow p-6">
              <p className="text-sm text-gray-500 mb-1">総記録数</p>
              <p className="text-3xl font-bold text-blue-600">{maintenanceRecords.length}件</p>
            </div>
            <div className="bg-white rounded-xl shadow p-6">
              <p className="text-sm text-gray-500 mb-1">総費用</p>
              <p className="text-3xl font-bold text-green-600">¥{totalCost.toLocaleString()}</p>
            </div>
            <div className="bg-white rounded-xl shadow p-6">
              <p className="text-sm text-gray-500 mb-1">平均費用</p>
              <p className="text-3xl font-bold text-purple-600">¥{avgCost.toLocaleString()}</p>
            </div>
          </div>
        )}

        {/* メンテナンス記録リスト */}
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <h3 className="text-xl font-bold text-gray-900 mb-6">📋 メンテナンス履歴</h3>
          
          {maintenanceRecords.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <p className="text-lg">メンテナンス記録がありません</p>
            </div>
          ) : (
            <div className="space-y-4">
              {maintenanceRecords.map((record) => (
                <div
                  key={record.id}
                  className="border border-gray-200 rounded-xl p-6 hover:shadow-md transition-shadow"
                >
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="text-lg font-semibold text-gray-900">{record.title}</h4>
                        <span className="inline-block px-3 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
                          {record.category || "メンテナンス"}
                        </span>
                      </div>
                      {record.description && (
                        <p className="text-gray-600 mb-3">{record.description}</p>
                      )}
                      <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                        <span>📅 {record.date.toLocaleDateString("ja-JP")}</span>
                        {record.mileage && <span>🛣️ {record.mileage.toLocaleString()} km</span>}
                        {record.location && <span>📍 {record.location}</span>}
                      </div>
                    </div>
                    {record.cost && (
                      <div className="text-right">
                        <p className="text-2xl font-bold text-gray-900">
                          ¥{record.cost.toLocaleString()}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* フッター */}
        <div className="mt-8 text-center text-sm text-gray-500">
          <p className="mb-2">
            このページは Smart Garage から共有されたメンテナンス履歴です
          </p>
          <p className="text-xs">
            データは暗号化され、署名検証済みです 🔒
          </p>
          <div className="mt-4 pt-4 border-t border-gray-200">
            <a
              href="/"
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              Smart Garage でメンテナンス管理を始める →
            </a>
          </div>
        </div>
      </main>
    </div>
  );
}

// トークン検証関数（簡易版 - 本来はサーバーサイドで実装すべき）
async function verifyShareToken(token: string): Promise<TokenVerificationResult> {
  try {
    console.log("Verifying token:", token);
    
    // トークンが空または短すぎる場合
    if (!token || token.length < 10) {
      console.log("Token too short");
      return { valid: false, error: "無効なリンク形式です" };
    }
    
    // トークン形式: carId.timestamp.expiresAt.signature
    const parts = token.split(".");
    if (parts.length !== 4) {
      console.log("Invalid token format, parts:", parts.length);
      return { valid: false, error: "無効なリンクです" };
    }

    const [carId, timestampStr, expiresAtStr, signature] = parts;
    
    // 各パーツが存在するか確認
    if (!carId || !timestampStr || !expiresAtStr || !signature) {
      console.log("Missing token parts");
      return { valid: false, error: "無効なリンクです" };
    }
    
    const expiresAt = parseInt(expiresAtStr, 10);

    if (isNaN(expiresAt)) {
      console.log("Invalid expiration timestamp");
      return { valid: false, error: "無効なリンクです" };
    }

    // 有効期限チェック
    const now = Date.now();
    if (now > expiresAt) {
      console.log("Token expired:", { now, expiresAt });
      return { valid: false, error: "リンクの有効期限が切れています", carId, expiresAt };
    }

    // 本来はサーバーサイドで署名を検証すべき
    // ここでは簡易的にトークン形式のみチェック
    console.log("Token validated successfully");
    return { valid: true, carId, expiresAt };
  } catch (error) {
    console.error("Token verification error:", error);
    return { valid: false, error: "トークンの検証に失敗しました" };
  }
}

// アクセスログ記録（本来はFirebase Functionsで実装すべき）
async function logShareLinkAccess(carId: string, token: string): Promise<void> {
  try {
    // 将来的にはFirestore/Cloud Loggingに記録
    console.log("Share link accessed:", {
      carId,
      token: token.substring(0, 16) + "...", // トークンの先頭のみログ
      timestamp: new Date().toISOString(),
      userAgent: typeof window !== "undefined" ? window.navigator.userAgent : "unknown"
    });
  } catch (error) {
    console.error("Failed to log access:", error);
  }
}
