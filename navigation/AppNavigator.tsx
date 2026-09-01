import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createNativeBottomTabNavigator } from '@bottom-tabs/react-navigation';
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
import ProductDetailScreen from '../screens/ProductDetailScreen';
import CookTonightScreen from '../screens/CookTonightScreen';
import RecipeDetailScreen from '../screens/RecipeDetailScreen';
import JoinListScreen from '../screens/JoinListScreen';
import { RootStackParamList } from '../types/navigation';
import { COLORS } from '../utils/designSystem';
import { Forest } from '../tokens';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createNativeBottomTabNavigator();

const TOQUE_FILLED = require('../assets/icons/toque.png');
const TOQUE_OUTLINE = require('../assets/icons/toque-outline.png');

// Tab Navigator natif (UITabBar iOS → Liquid Glass / transparence automatique).
// Les icônes Phosphor restent sur les écrans ; la tab bar utilise SF Symbols + toque
// car le renderer natif ne supporte que sfSymbol / image template.
function MainTabs() {
  const { t } = useTranslation();
  return (
    <Tab.Navigator tabBarActiveTintColor={Forest[600]}>
      <Tab.Screen
        name="HomeTab"
        component={HomeScreen}
        options={{
          tabBarLabel: t('tabs.home'),
          tabBarIcon: ({ focused }) => ({ sfSymbol: focused ? 'house.fill' : 'house' }),
        }}
      />
      <Tab.Screen
        name="ListsTab"
        component={ListsScreen}
        options={{
          tabBarLabel: t('tabs.lists'),
          tabBarIcon: ({ focused }) => ({ sfSymbol: focused ? 'square.grid.2x2.fill' : 'square.grid.2x2' }),
        }}
      />
      <Tab.Screen
        name="RecipesTab"
        component={RecipesScreen}
        options={{
          tabBarLabel: t('tabs.recipes'),
          tabBarIcon: ({ focused }) => (focused ? TOQUE_FILLED : TOQUE_OUTLINE),
        }}
      />
      <Tab.Screen
        name="StatsTab"
        component={StatsScreen}
        options={{
          tabBarLabel: t('tabs.stats'),
          tabBarIcon: ({ focused }) => ({ sfSymbol: focused ? 'chart.bar.fill' : 'chart.bar' }),
        }}
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
        options={{
          headerShown: false,
        }}
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
      <Stack.Screen
        name="ProductDetail"
        component={ProductDetailScreen}
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="CookTonight"
        component={CookTonightScreen}
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="RecipeDetail"
        component={RecipeDetailScreen}
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="JoinList"
        component={JoinListScreen}
        options={{
          headerShown: false,
          presentation: 'modal',
        }}
      />
    </Stack.Navigator>
  );
}
