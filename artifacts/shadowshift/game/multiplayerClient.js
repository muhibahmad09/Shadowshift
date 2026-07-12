// MultiplayerClient — thin WebSocket wrapper with a typed event bus.
//
// Keeps a single WS connection alive for the whole multiplayer session.
// Consumers call on(type, handler) to react to server messages and
// send(msg) to push state updates.

export class MultiplayerClient {
  constructor() {
    this._ws = null;
    /** @type {Map<string, Set<Function>>} */
    this._listeners = new Map();
  }

  /** Open a WebSocket connection to the API server. Safe to call repeatedly. */
  connect() {
    if (
      this._ws &&
      (this._ws.readyState === WebSocket.OPEN ||
        this._ws.readyState === WebSocket.CONNECTING)
    ) {
      return;
    }

    const proto = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const url = `${proto}://${window.location.host}/api/ws`;

    this._ws = new WebSocket(url);

    this._ws.addEventListener('message', (event) => {
      let msg;
      try {
        msg = JSON.parse(event.data);
      } catch {
        return;
      }
      this._emit(msg.type, msg);
    });

    this._ws.addEventListener('close', () => {
      this._emit('disconnected', {});
    });

    this._ws.addEventListener('error', () => {
      this._emit('connection_error', { message: 'Connection error' });
    });
  }

  /** Close the WebSocket and clear all listeners. */
  disconnect() {
    this._ws?.close();
    this._ws = null;
    this._listeners.clear();
  }

  /** Send a JSON message to the server. No-op if not connected. */
  send(msg) {
    if (this._ws?.readyState === WebSocket.OPEN) {
      this._ws.send(JSON.stringify(msg));
    }
  }

  /**
   * Register a listener for a server message type.
   * Returns `this` for chaining.
   */
  on(type, callback) {
    if (!this._listeners.has(type)) this._listeners.set(type, new Set());
    this._listeners.get(type).add(callback);
    return this;
  }

  /**
   * Remove a specific listener (or all listeners for a type if no callback given).
   */
  off(type, callback) {
    if (!callback) {
      this._listeners.delete(type);
    } else {
      this._listeners.get(type)?.delete(callback);
    }
    return this;
  }

  _emit(type, data) {
    const handlers = this._listeners.get(type);
    if (!handlers) return;
    for (const fn of handlers) fn(data);
  }
}
