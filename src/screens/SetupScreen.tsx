/**
 * SetupScreen
 *
 * Collects the OpenAI API key, then runs the full bootstrap automatically.
 * Shows live progress with step indicators and a scrollable log output.
 */
import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { useSetupStore, useSettingsStore } from '../stores/appStore';
import { writeAndRunScript } from '../utils/termux';
import {
  generateBootstrapScript,
  STEP_LABELS,
  TOTAL_STEPS,
} from '../utils/bootstrap';

type Props = {
  navigation: { navigate: (screen: string) => void };
};

const API_KEY_STORAGE_KEY = 'openai_api_key';

export default function SetupScreen({ navigation }: Props) {
  const [apiKeyInput, setApiKeyInput] = useState('');
  const { status, currentStep, completedSteps, errorMessage, logOutput, setStatus, appendLog, setError } =
    useSetupStore();
  const { setApiKey, setSetupComplete } = useSettingsStore();
  const logScrollRef = useRef<ScrollView>(null);

  // Auto-scroll log output
  useEffect(() => {
    logScrollRef.current?.scrollToEnd({ animated: true });
  }, [logOutput]);

  const startBootstrap = useCallback(async () => {
    if (!apiKeyInput.trim().startsWith('sk-')) {
      setError('Please enter a valid OpenAI API key (starts with sk-)');
      return;
    }

    try {
      // Save the API key securely
      await SecureStore.setItemAsync(API_KEY_STORAGE_KEY, apiKeyInput.trim());
      setApiKey(apiKeyInput.trim());
      setStatus('bootstrapping');
      setError(null);

      // Generate and run the bootstrap script
      const script = generateBootstrapScript(apiKeyInput.trim());
      appendLog('Starting bootstrap...');
      await writeAndRunScript(script, 'codex-bootstrap.sh');
      appendLog('Bootstrap script launched in Termux');

      // In a real implementation, we'd poll the log file for progress.
      // For now, we show the UI is ready to track progress.
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setError(`Failed to start bootstrap: ${msg}`);
    }
  }, [apiKeyInput, setApiKey, setStatus, setError, appendLog]);

  const markComplete = useCallback(() => {
    setSetupComplete(true);
    setStatus('complete');
    navigation.navigate('Chat');
  }, [setSetupComplete, setStatus, navigation]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Setup</Text>

      {/* API Key Input */}
      {status !== 'bootstrapping' && status !== 'complete' && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>OpenAI API Key</Text>
          <TextInput
            style={styles.input}
            placeholder="sk-..."
            placeholderTextColor="#484F58"
            value={apiKeyInput}
            onChangeText={setApiKeyInput}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
          />
          {errorMessage && (
            <Text style={styles.errorText}>{errorMessage}</Text>
          )}
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={startBootstrap}
          >
            <Text style={styles.primaryButtonText}>
              Start Setup
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Progress Steps */}
      {(status === 'bootstrapping' || status === 'complete') && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Installation Progress</Text>
          {Array.from({ length: TOTAL_STEPS }, (_, i) => i + 1).map(
            (step) => {
              const isComplete = completedSteps.includes(step);
              const isCurrent = step === currentStep && !isComplete;
              return (
                <View key={step} style={styles.stepRow}>
                  <Text style={styles.stepIcon}>
                    {isComplete ? '✅' : isCurrent ? '⏳' : '⬜'}
                  </Text>
                  <Text
                    style={[
                      styles.stepLabel,
                      isComplete && styles.stepLabelDone,
                    ]}
                  >
                    {STEP_LABELS[step]}
                  </Text>
                  {isCurrent && (
                    <ActivityIndicator
                      size="small"
                      color="#58A6FF"
                      style={styles.stepSpinner}
                    />
                  )}
                </View>
              );
            },
          )}
        </View>
      )}

      {/* Log Output */}
      {logOutput.length > 0 && (
        <View style={styles.logCard}>
          <Text style={styles.cardTitle}>Log Output</Text>
          <ScrollView
            ref={logScrollRef}
            style={styles.logScroll}
            nestedScrollEnabled
          >
            <Text style={styles.logText}>{logOutput}</Text>
          </ScrollView>
        </View>
      )}

      {/* Manual complete button for development */}
      {status === 'bootstrapping' && (
        <TouchableOpacity
          style={[styles.primaryButton, { marginTop: 16 }]}
          onPress={markComplete}
        >
          <Text style={styles.primaryButtonText}>
            Mark Setup Complete
          </Text>
        </TouchableOpacity>
      )}
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
  errorText: {
    color: '#F85149',
    fontSize: 13,
    marginBottom: 12,
  },
  primaryButton: {
    backgroundColor: '#238636',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  stepIcon: {
    fontSize: 16,
    marginRight: 10,
  },
  stepLabel: {
    fontSize: 14,
    color: '#8B949E',
    flex: 1,
  },
  stepLabelDone: {
    color: '#3FB950',
  },
  stepSpinner: {
    marginLeft: 8,
  },
  logCard: {
    backgroundColor: '#161B22',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#30363D',
    maxHeight: 200,
  },
  logScroll: {
    maxHeight: 140,
  },
  logText: {
    fontFamily: 'monospace',
    fontSize: 11,
    color: '#8B949E',
    lineHeight: 16,
  },
});
