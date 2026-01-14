export type RootStackParamList = {
  Home: undefined;
  Lists: undefined;
  CreateList: undefined;
  AddFood: { listId: string };
  InventoryList: { listId: string; listTitle: string; listColor?: string };
  Account: undefined;
  ExpiringSoon: undefined;
  ThrownFoods: undefined;
  Recipes: undefined;
  Stats: undefined;
};

