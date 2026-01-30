import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Alert, ScrollView } from 'react-native';
import { List, LIST_COLORS, LIST_ICONS } from '../types';
import { updateList } from '../utils/localStorage';
import AnimatedModal from './AnimatedModal';
import ColorPicker from './ColorPicker';
import IconPicker from './IconPicker';
import Button from './Button';

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
  const [title, setTitle] = useState('');
  const [selectedColor, setSelectedColor] = useState(LIST_COLORS[0].value);
  const [selectedIcon, setSelectedIcon] = useState(LIST_ICONS[0].value);
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
      Alert.alert('Erreur', 'Le titre ne peut pas être vide');
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
      Alert.alert('Erreur', error.message || 'Impossible de modifier la liste');
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
      <View className="bg-[#F7F5E6] rounded-3xl mx-4 max-h-[85%]">
        <ScrollView
          className="p-6"
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Text className="text-xl font-bold text-[#3C6E47] mb-6 text-center">
            Modifier la liste
          </Text>

          <View className="mb-4">
            <Text className="text-base font-semibold text-gray-700 mb-2">
              Nom de la liste
            </Text>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="Ex: Frigo, Épicerie..."
              placeholderTextColor="#9CA3AF"
              maxLength={50}
              className="bg-white border border-gray-200 rounded-xl px-4 py-3 text-base text-gray-900"
            />
          </View>

          <IconPicker
            selectedIcon={selectedIcon}
            onIconSelect={setSelectedIcon}
            selectedColor={selectedColor}
            label="Icône"
          />

          <ColorPicker
            selectedColor={selectedColor}
            onColorSelect={setSelectedColor}
            label="Couleur"
          />

          <View className="flex-row gap-3 mt-4 pb-2">
            <View className="flex-1">
              <Button
                onPress={onClose}
                label="Annuler"
                variant="outline"
                disabled={isSaving}
              />
            </View>
            <View className="flex-1">
              <Button
                onPress={handleSave}
                label={isSaving ? 'Enregistrement...' : 'Enregistrer'}
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
