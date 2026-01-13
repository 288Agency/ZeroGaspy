export interface FoodItem {
  id: string;
  name: string;
  expirationDate: string;
  quantity?: number;
  category?: string;
  imageUri?: string;
  status?: 'active' | 'consumed' | 'thrown';
  isOpened?: boolean;
  openedDate?: string;
  daysAfterOpening?: number;
}

export interface List {
  id: string;
  title: string;
  createdAt: string;
  items: FoodItem[];
  color?: string; // Couleur de la liste (hex)
}

// Couleurs disponibles pour les listes
export const LIST_COLORS = [
  { name: 'Vert', value: '#3C6E47' },
  { name: 'Bleu', value: '#3B82F6' },
  { name: 'Violet', value: '#8B5CF6' },
  { name: 'Rose', value: '#EC4899' },
  { name: 'Rouge', value: '#EF4444' },
  { name: 'Orange', value: '#F97316' },
  { name: 'Jaune', value: '#EAB308' },
  { name: 'Turquoise', value: '#14B8A6' },
  { name: 'Indigo', value: '#6366F1' },
  { name: 'Gris', value: '#6B7280' },
] as const;

export type Inventory = FoodItem[];

