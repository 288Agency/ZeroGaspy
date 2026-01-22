import { useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useNavigation } from '@react-navigation/native';
import HomeScreen from '../screens/HomeScreen';
import ListsScreen from '../screens/ListsScreen';
import CreateListScreen from '../screens/CreateListScreen';
import AddFoodScreen from '../screens/AddFoodScreen';
import InventoryListScreen from '../screens/InventoryListScreen';
import ListMembersScreen from '../screens/ListMembersScreen';
import AccountScreen from '../screens/AccountScreen';
import ExpiringSoonScreen from '../screens/ExpiringSoonScreen';
import ThrownFoodsScreen from '../screens/ThrownFoodsScreen';
import RecipesScreen from '../screens/RecipesScreen';
import StatsScreen from '../screens/StatsScreen';
import GlassTabBar from '../components/GlassTabBar';
import AcceptInvitationModal from '../components/AcceptInvitationModal';
import { RootStackParamList } from '../types/navigation';
import { useInvitationDeepLink } from '../hooks/useInvitationDeepLink';
import { useAuth } from '../contexts/AuthContext';
import { syncWithCloud } from '../services/supabase/syncService';
import logger from '../utils/logger';

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
        options={{ tabBarLabel: 'Stats' }}
      />
      <Tab.Screen
        name="AccountTab"
        component={AccountScreen}
        options={{ tabBarLabel: 'Compte' }}
      />
    </Tab.Navigator>
  );
}

// Composant wrapper pour gérer les deep links d'invitation
function AppNavigatorContent() {
  const { invitationCode, clearInvitationCode } = useInvitationDeepLink();
  const { user } = useAuth();
  const [showInvitationModal, setShowInvitationModal] = useState(false);
  const [pendingCode, setPendingCode] = useState<string | null>(null);

  useEffect(() => {
    if (invitationCode) {
      setPendingCode(invitationCode);
      setShowInvitationModal(true);
    }
  }, [invitationCode]);

  const handleCloseInvitation = () => {
    setShowInvitationModal(false);
    clearInvitationCode();
    setPendingCode(null);
  };

  const handleInvitationSuccess = async (listId: string) => {
    handleCloseInvitation();

    // Synchroniser immédiatement pour récupérer la liste partagée
    if (user) {
      try {
        logger.info('Synchronisation de la liste partagée...');
        await syncWithCloud(user.id);
        Alert.alert(
          'Succès !',
          'Vous avez rejoint la liste partagée. Elle sera visible dans quelques instants.'
        );
      } catch (error) {
        logger.error('Erreur synchronisation après invitation:', error);
        Alert.alert(
          'Succès !',
          'Vous avez rejoint la liste. Rechargez l\'application pour voir les changements.'
        );
      }
    } else {
      Alert.alert('Succès !', 'Vous avez rejoint la liste partagée');
    }
  };

  return (
    <>
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
        name="ListMembers"
        component={ListMembersScreen}
        options={{
          headerShown: true,
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
      </Stack.Navigator>

      {/* Modal d'invitation depuis deep link */}
      {user && pendingCode && (
        <AcceptInvitationModal
          visible={showInvitationModal}
          onClose={handleCloseInvitation}
          userId={user.id}
          onSuccess={handleInvitationSuccess}
          initialCode={pendingCode}
        />
      )}
    </>
  );
}

export default function AppNavigator() {
  return <AppNavigatorContent />;
}
