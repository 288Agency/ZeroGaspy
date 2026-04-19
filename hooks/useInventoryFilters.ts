import { useMemo, useState } from 'react';
import { FoodItem, List } from '../types';
import { getDaysUntilExpiration } from '../utils/dateUtils';

export type ExpirationFilter = 'expired' | 'today' | 'soon' | 'week' | 'fresh';

function matchesExpiration(item: FoodItem, filter: string): boolean {
  const days = getDaysUntilExpiration(item.expirationDate);

  switch (filter) {
    case 'expired':
      return days !== null && days < 0;
    case 'today':
      return days !== null && days === 0;
    case 'soon':
      return days !== null && days >= 0 && days <= 3;
    case 'week':
      return days !== null && days >= 0 && days <= 7;
    case 'fresh':
      return days === null || days > 7;
    default:
      return true;
  }
}

export function useInventoryFilters(list: List | null) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedExpirationFilter, setSelectedExpirationFilter] = useState<string | null>(null);

  const activeItems = useMemo(() => {
    if (!list) return [];
    return list.items.filter(
      (item) => item.status !== 'consumed' && item.status !== 'thrown'
    );
  }, [list]);

  const availableCategories = useMemo(() => {
    const categories = new Set<string>();
    activeItems.forEach((item) => {
      if (item.category) categories.add(item.category);
    });
    return Array.from(categories).sort();
  }, [activeItems]);

  const filteredItems = useMemo(() => {
    let items = activeItems;

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      items = items.filter((item) => {
        const nameMatch = item.name.toLowerCase().includes(query);
        const categoryMatch = item.category?.toLowerCase().includes(query);
        return nameMatch || categoryMatch;
      });
    }

    if (selectedCategory) {
      items = items.filter((item) => item.category === selectedCategory);
    }

    if (selectedExpirationFilter) {
      items = items.filter((item) => matchesExpiration(item, selectedExpirationFilter));
    }

    return items;
  }, [activeItems, searchQuery, selectedCategory, selectedExpirationFilter]);

  return {
    searchQuery,
    setSearchQuery,
    selectedCategory,
    setSelectedCategory,
    selectedExpirationFilter,
    setSelectedExpirationFilter,
    activeItems,
    availableCategories,
    filteredItems,
  };
}
