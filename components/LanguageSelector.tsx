import React from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import PressableScale from './PressableScale';
import { changeLanguage, supportedLanguages } from '../i18n';
import { COLORS, SPACING, RADIUS, hexToRgba } from '../utils/designSystem';

interface LanguageSelectorProps {
  visible: boolean;
  onClose: () => void;
}

export default function LanguageSelector({ visible, onClose }: LanguageSelectorProps) {
  const { t, i18n } = useTranslation();
  const currentLang = i18n.language?.substring(0, 2) || 'fr';

  const handleSelectLanguage = async (languageCode: string) => {
    await changeLanguage(languageCode);
    onClose();
  };

  const currentLanguage = supportedLanguages.find(
    (lang) => lang.code === currentLang
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerSpacer} />
          <View style={styles.headerHandle} />
          <TouchableOpacity onPress={onClose} style={styles.headerCloseButton}>
            <Ionicons name="close" size={24} color={COLORS.primary[500]} />
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          <Text style={styles.title}>
            {t('settings.language')}
          </Text>
          <Text style={styles.subtitle}>
            {currentLanguage?.name} {currentLanguage?.flag}
          </Text>

          <View style={styles.languageList}>
            {supportedLanguages.map((language) => (
              <PressableScale
                key={language.code}
                onPress={() => handleSelectLanguage(language.code)}
                style={[
                  styles.languageCard,
                  currentLang === language.code
                    ? styles.languageCardActive
                    : styles.languageCardInactive,
                ]}
                hapticType="light"
              >
                <Text style={styles.flagText}>{language.flag}</Text>
                <View style={styles.flex1}>
                  <Text
                    style={[
                      styles.languageName,
                      currentLang === language.code
                        ? styles.languageNameActive
                        : styles.languageNameInactive,
                    ]}
                  >
                    {language.name}
                  </Text>
                </View>
                {currentLang === language.code && (
                  <Ionicons name="checkmark-circle" size={24} color={COLORS.primary[500]} />
                )}
              </PressableScale>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
}

// Composant bouton pour ouvrir le selecteur
export function LanguageButton({ onPress }: { onPress: () => void }) {
  const { t, i18n } = useTranslation();
  const currentLang = i18n.language?.substring(0, 2) || 'fr';

  const currentLanguage = supportedLanguages.find(
    (lang) => lang.code === currentLang
  );

  return (
    <PressableScale
      onPress={onPress}
      style={styles.buttonContainer}
      hapticType="light"
    >
      <View style={styles.buttonContent}>
        <Text style={styles.buttonFlag}>{currentLanguage?.flag}</Text>
        <View>
          <Text style={styles.buttonName}>
            {currentLanguage?.name}
          </Text>
          <Text style={styles.buttonSubtext}>
            {t('settings.changeLanguage', 'Changer la langue')}
          </Text>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={20} color={COLORS.text.tertiary} />
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: COLORS.neutral.white,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: hexToRgba(COLORS.primary[500], 0.1),
  },
  headerSpacer: {
    width: 40,
  },
  headerHandle: {
    width: 40,
    height: 4,
    backgroundColor: hexToRgba(COLORS.primary[500], 0.2),
    borderRadius: RADIUS.full,
  },
  headerCloseButton: {
    width: 40,
    alignItems: 'flex-end',
  },
  content: {
    padding: SPACING.xl,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.primary[500],
    marginBottom: SPACING.sm,
    textAlign: 'center',
  },
  subtitle: {
    color: COLORS.text.tertiary,
    fontSize: 14,
    marginBottom: SPACING['2xl'],
    textAlign: 'center',
  },
  languageList: {
    gap: SPACING.md,
  },
  languageCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.lg,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
  },
  languageCardActive: {
    backgroundColor: hexToRgba(COLORS.secondary.sage, 0.3),
    borderColor: COLORS.primary[500],
  },
  languageCardInactive: {
    backgroundColor: COLORS.neutral.white,
    borderColor: hexToRgba(COLORS.primary[500], 0.2),
  },
  flagText: {
    fontSize: 24,
    marginRight: SPACING.lg,
  },
  flex1: {
    flex: 1,
  },
  languageName: {
    fontWeight: '600',
    fontSize: 16,
  },
  languageNameActive: {
    color: COLORS.primary[500],
  },
  languageNameInactive: {
    color: COLORS.text.primary,
  },

  // LanguageButton styles
  buttonContainer: {
    backgroundColor: COLORS.neutral.white,
    borderRadius: RADIUS['2xl'],
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: hexToRgba(COLORS.primary[500], 0.2),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  buttonFlag: {
    fontSize: 24,
    marginRight: SPACING.md,
  },
  buttonName: {
    color: COLORS.primary[500],
    fontWeight: '600',
    fontSize: 16,
  },
  buttonSubtext: {
    color: COLORS.text.tertiary,
    fontSize: 14,
  },
});
