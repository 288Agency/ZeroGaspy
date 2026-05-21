import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useTranslation } from 'react-i18next';
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
import ChallengesScreen from '../screens/ChallengesScreen';
import MealPlannerScreen from '../screens/MealPlannerScreen';
import ShoppingListScreen from '../screens/ShoppingListScreen';
import { RegisterScreen } from '../screens/auth';
import GlassTabBar from '../components/GlassTabBar';
import { RootStackParamList } from '../types/navigation';
import { COLORS } from '../utils/designSystem';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator();

// Tab Navigator for main screens with Glass effect
function MainTabs() {
  const { t } = useTranslation();
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
        options={{ tabBarLabel: t('tabs.home') }}
      />
      <Tab.Screen
        name="RecipesTab"
        component={RecipesScreen}
        options={{ tabBarLabel: t('tabs.recipes') }}
      />
      <Tab.Screen
        name="StatsTab"
        component={StatsScreen}
        options={{ tabBarLabel: t('tabs.stats') }}
      />
      <Tab.Screen
        name="AccountTab"
        component={AccountScreen}
        options={{ tabBarLabel: t('tabs.account') }}
      />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const { t } = useTranslation();
  return (
    <Stack.Navigator
      initialRouteName="Home"
      screenOptions={{
        headerShown: false,
        headerBackTitle: t('common.back'),
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
            backgroundColor: COLORS.primary[500],
          },
          headerTintColor: COLORS.neutral.white,
          headerTitleStyle: {
            fontWeight: 'bold',
          },
          title: t('lists.title'),
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
            backgroundColor: route.params.listColor || COLORS.primary[500],
          },
          headerTintColor: COLORS.neutral.white,
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
      <Stack.Screen
        name="Challenges"
        component={ChallengesScreen}
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="MealPlanner"
        component={MealPlannerScreen}
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="ShoppingList"
        component={ShoppingListScreen}
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="Register"
        component={RegisterScreen}
        options={{
          headerShown: false,
          presentation: 'modal',
        }}
      />
    </Stack.Navigator>
  );
}
