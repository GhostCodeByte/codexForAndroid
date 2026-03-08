/**
 * Main application store using Zustand.
 *
 * Tracks setup state, chat state, project state, and settings.
 */
import { create } from 'zustand';

// ── Setup Store ──────────────────────────────────────────────

export type SetupStatus =
  | 'idle'
  | 'checking'
  | 'missing_termux'
  | 'missing_permission'
  | 'ready_to_setup'
  | 'bootstrapping'
  | 'bootstrap_error'
  | 'complete';

export type SetupState = {
  status: SetupStatus;
  currentStep: number;
  completedSteps: number[];
  errorMessage: string | null;
  logOutput: string;
  setStatus: (status: SetupStatus) => void;
  setProgress: (step: number, completed: number[]) => void;
  setError: (message: string | null) => void;
  appendLog: (line: string) => void;
  reset: () => void;
};

export const useSetupStore = create<SetupState>((set) => ({
  status: 'idle',
  currentStep: 0,
  completedSteps: [],
  errorMessage: null,
  logOutput: '',
  setStatus: (status) => set({ status }),
  setProgress: (currentStep, completedSteps) =>
    set({ currentStep, completedSteps }),
  setError: (errorMessage) =>
    set({ errorMessage, status: errorMessage ? 'bootstrap_error' : 'idle' }),
  appendLog: (line) =>
    set((state) => ({ logOutput: state.logOutput + line + '\n' })),
  reset: () =>
    set({
      status: 'idle',
      currentStep: 0,
      completedSteps: [],
      errorMessage: null,
      logOutput: '',
    }),
}));

// ── Chat Store ───────────────────────────────────────────────

export type ChatMessageRole = 'user' | 'assistant';

export type ApprovalRequest = {
  id: string;
  type: 'command' | 'fileChange';
  description: string;
  status: 'pending' | 'approved' | 'declined';
};

export type ChatMessage = {
  id: string;
  role: ChatMessageRole;
  content: string;
  timestamp: number;
  approvalRequest?: ApprovalRequest;
};

export type ConnectionStatus =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'error';

export type ChatState = {
  threadId: string | null;
  messages: ChatMessage[];
  isStreaming: boolean;
  connectionStatus: ConnectionStatus;
  setThreadId: (id: string | null) => void;
  addMessage: (message: ChatMessage) => void;
  updateMessage: (id: string, updates: Partial<ChatMessage>) => void;
  appendToLastAssistant: (delta: string) => void;
  setStreaming: (streaming: boolean) => void;
  setConnectionStatus: (status: ConnectionStatus) => void;
  updateApproval: (messageId: string, status: 'approved' | 'declined') => void;
  clearMessages: () => void;
};

export const useChatStore = create<ChatState>((set) => ({
  threadId: null,
  messages: [],
  isStreaming: false,
  connectionStatus: 'disconnected',
  setThreadId: (threadId) => set({ threadId }),
  addMessage: (message) =>
    set((state) => ({ messages: [...state.messages, message] })),
  updateMessage: (id, updates) =>
    set((state) => ({
      messages: state.messages.map((m) =>
        m.id === id ? { ...m, ...updates } : m,
      ),
    })),
  appendToLastAssistant: (delta) =>
    set((state) => {
      const messages = [...state.messages];
      for (let i = messages.length - 1; i >= 0; i--) {
        if (messages[i].role === 'assistant') {
          messages[i] = { ...messages[i], content: messages[i].content + delta };
          break;
        }
      }
      return { messages };
    }),
  setStreaming: (isStreaming) => set({ isStreaming }),
  setConnectionStatus: (connectionStatus) => set({ connectionStatus }),
  updateApproval: (messageId, status) =>
    set((state) => ({
      messages: state.messages.map((m) =>
        m.id === messageId && m.approvalRequest
          ? { ...m, approvalRequest: { ...m.approvalRequest, status } }
          : m,
      ),
    })),
  clearMessages: () => set({ messages: [], threadId: null }),
}));

// ── Project Store ────────────────────────────────────────────

export type ProjectState = {
  projectPath: string | null;
  projectName: string | null;
  setProject: (path: string, name: string) => void;
  clearProject: () => void;
};

export const useProjectStore = create<ProjectState>((set) => ({
  projectPath: null,
  projectName: null,
  setProject: (projectPath, projectName) => set({ projectPath, projectName }),
  clearProject: () => set({ projectPath: null, projectName: null }),
}));

// ── Settings Store ───────────────────────────────────────────

export type SettingsState = {
  apiKey: string | null;
  isSetupComplete: boolean;
  setApiKey: (key: string | null) => void;
  setSetupComplete: (complete: boolean) => void;
  reset: () => void;
};

export const useSettingsStore = create<SettingsState>((set) => ({
  apiKey: null,
  isSetupComplete: false,
  setApiKey: (apiKey) => set({ apiKey }),
  setSetupComplete: (isSetupComplete) => set({ isSetupComplete }),
  reset: () => set({ apiKey: null, isSetupComplete: false }),
}));
