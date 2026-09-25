import { beforeEach, describe, expect, it, vi } from 'vitest';
import { bindWindowControls } from '@renderer/dom/windowControls';
import { WINDOW_CONTROL_IDS } from '@renderer/constants';
import type { CalendarApi } from '@shared/calendarApi';
import { mountIndexDocument, requireById } from '@tests/support/indexDocument';

function createApiMock(): CalendarApi {
  return {
    getEvents: vi.fn(),
    saveEvent: vi.fn(),
    saveOccurrence: vi.fn(),
    deleteEvent: vi.fn(),
    deleteOccurrence: vi.fn(),
    getSettings: vi.fn(),
    updateSettings: vi.fn(),
    minimizeWindow: vi.fn(),
    toggleMaximizeWindow: vi.fn(),
    hideWindow: vi.fn()
  };
}

function click(elementId: string): void {
  requireById(elementId).click();
}

describe('bindWindowControls', () => {
  beforeEach(() => {
    mountIndexDocument();
  });

  it('routes each window control button to its api action', () => {
    const api = createApiMock();
    bindWindowControls(api);

    click(WINDOW_CONTROL_IDS.CLOSE);
    expect(api.hideWindow).toHaveBeenCalledOnce();

    click(WINDOW_CONTROL_IDS.MINIMIZE);
    expect(api.minimizeWindow).toHaveBeenCalledOnce();

    click(WINDOW_CONTROL_IDS.MAXIMIZE);
    expect(api.toggleMaximizeWindow).toHaveBeenCalledOnce();
  });

  it('skips controls that are missing from the document', () => {
    requireById(WINDOW_CONTROL_IDS.CLOSE).remove();
    const api = createApiMock();

    expect(() => bindWindowControls(api)).not.toThrow();

    click(WINDOW_CONTROL_IDS.MINIMIZE);
    expect(api.minimizeWindow).toHaveBeenCalledOnce();
    expect(api.hideWindow).not.toHaveBeenCalled();
  });
});
