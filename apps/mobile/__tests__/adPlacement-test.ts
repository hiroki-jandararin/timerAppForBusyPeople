import { readdirSync, readFileSync, statSync } from 'fs';
import { join, relative } from 'path';

const APP_DIR = join(__dirname, '..', 'app');

function listSourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return listSourceFiles(path);
    return /\.(ts|tsx)$/.test(name) ? [path] : [];
  });
}

// バナー広告を置いてよい画面。画面を追加したときの既定は「広告なし」なので、増やすときはこの一覧と要件を見直す
const ALLOWED_SCREENS = ['(app)/account.tsx', '(app)/history.tsx', '(app)/routines/index.tsx'];

describe('バナー広告を置く画面', () => {
  it('ルーティン一覧・履歴・アカウントの3画面だけが AdBanner を使う', () => {
    const using = listSourceFiles(APP_DIR)
      .filter((file) => readFileSync(file, 'utf8').includes('features/ads/AdBanner'))
      .map((file) => relative(APP_DIR, file))
      .sort();
    expect(using).toEqual([...ALLOWED_SCREENS].sort());
  });

  it('タイマー、作成・編集、テンプレート、作成方法、AI 生成、サインイン、認証コールバックでは広告 SDK を直接使わない', () => {
    const offenders = listSourceFiles(APP_DIR)
      .filter((file) => readFileSync(file, 'utf8').includes('react-native-google-mobile-ads'))
      .map((file) => relative(APP_DIR, file));
    expect(offenders).toEqual([]);
  });
});
