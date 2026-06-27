// ============================================================================
// ZeroGaspy · screens/AddFoodScreen.tsx (handoff port — "Nouvel aliment")
// ============================================================================
// Port direct de design_handoff_zerogaspy/reference/screens/AddFood.jsx,
// avec les hooks production de l'app : BarcodeScannerModal, DateScannerModal,
// expo-image-picker, addItemToList / updateItem.
//
// Structure :
//   1. TopBar       — Annuler · titre · Ajouter (disabled si name vide)
//   2. Quick row    — Scan (barcode) · Photo · Date OCR (au lieu de Voix)
//   3. Field        — Nom (autoFocus, input avec icône)
//   4. Field        — Date péremption (DD/MM/YYYY)
//   5. Row          — Quantité + Unité (chips horizontales)
//   6. Grid         — Catégories visuelles (6 tuiles, bordure 2px accent)
//   7. CTA          — "Ajouter à [liste]" (full-width, disabled si invalid)
//
// Supporte le mode édition via route.params.editItem (prefill + appel
// updateItem au lieu d'addItemToList).
// ============================================================================

import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  TextInput,
  TouchableOpacity,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SymbolView, SFSymbol } from 'expo-symbols';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { useTheme } from '@/contexts/ThemeContext';
import { Sage, Forest } from '@/tokens';
import { addItemToList, updateItem, getListById } from '@/utils/localStorage';
import { formatDateToDDMMYYYY, parseDDMMYYYY } from '@/utils/dateUtils';
import BarcodeScannerModal from '@/components/BarcodeScannerModal';
import DateScannerModal from '@/components/DateScannerModal';
import type { FoodItem } from '@/types';
import type { RootStackParamList } from '@/types/navigation';
import logger from '@/utils/logger';
import { trackFoodAdded as analyticsTrackFoodAdded } from '@/services/analytics';

// ────────────────────────────────────────────────────────────────────────────
// Constantes — catégories + unités (handoff vocab)
// ────────────────────────────────────────────────────────────────────────────

const CATEGORIES: { id: string; label: string; icon: SFSymbol }[] = [
  { id: 'dairy',      label: 'Laitiers',   icon: 'drop.fill' },
  { id: 'vegetables', label: 'Légumes',    icon: 'leaf.fill' },
  { id: 'fruits',     label: 'Fruits',     icon: 'applelogo' },
  { id: 'meat',       label: 'Viande',     icon: 'fork.knife' },
  { id: 'bakery',     label: 'Boulangerie', icon: 'birthday.cake.fill' },
  { id: 'other',      label: 'Autres',     icon: 'square.grid.2x2.fill' },
];

const UNITS = ['pcs', 'g', 'kg', 'ml', 'L', 'pots', 'tranches'];

// ────────────────────────────────────────────────────────────────────────────
// Screen
// ────────────────────────────────────────────────────────────────────────────

type Nav = NativeStackNavigationProp<RootStackParamList, 'AddFood'>;
type Rt = RouteProp<RootStackParamList, 'AddFood'>;

export default function AddFoodScreen() {
  const { colors, typography, layout, componentRadius, radius, elevation } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const route = useRoute<Rt>();
  const { listId, editItem } = route.params;

  const isEditing = !!editItem;

  const [name, setName]         = useState(editItem?.name ?? '');
  const [date, setDate]         = useState(editItem?.expirationDate ?? '');
  const [quantity, setQuantity] = useState(String(editItem?.quantity ?? ''));
  const [unit, setUnit]         = useState(editItem?.unit ?? 'pcs');
  const [category, setCategory] = useState(editItem?.category ?? 'other');
  const [imageUri, setImageUri] = useState<string | undefined>(editItem?.imageUri);
  const [listTitle, setListTitle] = useState<string>('');

  const [barcodeOpen, setBarcodeOpen] = useState(false);
  const [dateScanOpen, setDateScanOpen] = useState(false);

  // Charge le nom de la liste pour le CTA "Ajouter à [liste]"
  React.useEffect(() => {
    let mounted = true;
    getListById(listId)
      .then((list) => { if (mounted && list) setListTitle(list.title); })
      .catch((err) => logger.warn('[AddFoodV2] getListById:', err));
    return () => { mounted = false; };
  }, [listId]);

  const valid = name.trim().length > 0;

  // ── Handlers ─────────────────────────────────────────────────────────────
  const handleCancel = useCallback(() => navigation.goBack(), [navigation]);

  const handleSubmit = useCallback(async () => {
    if (!valid) return;
    const qtyParsed = parseInt(quantity, 10);
    const itemBody: Partial<FoodItem> = {
      name: name.trim(),
      expirationDate: date.trim() || formatDateToDDMMYYYY(addDays(new Date(), 7)),
      quantity: isNaN(qtyParsed) ? 1 : qtyParsed,
      unit: unit || undefined,
      category: category || undefined,
      imageUri: imageUri || undefined,
    };
    try {
      if (isEditing && editItem) {
        await updateItem(listId, editItem.id, itemBody);
      } else {
        const newItem: FoodItem = {
          id: Date.now().toString(),
          ...itemBody,
          name: itemBody.name!,
          expirationDate: itemBody.expirationDate!,
          status: 'active',
        };
        await addItemToList(listId, newItem);
        try {
          analyticsTrackFoodAdded({
            category: itemBody.category,
            hasExpiryDate: !!date.trim(),
            hasPrice: false,
            source: 'manual',
          });
        } catch {}
      }
      navigation.goBack();
    } catch (err) {
      logger.error('[AddFoodV2] save failed:', err);
    }
  }, [valid, isEditing, editItem, listId, name, date, quantity, unit, category, imageUri, navigation]);

  const handleBarcodeFound = useCallback(
    (product: { name: string; quantity?: string; category?: string; imageUrl?: string; brand?: string }) => {
      setBarcodeOpen(false);
      if (product.name) setName(product.name);
      if (product.imageUrl) setImageUri(product.imageUrl);
      // category and quantity from barcode could be parsed further — keep simple for now
    },
    [],
  );

  const handleDateScanned = useCallback((scannedDate: string) => {
    setDateScanOpen(false);
    setDate(scannedDate);
  }, []);

  const handlePhoto = useCallback(async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.7,
        allowsEditing: true,
        aspect: [1, 1],
      });
      if (!result.canceled && result.assets[0]?.uri) {
        setImageUri(result.assets[0].uri);
      }
    } catch (err) {
      logger.error('[AddFoodV2] photo failed:', err);
    }
  }, []);

  return (
    <View style={[styles.root, { backgroundColor: colors.bg.canvas }]}>
      {/* ── TopBar ────────────────────────────────────────────────────── */}
      <View style={[styles.topbar, { paddingTop: insets.top + 6 }]}>
        <Pressable
          onPress={handleCancel}
          hitSlop={8}
          style={({ pressed }) => [styles.topbarBtn, { opacity: pressed ? 0.5 : 1 }]}
          accessibilityRole="button"
          accessibilityLabel="Annuler"
        >
          <Text style={{ fontSize: 16, color: colors.fg.primary }}>Annuler</Text>
        </Pressable>

        <Text
          numberOfLines={1}
          style={{
            fontSize: 17,
            fontWeight: '600',
            letterSpacing: -0.3,
            color: colors.fg.primary,
          }}
        >
          {isEditing ? 'Modifier' : 'Nouvel aliment'}
        </Text>

        <Pressable
          onPress={handleSubmit}
          disabled={!valid}
          hitSlop={8}
          style={({ pressed }) => [
            styles.topbarBtn,
            { opacity: !valid ? 0.35 : pressed ? 0.5 : 1 },
          ]}
          accessibilityRole="button"
          accessibilityLabel={isEditing ? 'Enregistrer' : 'Ajouter'}
        >
          <Text style={{ fontSize: 16, fontWeight: '700', color: colors.accent.default }}>
            {isEditing ? 'OK' : 'Ajouter'}
          </Text>
        </Pressable>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{
          paddingHorizontal: layout.screenPaddingH,
          paddingTop: 14,
          paddingBottom: 110 + insets.bottom,
        }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── 1. Quick row : Scan / Photo / Date OCR ──────────────────── */}
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 22 }}>
          <QuickAction icon="barcode.viewfinder" label="Scan"  onPress={() => setBarcodeOpen(true)} />
          <QuickAction icon="camera.fill"        label="Photo" onPress={handlePhoto} />
          <QuickAction icon="calendar.badge.clock" label="Date" onPress={() => setDateScanOpen(true)} />
        </View>

        {/* Image preview if set */}
        {imageUri && (
          <View
            style={{
              alignSelf: 'flex-start',
              marginBottom: 14,
              borderRadius: componentRadius.card,
              overflow: 'hidden',
              borderWidth: 1,
              borderColor: colors.border.default,
            }}
          >
            <Image source={{ uri: imageUri }} style={{ width: 80, height: 80 }} />
          </View>
        )}

        {/* ── 2. Nom ──────────────────────────────────────────────────── */}
        <FieldLabel>Nom de l'aliment</FieldLabel>
        <FieldInputBox icon="cube.fill" accent={name.length > 0}>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Yaourt nature…"
            placeholderTextColor={colors.fg.muted}
            autoFocus={!isEditing}
            returnKeyType="next"
            style={{
              flex: 1,
              fontSize: 16,
              color: colors.fg.primary,
              padding: 0,
            }}
          />
        </FieldInputBox>

        {/* ── 3. Date péremption ──────────────────────────────────────── */}
        <FieldLabel>Date de péremption</FieldLabel>
        <FieldInputBox icon="calendar">
          <TextInput
            value={date}
            onChangeText={setDate}
            placeholder="JJ/MM/AAAA"
            placeholderTextColor={colors.fg.muted}
            keyboardType="numbers-and-punctuation"
            returnKeyType="next"
            style={{
              flex: 1,
              fontSize: 16,
              color: colors.fg.primary,
              padding: 0,
            }}
          />
        </FieldInputBox>

        {/* ── 4. Quantité + Unité ─────────────────────────────────────── */}
        <FieldLabel>Quantité</FieldLabel>
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 18 }}>
          <View style={{ flex: 1 }}>
            <FieldInputBox icon="scalemass.fill">
              <TextInput
                value={quantity}
                onChangeText={setQuantity}
                placeholder="4"
                placeholderTextColor={colors.fg.muted}
                keyboardType="number-pad"
                returnKeyType="done"
                style={{
                  flex: 1,
                  fontSize: 16,
                  color: colors.fg.primary,
                  padding: 0,
                }}
              />
            </FieldInputBox>
          </View>
        </View>

        {/* Unit chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8, paddingVertical: 2 }}
          style={{
            marginHorizontal: -layout.screenPaddingH,
            paddingHorizontal: layout.screenPaddingH,
            marginBottom: 22,
          }}
        >
          {UNITS.map((u) => (
            <UnitChip key={u} label={u} active={unit === u} onPress={() => setUnit(u)} />
          ))}
        </ScrollView>

        {/* ── 5. Catégorie (grille visuelle) ──────────────────────────── */}
        <FieldLabel>Catégorie</FieldLabel>
        <View style={styles.catGrid}>
          {CATEGORIES.map((c) => {
            const active = category === c.id;
            return (
              <TouchableOpacity
                key={c.id}
                onPress={() => setCategory(c.id)}
                activeOpacity={0.85}
                style={[
                  styles.catTile,
                  {
                    borderRadius: componentRadius.card,
                    borderWidth: active ? 2 : 1,
                    borderColor: active ? colors.accent.default : colors.border.default,
                    backgroundColor: active ? colors.accent.soft : colors.bg.surface,
                  },
                ]}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
              >
                <SymbolView
                  name={c.icon}
                  size={24}
                  tintColor={active ? Forest[700] : colors.fg.primary}
                />
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: '600',
                    marginTop: 6,
                    color: active ? Forest[700] : colors.fg.primary,
                  }}
                >
                  {c.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ── 6. CTA "Ajouter à [liste]" ──────────────────────────────── */}
        <TouchableOpacity
          onPress={handleSubmit}
          disabled={!valid}
          activeOpacity={0.85}
          style={[
            styles.cta,
            {
              backgroundColor: colors.accent.default,
              borderRadius: radius.full,
              marginTop: 28,
              opacity: valid ? 1 : 0.35,
              ...elevation[1],
            },
          ]}
        >
          <Text
            style={{
              color: '#FFFFFF',
              fontSize: 16,
              fontWeight: '600',
              letterSpacing: 0.3,
            }}
          >
            {isEditing
              ? 'Enregistrer'
              : listTitle
                ? `Ajouter à ${listTitle}`
                : 'Ajouter'}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* ── Modales ───────────────────────────────────────────────────── */}
      <BarcodeScannerModal
        visible={barcodeOpen}
        onClose={() => setBarcodeOpen(false)}
        onProductFound={handleBarcodeFound}
      />
      <DateScannerModal
        visible={dateScanOpen}
        onClose={() => setDateScanOpen(false)}
        onDateScanned={handleDateScanned}
      />
    </View>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Atoms locaux
// ────────────────────────────────────────────────────────────────────────────

function QuickAction({
  icon,
  label,
  onPress,
}: {
  icon: SFSymbol;
  label: string;
  onPress: () => void;
}) {
  const { colors, componentRadius, elevation } = useTheme();
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={{
        flex: 1,
        aspectRatio: 1.2,
        borderRadius: componentRadius.card,
        borderWidth: 1,
        borderColor: colors.border.default,
        backgroundColor: colors.bg.surface,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        ...elevation[1],
      }}
    >
      <SymbolView name={icon} size={22} tintColor={colors.fg.primary} />
      <Text
        style={{
          fontSize: 12,
          fontWeight: '600',
          color: colors.fg.primary,
          letterSpacing: -0.1,
        }}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  const { colors, typography } = useTheme();
  return (
    <Text
      style={[
        typography.sectionLabel,
        {
          fontSize: 12,
          fontWeight: '600',
          color: colors.fg.secondary,
          letterSpacing: 0.6,
          textTransform: 'uppercase',
          marginBottom: 8,
          marginTop: 4,
          paddingHorizontal: 2,
        },
      ]}
    >
      {children}
    </Text>
  );
}

function FieldInputBox({
  icon,
  accent,
  children,
}: {
  icon: SFSymbol;
  accent?: boolean;
  children: React.ReactNode;
}) {
  const { colors, componentRadius } = useTheme();
  return (
    <View
      style={[
        styles.input,
        {
          backgroundColor: colors.bg.surface,
          borderColor: accent ? colors.accent.default : colors.border.default,
          borderRadius: componentRadius.input,
          marginBottom: 14,
        },
      ]}
    >
      <SymbolView
        name={icon}
        size={18}
        tintColor={accent ? colors.accent.default : colors.fg.tertiary}
      />
      {children}
    </View>
  );
}

function UnitChip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  const { colors, radius } = useTheme();
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={{
        height: 32,
        paddingHorizontal: 14,
        borderRadius: radius.full,
        borderWidth: 1,
        borderColor: active ? colors.fg.primary : colors.border.default,
        backgroundColor: active ? colors.fg.primary : colors.bg.surface,
        flexDirection: 'row',
        alignItems: 'center',
      }}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
    >
      <Text
        style={{
          fontSize: 13,
          fontWeight: '500',
          color: active ? colors.bg.canvas : colors.fg.secondary,
        }}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────────────────

function addDays(d: Date, n: number): Date {
  const out = new Date(d);
  out.setDate(out.getDate() + n);
  return out;
}

// ────────────────────────────────────────────────────────────────────────────
// Styles
// ────────────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1 },
  topbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 44,
    paddingBottom: 8,
    paddingHorizontal: 14,
  },
  topbarBtn: {
    paddingVertical: 8,
    paddingHorizontal: 8,
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: { flex: 1 },
  input: {
    height: 52,
    paddingHorizontal: 14,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  catGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  catTile: {
    width: '31.5%',
    aspectRatio: 1.4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cta: {
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
