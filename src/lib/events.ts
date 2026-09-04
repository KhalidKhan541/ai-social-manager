type EventCallback<T = unknown> = (data: T) => void;

interface EventListener<T = unknown> {
  callback: EventCallback<T>;
  once: boolean;
}

export class EventEmitter<Events extends Record<string, unknown> = Record<string, unknown>> {
  private listeners = new Map<keyof Events, EventListener[]>();

  on<K extends keyof Events>(
    event: K,
    callback: EventCallback<Events[K]>
  ): () => void {
    return this.addListener(event, callback, false);
  }

  once<K extends keyof Events>(
    event: K,
    callback: EventCallback<Events[K]>
  ): () => void {
    return this.addListener(event, callback, true);
  }

  private addListener<K extends keyof Events>(
    event: K,
    callback: EventCallback<Events[K]>,
    once: boolean
  ): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }

    const listener: EventListener<Events[K]> = { callback, once };
    this.listeners.get(event)!.push(listener);

    return () => this.off(event, callback);
  }

  off<K extends keyof Events>(
    event: K,
    callback?: EventCallback<Events[K]>
  ): void {
    if (!callback) {
      this.listeners.delete(event);
      return;
    }

    const listeners = this.listeners.get(event);
    if (!listeners) return;

    const filtered = listeners.filter(
      (listener) => listener.callback !== callback
    );

    if (filtered.length === 0) {
      this.listeners.delete(event);
    } else {
      this.listeners.set(event, filtered);
    }
  }

  emit<K extends keyof Events>(event: K, data: Events[K]): void {
    const listeners = this.listeners.get(event);
    if (!listeners) return;

    const toRemove: EventListener[] = [];

    for (const listener of listeners) {
      try {
        listener.callback(data);
        if (listener.once) {
          toRemove.push(listener);
        }
      } catch (error) {
        console.error(`Error in event listener for ${String(event)}:`, error);
      }
    }

    if (toRemove.length > 0) {
      const remaining = listeners.filter((l) => !toRemove.includes(l));
      if (remaining.length === 0) {
        this.listeners.delete(event);
      } else {
        this.listeners.set(event, remaining);
      }
    }
  }

  removeAllListeners(event?: keyof Events): void {
    if (event) {
      this.listeners.delete(event);
    } else {
      this.listeners.clear();
    }
  }

  listenerCount(event: keyof Events): number {
    return this.listeners.get(event)?.length || 0;
  }

  eventNames(): (keyof Events)[] {
    return Array.from(this.listeners.keys());
  }

  hasListeners(event: keyof Events): boolean {
    return this.listenerCount(event) > 0;
  }
}

export interface AppEvents {
  "post:created": { postId: string; userId: string; platform: string };
  "post:scheduled": { postId: string; scheduledAt: string };
  "post:published": { postId: string; platform: string; publishedAt: string };
  "post:failed": { postId: string; error: string };
  "post:deleted": { postId: string };
  "analytics:updated": { postId: string; platform: string };
  "campaign:created": { campaignId: string; name: string };
  "campaign:completed": { campaignId: string; stats: Record<string, number> };
  "inbox:message": { conversationId: string; message: string };
  "inbox:reply": { conversationId: string; reply: string };
  "user:login": { userId: string; email: string };
  "user:logout": { userId: string };
  "user:settings_changed": { userId: string; settings: Record<string, unknown> };
  "notification:new": { id: string; type: string; message: string };
  "platform:connected": { platform: string; accountId: string };
  "platform:disconnected": { platform: string; accountId: string };
  "platform:error": { platform: string; error: string };
  "ai:generation_started": { taskId: string; type: string };
  "ai:generation_completed": { taskId: string; result: string };
  "ai:generation_failed": { taskId: string; error: string };
  "billing:subscription_changed": { plan: string; status: string };
  "billing:payment_failed": { invoiceId: string; error: string };
  "feature_flag:toggled": { flag: string; enabled: boolean };
  "theme:changed": { theme: "light" | "dark" | "system" };
  "sidebar:toggle": { isOpen: boolean };
  "modal:open": { modalId: string; data?: unknown };
  "modal:close": { modalId: string };
}

export const appEvents = new EventEmitter<AppEvents>();

export function onPostCreated(callback: EventCallback<AppEvents["post:created"]>): () => void {
  return appEvents.on("post:created", callback);
}

export function onPostScheduled(callback: EventCallback<AppEvents["post:scheduled"]>): () => void {
  return appEvents.on("post:scheduled", callback);
}

export function onPostPublished(callback: EventCallback<AppEvents["post:published"]>): () => void {
  return appEvents.on("post:published", callback);
}

export function onPostFailed(callback: EventCallback<AppEvents["post:failed"]>): () => void {
  return appEvents.on("post:failed", callback);
}

export function onNotification(callback: EventCallback<AppEvents["notification:new"]>): () => void {
  return appEvents.on("notification:new", callback);
}

export function onPlatformConnected(callback: EventCallback<AppEvents["platform:connected"]>): () => void {
  return appEvents.on("platform:connected", callback);
}

export function onPlatformDisconnected(callback: EventCallback<AppEvents["platform:disconnected"]>): () => void {
  return appEvents.on("platform:disconnected", callback);
}

export function onThemeChanged(callback: EventCallback<AppEvents["theme:changed"]>): () => void {
  return appEvents.on("theme:changed", callback);
}

export function emitPostCreated(data: AppEvents["post:created"]): void {
  appEvents.emit("post:created", data);
}

export function emitPostScheduled(data: AppEvents["post:scheduled"]): void {
  appEvents.emit("post:scheduled", data);
}

export function emitPostPublished(data: AppEvents["post:published"]): void {
  appEvents.emit("post:published", data);
}

export function emitPostFailed(data: AppEvents["post:failed"]): void {
  appEvents.emit("post:failed", data);
}

export function emitNotification(data: AppEvents["notification:new"]): void {
  appEvents.emit("notification:new", data);
}

export function emitThemeChanged(data: AppEvents["theme:changed"]): void {
  appEvents.emit("theme:changed", data);
}
