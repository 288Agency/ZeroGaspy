import { registerRootComponent } from 'expo';
import { LogBox, Platform } from 'react-native';

import App from './App';

// Enregistrer le widget task handler pour Android
if (Platform.OS === 'android') {
  const { registerWidgetTaskHandler } = require('react-native-android-widget');
  const { widgetTaskHandler } = require('./widgets/widgetTaskHandler');
  registerWidgetTaskHandler(widgetTaskHandler);
}

LogBox.ignoreLogs([
  'SafeAreaView has been deprecated', // From @react-navigation dependency
  'It looks like you might be using shared value',
  'Value being stored in SecureStore is larger than 2048 bytes', // Handled by fallback to AsyncStorage
]);

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
