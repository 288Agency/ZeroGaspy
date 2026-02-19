import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Alert,
  Image,
  StyleSheet,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import AnimatedModal from './AnimatedModal';
import PressableScale from './PressableScale';
import { sendFeedback } from '../utils/feedbackService';
import { COLORS, SPACING, RADIUS, hexToRgba, SHADOWS } from '../utils/designSystem';

interface FeedbackModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function FeedbackModal({
  visible,
  onClose,
}: FeedbackModalProps) {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [feedback, setFeedback] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [isSending, setIsSending] = useState(false);

  const handleAddImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (status !== 'granted') {
        Alert.alert(t('feedback.permissionRequired'), t('feedback.permissionText'));
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setImages([...images, result.assets[0].uri]);
      }
    } catch (error) {
      Alert.alert(t('common.error'), t('feedback.imageError'));
    }
  };

  const handleRemoveImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
  };

  const handleSendFeedback = async () => {
    if (!name.trim()) {
      Alert.alert(t('common.error'), t('feedback.errorName'));
      return;
    }
    if (!email.trim()) {
      Alert.alert(t('common.error'), t('feedback.errorEmail'));
      return;
    }
    if (!feedback.trim()) {
      Alert.alert(t('common.error'), t('feedback.errorMessage'));
      return;
    }

    setIsSending(true);
    try {
      await sendFeedback({
        name: name.trim(),
        email: email.trim(),
        message: feedback.trim(),
        images: images,
      });

      setName('');
      setEmail('');
      setFeedback('');
      setImages([]);
      onClose();
      Alert.alert(t('common.success'), t('feedback.sent'));
    } catch (error: any) {
      Alert.alert(t('common.error'), error.message || t('feedback.sendError'));
    } finally {
      setIsSending(false);
    }
  };

  const isValid = name.trim() && email.trim() && feedback.trim();

  return (
    <AnimatedModal
      visible={visible}
      onClose={onClose}
      position="center"
      closeOnBackdrop={!isSending}
    >
      <View style={[styles.container, SHADOWS.xl]}>
        {/* Header */}
        <View style={styles.header}>
          <PressableScale
            onPress={onClose}
            disabled={isSending}
            style={styles.headerButton}
          >
            <Text style={[styles.cancelText, isSending && styles.disabledText]}>
              {t('feedback.cancel')}
            </Text>
          </PressableScale>

          <Text style={styles.headerTitle}>{t('feedback.title')}</Text>

          <PressableScale
            onPress={handleSendFeedback}
            disabled={isSending || !isValid}
            hapticType="medium"
            style={styles.headerButton}
          >
            <Text style={[styles.sendText, (isSending || !isValid) && styles.disabledText]}>
              {isSending ? t('feedback.sending') : t('feedback.send')}
            </Text>
          </PressableScale>
        </View>

        {/* Content */}
        <View style={styles.content}>
          {/* Name & Email row */}
          <View style={styles.inputRow}>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder={t('feedback.namePlaceholder')}
              placeholderTextColor={COLORS.text.tertiary}
              style={styles.halfInput}
            />
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder={t('feedback.emailPlaceholder')}
              placeholderTextColor={COLORS.text.tertiary}
              keyboardType="email-address"
              autoCapitalize="none"
              style={styles.halfInput}
            />
          </View>

          {/* Message */}
          <TextInput
            value={feedback}
            onChangeText={setFeedback}
            placeholder={t('feedback.messagePlaceholder')}
            placeholderTextColor={COLORS.text.tertiary}
            multiline
            numberOfLines={4}
            style={styles.messageInput}
          />

          {/* Images row */}
          <View style={styles.imagesRow}>
            {images.map((uri, index) => (
              <View key={index} style={styles.imageWrapper}>
                <Image
                  source={{ uri }}
                  style={styles.image}
                />
                <PressableScale
                  onPress={() => handleRemoveImage(index)}
                  style={styles.removeButton}
                  hapticType="light"
                >
                  <Ionicons name="close" size={12} color={COLORS.neutral.white} />
                </PressableScale>
              </View>
            ))}

            {images.length < 3 && (
              <PressableScale
                onPress={handleAddImage}
                style={styles.addImageButton}
                hapticType="light"
              >
                <Ionicons name="image-outline" size={20} color={COLORS.primary[500]} />
              </PressableScale>
            )}
          </View>
        </View>
      </View>
    </AnimatedModal>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.secondary.cream,
    borderRadius: RADIUS['3xl'],
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: hexToRgba(COLORS.primary[500], 0.2),
  },
  headerButton: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.lg,
  },
  cancelText: {
    fontWeight: '500',
    fontSize: 16,
    color: COLORS.primary[500],
  },
  disabledText: {
    color: COLORS.text.tertiary,
  },
  headerTitle: {
    color: COLORS.primary[500],
    fontWeight: '700',
    fontSize: 18,
  },
  sendText: {
    fontWeight: '600',
    fontSize: 16,
    color: COLORS.primary[500],
  },
  content: {
    padding: SPACING.lg,
  },
  inputRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  halfInput: {
    flex: 1,
    backgroundColor: hexToRgba(COLORS.secondary.sage, 0.4),
    borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderWidth: 1,
    borderColor: hexToRgba(COLORS.primary[500], 0.2),
    color: COLORS.primary[500],
    fontSize: 14,
  },
  messageInput: {
    backgroundColor: hexToRgba(COLORS.secondary.sage, 0.4),
    borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderWidth: 1,
    borderColor: hexToRgba(COLORS.primary[500], 0.2),
    color: COLORS.primary[500],
    fontSize: 14,
    textAlignVertical: 'top',
    minHeight: 100,
    marginBottom: SPACING.md,
  },
  imagesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  imageWrapper: {
    position: 'relative',
  },
  image: {
    width: 56,
    height: 56,
    borderRadius: RADIUS.lg,
    resizeMode: 'cover',
  },
  removeButton: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 20,
    height: 20,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.semantic.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addImageButton: {
    width: 56,
    height: 56,
    borderRadius: RADIUS.lg,
    backgroundColor: hexToRgba(COLORS.secondary.sage, 0.4),
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: hexToRgba(COLORS.primary[500], 0.3),
    alignItems: 'center',
    justifyContent: 'center',
  },
});
