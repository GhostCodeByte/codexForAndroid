/**
 * ChatScreen
 *
 * Main interface for chatting with Codex. Connects via WebSocket to the
 * Codex app-server running inside proot-distro Ubuntu. Shows streaming
 * responses and allows the user to approve/decline commands and file changes.
 */
import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useChatStore } from '../stores/appStore';
import { CodexWebSocket, CodexMessage } from '../utils/codexWebSocket';

type Props = {
  navigation: { navigate: (screen: string) => void };
};

let codexWs: CodexWebSocket | null = null;

export default function ChatScreen({ navigation }: Props) {
  const [input, setInput] = useState('');
  const scrollRef = useRef<ScrollView>(null);

  const {
    threadId,
    messages,
    isStreaming,
    connectionStatus,
    setThreadId,
    addMessage,
    appendToLastAssistant,
    setStreaming,
    setConnectionStatus,
    updateApproval,
  } = useChatStore();

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    scrollRef.current?.scrollToEnd({ animated: true });
  }, [messages]);

  const handleCodexMessage = useCallback(
    (message: CodexMessage) => {
      if (!('method' in message)) return;

      const notification = message as { method: string; params?: Record<string, unknown> };

      switch (notification.method) {
        case 'turn/textDelta': {
          const delta = (notification.params?.delta as string) ?? '';
          appendToLastAssistant(delta);
          break;
        }
        case 'turn/complete': {
          setStreaming(false);
          break;
        }
        case 'item/commandExecution/requestApproval': {
          const itemId = notification.params?.itemId as string;
          const description =
            (notification.params?.command as string) ?? 'Execute command';
          addMessage({
            id: itemId,
            role: 'assistant',
            content: `🔐 Approval needed: ${description}`,
            timestamp: Date.now(),
            approvalRequest: {
              id: itemId,
              type: 'command',
              description,
              status: 'pending',
            },
          });
          break;
        }
        case 'item/fileChange/requestApproval': {
          const itemId = notification.params?.itemId as string;
          const description =
            (notification.params?.path as string) ?? 'Modify file';
          addMessage({
            id: itemId,
            role: 'assistant',
            content: `📝 File change approval: ${description}`,
            timestamp: Date.now(),
            approvalRequest: {
              id: itemId,
              type: 'fileChange',
              description,
              status: 'pending',
            },
          });
          break;
        }
      }
    },
    [addMessage, appendToLastAssistant, setStreaming],
  );

  const connect = useCallback(async () => {
    try {
      codexWs = new CodexWebSocket(handleCodexMessage, setConnectionStatus);
      await codexWs.connect();
      const newThreadId = await codexWs.createThread();
      setThreadId(newThreadId);
    } catch {
      setConnectionStatus('error');
    }
  }, [handleCodexMessage, setConnectionStatus, setThreadId]);

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || !codexWs || !threadId) return;

    setInput('');
    addMessage({
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: Date.now(),
    });

    // Prepare assistant message placeholder
    addMessage({
      id: `assistant-${Date.now()}`,
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
    });

    setStreaming(true);

    try {
      await codexWs.startTurn(threadId, text);
    } catch {
      setStreaming(false);
    }
  }, [input, threadId, addMessage, setStreaming]);

  const handleApproval = useCallback(
    async (messageId: string, type: 'command' | 'fileChange', approved: boolean) => {
      if (!codexWs) return;
      updateApproval(messageId, approved ? 'approved' : 'declined');

      if (type === 'command') {
        await codexWs.provideCommandApproval(messageId, approved);
      } else {
        await codexWs.provideFileChangeApproval(messageId, approved);
      }
    },
    [updateApproval],
  );

  const interruptTurn = useCallback(async () => {
    if (!codexWs || !threadId) return;
    try {
      await codexWs.interruptTurn(threadId);
      setStreaming(false);
    } catch {
      // ignore
    }
  }, [threadId, setStreaming]);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Codex Chat</Text>
        <View style={styles.headerRight}>
          <View
            style={[
              styles.statusDot,
              connectionStatus === 'connected'
                ? styles.statusConnected
                : connectionStatus === 'connecting'
                  ? styles.statusConnecting
                  : styles.statusDisconnected,
            ]}
          />
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => navigation.navigate('Project')}
          >
            <Text style={styles.headerButtonText}>📁</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => navigation.navigate('Settings')}
          >
            <Text style={styles.headerButtonText}>⚙️</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Connection banner */}
      {connectionStatus !== 'connected' && (
        <TouchableOpacity style={styles.connectBanner} onPress={connect}>
          <Text style={styles.connectBannerText}>
            {connectionStatus === 'connecting'
              ? 'Connecting to Codex...'
              : connectionStatus === 'error'
                ? 'Connection failed — tap to retry'
                : 'Tap to connect to Codex server'}
          </Text>
        </TouchableOpacity>
      )}

      {/* Messages */}
      <ScrollView
        ref={scrollRef}
        style={styles.messages}
        contentContainerStyle={styles.messagesContent}
      >
        {messages.map((msg) => (
          <View
            key={msg.id}
            style={[
              styles.messageBubble,
              msg.role === 'user' ? styles.userBubble : styles.assistantBubble,
            ]}
          >
            <Text
              style={[
                styles.messageText,
                msg.role === 'user'
                  ? styles.userText
                  : styles.assistantText,
              ]}
            >
              {msg.content || (isStreaming ? '...' : '')}
            </Text>

            {/* Approval buttons */}
            {msg.approvalRequest?.status === 'pending' && (
              <View style={styles.approvalRow}>
                <TouchableOpacity
                  style={[styles.approvalButton, styles.approveButton]}
                  onPress={() =>
                    handleApproval(msg.id, msg.approvalRequest!.type, true)
                  }
                >
                  <Text style={styles.approvalButtonText}>✅ Approve</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.approvalButton, styles.declineButton]}
                  onPress={() =>
                    handleApproval(msg.id, msg.approvalRequest!.type, false)
                  }
                >
                  <Text style={styles.approvalButtonText}>❌ Decline</Text>
                </TouchableOpacity>
              </View>
            )}
            {msg.approvalRequest &&
              msg.approvalRequest.status !== 'pending' && (
                <Text style={styles.approvalStatus}>
                  {msg.approvalRequest.status === 'approved'
                    ? '✅ Approved'
                    : '❌ Declined'}
                </Text>
              )}
          </View>
        ))}
      </ScrollView>

      {/* Input */}
      <View style={styles.inputContainer}>
        {isStreaming && (
          <TouchableOpacity style={styles.stopButton} onPress={interruptTurn}>
            <Text style={styles.stopButtonText}>⏹ Stop</Text>
          </TouchableOpacity>
        )}
        <TextInput
          style={styles.input}
          placeholder="Ask Codex..."
          placeholderTextColor="#484F58"
          value={input}
          onChangeText={setInput}
          multiline
          editable={!isStreaming}
        />
        <TouchableOpacity
          style={[
            styles.sendButton,
            (!input.trim() || isStreaming) && styles.sendButtonDisabled,
          ]}
          onPress={sendMessage}
          disabled={!input.trim() || isStreaming}
        >
          <Text style={styles.sendButtonText}>↑</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D1117',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 48,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#30363D',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#E6EDF3',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusConnected: {
    backgroundColor: '#3FB950',
  },
  statusConnecting: {
    backgroundColor: '#D29922',
  },
  statusDisconnected: {
    backgroundColor: '#F85149',
  },
  headerButton: {
    padding: 4,
  },
  headerButtonText: {
    fontSize: 20,
  },
  connectBanner: {
    backgroundColor: '#161B22',
    padding: 12,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#30363D',
  },
  connectBannerText: {
    color: '#58A6FF',
    fontSize: 14,
  },
  messages: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
    paddingBottom: 8,
  },
  messageBubble: {
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    maxWidth: '85%',
  },
  userBubble: {
    backgroundColor: '#1F6FEB',
    alignSelf: 'flex-end',
  },
  assistantBubble: {
    backgroundColor: '#161B22',
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#30363D',
  },
  messageText: {
    fontSize: 15,
    lineHeight: 22,
  },
  userText: {
    color: '#FFFFFF',
  },
  assistantText: {
    color: '#E6EDF3',
  },
  approvalRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  approvalButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 6,
  },
  approveButton: {
    backgroundColor: '#238636',
  },
  declineButton: {
    backgroundColor: '#DA3633',
  },
  approvalButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  approvalStatus: {
    marginTop: 8,
    fontSize: 13,
    color: '#8B949E',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#30363D',
    backgroundColor: '#0D1117',
  },
  input: {
    flex: 1,
    backgroundColor: '#161B22',
    borderWidth: 1,
    borderColor: '#30363D',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    color: '#E6EDF3',
    fontSize: 15,
    maxHeight: 100,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#238636',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  sendButtonDisabled: {
    backgroundColor: '#21262D',
  },
  sendButtonText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  stopButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: '#DA3633',
    marginRight: 8,
  },
  stopButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
});
