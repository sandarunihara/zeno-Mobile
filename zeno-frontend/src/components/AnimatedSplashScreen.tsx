import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming, 
  withSpring,
  withDelay,
  runOnJS
} from 'react-native-reanimated';
import * as SplashScreen from 'expo-splash-screen';

interface AnimatedSplashScreenProps {
  onAnimationComplete: () => void;
}

export default function AnimatedSplashScreen({ onAnimationComplete }: AnimatedSplashScreenProps) {
  const opacity = useSharedValue(1);
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      opacity: opacity.value,
      transform: [{ scale: scale.value }],
    };
  });

  useEffect(() => {
    // Hide the native splash screen
    SplashScreen.hideAsync().then(() => {
      // Start the animation sequence
      // Pop effect
      scale.value = withSpring(1.2, { damping: 10, stiffness: 100 });
      
      // Fade out after a small delay
      opacity.value = withDelay(
        1500,
        withTiming(0, { duration: 1500 }, (finished) => {
          if (finished) {
            runOnJS(onAnimationComplete)();
          }
        })
      );
    });
  }, [opacity, scale, onAnimationComplete]);

  return (
    <View style={styles.container}>
      <Animated.Image
        source={require('../assests/logo.png')} 
        style={[styles.logo, animatedStyle]}
        resizeMode="contain"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF', // Assuming splash screen background is white
  },
  logo: {
    width: 200,
    height: 200,
  },
});
