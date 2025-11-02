"use client";

import { useState } from 'react';
import { addInsurancePolicy } from '@/lib/insurance';
import Tesseract from 'tesseract.js';
import { logOcrUsed } from '@/lib/analytics';

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
  const [provider, setProvider] = useState('');
  const [policyNumber, setPolicyNumber] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [paymentCycle, setPaymentCycle] = useState<'annual' | 'monthly'>('annual');
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

  // OCR処理: 保険証券スキャン（画像対応）
  const handlePolicyScan = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsOcrProcessing(true);
    setOcrResult(null);

    try {
      console.log('[Insurance OCR] Starting OCR processing...');
      
      const result = await Tesseract.recognize(file, 'jpn+eng', {
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

      logOcrUsed('insurance', true);
      alert('保険証券を読み取りました。内容を確認して必要に応じて修正してください。');
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
    startDate?: string;
    endDate?: string;
    premiumAmount?: number;
    paymentCycle?: 'annual' | 'monthly';
  } => {
    const result: any = {};

    // 保険会社名の抽出
    const providerPatterns = [
      /(?:東京海上|日動)/,
      /損保ジャパン/,
      /三井住友海上/,
      /あいおいニッセイ/,
      /AIG損保/,
      /チューリッヒ/,
      /ソニー損保/,
      /アクサダイレクト/,
      /イーデザイン損保/,
      /SBI損保/,
    ];

    for (const pattern of providerPatterns) {
      const match = text.match(pattern);
      if (match) {
        result.provider = match[0];
        break;
      }
    }

    // 証券番号の抽出
    const policyNumberPatterns = [
      /証券番号[:\s]*([A-Z0-9\-]+)/i,
      /保険証券番号[:\s]*([A-Z0-9\-]+)/i,
      /契約番号[:\s]*([A-Z0-9\-]+)/i,
    ];

    for (const pattern of policyNumberPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        result.policyNumber = match[1].trim();
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

    // 保険料の抽出
    const premiumPatterns = [
      /保険料[:\s]*¥?([0-9,]+)円/,
      /年間保険料[:\s]*¥?([0-9,]+)円/,
      /月額保険料[:\s]*¥?([0-9,]+)円/,
      /払込保険料[:\s]*¥?([0-9,]+)円/,
    ];

    for (const pattern of premiumPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const amount = parseInt(match[1].replace(/,/g, ''));
        if (!isNaN(amount) && amount > 0) {
          result.premiumAmount = amount;
          
          // 年額か月額かを判定
          if (pattern.source.includes('月額') || pattern.source.includes('月払')) {
            result.paymentCycle = 'monthly';
          } else if (pattern.source.includes('年間') || pattern.source.includes('年払')) {
            result.paymentCycle = 'annual';
          }
          break;
        }
      }
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
          <h3 className="text-sm font-semibold text-blue-900 mb-2">📄 保険証券スキャン</h3>
          <p className="text-xs text-blue-700 mb-3">
            保険証券の写真をアップロードすると、自動的に情報を読み取ります
          </p>
          
          <div className="flex gap-2">
            <label className="flex-1">
              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handlePolicyScan}
                disabled={isOcrProcessing}
                className="hidden"
              />
              <div className={`w-full px-4 py-2 bg-white border border-blue-300 rounded-lg text-center text-sm font-medium text-blue-700 hover:bg-blue-50 transition cursor-pointer ${isOcrProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}>
                📷 カメラで撮影
              </div>
            </label>
            
            <label className="flex-1">
              <input
                type="file"
                accept="image/*"
                onChange={handlePolicyScan}
                disabled={isOcrProcessing}
                className="hidden"
              />
              <div className={`w-full px-4 py-2 bg-white border border-blue-300 rounded-lg text-center text-sm font-medium text-blue-700 hover:bg-blue-50 transition cursor-pointer ${isOcrProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}>
                📁 画像を選択
              </div>
            </label>
          </div>

          {isOcrProcessing && (
            <div className="mt-3 flex items-center justify-center gap-2 text-sm text-blue-700">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-700"></div>
              <span>保険証券を読み取り中...</span>
            </div>
          )}

          {ocrResult && !isOcrProcessing && (
            <div className="mt-3 text-xs text-green-700 bg-green-50 p-2 rounded">
              ✓ 読み取り完了。内容を確認してください。
            </div>
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
  );
}

