/**
 * WebSocket client for the Codex app-server JSON-RPC protocol.
 *
 * Codex runs as: codex app-server --listen ws://127.0.0.1:4500
 * Protocol: JSON-RPC 2.0 over WebSocket
 *
 * Connection sequence:
 *   1. Send `initialize` request → wait for response
 *   2. Send `initialized` notification
 *   3. Ready to use
 */

export const CODEX_WS_URL = 'ws://127.0.0.1:4500';

export type JsonRpcRequest = {
  jsonrpc: '2.0';
  id: number;
  method: string;
  params?: Record<string, unknown>;
};

export type JsonRpcNotification = {
  jsonrpc: '2.0';
  method: string;
  params?: Record<string, unknown>;
};

export type JsonRpcResponse = {
  jsonrpc: '2.0';
  id: number;
  result?: unknown;
  error?: { code: number; message: string; data?: unknown };
};

export type CodexMessage = JsonRpcRequest | JsonRpcNotification | JsonRpcResponse;

type PendingRequest = {
  resolve: (result: unknown) => void;
  reject: (error: Error) => void;
};

export type MessageHandler = (message: CodexMessage) => void;

export class CodexWebSocket {
  private ws: WebSocket | null = null;
  private nextId = 1;
  private pendingRequests = new Map<number, PendingRequest>();
  private onMessage: MessageHandler | null = null;
  private onStatusChange: ((status: 'connecting' | 'connected' | 'disconnected' | 'error') => void) | null = null;

  constructor(
    messageHandler?: MessageHandler,
    statusHandler?: (status: 'connecting' | 'connected' | 'disconnected' | 'error') => void,
  ) {
    this.onMessage = messageHandler ?? null;
    this.onStatusChange = statusHandler ?? null;
  }

  /**
   * Connect to the Codex app-server and perform the initialization handshake.
   */
  async connect(url: string = CODEX_WS_URL): Promise<void> {
    this.onStatusChange?.('connecting');

    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(url);

      this.ws.onopen = async () => {
        try {
          await this.initialize();
          this.onStatusChange?.('connected');
          resolve();
        } catch (err) {
          reject(err);
        }
      };

      this.ws.onmessage = (event: MessageEvent) => {
        try {
          const message: CodexMessage = JSON.parse(String(event.data));
          this.handleMessage(message);
        } catch {
          // Malformed JSON from server — skip silently as this is non-fatal
          // and can occur during connection negotiation
        }
      };

      this.ws.onerror = () => {
        this.onStatusChange?.('error');
        reject(new Error('WebSocket connection failed'));
      };

      this.ws.onclose = () => {
        this.onStatusChange?.('disconnected');
        this.cleanup();
      };
    });
  }

  /**
   * Disconnect from the server.
   */
  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.cleanup();
  }

  /**
   * Send a JSON-RPC request and wait for the response.
   */
  async request(method: string, params?: Record<string, unknown>): Promise<unknown> {
    const id = this.nextId++;
    const message: JsonRpcRequest = {
      jsonrpc: '2.0',
      id,
      method,
      params,
    };

    return new Promise((resolve, reject) => {
      this.pendingRequests.set(id, { resolve, reject });
      this.send(message);
    });
  }

  /**
   * Send a JSON-RPC notification (no response expected).
   */
  notify(method: string, params?: Record<string, unknown>): void {
    const message: JsonRpcNotification = {
      jsonrpc: '2.0',
      method,
      params,
    };
    this.send(message);
  }

  // ── Codex Protocol Methods ──────────────────────────────────

  /** Create a new conversation thread */
  async createThread(): Promise<string> {
    const result = (await this.request('thread/create')) as { threadId: string };
    return result.threadId;
  }

  /** Start a turn (send a user message) */
  async startTurn(threadId: string, userMessage: string): Promise<void> {
    await this.request('turn/start', { threadId, message: userMessage });
  }

  /** Interrupt the current turn */
  async interruptTurn(threadId: string): Promise<void> {
    await this.request('turn/interrupt', { threadId });
  }

  /** Approve or decline a command execution */
  async provideCommandApproval(
    itemId: string,
    approved: boolean,
  ): Promise<void> {
    await this.request('item/commandExecution/provideApproval', {
      itemId,
      approved,
    });
  }

  /** Approve or decline a file change */
  async provideFileChangeApproval(
    itemId: string,
    approved: boolean,
  ): Promise<void> {
    await this.request('item/fileChange/provideApproval', {
      itemId,
      approved,
    });
  }

  // ── Internal ────────────────────────────────────────────────

  private async initialize(): Promise<void> {
    await this.request('initialize', {
      clientInfo: {
        name: 'codex-for-android',
        version: '1.0.0',
      },
    });
    this.notify('initialized');
  }

  private send(message: CodexMessage): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket is not connected');
    }
    this.ws.send(JSON.stringify(message));
  }

  private handleMessage(message: CodexMessage): void {
    // If it's a response to a pending request
    if ('id' in message && this.pendingRequests.has(message.id)) {
      const pending = this.pendingRequests.get(message.id)!;
      this.pendingRequests.delete(message.id);

      if ('error' in message && message.error) {
        pending.reject(new Error(message.error.message));
      } else {
        pending.resolve((message as JsonRpcResponse).result);
      }
      return;
    }

    // Forward notifications/events to the handler
    this.onMessage?.(message);
  }

  private cleanup(): void {
    for (const [, pending] of this.pendingRequests) {
      pending.reject(new Error('Connection closed'));
    }
    this.pendingRequests.clear();
  }
}
