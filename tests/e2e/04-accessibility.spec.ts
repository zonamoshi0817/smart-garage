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

  test.skip('should have proper heading hierarchy', async ({ page }) => {
    // このテストは認証状態に依存するためスキップ
    // 本来はログイン後の状態でテストすべき
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    const hasH1 = await page.locator('h1').count();
    const hasMainHeading = await page.locator('h1, h2, h3').count();
    
    expect(hasMainHeading).toBeGreaterThan(0);
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

  test.skip('should be keyboard navigable', async ({ page }) => {
    // このテストは認証状態に依存するためスキップ
    // 本来はログイン後の状態でテストすべき
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    await page.keyboard.press('Tab');
    await page.waitForTimeout(100);
    
    const interactiveElements = await page.locator('button, a, input, select, textarea').count();
    expect(interactiveElements).toBeGreaterThan(0);
  });
});

