import { test, expect } from '@playwright/test';

/**
 * エラーハンドリングとエッジケースのE2Eテスト
 */
test.describe('Error Handling', () => {
  test('should handle 404 page gracefully', async ({ page }) => {
    const response = await page.goto('/non-existent-page');
    
    // 404エラーページが表示されることを確認
    // Next.jsのデフォルトエラーページまたはカスタムエラーページ
    expect(response?.status()).toBe(404);
  });

  test('should handle network offline gracefully', async ({ page, context }) => {
    await page.goto('/');
    
    // ネットワークをオフラインに設定
    await context.setOffline(true);
    
    // ページがクラッシュしないことを確認
    // （エラーメッセージが表示されるべき）
    const bodyText = await page.textContent('body');
    expect(bodyText).toBeTruthy();
  });

  test('should handle invalid share token', async ({ page }) => {
    await page.goto('/share/invalid-token-12345');
    
    // エラーメッセージが表示されることを確認
    await expect(page.getByText(/アクセスエラー|無効なリンク/)).toBeVisible();
  });

  test('should handle expired share token', async ({ page }) => {
    // 期限切れのトークンを生成（過去のタイムスタンプ）
    const expiredToken = `test-car-id.1000000000000.1000000001000.dummy-signature`;
    await page.goto(`/share/${expiredToken}`);
    
    // 期限切れエラーが表示されることを確認
    await expect(page.getByText(/期限が切れて|無効なリンク/)).toBeVisible();
  });
});

