import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
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
            <Text style={styles.title}>Oups !</Text>
            <Text style={styles.message}>
              Une erreur inattendue s'est produite.
            </Text>
            <Text style={styles.subtitle}>
              L'équipe a été notifiée et nous travaillons à résoudre le problème.
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
              <Text style={styles.buttonText}>Réessayer</Text>
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
    backgroundColor: '#F7F5E6',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  content: {
    alignItems: 'center',
    maxWidth: 400,
  },
  emoji: {
    fontSize: 64,
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#3C6E47',
    marginBottom: 12,
  },
  message: {
    fontSize: 18,
    color: '#333',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#6A8A6E',
    textAlign: 'center',
    marginBottom: 24,
  },
  errorDetails: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 24,
    width: '100%',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  errorText: {
    fontSize: 12,
    color: '#d32f2f',
    fontFamily: 'monospace',
  },
  button: {
    backgroundColor: '#3C6E47',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ErrorBoundary;
