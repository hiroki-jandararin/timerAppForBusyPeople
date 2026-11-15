import { render } from '@testing-library/react-native';
import { AdsConsent, BannerAd, BannerAdSize, TestIds } from 'react-native-google-mobile-ads';
import mobileAds from 'react-native-google-mobile-ads';
import { getTrackingPermissionsAsync, PermissionStatus } from 'expo-tracking-transparency';
import { useFocusEffect } from 'expo-router';
import { Text } from 'react-native';

describe('広告まわりのテスト基盤', () => {
  it('広告 SDK のモックがネイティブに触れずに読み込める', async () => {
    expect(TestIds.BANNER).toEqual(expect.any(String));
    expect(BannerAdSize.ANCHORED_ADAPTIVE_BANNER).toEqual(expect.any(String));
    await expect(mobileAds().initialize()).resolves.toBeDefined();
    await expect(AdsConsent.gatherConsent()).resolves.toMatchObject({ canRequestAds: true });
  });

  it('BannerAd のモックが描画できる', () => {
    const { toJSON } = render(<BannerAd unitId={TestIds.BANNER} size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER} />);
    expect(toJSON()).not.toBeNull();
  });

  it('ATT のモックが未決定を返す', async () => {
    const result = await getTrackingPermissionsAsync();
    expect(result.status).toBe(PermissionStatus.UNDETERMINED);
  });

  it('expo-router のモックに画面フォーカスのフックがある', () => {
    const onFocus = jest.fn();
    function Probe() {
      useFocusEffect(onFocus);
      return <Text>probe</Text>;
    }
    render(<Probe />);
    expect(onFocus).toHaveBeenCalled();
  });
});
