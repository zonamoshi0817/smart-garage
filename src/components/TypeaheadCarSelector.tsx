"use client";

import React, { useState, useEffect, useRef } from 'react';
import { 
  carDatabase, 
  CarManufacturer, 
  CarModel, 
  generateYearOptions 
} from '@/lib/carDatabase';

interface TypeaheadCarSelectorProps {
  onSelect: (data: {
    manufacturer: CarManufacturer | null;
    model: CarModel | null;
    year: number | null;
    inspectionExpiry: string;
  }) => void;
  onClose: () => void;
  initialData?: {
    manufacturer?: CarManufacturer | null;
    model?: CarModel | null;
    year?: number | null;
    inspectionExpiry?: string;
  };
}

export default function TypeaheadCarSelector({ 
  onSelect, 
  onClose, 
  initialData 
}: TypeaheadCarSelectorProps) {
  const [step, setStep] = useState<'manufacturer' | 'model' | 'year' | 'inspection'>('manufacturer');
  const [selectedManufacturer, setSelectedManufacturer] = useState<CarManufacturer | null>(
    initialData?.manufacturer || null
  );
  const [selectedModel, setSelectedModel] = useState<CarModel | null>(
    initialData?.model || null
  );
  const [selectedYear, setSelectedYear] = useState<number | null>(
    initialData?.year || null
  );
  const [inspectionExpiry, setInspectionExpiry] = useState(
    initialData?.inspectionExpiry || ''
  );
  const [allowFreeInput, setAllowFreeInput] = useState(false);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const yearOptions = generateYearOptions();

  // 初期化
  useEffect(() => {
    if (initialData?.manufacturer) {
      setStep('model');
    }
    if (initialData?.model) {
      setStep('year');
    }
    if (initialData?.year) {
      setStep('inspection');
    }
  }, [initialData]);

  // メーカー選択は一覧表示なので検索ロジックは不要

  // 車種選択は一覧表示なので検索ロジックは不要

  const handleManufacturerSelect = (manufacturer: CarManufacturer) => {
    setSelectedManufacturer(manufacturer);
    setStep('model');
  };

  const handleModelSelect = (result: { manufacturer: CarManufacturer; model: CarModel }) => {
    setSelectedModel(result.model);
    setStep('year');
  };

  const handleYearSelect = (year: number) => {
    setSelectedYear(year);
    setStep('inspection');
  };

  const handleFreeInput = () => {
    setAllowFreeInput(true);
    // 自由入力の場合は次のステップに進む
    if (step === 'manufacturer') {
      setStep('model');
    } else if (step === 'model') {
      setStep('year');
    }
  };

  const handleSubmit = () => {
    onSelect({
      manufacturer: selectedManufacturer,
      model: selectedModel,
      year: selectedYear,
      inspectionExpiry
    });
  };

  const canProceed = () => {
    switch (step) {
      case 'manufacturer':
        return selectedManufacturer || allowFreeInput;
      case 'model':
        return selectedModel || allowFreeInput;
      case 'year':
        return selectedYear;
      case 'inspection':
        return true; // 任意項目に変更
      default:
        return false;
    }
  };

  const getStepTitle = () => {
    switch (step) {
      case 'manufacturer': return 'メーカーを選択';
      case 'model': return '車種を選択';
      case 'year': return '年式を選択';
      case 'inspection': return '車検満了日を入力';
      default: return '';
    }
  };

  const getStepDescription = () => {
    switch (step) {
      case 'manufacturer': return 'メーカーを一覧から選択してください';
      case 'model': return '車種を一覧から選択してください';
      case 'year': return '年式を選択してください';
      case 'inspection': return '車検満了日を入力してください（YYYY-MM-DD形式）';
      default: return '';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl w-full max-w-md mx-4 max-h-[90vh] flex flex-col">
        {/* ヘッダー */}
        <div className="flex items-center justify-between p-6 pb-0">
          <h2 className="text-xl font-bold text-gray-900">車両情報入力</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        </div>

        {/* 進捗インジケーター */}
        <div className="flex items-center justify-center mb-6 px-6">
          <div className="flex items-center space-x-2">
            {['manufacturer', 'model', 'year', 'inspection'].map((stepName, index) => (
              <div key={stepName} className="flex items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    step === stepName
                      ? 'bg-blue-600 text-white'
                      : ['manufacturer', 'model', 'year', 'inspection'].indexOf(step) > index
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-200 text-gray-600'
                  }`}
                >
                  {index + 1}
                </div>
                {index < 3 && (
                  <div
                    className={`w-8 h-0.5 ${
                      ['manufacturer', 'model', 'year', 'inspection'].indexOf(step) > index
                        ? 'bg-green-600'
                        : 'bg-gray-200'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* スクロール可能なメインコンテンツ */}
        <div className="flex-1 overflow-y-auto px-6">
          <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {getStepTitle()}
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            {getStepDescription()}
          </p>

          {/* メーカー選択 */}
          {step === 'manufacturer' && (
            <div className="space-y-3">
              <div className="max-h-80 overflow-y-auto border border-gray-200 rounded-lg">
                {carDatabase.map((manufacturer, index) => (
                  <button
                    key={index}
                    onClick={() => handleManufacturerSelect(manufacturer)}
                    className={`w-full px-4 py-3 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0 flex items-center gap-3 ${
                      selectedManufacturer?.id === manufacturer.id ? 'bg-blue-50 border-blue-200' : ''
                    }`}
                  >
                    <span className="text-2xl">
                      {manufacturer.country === 'japan' ? '🇯🇵' : 
                       manufacturer.country === 'germany' ? '🇩🇪' : '🇺🇸'}
                    </span>
                    <div>
                      <div className="font-semibold text-gray-900">{manufacturer.name}</div>
                    </div>
                    {selectedManufacturer?.id === manufacturer.id && (
                      <div className="ml-auto text-blue-600">✓</div>
                    )}
                  </button>
                ))}
              </div>
              <button
                onClick={handleFreeInput}
                className="w-full py-2 px-4 text-sm text-blue-600 hover:text-blue-800 border border-blue-200 rounded-lg hover:bg-blue-50"
              >
                候補にない → 自由入力で登録
              </button>
            </div>
          )}

          {/* 車種選択 */}
          {step === 'model' && selectedManufacturer && (
            <div className="space-y-3">
              <div className="max-h-80 overflow-y-auto border border-gray-200 rounded-lg">
                {selectedManufacturer.models.map((model, index) => (
                  <button
                    key={index}
                    onClick={() => handleModelSelect({ manufacturer: selectedManufacturer, model })}
                    className={`w-full px-4 py-3 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0 ${
                      selectedModel?.id === model.id ? 'bg-blue-50 border-blue-200' : ''
                    }`}
                  >
                    <div>
                      <div className="font-semibold text-gray-900">{model.name}</div>
                      {model.modelCode && (
                        <div className="text-sm text-gray-500">型式: {model.modelCode}</div>
                      )}
                      {model.displacement && (
                        <div className="text-sm text-gray-500">排気量: {model.displacement}cc</div>
                      )}
                      {model.generation && (
                        <div className="text-sm text-gray-500">{model.generation}</div>
                      )}
                    </div>
                    {selectedModel?.id === model.id && (
                      <div className="ml-auto text-blue-600">✓</div>
                    )}
                  </button>
                ))}
              </div>
              <button
                onClick={handleFreeInput}
                className="w-full py-2 px-4 text-sm text-blue-600 hover:text-blue-800 border border-blue-200 rounded-lg hover:bg-blue-50"
              >
                候補にない → 自由入力で登録
              </button>
            </div>
          )}

          {/* 年式選択 */}
          {step === 'year' && (
            <div className="space-y-3">
              <div className="grid grid-cols-4 gap-2 max-h-60 overflow-y-auto">
                {yearOptions.map((year) => (
                  <button
                    key={year}
                    onClick={() => handleYearSelect(year)}
                    className={`py-2 px-3 text-sm rounded-lg border ${
                      selectedYear === year
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {year}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 車検満了日入力 */}
          {step === 'inspection' && (
            <div className="space-y-3">
              <input
                type="date"
                value={inspectionExpiry}
                onChange={(e) => setInspectionExpiry(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <div className="text-sm text-gray-600">
                💡 ICカードから自動取得も可能です（今後実装予定）
              </div>
            </div>
          )}
        </div>

          {/* 選択内容の確認 */}
          {(selectedManufacturer || selectedModel || selectedYear) && (
            <div className="mb-6 p-4 bg-blue-50 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-2">選択内容</h4>
              <div className="space-y-1 text-sm text-blue-800">
                {selectedManufacturer && (
                  <div>メーカー: {selectedManufacturer.name}</div>
                )}
                {selectedModel && (
                  <div>車種: {selectedModel.name}</div>
                )}
                {selectedYear && (
                  <div>年式: {selectedYear}年</div>
                )}
                {inspectionExpiry && (
                  <div>車検満了日: {inspectionExpiry}</div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* 固定ボタン */}
        <div className="p-6 pt-0 border-t border-gray-200">
          <div className="flex gap-3">
            {step !== 'manufacturer' && (
              <button
                onClick={() => {
                  if (step === 'model') setStep('manufacturer');
                  else if (step === 'year') setStep('model');
                  else if (step === 'inspection') setStep('year');
                }}
                className="flex-1 py-3 px-4 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
              >
                戻る
              </button>
            )}
            <button
              onClick={handleSubmit}
              disabled={!canProceed()}
              className={`flex-1 py-3 px-4 rounded-lg transition ${
                canProceed()
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              {step === 'inspection' ? '完了' : '次へ'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
