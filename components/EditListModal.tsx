import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Alert, ScrollView, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { List, LIST_COLORS, LIST_ICONS } from '../types';
import { updateList } from '../utils/localStorage';
import AnimatedModal from './AnimatedModal';
import ColorPicker from './ColorPicker';
import IconPicker from './IconPicker';
import Button from './Button';
import { COLORS, SPACING, RADIUS } from '../utils/designSystem';

interface EditListModalProps {
  visible: boolean;
  list: List | null;
  onClose: () => void;
  onListUpdated: () => void;
}

export default function EditListModal({
  visible,
  list,
  onClose,
  onListUpdated,
}: EditListModalProps) {
  const { t } = useTranslation();
  const [title, setTitle] = useState('');
  const [selectedColor, setSelectedColor] = useState<string>(LIST_COLORS[0].value);
  const [selectedIcon, setSelectedIcon] = useState<string>(LIST_ICONS[0].value);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (list) {
      setTitle(list.title);
      setSelectedColor(list.color || LIST_COLORS[0].value);
      setSelectedIcon(list.icon || LIST_ICONS[0].value);
    }
  }, [list]);

  const handleSave = async () => {
    if (!list) return;

    if (!title.trim()) {
      Alert.alert(t('common.error'), t('editList.errorEmptyTitle'));
      return;
    }

    setIsSaving(true);
    try {
      await updateList(list.id, {
        title: title.trim(),
        color: selectedColor,
        icon: selectedIcon,
      });
      onListUpdated();
      onClose();
    } catch (error: any) {
      Alert.alert(t('common.error'), error.message || t('editList.errorSave'));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AnimatedModal
      visible={visible}
      onClose={onClose}
      position="center"
      closeOnBackdrop={!isSaving}
    >
      <View style={styles.container}>
        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.title}>
            {t('editList.title')}
          </Text>

          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>
              {t('editList.listName')}
            </Text>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder={t('editList.placeholder')}
              placeholderTextColor={COLORS.neutral.grayDisabled}
              maxLength={50}
              style={styles.textInput}
            />
          </View>

          <IconPicker
            selectedIcon={selectedIcon}
            onIconSelect={setSelectedIcon}
            selectedColor={selectedColor}
            label={t('editList.icon')}
          />

          <ColorPicker
            selectedColor={selectedColor}
            onColorSelect={setSelectedColor}
            label={t('editList.color')}
          />

          <View style={styles.buttonsRow}>
            <View style={styles.buttonWrapper}>
              <Button
                onPress={onClose}
                label={t('editList.cancel')}
                variant="outline"
                disabled={isSaving}
              />
            </View>
            <View style={styles.buttonWrapper}>
              <Button
                onPress={handleSave}
                label={isSaving ? t('editList.saving') : t('editList.save')}
                variant="primary"
                disabled={isSaving || !title.trim()}
              />
            </View>
          </View>
        </ScrollView>
      </View>
    </AnimatedModal>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.secondary.cream,
    borderRadius: RADIUS['3xl'],
    marginHorizontal: SPACING.lg,
    maxHeight: '85%',
  },
  scrollView: {
    padding: SPACING['2xl'],
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.primary[500],
    marginBottom: SPACING['2xl'],
    textAlign: 'center',
  },
  fieldContainer: {
    marginBottom: SPACING.lg,
  },
  fieldLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.neutral.gray700,
    marginBottom: SPACING.sm,
  },
  textInput: {
    backgroundColor: COLORS.neutral.white,
    borderWidth: 1,
    borderColor: COLORS.neutral.gray200,
    borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    fontSize: 16,
    color: COLORS.neutral.gray900,
  },
  buttonsRow: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginTop: SPACING.lg,
    paddingBottom: SPACING.sm,
  },
  buttonWrapper: {
    flex: 1,
  },
});
