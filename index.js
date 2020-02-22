/**
 * @format
 */

import {AppRegistry} from 'react-native';
import {decode, encode} from 'base-64';
import App from './src/App';
import {name as appName} from './app.json';

if (!global.btoa) {
  global.btoa = encode;
}

if (!global.atob) {
  global.atob = decode;
}

AppRegistry.registerComponent(appName, () => App);
