/**
 * App navigation configuration.
 *
 * Stack navigator with all screens. Dark theme matching the GitHub dark style.
 */
import React from 'react';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import WelcomeScreen from '../screens/WelcomeScreen';
import SetupScreen from '../screens/SetupScreen';
import ChatScreen from '../screens/ChatScreen';
import ProjectScreen from '../screens/ProjectScreen';
import GitHubScreen from '../screens/GitHubScreen';
import SettingsScreen from '../screens/SettingsScreen';

export type RootStackParamList = {
  Welcome: undefined;
  Setup: undefined;
  Chat: undefined;
  Project: undefined;
  GitHub: undefined;
  Settings: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

const DarkTheme = {
  ...DefaultTheme,
  dark: true,
  colors: {
    ...DefaultTheme.colors,
    primary: '#58A6FF',
    background: '#0D1117',
    card: '#161B22',
    text: '#E6EDF3',
    border: '#30363D',
    notification: '#F85149',
  },
};

export default function AppNavigator() {
  return (
    <NavigationContainer theme={DarkTheme}>
      <Stack.Navigator
        initialRouteName="Welcome"
        screenOptions={{
          headerStyle: { backgroundColor: '#161B22' },
          headerTintColor: '#E6EDF3',
          headerTitleStyle: { fontWeight: '600' },
          headerShadowVisible: false,
          contentStyle: { backgroundColor: '#0D1117' },
        }}
      >
        <Stack.Screen
          name="Welcome"
          component={WelcomeScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Setup"
          component={SetupScreen}
          options={{ title: 'Setup', headerBackTitle: 'Back' }}
        />
        <Stack.Screen
          name="Chat"
          component={ChatScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Project"
          component={ProjectScreen}
          options={{ title: 'Project', headerBackTitle: 'Back' }}
        />
        <Stack.Screen
          name="GitHub"
          component={GitHubScreen}
          options={{ title: 'GitHub', headerBackTitle: 'Back' }}
        />
        <Stack.Screen
          name="Settings"
          component={SettingsScreen}
          options={{ title: 'Settings', headerBackTitle: 'Back' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
