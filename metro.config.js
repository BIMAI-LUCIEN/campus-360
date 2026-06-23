const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

config.resolver.blockList = [
  /admin-app[\/\\]\.next[\/\\].*/,
  /admin-app[\/\\].*\.sqlite.*/,
];

module.exports = config;
