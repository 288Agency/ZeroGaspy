import React from 'react';
import { View, Text } from 'react-native';
import { cn } from '../utils/cn';

interface IndicatorBadgeProps {
  count: number;
  variant?: 'warning' | 'danger' | 'info';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export default function IndicatorBadge({
  count,
  variant = 'warning',
  size = 'md',
  className,
}: IndicatorBadgeProps) {
  if (count === 0) return null;

  const variantStyles = {
    warning: 'bg-warning-500 dark:bg-warning-600',
    danger: 'bg-accent-500 dark:bg-accent-600',
    info: 'bg-[#3C6E47] dark:bg-[#3C6E47]',
  };

  const sizeStyles = {
    sm: 'min-w-[18px] h-[18px] px-1.5',
    md: 'min-w-[22px] h-[22px] px-2',
    lg: 'min-w-[28px] h-[28px] px-2.5',
  };

  const textSizeStyles = {
    sm: 'text-[10px]',
    md: 'text-xs',
    lg: 'text-sm',
  };

  return (
    <View
      className={cn(
        'rounded-full items-center justify-center',
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
      accessible={true}
      accessibilityLabel={`${count} élément${count > 1 ? 's' : ''} nécessitant attention`}
      accessibilityRole="text"
    >
      <Text
        className={cn(
          'text-white font-bold',
          textSizeStyles[size]
        )}
      >
        {count > 99 ? '99+' : count}
      </Text>
    </View>
  );
}


