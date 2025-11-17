'use client';

import { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

interface QRCodeScannerModalProps {
  onClose: () => void;
  onScanSuccess: (data: {
    chassisNumber?: string;
    registrationNumber?: string;
    inspectionExpiry?: string;
    firstRegYm?: string;
    modelCode?: string;
    year?: number;
    bodyType?: 'sedan' | 'hatchback' | 'suv' | 'wagon' | 'coupe' | 'convertible' | 'pickup' | 'minivan' | 'sports' | 'other';
  }) => void;
}

interface ParsedQRData {
  chassisNumber?: string;
  registrationNumber?: string;
  inspectionExpiry?: string;
  firstRegYm?: string;
  modelCode?: string;
  year?: number;
  bodyType?: 'sedan' | 'hatchback' | 'suv' | 'wagon' | 'coupe' | 'convertible' | 'pickup' | 'minivan' | 'sports' | 'other';
}

/**
 * 車検証QRコードのデータをパース
 * 日本の車検証QRコードは複数のフォーマットがあるため、複数のパターンに対応
 */
function parseInspectionQRCode(qrText: string): ParsedQRData {
  const result: ParsedQRData = {};

  try {
    // パターン1: JSON形式のQRコード
    if (qrText.startsWith('{') || qrText.startsWith('[')) {
      try {
        const json = JSON.parse(qrText);
        if (json.chassisNumber) result.chassisNumber = json.chassisNumber;
        if (json.registrationNumber) result.registrationNumber = json.registrationNumber;
        if (json.inspectionExpiry) result.inspectionExpiry = json.inspectionExpiry;
        if (json.firstRegYm) result.firstRegYm = json.firstRegYm;
        if (json.modelCode) result.modelCode = json.modelCode;
        if (json.year) result.year = parseInt(json.year);
        if (json.bodyType) result.bodyType = json.bodyType;
        return result;
      } catch (e) {
        // JSONパース失敗時は次のパターンを試す
      }
    }

    // パターン2: カンマ区切りまたはタブ区切りの形式
    // 例: "車台番号,車検期限,初度登録年月,型式"
    const lines = qrText.split(/[\n\r,|\t]+/).map(s => s.trim()).filter(s => s);
    
    for (const line of lines) {
      // 車台番号（英数字とハイフンを含む）
      if (/^[A-Z0-9\-]+$/.test(line) && line.length >= 10 && line.length <= 20) {
        if (!result.chassisNumber) {
          result.chassisNumber = line;
        }
      }
      
      // 車検期限（YYYY-MM-DD形式またはYYYYMMDD形式）
      const dateMatch = line.match(/(\d{4})[-\/]?(\d{2})[-\/]?(\d{2})/);
      if (dateMatch) {
        const year = parseInt(dateMatch[1]);
        const month = parseInt(dateMatch[2]);
        const day = parseInt(dateMatch[3]);
        if (year >= 2000 && year <= 2100 && month >= 1 && month <= 12 && day >= 1 && day <= 31) {
          if (!result.inspectionExpiry) {
            result.inspectionExpiry = `${dateMatch[1]}-${dateMatch[2].padStart(2, '0')}-${dateMatch[3].padStart(2, '0')}`;
          }
        }
      }
      
      // 初度登録年月（YYYY-MM形式またはYYYYMM形式）
      const monthMatch = line.match(/(\d{4})[-\/]?(\d{2})/);
      if (monthMatch && !result.firstRegYm) {
        const year = parseInt(monthMatch[1]);
        const month = parseInt(monthMatch[2]);
        if (year >= 1900 && year <= 2100 && month >= 1 && month <= 12) {
          result.firstRegYm = `${monthMatch[1]}-${monthMatch[2].padStart(2, '0')}`;
        }
      }
      
      // 型式（英数字、通常3-10文字）
      if (/^[A-Z0-9]+$/.test(line) && line.length >= 2 && line.length <= 10 && !result.modelCode) {
        result.modelCode = line;
      }
      
      // 年式（4桁の数字）
      const yearMatch = line.match(/^(\d{4})$/);
      if (yearMatch) {
        const year = parseInt(yearMatch[1]);
        if (year >= 1900 && year <= new Date().getFullYear()) {
          if (!result.year) {
            result.year = year;
          }
        }
      }
      
      // 登録番号（ナンバープレート）のパターン
      // 例: "品川500 あ1234"、"横浜300 さ5678"、"軽自動車 品川50 あ1234"
      const regNumberMatch = line.match(/([^\s\d]+)\s*(\d+)\s*([あ-んア-ン一-龯])\s*(\d+)/);
      if (regNumberMatch && !result.registrationNumber) {
        result.registrationNumber = line.trim();
      }
      // より簡易なパターン（地名+数字+ひらがな/カタカナ+数字）
      if (!result.registrationNumber && /[あ-んア-ン一-龯]/.test(line) && /\d/.test(line) && line.length >= 6 && line.length <= 15) {
        // 地名が含まれている可能性がある
        const hasLocation = /(品川|横浜|世田谷|練馬|足立|江戸川|杉並|大田|板橋|北|荒川|文京|台東|墨田|江東|新宿|渋谷|中野|目黒|港|千代田|中央|豊島|葛飾|町田|八王子|府中|調布|西東京|小平|東村山|東大和|清瀬|東久留米|武蔵野|三鷹|小金井|国分寺|国立|狛江|稲城|多摩|日野|昭島|あきる野|福生|羽村|青梅|日の出|檜原|奥多摩)/.test(line);
        if (hasLocation) {
          result.registrationNumber = line.trim();
        }
      }
    }

    // パターン3: URLエンコードされた形式
    if (qrText.includes('%')) {
      try {
        const decoded = decodeURIComponent(qrText);
        const urlParams = new URLSearchParams(decoded);
        if (urlParams.has('chassisNumber')) result.chassisNumber = urlParams.get('chassisNumber') || undefined;
        if (urlParams.has('registrationNumber')) result.registrationNumber = urlParams.get('registrationNumber') || undefined;
        if (urlParams.has('inspectionExpiry')) result.inspectionExpiry = urlParams.get('inspectionExpiry') || undefined;
        if (urlParams.has('firstRegYm')) result.firstRegYm = urlParams.get('firstRegYm') || undefined;
        if (urlParams.has('modelCode')) result.modelCode = urlParams.get('modelCode') || undefined;
        if (urlParams.has('year')) {
          const year = parseInt(urlParams.get('year') || '0');
          if (year > 0) result.year = year;
        }
        if (urlParams.has('bodyType')) {
          const bodyType = urlParams.get('bodyType') || undefined;
          if (bodyType && ['sedan', 'hatchback', 'suv', 'wagon', 'coupe', 'convertible', 'pickup', 'minivan', 'sports', 'other'].includes(bodyType)) {
            result.bodyType = bodyType as ParsedQRData['bodyType'];
          }
        }
      } catch (e) {
        // URLデコード失敗時は無視
      }
    }

    // パターン4: テキストから直接抽出（キーワードベース）
    const keywords = {
      chassisNumber: ['車台番号', '車体番号', 'CHASSIS', 'chassis'],
      registrationNumber: ['登録番号', 'ナンバー', 'REGISTRATION', 'registration', '番号'],
      inspectionExpiry: ['車検期限', '有効期限', 'INSPECTION', 'inspection'],
      firstRegYm: ['初度登録', '初登録', 'FIRST_REG', 'first_reg'],
      modelCode: ['型式', 'MODEL', 'model'],
      year: ['年式', 'YEAR', 'year'],
      bodyType: ['車体形状', '形状', 'BODY_TYPE', 'bodyType', 'body_type']
    };
    
    // 車体形状のマッピング（日本語→英語）
    const bodyTypeMap: Record<string, ParsedQRData['bodyType']> = {
      'セダン': 'sedan',
      'セダン型': 'sedan',
      'ハッチバック': 'hatchback',
      'ハッチ': 'hatchback',
      'SUV': 'suv',
      'エスユーブイ': 'suv',
      'ワゴン': 'wagon',
      'ステーションワゴン': 'wagon',
      'クーペ': 'coupe',
      'コンバーチブル': 'convertible',
      'オープン': 'convertible',
      'ピックアップ': 'pickup',
      'トラック': 'pickup',
      'ミニバン': 'minivan',
      'スポーツ': 'sports',
      '軽自動車': 'other',
      '軽': 'other'
    };

    for (const [key, keyList] of Object.entries(keywords)) {
      for (const keyword of keyList) {
        const regex = new RegExp(`${keyword}[：:：]?\\s*([^\\n\\r,]+)`, 'i');
        const match = qrText.match(regex);
        if (match && match[1]) {
          const value = match[1].trim();
          if (key === 'chassisNumber' && !result.chassisNumber) {
            result.chassisNumber = value;
          } else if (key === 'inspectionExpiry' && !result.inspectionExpiry) {
            // 日付形式に変換
            const dateMatch = value.match(/(\d{4})[-\/]?(\d{2})[-\/]?(\d{2})/);
            if (dateMatch) {
              result.inspectionExpiry = `${dateMatch[1]}-${dateMatch[2].padStart(2, '0')}-${dateMatch[3].padStart(2, '0')}`;
            }
          } else if (key === 'firstRegYm' && !result.firstRegYm) {
            const monthMatch = value.match(/(\d{4})[-\/]?(\d{2})/);
            if (monthMatch) {
              result.firstRegYm = `${monthMatch[1]}-${monthMatch[2].padStart(2, '0')}`;
            }
          } else if (key === 'modelCode' && !result.modelCode) {
            result.modelCode = value;
          } else if (key === 'year' && !result.year) {
            const year = parseInt(value);
            if (year >= 1900 && year <= new Date().getFullYear()) {
              result.year = year;
            }
          } else if (key === 'registrationNumber' && !result.registrationNumber) {
            result.registrationNumber = value;
          } else if (key === 'bodyType' && !result.bodyType) {
            // 日本語の車体形状を英語に変換
            const normalizedValue = value.trim();
            if (bodyTypeMap[normalizedValue]) {
              result.bodyType = bodyTypeMap[normalizedValue];
            } else if (['sedan', 'hatchback', 'suv', 'wagon', 'coupe', 'convertible', 'pickup', 'minivan', 'sports', 'other'].includes(normalizedValue.toLowerCase())) {
              result.bodyType = normalizedValue.toLowerCase() as ParsedQRData['bodyType'];
            }
          }
        }
      }
    }
    
    // パターン5: 車体形状をテキストから直接検索
    if (!result.bodyType) {
      for (const [japanese, english] of Object.entries(bodyTypeMap)) {
        if (qrText.includes(japanese)) {
          result.bodyType = english;
          break;
        }
      }
    }

    return result;
  } catch (error) {
    console.error('QRコードパースエラー:', error);
    return result;
  }
}

export default function QRCodeScannerModal({ onClose, onScanSuccess }: QRCodeScannerModalProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cameraId, setCameraId] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scannerElementId = 'qr-reader';

  // カメラの初期化
  useEffect(() => {
    if (!isScanning) return;

    const initScanner = async () => {
      try {
        // 利用可能なカメラを取得
        const devices = await Html5Qrcode.getCameras();
        if (devices.length === 0) {
          setError('カメラが見つかりませんでした。デバイスにカメラが接続されているか確認してください。');
          setIsScanning(false);
          return;
        }

        // バックカメラを優先的に選択
        const backCamera = devices.find(device => 
          device.label.toLowerCase().includes('back') || 
          device.label.toLowerCase().includes('rear') ||
          device.label.toLowerCase().includes('環境')
        );
        const selectedCamera = backCamera?.id || devices[0].id;
        setCameraId(selectedCamera);

        // スキャナーを初期化
        const scanner = new Html5Qrcode(scannerElementId);
        scannerRef.current = scanner;

        // スキャンを開始
        await scanner.start(
          selectedCamera,
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1.0,
          },
          (decodedText) => {
            // QRコードが読み取れた
            console.log('QRコード読み取り成功:', decodedText);
            
            // データをパース
            const parsedData = parseInspectionQRCode(decodedText);
            
            // スキャンを停止
            scanner.stop().then(() => {
              setIsScanning(false);
              onScanSuccess(parsedData);
            }).catch((err) => {
              console.error('スキャン停止エラー:', err);
              setIsScanning(false);
              onScanSuccess(parsedData);
            });
          },
          (errorMessage) => {
            // エラーは無視（継続的にスキャンするため）
          }
        );
      } catch (err: any) {
        console.error('カメラ初期化エラー:', err);
        setError(`カメラの初期化に失敗しました: ${err.message}`);
        setIsScanning(false);
      }
    };

    initScanner();

    // クリーンアップ
    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {
          // エラーは無視
        });
        scannerRef.current.clear();
        scannerRef.current = null;
      }
    };
  }, [isScanning, scannerElementId, onScanSuccess]);

  const handleStartScan = () => {
    setError(null);
    setIsScanning(true);
  };

  const handleStopScan = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
      } catch (err) {
        console.error('スキャン停止エラー:', err);
      }
      scannerRef.current.clear();
      scannerRef.current = null;
    }
    setIsScanning(false);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setError(null);
      const scanner = new Html5Qrcode(scannerElementId);
      
      // ファイルからQRコードを読み取る
      const decodedText = await scanner.scanFile(file, true);
      console.log('QRコード読み取り成功:', decodedText);
      
      // データをパース
      const parsedData = parseInspectionQRCode(decodedText);
      
      scanner.clear();
      onScanSuccess(parsedData);
    } catch (err: any) {
      console.error('QRコード読み取りエラー:', err);
      setError('QRコードの読み取りに失敗しました。画像にQRコードが含まれているか確認してください。');
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ヘッダー */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <span>📱</span>
                <span>車検証QRコード読み取り</span>
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                車検証のQRコードをスキャンして車両情報を自動入力
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* コンテンツ */}
        <div className="p-6 space-y-6">
          {/* 説明 */}
          <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
            <div className="flex items-start gap-3">
              <span className="flex-shrink-0 text-2xl">💡</span>
              <div className="text-sm text-gray-700 space-y-2">
                <p className="font-medium text-gray-900">車検証QRコードとは？</p>
                <p>
                  車検証に記載されているQRコードをスキャンすることで、以下の情報を自動的に入力できます。
                </p>
                <ul className="list-disc list-inside space-y-1 text-gray-600">
                  <li>車台番号（車体番号）</li>
                  <li>車検期限</li>
                  <li>初度登録年月</li>
                  <li>型式</li>
                  <li>年式</li>
                </ul>
              </div>
            </div>
          </div>

          {/* エラー表示 */}
          {error && (
            <div className="p-4 bg-red-50 rounded-xl border border-red-200">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* スキャンエリア */}
          <div className="space-y-4">
            {!isScanning ? (
              <div className="space-y-4">
                {/* カメラスキャンボタン */}
                <button
                  onClick={handleStartScan}
                  className="w-full px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors shadow-md flex items-center justify-center gap-2"
                >
                  <span>📷</span>
                  <span>カメラでスキャン</span>
                </button>

                {/* または */}
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-300"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-white text-gray-500">または</span>
                  </div>
                </div>

                {/* ファイルアップロード */}
                <label className="block">
                  <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center cursor-pointer hover:border-indigo-400 hover:bg-indigo-50 transition-all">
                    <div className="space-y-3">
                      <div className="text-4xl">📄</div>
                      <div>
                        <p className="text-gray-700 font-medium">画像から読み取る</p>
                        <p className="text-sm text-gray-500 mt-1">
                          車検証のQRコードが写った画像を選択
                        </p>
                      </div>
                      <p className="text-xs text-gray-400">
                        対応形式: JPG, PNG
                      </p>
                    </div>
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              </div>
            ) : (
              <div className="space-y-4">
                {/* スキャン中 */}
                <div id={scannerElementId} className="w-full rounded-xl overflow-hidden border-2 border-indigo-300"></div>
                <button
                  onClick={handleStopScan}
                  className="w-full px-4 py-3 bg-gray-600 hover:bg-gray-700 text-white font-medium rounded-lg transition-colors"
                >
                  スキャンを停止
                </button>
              </div>
            )}
          </div>

          {/* 使い方のヒント */}
          <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
            <div className="flex items-start gap-3">
              <span className="flex-shrink-0 text-xl">📋</span>
              <div className="text-sm text-gray-600 space-y-2">
                <p className="font-medium text-gray-900">スキャンのコツ</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>QRコードが画面の中央に来るように調整</li>
                  <li>明るい場所で、影が入らないように</li>
                  <li>QRコードがぼやけないようにピントを合わせる</li>
                  <li>カメラをQRコードから適度な距離に保つ（20-30cm程度）</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* フッター */}
        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 rounded-b-2xl">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-white border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
}

