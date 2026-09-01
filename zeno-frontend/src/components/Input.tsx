import React, { useState } from 'react';
import { Pressable, Text, TextInput, View, ViewStyle } from 'react-native';

interface InputProps {
  placeholder: string;
  value: string;
  onChangeText: (text: string) => void;
  secureTextEntry?: boolean;
  keyboardType?: 'default' | 'email-address' | 'numeric' | 'phone-pad';
  disabled?: boolean;
  error?: string;
  label?: string;
  style?: ViewStyle;
  className?: string;
}

export const Input: React.FC<InputProps> = ({
  placeholder,
  value,
  onChangeText,
  secureTextEntry = false,
  keyboardType = 'default',
  disabled = false,
  error,
  label,
  style,
  className,
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(!secureTextEntry);

  const wrapperClasses = ['mb-4 w-full', className ?? ''].filter(Boolean).join(' ');

  const inputClasses = [
    'flex-row items-center rounded-3xl border px-4 py-4 transition-colors',
    'bg-white dark:bg-black',
    error
      ? 'border-red-500'
      : isFocused
      ? 'border-black dark:border-white'
      : 'border-zinc-200 dark:border-zinc-800',
    disabled ? 'opacity-50' : '',
  ]
    .filter(Boolean)
    .join(' ');

  const labelClasses = 'mb-2 text-sm font-semibold text-black dark:text-white';
  const inputTextClasses = 'flex-1 py-0 text-base text-black dark:text-white';
  const errorClasses = 'mt-2 text-sm text-red-500';

  return (
    <View style={style} className={wrapperClasses}>
      {label && <Text className={labelClasses}>{label}</Text>}
      <View className={inputClasses}>
        <TextInput
          placeholder={placeholder}
          placeholderTextColor="#71717a"
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={secureTextEntry && !showPassword}
          keyboardType={keyboardType}
          editable={!disabled}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          className={inputTextClasses}
        />
        {secureTextEntry && (
          <Pressable onPress={() => setShowPassword(!showPassword)} className="px-2">
            <Text className="text-zinc-500 dark:text-zinc-400">
              {showPassword ? '👁' : '👁‍🗨'}
            </Text>
          </Pressable>
        )}
      </View>
      {error && <Text className={errorClasses}>{error}</Text>}
    </View>
  );
};
