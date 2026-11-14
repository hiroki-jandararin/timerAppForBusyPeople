const path = require('path');

// パッケージのディレクトリを解決する。
// ローカルでは apps/mobile/node_modules、CI(npm ci) では巻き上げられた root の node_modules に
// インストールされるため、固定パスではなく Node の解決に任せる。
const pkgDir = (name, from) =>
  path.dirname(require.resolve(`${name}/package.json`, from ? { paths: [from] } : undefined));

const reactDir = pkgDir('react');
const expoDir = pkgDir('expo');
const expoModulesCoreDir = pkgDir('expo-modules-core', expoDir);

module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEnv: ['./jest-setup.ts'],
  moduleNameMapper: {
    '^react$': reactDir,
    '^react/(.*)$': `${reactDir}/$1`,
    '^expo$': expoDir,
    '^expo/(.*)$': `${expoDir}/$1`,
    '^expo-modules-core$': expoModulesCoreDir,
    '^expo-modules-core/(.*)$': `${expoModulesCoreDir}/$1`,
  },
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|react-native-reanimated|react-native-gesture-handler|react-native-draggable-flatlist|react-native-worklets|@timeapp/.*)',
  ],
};
