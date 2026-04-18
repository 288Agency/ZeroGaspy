import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Platform, InteractionManager } from 'react-native';
import { Session, User } from '@supabase/supabase-js';
import * as AppleAuthentication from 'expo-apple-authentication';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../config/supabase';
import { migrateLocalDataToCloud, syncWithCloud } from '../services/supabase/syncService';
import { migrateLocalRecipesToCloud, syncRecipes } from '../services/supabase/recipeSyncService';
import { assignAndStoreVariant, clearRecipeCache } from '../services/recipeService';
import {
  validateEmail,
  validatePassword,
  sanitizeEmail,
  checkLoginRateLimit,
  checkSignupRateLimit,
  checkPasswordResetRateLimit,
  resetRateLimit,
} from '../utils/security';
import logger from '../utils/logger';
import {
  trackAccountCreated as analyticsTrackAccountCreated,
  trackSignIn as analyticsTrackSignIn,
  trackAuthSkipped as analyticsTrackAuthSkipped,
  resetAnalytics,
} from '../services/analytics';
import { deactivatePushTokens } from '../services/pushTokenService';
import { initCloudNotificationPrefs } from '../services/notificationPreferencesSync';
import { savePendingReferralCode, completeReferral, syncBonusScanCredits } from '../services/referralService';

const SKIP_AUTH_KEY = 'skip_auth_preference';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isLocalMode: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, fullName?: string, referralCode?: string) => Promise<{ error: Error | null }>;
  signInWithApple: () => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: Error | null }>;
  skipAuth: () => void;
  updateProfile: (data: { fullName?: string }) => Promise<{ error: Error | null }>;
  updateEmail: (newEmail: string) => Promise<{ error: Error | null }>;
  updatePassword: (newPassword: string) => Promise<{ error: Error | null }>;
  deleteAccount: () => Promise<{ error: Error | null }>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [skippedAuth, setSkippedAuth] = useState(false);

  useEffect(() => {
    // Restaurer la préférence "Passer" au démarrage
    const initAuth = async () => {
      try {
        const skipAuthPref = await AsyncStorage.getItem(SKIP_AUTH_KEY);
        if (skipAuthPref === 'true') {
          setSkippedAuth(true);
        }
      } catch (error) {
        logger.error('Erreur restauration préférence auth:', error);
      }

      // Recuperer la session existante au demarrage
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      setUser(session?.user ?? null);
      setIsLoading(false);
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        logger.debug('Auth state changed:', event);

        setSession(session);
        setUser(session?.user ?? null);

        if (event === 'SIGNED_IN' && session?.user) {
          const userId = session.user.id;
          InteractionManager.runAfterInteractions(async () => {
            try {
              const syncData = async () => { await migrateLocalDataToCloud(userId); await syncWithCloud(userId); };
              const syncRecipeData = async () => { await migrateLocalRecipesToCloud(userId); await syncRecipes(userId); };
              await Promise.all([
                syncData(),
                syncRecipeData(),
                assignAndStoreVariant(userId),
                initCloudNotificationPrefs(userId),
                completeReferral(userId),
                syncBonusScanCredits(userId),
              ]);
              await AsyncStorage.removeItem(SKIP_AUTH_KEY);
              setSkippedAuth(false);
            } catch (error) {
              logger.error('Erreur sync au login:', error);
            }
          });
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      // Rate limiting
      const rateLimit = checkLoginRateLimit();
      if (!rateLimit.allowed) {
        const secondsLeft = Math.ceil(rateLimit.resetIn / 1000);
        return { error: new Error(`Trop de tentatives. Reessayez dans ${secondsLeft} secondes.`) };
      }

      // Validation email
      const emailValidation = validateEmail(email);
      if (!emailValidation.valid) {
        return { error: new Error(emailValidation.error || 'Email invalide') };
      }

      const sanitizedEmail = sanitizeEmail(email);

      const { error } = await supabase.auth.signInWithPassword({
        email: sanitizedEmail,
        password,
      });

      if (error) {
        return { error: new Error(translateError(error.message)) };
      }

      // Reset rate limit on success
      resetRateLimit('login');
      analyticsTrackSignIn('email');
      return { error: null };
    } catch (error: any) {
      return { error: new Error(error.message || 'Erreur de connexion') };
    }
  };

  const signUp = async (email: string, password: string, fullName?: string, referralCode?: string) => {
    try {
      // Rate limiting
      const rateLimit = checkSignupRateLimit();
      if (!rateLimit.allowed) {
        const minutesLeft = Math.ceil(rateLimit.resetIn / 60000);
        return { error: new Error(`Trop de tentatives. Reessayez dans ${minutesLeft} minute(s).`) };
      }

      // Validation email
      const emailValidation = validateEmail(email);
      if (!emailValidation.valid) {
        return { error: new Error(emailValidation.error || 'Email invalide') };
      }

      // Validation mot de passe renforcee
      const passwordValidation = validatePassword(password);
      if (!passwordValidation.isValid) {
        return { error: new Error(passwordValidation.errors[0] || 'Mot de passe invalide') };
      }

      const sanitizedEmail = sanitizeEmail(email);

      const { data, error } = await supabase.auth.signUp({
        email: sanitizedEmail,
        password,
        options: {
          data: {
            full_name: fullName?.trim(),
          },
          emailRedirectTo: 'zerogaspy://auth/confirm',
        },
      });

      if (error) {
        return { error: new Error(translateError(error.message)) };
      }

      // Supabase retourne 200 sans erreur même si le compte existe déjà
      // mais dans ce cas identities est vide
      if (data.user && (!data.user.identities || data.user.identities.length === 0)) {
        return { error: new Error('USER_ALREADY_EXISTS') };
      }

      // Reset rate limit on success
      resetRateLimit('signup');
      analyticsTrackAccountCreated('email');

      if (referralCode?.trim()) {
        await savePendingReferralCode(referralCode.trim());
      }

      return { error: null };
    } catch (error: any) {
      return { error: new Error(error.message || 'Erreur lors de l\'inscription') };
    }
  };

  const signInWithApple = async () => {
    try {
      if (Platform.OS !== 'ios') {
        return { error: new Error('Connexion Apple disponible uniquement sur iOS') };
      }

      const isAvailable = await AppleAuthentication.isAvailableAsync();
      if (!isAvailable) {
        return { error: new Error('La connexion Apple n\'est pas disponible sur cet appareil') };
      }

      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      if (!credential.identityToken) {
        return { error: new Error('Impossible de recuperer le token Apple. Veuillez reessayer.') };
      }

      const { data, error } = await supabase.auth.signInWithIdToken({
        provider: 'apple',
        token: credential.identityToken,
      });

      if (error) {
        return { error: new Error(translateError(error.message)) };
      }

      // Apple ne fournit le nom que lors de la première connexion
      if (credential.fullName) {
        const fullName = [credential.fullName.givenName, credential.fullName.familyName]
          .filter(Boolean)
          .join(' ')
          .trim();

        if (fullName && data.user) {
          await supabase.auth.updateUser({
            data: { full_name: fullName },
          });
        }
      }

      analyticsTrackSignIn('apple');
      return { error: null };
    } catch (error: any) {
      if (error.code === 'ERR_REQUEST_CANCELED') {
        return { error: null };
      }
      return { error: new Error(error.message || 'Erreur lors de la connexion Apple') };
    }
  };

  const signOut = async () => {
    try {
      // Deactivate push tokens before signing out
      if (user?.id) {
        await deactivatePushTokens(user.id);
      }
      await supabase.auth.signOut();
      // Clear user-specific cached data so next user starts fresh.
      // Sans ça, un second utilisateur sur le même device voit l'inventaire/XP/streaks du précédent.
      await clearRecipeCache(user?.id);
      await AsyncStorage.multiRemove([
        SKIP_AUTH_KEY,
        'user_recipes',
        'inventory_lists',
        '@zerogaspy_gamification',
        '@zerogaspy_challenges',
        '@zerogaspy_savings_goal',
        '@zerogaspy_pending_referral',
        '@zerogaspy_bonus_scans',
      ]);
      setSkippedAuth(false);
      resetAnalytics();
    } catch (error) {
      logger.error('Erreur deconnexion:', error);
    }
  };

  const resetPassword = async (email: string) => {
    try {
      // Rate limiting
      const rateLimit = checkPasswordResetRateLimit();
      if (!rateLimit.allowed) {
        const minutesLeft = Math.ceil(rateLimit.resetIn / 60000);
        return { error: new Error(`Trop de tentatives. Reessayez dans ${minutesLeft} minute(s).`) };
      }

      // Validation email
      const emailValidation = validateEmail(email);
      if (!emailValidation.valid) {
        return { error: new Error(emailValidation.error || 'Email invalide') };
      }

      const sanitizedEmail = sanitizeEmail(email);

      const { error } = await supabase.auth.resetPasswordForEmail(
        sanitizedEmail,
        {
          redirectTo: 'zerogaspy://auth/reset-password',
        }
      );

      if (error) {
        return { error: new Error(translateError(error.message)) };
      }
      return { error: null };
    } catch (error: any) {
      return { error: new Error(error.message || 'Erreur envoi email') };
    }
  };

  const skipAuth = async () => {
    try {
      await AsyncStorage.setItem(SKIP_AUTH_KEY, 'true');
      setSkippedAuth(true);
      analyticsTrackAuthSkipped();
      logger.info('✅ Préférence "Passer" sauvegardée');
    } catch (error) {
      logger.error('Erreur sauvegarde préférence auth:', error);
      setSkippedAuth(true); // Quand même activer pour cette session
    }
  };

  const updateProfile = async (data: { fullName?: string }) => {
    try {
      const { error } = await supabase.auth.updateUser({
        data: {
          full_name: data.fullName?.trim(),
        },
      });

      if (error) {
        return { error: new Error(translateError(error.message)) };
      }
      return { error: null };
    } catch (error: any) {
      return { error: new Error(error.message || 'Erreur lors de la mise a jour du profil') };
    }
  };

  const updateEmail = async (newEmail: string) => {
    try {
      const { error } = await supabase.auth.updateUser({
        email: newEmail.trim().toLowerCase(),
      }, {
        emailRedirectTo: 'zerogaspy://auth/confirm-email-change',
      });

      if (error) {
        return { error: new Error(translateError(error.message)) };
      }
      return { error: null };
    } catch (error: any) {
      return { error: new Error(error.message || 'Erreur lors de la mise a jour de l\'email') };
    }
  };

  const updatePassword = async (newPassword: string) => {
    try {
      // Validation mot de passe renforcee
      const passwordValidation = validatePassword(newPassword);
      if (!passwordValidation.isValid) {
        return { error: new Error(passwordValidation.errors[0] || 'Mot de passe invalide') };
      }

      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        return { error: new Error(translateError(error.message)) };
      }
      return { error: null };
    } catch (error: any) {
      return { error: new Error(error.message || 'Erreur lors de la mise a jour du mot de passe') };
    }
  };

  const deleteAccount = async () => {
    try {
      // Appeler une fonction Edge Supabase pour supprimer le compte
      // Car la suppression d'utilisateur necessite des droits admin
      const { error } = await supabase.functions.invoke('delete-user', {
        body: { userId: user?.id },
      });

      if (error) {
        return { error: new Error(translateError(error.message)) };
      }

      // Deconnecter l'utilisateur apres suppression
      await signOut();
      return { error: null };
    } catch (error: any) {
      return { error: new Error(error.message || 'Erreur lors de la suppression du compte') };
    }
  };

  const refreshUser = async () => {
    try {
      const { data: { user: refreshedUser } } = await supabase.auth.getUser();
      if (refreshedUser) {
        setUser(refreshedUser);
      }
    } catch (error) {
      logger.error('Erreur refresh user:', error);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        isLoading,
        isAuthenticated: !!user || skippedAuth,
        isLocalMode: skippedAuth && !user,
        signIn,
        signUp,
        signInWithApple,
        signOut,
        resetPassword,
        skipAuth,
        updateProfile,
        updateEmail,
        updatePassword,
        deleteAccount,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth doit etre utilise dans un AuthProvider');
  }
  return context;
}

// Traduire les erreurs Supabase en francais
function translateError(message: string): string {
  const translations: Record<string, string> = {
    'Invalid login credentials': 'Email ou mot de passe incorrect',
    'Email not confirmed': 'Veuillez confirmer votre email',
    'User already registered': 'Un compte existe deja avec cet email',
    'Password should be at least 6 characters': 'Le mot de passe doit contenir au moins 6 caracteres',
    'Unable to validate email address: invalid format': 'Format d\'email invalide',
    'Email rate limit exceeded': 'Trop de tentatives, reessayez plus tard',
    'Network request failed': 'Erreur de connexion, verifiez votre internet',
    'New password should be different from the old password': 'Le nouveau mot de passe doit etre different de l\'ancien',
    'A user with this email address has already been registered': 'Un compte existe deja avec cet email',
    'Email address cannot be used as it is not authorized': 'Cet email n\'est pas autorise',
    'For security purposes, you can only request this once every 60 seconds': 'Pour des raisons de securite, reessayez dans 60 secondes',
  };

  return translations[message] || message;
}
