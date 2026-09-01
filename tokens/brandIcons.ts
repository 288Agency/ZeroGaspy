/**
 * Banque d'icônes ZeroGaspy — Brand Bible §06 (famille Phosphor).
 *
 * Règle : les icônes UI produit passent par `BrandIcon` + ces clés sémantiques.
 * Ne pas mélanger Ionicons / SF Symbols pour les nouveaux écrans DS v2.
 */
import {
  Barcode,
  BookOpen,
  CalendarBlank,
  Camera,
  CaretDown,
  CaretRight,
  ChartBar,
  Check,
  CheckCircle,
  Clock,
  CookingPot,
  CurrencyEur,
  Flame,
  Funnel,
  Info,
  ListBullets,
  MagnifyingGlass,
  Package,
  Plus,
  Receipt,
  Scales,
  SlidersHorizontal,
  Snowflake,
  Trash,
  Trophy,
  User,
  Warning,
  WarningCircle,
} from 'phosphor-react-native';
import type { Icon } from 'phosphor-react-native';

export const BRAND_ICONS = {
  add: Plus,
  barcode: Barcode,
  book: BookOpen,
  calendar: CalendarBlank,
  camera: Camera,
  chart: ChartBar,
  check: Check,
  checkCircle: CheckCircle,
  chevronDown: CaretDown,
  chevronRight: CaretRight,
  clock: Clock,
  cook: CookingPot,
  euro: CurrencyEur,
  flame: Flame,
  food: Package,
  filter: Funnel,
  fridge: Snowflake,
  info: Info,
  list: ListBullets,
  receipt: Receipt,
  scales: Scales,
  search: MagnifyingGlass,
  sliders: SlidersHorizontal,
  trash: Trash,
  trophy: Trophy,
  user: User,
  warning: Warning,
  warningCircle: WarningCircle,
} as const satisfies Record<string, Icon>;

export type BrandIconName = keyof typeof BRAND_ICONS;
