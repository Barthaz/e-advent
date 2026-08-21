const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

config.watchFolders = [monorepoRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
];
config.resolver.disableHierarchicalLookup = true;
config.resolver.extraNodeModules = {
  '@e-advent/special-core': path.resolve(monorepoRoot, 'packages/special-core'),
  '@e-advent/types': path.resolve(monorepoRoot, 'packages/types'),
  '@e-advent/assets': path.resolve(monorepoRoot, 'packages/assets'),
  'expo-file-system': path.resolve(projectRoot, 'node_modules/expo-file-system'),
  'expo-sharing': path.resolve(projectRoot, 'node_modules/expo-sharing'),
};

module.exports = config;
