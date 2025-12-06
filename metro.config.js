// metro.config.js – HOÀN HẢO cho Expo SDK 54 + NativeWind v4 + Sentry
const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

// Lấy config mặc định của Expo
const defaultConfig = getDefaultConfig(__dirname);

// Áp dụng Sentry trước (nếu có)
let config = defaultConfig;
try {
  const { getSentryExpoConfig } = require('@sentry/react-native/metro');
  config = getSentryExpoConfig(__dirname, config);
} catch (e) {
  // Nếu không có Sentry thì bỏ qua
}

// QUAN TRỌNG: Dùng cách wrap này để tránh lỗi resolver + transformer
const finalConfig = withNativeWind(config, {
  input: './app/globals.css',
  configPath: './tailwind.config.js', // nếu em có file này
});

module.exports = finalConfig;