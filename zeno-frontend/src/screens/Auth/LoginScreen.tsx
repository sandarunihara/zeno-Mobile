import React, { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { useAuth } from '../../store/AuthContext';

type Props = NativeStackScreenProps<any, 'Login'>;

const LoginScreen: React.FC<Props> = ({ navigation }) => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  const validateForm = () => {
    const newErrors: { email?: string; password?: string } = {};

    if (!email) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = 'Please enter a valid email';
    }

    if (!password) {
      newErrors.password = 'Password is required';
    } else if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      await login(email, password);
    } catch (error: any) {
      Alert.alert('Login Failed', error.response?.data?.message || 'An error occurred during login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-black">
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1">
        <ScrollView
          showsVerticalScrollIndicator={false}
          className="flex-1"
          contentContainerClassName="flex-grow px-8 py-8"
        >
          <View className="flex-1 justify-between">
            <View className="pt-6">
              <View className="mb-8 mx-auto self-start rounded-full border border-zinc-200 bg-white px-4 py-2 dark:border-zinc-800 dark:bg-black">
                <Text className="text-xs font-semibold uppercase tracking-[0.24em] text-zinc-500 dark:text-zinc-400">
                  Zeno
                </Text>
              </View>

              <Text className="text-4xl font-bold mx-auto tracking-tight text-black dark:text-white">
                Welcome Back.
              </Text>
              <Text className="mt-3 max-w-[320px] mx-auto text-base leading-6 text-zinc-500 dark:text-zinc-400">
                Sign in to Zeno
              </Text>

              <View className="mt-10 rounded-[32px] bg-white pt-5  dark:bg-black ">
                <Input
                  placeholder="Email"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  error={errors.email}
                />

                <Input
                  placeholder="Password"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  error={errors.password}
                />
              </View>
              <Text className="text-sm text-right text-[#007AFF]">Forgot Password?</Text>

              <Button
                title="Login"
                onPress={handleLogin}
                loading={loading}
                variant="primary"
                className="mt-6  bg-[#007AFF] font-bold"
              />
            </View>

            <View className="mt-8 flex-row items-center justify-center gap-1 pb-4">
              <Text className="text-sm text-zinc-500 dark:text-zinc-400">Don't have an account?</Text>
              <Text
                className="text-sm font-semibold text-black dark:text-white"
                onPress={() => navigation.navigate('Signup')}
              >
                Sign Up
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default LoginScreen;
