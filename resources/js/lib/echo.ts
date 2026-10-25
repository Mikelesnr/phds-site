import axios from 'axios';
import Echo from 'laravel-echo';
import Pusher from 'pusher-js';
import type { RealtimeConfig } from '@/types';

let instance: Echo<'reverb'> | null = null;

/**
 * The websocket connection, created once and only when the server says
 * realtime is on. When it returns null the chat falls back to polling.
 */
export function getEcho(config: RealtimeConfig | null): Echo<'reverb'> | null {
    if (!config?.enabled || !config.key || !config.host) return null;
    if (instance) return instance;

    (window as unknown as { Pusher: typeof Pusher }).Pusher = Pusher;

    instance = new Echo({
        broadcaster: 'reverb',
        key: config.key,
        wsHost: config.host,
        wsPort: config.port,
        wssPort: config.port,
        forceTLS: config.scheme === 'https',
        enabledTransports: ['ws', 'wss'],
        // Use axios so the session cookie and XSRF token are sent, even after a login.
        authorizer: (channel: { name: string }) => ({
            authorize: (
                socketId: string,
                callback: (error: Error | null, data?: unknown) => void,
            ) => {
                axios
                    .post('/broadcasting/auth', {
                        socket_id: socketId,
                        channel_name: channel.name,
                    })
                    .then((response) => callback(null, response.data))
                    .catch((error: Error) => callback(error));
            },
        }),
    } as ConstructorParameters<typeof Echo<'reverb'>>[0]);

    return instance;
}

/** Tells the server which socket sent a change so it is not echoed back to the sender. */
export function socketHeaders(echo: Echo<'reverb'> | null): Record<string, string> {
    const id = echo?.socketId();
    return id ? { 'X-Socket-ID': id } : {};
}
