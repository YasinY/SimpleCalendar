import { WINDOW_CONTROL_IDS } from '../constants';
import type { CalendarApi } from '../../shared/calendarApi';

export function bindWindowControls(api: CalendarApi): void {
  const actions: Record<string, () => void> = {
    [WINDOW_CONTROL_IDS.CLOSE]: () => api.hideWindow(),
    [WINDOW_CONTROL_IDS.MINIMIZE]: () => api.minimizeWindow(),
    [WINDOW_CONTROL_IDS.MAXIMIZE]: () => api.toggleMaximizeWindow()
  };

  for (const [elementId, action] of Object.entries(actions)) {
    document.getElementById(elementId)?.addEventListener('click', action);
  }
}
