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
  price?: number; // Prix estimé en euros (pour calcul économies)
  consumedAt?: string; // Date de consommation/jet (ISO)
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

// ============================================
// STATISTIQUES UTILISATEUR
// ============================================

export interface UserStats {
  // Économies
  totalSaved: number;           // € économisés (aliments consommés)
  totalWasted: number;          // € gaspillés (aliments jetés)
  netSavings: number;           // totalSaved - totalWasted

  // Impact environnemental
  foodSavedKg: number;          // kg de nourriture sauvée
  foodWastedKg: number;         // kg de nourriture jetée
  co2AvoidedKg: number;         // kg CO2 évités

  // Activité
  itemsConsumed: number;        // Nombre d'aliments consommés
  itemsThrown: number;          // Nombre d'aliments jetés
  itemsActive: number;          // Nombre d'aliments actuellement suivis
  recipesUsed: number;          // Nombre de recettes utilisées (à implémenter plus tard)

  // Séries
  currentStreak: number;        // Jours consécutifs sans gaspillage
  longestStreak: number;        // Record de jours sans gaspillage
  lastActivityDate?: string;    // Date de dernière activité (ISO)

  // Période
  periodStart: string;          // Date de début de tracking (ISO)
  periodEnd: string;            // Date de fin (pour stats périodiques, ISO)
}

export interface DailyStats {
  date: string;                 // Date (YYYY-MM-DD)
  saved: number;                // € économisés ce jour
  wasted: number;               // € gaspillés ce jour
  itemsConsumed: number;
  itemsThrown: number;
}

export interface MonthlyStats {
  month: string;                // Format YYYY-MM
  saved: number;
  wasted: number;
  itemsConsumed: number;
  itemsThrown: number;
  co2Avoided: number;
  foodSavedKg: number;
}

