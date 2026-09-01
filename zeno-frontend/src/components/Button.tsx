import React from 'react';
import { ActivityIndicator, Pressable, Text, ViewStyle, TextStyle } from 'react-native';

interface ButtonProps {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: 'primary' | 'secondary';
  style?: ViewStyle;
  textStyle?: TextStyle;
  className?: string;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  disabled = false,
  loading = false,
  variant = 'primary',
  style,
  textStyle,
  className,
}) => {
  const isPrimary = variant === 'primary';
  const isDisabled = disabled || loading;

  const buttonClasses = [
    'min-h-14 flex-row items-center justify-center rounded-full px-4 py-4 active:opacity-80',
    isPrimary
      ? 'bg-black shadow-sm shadow-black/15 dark:bg-white dark:shadow-white/10'
      : 'border border-black bg-transparent dark:border-white',
    isDisabled ? 'opacity-40' : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');

  const textClasses = [
    'text-base font-semibold tracking-wide',
    isPrimary ? 'text-white dark:text-black' : 'text-black dark:text-white',
  ].join(' ');

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      className={buttonClasses}
      style={style}
    >
      {loading ? (
        <ActivityIndicator color={isPrimary ? '#FFFFFF' : '#000000'} />
      ) : (
        <Text style={textStyle} className={textClasses}>
          {title}
        </Text>
      )}
    </Pressable>
  );
};
