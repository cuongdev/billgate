declare module 'push-receiver';

declare namespace Express {
  export interface Request {
    user?: {
      id: string;
      email: string;
      tv?: number;
      [key: string]: any;
    }
  }
}
