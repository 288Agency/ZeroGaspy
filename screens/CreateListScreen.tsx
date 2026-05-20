import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  Alert,
  StyleSheet,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import { LIST_COLORS, LIST_ICONS } from '../types';
import { createList, loadLists } from '../utils/localStorage';
import { useTranslation } from 'react-i18next';
import Header from '../components/Header';
import Input from '../components/Input';
import Button from '../components/Button';
import ColorPicker from '../components/ColorPicker';
import IconPicker from '../components/IconPicker';
import { PaywallSheet } from '../components/ds';
import { usePaywallSheetProps } from '../hooks/usePaywallSheetProps';
import { COLORS, SPACING } from '../utils/designSystem';
import { useGamification } from '../contexts/GamificationContext';
import { useSubscription } from '../contexts/SubscriptionContext';
import { FREE_LIMITS } from '../constants/subscription';
import logger from '../utils/logger';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'CreateList'>;

export default function CreateListScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<NavigationProp>();
  const { trackListCreated } = useGamification();
  const { isPremium } = useSubscription();
  const paywallProps = usePaywallSheetProps();
  const [listTitle, setListTitle] = useState('');
  const [selectedColor, setSelectedColor] = useState<string>(LIST_COLORS[0].value);
  const [selectedIcon, setSelectedIcon] = useState<string>(LIST_ICONS[0].value);
  const [isCreating, setIsCreating] = useState(false);
  const [listCount, setListCount] = useState(0);
  const [paywallVisible, setPaywallVisible] = useState(false);

  // Charger le nombre de listes existantes
  useEffect(() => {
    const fetchListCount = async () => {
      const lists = await loadLists();
      setListCount(lists.length);
    };
    fetchListCount();
  }, []);

  const handleCreate = async () => {
    if (!listTitle.trim()) {
      Alert.alert(t('common.error'), t('lists.titleRequired'));
      return;
    }

    // Verifier la limite pour les utilisateurs gratuits
    if (!isPremium && listCount >= FREE_LIMITS.MAX_LISTS) {
      setPaywallVisible(true);
      return;
    }

    setIsCreating(true);
    try {
      const newList = await createList(listTitle.trim(), selectedColor, selectedIcon);

      // Tracker pour la gamification
      trackListCreated();

      // Réinitialiser la pile de navigation pour éviter de revenir à CreateListScreen
      // On remplace CreateListScreen par InventoryListScreen dans la pile
      // Cela permet de revenir directement à HomeScreen si on appuie sur retour
      navigation.reset({
        index: 1,
        routes: [
          { name: 'Home' },
          {
            name: 'InventoryList',
            params: {
              listId: newList.id,
              listTitle: newList.title,
              listColor: newList.color,
              listIcon: newList.icon,
            },
          },
        ],
      });
    } catch (error: any) {
      logger.error('Erreur lors de la création de la liste:', error.message);
      Alert.alert(t('common.error'), t('lists.createError'));
      setIsCreating(false);
    }
  };

  return (
    <View style={styles.container}>
      <Header title={t('lists.newList')} showIcon={false} />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
      >
        <View style={styles.descriptionContainer}>
          <Text style={styles.description}>
            {t('lists.createDescription')}
          </Text>
        </View>

        <Input
          label={t('lists.listTitlePlaceholder')}
          placeholder={t('lists.listPlaceholderExample')}
          value={listTitle}
          onChangeText={setListTitle}
          autoFocus
          onSubmitEditing={handleCreate}
          returnKeyType="done"
          maxLength={50}
        />

        <View style={styles.pickerContainer}>
          <IconPicker
            selectedIcon={selectedIcon}
            onIconSelect={setSelectedIcon}
            selectedColor={selectedColor}
          />
        </View>

        <View style={styles.pickerContainer}>
          <ColorPicker
            selectedColor={selectedColor}
            onColorSelect={setSelectedColor}
          />
        </View>

        <View style={styles.buttonContainer}>
          <Button
            onPress={handleCreate}
            label={isCreating ? t('lists.creating') : t('lists.createList')}
            icon="add-circle-outline"
            variant="primary"
            disabled={isCreating || !listTitle.trim()}
            accessibilityLabel={t('lists.createList')}
          />
        </View>

        <View style={styles.buttonContainer}>
          <Button
            onPress={() => navigation.goBack()}
            label={t('common.cancel')}
            variant="outline"
            accessibilityLabel={t('common.cancel')}
          />
        </View>
      </ScrollView>

      {/* Paywall Modal */}
      <PaywallSheet
        {...paywallProps}
        visible={paywallVisible}
        onClose={() => setPaywallVisible(false)}
        trigger="addList"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.secondary.cream,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: SPACING.xl,
  },
  descriptionContainer: {
    marginBottom: SPACING['2xl'],
  },
  description: {
    fontSize: 16,
    color: COLORS.text.secondary,
    lineHeight: 24,
  },
  pickerContainer: {
    marginTop: SPACING['2xl'],
  },
  buttonContainer: {
    marginTop: SPACING.lg,
  },
});

