type WsCallback = (event: { type: string; data: any }) => void;

class WebSocketClient {
  private socket: WebSocket | null = null;
  private token: string | null = null;
  private listeners: Set<WsCallback> = new Set();
  private pingInterval: any = null;
  private reconnectTimeout: any = null;
  private isExplicitlyClosed = false;

  public isConnected = false;

  connect(token: string) {
    this.token = token;
    this.isExplicitlyClosed = false;
    this.initSocket();
  }

  private initSocket() {
    if (!this.token || this.isExplicitlyClosed) return;

    try {
      let wsBase = '';
      const rawApiBase = import.meta.env.VITE_API_BASE_URL;
      if (rawApiBase) {
        try {
          const parsed = new URL(rawApiBase);
          const wsProto = parsed.protocol === 'https:' ? 'wss:' : 'ws:';
          wsBase = `${wsProto}//${parsed.host}`;
        } catch {
          const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
          wsBase = `${protocol}//${window.location.host}`;
        }
      } else {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        wsBase = `${protocol}//${window.location.host}`;
      }
      const url = `${wsBase}/ws/dashboard?token=${encodeURIComponent(this.token)}`;

      this.socket = new WebSocket(url);

      this.socket.onopen = () => {
        this.isConnected = true;
        this.notifyListeners({ type: 'status', data: { connected: true } });

        // Start ping interval
        if (this.pingInterval) clearInterval(this.pingInterval);
        this.pingInterval = setInterval(() => {
          if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            this.socket.send('ping');
          }
        }, 15000);
      };

      this.socket.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          this.notifyListeners({ type: payload.event || 'message', data: payload.data || payload });
        } catch {
          // Non-JSON ping response
        }
      };

      this.socket.onclose = () => {
        this.isConnected = false;
        this.notifyListeners({ type: 'status', data: { connected: false } });
        if (this.pingInterval) clearInterval(this.pingInterval);

        if (!this.isExplicitlyClosed) {
          // Reconnect with backoff
          if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);
          this.reconnectTimeout = setTimeout(() => {
            this.initSocket();
          }, 3000);
        }
      };

      this.socket.onerror = () => {
        this.isConnected = false;
      };
    } catch {
      this.isConnected = false;
    }
  }

  disconnect() {
    this.isExplicitlyClosed = true;
    if (this.pingInterval) clearInterval(this.pingInterval);
    if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    this.isConnected = false;
    this.notifyListeners({ type: 'status', data: { connected: false } });
  }

  subscribe(callback: WsCallback): () => void {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  }

  private notifyListeners(event: { type: string; data: any }) {
    this.listeners.forEach((listener) => {
      try {
        listener(event);
      } catch (err) {
        console.error('WS Listener error:', err);
      }
    });
  }
}

export const wsService = new WebSocketClient();
