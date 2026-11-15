import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

// 現在の画面がフォーカスされているか。Stack では遷移元の画面がマウントされたまま残るため、
// マウント状態ではなくフォーカス状態で広告の読み込みを制御する
export function useScreenFocus(): boolean {
  const [focused, setFocused] = useState(false);
  useFocusEffect(
    useCallback(() => {
      setFocused(true);
      return () => setFocused(false);
    }, [])
  );
  return focused;
}
