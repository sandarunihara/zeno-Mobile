import React from 'react';
import { Pressable, Text, View, Platform } from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Home, User, Ghost, Heart } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';

const ACTIVE_COLOR = '#007AFF'; // iOS System Blue

export const BottomNavigation: React.FC<BottomTabBarProps> = ({
  state,
  navigation,
}) => {
  const { isDark } = useTheme();
  const insets = useSafeAreaInsets();
  
  // Standard iOS tab bar height is usually ~49 points (excluding the bottom home indicator area)
  // We add a little extra padding for comfortable tapping
  const bottomPadding = Math.max(insets.bottom, Platform.OS === 'ios' ? 0 : 12);

  return (
    <View 
      className="flex-row border-t border-zinc-200 bg-white dark:border-zinc-800 dark:bg-black"
      style={{ paddingBottom: bottomPadding, paddingTop: 6 }}
    >
      {state.routes.map((route, index) => {
        const isFocused = state.index === index;
        const Icon =
          route.name === 'Dashboard'
            ? Home
            : route.name === 'Health'
            ? Heart
            : route.name === 'Ghostbuster'
            ? Ghost
            : User;
        
        return (
          <Pressable
            key={route.key}
            onPress={() => {
              const event = navigation.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              });

              if (!isFocused && !event.defaultPrevented) {
                navigation.navigate(route.name);
              }
            }}
            className="flex-1 items-center justify-center py-1"
            hitSlop={8}
            android_ripple={{ color: isDark ? '#2C2C2E' : '#E5E5EA', borderless: true, radius: 40 }}
          >
            <View className="items-center justify-center h-8 mb-0.5">
              <Icon
                size={24}
                color={isFocused ? ACTIVE_COLOR : isDark ? '#8E8E93' : '#999999'}
                strokeWidth={isFocused ? 2.5 : 2}
              />
            </View>
            <Text
              className={[
                'text-[10px] font-medium tracking-wide',
                isFocused ? 'text-[#007AFF]' : 'text-[#999999] dark:text-[#8E8E93]',
              ].join(' ')}
            >
              {route.name === 'Dashboard'
                ? 'Home'
                : route.name === 'Health'
                ? 'Health'
                : route.name === 'Ghostbuster'
                ? 'Ghostbuster'
                : 'Profile'}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
};
