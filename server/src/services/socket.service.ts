import { Server as SocketIOServer } from 'socket.io';
import { Server as HttpServer } from 'http';
import { AuthService } from './auth.service';

class SocketService {
  private io: SocketIOServer | null = null;

  init(httpServer: HttpServer) {
    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: '*',
        methods: ['GET', 'POST']
      }
    });

    // Authentication Middleware
    this.io.use((socket, next) => {
      const token = socket.handshake.auth.token;
      if (!token) {
        return next(new Error('Authentication error: Token required'));
      }

      try {
        const payload = AuthService.verifyAccessToken(token);
        // Attach user info to socket instance for later use
        socket.data.userId = payload.sub;
        next();
      } catch (err) {
        return next(new Error('Authentication error: Invalid token'));
      }
    });

    this.io.on('connection', (socket) => {
      const userId = socket.data.userId;
      if (userId) {
        console.log(`[SocketService] User authenticated: ${userId}. Socket ID: ${socket.id}`);
        socket.join(userId); // Join room named after userId
      } else {
        // Should not happen due to middleware, but good as a fallback safety
        console.warn(`[SocketService] Connection without userId? Socket ID: ${socket.id}`);
        socket.disconnect(true);
        return;
      }

      socket.on('disconnect', () => {
        console.log(`[SocketService] Client disconnected: ${socket.id} (User: ${userId})`);
      });
    });
  }

  emit(event: string, data: any) {
    if (this.io) {
      const { userId, ...payload } = data; // Extract userId if present for targeting

      if (data.userId) { // If userId is explicit in the data object from internal API
        console.log(`[SocketService] Emitting targeted event: ${event} to User: ${data.userId}`);
        this.io.to(data.userId).emit(event, payload);
      } else if (data.accountId) {
        // Fallback/Legacy: If we don't have userId but have accountId, we might not be able to target safely.
        // Ideally all calls should provide userId. 
        // For now, if no userId is provided, we Log Warn and DO NOT broadcast to everyone to stay secure.
        console.warn(`[SocketService] Event ${event} missing userId for targeting. Dropping event to prevent leak.`);
      } else {
        console.warn(`[SocketService] Event ${event} missing targeting info (userId). Dropping.`);
      }
    } else {
      console.warn('[SocketService] emit called before init');
    }
  }
}

export const socketService = new SocketService();
