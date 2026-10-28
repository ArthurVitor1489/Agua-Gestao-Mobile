import { useState, useEffect } from 'react';
import { Keyboard, Platform, Dimensions } from 'react-native';

export const useKeyboardOffset = () => {
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const windowHeight = Dimensions.get('window').height;

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
    keyboardHeight > 0 ? Math.max(260, windowHeight - keyboardHeight - 28) : undefined;

  return { keyboardHeight, maxModalHeight };
};
