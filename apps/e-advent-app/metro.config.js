const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

// Expo resolves some polyfills through file URLs, which normalize Windows drive
// letters to lowercase. Metro's file map needs the same root spelling.
const projectRoot = process.platform === 'win32'
  ? __dirname.replace(/^[A-Z]:/, drive => drive.toLowerCase())
  : __dirname;
const monorepoRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

config.watchFolders = [monorepoRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
];
config.resolver.disableHierarchicalLookup = false;
config.resolver.extraNodeModules = {
  '@e-advent/special-core': path.resolve(monorepoRoot, 'packages/special-core'),
  '@e-advent/types': path.resolve(monorepoRoot, 'packages/types'),
  '@e-advent/assets': path.resolve(monorepoRoot, 'packages/assets'),
  'expo-file-system': path.resolve(projectRoot, 'node_modules/expo-file-system'),
  'expo-sharing': path.resolve(projectRoot, 'node_modules/expo-sharing'),
};

const expoResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName.startsWith('@e-advent/assets/')) {
    let relative = moduleName.slice('@e-advent/assets/'.length);
    if (relative === 'logo.png') relative = 'brand/eadvent-logo.png';
    if (relative.startsWith('files/')) relative = relative.slice(6);
    return context.resolveRequest(context, path.resolve(monorepoRoot, 'assets', relative), platform);
  }
  return expoResolveRequest ? expoResolveRequest(context, moduleName, platform) : context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
