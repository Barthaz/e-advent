const fs = require('fs');
const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

// Node and Expo disagree on the Windows drive-letter case (C: vs c:).
// The file map has to use the real path, and both spellings must be watched.
const projectRoot = fs.realpathSync(__dirname);
const monorepoRoot = path.resolve(projectRoot, '../..');

function bothDriveLetters(filePath) {
  if (process.platform !== 'win32' || !/^[A-Za-z]:[\\/]/.test(filePath)) return [filePath];
  const lower = filePath.replace(/^[A-Za-z]:/, (drive) => drive.toLowerCase());
  const upper = filePath.replace(/^[A-Za-z]:/, (drive) => drive.toUpperCase());
  return [...new Set([filePath, lower, upper])];
}

const config = getDefaultConfig(projectRoot);

config.watchFolders = [...new Set(bothDriveLetters(monorepoRoot))];
config.resolver.nodeModulesPaths = [
  ...(config.resolver.nodeModulesPaths ?? []),
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

function normalizeWinPath(filePath) {
  if (process.platform !== 'win32' || !/^[A-Za-z]:[\\/]/.test(filePath)) return filePath;
  return projectRoot.slice(0, 2) + filePath.slice(2);
}

const expoResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  moduleName = normalizeWinPath(moduleName);
  if (moduleName.startsWith('@e-advent/assets/')) {
    let relative = moduleName.slice('@e-advent/assets/'.length);
    if (relative === 'logo.png') relative = 'brand/eadvent-logo.png';
    if (relative.startsWith('files/')) relative = relative.slice(6);
    return context.resolveRequest(context, path.resolve(monorepoRoot, 'assets', relative), platform);
  }
  return expoResolveRequest ? expoResolveRequest(context, moduleName, platform) : context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
