import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../config/supabase';
import { migrateLocalDataToCloud } from '../services/supabase/syncService';
import logger from '../utils/logger';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isLocalMode: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, fullName?: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: Error | null }>;
  skipAuth: () => void;
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
    // Recuperer la session existante au demarrage
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setIsLoading(false);
    });

    // Ecouter les changements d'authentification
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        logger.debug('Auth state changed:', event);
        setSession(session);
        setUser(session?.user ?? null);

        // Migrer les donnees locales lors de la premiere connexion
        if (event === 'SIGNED_IN' && session?.user) {
          try {
            await migrateLocalDataToCloud(session.user.id);
          } catch (error) {
            logger.error('Erreur migration:', error);
          }
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (error) {
        return { error: new Error(translateError(error.message)) };
      }
      return { error: null };
    } catch (error: any) {
      return { error: new Error(error.message || 'Erreur de connexion') };
    }
  };

  const signUp = async (email: string, password: string, fullName?: string) => {
    try {
      const { error } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          data: {
            full_name: fullName?.trim(),
          },
        },
      });

      if (error) {
        return { error: new Error(translateError(error.message)) };
      }
      return { error: null };
    } catch (error: any) {
      return { error: new Error(error.message || 'Erreur lors de l\'inscription') };
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      setSkippedAuth(false);
    } catch (error) {
      logger.error('Erreur deconnexion:', error);
    }
  };

  const resetPassword = async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(
        email.trim().toLowerCase(),
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

  const skipAuth = () => {
    setSkippedAuth(true);
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
        signOut,
        resetPassword,
        skipAuth,
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
  };

  return translations[message] || message;
}
