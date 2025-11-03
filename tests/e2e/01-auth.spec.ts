import { test, expect } from '@playwright/test';

/**
 * 認証フローのE2Eテスト
 */
test.describe('Authentication Flow', () => {
  test('should show login page for unauthenticated users', async ({ page }) => {
    await page.goto('/');
    
    // ログインページが表示されることを確認
    await expect(page.getByText('Smart Garage')).toBeVisible();
    await expect(page.getByText('Googleでログイン')).toBeVisible();
  });

  test('should have proper page title', async ({ page }) => {
    await page.goto('/');
    
    // ページタイトルを確認
    await expect(page).toHaveTitle(/Smart Garage/);
  });

  // 注: 実際のGoogle認証テストはモック/スタブが必要
  // このテストはログインボタンの存在のみ確認
  test('should have login button', async ({ page }) => {
    await page.goto('/');
    
    const loginButton = page.getByRole('button', { name: /Googleでログイン/ });
    await expect(loginButton).toBeVisible();
    await expect(loginButton).toBeEnabled();
  });
});

