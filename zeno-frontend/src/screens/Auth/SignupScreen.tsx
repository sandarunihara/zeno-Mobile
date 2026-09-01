import React, { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { useAuth } from '../../store/AuthContext';

type Props = NativeStackScreenProps<any, 'Signup'>;

const SignupScreen: React.FC<Props> = ({ navigation }) => {
  const { signup } = useAuth();
  const [fname, setFname] = useState('');
  const [lname, setLname] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{
    fname?: string;
    lname?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
  }>({});

  const validateForm = () => {
    const newErrors: {
      fname?: string;
      lname?: string;
      email?: string;
      password?: string;
      confirmPassword?: string;
    } = {};

    if (!fname.trim()) {
      newErrors.fname = 'First name is required';
    }

    if (!lname.trim()) {
      newErrors.lname = 'Last name is required';
    }

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

    if (!confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSignup = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      await signup(fname, lname, email, password);
    } catch (error: any) {
      Alert.alert('Signup Failed', error.response?.data?.message || 'An error occurred during signup');
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
          contentContainerClassName="flex-grow px-6 py-8"
        >
          <View className="flex-1 justify-between">
            <View className="pt-6">
              <View className="mb-8 mx-auto self-start rounded-full border border-zinc-200 bg-white px-4 py-2 dark:border-zinc-800 dark:bg-black">
                <Text className="text-xs font-semibold uppercase tracking-[0.24em] text-zinc-500 dark:text-zinc-400">
                  Zeno
                </Text>
              </View>

              <Text className="text-4xl mx-auto font-bold tracking-tight text-black dark:text-white">
                Create Account
              </Text>
              <Text className="mt-3 max-w-[320px] mx-auto text-base leading-6 text-zinc-500 dark:text-zinc-400">
                Join Zeno Today
              </Text>

              <View className="mt-10 rounded-[32px]  bg-white pt-5 dark:bg-black">
                <View className="flex-row gap-3">
                  <View className="flex-1">
                    <Input
                      placeholder="First name"
                      value={fname}
                      onChangeText={setFname}
                      error={errors.fname}
                    />
                  </View>
                  <View className="flex-1">
                    <Input
                      placeholder="Last name"
                      value={lname}
                      onChangeText={setLname}
                      error={errors.lname}
                    />
                  </View>
                </View>

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

                <Input
                  placeholder="Confirm Password"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry
                  error={errors.confirmPassword}
                />
              </View>

              <Button
                title="Create Account"
                onPress={handleSignup}
                loading={loading}
                variant="primary"
                className="mt-6 bg-[#007AFF] font-bold"
              />
            </View>

            <View className="mt-8 flex-row items-center justify-center gap-1 pb-4">
              <Text className="text-sm text-zinc-500 dark:text-zinc-400">Already have an account?</Text>
              <Text
                className="text-sm font-semibold text-black dark:text-white"
                onPress={() => navigation.goBack()}
              >
                Sign In
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default SignupScreen;
