const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname, {
  // [Web-only]: Enable CSS support in Metro.
  isCSSEnabled: true,
});

module.exports = config;
