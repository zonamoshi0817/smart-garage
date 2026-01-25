/**
 * カスタムエラークラス
 */

/**
 * 証憑アップロード制限超過エラー
 */
export class EvidenceLimitExceededError extends Error {
  constructor(
    public limitType: 'monthly' | 'per_record' | 'bytes',
    public reason: string,
    message?: string
  ) {
    super(message || reason);
    this.name = 'EvidenceLimitExceededError';
    // TypeScriptでErrorを継承する場合に必要
    Object.setPrototypeOf(this, EvidenceLimitExceededError.prototype);
  }
}
