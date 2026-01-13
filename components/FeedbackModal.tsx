import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Alert,
  Image,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import AnimatedModal from './AnimatedModal';
import PressableScale from './PressableScale';
import { sendFeedback } from '../utils/feedbackService';

interface FeedbackModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function FeedbackModal({
  visible,
  onClose,
}: FeedbackModalProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [feedback, setFeedback] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [isSending, setIsSending] = useState(false);

  const handleAddImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (status !== 'granted') {
        Alert.alert('Permission requise', 'Nous avons besoin de votre permission pour accéder à vos photos.');
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
      Alert.alert('Erreur', 'Impossible de sélectionner une image');
    }
  };

  const handleRemoveImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
  };

  const handleSendFeedback = async () => {
    if (!name.trim()) {
      Alert.alert('Erreur', 'Veuillez entrer votre nom');
      return;
    }
    if (!email.trim()) {
      Alert.alert('Erreur', 'Veuillez entrer votre email');
      return;
    }
    if (!feedback.trim()) {
      Alert.alert('Erreur', 'Veuillez entrer votre message');
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
      Alert.alert('Succès', 'Votre feedback a été envoyé !');
    } catch (error: any) {
      Alert.alert('Erreur', error.message || 'Impossible d\'envoyer le feedback');
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
      <View className="bg-[#F7F5E6] rounded-3xl overflow-hidden shadow-2xl">
        {/* Header */}
        <View className="flex-row justify-between items-center px-4 py-3 border-b border-[#3C6E47]/20">
          <PressableScale
            onPress={onClose}
            disabled={isSending}
            className="px-3 py-2 rounded-xl"
          >
            <Text className={`font-medium text-base ${isSending ? 'text-[#6A8A6E]' : 'text-[#3C6E47]'}`}>
              Annuler
            </Text>
          </PressableScale>

          <Text className="text-[#3C6E47] font-bold text-lg">Feedback</Text>

          <PressableScale
            onPress={handleSendFeedback}
            disabled={isSending || !isValid}
            hapticType="medium"
            className="px-3 py-2 rounded-xl"
          >
            <Text className={`font-semibold text-base ${isSending || !isValid ? 'text-[#6A8A6E]' : 'text-[#3C6E47]'}`}>
              {isSending ? 'Envoi...' : 'Envoyer'}
            </Text>
          </PressableScale>
        </View>

        {/* Content */}
        <View className="p-4">
          {/* Name & Email row */}
          <View className="flex-row gap-2 mb-3">
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Nom"
              placeholderTextColor="#6A8A6E"
              className="flex-1 bg-[#A3C9A8]/40 rounded-xl px-4 py-3 border border-[#3C6E47]/20 text-[#3C6E47] text-sm"
              style={{ fontSize: 14 }}
            />
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="Email"
              placeholderTextColor="#6A8A6E"
              keyboardType="email-address"
              autoCapitalize="none"
              className="flex-1 bg-[#A3C9A8]/40 rounded-xl px-4 py-3 border border-[#3C6E47]/20 text-[#3C6E47] text-sm"
              style={{ fontSize: 14 }}
            />
          </View>

          {/* Message */}
          <TextInput
            value={feedback}
            onChangeText={setFeedback}
            placeholder="Votre message..."
            placeholderTextColor="#6A8A6E"
            multiline
            numberOfLines={4}
            className="bg-[#A3C9A8]/40 rounded-xl px-4 py-3 border border-[#3C6E47]/20 text-[#3C6E47] text-sm mb-3"
            style={{ fontSize: 14, textAlignVertical: 'top', minHeight: 100 }}
          />

          {/* Images row */}
          <View className="flex-row items-center gap-2">
            {images.map((uri, index) => (
              <View key={index} className="relative">
                <Image
                  source={{ uri }}
                  className="w-14 h-14 rounded-xl"
                  style={{ resizeMode: 'cover' }}
                />
                <PressableScale
                  onPress={() => handleRemoveImage(index)}
                  className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 items-center justify-center"
                  hapticType="light"
                >
                  <Ionicons name="close" size={12} color="white" />
                </PressableScale>
              </View>
            ))}

            {images.length < 3 && (
              <PressableScale
                onPress={handleAddImage}
                className="w-14 h-14 rounded-xl bg-[#A3C9A8]/40 border border-dashed border-[#3C6E47]/30 items-center justify-center"
                hapticType="light"
              >
                <Ionicons name="image-outline" size={20} color="#3C6E47" />
              </PressableScale>
            )}
          </View>
        </View>
      </View>
    </AnimatedModal>
  );
}
