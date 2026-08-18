import 'react-native-gesture-handler';
import { registerRootComponent } from 'expo';
import App from './src/App.js';


// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It ensures that whether you load the app in Expo Go, Web, or Native build,
// the environment is set up appropriately.
registerRootComponent(App);
