import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HomeScreen from '../screens/HomeScreen';
import ListsScreen from '../screens/ListsScreen';
import CreateListScreen from '../screens/CreateListScreen';
import AddFoodScreen from '../screens/AddFoodScreen';
import InventoryListScreen from '../screens/InventoryListScreen';
import AccountScreen from '../screens/AccountScreen';
import ExpiringSoonScreen from '../screens/ExpiringSoonScreen';
import ThrownFoodsScreen from '../screens/ThrownFoodsScreen';
import RecipesScreen from '../screens/RecipesScreen';
import StatsScreen from '../screens/StatsScreen';
import { RootStackParamList } from '../types/navigation';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function AppNavigator() {
  return (
    <Stack.Navigator
      initialRouteName="Home"
      screenOptions={{
        headerShown: false,
        headerBackTitle: 'Retour',
      }}
    >
      <Stack.Screen
        name="Home"
        component={HomeScreen}
      />
      <Stack.Screen
        name="Lists"
        component={ListsScreen}
        options={{
          headerShown: true,
          headerStyle: {
            backgroundColor: '#3C6E47',
          },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
          title: 'Mes Listes',
        }}
      />
      <Stack.Screen
        name="CreateList"
        component={CreateListScreen}
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="AddFood"
        component={AddFoodScreen}
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="InventoryList"
        component={InventoryListScreen}
        options={({ route }) => ({
          headerShown: true,
          headerStyle: {
            backgroundColor: route.params.listColor || '#3C6E47',
          },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
          title: route.params.listTitle,
        })}
      />
      <Stack.Screen
        name="Account"
        component={AccountScreen}
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="ExpiringSoon"
        component={ExpiringSoonScreen}
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="ThrownFoods"
        component={ThrownFoodsScreen}
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="Recipes"
        component={RecipesScreen}
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="Stats"
        component={StatsScreen}
        options={{
          headerShown: false,
        }}
      />
    </Stack.Navigator>
  );
}

