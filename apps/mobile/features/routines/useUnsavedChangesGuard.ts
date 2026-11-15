import { useNavigation, usePreventRemove } from '@react-navigation/native';
import { Alert } from 'react-native';

/**
 * 未保存の変更がある間、画面を離れる操作（戻るボタン・スワイプバック）を止めて確認を出す。
 */
export function useUnsavedChangesGuard(hasUnsavedChanges: boolean) {
  const navigation = useNavigation();

  usePreventRemove(hasUnsavedChanges, ({ data }) => {
    Alert.alert(
      '変更が保存されていません',
      '編集内容はまだ保存されていません。このまま戻ると変更は破棄されます。保存してから戻りますか？',
      [
        { text: '編集を続ける', style: 'cancel' },
        {
          text: '保存せずに戻る',
          style: 'destructive',
          onPress: () => navigation.dispatch(data.action),
        },
      ],
    );
  });
}
