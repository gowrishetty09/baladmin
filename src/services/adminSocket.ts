/**
 * adminSocket.ts - Singleton Socket.IO instance for baladmin
 *
 * RULES:
 * 1. Socket is created ONCE per app lifetime
 * 2. No code may call socket.disconnect()
 * 3. Screens only add/remove listeners via socket.on/off
 * 4. Token change triggers socket auth update (not full disconnect)
 */

import { io, type Socket } from 'socket.io-client';

const API_BASE_URL =
    process.env.EXPO_PUBLIC_API_BASE_URL || 'https://bestaerolimo.online/api';

const getSocketBaseUrl = (): string => {
    const base = API_BASE_URL.replace(/\/+$/, '');
    return base.replace(/\/api\/?$/, '');
};

let socket: Socket | null = null;
let currentToken: string | null = null;

const SOCKET_OPTIONS = {
    path: '/socket.io',
    transports: ['websocket'] as ('websocket' | 'polling')[],
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    timeout: 20000,
    autoConnect: true,
};

/**
 * Get the singleton admin socket. Creates socket on first call.
 * If token changed, updates socket auth and reconnects.
 */
export function getAdminSocket(token?: string | null): Socket | null {
    const nextToken = token ?? null;

    // Socket exists and token unchanged - just ensure connected
    if (socket && currentToken === nextToken) {
        if (!socket.connected) {
            socket.connect();
        }
        return socket;
    }

    // Token changed - update auth and reconnect
    if (socket && currentToken !== nextToken) {
        currentToken = nextToken;
        if (nextToken) {
            (socket.auth as { token: string }).token = nextToken;
        }
        if (socket.connected) {
            socket.disconnect();
            socket.connect();
        } else {
            socket.connect();
        }
        return socket;
    }

    // First time - create socket
    currentToken = nextToken;
    const baseUrl = getSocketBaseUrl();
    socket = io(baseUrl, {
        ...SOCKET_OPTIONS,
        ...(nextToken ? { auth: { token: nextToken } } : {}),
    });

    socket.on('connect', () => {
        console.log('[AdminSocket] Connected');
    });

    socket.on('disconnect', (reason) => {
        console.log('[AdminSocket] Disconnected:', reason);
    });

    socket.on('connect_error', (err) => {
        console.warn('[AdminSocket] Connect error:', err.message);
    });

    return socket;
}

/**
 * Check if socket is currently connected.
 */
export function isAdminSocketConnected(): boolean {
    return socket?.connected ?? false;
}
