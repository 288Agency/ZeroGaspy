import React, { useState, useRef, useEffect } from 'react';
import { View, Text, Alert, ActionSheetIOS, Platform, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Svg, { Path, Circle, G } from 'react-native-svg';
import { List } from '../types';
import { RootStackParamList } from '../types/navigation';
import { deleteList } from '../utils/localStorage';
import PressableScale from './PressableScale';
import AnimatedListItem from './AnimatedListItem';
import EditListModal from './EditListModal';
import { COLORS, SHADOWS, TYPOGRAPHY, RADIUS, hexToRgba, getContrastText } from '../utils/designSystem';
import { scaleSize, scaleSpacing, scaleFontSize, isSmallScreen } from '../utils/responsive';
import { getListIcon } from '../services/iconService';

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
      <Svg width={emptyIllustrationSize} height={emptyIllustrationSize} viewBox="0 0 100 100">
        <G>
          {/* Fridge illustration */}
          <Path
            d="M25 15 L75 15 C78 15 80 17 80 20 L80 85 C80 88 78 90 75 90 L25 90 C22 90 20 88 20 85 L20 20 C20 17 22 15 25 15"
            fill={COLORS.primary[100]}
            stroke={COLORS.primary[500]}
            strokeWidth="2"
          />
          {/* Fridge door line */}
          <Path d="M20 45 L80 45" stroke={COLORS.primary[500]} strokeWidth="2" />
          {/* Handle */}
          <Path d="M70 30 L70 40" stroke={COLORS.primary[500]} strokeWidth="3" strokeLinecap="round" />
          <Path d="M70 55 L70 75" stroke={COLORS.primary[500]} strokeWidth="3" strokeLinecap="round" />
          {/* Food items inside */}
          <Circle cx="35" cy="30" r="6" fill={COLORS.accent.carrot} />
          <Circle cx="50" cy="32" r="5" fill={COLORS.accent.tomato} />
          <Circle cx="40" cy="60" r="7" fill={COLORS.accent.avocado} />
          <Circle cx="55" cy="65" r="5" fill={COLORS.accent.lemon} />
          {/* Sparkles */}
          <Path d="M85 20 L88 25 L93 22 L88 28 L92 33 L87 30 L85 35 L83 30 L78 33 L82 28 L77 22 L82 25 Z" fill={COLORS.accent.lemon} />
        </G>
      </Svg>
    </Animated.View>
  );
}

export default function SpacesGrid({ lists, onCreateList, onListDeleted }: SpacesGridProps) {
  const navigation = useNavigation<NavigationProp>();
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [selectedList, setSelectedList] = useState<List | null>(null);

  const handleListPress = (list: List) => {
    navigation.navigate('InventoryList', {
      listId: list.id,
      listTitle: list.title,
      listColor: list.color,
    });
  };

  const handleDeleteList = (list: List) => {
    Alert.alert(
      'Supprimer la liste',
      `Voulez-vous vraiment supprimer "${list.title}" ? Cette action est irréversible.`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
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
          options: ['Annuler', 'Modifier', 'Supprimer'],
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
      Alert.alert(list.title, 'Que voulez-vous faire ?', [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Modifier', onPress: () => handleEditList(list) },
        { text: 'Supprimer', style: 'destructive', onPress: () => handleDeleteList(list) },
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
          <Text style={styles.title}>Mes espaces</Text>
          <Text style={styles.subtitle}>
            {lists.length} espace{lists.length !== 1 ? 's' : ''}
          </Text>
        </View>
        <PressableScale
          onPress={onCreateList}
          style={styles.addButton}
          hapticType="medium"
          activeScale={0.9}
          accessibilityLabel="Créer un nouvel espace"
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
            const listIconData = getListIcon(list.title);
            const icon = listIconData.icon;

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
                  accessibilityLabel={`Espace ${list.title}`}
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
                        {' '}aliment{activeCount !== 1 ? 's' : ''}
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
          <Text style={styles.emptyTitle}>Aucun espace créé</Text>
          <Text style={styles.emptySubtitle}>
            Créez votre premier espace pour{'\n'}organiser vos aliments
          </Text>
          <PressableScale
            onPress={onCreateList}
            style={styles.emptyButton}
            hapticType="medium"
          >
            <Ionicons name="add-circle-outline" size={scaleSize(isSmallScreen ? 18 : 20)} color={COLORS.neutral.white} />
            <Text style={styles.emptyButtonText}>Créer un espace</Text>
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
