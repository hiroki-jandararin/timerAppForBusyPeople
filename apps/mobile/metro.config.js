const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');
const fs = require('fs');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');
const rootNodeModules = path.resolve(workspaceRoot, 'node_modules');
const mobileNodeModules = path.resolve(projectRoot, 'node_modules');

// mobile/node_modules にあるパッケージ名を列挙
function listPackages(dir) {
  try {
    return fs.readdirSync(dir)
      .filter((d) => !d.startsWith('.') && d !== '.bin')
      .flatMap((d) => {
        if (d.startsWith('@')) {
          try {
            return fs.readdirSync(path.join(dir, d)).map((sub) => `${d}/${sub}`);
          } catch {
            return [];
          }
        }
        return [d];
      });
  } catch {
    return [];
  }
}

const mobilePackages = new Set(listPackages(mobileNodeModules));

// mobile に同名パッケージがある場合、root 側をブロックする
const blockPatterns = [...mobilePackages].map((pkg) => {
  const escaped = path.join(rootNodeModules, pkg).replace(/[/\\]/g, '[/\\\\]');
  return new RegExp(`^${escaped}[\\/\\\\].*`);
});

const config = getDefaultConfig(projectRoot);

config.watchFolders = [workspaceRoot];

config.resolver.nodeModulesPaths = [
  mobileNodeModules,
  rootNodeModules,
];

config.resolver.blockList = blockPatterns;

module.exports = config;
