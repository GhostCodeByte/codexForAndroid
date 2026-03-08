/**
 * Tests for Zustand stores.
 */
import {
  useSetupStore,
  useChatStore,
  useProjectStore,
  useSettingsStore,
} from '../src/stores/appStore';

describe('useSetupStore', () => {
  beforeEach(() => {
    useSetupStore.getState().reset();
  });

  it('starts with idle status', () => {
    expect(useSetupStore.getState().status).toBe('idle');
  });

  it('updates status', () => {
    useSetupStore.getState().setStatus('bootstrapping');
    expect(useSetupStore.getState().status).toBe('bootstrapping');
  });

  it('tracks progress', () => {
    useSetupStore.getState().setProgress(3, [1, 2]);
    const state = useSetupStore.getState();
    expect(state.currentStep).toBe(3);
    expect(state.completedSteps).toEqual([1, 2]);
  });

  it('sets error and updates status', () => {
    useSetupStore.getState().setError('Something failed');
    const state = useSetupStore.getState();
    expect(state.errorMessage).toBe('Something failed');
    expect(state.status).toBe('bootstrap_error');
  });

  it('clears error', () => {
    useSetupStore.getState().setError('fail');
    useSetupStore.getState().setError(null);
    expect(useSetupStore.getState().errorMessage).toBeNull();
  });

  it('appends to log', () => {
    useSetupStore.getState().appendLog('line 1');
    useSetupStore.getState().appendLog('line 2');
    expect(useSetupStore.getState().logOutput).toBe('line 1\nline 2\n');
  });

  it('resets to initial state', () => {
    useSetupStore.getState().setStatus('bootstrapping');
    useSetupStore.getState().setProgress(3, [1, 2]);
    useSetupStore.getState().appendLog('log');
    useSetupStore.getState().reset();

    const state = useSetupStore.getState();
    expect(state.status).toBe('idle');
    expect(state.currentStep).toBe(0);
    expect(state.completedSteps).toEqual([]);
    expect(state.logOutput).toBe('');
  });
});

describe('useChatStore', () => {
  beforeEach(() => {
    useChatStore.getState().clearMessages();
    useChatStore.getState().setConnectionStatus('disconnected');
  });

  it('starts disconnected with no messages', () => {
    const state = useChatStore.getState();
    expect(state.messages).toEqual([]);
    expect(state.connectionStatus).toBe('disconnected');
    expect(state.threadId).toBeNull();
  });

  it('adds messages', () => {
    useChatStore.getState().addMessage({
      id: '1',
      role: 'user',
      content: 'Hello',
      timestamp: 1000,
    });
    expect(useChatStore.getState().messages).toHaveLength(1);
    expect(useChatStore.getState().messages[0].content).toBe('Hello');
  });

  it('updates messages', () => {
    useChatStore.getState().addMessage({
      id: '1',
      role: 'assistant',
      content: 'Hi',
      timestamp: 1000,
    });
    useChatStore.getState().updateMessage('1', { content: 'Hello there' });
    expect(useChatStore.getState().messages[0].content).toBe('Hello there');
  });

  it('appends to last assistant message', () => {
    useChatStore.getState().addMessage({
      id: '1',
      role: 'user',
      content: 'Hi',
      timestamp: 1000,
    });
    useChatStore.getState().addMessage({
      id: '2',
      role: 'assistant',
      content: 'Hello',
      timestamp: 1001,
    });
    useChatStore.getState().appendToLastAssistant(' world');
    expect(useChatStore.getState().messages[1].content).toBe('Hello world');
  });

  it('sets connection status', () => {
    useChatStore.getState().setConnectionStatus('connected');
    expect(useChatStore.getState().connectionStatus).toBe('connected');
  });

  it('updates approval status', () => {
    useChatStore.getState().addMessage({
      id: 'cmd-1',
      role: 'assistant',
      content: 'Run command?',
      timestamp: 1000,
      approvalRequest: {
        id: 'cmd-1',
        type: 'command',
        description: 'ls -la',
        status: 'pending',
      },
    });
    useChatStore.getState().updateApproval('cmd-1', 'approved');
    expect(
      useChatStore.getState().messages[0].approvalRequest?.status,
    ).toBe('approved');
  });

  it('clears messages and threadId', () => {
    useChatStore.getState().setThreadId('thread-1');
    useChatStore.getState().addMessage({
      id: '1',
      role: 'user',
      content: 'test',
      timestamp: 1000,
    });
    useChatStore.getState().clearMessages();

    const state = useChatStore.getState();
    expect(state.messages).toEqual([]);
    expect(state.threadId).toBeNull();
  });
});

describe('useProjectStore', () => {
  beforeEach(() => {
    useProjectStore.getState().clearProject();
  });

  it('starts with no project', () => {
    const state = useProjectStore.getState();
    expect(state.projectPath).toBeNull();
    expect(state.projectName).toBeNull();
  });

  it('sets project', () => {
    useProjectStore.getState().setProject('/sdcard/MyProject', 'MyProject');
    const state = useProjectStore.getState();
    expect(state.projectPath).toBe('/sdcard/MyProject');
    expect(state.projectName).toBe('MyProject');
  });

  it('clears project', () => {
    useProjectStore.getState().setProject('/sdcard/Test', 'Test');
    useProjectStore.getState().clearProject();
    const state = useProjectStore.getState();
    expect(state.projectPath).toBeNull();
    expect(state.projectName).toBeNull();
  });
});

describe('useSettingsStore', () => {
  beforeEach(() => {
    useSettingsStore.getState().reset();
  });

  it('starts with no API key', () => {
    expect(useSettingsStore.getState().apiKey).toBeNull();
    expect(useSettingsStore.getState().isSetupComplete).toBe(false);
  });

  it('sets API key', () => {
    useSettingsStore.getState().setApiKey('sk-test');
    expect(useSettingsStore.getState().apiKey).toBe('sk-test');
  });

  it('sets setup complete', () => {
    useSettingsStore.getState().setSetupComplete(true);
    expect(useSettingsStore.getState().isSetupComplete).toBe(true);
  });

  it('resets all settings', () => {
    useSettingsStore.getState().setApiKey('sk-test');
    useSettingsStore.getState().setSetupComplete(true);
    useSettingsStore.getState().reset();

    const state = useSettingsStore.getState();
    expect(state.apiKey).toBeNull();
    expect(state.isSetupComplete).toBe(false);
  });
});
