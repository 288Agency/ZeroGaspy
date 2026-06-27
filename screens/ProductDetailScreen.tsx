// ============================================================================
// ZeroGaspy · screens/ProductDetailScreen.tsx
// ============================================================================
// Détail d'un aliment + actions : consommer, jeter, modifier.
// New screen — not a replacement. No legacy caller, additive only.
// ============================================================================

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  StyleSheet,
  Pressable,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SymbolView } from 'expo-symbols';

import { useTheme } from '@/contexts/ThemeContext';
import { Button, Badge, AlertModal } from '@/components/ds';
import { loadLists, updateItem, markItemAsOpened, updateItemStatusWithQuantity } from '@/utils/localStorage';
import { getDaysUntilExpiration } from '@/utils/dateUtils';
import MarkAsOpenedModal from '@/components/MarkAsOpenedModal';
import QuantityModal from '@/components/QuantityModal';
import type { FoodItem } from '@/types';
import type { RootStackParamList } from '@/types/navigation';

type ProductDetailNav = NativeStackNavigationProp<RootStackParamList, 'ProductDetail'>;
type ProductDetailRoute = RouteProp<RootStackParamList, 'ProductDetail'>;

export default function ProductDetailScreen() {
  const { colors, typography, space, componentRadius, radius, layout, elevation } = useTheme();
  const insets = useSafeAreaInsets();
  const nav = useNavigation<ProductDetailNav>();
  const route = useRoute<ProductDetailRoute>();
  const { itemId, listId } = route.params;

  const [item, setItem] = useState<FoodItem | null>(null);
  const [trashOpen, setTrashOpen] = useState(false);
  const [openedModalOpen, setOpenedModalOpen] = useState(false);
  const [partialAction, setPartialAction] = useState<'consumed' | 'thrown' | null>(null);

  const reload = React.useCallback(() => {
    loadLists().then(lists => {
      const list = lists.find(l => l.id === listId);
      setItem(list?.items.find(i => i.id === itemId) ?? null);
    });
  }, [itemId, listId]);

  useEffect(() => { reload(); }, [reload]);

  if (!item) {
    return <View style={{ flex: 1, backgroundColor: colors.bg.canvas }} />;
  }

  const days = getDaysUntilExpiration(item.expirationDate);
  const state = days == null ? 'fresh' : days < 0 ? 'expired' : days <= 1 ? 'urgent' : days <= 3 ? 'warning' : 'fresh';
  const tone = state === 'expired' || state === 'urgent' ? 'danger' : state === 'warning' ? 'warning' : 'success';
  const label = days == null
    ? 'Frais'
    : days < 0
      ? `Périmé · ${Math.abs(days)}j`
      : days === 0
        ? "Périme aujourd'hui"
        : days === 1
          ? 'Périme demain'
          : `Périme dans ${days} jours`;

  const handleConsume = async () => {
    await updateItem(listId, itemId, { status: 'consumed' });
    nav.goBack();
  };
  const handleTrash = async () => {
    await updateItem(listId, itemId, { status: 'thrown' });
    nav.goBack();
  };
  const handleConfirmOpened = async (openedDate: string, daysAfterOpening: number) => {
    await markItemAsOpened(listId, itemId, openedDate, daysAfterOpening);
    setOpenedModalOpen(false);
    reload();
  };
  const handleConfirmPartial = async (qty: number) => {
    if (!partialAction || !item) return;
    await updateItemStatusWithQuantity(listId, itemId, partialAction, qty);
    setPartialAction(null);
    // Si on a tout consommé/jeté, l'item passe en status final → goBack
    if (qty >= (item.quantity ?? 1)) {
      nav.goBack();
    } else {
      reload();
    }
  };
  const canPartialAct = (item.quantity ?? 1) > 1;

  const quantityLabel = item.quantity != null ? String(item.quantity) : '—';

  // Compute "Ouvert il y a Nj" depuis openedDate (DD/MM/YYYY)
  let openedAgoLabel: string | null = null;
  if (item.isOpened && item.openedDate) {
    const m = item.openedDate.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (m) {
      const [, d, mo, y] = m;
      const opened = new Date(parseInt(y), parseInt(mo) - 1, parseInt(d));
      const days = Math.floor((Date.now() - opened.getTime()) / 86400000);
      openedAgoLabel = days <= 0 ? "Aujourd'hui" : days === 1 ? 'Hier' : `Il y a ${days}j`;
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg.canvas }}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + space[3],
          paddingBottom: insets.bottom + space[20],
          paddingHorizontal: layout.screenPaddingH,
        }}
      >
        <Pressable
          onPress={() => nav.goBack()}
          hitSlop={8}
          style={{ flexDirection: 'row', alignItems: 'center', marginBottom: space[5] }}
        >
          <SymbolView name="chevron.left" size={16} tintColor={colors.fg.secondary} />
          <Text style={[typography.body, { color: colors.fg.secondary, marginLeft: 4 }]}>Retour</Text>
        </Pressable>

        <View
          style={[
            styles.hero,
            {
              backgroundColor: colors.bg.surface,
              borderColor: colors.border.default,
              borderRadius: componentRadius.card,
              padding: space[5],
              marginBottom: space[5],
              ...elevation[2],
            },
          ]}
        >
          <View
            style={[
              styles.image,
              { backgroundColor: colors.bg.sunken, borderRadius: radius.md },
            ]}
          >
            {item.imageUri ? (
              <Image source={{ uri: item.imageUri }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
            ) : (
              <SymbolView name="cube.box" size={40} tintColor={colors.fg.muted} />
            )}
          </View>

          <Text style={[typography.title1, { color: colors.fg.primary, marginTop: space[4], marginBottom: space[2] }]}>
            {item.name}
          </Text>
          <Badge tone={tone} variant={state === 'urgent' || state === 'expired' ? 'solid' : 'soft'} dot>
            {label}
          </Badge>
        </View>

        <View
          style={[
            styles.metaGrid,
            {
              backgroundColor: colors.bg.surface,
              borderColor: colors.border.default,
              borderRadius: componentRadius.card,
              marginBottom: space[5],
            },
          ]}
        >
          <MetaRow icon="calendar" label="Date de péremption" value={item.expirationDate} />
          {openedAgoLabel && (
            <MetaRow icon="seal" label="Ouvert depuis" value={openedAgoLabel} />
          )}
          <MetaRow icon="scalemass" label="Quantité" value={quantityLabel} />
          <MetaRow icon="folder" label="Catégorie" value={item.category ?? 'Autre'} last />
        </View>

        <View style={{ gap: space[2] }}>
          <Button variant="primary" size="lg" icon="checkmark" onPress={handleConsume}>
            Marquer comme consommé
          </Button>
          {canPartialAct && (
            <Button variant="secondary" size="lg" icon="minus.circle" onPress={() => setPartialAction('consumed')}>
              Consommer une partie
            </Button>
          )}
          {!item.isOpened && (
            <Button variant="secondary" size="lg" icon="seal" onPress={() => setOpenedModalOpen(true)}>
              Marquer comme entamé
            </Button>
          )}
          <Button variant="secondary" size="lg" icon="pencil" onPress={() => nav.navigate('AddFood', { listId, editItem: item })}>
            Modifier
          </Button>
          <Button variant="ghost" size="lg" tone="destructive" icon="trash" onPress={() => setTrashOpen(true)}>
            Jeter
          </Button>
        </View>
      </ScrollView>

      <AlertModal
        visible={trashOpen}
        onClose={() => setTrashOpen(false)}
        icon="trash"
        tone="danger"
        title="Jeter cet aliment ?"
        message={`${item.name} sera marqué comme jeté. Tu pourras consulter tes pertes dans Stats.`}
        primaryLabel="Jeter"
        onPrimary={handleTrash}
        secondaryLabel="Annuler"
      />

      <MarkAsOpenedModal
        visible={openedModalOpen}
        onClose={() => setOpenedModalOpen(false)}
        onConfirm={handleConfirmOpened}
        itemName={item.name}
      />

      <QuantityModal
        visible={partialAction !== null}
        onClose={() => setPartialAction(null)}
        onConfirm={handleConfirmPartial}
        itemName={item.name}
        maxQuantity={item.quantity ?? 1}
        actionType={partialAction ?? 'consumed'}
      />
    </View>
  );
}

function MetaRow({ icon, label, value, last }: { icon: any; label: string; value: string; last?: boolean }) {
  const { colors, typography, space } = useTheme();
  return (
    <View style={[
      styles.metaRow,
      {
        borderBottomColor: colors.border.subtle,
        borderBottomWidth: last ? 0 : StyleSheet.hairlineWidth,
        paddingVertical: space[4],
        paddingHorizontal: space[5],
      },
    ]}>
      <SymbolView name={icon} size={18} tintColor={colors.fg.tertiary} style={{ marginRight: space[3] }} />
      <Text style={[typography.body, { color: colors.fg.secondary, flex: 1 }]}>{label}</Text>
      <Text style={[typography.bodyEmphasis, { color: colors.fg.primary }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    alignItems: 'center',
    borderWidth: 1,
  },
  image: {
    width: 120, height: 120,
    alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden',
  },
  metaGrid: {
    borderWidth: 1,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
