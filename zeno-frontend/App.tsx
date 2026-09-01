import 'react-native-reanimated';
import './global.css';

import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import {
  DarkTheme,
  DefaultTheme,
  NavigationContainer,
  createNavigationContainerRef,
} from '@react-navigation/native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AuthProvider } from './src/store/AuthContext';
import { ThemeProvider, useTheme } from './src/theme/ThemeContext';
import AppNavigator from './src/navigation/AppNavigator';
import * as SplashScreen from 'expo-splash-screen';
import AnimatedSplashScreen from './src/components/AnimatedSplashScreen';

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

// Persistent navigation ref — lets us navigate from outside components if needed.
export const navigationRef = createNavigationContainerRef();

/**
 * Wraps children in NavigationContainer with the themed config.
 * Placed ABOVE AuthProvider so the navigation context is never disrupted
 * by auth-state re-renders (e.g. DeviceEventEmitter 'auth:logout').
 */
const NavigationWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { theme, isDark } = useTheme();

  const navigationTheme = useMemo(
    () => ({
      ...(isDark ? DarkTheme : DefaultTheme),
      colors: {
        ...(isDark ? DarkTheme.colors : DefaultTheme.colors),
        background: theme.background,
        card: theme.background,
        text: theme.text,
        border: theme.border,
        primary: '#5E5CE6',
      },
    }),
    [isDark, theme.background, theme.border, theme.text]
  );

  return (
    <NavigationContainer ref={navigationRef} theme={navigationTheme}>
      {children}
    </NavigationContainer>
  );
};

/** App content rendered inside both NavigationContainer and AuthProvider. */
const AppContent: React.FC = () => {
  const [isSplashAnimationComplete, setAnimationComplete] = React.useState(false);

  return (
    <View style={styles.root}>
      <AppNavigator />

      {/* Splash screen renders as an absolute overlay on top of the navigator */}
      {!isSplashAnimationComplete && (
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          <AnimatedSplashScreen
            onAnimationComplete={() => setAnimationComplete(true)}
          />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <NavigationWrapper>
            <AuthProvider>
              <AppContent />
            </AuthProvider>
          </NavigationWrapper>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

