type EventCallback = (detail: any) => void;

class EventBus {
    private listeners: Record<string, EventCallback[]> = {};

    on(event: string, callback: EventCallback) {
        if (!this.listeners[event]) {
            this.listeners[event] = [];
        }
        this.listeners[event].push(callback);
    }

    off(event: string, callback: EventCallback) {
        if (!this.listeners[event]) return;
        this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
    }

    emit(event: string, detail?: any) {
        if (this.listeners[event]) {
            this.listeners[event].forEach(cb => cb(detail));
        }
    }
}

export const eventBus = new EventBus();
export const EVENTS = {
    SESSION_EXPIRED: 'SESSION_EXPIRED'
};
