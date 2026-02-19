import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import i18n from '../i18n';
import { COLORS, SPACING, RADIUS } from '../utils/designSystem';
import logger from '../utils/logger';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Error Boundary pour capturer les erreurs React et éviter les crashes de l'app
 * Affiche un écran de secours et permet à l'utilisateur de réessayer
 */
class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    // Met à jour l'état pour afficher l'UI de secours
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log l'erreur pour le debugging
    logger.error('ErrorBoundary caught an error:', error.message);
    logger.error('Component stack:', errorInfo.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      // UI personnalisée si fournie
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // UI par défaut
      return (
        <View style={styles.container}>
          <View style={styles.content}>
            <Text style={styles.emoji}>😕</Text>
            <Text style={styles.title}>{i18n.t('errorBoundary.title')}</Text>
            <Text style={styles.message}>
              {i18n.t('errorBoundary.message')}
            </Text>
            <Text style={styles.subtitle}>
              {i18n.t('errorBoundary.subtitle')}
            </Text>

            {__DEV__ && this.state.error && (
              <View style={styles.errorDetails}>
                <Text style={styles.errorText}>
                  {this.state.error.toString()}
                </Text>
              </View>
            )}

            <TouchableOpacity
              style={styles.button}
              onPress={this.handleReset}
              activeOpacity={0.8}
            >
              <Text style={styles.buttonText}>{i18n.t('errorBoundary.retry')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.secondary.cream,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
  },
  content: {
    alignItems: 'center',
    maxWidth: 400,
  },
  emoji: {
    fontSize: 64,
    marginBottom: SPACING.xl,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.primary[500],
    marginBottom: SPACING.md,
  },
  message: {
    fontSize: 18,
    color: COLORS.neutral.gray800,
    textAlign: 'center',
    marginBottom: SPACING.sm,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.text.tertiary,
    textAlign: 'center',
    marginBottom: SPACING['2xl'],
  },
  errorDetails: {
    backgroundColor: COLORS.neutral.white,
    padding: SPACING.md,
    borderRadius: RADIUS.sm,
    marginBottom: SPACING['2xl'],
    width: '100%',
    borderWidth: 1,
    borderColor: COLORS.neutral.gray300,
  },
  errorText: {
    fontSize: 12,
    color: COLORS.semantic.danger,
    fontFamily: 'monospace',
  },
  button: {
    backgroundColor: COLORS.primary[500],
    paddingHorizontal: SPACING['3xl'],
    paddingVertical: 14,
    borderRadius: RADIUS.sm,
    elevation: 2,
    shadowColor: COLORS.neutral.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  buttonText: {
    color: COLORS.neutral.white,
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ErrorBoundary;
