// ============================================================================
// ZeroGaspy · screens/JoinListScreen.tsx — Rejoindre une liste partagée
// ============================================================================
// Écran (présenté en modal) où l'utilisateur saisit un code de partage à 8
// caractères (ou arrive pré-rempli via deep link zerogaspy://join/CODE) pour
// rejoindre une liste collaborative. Appelle joinByShareCode (RPC sécurisée).
// Sur succès → renvoie vers l'onglet Espaces qui affiche la liste rejointe.
// ============================================================================

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { useTheme } from '@/contexts/ThemeContext';
import { Forest, Sage } from '@/tokens';
import { BrandIcon } from '@/components/ds';
import { useAuth } from '@/contexts/AuthContext';
import { joinByShareCode } from '@/services/listSharingService';
import type { RootStackParamList } from '@/types/navigation';
import { useTranslation } from 'react-i18next';
import logger from '@/utils/logger';

type Nav = NativeStackNavigationProp<RootStackParamList, 'JoinList'>;
type Rt = RouteProp<RootStackParamList, 'JoinList'>;

const CODE_LENGTH = 8;

function sanitizeCode(raw: string): string {
  // Le code n'utilise pas I/O/0/1 (cf. create_share_code) mais on reste permissif.
  return raw.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, CODE_LENGTH);
}

export default function JoinListScreen() {
  const { colors, typography, layout, componentRadius, elevation } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const route = useRoute<Rt>();
  const { user } = useAuth();
  const { t } = useTranslation();

  const [code, setCode] = useState(sanitizeCode(route.params?.code ?? ''));
  const [loading, setLoading] = useState(false);

  const errorMessage = useCallback(
    (err: string): string => {
      switch (err) {
        case 'INVALID_CODE': return t('join.errorInvalidCode', { defaultValue: 'Code invalide ou expiré.' });
        case 'OWN_LIST': return t('join.errorOwnList', { defaultValue: 'C\'est déjà ta liste.' });
        case 'ALREADY_MEMBER': return t('join.errorAlreadyMember', { defaultValue: 'Tu fais déjà partie de cette liste.' });
        case 'NOT_AUTHENTICATED': return t('join.errorNotAuth', { defaultValue: 'Connecte-toi pour rejoindre une liste.' });
        default: return t('join.errorGeneric', { defaultValue: 'Impossible de rejoindre. Réessaie.' });
      }
    },
    [t],
  );

  const handleJoin = useCallback(async () => {
    if (code.length < CODE_LENGTH || loading) return;
    setLoading(true);
    try {
      const result = await joinByShareCode(code);
      if (result.error) {
        Alert.alert(t('common.error'), errorMessage(result.error));
        setLoading(false);
        return;
      }
      // Succès → l'onglet Espaces affichera la liste (getSharedListsWithMe)
      Alert.alert(
        t('join.successTitle', { defaultValue: 'Liste rejointe' }),
        t('join.successBody', {
          defaultValue: 'Tu as rejoint « {{title}} ».',
          title: result.listTitle ?? t('sharing.member', { defaultValue: 'la liste' }),
        }),
        [
          {
            text: 'OK',
            onPress: () => navigation.navigate('Lists'),
          },
        ],
      );
    } catch (err) {
      logger.error('[JoinList] handleJoin failed:', err);
      Alert.alert(t('common.error'), errorMessage('UNKNOWN'));
      setLoading(false);
    }
  }, [code, loading, navigation, t, errorMessage]);

  const canSubmit = code.length === CODE_LENGTH && !loading;

  return (
    <View style={[styles.root, { backgroundColor: colors.bg.canvas, paddingTop: insets.top }]}>
      {/* Topbar */}
      <View style={styles.topbar}>
        <Pressable
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
          accessibilityLabel={t('common.back')}
          hitSlop={8}
          style={({ pressed }) => [styles.backBtn, { opacity: pressed ? 0.5 : 1 }]}
        >
          <BrandIcon name="chevronLeft" size={22} color={colors.fg.primary} />
        </Pressable>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <View style={{ paddingHorizontal: layout.screenPaddingH, paddingTop: 8 }}>
          <View style={[styles.hero, { backgroundColor: Sage[100] }]}>
            <BrandIcon name="users" size={30} color={Forest[600]} weight="fill" />
          </View>

          <Text style={[typography.title1, { color: colors.fg.primary, marginTop: 20 }]}>
            {t('join.title', { defaultValue: 'Rejoindre une liste' })}
          </Text>
          <Text style={[typography.body, { color: colors.fg.secondary, marginTop: 8 }]}>
            {t('join.subtitle', {
              defaultValue: 'Saisis le code de partage à 8 caractères qu\'on t\'a envoyé.',
            })}
          </Text>

          {user == null && (
            <View
              style={[
                styles.notice,
                { backgroundColor: colors.feedback.info.bg, borderRadius: componentRadius.card },
              ]}
            >
              <BrandIcon name="info" size={18} color={colors.feedback.info.fg} weight="fill" />
              <Text style={{ flex: 1, marginLeft: 10, color: colors.feedback.info.fg, fontSize: 13, lineHeight: 18 }}>
                {t('join.needAccount', {
                  defaultValue: 'Il faut un compte pour rejoindre une liste partagée.',
                })}
              </Text>
            </View>
          )}

          {/* Champ code */}
          <TextInput
            value={code}
            onChangeText={(v) => setCode(sanitizeCode(v))}
            placeholder="A B C 1 2 3 4 5"
            placeholderTextColor={colors.fg.muted}
            autoCapitalize="characters"
            autoCorrect={false}
            autoComplete="off"
            maxLength={CODE_LENGTH}
            editable={!loading}
            returnKeyType="go"
            onSubmitEditing={handleJoin}
            style={[
              styles.codeInput,
              {
                backgroundColor: colors.bg.surface,
                borderColor: code.length === CODE_LENGTH ? colors.accent.default : colors.border.default,
                borderRadius: componentRadius.input,
                color: colors.fg.primary,
                ...elevation[1],
              },
            ]}
          />

          {/* CTA */}
          <Pressable
            onPress={handleJoin}
            disabled={!canSubmit}
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.cta,
              {
                backgroundColor: colors.accent.default,
                borderRadius: componentRadius.button,
                opacity: !canSubmit ? 0.45 : pressed ? 0.85 : 1,
              },
            ]}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <BrandIcon name="userPlus" size={18} color="#fff" weight="fill" />
                <Text style={styles.ctaText}>
                  {t('join.cta', { defaultValue: 'Rejoindre' })}
                </Text>
              </>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  topbar: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 44,
    paddingHorizontal: 14,
    paddingBottom: 6,
  },
  backBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center', marginLeft: -6 },
  hero: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notice: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    marginTop: 20,
  },
  codeInput: {
    height: 64,
    marginTop: 24,
    borderWidth: 1.5,
    textAlign: 'center',
    fontSize: 26,
    fontWeight: '700',
    letterSpacing: 8,
  },
  cta: {
    height: 54,
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  ctaText: { color: '#fff', fontSize: 16, fontWeight: '700', letterSpacing: 0.2 },
});
