import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;



export function getSocket(): Socket {
  // @ts-ignore – reuse global socket across HMR reloads
  if (typeof window !== 'undefined' && window.__vpb_socket) {
    // @ts-ignore
    return window.__vpb_socket as Socket;
  }

  if (!socket) {
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    
    socket = io({
      auth: {
        token
      }
    });

    if (typeof window !== 'undefined') {
      // @ts-ignore
      window.__vpb_socket = socket;
    }

    socket.on('connect', () => {
      console.log('[Socket] Connected:', socket?.id);
    });

    socket.on('connect_error', (err) => {
      console.error('[Socket] Connection error:', err.message);
    });

    socket.on('disconnect', () => {
      console.log('[Socket] Disconnected');
    });
  }

  return socket;
}

