const { withNativeWind } = require("nativewind/metro");
const { getDefaultConfig } = require("expo/metro-config");
const { getSentryExpoConfig } = require("@sentry/react-native/metro");

let config = getDefaultConfig(__dirname);

config = getSentryExpoConfig(__dirname, config);

config = withNativeWind(config, {
  input: "./app/globals.css",
});

module.exports = config;
