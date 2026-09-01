import React from 'react';
import { Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Button } from '../../components/Button';
import { SafeAreaView } from 'react-native-safe-area-context';

type Props = NativeStackScreenProps<any, 'Onboarding3'>;

const OnboardingScreen3: React.FC<Props> = ({ navigation }) => {
  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-black">
      <View className="flex-1 justify-between px-6 py-8">
        <View className="flex-1 justify-center">
          <View className="mb-10 self-start rounded-full border border-zinc-200 bg-white px-4 py-2 dark:border-zinc-800 dark:bg-black">
            <Text className="text-xs font-semibold uppercase tracking-[0.24em] text-zinc-500 dark:text-zinc-400">
              03 / 04
            </Text>
          </View>

          <Text className="text-5xl font-bold tracking-tight text-black dark:text-white">
            Built for speed
          </Text>
          <Text className="mt-4 max-w-[320px] text-base leading-7 text-zinc-500 dark:text-zinc-400">
            Smooth transitions and a minimal layout keep the experience calm and fast.
          </Text>

          <View className="mt-12 h-56 items-center justify-center rounded-[40px] border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-black">
            <Text className="text-7xl">⚡</Text>
          </View>
        </View>

        <View className="flex-row gap-3">
          <Button title="Back" onPress={() => navigation.goBack()} variant="secondary" className="flex-1" />
          <Button title="Next" onPress={() => navigation.navigate('Onboarding4')} variant="primary" className="flex-1" />
        </View>
      </View>
    </SafeAreaView>
  );
};

export default OnboardingScreen3;
