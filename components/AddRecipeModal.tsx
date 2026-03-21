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
  Keyboard,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import Toast from './Toast';
import { useToast } from '../hooks/useToast';
import PressableScale from './PressableScale';
import Button from './Button';
import { COLORS, SHADOWS, RADIUS, hexToRgba } from '../utils/designSystem';
import { scaleSize, scaleSpacing, scaleFontSize, isSmallScreen } from '../utils/responsive';
import { Recipe, addUserRecipe, RECIPE_EMOJIS } from '../services/recipeService';
import { useAuth } from '../contexts/AuthContext';


interface AddRecipeModalProps {
  visible: boolean;
  onClose: () => void;
  onRecipeAdded: () => void;
}

const CATEGORY_KEYS: Array<{ key: Recipe['category']; labelKey: string; icon: keyof typeof Ionicons.glyphMap }> = [
  { key: 'petit-déjeuner', labelKey: 'addRecipe.breakfast', icon: 'sunny' },
  { key: 'plat', labelKey: 'addRecipe.mainDish', icon: 'restaurant' },
  { key: 'entrée', labelKey: 'addRecipe.starter', icon: 'leaf' },
  { key: 'dessert', labelKey: 'addRecipe.dessert', icon: 'ice-cream' },
  { key: 'snack', labelKey: 'addRecipe.snack', icon: 'cafe' },
  { key: 'boisson', labelKey: 'addRecipe.drink', icon: 'wine' },
];

const DIFFICULTY_KEYS: Array<{ key: Recipe['difficulty']; labelKey: string }> = [
  { key: 'facile', labelKey: 'addRecipe.easy' },
  { key: 'moyen', labelKey: 'addRecipe.medium' },
  { key: 'difficile', labelKey: 'addRecipe.hard' },
];

export default function AddRecipeModal({ visible, onClose, onRecipeAdded }: AddRecipeModalProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
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
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);
  const { showToast, hideToast, toastVisible, toastConfig } = useToast();
  const [errors, setErrors] = useState<{
    name?: string;
    description?: string;
    ingredients?: string;
    instructions?: string;
    prepTime?: string;
  }>({});

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
    setErrors({});
    setCurrentStep(1);
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

  const validateCurrentStep = (): boolean => {
    const newErrors: typeof errors = {};
    if (currentStep === 1) {
      if (!name.trim()) newErrors.name = t('addRecipe.errorNameRequired');
      if (!description.trim()) newErrors.description = t('addRecipe.errorDescRequired');
      const time = parseInt(preparationTime);
      if (isNaN(time) || time <= 0) newErrors.prepTime = t('addRecipe.errorPrepTimeRequired');
    }
    if (currentStep === 2) {
      if (ingredients.filter(i => i.trim()).length === 0) newErrors.ingredients = t('addRecipe.errorIngredientRequired');
    }
    if (currentStep === 3) {
      if (instructions.filter(i => i.trim()).length === 0) newErrors.instructions = t('addRecipe.errorStepRequired');
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (!validateCurrentStep()) return;
    setCurrentStep((s) => (s < 4 ? (s + 1) as 1 | 2 | 3 | 4 : s));
  };

  const handleBack = () => {
    setCurrentStep((s) => (s > 1 ? (s - 1) as 1 | 2 | 3 | 4 : s));
  };

  const handleSave = async () => {
    if (!validateCurrentStep()) return;

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
      }, user?.id);

      showToast({
        type: 'success',
        title: t('addRecipe.recipeAdded'),
        subtitle: name.trim(),
        duration: 2500,
      });
      setTimeout(() => {
        resetForm();
        onRecipeAdded();
        onClose();
      }, 300);
    } catch (error) {
      Alert.alert(t('common.error'), t('addRecipe.saveError'));
    } finally {
      setSaving(false);
    }
  };

  const renderStepProgress = () => (
    <View style={styles.stepProgressRow}>
      {[1, 2, 3, 4].map((s) => (
        <View
          key={s}
          style={[
            styles.stepProgressDot,
            s < currentStep && styles.stepProgressDone,
            s === currentStep && styles.stepProgressActive,
          ]}
        />
      ))}
    </View>
  );

  const renderStep1 = () => (
    <ScrollView
      style={styles.content}
      contentContainerStyle={styles.contentContainer}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {/* Emoji Picker */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('addRecipe.illustration')}</Text>
        <PressableScale
          onPress={() => { Keyboard.dismiss(); setShowEmojiPicker(!showEmojiPicker); }}
          style={styles.emojiButton}
          hapticType="light"
        >
          <Text style={styles.selectedEmoji}>{selectedEmoji}</Text>
          <Text style={styles.emojiButtonText}>{t('addRecipe.change')}</Text>
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
        <Text style={styles.sectionTitle}>{t('addRecipe.recipeName')}</Text>
        <TextInput
          style={[styles.input, errors.name ? styles.inputError : undefined]}
          value={name}
          onChangeText={(text) => { setName(text); if (errors.name) setErrors(e => ({ ...e, name: undefined })); }}
          placeholder={t('addRecipe.recipeNamePlaceholder')}
          placeholderTextColor={COLORS.text.muted}
        />
        {errors.name ? <Text style={styles.errorText}>{errors.name}</Text> : null}
      </View>

      {/* Description */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('addRecipe.description')}</Text>
        <TextInput
          style={[styles.input, styles.textArea, errors.description ? styles.inputError : undefined]}
          value={description}
          onChangeText={(text) => { setDescription(text); if (errors.description) setErrors(e => ({ ...e, description: undefined })); }}
          placeholder={t('addRecipe.descriptionPlaceholder')}
          placeholderTextColor={COLORS.text.muted}
          multiline
          numberOfLines={3}
        />
        {errors.description ? <Text style={styles.errorText}>{errors.description}</Text> : null}
      </View>

      {/* Category */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('addRecipe.category')}</Text>
        <View style={styles.chipRow}>
          {CATEGORY_KEYS.map((cat) => (
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
                {t(cat.labelKey)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Difficulty */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('addRecipe.difficulty')}</Text>
        <View style={styles.chipRow}>
          {DIFFICULTY_KEYS.map((diff) => (
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
                {t(diff.labelKey)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Preparation Time */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('addRecipe.prepTime')}</Text>
        <View style={styles.timeRow}>
          <TextInput
            style={[styles.input, styles.timeInput, errors.prepTime ? styles.inputError : undefined]}
            value={preparationTime}
            onChangeText={(text) => { setPreparationTime(text); if (errors.prepTime) setErrors(e => ({ ...e, prepTime: undefined })); }}
            placeholder="30"
            placeholderTextColor={COLORS.text.muted}
            keyboardType="number-pad"
          />
          <Text style={styles.timeUnit}>{t('addRecipe.minutesUnit')}</Text>
        </View>
        {errors.prepTime ? <Text style={styles.errorText}>{errors.prepTime}</Text> : null}
      </View>

      <View style={{ height: scaleSpacing(40) }} />
    </ScrollView>
  );

  const renderStep2 = () => (
    <ScrollView
      style={styles.content}
      contentContainerStyle={styles.contentContainer}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {/* Ingredients */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, errors.ingredients ? styles.sectionTitleError : undefined]}>{t('addRecipe.ingredients')}</Text>
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
              onChangeText={(text) => { updateIngredient(index, text); if (errors.ingredients) setErrors(e => ({ ...e, ingredients: undefined })); }}
              placeholder={t('addRecipe.ingredientPlaceholder', { index: index + 1 })}
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
        {errors.ingredients ? <Text style={styles.errorText}>{errors.ingredients}</Text> : null}
      </View>

      <View style={{ height: scaleSpacing(40) }} />
    </ScrollView>
  );

  const renderStep3 = () => (
    <ScrollView
      style={styles.content}
      contentContainerStyle={styles.contentContainer}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {/* Instructions */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, errors.instructions ? styles.sectionTitleError : undefined]}>{t('addRecipe.steps')}</Text>
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
              onChangeText={(text) => { updateInstruction(index, text); if (errors.instructions) setErrors(e => ({ ...e, instructions: undefined })); }}
              placeholder={t('addRecipe.stepPlaceholder', { index: index + 1 })}
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
        {errors.instructions ? <Text style={styles.errorText}>{errors.instructions}</Text> : null}
      </View>

      <View style={{ height: scaleSpacing(40) }} />
    </ScrollView>
  );

  const renderStep4 = () => (
    <ScrollView
      style={styles.content}
      contentContainerStyle={styles.contentContainer}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {/* Tips */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('addRecipe.tipsOptional')}</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={tips}
          onChangeText={setTips}
          placeholder={t('addRecipe.tipsPlaceholder')}
          placeholderTextColor={COLORS.text.muted}
          multiline
          numberOfLines={2}
        />
      </View>

      {/* Submit Button */}
      <View style={styles.submitSection}>
        <Button
          onPress={handleSave}
          label={t('addRecipe.saveRecipe2')}
          icon="checkmark-circle"
          variant="gradient"
          loading={saving}
          disabled={saving}
        />
      </View>

      <View style={{ height: scaleSpacing(40) }} />
    </ScrollView>
  );

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleClose}>
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={currentStep === 1 ? handleClose : handleBack} style={styles.closeButton}>
            <Ionicons
              name={currentStep === 1 ? 'close' : 'chevron-back'}
              size={scaleSize(24)}
              color={COLORS.text.primary}
            />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>
              {currentStep === 1 ? t('addRecipe.stepInfos') :
               currentStep === 2 ? t('addRecipe.stepIngredients') :
               currentStep === 3 ? t('addRecipe.stepSteps') :
               t('addRecipe.stepTips')}
            </Text>
            {renderStepProgress()}
          </View>
          <View style={{ width: scaleSize(40) }} />
        </View>

        {/* Step content */}
        {currentStep === 1 && renderStep1()}
        {currentStep === 2 && renderStep2()}
        {currentStep === 3 && renderStep3()}
        {currentStep === 4 && renderStep4()}

        {/* Footer nav — only on steps 1-3 */}
        {currentStep < 4 && (
          <View style={styles.stepFooter}>
            <TouchableOpacity
              onPress={currentStep === 1 ? handleClose : handleBack}
              style={styles.backFooterButton}
            >
              <Text style={styles.backFooterText}>
                {currentStep === 1 ? t('common.cancel') : `← ${t('addRecipe.back')}`}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleNext} style={styles.nextFooterButton}>
              <Text style={styles.nextFooterText}>{t('onboarding.next')} →</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Toast */}
        <Toast
          visible={toastVisible}
          type={toastConfig?.type ?? 'success'}
          title={toastConfig?.title ?? ''}
          subtitle={toastConfig?.subtitle}
          duration={toastConfig?.duration}
          onHide={hideToast}
        />
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
  inputError: {
    borderColor: COLORS.semantic.dangerLight,
  },
  errorText: {
    fontSize: scaleFontSize(12),
    color: COLORS.semantic.dangerLight,
    marginTop: scaleSpacing(4),
  },
  sectionTitleError: {
    color: COLORS.semantic.dangerLight,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeUnit: {
    fontSize: scaleFontSize(isSmallScreen ? 14 : 16),
    color: COLORS.text.secondary,
    marginLeft: scaleSpacing(10),
    fontWeight: '500',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  stepProgressRow: {
    flexDirection: 'row',
    gap: scaleSpacing(6),
    marginBottom: scaleSpacing(8),
  },
  stepProgressDot: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.neutral.gray200,
  },
  stepProgressDone: {
    backgroundColor: COLORS.primary[500],
  },
  stepProgressActive: {
    backgroundColor: COLORS.primary[500],
    opacity: 0.6,
  },
  stepFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: scaleSpacing(20),
    paddingVertical: scaleSpacing(12),
    borderTopWidth: 1,
    borderTopColor: COLORS.neutral.gray200,
    backgroundColor: COLORS.secondary.cream,
  },
  backFooterButton: {
    paddingVertical: scaleSpacing(10),
    paddingHorizontal: scaleSpacing(12),
  },
  backFooterText: {
    fontSize: scaleFontSize(14),
    color: COLORS.text.secondary,
    fontWeight: '500',
  },
  nextFooterButton: {
    backgroundColor: COLORS.primary[500],
    borderRadius: RADIUS.full,
    paddingVertical: scaleSpacing(10),
    paddingHorizontal: scaleSpacing(24),
  },
  nextFooterText: {
    fontSize: scaleFontSize(14),
    fontWeight: '700',
    color: COLORS.neutral.white,
  },
});
