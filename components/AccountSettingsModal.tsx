import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import PressableScale from './PressableScale';

interface AccountSettingsModalProps {
  visible: boolean;
  onClose: () => void;
}

type SettingsSection = 'main' | 'name' | 'email' | 'password' | 'delete';

export default function AccountSettingsModal({ visible, onClose }: AccountSettingsModalProps) {
  const { user, updateProfile, updateEmail, updatePassword, deleteAccount, refreshUser } = useAuth();
  const [currentSection, setCurrentSection] = useState<SettingsSection>('main');
  const [isLoading, setIsLoading] = useState(false);

  // Champs pour modification du nom
  const [fullName, setFullName] = useState('');

  // Champs pour modification de l'email
  const [newEmail, setNewEmail] = useState('');

  // Champs pour modification du mot de passe
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Champs pour suppression de compte
  const [deleteConfirmation, setDeleteConfirmation] = useState('');

  useEffect(() => {
    if (visible && user) {
      setFullName(user.user_metadata?.full_name || '');
      setNewEmail(user.email || '');
      setCurrentSection('main');
    }
  }, [visible, user]);

  const handleClose = () => {
    setCurrentSection('main');
    setNewPassword('');
    setConfirmPassword('');
    setDeleteConfirmation('');
    setShowPassword(false);
    onClose();
  };

  const handleUpdateName = async () => {
    if (!fullName.trim()) {
      Alert.alert('Erreur', 'Veuillez entrer un nom');
      return;
    }

    setIsLoading(true);
    const { error } = await updateProfile({ fullName: fullName.trim() });
    setIsLoading(false);

    if (error) {
      Alert.alert('Erreur', error.message);
    } else {
      await refreshUser();
      Alert.alert('Succes', 'Votre nom a ete mis a jour');
      setCurrentSection('main');
    }
  };

  const handleUpdateEmail = async () => {
    if (!newEmail.trim()) {
      Alert.alert('Erreur', 'Veuillez entrer un email');
      return;
    }

    if (newEmail.trim().toLowerCase() === user?.email?.toLowerCase()) {
      Alert.alert('Erreur', 'Le nouvel email doit etre different');
      return;
    }

    setIsLoading(true);
    const { error } = await updateEmail(newEmail.trim());
    setIsLoading(false);

    if (error) {
      Alert.alert('Erreur', error.message);
    } else {
      Alert.alert(
        'Email de confirmation envoye',
        'Verifiez votre boite mail (ancienne et nouvelle adresse) pour confirmer le changement.',
        [{ text: 'OK', onPress: () => setCurrentSection('main') }]
      );
    }
  };

  const handleUpdatePassword = async () => {
    if (newPassword.length < 6) {
      Alert.alert('Erreur', 'Le mot de passe doit contenir au moins 6 caracteres');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Erreur', 'Les mots de passe ne correspondent pas');
      return;
    }

    setIsLoading(true);
    const { error } = await updatePassword(newPassword);
    setIsLoading(false);

    if (error) {
      Alert.alert('Erreur', error.message);
    } else {
      Alert.alert('Succes', 'Votre mot de passe a ete mis a jour');
      setNewPassword('');
      setConfirmPassword('');
      setCurrentSection('main');
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmation !== 'SUPPRIMER') {
      Alert.alert('Erreur', 'Veuillez taper SUPPRIMER pour confirmer');
      return;
    }

    Alert.alert(
      'Confirmation finale',
      'Cette action est irreversible. Toutes vos donnees seront supprimees definitivement.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer mon compte',
          style: 'destructive',
          onPress: async () => {
            setIsLoading(true);
            const { error } = await deleteAccount();
            setIsLoading(false);

            if (error) {
              Alert.alert('Erreur', error.message);
            } else {
              handleClose();
            }
          },
        },
      ]
    );
  };

  const renderMainSection = () => (
    <View>
      <Text className="text-xl font-bold text-[#3C6E47] mb-6 text-center">
        Parametres du compte
      </Text>

      {/* Info utilisateur */}
      <View className="bg-[#F7F5E6] rounded-xl p-4 mb-6">
        <View className="flex-row items-center">
          <View className="w-12 h-12 rounded-full bg-[#3C6E47] items-center justify-center mr-3">
            <Text className="text-white text-lg font-bold">
              {user?.email?.charAt(0).toUpperCase() || 'U'}
            </Text>
          </View>
          <View className="flex-1">
            <Text className="text-[#3C6E47] font-semibold">
              {user?.user_metadata?.full_name || 'Utilisateur'}
            </Text>
            <Text className="text-[#6A8A6E] text-sm">{user?.email}</Text>
          </View>
        </View>
      </View>

      {/* Options */}
      <View className="gap-3">
        <PressableScale
          onPress={() => setCurrentSection('name')}
          className="bg-white border border-[#3C6E47]/20 rounded-xl p-4 flex-row items-center"
          hapticType="light"
        >
          <View className="w-10 h-10 rounded-full bg-[#A3C9A8]/30 items-center justify-center mr-3">
            <Ionicons name="person-outline" size={20} color="#3C6E47" />
          </View>
          <View className="flex-1">
            <Text className="text-[#3C6E47] font-semibold">Modifier mon nom</Text>
            <Text className="text-[#6A8A6E] text-sm">Changez votre nom d'affichage</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#6A8A6E" />
        </PressableScale>

        <PressableScale
          onPress={() => setCurrentSection('email')}
          className="bg-white border border-[#3C6E47]/20 rounded-xl p-4 flex-row items-center"
          hapticType="light"
        >
          <View className="w-10 h-10 rounded-full bg-[#A3C9A8]/30 items-center justify-center mr-3">
            <Ionicons name="mail-outline" size={20} color="#3C6E47" />
          </View>
          <View className="flex-1">
            <Text className="text-[#3C6E47] font-semibold">Modifier mon email</Text>
            <Text className="text-[#6A8A6E] text-sm">Changez votre adresse email</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#6A8A6E" />
        </PressableScale>

        <PressableScale
          onPress={() => setCurrentSection('password')}
          className="bg-white border border-[#3C6E47]/20 rounded-xl p-4 flex-row items-center"
          hapticType="light"
        >
          <View className="w-10 h-10 rounded-full bg-[#A3C9A8]/30 items-center justify-center mr-3">
            <Ionicons name="lock-closed-outline" size={20} color="#3C6E47" />
          </View>
          <View className="flex-1">
            <Text className="text-[#3C6E47] font-semibold">Modifier mon mot de passe</Text>
            <Text className="text-[#6A8A6E] text-sm">Securisez votre compte</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#6A8A6E" />
        </PressableScale>

        <View className="h-4" />

        <PressableScale
          onPress={() => setCurrentSection('delete')}
          className="bg-red-50 border border-red-200 rounded-xl p-4 flex-row items-center"
          hapticType="medium"
        >
          <View className="w-10 h-10 rounded-full bg-red-100 items-center justify-center mr-3">
            <Ionicons name="trash-outline" size={20} color="#EF4444" />
          </View>
          <View className="flex-1">
            <Text className="text-red-500 font-semibold">Supprimer mon compte</Text>
            <Text className="text-red-400 text-sm">Action irreversible</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#EF4444" />
        </PressableScale>
      </View>
    </View>
  );

  const renderNameSection = () => (
    <View>
      <TouchableOpacity
        onPress={() => setCurrentSection('main')}
        className="flex-row items-center mb-4"
      >
        <Ionicons name="arrow-back" size={24} color="#3C6E47" />
        <Text className="text-[#3C6E47] font-semibold ml-2">Retour</Text>
      </TouchableOpacity>

      <Text className="text-xl font-bold text-[#3C6E47] mb-6">
        Modifier mon nom
      </Text>

      <Text className="text-[#6A8A6E] mb-2">Nom complet</Text>
      <TextInput
        value={fullName}
        onChangeText={setFullName}
        placeholder="Votre nom"
        className="bg-[#F7F5E6] border border-[#3C6E47]/20 rounded-xl px-4 py-3 text-[#3C6E47] mb-6"
        placeholderTextColor="#6A8A6E"
        autoCapitalize="words"
      />

      <PressableScale
        onPress={handleUpdateName}
        className="bg-[#3C6E47] rounded-xl p-4 items-center"
        hapticType="medium"
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text className="text-white font-semibold">Enregistrer</Text>
        )}
      </PressableScale>
    </View>
  );

  const renderEmailSection = () => (
    <View>
      <TouchableOpacity
        onPress={() => setCurrentSection('main')}
        className="flex-row items-center mb-4"
      >
        <Ionicons name="arrow-back" size={24} color="#3C6E47" />
        <Text className="text-[#3C6E47] font-semibold ml-2">Retour</Text>
      </TouchableOpacity>

      <Text className="text-xl font-bold text-[#3C6E47] mb-6">
        Modifier mon email
      </Text>

      <View className="bg-[#FFF3E0] rounded-xl p-3 mb-4 flex-row items-start">
        <Ionicons name="information-circle-outline" size={20} color="#E85D04" />
        <Text className="text-[#E85D04] text-sm ml-2 flex-1">
          Un email de confirmation sera envoye aux deux adresses (ancienne et nouvelle).
        </Text>
      </View>

      <Text className="text-[#6A8A6E] mb-2">Email actuel</Text>
      <Text className="text-[#3C6E47] font-medium mb-4">{user?.email}</Text>

      <Text className="text-[#6A8A6E] mb-2">Nouvel email</Text>
      <TextInput
        value={newEmail}
        onChangeText={setNewEmail}
        placeholder="nouvel@email.com"
        className="bg-[#F7F5E6] border border-[#3C6E47]/20 rounded-xl px-4 py-3 text-[#3C6E47] mb-6"
        placeholderTextColor="#6A8A6E"
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
      />

      <PressableScale
        onPress={handleUpdateEmail}
        className="bg-[#3C6E47] rounded-xl p-4 items-center"
        hapticType="medium"
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text className="text-white font-semibold">Envoyer le lien de confirmation</Text>
        )}
      </PressableScale>
    </View>
  );

  const renderPasswordSection = () => (
    <View>
      <TouchableOpacity
        onPress={() => setCurrentSection('main')}
        className="flex-row items-center mb-4"
      >
        <Ionicons name="arrow-back" size={24} color="#3C6E47" />
        <Text className="text-[#3C6E47] font-semibold ml-2">Retour</Text>
      </TouchableOpacity>

      <Text className="text-xl font-bold text-[#3C6E47] mb-6">
        Modifier mon mot de passe
      </Text>

      <Text className="text-[#6A8A6E] mb-2">Nouveau mot de passe</Text>
      <View className="flex-row items-center bg-[#F7F5E6] border border-[#3C6E47]/20 rounded-xl mb-4">
        <TextInput
          value={newPassword}
          onChangeText={setNewPassword}
          placeholder="Minimum 6 caracteres"
          className="flex-1 px-4 py-3 text-[#3C6E47]"
          placeholderTextColor="#6A8A6E"
          secureTextEntry={!showPassword}
        />
        <TouchableOpacity
          onPress={() => setShowPassword(!showPassword)}
          className="px-4"
        >
          <Ionicons
            name={showPassword ? 'eye-off-outline' : 'eye-outline'}
            size={20}
            color="#6A8A6E"
          />
        </TouchableOpacity>
      </View>

      <Text className="text-[#6A8A6E] mb-2">Confirmer le mot de passe</Text>
      <TextInput
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        placeholder="Retapez le mot de passe"
        className="bg-[#F7F5E6] border border-[#3C6E47]/20 rounded-xl px-4 py-3 text-[#3C6E47] mb-6"
        placeholderTextColor="#6A8A6E"
        secureTextEntry={!showPassword}
      />

      {newPassword.length > 0 && newPassword.length < 6 && (
        <Text className="text-red-500 text-sm mb-4">
          Le mot de passe doit contenir au moins 6 caracteres
        </Text>
      )}

      {confirmPassword.length > 0 && newPassword !== confirmPassword && (
        <Text className="text-red-500 text-sm mb-4">
          Les mots de passe ne correspondent pas
        </Text>
      )}

      <PressableScale
        onPress={handleUpdatePassword}
        className="bg-[#3C6E47] rounded-xl p-4 items-center"
        hapticType="medium"
        disabled={isLoading || newPassword.length < 6 || newPassword !== confirmPassword}
      >
        {isLoading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text className="text-white font-semibold">Modifier le mot de passe</Text>
        )}
      </PressableScale>
    </View>
  );

  const renderDeleteSection = () => (
    <View>
      <TouchableOpacity
        onPress={() => setCurrentSection('main')}
        className="flex-row items-center mb-4"
      >
        <Ionicons name="arrow-back" size={24} color="#3C6E47" />
        <Text className="text-[#3C6E47] font-semibold ml-2">Retour</Text>
      </TouchableOpacity>

      <Text className="text-xl font-bold text-red-500 mb-4">
        Supprimer mon compte
      </Text>

      <View className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
        <View className="flex-row items-start mb-3">
          <Ionicons name="warning-outline" size={24} color="#EF4444" />
          <Text className="text-red-600 font-semibold ml-2 flex-1">
            Attention : Cette action est irreversible !
          </Text>
        </View>
        <Text className="text-red-500 text-sm">
          En supprimant votre compte, vous perdrez :
        </Text>
        <View className="mt-2 ml-2">
          <Text className="text-red-500 text-sm">• Toutes vos listes d'aliments</Text>
          <Text className="text-red-500 text-sm">• Votre historique</Text>
          <Text className="text-red-500 text-sm">• Vos statistiques</Text>
          <Text className="text-red-500 text-sm">• Vos parametres</Text>
        </View>
      </View>

      <Text className="text-[#6A8A6E] mb-2">
        Pour confirmer, tapez SUPPRIMER ci-dessous :
      </Text>
      <TextInput
        value={deleteConfirmation}
        onChangeText={setDeleteConfirmation}
        placeholder="SUPPRIMER"
        className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-500 mb-6 text-center font-bold"
        placeholderTextColor="#EF444480"
        autoCapitalize="characters"
      />

      <PressableScale
        onPress={handleDeleteAccount}
        className={`rounded-xl p-4 items-center ${
          deleteConfirmation === 'SUPPRIMER' ? 'bg-red-500' : 'bg-red-200'
        }`}
        hapticType="heavy"
        disabled={isLoading || deleteConfirmation !== 'SUPPRIMER'}
      >
        {isLoading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text className="text-white font-semibold">
            Supprimer definitivement mon compte
          </Text>
        )}
      </PressableScale>
    </View>
  );

  const renderContent = () => {
    switch (currentSection) {
      case 'name':
        return renderNameSection();
      case 'email':
        return renderEmailSection();
      case 'password':
        return renderPasswordSection();
      case 'delete':
        return renderDeleteSection();
      default:
        return renderMainSection();
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
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1 bg-white"
      >
        {/* Header */}
        <View className="flex-row items-center justify-between px-5 pt-4 pb-2 border-b border-[#3C6E47]/10">
          <View className="w-10" />
          <View className="w-10 h-1 bg-[#3C6E47]/20 rounded-full" />
          <TouchableOpacity onPress={handleClose} className="w-10 items-end">
            <Ionicons name="close" size={24} color="#3C6E47" />
          </TouchableOpacity>
        </View>

        <ScrollView
          className="flex-1"
          contentContainerStyle={{ padding: 20 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {renderContent()}
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}
