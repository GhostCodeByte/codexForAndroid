/**
 * GitHubScreen
 *
 * Provides GitHub authentication via `gh auth login` inside the Ubuntu
 * environment, and the ability to clone repositories into the project folder.
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
  ActivityIndicator,
} from 'react-native';
import { runInUbuntu } from '../utils/termux';
import { useProjectStore } from '../stores/appStore';

type Props = {
  navigation: { navigate: (screen: string) => void };
};

export default function GitHubScreen({ navigation }: Props) {
  const [repoUrl, setRepoUrl] = useState('');
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [isCloning, setIsCloning] = useState(false);
  const [authStatus, setAuthStatus] = useState<'unknown' | 'authenticated' | 'not_authenticated'>('unknown');
  const { setProject } = useProjectStore();

  const authenticateGitHub = useCallback(async () => {
    setIsAuthenticating(true);
    try {
      // gh auth login with a device code flow
      // In proot, this will output a code the user needs to enter at github.com/login/device
      await runInUbuntu(
        'gh auth login --web --git-protocol https 2>&1 | tee /tmp/gh-auth.log',
      );
      setAuthStatus('authenticated');
      Alert.alert(
        'GitHub Auth',
        'The authentication flow has been started in Termux. Please check the Termux window for the device code and complete authentication at github.com/login/device',
      );
    } catch {
      Alert.alert('Error', 'Failed to start GitHub authentication');
    } finally {
      setIsAuthenticating(false);
    }
  }, []);

  const checkAuthStatus = useCallback(async () => {
    try {
      await runInUbuntu('gh auth status');
      setAuthStatus('authenticated');
    } catch {
      setAuthStatus('not_authenticated');
    }
  }, []);

  const cloneRepo = useCallback(async () => {
    if (!repoUrl.trim()) {
      Alert.alert('Error', 'Please enter a repository URL');
      return;
    }

    setIsCloning(true);
    try {
      const repoName = repoUrl.trim().split('/').pop()?.replace('.git', '') || 'project';
      await runInUbuntu(
        `cd /root && gh repo clone ${repoUrl.trim()} project/${repoName}`,
      );

      setProject(`/root/project/${repoName}`, repoName);

      Alert.alert(
        'Repository Cloned',
        `${repoName} has been cloned to /root/project/${repoName}`,
        [
          { text: 'Open Chat', onPress: () => navigation.navigate('Chat') },
          { text: 'OK' },
        ],
      );
    } catch {
      Alert.alert('Error', 'Failed to clone repository. Make sure you are authenticated and the URL is correct.');
    } finally {
      setIsCloning(false);
    }
  }, [repoUrl, setProject, navigation]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>GitHub</Text>
      <Text style={styles.subtitle}>
        Connect your GitHub account and clone repositories
      </Text>

      {/* Authentication */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Authentication</Text>
        <Text style={styles.statusText}>
          Status:{' '}
          <Text
            style={
              authStatus === 'authenticated'
                ? styles.statusGreen
                : styles.statusGray
            }
          >
            {authStatus === 'authenticated'
              ? 'Authenticated ✓'
              : authStatus === 'not_authenticated'
                ? 'Not authenticated'
                : 'Unknown'}
          </Text>
        </Text>

        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={checkAuthStatus}
          >
            <Text style={styles.secondaryButtonText}>Check Status</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={authenticateGitHub}
            disabled={isAuthenticating}
          >
            {isAuthenticating ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.primaryButtonText}>
                {authStatus === 'authenticated' ? 'Re-authenticate' : 'Login with GitHub'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Clone Repo */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Clone Repository</Text>
        <TextInput
          style={styles.input}
          placeholder="owner/repo or full URL"
          placeholderTextColor="#484F58"
          value={repoUrl}
          onChangeText={setRepoUrl}
          autoCapitalize="none"
          autoCorrect={false}
        />
        <TouchableOpacity
          style={[
            styles.primaryButton,
            (!repoUrl.trim() || isCloning) && styles.buttonDisabled,
          ]}
          onPress={cloneRepo}
          disabled={!repoUrl.trim() || isCloning}
        >
          {isCloning ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.primaryButtonText}>Clone</Text>
          )}
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
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#E6EDF3',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#8B949E',
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
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#E6EDF3',
    marginBottom: 12,
  },
  statusText: {
    fontSize: 14,
    color: '#8B949E',
    marginBottom: 16,
  },
  statusGreen: {
    color: '#3FB950',
    fontWeight: '600',
  },
  statusGray: {
    color: '#8B949E',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
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
    flex: 1,
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
    flex: 1,
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
});
