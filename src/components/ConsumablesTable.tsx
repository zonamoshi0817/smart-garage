/**
 * 消耗品交換一覧テーブル（履歴表示対応）
 */

'use client';

interface ConsumableHistory {
  date: string; // ISO string形式
  mileageKm?: number;
}

interface Consumable {
  type: 'oil' | 'tire' | 'brake' | 'battery' | 'coolant';
  history: ConsumableHistory[];
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
  const formatDate = (dateStr: string) => {
    if (!dateStr) return '---';
    const date = new Date(dateStr);
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
            <th className="text-left py-3 px-4 font-medium text-gray-700">交換日</th>
            <th className="text-left py-3 px-4 font-medium text-gray-700">交換時走行距離</th>
          </tr>
        </thead>
        <tbody>
          {consumables.map((item) => {
            // デバッグログ: 各項目の履歴数を確認
            if (item.type === 'oil') {
              console.log(`Engine oil history count: ${item.history.length}`, item.history);
            }
            
            if (item.history.length === 0) {
              // 履歴がない場合
              return (
                <tr key={item.type} className="border-b border-gray-100">
                  <td className="py-3 px-4 font-medium text-gray-900">
                    {typeLabels[item.type]}
                  </td>
                  <td className="py-3 px-4 text-gray-700">---</td>
                  <td className="py-3 px-4 text-gray-700">---</td>
                </tr>
              );
            }
            // 履歴がある場合、各行を表示（全履歴を表示）
            return item.history.map((historyItem, index) => (
              <tr key={`${item.type}-${index}`} className="border-b border-gray-100">
                {index === 0 && (
                  <td 
                    className="py-3 px-4 font-medium text-gray-900"
                    rowSpan={item.history.length}
                  >
                    {typeLabels[item.type]}
                  </td>
                )}
                <td className="py-3 px-4 text-gray-700">
                  {formatDate(historyItem.date)}
                </td>
                <td className="py-3 px-4 text-gray-700">
                  {formatMileage(historyItem.mileageKm)}
                </td>
              </tr>
            ));
          })}
        </tbody>
      </table>
    </div>
  );
}