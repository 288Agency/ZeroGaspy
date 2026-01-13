import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import PressableScale from './PressableScale';
import Button from './Button';
import { COLORS, SHADOWS, RADIUS, hexToRgba } from '../utils/designSystem';
import { scaleSize, scaleSpacing, scaleFontSize, isSmallScreen } from '../utils/responsive';
import { Recipe, addUserRecipe, RECIPE_EMOJIS } from '../services/recipeService';

interface AddRecipeModalProps {
  visible: boolean;
  onClose: () => void;
  onRecipeAdded: () => void;
}

const CATEGORIES: Array<{ key: Recipe['category']; label: string; icon: keyof typeof Ionicons.glyphMap }> = [
  { key: 'plat', label: 'Plat', icon: 'restaurant' },
  { key: 'entrée', label: 'Entrée', icon: 'leaf' },
  { key: 'dessert', label: 'Dessert', icon: 'ice-cream' },
  { key: 'snack', label: 'Snack', icon: 'cafe' },
  { key: 'boisson', label: 'Boisson', icon: 'wine' },
];

const DIFFICULTIES: Array<{ key: Recipe['difficulty']; label: string }> = [
  { key: 'facile', label: 'Facile' },
  { key: 'moyen', label: 'Moyen' },
  { key: 'difficile', label: 'Difficile' },
];

export default function AddRecipeModal({ visible, onClose, onRecipeAdded }: AddRecipeModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedEmoji, setSelectedEmoji] = useState('🍳');
  const [category, setCategory] = useState<Recipe['category']>('plat');
  const [difficulty, setDifficulty] = useState<Recipe['difficulty']>('facile');
  const [preparationTime, setPreparationTime] = useState('');
  const [ingredients, setIngredients] = useState<string[]>(['']);
  const [instructions, setInstructions] = useState<string[]>(['']);
  const [tips, setTips] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [saving, setSaving] = useState(false);

  const resetForm = () => {
    setName('');
    setDescription('');
    setSelectedEmoji('🍳');
    setCategory('plat');
    setDifficulty('facile');
    setPreparationTime('');
    setIngredients(['']);
    setInstructions(['']);
    setTips('');
    setShowEmojiPicker(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const addIngredient = () => {
    setIngredients([...ingredients, '']);
  };

  const updateIngredient = (index: number, value: string) => {
    const updated = [...ingredients];
    updated[index] = value;
    setIngredients(updated);
  };

  const removeIngredient = (index: number) => {
    if (ingredients.length > 1) {
      setIngredients(ingredients.filter((_, i) => i !== index));
    }
  };

  const addInstruction = () => {
    setInstructions([...instructions, '']);
  };

  const updateInstruction = (index: number, value: string) => {
    const updated = [...instructions];
    updated[index] = value;
    setInstructions(updated);
  };

  const removeInstruction = (index: number) => {
    if (instructions.length > 1) {
      setInstructions(instructions.filter((_, i) => i !== index));
    }
  };

  const validateForm = (): boolean => {
    if (!name.trim()) {
      Alert.alert('Erreur', 'Veuillez entrer un nom pour la recette');
      return false;
    }
    if (!description.trim()) {
      Alert.alert('Erreur', 'Veuillez entrer une description');
      return false;
    }
    const validIngredients = ingredients.filter(i => i.trim());
    if (validIngredients.length === 0) {
      Alert.alert('Erreur', 'Veuillez ajouter au moins un ingrédient');
      return false;
    }
    const validInstructions = instructions.filter(i => i.trim());
    if (validInstructions.length === 0) {
      Alert.alert('Erreur', 'Veuillez ajouter au moins une étape de préparation');
      return false;
    }
    const time = parseInt(preparationTime);
    if (isNaN(time) || time <= 0) {
      Alert.alert('Erreur', 'Veuillez entrer un temps de préparation valide');
      return false;
    }
    return true;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    setSaving(true);
    try {
      await addUserRecipe({
        name: name.trim(),
        description: description.trim(),
        imageEmoji: selectedEmoji,
        category,
        difficulty,
        preparationTime: parseInt(preparationTime),
        ingredients: ingredients.filter(i => i.trim()),
        instructions: instructions.filter(i => i.trim()),
        tips: tips.trim() || undefined,
      });

      Alert.alert('Succès', 'Votre recette a été ajoutée !', [
        {
          text: 'OK',
          onPress: () => {
            resetForm();
            onRecipeAdded();
            onClose();
          },
        },
      ]);
    } catch (error) {
      Alert.alert('Erreur', 'Une erreur est survenue lors de l\'enregistrement');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <Ionicons name="close" size={scaleSize(24)} color={COLORS.text.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Nouvelle recette</Text>
          <View style={{ width: scaleSize(40) }} />
        </View>

        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Emoji Picker */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Illustration</Text>
            <PressableScale
              onPress={() => setShowEmojiPicker(!showEmojiPicker)}
              style={styles.emojiButton}
              hapticType="light"
            >
              <Text style={styles.selectedEmoji}>{selectedEmoji}</Text>
              <Text style={styles.emojiButtonText}>Changer</Text>
            </PressableScale>

            {showEmojiPicker && (
              <View style={styles.emojiGrid}>
                {RECIPE_EMOJIS.map((emoji, index) => (
                  <TouchableOpacity
                    key={index}
                    onPress={() => {
                      setSelectedEmoji(emoji);
                      setShowEmojiPicker(false);
                    }}
                    style={[
                      styles.emojiItem,
                      emoji === selectedEmoji && styles.emojiItemSelected,
                    ]}
                  >
                    <Text style={styles.emojiItemText}>{emoji}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* Name */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Nom de la recette *</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Ex: Tarte aux pommes de mamie"
              placeholderTextColor={COLORS.text.muted}
            />
          </View>

          {/* Description */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Description *</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={description}
              onChangeText={setDescription}
              placeholder="Une courte description de votre recette..."
              placeholderTextColor={COLORS.text.muted}
              multiline
              numberOfLines={3}
            />
          </View>

          {/* Category */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Catégorie</Text>
            <View style={styles.chipRow}>
              {CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat.key}
                  onPress={() => setCategory(cat.key)}
                  style={[
                    styles.chip,
                    category === cat.key && styles.chipSelected,
                  ]}
                >
                  <Ionicons
                    name={cat.icon}
                    size={scaleSize(16)}
                    color={category === cat.key ? COLORS.neutral.white : COLORS.primary[500]}
                  />
                  <Text
                    style={[
                      styles.chipText,
                      category === cat.key && styles.chipTextSelected,
                    ]}
                  >
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Difficulty */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Difficulté</Text>
            <View style={styles.chipRow}>
              {DIFFICULTIES.map((diff) => (
                <TouchableOpacity
                  key={diff.key}
                  onPress={() => setDifficulty(diff.key)}
                  style={[
                    styles.chip,
                    difficulty === diff.key && styles.chipSelected,
                  ]}
                >
                  <Text
                    style={[
                      styles.chipText,
                      difficulty === diff.key && styles.chipTextSelected,
                    ]}
                  >
                    {diff.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Preparation Time */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Temps de préparation (minutes) *</Text>
            <TextInput
              style={[styles.input, styles.timeInput]}
              value={preparationTime}
              onChangeText={setPreparationTime}
              placeholder="30"
              placeholderTextColor={COLORS.text.muted}
              keyboardType="number-pad"
            />
          </View>

          {/* Ingredients */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Ingrédients *</Text>
              <TouchableOpacity onPress={addIngredient} style={styles.addButton}>
                <Ionicons name="add-circle" size={scaleSize(24)} color={COLORS.primary[500]} />
              </TouchableOpacity>
            </View>
            {ingredients.map((ingredient, index) => (
              <View key={index} style={styles.listItemRow}>
                <View style={styles.bulletPoint}>
                  <Text style={styles.bulletText}>•</Text>
                </View>
                <TextInput
                  style={[styles.input, styles.listInput]}
                  value={ingredient}
                  onChangeText={(text) => updateIngredient(index, text)}
                  placeholder={`Ingrédient ${index + 1}`}
                  placeholderTextColor={COLORS.text.muted}
                />
                {ingredients.length > 1 && (
                  <TouchableOpacity
                    onPress={() => removeIngredient(index)}
                    style={styles.removeButton}
                  >
                    <Ionicons name="close-circle" size={scaleSize(22)} color={COLORS.semantic.danger} />
                  </TouchableOpacity>
                )}
              </View>
            ))}
          </View>

          {/* Instructions */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Étapes de préparation *</Text>
              <TouchableOpacity onPress={addInstruction} style={styles.addButton}>
                <Ionicons name="add-circle" size={scaleSize(24)} color={COLORS.primary[500]} />
              </TouchableOpacity>
            </View>
            {instructions.map((instruction, index) => (
              <View key={index} style={styles.listItemRow}>
                <View style={styles.stepNumber}>
                  <Text style={styles.stepNumberText}>{index + 1}</Text>
                </View>
                <TextInput
                  style={[styles.input, styles.listInput, styles.instructionInput]}
                  value={instruction}
                  onChangeText={(text) => updateInstruction(index, text)}
                  placeholder={`Étape ${index + 1}`}
                  placeholderTextColor={COLORS.text.muted}
                  multiline
                />
                {instructions.length > 1 && (
                  <TouchableOpacity
                    onPress={() => removeInstruction(index)}
                    style={styles.removeButton}
                  >
                    <Ionicons name="close-circle" size={scaleSize(22)} color={COLORS.semantic.danger} />
                  </TouchableOpacity>
                )}
              </View>
            ))}
          </View>

          {/* Tips */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Conseils (optionnel)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={tips}
              onChangeText={setTips}
              placeholder="Astuces pour réussir cette recette..."
              placeholderTextColor={COLORS.text.muted}
              multiline
              numberOfLines={2}
            />
          </View>

          {/* Submit Button */}
          <View style={styles.submitSection}>
            <Button
              onPress={handleSave}
              label="Enregistrer la recette"
              icon="checkmark-circle"
              variant="gradient"
              loading={saving}
              disabled={saving}
            />
          </View>

          <View style={{ height: scaleSpacing(40) }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.secondary.cream,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: scaleSpacing(16),
    paddingTop: scaleSpacing(16),
    paddingBottom: scaleSpacing(12),
    borderBottomWidth: 1,
    borderBottomColor: COLORS.neutral.gray200,
  },
  closeButton: {
    width: scaleSize(40),
    height: scaleSize(40),
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: scaleSize(20),
    backgroundColor: COLORS.neutral.gray100,
  },
  headerTitle: {
    fontSize: scaleFontSize(isSmallScreen ? 17 : 20),
    fontWeight: '700',
    color: COLORS.text.primary,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: scaleSpacing(isSmallScreen ? 16 : 20),
  },
  section: {
    marginBottom: scaleSpacing(20),
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontSize: scaleFontSize(isSmallScreen ? 14 : 16),
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: scaleSpacing(10),
  },
  input: {
    backgroundColor: COLORS.neutral.white,
    borderRadius: scaleSize(12),
    paddingHorizontal: scaleSpacing(14),
    paddingVertical: scaleSpacing(12),
    fontSize: scaleFontSize(isSmallScreen ? 14 : 16),
    color: COLORS.text.primary,
    borderWidth: 1,
    borderColor: COLORS.neutral.gray200,
  },
  textArea: {
    minHeight: scaleSize(80),
    textAlignVertical: 'top',
  },
  timeInput: {
    width: scaleSize(100),
  },
  emojiButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.neutral.white,
    borderRadius: scaleSize(16),
    padding: scaleSpacing(12),
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: COLORS.neutral.gray200,
  },
  selectedEmoji: {
    fontSize: scaleFontSize(40),
  },
  emojiButtonText: {
    fontSize: scaleFontSize(14),
    color: COLORS.primary[500],
    fontWeight: '600',
    marginLeft: scaleSpacing(12),
  },
  emojiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: COLORS.neutral.white,
    borderRadius: scaleSize(16),
    padding: scaleSpacing(12),
    marginTop: scaleSpacing(12),
    borderWidth: 1,
    borderColor: COLORS.neutral.gray200,
  },
  emojiItem: {
    width: scaleSize(44),
    height: scaleSize(44),
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: scaleSize(10),
    margin: scaleSpacing(2),
  },
  emojiItemSelected: {
    backgroundColor: hexToRgba(COLORS.primary[500], 0.15),
  },
  emojiItemText: {
    fontSize: scaleFontSize(24),
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: scaleSpacing(8),
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: scaleSpacing(8),
    paddingHorizontal: scaleSpacing(14),
    borderRadius: scaleSize(20),
    backgroundColor: hexToRgba(COLORS.primary[500], 0.1),
  },
  chipSelected: {
    backgroundColor: COLORS.primary[500],
  },
  chipText: {
    fontSize: scaleFontSize(isSmallScreen ? 12 : 14),
    fontWeight: '600',
    color: COLORS.primary[500],
    marginLeft: scaleSpacing(4),
  },
  chipTextSelected: {
    color: COLORS.neutral.white,
  },
  addButton: {
    padding: scaleSpacing(4),
  },
  listItemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: scaleSpacing(10),
  },
  bulletPoint: {
    width: scaleSize(28),
    height: scaleSize(40),
    alignItems: 'center',
    justifyContent: 'center',
  },
  bulletText: {
    fontSize: scaleFontSize(20),
    color: COLORS.primary[500],
    fontWeight: '700',
  },
  stepNumber: {
    width: scaleSize(28),
    height: scaleSize(28),
    borderRadius: scaleSize(14),
    backgroundColor: COLORS.primary[500],
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: scaleSpacing(6),
  },
  stepNumberText: {
    fontSize: scaleFontSize(13),
    fontWeight: '700',
    color: COLORS.neutral.white,
  },
  listInput: {
    flex: 1,
    marginLeft: scaleSpacing(8),
  },
  instructionInput: {
    minHeight: scaleSize(50),
    textAlignVertical: 'top',
  },
  removeButton: {
    padding: scaleSpacing(8),
    marginLeft: scaleSpacing(4),
  },
  submitSection: {
    marginTop: scaleSpacing(10),
  },
});
