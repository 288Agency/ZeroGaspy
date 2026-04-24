import { FoodItem } from './index';

// Stack d'authentification
export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
};

// Stack principale de l'application
export type RootStackParamList = {
  Home: { showWeeklyRecap?: boolean } | undefined;
  Lists: undefined;
  CreateList: undefined;
  AddFood: { listId: string; editItem?: FoodItem };
  InventoryList: { listId: string; listTitle: string; listColor?: string; listIcon?: string };
  Account: undefined;
  ExpiringSoon: undefined;
  ThrownFoods: undefined;
  Recipes: { ingredient?: string } | undefined;
  Stats: undefined;
  Challenges: undefined;
  ListMembers: { listId: string; listTitle: string; listColor?: string };
  MealPlanner: undefined;
  ShoppingList: undefined;
};

// Navigation racine (Auth ou App)
export type RootNavigatorParamList = {
  Auth: undefined;
  App: undefined;
  Onboarding: undefined;
};

