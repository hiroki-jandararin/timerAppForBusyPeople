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
  const DraggableFlatList = ({ data, renderItem, ListHeaderComponent, ListFooterComponent, keyExtractor, contentContainerStyle }: any) => {
    return React.createElement(
      ScrollView,
      { contentContainerStyle },
      ListHeaderComponent ? (React.isValidElement(ListHeaderComponent) ? ListHeaderComponent : React.createElement(ListHeaderComponent)) : null,
      ...data.map((item: any, index: number) =>
        React.createElement(View, { key: keyExtractor ? keyExtractor(item) : index },
          renderItem({ item, index, drag: jest.fn(), isActive: false })
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

// View.measure does not call its callback in Jest — mock it to immediately invoke with zeros
const { View } = require('react-native');
const originalMeasure = View.prototype.measure;
View.prototype.measure = function (callback: (...args: number[]) => void) {
  if (typeof callback === 'function') callback(0, 0, 0, 0, 0, 0);
  else if (originalMeasure) originalMeasure.call(this, callback);
};

jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    back: jest.fn(),
    replace: jest.fn(),
  }),
  useLocalSearchParams: () => ({}),
  Link: 'Link',
  Stack: { Screen: 'Screen' },
}));
