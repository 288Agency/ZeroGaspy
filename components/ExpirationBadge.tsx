import React from 'react';
import { View, Text } from 'react-native';
import { cn } from '../utils/cn';

interface ExpirationBadgeProps {
  expirationDate: string;
  className?: string;
}

export default function ExpirationBadge({
  expirationDate,
  className,
}: ExpirationBadgeProps) {
  const getDaysUntilExpiration = (dateString: string): number | null => {
    try {
      const [day, month, year] = dateString.split('/').map(Number);
      const expiration = new Date(year, month - 1, day);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      expiration.setHours(0, 0, 0, 0);
      
      const diffTime = expiration.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      return diffDays;
    } catch {
      return null;
    }
  };

  const days = getDaysUntilExpiration(expirationDate);

  const getBadgeStyle = () => {
    if (days === null) {
      return 'bg-gray-200';
    }
    if (days < 0) {
      return 'bg-accent-500';
    }
    if (days <= 3) {
      return 'bg-accent-400';
    }
    if (days <= 7) {
      return 'bg-warning-400';
    }
    return 'bg-success-400';
  };

  const getTextStyle = () => {
    if (days === null) {
      return 'text-gray-700';
    }
    if (days <= 7) {
      return 'text-white';
    }
    return 'text-white';
  };

  const getLabel = () => {
    if (days === null) {
      return 'Date invalide';
    }
    if (days < 0) {
      return `Expiré (${Math.abs(days)}j)`;
    }
    if (days === 0) {
      return 'Expire aujourd\'hui';
    }
    if (days === 1) {
      return 'Expire demain';
    }
    if (days <= 7) {
      return `${days} jours`;
    }
    return expirationDate;
  };

  return (
    <View
      className={cn(
        'px-3 py-1 rounded-full',
        getBadgeStyle(),
        className
      )}
    >
      <Text
        className={cn(
          'text-xs font-semibold',
          getTextStyle()
        )}
      >
        {getLabel()}
      </Text>
    </View>
  );
}


