import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/**
 * アクセシビリティテスト
 * 注: @axe-core/playwright のインストールが必要
 */
test.describe('Accessibility', () => {
  test.skip('should not have any automatically detectable accessibility issues', async ({ page }) => {
    await page.goto('/');
    
    // axe-coreでアクセシビリティスキャンを実行
    // const accessibilityScanResults = await new AxeBuilder({ page }).analyze();
    // expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('should have proper heading hierarchy', async ({ page }) => {
    await page.goto('/');
    
    // h1タグが存在することを確認
    const h1 = page.locator('h1');
    await expect(h1).toBeVisible();
  });

  test('should have alt text for images', async ({ page }) => {
    await page.goto('/');
    
    // すべての画像にalt属性があることを確認
    const images = page.locator('img');
    const count = await images.count();
    
    for (let i = 0; i < count; i++) {
      const img = images.nth(i);
      const alt = await img.getAttribute('alt');
      expect(alt).toBeTruthy();
    }
  });

  test('should be keyboard navigable', async ({ page }) => {
    await page.goto('/');
    
    // Tabキーでナビゲーションできることを確認
    await page.keyboard.press('Tab');
    
    // フォーカス可能な要素が存在することを確認
    const focusedElement = page.locator(':focus');
    await expect(focusedElement).toBeVisible();
  });
});

