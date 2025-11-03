import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2Eテスト設定
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: './tests/e2e',
  
  /* テストの最大実行時間 */
  timeout: 60 * 1000,
  
  /* テストの並列実行数 */
  fullyParallel: true,
  
  /* CI環境でのみリトライ */
  retries: process.env.CI ? 2 : 0,
  
  /* 並列ワーカー数 */
  workers: process.env.CI ? 1 : undefined,
  
  /* レポーター設定 */
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['list'],
  ],
  
  /* 共通設定 */
  use: {
    /* ベースURL */
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000',
    
    /* スクリーンショット設定 */
    screenshot: 'only-on-failure',
    
    /* ビデオ録画設定 */
    video: 'retain-on-failure',
    
    /* トレース設定 */
    trace: 'on-first-retry',
    
    /* タイムアウト設定 */
    actionTimeout: 15 * 1000,
    navigationTimeout: 30 * 1000,
  },

  /* プロジェクト設定（複数ブラウザでテスト） */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },

    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },

    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },

    /* モバイルビューポート */
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },
  ],

  /* Webサーバー設定（テスト前に自動起動） */
  webServer: process.env.SKIP_WEBSERVER ? undefined : {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});

