import { readFileSync } from 'fs';
import { join } from 'path';

const SAMPLE_IOS_APP_ID = 'ca-app-pub-3940256099942544~1458002511';
const PROD_IOS_APP_ID = 'ca-app-pub-7353950256635107~1327738460';
const PROD_IOS_BANNER_UNIT_ID = 'ca-app-pub-7353950256635107/9627447610';

type PluginEntry = string | [string, Record<string, unknown>];

function loadConfig(appEnv: string | undefined) {
  const saved = process.env.APP_ENV;
  if (appEnv === undefined) delete process.env.APP_ENV;
  else process.env.APP_ENV = appEnv;
  try {
    let config: { expo: { plugins: PluginEntry[] } } | undefined;
    jest.isolateModules(() => {
      config = require('../app.config.js').default;
    });
    return config!;
  } finally {
    if (saved === undefined) delete process.env.APP_ENV;
    else process.env.APP_ENV = saved;
  }
}

function adsPluginOptions(appEnv: string | undefined) {
  const entry = loadConfig(appEnv).expo.plugins.find(
    (p): p is [string, Record<string, unknown>] => Array.isArray(p) && p[0] === 'react-native-google-mobile-ads'
  );
  if (!entry) throw new Error('広告 SDK のプラグインが設定されていません');
  return entry[1];
}

describe('app.config.js の広告設定', () => {
  it('開発・プレビューでは Google のサンプル App ID を使う', () => {
    expect(adsPluginOptions('development').iosAppId).toBe(SAMPLE_IOS_APP_ID);
    expect(adsPluginOptions(undefined).iosAppId).toBe(SAMPLE_IOS_APP_ID);
  });

  it('本番では運営者から提供された本番 App ID を使い、サンプル ID ではない', () => {
    const appId = adsPluginOptions('production').iosAppId;
    expect(appId).toBe(PROD_IOS_APP_ID);
    expect(appId).not.toBe(SAMPLE_IOS_APP_ID);
  });

  it('本番の設定を評価しても、広告用の環境変数がなくて例外を投げない（eas submit が評価するため）', () => {
    const saved = { ...process.env };
    delete process.env.ADMOB_IOS_APP_ID;
    delete process.env.EXPO_PUBLIC_ADMOB_IOS_BANNER_UNIT_ID;
    try {
      expect(() => loadConfig('production')).not.toThrow();
    } finally {
      process.env = saved;
    }
  });

  it('iOS の App ID が AdMob の形式（ca-app-pub-数字~数字）である', () => {
    for (const env of ['development', 'production']) {
      expect(adsPluginOptions(env).iosAppId).toMatch(/^ca-app-pub-\d+~\d+$/);
    }
  });

  it('ATT の説明文が日本語で設定されている', () => {
    for (const env of ['development', 'production']) {
      const description = adsPluginOptions(env).userTrackingUsageDescription;
      expect(typeof description).toBe('string');
      expect(description as string).toMatch(/[ぁ-んァ-ン一-龥]/);
    }
  });

  it('SKAdNetwork に Google の識別子が含まれ、重複や不正な形式がない', () => {
    const items = adsPluginOptions('production').skAdNetworkItems as string[];
    expect(items).toContain('cstr6suwn9.skadnetwork');
    expect(new Set(items).size).toBe(items.length);
    for (const id of items) expect(id).toMatch(/^[a-z0-9]+\.skadnetwork$/);
  });
});

describe('eas.json の広告設定', () => {
  const eas = JSON.parse(readFileSync(join(__dirname, '..', 'eas.json'), 'utf8')) as {
    build: Record<string, { env?: Record<string, string> }>;
  };

  it('本番のバナー広告ユニット ID が、本番 App ID と同じパブリッシャーの形式で設定されている', () => {
    const unitId = eas.build.production.env?.EXPO_PUBLIC_ADMOB_IOS_BANNER_UNIT_ID;
    expect(unitId).toBe(PROD_IOS_BANNER_UNIT_ID);
    expect(unitId).toMatch(/^ca-app-pub-\d+\/\d+$/);
    expect(unitId?.split('/')[0]).toBe(PROD_IOS_APP_ID.split('~')[0]);
  });

  it('本番だけが本番として扱われ、開発・プレビューには本番のユニット ID を渡さない', () => {
    expect(eas.build.production.env?.EXPO_PUBLIC_APP_ENV).toBe('production');
    for (const profile of ['development', 'preview']) {
      expect(eas.build[profile].env?.EXPO_PUBLIC_ADMOB_IOS_BANNER_UNIT_ID).toBeUndefined();
      expect(eas.build[profile].env?.EXPO_PUBLIC_APP_ENV).toBeUndefined();
    }
  });
});

describe('app.config.js のバージョン', () => {
  // App Store Connect で承認済みの最新バージョン。これ以下だと「前回承認済みより高くする必要がある」で提出が拒否される。
  // 新しいバージョンが承認されたら更新する
  const LAST_APPROVED_VERSION = '1.0.1';

  const parse = (v: string) => v.split('.').map(Number);
  const isHigher = (a: string, b: string) => {
    const [x, y] = [parse(a), parse(b)];
    for (let i = 0; i < 3; i++) if (x[i] !== y[i]) return x[i] > y[i];
    return false;
  };

  it('マーケティングバージョンが x.y.z 形式で、承認済みの最新バージョンより高い', () => {
    const version = (loadConfig('production').expo as unknown as { version: string }).version;
    expect(version).toMatch(/^\d+\.\d+\.\d+$/);
    expect(isHigher(version, LAST_APPROVED_VERSION)).toBe(true);
  });
});
