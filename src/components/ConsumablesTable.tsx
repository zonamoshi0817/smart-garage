/**
 * 消耗品交換一覧テーブル
 */

'use client';

interface Consumable {
  type: 'oil' | 'tire' | 'brake' | 'battery' | 'coolant';
  lastReplacedDate?: Date;
  lastReplacedMileageKm?: number;
}

interface ConsumablesTableProps {
  consumables: Consumable[];
}

const typeLabels: { [key in Consumable['type']]: string } = {
  oil: 'エンジンオイル',
  tire: 'タイヤ',
  brake: 'ブレーキ',
  battery: 'バッテリー',
  coolant: 'クーラント',
};

export default function ConsumablesTable({ consumables }: ConsumablesTableProps) {
  const formatDate = (date?: Date) => {
    if (!date) return '---';
    return new Intl.DateTimeFormat('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(date);
  };

  const formatMileage = (km?: number) => {
    if (!km) return '---';
    return `${km.toLocaleString()}km`;
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="text-left py-3 px-4 font-medium text-gray-700">項目</th>
            <th className="text-left py-3 px-4 font-medium text-gray-700">最終交換日</th>
            <th className="text-left py-3 px-4 font-medium text-gray-700">交換時走行距離</th>
          </tr>
        </thead>
        <tbody>
          {consumables.map((item) => (
            <tr key={item.type} className="border-b border-gray-100">
              <td className="py-3 px-4 font-medium text-gray-900">
                {typeLabels[item.type]}
              </td>
              <td className="py-3 px-4 text-gray-700">
                {formatDate(item.lastReplacedDate)}
              </td>
              <td className="py-3 px-4 text-gray-700">
                {/* 最終交換日が存在しない場合は、交換時走行距離も必ず---にする */}
                {item.lastReplacedDate ? formatMileage(item.lastReplacedMileageKm) : '---'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}