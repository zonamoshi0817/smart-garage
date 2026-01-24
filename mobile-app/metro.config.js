const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Firebase SDKの.cjsモジュールをサポート
config.resolver.sourceExts.push('cjs');
// パッケージエクスポートを無効化してFirebaseの互換性を確保
config.resolver.unstable_enablePackageExports = false;

module.exports = config;
