import { describe, it, expect, vi } from 'vitest';
import { WebhookEventBus } from '../../../src/core/event-bus.js';

describe('WebhookEventBus', () => {
  it('should publish events to all subscribers', () => {
    const bus = new WebhookEventBus();
    const first = vi.fn();
    const second = vi.fn();

    bus.subscribe(first);
    bus.subscribe(second);

    bus.publish({ event: 'OPENPIX:CHARGE_COMPLETED' });

    expect(first).toHaveBeenCalledWith({ event: 'OPENPIX:CHARGE_COMPLETED' });
    expect(second).toHaveBeenCalledWith({ event: 'OPENPIX:CHARGE_COMPLETED' });
  });

  it('should stop notifying unsubscribed listeners', () => {
    const bus = new WebhookEventBus();
    const listener = vi.fn();

    const unsubscribe = bus.subscribe(listener);
    unsubscribe();
    bus.publish({ event: 'OPENPIX:CHARGE_CREATED' });

    expect(listener).not.toHaveBeenCalled();
  });
});
