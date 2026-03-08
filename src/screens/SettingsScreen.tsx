/**
 * SettingsScreen
 *
 * Change API key, restart the Codex server, or reset the full setup.
 */
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { useSettingsStore, useSetupStore, useProjectStore, useChatStore } from '../stores/appStore';
import { runInUbuntu } from '../utils/termux';
import { generateLauncherScript } from '../utils/bootstrap';

type Props = {
  navigation: { navigate: (screen: string) => void };
};

const API_KEY_STORAGE_KEY = 'openai_api_key';

export default function SettingsScreen({ navigation }: Props) {
  const { apiKey, setApiKey, setSetupComplete, reset: resetSettings } = useSettingsStore();
  const { reset: resetSetup } = useSetupStore();
  const { projectPath } = useProjectStore();
  const { clearMessages, setConnectionStatus } = useChatStore();
  const [newApiKey, setNewApiKey] = useState('');

  const updateApiKey = useCallback(async () => {
    const key = newApiKey.trim();
    if (!key.startsWith('sk-')) {
      Alert.alert('Invalid Key', 'API key must start with sk-');
      return;
    }

    await SecureStore.setItemAsync(API_KEY_STORAGE_KEY, key);
    setApiKey(key);

    // Update the launcher script with new key
    const launcher = generateLauncherScript(key);
    await runInUbuntu(`cat > /root/start-codex.sh << 'EOF'\n${launcher}\nEOF\nchmod +x /root/start-codex.sh`);

    setNewApiKey('');
    Alert.alert('Updated', 'API key has been updated. Restart the server to apply.');
  }, [newApiKey, setApiKey]);

  const restartServer = useCallback(async () => {
    try {
      setConnectionStatus('disconnected');

      // Kill any existing codex process
      await runInUbuntu('pkill -f "codex app-server" || true');

      // Build the proot command with optional bind mount
      const bindArg = projectPath
        ? `--bind ${projectPath}:/root/project`
        : '';

      // Start the server
      await runInUbuntu(
        `${bindArg ? `proot-distro login ubuntu ${bindArg} -- ` : ''}bash /root/start-codex.sh &`,
      );

      Alert.alert('Server Restarted', 'The Codex server is restarting. Return to the chat to connect.');
    } catch {
      Alert.alert('Error', 'Failed to restart the server');
    }
  }, [projectPath, setConnectionStatus]);

  const resetAll = useCallback(() => {
    Alert.alert(
      'Reset Everything',
      'This will clear all settings and require re-running setup. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            await SecureStore.deleteItemAsync(API_KEY_STORAGE_KEY);
            resetSettings();
            resetSetup();
            clearMessages();
            navigation.navigate('Welcome');
          },
        },
      ],
    );
  }, [resetSettings, resetSetup, clearMessages, navigation]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Settings</Text>

      {/* API Key */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>OpenAI API Key</Text>
        <Text style={styles.currentValue}>
          Current: {apiKey ? `${apiKey.substring(0, 4)}...${apiKey.substring(apiKey.length - 3)}` : 'Not set'}
        </Text>
        <TextInput
          style={styles.input}
          placeholder="New API key (sk-...)"
          placeholderTextColor="#484F58"
          value={newApiKey}
          onChangeText={setNewApiKey}
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
        />
        <TouchableOpacity
          style={[
            styles.primaryButton,
            !newApiKey.trim() && styles.buttonDisabled,
          ]}
          onPress={updateApiKey}
          disabled={!newApiKey.trim()}
        >
          <Text style={styles.primaryButtonText}>Update Key</Text>
        </TouchableOpacity>
      </View>

      {/* Server Controls */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Codex Server</Text>
        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={restartServer}
        >
          <Text style={styles.secondaryButtonText}>
            🔄 Restart Server
          </Text>
        </TouchableOpacity>
        {projectPath && (
          <Text style={styles.mountNote}>
            Will mount: {projectPath} → /root/project
          </Text>
        )}
      </View>

      {/* Navigation */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Quick Links</Text>
        <TouchableOpacity
          style={styles.navButton}
          onPress={() => navigation.navigate('Project')}
        >
          <Text style={styles.navButtonText}>📁 Project Folder</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.navButton}
          onPress={() => navigation.navigate('GitHub')}
        >
          <Text style={styles.navButtonText}>🐙 GitHub</Text>
        </TouchableOpacity>
      </View>

      {/* Danger Zone */}
      <View style={[styles.card, styles.dangerCard]}>
        <Text style={styles.cardTitle}>Danger Zone</Text>
        <TouchableOpacity style={styles.dangerButton} onPress={resetAll}>
          <Text style={styles.dangerButtonText}>
            Reset Everything
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D1117',
  },
  content: {
    padding: 24,
    paddingTop: 48,
    paddingBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#E6EDF3',
    marginBottom: 24,
  },
  card: {
    backgroundColor: '#161B22',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#30363D',
  },
  dangerCard: {
    borderColor: '#F8514930',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#E6EDF3',
    marginBottom: 12,
  },
  currentValue: {
    fontSize: 13,
    color: '#8B949E',
    fontFamily: 'monospace',
    marginBottom: 12,
  },
  input: {
    backgroundColor: '#0D1117',
    borderWidth: 1,
    borderColor: '#30363D',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#E6EDF3',
    fontSize: 15,
    marginBottom: 12,
  },
  primaryButton: {
    backgroundColor: '#238636',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: '#21262D',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#30363D',
  },
  secondaryButtonText: {
    color: '#E6EDF3',
    fontSize: 14,
    fontWeight: '500',
  },
  buttonDisabled: {
    backgroundColor: '#21262D',
    opacity: 0.5,
  },
  mountNote: {
    fontSize: 12,
    color: '#8B949E',
    fontFamily: 'monospace',
    marginTop: 8,
  },
  navButton: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#30363D',
  },
  navButtonText: {
    fontSize: 15,
    color: '#58A6FF',
  },
  dangerButton: {
    backgroundColor: '#DA3633',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  dangerButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});
