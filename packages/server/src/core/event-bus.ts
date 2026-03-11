export type WebhookEvent = Record<string, unknown>;
export type WebhookEventListener = (event: WebhookEvent) => void;

export class WebhookEventBus {
  private listeners = new Set<WebhookEventListener>();

  subscribe(listener: WebhookEventListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  publish(event: WebhookEvent): void {
    for (const listener of this.listeners) {
      listener(event);
    }
  }
}
