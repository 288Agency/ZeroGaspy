import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
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
import GlassTabBar from '../components/GlassTabBar';
import { RootStackParamList } from '../types/navigation';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator();

// Tab Navigator for main screens with Glass effect
function MainTabs() {
  return (
    <Tab.Navigator
      tabBar={(props) => <GlassTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeScreen}
        options={{ tabBarLabel: 'Accueil' }}
      />
      <Tab.Screen
        name="RecipesTab"
        component={RecipesScreen}
        options={{ tabBarLabel: 'Recettes' }}
      />
      <Tab.Screen
        name="StatsTab"
        component={StatsScreen}
        options={{ tabBarLabel: 'Impact' }}
      />
      <Tab.Screen
        name="AccountTab"
        component={AccountScreen}
        options={{ tabBarLabel: 'Compte' }}
      />
    </Tab.Navigator>
  );
}

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
        component={MainTabs}
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
