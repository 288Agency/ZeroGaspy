import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  Alert,
  ActionSheetIOS,
  Platform,
  StyleSheet,
  Animated,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { List } from '../types';
import { RootStackParamList } from '../types/navigation';
import { deleteList } from '../utils/localStorage';
import PressableScale from './PressableScale';
import AnimatedListItem from './AnimatedListItem';
import EditListModal from './EditListModal';
import { COLORS, SHADOWS, hexToRgba } from '../utils/designSystem';
import { FridgeIllustration } from './icons';
import { scaleSize, scaleSpacing, scaleFontSize, isSmallScreen } from '../utils/responsive';
import { useAuth } from '../contexts/AuthContext';
import {
  getSharedListsWithMe,
  SharedListWithMe,
} from '../services/listSharingService';
import { getDaysUntilExpiration } from '../utils/dateUtils';

interface SpacesGridProps {
  lists: List[];
  onCreateList: () => void;
  onListDeleted?: () => void;
}

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

// Responsive empty state illustration size
const emptyIllustrationSize = scaleSize(isSmallScreen ? 80 : 100);

// Decorative leaf for empty state
function EmptyStateIllustration() {
  const floatAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: 1,
          duration: 2500,
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 2500,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const translateY = floatAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -10],
  });

  return (
    <Animated.View style={{ transform: [{ translateY }] }}>
      <FridgeIllustration size={emptyIllustrationSize} />
    </Animated.View>
  );
}

export default function SpacesGrid({ lists, onCreateList, onListDeleted }: SpacesGridProps) {
  const { t } = useTranslation();
  const navigation = useNavigation<NavigationProp>();
  const { user } = useAuth();
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [selectedList, setSelectedList] = useState<List | null>(null);

  // Sharing state
  const [sharedLists, setSharedLists] = useState<SharedListWithMe[]>([]);

  // Load shared lists
  useEffect(() => {
    if (user) {
      loadSharedLists();
    }
  }, [user, lists]);

  const loadSharedLists = async () => {
    try {
      const shared = await getSharedListsWithMe();
      setSharedLists(shared);
    } catch {}
  };

  const handleSelectSharedList = (sl: SharedListWithMe) => {
    navigation.navigate('InventoryList', {
      listId: sl.listId,
      listTitle: sl.listTitle,
      listColor: sl.listColor || undefined,
    });
  };

  const handleListPress = (list: List) => {
    navigation.navigate('InventoryList', {
      listId: list.id,
      listTitle: list.title,
      listColor: list.color,
      listIcon: list.icon,
    });
  };

  const handleDeleteList = (list: List) => {
    Alert.alert(
      t('lists.deleteList'),
      t('lists.deleteConfirm', { title: list.title }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            await deleteList(list.id);
            onListDeleted?.();
          },
        },
      ]
    );
  };

  const handleEditList = (list: List) => {
    setSelectedList(list);
    setEditModalVisible(true);
  };

  const handleLongPress = (list: List) => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: [t('common.cancel'), t('common.edit'), t('common.delete')],
          cancelButtonIndex: 0,
          destructiveButtonIndex: 2,
          title: list.title,
        },
        (buttonIndex) => {
          if (buttonIndex === 1) handleEditList(list);
          else if (buttonIndex === 2) handleDeleteList(list);
        }
      );
    } else {
      Alert.alert(list.title, t('recipes.whatToDo'), [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('common.edit'), onPress: () => handleEditList(list) },
        { text: t('common.delete'), style: 'destructive', onPress: () => handleDeleteList(list) },
      ]);
    }
  };

  const getActiveItemsCount = (list: List) => {
    return list.items.filter(
      (item) => item.status !== 'consumed' && item.status !== 'thrown'
    ).length;
  };

  const getUrgentItemsCount = (list: List) => {
    return list.items.filter(item => {
      if (item.status === 'consumed' || item.status === 'thrown') return false;
      const days = getDaysUntilExpiration(item.expirationDate);
      return days !== null && days >= 0 && days <= 7;
    }).length;
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>{t('lists.myInventoryLists')}</Text>
          <Text style={styles.subtitle}>
            {t('lists.itemsCount', { count: lists.length })}
          </Text>
        </View>
        <PressableScale
          onPress={onCreateList}
          style={styles.addButton}
          hapticType="medium"
          activeScale={0.9}
          accessibilityLabel={t('lists.createNewList')}
          accessibilityRole="button"
        >
          <Ionicons name="add" size={scaleSize(isSmallScreen ? 20 : 24)} color={COLORS.neutral.white} />
        </PressableScale>
      </View>

      {/* Grid - personal + shared lists merged */}
      {lists.length > 0 || sharedLists.length > 0 ? (
        <View style={styles.grid}>
          {lists.map((list, index) => {
            const activeCount = getActiveItemsCount(list);
            const urgentCount = getUrgentItemsCount(list);
            const listColor = list.color || COLORS.primary[500];
            const icon = (list.icon || 'snow-outline') as keyof typeof Ionicons.glyphMap;

            return (
              <AnimatedListItem
                key={list.id}
                index={index}
                animationType="scale"
                style={styles.cardWrapper}
              >
                <PressableScale
                  onPress={() => handleListPress(list)}
                  onLongPress={() => handleLongPress(list)}
                  delayLongPress={500}
                  style={[
                    styles.card,
                    {
                      backgroundColor: hexToRgba(listColor, 0.18),
                      borderColor: hexToRgba(listColor, 0.3),
                    },
                  ]}
                  hapticType="selection"
                  activeScale={0.97}
                  accessibilityLabel={list.title}
                  accessibilityRole="button"
                >
                  {/* Top: icon + urgent badge */}
                  <View style={styles.cardTop}>
                    <View
                      style={[
                        styles.iconContainer,
                        { backgroundColor: hexToRgba(listColor, 0.2) },
                      ]}
                    >
                      <Ionicons name={icon} size={scaleSize(isSmallScreen ? 20 : 24)} color={listColor} />
                    </View>
                    {urgentCount > 0 && (
                      <View style={styles.urgentBadge}>
                        <Text style={styles.urgentText}>{urgentCount} urgents</Text>
                      </View>
                    )}
                  </View>

                  {/* Bottom: title + count */}
                  <View>
                    <Text style={[styles.cardTitle, { color: listColor }]} numberOfLines={2}>
                      {list.title}
                    </Text>
                    <Text style={[styles.countLabel, { color: hexToRgba(listColor, 0.6) }]}>
                      {activeCount} aliment{activeCount !== 1 ? 's' : ''}
                    </Text>
                  </View>
                </PressableScale>
              </AnimatedListItem>
            );
          })}

          {/* Shared lists - merged into same grid */}
          {sharedLists.map((sl, index) => {
            const slColor = sl.listColor || COLORS.primary[500];
            const icon = (sl.listIcon || 'snow-outline') as keyof typeof Ionicons.glyphMap;
            return (
              <AnimatedListItem
                key={sl.shareId}
                index={lists.length + index}
                animationType="scale"
                style={styles.cardWrapper}
              >
                <PressableScale
                  onPress={() => handleSelectSharedList(sl)}
                  style={[
                    styles.card,
                    {
                      backgroundColor: hexToRgba(slColor, 0.18),
                      borderColor: hexToRgba(slColor, 0.3),
                    },
                  ]}
                  hapticType="selection"
                  activeScale={0.97}
                  accessibilityLabel={sl.listTitle}
                  accessibilityRole="button"
                >
                  {/* Top: icon with shared badge + readOnly badge */}
                  <View style={styles.cardTop}>
                    <View style={{ position: 'relative' }}>
                      <View
                        style={[
                          styles.iconContainer,
                          { backgroundColor: hexToRgba(slColor, 0.2) },
                        ]}
                      >
                        <Ionicons name={icon} size={scaleSize(isSmallScreen ? 20 : 24)} color={slColor} />
                      </View>
                      <View style={[styles.sharedIconBadge, { backgroundColor: slColor }]}>
                        <Ionicons name="people" size={scaleSize(10)} color={COLORS.neutral.white} />
                      </View>
                    </View>
                    {sl.permission === 'view' && (
                      <View style={styles.readOnlyBadge}>
                        <Ionicons name="eye-outline" size={10} color={COLORS.text.muted} />
                      </View>
                    )}
                  </View>

                  {/* Bottom: title + owner */}
                  <View>
                    <Text style={[styles.cardTitle, { color: slColor }]} numberOfLines={2}>
                      {sl.listTitle}
                    </Text>
                    {sl.ownerName && (
                      <Text style={[styles.countLabel, { color: hexToRgba(slColor, 0.6) }]} numberOfLines={1}>
                        {sl.ownerName}
                      </Text>
                    )}
                  </View>
                </PressableScale>
              </AnimatedListItem>
            );
          })}

          {/* "Nouveau" card — always last in grid */}
          <AnimatedListItem
            key="new-list"
            index={lists.length + sharedLists.length}
            animationType="scale"
            style={styles.cardWrapper}
          >
            <PressableScale
              onPress={onCreateList}
              style={styles.newCard}
              hapticType="medium"
              accessibilityLabel={t('lists.createNewList')}
              accessibilityRole="button"
            >
              <Ionicons name="add" size={scaleSize(28)} color="rgba(60,110,71,0.4)" />
              <Text style={styles.newCardLabel}>Nouveau</Text>
            </PressableScale>
          </AnimatedListItem>
        </View>
      ) : (
        /* Empty state */
        <View style={styles.emptyState}>
          <EmptyStateIllustration />
          <Text style={styles.emptyTitle}>{t('lists.emptyLists')}</Text>
          <Text style={styles.emptySubtitle}>
            {t('lists.emptyListsDesc')}
          </Text>
          <PressableScale
            onPress={onCreateList}
            style={styles.emptyButton}
            hapticType="medium"
          >
            <Ionicons name="add-circle-outline" size={scaleSize(isSmallScreen ? 18 : 20)} color={COLORS.neutral.white} />
            <Text style={styles.emptyButtonText}>{t('lists.createList')}</Text>
          </PressableScale>
        </View>
      )}

      {/* Edit Modal */}
      <EditListModal
        visible={editModalVisible}
        list={selectedList}
        onClose={() => {
          setEditModalVisible(false);
          setSelectedList(null);
        }}
        onListUpdated={() => onListDeleted?.()}
      />

    </View>
  );
}

const addButtonSize = scaleSize(isSmallScreen ? 40 : 48);
const iconContainerSize = scaleSize(isSmallScreen ? 36 : 44);

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: scaleSpacing(isSmallScreen ? 14 : 20),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: scaleSpacing(isSmallScreen ? 14 : 20),
  },
  title: {
    fontSize: scaleFontSize(isSmallScreen ? 22 : 26),
    lineHeight: scaleFontSize(isSmallScreen ? 28 : 34),
    fontWeight: '700',
    color: COLORS.primary[500],
  },
  subtitle: {
    fontSize: scaleFontSize(isSmallScreen ? 10 : 12),
    lineHeight: scaleFontSize(isSmallScreen ? 14 : 16),
    fontWeight: '500',
    color: COLORS.text.secondary,
    marginTop: scaleSpacing(2),
  },
  addButton: {
    width: addButtonSize,
    height: addButtonSize,
    borderRadius: scaleSize(isSmallScreen ? 12 : 16),
    backgroundColor: COLORS.primary[500],
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.colored(COLORS.primary[500], 0.3),
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: scaleSpacing(-5),
  },
  cardWrapper: {
    width: '50%',
    paddingHorizontal: scaleSpacing(5),
    marginBottom: scaleSpacing(isSmallScreen ? 10 : 12),
  },
  card: {
    borderRadius: scaleSize(isSmallScreen ? 16 : 20),
    padding: scaleSpacing(isSmallScreen ? 12 : 16),
    aspectRatio: 1,
    borderWidth: 1,
    position: 'relative',
    overflow: 'hidden',
    justifyContent: 'space-between',
  },
  iconContainer: {
    width: iconContainerSize,
    height: iconContainerSize,
    borderRadius: scaleSize(isSmallScreen ? 12 : 16),
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: scaleFontSize(isSmallScreen ? 13 : 15),
    lineHeight: scaleFontSize(isSmallScreen ? 18 : 20),
    fontWeight: '800',
    marginBottom: scaleSpacing(2),
  },
  countLabel: {
    fontSize: scaleFontSize(isSmallScreen ? 10 : 12),
    lineHeight: scaleFontSize(isSmallScreen ? 14 : 16),
    fontWeight: '500',
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  urgentBadge: {
    backgroundColor: 'rgba(251,146,60,0.2)',
    borderRadius: scaleSize(5),
    paddingHorizontal: scaleSpacing(5),
    paddingVertical: scaleSpacing(2),
  },
  urgentText: {
    fontSize: scaleFontSize(9),
    fontWeight: '700',
    color: '#E65100',
  },
  newCard: {
    aspectRatio: 1,
    borderRadius: scaleSize(isSmallScreen ? 16 : 20),
    backgroundColor: '#F7F5F0',
    borderWidth: 1.5,
    borderColor: 'rgba(60,110,71,0.2)',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  newCardLabel: {
    fontSize: scaleFontSize(11),
    color: 'rgba(60,110,71,0.45)',
    fontWeight: '600',
    marginTop: scaleSpacing(4),
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: scaleSpacing(isSmallScreen ? 32 : 48),
  },
  emptyTitle: {
    fontSize: scaleFontSize(isSmallScreen ? 18 : 22),
    lineHeight: scaleFontSize(isSmallScreen ? 24 : 28),
    fontWeight: '600',
    color: COLORS.primary[500],
    marginTop: scaleSpacing(isSmallScreen ? 12 : 16),
    marginBottom: scaleSpacing(isSmallScreen ? 6 : 8),
  },
  emptySubtitle: {
    fontSize: scaleFontSize(isSmallScreen ? 13 : 15),
    lineHeight: scaleFontSize(isSmallScreen ? 18 : 22),
    fontWeight: '400',
    color: COLORS.text.secondary,
    textAlign: 'center',
    marginBottom: scaleSpacing(isSmallScreen ? 18 : 24),
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary[500],
    borderRadius: scaleSize(isSmallScreen ? 16 : 20),
    paddingVertical: scaleSpacing(isSmallScreen ? 10 : 14),
    paddingHorizontal: scaleSpacing(isSmallScreen ? 18 : 24),
    ...SHADOWS.colored(COLORS.primary[500], 0.3),
  },
  emptyButtonText: {
    fontSize: scaleFontSize(isSmallScreen ? 14 : 16),
    lineHeight: scaleFontSize(isSmallScreen ? 18 : 22),
    fontWeight: '600',
    color: COLORS.neutral.white,
    marginLeft: scaleSpacing(6),
  },
  sharedIconBadge: {
    position: 'absolute',
    bottom: scaleSize(-3),
    right: scaleSize(-3),
    width: scaleSize(18),
    height: scaleSize(18),
    borderRadius: scaleSize(9),
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: COLORS.neutral.white,
  },
  readOnlyBadge: {
    backgroundColor: COLORS.neutral.gray100,
    borderRadius: 10,
    padding: 4,
  },
});
