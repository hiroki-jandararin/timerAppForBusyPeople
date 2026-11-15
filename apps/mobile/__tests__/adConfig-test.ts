import { resolveBannerUnitId } from '../features/ads/adConfig';

const TEST_UNIT_ID = 'ca-app-pub-3940256099942544/2934735716';
const PROD_UNIT_ID = 'ca-app-pub-1111111111111111/2222222222';

describe('resolveBannerUnitId', () => {
  it('本番で設定があれば、その ID を返す', () => {
    expect(
      resolveBannerUnitId({ isProduction: true, productionUnitId: PROD_UNIT_ID, testUnitId: TEST_UNIT_ID })
    ).toBe(PROD_UNIT_ID);
  });

  it('本番で未設定ならなし（null）を返す', () => {
    expect(
      resolveBannerUnitId({ isProduction: true, productionUnitId: undefined, testUnitId: TEST_UNIT_ID })
    ).toBeNull();
  });

  it('本番で空文字や空白だけならなし（null）を返す', () => {
    expect(resolveBannerUnitId({ isProduction: true, productionUnitId: '', testUnitId: TEST_UNIT_ID })).toBeNull();
    expect(resolveBannerUnitId({ isProduction: true, productionUnitId: '  ', testUnitId: TEST_UNIT_ID })).toBeNull();
  });

  it('本番以外では、本番 ID が渡されてもテスト ID を返す', () => {
    expect(
      resolveBannerUnitId({ isProduction: false, productionUnitId: PROD_UNIT_ID, testUnitId: TEST_UNIT_ID })
    ).toBe(TEST_UNIT_ID);
  });

  it('本番以外で本番 ID が未設定でもテスト ID を返す', () => {
    expect(
      resolveBannerUnitId({ isProduction: false, productionUnitId: undefined, testUnitId: TEST_UNIT_ID })
    ).toBe(TEST_UNIT_ID);
  });
});
