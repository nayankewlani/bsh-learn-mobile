import { Animated } from "react-native";

export const tabBarY = new Animated.Value(0);
let _hidden = false;

export const showTabBar = () => {
  if (!_hidden) return;
  _hidden = false;
  Animated.spring(tabBarY, { toValue: 0, tension: 80, friction: 10, useNativeDriver: true }).start();
};

export const hideTabBar = () => {
  if (_hidden) return;
  _hidden = true;
  Animated.timing(tabBarY, { toValue: 120, duration: 220, useNativeDriver: true }).start();
};
