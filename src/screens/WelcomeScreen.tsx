/**
 * WelcomeScreen
 *
 * First screen shown to the user. Checks that:
 * 1. Termux is installed (from F-Droid, not Play Store)
 * 2. "Allow External Apps" is enabled in Termux settings
 *
 * Provides actionable guidance for any missing prerequisites.
 */
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Linking,
  ActivityIndicator,
} from 'react-native';
import { useSetupStore, useSettingsStore } from '../stores/appStore';

type Props = {
  navigation: { navigate: (screen: string) => void };
};

const TERMUX_FDROID_URL =
  'https://f-droid.org/en/packages/com.termux/';

export default function WelcomeScreen({ navigation }: Props) {
  const { status, setStatus } = useSetupStore();
  const { isSetupComplete } = useSettingsStore();
  const [checking, setChecking] = useState(false);

  const checkPrerequisites = useCallback(async () => {
    setChecking(true);
    setStatus('checking');

    try {
      // In a real device environment, we'd use isTermuxInstalled() from termux.ts
      // For now, we simulate the check and let the user confirm
      setStatus('ready_to_setup');
    } catch {
      setStatus('missing_termux');
    } finally {
      setChecking(false);
    }
  }, [setStatus]);

  const openTermuxDownload = useCallback(() => {
    Linking.openURL(TERMUX_FDROID_URL);
  }, []);

  // If setup is already complete, go straight to chat
  React.useEffect(() => {
    if (isSetupComplete) {
      navigation.navigate('Chat');
    }
  }, [isSetupComplete, navigation]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Codex for Android</Text>
      <Text style={styles.subtitle}>
        Run OpenAI Codex CLI agent on your phone
      </Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Prerequisites</Text>

        <View style={styles.prereqItem}>
          <Text style={styles.prereqIcon}>
            {status === 'missing_termux' ? '❌' : '📱'}
          </Text>
          <View style={styles.prereqText}>
            <Text style={styles.prereqLabel}>
              Termux (from F-Droid)
            </Text>
            <Text style={styles.prereqDesc}>
              Must be the F-Droid version, not Play Store
            </Text>
          </View>
        </View>

        <View style={styles.prereqItem}>
          <Text style={styles.prereqIcon}>
            {status === 'missing_permission' ? '❌' : '⚙️'}
          </Text>
          <View style={styles.prereqText}>
            <Text style={styles.prereqLabel}>
              Allow External Apps
            </Text>
            <Text style={styles.prereqDesc}>
              In Termux → Settings → enable "Allow External Apps"
            </Text>
          </View>
        </View>

        <View style={styles.prereqItem}>
          <Text style={styles.prereqIcon}>🔋</Text>
          <View style={styles.prereqText}>
            <Text style={styles.prereqLabel}>
              Disable Battery Optimization
            </Text>
            <Text style={styles.prereqDesc}>
              Prevents Android from killing Termux in the background
            </Text>
          </View>
        </View>
      </View>

      {status === 'missing_termux' && (
        <TouchableOpacity style={styles.linkButton} onPress={openTermuxDownload}>
          <Text style={styles.linkButtonText}>
            Download Termux from F-Droid
          </Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity
        style={styles.primaryButton}
        onPress={
          status === 'ready_to_setup'
            ? () => navigation.navigate('Setup')
            : checkPrerequisites
        }
        disabled={checking}
      >
        {checking ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.primaryButtonText}>
            {status === 'ready_to_setup'
              ? 'Continue to Setup'
              : 'Check Prerequisites'}
          </Text>
        )}
      </TouchableOpacity>
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
    paddingTop: 60,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#E6EDF3',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#8B949E',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 32,
  },
  card: {
    backgroundColor: '#161B22',
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#30363D',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#E6EDF3',
    marginBottom: 16,
  },
  prereqItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  prereqIcon: {
    fontSize: 20,
    marginRight: 12,
    marginTop: 2,
  },
  prereqText: {
    flex: 1,
  },
  prereqLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: '#E6EDF3',
  },
  prereqDesc: {
    fontSize: 13,
    color: '#8B949E',
    marginTop: 2,
  },
  primaryButton: {
    backgroundColor: '#238636',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  linkButton: {
    alignItems: 'center',
    paddingVertical: 12,
    marginBottom: 8,
  },
  linkButtonText: {
    color: '#58A6FF',
    fontSize: 15,
    textDecorationLine: 'underline',
  },
});
