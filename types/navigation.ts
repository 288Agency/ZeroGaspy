import { FoodItem } from './index';

// Stack d'authentification
export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
};

// Stack principale de l'application
export type RootStackParamList = {
  Home: undefined;
  Lists: undefined;
  CreateList: undefined;
  AddFood: { listId: string; editItem?: FoodItem };
  InventoryList: { listId: string; listTitle: string; listColor?: string };
  ListMembers: { listId: string; listTitle: string; listColor?: string };
  Account: undefined;
  ExpiringSoon: undefined;
  ThrownFoods: undefined;
  Recipes: undefined;
  Stats: undefined;
};

// Navigation racine (Auth ou App)
export type RootNavigatorParamList = {
  Auth: undefined;
  App: undefined;
  Onboarding: undefined;
};

