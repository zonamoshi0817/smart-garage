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
 * 分割QRコードの結合処理
 * 普通車のA4車検証では、1つの情報を複数のQRに分割した「分割（連結）QR」が使用される
 * 先頭に「これは分割QRだよ」「何分割中の何番目だよ」というヘッダが入っている
 */
function parseSplitQRHeader(qrText: string): { isSplit: boolean; totalParts: number; partNumber: number; content: string } | null {
  // 分割QRのヘッダパターンを検出
  // 例: "01/03/..." や "1/3/..." などの形式
  const splitMatch = qrText.match(/^(\d+)\/(\d+)\/(.+)$/);
  if (splitMatch) {
    const partNumber = parseInt(splitMatch[1]);
    const totalParts = parseInt(splitMatch[2]);
    const content = splitMatch[3];
    if (partNumber > 0 && totalParts > 0 && partNumber <= totalParts) {
      return {
        isSplit: true,
        totalParts,
        partNumber,
        content
      };
    }
  }
  return null;
}

/**
 * 車検証QRコードのデータをパース
 * 日本の車検証QRコードは複数のフォーマットがあるため、複数のパターンに対応
 * 国交省の仕様に基づく固定長＋区切り文字 `/` の形式に対応
 */
function parseInspectionQRCode(qrText: string): ParsedQRData {
  const result: ParsedQRData = {};

  try {
    // パターン0: 国交省仕様の固定長＋区切り文字 `/` 形式（二次元コード2/3）
    // 例: "帳票種別/自動車登録番号/車両番号/車台番号/原動機型式/..."
    if (qrText.includes('/') && qrText.split('/').length >= 3) {
      const fields = qrText.split('/');
      
      // 国交省の仕様PDFに基づくフィールドマッピング（簡易版）
      // 実際の仕様PDFを参照して正確な位置を確認する必要があります
      if (fields.length >= 2 && fields[1]) {
        // 自動車登録番号（ナンバー）
        result.registrationNumber = fields[1].trim();
      }
      if (fields.length >= 4 && fields[3]) {
        // 車台番号（VIN）
        result.chassisNumber = fields[3].trim();
      }
      if (fields.length >= 5 && fields[4]) {
        // 原動機型式
        // 型式として扱う（実際の仕様に合わせて調整が必要）
        if (!result.modelCode) {
          result.modelCode = fields[4].trim();
        }
      }
      
      // 日付フィールドの検出（YYYYMMDD形式）
      for (const field of fields) {
        const trimmed = field.trim();
        // 車検期限（8桁の数字、YYYYMMDD形式）
        if (/^\d{8}$/.test(trimmed)) {
          const year = parseInt(trimmed.substring(0, 4));
          const month = parseInt(trimmed.substring(4, 6));
          const day = parseInt(trimmed.substring(6, 8));
          if (year >= 2000 && year <= 2100 && month >= 1 && month <= 12 && day >= 1 && day <= 31) {
            if (!result.inspectionExpiry) {
              result.inspectionExpiry = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            }
          }
        }
        // 初度登録年月（6桁の数字、YYYYMM形式）
        if (/^\d{6}$/.test(trimmed) && trimmed.length === 6) {
          const year = parseInt(trimmed.substring(0, 4));
          const month = parseInt(trimmed.substring(4, 6));
          if (year >= 1900 && year <= 2100 && month >= 1 && month <= 12) {
            if (!result.firstRegYm) {
              result.firstRegYm = `${year}-${String(month).padStart(2, '0')}`;
            }
            // 年式としても使用
            if (!result.year) {
              result.year = year;
            }
          }
        }
      }
      
      // 区切り文字形式でデータが取得できた場合は、ここで返す
      if (result.chassisNumber || result.registrationNumber || result.inspectionExpiry) {
        return result;
      }
    }

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

  // モーダルが開いたことをログに記録し、自動的にカメラを起動
  useEffect(() => {
    console.log('[QRScanner] Modal opened');
    // モーダルが開いたら自動的にカメラを起動
    setIsScanning(true);
  }, []);

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

  const handleStartScan = async () => {
    console.log('[QRScanner] Start scan button clicked');
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

  /**
   * 画像から複数のQRコードを検出して結合
   * 車検証にはQRコードが横並びに複数あるため、画像を複数領域に分割してスキャン
   * 普通車: 8個、軽自動車: 3個のQRコードが横並びに配置されている
   */
  const scanMultipleQRCodes = async (file: File): Promise<string[]> => {
    const results: string[] = [];
    const seenTexts = new Set<string>(); // 重複チェック用
    let scanner: Html5Qrcode | null = null;
    
    try {
      // 一時的なスキャナーインスタンスを作成
      // scanFileメソッドはDOM要素を必要としないため、存在しないIDでも問題なし
      scanner = new Html5Qrcode('temp-qr-scanner-' + Date.now());
      
      // まず全体をスキャン（1つのQRコードが見つかる可能性がある）
      try {
        const decodedText = await scanner.scanFile(file, true);
        if (decodedText && !seenTexts.has(decodedText)) {
          results.push(decodedText);
          seenTexts.add(decodedText);
          console.log('QRコード（全体）読み取り成功:', decodedText);
        }
      } catch (e) {
        console.log('全体スキャン失敗、領域分割スキャンを試行');
      }
      
      // 画像を読み込んで領域を分割
      const img = new Image();
      const imageUrl = URL.createObjectURL(file);
      
      try {
        await new Promise<void>((resolve, reject) => {
          img.onload = () => resolve();
          img.onerror = (err) => {
            URL.revokeObjectURL(imageUrl);
            reject(new Error('画像の読み込みに失敗しました'));
          };
          img.src = imageUrl;
        });
      } catch (imgErr) {
        URL.revokeObjectURL(imageUrl);
        if (scanner) scanner.clear();
        throw new Error('画像ファイルの読み込みに失敗しました。有効な画像ファイルを選択してください。');
      }
      
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        URL.revokeObjectURL(imageUrl);
        if (scanner) scanner.clear();
        return results;
      }
      
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
      
      // 車検証のQRコードは横並びに配置されているため、縦方向は全体、横方向を細かく分割
      // 各QRコードの幅を推定（画像幅を8-10分割程度）
      const estimatedQRWidth = Math.floor(img.width / 10); // QRコード1つの推定幅
      const stepSize = Math.floor(estimatedQRWidth * 0.7); // 重複を考慮したステップサイズ
      const regions: Array<{ x: number; y: number; width: number; height: number }> = [];
      
      // 横方向にスライディングウィンドウでスキャン
      for (let x = 0; x < img.width - estimatedQRWidth; x += stepSize) {
        regions.push({
          x: x,
          y: 0,
          width: estimatedQRWidth,
          height: img.height,
        });
      }
      
      // 最後の領域も確実に含める
      if (regions.length > 0) {
        const lastRegion = regions[regions.length - 1];
        if (lastRegion.x + lastRegion.width < img.width) {
          regions.push({
            x: img.width - estimatedQRWidth,
            y: 0,
            width: estimatedQRWidth,
            height: img.height,
          });
        }
      }
      
      console.log(`スキャン領域数: ${regions.length}`);
      
      // 各領域をスキャン（順次実行）
      for (let i = 0; i < regions.length; i++) {
        const region = regions[i];
        const regionCanvas = document.createElement('canvas');
        const regionCtx = regionCanvas.getContext('2d');
        if (!regionCtx) continue;
        
        regionCanvas.width = region.width;
        regionCanvas.height = region.height;
        regionCtx.drawImage(
          canvas,
          region.x, region.y, region.width, region.height,
          0, 0, region.width, region.height
        );
        
        try {
          // CanvasをBlobに変換（Promise化）
          const blob = await new Promise<Blob | null>((resolve) => {
            regionCanvas.toBlob(resolve, 'image/png');
          });
          
          if (!blob) continue;
          
          const regionFile = new File([blob], `region-${i}.png`, { type: 'image/png' });
          if (scanner) {
            const decodedText = await scanner.scanFile(regionFile, true);
            if (decodedText && !seenTexts.has(decodedText)) {
              results.push(decodedText);
              seenTexts.add(decodedText);
              console.log(`QRコード${results.length}読み取り成功（領域${i + 1}）:`, decodedText.substring(0, 50) + '...');
            }
          }
        } catch (e: any) {
          // この領域にはQRコードがない可能性（エラーは無視）
          const errorMsg = e?.message || String(e);
          if (!errorMsg.includes('No QR code found') && !errorMsg.includes('NotFoundException')) {
            // QRコードが見つからない以外のエラーのみログに記録
            console.log(`領域${i + 1}のスキャン失敗:`, errorMsg);
          }
        }
      }
      
      URL.revokeObjectURL(imageUrl);
      if (scanner) {
        scanner.clear();
      }
      
      console.log(`合計${results.length}個のQRコードを検出`);
      return results;
    } catch (err: any) {
      console.error('複数QRコードスキャンエラー:', err);
      const errorMessage = err?.message || String(err);
      console.error('エラー詳細:', errorMessage);
      
      if (scanner) {
        try {
          scanner.clear();
        } catch (clearErr) {
          console.error('スキャナークリアエラー:', clearErr);
        }
      }
      
      // エラーを再スローして、呼び出し元で処理できるようにする
      throw new Error(`QRコードスキャン中にエラーが発生しました: ${errorMessage}`);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setError(null);
      
      // ファイルサイズチェック（10MB制限）
      if (file.size > 10 * 1024 * 1024) {
        setError('画像ファイルが大きすぎます。10MB以下のファイルを選択してください。');
        return;
      }
      
      // 複数のQRコードをスキャン
      const decodedTexts = await scanMultipleQRCodes(file);
      
      if (decodedTexts.length === 0) {
        setError('QRコードが見つかりませんでした。画像にQRコードが含まれているか確認してください。');
        return;
      }
      
      console.log('検出されたQRコード数:', decodedTexts.length);
      
      // 分割QRコードの処理
      const splitQRParts: Array<{ partNumber: number; totalParts: number; content: string }> = [];
      const normalQRTexts: string[] = [];
      
      for (const text of decodedTexts) {
        const splitInfo = parseSplitQRHeader(text);
        if (splitInfo && splitInfo.isSplit) {
          splitQRParts.push({
            partNumber: splitInfo.partNumber,
            totalParts: splitInfo.totalParts,
            content: splitInfo.content
          });
        } else {
          normalQRTexts.push(text);
        }
      }
      
      // 分割QRコードを結合
      let combinedSplitQR = '';
      if (splitQRParts.length > 0) {
        // パート番号でソート
        splitQRParts.sort((a, b) => a.partNumber - b.partNumber);
        
        // すべてのパートが揃っているか確認
        const totalParts = splitQRParts[0].totalParts;
        const hasAllParts = splitQRParts.length === totalParts && 
                           splitQRParts.every((part, index) => part.partNumber === index + 1);
        
        if (hasAllParts) {
          // すべてのパートを結合
          combinedSplitQR = splitQRParts.map(part => part.content).join('');
          console.log('分割QRコードを結合:', combinedSplitQR.substring(0, 100) + '...');
        } else {
          console.warn(`分割QRコードのパートが不完全です。検出: ${splitQRParts.length}/${totalParts}`);
        }
      }
      
      // すべてのQRコードのテキストを結合してパース
      const allTexts = combinedSplitQR ? [combinedSplitQR, ...normalQRTexts] : normalQRTexts;
      const combinedText = allTexts.join('\n');
      console.log('結合されたQRコードテキスト:', combinedText.substring(0, 200) + '...');
      
      // データをパース（結合された分割QRを優先）
      const parsedData = combinedSplitQR 
        ? parseInspectionQRCode(combinedSplitQR)
        : parseInspectionQRCode(combinedText);
      
      // 各QRコードのデータも個別にパースしてマージ
      for (const text of allTexts) {
        const individualData = parseInspectionQRCode(text);
        // データをマージ（既存の値がない場合のみ上書き）
        if (individualData.chassisNumber && !parsedData.chassisNumber) {
          parsedData.chassisNumber = individualData.chassisNumber;
        }
        if (individualData.registrationNumber && !parsedData.registrationNumber) {
          parsedData.registrationNumber = individualData.registrationNumber;
        }
        if (individualData.inspectionExpiry && !parsedData.inspectionExpiry) {
          parsedData.inspectionExpiry = individualData.inspectionExpiry;
        }
        if (individualData.firstRegYm && !parsedData.firstRegYm) {
          parsedData.firstRegYm = individualData.firstRegYm;
        }
        if (individualData.modelCode && !parsedData.modelCode) {
          parsedData.modelCode = individualData.modelCode;
        }
        if (individualData.year && !parsedData.year) {
          parsedData.year = individualData.year;
        }
        if (individualData.bodyType && !parsedData.bodyType) {
          parsedData.bodyType = individualData.bodyType;
        }
      }
      
      console.log('パース結果:', parsedData);
      onScanSuccess(parsedData);
    } catch (err: any) {
      console.error('QRコード読み取りエラー:', err);
      const errorMessage = err?.message || '不明なエラー';
      setError(`QRコードの読み取りに失敗しました: ${errorMessage}。画像にQRコードが含まれているか確認してください。`);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-50 p-2 sm:p-4"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-xl sm:rounded-2xl shadow-2xl max-w-2xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ヘッダー */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-4 sm:px-6 py-3 sm:py-4 rounded-t-xl sm:rounded-t-2xl">
          <div className="flex items-start sm:items-center justify-between gap-2">
            <div className="flex-1 min-w-0">
              <h2 className="text-lg sm:text-xl font-bold text-gray-900 flex items-center gap-2">
                <span className="flex-shrink-0">📱</span>
                <span className="break-words">車検証QRコード読み取り</span>
              </h2>
              <p className="text-xs sm:text-sm text-gray-500 mt-1">
                車検証のQRコードをスキャンして車両情報を自動入力
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0"
            >
              <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* コンテンツ */}
        <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
          {/* 説明 */}
          <div className="p-3 sm:p-4 bg-blue-50 rounded-lg sm:rounded-xl border border-blue-200">
            <div className="flex items-start gap-2 sm:gap-3">
              <span className="flex-shrink-0 text-xl sm:text-2xl">💡</span>
              <div className="text-xs sm:text-sm text-gray-700 space-y-1 sm:space-y-2">
                <p className="font-medium text-gray-900">車検証QRコードとは？</p>
                <p>
                  車検証に記載されているQRコード（複数可）をスキャンすることで、以下の情報を自動的に入力できます。
                </p>
                <ul className="list-disc list-inside space-y-1 text-gray-600">
                  <li>車台番号（車体番号）</li>
                  <li>車検期限</li>
                  <li>初度登録年月</li>
                  <li>型式</li>
                  <li>年式</li>
                </ul>
                <p className="text-xs text-blue-600 font-medium mt-2">
                  💡 車検証にQRコードが横並びに複数ある場合も自動的に検出します
                </p>
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
                  <div className="border-2 border-dashed border-gray-300 rounded-lg sm:rounded-xl p-6 sm:p-8 text-center cursor-pointer hover:border-indigo-400 hover:bg-indigo-50 transition-all">
                    <div className="space-y-2 sm:space-y-3">
                      <div className="text-3xl sm:text-4xl">📄</div>
                      <div>
                        <p className="text-sm sm:text-base text-gray-700 font-medium">画像から読み取る</p>
                        <p className="text-xs sm:text-sm text-gray-500 mt-1">
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
          <div className="p-3 sm:p-4 bg-gray-50 rounded-lg sm:rounded-xl border border-gray-200">
            <div className="flex items-start gap-2 sm:gap-3">
              <span className="flex-shrink-0 text-lg sm:text-xl">📋</span>
              <div className="text-xs sm:text-sm text-gray-600 space-y-1 sm:space-y-2">
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
        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-4 sm:px-6 py-3 sm:py-4 rounded-b-xl sm:rounded-b-2xl">
          <button
            onClick={onClose}
            className="w-full px-4 py-2.5 sm:py-2 bg-white border border-gray-300 text-sm sm:text-base text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
}

