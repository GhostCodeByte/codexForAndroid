/**
 * ProjectScreen
 *
 * Lets the user pick a folder from Android storage to mount as
 * /root/project inside the proot-distro Ubuntu environment.
 *
 * Uses expo-document-picker for folder selection and restarts the
 * Codex server with the new bind mount.
 */
import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { useProjectStore } from '../stores/appStore';

type Props = {
  navigation: { navigate: (screen: string) => void };
};

export default function ProjectScreen({ navigation }: Props) {
  const { projectPath, projectName, setProject, clearProject } =
    useProjectStore();

  const pickFolder = useCallback(async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: false,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const path = asset.uri;
        const name = asset.name || path.split('/').pop() || 'project';
        setProject(path, name);

        Alert.alert(
          'Project Selected',
          `Selected: ${name}\n\nRestart the Codex server from Settings to mount this folder.`,
          [
            { text: 'Go to Settings', onPress: () => navigation.navigate('Settings') },
            { text: 'OK' },
          ],
        );
      }
    } catch {
      Alert.alert('Error', 'Failed to pick a folder. Please try again.');
    }
  }, [setProject, navigation]);

  const removeProject = useCallback(() => {
    Alert.alert(
      'Remove Project',
      'Are you sure you want to disconnect this project folder?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: clearProject,
        },
      ],
    );
  }, [clearProject]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Project</Text>
      <Text style={styles.subtitle}>
        Select a folder to mount as /root/project in the Ubuntu environment
      </Text>

      {projectPath ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Current Project</Text>
          <View style={styles.projectInfo}>
            <Text style={styles.projectIcon}>📁</Text>
            <View style={styles.projectDetails}>
              <Text style={styles.projectName}>{projectName}</Text>
              <Text style={styles.projectPath}>{projectPath}</Text>
            </View>
          </View>
          <Text style={styles.mountInfo}>
            Mounted as: /root/project
          </Text>
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={pickFolder}
            >
              <Text style={styles.secondaryButtonText}>Change Folder</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.dangerButton}
              onPress={removeProject}
            >
              <Text style={styles.dangerButtonText}>Remove</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <View style={styles.card}>
          <Text style={styles.emptyTitle}>No project selected</Text>
          <Text style={styles.emptyText}>
            Pick a folder from your device storage to use as the project
            directory. Codex will be able to read and modify files in this
            folder.
          </Text>
          <TouchableOpacity style={styles.primaryButton} onPress={pickFolder}>
            <Text style={styles.primaryButtonText}>Select Folder</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.card}>
        <Text style={styles.cardTitle}>How it works</Text>
        <Text style={styles.helpText}>
          The selected folder is bind-mounted into the Ubuntu environment using
          proot-distro's --bind flag. When you restart the Codex server, it will
          have full access to the folder at /root/project.
        </Text>
        <Text style={styles.helpText}>
          ⚠️ Make sure to grant storage permissions when prompted.
        </Text>
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
  projectInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  projectIcon: {
    fontSize: 32,
    marginRight: 12,
  },
  projectDetails: {
    flex: 1,
  },
  projectName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#E6EDF3',
  },
  projectPath: {
    fontSize: 12,
    color: '#8B949E',
    marginTop: 2,
  },
  mountInfo: {
    fontSize: 13,
    color: '#58A6FF',
    fontFamily: 'monospace',
    marginBottom: 16,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#8B949E',
    textAlign: 'center',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#8B949E',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
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
  dangerButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#DA3633',
    alignItems: 'center',
  },
  dangerButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  helpText: {
    fontSize: 13,
    color: '#8B949E',
    lineHeight: 20,
    marginBottom: 8,
  },
});
