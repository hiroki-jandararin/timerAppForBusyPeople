import { configure } from '@testing-library/react-native';

// CI（低スペック・全スイート並列）では初回描画が遅れ、findBy* の既定1秒でタイムアウトすることがあるため延長する
configure({ asyncUtilTimeout: 5000 });

jest.mock('react-native-reanimated', () => require('react-native-reanimated/mock'));

jest.mock('react-native-gesture-handler', () => {
  const { View } = require('react-native');
  return {
    GestureHandlerRootView: View,
    PanGestureHandler: View,
    Swipeable: View,
    State: {},
  };
});

jest.mock('react-native-gesture-handler/Swipeable', () => {
  const React = require('react');
  const { View } = require('react-native');
  const Swipeable = React.forwardRef(({ children }: any, _ref: any) =>
    React.createElement(View, null, children)
  );
  Swipeable.displayName = 'Swipeable';
  return { __esModule: true, default: Swipeable };
});

jest.mock('react-native-draggable-flatlist', () => {
  const React = require('react');
  const { ScrollView, View } = require('react-native');
  // テストからドラッグ操作を再現できるよう、drag と onDragEnd を公開する
  const mockDrag = jest.fn();
  (globalThis as any).__mockDrag = mockDrag;
  const DraggableFlatList = ({ data, renderItem, ListHeaderComponent, ListFooterComponent, keyExtractor, contentContainerStyle, onDragEnd }: any) => {
    (globalThis as any).__mockOnDragEnd = onDragEnd;
    return React.createElement(
      ScrollView,
      { contentContainerStyle },
      ListHeaderComponent ? (React.isValidElement(ListHeaderComponent) ? ListHeaderComponent : React.createElement(ListHeaderComponent)) : null,
      ...data.map((item: any, index: number) =>
        React.createElement(View, { key: keyExtractor ? keyExtractor(item) : index },
          renderItem({ item, index, drag: mockDrag, isActive: false })
        )
      ),
      ListFooterComponent ? (React.isValidElement(ListFooterComponent) ? ListFooterComponent : React.createElement(ListFooterComponent)) : null,
    );
  };
  return {
    __esModule: true,
    default: DraggableFlatList,
    ScaleDecorator: ({ children }: any) => children,
  };
});

// jest の react-native モックでは AppState.currentState が文字列ではないため、テストでは前面（active）を既定にする
(require('react-native').AppState as { currentState: string }).currentState = 'active';

// View.measure does not call its callback in Jest — mock it to immediately invoke with zeros
const { View } = require('react-native');
const originalMeasure = View.prototype.measure;
View.prototype.measure = function (callback: (...args: number[]) => void) {
  if (typeof callback === 'function') callback(0, 0, 0, 0, 0, 0);
  else if (originalMeasure) originalMeasure.call(this, callback);
};

jest.mock('expo-router', () => {
  const React = require('react');
  return {
    useRouter: () => ({
      push: jest.fn(),
      back: jest.fn(),
      replace: jest.fn(),
    }),
    useLocalSearchParams: () => ({}),
    // テストでは画面は常にフォーカス済みとして、マウント時にコールバックを1回呼ぶ
    useFocusEffect: (callback: () => void | (() => void)) => {
      React.useEffect(callback, []);
    },
    Link: 'Link',
    Stack: { Screen: 'Screen' },
  };
});

// 広告 SDK はネイティブモジュールを要求するため、テストでは通信もネイティブ呼び出しもしないモックに差し替える
jest.mock('react-native-google-mobile-ads', () => {
  const React = require('react');
  const { View } = require('react-native');
  const mobileAds = () => ({
    initialize: jest.fn().mockResolvedValue([]),
    setRequestConfiguration: jest.fn().mockResolvedValue(undefined),
    setAppMuted: jest.fn(),
    setAppVolume: jest.fn(),
  });
  return {
    __esModule: true,
    default: mobileAds,
    BannerAd: (props: Record<string, unknown>) => React.createElement(View, { testID: 'mock-banner-ad', ...props }),
    BannerAdSize: {
      ANCHORED_ADAPTIVE_BANNER: 'ANCHORED_ADAPTIVE_BANNER',
      LARGE_ANCHORED_ADAPTIVE_BANNER: 'LARGE_ANCHORED_ADAPTIVE_BANNER',
    },
    TestIds: { BANNER: 'ca-app-pub-3940256099942544/2934735716' },
    AdsConsent: {
      gatherConsent: jest.fn().mockResolvedValue({ canRequestAds: true, status: 'NOT_REQUIRED' }),
      requestInfoUpdate: jest.fn().mockResolvedValue({ canRequestAds: true, status: 'NOT_REQUIRED' }),
    },
  };
});

jest.mock('expo-tracking-transparency', () => ({
  PermissionStatus: { UNDETERMINED: 'undetermined', GRANTED: 'granted', DENIED: 'denied' },
  getTrackingPermissionsAsync: jest.fn().mockResolvedValue({ status: 'undetermined', granted: false, canAskAgain: true }),
  requestTrackingPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted', granted: true, canAskAgain: true }),
}));
