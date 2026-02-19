import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  Alert,
  TouchableOpacity,
  Pressable,
  Modal,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { List } from '../types';
import { RootStackParamList } from '../types/navigation';
import {
  loadLists,
  createList,
  deleteList,
} from '../utils/localStorage';
import Card from '../components/Card';
import Button from '../components/Button';
import Input from '../components/Input';
import PaywallModal from '../components/PaywallModal';
import { useSubscription } from '../contexts/SubscriptionContext';
import { FREE_LIMITS } from '../constants/subscription';
import logger from '../utils/logger';
import { COLORS, SPACING, RADIUS, SHADOWS, hexToRgba } from '../utils/designSystem';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Lists'>;

export default function ListsScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<NavigationProp>();
  const { isPremium } = useSubscription();
  const [lists, setLists] = useState<List[]>([]);
  const [newListTitle, setNewListTitle] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [paywallVisible, setPaywallVisible] = useState(false);

  // Charger les listes au démarrage
  useEffect(() => {
    loadListsData();
  }, []);

  // Recharger les listes quand l'écran est focus
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadListsData();
    });
    return unsubscribe;
  }, [navigation]);

  const loadListsData = async () => {
    try {
      const data = await loadLists();
      setLists(data);
    } catch (error) {
      logger.error('Error loading lists:', error);
      Alert.alert(t('common.error'), t('lists.loadError'));
    }
  };

  const handleCreateList = async () => {
    if (!newListTitle.trim()) {
      Alert.alert(t('common.error'), t('lists.titleRequired'));
      return;
    }

    try {
      await createList(newListTitle);
      setNewListTitle('');
      setIsCreating(false);
      await loadListsData();
    } catch (error) {
      logger.error('Error creating list:', error);
      Alert.alert(t('common.error'), t('lists.createError'));
    }
  };

  const handleDeleteList = (id: string, title: string) => {
    Alert.alert(
      t('lists.deleteList'),
      t('lists.deleteConfirm', { title }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteList(id);
              await loadListsData();
            } catch (error) {
              logger.error('Error deleting list:', error);
              Alert.alert(t('common.error'), t('lists.deleteError'));
            }
          },
        },
      ]
    );
  };

  const handleSelectList = (list: List) => {
    navigation.navigate('InventoryList', {
      listId: list.id,
      listTitle: list.title,
      listColor: list.color,
    });
  };

  const handlePressCreate = () => {
    // Verifier la limite pour les utilisateurs gratuits
    if (!isPremium && lists.length >= FREE_LIMITS.MAX_LISTS) {
      setPaywallVisible(true);
      return;
    }
    navigation.navigate('CreateList');
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const renderList = ({ item }: { item: List }) => {
    const listColor = item.color || COLORS.primary[500];

    return (
      <Card
        onPress={() => handleSelectList(item)}
        variant="elevated"
        style={[styles.cardItem, { backgroundColor: listColor + '20' }]}
      >
        {/* Bande de couleur à gauche */}
        <View
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            width: 6,
            backgroundColor: listColor,
            borderTopLeftRadius: 16,
            borderBottomLeftRadius: 16,
          }}
        />

        <View style={styles.listRow}>
          <View style={styles.listContent}>
            <View style={styles.listTitleRow}>
              <View
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: 6,
                  backgroundColor: listColor,
                  marginRight: SPACING.sm,
                }}
              />
              <Text style={styles.listTitle}>
                {item.title}
              </Text>
            </View>
            <View style={styles.listMeta}>
              <Text style={styles.listItemCount}>
                {t('lists.itemsCount', { count: item.items.length })}
              </Text>
              <Text style={styles.listDate}>
                • {t('lists.createdOn')} {formatDate(item.createdAt)}
              </Text>
            </View>
          </View>
          <TouchableOpacity
            onPress={(e) => {
              e.stopPropagation();
              handleDeleteList(item.id, item.title);
            }}
            style={[styles.deleteCircle, { backgroundColor: listColor }]}
            activeOpacity={0.7}
          >
            <Text style={styles.deleteCircleText}>✕</Text>
          </TouchableOpacity>
        </View>
      </Card>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>
          {t('lists.myInventoryLists')}
        </Text>
      </View>

      <FlatList
        data={lists}
        renderItem={renderList}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: SPACING.xl }}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyTitle}>
              {t('lists.emptyLists')}
            </Text>
            <Text style={styles.emptySubtitle}>
              {t('lists.emptyListsAction')}
            </Text>
          </View>
        }
      />

      {/* Bouton flottant pour créer une liste */}
      <Pressable
        onPress={handlePressCreate}
        hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
        style={styles.fab}
        android_ripple={{
          color: 'rgba(255, 255, 255, 0.3)',
          borderless: true,
          radius: 32,
        }}
        accessible={true}
        accessibilityLabel={t('lists.createNewList')}
        accessibilityRole="button"
      >
        <Text style={styles.fabText}>+</Text>
      </Pressable>

      {/* Paywall Modal */}
      <PaywallModal
        visible={paywallVisible}
        onClose={() => setPaywallVisible(false)}
        feature="lists"
      />

      {/* Modal pour créer une nouvelle liste */}
      <Modal
        visible={isCreating}
        transparent
        animationType="fade"
        onRequestClose={() => setIsCreating(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalKeyboard}
        >
          <View style={styles.modalOverlay}>
            <Card variant="elevated" style={styles.modalCard}>
              <Text style={styles.modalTitle}>
                {t('lists.newList')}
              </Text>

              <Input
                placeholder={t('lists.listTitlePlaceholder')}
                value={newListTitle}
                onChangeText={setNewListTitle}
                autoFocus
                onSubmitEditing={handleCreateList}
              />

              <View style={styles.modalButtons}>
                <Button
                  variant="outline"
                  onPress={() => {
                    setIsCreating(false);
                    setNewListTitle('');
                  }}
                  style={styles.modalButton}
                >
                  {t('common.cancel')}
                </Button>
                <Button
                  variant="primary"
                  onPress={handleCreateList}
                  style={styles.modalButton}
                >
                  {t('common.create')}
                </Button>
              </View>
            </Card>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.secondary.cream,
  },
  header: {
    paddingHorizontal: SPACING.xl,
    paddingTop: 64,
    paddingBottom: SPACING['2xl'],
    backgroundColor: COLORS.secondary.cream,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.neutral.gray200,
  },
  headerTitle: {
    fontSize: 30,
    fontWeight: '700',
    color: COLORS.neutral.gray900,
    textAlign: 'center',
  },
  cardItem: {
    padding: SPACING.xl,
    overflow: 'hidden',
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: SPACING.sm,
  },
  listContent: {
    flex: 1,
    marginRight: SPACING.lg,
  },
  listTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  listTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.neutral.gray900,
  },
  listMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: SPACING.xl,
  },
  listItemCount: {
    fontSize: 14,
    color: COLORS.neutral.gray600,
    marginRight: SPACING.md,
  },
  listDate: {
    fontSize: 14,
    color: COLORS.neutral.gray500,
  },
  deleteCircle: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteCircleText: {
    color: COLORS.neutral.white,
    fontSize: 18,
    fontWeight: '700',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyTitle: {
    fontSize: 18,
    color: COLORS.neutral.gray500,
    textAlign: 'center',
    marginBottom: SPACING.sm,
  },
  emptySubtitle: {
    fontSize: 16,
    color: COLORS.neutral.gray400,
    textAlign: 'center',
  },
  fab: {
    position: 'absolute',
    bottom: SPACING['2xl'],
    right: SPACING['2xl'],
    width: 64,
    height: 64,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.primary[500],
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.lg,
    elevation: 8,
  },
  fabText: {
    color: COLORS.neutral.white,
    fontSize: 30,
    fontWeight: '300',
  },
  modalKeyboard: {
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.xl,
  },
  modalCard: {
    width: '100%',
    maxWidth: 448,
    padding: SPACING['2xl'],
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.neutral.gray900,
    marginBottom: SPACING['2xl'],
  },
  modalButtons: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginTop: SPACING.sm,
  },
  modalButton: {
    flex: 1,
  },
});
