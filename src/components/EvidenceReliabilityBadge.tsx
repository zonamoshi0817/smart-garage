/**
 * 証跡の有無を示す信頼度バッジコンポーネント
 */

'use client';

interface EvidenceReliabilityBadgeProps {
  hasEvidence: boolean;
  className?: string;
}

export default function EvidenceReliabilityBadge({
  hasEvidence,
  className = '',
}: EvidenceReliabilityBadgeProps) {
  if (hasEvidence) {
    return (
      <span
        className={`text-xs px-2 py-1 bg-green-100 text-green-700 rounded ${className}`}
        title="証跡（領収書等）あり"
      >
        証跡あり
      </span>
    );
  }

  return (
    <span
      className={`text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded ${className}`}
      title="証跡なし"
    >
      証跡なし
    </span>
  );
}
