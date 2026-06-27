// ============================================================================
// ZeroGaspy · screens/CreateListScreen.tsx (handoff port — "Nouvelle liste")
// ============================================================================
// Création d'un espace (frigo, garde-manger, etc.) avec titre, icône, couleur.
// Port iso-features avec tokens DS v2, topbar handoff, et DS Button/Input.
// ============================================================================

import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, Alert, StyleSheet, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SymbolView } from 'expo-symbols';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';

import { useTheme } from '@/contexts/ThemeContext';
import { Forest, Cream } from '@/tokens';
import { Button, Input, PaywallSheet } from '@/components/ds';
import IconPicker from '@/components/IconPicker';
import ColorPicker from '@/components/ColorPicker';
import { usePaywallSheetProps } from '@/hooks/usePaywallSheetProps';
import { useGamification } from '@/contexts/GamificationContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { LIST_COLORS, LIST_ICONS } from '@/types';
import type { RootStackParamList } from '@/types/navigation';
import { createList, loadLists } from '@/utils/localStorage';
import { FREE_LIMITS } from '@/constants/subscription';
import logger from '@/utils/logger';

type Nav = NativeStackNavigationProp<RootStackParamList, 'CreateList'>;

export default function CreateListScreen() {
  const { t } = useTranslation();
  const { colors, layout } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const { trackListCreated } = useGamification();
  const { isPremium } = useSubscription();
  const paywallProps = usePaywallSheetProps();

  const [listTitle, setListTitle] = useState('');
  const [selectedColor, setSelectedColor] = useState<string>(LIST_COLORS[0].value);
  const [selectedIcon, setSelectedIcon] = useState<string>(LIST_ICONS[0].value);
  const [isCreating, setIsCreating] = useState(false);
  const [listCount, setListCount] = useState(0);
  const [paywallVisible, setPaywallVisible] = useState(false);

  useEffect(() => {
    loadLists().then((lists) => setListCount(lists.length));
  }, []);

  const handleCreate = useCallback(async () => {
    if (!listTitle.trim()) {
      Alert.alert(t('common.error'), t('lists.titleRequired'));
      return;
    }
    if (!isPremium && listCount >= FREE_LIMITS.MAX_LISTS) {
      setPaywallVisible(true);
      return;
    }
    setIsCreating(true);
    try {
      const newList = await createList(listTitle.trim(), selectedColor, selectedIcon);
      trackListCreated();
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
      logger.error('[CreateListV2] create failed:', error?.message);
      Alert.alert(t('common.error'), t('lists.createError'));
      setIsCreating(false);
    }
  }, [listTitle, isPremium, listCount, selectedColor, selectedIcon, trackListCreated, navigation, t]);

  return (
    <View
      style={[styles.root, { backgroundColor: colors.bg.canvas, paddingTop: insets.top }]}
    >
      {/* Topbar handoff — back + titre */}
      <View style={styles.topbar}>
        <Pressable
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
          accessibilityLabel="Retour"
          hitSlop={8}
          style={({ pressed }) => [
            styles.topbarBtn,
            { backgroundColor: colors.bg.surface, opacity: pressed ? 0.55 : 1 },
          ]}
        >
          <SymbolView name="chevron.left" size={20} tintColor={colors.fg.primary} />
        </Pressable>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={[styles.eyebrow, { color: colors.fg.secondary }]}>
            {t('lists.eyebrow', { defaultValue: 'Nouvel espace' })}
          </Text>
          <Text style={[styles.title, { color: colors.fg.primary }]}>
            {t('lists.newList')}
          </Text>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{
          paddingHorizontal: layout.screenPaddingH,
          paddingTop: 8,
          paddingBottom: 24 + insets.bottom,
        }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
      >
        <Text style={[styles.description, { color: colors.fg.secondary }]}>
          {t('lists.createDescription')}
        </Text>

        <View style={styles.field}>
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
        </View>

        <View style={styles.field}>
          <IconPicker
            selectedIcon={selectedIcon}
            onIconSelect={setSelectedIcon}
            selectedColor={selectedColor}
          />
        </View>

        <View style={styles.field}>
          <ColorPicker
            selectedColor={selectedColor}
            onColorSelect={setSelectedColor}
          />
        </View>

        <View style={styles.actions}>
          <Button
            onPress={handleCreate}
            variant="primary"
            size="lg"
            fullWidth
            loading={isCreating}
            disabled={isCreating || !listTitle.trim()}
            accessibilityLabel={t('lists.createList')}
          >
            {isCreating ? t('lists.creating') : t('lists.createList')}
          </Button>
          <View style={{ height: 10 }} />
          <Button
            onPress={() => navigation.goBack()}
            variant="ghost"
            size="md"
            fullWidth
            accessibilityLabel={t('common.cancel')}
          >
            {t('common.cancel')}
          </Button>
        </View>
      </ScrollView>

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
  root: { flex: 1 },
  topbar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingTop: 4,
    paddingBottom: 12,
  },
  topbarBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: '500',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -0.5,
    marginTop: 2,
  },
  scroll: { flex: 1 },
  description: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 20,
  },
  field: {
    marginBottom: 18,
  },
  actions: {
    marginTop: 12,
  },
});
