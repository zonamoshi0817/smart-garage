"use client";

import { useState } from 'react';
import { addInsurancePolicy } from '@/lib/insurance';
import Tesseract from 'tesseract.js';
import { logOcrUsed, logOcrStarted, logOcrAutofillDone } from '@/lib/analytics';
import { enhanceInsuranceDocument } from '@/lib/imageEnhancer';
import { usePremiumGuard } from '@/hooks/usePremium';
import PaywallModal from './PaywallModal';

interface InsuranceModalProps {
  carId: string;
  carName: string;
  onClose: () => void;
  onAdded: () => void;
}

export default function InsuranceModal({
  carId,
  carName,
  onClose,
  onAdded
}: InsuranceModalProps) {
  const { checkFeature, showPaywall, closePaywall, paywallFeature, paywallVariant } = usePremiumGuard();
  const [provider, setProvider] = useState('');
  const [policyNumber, setPolicyNumber] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [paymentCycle, setPaymentCycle] = useState<'annual' | 'monthly' | 'installment'>('annual');
  const [premiumAmount, setPremiumAmount] = useState('');
  const [bodilyInjuryLimit, setBodilyInjuryLimit] = useState('');
  const [propertyDamageLimit, setPropertyDamageLimit] = useState('');
  const [personalInjuryLimit, setPersonalInjuryLimit] = useState('');
  const [vehicleType, setVehicleType] = useState<'AG' | 'AC' | 'NONE'>('NONE');
  const [deductible, setDeductible] = useState('');
  const [riders, setRiders] = useState('');
  const [ageLimit, setAgeLimit] = useState('');
  const [familyOnly, setFamilyOnly] = useState(false);
  const [purpose, setPurpose] = useState<'private' | 'business'>('private');
  const [annualMileageKm, setAnnualMileageKm] = useState('');
  const [notes, setNotes] = useState('');
  const [isOcrProcessing, setIsOcrProcessing] = useState(false);
  const [ocrResult, setOcrResult] = useState<string | null>(null);

  // OCR処理: 保険証券スキャン（画像のみ）
  const handlePolicyScan = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsOcrProcessing(true);
    setOcrResult(null);

    try {
      console.log('[Insurance OCR] Starting image enhancement...');
      
      // 保険証券特化の画像強化処理
      const enhancedBlob = await enhanceInsuranceDocument(file);
      console.log('[Insurance OCR] Image enhanced (3x upscale + sharpen + contrast), starting OCR...');
      
      // Tesseract.js の詳細設定で精度を向上
      // 日本語を優先
      const result = await Tesseract.recognize(enhancedBlob, 'jpn', {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            console.log(`[Insurance OCR] Progress: ${Math.round(m.progress * 100)}%`);
          }
        },
      });

      const text = result.data.text;
      console.log('[Insurance OCR] Extracted text:', text);
      setOcrResult(text);

      // テキストから情報を抽出
      const parsed = parsePolicyText(text);
      
      if (parsed.provider) setProvider(parsed.provider);
      if (parsed.policyNumber) setPolicyNumber(parsed.policyNumber);
      if (parsed.startDate) setStartDate(parsed.startDate);
      if (parsed.endDate) setEndDate(parsed.endDate);
      if (parsed.premiumAmount) setPremiumAmount(parsed.premiumAmount.toString());
      if (parsed.paymentCycle) setPaymentCycle(parsed.paymentCycle);

      // 追加情報をメモ欄に自動入力
      const memoLines: string[] = [];
      if (parsed.productName) memoLines.push(`商品: ${parsed.productName}`);
      if (parsed.insuredName) memoLines.push(`契約者: ${parsed.insuredName}`);
      if (parsed.vehicleRegistration) memoLines.push(`ナンバー: ${parsed.vehicleRegistration}`);
      if (parsed.vehicleChassisNumber) memoLines.push(`車台番号: ${parsed.vehicleChassisNumber}`);
      if (parsed.noClaimGrade) memoLines.push(`等級: ${parsed.noClaimGrade}等級`);
      if (parsed.firstPayment) memoLines.push(`初回保険料: ¥${parsed.firstPayment.toLocaleString()}`);
      if (parsed.subsequentPayment) memoLines.push(`2回目以降: ¥${parsed.subsequentPayment.toLocaleString()}`);
      if (parsed.installmentCount) memoLines.push(`分割: ${parsed.installmentCount}回払`);
      if (parsed.discounts && parsed.discounts.length > 0) {
        memoLines.push(`割引: ${parsed.discounts.join('、')}`);
      }
      
      if (memoLines.length > 0) {
        setNotes(memoLines.join('\n'));
      }

      logOcrUsed('insurance', true);
      
      const readInfo = [
        parsed.provider && `✓ 保険会社`,
        parsed.policyNumber && `✓ 証券番号`,
        parsed.startDate && parsed.endDate && `✓ 契約期間`,
        parsed.premiumAmount && `✓ 保険料`,
      ].filter(Boolean).join('、');
      
      alert(`保険証券を読み取りました\n${readInfo}\n\n内容を確認して必要に応じて修正してください。`);
    } catch (error) {
      console.error('[Insurance OCR] Error:', error);
      logOcrUsed('insurance', false);
      alert('読み取りに失敗しました。手動で入力してください。');
    } finally {
      setIsOcrProcessing(false);
    }
  };

  // 保険証券テキストの解析
  const parsePolicyText = (text: string): {
    provider?: string;
    policyNumber?: string;
    productName?: string;
    startDate?: string;
    endDate?: string;
    contractDate?: string;
    premiumAmount?: number;
    firstPayment?: number;
    subsequentPayment?: number;
    installmentCount?: number;
    paymentCycle?: 'annual' | 'monthly' | 'installment';
    insuredName?: string;
    vehicleRegistration?: string;
    vehicleChassisNumber?: string;
    noClaimGrade?: number;
    discounts?: string[];
  } => {
    const result: any = {};

    // 保険会社名の抽出（より柔軟なパターン）
    const providerPatterns = [
      { pattern: /東京海上(?:日動)?(?:火災)?(?:保険)?/i, name: '東京海上日動火災保険' },
      { pattern: /損保ジャパン(?:日本興亜)?/i, name: '損保ジャパン' },
      { pattern: /三井住友海上(?:火災)?(?:保険)?/i, name: '三井住友海上' },
      { pattern: /あいおい(?:ニッセイ)?同和損保/i, name: 'あいおいニッセイ同和損保' },
      { pattern: /AIG損(?:害)?保(?:険)?/i, name: 'AIG損保' },
      { pattern: /チューリッヒ(?:保険)?/i, name: 'チューリッヒ保険' },
      { pattern: /ソニー損(?:害)?保(?:険)?/i, name: 'ソニー損保' },
      { pattern: /アクサ(?:ダイレクト)?/i, name: 'アクサダイレクト' },
      { pattern: /イーデザイン損(?:害)?保(?:険)?/i, name: 'イーデザイン損保' },
      { pattern: /SBI損(?:害)?保(?:険)?/i, name: 'SBI損保' },
      { pattern: /セゾン(?:自動車)?(?:火災)?/i, name: 'セゾン自動車火災保険' },
      { pattern: /楽天損(?:害)?保(?:険)?/i, name: '楽天損保' },
    ];

    for (const { pattern, name } of providerPatterns) {
      const match = text.match(pattern);
      if (match) {
        result.provider = name;
        break;
      }
    }

    // 証券番号の抽出（OCR誤認識に対応）
    const policyNumberPatterns = [
      /[""]([A-Z0-9]{8,})[""]/i,  // クォーテーション内
      /証券\s*番号\s*[""]?([A-Z0-9]{6,})[""]?/i,
      /0G\d{6}/i,  // ソニー損保形式
      /[A-Z]{1,3}\d{6,}/i,  // 一般的な形式
    ];

    for (const pattern of policyNumberPatterns) {
      const match = text.match(pattern);
      if (match) {
        const num = match[1] || match[0];
        result.policyNumber = num.trim().replace(/["\s]/g, '');
        break;
      }
    }

    // 日付の抽出（契約開始日・満期日）
    const datePattern = /(\d{4})[年\/\-](\d{1,2})[月\/\-](\d{1,2})日?/g;
    const dates: string[] = [];
    let dateMatch;
    
    while ((dateMatch = datePattern.exec(text)) !== null) {
      const year = dateMatch[1];
      const month = dateMatch[2].padStart(2, '0');
      const day = dateMatch[3].padStart(2, '0');
      dates.push(`${year}-${month}-${day}`);
    }

    if (dates.length >= 2) {
      // 最初の日付を開始日、2番目を終了日とする
      result.startDate = dates[0];
      result.endDate = dates[1];
    } else if (dates.length === 1) {
      // 1つしかない場合は終了日（満期日）とする
      result.endDate = dates[0];
    }

    // 保険料の抽出（OCR誤認識対応、ピリオドをカンマとして扱う）
    const premiumPatterns = [
      { pattern: /合計[:\s　]*([0-9,.]+)\s*円/i, cycle: null },
      { pattern: /年間.*?([0-9,.]{5,})\s*円/i, cycle: 'annual' as const },
      { pattern: /月額.*?([0-9,.]+)\s*円/i, cycle: 'monthly' as const },
      { pattern: /初回[:\s　]*([0-9,.]+)\s*円/i, cycle: null },
      { pattern: /48[.,]\d{3}\s*円/i, cycle: null }, // 具体的な金額パターン
    ];

    for (const { pattern, cycle } of premiumPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        // ピリオドもカンマも削除して数値化
        const amount = parseInt(match[1].replace(/[,.\s]/g, ''));
        if (!isNaN(amount) && amount > 1000 && amount < 1000000) {
          result.premiumAmount = amount;
          
          if (cycle) {
            result.paymentCycle = cycle;
          }
          break;
        }
      }
    }

    // 商品名の抽出
    const productMatch = text.match(/(?:総合)?自動車保険(?:TypeS|Type[A-Z])?/i);
    if (productMatch) {
      result.productName = productMatch[0];
    }

    // 契約者氏名の抽出
    const nameMatch = text.match(/氏名[:\s　]*(.+?)(?:\s|$|住所)/);
    if (nameMatch && nameMatch[1]) {
      result.insuredName = nameMatch[1].trim();
    }

    // 登録番号（ナンバー）の抽出
    const registrationMatch = text.match(/登録番号[:\s　]*(?:★\s*)?(.+?)\s*(?:\d{3})\s*(\d{3,4})/);
    if (registrationMatch) {
      result.vehicleRegistration = `${registrationMatch[1]} ${registrationMatch[2]}`.trim();
    }

    // 車台番号の抽出
    const chassisMatch = text.match(/車台番号[:\s　]*([A-Z0-9\-]+)/i);
    if (chassisMatch && chassisMatch[1]) {
      result.vehicleChassisNumber = chassisMatch[1].trim();
    }

    // ノンフリート等級の抽出
    const gradeMatch = text.match(/(?:ノンフリート)?等級[:\s　]*(\d+)等級/i);
    if (gradeMatch && gradeMatch[1]) {
      result.noClaimGrade = parseInt(gradeMatch[1]);
    }

    // 分割払い情報の抽出
    const firstPaymentMatch = text.match(/初回[:\s　]*([0-9,]+)円/i);
    if (firstPaymentMatch && firstPaymentMatch[1]) {
      result.firstPayment = parseInt(firstPaymentMatch[1].replace(/,/g, ''));
    }

    const subsequentMatch = text.match(/(?:2|２)回目以降[:\s　]*([0-9,]+)円/i);
    if (subsequentMatch && subsequentMatch[1]) {
      result.subsequentPayment = parseInt(subsequentMatch[1].replace(/,/g, ''));
    }

    const installmentMatch = text.match(/(\d+)回払/);
    if (installmentMatch && installmentMatch[1]) {
      result.installmentCount = parseInt(installmentMatch[1]);
      result.paymentCycle = 'installment';
    }

    // 割引情報の抽出
    const discountPatterns = [
      /インターネット割引/,
      /無事故割引/,
      /証券ペーパーレス割引/,
      /運転者本人・配偶者限定割引/,
      /継続割引/,
      /新車割引/,
      /ASV割引/,
      /エコカー割引/,
    ];

    const foundDiscounts: string[] = [];
    for (const pattern of discountPatterns) {
      const match = text.match(pattern);
      if (match) {
        foundDiscounts.push(match[0]);
      }
    }
    
    if (foundDiscounts.length > 0) {
      result.discounts = foundDiscounts;
    }

    console.log('[Insurance OCR] Parsed data:', result);
    return result;
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!provider || !policyNumber || !startDate || !endDate || !premiumAmount) {
      alert('必須項目を入力してください。');
      return;
    }

    try {
      const policyData = {
        provider,
        policyNumber,
        carId,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        paymentCycle,
        premiumAmount: parseInt(premiumAmount),
        coverages: {
          bodilyInjury: { limit: bodilyInjuryLimit },
          propertyDamage: { limit: propertyDamageLimit },
          personalInjury: { limit: personalInjuryLimit },
          vehicle: { type: vehicleType, deductible },
          riders: riders.split(',').map(r => r.trim()).filter(r => r)
        },
        drivers: {
          ageLimit,
          familyOnly
        },
        usage: {
          purpose,
          annualMileageKm: parseInt(annualMileageKm) || 0
        },
        notes
      };

      await addInsurancePolicy(policyData);
      onAdded();
    } catch (error) {
      console.error('Error adding insurance policy:', error);
      alert('保険契約の追加に失敗しました。');
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">保険契約を追加 - {carName}</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl"
            >
              ×
            </button>
          </div>

        {/* OCR スキャンセクション */}
        <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <h3 className="text-sm font-semibold text-blue-900 mb-2">📄 保険証券スキャン 🔒</h3>
          <p className="text-xs text-blue-700 mb-2">
            保険証券の写真をアップロードすると、自動的に情報を読み取ります（プレミアム機能）
          </p>
          <div className="text-xs text-gray-700 mb-3 space-y-1">
            <div>✓ 明るい場所で真上から撮影</div>
            <div>✓ ピントを合わせて鮮明に</div>
            <div>✓ 文字が読めるサイズで撮影</div>
            <div>⚠️ 精度が低い場合は手動入力をお勧めします</div>
          </div>
          
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                console.log('[Insurance] OCR camera button clicked');
                // プレミアム機能チェック
                if (!checkFeature('ocr_scan', undefined, 'minimal')) {
                  console.log('[Insurance] Premium required, showing paywall');
                  return;
                }
                // チェック通過後、ファイル選択をトリガー
                console.log('[Insurance] Premium user, opening camera picker');
                document.getElementById('insurance-camera-input')?.click();
              }}
              disabled={isOcrProcessing}
              className={`flex-1 px-4 py-2 bg-white border border-blue-300 rounded-lg text-center text-sm font-medium text-blue-700 hover:bg-blue-50 transition ${isOcrProcessing ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              📷 カメラで撮影
            </button>
            <input
              id="insurance-camera-input"
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handlePolicyScan}
              disabled={isOcrProcessing}
              className="hidden"
            />
            
            <button
              type="button"
              onClick={() => {
                console.log('[Insurance] OCR file button clicked');
                // プレミアム機能チェック
                if (!checkFeature('ocr_scan', undefined, 'minimal')) {
                  console.log('[Insurance] Premium required, showing paywall');
                  return;
                }
                // チェック通過後、ファイル選択をトリガー
                console.log('[Insurance] Premium user, opening file picker');
                document.getElementById('insurance-file-input')?.click();
              }}
              disabled={isOcrProcessing}
              className={`flex-1 px-4 py-2 bg-white border border-blue-300 rounded-lg text-center text-sm font-medium text-blue-700 hover:bg-blue-50 transition ${isOcrProcessing ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              📁 画像を選択
            </button>
            <input
              id="insurance-file-input"
              type="file"
              accept="image/*"
              onChange={handlePolicyScan}
              disabled={isOcrProcessing}
              className="hidden"
            />
          </div>

          {isOcrProcessing && (
            <div className="mt-3 flex items-center justify-center gap-2 text-sm text-blue-700">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-700"></div>
              <span>保険証券を読み取り中...</span>
            </div>
          )}

          {ocrResult && !isOcrProcessing && (
            <details className="mt-3">
              <summary className="text-xs text-green-700 bg-green-50 p-2 rounded cursor-pointer hover:bg-green-100">
                ✓ 読み取り完了。内容を確認してください。（クリックで詳細表示）
              </summary>
              <div className="mt-2 p-3 bg-gray-50 rounded text-xs text-gray-700 max-h-40 overflow-y-auto whitespace-pre-wrap font-mono">
                {ocrResult}
              </div>
            </details>
          )}
        </div>

        <form onSubmit={handleAdd} className="space-y-4">
          {/* 基本情報 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">保険会社 *</label>
              <input
                type="text"
                value={provider}
                onChange={(e) => setProvider(e.target.value)}
                placeholder="例: 東京海上日動火災保険"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-100"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">証券番号 *</label>
              <input
                type="text"
                value={policyNumber}
                onChange={(e) => setPolicyNumber(e.target.value)}
                placeholder="例: ABC123456789"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-100"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">契約開始日 *</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-100"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">契約終了日（満期日） *</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-100"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">保険料 *</label>
              <input
                type="number"
                value={premiumAmount}
                onChange={(e) => setPremiumAmount(e.target.value)}
                placeholder="例: 50000"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-100"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">支払いサイクル *</label>
              <select
                value={paymentCycle}
                onChange={(e) => setPaymentCycle(e.target.value as 'annual' | 'monthly')}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-100"
              >
                <option value="annual">年払い</option>
                <option value="monthly">月払い</option>
              </select>
            </div>
          </div>

          {/* 補償内容（オプション） */}
          <details className="border border-gray-200 rounded-lg p-4">
            <summary className="font-medium text-gray-900 cursor-pointer">補償内容（任意）</summary>
            <div className="mt-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">対人賠償</label>
                  <input
                    type="text"
                    value={bodilyInjuryLimit}
                    onChange={(e) => setBodilyInjuryLimit(e.target.value)}
                    placeholder="例: 無制限"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">対物賠償</label>
                  <input
                    type="text"
                    value={propertyDamageLimit}
                    onChange={(e) => setPropertyDamageLimit(e.target.value)}
                    placeholder="例: 無制限"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">人身傷害</label>
                  <input
                    type="text"
                    value={personalInjuryLimit}
                    onChange={(e) => setPersonalInjuryLimit(e.target.value)}
                    placeholder="例: 3000万円"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">車両保険タイプ</label>
                  <select
                    value={vehicleType}
                    onChange={(e) => setVehicleType(e.target.value as 'AG' | 'AC' | 'NONE')}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  >
                    <option value="NONE">なし</option>
                    <option value="AG">一般</option>
                    <option value="AC">エコノミー</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">免責金額</label>
                  <input
                    type="text"
                    value={deductible}
                    onChange={(e) => setDeductible(e.target.value)}
                    placeholder="例: 5-10万円"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  />
                </div>
              </div>
            </div>
          </details>

          {/* 運転者条件・使用目的（オプション） */}
          <details className="border border-gray-200 rounded-lg p-4">
            <summary className="font-medium text-gray-900 cursor-pointer">運転者条件・使用目的（任意）</summary>
            <div className="mt-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">年齢条件</label>
                  <input
                    type="text"
                    value={ageLimit}
                    onChange={(e) => setAgeLimit(e.target.value)}
                    placeholder="例: 26歳以上"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">使用目的</label>
                  <select
                    value={purpose}
                    onChange={(e) => setPurpose(e.target.value as 'private' | 'business')}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  >
                    <option value="private">日常・レジャー</option>
                    <option value="business">業務使用</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="familyOnly"
                  checked={familyOnly}
                  onChange={(e) => setFamilyOnly(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="familyOnly" className="text-sm text-gray-700">
                  家族限定
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">年間走行距離（km）</label>
                <input
                  type="number"
                  value={annualMileageKm}
                  onChange={(e) => setAnnualMileageKm(e.target.value)}
                  placeholder="例: 10000"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-100"
                />
              </div>
            </div>
          </details>

          {/* メモ */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">メモ</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="特約や注意事項など"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-100"
            />
          </div>

          {/* ボタン */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
            >
              キャンセル
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              追加
            </button>
          </div>
        </form>
      </div>
      </div>
      
      {/* ペイウォールモーダル（最上位に表示） */}
      {showPaywall && (
        <PaywallModal
          onClose={closePaywall}
          feature={paywallFeature}
          variant={paywallVariant}
        />
      )}
    </>
  );
}

