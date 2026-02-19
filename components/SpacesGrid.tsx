import React, { useState, useRef, useEffect } from 'react';
import { View, Text, Alert, ActionSheetIOS, Platform, StyleSheet, Animated } from 'react-native';
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
import { COLORS, SHADOWS, TYPOGRAPHY, RADIUS, hexToRgba, getContrastText } from '../utils/designSystem';
import { FridgeIllustration } from './icons';
import { scaleSize, scaleSpacing, scaleFontSize, isSmallScreen } from '../utils/responsive';

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
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [selectedList, setSelectedList] = useState<List | null>(null);

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

      {/* Grid */}
      {lists.length > 0 ? (
        <View style={styles.grid}>
          {lists.map((list, index) => {
            const activeCount = getActiveItemsCount(list);
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
                      backgroundColor: hexToRgba(listColor, 0.12),
                      borderColor: hexToRgba(listColor, 0.25),
                    },
                  ]}
                  hapticType="selection"
                  activeScale={0.97}
                  accessibilityLabel={list.title}
                  accessibilityRole="button"
                >
                  {/* Icon container */}
                  <View
                    style={[
                      styles.iconContainer,
                      { backgroundColor: hexToRgba(listColor, 0.2) },
                    ]}
                  >
                    <Ionicons name={icon} size={scaleSize(isSmallScreen ? 20 : 24)} color={listColor} />
                  </View>

                  {/* Title */}
                  <Text
                    style={[styles.cardTitle, { color: listColor }]}
                    numberOfLines={2}
                  >
                    {list.title}
                  </Text>

                  {/* Footer */}
                  <View style={styles.cardFooter}>
                    <View style={styles.countBadge}>
                      <Text style={[styles.countText, { color: listColor }]}>
                        {activeCount}
                      </Text>
                      <Text style={[styles.countLabel, { color: hexToRgba(listColor, 0.7) }]}>
                        {' '}{t('common.foodItem', { count: activeCount })}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.arrowCircle,
                        { backgroundColor: hexToRgba(listColor, 0.15) },
                      ]}
                    >
                      <Ionicons name="chevron-forward" size={scaleSize(isSmallScreen ? 14 : 16)} color={listColor} />
                    </View>
                  </View>

                  {/* Decorative dot */}
                  <View
                    style={[
                      styles.decorativeDot,
                      { backgroundColor: hexToRgba(listColor, 0.3) },
                    ]}
                  />
                </PressableScale>
              </AnimatedListItem>
            );
          })}
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
const arrowCircleSize = scaleSize(isSmallScreen ? 24 : 28);
const decorativeDotSize = scaleSize(isSmallScreen ? 48 : 60);

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
    minHeight: scaleSize(isSmallScreen ? 115 : 140),
    borderWidth: 1.5,
    position: 'relative',
    overflow: 'hidden',
  },
  iconContainer: {
    width: iconContainerSize,
    height: iconContainerSize,
    borderRadius: scaleSize(isSmallScreen ? 12 : 16),
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: scaleSpacing(isSmallScreen ? 8 : 12),
  },
  cardTitle: {
    fontSize: scaleFontSize(isSmallScreen ? 15 : 18),
    lineHeight: scaleFontSize(isSmallScreen ? 20 : 24),
    fontWeight: '600',
    flex: 1,
    marginBottom: scaleSpacing(isSmallScreen ? 6 : 8),
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  countBadge: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  countText: {
    fontSize: scaleFontSize(isSmallScreen ? 12 : 14),
    lineHeight: scaleFontSize(isSmallScreen ? 16 : 20),
    fontWeight: '700',
  },
  countLabel: {
    fontSize: scaleFontSize(isSmallScreen ? 10 : 12),
    lineHeight: scaleFontSize(isSmallScreen ? 14 : 16),
    fontWeight: '500',
  },
  arrowCircle: {
    width: arrowCircleSize,
    height: arrowCircleSize,
    borderRadius: arrowCircleSize / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  decorativeDot: {
    position: 'absolute',
    top: scaleSize(-12),
    right: scaleSize(-12),
    width: decorativeDotSize,
    height: decorativeDotSize,
    borderRadius: decorativeDotSize / 2,
    opacity: 0.5,
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
});
