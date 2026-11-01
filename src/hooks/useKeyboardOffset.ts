import { useState, useEffect } from 'react';
import { Keyboard, Platform, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export const useKeyboardOffset = () => {
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const windowHeight = Dimensions.get('window').height;
  const insets = useSafeAreaInsets();

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, (e) => {
      setKeyboardHeight(e.endCoordinates?.height || 0);
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const maxModalHeight =
    keyboardHeight > 0
      ? Math.max(260, windowHeight - keyboardHeight - 28)
      : Math.max(300, windowHeight - insets.top - 20);

  // Espaçamento de segurança inferior para botões de ação e barra de navegação virtual do Android
  const bottomInset = insets.bottom > 0 ? insets.bottom : Platform.OS === 'android' ? 18 : 10;
  const bottomPadding = keyboardHeight > 0 ? 0 : bottomInset;

  return { keyboardHeight, maxModalHeight, bottomInset, bottomPadding };
};
