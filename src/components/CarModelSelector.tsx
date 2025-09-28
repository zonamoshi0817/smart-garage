// src/components/CarModelSelector.tsx
"use client";

import { useState, useEffect } from 'react';
import { 
  carDatabase, 
  getManufacturers, 
  getModelsByManufacturer, 
  getModelById,
  searchModels,
  getModelsByBodyType,
  type CarManufacturer, 
  type CarModel 
} from '@/lib/carDatabase';

interface CarModelSelectorProps {
  onSelect: (manufacturer: CarManufacturer, model: CarModel) => void;
  onClose: () => void;
  currentManufacturer?: string;
  currentModel?: string;
}

export default function CarModelSelector({ 
  onSelect, 
  onClose, 
  currentManufacturer,
  currentModel 
}: CarModelSelectorProps) {
  const [selectedManufacturer, setSelectedManufacturer] = useState<CarManufacturer | null>(null);
  const [selectedModel, setSelectedModel] = useState<CarModel | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{ manufacturer: CarManufacturer; model: CarModel }[]>([]);
  const [activeTab, setActiveTab] = useState<'manufacturer' | 'search' | 'bodyType'>('manufacturer');
  const [selectedBodyType, setSelectedBodyType] = useState<CarModel['bodyType'] | null>(null);

  const manufacturers = getManufacturers();
  const models = selectedManufacturer ? getModelsByManufacturer(selectedManufacturer.id) : [];

  // 初期選択状態を設定
  useEffect(() => {
    if (currentManufacturer) {
      const manufacturer = manufacturers.find(m => m.id === currentManufacturer);
      if (manufacturer) {
        setSelectedManufacturer(manufacturer);
        if (currentModel) {
          const model = getModelById(manufacturer.id, currentModel);
          if (model) {
            setSelectedModel(model);
          }
        }
      }
    }
  }, [currentManufacturer, currentModel, manufacturers]);

  // 検索処理
  useEffect(() => {
    if (searchQuery.trim()) {
      const results = searchModels(searchQuery);
      setSearchResults(results);
    } else {
      setSearchResults([]);
    }
  }, [searchQuery]);

  const handleManufacturerSelect = (manufacturer: CarManufacturer) => {
    setSelectedManufacturer(manufacturer);
    setSelectedModel(null);
    setActiveTab('manufacturer');
  };

  const handleModelSelect = (model: CarModel) => {
    setSelectedModel(model);
  };

  const handleConfirm = () => {
    if (selectedManufacturer && selectedModel) {
      onSelect(selectedManufacturer, selectedModel);
      onClose();
    }
  };

  const handleBodyTypeSelect = (bodyType: CarModel['bodyType']) => {
    setSelectedBodyType(bodyType);
    setActiveTab('bodyType');
  };


  const getBodyTypeLabel = (bodyType: CarModel['bodyType']): string => {
    const labels = {
      sedan: 'セダン',
      hatchback: 'ハッチバック',
      suv: 'SUV',
      wagon: 'ワゴン',
      coupe: 'クーペ',
      convertible: 'コンバーチブル',
      pickup: 'ピックアップ',
      minivan: 'ミニバン',
      sports: 'スポーツカー',
      other: 'その他'
    };
    return labels[bodyType];
  };


  const getCountryFlag = (country: CarManufacturer['country']): string => {
    const flags = {
      japan: '🇯🇵',
      germany: '🇩🇪',
      usa: '🇺🇸',
      korea: '🇰🇷',
      france: '🇫🇷',
      italy: '🇮🇹',
      uk: '🇬🇧',
      other: '🌍'
    };
    return flags[country];
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl p-6 max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">車種を選択</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* タブナビゲーション */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab('manufacturer')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              activeTab === 'manufacturer'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            メーカーから選択
          </button>
          <button
            onClick={() => setActiveTab('search')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              activeTab === 'search'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            車種名で検索
          </button>
          <button
            onClick={() => setActiveTab('bodyType')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              activeTab === 'bodyType'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            ボディタイプ
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 左側: 選択肢 */}
          <div>
            {activeTab === 'manufacturer' && (
              <div>
                {!selectedManufacturer ? (
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-3">メーカーを選択</h3>
                    <div className="grid grid-cols-2 gap-2 max-h-96 overflow-y-auto">
                      {manufacturers.map((manufacturer) => (
                        <button
                          key={manufacturer.id}
                          onClick={() => handleManufacturerSelect(manufacturer)}
                          className="p-3 rounded-lg border border-gray-200 hover:border-gray-300 text-left transition"
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-lg">{getCountryFlag(manufacturer.country)}</span>
                            <div>
                              <p className="font-medium text-gray-900">{manufacturer.name}</p>
                              <p className="text-xs text-gray-500">{manufacturer.nameKana}</p>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-center gap-2 mb-4">
                      <button
                        onClick={() => {
                          setSelectedManufacturer(null);
                          setSelectedModel(null);
                        }}
                        className="text-blue-600 hover:text-blue-800 text-sm"
                      >
                        ← メーカー選択に戻る
                      </button>
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-3">
                      {selectedManufacturer.name}の車種を選択
                    </h3>
                    <div className="max-h-96 overflow-y-auto">
                      {models.map((model) => (
                        <button
                          key={model.id}
                          onClick={() => handleModelSelect(model)}
                          className={`w-full p-3 rounded-lg border text-left transition mb-2 ${
                            selectedModel?.id === model.id
                              ? 'border-blue-600 bg-blue-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <div>
                            <p className="font-medium text-gray-900">{model.name}</p>
                            <p className="text-sm text-gray-500">
                              {getBodyTypeLabel(model.bodyType)}
                              {model.modelCode && ` • ${model.modelCode}`}
                              {model.displacement && ` • ${model.displacement}cc`}
                              {model.generation && ` • ${model.generation}`}
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'search' && (
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-3">車種名で検索</h3>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="車種名や型式を入力..."
                  className="w-full p-3 border border-gray-300 rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-blue-100"
                />
                <div className="max-h-96 overflow-y-auto">
                  {searchResults.map(({ manufacturer, model }) => (
                    <button
                      key={`${manufacturer.id}-${model.id}`}
                      onClick={() => {
                        setSelectedManufacturer(manufacturer);
                        setSelectedModel(model);
                      }}
                      className={`w-full p-3 rounded-lg border text-left transition mb-2 ${
                        selectedManufacturer?.id === manufacturer.id && selectedModel?.id === model.id
                          ? 'border-blue-600 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{getCountryFlag(manufacturer.country)}</span>
                        <div>
                          <p className="font-medium text-gray-900">{manufacturer.name} {model.name}</p>
                          <p className="text-xs text-gray-500">
                            {getBodyTypeLabel(model.bodyType)}
                            {model.modelCode && ` • ${model.modelCode}`}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'bodyType' && (
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-3">ボディタイプを選択</h3>
                <div className="grid grid-cols-2 gap-2">
                  {(['sedan', 'hatchback', 'suv', 'wagon', 'coupe', 'convertible', 'pickup', 'minivan', 'sports', 'other'] as const).map((bodyType) => (
                    <button
                      key={bodyType}
                      onClick={() => handleBodyTypeSelect(bodyType)}
                      className={`p-3 rounded-lg border text-center transition ${
                        selectedBodyType === bodyType
                          ? 'border-blue-600 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <p className="font-medium text-gray-900">{getBodyTypeLabel(bodyType)}</p>
                    </button>
                  ))}
                </div>
                {selectedBodyType && (
                  <div className="mt-4 max-h-96 overflow-y-auto">
                    <h4 className="font-medium text-gray-900 mb-2">{getBodyTypeLabel(selectedBodyType)}の車種</h4>
                    {getModelsByBodyType(selectedBodyType).map(({ manufacturer, model }) => (
                      <button
                        key={`${manufacturer.id}-${model.id}`}
                        onClick={() => {
                          setSelectedManufacturer(manufacturer);
                          setSelectedModel(model);
                        }}
                        className={`w-full p-2 rounded-lg border text-left transition mb-1 ${
                          selectedManufacturer?.id === manufacturer.id && selectedModel?.id === model.id
                            ? 'border-blue-600 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <p className="text-sm font-medium text-gray-900">{manufacturer.name} {model.name}</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

          </div>

          {/* 右側: 選択された車種の詳細 */}
          <div>
            {selectedManufacturer && selectedModel ? (
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <h4 className="font-medium text-blue-900 mb-3">選択された車種</h4>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{getCountryFlag(selectedManufacturer.country)}</span>
                    <div>
                      <p className="font-medium text-blue-900">{selectedManufacturer.name} {selectedModel.name}</p>
                      <p className="text-sm text-blue-700">{selectedManufacturer.nameKana}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-blue-700">ボディタイプ:</span>
                      <span className="text-blue-900 ml-1">{getBodyTypeLabel(selectedModel.bodyType)}</span>
                    </div>
                    {selectedModel.modelCode && (
                      <div>
                        <span className="text-blue-700">型式:</span>
                        <span className="text-blue-900 ml-1">{selectedModel.modelCode}</span>
                      </div>
                    )}
                    {selectedModel.displacement && (
                      <div>
                        <span className="text-blue-700">排気量:</span>
                        <span className="text-blue-900 ml-1">{selectedModel.displacement}cc</span>
                      </div>
                    )}
                    {selectedModel.generation && (
                      <div>
                        <span className="text-blue-700">世代:</span>
                        <span className="text-blue-900 ml-1">{selectedModel.generation}</span>
                      </div>
                    )}
                    {selectedModel.yearFrom && selectedModel.yearTo && (
                      <div>
                        <span className="text-blue-700">年式:</span>
                        <span className="text-blue-900 ml-1">{selectedModel.yearFrom}年 - {selectedModel.yearTo}年</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <p className="text-gray-600 text-center">車種を選択してください</p>
              </div>
            )}
          </div>
        </div>

        {/* ボタン */}
        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
          >
            キャンセル
          </button>
          <button
            onClick={handleConfirm}
            disabled={!selectedManufacturer || !selectedModel}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            選択
          </button>
        </div>
      </div>
    </div>
  );
}
